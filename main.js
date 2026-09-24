import * as THREE from 'three';

const canvas = document.getElementById('scene');
const mobile = window.matchMedia('(max-width: 640px)').matches;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d10);
scene.fog = new THREE.Fog(0x0b0d10, 14, 42);

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0.4, 9);

// Lights
scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x1a0b0b, 0.55));
const key = new THREE.DirectionalLight(0xfff1dc, 2.4);
key.position.set(4, 6, 5);
scene.add(key);
const rim = new THREE.DirectionalLight(0xff4d5e, 1.6);
rim.position.set(-6, 2, -4);
scene.add(rim);

// Apple (lathe profile)
const pts = [];
for (let i = 0; i <= 40; i++) {
  const t = i / 40;
  const a = t * Math.PI;
  let r = Math.sin(a) * (1 + 0.18 * Math.sin(a)) ;
  r *= 1 - 0.12 * Math.pow(1 - t, 3);
  let y = -Math.cos(a) * 1.05;
  if (t < 0.08) y += (0.08 - t) * 1.6;      // bottom dimple
  if (t > 0.9) y -= (t - 0.9) * 2.4;        // top dimple
  pts.push(new THREE.Vector2(Math.max(r, 0.001), y));
}
const appleGeo = new THREE.LatheGeometry(pts, mobile ? 48 : 96);
appleGeo.computeVertexNormals();
const appleMat = new THREE.MeshPhysicalMaterial({
  color: 0xb3122b, roughness: 0.32, metalness: 0.0,
  clearcoat: 1.0, clearcoatRoughness: 0.18, sheen: 0.4, sheenColor: new THREE.Color(0xff7a7a)
});
const apple = new THREE.Group();
const body = new THREE.Mesh(appleGeo, appleMat);
apple.add(body);

const stem = new THREE.Mesh(
  new THREE.CylinderGeometry(0.035, 0.05, 0.55, 10),
  new THREE.MeshStandardMaterial({ color: 0x4a3322, roughness: 0.9 })
);
stem.position.set(0.04, 1.05, 0);
stem.rotation.z = -0.18;
apple.add(stem);

const leafShape = new THREE.Shape();
leafShape.moveTo(0, 0);
leafShape.quadraticCurveTo(0.35, 0.28, 0.8, 0);
leafShape.quadraticCurveTo(0.35, -0.28, 0, 0);
const leaf = new THREE.Mesh(
  new THREE.ShapeGeometry(leafShape, 12),
  new THREE.MeshStandardMaterial({ color: 0x3f7d3a, roughness: 0.6, side: THREE.DoubleSide })
);
leaf.position.set(0.08, 1.2, 0);
leaf.rotation.set(0.4, 0.3, 0.45);
apple.add(leaf);
apple.position.set(mobile ? 0 : 2.6, mobile ? 1.2 : 0.2, 0);
apple.scale.setScalar(mobile ? 0.95 : 1.25);
scene.add(apple);

// Low-poly mountain ridges
function ridge(z, height, color, seed) {
  const w = 80, seg = 60;
  const geo = new THREE.PlaneGeometry(w, height * 2, seg, 1);
  const pos = geo.attributes.position;
  let s = seed;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const peaks = [];
  for (let i = 0; i <= seg; i++) peaks.push(rnd());
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) > 0) {
      const ix = i % (seg + 1);
      const x = pos.getX(i);
      const h = height * (0.35 + 0.65 * peaks[ix]) * (0.7 + 0.3 * Math.sin(x * 0.15 + seed));
      pos.setY(i, h);
    }
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, fog: true }));
  m.position.set(0, -4.2, z);
  return m;
}
const ridges = new THREE.Group();
ridges.add(ridge(-22, 5.5, 0x1c2330, 11));
ridges.add(ridge(-16, 4.2, 0x151a23, 23));
ridges.add(ridge(-10, 3.0, 0x0f1218, 37));
scene.add(ridges);

// Snow particles
const snowCount = mobile ? 500 : 1200;
const snowGeo = new THREE.BufferGeometry();
const sp = new Float32Array(snowCount * 3);
for (let i = 0; i < snowCount; i++) {
  sp[i * 3] = (Math.random() - 0.5) * 40;
  sp[i * 3 + 1] = Math.random() * 20 - 6;
  sp[i * 3 + 2] = (Math.random() - 0.5) * 30 - 5;
}
snowGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({
  color: 0xffffff, size: mobile ? 0.06 : 0.05, transparent: true, opacity: 0.7, depthWrite: false
}));
scene.add(snow);

// Interaction
let mx = 0, my = 0, scrollY = 0;
window.addEventListener('pointermove', e => {
  mx = (e.clientX / window.innerWidth - 0.5);
  my = (e.clientY / window.innerHeight - 0.5);
}, { passive: true });
window.addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
function tick() {
  const t = clock.getElapsedTime();
  const vh = window.innerHeight;
  const p = Math.min(scrollY / vh, 3);

  apple.rotation.y = t * 0.5 + p * 1.5;
  apple.rotation.x = Math.sin(t * 0.6) * 0.08 + my * 0.3;
  apple.rotation.z = mx * 0.2;
  apple.position.y = (mobile ? 1.2 : 0.2) + Math.sin(t * 1.1) * 0.12 + p * 1.6;
  const fade = Math.max(0, 1 - p * 0.35);
  apple.scale.setScalar((mobile ? 0.95 : 1.25) * (0.6 + 0.4 * fade));

  camera.position.x += (mx * 0.8 - camera.position.x) * 0.04;
  camera.position.y += (0.4 - my * 0.5 - p * 0.6 - camera.position.y) * 0.04;
  camera.lookAt(0, -p * 0.4, 0);
  ridges.position.y = p * 0.8;

  const arr = snowGeo.attributes.position.array;
  for (let i = 0; i < snowCount; i++) {
    arr[i * 3 + 1] -= 0.012 + (i % 5) * 0.002;
    arr[i * 3] += Math.sin(t + i) * 0.002;
    if (arr[i * 3 + 1] < -6) arr[i * 3 + 1] = 14;
  }
  snowGeo.attributes.position.needsUpdate = true;

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();

// Scroll reveal
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el, i) => {
  el.style.transitionDelay = (i % 3) * 0.08 + 's';
  io.observe(el);
});

// 3D tilt on cards (desktop)
if (!mobile) {
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-4px)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });
}
