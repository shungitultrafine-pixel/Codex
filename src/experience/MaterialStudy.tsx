import { ContactShadows } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import './material-study.css'

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uState;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vGrain;

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

  void main() {
    vec3 p = position;
    float coarse = fbm(p * 1.52 + vec3(0.0, uTime * .018, 0.0));
    float grain = fbm(p * 11.0 - uTime * .012);
    float revealed = smoothstep(.42, .7, grain) * uState;
    float displacement = (coarse - .5) * .17 + (grain - .5) * (.026 + revealed * .022);
    p += normal * displacement;
    vGrain = grain;
    vNormal = normalize(normalMatrix * normal);
    vPosition = p;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uState;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vGrain;

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

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 lightA = normalize(vec3(-.65, .72, .95));
    vec3 lightB = normalize(vec3(.75, .25, -.4));
    vec3 view = normalize(-vPosition);
    float key = max(dot(normal, lightA), 0.0);
    float fill = max(dot(normal, lightB), 0.0);
    float rim = pow(1.0 - max(dot(normal, view), 0.0), 3.0);
    float fine = noise(vPosition * 29.0 + uTime * .008);
    float pores = smoothstep(.70, .88, fine) * smoothstep(.45, .82, vGrain);
    vec3 base = mix(vec3(.52, .51, .47), vec3(.70, .685, .63), key);
    base += fill * vec3(.085, .08, .07);
    base = mix(base, base * .76, pores * (.38 + .32 * uState));
    base += (fine - .5) * .042;
    base += rim * vec3(.085, .078, .06);
    gl_FragColor = vec4(base, 1.0);
  }
`

function CameraRig() {
  const { camera, pointer } = useThree()

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const targetX = Math.sin(t * 0.09) * 0.38 + pointer.x * 0.22
    const targetY = 0.13 + Math.cos(t * 0.12) * 0.16 + pointer.y * 0.14
    const targetZ = 7.9 + Math.sin(t * 0.11) * 0.32
    camera.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.018)
    camera.lookAt(0, -0.04, 0)
  })

  return null
}

function Microstructure() {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const material = useRef<THREE.MeshStandardMaterial>(null)
  const samples = useMemo(() => {
    const random = (seed: number) => {
      const x = Math.sin(seed * 912.719) * 43758.5453
      return x - Math.floor(x)
    }

    return Array.from({ length: 42 }, (_, index) => {
      const theta = random(index + 1) * Math.PI * 2
      const y = (random(index + 17) - 0.5) * 1.38
      const radius = Math.sqrt(Math.max(0.14, 1 - y * y))
      const direction = new THREE.Vector3(Math.cos(theta) * radius, y, Math.sin(theta) * radius).normalize()
      const offset = 1.42 + random(index + 33) * 0.075
      const position = direction.multiplyScalar(offset)
      return { position, size: 0.018 + random(index + 49) * 0.035, seed: random(index + 71) }
    })
  }, [])

  useFrame(({ clock }) => {
    if (!mesh.current || !material.current) return
    const state = (Math.sin(clock.getElapsedTime() * 0.075 - 1.1) + 1) * 0.5
    const matrix = new THREE.Matrix4()
    samples.forEach(({ position, size, seed }, index) => {
      const subtleDrift = Math.sin(clock.getElapsedTime() * 0.28 + seed * 10) * state * 0.013
      matrix.compose(
        position.clone().addScaledVector(position, subtleDrift),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(seed * 4, seed * 7, seed * 2)),
        new THREE.Vector3(size, size * 0.74, size),
      )
      mesh.current!.setMatrixAt(index, matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
    material.current.opacity = 0.035 + state * 0.2
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, samples.length]}>
      <icosahedronGeometry args={[1, 2]} />
      <meshStandardMaterial ref={material} color="#77736a" metalness={0} roughness={0.88} transparent depthWrite={false} />
    </instancedMesh>
  )
}

function MaterialMass({ animated = true }: { animated?: boolean }) {
  const mass = useRef<THREE.Mesh>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uState: { value: 0.35 } }), [])

  useFrame(({ clock }) => {
    if (!animated) return
    const t = clock.getElapsedTime()
    const state = (Math.sin(t * 0.075 - 1.1) + 1) * 0.5
    uniforms.uTime.value = t
    uniforms.uState.value = state
    if (mass.current) {
      mass.current.rotation.y = t * 0.055
      mass.current.rotation.x = 0.14 + Math.sin(t * 0.08) * 0.035
      mass.current.rotation.z = Math.sin(t * 0.06) * 0.025
      mass.current.position.y = Math.sin(t * 0.17) * 0.055
    }
  })

  return (
    <group position={[0, -0.16, 0]} rotation={[0, -0.3, 0]} scale={[1.38, 1.08, 0.9]}>
      <mesh ref={mass} castShadow>
        <icosahedronGeometry args={[1.35, 6]} />
        <shaderMaterial fragmentShader={fragmentShader} uniforms={uniforms} vertexShader={vertexShader} />
      </mesh>
      {animated && <Microstructure />}
    </group>
  )
}

function Scene() {
  return (
    <>
      <color args={['#eeece5']} attach="background" />
      <ambientLight color="#f0eee6" intensity={1.65} />
      <directionalLight castShadow color="#fffaf0" intensity={2.6} position={[-4, 5, 4]} />
      <directionalLight color="#d7d2c6" intensity={0.8} position={[4, -1, -3]} />
      <MaterialMass />
      <ContactShadows blur={2.4} far={5} opacity={0.22} position={[0, -1.82, 0]} resolution={1024} scale={7} />
      <CameraRig />
    </>
  )
}

export function MaterialStudy() {
  return (
    <main aria-label="MicronHub material study" className="material-study">
      <Canvas
        camera={{ fov: 29, position: [0, 0.1, 7.9] }}
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        shadows
      >
        <Scene />
      </Canvas>
    </main>
  )
}

function HomeObjectScene() {
  return (
    <>
      <ambientLight color="#f5f3ed" intensity={1.65} />
      <directionalLight color="#fffdf5" intensity={2.9} position={[-4, 5, 4]} />
      <directionalLight color="#bcc0bf" intensity={0.55} position={[4, 1, -3]} />
      <MaterialMass animated={false} />
    </>
  )
}

export function HomeMaterialObject() {
  return (
    <Canvas
      camera={{ fov: 27, position: [0, 0.15, 7.1] }}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
    >
      <HomeObjectScene />
    </Canvas>
  )
}
