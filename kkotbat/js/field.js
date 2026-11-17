// 06 꽃밭에 심기 + 풀밭의 꽃들
//
// - 심어진 꽃을 풀밭(월드)에 그림. 꽃마다 누르거나 마우스를 올리면 '이름의 꽃' 이름표
// - 가장 최근에 심어진 꽃 1송이만 은은하게 빛나고 '방금 핀 꽃' 이름표가 붙음.
//   다음 꽃이 심어지면 강조가 그 꽃으로 넘어감 (여러 사람이 쓰는 꽃밭이라 '내 꽃'을 상시 강조하지 않음)

import { renderRig } from './plantRig.js?v=1117i';

const FLOWER_SIZE = 230; // 풀밭 꽃 크기 (원 안 식물을 이 크기로 축소)

export class FlowerField {
  constructor({ layer, world, reducedMotion, onSelect }) {
    this.layer = layer;
    this.onSelect = onSelect;
    this.world = world;
    this.reducedMotion = reducedMotion;
    this.plots = new Map();
    this.latestId = null;
    this.flowers = new Map();
  }

  async renderAll(flowers) {
    for (const f of flowers) this.add(f, false);
    this.setLatest(flowers.length ? flowers[flowers.length - 1].id : null);
  }

  add(flower, animate) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'plot-flower';
    el.style.left = `${flower.x}px`;
    el.style.top = `${flower.y}px`;
    el.style.zIndex = String(Math.round(flower.y));
    el.setAttribute('aria-label', `${flower.name}의 꽃`);
    el.innerHTML = `<span class="pf-glow" aria-hidden="true"></span>
      <span class="plant-rig pf-rig" aria-hidden="true"></span>
      <span class="pf-label"><span class="pf-new">방금 핀 꽃</span>${escapeHTML(flower.name)}의 꽃</span>`;
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('click', () => this.onSelect?.(this.flowers.get(flower.id)));
    this.layer.appendChild(el);
    this.plots.set(flower.id, el);
    this.flowers.set(flower.id, flower);
    renderRig(el.querySelector('.pf-rig'), flower.recipe, flower.image, FLOWER_SIZE, -1);
    if (animate && !this.reducedMotion) {
      el.classList.add('is-sprouting');
      setTimeout(() => el.classList.remove('is-sprouting'), 800);
    }
    return el;
  }

  select(id) {
    for (const [fid, el] of this.plots) el.classList.toggle('is-selected', fid === id);
    this.layer.classList.toggle('has-selection', !!id);
  }

  setLatest(id) {
    if (this.latestId) this.plots.get(this.latestId)?.classList.remove('is-latest');
    this.latestId = id;
    if (id) this.plots.get(id)?.classList.add('is-latest');
  }

  /** 06: 새 꽃 자리. 다른 꽃과 충분히 떨어진 자리 중 지금 화면 가운데에서 가장 가까운 곳 */
  findSpot(cam, vw, vh, horizon, worldW, worldH) {
    const taken = [...this.plots.values()].map((el) => ({ x: parseFloat(el.style.left), y: parseFloat(el.style.top) }));
    const cx = cam.x + vw / 2, cy = cam.y + vh * 0.68;
    // 꽃은 위로 키가 커서 세로로는 더 떨어져야 겹치지 않음 (가로 130px 또는 세로 ~220px)
    const gap = (x, y) => taken.reduce((m, t) => Math.min(m, Math.hypot(t.x - x, (t.y - y) * 0.6)), Infinity);
    let best = null, fallback = null;
    for (let i = 0; i < 300; i++) {
      const spread = 120 + i * 4; // 화면 가운데에서 점점 넓혀 가며 찾음
      const x = Math.min(worldW - 120, Math.max(120, cx + (Math.random() - 0.5) * 2 * spread));
      const y = Math.min(worldH - 40, Math.max(horizon + 240, cy + (Math.random() - 0.5) * spread * 0.6));
      const d = gap(x, y);
      if (!fallback || d > fallback.d) fallback = { x, y, d };
      if (d >= 130) {
        const dist = Math.hypot(x - cx, y - cy);
        if (!best || dist < best.dist) best = { x, y, dist };
        if (i > 40) break;
      }
    }
    const p = best || fallback;
    return { x: Math.round(p.x), y: Math.round(p.y) };
  }

  /** 새로 심은 꽃 주변에 반짝임 */
  sparkle(id) {
    const el = this.plots.get(id);
    if (!el || this.reducedMotion) return;
    for (let k = 0; k < 14; k++) {
      const s = document.createElement('span');
      s.className = 'spark';
      s.style.left = '0'; s.style.top = '-60px';
      el.appendChild(s);
      const a = Math.random() * Math.PI * 2, r = 60 + Math.random() * 70;
      s.animate([
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * r}px), calc(-50% + ${Math.sin(a) * r}px)) scale(0.2)`, opacity: 0 },
      ], { duration: 800, delay: 350, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' }).finished.then(() => s.remove());
    }
  }
}

function escapeHTML(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
