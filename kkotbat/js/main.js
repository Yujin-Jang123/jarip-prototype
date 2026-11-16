import { paintMeadow } from './meadow.js';
import { SeedField } from './seeds.js';
import { store } from './store.js';
import { PlantScene } from './plant.js';
import { GrowScene } from './grow.js';
import { BloomScene } from './bloom.js';
import { FlowerField } from './field.js';
import { GuestbookPanel } from './guestbook.js';
import { Butterflies } from './butterflies.js';

// 풀밭(월드) 크기와 지평선 높이
const WORLD = { width: 3200, height: 2000, horizon: 620 };

const $ = (id) => document.getElementById(id);
const viewport = $('viewport');
const world = $('world');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ───────── 토스트 ───────── */
let toastTimer;
function toast(message, ms = 2800) {
  const t = $('toast');
  t.textContent = message;
  t.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-on'), ms);
}

/* ───────── 풀밭 그리기 ───────── */
world.style.width = `${WORLD.width}px`;
world.style.height = `${WORLD.height}px`;
$('sky').style.height = `${WORLD.horizon + 160}px`;
paintMeadow($('land'), WORLD).then(() => $('land').classList.add('is-ready'));

/* ───────── 카메라 (드래그 · 스크롤 · 방향키로 이동) ───────── */
const cam = { x: 0, y: 0 };
const vel = { x: 0, y: 0 };
let inertiaId = 0;

function clampCam() {
  cam.x = Math.max(0, Math.min(cam.x, WORLD.width - viewport.clientWidth));
  cam.y = Math.max(0, Math.min(cam.y, WORLD.height - viewport.clientHeight));
}
const zoom = { s: 1, x: 0, y: 0 };
function applyCam() {
  clampCam();
  world.style.transformOrigin = `${zoom.x}px ${zoom.y}px`;
  world.style.transform = `translate3d(${-cam.x}px, ${-cam.y}px, 0)${zoom.s !== 1 ? ` scale(${zoom.s})` : ''}`;
}
// 월드 좌표 (x, y)를 중심으로 확대/축소 (그 점은 화면에서 제자리)
function setZoom(s, x, y, ms) {
  zoom.s = s; zoom.x = x; zoom.y = y;
  world.style.transition = ms ? `transform ${ms}ms cubic-bezier(.22,.7,.2,1)` : 'none';
  applyCam();
  if (ms) setTimeout(() => { world.style.transition = 'none'; }, ms);
}
const isPlanting = () => ['is-planting', 'is-growing', 'is-blooming'].some((c) => document.body.classList.contains(c));
function centerCam() {
  cam.x = (WORLD.width - viewport.clientWidth) / 2;
  // 지평선 위치: 가로 화면은 화면 중간, 세로로 긴 모바일 화면은 조금 위로
  const portrait = viewport.clientHeight > viewport.clientWidth;
  cam.y = WORLD.horizon - viewport.clientHeight * (portrait ? 0.34 : 0.5);
  applyCam();
}

let drag = null;
viewport.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || isPlanting() || e.target.closest('button, a, input')) return;
  cancelAnimationFrame(inertiaId);
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), sx: e.clientX, sy: e.clientY };
  vel.x = vel.y = 0;
  viewport.setPointerCapture(e.pointerId);
  viewport.classList.add('is-dragging');
});
viewport.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const now = performance.now();
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  const dt = Math.max(1, now - drag.t);
  cam.x -= dx; cam.y -= dy;
  vel.x = (-dx / dt) * 16; vel.y = (-dy / dt) * 16; // px/프레임
  drag.x = e.clientX; drag.y = e.clientY; drag.t = now;
  applyCam();
});
function endDrag(e) {
  if (!drag || e.pointerId !== drag.id) return;
  if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) guest.close(); // 빈 풀밭을 톡 누르면 닫힘
  drag = null;
  viewport.classList.remove('is-dragging');
  if (!reducedMotion) glide();
}
viewport.addEventListener('pointerup', endDrag);
viewport.addEventListener('pointercancel', endDrag);

function glide() {
  vel.x *= 0.93; vel.y *= 0.93;
  if (Math.abs(vel.x) < 0.2 && Math.abs(vel.y) < 0.2) return;
  cam.x += vel.x; cam.y += vel.y;
  applyCam();
  inertiaId = requestAnimationFrame(glide);
}

viewport.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (isPlanting()) return;
  cancelAnimationFrame(inertiaId);
  cam.x += e.shiftKey ? e.deltaY : e.deltaX;
  cam.y += e.shiftKey ? 0 : e.deltaY;
  applyCam();
}, { passive: false });

viewport.addEventListener('keydown', (e) => {
  const step = 90;
  const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
  const m = moves[e.key];
  if (!m || e.target !== viewport || isPlanting()) return;
  e.preventDefault();
  cam.x += m[0]; cam.y += m[1];
  applyCam();
});

/* ───────── 떠다니는 씨앗 ───────── */
function seedBounds() {
  const top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-h')) || 72;
  return { left: 0, top: top + 8, right: viewport.clientWidth, bottom: viewport.clientHeight - 84 };
}

const seeds = new SeedField($('seeds'), {
  getBounds: seedBounds,
  reducedMotion,
  onPick: (detail) => {
    guest.close();
    window.dispatchEvent(new CustomEvent('kkotbat:seed-picked', { detail }));
    plant.start(detail);
  },
});

/* ───────── 03 씨앗 심기 · 이름 붙이기 ───────── */
const plant = new PlantScene({
  viewport, world, reducedMotion, setZoom,
  getCam: () => ({ x: cam.x, y: cam.y }),
  // 이름을 붙이면 04 성장 미션으로 (sprout = { name, image, x, y, plantedAt })
  onDone: (sprout) => grow.start(sprout),
});

/* ───────── 04 성장 미션 ───────── */
const grow = new GrowScene({
  reducedMotion,
  // 꽃이 피면 05로 (flower = { name, image, x, y, recipe, missions, bloomedAt })
  onBloom: (flower) => { bloom.start(flower); grow.close(); },
});

/* ───────── 05 개화 완료 ───────── */
const bloom = new BloomScene({ reducedMotion, onPlant: (flower) => plantFlower(flower) });

/* ───────── 06 꽃밭에 심기 ───────── */
const field = new FlowerField({
  layer: $('plots'), world, reducedMotion,
  // 07: 꽃을 누르면 방명록
  onSelect: (flower) => {
    field.select(flower.id);
    guest.open(flower);
    const wide = viewport.clientWidth > 700;
    panTo(flower.x + (wide ? 200 : 0), flower.y + (wide ? -40 : viewport.clientHeight * 0.2), 700);
  },
});

/* ───────── 나비: 꽃 4송이마다 1마리 ───────── */
const butterflies = new Butterflies({
  layer: $('plots'), reducedMotion,
  getFlowers: () => [...field.flowers.values()].map((f) => ({ x: f.x, y: f.y })),
});

/* ───────── 07 방명록 ───────── */
const guest = new GuestbookPanel({ store, reducedMotion, toast, onClose: () => field.select(null) });

async function plantFlower(flower) {
  const spot = field.findSpot(cam, viewport.clientWidth, viewport.clientHeight, WORLD.horizon, WORLD.width, WORLD.height);
  const saved = await store.addFlower({
    name: flower.name, image: flower.image, recipe: flower.recipe, missions: flower.missions, x: spot.x, y: spot.y,
  });
  panTo(spot.x, spot.y - 40, 700);      // 새 꽃 자리가 화면 가운데 오도록
  await wait(reducedMotion ? 0 : 450); // 05가 걷히는 동안
  field.add(saved, true);
  field.setLatest(saved.id); // 가장 최근 꽃만 강조 → 다음 꽃이 심어지면 넘어감
  field.sparkle(saved.id);
  butterflies.update(field.flowers.size, { x: saved.x, y: saved.y });
  await refresh(true);
  toast(`${saved.name}의 꽃이 꽃밭에 심겼어요. 다른 꽃들도 구경해보세요`, 4200);
  window.dispatchEvent(new CustomEvent('kkotbat:planted', { detail: saved }));
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// 카메라를 부드럽게 월드 좌표 (x, y)가 화면 가운데 오도록 이동
function panTo(x, y, ms = 900) {
  cancelAnimationFrame(inertiaId);
  const from = { x: cam.x, y: cam.y };
  const to = { x: x - viewport.clientWidth / 2, y: y - viewport.clientHeight * 0.58 };
  if (reducedMotion) { cam.x = to.x; cam.y = to.y; applyCam(); return; }
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / ms), e = 1 - Math.pow(1 - t, 3);
    cam.x = from.x + (to.x - from.x) * e; cam.y = from.y + (to.y - from.y) * e;
    applyCam();
    if (t < 1) inertiaId = requestAnimationFrame(step);
  };
  inertiaId = requestAnimationFrame(step);
}

/* ───────── 꽃 수 · 빈 상태 ───────── */
async function refresh(bump = false) {
  const flowers = await store.getFlowers();
  $('bloomCount').textContent = flowers.length.toLocaleString('ko-KR');
  $('emptyState').hidden = flowers.length > 0;
  if (bump) {
    const c = $('bloomCount').parentElement;
    c.classList.remove('is-bump'); void c.offsetWidth; c.classList.add('is-bump');
  }
}

// 내 꽃 찾기: 이 기기에서 심은 꽃으로 이동하고 이름표 표시 (받은 방명록은 08에서)
$('findMine').addEventListener('click', async () => {
  const id = store.getMyFlowerId();
  const mine = (await store.getFlowers()).find((f) => f.id === id);
  if (!mine) {
    toast('아직 심은 꽃이 없어요. 먼저 떠다니는 씨앗을 눌러보세요');
    return;
  }
  panTo(mine.x, mine.y - 60);
  const el = field.plots.get(mine.id);
  el?.classList.add('is-labeled', 'is-found');
  guest.close();
  setTimeout(() => el?.classList.remove('is-found'), 2400);
});

/* ───────── 시작 ───────── */
centerCam();
seeds.start();
store.getFlowers().then((list) => { field.renderAll(list); butterflies.update(list.length); });
refresh();

let resizeTimer;
window.addEventListener('resize', () => {
  applyCam();
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => seeds.resize(), 200);
});
