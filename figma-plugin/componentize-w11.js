(async () => {
  const log = [];
  const page = figma.root.children.find(p => p.id === '574:2620');
  await figma.setCurrentPageAsync(page);
  const get = id => figma.getNodeByIdAsync(id);
  try {
    // ---------- 1) 화면 이름 ----------
    const names = {
      '609:4962': 'A-0a_스플래시_로고 등장 1', '609:4939': 'A-0b_스플래시_로고 등장 2', '597:3037': 'A-0c_스플래시_완성',
      '609:7404': 'B-1-1_홈_미션 선택 전', '609:9429': 'B-1-1a_홈_일정 빠른 수정 (바텀시트)', '609:9616': 'B-1-1b_홈_반복 일정 적용 범위 (모달)',
      '609:9785': 'B-1-2_홈_미션 선택 후', '609:7528': 'B-1-3_홈_미션 완료 후', '609:7488': 'B-1-3a_홈_미션 완료 후 (수정 마감)',
      '609:7713': 'B-2-3a_미션 기록_완료 (성공)', '609:9997': 'B-2-3a-2_미션 기록_완료 (성공, 다른 성장 단계)', '609:7694': 'B-2-3b_미션 기록_완료 (도전)',
      '609:8487': 'D-1-4_공동 미션_코드 입력 (바텀시트)', '609:8578': 'D-1-4a_공동 미션_코드 입력 후 미션 확인'
    };
    let rn = 0; for (const [id, nm] of Object.entries(names)) { const n = await get(id); if (n) { n.name = nm; rn++; } else log.push('이름: 없음 ' + id); }
    log.push(`화면 이름 변경 ${rn}개`);

    // ---------- 공통 ----------
    let sec = page.children.find(n => n.type === 'SECTION' && n.name === 'Component_11주 추가');
    if (!sec) { sec = figma.createSection(); sec.name = 'Component_11주 추가'; page.appendChild(sec); sec.x = 11400; sec.y = -642; }
    let cx = 80, cy = 120, rowH = 0;
    const place = (node) => { if (cx + node.width > 2400) { cx = 80; cy += rowH + 60; rowH = 0; } node.x = cx; node.y = cy; cx += node.width + 48; rowH = Math.max(rowH, node.height); };
    const screens = [];
    for (const s of page.children.filter(n => n.type === 'SECTION' && /^[A-F]/.test(n.name))) for (const f of s.children) if (f.type === 'FRAME') screens.push(f);
    const inInst = n => { let p = n.parent; while (p && p.type !== 'PAGE') { if (p.type === 'INSTANCE' || p.type === 'COMPONENT' || p.type === 'COMPONENT_SET') return true; p = p.parent; } return false; };
    const fonts = new Set();
    const loadFonts = async t => { for (const f of t.getRangeAllFontNames(0, t.characters.length)) { const k = f.family + f.style; if (!fonts.has(k)) { await figma.loadFontAsync(f); fonts.add(k); } } };
    const copyLayout = (n, inst) => {
      const p = n.parent;
      const al = 'layoutMode' in p && p.layoutMode !== 'NONE' && n.layoutPositioning !== 'ABSOLUTE';
      if (al) { try { inst.layoutAlign = n.layoutAlign; inst.layoutGrow = n.layoutGrow; } catch (e) {} inst.resize(n.width, n.height); try { inst.layoutSizingHorizontal = n.layoutSizingHorizontal === 'HUG' ? 'FIXED' : n.layoutSizingHorizontal; inst.layoutSizingVertical = n.layoutSizingVertical === 'HUG' ? 'FIXED' : n.layoutSizingVertical; } catch (e) {} }
      else { if ('layoutPositioning' in n && n.layoutPositioning === 'ABSOLUTE') inst.layoutPositioning = 'ABSOLUTE'; inst.resize(n.width, n.height); inst.x = n.x; inst.y = n.y; try { inst.constraints = n.constraints; } catch (e) {} }
    };

    // ---------- 2) 아이콘 ----------
    const ICON_NAMES = ['help', 'clock_loader_40', '360', 'edit', 'lock_open', 'lock', 'delete', 'calendar_month', 'check_small', 'person', 'content_copy', 'add_a_photo', 'add_photo_alternate', 'imagesmode', 'arrow_forward_ios'];
    const byName = {};
    for (const s of screens) for (const n of s.findAll(x => (x.type === 'VECTOR' || x.type === 'BOOLEAN_OPERATION') && !inInst(x) && x.width <= 32 && x.height <= 32)) {
      let key = ICON_NAMES.includes(n.name) ? n.name : null;
      if (!key && n.type === 'BOOLEAN_OPERATION' && n.name === 'Union' && Math.round(n.width) === 14) key = 'search';
      if (!key) continue;
      (byName[key] = byName[key] || []).push(n);
    }
    // 나뭇잎·새싹(프레임) + 바깥에 있던 person_search
    const extra = { leaf: ['597:3781', '609:7305', '609:7348'], sprout: ['597:3787', '609:7311', '609:7384'] };
    for (const [k, ids] of Object.entries(extra)) for (const id of ids) { const n = await get(id); if (n && !inInst(n)) (byName[k] = byName[k] || []).push(n); }
    const ps = await get('609:8434');
    let iconCount = 0, instCount = 0;
    for (const [key, nodes] of Object.entries(byName)) {
      const master = nodes.slice().sort((a, b) => b.width * b.height - a.width * a.height)[0];
      const comp = figma.createComponent();
      comp.name = 'icon/' + key; comp.fills = []; comp.clipsContent = false;
      const c = master.clone(); comp.appendChild(c); c.x = 0; c.y = 0;
      comp.resizeWithoutConstraints(master.width, master.height);
      const setScale = x => { try { x.constraints = { horizontal: 'SCALE', vertical: 'SCALE' }; } catch (e) {} if ('children' in x) x.children.forEach(setScale); };
      setScale(c);
      sec.appendChild(comp); place(comp); iconCount++;
      for (const n of nodes) {
        try {
          const p = n.parent, idx = p.children.indexOf(n);
          const inst = comp.createInstance();
          p.insertChild(idx, inst);
          copyLayout(n, inst);
          // 색 덮어쓰기
          const sv = [n, ...('findAll' in n ? n.findAll(() => true) : [])].filter(x => 'fills' in x);
          const dv = [inst.children[0], ...('findAll' in inst.children[0] ? inst.children[0].findAll(() => true) : [])].filter(x => 'fills' in x);
          sv.forEach((s, i) => { const d = dv[i]; if (!d) return; try { if (s.fills !== figma.mixed && JSON.stringify(s.fills) !== JSON.stringify(d.fills)) d.fills = s.fills; if (JSON.stringify(s.strokes) !== JSON.stringify(d.strokes)) d.strokes = s.strokes; } catch (e) {} });
          inst.name = 'icon/' + key;
          n.remove(); instCount++;
        } catch (e) { log.push(`  ${key} 실패 ${n.id}: ${e.message}`); }
      }
    }
    if (ps) { const comp = figma.createComponentFromNode(ps.clone()); comp.name = 'icon/person_search'; sec.appendChild(comp); place(comp); iconCount++; }
    log.push(`아이콘 컴포넌트 ${iconCount}개, 화면 속 아이콘 ${instCount}곳 교체`);

    // ---------- 3) 홈 반복 구조 ----------
    const mcName = n => { const m = n.mainComponent; if (!m) return '?'; return m.parent && m.parent.type === 'COMPONENT_SET' ? m.parent.name : m.name; };
    const sig = (n, d = 0) => { if (d > 3) return ''; if (n.type === 'TEXT') return 'T'; if (n.type === 'INSTANCE') return 'I:' + mcName(n); if (!('children' in n)) return n.type[0]; return n.type[0] + ('layoutMode' in n && n.layoutMode !== 'NONE' ? n.layoutMode[0] : '') + '(' + n.children.map(c => sig(c, d + 1)).join(',') + ')'; };
    cx = 80; cy += rowH + 120; rowH = 0;
    for (const [nm, exId] of [['home/section-header', '609:7433'], ['home/hero', '609:7406']]) {
      const ex = await get(exId); if (!ex) { log.push(nm + ': 예시 없음'); continue; }
      const key = Math.round(ex.width) + ' ' + sig(ex);
      const members = [];
      for (const s of screens) for (const n of s.findAll(x => x.type === 'FRAME' && !inInst(x))) if (Math.round(n.width) + ' ' + sig(n) === key) members.push(n);
      const c = ex.clone(); sec.appendChild(c); const comp = figma.createComponentFromNode(c); comp.name = nm; place(comp);
      let ok = 0, skip = 0;
      for (const n of members) {
        try {
          const p = n.parent, idx = p.children.indexOf(n);
          const inst = comp.createInstance();
          const sD = n.findAll(() => true), dD = inst.findAll(() => true);
          if (sD.length !== dD.length) { inst.remove(); skip++; continue; }
          p.insertChild(idx, inst); copyLayout(n, inst);
          for (let i = 0; i < sD.length; i++) {
            const s = sD[i], d = dD[i]; if (s.type !== d.type) continue;
            if (s.visible !== d.visible) d.visible = s.visible;
            if (s.type === 'TEXT') { if (s.characters !== d.characters) { await loadFonts(d); d.characters = s.characters; } }
            else if (s.type === 'INSTANCE') { if (s.mainComponent && d.mainComponent && s.mainComponent.id !== d.mainComponent.id) d.swapComponent(s.mainComponent); }
            else if (s.type === 'RECTANGLE' || s.type === 'FRAME') { try { if (s.fills !== figma.mixed && JSON.stringify(s.fills) !== JSON.stringify(d.fills)) d.fills = s.fills; } catch (e) {} if (s.type === 'RECTANGLE' && (Math.abs(s.width - d.width) > .5 || Math.abs(s.height - d.height) > .5)) d.resize(s.width, s.height); }
          }
          n.remove(); ok++;
        } catch (e) { skip++; log.push(`  ${nm} 실패 ${n.id}: ${e.message}`); }
      }
      log.push(`${nm}: 인스턴스 ${ok}곳${skip ? `, 건너뜀 ${skip}` : ''}`);
    }

    // ---------- 4) 기타: 앱 로고, 식물 성장 단계 ----------
    const logo = await get('609:7231');
    if (logo && logo.type !== 'COMPONENT') { const c = figma.createComponentFromNode(logo); c.name = 'logo/app-icon'; log.push('logo/app-icon 생성'); }
    const stageIds = ['609:9404', '609:9424', '609:9409', '609:9410', '609:9411'];
    const stages = [];
    for (let i = 0; i < stageIds.length; i++) { const n = await get(stageIds[i]); if (!n) continue; const c = figma.createComponentFromNode(n); c.name = `Stage=${i + 1}단계`; stages.push(c); }
    if (stages.length > 1) {
      const etc = await get('609:9403');
      const set = figma.combineAsVariants(stages, etc); set.name = 'plant/stage';
      set.layoutMode = 'HORIZONTAL'; set.itemSpacing = 40; set.paddingTop = set.paddingBottom = set.paddingLeft = set.paddingRight = 24; set.counterAxisAlignItems = 'MAX';
      set.primaryAxisSizingMode = 'AUTO'; set.counterAxisSizingMode = 'AUTO';
      set.x = 600; set.y = 120;
      for (const t of etc.children.filter(n => n.type === 'TEXT' && /^\d단계$/.test(n.characters))) t.visible = false;
      log.push(`plant/stage 변형 ${stages.length}개 생성 (1~5단계 라벨은 숨김)`);
    }
    sec.resizeWithoutConstraints(2500, cy + rowH + 160);
  } catch (e) { log.push('ERROR ' + e.message + ' ' + e.stack); }
  figma.notify(log.filter(l => !l.startsWith('  ')).join(' · ').slice(0, 300), { timeout: 15000 });
  figma.showUI(`<html><body style="font-family:sans-serif;font-size:12px;padding:12px"><p id="m">저장 중…</p><script>
  onmessage = (e) => { const blob = new Blob([JSON.stringify(e.data.pluginMessage)], {type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='w11-log.json'; document.body.appendChild(a); a.click(); document.getElementById('m').textContent='완료. 창을 닫아도 돼요.'; };
  </script></body></html>`, { width: 300, height: 100 });
  figma.ui.postMessage({ log });
})();
