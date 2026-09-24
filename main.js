import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const isMobile = matchMedia('(max-width: 640px)').matches || /Mobi|Android/i.test(navigator.userAgent);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- UI: nav, reveal, parallax ---------- */
const nav = document.getElementById('nav');
const ridges = [...document.querySelectorAll('.ridge')];
function onScrollUI() {
  const y = scrollY;
  nav.classList.toggle('solid', y > 40);
  ridges.forEach(r => { r.style.transform = `translateY(${y * parseFloat(r.dataset.depth)}px)`; });
}
addEventListener('scroll', onScrollUI, { passive: true });
onScrollUI();

const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.grid, .districts, .timeline').forEach(group => {
  [...group.children].forEach((el, i) => el.style.setProperty('--rd', `${(i % 3) * 0.09}s`));
});
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// card 3D tilt (desktop pointers only)
if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg) translateY(-6px)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });
}

/* ---------- Apple model ---------- */
const VARIANTS = {
  royal:     { base: '#a50f25', dark: '#4e0512', light: '#e2344a', ground: '#c9a23c', blush: 0.92, streaks: 0.9 },
  red:       { base: '#c11a2e', dark: '#62091a', light: '#f0485a', ground: '#d8b24a', blush: 0.85, streaks: 0.6 },
  golden:    { base: '#e4c24e', dark: '#a8872a', light: '#f7e39a', ground: '#b9c35a', blush: 0.08, streaks: 0.0, gold: true },
  redgolden: { base: '#e8b84a', dark: '#b8312a', light: '#f6d77e', ground: '#d9c060', blush: 0.55, streaks: 0.35, blushColor: '#d23a2e' },
  scarlet:   { base: '#8f0c22', dark: '#3c030d', light: '#cf2a40', ground: '#b88a36', blush: 0.97, streaks: 0.5 },
  chief:     { base: '#7e0a1e', dark: '#34030b', light: '#c3263c', ground: '#b08238', blush: 0.95, streaks: 1.0 },
  gala:      { base: '#e9b64c', dark: '#b8321f', light: '#ffd98a', ground: '#e6c35c', blush: 0.7, streaks: 1.0, blushColor: '#d9452a' },
  jeromine:  { base: '#5a0718', dark: '#22020a', light: '#9a1a30', ground: '#7a4a2a', blush: 1.0, streaks: 0.3 },
  oregon:    { base: '#b3182c', dark: '#560718', light: '#e8405a', ground: '#caa046', blush: 0.88, streaks: 0.7 },
};

function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

function skinTexture(v, seed = 7, size = isMobile ? 512 : 1024) {
  const W = size, H = size / 2;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const rand = rng(seed);
  // ground colour
  g.fillStyle = v.ground; g.fillRect(0, 0, W, H);
  // blush: stronger on one side, wraps around horizontally
  const blushCol = v.blushColor || v.base;
  for (let k = -1; k <= 1; k++) {
    const cx = W * 0.35 + k * W;
    const grd = g.createRadialGradient(cx, H * 0.55, 0, cx, H * 0.55, W * 0.62);
    grd.addColorStop(0, blushCol); grd.addColorStop(v.blush, blushCol);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = Math.min(1, v.blush + 0.1); g.fillStyle = grd; g.fillRect(0, 0, W, H);
  }
  g.globalAlpha = 1;
  if (!v.gold && v.blush > 0.8) { g.globalAlpha = 0.75; g.fillStyle = v.base; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  // streaks
  const nStreak = Math.floor(260 * v.streaks);
  for (let i = 0; i < nStreak; i++) {
    const x = rand() * W, w = 1 + rand() * (W / 180), y0 = H * (0.05 + rand() * 0.2), y1 = H * (0.75 + rand() * 0.22);
    const col = rand() < 0.65 ? v.dark : v.light;
    g.globalAlpha = 0.08 + rand() * 0.22;
    g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round';
    for (const dx of [-W, 0, W]) {
      g.beginPath(); g.moveTo(x + dx, y0);
      g.bezierCurveTo(x + dx + (rand() - .5) * 12, H * 0.4, x + dx + (rand() - .5) * 12, H * 0.6, x + dx + (rand() - .5) * 8, y1);
      g.stroke();
    }
  }
  g.globalAlpha = 1;
  // shoulder (top) and base darkening; top cavity greenish-yellow
  let gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, v.gold ? 'rgba(150,160,60,.55)' : 'rgba(170,140,50,.55)');
  gr.addColorStop(0.12, 'rgba(0,0,0,0)');
  gr.addColorStop(0.85, 'rgba(0,0,0,0)');
  gr.addColorStop(1, 'rgba(40,30,10,.45)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // lenticels
  const nDots = isMobile ? 900 : 2200;
  for (let i = 0; i < nDots; i++) {
    const x = rand() * W, y = H * (0.08 + rand() * 0.84), r = 0.5 + rand() * (W / 900);
    g.globalAlpha = 0.18 + rand() * 0.3;
    g.fillStyle = v.gold ? '#8a7a30' : '#f3d9a0';
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function appleGeometry(segments = 160) {
  // profile from bottom centre (calyx) to top centre (stem cavity)
  const P = [
    [0.0, -0.74], [0.10, -0.78], [0.24, -0.86], [0.40, -0.86], [0.56, -0.77], [0.74, -0.54],
    [0.88, -0.22], [0.95, 0.10], [0.95, 0.38], [0.86, 0.62], [0.68, 0.80], [0.46, 0.87],
    [0.29, 0.83], [0.16, 0.73], [0.06, 0.62], [0.0, 0.58]
  ].map(([x, y]) => new THREE.Vector3(x, y, 0));
  const curve = new THREE.CatmullRomCurve3(P, false, 'centripetal');
  const pts = curve.getPoints(isMobile ? 90 : 140).map(p => new THREE.Vector2(Math.max(p.x, 0.0001), p.y));
  pts[0].x = 0.0001; pts[pts.length - 1].x = 0.0001;
  const geo = new THREE.LatheGeometry(pts, segments);
  // organic asymmetry: five calyx lobes, slight lean, uneven shoulders
  const pos = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const phi = Math.atan2(v.z, v.x);
    const r = Math.hypot(v.x, v.z);
    const low = THREE.MathUtils.smoothstep(-v.y, 0.1, 0.8);   // near bottom
    const high = THREE.MathUtils.smoothstep(v.y, 0.3, 0.8);   // shoulders
    let k = 1 + 0.045 * Math.cos(5 * phi) * low + 0.035 * Math.cos(phi + 0.6) + 0.025 * Math.cos(2 * phi + 1.3) * high;
    const nr = r * k;
    pos.setXYZ(i, Math.cos(phi) * nr * 0.97, (v.y + 0.03 * Math.cos(phi) * high) * 1.06, Math.sin(phi) * nr * 0.97);
  }
  geo.computeVertexNormals();
  return geo;
}

function makeApple(variantKey, seed) {
  const v = VARIANTS[variantKey];
  const group = new THREE.Group();
  const skin = new THREE.MeshPhysicalMaterial({
    map: skinTexture(v, seed),
    roughness: v.gold ? 0.48 : 0.42,
    clearcoat: 0.35, clearcoatRoughness: 0.4,
    sheen: 0.4, sheenRoughness: 0.5, sheenColor: new THREE.Color(v.light),
    envMapIntensity: 0.4,
  });
  const body = new THREE.Mesh(appleGeometry(isMobile ? 96 : 160), skin);
  group.add(body);

  // stem
  const stemCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.56, 0), new THREE.Vector3(0.02, 0.78, 0.0),
    new THREE.Vector3(0.07, 0.98, 0.02), new THREE.Vector3(0.14, 1.1, 0.03)
  ]);
  const stemGeo = new THREE.TubeGeometry(stemCurve, 24, 0.028, 10, false);
  // taper the stem toward the tip
  const sp = stemGeo.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    const seg = Math.floor(i / 11) / 24; // radial 10 + 1
    const center = stemCurve.getPoint(Math.min(seg, 1));
    const f = 1.15 - seg * 0.45;
    sp.setXYZ(i, center.x + (sp.getX(i) - center.x) * f, center.y + (sp.getY(i) - center.y) * f, center.z + (sp.getZ(i) - center.z) * f);
  }
  stemGeo.computeVertexNormals();
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x4a3120, roughness: 0.85 });
  group.add(new THREE.Mesh(stemGeo, stemMat));

  // leaf
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.12, 0.10, 0.34, 0.14, 0.62, 0);
  s.bezierCurveTo(0.34, -0.14, 0.12, -0.10, 0, 0);
  const leafGeo = new THREE.ShapeGeometry(s, 24);
  const lp = leafGeo.attributes.position;
  const colors = [];
  const cA = new THREE.Color('#1f4d1c'), cB = new THREE.Color('#5f9a34'), tmp = new THREE.Color();
  for (let i = 0; i < lp.count; i++) {
    const x = lp.getX(i), y = lp.getY(i);
    lp.setZ(i, Math.abs(y) * 0.55 - x * x * 0.35);   // fold at midrib + droop
    tmp.copy(cA).lerp(cB, Math.min(1, x / 0.62 * 0.7 + Math.abs(y) * 2));
    colors.push(tmp.r, tmp.g, tmp.b);
  }
  leafGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  leafGeo.computeVertexNormals();
  const leaf = new THREE.Mesh(leafGeo, new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.45, clearcoat: 0.4, side: THREE.DoubleSide, sheen: 0.3, sheenColor: new THREE.Color('#bfe08a')
  }));
  leaf.position.set(0.08, 0.93, 0.02);
  leaf.rotation.set(-0.5, -0.4, 0.45);
  group.add(leaf);
  return group;
}

function addLights(scene, renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const key = new THREE.DirectionalLight(0xfff0dd, 2.2); key.position.set(3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fc3ff, 3.2); rim.position.set(-4, 2.5, -4); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0xff6070, 1.4); rim2.position.set(5, -1, -3); scene.add(rim2);
  scene.add(new THREE.HemisphereLight(0x8fa6c8, 0x1a0808, 0.35));
}

function shadowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(0,0,0,.75)'); grd.addColorStop(0.5, 'rgba(0,0,0,.3)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/* ---------- Hero scene ---------- */
function initHero() {
  const canvas = document.getElementById('scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.75 : 2));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 7);
  addLights(scene, renderer);

  const rig = new THREE.Group(); scene.add(rig);
  const apple = makeApple('royal', 11);
  apple.rotation.z = 0.12;
  rig.add(apple);

  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4),
    new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -1.12;
  rig.add(shadow);

  // snow / pollen particles
  const N = isMobile ? 260 : 700;
  const pGeo = new THREE.BufferGeometry();
  const arr = new Float32Array(N * 3), spd = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    arr[i * 3] = (Math.random() - 0.5) * 16; arr[i * 3 + 1] = (Math.random() - 0.5) * 10; arr[i * 3 + 2] = (Math.random() - 0.5) * 8 - 1;
    spd[i] = 0.15 + Math.random() * 0.35;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const dot = document.createElement('canvas'); dot.width = dot.height = 64;
  const dg = dot.getContext('2d'); const dgr = dg.createRadialGradient(32, 32, 0, 32, 32, 32);
  dgr.addColorStop(0, 'rgba(255,255,255,1)'); dgr.addColorStop(0.4, 'rgba(255,255,255,.5)'); dgr.addColorStop(1, 'rgba(255,255,255,0)');
  dg.fillStyle = dgr; dg.fillRect(0, 0, 64, 64);
  const points = new THREE.Points(pGeo, new THREE.PointsMaterial({
    size: isMobile ? 0.07 : 0.06, map: new THREE.CanvasTexture(dot), transparent: true, depthWrite: false, opacity: 0.75, color: 0xdfe8ff
  }));
  scene.add(points);

  let layout = {};
  function place() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    const mobile = w <= 640;
    // world units visible at z=0
    const vh = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const vw = vh * camera.aspect;
    if (mobile) layout = { x: 0, y: vh * 0.3, s: Math.min(0.72, vw * 0.24) };
    else if (w <= 980) layout = { x: vw * 0.2, y: vh * 0.1, s: 0.85 };
    else layout = { x: vw * 0.22, y: vh * 0.1, s: 0.95 };
    rig.scale.setScalar(layout.s);
  }
  place();
  addEventListener('resize', place);

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', e => { mouse.tx = e.clientX / innerWidth - 0.5; mouse.ty = e.clientY / innerHeight - 0.5; }, { passive: true });

  const clock = new THREE.Clock();
  let visible = true;
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; });
  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    const sp = Math.min(scrollY / innerHeight, 1.6);
    mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;
    if (!reduceMotion) apple.rotation.y += dt * 0.32;
    const bob = reduceMotion ? 0 : Math.sin(t * 0.9) * 0.06;
    rig.position.set(layout.x, layout.y + bob + sp * 3.2, 0);
    rig.rotation.x = mouse.y * 0.25 + sp * 0.4;
    rig.rotation.z = -mouse.x * 0.12;
    apple.position.y = 0;
    shadow.material.opacity = 1 - Math.min(1, bob * 2 + 0.2);
    // particles
    const a = pGeo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      a[i * 3 + 1] -= spd[i] * dt;
      a[i * 3] += Math.sin(t * 0.5 + i) * dt * 0.08;
      if (a[i * 3 + 1] < -5) a[i * 3 + 1] = 5;
    }
    pGeo.attributes.position.needsUpdate = true;
    points.position.y = sp * 1.5;
    canvas.style.opacity = String(Math.max(0.35, 1 - sp * 0.65));
    renderer.render(scene, camera);
  }
  frame();
  return renderer;
}

/* ---------- Card apple renders (same model, per variety) ---------- */
function renderCardApples() {
  const imgs = [...document.querySelectorAll('.card[data-apple]')];
  const size = isMobile ? 320 : 400;
  const c = document.createElement('canvas');
  const r = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(size, size, false);
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05; r.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  addLights(scene, r);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  cam.position.set(0, 0.45, 4.3); cam.lookAt(0, 0.12, 0);
  let i = 0;
  function next() {
    if (i >= imgs.length) { r.dispose(); r.forceContextLoss(); return; }
    const card = imgs[i];
    const apple = makeApple(card.dataset.apple, 3 + i * 13);
    apple.rotation.set(0.05, 0.6 + i * 1.3, 0.1 * ((i % 2) ? 1 : -1));
    scene.add(apple);
    r.render(scene, cam);
    card.querySelector('img').src = c.toDataURL('image/png');
    scene.remove(apple);
    apple.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { o.material.map && o.material.map.dispose(); o.material.dispose(); } });
    i++;
    setTimeout(next, 16);
  }
  next();
}

if (hasWebGL()) {
  try { initHero(); } catch (e) { console.warn('hero 3D failed', e); }
  const start = () => { try { renderCardApples(); } catch (e) { console.warn('card apples failed', e); } };
  if (document.readyState === 'complete') setTimeout(start, 300); else addEventListener('load', () => setTimeout(start, 300));
}
