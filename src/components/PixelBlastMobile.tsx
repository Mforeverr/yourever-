import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { EffectComposer, EffectPass, RenderPass, Effect } from 'postprocessing'

type PixelBlastVariant = 'square' | 'circle' | 'triangle' | 'diamond'

type PixelBlastMobileProps = {
  variant?: PixelBlastVariant
  pixelSize?: number
  color?: string
  className?: string
  style?: React.CSSProperties
  patternScale?: number
  patternDensity?: number
  speed?: number
  transparent?: boolean
  edgeFade?: number
}

const SHAPE_MAP: Record<PixelBlastVariant, number> = {
  square: 0,
  circle: 1,
  triangle: 2,
  diamond: 3
}

const VERTEX_SRC = `
void main() {
  gl_Position = vec4(position, 1.0);
}
`

const FRAGMENT_SRC_MOBILE = `
precision highp float;

uniform vec3  uColor;
uniform vec2  uResolution;
uniform float uTime;
uniform float uPixelSize;
uniform float uScale;
uniform float uDensity;
uniform float uEdgeFade;
uniform float uViewportScale; // New uniform for mobile viewport adaptation

uniform int   uShapeType;
const int SHAPE_SQUARE   = 0;
const int SHAPE_CIRCLE   = 1;
const int SHAPE_TRIANGLE = 2;
const int SHAPE_DIAMOND  = 3;

out vec4 fragColor;

float Bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x / 2. + a.y * a.y * .75);
}
#define Bayer4(a) (Bayer2(.5*(a))*0.25 + Bayer2(a))
#define Bayer8(a) (Bayer4(.5*(a))*0.25 + Bayer2(a))

#define FBM_OCTAVES     3  // Reduced from 5 for performance
#define FBM_LACUNARITY  1.25
#define FBM_GAIN        1.0

float hash11(float n){ return fract(sin(n)*43758.5453); }

float vnoise(vec3 p){
  vec3 ip = floor(p);
  vec3 fp = fract(p);
  float n000 = hash11(dot(ip + vec3(0.0,0.0,0.0), vec3(1.0,57.0,113.0)));
  float n100 = hash11(dot(ip + vec3(1.0,0.0,0.0), vec3(1.0,57.0,113.0)));
  float n010 = hash11(dot(ip + vec3(0.0,1.0,0.0), vec3(1.0,57.0,113.0)));
  float n110 = hash11(dot(ip + vec3(1.0,1.0,0.0), vec3(1.0,57.0,113.0)));
  float n001 = hash11(dot(ip + vec3(0.0,0.0,1.0), vec3(1.0,57.0,113.0)));
  float n101 = hash11(dot(ip + vec3(1.0,0.0,1.0), vec3(1.0,57.0,113.0)));
  float n011 = hash11(dot(ip + vec3(0.0,1.0,1.0), vec3(1.0,57.0,113.0)));
  float n111 = hash11(dot(ip + vec3(1.0,1.0,1.0), vec3(1.0,57.0,113.0)));
  vec3 w = fp*fp*fp*(fp*(fp*6.0-15.0)+10.0);
  float x00 = mix(n000, n100, w.x);
  float x10 = mix(n010, n110, w.x);
  float x01 = mix(n001, n101, w.x);
  float x11 = mix(n011, n111, w.x);
  float y0  = mix(x00, x10, w.y);
  float y1  = mix(x01, x11, w.y);
  return mix(y0, y1, w.z) * 2.0 - 1.0;
}

float fbm2(vec2 uv, float t){
  vec3 p = vec3(uv * uScale, t);
  float amp = 1.0;
  float freq = 1.0;
  float sum = 1.0;
  for (int i = 0; i < FBM_OCTAVES; ++i){
    sum  += amp * vnoise(p * freq);
    freq *= FBM_LACUNARITY;
    amp  *= FBM_GAIN;
  }
  return sum * 0.5 + 0.5;
}

float maskCircle(vec2 p, float cov){
  float r = sqrt(cov) * .25;
  float d = length(p - 0.5) - r;
  float aa = 0.5 * fwidth(d);
  return cov * (1.0 - smoothstep(-aa, aa, d * 2.0));
}

float maskTriangle(vec2 p, vec2 id, float cov){
  bool flip = mod(id.x + id.y, 2.0) > 0.5;
  if (flip) p.x = 1.0 - p.x;
  float r = sqrt(cov);
  float d  = p.y - r*(1.0 - p.x);
  float aa = fwidth(d);
  return cov * clamp(0.5 - d/aa, 0.0, 1.0);
}

float maskDiamond(vec2 p, float cov){
  float r = sqrt(cov) * 0.564;
  return step(abs(p.x - 0.49) + abs(p.y - 0.49), r);
}

void main(){
  float pixelSize = uPixelSize;
  vec2 fragCoord = gl_FragCoord.xy - uResolution * .5;

  // Mobile viewport adaptation - normalize coordinates for mobile aspect ratios
  float aspectRatio = uResolution.x / uResolution.y;
  vec2 normalizedCoord = fragCoord * uViewportScale;

  // Adjust for mobile portrait orientation
  if (aspectRatio < 1.0) {
    normalizedCoord.x *= aspectRatio;
  }

  vec2 pixelId = floor(normalizedCoord / pixelSize);
  vec2 pixelUV = fract(normalizedCoord / pixelSize);

  float cellPixelSize = 8.0 * pixelSize;
  vec2 cellId = floor(normalizedCoord / cellPixelSize);
  vec2 cellCoord = cellId * cellPixelSize;
  vec2 uv = cellCoord / uResolution * vec2(aspectRatio, 1.0) * uViewportScale;

  float base = fbm2(uv, uTime * 0.05);
  base = base * 0.5 - 0.65;

  float feed = base + (uDensity - 0.5) * 0.3;

  float bayer = Bayer8(normalizedCoord / uPixelSize) - 0.5;
  float bw = step(0.5, feed + bayer);

  float coverage = bw;
  float M;
  if      (uShapeType == SHAPE_CIRCLE)   M = maskCircle (pixelUV, coverage);
  else if (uShapeType == SHAPE_TRIANGLE) M = maskTriangle(pixelUV, pixelId, coverage);
  else if (uShapeType == SHAPE_DIAMOND)  M = maskDiamond(pixelUV, coverage);
  else                                   M = coverage;

  if (uEdgeFade > 0.0) {
    vec2 norm = gl_FragCoord.xy / uResolution;
    float edge = min(min(norm.x, norm.y), min(1.0 - norm.x, 1.0 - norm.y));
    float fade = smoothstep(0.0, uEdgeFade, edge);
    M *= fade;
  }

  vec3 color = uColor;
  fragColor = vec4(color, M);
}
`

const PixelBlastMobile: React.FC<PixelBlastMobileProps> = ({
  variant = 'square',
  pixelSize = 8, // Larger for better mobile performance
  color = '#B19EEF',
  className,
  style,
  patternScale = 2,
  patternDensity = 1,
  speed = 0.3, // Slower for mobile
  transparent = true,
  edgeFade = 0.5
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const threeRef = useRef<{
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    camera: THREE.OrthographicCamera
    material: THREE.ShaderMaterial
    clock: THREE.Clock
    uniforms: {
      uResolution: { value: THREE.Vector2 }
      uTime: { value: number }
      uColor: { value: THREE.Color }
      uShapeType: { value: number }
      uPixelSize: { value: number }
      uScale: { value: number }
      uDensity: { value: number }
      uEdgeFade: { value: number }
      uViewportScale: { value: number }
    }
    resizeObserver?: ResizeObserver
    raf?: number
    quad?: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
    timeOffset?: number
  } | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const canvas = document.createElement('canvas')

    // Try WebGL2 first, fallback to WebGL1
    let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null
    let isWebGL2 = false

    try {
      gl = canvas.getContext('webgl2', {
        antialias: false, // Disable antialiasing for performance
        alpha: true,
        powerPreference: 'low-power' // Favor power saving on mobile
      })
      if (gl) {
        isWebGL2 = true
      }
    } catch (e) {
      console.warn('WebGL2 not supported, trying WebGL1')
    }

    if (!gl) {
      try {
        gl = canvas.getContext('webgl', {
          antialias: false,
          alpha: true,
          powerPreference: 'low-power'
        })
        isWebGL2 = false
      } catch (e) {
        console.error('WebGL not supported')
        return
      }
    }

    if (!gl) return

    const renderer = new THREE.WebGLRenderer({
      canvas,
      context: gl as WebGLRenderingContext,
      antialias: false,
      alpha: true,
      powerPreference: 'low-power'
    })

    // Lower pixel ratio for mobile performance
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5) // Reduced from 2
    renderer.setPixelRatio(pixelRatio)

    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    container.appendChild(renderer.domElement)

    const uniforms = {
      uResolution: { value: new THREE.Vector2(0, 0) },
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uShapeType: { value: SHAPE_MAP[variant] ?? 0 },
      uPixelSize: { value: pixelSize * pixelRatio },
      uScale: { value: patternScale },
      uDensity: { value: patternDensity },
      uEdgeFade: { value: edgeFade },
      uViewportScale: { value: 1.0 } // Initialize with default value
    }

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SRC,
      fragmentShader: FRAGMENT_SRC_MOBILE,
      uniforms,
      transparent: true,
      glslVersion: isWebGL2 ? THREE.GLSL3 : THREE.GLSL1,
      depthTest: false,
      depthWrite: false
    })

    const quadGeom = new THREE.PlaneGeometry(2, 2)
    const quad = new THREE.Mesh(quadGeom, material)
    scene.add(quad)

    const clock = new THREE.Clock()
    const timeOffset = Math.random() * 1000

    const setSize = () => {
      const w = container.clientWidth || 1
      const h = container.clientHeight || 1
      renderer.setSize(w, h, false)
      uniforms.uResolution.value.set(renderer.domElement.width, renderer.domElement.height)
      uniforms.uPixelSize.value = pixelSize * pixelRatio

      // Calculate viewport scale for mobile responsiveness
      const aspectRatio = w / h
      let viewportScale = 1.0

      // Adjust for mobile portrait orientation
      if (aspectRatio < 1.0) {
        // Portrait mobile - scale up to fill vertical space
        viewportScale = 1.0 / aspectRatio
      } else if (aspectRatio > 2.0) {
        // Very wide landscape - scale down
        viewportScale = 0.8
      }

      if (uniforms.uViewportScale) {
        uniforms.uViewportScale.value = viewportScale
      }
    }

    setSize()
    const ro = new ResizeObserver(setSize)
    ro.observe(container)

    let raf = 0
    const animate = () => {
      uniforms.uTime.value = timeOffset + clock.getElapsedTime() * speed
      renderer.render(scene, camera)
      raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)

    threeRef.current = {
      renderer,
      scene,
      camera,
      material,
      clock,
      uniforms,
      resizeObserver: ro,
      raf,
      quad,
      timeOffset
    }

    return () => {
      if (threeRef.current) {
        const t = threeRef.current
        t.resizeObserver?.disconnect()
        cancelAnimationFrame(t.raf!)
        t.quad?.geometry.dispose()
        t.material.dispose()
        t.renderer.dispose()
        if (t.renderer.domElement.parentElement === container) {
          container.removeChild(t.renderer.domElement)
        }
        threeRef.current = null
      }
    }
  }, [variant, pixelSize, color, patternScale, patternDensity, speed, transparent, edgeFade])

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative overflow-hidden ${className ?? ''}`}
      style={style}
      aria-label="PixelBlast mobile background"
    />
  )
}

export default PixelBlastMobile