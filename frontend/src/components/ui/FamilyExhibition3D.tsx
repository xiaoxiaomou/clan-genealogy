// FamilyExhibition3D.tsx
// 家族数字展厅 - 第一人称可漫游的 3D 房间
// 中心大厅：地板+墙壁+光源；四周展板（Plane）显示成员生平
import { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PointerLockControls, Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import type { Member } from '@/types';
import { Card, CardContent } from '@/components/ui';
import { Eye, RotateCcw, Move3D, X } from 'lucide-react';

interface Props {
  members: Member[];
  familyId: number;
}

export default function FamilyExhibition3D({ members, familyId }: Props) {
  const [active, setActive] = useState(false);
  const [nearestId, setNearestId] = useState<number | null>(null);

  // 选最多 8 个有 bio 的成员当展板
  const exhibits = useMemo(
    () => members.filter((m) => m.bio && (m.bio as string).length > 5).slice(0, 8),
    [members]
  );

  // 展板围绕中心按 8 边形分布
  const positions = useMemo(() => {
    return exhibits.map((_, i) => {
      const angle = (i / Math.max(1, exhibits.length)) * Math.PI * 2;
      return {
        x: Math.cos(angle) * 6,
        z: Math.sin(angle) * 6,
        rot: angle + Math.PI, // 朝向中心
      };
    });
  }, [exhibits]);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="relative h-[500px] w-full bg-stone-900">
          <Canvas shadows camera={{ position: [0, 1.6, 8], fov: 60 }}>
            <color attach="background" args={['#1c1917']} />
            <fog attach="fog" args={['#1c1917', 8, 30]} />

            {/* 光源 */}
            <ambientLight intensity={0.3} />
            <directionalLight
              position={[5, 8, 5]}
              intensity={0.8}
              castShadow
              shadow-mapSize-width={1024}
              shadow-mapSize-height={1024}
            />
            <pointLight position={[0, 4, 0]} intensity={0.5} color="#fbbf24" />

            {/* 地板 */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
              <planeGeometry args={[40, 40]} />
              <meshStandardMaterial color="#292524" metalness={0.3} roughness={0.7} />
            </mesh>

            {/* 中心装饰（族徽柱） */}
            <Pillar position={[0, 0, 0]} />

            {/* 展板 */}
            {exhibits.map((m, i) => (
              <ExhibitBoard
                key={m.id}
                member={m}
                x={positions[i].x}
                z={positions[i].z}
                rot={positions[i].rot}
                onFocus={() => setNearestId(m.id)}
                onBlur={() => setNearestId((id) => (id === m.id ? null : id))}
              />
            ))}

            <PointerLockControls
              onLock={() => setActive(true)}
              onUnlock={() => setActive(false)}
            />
            <UserMarker />
          </Canvas>

          {/* 浮层 HUD */}
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
            <div className="flex items-center justify-between p-3">
              <div className="rounded bg-black/60 px-3 py-1.5 text-xs text-white">
                <Move3D className="mr-1 inline h-3 w-3" />
                点击场景进入第一人称 · WASD 移动 · 鼠标视角
              </div>
              {active && (
                <button
                  onClick={() => (document as any).exitPointerLock?.()}
                  className="pointer-events-auto rounded bg-black/60 px-2.5 py-1.5 text-xs text-white hover:bg-black/80"
                >
                  <X className="mr-1 inline h-3 w-3" /> 退出
                </button>
              )}
            </div>

            {nearestId !== null && (() => {
              const m = exhibits.find((x) => x.id === nearestId);
              if (!m) return null;
              return (
                <div className="pointer-events-auto mx-auto mt-auto mb-6 max-w-md rounded-lg border border-amber-700/40 bg-stone-900/95 p-4 text-white shadow-2xl">
                  <h3 className="mb-1 font-serif text-lg font-bold text-amber-100">{m.name}</h3>
                  <div className="mb-2 text-xs text-amber-200/70">
                    第 {m.generation} 代 · {m.gender === 'male' ? '男' : '女'} · {m.birth_date || '?'} - {m.death_date || '至今'}
                  </div>
                  <div
                    className="text-xs leading-relaxed text-amber-50/90 line-clamp-5"
                    dangerouslySetInnerHTML={{ __html: m.bio || '' }}
                  />
                </div>
              );
            })()}

            {!active && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="rounded-lg border border-amber-700/40 bg-stone-900/90 px-6 py-4 text-center">
                  <Eye className="mx-auto mb-2 h-8 w-8 text-amber-400" />
                  <p className="font-serif text-sm font-medium text-amber-100">家族数字展厅</p>
                  <p className="mt-1 text-xs text-amber-200/60">点击下方按钮进入体验</p>
                </div>
              </div>
            )}
          </div>

          {/* 进入按钮 */}
          {!active && (
            <div className="absolute inset-x-0 bottom-6 z-20 flex justify-center">
              <button
                onClick={() => {
                  const canvas = document.querySelector('canvas');
                  canvas?.requestPointerLock();
                }}
                className="flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-medium text-stone-900 shadow-lg transition-transform hover:scale-105 active:scale-95"
              >
                <Eye className="h-4 w-4" /> 进入展厅
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Pillar({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 1, 0]}>
        <cylinderGeometry args={[0.3, 0.4, 2, 12]} />
        <meshStandardMaterial color="#92400e" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh castShadow position={[0, 2.2, 0]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.7} roughness={0.3} emissive="#fbbf24" emissiveIntensity={0.3} />
      </mesh>
      <Billboard position={[0, 3, 0]}>
        <Text
          fontSize={0.35}
          color="#fef3c7"
          outlineWidth={0.04}
          outlineColor="#92400e"
          anchorX="center"
          anchorY="middle"
        >
          家族
        </Text>
      </Billboard>
    </group>
  );
}

function ExhibitBoard({
  member,
  x,
  z,
  rot,
  onFocus,
  onBlur,
}: {
  member: Member;
  x: number;
  z: number;
  rot: number;
  onFocus: () => void;
  onBlur: () => void;
}) {
  const color = member.gender === 'male' ? '#1d4ed8' : '#be185d';
  return (
    <group position={[x, 1.3, z]} rotation={[0, rot, 0]} onPointerOver={onFocus} onPointerOut={onBlur}>
      {/* 展板 */}
      <mesh castShadow receiveShadow>
        <planeGeometry args={[1.6, 2]} />
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      {/* 边框 */}
      <mesh position={[0, 0, 0.01]}>
        <ringGeometry args={[0, 0.95, 4]} />
        <meshBasicMaterial color="#fbbf24" />
      </mesh>
      {/* 名字 */}
      <Text
        position={[0, 0.7, 0.02]}
        fontSize={0.22}
        color="#fef3c7"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000"
      >
        {member.name}
      </Text>
      {/* 日期 */}
      <Text
        position={[0, 0.4, 0.02]}
        fontSize={0.12}
        color="#fef3c7"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="#000"
      >
        {`${(member.birth_date || '?').slice(0, 10)} — ${(member.death_date || '至今').slice(0, 10)}`}
      </Text>
      {/* 简介（多行） */}
      <Text
        position={[0, -0.1, 0.02]}
        fontSize={0.09}
        color="#fef3c7"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.4}
        outlineWidth={0.005}
        outlineColor="#000"
      >
        {((member.bio as string) || '').replace(/<[^>]+>/g, ' ').slice(0, 80)}
      </Text>
    </group>
  );
}

function UserMarker() {
  // 简单 FPS 移动：监听 WASD
  const ref = useRef<THREE.Group>(null!);
  const keys = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const onKey = (e: KeyboardEvent, v: boolean) => {
      keys.current[e.code] = v;
    };
    const d1 = (e: KeyboardEvent) => onKey(e, true);
    const u1 = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener('keydown', d1);
    window.addEventListener('keyup', u1);
    return () => {
      window.removeEventListener('keydown', d1);
      window.removeEventListener('keyup', u1);
    };
  }, []);

  useFrame((_, dt) => {
    if (!ref.current) return;
    const speed = 4 * dt;
    const k = keys.current;
    if (k['KeyW']) ref.current.position.z -= speed;
    if (k['KeyS']) ref.current.position.z += speed;
    if (k['KeyA']) ref.current.position.x -= speed;
    if (k['KeyD']) ref.current.position.x += speed;
    // 限制在房间内
    const r = 12;
    ref.current.position.x = Math.max(-r, Math.min(r, ref.current.position.x));
    ref.current.position.z = Math.max(-r, Math.min(r, ref.current.position.z));
  });

  return <group ref={ref} position={[0, 0, 8]} />;
}
