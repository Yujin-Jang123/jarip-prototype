// 꽃밭의 꿀벌 — 처음부터 2마리, 꽃 5송이마다 1마리씩 늘어남 (최대 8마리)
// 날개를 빠르게 붕붕 떨며 꽃(없으면 풀밭 여기저기)을 옮겨 다니고, 꽃 위에서 잠깐 맴돎.

const BASE = 2;
const PER_FLOWERS = 5;
const MAX = 8;

function beeSVG(id) {
  return `<svg viewBox="-34 -30 68 56" width="58" height="48" aria-hidden="true">
    <defs>
      <radialGradient id="by${id}" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#fff6c4"/><stop offset=".45" stop-color="#ffd23a"/><stop offset="1" stop-color="#f0a400"/></radialGradient>
      <radialGradient id="bd${id}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#7a5236"/><stop offset="1" stop-color="#2e1d12"/></radialGradient>
      <linearGradient id="bw${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset="1" stop-color="#cfe8ff" stop-opacity=".55"/></linearGradient>
      <clipPath id="bc${id}"><ellipse cx="2" cy="4" rx="17" ry="13"/></clipPath>
    </defs>
    <g class="bee-wing bee-wing-back"><path d="M-2 -6 C-12 -26 -30 -24 -26 -12 C-23 -4 -10 -3 -2 -4Z" fill="url(#bw${id})" stroke="#9cc7ea" stroke-width=".7"/><path d="M-4 -6 Q-14 -14 -24 -14" stroke="#9cc7ea" stroke-width=".5" fill="none"/></g>
    <path d="M17 4 L24 6 L17 8Z" fill="#3a2516"/>
    <ellipse cx="2" cy="4" rx="17" ry="13" fill="url(#by${id})"/>
    <g clip-path="url(#bc${id})" fill="url(#bd${id})">
      <path d="M-3 -10 C-6 -2 -6 10 -3 18 L3 18 C0 10 0 -2 3 -10Z"/>
      <path d="M7 -10 C4 -2 4 10 7 18 L12 18 C9 10 9 -2 12 -10Z"/>
    </g>
    <ellipse cx="-3" cy="-2" rx="9" ry="4" fill="#fff" opacity=".35" transform="rotate(-12 -3 -2)"/>
    <circle cx="-16" cy="1" r="9" fill="url(#bd${id})"/>
    <circle cx="-19" cy="-1" r="2.4" fill="#fff"/><circle cx="-19.6" cy="-1.2" r="1.3" fill="#1a1009"/>
    <ellipse cx="-21" cy="5" rx="2" ry="1.2" fill="#ff9aa8" opacity=".7"/>
    <path d="M-18 -7 Q-22 -16 -27 -17 M-14 -8 Q-15 -17 -19 -20" stroke="#2e1d12" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    <circle cx="-27" cy="-17" r="1.6" fill="#2e1d12"/><circle cx="-19" cy="-20" r="1.6" fill="#2e1d12"/>
    <g class="bee-wing bee-wing-front"><path d="M3 -7 C0 -28 22 -30 20 -15 C19 -6 9 -4 3 -6Z" fill="url(#bw${id})" stroke="#9cc7ea" stroke-width=".7"/><path d="M4 -8 Q10 -18 18 -20" stroke="#9cc7ea" stroke-width=".5" fill="none"/></g>
  </svg>`;
}

export class Bees {
  constructor({ layer, getFlowers, getArea, reducedMotion }) {
    this.layer = layer;
    this.getFlowers = getFlowers; // () => [{x, y}] 월드 좌표
    this.getArea = getArea;       // () => {x0, x1, y0, y1} 꽃이 없을 때 날아다닐 풀밭 범위
    this.reducedMotion = reducedMotion;
    this.list = [];
    this.last = 0;
    this.frame = this.frame.bind(this);
    requestAnimationFrame(this.frame);
  }

  update(count, at) {
    const want = Math.min(MAX, BASE + Math.floor(count / PER_FLOWERS));
    while (this.list.length < want) this.spawn(at);
  }

  randomPoint() {
    const flowers = this.getFlowers();
    if (flowers.length && Math.random() < 0.85) {
      const f = flowers[Math.floor(Math.random() * flowers.length)];
      return { x: f.x + (Math.random() - 0.5) * 60, y: f.y - 110 - Math.random() * 60 };
    }
    const a = this.getArea();
    return { x: a.x0 + Math.random() * (a.x1 - a.x0), y: a.y0 + Math.random() * (a.y1 - a.y0) };
  }

  spawn(at) {
    const id = Math.random().toString(36).slice(2, 7);
    const el = document.createElement('div');
    el.className = 'bee';
    el.innerHTML = beeSVG(id);
    this.layer.appendChild(el);
    const p = at ? { x: at.x, y: at.y - 100 } : this.randomPoint();
    const b = { el, x: p.x, y: p.y, vx: 0, vy: 0, target: this.randomPoint(), rest: 0, phase: Math.random() * 10, face: -1 };
    this.list.push(b);
    this.render(b);
  }

  frame(t) {
    const dt = this.last ? Math.min(0.05, (t - this.last) / 1000) : 0;
    this.last = t;
    if (dt && !this.reducedMotion) for (const b of this.list) this.step(b, dt, t / 1000);
    requestAnimationFrame(this.frame);
  }

  step(b, dt, time) {
    const dx = b.target.x - b.x, dy = b.target.y - b.y;
    const d = Math.hypot(dx, dy);
    if (b.rest > 0) {
      b.rest -= dt;                                   // 꽃 위에서 작게 맴돎
      b.x += Math.cos(time * 4 + b.phase) * 26 * dt;
      b.y += Math.sin(time * 6 + b.phase) * 14 * dt;
      if (b.rest <= 0) b.target = this.randomPoint();
    } else if (d < 14) {
      b.rest = 0.8 + Math.random() * 1.8;
      b.vx = b.vy = 0;
    } else {
      const speed = 120;
      b.vx += ((dx / d) * speed - b.vx) * Math.min(1, dt * 3);
      b.vy += ((dy / d) * speed - b.vy) * Math.min(1, dt * 3);
      b.x += b.vx * dt + Math.sin(time * 9 + b.phase) * 30 * dt;   // 붕붕 지그재그
      b.y += b.vy * dt + Math.cos(time * 11 + b.phase) * 40 * dt;
      if (Math.abs(b.vx) > 8) b.face = b.vx > 0 ? 1 : -1;
    }
    this.render(b);
  }

  render(b) {
    // 그림은 왼쪽을 보고 있음 → 오른쪽으로 갈 땐 좌우 반전
    b.el.style.transform = `translate(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px) scaleX(${-b.face})`;
    b.el.style.zIndex = String(Math.round(b.y + 400));
  }
}
