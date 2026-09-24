import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const $ = id => document.getElementById(id);
const isMobile = matchMedia('(max-width: 760px)').matches || matchMedia('(pointer: coarse)').matches;
const ROUND = Math.min(600, Math.max(5, +new URLSearchParams(location.search).get('round') || 60)), LIVES = 3;
const BEST_KEY = 'pahadiSebBest';

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
if (!hasWebGL()) { $('start').hidden = true; $('nogl').hidden = false; throw new Error('WebGL unavailable'); }

/* ---------------- apple look (same model as the site) ---------------- */
const VARIANTS = {
  red:    { base: '#b3142a', dark: '#560718', light: '#ec4458', ground: '#caa046', blush: 0.9, streaks: 0.8 },
  golden: { base: '#e8c650', dark: '#ae8a26', light: '#fbe9a4', ground: '#c9c65c', blush: 0.1, streaks: 0.0, gold: true },
};
function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
const TEX = isMobile ? 512 : 1024;

function skinTexture(v, seed = 7) {
  const W = TEX, H = TEX / 2, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), rand = rng(seed);
  g.fillStyle = v.ground; g.fillRect(0, 0, W, H);
  const blushCol = v.blushColor || v.base;
  for (let k = -1; k <= 1; k++) {
    const cx = W * 0.35 + k * W, grd = g.createRadialGradient(cx, H * .55, 0, cx, H * .55, W * .62);
    grd.addColorStop(0, blushCol); grd.addColorStop(v.blush, blushCol); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = Math.min(1, v.blush + .1); g.fillStyle = grd; g.fillRect(0, 0, W, H);
  }
  g.globalAlpha = 1;
  if (!v.gold && v.blush > .8) { g.globalAlpha = .75; g.fillStyle = v.base; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  for (let i = 0, n = Math.floor(260 * v.streaks); i < n; i++) {
    const x = rand() * W, w = 1 + rand() * (W / 180), y0 = H * (.05 + rand() * .2), y1 = H * (.75 + rand() * .22);
    g.globalAlpha = .08 + rand() * .22; g.strokeStyle = rand() < .65 ? v.dark : v.light; g.lineWidth = w; g.lineCap = 'round';
    for (const dx of [-W, 0, W]) { g.beginPath(); g.moveTo(x + dx, y0); g.bezierCurveTo(x + dx + (rand() - .5) * 12, H * .4, x + dx + (rand() - .5) * 12, H * .6, x + dx, y1); g.stroke(); }
  }
  g.globalAlpha = 1;
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, v.gold ? 'rgba(150,160,60,.55)' : 'rgba(170,140,50,.55)'); gr.addColorStop(.12, 'rgba(0,0,0,0)');
  gr.addColorStop(.85, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(40,30,10,.45)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0, n = isMobile ? 700 : 1800; i < n; i++) {
    g.globalAlpha = .18 + rand() * .3; g.fillStyle = v.gold ? '#8a7a30' : '#f3d9a0';
    g.beginPath(); g.arc(rand() * W, H * (.08 + rand() * .84), .5 + rand() * (W / 900), 0, 7); g.fill();
  }
  g.globalAlpha = 1;
  return finishTex(c);
}
function rottenTexture(seed = 3) {
  const W = TEX, H = TEX / 2, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), rand = rng(seed);
  g.fillStyle = '#6b4a22'; g.fillRect(0, 0, W, H);
  // mottled brown/olive
  for (let i = 0; i < 90; i++) {
    const x = rand() * W, y = rand() * H, r = W * (.02 + rand() * .08);
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    const col = ['rgba(60,38,14,', 'rgba(96,78,30,', 'rgba(120,52,24,', 'rgba(40,26,10,'][Math.floor(rand() * 4)];
    grd.addColorStop(0, col + '.9)'); grd.addColorStop(1, col + '0)');
    g.fillStyle = grd; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // dark rot patches with pale mould rings
  for (let i = 0; i < 9; i++) {
    const x = rand() * W, y = H * (.2 + rand() * .6), r = W * (.03 + rand() * .05);
    g.fillStyle = 'rgba(22,14,6,.9)'; g.beginPath(); g.ellipse(x, y, r, r * .8, rand() * 3, 0, 7); g.fill();
    for (let k = 0; k < 14; k++) {
      const a = rand() * 7, d = r * (.2 + rand() * .7);
      g.fillStyle = 'rgba(214,206,170,' + (.25 + rand() * .4) + ')';
      g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * .8, 1 + rand() * W / 400, 0, 7); g.fill();
    }
  }
  return finishTex(c);
}
function finishTex(c) {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}

function appleGeometry(segments) {
  const P = [[0, -.74], [.10, -.78], [.24, -.86], [.40, -.86], [.56, -.77], [.74, -.54], [.88, -.22], [.95, .10], [.95, .38], [.86, .62], [.68, .80], [.46, .87], [.29, .83], [.16, .73], [.06, .62], [0, .58]]
    .map(([x, y]) => new THREE.Vector3(x, y, 0));
  const pts = new THREE.CatmullRomCurve3(P, false, 'centripetal').getPoints(isMobile ? 48 : 80).map(p => new THREE.Vector2(Math.max(p.x, .0001), p.y));
  pts[0].x = .0001; pts[pts.length - 1].x = .0001;
  const geo = new THREE.LatheGeometry(pts, segments), pos = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const phi = Math.atan2(v.z, v.x), r = Math.hypot(v.x, v.z);
    const low = THREE.MathUtils.smoothstep(-v.y, .1, .8), high = THREE.MathUtils.smoothstep(v.y, .3, .8);
    const nr = r * (1 + .045 * Math.cos(5 * phi) * low + .035 * Math.cos(phi + .6) + .025 * Math.cos(2 * phi + 1.3) * high);
    pos.setXYZ(i, Math.cos(phi) * nr * .97, (v.y + .03 * Math.cos(phi) * high) * 1.06, Math.sin(phi) * nr * .97);
  }
  geo.computeVertexNormals();
  return geo;
}
function stemGeometry() {
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, .56, 0), new THREE.Vector3(.02, .78, 0), new THREE.Vector3(.07, .98, .02), new THREE.Vector3(.14, 1.1, .03)]);
  const geo = new THREE.TubeGeometry(curve, 16, .03, 8, false), sp = geo.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    const seg = Math.floor(i / 9) / 16, c = curve.getPoint(Math.min(seg, 1)), f = 1.15 - seg * .45;
    sp.setXYZ(i, c.x + (sp.getX(i) - c.x) * f, c.y + (sp.getY(i) - c.y) * f, c.z + (sp.getZ(i) - c.z) * f);
  }
  geo.computeVertexNormals(); return geo;
}
function leafGeometry() {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(.12, .10, .34, .14, .62, 0); s.bezierCurveTo(.34, -.14, .12, -.10, 0, 0);
  const geo = new THREE.ShapeGeometry(s, 12), lp = geo.attributes.position, colors = [];
  const a = new THREE.Color('#1f4d1c'), b = new THREE.Color('#5f9a34'), t = new THREE.Color();
  for (let i = 0; i < lp.count; i++) {
    const x = lp.getX(i), y = lp.getY(i); lp.setZ(i, Math.abs(y) * .55 - x * x * .35);
    t.copy(a).lerp(b, Math.min(1, x / .62 * .7 + Math.abs(y) * 2)); colors.push(t.r, t.g, t.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geo.computeVertexNormals(); return geo;
}

/* ---------------- renderer / scene ---------------- */
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile || devicePixelRatio < 2, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, .1, 100); camera.position.set(0, 0, 10);
{
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  const key = new THREE.DirectionalLight(0xfff0dd, 2.2); key.position.set(3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fc3ff, 2.6); rim.position.set(-4, 2.5, -4); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0xff6070, 1.1); rim2.position.set(5, -1, -3); scene.add(rim2);
  scene.add(new THREE.HemisphereLight(0x8fa6c8, 0x1a0808, .5));
}

const AppleMat = isMobile ? THREE.MeshStandardMaterial : THREE.MeshPhysicalMaterial;
const physical = !isMobile;
const G = { body: appleGeometry(isMobile ? 40 : 64), stem: stemGeometry(), leaf: leafGeometry() };
const M = {
  red: new AppleMat({ map: skinTexture(VARIANTS.red, 11), roughness: .42, envMapIntensity: .45, ...(physical ? { clearcoat: .35, clearcoatRoughness: .4, sheen: .4, sheenColor: new THREE.Color('#ec4458') } : {}) }),
  golden: new AppleMat({ map: skinTexture(VARIANTS.golden, 5), roughness: .38, emissive: new THREE.Color('#7a5200'), emissiveIntensity: .35, envMapIntensity: .6, ...(physical ? { clearcoat: .5, clearcoatRoughness: .3 } : {}) }),
  rotten: new THREE.MeshStandardMaterial({ map: rottenTexture(3), roughness: .9, envMapIntensity: .2 }),
  stem: new THREE.MeshStandardMaterial({ color: 0x4a3120, roughness: .85 }),
  stemRot: new THREE.MeshStandardMaterial({ color: 0x2a1c10, roughness: .95 }),
  leaf: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5, side: THREE.DoubleSide }),
};
function glowTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64); grd.addColorStop(0, inner); grd.addColorStop(.35, outer); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}
const goldGlowTex = glowTexture('rgba(255,230,140,.9)', 'rgba(233,196,106,.25)');
const dotTex = glowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,.4)');

function buildApple(type) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(G.body, M[type]);
  g.add(body);
  g.add(new THREE.Mesh(G.stem, type === 'rotten' ? M.stemRot : M.stem));
  if (type !== 'rotten') { const leaf = new THREE.Mesh(G.leaf, M.leaf); leaf.position.set(.08, .93, .02); leaf.rotation.set(-.5, -.4, .45); g.add(leaf); }
  else body.scale.set(1.02, .9, 1.02);
  if (type === 'golden') {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: goldGlowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.scale.setScalar(3.4); s.renderOrder = -1; g.add(s); g.userData.glow = s;
  }
  g.userData.type = type;
  return g;
}

/* ---------------- basket ---------------- */
function weaveTexture() {
  const W = 512, H = 128, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = '#6a4424'; g.fillRect(0, 0, W, H);
  const rows = 6, cols = 24, rh = H / rows, cw = W / cols;
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
    const x = k * cw, y = r * rh, on = (r + k) % 2 === 0;
    const grd = g.createLinearGradient(x, y, x, y + rh);
    grd.addColorStop(0, on ? '#c89455' : '#9c6a36'); grd.addColorStop(.5, on ? '#a8743e' : '#855629'); grd.addColorStop(1, on ? '#6e4520' : '#5a3818');
    g.fillStyle = grd; g.beginPath(); g.roundRect(x + 1.5, y + 1.5, cw - 3, rh - 3, 6); g.fill();
  }
  g.fillStyle = 'rgba(40,22,8,.8)'; for (let k = 0; k <= cols; k++) g.fillRect(k * cw - 1.5, 0, 3, H);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.x = 2; t.anisotropy = 4; return t;
}
const basket = new THREE.Group();
const basketInner = new THREE.Group(); basket.add(basketInner);
const weave = weaveTexture();
const bMat = new THREE.MeshStandardMaterial({ map: weave, roughness: .85, side: THREE.DoubleSide });
const bRTop = 1, bRBot = .74, bH = .78;
basketInner.add(new THREE.Mesh(new THREE.CylinderGeometry(bRTop, bRBot, bH, 40, 1, true), bMat));
const bottom = new THREE.Mesh(new THREE.CircleGeometry(bRBot, 32), new THREE.MeshStandardMaterial({ color: 0x3a2412, roughness: .9 }));
bottom.rotation.x = -Math.PI / 2; bottom.position.y = -bH / 2 + .01; basketInner.add(bottom);
const rimMat = new THREE.MeshStandardMaterial({ color: 0x8a5a2c, roughness: .7 });
const rimMesh = new THREE.Mesh(new THREE.TorusGeometry(bRTop, .075, 10, 48), rimMat);
rimMesh.rotation.x = Math.PI / 2; rimMesh.position.y = bH / 2; basketInner.add(rimMesh);
const band = new THREE.Mesh(new THREE.TorusGeometry((bRTop + bRBot) / 2 + .01, .04, 8, 48), rimMat);
band.rotation.x = Math.PI / 2; basketInner.add(band);
basketInner.rotation.x = .38; // tilt toward camera so you can see inside
// apples piling up inside the basket
const pile = new THREE.Group(); pile.position.y = -bH / 2 + .22; basketInner.add(pile);
const PILE_SPOTS = [[-.42, 0, .1], [.4, 0, -.05], [0, 0, .32], [0, .02, -.36], [-.2, .28, -.05], [.24, .3, .12], [0, .5, 0]];
const pileApples = PILE_SPOTS.map(([x, y, z], i) => {
  const a = buildApple(i % 5 === 3 ? 'golden' : 'red'); if (a.userData.glow) a.remove(a.userData.glow);
  a.scale.setScalar(.34); a.position.set(x, y, z); a.rotation.set(Math.random() - .5, Math.random() * 6, Math.random() - .5); a.visible = false; pile.add(a); return a;
});
const bShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTexture('rgba(0,0,0,.7)', 'rgba(0,0,0,.3)'), transparent: true, depthWrite: false }));
bShadow.rotation.x = -Math.PI / 2 + .2; scene.add(bShadow);
scene.add(basket);

/* ---------------- snow + burst particles ---------------- */
const SNOW = isMobile ? 160 : 420;
const snowGeo = new THREE.BufferGeometry(), snowArr = new Float32Array(SNOW * 3), snowSpd = new Float32Array(SNOW);
snowGeo.setAttribute('position', new THREE.BufferAttribute(snowArr, 3));
const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ size: .06, map: dotTex, transparent: true, depthWrite: false, opacity: .7, color: 0xdfe8ff }));
scene.add(snow);

const BURST = 240;
const bGeo = new THREE.BufferGeometry(), bPos = new Float32Array(BURST * 3), bCol = new Float32Array(BURST * 3);
const bVel = new Float32Array(BURST * 3), bLife = new Float32Array(BURST);
bGeo.setAttribute('position', new THREE.BufferAttribute(bPos, 3)); bGeo.setAttribute('color', new THREE.BufferAttribute(bCol, 3));
for (let i = 0; i < BURST; i++) bPos[i * 3 + 1] = -999;
const bursts = new THREE.Points(bGeo, new THREE.PointsMaterial({ size: .14, map: dotTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
bursts.frustumCulled = false; scene.add(bursts);
let bNext = 0;
function burst(x, y, color, n = 18, power = 1) {
  const c = new THREE.Color(color);
  for (let k = 0; k < n; k++) {
    const i = bNext; bNext = (bNext + 1) % BURST;
    const a = Math.random() * Math.PI * 2, s = (1.2 + Math.random() * 2.6) * power;
    bPos[i * 3] = x; bPos[i * 3 + 1] = y; bPos[i * 3 + 2] = .3;
    bVel[i * 3] = Math.cos(a) * s; bVel[i * 3 + 1] = Math.abs(Math.sin(a)) * s + 1.5; bVel[i * 3 + 2] = (Math.random() - .5);
    bLife[i] = .6 + Math.random() * .4; bCol[i * 3] = c.r; bCol[i * 3 + 1] = c.g; bCol[i * 3 + 2] = c.b;
  }
}

/* ---------------- layout ---------------- */
const L = { vw: 10, vh: 7, pw: 8, s: .35, by: -3, rTop: .7 };
function layout() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  L.vh = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
  L.vw = L.vh * camera.aspect;
  L.pw = Math.min(L.vw * .94, L.vh * 1.6);
  L.s = THREE.MathUtils.clamp(Math.min(L.pw * .05, L.vh * .052), .2, .4);
  const bs = L.s * 2.3; basket.scale.setScalar(bs);
  L.rTop = bRTop * bs;
  L.by = -L.vh / 2 + L.vh * (isMobile ? .16 : .13);
  L.rimY = L.by + bH / 2 * bs;
  basket.position.y = L.by;
  bShadow.scale.set(bs * 2.8, bs * 1.4, 1); bShadow.position.y = L.by - bH / 2 * bs - .05;
  for (let i = 0; i < SNOW; i++) resetSnow(i, true);
  snowGeo.attributes.position.needsUpdate = true;
  player.x = THREE.MathUtils.clamp(player.x, -maxX(), maxX());
}
function maxX() { return L.pw / 2 - L.rTop * .9; }
function resetSnow(i, anywhere) {
  snowArr[i * 3] = (Math.random() - .5) * L.vw * 1.3;
  snowArr[i * 3 + 1] = anywhere ? (Math.random() - .5) * L.vh * 1.1 : L.vh * .6;
  snowArr[i * 3 + 2] = (Math.random() - .5) * 6 - 1; snowSpd[i] = .2 + Math.random() * .4;
}

/* ---------------- state ---------------- */
const player = { x: 0, v: 0, target: null, tilt: 0 };
const keys = { left: false, right: false };
const apples = []; // active falling apples
const pool = { red: [], golden: [], rotten: [] };
let state = 'menu', score = 0, lives = LIVES, timeLeft = ROUND, elapsed = 0, combo = 0, bestCombo = 0, caught = 0, golds = 0;
let spawnT = 0, pileCount = 0, lastT = performance.now(), menuSpawn = 0;
let best = +(localStorage.getItem(BEST_KEY) || 0);

function getApple(type) {
  const a = pool[type].pop() || buildApple(type);
  scene.add(a); a.visible = true; return a;
}
function releaseApple(i) {
  const a = apples[i]; scene.remove(a); pool[a.userData.type].push(a); apples.splice(i, 1);
}
function spawn(ambient = false) {
  const d = Math.min(1, elapsed / 50);
  const r = Math.random();
  const pRot = ambient ? .15 : .13 + .17 * d, pGold = .08;
  const type = r < pGold ? 'golden' : r < pGold + pRot ? 'rotten' : 'red';
  const a = getApple(type);
  const m = maxX();
  a.position.set((Math.random() * 2 - 1) * m, L.vh / 2 + L.s * 1.6, 0);
  a.scale.setScalar(L.s * (type === 'golden' ? 1.05 : 1));
  a.rotation.set(Math.random() * .6 - .3, Math.random() * 6, Math.random() * .6 - .3);
  const sp = L.vh * (ambient ? .16 : (.27 + .33 * d)) * (.88 + Math.random() * .28) * (type === 'golden' ? 1.12 : 1);
  a.userData.vy = -sp;
  a.userData.vx = ambient ? 0 : (Math.random() - .5) * L.pw * .12 * d;
  a.userData.spin = (Math.random() - .5) * 2.4;
  a.userData.ambient = ambient;
  apples.push(a);
}

/* ---------------- HUD ---------------- */
const hud = { score: $('score'), combo: $('combo'), time: $('time'), fill: $('timefill'), lives: $('lives') };
function renderLives() { hud.lives.innerHTML = Array.from({ length: LIVES }, (_, i) => `<i class="${i < lives ? '' : 'gone'}"></i>`).join(''); }
function mult() { return Math.min(5, 1 + Math.floor(combo / 5)); }
function renderHUD() {
  hud.score.textContent = score;
  const m = mult();
  hud.combo.textContent = m > 1 ? `×${m}` : '';
  hud.combo.classList.toggle('on', m > 1);
  hud.time.textContent = Math.ceil(timeLeft);
  hud.fill.style.transform = `scaleX(${Math.max(0, Math.min(1, timeLeft / ROUND))})`;
  hud.fill.classList.toggle('low', timeLeft <= 10);
}
const tmpV = new THREE.Vector3();
function pop(text, cls, x, y) {
  tmpV.set(x, y, 0).project(camera);
  const el = document.createElement('div'); el.className = 'pop ' + cls; el.textContent = text;
  el.style.left = ((tmpV.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - tmpV.y) / 2 * innerHeight) + 'px';
  $('fx').appendChild(el); setTimeout(() => el.remove(), 950);
}
function flash() { const f = $('flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }

/* ---------------- sound (tiny WebAudio blips, no files) ---------------- */
let actx = null, muted = localStorage.getItem('pahadiSebMute') === '1';
$('muteBtn').classList.toggle('off', muted);
function tone(freq, dur, type = 'sine', vol = .12, when = 0, slide = 0) {
  if (muted) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t = actx.currentTime + when, o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + .02);
  } catch {}
}
const sfx = {
  catch: m => tone(520 + m * 70, .12, 'triangle', .1, 0, 1.5),
  gold: () => { [660, 880, 1175].forEach((f, i) => tone(f, .16, 'triangle', .09, i * .06)); },
  rotten: () => tone(180, .35, 'sawtooth', .08, 0, .5),
  miss: () => tone(300, .12, 'sine', .04, 0, .7),
  over: () => { [523, 392, 330, 262].forEach((f, i) => tone(f, .28, 'triangle', .08, i * .14)); },
};

/* ---------------- game flow ---------------- */
function clearApples() { while (apples.length) releaseApple(apples.length - 1); }
function startGame() {
  if (actx && actx.state === 'suspended') actx.resume();
  clearApples();
  score = 0; lives = LIVES; timeLeft = ROUND; elapsed = 0; combo = 0; bestCombo = 0; caught = 0; golds = 0; spawnT = .6; pileCount = 0;
  pileApples.forEach(a => a.visible = false);
  player.x = 0; player.v = 0; player.target = null;
  $('start').hidden = true; $('over').hidden = true; $('pause').hidden = true; $('hud').hidden = false;
  renderLives(); renderHUD();
  state = 'play'; lastT = performance.now();
}
function endGame(reason) {
  state = 'over';
  sfx.over();
  const isBest = score > best;
  if (isBest) { best = score; try { localStorage.setItem(BEST_KEY, best); } catch {} }
  $('overReason').textContent = reason === 'lives' ? 'Too many rotten apples' : 'Season over';
  $('finalScore').textContent = score;
  $('newBest').hidden = !(isBest && score > 0);
  $('stCaught').textContent = caught; $('stGold').textContent = golds; $('stCombo').textContent = bestCombo;
  $('bestOver').textContent = `Best · ${best}`;
  setTimeout(() => { if (state === 'over') { $('over').hidden = false; $('againBtn').focus({ preventScroll: true }); } }, 650);
}
function setPaused(p) {
  if (p && state === 'play') { state = 'paused'; $('pause').hidden = false; }
  else if (!p && state === 'paused') { state = 'play'; $('pause').hidden = true; lastT = performance.now(); }
}
function onCatch(a) {
  const t = a.userData.type, x = a.position.x, y = L.rimY + L.s;
  if (t === 'rotten') {
    lives--; combo = 0; renderLives();
    hud.lives.classList.remove('hit'); void hud.lives.offsetWidth; hud.lives.classList.add('hit');
    burst(x, y, '#7a5a2a', 16, .8); pop('−1 life', 'rot', x, y); sfx.rotten(); flash();
    if (navigator.vibrate) navigator.vibrate(60);
    if (lives <= 0) endGame('lives');
  } else {
    combo++; bestCombo = Math.max(bestCombo, combo); caught++;
    const m = mult(), base = t === 'golden' ? 5 : 1, pts = base * m;
    score += pts;
    if (combo % 5 === 0 && m > 1) { hud.combo.classList.remove('bump'); void hud.combo.offsetWidth; hud.combo.classList.add('bump'); }
    if (t === 'golden') { golds++; timeLeft += 2; burst(x, y, '#ffd86a', 30, 1.3); pop(`+${pts}  +2s`, 'gold', x, y); sfx.gold(); }
    else { burst(x, y, '#ff5a6a', 14); pop(`+${pts}`, 'red', x, y); sfx.catch(m); }
    // fill the basket
    if (pileCount < pileApples.length) pileApples[pileCount++].visible = true;
    player.squash = 1;
  }
}

/* ---------------- input ---------------- */
function pointerToX(clientX) { return (clientX / innerWidth - .5) * L.vw; }
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === 'arrowleft' || k === 'a') { keys.left = true; player.target = null; e.preventDefault(); }
  if (k === 'arrowright' || k === 'd') { keys.right = true; player.target = null; e.preventDefault(); }
  if ((k === ' ' || k === 'enter') && (state === 'menu' || (state === 'over' && !$('over').hidden))) { e.preventDefault(); startGame(); }
  if (k === 'p' || k === 'escape') setPaused(state === 'play');
  if (k === 'm') toggleMute();
});
addEventListener('keyup', e => {
  const k = e.key.toLowerCase();
  if (k === 'arrowleft' || k === 'a') keys.left = false;
  if (k === 'arrowright' || k === 'd') keys.right = false;
});
canvas.addEventListener('pointerdown', e => { player.target = pointerToX(e.clientX); });
addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse' || e.buttons || e.pointerType === 'touch') player.target = pointerToX(e.clientX);
}, { passive: true });
$('startBtn').addEventListener('click', startGame);
$('againBtn').addEventListener('click', startGame);
$('pauseBtn').addEventListener('click', () => setPaused(state === 'play'));
$('resumeBtn').addEventListener('click', () => setPaused(false));
$('quitBtn').addEventListener('click', startGame);
function toggleMute() { muted = !muted; $('muteBtn').classList.toggle('off', muted); try { localStorage.setItem('pahadiSebMute', muted ? '1' : '0'); } catch {} }
$('muteBtn').addEventListener('click', toggleMute);
document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });
addEventListener('blur', () => setPaused(true));
addEventListener('resize', layout);
$('bestStart').textContent = best ? `Best · ${best}` : '';

/* ---------------- loop ---------------- */
function update(dt) {
  const playing = state === 'play';
  if (playing) {
    elapsed += dt; timeLeft -= dt;
    if (timeLeft <= 0) { timeLeft = 0; renderHUD(); endGame('time'); }
    const d = Math.min(1, elapsed / 50);
    spawnT -= dt;
    if (spawnT <= 0 && state === 'play') { spawn(); spawnT = THREE.MathUtils.lerp(.9, .4, d) * (.75 + Math.random() * .5); }
  } else if (state === 'menu') {
    menuSpawn -= dt; if (menuSpawn <= 0) { spawn(true); menuSpawn = 1.1 + Math.random() * .8; }
  }

  // player
  const m = maxX();
  if (state === 'play') {
    const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    if (dir) { player.v = THREE.MathUtils.damp(player.v, dir * L.pw * 1.15, 12, dt); player.x += player.v * dt; }
    else if (player.target !== null) { const nx = THREE.MathUtils.damp(player.x, THREE.MathUtils.clamp(player.target, -m, m), 20, dt); player.v = (nx - player.x) / dt; player.x = nx; }
    else { player.v = THREE.MathUtils.damp(player.v, 0, 10, dt); player.x += player.v * dt; }
  } else if (state === 'menu') {
    player.x = Math.sin(performance.now() / 1400) * m * .5; player.v = 0;
  }
  player.x = THREE.MathUtils.clamp(player.x, -m, m);
  basket.position.x = player.x; bShadow.position.x = player.x;
  player.tilt = THREE.MathUtils.damp(player.tilt, THREE.MathUtils.clamp(-player.v / (L.pw * 1.5), -.35, .35), 8, dt);
  basket.rotation.z = player.tilt;
  player.squash = THREE.MathUtils.damp(player.squash || 0, 0, 9, dt);
  basketInner.scale.set(1 + player.squash * .08, 1 - player.squash * .1, 1 + player.squash * .08);

  // apples
  const t = performance.now() / 1000;
  for (let i = apples.length - 1; i >= 0; i--) {
    const a = apples[i], u = a.userData, prevY = a.position.y;
    a.position.y += u.vy * dt;
    a.position.x += u.vx * dt;
    if (Math.abs(a.position.x) > m) { u.vx *= -1; a.position.x = Math.sign(a.position.x) * m; }
    a.rotation.y += u.spin * dt; a.rotation.z = Math.sin(t * 2 + i) * .15;
    if (u.glow) u.glow.material.opacity = .55 + Math.sin(t * 6) * .25;
    // catch: apple's bottom crosses the rim line while over the basket opening
    const bottomNow = a.position.y - L.s * .7, bottomPrev = prevY - L.s * .7;
    if (!u.ambient && state === 'play' && bottomPrev >= L.rimY && bottomNow < L.rimY && Math.abs(a.position.x - player.x) < L.rTop * 1.02) {
      onCatch(a); releaseApple(i); continue;
    }
    if (a.position.y < -L.vh / 2 - L.s * 2) {
      if (!u.ambient && state === 'play' && u.type !== 'rotten') { if (combo >= 5) pop('combo lost', 'rot', a.position.x, -L.vh / 2 + L.vh * .06); combo = 0; sfx.miss(); }
      releaseApple(i);
    }
  }

  // snow
  for (let i = 0; i < SNOW; i++) {
    snowArr[i * 3 + 1] -= snowSpd[i] * dt; snowArr[i * 3] += Math.sin(t * .6 + i) * dt * .06;
    if (snowArr[i * 3 + 1] < -L.vh * .6) resetSnow(i, false);
  }
  snowGeo.attributes.position.needsUpdate = true;
  // bursts
  for (let i = 0; i < BURST; i++) {
    if (bLife[i] <= 0) continue;
    bLife[i] -= dt;
    bVel[i * 3 + 1] -= 7 * dt;
    bPos[i * 3] += bVel[i * 3] * dt; bPos[i * 3 + 1] += bVel[i * 3 + 1] * dt; bPos[i * 3 + 2] += bVel[i * 3 + 2] * dt;
    if (bLife[i] <= 0) bPos[i * 3 + 1] = -999;
  }
  bGeo.attributes.position.needsUpdate = true; bGeo.attributes.color.needsUpdate = true;
  if (state === 'play') renderHUD();
}

function frame(now) {
  const dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
  if (state !== 'paused') update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
layout();
requestAnimationFrame(t => { lastT = t; frame(t); });

// read-only hook for play-testing in dev tools
Object.defineProperty(window, 'pahadiSeb', { value: Object.freeze({ get state() { return state; }, get score() { return score; }, get lives() { return lives; }, get timeLeft() { return timeLeft; }, get apples() { return apples.length; }, get x() { return player.x; }, get caught() { return caught; }, get vw() { return L.vw; }, get items() { return apples.map(a => ({ t: a.userData.type, x: a.position.x, y: a.position.y })); } }) });
