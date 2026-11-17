// 07 인사 남기기(방명록) — 꽃을 누르면 열리는 패널 (데스크톱: 오른쪽, 모바일: 아래에서 올라오는 시트)
//
// - 꽃 이름 · 피어난 날 · 고른 미션 순서
// - 방명록 목록 (최신순)
// - 간단한 한 줄 남기기 (최대 40자). 작성자 이름은 내 꽃이 있으면 그 이름, 없으면 직접 입력(선택)

import { renderRig } from './plantRig.js?v=1117g';

const $ = (id) => document.getElementById(id);
const NOTE_MAX = 40;
const AUTHOR_MAX = 10;
const charLen = (s) => [...s].length;

export class GuestbookPanel {
  constructor({ store, reducedMotion, toast, onClose }) {
    this.store = store;
    this.reducedMotion = reducedMotion;
    this.toast = toast;
    this.onClose = onClose;
    this.root = $('guest');
    this.list = $('guestList');
    this.form = $('noteForm');
    this.input = $('noteText');
    this.author = $('noteAuthor');
    this.submit = $('noteSubmit');

    // 40자가 넘으면 더 쳐지지 않음 (한글 조합 중에는 자르지 않고, 조합이 끝나면 정리)
    const clamp = () => {
      const chars = [...this.input.value];
      if (chars.length > NOTE_MAX) this.input.value = chars.slice(0, NOTE_MAX).join('');
      this.validate();
    };
    this.input.addEventListener('input', (e) => { if (!e.isComposing) clamp(); else this.validate(); });
    this.input.addEventListener('compositionend', clamp);
    this.author.addEventListener('input', () => this.validate());
    this.form.addEventListener('submit', (e) => { e.preventDefault(); this.send(); });
    $('guestClose').addEventListener('click', () => this.close());
    this.root.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.close(); });
    this.root.addEventListener('pointerdown', (e) => e.stopPropagation()); // 패널 위 드래그가 풀밭을 움직이지 않게
    this.root.addEventListener('wheel', (e) => e.stopPropagation());
  }

  get isOpen() { return !this.root.hidden; }

  async open(flower) {
    this.flower = flower;
    this.returnFocus = document.activeElement;
    $('guestTitle').textContent = `${flower.name}의 꽃`;
    const d = new Date(flower.plantedAt);
    $('guestMeta').textContent = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}에 피었어요`;
    const rig = $('guestRig');
    rig.innerHTML = '';
    renderRig(rig, flower.recipe, flower.image, 74, -1); // 썸네일 원 안에 꽃 전체가 들어오는 크기

    // 작성자: 내 꽃이 있으면 그 이름으로, 없으면 직접 입력
    const myId = this.store.getMyFlowerId();
    const mine = myId ? (await this.store.getFlowers()).find((f) => f.id === myId) : null;
    this.myName = mine ? mine.name : null;
    $('authorRow').hidden = !!mine;
    $('authorAs').hidden = !mine;
    if (mine) $('authorAs').textContent = `${mine.name}(으)로 인사해요`;
    this.input.value = '';
    this.validate();

    await this.renderList();
    this.root.hidden = false;
    requestAnimationFrame(() => this.root.classList.add('is-open'));
    document.body.classList.add('is-reading');
    setTimeout(() => this.input.focus({ preventScroll: true }), this.reducedMotion ? 0 : 300);
  }

  async renderList(newId) {
    const notes = await this.store.getGuestbook(this.flower.id);
    $('guestCount').textContent = notes.length;
    if (!notes.length) {
      this.list.innerHTML = `<li class="note-empty">아직 받은 인사가 없어요.<br>첫 번째 인사를 건네보세요</li>`;
      return;
    }
    this.list.innerHTML = notes.map((n) => `
      <li class="note${n.id === newId ? ' is-new' : ''}">
        <div class="note-head"><span class="note-author">${esc(n.author)}</span><time datetime="${new Date(n.at).toISOString()}">${ago(n.at)}</time></div>
        <p class="note-text">${esc(n.text)}</p>
      </li>`).join('');
  }

  validate() {
    const text = this.input.value.trim().replace(/\s+/g, ' ');
    const len = charLen(text);
    const authorLen = charLen(this.author.value.trim());
    $('noteCount').textContent = `${len} / ${NOTE_MAX}`;
    const over = len > NOTE_MAX || authorLen > AUTHOR_MAX;
    $('noteCount').classList.toggle('is-over', len > NOTE_MAX);
    this.input.setAttribute('aria-invalid', len > NOTE_MAX ? 'true' : 'false');
    this.submit.disabled = len < 1 || over;
    return { text, ok: len >= 1 && !over };
  }

  async send() {
    const { text, ok } = this.validate();
    if (!ok) return;
    const author = this.myName || this.author.value.trim() || '지나가던 정원사';
    this.submit.disabled = true;
    const note = await this.store.addNote(this.flower.id, { author, text });
    this.input.value = '';
    this.validate();
    await this.renderList(note.id);
    this.list.scrollTop = 0;
    this.toast?.(`${this.flower.name}의 꽃에 인사를 건넸어요`);
    window.dispatchEvent(new CustomEvent('kkotbat:note-added', { detail: { flowerId: this.flower.id, note } }));
    this.input.focus({ preventScroll: true });
  }

  close() {
    if (!this.isOpen) return;
    this.root.classList.remove('is-open');
    document.body.classList.remove('is-reading');
    setTimeout(() => { this.root.hidden = true; }, this.reducedMotion ? 0 : 300);
    this.flower = null;
    this.onClose?.();
    this.returnFocus?.focus?.({ preventScroll: true });
  }
}

function ago(at) {
  const s = Math.floor((Date.now() - at) / 1000);
  if (s < 60) return '방금';
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  const d = new Date(at);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
