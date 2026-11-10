(async () => {
  const out = { ref: {}, img: {}, svg: {}, texts: {}, log: [] };
  try {
    const page = figma.root.children.find(p => p.id === '574:2620');
    await figma.setCurrentPageAsync(page);
    const b64 = async (n, fmt, s) => figma.base64Encode(await n.exportAsync(fmt === 'SVG' ? { format: 'SVG' } : { format: fmt, constraint: { type: 'SCALE', value: s } }));
    const svgStr = async n => { const b = await n.exportAsync({ format: 'SVG' }); let s = ''; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode.apply(null, b.subarray(i, i + 8192)); return s; };
    const REF = ['609:4962', '609:4939', '597:3037', '597:3016', '597:2831', '597:2857', '609:7404', '609:9429', '609:9785', '609:7528', '609:7488', '609:7294', '609:7713', '609:9997', '609:7694', '597:3763', '597:4109', '597:4541', '609:7333'];
    const hashes = new Map();
    for (const id of REF) {
      const s = await figma.getNodeByIdAsync(id); if (!s) { out.log.push('없음 ' + id); continue; }
      out.ref[s.name] = await b64(s, 'PNG', 1);
      out.texts[s.name] = s.findAll(x => x.type === 'TEXT' && x.visible).map(t => { const b = t.absoluteBoundingBox, o = s.absoluteBoundingBox; return `${Math.round(b.x - o.x)},${Math.round(b.y - o.y)} ${t.fontName === figma.mixed ? '*' : t.fontName.style[0]}${t.fontSize === figma.mixed ? '*' : t.fontSize} ${t.fills !== figma.mixed && t.fills[0] && t.fills[0].color ? [t.fills[0].color.r, t.fills[0].color.g, t.fills[0].color.b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('') : '*'} ${t.characters.replace(/\s+/g, ' ')}`; }).join('|');
      for (const n of s.findAll(x => 'fills' in x && Array.isArray(x.fills) && x.fills.some(f => f.type === 'IMAGE' && f.visible !== false))) {
        const h = n.fills.find(f => f.type === 'IMAGE').imageHash; if (hashes.has(h)) continue;
        hashes.set(h, n.name);
        const key = (n.name + '_' + n.id).replace(/[^\w가-힣]/g, '_');
        out.img[key] = { w: Math.round(n.width), h: Math.round(n.height), screen: s.name, data: await b64(n, 'PNG', 2) };
      }
      // 큰 벡터 그림(로고·일러스트형 아이콘)
      const isVecArt = n => (n.type === 'VECTOR' || n.type === 'BOOLEAN_OPERATION' || ((n.type === 'GROUP' || n.type === 'FRAME' || n.type === 'INSTANCE') && n.findAll(x => true).length > 0 && n.findAll(x => true).every(x => ['VECTOR', 'BOOLEAN_OPERATION', 'GROUP', 'FRAME', 'ELLIPSE', 'RECTANGLE'].includes(x.type) && !(('fills' in x) && Array.isArray(x.fills) && x.fills.some(f => f.type === 'IMAGE')))));
      const cands = s.findAll(n => n.width >= 36 && n.width <= 260 && n.height >= 30 && isVecArt(n));
      const set = new Set(cands.map(c => c.id));
      for (const n of cands) { let p = n.parent, nested = false; while (p && p !== s) { if (set.has(p.id)) { nested = true; break; } p = p.parent; } if (nested) continue; out.svg[(s.name.split('_')[0] + '_' + n.name + '_' + n.id).replace(/[^\w가-힣]/g, '_')] = await svgStr(n); }
    }
    // 새 아이콘 컴포넌트·로고 SVG
    const sec = page.children.find(n => n.name === 'Component_11주 추가');
    for (const c of sec.children) if (c.name.startsWith('icon/')) out.svg[c.name.replace('/', '_')] = await svgStr(c);
    const logo = page.findOne(n => n.name === 'logo/app-icon'); if (logo) out.svg.logo_app = await svgStr(logo);
    // 식물 단계
    const st = page.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'plant/stage');
    if (st) for (const v of st.children) { const r = v.children[0] || v; out.img['stage_' + v.name.replace(/\D/g, '')] = { w: Math.round(v.width), h: Math.round(v.height), data: await b64(v, 'PNG', 2) }; }
  } catch (e) { out.log.push('ERROR ' + e.message + ' ' + e.stack); }
  figma.showUI(`<html><body style="font-family:sans-serif;font-size:12px;padding:12px"><p id="m">저장 중…</p><script>
  onmessage = (e) => { const blob = new Blob([JSON.stringify(e.data.pluginMessage)], {type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='w11-assets.json'; document.body.appendChild(a); a.click(); document.getElementById('m').textContent='완료. 창을 닫아도 돼요.'; };
  </script></body></html>`, { width: 300, height: 100 });
  figma.ui.postMessage(out);
})();
