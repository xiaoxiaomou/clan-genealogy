import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, Circle, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Card, CardContent, Input, Label, useToast, Button } from '@/components/ui'
import { MapPin, Navigation2, X, Search } from 'lucide-react'

// 修复 Leaflet 默认图标（Vite 环境）
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
})

// 自定义男女标记
const maleIcon = L.divIcon({
  html: `<div style="background:#3b82f6;width:24px;height:24px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:bold;">♂</div>`,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})
const femaleIcon = L.divIcon({
  html: `<div style="background:#ec4899;width:24px;height:24px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:bold;">♀</div>`,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})
const familyIcon = L.divIcon({
  html: `<div style="background:#f59e0b;width:32px;height:32px;border-radius:6px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-size:14px;">🏛</div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

interface PlaceMark {
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
  const { showToast } = useToast()
  const [center, setCenter] = useState<[number, number]>(defaultCenter)
  const [zoom, setZoom] = useState(defaultZoom)

  useEffect(() => {
    if (places.length > 0) {
      // 自动居中到第一个有效位置
      const valid = places.filter((p) => p.lat && p.lng)
      if (valid.length > 0) {
        const avgLat = valid.reduce((s, p) => s + p.lat, 0) / valid.length
        const avgLng = valid.reduce((s, p) => s + p.lng, 0) / valid.length
        setCenter([avgLat, avgLng])
        setZoom(valid.length === 1 ? 8 : 4)
      }
    }
  }, [places])

  const handleClick = (lat: number, lng: number) => {
    onSelect?.({ lat, lng })
  }

  return (
    <div style={{ height }} className="relative overflow-hidden rounded-lg border border-border">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {onSelect && <ClickHandler onClick={handleClick} />}

        {places.map((p, idx) => {
          const icon =
            p.type === 'family' ? familyIcon : p.gender === 'male' ? maleIcon : p.gender === 'female' ? femaleIcon : familyIcon
          return (
            <Marker key={`${p.type}-${idx}`} position={[p.lat, p.lng]} icon={icon}>
              <Popup>
                <div className="text-sm">
                  <div className="mb-1 font-semibold">{p.name}</div>
                  <div className="text-xs text-gray-500">
                    {p.type === 'family' ? '家族发源地' : p.type === 'birth' ? '出生地' : '逝世地'}
                    {p.gender && ` · ${p.gender === 'male' ? '男' : '女'}`}
                  </div>
                  {p.extra && <div className="mt-1 text-xs text-gray-600">{p.extra}</div>}
                  <div className="mt-1 text-[10px] text-gray-400">
                    {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* 出生→死亡连线 */}
        {showLines && <MemberLines places={places} />}

        <RecenterMap center={center} zoom={zoom} />
      </MapContainer>

      <div className="pointer-events-none absolute right-3 top-3 z-[400] flex flex-col gap-1">
        <div className="rounded-lg border border-border bg-white/90 px-3 py-2 text-xs shadow backdrop-blur dark:bg-black/80">
          <div className="flex items-center gap-2">
            <span className="font-medium">图例：</span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-full bg-amber-500" /> 家族
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

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function RecenterMap({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.8 })
  }, [center, zoom, map])
  return null
}

function MemberLines({ places }: { places: PlaceMark[] }) {
  const lines: Array<[[number, number], [number, number]]> = []
  // 简化：根据 (name, type) 匹配出生-死亡
  const byName: Record<string, { birth?: PlaceMark; death?: PlaceMark }> = {}
  for (const p of places) {
    if (p.type === 'birth') {
      if (!byName[p.name]) byName[p.name] = {}
      byName[p.name].birth = p
    } else if (p.type === 'death') {
      if (!byName[p.name]) byName[p.name] = {}
      byName[p.name].death = p
    }
  }
  for (const k of Object.keys(byName)) {
    const { birth, death } = byName[k]
    if (birth && death && birth.lat !== death.lat && birth.lng !== death.lng) {
      lines.push([
        [birth.lat, birth.lng],
        [death.lat, death.lng],
      ])
    }
  }
  if (lines.length === 0) return null
  return (
    <>
      {lines.map((line, idx) => (
        <Polyline
          key={idx}
          positions={line}
          pathOptions={{ color: '#8b5cf6', weight: 2, opacity: 0.5, dashArray: '4,8' }}
        />
      ))}
    </>
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
  const [search, setSearch] = useState('')
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
