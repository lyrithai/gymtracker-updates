'use strict';
/* ================= weekly time blocks =================
   S.blocks: {id, title, start, end (minutes from midnight), days:[0=Mon..6], color}. end <= start runs past midnight.
   S.blockDone: {'YYYY-MM-DD': {blockId:1}} (the date the block starts on) */
const BLOCK_COLORS = ['#a3e635','#60a5fa','#f472b6','#fbbf24','#5eead4','#c084fc','#f87171','#94a3b8'];
let schDay = null;
const todayIdx = () => (new Date().getDay() + 6) % 7;
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const weekDate = i => dadd(today(), i - todayIdx());
const blockLen = b => ((b.end - b.start + 1440) % 1440) || 1440;
const overnight = b => b.start + blockLen(b) > 1440;
function fmtT(m){ m = (m + 1440) % 1440; const h = Math.floor(m / 60), x = m % 60; return (h % 12 || 12) + (x ? ':' + String(x).padStart(2, '0') : '') + (h < 12 ? 'am' : 'pm'); }
function fmtLen(m){ const h = Math.floor(m / 60), x = m % 60; return (h ? h + 'h' : '') + (h && x ? ' ' : '') + (x ? x + 'm' : ''); }
const toHM = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const fromHM = v => { const m = /^(\d{1,2}):(\d{2})/.exec(v || ''); return m ? +m[1] * 60 + +m[2] : null; };
/** "sleep: 11pm-6 am", "school 6am to 4 pm", "gym 17:30-19:00", "study 6-8pm" -> {title, start, end} or null */
function parseBlock(text){
  const T = '(\\d{1,2})(?:[:.](\\d{2}))?\\s*(am|pm)?';
  const m = new RegExp('^(.*?)[\\s:,-]*\\b' + T + '\\s*(?:-|–|—|to|until|till)\\s*' + T + '$', 'i').exec(text.trim().replace(/\b([ap])\.m\.?/gi, '$1m').replace(/\s+/g, ' '));
  if (!m || !m[1].trim()) return null;
  const mk = (h, mi, ap) => {
    h = +h; mi = +(mi || 0);
    if (mi > 59 || h > 24 || (ap && (h < 1 || h > 12))) return null;
    if (ap) h = h % 12 + (/pm/i.test(ap) ? 12 : 0);
    return (h % 24) * 60 + mi;
  };
  const end = mk(m[5], m[6], m[7]);
  let start = mk(m[2], m[3], m[4]);
  if (!m[4] && m[7] && +m[2] >= 1 && +m[2] <= 12) {   // "6-8pm" means 6pm; "11-1pm" means 11am
    start = mk(m[2], m[3], m[7]);
    if (start >= end) start = mk(m[2], m[3], /pm/i.test(m[7]) ? 'am' : 'pm');
  }
  if (start == null || end == null || start === end) return null;
  const t = m[1].trim().replace(/[:,-]+$/, '').trim();
  return t ? {title:t[0].toUpperCase() + t.slice(1), start, end} : null;
}
/** Everything on a weekday in time order, including what runs over from the night before. from/to are clipped to the day. */
function dayBlocks(i){
  const out = [];
  S.blocks.forEach(b => {
    if (b.days.includes(i)) out.push({b, from:b.start, to:Math.min(1440, b.start + blockLen(b)), date:weekDate(i)});
    if (b.days.includes((i + 6) % 7) && overnight(b)) out.push({b, from:0, to:b.start + blockLen(b) - 1440, carry:true, date:dadd(weekDate(i), -1)});
  });
  return out.sort((x, y) => x.from - y.from || x.to - y.to);
}
function nowNext(){
  const i = todayIdx(), n = nowMin(), cur = dayBlocks(i).filter(x => x.from <= n && n < x.to);
  let next = dayBlocks(i).find(x => !x.carry && x.from > n), day = 'today';
  if (!next) { next = dayBlocks((i + 1) % 7).find(x => !x.carry); day = 'tomorrow'; }
  return {cur, next, day};
}
const isDone = x => !!(S.blockDone[x.date] && S.blockDone[x.date][x.b.id]);
/** Other blocks that share time with this one on any day. */
function clashes(b, skipId){
  const abs = x => x.days.map(d => [d * 1440 + x.start, d * 1440 + x.start + blockLen(x)]);
  const W = 7 * 1440, hit = (p, q) => [-W, 0, W].some(o => p[0] < q[1] + o && q[0] + o < p[1]);
  return S.blocks.filter(o => o.id !== skipId && abs(b).some(p => abs(o).some(q => hit(p, q))));
}
function daysLabel(ds){
  const k = ds.slice().sort().join('');
  return k === '0123456' ? 'Every day' : k === '01234' ? 'Weekdays' : k === '56' ? 'Weekends' : ds.slice().sort().map(d => WEEKDAYS[d]).join(', ');
}

VIEWS['life/schedule'] = {render(){
  const t = todayIdx(); if (schDay == null) schDay = t;
  const list = dayBlocks(schDay), n = nowMin();
  let h = `<div class="cal" style="margin-bottom:12px">${WEEKDAYS.map((w, i) => `<button class="cal-day ${i === schDay ? 'on' : ''}" style="min-height:56px" data-act="sch-day" data-i="${i}"><b>${w}</b><span style="color:${i === t ? 'var(--accent)' : 'var(--muted)'}">${i === t ? 'Today' : dparse(weekDate(i)).getDate()}</span></button>`).join('')}</div>
    <div class="row" style="margin-bottom:4px"><input class="text-in grow" id="schq" placeholder="School 6am to 4pm"><button class="primary" data-act="sch-quick" style="min-width:64px">Add</button></div>
    <div class="row between" style="margin-bottom:8px"><button class="ghost" data-act="sch-new">＋ Set days and colour</button>${S.blocks.length ? '<button class="ghost" data-act="sch-copy">Copy this day</button>' : ''}</div>`;
  if (!list.length) return h + `<div class="empty">Nothing on ${WEEKDAY_FULL[schDay]} yet.<br>Type a block like “Sleep: 11pm-6am” above.</div>`;
  let at = 0;
  const gap = to => { if (to - at >= 15) h += `<button class="sch-free" data-act="sch-gap" data-a="${at}" data-b="${to % 1440}">Free · ${fmtT(at)} – ${to === 1440 ? 'midnight' : fmtT(to)} · ${fmtLen(to - at)}</button>`; };
  list.forEach(x => {
    gap(x.from);
    const live = schDay === t && x.from <= n && n < x.to, done = isDone(x);
    h += `<div class="sch ${done ? 'done' : ''} ${live ? 'live' : ''}" style="border-left-color:${x.b.color};min-height:${Math.min(120, 52 + (x.to - x.from) / 10)}px">
      ${x.carry ? '' : `<button class="tick ${done ? 'on' : ''}" data-act="sch-tick" data-id="${x.b.id}" data-d="${x.date}" aria-label="Done">${done ? '✓' : ''}</button>`}
      <button class="tap grow" style="background:none;color:var(--text);padding:0" data-act="sch-edit" data-id="${x.b.id}"><b>${esc(x.b.title)}</b>${live ? ' <span class="chip hot">now</span>' : ''}
      <div class="muted small">${x.carry ? 'from last night · until ' + fmtT(x.b.end) : fmtT(x.b.start) + ' – ' + fmtT(x.b.end) + (overnight(x.b) && x.b.end ? ' next day' : '')} · ${fmtLen(x.carry ? x.to - x.from : blockLen(x.b))}</div></button></div>`;
    at = Math.max(at, x.to);
  });
  gap(1440);
  const over = list.filter((x, k) => list.slice(0, k).some(y => y.to > x.from));
  if (over.length) h += `<div class="coach warn" style="margin-top:8px">⚠️ Overlapping: ${[...new Set(over.map(x => x.b.title))].map(esc).join(', ')}</div>`;
  return h;
}};

/** Now / next on the Today page */
function scheduleCard(){
  if (!S.blocks.length) return `<button class="card tap" style="color:var(--text)" data-act="go" data-tab="life" data-sub="schedule"><b>🕒 Schedule</b><div class="muted small">Time-block your week: sleep, school, gym…</div></button>`;
  const {cur, next, day} = nowNext();
  return `<button class="card tap" style="color:var(--text)" data-act="sch-open"><div class="item"><b>🕒 Schedule</b><span class="muted small">›</span></div>
    <div style="margin-top:4px">${cur.length ? cur.map(x => `<span style="color:${x.b.color}">●</span> <b>${esc(x.b.title)}</b> <span class="muted small">until ${fmtT(x.b.end)}</span>`).join('<br>') : '<span class="muted">Free time now</span>'}</div>
    ${next ? `<div class="muted small" style="margin-top:2px">Next: ${esc(next.b.title)} at ${fmtT(next.b.start)}${day === 'tomorrow' ? ' tomorrow' : ''}</div>` : ''}</button>`;
}

function editBlock(b, preset){
  const isNew = !b;
  const d = b ? JSON.parse(JSON.stringify(b)) : Object.assign({id:uid(), title:'', start:540, end:600, days:[schDay == null ? todayIdx() : schDay], color:BLOCK_COLORS[S.blocks.length % BLOCK_COLORS.length]}, preset);
  openSheet((s, sh) => {
    const c = d.days.length && d.start !== d.end ? clashes(d, d.id) : [];
    html(s, `<h2>${isNew ? 'New block' : 'Edit block'}</h2><label class="f">What</label><input class="text-in" id="bt" value="${esc(d.title)}" placeholder="e.g. School">
      <div class="grid2"><div><label class="f">Starts</label><input class="text-in" type="time" id="bs" value="${toHM(d.start)}"></div><div><label class="f">Ends</label><input class="text-in" type="time" id="be" value="${toHM(d.end)}"></div></div>
      <div class="muted small" style="margin-top:6px">${d.start === d.end ? 'Start and end are the same' : fmtLen(blockLen(d)) + (overnight(d) && d.end ? ' · ends the next day' : '')}</div>
      <label class="f">Days</label><div class="grid7">${WEEKDAYS.map((w, i) => `<button class="pill ${d.days.includes(i) ? 'on' : ''}" style="padding:0;min-height:44px;border-radius:12px;font-size:13px" data-day="${i}">${w}</button>`).join('')}</div>
      <div class="pills" style="margin-top:8px"><button class="pill" data-set="0123456">Every day</button><button class="pill" data-set="01234">Weekdays</button><button class="pill" data-set="56">Weekends</button></div>
      <label class="f">Colour</label><div class="row" style="gap:6px">${BLOCK_COLORS.map(x => `<button data-col="${x}" aria-label="Colour" style="flex:1;min-width:0;height:44px;border-radius:12px;background:${x};border:3px solid ${x === d.color ? 'var(--text)' : 'transparent'}"></button>`).join('')}</div>
      ${c.length ? `<div class="coach warn" style="margin-top:12px">⚠️ Overlaps ${[...new Set(c.map(x => x.title))].map(esc).join(', ')}</div>` : ''}
      <button class="primary wide" id="bok">Save</button>${isNew ? '' : '<button class="danger-link wide" id="bdel">Delete block</button>'}`);
    const g = q => s.querySelector(q);
    g('#bt').oninput = e => d.title = e.target.value;
    g('#bs').onchange = e => { const v = fromHM(e.target.value); if (v != null) d.start = v; sh.refresh(); };
    g('#be').onchange = e => { const v = fromHM(e.target.value); if (v != null) d.end = v; sh.refresh(); };
    on(s, '[data-day]', x => { const i = +x.dataset.day; d.days = d.days.includes(i) ? d.days.filter(y => y !== i) : d.days.concat(i); sh.refresh(); });
    on(s, '[data-set]', x => { d.days = x.dataset.set.split('').map(Number); sh.refresh(); });
    on(s, '[data-col]', x => { d.color = x.dataset.col; sh.refresh(); });
    on(s, '#bok', () => {
      if (!d.title.trim()) return toast('Name the block');
      if (!d.days.length) return toast('Pick at least one day');
      if (d.start === d.end) return toast('Start and end can\'t be the same');
      d.title = d.title.trim();
      if (b) Object.assign(b, d); else S.blocks.push(d);
      save(); closeSheet(); render();
    });
    on(s, '#bdel', () => {
      if (!confirm('Delete ' + b.title + ' from ' + daysLabel(b.days) + '?')) return;
      S.blocks = S.blocks.filter(x => x !== b); save(); closeSheet(); render();
    });
  });
}
function quickBlock(){
  const i = $('#schq'), v = i ? i.value.trim() : ''; if (!v) return toast('Type a block, e.g. School 6am to 4pm');
  const p = parseBlock(v); if (!p) return toast('Write it like: School 6am to 4pm');
  editBlock(null, p);   // the sheet asks which days
}
Object.assign(ACTIONS, {
  'sch-day': b => { schDay = +b.dataset.i; render(); },
  'sch-open': () => { schDay = todayIdx(); go('life', 'schedule'); },
  'sch-quick': quickBlock,
  'sch-new': () => editBlock(null),
  'sch-gap': b => editBlock(null, {start:+b.dataset.a, end:+b.dataset.b}),
  'sch-edit': b => { const x = S.blocks.find(y => y.id === b.dataset.id); if (x) editBlock(x); },
  'sch-tick': b => {
    const d = b.dataset.d, m = S.blockDone[d] = S.blockDone[d] || {};
    if (m[b.dataset.id]) delete m[b.dataset.id]; else m[b.dataset.id] = 1;
    if (!Object.keys(m).length) delete S.blockDone[d];
    save(); render();
  },
  'sch-copy': () => {
    const mine = S.blocks.filter(x => x.days.includes(schDay)); let pick = [];
    if (!mine.length) return toast('Nothing starts on ' + WEEKDAY_FULL[schDay]);
    openSheet((s, sh) => {
      html(s, `<h2>Copy ${WEEKDAY_FULL[schDay]} to…</h2><div class="muted small" style="margin:-8px 0 10px">Adds its blocks to these days. Whatever is already there stays.</div>
        <div class="grid7">${WEEKDAYS.map((w, i) => `<button class="pill ${pick.includes(i) ? 'on' : ''}" style="padding:0;min-height:44px;border-radius:12px;font-size:13px;${i === schDay ? 'opacity:.3' : ''}" ${i === schDay ? 'disabled' : ''} data-day="${i}">${w}</button>`).join('')}</div><button class="primary wide" id="ok">Copy</button>`);
      on(s, '[data-day]', x => { const i = +x.dataset.day; pick = pick.includes(i) ? pick.filter(y => y !== i) : pick.concat(i); sh.refresh(); });
      on(s, '#ok', () => { if (!pick.length) return toast('Pick a day'); mine.forEach(x => x.days = [...new Set(x.days.concat(pick))]); save(); closeSheet(); render(); toast('Copied'); });
    });
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'schq') { e.target.blur(); quickBlock(); } });
// keep "now" right without disturbing typing
setInterval(() => {
  if (typeof S === 'undefined' || !S || sheets.length || (typeof OB !== 'undefined' && OB) || document.hidden) return;
  if (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  const q = $('#schq'); if (q && q.value) return;
  if (tab === 'today' || viewKey() === 'life/schedule') render();
}, 60000);
