'use strict';
/* ================= core: data, helpers, navigation ================= */
const KEY = 'gymtracker.v1';
const VIEWS = {};    // 'tab/sub' -> {render(), after(), title}
const ACTIONS = {};  // data-act handlers (main page)
const FIELDS = {};   // data-field handlers (main page inputs/selects)
const TABS = {
  today:   {title:'Today', subs:null},
  food:    {title:'Food', subs:[['diary','Diary'],['nutrients','Nutrients'],['mine','My foods']]},
  recipes: {title:'Recipes', subs:[['browse','Recipes'],['prep','Meal prep']]},
  gym:     {title:'Gym', subs:[['workout','Workout'],['ranks','Ranks'],['history','History'],['progress','Progress'],['routines','Routines']]},
  life:    {title:'Life', subs:[['todo','To-do'],['schedule','Schedule'],['habits','Habits'],['body','Body']]}
};
let tab = 'today';
const sub = {food:'diary', recipes:'browse', gym:'workout', life:'todo'};

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pl = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
const fmtNum = n => Math.round(n).toLocaleString();
const r1 = n => Math.round(n * 10) / 10;
const money = n => '£' + (Math.round(n * 100) / 100).toFixed(2);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : null; };

/* dates as local YYYY-MM-DD */
function dkey(d){ d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
const today = () => dkey();
function dparse(k){ const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
function dadd(k, n){ const d = dparse(k); d.setDate(d.getDate() + n); return dkey(d); }
function dlabel(k){
  const t = today();
  if (k === t) return 'Today';
  if (k === dadd(t, -1)) return 'Yesterday';
  if (k === dadd(t, 1)) return 'Tomorrow';
  return dparse(k).toLocaleDateString(undefined, {weekday:'short', day:'numeric', month:'short'});
}
const fmtDate = t => new Date(t).toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'});
const fmtShort = t => new Date(t).toLocaleDateString(undefined, {month:'short', day:'numeric'});

/* ---------- state ---------- */
function defaults(d){
  d.v = 2;
  d.unit = d.unit || 'kg';
  d.exercises = d.exercises || [];
  d.routines = d.routines || [];
  d.workouts = d.workouts || [];
  if (d.active === undefined) d.active = null;
  d.food = d.food || {};
  const f = d.food;
  f.log = f.log || {};
  f.cache = f.cache || {};
  f.mine = f.mine || [];
  f.recent = f.recent || [];
  f.targets = f.targets || {kcal:2400, protein:160, carbs:250, fat:75};
  f.profile = f.profile || {sex:'m', age:25, height:178, weight:78, activity:1.55, goal:'maintain'};
  d.myRecipes = d.myRecipes || [];
  d.priceEdit = d.priceEdit || {};
  d.plan = d.plan || {items:[], got:{}};
  d.todos = d.todos || [];
  d.habits = d.habits || [];
  d.body = d.body || {};
  d.body.weights = d.body.weights || [];
  d.body.water = d.body.water || {};
  d.body.sleep = d.body.sleep || {};
  d.body.waterGoal = d.body.waterGoal || 2500;
  d.blocks = d.blocks || [];
  d.blockDone = d.blockDone || {};
  if (d.user === undefined) d.user = null;
  if (d.program === undefined) d.program = null;
  return d;
}
function load(){
  let d = null;
  try { d = JSON.parse(localStorage.getItem(KEY)); } catch(e) {}
  if (!d || !Array.isArray(d.exercises)) d = seedGym();
  addMissingExercises(d);
  return defaults(d);
}
let S;  // assigned in main.js after gym.js defines seedGym()
let saveT = 0;
function save(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e) { toast('Could not save! Storage full?'); } if (window.onSaved) window.onSaved(); }
window.saveNow = save;

function toast(msg){
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ---------- sheets (bottom panels) ---------- */
const sheets = [];
function openSheet(build, opts){
  opts = opts || {};
  const el = document.createElement('div');
  el.className = 'sheet-wrap';
  el.innerHTML = '<div class="sheet-bg"></div><div class="sheet' + (opts.full ? ' full' : '') + '"></div>';
  document.body.appendChild(el);
  const s = {el, body: el.querySelector('.sheet')};
  s.refresh = () => { const y = s.body.scrollTop; s.body.innerHTML = '<div class="grab"></div>' + (window.WEB_VERSION ? '<button class="icon sheet-x" aria-label="Close">✕</button>' : ''); build(s.body, s); s.body.scrollTop = y;
    const x = s.body.querySelector('.sheet-x'); if (x) x.onclick = () => closeSheet(); };
  el.querySelector('.sheet-bg').onclick = () => closeSheet();
  sheets.push(s); s.refresh();
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('open')));
  return s;
}
function closeSheet(){
  const s = sheets.pop(); if (!s) return;
  s.el.classList.remove('open'); setTimeout(() => s.el.remove(), 230);
  if (s.onClose) s.onClose();
}
function html(el, h){ el.insertAdjacentHTML('beforeend', h); }
function on(root, sel, fn){ root.querySelectorAll(sel).forEach(b => b.onclick = e => fn(b, e)); }
function ask(title, fields, onOk, okLabel){
  // fields: [{k, label, v, type:'text'|'number'|'date'|'select', opts:[[v,label]]}]
  openSheet(b => {
    html(b, `<h2>${esc(title)}</h2>` + fields.map((f, i) => `<label class="f">${esc(f.label)}</label>` + (
      f.type === 'select' ? `<select data-i="${i}">${f.opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(f.v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`
      : f.type === 'area' ? `<textarea data-i="${i}" placeholder="${esc(f.ph || '')}">${esc(f.v == null ? '' : f.v)}</textarea>`
      : `<input class="text-in" data-i="${i}" type="${f.type === 'date' ? 'date' : 'text'}" ${f.type === 'number' ? 'inputmode="decimal"' : ''} placeholder="${esc(f.ph || '')}" value="${esc(f.v == null ? '' : f.v)}">`
    )).join('') + `<button class="primary wide" data-ok>${esc(okLabel || 'Save')}</button>`);
    const first = b.querySelector('input,textarea'); if (first && fields[0].type !== 'date') setTimeout(() => first.focus(), 250);
    on(b, '[data-ok]', () => {
      const out = {};
      fields.forEach((f, i) => { const el = b.querySelector(`[data-i="${i}"]`); out[f.k] = f.type === 'number' ? num(el.value) : el.value; });
      if (onOk(out) !== false) closeSheet();
    });
  });
}

/* ---------- line chart ---------- */
function drawLine(c, pts, opt){
  if (!c || !pts.length) return;
  opt = opt || {};
  const dpr = window.devicePixelRatio || 1, W = c.clientWidth, H = c.clientHeight;
  c.width = W * dpr; c.height = H * dpr;
  const g = c.getContext('2d'); g.scale(dpr, dpr);
  const css = getComputedStyle(document.documentElement), col = n => css.getPropertyValue(n).trim();
  const L = 44, R = 10, T = 12, B = 26;
  let lo = Math.min(...pts.map(p => p.v)), hi = Math.max(...pts.map(p => p.v));
  if (opt.target != null) { lo = Math.min(lo, opt.target); hi = Math.max(hi, opt.target); }
  if (hi === lo) { hi += 1; lo = Math.max(0, lo - 1); }
  const pad = (hi - lo) * 0.12; lo = Math.max(0, lo - pad); hi += pad;
  const x = i => pts.length === 1 ? (L + W - R) / 2 : L + (W - L - R) * i / (pts.length - 1);
  const y = v => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  g.font = '11px system-ui,sans-serif'; g.fillStyle = col('--muted'); g.strokeStyle = col('--line'); g.lineWidth = 1;
  for (let k = 0; k <= 3; k++) {
    const v = lo + (hi - lo) * k / 3, yy = y(v);
    g.beginPath(); g.moveTo(L, yy); g.lineTo(W - R, yy); g.stroke();
    g.textAlign = 'right'; g.fillText(v >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(Math.round(v * 10) / 10), L - 6, yy + 4);
  }
  g.textAlign = 'left'; g.fillText(fmtShort(pts[0].t), L, H - 6);
  if (pts.length > 1) { g.textAlign = 'right'; g.fillText(fmtShort(pts[pts.length - 1].t), W - R, H - 6); }
  if (opt.target != null) {
    g.setLineDash([5, 4]); g.strokeStyle = col('--gold'); g.beginPath(); g.moveTo(L, y(opt.target)); g.lineTo(W - R, y(opt.target)); g.stroke(); g.setLineDash([]);
  }
  const acc = col('--accent');
  if (pts.length > 1) {
    const grad = g.createLinearGradient(0, T, 0, H - B);
    grad.addColorStop(0, 'rgba(163,230,53,.28)'); grad.addColorStop(1, 'rgba(163,230,53,0)');
    g.beginPath(); g.moveTo(x(0), H - B); pts.forEach((p, i) => g.lineTo(x(i), y(p.v))); g.lineTo(x(pts.length - 1), H - B); g.closePath();
    g.fillStyle = grad; g.fill();
    g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(x(i), y(p.v)) : g.moveTo(x(i), y(p.v)));
    g.strokeStyle = acc; g.lineWidth = 2.5; g.lineJoin = 'round'; g.stroke();
  }
  g.fillStyle = acc;
  pts.forEach((p, i) => { g.beginPath(); g.arc(x(i), y(p.v), pts.length > 30 ? 2 : 4, 0, 7); g.fill(); });
}

/* progress ring (svg) */
function ring(value, target, label, sub, color){
  const r = 48, C = 2 * Math.PI * r, f = target > 0 ? clamp(value / target, 0, 1) : 0;
  const over = target > 0 && value > target * 1.05;
  return `<div class="ring"><svg viewBox="0 0 110 110"><circle cx="55" cy="55" r="${r}" fill="none" stroke="var(--card2)" stroke-width="10"/>
    <circle cx="55" cy="55" r="${r}" fill="none" stroke="${over ? 'var(--danger)' : (color || 'var(--accent)')}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${C * f} ${C}"/></svg>
    <div class="in"><b>${label}</b><span class="tiny muted">${sub}</span></div></div>`;
}
function bar(label, v, target, color, unit){
  const f = target > 0 ? clamp(v / target, 0, 1) * 100 : 0;
  return `<div class="bar"><div class="lbl"><span>${label}</span><span class="muted">${Math.round(v)}${unit === undefined ? 'g' : unit} / ${Math.round(target)}${unit === undefined ? 'g' : unit}</span></div>
    <div class="track"><i style="width:${f}%;background:${color}"></i></div></div>`;
}

/* ---------- navigation + render ---------- */
function viewKey(){ return TABS[tab].subs ? tab + '/' + sub[tab] : tab; }
function render(){
  const y = window.scrollY;
  const T = TABS[tab], V = VIEWS[viewKey()];
  $('#title').textContent = (V && V.title && V.title()) || T.title;
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  $('#subnav').innerHTML = T.subs ? `<div class="seg">${T.subs.map(([k, l]) => `<button data-act="sub" data-sub="${k}" class="${sub[tab] === k ? 'on' : ''}">${l}</button>`).join('')}</div>` : '';
  $('#view').innerHTML = V ? V.render() : '';
  if (V && V.after) V.after();
  window.scrollTo(0, y);
}
function go(t, s){ tab = t; if (s) sub[t] = s; render(); window.scrollTo(0, 0); }

ACTIONS.tab = b => { if (tab !== b.dataset.tab) go(b.dataset.tab); else if (TABS[tab].subs) { window.scrollTo(0, 0); } };
ACTIONS.sub = b => { sub[tab] = b.dataset.sub; render(); window.scrollTo(0, 0); };
ACTIONS.go = b => go(b.dataset.tab, b.dataset.sub);

window.handleBack = function(){
  if (sheets.length) { closeSheet(); return true; }
  if (typeof OB !== 'undefined' && OB) return obBack();
  if (tab !== 'today') { go('today'); return true; }
  return false;
};

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || b.closest('.sheet')) return;
  const fn = ACTIONS[b.dataset.act]; if (fn) fn(b, e);
});
document.addEventListener('input', e => { const f = e.target.dataset && e.target.dataset.field; if (f && FIELDS[f] && !e.target.closest('.sheet')) FIELDS[f](e.target, 'input'); });
document.addEventListener('change', e => { const f = e.target.dataset && e.target.dataset.field; if (f && FIELDS[f] && !e.target.closest('.sheet')) FIELDS[f](e.target, 'change'); });
window.addEventListener('resize', () => { const V = VIEWS[viewKey()]; if (V && V.after) V.after(); });

/* ---------- settings + backup ---------- */
ACTIONS.settings = () => openSheet((b, sh) => {
  html(b, `<h2>Settings</h2>
    ${accountHtml()}
    <div class="sec">Weight unit (gym)</div>
    <div class="seg"><button data-u="kg" class="${S.unit === 'kg' ? 'on' : ''}">Kilograms (kg)</button><button data-u="lb" class="${S.unit === 'lb' ? 'on' : ''}">Pounds (lb)</button></div>
    <div class="sec">Your plan</div>
    <button class="secondary wide" data-redo>Redo setup (goals, body, training split)</button>
    <button class="secondary wide" data-goals>Calories & macro targets</button>
    <div class="sec">App</div>
    <button class="secondary wide" data-go2="themes">Colours</button>
    <button class="secondary wide" data-go2="reminders">Reminders</button>
    ${window.GTNative && window.GTNative.widgetKinds ? '<button class="secondary wide" data-go2="widgets">Home-screen widgets</button><button class="secondary wide" data-go2="health">Health (steps, sleep, heart rate)</button>' : ''}
    <button class="secondary wide" data-rir>${S.rirOff ? 'Ask for reps left after each set: off' : 'Ask for reps left after each set: on'}</button>
    <div class="sec">Backup</div>
    <div class="muted small" style="margin-bottom:8px">${A ? 'Your account keeps a copy too.' : 'Everything lives only on this phone.'} Copy a backup now and then and keep it somewhere safe (notes app, email to yourself), especially before you uninstall or switch phones.</div>
    <button class="secondary wide" id="bcopy">Copy backup</button>
    <div class="sec">Restore</div>
    <textarea id="bin" class="mono" placeholder="Paste a backup here"></textarea>
    <button class="secondary wide" id="brestore">Restore from backup</button>
    <div class="muted small" style="margin-top:16px;text-align:center">${S.workouts.length} workouts · ${Object.keys(S.food.log).length} food days · ${S.todos.length} to-dos<br>Food data: UK McCance & Widdowson (Crown copyright, OGL) and Open Food Facts (ODbL)<br>${window.appVersionText ? esc(appVersionText()) : ''}</div>`);
  accountButtons(b, sh);
  on(b, '[data-u]', btn => { S.unit = btn.dataset.u; save(); sh.refresh(); render(); });
  on(b, '[data-goals]', () => openTargets());
  on(b, '[data-go2]', x => { closeSheet(); ACTIONS[x.dataset.go2](x); });
  on(b, '[data-rir]', () => { S.rirOff = !S.rirOff; save(); sh.refresh(); render(); });
  on(b, '[data-redo]', () => { closeSheet(); startOnboarding(true); });
  on(b, '#bcopy', () => {
    const ta = document.createElement('textarea'); ta.value = JSON.stringify(S); document.body.appendChild(ta);
    ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch(e) {}
    ta.remove();
    const done = k => toast(k ? 'Backup copied. Paste it somewhere safe.' : 'Could not copy');
    if (window.WEB_VERSION && navigator.clipboard) navigator.clipboard.writeText(JSON.stringify(S)).then(() => done(true), () => done(ok)); else done(ok);
  });
  on(b, '#brestore', () => {
    let d; try { d = JSON.parse(b.querySelector('#bin').value); } catch(e) {}
    if (!d || !Array.isArray(d.exercises)) return toast('That is not a valid backup');
    if (!confirm('Replace everything on this phone with this backup?')) return;
    addMissingExercises(d); S = defaults(d); save(); closeSheet(); render(); toast('Backup restored');
  });
});
