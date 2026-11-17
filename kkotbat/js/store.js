// 데이터 레이어 (임시).
// 서버가 생기기 전까지는 이 브라우저(localStorage)에만 꽃을 저장합니다.
// 백엔드가 생기면 이 파일만 서버 호출로 바꾸면 됩니다. (여러 사람의 꽃 · 실시간 반영은 서버 필요)
//
//   flower = { id, name, image, recipe: [미션 index 4개], missions: [미션 이름 4개], x, y, plantedAt }
//   note   = { id, author, text, at }  (꽃마다 방명록)

// 꽃밭 초기화: 키 버전을 올리면 이전 꽃·인사는 모두 비워짐
const V = 'kkotbat.v4';
const FLOWERS_KEY = `${V}.flowers`;
const MY_FLOWER_KEY = `${V}.myFlowerId`;
const GUESTBOOK_KEY = `${V}.guestbook`;
try { ['kkotbat.flowers', 'kkotbat.myFlowerId', 'kkotbat.guestbook', 'kkotbat.v2.flowers', 'kkotbat.v2.myFlowerId', 'kkotbat.v2.guestbook', 'kkotbat.v3.flowers', 'kkotbat.v3.myFlowerId', 'kkotbat.v3.guestbook'].forEach((k) => localStorage.removeItem(k)); } catch { /* 무시 */ } // { [flowerId]: [{ id, author, text, at }] }

function read(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 저장소를 못 쓰는 환경: 이번 방문 동안만 유지 */ }
}

let memory = read(FLOWERS_KEY, []);
let notes = read(GUESTBOOK_KEY, {});

export const store = {
  async getFlowers() {
    return [...memory].sort((a, b) => a.plantedAt - b.plantedAt);
  },

  /** 꽃을 심고 저장된 꽃을 돌려줌 */
  async addFlower(flower) {
    const saved = { ...flower, id: `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, plantedAt: Date.now() };
    memory.push(saved);
    write(FLOWERS_KEY, memory);
    this.setMyFlowerId(saved.id);
    return saved;
  },

  /** 가장 최근에 심어진 꽃 (누가 심었든) */
  async getLatest() {
    const list = await this.getFlowers();
    return list[list.length - 1] || null;
  },

  /** 꽃의 방명록 (최신순) */
  async getGuestbook(flowerId) {
    return [...(notes[flowerId] || [])].sort((a, b) => b.at - a.at);
  },

  /** 방명록 한 줄 남기기 */
  async addNote(flowerId, { author, text }) {
    const note = { id: `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, author, text, at: Date.now() };
    (notes[flowerId] ||= []).push(note);
    write(GUESTBOOK_KEY, notes);
    return note;
  },

  getMyFlowerId() {
    return read(MY_FLOWER_KEY, null);
  },

  setMyFlowerId(id) {
    write(MY_FLOWER_KEY, id);
  },
};
