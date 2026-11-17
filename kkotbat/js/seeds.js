// 화면을 떠다니는 씨앗(새싹 방울).
// 각 씨앗은 천천히 방향을 바꾸며 떠다니고, 화면 가장자리에 가까워지면 안쪽으로 돌아옵니다.
// 마우스를 올리면 멈추고, 누르면 터지면서 onPick이 호출됩니다. 터진 자리는 잠시 뒤 새 씨앗이 가장자리에서 들어와 채웁니다.

const SPROUTS = [
  'assets/plants/sprout-round.webp',
  'assets/plants/sprout-pointed-a.webp',
  'assets/plants/sprout-pointed-b.webp',
];

const TAU = Math.PI * 2;
const lerpAngle = (a, b, t) => {
  let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return a + d * t;
};

export class SeedField {
  constructor(layer, { getBounds, onPick, reducedMotion = false }) {
    this.layer = layer;
    this.getBounds = getBounds;
    this.onPick = onPick;
    this.reducedMotion = reducedMotion;
    this.seeds = [];
    this.imageIndex = Math.floor(Math.random() * SPROUTS.length);
    this.last = 0;
    this.frame = this.frame.bind(this);
  }

  desiredCount() {
    const b = this.getBounds();
    const area = (b.right - b.left) * (b.bottom - b.top);
    return Math.max(4, Math.min(7, Math.round(area / 220000) + 1));
  }

  baseSize() {
    const b = this.getBounds();
    return Math.max(64, Math.min(108, (b.right - b.left) / 15));
  }

  start() {
    const n = this.desiredCount();
    for (let i = 0; i < n; i++) this.spawn(false);
    document.addEventListener('visibilitychange', () => { this.last = 0; });
    requestAnimationFrame(this.frame);
  }

  // 화면 크기가 바뀌면 씨앗 수를 맞춤
  resize() {
    const want = this.desiredCount();
    const alive = this.seeds.filter((s) => s.state === 'float');
    if (alive.length < want) for (let i = alive.length; i < want; i++) this.spawn(true);
    if (alive.length > want) alive.slice(want).forEach((s) => this.remove(s));
  }

  spawn(fromEdge) {
    const b = this.getBounds();
    const size = Math.round(this.baseSize() * (0.78 + Math.random() * 0.45));
    const r = size / 2;
    let x, y, heading;

    if (fromEdge) {
      const side = Math.floor(Math.random() * 4);
      const w = b.right - b.left, h = b.bottom - b.top;
      if (side === 0) { x = b.left - r - 10; y = b.top + Math.random() * h; }
      else if (side === 1) { x = b.right + r + 10; y = b.top + Math.random() * h; }
      else if (side === 2) { x = b.left + Math.random() * w; y = b.top - r - 10; }
      else { x = b.left + Math.random() * w; y = b.bottom + r + 10; }
      heading = Math.atan2((b.top + b.bottom) / 2 - y, (b.left + b.right) / 2 - x);
    } else {
      // 겹치지 않는 자리 찾기
      for (let tries = 0; tries < 40; tries++) {
        x = b.left + r + Math.random() * Math.max(1, b.right - b.left - size);
        y = b.top + r + Math.random() * Math.max(1, b.bottom - b.top - size);
        if (this.seeds.every((o) => Math.hypot(o.x - x, o.y - y) > o.r + r + 40)) break;
      }
      heading = Math.random() * TAU;
    }

    const src = SPROUTS[this.imageIndex++ % SPROUTS.length];
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'seed';
    el.setAttribute('aria-label', '떠다니는 씨앗. 눌러서 내 씨앗 심기');
    el.style.setProperty('--s', `${size}px`);
    el.innerHTML = `<span class="seed-body" style="--bob:${(3.8 + Math.random() * 2.4).toFixed(2)}s;--bob-delay:${(-Math.random() * 4).toFixed(2)}s"><img src="${src}" alt=""></span>`;

    const seed = {
      el, src, x, y, r, heading,
      turn: 0,
      cruise: this.reducedMotion ? 0 : 16 + Math.random() * 18, // px/초
      speed: 0,
      hover: false,
      state: 'float',
    };
    seed.speed = seed.cruise;

    el.addEventListener('pointerenter', () => { seed.hover = true; });
    el.addEventListener('pointerleave', () => { seed.hover = false; });
    el.addEventListener('focus', () => { seed.hover = true; });
    el.addEventListener('blur', () => { seed.hover = false; });
    el.addEventListener('pointerdown', (e) => e.stopPropagation()); // 풀밭 드래그와 분리
    el.addEventListener('click', () => this.pick(seed));

    this.layer.appendChild(el);
    this.seeds.push(seed);
    this.render(seed);
    return seed;
  }

  pick(seed) {
    if (seed.state !== 'float') return;
    seed.state = 'popping';
    seed.el.classList.add('is-popping');
    this.onPick?.({ x: seed.x, y: seed.y, image: seed.src, size: seed.r * 2 });
    setTimeout(() => this.remove(seed), 600);
    setTimeout(() => this.spawn(true), 1800);
  }

  remove(seed) {
    seed.el.remove();
    this.seeds = this.seeds.filter((s) => s !== seed);
  }

  frame(t) {
    const dt = this.last ? Math.min(0.05, (t - this.last) / 1000) : 0;
    this.last = t;
    if (dt > 0) {
      const b = this.getBounds();
      for (const s of this.seeds) {
        if (s.state !== 'float') continue;
        this.update(s, dt, b);
        this.render(s);
      }
    }
    requestAnimationFrame(this.frame);
  }

  update(s, dt, b) {
    // 속도: 마우스를 올리면 멈춤
    const target = s.hover ? 0 : s.cruise;
    s.speed += (target - s.speed) * Math.min(1, dt * 3);

    // 방향: 천천히 무작위로 휘어짐
    s.turn += (Math.random() - 0.5) * 1.8 * dt;
    s.turn *= 0.985;
    s.heading += s.turn * dt;

    // 가장자리 근처에서는 화면 안쪽으로
    const m = s.r + 28;
    if (s.x < b.left + m || s.x > b.right - m || s.y < b.top + m || s.y > b.bottom - m) {
      const toCenter = Math.atan2((b.top + b.bottom) / 2 - s.y, (b.left + b.right) / 2 - s.x);
      s.heading = lerpAngle(s.heading, toCenter, Math.min(1, dt * 1.6));
    }

    let vx = Math.cos(s.heading) * s.speed;
    let vy = Math.sin(s.heading) * s.speed;

    // 서로 겹치지 않게 밀어냄
    for (const o of this.seeds) {
      if (o === s || o.state !== 'float') continue;
      const dx = s.x - o.x, dy = s.y - o.y;
      const d = Math.hypot(dx, dy) || 1;
      const min = s.r + o.r + 18;
      if (d < min) {
        const push = (min - d) * 2.2;
        vx += (dx / d) * push;
        vy += (dy / d) * push;
      }
    }

    s.x += vx * dt;
    s.y += vy * dt;
  }

  render(s) {
    s.el.style.transform = `translate3d(${(s.x - s.r).toFixed(1)}px, ${(s.y - s.r).toFixed(1)}px, 0)`;
  }
}
