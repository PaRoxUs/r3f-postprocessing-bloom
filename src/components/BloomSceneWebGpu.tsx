import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Leva, useControls } from 'leva'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { bloom } from 'three/addons/tsl/display/BloomNode.js'
import { Fn, emissive, float, luminance, max, mrt, output, pass, smoothstep, vec4 } from 'three/tsl'
import { Color, RenderPipeline, Vector3 } from 'three/webgpu'
import type { ColorRepresentation, Mesh } from 'three/webgpu'
import { bloomIntensityToDomOpacity, bloomRadiusToDomCss } from '../lib/bloomDomSync'

export type BloomSceneWebGpuProps = {
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
    hoverEmissive: { value: 2.2, min: 0, max: 6, step: 0.05, label: 'Hover glow' },
  })
}

function WebGpuBloomPipeline({
  intensity,
  radius,
  threshold,
  smoothing,
}: {
  intensity: number
  radius: number
  threshold: number
  smoothing: number
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

      const scenePassColor = scenePass.getTextureNode('output')
      const emissivePass = scenePass.getTextureNode('emissive')
      const bloomPass = bloom(emissivePass, intensity, radius, threshold)
      bloomPass.smoothWidth.value = smoothing

      pipeline = new RenderPipeline(renderer)
      // renderOutput unpremultiplies first — output premultiplied straight rgb + coverage alpha.
      pipeline.outputNode = Fn(() => {
        const straightRgb = scenePassColor.rgb.add(bloomPass.rgb)
        const bloomAlpha = luminance(bloomPass.rgb)
        // Blur tails are non-zero everywhere; gate alpha so clear areas stay transparent.
        const bloomCoverage = smoothstep(float(0.004), float(0.028), bloomAlpha)
        const alpha = max(scenePassColor.a, bloomCoverage).clamp(0, 1)
        return vec4(straightRgb.mul(alpha), alpha)
      })()
      pipeline.needsUpdate = true

      set({ renderPipeline: pipeline })
    }

    frame = requestAnimationFrame(mountPipeline)

    return () => {
      cancelAnimationFrame(frame)
      set({ renderPipeline: null })
      pipeline?.dispose()
    }
  }, [camera, intensity, isLegacy, radius, renderer, scene, set, smoothing, threshold])

  return null
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

    glow.style.setProperty('--glow-x', `${(worldPosition.x * 0.5 + 0.5) * 100}%`)
    glow.style.setProperty('--glow-y', `${(-worldPosition.y * 0.5 + 0.5) * 100}%`)
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

function TransparentBackground() {
  const scene = useThree((state) => state.scene)
  const renderer = useThree((state) => state.renderer)
  const isLegacy = useThree((state) => state.isLegacy)

  useEffect(() => {
    scene.background = null
    if (!isLegacy) {
      renderer.setClearColor(0x000000, 0)
    }
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

  useEffect(() => {
    invalidate()
  }, [bloom, invalidate])

  const backdropColor = isDark ? '#334155' : '#94a3b8'
  const floorColor = isDark ? '#0f172a' : '#e2e8f0'
  const showFloor = true

  return (
    <>
      <TransparentBackground />
      <WebGpuBloomPipeline
        intensity={bloom.intensity}
        radius={bloom.radius}
        threshold={bloom.luminanceThreshold}
        smoothing={bloom.luminanceSmoothing}
      />
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
        onCreated={({ renderer, isLegacy }) => {
          if (!isLegacy) {
            renderer.setClearColor(0x000000, 0)
          }
        }}
      >
        <SceneContents isDark={isDark} domGlowRef={domGlowRef} />
      </Canvas>
    </>
  )
}
