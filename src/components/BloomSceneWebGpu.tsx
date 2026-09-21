import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Leva, useControls } from 'leva'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { emissive, mrt, output, pass } from 'three/tsl'
import { Color, RenderPipeline, Vector3 } from 'three/webgpu'
import type { ColorRepresentation, Mesh } from 'three/webgpu'
import {
  BLOOM_INTENSITY_REFERENCE_WEBGPU,
  bloomColorToDomGradient,
  bloomIntensityToDomOpacity,
  bloomRadiusToDomCss,
  DEFAULT_BLOOM_COLOR,
  normalizeBloomColor,
} from '../lib/bloomDomSync'
import {
  applyWebGpuBloomOutput,
  applyWebGpuChartClear,
  type WebGpuBloomParams,
} from '../lib/webgpuFirmamentBloom'

export type BloomSceneWebGpuProps = {
  isDark: boolean
  domGlowRef?: RefObject<HTMLDivElement | null>
}

function useBloomSettings() {
  return useControls('Bloom (WebGPU)', {
    bloomColor: { value: DEFAULT_BLOOM_COLOR, label: 'Bloom color' },
    intensity: {
      value: BLOOM_INTENSITY_REFERENCE_WEBGPU,
      min: 0,
      max: 2,
      step: 0.001,
    },
    luminanceThreshold: { value: 0.08, min: 0, max: 1, step: 0.0001 },
    luminanceSmoothing: { value: 0.035, min: 0, max: 1, step: 0.0001 },
    radius: { value: 0.85, min: 0, max: 2, step: 0.0001 },
    hoverEmissive: { value: 0.35, min: 0, max: 3, step: 0.0001, label: 'Hover glow' },
  })
}

function WebGpuBloomPipeline({
  bloomSettings,
  strictTransparentVoid,
}: {
  bloomSettings: WebGpuBloomParams
  strictTransparentVoid: boolean
}) {
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)
  const renderer = useThree((state) => state.renderer)
  const isLegacy = useThree((state) => state.isLegacy)
  const set = useThree((state) => state.set)

  useLayoutEffect(() => {
    if (!renderer || isLegacy) {
      return
    }

    let pipeline: RenderPipeline | null = null
    let frame = 0

    const mountPipeline = () => {
      const scenePass = pass(scene, camera)
      scenePass.setMRT(mrt({ output, emissive }))

      pipeline = new RenderPipeline(renderer)
      applyWebGpuBloomOutput(
        pipeline,
        scenePass,
        true,
        true,
        strictTransparentVoid,
        bloomSettings,
      )

      set({ renderPipeline: pipeline })
    }

    frame = requestAnimationFrame(mountPipeline)

    return () => {
      cancelAnimationFrame(frame)
      set({ renderPipeline: null })
      pipeline?.dispose()
    }
  }, [bloomSettings, camera, isLegacy, renderer, scene, set, strictTransparentVoid])

  return null
}

function DomGlowTracker({
  domGlowRef,
  hoveredMeshRef,
  bloomRadius,
  bloomIntensity,
  bloomColor,
  isDark,
}: {
  domGlowRef?: RefObject<HTMLDivElement | null>
  hoveredMeshRef: RefObject<Mesh | null>
  bloomRadius: number
  bloomIntensity: number
  bloomColor: string
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
    glow.style.setProperty('--glow-gradient', bloomColorToDomGradient(bloomColor, isDark))

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

    glow.style.setProperty('--glow-x', `${(worldPosition.x * 0.5 + 0.5) * 100}%`)
    glow.style.setProperty('--glow-y', `${(-worldPosition.y * 0.5 + 0.5) * 100}%`)
    glow.style.opacity = String(
      bloomIntensityToDomOpacity(bloomIntensity, isDark, BLOOM_INTENSITY_REFERENCE_WEBGPU),
    )
    wasVisible.current = true
  })

  return null
}

function InteractiveBloomBox({
  position,
  color,
  hoverEmissive,
  bloomColor,
  hoveredMeshRef,
}: {
  position: [number, number, number]
  color: ColorRepresentation
  hoverEmissive: number
  bloomColor: string
  hoveredMeshRef?: RefObject<Mesh | null>
}) {
  const [hovered, setHovered] = useState(false)
  const meshRef = useRef<Mesh>(null)
  const emissive = useMemo(() => new Color(bloomColor), [bloomColor])

  return (
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
  )
}

function ChartBackdropSync() {
  const scene = useThree((state) => state.scene)
  const renderer = useThree((state) => state.renderer)
  const isLegacy = useThree((state) => state.isLegacy)

  useLayoutEffect(() => {
    if (!scene || !renderer) return
    applyWebGpuChartClear(renderer, scene, isLegacy, renderer.domElement)
  }, [isLegacy, renderer, scene])

  return null
}

function SceneContents({
  isDark,
  domGlowRef,
}: {
  isDark: boolean
  domGlowRef?: RefObject<HTMLDivElement | null>
}) {
  const hoveredMeshRef = useRef<Mesh | null>(null)
  const bloom = useBloomSettings()
  const invalidate = useThree((state) => state.invalidate)
  // Demo: void halos over transparent backdrop in both themes (hds chart light uses strict void).
  const strictTransparentVoid = false

  const bloomSettings = useMemo<WebGpuBloomParams>(
    () => ({
      intensity: bloom.intensity,
      radius: bloom.radius,
      luminanceThreshold: bloom.luminanceThreshold,
      luminanceSmoothing: bloom.luminanceSmoothing,
    }),
    [bloom.intensity, bloom.luminanceSmoothing, bloom.luminanceThreshold, bloom.radius],
  )

  useEffect(() => {
    invalidate()
  }, [bloom, invalidate])

  const bloomColor = normalizeBloomColor(bloom.bloomColor)

  const backdropColor = isDark ? '#334155' : '#94a3b8'
  const floorColor = isDark ? '#0f172a' : '#e2e8f0'
  const showFloor = true

  return (
    <>
      <ChartBackdropSync />
      <WebGpuBloomPipeline
        bloomSettings={bloomSettings}
        strictTransparentVoid={strictTransparentVoid}
      />
      {domGlowRef ? (
        <DomGlowTracker
          domGlowRef={domGlowRef}
          hoveredMeshRef={hoveredMeshRef}
          bloomRadius={bloom.radius}
          bloomIntensity={bloom.intensity}
          bloomColor={bloomColor}
          isDark={isDark}
        />
      ) : null}
      <ambientLight intensity={isDark ? 0.35 : 0.55} />
      <directionalLight position={[4, 6, 5]} intensity={isDark ? 1.1 : 1.4} />
      <pointLight position={[-3, 2, 2]} intensity={0.6} />

      {showFloor ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.76, 0]}>
          <planeGeometry args={[12, 12]} />
          <meshStandardMaterial color={floorColor} roughness={0.92} metalness={0.05} />
        </mesh>
      ) : null}

      <mesh position={[0.85, 0, -1.35]} scale={[2.6, 2.6, 0.55]}>
        <boxGeometry />
        <meshStandardMaterial color={backdropColor} roughness={0.88} metalness={0.08} />
      </mesh>

      <InteractiveBloomBox
        position={[-1.35, 0, 0.15]}
        color="#4fb8b2"
        hoverEmissive={bloom.hoverEmissive}
        bloomColor={bloomColor}
        hoveredMeshRef={domGlowRef ? hoveredMeshRef : undefined}
      />
      <InteractiveBloomBox
        position={[0.85, 0, 0.55]}
        color="#328f97"
        hoverEmissive={bloom.hoverEmissive}
        bloomColor={bloomColor}
        hoveredMeshRef={domGlowRef ? hoveredMeshRef : undefined}
      />

      <OrbitControls
        enablePan={false}
        minDistance={3.5}
        maxDistance={10}
        maxPolarAngle={Math.PI / 2.05}
      />
    </>
  )
}

export default function BloomSceneWebGpu({ isDark, domGlowRef }: BloomSceneWebGpuProps) {
  return (
    <>
      <Leva
        collapsed={false}
        titleBar={{ title: 'Bloom settings', filter: false }}
        theme={{ sizes: { rootWidth: '320px' } }}
      />
      <Canvas
        camera={{ position: [0, 1.25, 5.5], fov: 42 }}
        dpr={[1, 2]}
        renderer={{ antialias: false, alpha: true }}
        className="relative h-full w-full touch-none bg-transparent"
        onCreated={({ renderer, scene, isLegacy }) => {
          applyWebGpuChartClear(renderer, scene, isLegacy, renderer.domElement)
        }}
      >
        <SceneContents isDark={isDark} domGlowRef={domGlowRef} />
      </Canvas>
    </>
  )
}
