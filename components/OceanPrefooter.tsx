"use client";

import { useEffect, useRef } from "react";

const VERTEX_SHADER = `
attribute vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }
`;

// Raymarched heightfield sea: every pixel is generated per frame, no images or
// video. The vec3 constants below are the tuned render palette of the water,
// sky, foam and specular highlight — part of the shading model rather than UI
// colour, so they stay here instead of coming from the brand tokens.
const FRAGMENT_SHADER = `
precision highp float;
uniform vec2 uRes; uniform float uTime;
const int MARCH = 7;
const int OCT = 5;
mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453123); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x), mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x), u.y)*2.0-1.0;
}
float octave(vec2 uv, float choppy){
  uv += noise(uv);
  vec2 wv = 1.0 - abs(sin(uv));
  vec2 sw = abs(cos(uv));
  wv = mix(wv, sw, wv);
  return pow(1.0 - pow(wv.x*wv.y, 0.62), choppy);
}
float heightAt(vec3 p, float t, int steps){
  float freq = 0.15, amp = 0.62, choppy = 4.0, h = 0.0, d;
  vec2 uv = p.xz; uv.x *= 0.75;
  for(int i=0;i<OCT;i++){
    if(i>=steps) break;
    d  = octave((uv + t)*freq, choppy);
    d += octave((uv - t)*freq, choppy);
    h += d*amp;
    uv = rot(1.1)*uv; freq *= 1.92; amp *= 0.22;
    choppy = mix(choppy, 1.0, 0.2);
  }
  return p.y - h;
}
vec3 seaNormal(vec3 p, float eps, float t){
  vec3 n;
  n.y = heightAt(p, t, OCT);
  n.x = heightAt(vec3(p.x+eps, p.y, p.z), t, OCT) - n.y;
  n.z = heightAt(vec3(p.x, p.y, p.z+eps), t, OCT) - n.y;
  n.y = eps;
  return normalize(n);
}
float march(vec3 ori, vec3 dir, out vec3 hit, float t){
  float tm = 0.0, tx = 900.0;
  float hx = heightAt(ori + dir*tx, t, 3);
  if(hx > 0.0){ hit = ori + dir*tx; return tx; }
  float hm = heightAt(ori + dir*tm, t, OCT);
  float tmid = 0.0;
  for(int i=0;i<MARCH;i++){
    tmid = mix(tm, tx, hm/(hm-hx));
    hit = ori + dir*tmid;
    float hmid = heightAt(hit, t, OCT);
    if(hmid < 0.0){ tx = tmid; hx = hmid; } else { tm = tmid; hm = hmid; }
  }
  return tmid;
}
vec3 skyCol(vec3 d){
  float y = clamp(d.y*0.5+0.5, 0.0, 1.0);
  vec3 low  = vec3(0.36,0.52,0.76);
  vec3 mid  = vec3(0.17,0.25,0.47);
  vec3 high = vec3(0.06,0.10,0.24);
  vec3 c = mix(low, mid, smoothstep(0.5,0.62,y));
  c = mix(c, high, smoothstep(0.6,0.95,y));
  return c;
}
vec3 shade(vec3 p, vec3 n, vec3 eye, vec3 light, float t){
  float fres = clamp(1.0 - dot(n,-eye), 0.0, 1.0);
  fres = pow(fres, 3.0)*0.62;
  vec3 refl = skyCol(reflect(eye,n));
  vec3 deep = vec3(0.055,0.095,0.215);
  vec3 water = vec3(0.16,0.32,0.55);
  vec3 refr = deep + dot(n, light)*water*0.16;
  vec3 col = mix(refr, refl, fres);
  float atten = max(1.0 - dot(p,p)*0.0009, 0.0);
  col += water*(p.y - 0.62)*0.20*atten;
  float spec = pow(max(dot(reflect(eye,n), light), 0.0), 120.0)*1.6;
  col += vec3(1.0,0.92,0.78)*spec;
  float foam = smoothstep(0.62, 1.05, p.y) * clamp(1.0 - n.y, 0.0, 1.0)*2.2;
  col = mix(col, vec3(0.86,0.93,0.98), clamp(foam,0.0,0.55));
  return col;
}
void main(){
  vec2 uv = gl_FragCoord.xy/uRes.xy;
  uv = uv*2.0-1.0; uv.x *= uRes.x/uRes.y;
  float t = uTime*0.85;
  vec3 ori = vec3(0.0, 3.4, t*3.2);
  vec3 dir = normalize(vec3(uv.x, uv.y - 0.16, -2.0));
  dir.z = -dir.z;
  vec3 hit;
  march(ori, dir, hit, t);
  vec3 light = normalize(vec3(0.0, 0.72, 0.68));
  vec3 dist = hit - ori;
  vec3 n = seaNormal(hit, dot(dist,dist)*(0.14/uRes.x), t);
  vec3 sky = skyCol(dir);
  vec3 sea = shade(hit, n, dir, light, t);
  vec3 col = mix(sky, sea, pow(smoothstep(0.0, -0.035, dir.y), 0.24));
  col = pow(clamp(col,0.0,1.0), vec3(0.72));
  gl_FragColor = vec4(col, 1.0);
}
`;

// Renders below CSS size for speed.
const RENDER_SCALE = 0.7;

export default function OceanPrefooter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) {
      // No WebGL: the section keeps its flat fallback colour.
      return;
    }

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) {
        return null;
      }
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        return null;
      }
      return shader;
    };

    const vertex = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) {
      return;
    }

    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "uRes");
    const uTime = gl.getUniformLocation(program, "uTime");

    const resize = () => {
      const width = Math.max(1, Math.round(canvas.clientWidth * RENDER_SCALE));
      const height = Math.max(1, Math.round(canvas.clientHeight * RENDER_SCALE));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };

    const draw = (seconds: number) => {
      resize();
      gl.uniform1f(uTime, seconds);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    // Reduced motion: paint one still frame and never start the loop.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      draw(12);
      return;
    }

    let frameId = 0;
    let running = false;
    const start = performance.now();

    const loop = (now: number) => {
      draw((now - start) / 1000);
      frameId = requestAnimationFrame(loop);
    };
    const play = () => {
      if (!running) {
        running = true;
        frameId = requestAnimationFrame(loop);
      }
    };
    const pause = () => {
      running = false;
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };

    window.addEventListener("resize", resize);

    // Only burn frames while the section is on screen.
    let observer: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              play();
            } else {
              pause();
            }
          });
        },
        { threshold: 0.01 },
      );
      observer.observe(canvas);
    } else {
      play();
    }

    return () => {
      pause();
      observer?.disconnect();
      window.removeEventListener("resize", resize);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, []);

  return (
    <section
      aria-label="Talk to Arca"
      className="ocean-section relative h-[280px] w-full overflow-hidden min-[721px]:h-[330px]"
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 block h-full w-full"
      />
      <div className="ocean-scrim pointer-events-none absolute inset-0" />

      <div className="relative z-[3] flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
        <h2 className="ocean-title text-pretty font-heading text-[clamp(34px,5.2vw,56px)] font-medium leading-[1.05] tracking-[-0.04em] text-white">
          Don&rsquo;t navigate AI risk alone
        </h2>
        <p className="ocean-copy max-w-[520px] text-pretty text-[clamp(16px,2vw,19px)] leading-relaxed text-white/80">
          Whether you&rsquo;re exploring coverage or ready to get a quote,
          we&rsquo;re here.
        </p>
        {/* TODO: open contact form modal (name, last name, email, phone, message) + connect to Supabase */}
        <button
          type="button"
          className="ocean-cta mt-2 cursor-pointer rounded-full bg-oro px-6 py-3.5 font-heading text-base font-bold tracking-[-0.01em] text-marino transition-colors duration-300 hover:bg-oro-oscuro min-[721px]:px-8 min-[721px]:py-4 min-[721px]:text-[18px]"
        >
          Start a conversation
        </button>
      </div>
    </section>
  );
}
