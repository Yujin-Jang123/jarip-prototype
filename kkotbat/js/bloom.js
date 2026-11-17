// 05 개화 완료
//
// 04에서 네 번째 미션을 고르면 이어짐: 큰 원 안에 완성된 꽃, 위에서 꽃잎이 흩날리고,
// 이름과 '고른 순서(레시피)'를 보여준 뒤 '꽃밭에 심기' → 06

import { renderRig } from './plantRig.js?v=1117l';

const $ = (id) => document.getElementById(id);
const PETAL_COLORS = ['#ffd1e3', '#ffe48a', '#cfe6ff', '#e4d4ff', '#ffffff', '#ffc6b0'];

export class BloomScene {
  constructor({ reducedMotion, onPlant }) {
    this.reducedMotion = reducedMotion;
    this.onPlant = onPlant;
    this.root = $('bloom');
    this.rig = $('bloomRig');
    $('bloomPlant').addEventListener('click', () => this.plant());
    this.root.addEventListener('keydown', (e) => { if (e.key === 'Tab') this.trap(e); });
    window.addEventListener('resize', () => { if (this.flower) this.draw(); });
  }

  start(flower) {
    this.flower = flower;
    document.body.classList.add('is-blooming');
    $('bloomTitle').textContent = `${flower.name}의 꽃이 피었어요`;
    $('bloomRecipe').innerHTML = flower.missions.map((m) => `<li>${m}</li>`).join('');
    this.root.hidden = false;
    this.rig.innerHTML = '';
    this.draw();
    this.rain();
    requestAnimationFrame(() => this.root.classList.add('is-open'));
    setTimeout(() => $('bloomPlant').focus({ preventScroll: true }), this.reducedMotion ? 0 : 700);
  }

  draw() {
    renderRig(this.rig, this.flower.recipe, this.flower.image, $('bloomStage').clientWidth, -1);
  }

  // 위에서 꽃잎이 흩날림
  rain() {
    const box = $('petalRain');
    box.innerHTML = '';
    if (this.reducedMotion) return;
    for (let i = 0; i < 34; i++) {
      const p = document.createElement('span');
      p.className = 'petal';
      p.style.left = `${Math.random() * 100}%`;
      p.style.background = PETAL_COLORS[i % PETAL_COLORS.length];
      p.style.setProperty('--fall', `${4.5 + Math.random() * 4}s`);
      p.style.setProperty('--delay', `${-Math.random() * 6}s`);
      p.style.setProperty('--sway', `${(Math.random() - 0.5) * 160}px`);
      p.style.setProperty('--size', `${10 + Math.random() * 10}px`);
      box.appendChild(p);
    }
  }

  plant() {
    const flower = this.flower;
    this.close();
    this.onPlant?.(flower);
  }

  close() {
    this.root.classList.remove('is-open');
    document.body.classList.remove('is-blooming');
    setTimeout(() => { this.root.hidden = true; $('petalRain').innerHTML = ''; }, this.reducedMotion ? 0 : 400);
    this.flower = null;
  }

  trap(e) {
    // 버튼이 하나뿐이라 포커스를 그 안에 둠
    e.preventDefault();
    $('bloomPlant').focus();
  }
}
