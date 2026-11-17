// 03 씨앗 심기 · 이름 붙이기
//
// 흐름: 씨앗 방울이 터짐 → 새싹이 포물선을 그리며 풀밭에 떨어짐 → 풀잎이 튀고 새싹이 쏙 돋음
//      → 그 자리로 화면이 살짝 확대됨 → 이름 붙이기 카드가 올라옴
//      → 이름을 붙이면 'kkotbat:sprout-named' 이벤트를 보내고 04(성장 미션)로 넘어갈 준비
//      → '다른 씨앗 고를래요'를 누르면 원래 풀밭으로 돌아감

const $ = (id) => document.getElementById(id);
const NAME_MAX = 10;
const charLen = (s) => [...s].length; // 한글·이모지도 한 글자로 셈

export class PlantScene {
  /**
   * @param {{ viewport: HTMLElement, world: HTMLElement, getCam: () => {x:number,y:number},
   *           setZoom: (scale:number, originX:number, originY:number, ms:number) => void,
   *           reducedMotion: boolean, onDone: (sprout:object) => void, onCancel: () => void }} opts
   */
  constructor(opts) {
    Object.assign(this, opts);
    this.overlay = $('plantOverlay');
    this.form = $('nameForm');
    this.input = $('sproutName');
    this.submit = $('nameSubmit');
    this.count = $('nameCount');
    this.tag = $('sproutTag');
    this.stageImg = $('plantSprout');
    this.busy = false;

    this.input.addEventListener('input', () => this.validate());
    this.form.addEventListener('submit', (e) => { e.preventDefault(); this.confirm(); });
    $('plantCancel').addEventListener('click', () => this.cancel());
    this.overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.cancel();
      if (e.key === 'Tab') this.trapFocus(e);
    });
  }

  get active() { return this.busy; }

  /** 씨앗을 고른 순간 호출. x, y는 터진 씨앗의 화면 좌표 */
  async start({ x, y, image, size }) {
    if (this.busy) return;
    this.busy = true;
    this.image = image;
    this.returnFocus = document.activeElement;
    document.body.classList.add('is-planting');

    // 새싹이 떨어질 자리: 화면 가로 가운데, 세로 64% 지점 (항상 풀밭 위)
    const vw = this.viewport.clientWidth, vh = this.viewport.clientHeight;
    const land = { x: vw / 2 + (x - vw / 2) * 0.25, y: vh * 0.64 };
    const cam = this.getCam();
    this.spot = { x: cam.x + land.x / (cam.s || 1), y: cam.y + land.y / (cam.s || 1) };

    await this.fall({ x, y }, land, image, size * 0.64);
    this.plantInWorld();
    await wait(this.reducedMotion ? 0 : 450);
    this.setZoom(1.45, this.spot.x, this.spot.y, this.reducedMotion ? 0 : 900);
    await wait(this.reducedMotion ? 0 : 650);
    this.openCard();
  }

  // 터진 자리에서 땅까지 포물선으로 떨어짐
  fall(from, to, image, w) {
    const img = document.createElement('img');
    img.src = image; img.alt = '';
    img.className = 'falling-sprout';
    img.style.width = `${w}px`;
    this.viewport.appendChild(img);
    const h = w * 0.75;
    const sx = from.x - w / 2, sy = from.y - h / 2;
    const ex = to.x - w / 2, ey = to.y - h; // 새싹 밑동이 착지점에 닿도록
    const peak = Math.min(sy, ey) - 90;
    if (this.reducedMotion) { img.remove(); return Promise.resolve(); }
    const anim = img.animate([
      { transform: `translate(${sx}px, ${sy}px) rotate(0deg) scale(1)` },
      { transform: `translate(${(sx + ex) / 2}px, ${peak}px) rotate(-14deg) scale(1.08)`, offset: 0.35 },
      { transform: `translate(${ex}px, ${ey}px) rotate(6deg) scale(0.9)` },
    ], { duration: 820, easing: 'cubic-bezier(.45,.05,.7,.4)', fill: 'forwards' });
    return anim.finished.then(() => img.remove());
  }

  // 풀밭(월드)에 새싹을 심고, 풀잎 조각을 튀김
  plantInWorld() {
    const plot = document.createElement('div');
    plot.className = 'plot is-new';
    plot.style.left = `${this.spot.x}px`;
    plot.style.top = `${this.spot.y}px`;
    plot.innerHTML = `<img class="plot-sprout" src="${this.image}" alt="">`;
    $('plots').appendChild(plot);
    this.plot = plot;
    if (this.reducedMotion) return;
    for (let i = 0; i < 9; i++) {
      const d = document.createElement('span');
      d.className = 'dirt';
      plot.appendChild(d);
      const a = Math.PI * (1.05 + (i / 8) * 0.9);
      const dist = 26 + Math.random() * 30;
      d.animate([
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * dist}px), calc(-50% + ${Math.sin(a) * dist * 0.8}px)) scale(0.4)`, opacity: 0 },
      ], { duration: 520 + Math.random() * 200, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' })
        .finished.then(() => d.remove());
    }
  }

  openCard() {
    this.stageImg.src = this.image;
    this.input.value = '';
    this.validate();
    this.overlay.hidden = false;
    requestAnimationFrame(() => this.overlay.classList.add('is-open'));
    setTimeout(() => this.input.focus({ preventScroll: true }), this.reducedMotion ? 0 : 350);
  }

  validate() {
    const name = this.input.value.trim();
    const len = charLen(name);
    this.count.textContent = `${len} / ${NAME_MAX}`;
    const ok = len >= 1 && len <= NAME_MAX;
    const over = len > NAME_MAX;
    this.submit.disabled = !ok;
    this.count.classList.toggle('is-over', over);
    $('nameHint').textContent = over ? `${NAME_MAX}자까지 쓸 수 있어요` : '1~10자 · 나중에 바꿀 수 없어요';
    $('nameHint').classList.toggle('is-over', over);
    this.input.setAttribute('aria-invalid', over ? 'true' : 'false');
    this.tag.textContent = len ? `${name}의 새싹` : '이름 없는 새싹';
    this.tag.classList.toggle('is-named', len > 0);
    return ok ? name : null;
  }

  async confirm() {
    const name = this.validate();
    if (!name) { this.input.focus(); return; }
    this.submit.disabled = true;
    this.submit.textContent = '좋아요!';
    this.overlay.classList.add('is-confirmed');
    await wait(this.reducedMotion ? 0 : 700);
    const sprout = { name, image: this.image, x: this.spot.x, y: this.spot.y, plantedAt: Date.now() };
    window.dispatchEvent(new CustomEvent('kkotbat:sprout-named', { detail: sprout }));
    this.onDone?.(sprout); // 04를 먼저 띄우고
    this.close(true);       // 그 뒤에서 03을 정리
  }

  cancel() {
    if (!this.busy || this.overlay.hidden) return;
    this.close(false);
    this.onCancel?.();
  }

  close(keepPlot) {
    this.overlay.classList.remove('is-open', 'is-confirmed');
    setTimeout(() => {
      this.overlay.hidden = true;
      this.submit.textContent = '이름 붙이고 키우기';
    }, this.reducedMotion ? 0 : 300);
    this.setZoom(1, this.spot.x, this.spot.y, this.reducedMotion ? 0 : 700);
    if (!keepPlot && this.plot) {
      const p = this.plot;
      p.classList.add('is-leaving');
      setTimeout(() => p.remove(), 400);
    }
    if (keepPlot) this.plot?.remove(); // 04에서 성장 화면이 이어받음. 꽃이 피면 06에서 다시 심김
    this.plot = null;
    document.body.classList.remove('is-planting');
    this.busy = false;
    this.returnFocus?.focus?.({ preventScroll: true });
  }

  trapFocus(e) {
    const items = [...this.overlay.querySelectorAll('input, button:not([disabled])')];
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }
