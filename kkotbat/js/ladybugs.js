// 꽃밭의 무당벌레 — 꽃 5송이마다 1마리 (최대 3마리)
// 풀밭을 천천히 기어다니다가 꽃 밑동에서 잠깐 쉬었다가 다시 움직임.

const PER_FLOWERS = 5;
const MAX = 3;

export class Ladybugs {
  constructor({ layer, getFlowers, getArea, reducedMotion }) {
    this.layer = layer;
    this.getFlowers = getFlowers;
    this.getArea = getArea;
    this.reducedMotion = reducedMotion;
    this.list = [];
    this.last = 0;
    this.frame = this.frame.bind(this);
    requestAnimationFrame(this.frame);
  }

  update(count, at) {
    const want = Math.min(MAX, Math.floor(count / PER_FLOWERS));
    while (this.list.length < want) this.spawn(at);
  }

  randomPoint(from) {
    const flowers = this.getFlowers();
    if (flowers.length && Math.random() < 0.7) {
      const f = flowers[Math.floor(Math.random() * flowers.length)];
      return { x: f.x + (Math.random() - 0.5) * 70, y: f.y + 6 + Math.random() * 14 };
    }
    const a = this.getArea();
    // 너무 멀리 가지 않게 근처에서 다음 자리를 고름
    const base = from || { x: a.x0 + Math.random() * (a.x1 - a.x0), y: a.y0 + Math.random() * (a.y1 - a.y0) };
    return {
      x: Math.max(a.x0, Math.min(a.x1, base.x + (Math.random() - 0.5) * 360)),
      y: Math.max(a.y0, Math.min(a.y1, base.y + (Math.random() - 0.5) * 200)),
    };
  }

  spawn(at) {
    const el = document.createElement('div');
    el.className = 'ladybug';
    el.innerHTML = '<img src="assets/ladybug.webp" alt="" draggable="false">';
    this.layer.appendChild(el);
    const p = at ? { x: at.x + (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 30), y: at.y + 10 } : this.randomPoint();
    const b = { el, x: p.x, y: p.y, heading: Math.random() * 360, target: this.randomPoint(p), rest: 1 + Math.random() * 2, phase: Math.random() * 10 };
    this.list.push(b);
    this.render(b, 0);
  }

  frame(t) {
    const dt = this.last ? Math.min(0.05, (t - this.last) / 1000) : 0;
    this.last = t;
    if (dt && !this.reducedMotion) for (const b of this.list) this.step(b, dt, t / 1000);
    requestAnimationFrame(this.frame);
  }

  step(b, dt, time) {
    if (b.rest > 0) {
      b.rest -= dt;
      if (b.rest <= 0) b.target = this.randomPoint(b);
      this.render(b, 0);
      return;
    }
    const dx = b.target.x - b.x, dy = b.target.y - b.y;
    const d = Math.hypot(dx, dy);
    if (d < 6) { b.rest = 1.5 + Math.random() * 3.5; this.render(b, 0); return; }
    // 가려는 쪽으로 천천히 몸을 돌리며 기어감
    const want = Math.atan2(dy, dx) * 180 / Math.PI + 90;
    let diff = ((want - b.heading + 540) % 360) - 180;
    b.heading += Math.max(-120 * dt, Math.min(120 * dt, diff));
    const speed = Math.abs(diff) > 40 ? 6 : 26;
    const rad = (b.heading - 90) * Math.PI / 180;
    b.x += Math.cos(rad) * speed * dt;
    b.y += Math.sin(rad) * speed * dt;
    this.render(b, Math.sin(time * 18 + b.phase) * 3);
  }

  render(b, wobble) {
    b.el.style.transform = `translate(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px) scale(var(--zk, 1)) rotate(${(b.heading + wobble).toFixed(1)}deg)`;
    b.el.style.zIndex = String(Math.round(b.y + 380));
  }
}
