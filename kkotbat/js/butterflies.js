// 꽃밭의 나비 — 꽃이 많아질수록 나비가 늘어남 (꽃 4송이마다 1마리, 최대 12마리)
// 나비는 꽃에서 꽃으로 팔랑팔랑 날아다니고, 꽃 위에서 잠깐 머물렀다가 다음 꽃으로 감.

const PER_FLOWERS = 4;
const MAX = 12;
// [테두리, 날개색, 안쪽 크림색]
const COLORS = [
  ['#4f4677', '#8fbaf5', '#fff6ea'], // 하늘
  ['#7a4560', '#f6a9c9', '#fff4f2'], // 분홍
  ['#57468a', '#b8a2f3', '#fbf6ff'], // 라일락
  ['#7c4f3d', '#ffbd92', '#fff8ee'], // 살구
  ['#3b6460', '#8fdac9', '#f3fff9'], // 민트
  ['#7a5f30', '#ffd677', '#fffaf0'], // 버터
];

// 왼쪽 날개 한 짝 (오른쪽은 좌우 반전)
function wing(id) {
  const fore = 'M-2 -3 C-10 -20 -26 -33 -40 -32 C-48 -31 -50 -22 -46 -12 C-42 -3 -30 1 -3 1 Z';
  const hind = 'M-2 1 C-14 0 -30 4 -34 12 C-37 18 -33 22 -31 25 C-29 30 -23 33 -19 31 C-15 34 -9 30 -7 25 C-4 19 -2 10 -2 1 Z';
  const veins = [[-4,-2,-38,-28],[-4,-2,-44,-18],[-4,-1,-42,-8],[-4,-2,-26,-29],[-3,3,-31,14],[-3,4,-26,27],[-3,4,-14,30]]
    .map(([x1,y1,x2,y2]) => `<path d="M${x1} ${y1} Q${(x1+x2)/2} ${(y1+y2)/2-3} ${x2} ${y2}"/>`).join('');
  const dots = [[-40,-27,2.2],[-44,-21,1.9],[-46,-15,1.6],[-45,-9,1.3],[-34,-31,1.5]]
    .map(([x,y,r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r*0.8}" fill="#fff" opacity=".9"/>`).join('');
  const spots = [[-31,18,1.6],[-28,25,1.5],[-22,29,1.3]].map(([x,y,r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#bk${id})"/>`).join('');
  return `<path d="${hind}" fill="url(#bh${id})" stroke="url(#be${id})" stroke-width="1.4"/>${spots}
    <path d="${fore}" fill="url(#bf${id})" stroke="url(#be${id})" stroke-width="1.4"/>
    <g stroke="#fff" stroke-opacity=".38" stroke-width=".55" fill="none">${veins}</g>${dots}`;
}

function butterflySVG([edge, mid, inner], id) {
  return `<svg viewBox="-50 -40 100 80" width="74" height="60" aria-hidden="true">
    <defs>
      <radialGradient id="bf${id}" gradientUnits="userSpaceOnUse" cx="-2" cy="-2" r="48"><stop offset="0" stop-color="${inner}"/><stop offset=".38" stop-color="${inner}"/><stop offset=".6" stop-color="${mid}"/><stop offset=".84" stop-color="${mid}"/><stop offset=".95" stop-color="${edge}"/><stop offset="1" stop-color="${edge}"/></radialGradient>
      <radialGradient id="bh${id}" gradientUnits="userSpaceOnUse" cx="-2" cy="0" r="40"><stop offset="0" stop-color="${inner}"/><stop offset=".35" stop-color="${inner}"/><stop offset=".62" stop-color="${mid}"/><stop offset=".84" stop-color="${mid}"/><stop offset=".97" stop-color="${edge}"/></radialGradient>
      <linearGradient id="be${id}" x1="0" x2="1"><stop offset="0" stop-color="${edge}"/><stop offset="1" stop-color="${edge}" stop-opacity=".6"/></linearGradient>
      <radialGradient id="bk${id}"><stop offset="0" stop-color="${edge}"/><stop offset="1" stop-color="${edge}" stop-opacity=".5"/></radialGradient>
      <linearGradient id="bb${id}" x1="0" x2="1"><stop offset="0" stop-color="#8a5a3c"/><stop offset=".5" stop-color="#b98560"/><stop offset="1" stop-color="#6e4329"/></linearGradient>
    </defs>
    <g class="wing wing-l">${wing(id)}</g>
    <g class="wing wing-r"><g transform="scale(-1 1)">${wing(id)}</g></g>
    <path d="M-1 -11 Q-6 -24 -11 -29 M1 -11 Q6 -24 11 -29" stroke="#6e4329" stroke-width="1" fill="none" stroke-linecap="round"/>
    <ellipse cx="-11.5" cy="-29.5" rx="1.9" ry="1.4" fill="#7a4a2e"/><ellipse cx="11.5" cy="-29.5" rx="1.9" ry="1.4" fill="#7a4a2e"/>
    <circle cx="0" cy="-10" r="2.6" fill="url(#bb${id})"/>
    <ellipse cx="0" cy="-3" rx="2.8" ry="5" fill="url(#bb${id})"/>
    <ellipse cx="0" cy="9" rx="2.1" ry="8" fill="url(#bb${id})"/>
    <path d="M-1.6 5 H1.6 M-1.8 8.5 H1.8 M-1.6 12 H1.6" stroke="#5b371f" stroke-opacity=".45" stroke-width=".5"/>
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
