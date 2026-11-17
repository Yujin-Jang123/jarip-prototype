// 04 성장 미션
//
// 흐린 풀밭 위에 큰 원 안의 새싹이 있고, 미션 8개가 주변을 천천히 떠다닌다.
// 떠다니는 미션은 몇 초마다 하나씩 다른 미션(전체 12개 중)으로 바뀐다.
// 미션을 누르면 원 안으로 날아들어가고, 그 즉시 새싹이 변한다.
// 4개를 고르면 꽃이 피고 'kkotbat:bloomed' 이벤트로 05(개화)에 넘긴다.

import { MISSIONS, SLOTS, renderRig } from './plantRig.js';

const $ = (id) => document.getElementById(id);
const VISIBLE = 8;
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export class GrowScene {
  constructor({ reducedMotion, onBloom }) {
    this.reducedMotion = reducedMotion;
    this.onBloom = onBloom;
    this.root = $('grow');
    this.rig = $('plantRig');
    this.rig.addEventListener('rig:change', () => this.burst());
    this.layer = $('missions');
    this.slotsEl = $('growSlots');
    this.seq = [];
    this.busy = false;
    $('growReset').addEventListener('click', () => this.reset());
    window.addEventListener('resize', () => { if (this.open) { this.placeChips(); this.render(-1, true); } });
  }

  start(sprout) {
    this.sprout = sprout;
    this.seq = [];
    this.rig.innerHTML = '';
    this.open = true;
    document.body.classList.add('is-growing');
    this.root.hidden = false;
    this.render(-1);
    this.buildChips();
    requestAnimationFrame(() => {
      this.root.classList.add('is-open');
      this.placeChips();
    });
    setTimeout(() => this.layer.querySelector('.mission')?.focus({ preventScroll: true }), 500);
  }

  buildChips() {
    this.layer.innerHTML = '';
    const pool = shuffle(MISSIONS.map((_, i) => i)).slice(0, VISIBLE);
    this.chips = pool.map((m) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mission';
      b.style.setProperty('--dur', `${(5 + Math.random() * 3).toFixed(2)}s`);
      b.style.setProperty('--delay', `${(-Math.random() * 5).toFixed(2)}s`);
      this.setChip(b, m);
      b.addEventListener('click', () => this.pick(Number(b.dataset.m), b));
      this.layer.appendChild(b);
      return b;
    });
    this.startRotation();
  }

  setChip(b, m) { b.dataset.m = m; b.textContent = MISSIONS[m]; }

  // 몇 초마다 떠다니는 미션 하나가 사라지고 다른 미션이 나타남
  startRotation() {
    clearInterval(this.rotTimer);
    if (this.reducedMotion) return;
    this.rotTimer = setInterval(() => {
      if (!this.open || this.busy || this.seq.length >= 4) return;
      const live = this.chips.filter((c) => c.isConnected && !c.classList.contains('is-picked')
        && !c.matches(':hover') && document.activeElement !== c && !c.classList.contains('is-swapping'));
      if (!live.length) return;
      const shown = new Set(this.chips.filter((c) => c.isConnected).map((c) => Number(c.dataset.m)));
      const options = MISSIONS.map((_, i) => i).filter((i) => !shown.has(i) && !this.seq.includes(i));
      if (!options.length) return;
      const chip = live[Math.floor(Math.random() * live.length)];
      const next = options[Math.floor(Math.random() * options.length)];
      chip.classList.add('is-swapping');
      setTimeout(() => {
        this.setChip(chip, next);
        chip.classList.remove('is-swapping');
      }, 450);
    }, 2600);
  }

  // 원·제목·슬롯·버튼을 피해 남는 자리에 미션을 고르게 흩어 놓음
  placeChips() {
    const vw = this.root.clientWidth, vh = this.root.clientHeight;
    // 좁은 화면: 원 아래에 모아 두고 제자리에서 둥실 (겹침 방지)
    const dock = (on) => {
      this.root.classList.toggle('is-docked', on);
      if (on) this.chips.forEach((c) => { c.style.left = ''; c.style.top = ''; });
    };
    if (vw < 700) { dock(true); return; }
    dock(false);
    const box = (el, pad = 12) => {
      const r = el.getBoundingClientRect();
      return { l: r.left - pad, t: r.top - pad, r: r.right + pad, b: r.bottom + pad };
    };
    const blocks = [box($('growHead')), box($('growStageWrap'), 18), box(this.slotsEl), box($('growActions'))];
    const chips = this.chips.filter((c) => c.isConnected && !c.classList.contains('is-picked'));
    if (!chips.length) return;
    // 미션이 바뀌어도 겹치지 않게, 가장 긴 미션 너비로 자리를 잡음
    const probe = chips[0], keep = probe.textContent;
    probe.textContent = MISSIONS.reduce((a, b) => (b.length > a.length ? b : a));
    const cw = probe.offsetWidth, ch = probe.offsetHeight;
    probe.textContent = keep;
    const drift = 18;
    const stage = box($('growStageWrap'), 0);
    const sc = { x: (stage.l + stage.r) / 2, y: (stage.t + stage.b) / 2 };
    const sr = (stage.r - stage.l) / 2;
    // 미션은 화면 끝으로 가지 않게: 바깥 여백을 넉넉히 두고, 원 가까이에 모음
    const layout = (strict) => {
      const mx = strict ? Math.max(40, vw * 0.1) : 16, my = strict ? Math.max(30, vh * 0.07) : 16;
      const reach = strict ? sr + 90 + cw : Infinity; // 원 중심에서 가로로 이 이상 벗어나지 않음
      const cands = [];
      for (let y = my + drift; y + ch + drift + my <= vh; y += 14) {
        for (let x = mx + drift; x + cw + drift + mx <= vw; x += 14) {
          const r = { l: x - drift, t: y - drift, r: x + cw + drift, b: y + ch + drift };
          if (Math.abs(x + cw / 2 - sc.x) > reach) continue;
          if (!blocks.some((k) => r.l < k.r && r.r > k.l && r.t < k.b && r.b > k.t)) cands.push({ x, y });
        }
      }
      const chosen = [];
      for (let i = 0; i < chips.length; i++) {
        let best = null, bestScore = -Infinity;
        for (const c of cands) {
          const cx = c.x + cw / 2, cy = c.y + ch / 2;
          let d = chosen.length ? Infinity : 0;
          for (const o of chosen) d = Math.min(d, Math.hypot(cx - o.x - cw / 2, (cy - o.y - ch / 2) * 1.6));
          if (chosen.length && d < cw * 0.55 + 40) continue; // 서로 너무 붙지 않게
          // 서로 고르게 퍼지되, 원에서 멀어질수록 감점
          const score = Math.min(d, cw * 1.6) - Math.hypot(cx - sc.x, (cy - sc.y) * 1.2) * 0.55 + Math.random() * 6;
          if (score > bestScore) { bestScore = score; best = c; }
        }
        if (!best) return null;
        chosen.push(best);
        cands.splice(cands.indexOf(best), 1);
      }
      return chosen;
    };
    const chosen = layout(true) || layout(false);
    if (!chosen) { dock(true); return; } // 자리가 모자라면 모아 두기
    chips.forEach((c, i) => { c.style.left = `${chosen[i].x}px`; c.style.top = `${chosen[i].y}px`; });
  }

  async pick(i, chip) {
    if (this.busy || this.seq.length >= 4 || this.seq.includes(i)) return;
    this.busy = true;
    chip.classList.add('is-picked');
    chip.disabled = true;
    // 미션이 원 안으로 날아들어감
    if (!this.reducedMotion) {
      const a = chip.getBoundingClientRect();
      const s = $('growStage').getBoundingClientRect();
      const dx = s.left + s.width / 2 - (a.left + a.width / 2);
      const dy = s.top + s.height / 2 - (a.top + a.height / 2);
      const fly = chip.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.3)`, opacity: 0 },
      ], { duration: 460, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' });
      fly.finished.then(() => chip.remove());
      await new Promise((r) => setTimeout(r, 280)); // 미션이 원에 닿기 직전에 식물이 자라기 시작
    } else chip.remove();
    this.seq.push(i);
    this.render(this.seq.length - 1); // 식물이 바뀌는 순간 rig:change → 빛 효과가 같은 타이밍에 남
    this.busy = false;
    if (this.seq.length === 4) this.bloomed();
    else this.layer.querySelector('.mission:not(.is-picked)')?.focus({ preventScroll: true });
  }

  burst() {
    if (this.reducedMotion) return;
    const st = $('growStage');
    // 식물 주변이 환하게 빛났다가 사라짐
    const glow = document.createElement('span');
    glow.className = 'grow-glow';
    st.appendChild(glow);
    glow.animate([
      { opacity: 0, transform: 'translate(-50%, -50%) scale(0.6)' },
      { opacity: 1, transform: 'translate(-50%, -50%) scale(1)', offset: 0.18 },
      { opacity: 0, transform: 'translate(-50%, -50%) scale(1.25)' },
    ], { duration: 800, easing: 'ease-out', fill: 'forwards' }).finished.then(() => glow.remove());
    for (let k = 0; k < 10; k++) {
      const d = document.createElement('span');
      d.className = 'spark';
      st.appendChild(d);
      const a = Math.random() * Math.PI * 2, r = 70 + Math.random() * 70;
      d.animate([
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * r}px), calc(-50% + ${Math.sin(a) * r}px)) scale(0.2)`, opacity: 0 },
      ], { duration: 650, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' }).finished.then(() => d.remove());
    }
  }

  render(changed, layoutOnly = false) {
    const n = this.seq.length;
    const stageEl = $('growStage');
    renderRig(this.rig, this.seq, this.sprout.image, stageEl.clientWidth, changed);
    if (layoutOnly) return;
    const label = n >= 4 ? `${this.sprout.name}의 꽃` : `${this.sprout.name}의 새싹`;
    this.rig.setAttribute('aria-label', `${label}, ${n}단계`);
    $('growTag').textContent = label;
    if (n < 4) {
      $('growTitle').textContent = '떠다니는 미션 중 4개를 골라주세요';
      $('growHint').textContent = `${n + 1}번째로 고르는 미션이 ${SLOTS[n].obj} 정해요`;
    }
    this.slotsEl.innerHTML = SLOTS.map((s, k) => {
      const m = this.seq[k] != null ? MISSIONS[this.seq[k]] : null;
      const state = m ? 'is-filled' : k === n ? 'is-current' : '';
      return `<li class="slot ${state}">
        <span class="slot-label">${k + 1}번째 · ${s.label}</span>
        <span class="slot-value">${m || '—'}</span></li>`;
    }).join('');
    $('growReset').hidden = n === 0;
  }

  bloomed() {
    this.root.classList.add('is-bloomed');
    $('growTitle').textContent = `${this.sprout.name}의 꽃이 피었어요!`;
    $('growHint').textContent = '고른 순서대로 피어난, 세상에 하나뿐인 꽃이에요';
    $('growReset').hidden = true;
    setTimeout(() => this.finish(), this.reducedMotion ? 400 : 1700); // 꽃 피는 모습을 잠깐 보여주고 05로
  }

  reset() {
    this.seq = [];
    this.rig.innerHTML = '';
    this.root.classList.remove('is-bloomed');
    this.render(-1);
    this.buildChips();
    requestAnimationFrame(() => this.placeChips());
  }

  finish() {
    const flower = { ...this.sprout, recipe: [...this.seq], missions: this.seq.map((i) => MISSIONS[i]), bloomedAt: Date.now() };
    window.dispatchEvent(new CustomEvent('kkotbat:bloomed', { detail: flower }));
    this.onBloom?.(flower);
  }

  close() {
    this.open = false;
    clearInterval(this.rotTimer);
    this.root.classList.remove('is-open', 'is-bloomed');
    setTimeout(() => { this.root.hidden = true; this.layer.innerHTML = ''; }, this.reducedMotion ? 0 : 350);
    document.body.classList.remove('is-growing');
  }
}
