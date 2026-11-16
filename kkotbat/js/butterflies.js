// 꽃밭의 나비 — 꽃이 많아질수록 나비가 늘어남 (꽃 4송이마다 1마리, 최대 12마리)
// 나비는 꽃에서 꽃으로 팔랑팔랑 날아다니고, 꽃 위에서 잠깐 머물렀다가 다음 꽃으로 감.

const PER_FLOWERS = 4;
const MAX = 12;
const COLORS = [
  ['#ffb3d1', '#ff5fa2'], // 분홍
  ['#ffe27a', '#ffb000'], // 노랑
  ['#bfe3ff', '#4aa8ff'], // 하늘
  ['#e3ccff', '#9a63ff'], // 보라
  ['#ffd0b0', '#ff7a3d'], // 살구
];

function butterflySVG([light, deep], id) {
  return `<svg viewBox="-30 -26 60 52" width="62" height="54" aria-hidden="true">
    <defs>
      <radialGradient id="bw${id}" cx=".3" cy=".3" r=".9"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="${light}"/><stop offset="1" stop-color="${deep}"/></radialGradient>
    </defs>
    <g class="wing wing-l">
      <path d="M-1 -2 C-10 -24 -30 -24 -27 -8 C-25 2 -12 2 -1 -1Z" fill="url(#bw${id})"/>
      <path d="M-1 1 C-12 4 -22 10 -18 19 C-14 25 -5 16 -1 4Z" fill="url(#bw${id})"/>
      <ellipse cx="-17" cy="-12" rx="5" ry="3" fill="#fff" opacity=".55" transform="rotate(-30 -17 -12)"/>
    </g>
    <g class="wing wing-r">
      <path d="M1 -2 C10 -24 30 -24 27 -8 C25 2 12 2 1 -1Z" fill="url(#bw${id})"/>
      <path d="M1 1 C12 4 22 10 18 19 C14 25 5 16 1 4Z" fill="url(#bw${id})"/>
      <ellipse cx="17" cy="-12" rx="5" ry="3" fill="#fff" opacity=".55" transform="rotate(30 17 -12)"/>
    </g>
    <ellipse cx="0" cy="0" rx="2.4" ry="11" fill="#5a3b2a"/>
    <path d="M-1 -10 Q-5 -20 -8 -22 M1 -10 Q5 -20 8 -22" stroke="#5a3b2a" stroke-width="1.2" fill="none" stroke-linecap="round"/>
  </svg>`;
}

export class Butterflies {
  constructor({ layer, getFlowers, reducedMotion }) {
    this.layer = layer;
    this.getFlowers = getFlowers; // () => [{x, y}, ...] 월드 좌표
    this.reducedMotion = reducedMotion;
    this.list = [];
    this.last = 0;
    this.frame = this.frame.bind(this);
    requestAnimationFrame(this.frame);
  }

  /** 꽃 수에 맞게 나비 수를 맞춤. 새로 생긴 나비는 방금 심은 꽃(at)에서 날아오름 */
  update(count, at) {
    const want = Math.min(MAX, Math.floor(count / PER_FLOWERS));
    while (this.list.length < want) this.spawn(at);
  }

  spawn(at) {
    const flowers = this.getFlowers();
    const from = at || flowers[Math.floor(Math.random() * flowers.length)] || { x: 1600, y: 1000 };
    const id = Math.random().toString(36).slice(2, 7);
    const el = document.createElement('div');
    el.className = 'butterfly';
    el.innerHTML = butterflySVG(COLORS[this.list.length % COLORS.length], id);
    el.style.setProperty('--flap', `${(0.16 + Math.random() * 0.08).toFixed(2)}s`);
    this.layer.appendChild(el);
    const b = { el, x: from.x, y: from.y - 120, vx: 0, vy: 0, target: null, rest: 0, phase: Math.random() * 10 };
    this.pickTarget(b);
    this.list.push(b);
    this.render(b, 0);
  }

  pickTarget(b) {
    const flowers = this.getFlowers();
    const f = flowers[Math.floor(Math.random() * flowers.length)];
    if (!f) return;
    b.target = { x: f.x + (Math.random() - 0.5) * 50, y: f.y - 130 - Math.random() * 50 };
  }

  frame(t) {
    const dt = this.last ? Math.min(0.05, (t - this.last) / 1000) : 0;
    this.last = t;
    if (dt && !this.reducedMotion) {
      for (const b of this.list) this.step(b, dt, t / 1000);
    }
    requestAnimationFrame(this.frame);
  }

  step(b, dt, time) {
    if (!b.target) { this.pickTarget(b); return; }
    const dx = b.target.x - b.x, dy = b.target.y - b.y;
    const d = Math.hypot(dx, dy);
    if (b.rest > 0) {
      // 꽃 위에서 머무는 동안 살랑살랑
      b.rest -= dt;
      b.el.classList.add('is-resting');
      b.x += Math.sin(time * 2 + b.phase) * 6 * dt;
      b.y += Math.cos(time * 3 + b.phase) * 4 * dt;
      if (b.rest <= 0) { b.el.classList.remove('is-resting'); this.pickTarget(b); }
    } else if (d < 12) {
      b.rest = 1.5 + Math.random() * 2.5;
      b.vx = b.vy = 0;
    } else {
      const speed = 70;
      b.vx += ((dx / d) * speed - b.vx) * Math.min(1, dt * 2);
      b.vy += ((dy / d) * speed - b.vy) * Math.min(1, dt * 2);
      b.x += b.vx * dt + Math.sin(time * 5 + b.phase) * 22 * dt;  // 팔랑이는 지그재그
      b.y += b.vy * dt + Math.cos(time * 7 + b.phase) * 30 * dt;
    }
    this.render(b, b.vx);
  }

  render(b, vx) {
    const tilt = Math.max(-18, Math.min(18, vx * 0.25));
    b.el.style.transform = `translate(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px) rotate(${tilt.toFixed(1)}deg)`;
    b.el.style.zIndex = String(Math.round(b.y + 400));
  }
}
