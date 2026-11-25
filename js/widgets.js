'use strict';
/* ================= home-screen widgets + health readings (Android app, shell 5+) =================
   Health readings are only held in memory here: they are never saved into S, so they never sync or go in a backup. */
const GN = window.GTNative && typeof window.GTNative.putWidgetData === 'function' ? window.GTNative : null;
let HL = null;   // latest health readings

function logStreak(){ let n = 0, d = today(); if (!dayEntries(d).length) d = dadd(d, -1); while (dayEntries(d).length) { n++; d = dadd(d, -1); } return n; }
function latestPRs(n){
  const best = {}, out = [];
  S.workouts.forEach(w => w.exercises.forEach(e => { const s = e.sets.slice().sort((a, b) => e1rm(b) - e1rm(a))[0]; if (!s) return; const v = e1rm(s); if (best[e.exId] != null && v > best[e.exId] * 1.001) out.push([exName(e.exId), fmtW(s.w) + ' × ' + s.r, w.start]); best[e.exId] = Math.max(best[e.exId] || 0, v); }));
  return out.slice(-n).reverse();
}
const clean = s => String(s || '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '').trim();
function widgetData(){
  const dk = today(), T = targetsOn(dk), {t} = dayTotals(dk), week = [6, 5, 4, 3, 2, 1, 0].map(i => dadd(dk, -i)), p = S.food.profile;
  const nx = nextProgramRoutine(), done = workoutsOn(dk), last = S.workouts[S.workouts.length - 1], R = computeRanks(), O = overallRank(R), b = weekBudget(), c = cardioS(), rec = recoveryMap();
  let workout = null;
  if (S.active) workout = {top:'In progress', n:S.active.name, sub:pl(S.active.exercises.length, 'exercise'), sub2:''};
  else if (done.length) workout = {top:'Done today', n:done[done.length - 1].name, sub:pl(setCount(done[done.length - 1]), 'set'), sub2:nx && nx.r ? 'Next: ' + nx.r.name : '', done:true};
  else if (nx && nx.r) workout = {top:nx.rest ? 'Rest day, next on ' + nx.on : nx.today ? 'Today' : 'Next up', n:nx.r.name, sub:pl(nx.r.items.length, 'exercise') + ' · about ' + Math.round(nx.r.items.reduce((a, i) => a + exMin(i.sets || 2, i), 5)) + ' min', sub2:nx.r.items.slice(0, 4).map(i => exName(i.exId)).join(', ')};
  let snacks = []; try { const old = snkTaste; snkTaste = 'any'; snacks = (snackPicks(dk).pages[0] || []).map(s => [s.n, Math.round(s.m[0]), Math.round(s.m[1])]); snkTaste = old; } catch(e) {}
  const days = h => { const o = {}; week.forEach(d => { if (h.days && h.days[d]) o[d] = 1; }); return o; };
  return {d:dk, at:Date.now(), accent:(THEMES[S.theme] || THEMES.lime)[1], age:p.age, maxHr:S.body.maxHr || 0, stepGoal:S.body.stepGoal || 10000, unit:S.unit,
    T:[T.kcal, T.protein, T.carbs, T.fat], t:[0, 1, 2, 3].map(i => r1(t[i])), meals:MEALS.map(([m, l]) => [l, Math.round(dayEntries(dk).filter(e => e.meal === m).reduce((a, e) => { const f = foodFromCache(e.key); return a + (f ? kcalOf(f, e.g) : 0); }, 0))]),
    nutr:NUTR.map((n, i) => ({k:n.k, l:n.l, u:n.u, g:n.g, r:rdiFor(n) || 0, v:Math.round(t[i] * 100) / 100, lim:!!n.limit})).filter(n => n.r > 0),
    water:S.body.water[dk] || 0, waterGoal:S.body.waterGoal, kcalD:week.map(d => [d, Math.round(dayTotals(d).t[0])]), protD:week.map(d => [d, Math.round(dayTotals(d).t[1])]), logStreak:logStreak(), snacks, budget:{total:b.total, past:Math.round(b.past)},
    workout, gymD:[...new Set(S.workouts.filter(w => w.start > Date.now() - 14 * 864e5).map(w => dkey(new Date(w.start))))], last:last ? {n:last.name, sets:setCount(last), vol:Math.round(volume(last) * F()), t:last.start} : null, prs:latestPRs(5),
    rank:O ? {n:TIERS[Math.max(0, O.tier)].n, f:O.avg - Math.floor(O.avg), next:TIERS[O.tier + 1] ? 'to ' + TIERS[O.tier + 1].n : 'top rank', c:TIERS[Math.max(0, O.tier)].c} : null,
    muscles:weekMuscleSets().slice(0, 12), recovery:Object.keys(rec).sort((x, y) => rec[y].left - rec[x].left).slice(0, 14).map(u => [REC_NAME(u), r1(rec[u].left), r1(rec[u].total)]), cardio:{min:Math.round(cardioWeek() + cardioMinNow()), goal:c.goal, on:!!c.on}, cut:caffCut(),
    weights:weightTrend().slice(-60).map(w => [w.d, Math.round(w.kg * 100) / 100]), habits:S.habits.map(h => ({id:h.id, n:clean(h.name), days:days(h), streak:habitStreak(h)})), supps:suppS().map(x => ({id:x.id, n:x.name + (x.dose ? ' ' + x.dose : ''), days:days(x), streak:0})),
    todos:S.todos.filter(x => !x.done).sort((x, y) => (x.due || '9').localeCompare(y.due || '9')).slice(0, 20).map(x => ({id:x.id, n:clean(x.text), due:x.due || '', done:false})),
    blocks:S.blocks.map(x => ({n:clean(x.title), s:x.start, e:x.end, days:x.days, c:x.color}))};
}
let wT = 0, wLast = '';
function pushWidgets(){
  clearTimeout(wT); if (!GN || typeof S === 'undefined' || !S || !S.user) return;
  try { const j = JSON.stringify(widgetData()), k = j.replace(/"at":\d+/, ''); if (k === wLast) return; wLast = k; GN.putWidgetData(j); } catch(e) { console.error(e); }
}
if (GN) {
  const prev = window.onSaved;
  window.onSaved = () => { if (prev) prev(); clearTimeout(wT); wT = setTimeout(pushWidgets, 1200); };
  window.saveNow = () => { save(); pushWidgets(); };
}
/** Water and ticks tapped on widgets while the app was closed. */
function takePending(){
  if (!GN) return;
  let l = []; try { l = JSON.parse(GN.takePending()); } catch(e) { return; }
  if (!l.length) return;
  l.forEach(x => {
    if (!/^\d{4}-\d\d-\d\d$/.test(x.d || '')) return;
    if (x.t === 'water') S.body.water[x.d] = Math.max(0, (S.body.water[x.d] || 0) + (+x.ml || 0));
    else if (x.t === 'habit') { const h = S.habits.find(y => y.id === x.id); if (h) { if (h.days[x.d]) delete h.days[x.d]; else h.days[x.d] = 1; } }
    else if (x.t === 'supp') { const h = suppS().find(y => y.id === x.id); if (h) tickSupp(h, x.d); }
    else if (x.t === 'todo') { const t = S.todos.find(y => y.id === x.id); if (t) completeTodo(t); }
  });
  save(); pushWidgets(); if (!busyScreen()) render();
}
function loadHealth(){ if (!GN) return; try { HL = JSON.parse(GN.health() || 'null'); } catch(e) { HL = null; } }
window.onHealth = () => { loadHealth(); const s = sheets[sheets.length - 1]; if (s && s.health) s.refresh(); else if (tab === 'today' && !busyScreen()) render(); };
window.onAppResume = () => { if (typeof S === 'undefined' || !S) return; takePending(); wLast = ''; pushWidgets(); };
/** A widget or reminder was tapped. */
window.onWidgetOpen = url => {
  const g = String(url), [a, b] = g.split('/');
  if (OB) return; while (sheets.length) closeSheet();
  if (g === 'add') { foodDate = today(); go('food', 'diary'); ACTIONS['food-add']({dataset:{meal:''}}); }
  else if (g === 'scan') { foodDate = today(); go('food', 'diary'); ACTIONS.scan(); }
  else if (['snacks', 'health', 'recovery', 'cardio', 'supps', 'caffeine'].includes(g)) { go('today'); ACTIONS[g]({dataset:{}}); }
  else if (Object.prototype.hasOwnProperty.call(TABS, a) && (b ? true : !TABS[a].subs) && (!b || (TABS[a].subs && TABS[a].subs.some(x => x[0] === b)))) { if (a === 'food') foodDate = today(); go(a, b); }
};

/* ---------- health screen ---------- */
const ZONES = [['Warm up', '#94a3b8'], ['Fat burn', '#60a5fa'], ['Cardio', '#a3e635'], ['Hard', '#fbbf24'], ['Peak', '#f87171']];
const maxHr = () => S.body.maxHr >= 100 ? S.body.maxHr : Math.round(208 - .7 * (S.food.profile.age || 25));
const zoneOf = v => { const f = v / maxHr(); return f < .5 ? -1 : Math.min(4, Math.floor((f - .5) * 10 + 1e-9)); };
const agoT = t => { const m = Math.floor((Date.now() - t) / 60000); return m < 2 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.floor(m / 60) + 'h ago' : Math.floor(m / 1440) + 'd ago'; };
const hmT = m => m >= 60 ? Math.floor(m / 60) + 'h ' + Math.round(m % 60) + 'm' : Math.round(m) + 'm';
function sleepSvg(s){
  const C = ['#fbbf24', '#60a5fa', '#c084fc', '#7c6be8'], L = ['Awake', 'REM', 'Light', 'Deep'], lane = t => t === 6 ? 1 : t === 5 ? 3 : [0, 2, 4].includes(t) ? 2 : 0, span = Math.max(1, (s.end - s.start) / 60000);
  if (!s.stages.length) return '<div class="muted small">No stages shared, only the total.</div>';
  return `<svg viewBox="0 0 340 128" style="width:100%">${L.map((l, i) => `<text x="0" y="${i * 28 + 18}" fill="#98a1b1" font-size="11">${l}</text><rect x="46" y="${i * 28 + 13.5}" width="294" height="1" fill="#2c313c"/>`).join('')}${s.stages.map(([a, b, t]) => `<rect x="${46 + 294 * a / span}" y="${lane(t) * 28 + 6}" width="${Math.max(1.5, 294 * (b - a) / span)}" height="16" rx="2" fill="${C[lane(t)]}"/>`).join('')}<text x="46" y="126" fill="#98a1b1" font-size="11">${fmtT(minOf(s.start))}</text><text x="340" y="126" text-anchor="end" fill="#98a1b1" font-size="11">${fmtT(minOf(s.end))}</text></svg>`;
}
const minOf = t => { const d = new Date(t); return d.getHours() * 60 + d.getMinutes(); };
function heartSvg(h){
  const lo = h.min - 5, hi = Math.max(h.max + 5, lo + 30), y = v => 110 - 106 * clamp((v - lo) / (hi - lo), 0, 1), m = maxHr(); let d = '', last = -99;
  h.pts.forEach(([t, v]) => { d += (t - last > 45 ? 'M' : 'L') + (28 + 312 * t / 1440).toFixed(1) + ',' + y(v).toFixed(1); last = t; });
  return `<svg viewBox="0 0 340 128" style="width:100%">${ZONES.map(([, c], z) => { const a = y(m * (.5 + .1 * z)), b = z === 4 ? 4 : y(m * (.6 + .1 * z)); return a > b ? `<rect x="28" y="${b}" width="312" height="${a - b}" fill="${c}" opacity=".15"/>` : ''; }).join('')}<path d="${d}" fill="none" stroke="#f87171" stroke-width="1.8" stroke-linecap="round"/><text x="0" y="12" fill="#98a1b1" font-size="11">${h.max}</text><text x="0" y="110" fill="#98a1b1" font-size="11">${h.min}</text>${[0, 6, 12, 18].map(x => `<text x="${28 + 13 * x}" y="126" fill="#98a1b1" font-size="11">${fmtT(x * 60)}</text>`).join('')}</svg>`;
}
ACTIONS.health = () => {
  const sh = openSheet(s => {
    html(s, '<h2>Health</h2>');
    const st = GN ? GN.healthState() : 'none';
    if (st === 'none') return html(s, `<div class="empty">${window.WEB_VERSION ? 'Steps, sleep and heart rate need the Android app.' : 'Install the newest Android app to connect your strap.'}</div>`);
    if (st === 'old') return html(s, '<div class="empty">This needs Android 14 or newer, where Health Connect is built in.</div>');
    if (st === 'ask') { html(s, `<div class="card"><b>Connect your strap</b><div class="muted small" style="margin-top:6px;line-height:1.7">1. In Zepp: Profile → 3rd-party account linking → Health Connect, turn everything on.<br>2. Tap Connect here and allow everything.<br><br>The app only reads. Readings stay on this phone: they aren't uploaded, synced or shown to friends.</div><button class="primary wide" data-c>Connect</button><button class="ghost wide" data-m>Nothing happens? Open Health Connect</button></div>`); on(s, '[data-c]', () => GN.healthAsk()); return on(s, '[data-m]', () => GN.healthManage()); }
    const H = HL || {}, fresh = H.d === today(), z = fresh && H.zones ? H.zones : [0, 0, 0, 0, 0], g = S.body.stepGoal || 10000;
    html(s, `<div class="stat-grid"><div class="stat"><div class="v">${fresh && H.steps != null ? fmtNum(H.steps) : '–'}</div><div class="l">Steps of ${fmtNum(g)}</div></div><div class="stat"><div class="v" style="color:#f87171">${H.hr ? H.hr.v : '–'}</div><div class="l">${H.hr ? ['Resting'].concat(ZONES.map(x => x[0]))[zoneOf(H.hr.v) + 1] + ' · ' + agoT(H.hr.t) : 'Heart rate'}</div></div>
      <div class="stat"><div class="v">${H.sleep ? hmT(H.sleep.asleep) : '–'}</div><div class="l">Sleep</div></div><div class="stat"><div class="v">${hmT(z[2] + z[3] + z[4])}</div><div class="l">Cardio zone+</div></div></div>`);
    if (H.sleep) html(s, `<div class="card"><div class="item"><b>Sleep</b><span class="muted small">${dlabel(dkey(new Date(H.sleep.end)))}</span></div>${sleepSvg(H.sleep)}</div>`);
    if (H.hr && fresh && H.hr.pts.length) html(s, `<div class="card"><b>Heart rate today</b>${heartSvg(H.hr)}</div>`);
    html(s, `<div class="card"><b>Zone minutes today</b>${ZONES.map(([l, c], i) => `<div class="bar"><div class="lbl"><span>${l} <span class="muted">${Math.ceil(maxHr() * (.5 + .1 * i))}${i === 4 ? '+' : '–' + (Math.ceil(maxHr() * (.6 + .1 * i)) - 1)} bpm</span></span><span class="muted">${hmT(z[i])}</span></div><div class="track"><i style="width:${z[i] / Math.max(1, ...z) * 100}%;background:${c}"></i></div></div>`).reverse().join('')}</div>
      ${[['rest', 'Resting heart rate', 'bpm'], ['hrv', 'HRV', 'ms'], ['spo2', 'Blood oxygen', '%']].filter(([k]) => H[k]).map(([k, l, u]) => `<div class="item small" style="padding:8px 0;border-bottom:1px solid var(--line)"><span>${l}</span><span>${r1(H[k].v)} ${u} <span class="muted">${agoT(H[k].t)}</span></span></div>`).join('')}
      <div class="muted small" style="margin:10px 0">${H.at ? 'Read ' + agoT(H.at) + '. ' : ''}Numbers arrive when Zepp syncs, so open Zepp if they look old.${GN.healthBackground() ? ' Widgets refresh about every 30 minutes.' : ' Background reading is off, so health widgets refresh when you open this app.'}</div>
      <button class="secondary wide" data-r>Refresh</button><button class="ghost wide" data-g>Step goal</button><button class="ghost wide" data-h>Max heart rate (${maxHr()})</button><button class="ghost wide" data-m>Permissions</button>${GN.widgetKinds ? '<button class="primary wide" data-w>Add widgets</button>' : ''}`);
    on(s, '[data-r]', () => { GN.healthRefresh(); toast('Reading…'); }); on(s, '[data-m]', () => GN.healthManage()); on(s, '[data-w]', () => { closeSheet(); ACTIONS.widgets(); });
    on(s, '[data-g]', () => ask('Step goal', [{k:'n', label:'Steps a day', v:g, type:'number'}], o => { if (!(o.n >= 500 && o.n <= 100000)) return false; S.body.stepGoal = Math.round(o.n); save(); sh.refresh(); }));
    on(s, '[data-h]', () => ask('Max heart rate', [{k:'n', label:'Beats a minute. Empty = worked out from your age', v:S.body.maxHr || '', type:'number'}], o => { if (o.n != null && !(o.n >= 120 && o.n <= 230)) { toast('Between 120 and 230'); return false; } S.body.maxHr = o.n || 0; save(); pushWidgets(); GN.healthRefresh(); sh.refresh(); }));
  }, {full:true});
  sh.health = true;
  if (GN) { loadHealth(); if (GN.healthState() === 'ok') GN.healthRefresh(); }
};
function healthCard(){
  if (!GN) return '';
  const st = GN.healthState(); if (st === 'old') return '';
  if (st === 'ask') return '<button class="card tap" style="color:var(--text)" data-act="health"><b>⌚ Connect your strap</b><div class="muted small">Steps, sleep and heart rate, through Health Connect.</div></button>';
  const H = HL || {}, f = H.d === today();
  return `<button class="card tap" style="color:var(--text)" data-act="health"><div class="hrow"><span><b>${f && H.steps != null ? fmtNum(H.steps) : '–'}</b><i>steps</i></span><span><b>${H.hr ? H.hr.v : '–'}</b><i>${H.hr ? ['resting'].concat(ZONES.map(x => x[0].toLowerCase()))[zoneOf(H.hr.v) + 1] : 'bpm'}</i></span><span><b>${H.sleep && Date.now() - H.sleep.end < 36 * 36e5 ? hmT(H.sleep.asleep) : '–'}</b><i>sleep</i></span></div></button>`;
}

/* ---------- widget gallery ---------- */
ACTIONS.widgets = () => {
  if (!GN || !GN.widgetKinds) return;
  const K = JSON.parse(GN.widgetKinds()), G = [['Health', k => k[5] === 'health'], ['Food', k => /^food|^snacks$/.test(k[5]) || ['cutoff', 'water', 'waterring', 'supps'].includes(k[0])], ['Gym', k => /^gym|recovery|cardio/.test(k[5])], ['Life', () => true]];
  openSheet(s => {
    const used = new Set(); html(s, `<h2>Widgets</h2><div class="muted small" style="margin:-8px 0 8px">Tap one to add it. Press and hold it on your home screen to resize.</div>`);
    G.forEach(([n, fn]) => { const l = K.filter(k => !used.has(k[0]) && fn(k)); l.forEach(k => used.add(k[0])); html(s, `<div class="sec">${n} (${l.length})</div><div class="wgrid">${l.map(k => `<button data-k="${k[0]}" class="${+k[3] > 2 ? 'wide2' : ''}"><img src="file:///android_res/drawable/p_${k[0]}.png" alt="" loading="lazy" onerror="this.remove()"><b>${esc(k[1])}</b></button>`).join('')}</div>`); });
    on(s, '[data-k]', b => { pushWidgets(); if (!GN.pinWidget(b.dataset.k)) toast('Hold your home screen, then Widgets → Gym Tracker'); });
  }, {full:true});
};
