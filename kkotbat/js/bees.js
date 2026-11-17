// 꽃밭의 꿀벌 — 처음엔 없고, 첫 꽃이 피면 1마리. 이후 꽃 8송이마다 1마리씩 (최대 3마리)
// 날개를 빠르게 붕붕 떨며 꽃(없으면 풀밭 여기저기)을 옮겨 다니고, 꽃 위에서 잠깐 맴돎.

const PER_FLOWERS = 8;
const MAX = 3;

// 일러스트 꿀벌: 뒷날개 · 몸통 · 앞날개 세 장을 겹쳐서 날개만 붕붕 떨게 함
function beeSVG() {
  const A = 'assets/bee-';
  return `<div class="bee-art" aria-hidden="true">
    <img class="bee-wing bee-wing-back" src="${A}wingBack.webp?v=1117i" alt="" draggable="false">
    <img class="bee-body" src="${A}body.webp?v=1117i" alt="" draggable="false">
    <img class="bee-wing bee-wing-front" src="${A}wingFront.webp?v=1117i" alt="" draggable="false">
  </div>`;
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
    const want = Math.min(MAX, Math.ceil(count / PER_FLOWERS));
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
    el.innerHTML = beeSVG();
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
