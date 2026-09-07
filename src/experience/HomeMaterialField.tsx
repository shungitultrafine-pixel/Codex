import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import './home-material-field.css'

const MATERIAL_TEXTURE_URL = '/assets/home-material-crystal.png'
const FAR_FRAGMENT_COUNT = 14
const NEAR_FRAGMENT_COUNT = 9
const BASE_CAMERA_Z = 6.4

const noiseGLSL = /* glsl */ `
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + .1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1., 0., 0.)), f.x),
                   mix(hash(i + vec3(0., 1., 0.)), hash(i + vec3(1., 1., 0.)), f.x), f.y),
               mix(mix(hash(i + vec3(0., 0., 1.)), hash(i + vec3(1., 0., 1.)), f.x),
                   mix(hash(i + vec3(0., 1., 1.)), hash(i + vec3(1., 1., 1.)), f.x), f.y), f.z);
  }

  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = .5;
    for (int i = 0; i < 4; i++) {
      value += amplitude * noise(p);
      p = p * 2.04 + vec3(8.12, 2.34, 5.61);
      amplitude *= .5;
    }
    return value;
  }
`

const materialVertexShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;

  ${noiseGLSL}

  float surface(vec2 p) {
    return fbm(vec3(p * 1.8, uTime * 0.02)) - 0.5;
  }

  void main() {
    vUv = uv;
    vec3 p = position;
    float eps = 0.01;
    float h = surface(p.xy);
    float hx = surface(p.xy + vec2(eps, 0.0));
    float hy = surface(p.xy + vec2(0.0, eps));
    float amplitude = 0.005;
    p.z += h * amplitude;
    vec3 tangentX = normalize(vec3(eps, 0.0, (hx - h) * amplitude));
    vec3 tangentY = normalize(vec3(0.0, eps, (hy - h) * amplitude));
    vNormal = normalize(cross(tangentX, tangentY));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`

const materialFragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    vec4 tex = texture2D(uMap, vUv);
    if (tex.a < 0.03) discard;

    vec3 normal = normalize(vNormal);
    vec3 lightA = normalize(vec3(0.58 + sin(uTime * 0.04) * 0.1, 0.74, 0.56 + cos(uTime * 0.033) * 0.1));
    vec3 lightB = normalize(vec3(-0.52, -0.2, -0.32));
    float key = max(dot(normal, lightA), 0.0);
    float fill = max(dot(normal, lightB), 0.0);
    vec3 warm = vec3(1.1, 1.0, 0.86);
    vec3 cool = vec3(0.82, 0.87, 0.98);
    float breathe = 0.97 + 0.03 * sin(uTime * 0.02);
    vec3 shade = vec3(0.66) + key * 0.34 * warm + fill * 0.12 * cool;
    vec3 color = tex.rgb * shade * breathe;
    gl_FragColor = vec4(color, tex.a);
  }
`

const fragmentVertexShader = /* glsl */ `
  attribute float aOpacity;
  attribute float aBlur;
  attribute vec3 aTint;
  varying float vOpacity;
  varying float vBlur;
  varying vec3 vTint;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vOpacity = aOpacity;
    vBlur = aBlur;
    vTint = aTint;
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentFragmentShader = /* glsl */ `
  varying float vOpacity;
  varying float vBlur;
  varying vec3 vTint;
  varying vec2 vUv;

  void main() {
    float d = distance(vUv, vec2(0.5));
    float innerEdge = mix(0.16, -0.4, vBlur);
    float mask = smoothstep(0.5, innerEdge, d);
    float dimming = 1.0 - vBlur * 0.3;
    vec3 fogColor = vec3(0.035, 0.045, 0.06);
    vec3 color = mix(vTint, fogColor, vBlur * 0.55);
    if (mask <= 0.001 || vOpacity <= 0.001) discard;
    gl_FragColor = vec4(color, mask * vOpacity * dimming);
  }
`

type Anchor = { x: number; y: number; r: number; g: number; b: number }

function sampleSilhouetteAnchors(image: HTMLImageElement, count: number): Anchor[] {
  const sampleSize = 128
  const canvas = document.createElement('canvas')
  canvas.width = sampleSize
  canvas.height = sampleSize
  const ctx = canvas.getContext('2d')
  if (!ctx) return []

  ctx.drawImage(image, 0, 0, sampleSize, sampleSize)
  let data: Uint8ClampedArray
  try {
    data = ctx.getImageData(0, 0, sampleSize, sampleSize).data
  } catch {
    return []
  }

  const alphaAt = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= sampleSize || y >= sampleSize) return 0
    return data[(y * sampleSize + x) * 4 + 3]
  }

  const edge: Anchor[] = []
  for (let y = 1; y < sampleSize - 1; y += 2) {
    for (let x = 1; x < sampleSize - 1; x += 2) {
      const a = alphaAt(x, y)
      if (a < 140) continue
      const nearsEdge =
        alphaAt(x + 3, y) < 60 || alphaAt(x - 3, y) < 60 || alphaAt(x, y + 3) < 60 || alphaAt(x, y - 3) < 60
      if (!nearsEdge) continue
      const i = (y * sampleSize + x) * 4
      edge.push({
        x: x / sampleSize - 0.5,
        y: 0.5 - y / sampleSize,
        r: data[i] / 255,
        g: data[i + 1] / 255,
        b: data[i + 2] / 255,
      })
    }
  }

  if (edge.length === 0) return []
  const anchors: Anchor[] = []
  for (let i = 0; i < count; i += 1) {
    anchors.push(edge[Math.floor((i / count) * edge.length) % edge.length])
  }
  return anchors
}

function useContainScale(textureAspect: number) {
  const viewport = useThree((state) => state.viewport)
  return useMemo(() => {
    const containerAspect = viewport.width / viewport.height
    if (containerAspect > textureAspect) {
      const height = viewport.height * 0.8
      return [height * textureAspect, height] as const
    }
    const width = viewport.width * 0.8
    return [width, width / textureAspect] as const
  }, [viewport.width, viewport.height, textureAspect])
}

function MaterialPlane({ texture }: { texture: THREE.Texture }) {
  const image = texture.image as HTMLImageElement
  const textureAspect = image.width / image.height
  const [planeWidth, planeHeight] = useContainScale(textureAspect)
  const uniforms = useMemo(() => ({ uMap: { value: texture }, uTime: { value: 0 } }), [texture])

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.getElapsedTime()
  })

  return (
    <mesh scale={[planeWidth, planeHeight, 1]}>
      <planeGeometry args={[1, 1, 160, 160]} />
      <shaderMaterial
        fragmentShader={materialFragmentShader}
        transparent
        uniforms={uniforms}
        vertexShader={materialVertexShader}
      />
    </mesh>
  )
}

type FragmentBandConfig = {
  zBase: number
  zJitter: number
  scatterMin: number
  scatterMax: number
  travelMin: number
  travelMax: number
  speedMin: number
  speedMax: number
  sizeMin: number
  sizeMax: number
  opacityMax: number
  blurBias: number
  focusRange: number
}

function FragmentField({
  anchors,
  planeWidth,
  planeHeight,
  config,
}: {
  anchors: Anchor[]
  planeWidth: number
  planeHeight: number
  config: FragmentBandConfig
}) {
  const mesh = useRef<THREE.InstancedMesh>(null)

  const seeds = useMemo(
    () =>
      anchors.map((_, index) => ({
        phase: (index / Math.max(anchors.length, 1)) * 1.0,
        speed: config.speedMin + ((index * 37) % 11) * ((config.speedMax - config.speedMin) / 11),
        travel: config.travelMin + ((index * 53) % 17) * ((config.travelMax - config.travelMin) / 17),
        wobble: 0.02 + ((index * 19) % 7) / 160,
        wobbleFreq: 0.4 + ((index * 29) % 5) * 0.2,
        scatter: config.scatterMin + ((index * 61) % 9) * ((config.scatterMax - config.scatterMin) / 9),
        zOffset: config.zBase + (((index * 71) % 13) / 12 - 0.5) * 2 * config.zJitter,
        size: config.sizeMin + ((index * 41) % 9) * ((config.sizeMax - config.sizeMin) / 9),
      })),
    [anchors, config],
  )

  const opacityAttr = useMemo(() => new Float32Array(anchors.length), [anchors.length])
  const blurAttr = useMemo(() => new Float32Array(anchors.length), [anchors.length])
  const tintAttr = useMemo(() => {
    const arr = new Float32Array(anchors.length * 3)
    anchors.forEach((anchor, index) => {
      arr[index * 3] = anchor.r
      arr[index * 3 + 1] = anchor.g
      arr[index * 3 + 2] = anchor.b
    })
    return arr
  }, [anchors])

  useFrame(({ clock, camera }) => {
    if (!mesh.current) return
    const t = clock.getElapsedTime()
    const matrix = new THREE.Matrix4()
    const opacityAttribute = mesh.current.geometry.attributes.aOpacity as THREE.BufferAttribute | undefined
    const blurAttribute = mesh.current.geometry.attributes.aBlur as THREE.BufferAttribute | undefined

    const cameraDrift = camera.position.z - BASE_CAMERA_Z
    const dynamicFocusRange = Math.max(config.focusRange - cameraDrift * 0.5, 0.35)

    anchors.forEach((anchor, index) => {
      const seed = seeds[index]
      const age = (t * seed.speed + seed.phase) % 1
      const eased = 1 - Math.pow(1 - age, 3)
      const dirLength = Math.hypot(anchor.x, anchor.y) || 1
      const dirX = anchor.x / dirLength
      const dirY = anchor.y / dirLength
      const wobble = Math.sin(t * seed.wobbleFreq + seed.phase * 6.28) * seed.wobble * eased

      const baseX = anchor.x * seed.scatter
      const baseY = anchor.y * seed.scatter
      const worldX = (baseX + dirX * seed.travel * eased - dirY * wobble) * planeWidth
      const worldY = (baseY + dirY * seed.travel * eased + dirX * wobble) * planeHeight
      const worldZ = seed.zOffset + Math.sin(t * seed.wobbleFreq * 0.6 + seed.phase * 4.2) * 0.06

      const envelope = 0.4 + 0.6 * Math.sin(Math.PI * age)
      opacityAttr[index] = Math.max(envelope, 0) * config.opacityMax

      const dofBlur = Math.min(Math.abs(worldZ) / dynamicFocusRange, 1)
      blurAttr[index] = Math.min(config.blurBias + dofBlur * (1 - config.blurBias), 1)

      const scale = seed.size * (0.75 + eased * 0.35)
      matrix.compose(
        new THREE.Vector3(worldX, worldY, worldZ),
        new THREE.Quaternion(),
        new THREE.Vector3(scale, scale, scale),
      )
      mesh.current!.setMatrixAt(index, matrix)
    })

    mesh.current.instanceMatrix.needsUpdate = true
    if (opacityAttribute) opacityAttribute.needsUpdate = true
    if (blurAttribute) blurAttribute.needsUpdate = true
  })

  if (anchors.length === 0) return null

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, anchors.length]}>
      <planeGeometry args={[1, 1]}>
        <instancedBufferAttribute attach="attributes-aOpacity" args={[opacityAttr, 1]} />
        <instancedBufferAttribute attach="attributes-aBlur" args={[blurAttr, 1]} />
        <instancedBufferAttribute attach="attributes-aTint" args={[tintAttr, 3]} />
      </planeGeometry>
      <shaderMaterial
        depthWrite={false}
        fragmentShader={fragmentFragmentShader}
        transparent
        vertexShader={fragmentVertexShader}
      />
    </instancedMesh>
  )
}

const FAR_BAND: FragmentBandConfig = {
  zBase: -2.6,
  zJitter: 0.9,
  scatterMin: 1.5,
  scatterMax: 2.8,
  travelMin: 0.03,
  travelMax: 0.07,
  speedMin: 0.015,
  speedMax: 0.03,
  sizeMin: 0.024,
  sizeMax: 0.052,
  opacityMax: 0.26,
  blurBias: 0.45,
  focusRange: 2.2,
}

const NEAR_BAND: FragmentBandConfig = {
  zBase: 0.95,
  zJitter: 0.4,
  scatterMin: 1.0,
  scatterMax: 1.35,
  travelMin: 0.05,
  travelMax: 0.12,
  speedMin: 0.02,
  speedMax: 0.045,
  sizeMin: 0.012,
  sizeMax: 0.026,
  opacityMax: 0.5,
  blurBias: 0.05,
  focusRange: 1.6,
}

function CameraRig() {
  useFrame(({ clock, camera }) => {
    const t = clock.getElapsedTime()
    const targetX = Math.sin(t * 0.045) * 0.34
    const targetY = Math.cos(t * 0.035) * 0.2
    const targetZ = BASE_CAMERA_Z + Math.sin(t * 0.021) * 0.85
    camera.position.x += (targetX - camera.position.x) * 0.012
    camera.position.y += (targetY - camera.position.y) * 0.012
    camera.position.z += (targetZ - camera.position.z) * 0.012
    camera.lookAt(0, 0, 0)
  })
  return null
}

function Scene({ url }: { url: string }) {
  const texture = useLoader(THREE.TextureLoader, url)
  const image = texture.image as HTMLImageElement
  const textureAspect = image.width / image.height
  const [planeWidth, planeHeight] = useContainScale(textureAspect)
  const anchors = useMemo(
    () => sampleSilhouetteAnchors(image, FAR_FRAGMENT_COUNT + NEAR_FRAGMENT_COUNT),
    [image],
  )
  const farAnchors = useMemo(() => anchors.slice(0, FAR_FRAGMENT_COUNT), [anchors])
  const nearAnchors = useMemo(() => anchors.slice(FAR_FRAGMENT_COUNT), [anchors])

  return (
    <>
      <FragmentField anchors={farAnchors} config={FAR_BAND} planeHeight={planeHeight} planeWidth={planeWidth} />
      <MaterialPlane texture={texture} />
      <FragmentField anchors={nearAnchors} config={NEAR_BAND} planeHeight={planeHeight} planeWidth={planeWidth} />
      <CameraRig />
    </>
  )
}

export function HomeMaterialField() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(true)

  useEffect(() => {
    const node = containerRef.current
    if (!node || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { threshold: 0.05 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="home-material-field" ref={containerRef}>
      <Canvas
        camera={{ fov: 34, position: [0, 0, BASE_CAMERA_Z] }}
        dpr={[1, 2]}
        frameloop={active ? 'always' : 'never'}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <Scene url={MATERIAL_TEXTURE_URL} />
        </Suspense>
      </Canvas>
    </div>
  )
}
