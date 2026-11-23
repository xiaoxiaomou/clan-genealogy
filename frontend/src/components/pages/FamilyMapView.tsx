import { useEffect, useMemo, useRef, useState } from 'react'
import { Input, Label, useToast, Button } from '@/components/ui'
import { MapPin, X } from 'lucide-react'

/**
 * 地图组件 — 腾讯地图 GL JS（国内合规地图服务）
 *
 * 使用前请在腾讯位置服务开放平台申请 Key：
 *   https://lbs.qq.com/dev/console/application/mine
 * 并将下方 TMAP_KEY 占位符替换为自己的 Key。
 * 前端明文 Key 有被嗅探风险，请为该 Key 配置 Referer 域名白名单；
 * 商用场景应由后端代理签名。
 */
const TMAP_KEY = 'OAMBZ-TDRC7-AXSXI-PVP35-3Q5G6-KKBAE'
const KEY_CONFIGURED = !TMAP_KEY.includes('请到')
const SDK_URL = `https://map.qq.com/api/gljs?v=1.exp&key=${encodeURIComponent(TMAP_KEY)}`

type TMapNS = any

let sdkPromise: Promise<TMapNS> | null = null
function loadTMap(): Promise<TMapNS> {
  if ((window as any).TMap) return Promise.resolve((window as any).TMap)
  if (sdkPromise) return sdkPromise
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SDK_URL
    script.async = true
    script.onload = () => {
      const TMap = (window as any).TMap
      if (TMap) resolve(TMap)
      else reject(new Error('腾讯地图 SDK 未正确加载，请检查 Key 是否有效'))
    }
    script.onerror = () => reject(new Error('腾讯地图 SDK 加载失败，请检查网络连接'))
    document.head.appendChild(script)
  })
  return sdkPromise
}

/* ── 坐标转换：原 OSM 选点存 WGS-84，腾讯地图使用 GCJ-02 ── */
const A = 6378245.0
const EE = 0.00669342162296594323

function outOfChina(lat: number, lng: number): boolean {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271
}
function transformLat(x: number, y: number): number {
  let ret = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  ret += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3
  ret += (20 * Math.sin(y * Math.PI) + 40 * Math.sin(y / 3 * Math.PI)) * 2 / 3
  ret += (160 * Math.sin(y / 12 * Math.PI) + 320 * Math.sin(y * Math.PI / 30)) * 2 / 3
  return ret
}
function transformLng(x: number, y: number): number {
  let ret = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  ret += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3
  ret += (20 * Math.sin(x * Math.PI) + 40 * Math.sin(x / 3 * Math.PI)) * 2 / 3
  ret += (150 * Math.sin(x / 12 * Math.PI) + 300 * Math.sin(x / 30 * Math.PI)) * 2 / 3
  return ret
}
function wgs84ToGcj02(lat: number, lng: number): [number, number] {
  if (outOfChina(lat, lng)) return [lat, lng]
  let dLat = transformLat(lng - 105.0, lat - 35.0)
  let dLng = transformLng(lng - 105.0, lat - 35.0)
  const radLat = lat / 180.0 * Math.PI
  let magic = Math.sin(radLat)
  magic = 1 - EE * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180.0) / ((A * (1 - EE)) / (magic * sqrtMagic) * Math.PI)
  dLng = (dLng * 180.0) / (A / sqrtMagic * Math.cos(radLat) * Math.PI)
  return [lat + dLat, lng + dLng]
}
function gcj02ToWgs84(lat: number, lng: number): [number, number] {
  let wLat = lat
  let wLng = lng
  for (let i = 0; i < 5; i++) {
    const [gLat, gLng] = wgs84ToGcj02(wLat, wLng)
    wLat -= gLat - lat
    wLng -= gLng - lng
  }
  return [wLat, wLng]
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  )
}

function markerIcon(color: string, symbol: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="12" fill="${color}" stroke="white" stroke-width="2"/><text x="15" y="20" text-anchor="middle" font-size="14" fill="white" font-family="sans-serif">${symbol}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export interface PlaceMark {
  name: string
  lat: number
  lng: number
  type: 'birth' | 'death' | 'family'
  gender?: 'male' | 'female'
  extra?: string
}

interface FamilyMapViewProps {
  places: PlaceMark[]
  height?: string
  defaultCenter?: [number, number]
  defaultZoom?: number
  onSelect?: (place: { lat: number; lng: number }) => void
  showLines?: boolean
}

export default function FamilyMapView({
  places,
  height = '500px',
  defaultCenter = [35.8617, 104.1954], // 中国中心
  defaultZoom = 4,
  onSelect,
  showLines = true,
}: FamilyMapViewProps) {
  const elRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<TMapNS>(null)
  const markerRef = useRef<TMapNS>(null)
  const lineRef = useRef<TMapNS>(null)
  const infoRef = useRef<TMapNS>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 统一转为腾讯地图使用的 GCJ-02 坐标
  const geoPlaces = useMemo(
    () =>
      places
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
        .map((p) => {
          const [lat, lng] = wgs84ToGcj02(p.lat, p.lng)
          return { ...p, lat, lng }
        }),
    [places]
  )

  useEffect(() => {
    if (!KEY_CONFIGURED) return
    let disposed = false
    let map: TMapNS
    loadTMap()
      .then((TMap) => {
        if (disposed || !elRef.current) return
        const [cLat, cLng] = wgs84ToGcj02(defaultCenter[0], defaultCenter[1])
        map = new TMap.Map(elRef.current, {
          center: new TMap.LatLng(cLat, cLng),
          zoom: defaultZoom,
        })
        mapRef.current = map
        infoRef.current = new TMap.InfoWindow({
          map,
          position: new TMap.LatLng(cLat, cLng),
          offset: { x: 0, y: -28 },
        })
        infoRef.current.close()
        if (onSelect) {
          map.on('click', (e: any) => {
            const [lat, lng] = gcj02ToWgs84(e.latLng.getLat(), e.latLng.getLng())
            onSelect({ lat, lng })
          })
        }
        setReady(true)
      })
      .catch((e: Error) => setError(e.message))
    return () => {
      disposed = true
      map?.destroy?.()
      mapRef.current = null
      markerRef.current = null
      lineRef.current = null
      infoRef.current = null
      setReady(false)
    }
    // 地图只初始化一次；后续数据变化由下方 effect 增量更新
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 标记 + 连线
  useEffect(() => {
    if (!ready) return
    const TMap = (window as any).TMap
    const map = mapRef.current
    if (!TMap || !map) return

    markerRef.current?.setMap(null)
    lineRef.current?.setMap(null)
    infoRef.current?.close()

    if (geoPlaces.length > 0) {
      const markerLayer = new TMap.MultiMarker({
        map,
        styles: {
          family: new TMap.MarkerStyle({
            width: 32, height: 32, anchor: { x: 16, y: 16 }, src: markerIcon('#d97706', '🏛'),
          }),
          male: new TMap.MarkerStyle({
            width: 26, height: 26, anchor: { x: 13, y: 13 }, src: markerIcon('#3b82f6', '♂'),
          }),
          female: new TMap.MarkerStyle({
            width: 26, height: 26, anchor: { x: 13, y: 13 }, src: markerIcon('#ec4899', '♀'),
          }),
        },
        geometries: geoPlaces.map((p, i) => ({
          id: String(i),
          styleId:
            p.type === 'family'
              ? 'family'
              : p.gender === 'male'
                ? 'male'
                : p.gender === 'female'
                  ? 'female'
                  : 'family',
          position: new TMap.LatLng(p.lat, p.lng),
        })),
      })
      markerRef.current = markerLayer

      markerLayer.on('click', (e: any) => {
        const p = geoPlaces[Number(e.geometry.id)]
        const info = infoRef.current
        if (!p || !info) return
        const typeText = p.type === 'family' ? '家族发源地' : p.type === 'birth' ? '出生地' : '逝世地'
        const genderText = p.gender ? ` · ${p.gender === 'male' ? '男' : '女'}` : ''
        info.setContent(
          `<div style="min-width:150px;padding:8px 10px;font-size:13px;line-height:1.7;color:#e7e5e4;">` +
          `<div style="font-weight:600;margin-bottom:2px;">${escapeHtml(p.name)}</div>` +
          `<div style="color:#a8a29e;">${typeText}${genderText}</div>` +
          (p.extra ? `<div style="color:#a8a29e;">${escapeHtml(p.extra)}</div>` : '') +
          `<div style="color:#78716c;font-size:11px;margin-top:4px;">${p.lng.toFixed(4)}, ${p.lat.toFixed(4)}</div>` +
          `</div>`
        )
        info.setPosition(e.geometry.position)
        info.open()
      })
    }

    if (showLines) {
      const byName: Record<string, { birth?: PlaceMark; death?: PlaceMark }> = {}
      for (const p of geoPlaces) {
        if (p.type === 'birth' || p.type === 'death') {
          if (!byName[p.name]) byName[p.name] = {}
          byName[p.name][p.type] = p
        }
      }
      const lines = Object.values(byName)
        .filter((v): v is { birth: PlaceMark; death: PlaceMark } => !!v.birth && !!v.death)
        .filter((v) => v.birth.lat !== v.death.lat || v.birth.lng !== v.death.lng)
        .map((v) => [
          new TMap.LatLng(v.birth.lat, v.birth.lng),
          new TMap.LatLng(v.death.lat, v.death.lng),
        ])
      if (lines.length > 0) {
        lineRef.current = new TMap.MultiPolyline({
          map,
          styles: {
            dash: new TMap.PolylineStyle({
              color: '#8b5cf6', width: 3, borderWidth: 0, lineCap: 'round',
              showArrow: true, arrowOptions: { space: 80 },
            }),
          },
          geometries: lines.map((path, i) => ({ id: String(i), styleId: 'dash', paths: path })),
        })
      }
    }
  }, [ready, geoPlaces, showLines])

  // 自动居中
  useEffect(() => {
    if (!ready || geoPlaces.length === 0) return
    const map = mapRef.current
    if (!map || !(window as any).TMap) return
    const TMap = (window as any).TMap
    const avgLat = geoPlaces.reduce((s, p) => s + p.lat, 0) / geoPlaces.length
    const avgLng = geoPlaces.reduce((s, p) => s + p.lng, 0) / geoPlaces.length
    map.easeTo(
      { center: new TMap.LatLng(avgLat, avgLng), zoom: geoPlaces.length === 1 ? 8 : 4 },
      { duration: 600 }
    )
  }, [ready, geoPlaces])

  return (
    <div style={{ height }} className="relative overflow-hidden rounded-lg border border-border">
      <div ref={elRef} style={{ width: '100%', height: '100%' }} />
      {!KEY_CONFIGURED && (
        <div className="absolute inset-0 z-[401] flex flex-col items-center justify-center gap-3 bg-background/95 px-6 text-center">
          <MapPin className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-foreground">请配置腾讯地图 Key</p>
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            在 <code className="rounded bg-muted px-1 py-0.5">FamilyMapView.tsx</code> 中把
            <code className="mx-1 rounded bg-muted px-1 py-0.5">TMAP_KEY</code> 占位符替换为你的 Key，
            到腾讯位置服务开放平台申请后即可显示地图。
          </p>
          <p className="text-[11px] text-muted-foreground">申请地址：lbs.qq.com/dev/console/application/mine</p>
        </div>
      )}
      {KEY_CONFIGURED && error && (
        <div className="absolute inset-0 z-[400] flex flex-col items-center justify-center gap-2 bg-background/90 px-6 text-center">
          <MapPin className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-foreground">地图加载失败</p>
          <p className="max-w-md text-xs text-muted-foreground">{error}</p>
        </div>
      )}
      <div className="pointer-events-none absolute left-3 top-3 z-[400] flex flex-col gap-1">
        <div className="rounded-lg border border-border bg-white/90 px-3 py-2 text-xs shadow backdrop-blur dark:bg-black/80">
          <div className="flex items-center gap-2">
            <span className="font-medium">图例：</span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-full bg-amber-600" /> 家族
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-full bg-blue-500" /> 男
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-full bg-pink-500" /> 女
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/** 可搜索+选点的地点选择器（用于表单集成） */
interface PlacePickerProps {
  label: string
  lat: number | null | undefined
  lng: number | null | undefined
  placeName?: string | null
  onChange: (loc: { lat: number; lng: number; name?: string }) => void
}

export function PlacePicker({ label, lat, lng, placeName, onChange }: PlacePickerProps) {
  const [showMap, setShowMap] = useState(false)
  const { showToast } = useToast()
  const hasValue = lat != null && lng != null

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          value={placeName || ''}
          onChange={(e) => onChange({ lat: lat || 0, lng: lng || 0, name: e.target.value })}
          placeholder="地址（如：浙江省杭州市）"
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowMap(!showMap)}
          className="h-9 shrink-0"
        >
          <MapPin className="h-3.5 w-3.5" />
          {showMap ? '收起' : '选点'}
        </Button>
        {hasValue && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange({ lat: 0, lng: 0, name: '' })}
            className="h-9 shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {hasValue && (
        <p className="text-xs text-muted-foreground">
          已选坐标：{lat?.toFixed(4)}, {lng?.toFixed(4)}
        </p>
      )}
      {showMap && (
        <div className="mt-2">
          <FamilyMapView
            places={
              hasValue
                ? [
                    {
                      name: placeName || '所选地点',
                      lat: lat!,
                      lng: lng!,
                      type: 'birth',
                    },
                  ]
                : []
            }
            height="320px"
            defaultCenter={hasValue ? [lat!, lng!] : [35.8617, 104.1954]}
            defaultZoom={hasValue ? 8 : 4}
            onSelect={(loc) => {
              onChange({ lat: loc.lat, lng: loc.lng, name: placeName || '' })
              showToast('坐标已选择', 'success')
            }}
            showLines={false}
          />
          <p className="mt-1 text-xs text-muted-foreground">点击地图任意位置选择坐标</p>
        </div>
      )}
    </div>
  )
}
