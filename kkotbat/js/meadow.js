// 풀밭 배경을 캔버스에 그립니다.
// 하늘 → 먼 산(푸른 안개) → 언덕 4겹. 언덕마다 가늘고 끝이 뾰족한 풀잎을 수만 개씩 촘촘히 그려
// 실제 잔디처럼 보이게 하고, 능선 위로 풀잎이 삐죽 튀어나오게 합니다.
// 색은 첨부 식물 일러스트처럼 밝은 연두 → 진초록, 위쪽 능선은 햇빛을 받아 밝게.

function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgb = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
const nextFrame = () => new Promise((r) => requestAnimationFrame(r));

// 부드러운 능선: 사인파 3개 합성 → 어느 x에서든 높이를 바로 계산 가능
function makeRidge(r, base, amp, wavelength) {
  const waves = [
    { f: (Math.PI * 2) / wavelength, a: 0.62, p: r() * 10 },
    { f: (Math.PI * 2) / (wavelength * 0.47), a: 0.28, p: r() * 10 },
    { f: (Math.PI * 2) / (wavelength * 0.19), a: 0.1, p: r() * 10 },
  ];
  return (x) => {
    let s = 0;
    for (const w of waves) s += w.a * Math.sin(x * w.f + w.p);
    return base - amp * (0.5 + 0.5 * s);
  };
}

// 얼룩덜룩한 풀 색 변화를 위한 저주파 노이즈
function makeNoise(r) {
  const k = Array.from({ length: 4 }, () => ({ fx: 0.002 + r() * 0.006, fy: 0.003 + r() * 0.01, p: r() * 10, q: r() * 10 }));
  return (x, y) => {
    let s = 0;
    for (const w of k) s += Math.sin(x * w.fx + w.p) * Math.cos(y * w.fy + w.q);
    return s / 2; // 대략 -1 ~ 1
  };
}

const SKY_TOP = hex('#1f8fe6');
const SKY_HORIZON = hex('#c9ecfb');

const LAYERS = [
  // 뒤 언덕 → 앞 언덕. grow: 앞(아래)으로 올수록 풀잎이 커지는 정도, shade: 능선에서 그늘까지 거리
  { base: 30, amp: 130, wave: 1600, len: [8, 15], w: [3.4, 5.0], gap: [4.6, 3.0], light: '#a8ec3c', mid: '#6ccb1c', dark: '#3d9a14', haze: 0.06, daisies: 0.000012, grow: 0.4, shade: 380 },
  { base: 420, amp: 150, wave: 1300, len: [17, 30], w: [5.4, 8.2], gap: [6.0, 3.8], light: '#9fe830', mid: '#57bd15', dark: '#2a830d', haze: 0, daisies: 0.000022, grow: 0.85, shade: 900 },
];

function paintSky(ctx, W, horizon, r, scale) {
  // 레퍼런스(1번 이미지)에서 뽑은 색: 위는 진한 파랑, 지평선으로 갈수록 맑은 하늘색
  const top = horizon - 620;
  const g = ctx.createLinearGradient(0, Math.min(0, top), 0, horizon + 60);
  g.addColorStop(0, '#1c8ee6');
  g.addColorStop(0.22, '#2ea4ee');
  g.addColorStop(0.45, '#45b8f7');
  g.addColorStop(0.66, '#5fc7fe');
  g.addColorStop(0.82, '#94d8fd');
  g.addColorStop(1, '#d2ecfb');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, horizon + 400);

  // 가운데가 살짝 밝은 공기감
  const air = ctx.createRadialGradient(W * 0.5, horizon, 0, W * 0.5, horizon, W * 0.55);
  air.addColorStop(0, 'rgba(255,255,255,0.18)');
  air.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = air;
  ctx.fillRect(0, 0, W, horizon + 400);


  // 뭉게구름: 지평선(먼 산) 뒤에서 크게 솟아오름. 화면 양옆에 크게, 가운데는 하늘이 트이게
  const spots = [
    { x: 0.08, h: 300 }, { x: 0.29, h: 360 }, { x: 0.52, h: 170 },
    { x: 0.71, h: 380 }, { x: 0.92, h: 290 },
  ];
  for (const sp of spots) {
    const h = sp.h * (0.9 + r() * 0.2);
    paintCloud(ctx, W * sp.x + (r() - 0.5) * 120, horizon + 30, h, r, scale);
  }
}

// 레퍼런스(3D 렌더) 같은 뭉게구름
// ① 큰 덩어리 3~4개로 솟아오른 몸통 → ② 윗면 둘레에 작은 덩어리를 촘촘히 붙여 몽글몽글한 윤곽
// ③ 실루엣 안쪽에만 옅은 회청색 그늘 → ④ 전체를 살짝 흐리게(배경 심도) 해서 메인 캔버스에 얹음
function paintCloud(ctx, cx, baseY, height, r, scale) {
  const width = height * (1.5 + r() * 0.6);
  const ox = 0, oy = 0; // 구름 밑동 중앙 (로컬 좌표). 모양을 다 만든 뒤 크기에 맞는 캔버스를 만듦

  // ① 몸통
  const n = 3 + Math.floor(r() * 2);
  const peak = Math.floor(r() * n);
  const big = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5;
    const near = 1 - Math.abs(i - peak) / n;
    const R = height * (0.3 + near * 0.22 + r() * 0.05);
    big.push({ x: ox + t * (width - R * 1.4), y: oy - R * (0.75 + near * 0.35), R });
  }
  // 밑동을 넓게 채우는 받침
  const base = [];
  for (let x = ox - width / 2 + height * 0.2; x <= ox + width / 2 - height * 0.2; x += height * 0.18) {
    base.push({ x, y: oy - height * 0.12, R: height * 0.22 });
  }
  // ② 윗면 둘레의 작은 덩어리
  const bumps = [];
  for (const b of big) {
    // 큼직한 굴곡 2~3개만 (자잘한 돌기 없이 굵직하게)
    const k = 2 + Math.floor(r() * 2);
    for (let j = 0; j < k; j++) {
      const a = Math.PI * (1.2 + ((j + 0.5) / k) * 0.6) + (r() - 0.5) * 0.15;
      const rr = b.R * (0.38 + r() * 0.1);
      bumps.push({ x: b.x + Math.cos(a) * b.R * 0.68, y: b.y + Math.sin(a) * b.R * 0.68, R: rr });
    }
  }
  const all = [...base, ...big, ...bumps];

  // 모양 전체를 감싸는 크기 + 흐림 여백
  const blurPx = Math.max(2, Math.round(3.2 * scale));
  const pad = blurPx * 4 / scale + 6;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const l of all) {
    minX = Math.min(minX, l.x - l.R); maxX = Math.max(maxX, l.x + l.R);
    minY = Math.min(minY, l.y - l.R); maxY = Math.max(maxY, l.y + l.R);
  }
  const cw = Math.ceil(maxX - minX + pad * 2), ch = Math.ceil(maxY - minY + pad * 2);
  const off = document.createElement('canvas');
  off.width = Math.ceil(cw * scale); off.height = Math.ceil(ch * scale);
  const c = off.getContext('2d');
  c.scale(scale, scale);
  c.translate(pad - minX, pad - minY);

  c.fillStyle = '#ffffff';
  c.beginPath();
  for (const l of all) { c.moveTo(l.x + l.R, l.y); c.arc(l.x, l.y, l.R, 0, Math.PI * 2); }
  c.fill();

  // ③ 그늘 (source-atop: 실루엣 안쪽에만)
  c.globalCompositeOperation = 'source-atop';
  const v = c.createLinearGradient(0, minY, 0, oy);
  v.addColorStop(0, 'rgba(206,224,244,0)');
  v.addColorStop(0.45, 'rgba(206,224,244,0.15)');
  v.addColorStop(1, 'rgba(184,206,232,0.75)');
  c.fillStyle = v;
  c.fillRect(minX - pad, minY - pad, cw, ch);
  const blob = (x, y, R, rgba) => {
    const g = c.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, rgba);
    g.addColorStop(1, rgba.replace(/[\d.]+\)$/, '0)'));
    c.fillStyle = g;
    c.fillRect(x - R, y - R, R * 2, R * 2);
  };
  for (const b of big) blob(b.x + b.R * 0.35, b.y + b.R * 0.5, b.R * 0.95, 'rgba(170,196,226,0.28)');
  for (const b of bumps) blob(b.x + b.R * 0.25, b.y + b.R * 0.55, b.R * 0.9, 'rgba(176,200,228,0.2)');
  for (const b of big) blob(b.x - b.R * 0.3, b.y - b.R * 0.4, b.R * 0.8, 'rgba(255,255,255,0.85)');
  for (const b of bumps) blob(b.x - b.R * 0.2, b.y - b.R * 0.3, b.R * 0.7, 'rgba(255,255,255,0.7)');
  c.globalCompositeOperation = 'source-over';

  // ④ 살짝 흐리게
  blurCanvas(off, blurPx);
  ctx.drawImage(off, cx + minX - pad, baseY + minY - pad, cw, ch);
}

// 캔버스를 부드럽게 흐림 (박스 블러 3회 ≈ 가우시안, 투명 가장자리가 검게 번지지 않도록 프리멀티플라이 처리)
function blurCanvas(canvas, radius) {
  const c = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const img = c.getImageData(0, 0, w, h);
  const d = img.data;
  const px = w * h;
  const buf = new Float32Array(px * 4);
  for (let i = 0; i < px; i++) {
    const a = d[i * 4 + 3] / 255;
    buf[i * 4] = d[i * 4] * a; buf[i * 4 + 1] = d[i * 4 + 1] * a; buf[i * 4 + 2] = d[i * 4 + 2] * a; buf[i * 4 + 3] = d[i * 4 + 3];
  }
  const tmp = new Float32Array(px * 4);
  const pass = (src, dst, len, lines, stride, lineStride) => {
    const win = radius * 2 + 1;
    for (let l = 0; l < lines; l++) {
      const o = l * lineStride;
      for (let ch = 0; ch < 4; ch++) {
        let sum = 0;
        for (let k = -radius; k <= radius; k++) {
          const idx = Math.min(len - 1, Math.max(0, k));
          sum += src[(o + idx * stride) * 4 + ch];
        }
        for (let i = 0; i < len; i++) {
          dst[(o + i * stride) * 4 + ch] = sum / win;
          const add = Math.min(len - 1, i + radius + 1), rem = Math.max(0, i - radius);
          sum += src[(o + add * stride) * 4 + ch] - src[(o + rem * stride) * 4 + ch];
        }
      }
    }
  };
  for (let it = 0; it < 3; it++) {
    pass(buf, tmp, w, h, 1, w);   // 가로
    pass(tmp, buf, h, w, w, 1);   // 세로
  }
  for (let i = 0; i < px; i++) {
    const a = buf[i * 4 + 3];
    const k = a > 0 ? 255 / a : 0;
    d[i * 4] = buf[i * 4] * k; d[i * 4 + 1] = buf[i * 4 + 1] * k; d[i * 4 + 2] = buf[i * 4 + 2] * k; d[i * 4 + 3] = a;
  }
  c.putImageData(img, 0, 0);
}

function paintFarHills(ctx, W, horizon, r) {
  const ridge = makeRidge(r, horizon + 10, 150, 2600);
  const g = ctx.createLinearGradient(0, horizon - 150, 0, horizon + 60);
  g.addColorStop(0, '#3fa88a');
  g.addColorStop(1, '#7fd0a6');
  ctx.save();
  if ('filter' in ctx) ctx.filter = 'blur(2px)';
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-20, horizon + 300);
  for (let x = -20; x <= W + 20; x += 16) ctx.lineTo(x, ridge(x));
  ctx.lineTo(W + 20, horizon + 300);
  ctx.fill();
  ctx.restore();
}

function palette(layer, steps = 22) {
  const L = hex(layer.light), M = hex(layer.mid), D = hex(layer.dark);
  const out = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1); // 0 어두움 → 1 밝음
    let c = t < 0.5 ? mix(D, M, t * 2) : mix(M, L, (t - 0.5) * 2);
    c = mix(c, SKY_HORIZON, layer.haze);
    out.push(rgb(c));
  }
  return out;
}

function bladePath(path, x, y, a, len, w, bend) {
  const tx = x + Math.sin(a) * len, ty = y - Math.cos(a) * len;
  const cx = x + Math.sin(a + bend) * len * 0.5, cy = y - Math.cos(a + bend) * len * 0.55;
  path.moveTo(x - w * 0.5, y);
  path.quadraticCurveTo(cx - w * 0.25, cy, tx, ty);
  path.quadraticCurveTo(cx + w * 0.25, cy, x + w * 0.5, y);
  path.closePath();
}

function paintDaisy(ctx, x, y, size, r) {
  const petals = 7 + Math.floor(r() * 3);
  const rot = r() * Math.PI;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.62 + r() * 0.2); // 살짝 눕혀 원근감
  ctx.fillStyle = 'rgba(30,70,15,0.25)';
  ctx.beginPath(); ctx.ellipse(0, size * 0.5, size * 1.1, size * 0.5, 0, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < petals; i++) {
    const a = rot + (i / petals) * Math.PI * 2;
    ctx.fillStyle = i % 2 ? '#ffffff' : '#f3f6ef';
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * size * 0.55, Math.sin(a) * size * 0.55, size * 0.55, size * 0.24, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#f5c63a';
  ctx.beginPath(); ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath(); ctx.arc(-size * 0.08, -size * 0.1, size * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

async function paintLayer(ctx, W, H, layer, ridge, nextRidge, r, noise, budget) {
  const colors = palette(layer);
  const steps = colors.length;

  // 바탕 채우기 (풀잎 사이로 보이는 흙·그늘색)
  let minY = Infinity;
  for (let x = 0; x <= W; x += 20) minY = Math.min(minY, ridge(x));
  // 바탕은 풀잎 평균색에 가깝게: 풀잎 사이로 비쳐도 구멍처럼 보이지 않도록
  const base = ctx.createLinearGradient(0, minY, 0, minY + (layer.shade || 360));
  base.addColorStop(0, colors[Math.round(steps * 0.72)]);
  base.addColorStop(1, colors[Math.round(steps * 0.4)]);
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.moveTo(-20, H);
  for (let x = -20; x <= W + 20; x += 12) ctx.lineTo(x, ridge(x) + 3);
  ctx.lineTo(W + 20, H);
  ctx.fill();

  // 풀잎: 위에서 아래로 줄 단위로 그려 가까운(아래) 풀잎이 위를 덮게
  const [gx, gy] = layer.gap;
  const wind = -0.14;
  let started = performance.now();
  const grow = (y) => 1 + (layer.grow || 0) * clamp01((y - minY) / 1000);
  for (let y = minY; y < H + layer.len[1]; y += gy * grow(y)) {
    const buckets = Array.from({ length: steps }, () => new Path2D());
    let any = false;
    const g = grow(y);
    for (let x = -10 + r() * gx; x < W + 10; x += gx * g * (0.6 + r() * 0.8)) {
      const top = ridge(x);
      const yy = y + (r() - 0.5) * gy;
      if (yy < top) continue;
      const bottom = nextRidge ? nextRidge(x) + 40 : H + layer.len[1];
      if (yy > bottom) continue;
      const depth = clamp01((yy - top) / (layer.shade || 360)); // 0 = 능선(햇빛), 1 = 아래쪽(그늘)
      let v = 0.94 - depth * 0.5 + noise(x, yy) * 0.16 + (r() - 0.5) * 0.16 + (x / W) * 0.05;
      if (yy - top < 14) v += 0.14; // 능선 테두리 하이라이트
      const idx = Math.max(0, Math.min(steps - 1, Math.round(clamp01(v) * (steps - 1))));
      const len = lerp(layer.len[0], layer.len[1], r()) * g * (0.9 + r() * 0.2);
      const w = lerp(layer.w[0], layer.w[1], r()) * g;
      const a = wind + (r() - 0.5) * 0.7;
      const bend = (r() - 0.5) * 0.9;
      bladePath(buckets[idx], x, yy, a, len, w, bend);
      any = true;
    }
    if (any) for (let i = 0; i < steps; i++) { ctx.fillStyle = colors[i]; ctx.fill(buckets[i]); }

    if (performance.now() - started > budget) { await nextFrame(); started = performance.now(); }
  }

  // 데이지
  if (layer.daisies) {
    const area = W * (layer === LAYERS[LAYERS.length - 1] ? H - minY : 300);
    const count = Math.round(area * layer.daisies);
    const size = layer.len[1] * 0.2;
    for (let i = 0; i < count; i++) {
      const x = r() * W;
      const top = ridge(x);
      const bottom = nextRidge ? nextRidge(x) - 10 : H;
      if (bottom <= top + 20) continue;
      const y = top + 20 + r() * (bottom - top - 20);
      paintDaisy(ctx, x, y, size * (0.8 + r() * 0.5), r);
    }
  }
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{width:number,height:number,horizon:number,seed?:number}} opts
 */
// 맨 뒤 풀밭 능선의 높이(월드 y) — 꽃을 심을 수 있는 가장 위쪽 선. paintMeadow가 채움
export let grassTop = null;

export async function paintMeadow(canvas, { width: W, height: H, horizon, seed = 21 }) {
  const dpr = window.devicePixelRatio || 1;
  const scale = Math.min(dpr, Math.sqrt(12e6 / (W * H)), 2);
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  const r = rng(seed);
  const noise = makeNoise(r);
  paintSky(ctx, W, horizon, r, scale);
  paintFarHills(ctx, W, horizon, r);

  const ridges = LAYERS.map((l) => makeRidge(r, horizon + l.base, l.amp, l.wave));
  grassTop = ridges[0];
  for (let i = 0; i < LAYERS.length; i++) {
    await paintLayer(ctx, W, H, LAYERS[i], ridges[i], ridges[i + 1], r, noise, 12);
  }

  // 위쪽에서 비치는 부드러운 햇빛 (일러스트의 광택감)
  const glow = ctx.createRadialGradient(W * 0.72, horizon - 100, 0, W * 0.72, horizon - 100, W * 0.6);
  glow.addColorStop(0, 'rgba(255,250,215,0.15)');
  glow.addColorStop(1, 'rgba(255,250,215,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
}
