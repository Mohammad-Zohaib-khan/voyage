import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import { supportsWebGL, useAllowMotion } from './preferences';

const VERTEX = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

/* A dusk sea in Voyage's palette: forest-dark water, a low clay glow on the horizon and a soft glint
   that drifts with the swell. Cheap value noise only: no textures, no loops beyond two octaves. */
const FRAGMENT = `
precision mediump float;
uniform vec2 u_res;
uniform float u_time;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float horizon = 0.64;
  float sunX = 0.7;
  vec3 deep = vec3(0.039, 0.075, 0.066);
  vec3 sea = vec3(0.105, 0.2, 0.184);
  vec3 glow = vec3(0.788, 0.51, 0.388);
  vec3 col;
  if (uv.y > horizon) {
    float h = (uv.y - horizon) / (1.0 - horizon);
    col = mix(vec3(0.2, 0.27, 0.25), vec3(0.055, 0.098, 0.086), smoothstep(0.0, 0.9, h));
    col += glow * 0.42 * exp(-h * 9.0) * exp(-abs(uv.x - sunX) * 2.2);
  } else {
    float d = horizon - uv.y;
    float persp = 1.0 / (d * 5.0 + 0.12);
    vec2 p = vec2((uv.x - 0.5) * persp * 1.4, persp * 1.6 - u_time * 0.11);
    float w = noise(p * 2.6 + vec2(u_time * 0.04, 0.0)) * 0.62 + noise(p * 6.5 - vec2(0.0, u_time * 0.09)) * 0.38;
    col = mix(sea, deep, smoothstep(0.0, 0.55, d));
    float lane = exp(-abs(uv.x - sunX) * (4.0 + d * 10.0));
    col += glow * smoothstep(0.58, 0.88, w) * lane * (1.0 - d * 1.3) * 0.75;
    col += vec3(0.96, 0.95, 0.92) * smoothstep(0.8, 0.97, w) * 0.05 * (1.0 - d);
    col += glow * 0.3 * exp(-d * 26.0) * exp(-abs(uv.x - sunX) * 1.5);
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * A restrained water shader for the coastal feature. A static CSS gradient sits underneath and is
 * what you see if WebGL is unavailable, fails to compile, or the context is lost. It renders at
 * modest resolution, pauses off-screen and in hidden tabs, and draws a single still frame when
 * reduced motion is on.
 */
export function WaterShader({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const allowMotion = useAllowMotion();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !supportsWebGL()) {
      setFailed(true);
      return;
    }
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) {
      setFailed(true);
      return;
    }
    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vs || !fs) {
      setFailed(true);
      return;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setFailed(true);
      return;
    }
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(program, 'u_res');
    const uTime = gl.getUniformLocation(program, 'u_time');

    let frame = 0;
    let visible = false;
    let lost = false;
    const start = performance.now();

    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 1.25);
      const width = Math.max(1, Math.round(canvas.clientWidth * scale));
      const height = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    const draw = (time: number) => {
      resize();
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, time);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const loop = () => {
      if (!visible || lost || document.hidden) {
        frame = 0;
        return;
      }
      draw((performance.now() - start) / 1000);
      frame = requestAnimationFrame(loop);
    };

    const startLoop = () => {
      if (allowMotion && frame === 0 && visible && !lost) frame = requestAnimationFrame(loop);
    };

    // Reduced motion: one calm still frame.
    if (!allowMotion) draw(12);

    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) {
        if (allowMotion) startLoop();
        else draw(12);
      }
    });
    observer.observe(canvas);

    const resizeObserver = new ResizeObserver(() => {
      if (!allowMotion) draw(12);
    });
    resizeObserver.observe(canvas);

    const onVisibility = () => startLoop();
    document.addEventListener('visibilitychange', onVisibility);

    const onLost = (event: Event) => {
      event.preventDefault();
      lost = true;
      setFailed(true);
    };
    canvas.addEventListener('webglcontextlost', onLost);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [allowMotion]);

  return (
    <div aria-hidden="true" className={cn('absolute inset-0 overflow-hidden', className)}>
      {/* Static fallback, always underneath. */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#0e1916_0%,#33453f_58%,#9a6a52_63%,#1b332e_66%,#0a1311_100%)]" />
      <canvas ref={canvasRef} className={cn('absolute inset-0 size-full transition-opacity duration-700', failed ? 'opacity-0' : 'opacity-100')} />
    </div>
  );
}
