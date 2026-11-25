'use strict';
/* ================= gym extras: warm-ups, reps in reserve, plateaus, deloads, short sessions, cardio, recovery ================= */

/* ---------- warm-up sets ---------- */
const roundW = kg => { const f = F(), step = S.unit === 'lb' ? 5 : 2.5; return Math.max(0, Math.round(kg * f / step) * step) / f; };
function warmupSets(kg){
  if (!(kg > 0)) return [];
  const plan = kg < 25 ? [[.6, 8]] : kg < 60 ? [[.5, 8], [.75, 4]] : [[.4, 8], [.6, 5], [.8, 2]];
  const out = [];
  plan.forEach(([p, r]) => { const w = roundW(kg * p); if (w > 0 && w < kg && !out.some(x => x[0] === w)) out.push([w, r]); });
  return out;
}
ACTIONS.warmup = b => {
  const e = S.active && S.active.exercises[+b.dataset.i]; if (!e) return;
  const typed = e.sets.find(s => s.w != null), prev = lastSetsFor(e.exId) || [];
  let kg = typed ? typed.w : prev.length ? Math.max(...prev.map(s => s.w || 0)) : 0;
  openSheet((s, sh) => {
    const list = warmupSets(kg);
    html(s, `<h2>Warm up: ${esc(exName(e.exId))}</h2><label class="f">Working weight (${S.unit})</label><input class="text-in" id="wuw" inputmode="decimal" value="${kg ? fmtW(kg) : ''}">
      <div id="wul">${list.length ? list.map(([w, r], i) => `<div class="card item"><span class="muted">Warm-up ${i + 1}</span><b>${fmtW(w)} ${S.unit} × ${r}</b></div>`).join('') + `<div class="card item"><span class="muted">Then</span><b style="color:var(--accent)">${fmtW(kg)} ${S.unit}, working sets</b></div>` : '<div class="empty">Type the weight you\'re working up to. Very light lifts don\'t need a ramp.</div>'}</div>
      <div class="muted small">Stay well away from failure on these, and rest about a minute. They don't get logged.</div>`);
    const i = s.querySelector('#wuw'); i.onchange = () => { kg = parseW(i.value) || 0; sh.refresh(); };
  });
};

/* ---------- reps in reserve ---------- */
ACTIONS.rir = b => { const s = S.active.exercises[+b.dataset.i].sets[+b.dataset.j]; s.rir = b.dataset.v === '' ? null : +b.dataset.v; if (s.rir == null) delete s.rir; save(); render(); };
function rirRow(s, i, j){
  if (!s.done || S.rirOff) return '';
  if (s.rir != null) return `<button class="ghost small" style="min-height:44px;padding:0 0 0 42px" data-act="rir" data-i="${i}" data-j="${j}" data-v="">${s.rir >= 4 ? '4+' : s.rir} left in the tank · change</button>`;
  return `<div class="rir"><span class="muted small">Reps left?</span>${[0, 1, 2, 3, 4].map(v => `<button data-act="rir" data-i="${i}" data-j="${j}" data-v="${v}">${v === 4 ? '4+' : v}</button>`).join('')}</div>`;
}

/* ---------- plateaus ---------- */
const bestOf = sets => Math.max(0, ...sets.map(e1rm));
/** Stuck: your last 3 sessions on a lift all failed to beat the one before them (within the last 6 weeks). */
function plateau(exId){
  const ss = sessionsFor(exId); if (ss.length < 4) return null;
  const l = ss.slice(-4), ref = bestOf(l[0].sets);
  if (!(ref > 0) || l[0].t < Date.now() - 42 * 864e5) return null;
  if (!l.slice(1).every(x => bestOf(x.sets) <= ref * 1.002)) return null;
  const last = l[3].sets, rir = last.map(s => s.rir).filter(v => v != null), drop = bestOf(last) < ref * .96;
  const gaps = l.slice(1).map((x, i) => (x.t - l[i].t) / 864e5), often = Math.min(...gaps) < 2, seldom = gaps.reduce((a, b) => a + b, 0) / 3 > 9;
  const T = S.food.targets, days = [1, 2, 3, 4, 5, 6, 7].map(n => dayTotals(dadd(today(), -n)).t).filter(t => t[0] > 600);
  const lowP = days.length >= 3 && days.reduce((a, t) => a + t[1], 0) / days.length < T.protein * .8;
  const fix = [];
  if (rir.length && Math.min(...rir) >= 2) fix.push('You\'re stopping with ' + Math.min(...rir) + '+ reps left. Take the last set to 0 or 1.');
  if (often) fix.push('You\'ve hit it again inside 2 days. Give it at least one more day.');
  if (seldom) fix.push('You only hit it every ' + Math.round(gaps.reduce((a, b) => a + b, 0) / 3) + ' days. Once every 4 to 7 works better.');
  if (lowP) fix.push('Protein has been under 80% of your target this week.');
  if (drop) fix.push('It\'s going down, not just flat: drop the weight 10% and build back up.');
  if (!fix.length) fix.push('Drop 5 to 10% and own the top of the rep range, or swap to another movement for the same muscle for a few weeks.');
  return fix;
}
const plateauHint = e => { const p = plateau(e.exId); return p ? `<div class="coach warn">Stuck for 3 sessions. ${esc(p[0])}${p.length > 1 ? `<br>${esc(p[1])}` : ''}</div>` : ''; };
function stuckLifts(){ return S.exercises.filter(e => !e.hidden).map(e => [e, plateau(e.id)]).filter(x => x[1]); }

/* ---------- deload ---------- */
/** Several lifts down 3%+ on their recent best, in the last 8 days. */
function tiredLifts(){
  const out = [], since = Date.now() - 8 * 864e5; let seen = 0;
  S.exercises.forEach(e => {
    const ss = sessionsFor(e.id); if (ss.length < 3) return;
    const l = ss[ss.length - 1]; if (l.t < since) return;
    seen++;
    const ref = Math.max(...ss.slice(-4, -1).map(x => bestOf(x.sets)));
    if (ref > 0 && bestOf(l.sets) < ref * .97) out.push(e.name);
  });
  return out.length >= 3 && out.length >= seen * .4 ? out : [];
}
const deloadOn = () => S.deload && S.deload.until >= today();
function deloadCard(){
  if (deloadOn()) return `<div class="card"><div class="item"><b>Easy week</b><button class="ghost" data-act="deload-off">End it</button></div><div class="muted small">Until ${dlabel(S.deload.until)}: one set fewer, about 10% lighter, 3 reps left in the tank. Back to normal after.</div></div>`;
  const t = tiredLifts(); if (!t.length || (S.deload && S.deload.skip >= today())) return '';
  return `<div class="card" style="border:1px solid var(--gold)"><b>${t.length} lifts dropped at once</b><div class="muted small">${esc(t.slice(0, 4).join(', '))}${t.length > 4 ? ' and more' : ''}. That's usually tiredness, not lost muscle. Check sleep and food first, or take an easy week.</div>
    <div class="quick" style="margin-top:8px"><button class="primary" data-act="deload-on">Easy week</button><button class="secondary" data-act="deload-skip">Not now</button></div></div>`;
}
ACTIONS['deload-on'] = () => { S.deload = {until:dadd(today(), 6)}; save(); render(); toast('Easy week on until ' + dlabel(S.deload.until)); };
ACTIONS['deload-off'] = () => { S.deload = {until:'', skip:dadd(today(), 13)}; save(); render(); };
ACTIONS['deload-skip'] = () => { S.deload = {until:'', skip:dadd(today(), 6)}; save(); render(); };

/* ---------- short on time ---------- */
const exMin = (n, e) => 1.5 + n * ((e.rest || 120) + 45) / 60;
function shortPlan(list, mins){
  // order = priority. One set each until time runs out, then second and third sets back in the same order.
  const n = list.map(() => 0); let t = 0;
  list.forEach((e, i) => { const c = exMin(1, e); if (t + c <= mins || !t) { n[i] = 1; t += c; } });
  for (let round = 2; round <= 6; round++) list.forEach((e, i) => { if (!n[i] || n[i] >= e.sets.length) return; const c = exMin(n[i] + 1, e) - exMin(n[i], e); if (n[i] === round - 1 && t + c <= mins) { n[i]++; t += c; } });
  return {n, t};
}
ACTIONS.short = () => {
  const a = S.active; if (!a) return;
  const left = a.exercises.filter(e => !e.sets.some(s => s.done));
  openSheet((s, sh) => {
    html(s, `<h2>Short on time</h2><div class="muted small" style="margin:-8px 0 10px">Keeps the first lifts, cuts extra sets, then drops what doesn't fit. Anything you've started stays. You can put it all back.</div>` +
      [20, 30, 40].map(m => { const p = shortPlan(left, m); return `<button class="pick" data-m="${m}"><span><b>${m} minutes</b><div class="muted small">${left.map((e, i) => p.n[i] ? esc(exName(e.exId)) + ' × ' + p.n[i] : '').filter(Boolean).join(', ') || 'Nothing left to cut'}</div></span><span class="muted">›</span></button>`; }).join('') +
      (a.cut ? '<button class="secondary wide" data-back>Put everything back</button>' : ''));
    on(s, '[data-m]', x => {
      const p = shortPlan(left, +x.dataset.m), keep = JSON.parse(JSON.stringify(a.exercises.map(e => [e.exId, e.sets.length])));
      const old = a.cut || JSON.parse(JSON.stringify(a.exercises));
      left.forEach((e, i) => { e.sets = e.sets.slice(0, p.n[i]); });
      a.exercises = a.exercises.filter(e => e.sets.length);
      a.cut = old; save(); closeSheet(); render(); toast('Cut to about ' + Math.round(p.t) + ' minutes');
    });
    on(s, '[data-back]', () => {
      // what you've logged since wins; everything cut comes back
      const now = a.exercises, out = [];
      a.cut.forEach(o => { const c = now.find(e => e.exId === o.exId); if (!c) return out.push(o); c.sets = c.sets.concat(o.sets.slice(c.sets.length)); out.push(c); });
      now.forEach(e => { if (!out.includes(e)) out.push(e); });
      a.exercises = out; delete a.cut; save(); closeSheet(); render();
    });
  });
};

/* ---------- cardio timer ---------- */
const CARDIO_TYPES = ['Walk', 'Incline walk', 'Run', 'Bike', 'Rower', 'Stairs', 'Cross trainer', 'Swim', 'Sport', 'Other'];
const weekStart = () => dadd(today(), -todayIdx());
function cardioS(){ const c = S.cardio = S.cardio || {}; c.goal = c.goal || 150; c.log = c.log || []; if (c.on === undefined) c.on = null; return c; }
function cardioWeek(from){ const a = from || weekStart(), b = dadd(a, 6); return cardioS().log.filter(x => x.d >= a && x.d <= b).reduce((s, x) => s + x.min, 0); }
function cardioMinNow(){ const c = cardioS(); return c.on ? Math.max(0, (Date.now() - c.on - (c.paused || 0)) / 60000) : 0; }
function cardioCard(){
  const c = cardioS(), w = cardioWeek() + cardioMinNow();
  return `<div class="card"><div class="item"><b>🫀 Cardio this week</b><button class="ghost" data-act="cardio">${Math.round(w)} / ${c.goal} min</button></div>
    <div class="track" style="margin:6px 0 10px"><i style="width:${clamp(w / c.goal * 100, 0, 100)}%;background:var(--c)"></i></div>
    ${c.on ? `<button class="danger-btn" style="width:100%" data-act="cardio-stop">Stop · <span class="cardio-t">${cardioClock()}</span></button>` : '<button class="secondary" style="width:100%" data-act="cardio-start">Start cardio</button>'}</div>`;
}
function cardioClock(){ const s = Math.floor(cardioMinNow() * 60); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
setInterval(() => { document.querySelectorAll('.cardio-t').forEach(t => t.textContent = cardioClock()); }, 1000);
ACTIONS['cardio-start'] = () => { const c = cardioS(); if (!c.on) { c.on = Date.now(); save(); } render(); };
ACTIONS['cardio-stop'] = () => {
  const c = cardioS(); if (!c.on) return;
  let min = Math.round(cardioMinNow());
  if (min < 1) { c.on = null; save(); render(); return toast('Under a minute, not saved'); }
  const start = c.on; c.on = null; save(); render();
  const long = min > 180;
  ask('Cardio done', [{k:'min', label:long ? 'Minutes (the timer ran for ' + min + '. Did you forget to stop it?)' : 'Minutes', v:long ? '' : min, type:'number'}, {k:'type', label:'What was it?', v:c.last || 'Walk', type:'select', opts:CARDIO_TYPES.map(x => [x, x])}], o => {
    if (!(o.min > 0 && o.min < 1000)) { toast('Type the minutes'); return false; }
    c.log.push({id:uid(), d:dkey(new Date(start)), start, min:Math.round(o.min), type:o.type}); c.last = o.type; save(); render(); toast(Math.round(o.min) + ' min saved');
  });
  // closing the panel without saving still keeps the time
  const sh = sheets[sheets.length - 1], n = c.log.length;
  sh.onClose = () => { if (c.log.length === n && !long) { c.log.push({id:uid(), d:dkey(new Date(start)), start, min, type:c.last || 'Walk'}); save(); render(); } };
};
ACTIONS.cardio = () => openSheet((s, sh) => {
  const c = cardioS(), w = cardioWeek() + cardioMinNow();
  html(s, `<h2>Cardio</h2><div class="stat-grid"><div class="stat"><div class="v">${Math.round(w)} min</div><div class="l">This week of ${c.goal}</div></div><div class="stat"><div class="v">${Math.round(cardioWeek(dadd(weekStart(), -7)))} min</div><div class="l">Last week</div></div></div>
    <button class="${c.on ? 'danger-btn' : 'primary'} wide" data-x="t">${c.on ? 'Stop · <span class="cardio-t">' + cardioClock() + '</span>' : 'Start cardio'}</button>
    <button class="secondary wide" data-x="add">＋ Add one I already did</button><button class="ghost wide" data-x="goal">Change weekly goal</button>
    <div class="muted small" style="margin-top:8px">The NHS suggests 150 minutes of moderate activity a week, or 75 hard. The week starts on Monday.</div>
    <div class="sec">Log</div>` + (c.log.length ? c.log.slice().sort((a, b) => b.start - a.start).slice(0, 40).map(x => `<div class="item small" style="border-bottom:1px solid var(--line)"><span>${dlabel(x.d)} · ${esc(x.type)}</span><span>${x.min} min <button class="icon" data-del="${x.id}" aria-label="Delete">✕</button></span></div>`).join('') : '<div class="muted small">Nothing yet.</div>'));
  on(s, '[data-x="t"]', () => { closeSheet(); ACTIONS[c.on ? 'cardio-stop' : 'cardio-start'](); });
  on(s, '[data-x="goal"]', () => ask('Weekly cardio goal', [{k:'m', label:'Minutes', v:c.goal, type:'number'}], o => { if (!(o.m >= 5 && o.m <= 3000)) return false; c.goal = Math.round(o.m); save(); sh.refresh(); render(); }));
  on(s, '[data-x="add"]', () => ask('Add cardio', [{k:'min', label:'Minutes', v:'', type:'number'}, {k:'type', label:'What was it?', v:c.last || 'Walk', type:'select', opts:CARDIO_TYPES.map(x => [x, x])}, {k:'d', label:'Date', v:today(), type:'date'}], o => {
    if (!(o.min > 0 && o.min < 1000)) { toast('Type the minutes'); return false; }
    c.log.push({id:uid(), d:o.d || today(), start:dparse(o.d || today()).getTime() + 12 * 36e5, min:Math.round(o.min), type:o.type}); c.last = o.type; save(); sh.refresh(); render();
  }));
  on(s, '[data-del]', x => { if (!confirm('Delete this one?')) return; c.log = c.log.filter(y => y.id !== x.dataset.del); save(); sh.refresh(); render(); });
});

/* ---------- recovery ---------- */
const POOL_UNIT = {triOverhead:'triceps', triNormal:'triceps', lowerBack:'lowerback'};
const unitOfPool = p => POOL_UNIT[p] || p;
const REC_NAME = u => UNITS[u] || POOL_NAMES[u] || u;
const REC_KEYS = u => MUSCLE_KEYS[u] || POOL_KEYS[u] || [];
const SMALL_U = ['calves', 'abs', 'obliques', 'sideDelt', 'rearDelt', 'frontDelt', 'brachio', 'flexors', 'extensors', 'neck', 'tibialis', 'abductors', 'adductors', 'traps', 'biceps', 'triceps'];
let exUnitCache = {};
function exUnits(name){
  if (exUnitCache[name]) return exUnitCache[name];
  const u = new Set(); Object.keys(POOLS).forEach(p => { if (poolOf(p).some(o => o[0] === name)) u.add(unitOfPool(p)); });
  const ex = S.exercises.find(e => e.name === name); if (ex) (ex.pools || []).forEach(p => u.add(unitOfPool(p)));
  return exUnitCache[name] = [...u];
}
/** Hours a muscle needs after a session: 36 small / 48 big for 1-2 hard sets, more sets or sets to failure push it up. A rule of thumb. */
function recoverHours(u, sets, toFail){ return Math.min(84, (SMALL_U.includes(u) ? 36 : 48) + Math.max(0, sets - 2) * 5 + (toFail ? 4 : 0)); }
/** {unit: {left, total, sets, t}} for everything trained in the last 5 days. */
function recoveryMap(now){
  now = now || Date.now(); exUnitCache = {};
  const out = {}, put = (u, t, total, sets) => { const left = total - (now - t) / 36e5; if (!out[u] || left > out[u].left) out[u] = {left:Math.max(0, left), total, sets, t}; };
  S.workouts.forEach(w => {
    const t = w.end || w.start; if (t < now - 5 * 864e5 || t > now + 36e5) return;
    const n = {}, fail = {};
    w.exercises.forEach(e => exUnits(exName(e.exId)).forEach(u => { n[u] = (n[u] || 0) + e.sets.length; if (e.sets.some(s => s.rir === 0)) fail[u] = 1; }));
    Object.keys(n).forEach(u => {
      put(u, t, recoverHours(u, n[u], fail[u]), n[u]);
      Object.keys(INDIRECT[u] || {}).forEach(v => { if (!n[v]) put(v, t, 24, 0); });
    });
  });
  return out;
}
const recPct = r => r ? clamp(1 - r.left / r.total, 0, 1) : 1;
const recCol = p => p >= .999 ? '#4ade80' : p > .66 ? '#a3e635' : p > .33 ? '#fbbf24' : '#f87171';
function recoveryFill(R){
  const by = {}; Object.keys(R).forEach(u => REC_KEYS(u).forEach(k => { const p = recPct(R[u]); if (by[k] === undefined || p < by[k]) by[k] = p; }));
  return k => by[k] === undefined ? '#2b303b' : recCol(by[k]);
}
const leftText = h => h < 1 ? 'Ready' : h >= 24 ? (r1(h / 24) === 1 ? '1 day' : r1(h / 24) + ' days') : Math.round(h) + ' h';
function recoveryCard(){
  const R = recoveryMap(), tired = Object.keys(R).filter(u => R[u].left >= 1).sort((a, b) => R[b].left - R[a].left);
  if (!Object.keys(R).length) return '';
  const f = recoveryFill(R);
  return `<button class="card tap" style="color:var(--text)" data-act="recovery"><div class="row"><div class="mini-body" style="height:110px">${bodySvg(BODY_FRONT, f, false)}${bodySvg(BODY_BACK, f, false)}</div><span class="grow"><b>Recovery</b>
    <div class="muted small">${tired.length ? tired.slice(0, 4).map(u => esc(REC_NAME(u)) + ': ' + leftText(R[u].left)).join('<br>') : 'Everything is ready to train.'}</div></span></div></button>`;
}
ACTIONS.recovery = () => openSheet(s => {
  const R = recoveryMap(), f = recoveryFill(R), list = Object.keys(R).sort((a, b) => R[b].left - R[a].left), nx = nextProgramRoutine();
  html(s, `<h2>Recovery</h2><div class="bodies"><div><div class="muted tiny" style="text-align:center">FRONT</div>${bodySvg(BODY_FRONT, f, false)}</div><div><div class="muted tiny" style="text-align:center">BACK</div>${bodySvg(BODY_BACK, f, false)}</div></div>
    <div class="chips" style="justify-content:center">${[['Just trained', 0], ['Getting there', .5], ['Nearly', .8], ['Ready', 1]].map(([l, p]) => `<span class="chip" style="color:${recCol(p)}">● ${l}</span>`).join('')}<span class="chip">● Not trained lately</span></div>`);
  if (nx && nx.r) {
    const us = [...new Set([].concat(...nx.r.items.map(i => exUnits(exName(i.exId)))))], bad = us.filter(u => R[u] && R[u].left >= 8 && R[u].sets);
    html(s, `<div class="coach ${bad.length ? 'warn' : 'up'}" style="margin-top:10px">${bad.length ? esc(nx.r.name) + ' hits ' + esc(bad.map(REC_NAME).join(', ').toLowerCase()) + ', which could use longer.' : 'Good to go for ' + esc(nx.r.name) + '.'}</div>`);
  }
  html(s, list.length ? list.map(u => { const r = R[u], p = recPct(r); return `<div class="bar"><div class="lbl"><span>${esc(REC_NAME(u))}</span><span class="muted">${r.left < 1 ? 'Ready' : 'ready in ' + leftText(r.left)}${r.sets ? ' · ' + pl(r.sets, 'set') : ' · helped out'}</span></div><div class="track"><i style="width:${p * 100}%;background:${recCol(p)}"></i></div></div>`; }).join('') : '<div class="empty">No workouts in the last 5 days.</div>');
  html(s, '<div class="muted tiny" style="margin-top:12px">A rule of thumb: small muscles about 36 hours, big ones about 48, longer with more sets or sets to failure. How you feel beats this.</div>');
}, {full:true});

/* ---------- sets per muscle this week (for the widget) ---------- */
function weekMuscleSets(){
  const a = dparse(weekStart()).getTime(), n = {}; exUnitCache = {};
  S.workouts.forEach(w => { if (w.start < a) return; w.exercises.forEach(e => { const u = exUnits(exName(e.exId)); u.forEach(x => n[x] = (n[x] || 0) + e.sets.length); }); });
  return Object.entries(n).sort((x, y) => y[1] - x[1]).map(([u, v]) => [REC_NAME(u), v]);
}
