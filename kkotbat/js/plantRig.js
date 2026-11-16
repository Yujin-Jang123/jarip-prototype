// 04 성장 미션의 식물 — 첨부 일러스트(iewn 앱 식물 스타일) 이미지를 조합해서 그림.
//
// 미션 풀(12개)에서 화면에 8개가 떠다니고 계속 바뀜. 고른 미션 4개의 순서가 꽃을 정함.
// 미션마다 부위별 값은 (미션 번호 % 6)로 정해짐 → 6×6×6×6 = 1,296가지 조합
//   0단계: 03에서 고른 새싹
//   1번째 → 살짝 자란 세 잎 새싹 (키·굵기. 이후 단계에도 이어짐)
//   2번째 → 잎이 늘어난 어린 식물 (잎 개수·형태)
//   3번째 → 줄기 끝에 흰 꽃이 핌 (백합 · 작약 · 하늘빛 꽃 · 수국 중 하나, 한 송이)
//   4번째 → 꽃에 색이 생김 (꽃잎을 실제로 다시 칠함. 노란 수술은 그대로)

const P = 'assets/plants/';

export const MISSIONS = [
  '혼자 여행 계획 짜기',
  '오늘 사용한 그릇 설거지하기',
  '오늘의 할 일 적어보기',
  '나를 위한 한 끼 차려 먹기',
  '이번 주 지출 정리해보기',
  '나에게 응원 한마디 쓰기',
  '내 방 한 구석 정리하기',
  '혼자 동네 산책 30분 하기',
  '미뤄둔 연락 하나 답하기',
  '내일 입을 옷 미리 골라두기',
  '혼자 카페에서 책 읽기',
  '오늘 고마웠던 일 세 가지 적기',
];

export const SLOTS = [
  { label: '줄기', obj: '줄기 높이·굵기를' },
  { label: '잎', obj: '잎 모양을' },
  { label: '꽃', obj: '꽃 모양을' },
  { label: '꽃 색', obj: '꽃 색을' },
];

// r = 높이/너비, x = 줄기 밑동 가로 위치, tipX/tipY = 꽃이 달릴 줄기 끝(너비·높이 대비, tipY는 아래에서)
const IMG = {
  'sprout-round':      { r: 368 / 480, x: 0.465 },
  'sprout-pointed-a':  { r: 335 / 480, x: 0.464 },
  'sprout-pointed-b':  { r: 357 / 480, x: 0.458 },
  'sprout-three':      { r: 0.8635, x: 0.48 },
  'plant-young':       { r: 1.0569, x: 0.514, tipX: 0.535, tipY: 0.9 },
  'plant-bushy-a':     { r: 480 / 465, x: 0.495, tipX: 0.5, tipY: 0.86, pad: 0.067 },
  'plant-bushy-b':     { r: 480 / 380, x: 0.484, tipX: 0.52, tipY: 0.92 },
  'flower-head-blue':  { r: 288 / 399 },
  'flower-head-lily':  { r: 0.8935 },
  'flower-head-peony': { r: 0.7786 },
  'flower-head-bell':  { r: 0.7595 },
};

// [너비, 가로 배율, 세로 배율] — 늘리지 않고 크기·굵기만 살짝 다르게
const SPROUT = [[170, 1.0, 1.0], [162, 0.97, 1.04], [180, 1.05, 0.97], [172, 0.98, 1.02], [184, 1.06, 1.0], [158, 1.0, 0.98]];
const LEAF = [
  { img: 'plant-young', w: 200 },
  { img: 'plant-young', w: 206, flip: true },
  { img: 'plant-young', w: 192, sx: 1.05, filter: 'hue-rotate(-8deg) saturate(1.15)' },
  { img: 'plant-bushy-b', w: 168 },
  { img: 'plant-bushy-a', w: 196, flip: true },
  { img: 'plant-young', w: 196, sx: 0.96, filter: 'hue-rotate(10deg) brightness(1.05)' },
];
// [이미지, 너비(식물 너비 대비), 줄기 끝에서 가로 오프셋, 세로 오프셋(꽃 높이 대비)]
const BLOOM = [
  [['flower-head-lily', 0.74, 0, 0]],
  [['flower-head-peony', 0.84, 0, 0]],
  [['flower-head-bell', 0.84, 0, 0]],
  [['flower-head-blue', 0.86, 0, 0]],
];
// 꽃 색: 산뜻하고 따뜻한 6색 [r, g, b]
// 꽃 색: 꽃 가운데(inner) → 꽃잎 끝(outer)으로 번지는 그라디언트 6가지
export const PALETTE = [
  { name: '선셋', inner: [255, 214, 120], outer: [255, 72, 112] },
  { name: '피치', inner: [255, 240, 200], outer: [255, 120, 60] },
  { name: '레몬', inner: [255, 252, 210], outer: [255, 176, 0] },
  { name: '라벤더', inner: [255, 214, 240], outer: [128, 84, 255] },
  { name: '체리블라썸', inner: [255, 240, 246], outer: [255, 40, 140] },
  { name: '오션', inner: [190, 255, 240], outer: [40, 110, 255] },
];

const pick = (arr, missionIndex) => arr[missionIndex % arr.length];

/* ───────── 꽃잎 다시 칠하기 ───────── */
const imgCache = {};
const tintCache = {};
function loadImg(src) {
  return (imgCache[src] ||= new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.src = src; }));
}
// 밝기는 그대로 두고 색만 바꿈. 노란 수술·초록 부분은 원래 색 유지
const hsl = (r, g, b) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = d / (1 - Math.abs(2 * l - 1));
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [((h * 60 + 360) % 360) / 360, s, l];
};
const fromHsl = (H, S, l) => {
  const q = l < 0.5 ? l * (1 + S) : l + S - l * S, p2 = 2 * l - q;
  const ch = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p2 + (q - p2) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p2 + (q - p2) * (2 / 3 - t) * 6 : p2; };
  return [ch(H + 1 / 3) * 255, ch(H) * 255, ch(H - 1 / 3) * 255];
};
const isKeep = (r, g, b) => { // 노란 수술·초록은 원래 색 유지
  const [h, s] = hsl(r, g, b);
  const mx = Math.max(r, g, b), sv = mx ? (mx - Math.min(r, g, b)) / mx : 0;
  return h * 360 > 32 && h * 360 < 175 && sv > 0.35 && s > 0;
};

// 꽃잎을 다시 칠함. 'white'면 흰 꽃(3단계), 숫자면 가운데→끝 그라디언트 색(4단계)
export function tinted(key, colorIndex) {
  const id = `${key}:${colorIndex}`;
  return (tintCache[id] ||= loadImg(P + key + '.webp').then((im) => {
    const c = document.createElement('canvas');
    const W = (c.width = im.naturalWidth), Hh = (c.height = im.naturalHeight);
    const x = c.getContext('2d');
    x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, W, Hh), px = d.data;
    const white = colorIndex === 'white';

    // 꽃 가운데: 노란 수술이 모인 곳 (없으면 이미지 가운데 조금 위)
    let sx = 0, sy = 0, n = 0;
    for (let y = 0; y < Hh; y += 2) for (let xx = 0; xx < W; xx += 2) {
      const i = (y * W + xx) * 4;
      if (px[i + 3] > 128 && isKeep(px[i] / 255, px[i + 1] / 255, px[i + 2] / 255) && px[i] > px[i + 2] * 1.4) { sx += xx; sy += y; n++; }
    }
    const cx = n > 20 ? sx / n : W / 2, cy = n > 20 ? sy / n : Hh * 0.45;
    const R = Math.max(cx, W - cx, cy, Hh - cy) * 0.95;

    const pal = white ? null : PALETTE[colorIndex];
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 8) continue;
      const r = px[i] / 255, g = px[i + 1] / 255, b = px[i + 2] / 255;
      if (isKeep(r, g, b)) continue;
      const L = hsl(r, g, b)[2];
      let out;
      if (white) {
        out = fromHsl(0.08, 0.35, 0.8 + L * 0.2);
      } else {
        const p = i / 4, t = Math.min(1, Math.hypot((p % W) - cx, Math.floor(p / W) - cy) / R);
        const e = t * t * (3 - 2 * t); // 부드럽게 번짐
        const tr = (pal.inner[0] + (pal.outer[0] - pal.inner[0]) * e) / 255;
        const tg = (pal.inner[1] + (pal.outer[1] - pal.inner[1]) * e) / 255;
        const tb = (pal.inner[2] + (pal.outer[2] - pal.inner[2]) * e) / 255;
        const [H, S, tl] = hsl(tr, tg, tb);
        // 밝기는 원래 그림의 광택·그림자를 살리면서 목표 색의 밝기를 섞음
        const l = Math.min(0.96, 0.12 + L * 0.5 + tl * 0.32);
        out = fromHsl(H, Math.min(1, S * 1.05), l);
      }
      px[i] = out[0]; px[i + 1] = out[1]; px[i + 2] = out[2];
    }
    x.putImageData(d, 0, 0);
    return c.toDataURL('image/png');
  }));
}

/* ───────── 그리기 ───────── */
// 식물 이미지를 미리 불러둠 → 미션을 누르는 즉시 바뀜
Object.keys(IMG).forEach((k) => loadImg(P + k + '.webp').then((im) => im.decode?.()).catch(() => {}));
const SMOOTH = 'cubic-bezier(.25,.8,.3,1)';
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * @param {HTMLElement} rig  식물 상자 (가로 가운데·바닥 기준점)
 * @param {number[]} seq      고른 미션 번호 순서
 * @param {string} sproutSrc  03에서 고른 새싹 이미지 경로
 * @param {number} size       원 안쪽 크기(px)
 * @param {number} changed    이번에 바뀐 단계 0~3 (없으면 -1: 애니메이션 없음)
 */
export async function renderRig(rig, seq, sproutSrc, size, changed = -1) {
  const stage = seq.length;
  const u = size / 400;
  if (!rig.querySelector('.rig-bodies')) rig.innerHTML = '<div class="rig-bodies"></div><div class="rig-heads"></div>';
  const bodies = rig.querySelector('.rig-bodies');
  const headsBox = rig.querySelector('.rig-heads');
  const animate = changed >= 0 && !reduced();

  const [sw, sx1, sy1] = stage >= 1 ? pick(SPROUT, seq[0]) : [150, 1, 1];
  const grow = stage >= 1 ? sw / 170 : 1;
  let part;
  if (stage === 0) part = { img: sproutSrc.split('/').pop().replace('.webp', ''), w: 150 };
  else if (stage === 1) part = { img: 'sprout-three', w: sw };
  else { const L = pick(LEAF, seq[1]); part = { ...L, w: L.w * grow }; }
  const info = IMG[part.img];
  const sx = (part.sx || 1) * sx1, sy = sy1;
  const bw = part.w, bh = bw * info.r * sy;

  const bloom = stage >= 3 ? pick(BLOOM, seq[2]) : [];
  const anchor = part.flip ? 1 - info.x : info.x;
  const tipX = ((part.flip ? 1 - (info.tipX ?? 0.5) : (info.tipX ?? 0.5)) - anchor) * bw * sx;
  const tipY = bh * (info.tipY ?? 0.9);
  const heads = bloom.map(([img, wr, ox, dy]) => {
    const hw = bw * wr, hh = hw * IMG[img].r;
    return { img, hw, hh, x: tipX + ox * bw - hw / 2, y: tipY - hh * 0.32 + hh * dy };
  });
  const total = Math.max(bh, ...heads.map((h) => h.y + h.hh));
  const k = u * Math.min(1, 300 / total);

  // 새 모습에 필요한 이미지를 먼저 모두 준비 → 준비가 끝난 순간 몸체·꽃·통통 모션·빛이 한꺼번에 시작
  const color = stage >= 4 ? seq[3] % PALETTE.length : 'white';
  if (stage >= 2) prewarm();
  const [, srcs] = await Promise.all([
    loadImg(P + part.img + '.webp'),
    Promise.all(heads.map((h) => tinted(h.img, color))),
  ]);
  if (animate) rig.dispatchEvent(new CustomEvent('rig:change')); // 빛 효과 시작 신호

  // 몸체: 이미지가 바뀌면 이전 모습에서 새 모습으로 부드럽게 겹쳐 바뀜 (crossfade + 크기 이어짐)
  const key = `${part.img}|${part.flip ? 1 : 0}|${part.filter || ''}`;
  const style = (el) => {
    el.style.width = `${bw * k}px`;
    el.style.marginLeft = `${-bw * anchor * k}px`;
    el.style.bottom = `${-(info.pad || 0) * bh * k}px`;
    el.style.transformOrigin = `${anchor * 100}% 100%`;
    el.style.transform = `scale(${(part.flip ? -1 : 1) * sx}, ${sy})`;
    el.style.filter = part.filter ? `${part.filter} drop-shadow(0 10px 10px rgba(30, 80, 10, 0.22))` : '';
  };
  const current = bodies.lastElementChild;
  if (current && current.dataset.key === key) {
    style(current);
  } else {
    const img = document.createElement('img');
    img.className = 'rig-body'; img.alt = ''; img.dataset.key = key;
    img.src = P + part.img + '.webp';
    style(img);
    bodies.appendChild(img);
    if (animate && current) {
      const ratio = (current.getBoundingClientRect().height || 1) / (img.getBoundingClientRect().height || 1);
      const base = img.style.transform;
      // 새 모습이 이전 크기에서 이어져 나타남 (튀는 동작은 아래에서 식물 전체에 줌)
      img.animate([
        { opacity: 0, transform: `${base} scale(${Math.min(1, ratio).toFixed(3)})` },
        { opacity: 1, transform: `${base} scale(1)` },
      ], { duration: 300, easing: 'ease-out' });
      current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease-in', fill: 'forwards' })
        .finished.then(() => current.remove());
    } else if (current) current.remove();
  }

  // 모든 단계 변화에 같은 동작: 아래로 살짝 눌렸다가 위로 통 튀어 오름
  if (animate) squashPop(rig);

  const html = heads.map((h, i) => `<div class="head" style="width:${h.hw * k}px;height:${h.hh * k}px;margin-left:${h.x * k}px;bottom:${h.y * k}px"><img src="${srcs[i]}" alt=""></div>`).join('');
  const old = [...headsBox.children];
  headsBox.insertAdjacentHTML('beforeend', html);
  const fresh = [...headsBox.children].slice(old.length);
  if (animate && changed === 2) {
    // 줄기 끝 봉오리에서 피어남
    fresh.forEach((el, i) => el.animate([
      { opacity: 0, transform: 'translateY(16%) scale(0.15) rotate(-14deg)' },
      { opacity: 1, offset: 0.4 },
      { opacity: 1, transform: 'translateY(0) scale(1) rotate(0)' },
    ], { duration: 560, delay: i * 90, easing: SMOOTH, fill: 'backwards' }));
  } else if (animate && changed === 3) {
    // 흰 꽃에 색이 번지며 통 튐
    fresh.forEach((el) => el.animate([
      { opacity: 0, transform: 'scale(0.92)' },
      { opacity: 1, transform: 'scale(1.06)', offset: 0.6 },
      { opacity: 1, transform: 'scale(1)' },
    ], { duration: 420, easing: 'ease-out', fill: 'backwards' }));
  }
  if (animate && old.length) {
    old.forEach((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: 'ease-out', fill: 'forwards' }).finished.then(() => el.remove()));
  } else old.forEach((el) => el.remove());
}

export function squashPop(el, delay = 0) {
  el.style.transformOrigin = '0 0'; // 식물 상자는 크기 0인 밑동 점 → 밑동 기준으로 늘었다 줄었다
  return el.animate([
    { transform: 'scale(1.04, 0.86)' },
    { transform: 'scale(0.96, 1.1)', offset: 0.45 },
    { transform: 'scale(1.02, 0.97)', offset: 0.75 },
    { transform: 'scale(1, 1)' },
  ], { duration: 480, delay, easing: 'ease-out' });
}

let warmed = false;
function prewarm() {
  if (warmed) return;
  warmed = true;
  const keys = [...new Set(BLOOM.flat().map(([img]) => img))];
  keys.forEach((key) => { tinted(key, 'white'); PALETTE.forEach((_, c) => tinted(key, c)); });
}
