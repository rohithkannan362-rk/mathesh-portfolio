/* =========================================================
   MATHESH — Premium Portfolio · main.js
   Three.js (WebGL) + GSAP ScrollTrigger + Lenis smooth scroll
   ========================================================= */
import * as THREE from "three";

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
gsap.registerPlugin(ScrollTrigger);

const isTouch = matchMedia("(hover: none), (pointer: coarse)").matches;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = () => innerWidth < 900;

/* ---------------------------------------------------------
   Text splitting
   --------------------------------------------------------- */
function splitChars(el) {
  const text = el.textContent;
  el.textContent = "";
  el.setAttribute("aria-label", text);
  text.split(" ").forEach((word, wi, arr) => {
    const w = document.createElement("span");
    w.style.cssText = "display:inline-block;white-space:nowrap";
    w.setAttribute("aria-hidden", "true");
    [...word].forEach((c) => {
      const s = document.createElement("span");
      s.className = "char";
      s.textContent = c;
      w.appendChild(s);
    });
    el.appendChild(w);
    if (wi < arr.length - 1) el.appendChild(document.createTextNode(" "));
  });
  return el.querySelectorAll(".char");
}
function splitWords(el, cls = "word") {
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = "";
  words.forEach((w, i) => {
    const outer = document.createElement("span");
    outer.className = cls;
    const inner = document.createElement("span");
    inner.textContent = w;
    outer.appendChild(inner);
    el.appendChild(outer);
    if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
  });
  return el.querySelectorAll(`.${cls} > span`);
}

document.querySelectorAll(".split-chars").forEach(splitChars);

// make the giant hero name fill the full width exactly
const heroTitle = document.querySelector(".hero__title");
function fitHero() {
  const inner = heroTitle.querySelector(".split-chars");
  inner.style.display = "inline-block";
  // measure at a fixed size on ONE line, so wrapping can't skew the result
  heroTitle.style.fontSize = "100px";
  heroTitle.style.whiteSpace = "nowrap";
  const avail = heroTitle.parentElement.clientWidth;
  const narrow = innerWidth < 900;
  // phones/tablets: the name wraps onto two lines, so the longest word must fit
  const words = [...inner.children].map((w) => w.getBoundingClientRect().width);
  const w = narrow ? Math.max(...words) : inner.getBoundingClientRect().width;
  const share = narrow ? 0.97 : innerWidth < 1200 ? 0.8 : 0.64; // ~2/3 of the width on desktop
  heroTitle.style.whiteSpace = "";
  heroTitle.style.fontSize = Math.floor((100 * avail * share) / w) + "px";
}
fitHero();
document.fonts?.ready.then(fitHero);
// debounced: mobile browsers fire resize constantly while the URL bar slides
let fitT = 0;
let lastW = innerWidth;
addEventListener("resize", () => {
  if (innerWidth === lastW) return; // height-only change (URL bar) — nothing to refit
  lastW = innerWidth;
  clearTimeout(fitT);
  fitT = setTimeout(fitHero, 120);
});

document.querySelectorAll(".split-words").forEach((el) => splitWords(el));
document.querySelectorAll(".fill-text").forEach((el) => splitWords(el, "fw"));

// circular text (portrait badge + welcome screen)
document.querySelectorAll(".portrait__orbit span, .pl-face__orbit span").forEach((orbit) => {
  const t = orbit.textContent;
  const rad = orbit.parentElement.offsetWidth / 2 - 6;
  orbit.textContent = "";
  [...t].forEach((c, i) => {
    const s = document.createElement("i");
    s.textContent = c;
    s.style.cssText = `position:absolute;left:50%;top:6px;font-style:normal;transform-origin:0 ${rad}px;transform:rotate(${(i / t.length) * 360}deg)`;
    orbit.appendChild(s);
  });
});

/* ---------------------------------------------------------
   Smooth scroll (Lenis) bound to GSAP ticker
   --------------------------------------------------------- */
// always start at the top: the intro, hero video and its sound are built around it
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
scrollTo(0, 0);

let lenis = null;
if (window.Lenis && !reduceMotion) {
  lenis = new window.Lenis({ duration: 1.25, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
  lenis.stop();
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (id.length < 2 && id !== "#top") return;
    const target = id === "#top" ? 0 : document.querySelector(id);
    if (target === null) return;
    e.preventDefault();
    if (document.body.classList.contains("is-loading")) return; // page isn't handed over yet
    if (document.body.classList.contains("menu-open")) setMenu(false);
    if (lenis) { lenis.start(); lenis.scrollTo(target, { duration: 1.8 }); }
    else if (target === 0) window.scrollTo({ top: 0, behavior: "smooth" });
    else target.scrollIntoView({ behavior: "smooth" });
  });
});

/* ---------------------------------------------------------
   WebGL — iridescent morphing blob + particle galaxy + rings
   --------------------------------------------------------- */
const canvas = document.getElementById("webgl");
// WebGL can be unavailable (old GPUs, blocked drivers) — the site must still work without it
let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile() ? 1.5 : 1.75));
  renderer.setSize(innerWidth, innerHeight);
  renderer.setClearColor(0x0a0a0a, 1);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // shaders are authored in display space
} catch (e) {
  renderer = null;
  canvas.style.display = "none";
}
const PR = renderer ? renderer.getPixelRatio() : 1;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0, 6);

const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const blobUniforms = {
  uTime: { value: 0 },
  uStrength: { value: 0.22 },
  uDensity: { value: 0.95 },
  uTwist: { value: 0.25 },
  uBurst: { value: 0 },
  uHue: { value: 0 },
  uMouse: { value: new THREE.Vector2() },
};
/* ---- Morphing particle sculpture (ivory + champagne gold) ---- */
blobUniforms.uSpin = { value: 0 };
blobUniforms.uBeam = { value: 0 };
blobUniforms.uPR = { value: PR };
blobUniforms.uPointer = { value: new THREE.Vector2(99, 99) };
const group = new THREE.Group();
scene.add(group);
const sculpt = new THREE.Group();
sculpt.scale.setScalar(0.56);
group.add(sculpt);

const PN = isMobile() ? 7000 : 15000;
const rnd = (a, b) => a + Math.random() * (b - a);
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
function shapeSphere() {
  const a = new Float32Array(PN * 3);
  for (let i = 0; i < PN; i++) {
    const y = 1 - (2 * (i + 0.5)) / PN, r = Math.sqrt(1 - y * y), th = Math.PI * (3 - Math.sqrt(5)) * i, R = 2.2 + gauss() * 0.04;
    a.set([Math.cos(th) * r * R, y * R, Math.sin(th) * r * R], i * 3);
  }
  return a;
}
function shapeKnot() {
  const a = new Float32Array(PN * 3);
  for (let i = 0; i < PN; i++) {
    const t = (i / PN) * Math.PI * 2, r = Math.cos(3 * t) + 2.2;
    const cx = r * Math.cos(2 * t), cy = r * Math.sin(2 * t), cz = -Math.sin(3 * t);
    const tube = 0.32 + gauss() * 0.05, ang = rnd(0, Math.PI * 2);
    a.set([(cx + Math.cos(ang) * tube) * 0.78, (cy + Math.sin(ang) * tube) * 0.78, (cz * 1.3 + Math.sin(ang * 1.3) * tube) * 0.78], i * 3);
  }
  return a;
}
function shapeHelix() {
  const a = new Float32Array(PN * 3);
  for (let i = 0; i < PN; i++) {
    const k = Math.random(), t = rnd(-1, 1), ang = t * Math.PI * 4, y = t * 3.4;
    if (k < 0.8) { const s = k < 0.4 ? 0 : Math.PI, R = 1.15 + gauss() * 0.05; a.set([Math.cos(ang + s) * R, y + gauss() * 0.04, Math.sin(ang + s) * R], i * 3); }
    else { const ty = Math.round(t * 22) / 22, aa = ty * Math.PI * 4, l = rnd(-1, 1); a.set([Math.cos(aa) * 1.15 * l, ty * 3.4, Math.sin(aa) * 1.15 * l], i * 3); }
  }
  return a;
}
function shapeRing() {
  const a = new Float32Array(PN * 3);
  for (let i = 0; i < PN; i++) {
    const ang = rnd(0, Math.PI * 2), band = Math.random() < 0.7 ? 3.2 : 3.75, R = band + gauss() * (band > 3.5 ? 0.03 : 0.12);
    a.set([Math.cos(ang) * R, gauss() * 0.05, Math.sin(ang) * R], i * 3);
  }
  return a;
}
function shapeWave() {
  const a = new Float32Array(PN * 3), side = Math.ceil(Math.sqrt(PN));
  for (let i = 0; i < PN; i++) {
    const x = ((i % side) / side - 0.5) * 9, z = (Math.floor(i / side) / side - 0.5) * 9;
    a.set([x, Math.sin(x * 0.9) * 0.35 + Math.cos(z * 1.1) * 0.35, z], i * 3);
  }
  return a;
}
function shapeGalaxy() {
  const a = new Float32Array(PN * 3);
  for (let i = 0; i < PN; i++) {
    const arm = i % 3, r = Math.pow(Math.random(), 1.6) * 3.6 + 0.1, ang = arm * ((Math.PI * 2) / 3) + r * 1.15, sp = 0.22 * (1 + r * 0.25);
    a.set([Math.cos(ang) * r + gauss() * sp, gauss() * 0.12 * (1.2 - r / 4), Math.sin(ang) * r + gauss() * sp], i * 3);
  }
  return a;
}
const SHAPES = [shapeSphere(), shapeKnot(), shapeHelix(), shapeRing(), shapeWave(), shapeGalaxy()];
const pGeo2 = new THREE.BufferGeometry();
pGeo2.setAttribute("position", new THREE.BufferAttribute(SHAPES[0].slice(), 3));
SHAPES.forEach((s, i) => pGeo2.setAttribute("aP" + i, new THREE.BufferAttribute(s, 3)));
const pRand2 = new Float32Array(PN);
for (let i = 0; i < PN; i++) pRand2[i] = Math.random();
pGeo2.setAttribute("aRand", new THREE.BufferAttribute(pRand2, 1));

const SU = {
  uTime: { value: 0 }, uFrom: { value: 0 }, uTo: { value: 0 }, uMix: { value: 0 },
  uIntro: { value: 0 }, uBurst: { value: 0 }, uNoise: { value: 0.08 },
  uMouse: { value: new THREE.Vector2(9, 9) }, uAspect: { value: innerWidth / innerHeight },
  uPR: { value: PR }, uSize: { value: isMobile() ? 12 : 9.5 }, uAlpha: { value: 1 },
};
const sculptPoints = new THREE.Points(pGeo2, new THREE.ShaderMaterial({
  uniforms: SU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */ `
    uniform float uTime, uFrom, uTo, uMix, uIntro, uBurst, uNoise, uAspect, uPR, uSize;
    uniform vec2 uMouse;
    attribute vec3 aP0, aP1, aP2, aP3, aP4, aP5;
    attribute float aRand;
    varying float vA; varying float vR;
    ${NOISE}
    vec3 shape(float i){
      if (i < 0.5) return aP0; if (i < 1.5) return aP1; if (i < 2.5) return aP2;
      if (i < 3.5) return aP3; if (i < 4.5) return aP4; return aP5;
    }
    void main(){
      float m = clamp((uMix - aRand*0.35) / 0.65, 0.0, 1.0);
      m = m*m*(3.0-2.0*m);
      vec3 p = mix(shape(uFrom), shape(uTo), m);
      float fly = sin(m*3.14159);
      p += vec3(snoise(p*0.6+aRand*4.0), snoise(p*0.6+7.0), snoise(p*0.6+13.0)) * fly * 0.9;
      float t = uTime*0.18;
      p += vec3(snoise(p*0.7 + t), snoise(p*0.7 + t + 31.0), snoise(p*0.7 + t + 57.0)) * uNoise;
      p *= 1.0 + (1.0-uIntro) * (2.0 + aRand*6.0);
      p += normalize(p+0.0001) * uBurst * (0.4 + aRand*1.4);
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      vec4 clip = projectionMatrix * mv;
      vec2 ndc = clip.xy/clip.w;
      vec2 d = (ndc - uMouse) * vec2(uAspect, 1.0);
      float f = smoothstep(0.32, 0.0, length(d));
      mv.xy += normalize(d + 0.0001) * f * 0.55 * vec2(1.0/uAspect, 1.0) * -mv.z * 0.25;
      gl_Position = projectionMatrix * mv;
      gl_PointSize = (0.55 + aRand*1.3) * uPR * uSize / -mv.z * (1.0 + f*1.5);
      vA = smoothstep(18.0, 3.0, -mv.z) * (0.35 + aRand*0.65) * uIntro;
      vR = aRand;
    }`,
  fragmentShader: /* glsl */ `
    uniform float uAlpha;
    varying float vA; varying float vR;
    void main(){
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      float a = smoothstep(0.5, 0.05, d);
      vec3 ivory = vec3(0.93, 0.91, 0.86);
      vec3 gold = vec3(0.86, 0.70, 0.42);
      vec3 c = mix(ivory, gold, step(0.78, vR));
      gl_FragColor = vec4(c, a * vA * 0.85 * uAlpha);
    }`,
}));
sculpt.add(sculptPoints);

// which shape each section shows
const SHAPE_FOR = [
  { sel: "#hero", shape: 0 }, { sel: "#about", shape: 1 }, { sel: ".marquee-wrap", shape: 1 },
  { sel: "#skills", shape: 4 }, { sel: "#work", shape: 3 }, { sel: "#journey", shape: 2 }, { sel: "#contact", shape: 0 },
].map((k) => ({ ...k, el: document.querySelector(k.sel) }));

// ---- scene state driven by scroll + mouse ----
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
const state = { x: 0.45, y: 0.05, s: 0, hue: 0, intro: 0 };
const keyframes = [
  { sel: "#hero",     x: 0.48, y: 0.18,  s: 1.0,  hue: 0, mx: 0,   ms: 0.62, my: 0.55 },
  { sel: "#about",    x: 0.58, y: 0.0,   s: 0.85, hue: 0, mx: 0,   ms: 0.5 },
  { sel: ".marquee-wrap", x: 0.5, y: 0.0, s: 0.75, hue: 0, mx: 0,  ms: 0.5 },
  { sel: "#skills",   x: 0.0,  y: -0.55, s: 1.0,  hue: 0, mx: 0,   ms: 0.7 },
  { sel: "#work",     x: 0.0,  y: 0.05,  s: 1.1,  hue: 0, mx: 0,   ms: 0.6 },
  { sel: "#journey",  x: 0.78, y: 0.0,   s: 0.85, hue: 0, mx: 0.4, ms: 0.5 },
  { sel: "#contact",  x: 0.6,  y: 0.15,  s: 0.72, hue: 0, mx: 0,   ms: 0.45 },
].map((k) => ({ ...k, el: document.querySelector(k.sel) }));

/* Section positions are measured once (and again after every layout change),
   instead of calling getBoundingClientRect on 14 elements every frame. */
let shapeTops = [], keyTops = [], heroBottom = innerHeight;
const heroSection = document.querySelector("#hero");
function measureSections() {
  const y = scrollY;
  shapeTops = SHAPE_FOR.map((k) => k.el.getBoundingClientRect().top + y);
  keyTops = keyframes.map((k) => k.el.getBoundingClientRect().top + y);
  heroBottom = heroSection.getBoundingClientRect().bottom + y;
}
measureSections();
ScrollTrigger.addEventListener("refresh", measureSections);
addEventListener("load", measureSections);

let sVel = 0, sLast = scrollY;
function updateSculpt() {
  const mid = scrollY + innerHeight * 0.5;
  const tops = shapeTops;
  let i = 0;
  while (i < SHAPE_FOR.length - 1 && mid > tops[i + 1]) i++;
  const a = SHAPE_FOR[i], b = SHAPE_FOR[Math.min(i + 1, SHAPE_FOR.length - 1)];
  let t = a === b ? 0 : (mid - tops[i]) / (tops[i + 1] - tops[i]);
  t = Math.min(Math.max(t, 0), 1);
  SU.uFrom.value = a.shape; SU.uTo.value = b.shape;
  SU.uMix.value = Math.min(Math.max((t - 0.55) / 0.45, 0), 1);
  sVel += (scrollY - sLast - sVel) * 0.12; sLast = scrollY;
  SU.uTime.value = blobUniforms.uTime.value;
  SU.uNoise.value = 0.07 + Math.min(Math.abs(sVel) * 0.004, 0.35);
  SU.uIntro.value = Math.min(state.intro, 1);
  SU.uBurst.value = blobUniforms.uBurst.value * 2;
  SU.uMouse.value.set(isTouch ? 9 : mouse.sx, isTouch ? 9 : mouse.sy);
  SU.uAspect.value = innerWidth / innerHeight;
  const dimTarget = isMobile() && scrollY > innerHeight * 0.6 ? 0.4 : 1;
  SU.uAlpha.value += (dimTarget - SU.uAlpha.value) * 0.06;
  sculpt.rotation.y = SU.uTime.value * 0.07;
}

/* ---------------------------------------------------------
   Gold & silver dust — a deep field of slowly rising metallic
   motes behind every section. Infinite (wraps), parallax on
   scroll and mouse, twinkles. One draw call.
   --------------------------------------------------------- */
const DUST = reduceMotion ? 0 : isMobile() ? 650 : 1600;
const dPos = new Float32Array(DUST * 3);
const dRand = new Float32Array(DUST * 2);
for (let i = 0; i < DUST; i++) {
  dPos[i * 3] = rnd(-13, 13);
  dPos[i * 3 + 1] = rnd(-8, 8);
  dPos[i * 3 + 2] = rnd(-9, 2.5);
  dRand[i * 2] = Math.random();
  dRand[i * 2 + 1] = Math.random();
}
const dGeo = new THREE.BufferGeometry();
dGeo.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
dGeo.setAttribute("aRand", new THREE.BufferAttribute(dRand, 2));
const DU = {
  uTime: { value: 0 }, uScroll: { value: 0 }, uPR: { value: PR }, uIntro: { value: 0 },
  uMouse: { value: new THREE.Vector2() },
};
const dust = new THREE.Points(dGeo, new THREE.ShaderMaterial({
  uniforms: DU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */ `
    uniform float uTime, uScroll, uPR, uIntro; uniform vec2 uMouse;
    attribute vec2 aRand; varying float vA; varying float vKind;
    void main(){
      vec3 p = position;
      float depth = (p.z + 9.0) / 11.5;                 // 0 far … 1 near
      // rise slowly, nearer motes faster; scroll pushes the field up (parallax)
      p.y += uTime * (0.05 + aRand.x * 0.09) + uScroll * (0.0018 + depth * 0.0042);
      p.y = mod(p.y + 8.0, 16.0) - 8.0;                 // infinite vertical wrap
      p.x += sin(uTime * 0.23 + aRand.y * 40.0) * (0.15 + depth * 0.25);
      p.xy += uMouse * depth * vec2(0.35, 0.22);
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      float tw = 0.55 + 0.45 * sin(uTime * (1.2 + aRand.y * 2.4) + aRand.x * 60.0);
      float big = step(0.965, aRand.x);                 // a few larger bokeh motes
      gl_PointSize = (1.4 + aRand.y * 2.2 + big * 7.0) * uPR * (6.5 / -mv.z);
      vA = tw * (0.35 + depth * 0.65) * (1.0 - big * 0.72) * uIntro;
      vKind = aRand.y;
    }`,
  fragmentShader: /* glsl */ `
    varying float vA; varying float vKind;
    void main(){
      vec2 c = gl_PointCoord - 0.5;
      float d = length(c);
      if (d > 0.5) discard;
      float core = smoothstep(0.22, 0.0, d);
      float halo = exp(-d * d * 18.0) * 0.55;
      vec3 gold   = vec3(0.95, 0.80, 0.50);
      vec3 silver = vec3(0.86, 0.89, 0.94);
      vec3 col = mix(gold, silver, step(0.55, vKind));
      col = mix(col, vec3(1.0), core * 0.55);           // hot white centre
      gl_FragColor = vec4(col, (core + halo) * vA * 0.75);
    }`,
}));
dust.renderOrder = -1;
scene.add(dust);

function scrollTarget() {
  const mid = scrollY + innerHeight * 0.5;
  const tops = keyTops;
  let i = 0;
  while (i < keyframes.length - 1 && mid > tops[i + 1]) i++;
  const a = keyframes[i], b = keyframes[Math.min(i + 1, keyframes.length - 1)];
  const span = (tops[i + 1] ?? tops[i] + 1) - tops[i];
  let t = a === b ? 0 : (mid - tops[i]) / span;
  t = Math.min(Math.max(t, 0), 1);
  t = t * t * (3 - 2 * t);
  const m = isMobile();
  const lerp = (p, q) => p + (q - p) * t;
  return {
    x: m ? lerp(a.mx, b.mx) : lerp(a.x, b.x),
    y: m ? lerp(a.my ?? a.y * 0.5, b.my ?? b.y * 0.5) : lerp(a.y, b.y),
    s: m ? lerp(a.ms, b.ms) : lerp(a.s, b.s),
    hue: lerp(a.hue, b.hue),
  };
}

let velocity = 0;
let spin = 0;
let lastScroll = scrollY;
const clock = new THREE.Clock();

function render() {
  const time = clock.getElapsedTime();

  mouse.sx += (mouse.x - mouse.sx) * 0.06;
  mouse.sy += (mouse.y - mouse.sy) * 0.06;

  const sc = scrollY;
  velocity += ((sc - lastScroll) - velocity) * 0.1;
  lastScroll = sc;

  // the full-screen hero video covers the canvas completely — don't spend GPU drawing it
  if (sc + innerHeight <= heroBottom - 2) { blobUniforms.uTime.value = time; return; }

  updateSculpt();
  const tgt = scrollTarget();
  state.x += (tgt.x - state.x) * 0.06;
  state.y += (tgt.y - state.y) * 0.06;
  state.hue += (tgt.hue - state.hue) * 0.05;
  const sTarget = tgt.s * state.intro;
  state.s += (sTarget - state.s) * 0.07;

  const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
  const halfW = halfH * camera.aspect;

  group.position.set(state.x * halfW + mouse.sx * 0.15, state.y * halfH + mouse.sy * 0.1, 0);
  const sc3 = Math.max(state.s, 0.0001) * (isMobile() ? 0.85 : 1);
  group.scale.setScalar(sc3);
  group.rotation.y = mouse.sx * 0.45;
  group.rotation.x = -mouse.sy * 0.3 + Math.sin(time * 0.25) * 0.05;

  blobUniforms.uTime.value = time;
  blobUniforms.uHue.value = state.hue;
  spin += Math.min(Math.abs(velocity) * 0.0009, 0.04) + blobUniforms.uBurst.value * 0.05;
  blobUniforms.uSpin.value = spin;
  blobUniforms.uBurst.value *= 0.94;

  DU.uTime.value = time;
  DU.uScroll.value = sc;
  DU.uIntro.value = Math.min(state.intro, 1);
  DU.uMouse.value.set(mouse.sx, mouse.sy);

  camera.position.x += (mouse.sx * 0.25 - camera.position.x) * 0.05;
  camera.position.y += (mouse.sy * 0.18 - camera.position.y) * 0.05;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
}
if (renderer) gsap.ticker.add(render);

// debounced resize — avoids re-allocating the GL buffers dozens of times per second
let rsT = 0;
addEventListener("resize", () => {
  clearTimeout(rsT);
  rsT = setTimeout(() => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer?.setSize(innerWidth, innerHeight);
    measureSections();
  }, 100);
});

// click anywhere = shockwave on the sculpture
addEventListener("pointerdown", () => {
  gsap.to(blobUniforms.uBurst, { value: 0.55, duration: 0.25, ease: "power2.out" });
});

/* ---------------------------------------------------------
   Cursor, spotlight, magnetic elements
   --------------------------------------------------------- */
const cursor = document.querySelector(".cursor");
const dot = document.querySelector(".cursor__dot");
const ring = document.querySelector(".cursor__ring");
const label = document.querySelector(".cursor__label");
const pos = { x: innerWidth / 2, y: innerHeight / 2 };
const ringPos = { ...pos };

addEventListener("pointermove", (e) => {
  pos.x = e.clientX; pos.y = e.clientY;
  mouse.x = (e.clientX / innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / innerHeight) * 2 + 1;
}, { passive: true });

if (!isTouch) {
  let cursorIdle = false;
  gsap.ticker.add(() => {
    const dx = pos.x - ringPos.x, dy = pos.y - ringPos.y;
    if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) { if (cursorIdle) return; cursorIdle = true; } else cursorIdle = false;
    ringPos.x += dx * 0.16;
    ringPos.y += dy * 0.16;
    dot.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
    ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;
  });
  addEventListener("pointerdown", () => cursor.classList.add("is-down"));
  addEventListener("pointerup", () => cursor.classList.remove("is-down"));
  // hide the custom cursor when the pointer leaves the window
  document.documentElement.addEventListener("pointerleave", () => (cursor.style.opacity = "0"));
  document.documentElement.addEventListener("pointerenter", () => (cursor.style.opacity = ""));

  document.querySelectorAll("[data-cursor]").forEach((el) => {
    el.addEventListener("pointerenter", () => {
      const type = el.dataset.cursor;
      cursor.classList.add(type === "view" ? "is-view" : "is-hover");
      label.textContent = el.dataset.cursorLabel || "";
    });
    el.addEventListener("pointerleave", () => cursor.classList.remove("is-view", "is-hover"));
  });

  document.querySelectorAll(".magnetic").forEach((el) => {
    const strength = el.classList.contains("btn-circle") ? 0.45 : 0.35;
    const xTo = gsap.quickTo(el, "x", { duration: 0.8, ease: "elastic.out(1, 0.4)" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.8, ease: "elastic.out(1, 0.4)" });
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    });
    el.addEventListener("pointerleave", () => { xTo(0); yTo(0); });
  });

  // hero letters react to the cursor — at most once per frame, with quickTo (no tween pile-up)
  const heroChars = [...document.querySelectorAll(".hero__title .char")].map((c) => ({
    c, y: gsap.quickTo(c, "y", { duration: 0.6, ease: "power3.out" }), sk: gsap.quickTo(c, "skewX", { duration: 0.6, ease: "power3.out" }),
  }));
  let charFrame = 0;
  addEventListener("pointermove", (e) => {
    if (charFrame || scrollY > innerHeight || document.body.classList.contains("is-loading")) return;
    const ex = e.clientX, ey = e.clientY;
    charFrame = requestAnimationFrame(() => {
      charFrame = 0;
      const rects = heroChars.map((h) => h.c.getBoundingClientRect()); // read all, then write
      heroChars.forEach((h, i) => {
        const r = rects[i];
        const dx = ex - (r.left + r.width / 2);
        const dy = ey - (r.top + r.height / 2);
        const f = Math.max(0, 1 - Math.hypot(dx, dy) / 420);
        h.y(-f * 10);
        h.sk((dx / 420) * f * -8);
      });
    });
  }, { passive: true });
}

/* ---------------------------------------------------------
   Portrait 3D tilt + holographic glare
   --------------------------------------------------------- */
const portrait = document.querySelector(".portrait");
const card = document.querySelector(".portrait__card");
if (portrait && !isTouch) {
  const rx = gsap.quickTo(card, "rotationX", { duration: 0.8, ease: "power3.out" });
  const ry = gsap.quickTo(card, "rotationY", { duration: 0.8, ease: "power3.out" });
  portrait.addEventListener("pointermove", (e) => {
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry((px - 0.5) * 18);
    rx(-(py - 0.5) * 18);
    card.style.setProperty("--gx", px * 100 + "%");
    card.style.setProperty("--gy", py * 100 + "%");
    card.style.setProperty("--ga", 90 + px * 60 + "deg");
  });
  portrait.addEventListener("pointerleave", () => { rx(0); ry(0); });
}

/* ---------------------------------------------------------
   Skills — interactive 3D tag sphere
   --------------------------------------------------------- */
const SKILLS = [
  "React.js", "Node.js", "Express.js", "MongoDB", "JavaScript", "Java", "Python", "SQL", "PostgreSQL", "MySQL",
  "Firebase", "Django", "REST APIs", "JWT", "bcrypt", "Gemini AI", "Tailwind CSS", "Bootstrap", "HTML5", "CSS3",
  "Three.js", "React Three Fiber", "GSAP", "Framer Motion", "Vite", "Razorpay", "Web Speech API",
  "Git", "GitHub", "Postman", "Vercel", "System Design", "API Design", "DSA", "Agile",
];
const tagsEl = document.querySelector(".sphere__tags");
const sphereEl = document.querySelector(".sphere");
const tags = SKILLS.map((name, i) => {
  const el = document.createElement("span");
  el.className = "sphere__tag" + (i % 5 === 0 ? " hl" : "");
  el.textContent = name;
  tagsEl.appendChild(el);
  const phi = Math.acos(-1 + (2 * i + 1) / SKILLS.length);
  const theta = Math.sqrt(SKILLS.length * Math.PI) * phi;
  return { el, x: Math.cos(theta) * Math.sin(phi), y: Math.sin(theta) * Math.sin(phi), z: Math.cos(phi) };
});
const rot = { vx: 0.003, vy: 0.004, tx: 0.003, ty: 0.004, dragging: false, lx: 0, ly: 0 };
sphereEl.addEventListener("pointermove", (e) => {
  const r = sphereEl.getBoundingClientRect();
  if (rot.dragging) {
    rot.vy = (e.clientX - rot.lx) * 0.0025;
    rot.vx = -(e.clientY - rot.ly) * 0.0025;
    rot.lx = e.clientX; rot.ly = e.clientY;
    return;
  }
  rot.ty = ((e.clientX - r.left) / r.width - 0.5) * 0.02;
  rot.tx = -((e.clientY - r.top) / r.height - 0.5) * 0.02;
});
sphereEl.addEventListener("pointerdown", (e) => { rot.dragging = true; rot.lx = e.clientX; rot.ly = e.clientY; });
addEventListener("pointerup", () => { rot.dragging = false; });
sphereEl.addEventListener("pointerleave", () => { rot.tx = 0.003; rot.ty = 0.004; });

let sphereVisible = false;
let sphereR = sphereEl.offsetWidth * 0.4;
new ResizeObserver(() => (sphereR = sphereEl.offsetWidth * 0.4)).observe(sphereEl);
new IntersectionObserver(([en]) => (sphereVisible = en.isIntersecting)).observe(sphereEl);
gsap.ticker.add(() => {
  if (!sphereVisible) return;
  if (!rot.dragging) {
    rot.vx += (rot.tx - rot.vx) * 0.05;
    rot.vy += (rot.ty - rot.vy) * 0.05;
  }
  const R = sphereR;
  const cx = Math.cos(rot.vx), sx = Math.sin(rot.vx), cy = Math.cos(rot.vy), sy = Math.sin(rot.vy);
  tags.forEach((t) => {
    const y1 = t.y * cx - t.z * sx;
    const z1 = t.y * sx + t.z * cx;
    const x2 = t.x * cy + z1 * sy;
    const z2 = -t.x * sy + z1 * cy;
    t.x = x2; t.y = y1; t.z = z2;
    const scale = (z2 + 2) / 3;
    // transform + opacity only: both composite on the GPU (no per-frame blur filters)
    t.el.style.transform = `translate(-50%, -50%) translate3d(${x2 * R}px, ${y1 * R}px, 0) scale(${scale})`;
    t.el.style.opacity = (0.18 + ((z2 + 1) / 2) * 0.82).toFixed(3);
    const zi = Math.round(z2 * 10) + 10;
    if (t.zi !== zi) { t.zi = zi; t.el.style.zIndex = zi; }
  });
});

/* ---------------------------------------------------------
   Marquee — infinite, reacts to scroll velocity & direction
   --------------------------------------------------------- */
const marquees = [...document.querySelectorAll(".marquee__track")].map((el, i) => ({ el, x: 0, dir: i % 2 ? 1 : -1, half: el.scrollWidth / 2 }));
const measureMarquees = () => marquees.forEach((m) => (m.half = m.el.scrollWidth / 2));
document.fonts?.ready.then(measureMarquees);
addEventListener("resize", measureMarquees);
let mqVel = 0, mqLast = scrollY, mqVisible = false;
new IntersectionObserver(([en]) => (mqVisible = en.isIntersecting)).observe(document.querySelector(".marquee-wrap"));
gsap.ticker.add(() => {
  const v = scrollY - mqLast; mqLast = scrollY;
  mqVel += (v - mqVel) * 0.1;
  if (!mqVisible) return;
  marquees.forEach((m) => {
    m.x += m.dir * (0.6 + Math.abs(mqVel) * 0.25) * (mqVel < -0.5 ? -1 : 1);
    if (m.x <= -m.half) m.x += m.half;
    if (m.x > 0) m.x -= m.half;
    m.el.style.transform = `translate3d(${m.x.toFixed(2)}px,0,0) skewX(${gsap.utils.clamp(-12, 12, -mqVel * 0.3).toFixed(2)}deg)`;
  });
});

/* ---------------------------------------------------------
   Nav: hide on scroll down, active links, progress bar
   --------------------------------------------------------- */
const nav = document.querySelector(".nav");
let lastY = 0, lastProg = -1, scrolledState = null;
let maxScroll = document.documentElement.scrollHeight - innerHeight;
const measureMax = () => (maxScroll = document.documentElement.scrollHeight - innerHeight);
ScrollTrigger.addEventListener("refresh", measureMax);
addEventListener("resize", measureMax);
const progressBar = document.querySelector(".scroll-progress i");
gsap.ticker.add(() => {
  const y = scrollY;
  if (Math.abs(y - lastY) > 4) {
    nav.classList.toggle("is-hidden", y > lastY && y > 200 && !document.body.classList.contains("menu-open"));
    lastY = y;
  }
  const scrolled = y > 40;
  if (scrolled !== scrolledState) { scrolledState = scrolled; nav.classList.toggle("is-scrolled", scrolled); }
  const p = maxScroll > 0 ? Math.round((y / maxScroll) * 1000) / 1000 : 0;
  if (p !== lastProg) { lastProg = p; progressBar.style.transform = `scaleY(${p})`; }
});
// sliding pill behind the hovered / active nav link
const navLinks = document.querySelector(".nav__links");
const indicator = document.querySelector(".nav__indicator");
function moveIndicator(a) {
  if (!a) { indicator.style.opacity = 0; return; }
  indicator.style.opacity = 1;
  indicator.style.width = a.offsetWidth + "px";
  indicator.style.transform = `translateX(${a.offsetLeft}px)`;
}
const activeLink = () => navLinks.querySelector("a.is-active");
navLinks.querySelectorAll("a").forEach((a) => a.addEventListener("pointerenter", () => moveIndicator(a)));
navLinks.addEventListener("pointerleave", () => moveIndicator(activeLink()));

function initNavActive() {
  document.querySelectorAll(".nav__links a").forEach((a) => {
    const sec = document.querySelector(a.getAttribute("href"));
    ScrollTrigger.create({
      trigger: sec, start: "top center", end: "bottom center",
      onToggle: (s) => {
        a.classList.toggle("is-active", s.isActive);
        if (s.isActive) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
        if (!navLinks.matches(":hover")) moveIndicator(activeLink());
      },
    });
  });
}

// mobile menu — accessible open / close
const burger = document.querySelector(".nav__burger");
const menuEl = document.querySelector(".menu");
function setMenu(open) {
  document.body.classList.toggle("menu-open", open);
  burger.setAttribute("aria-expanded", String(open));
  burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  menuEl.setAttribute("aria-hidden", String(!open));
  menuEl.inert = !open;
  if (open) { lenis?.stop(); menuEl.querySelector("a")?.focus({ preventScroll: true }); }
  else if (!document.body.classList.contains("is-loading")) lenis?.start();
}
burger.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
addEventListener("keydown", (e) => { if (e.key === "Escape" && document.body.classList.contains("menu-open")) { setMenu(false); burger.focus(); } });


/* ---------------------------------------------------------
   Scroll animations
   --------------------------------------------------------- */
function initScroll() {
  // generic reveal-up (skip hero — handled by intro)
  gsap.utils.toArray(".reveal-up").forEach((el) => {
    if (el.closest(".hero")) return;
    gsap.from(el, { y: 60, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%" } });
  });

  // section titles: words rise with rotation
  gsap.utils.toArray(".section-title").forEach((title) => {
    gsap.from(title.querySelectorAll(".word > span"), {
      yPercent: 110, rotate: 6, duration: 1.3, ease: "expo.out", stagger: 0.07,
      scrollTrigger: { trigger: title, start: "top 85%" },
    });
  });
  gsap.utils.toArray(".section-label").forEach((l) => {
    gsap.from(l.children, { y: 20, opacity: 0, stagger: 0.1, duration: 1, ease: "expo.out", scrollTrigger: { trigger: l, start: "top 90%" } });
  });

  // about: scroll-scrubbed fill text
  gsap.to(".fill-text .fw", {
    opacity: 1, stagger: 0.1, ease: "none",
    scrollTrigger: { trigger: ".fill-text", start: "top 80%", end: "bottom 45%", scrub: 1 },
  });

  // portrait: clip reveal + parallax image
  gsap.to(".portrait__card", { clipPath: "inset(0% 0 0 0 round 28px)", duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: ".portrait", start: "top 105%" } });
  gsap.fromTo(".portrait__img", { scale: 1.35 }, { scale: 1.05, ease: "none", scrollTrigger: { trigger: ".portrait", start: "top bottom", end: "bottom top", scrub: true } });
  gsap.fromTo(".portrait__img-wrap", { yPercent: -6 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: ".portrait", start: "top bottom", end: "bottom top", scrub: true } });
  gsap.from(".portrait__orbit", { scale: 0, rotate: -180, duration: 1.1, ease: "back.out(1.6)", scrollTrigger: { trigger: ".portrait", start: "top 95%" } });

  // counters
  gsap.utils.toArray(".count").forEach((el) => {
    const obj = { v: 0 };
    const dec = +(el.dataset.dec || 0);
    gsap.to(obj, {
      v: +el.dataset.to, duration: 2.2, ease: "power3.out",
      onUpdate: () => (el.textContent = obj.v.toFixed(dec)),
      scrollTrigger: { trigger: el, start: "top 90%" },
    });
  });

  // services stagger
  gsap.from(".service", { x: 80, opacity: 0, stagger: 0.12, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: ".services", start: "top 80%" } });
  gsap.from(".sphere", { scale: 0.6, opacity: 0, duration: 1.6, ease: "expo.out", scrollTrigger: { trigger: ".sphere", start: "top 85%" } });

  // work — horizontal pinned scroll (desktop) / staggered reveal (mobile)
  const mm = gsap.matchMedia();
  mm.add("(min-width: 901px)", () => {
    const track = document.querySelector(".work__inner");
    const pin = document.querySelector(".work__pin");
    const dist = () => track.scrollWidth - innerWidth + innerWidth * 0.12;
    const tween = gsap.to(track, {
      x: () => -dist(), ease: "none",
      scrollTrigger: { trigger: ".work", start: "top top", end: () => "+=" + dist(), pin, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 },
    });
    // each card: 3D swing + inner parallax while travelling
    gsap.utils.toArray(".project:not(.project--more)").forEach((p) => {
      const media = p.querySelector(".project__media");
      gsap.timeline({ scrollTrigger: { trigger: p, containerAnimation: tween, start: "left right", end: "right left", scrub: true } })
        .fromTo(media, { rotateY: -22, scale: 0.86 }, { rotateY: 0, scale: 1, ease: "none" })
        .to(media, { rotateY: 22, scale: 0.86, ease: "none" });
      gsap.fromTo(p.querySelector(".project__art"), { xPercent: 12 }, {
        xPercent: -12, ease: "none",
        scrollTrigger: { trigger: p, containerAnimation: tween, start: "left right", end: "right left", scrub: true },
      });
    });
    return () => gsap.set(track, { x: 0 });
  });
  mm.add("(max-width: 900px)", () => {
    gsap.utils.toArray(".project").forEach((p) => {
      gsap.from(p, { y: 80, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: p, start: "top 88%" } });
    });
  });

  // project hover tilt
  if (!isTouch) {
    document.querySelectorAll(".project:not(.project--more)").forEach((p) => {
      const art = p.querySelector(".project__art");
      p.addEventListener("pointermove", (e) => {
        const r = p.getBoundingClientRect();
        gsap.to(art, { x: ((e.clientX - r.left) / r.width - 0.5) * 30, y: ((e.clientY - r.top) / r.height - 0.5) * 30, duration: 0.8, ease: "power3.out" });
      });
      p.addEventListener("pointerleave", () => gsap.to(art, { x: 0, y: 0, duration: 1, ease: "elastic.out(1,0.5)" }));
    });
  }

  // journey — line draws, cards fly in
  gsap.to(".timeline__line i", { scaleY: 1, ease: "none", scrollTrigger: { trigger: ".timeline", start: "top 70%", end: "bottom 60%", scrub: 1 } });
  gsap.utils.toArray(".tl-item").forEach((item, i) => {
    const fromLeft = isMobile() ? false : i % 2 === 0;
    gsap.from(item.querySelector(".tl-item__card"), { x: isMobile() ? 0 : fromLeft ? -80 : 80, y: isMobile() ? 60 : 0, opacity: 0, rotate: isMobile() ? 0 : fromLeft ? -4 : 4, duration: 1.3, ease: "expo.out", scrollTrigger: { trigger: item, start: "top 80%" } });
    gsap.from(item.querySelector(".tl-item__year"), { opacity: 0, y: 30, duration: 1, ease: "expo.out", scrollTrigger: { trigger: item, start: "top 80%" } });
  });

  // contact — giant title chars cascade
  gsap.utils.toArray(".contact__line").forEach((line, i) => {
    gsap.from(line.querySelectorAll(".char"), {
      yPercent: 120, rotate: 10, duration: 1.4, ease: "expo.out", stagger: 0.03, delay: i * 0.1,
      scrollTrigger: { trigger: ".contact__title", start: "top 80%" },
    });
  });
  gsap.from(".contact__row > *, .social", { y: 50, opacity: 0, stagger: 0.08, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: ".contact__row", start: "top 90%" } });

  // hero: the name fades as the full-screen intro video scrolls up over it
  gsap.to(".hero__content", { y: -60, opacity: 0, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "60% top", scrub: true } });

  initNavActive();
  ScrollTrigger.refresh();
}

/* ---------------------------------------------------------
   Hero background video + sound
   ─────────────────────────────
   The intro footage is scenery: full screen, looping, no player UI.
   Sound rules (so audio only ever plays at the right moment):
   • never during the welcome screen (that clip has its own voice)
   • fades in once the visitor lands on the hero
   • fades out when the hero is scrolled away; fades back in on return
   • after the speech has been heard once in full, further loops stay
     silent until the visitor leaves the hero and comes back
   • muted instantly when the tab is hidden, restored when visible
   • browsers block sound until the first click / tap / key — the very
     first interaction switches it on at that moment
   The video itself is paused when off screen or in a hidden tab.
   Picks 1080p / 1440p / 4K to match the visitor's screen.
   --------------------------------------------------------- */
const heroVid = document.querySelector(".hero-bg__media");
const heroEl = document.querySelector(".hero");
heroVid.loop = true;
heroVid.muted = true;
const snd = {
  ready: false,           // preloader finished, hero is the page
  onScreen: true,         // any part of the hero visible
  inView: true,           // hero is the main thing on screen
  visible: !document.hidden,
  heardFull: false,
  audible: 0, lastT: 0,
  tween: null,
};

function loadHeroVideo() {
  if (heroVid.getAttribute("src")) return;
  // the video covers the hero (object-fit: cover), so on tall/portrait screens it is shown much
  // larger than the screen width — pick by the width it is actually DISPLAYED at, in device pixels
  const dpr = devicePixelRatio || 1;
  const shownW = Math.max(innerWidth, innerHeight * (16 / 9)) * dpr;
  const pick = shownW > 2700 && !isTouch ? "2160"   // big / high-DPI desktop screens
    : shownW > 1600 || isTouch ? "1440"               // laptops, and every phone/tablet (avoids upscaling blur)
    : "1080";
  heroVid.preload = "auto";
  heroVid.src = heroVid.getAttribute("data-src-" + pick);
  heroVid.load();
}

const videoShouldRun = () => snd.ready && snd.onScreen && snd.visible;
const wantsSound = () => videoShouldRun() && snd.inView && !snd.heardFull;

function syncVideo() {
  if (!heroVid.getAttribute("src")) return;
  if (videoShouldRun()) { if (heroVid.paused) heroVid.play().catch(() => {}); }
  else if (!heroVid.paused) heroVid.pause();
}
async function soundUp() {
  if (!heroVid.muted && heroVid.volume > 0.999 && !snd.tween) return;
  snd.tween?.kill(); snd.tween = null;
  if (heroVid.muted) { heroVid.volume = 0; heroVid.muted = false; }
  try { await heroVid.play(); }
  catch (e) {                       // blocked until the visitor interacts: keep the picture moving silently
    heroVid.muted = true;
    heroVid.play().catch(() => {});
    return;
  }
  if (!wantsSound()) return soundDown();
  snd.tween = gsap.to(heroVid, { volume: 1, duration: 1.4, ease: "power2.out", onComplete: () => (snd.tween = null) });
}
function soundDown(instant) {
  snd.tween?.kill(); snd.tween = null;
  if (heroVid.muted) return;
  if (instant || document.hidden) { heroVid.volume = 0; heroVid.muted = true; return; }
  snd.tween = gsap.to(heroVid, { volume: 0, duration: 0.7, ease: "power2.out", onComplete: () => { heroVid.muted = true; snd.tween = null; } });
}
function syncSound() {
  syncVideo();
  if (wantsSound()) soundUp(); else soundDown();
}

// track how much of the speech was actually heard; after one full listen, loops stay silent
heroVid.addEventListener("timeupdate", () => {
  const t = heroVid.currentTime;
  const dt = t - snd.lastT;
  if (dt > 0 && dt < 1 && !heroVid.muted && heroVid.volume > 0.4) snd.audible += dt;
  if (dt < -1) {                                   // wrapped around (loop)
    if (snd.audible > (heroVid.duration || 21) * 0.7) { snd.heardFull = true; soundDown(); }
    snd.audible = 0;
  }
  snd.lastT = t;
});

new IntersectionObserver(([en]) => {
  snd.onScreen = en.isIntersecting;
  const inView = en.isIntersecting && en.intersectionRatio > 0.35;
  if (inView && !snd.inView) { snd.heardFull = false; snd.audible = 0; } // came back to the hero
  snd.inView = inView;
  syncSound();
}, { threshold: [0, 0.35, 0.6, 1] }).observe(heroEl);

document.addEventListener("visibilitychange", () => {
  snd.visible = !document.hidden;
  if (document.hidden) { soundDown(true); if (welcomeVid) welcomeVid.muted = true; }
  syncSound();
});
// something external paused it (OS media keys, audio focus) — it's scenery, so resume
heroVid.addEventListener("pause", () => { if (videoShouldRun()) setTimeout(syncVideo, 80); });
heroVid.addEventListener("contextmenu", (e) => e.preventDefault());

// the first interaction unlocks sound at that exact moment
const welcomeVid = document.querySelector(".pl-video__media");
let welcomeLeaving = false;
function onGesture(e) {
  if (!snd.ready) {
    // still on the welcome screen: give the welcome clip its voice (unless they're skipping it)
    if (welcomeVid && !welcomeLeaving && !e.target.closest?.(".pl-skip") && !welcomeVid.paused && welcomeVid.muted) welcomeVid.muted = false;
    return;
  }
  syncSound();
}
["pointerdown", "keydown", "touchend"].forEach((ev) => addEventListener(ev, onGesture, { passive: true }));


/* ---------------------------------------------------------
   Welcome intro video → site (fast cross-fade into the hero)
   --------------------------------------------------------- */
function intro() {
  const pre = document.querySelector(".preloader");
  if (!pre) {
    // very slow connection: the inline failsafe already revealed the page before this script
    // arrived — start everything directly, no welcome sequence
    document.body.classList.remove("no-js-fallback", "is-loading");
    gsap.set(".hero__title .char, .hero__role-line > span", { yPercent: 0 });
    gsap.set(".hero .reveal-up, .nav", { opacity: 1 });
    state.intro = 1;
    loadHeroVideo();
    snd.ready = true;
    lenis?.start();
    initScroll();
    measureSections();
    syncSound();
    return;
  }
  const count = document.querySelector(".preloader__count");
  const vid = welcomeVid;
  const skipBtn = document.querySelector(".pl-skip");
  let leaving = false;

  gsap.set(".pl-w > span", { y: 0, yPercent: 115, rotate: 6, opacity: 0, filter: "blur(14px)" });
  gsap.set(".pl-sub span", { y: 0, yPercent: 110 });

  // 1) short loading counter while the welcome clip buffers
  const counter = { v: 0 };
  const ready = new Promise((res) => {
    if (vid.readyState >= 3) return res();
    vid.addEventListener("canplay", res, { once: true });
    vid.addEventListener("error", res, { once: true });
    setTimeout(res, 2500);
  });
  gsap.to(".preloader__meta", { opacity: 1, duration: 0.5 });
  const countTl = gsap.to(counter, {
    v: 100, duration: reduceMotion ? 0.3 : 0.8, ease: "power2.inOut",
    onUpdate: () => (count.textContent = String(Math.round(counter.v)).padStart(3, "0")),
  });

  ready.then(loadHeroVideo); // the hero starts buffering while the welcome clip plays
  Promise.all([ready, new Promise((r) => countTl.eventCallback("onComplete", r))]).then(async () => {
    if (leaving) return;
    gsap.to(".preloader__meta", { opacity: 0, duration: 0.3 });
    gsap.to(skipBtn, { opacity: 1, duration: 0.6, delay: 0.3 });
    vid.muted = false;
    try { await vid.play(); }
    catch (err) { vid.muted = true; await vid.play().catch(() => {}); }
    startWelcome();
  });

  skipBtn.addEventListener("click", () => leave());

  function startWelcome() {
    if (leaving) return;
    gsap.to(vid, { opacity: 1, duration: 0.8, ease: "power2.out" }); // fade only: colour and brightness stay constant
    gsap.to(".pl-w > span", { yPercent: 0, rotate: 0, opacity: 1, filter: "blur(0px)", duration: 1.1, ease: "expo.out", stagger: 0.08, delay: 0.1 });
    gsap.to(".pl-sub span", { yPercent: 0, duration: 0.9, ease: "expo.out", delay: 0.4 });
    // begin the hand-off just before the clip ends so there's no dead moment
    vid.addEventListener("timeupdate", () => { if (vid.duration && vid.currentTime >= vid.duration - 0.6) leave(); });
    vid.addEventListener("ended", leave, { once: true });
    setTimeout(leave, ((vid.duration || 3) + 1) * 1000);
  }

  // make sure the hero has a frame to show before revealing it (max 1.2s wait)
  const heroReady = () => new Promise((res) => {
    loadHeroVideo();
    if (heroVid.readyState >= 3) return res();
    heroVid.addEventListener("canplay", res, { once: true });
    heroVid.addEventListener("error", res, { once: true });
    setTimeout(res, 1200);
  });

  async function leave() {
    if (leaving) return;
    leaving = welcomeLeaving = true;
    // the welcome voice bows out quickly so two voices never overlap
    gsap.to(vid, { volume: 0, duration: 0.3, ease: "power1.out", onComplete: () => vid.pause() });
    await heroReady();
    heroVid.currentTime = 0;
    snd.ready = true;
    syncVideo();                                   // picture starts immediately (muted)
    gsap.delayedCall(0.35, syncSound);              // voice fades in once the welcome voice is gone

    const out = gsap.timeline({ defaults: { ease: "expo.out" } });
    // hand the page over as soon as the cross-fade is done (text keeps animating in)
    out.call(() => {
      pre.remove();
      document.body.classList.remove("is-loading");
      lenis?.start();
      initScroll();
      measureSections();
    }, null, 1.2);
    out.to(".pl-w > span", { yPercent: -110, opacity: 0, filter: "blur(8px)", duration: 0.55, ease: "power3.in", stagger: 0.04 }, 0)
      .to(".pl-sub span, .pl-skip", { opacity: 0, duration: 0.4, ease: "power2.in" }, 0)
      // cross-fade: welcome clip & panel dissolve, the hero video is already playing underneath
      .to(".pl-video", { opacity: 0, scale: 1.04, duration: 1.0, ease: "power2.inOut" }, 0.15)
      .to(".preloader__panel", { opacity: 0, duration: 1.0, ease: "power2.inOut" }, 0.15)
      .set(pre, { pointerEvents: "none" }, 0.4)
      .fromTo(".hero-bg", { scale: 1.06 }, { scale: 1, duration: 2.2, ease: "power3.out", clearProps: "transform" }, 0.15)
      .to(state, { intro: 1, duration: 2, ease: "expo.out" }, 0.3)
      .fromTo(".hero__title .char", { yPercent: 120, rotate: 6 }, { yPercent: 0, rotate: 0, duration: 1.3, stagger: 0.03 }, 0.55)
      .fromTo(".hero__role-line > span", { yPercent: 110 }, { yPercent: 0, duration: 1.1, stagger: 0.08 }, 0.8)
      .fromTo(".hero .reveal-up", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, stagger: 0.06 }, 0.9)
      .fromTo(".nav", { yPercent: -160, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.1, clearProps: "transform" }, 0.8);
  }
}
gsap.set(".hero__title .char", { yPercent: 120 });
gsap.set(".hero__role-line > span", { yPercent: 110 });
gsap.set(".hero .reveal-up", { opacity: 0 });
intro();
window.__siteBooted = true; // everything initialised — cancel the inline failsafe
