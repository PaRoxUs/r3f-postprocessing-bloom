import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  EffectComposer,
  Select,
  Selection,
  SelectiveBloom,
} from '@react-three/postprocessing'
import { Leva, useControls } from 'leva'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type { ColorRepresentation, DirectionalLight, Mesh, PointLight } from 'three'
import { bloomIntensityToDomOpacity, bloomRadiusToDomCss } from '../lib/bloomDomSync'
import { Color, Vector3 } from 'three'

export type BloomSceneProps = {
  isDark: boolean
  domGlowRef?: RefObject<HTMLDivElement | null>
}

const BLOOM_COLOR = '#facc15'

function useBloomSettings() {
  return useControls('Bloom', {
    intensity: { value: 1.35, min: 0, max: 4, step: 0.01 },
    luminanceThreshold: { value: 0.15, min: 0, max: 1, step: 0.01 },
    luminanceSmoothing: { value: 0.35, min: 0, max: 1, step: 0.01 },
    radius: { value: 0.85, min: 0, max: 1, step: 0.01 },
    mipmapBlur: true,
    hoverEmissive: { value: 2.2, min: 0, max: 6, step: 0.05, label: 'Hover glow' },
  })
}

function DomGlowTracker({
  domGlowRef,
  hoveredMeshRef,
  bloomRadius,
  bloomIntensity,
  isDark,
}: {
  domGlowRef?: RefObject<HTMLDivElement | null>
  hoveredMeshRef: RefObject<Mesh | null>
  bloomRadius: number
  bloomIntensity: number
  isDark: boolean
}) {
  const worldPosition = useMemo(() => new Vector3(), [])
  const wasVisible = useRef(false)

  useFrame(({ camera }) => {
    const glow = domGlowRef?.current
    if (!glow) {
      return
    }

    const { width, height } = glow.getBoundingClientRect()
    const { size, blur, falloff } = bloomRadiusToDomCss(
      bloomRadius,
      width,
      height,
      isDark,
    )
    glow.style.setProperty('--glow-size', `${size}px`)
    glow.style.setProperty('--glow-blur', `${blur}px`)
    glow.style.setProperty('--glow-falloff', `${falloff}%`)

    const mesh = hoveredMeshRef.current
    if (!mesh) {
      if (wasVisible.current) {
        glow.style.opacity = '0'
        wasVisible.current = false
      }
      return
    }

    mesh.getWorldPosition(worldPosition)
    worldPosition.project(camera)

    const x = (worldPosition.x * 0.5 + 0.5) * 100
    const y = (-worldPosition.y * 0.5 + 0.5) * 100

    glow.style.setProperty('--glow-x', `${x}%`)
    glow.style.setProperty('--glow-y', `${y}%`)
    glow.style.opacity = String(bloomIntensityToDomOpacity(bloomIntensity, isDark))
    wasVisible.current = true
  })

  return null
}

function InteractiveBloomBox({
  position,
  color,
  hoverEmissive,
  hoveredMeshRef,
}: {
  position: [number, number, number]
  color: ColorRepresentation
  hoverEmissive: number
  hoveredMeshRef?: RefObject<Mesh | null>
}) {
  const [hovered, setHovered] = useState(false)
  const meshRef = useRef<Mesh>(null)
  const emissive = useMemo(() => new Color(BLOOM_COLOR), [])

  return (
    <Select enabled={hovered}>
      <mesh
        ref={meshRef}
        position={position}
        onPointerOver={(event) => {
          event.stopPropagation()
          setHovered(true)
          if (hoveredMeshRef) {
            hoveredMeshRef.current = meshRef.current
          }
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          if (hoveredMeshRef && hoveredMeshRef.current === meshRef.current) {
            hoveredMeshRef.current = null
          }
          document.body.style.cursor = 'auto'
        }}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={hovered ? hoverEmissive : 0.08}
          metalness={0.25}
          roughness={0.4}
        />
      </mesh>
    </Select>
  )
}

function TransparentBackground() {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)

  useEffect(() => {
    scene.background = null
    gl.setClearColor(0x000000, 0)
    gl.setClearAlpha(0)
  }, [gl, scene])

  return null
}

function SceneContents({
  isDark,
  domGlowRef,
}: {
  isDark: boolean
  domGlowRef?: RefObject<HTMLDivElement | null>
}) {
  const keyLightRef = useRef<DirectionalLight>(null!)
  const fillLightRef = useRef<PointLight>(null!)
  const hoveredMeshRef = useRef<Mesh | null>(null)
  const bloom = useBloomSettings()
  const invalidate = useThree((state) => state.invalidate)

  useEffect(() => {
    invalidate()
  }, [bloom, invalidate])

  const backdropColor = isDark ? '#334155' : '#94a3b8'
  const floorColor = isDark ? '#0f172a' : '#e2e8f0'
  const showFloor = domGlowRef ? isDark : true

  return (
    <Selection>
      <TransparentBackground />
      {domGlowRef ? (
        <DomGlowTracker
          domGlowRef={domGlowRef}
          hoveredMeshRef={hoveredMeshRef}
          bloomRadius={bloom.radius}
          bloomIntensity={bloom.intensity}
          isDark={isDark}
        />
      ) : null}
      <ambientLight intensity={isDark ? 0.35 : 0.55} />
      <directionalLight
        ref={keyLightRef}
        position={[4, 6, 5]}
        intensity={isDark ? 1.1 : 1.4}
      />
      <pointLight ref={fillLightRef} position={[-3, 2, 2]} intensity={0.6} />

      {showFloor ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.76, 0]} receiveShadow>
          <planeGeometry args={[12, 12]} />
          <meshStandardMaterial color={floorColor} roughness={0.92} metalness={0.05} />
        </mesh>
      ) : null}

      <mesh position={[0.85, 0, -1.35]} scale={[2.6, 2.6, 0.55]}>
        <boxGeometry />
        <meshStandardMaterial
          color={backdropColor}
          roughness={0.88}
          metalness={0.08}
        />
      </mesh>

      <InteractiveBloomBox
        position={[-1.35, 0, 0.15]}
        color="#4fb8b2"
        hoverEmissive={bloom.hoverEmissive}
        hoveredMeshRef={domGlowRef ? hoveredMeshRef : undefined}
      />
      <InteractiveBloomBox
        position={[0.85, 0, 0.55]}
        color="#328f97"
        hoverEmissive={bloom.hoverEmissive}
        hoveredMeshRef={domGlowRef ? hoveredMeshRef : undefined}
      />

      <OrbitControls
        enablePan={false}
        minDistance={3.5}
        maxDistance={10}
        maxPolarAngle={Math.PI / 2.05}
      />

      <EffectComposer multisampling={0}>
        <SelectiveBloom
          lights={[keyLightRef, fillLightRef]}
          intensity={bloom.intensity}
          luminanceThreshold={bloom.luminanceThreshold}
          luminanceSmoothing={bloom.luminanceSmoothing}
          radius={bloom.radius}
          mipmapBlur={bloom.mipmapBlur}
        />
      </EffectComposer>
    </Selection>
  )
}

export default function BloomScene({ isDark, domGlowRef }: BloomSceneProps) {
  return (
    <>
      <Leva
        collapsed={false}
        titleBar={{ title: 'Bloom settings', filter: false }}
        theme={{
          sizes: { rootWidth: '320px' },
        }}
      />
      <Canvas
        camera={{ position: [0, 1.25, 5.5], fov: 42 }}
        dpr={[1, 2]}
        gl={{ antialias: false, alpha: true }}
        className="relative h-full w-full touch-none bg-transparent"
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0)
        }}
      >
        <SceneContents isDark={isDark} domGlowRef={domGlowRef} />
      </Canvas>
    </>
  )
}
