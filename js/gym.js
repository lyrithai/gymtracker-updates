'use strict';
/* ================= gym: workouts, history, progress, routines ================= */
const EX_LIB = {
  Chest: ['Bench Press','Incline Bench Press','Decline Bench Press','Paused Bench Press','Larsen Press','Spoto Press',
    'Close-Grip Bench Press','Floor Press','Guillotine Press','TNF Press','Dumbbell Bench Press','Incline Dumbbell Press',
    'Low-Incline Dumbbell Press','Smith Machine Incline Press','Machine Chest Press','Hammer Strength Chest Press',
    'Pec Deck','Chest Fly','Incline Dumbbell Fly','Cable Crossover','Low-to-High Cable Fly','High-to-Low Cable Fly',
    'Single-Arm Cable Fly','Svend Press','Hex Press','Landmine Press','Push-up','Deficit Push-up','Weighted Dips','Chest Dips'],
  Shoulders: ['Overhead Press','Seated Dumbbell Shoulder Press','Machine Shoulder Press','Arnold Press','Z Press',
    'Bradford Press','Push Press','Lateral Raise','Cable Lateral Raise','Behind-the-Back Cable Lateral Raise',
    'Lean-Away Lateral Raise','Egyptian Lateral Raise','Machine Lateral Raise','Lu Raise','Cable Y-Raise',
    'Front Raise','Upright Row','Cable Upright Row','Rear Delt Fly','Reverse Pec Deck','Cable Rear Delt Fly',
    'Face Pull','Cuban Press','Powell Raise'],
  Back: ['Deadlift','Rack Pull','Pull-up','Weighted Pull-up','Chin-up','Lat Pulldown','Neutral-Grip Pulldown',
    'Single-Arm Lat Pulldown','Kneeling Single-Arm Pulldown','Straight-Arm Pulldown','Cable Pullover','Dumbbell Pullover',
    'Keenan Flaps','Barbell Row','Pendlay Row','Yates Row','Seal Row','Helms Row','Meadows Row','Kroc Row',
    'Dumbbell Row','Chest-Supported T-Bar Row','T-Bar Row','Seated Cable Row','Single-Arm Cable Row','Machine Row',
    'Kelso Shrug','Barbell Shrug','Dumbbell Shrug','Back Extension','45° Back Extension','Good Morning','Jefferson Curl'],
  Legs: ['Squat','High-Bar Squat','Front Squat','Pause Squat','Goblet Squat','Heel-Elevated Squat','Cyclist Squat',
    'Smith Machine Squat','Hack Squat','Pendulum Squat','Belt Squat','Leg Press','Single-Leg Leg Press','Sissy Squat',
    'Bulgarian Split Squat','ATG Split Squat','Walking Lunge','Reverse Lunge','Step-up','Poliquin Step-up',
    'Leg Extension','Romanian Deadlift','Stiff-Leg Deadlift','Single-Leg RDL','B-Stance RDL','Sumo Deadlift',
    'Trap Bar Deadlift','Lying Leg Curl','Seated Leg Curl','Nordic Curl','Reverse Nordic','Hip Thrust',
    'Smith Machine Hip Thrust','Glute Bridge','KAS Glute Bridge','Frog Pump','Cable Glute Kickback',
    'Cable Pull-Through','Hip Abduction','Hip Adduction','Standing Calf Raise','Seated Calf Raise',
    'Leg Press Calf Raise','Tibialis Raise'],
  Arms: ['Bicep Curl','Barbell Curl','EZ Bar Curl','Incline Dumbbell Curl','Bayesian Curl','Cable Curl','Preacher Curl',
    'Machine Preacher Curl','Spider Curl','Drag Curl','Hammer Curl','Cross-Body Hammer Curl','Concentration Curl',
    'Reverse Curl','Zottman Curl','Tricep Pushdown','Rope Pushdown','Overhead Cable Tricep Extension',
    'Katana Tricep Extension','Cross-Body Tricep Extension','Skull Crusher','Dumbbell Skull Crusher','JM Press',
    'Tate Press','Tricep Kickback','Dips','Wrist Curl','Reverse Wrist Curl'],
  Core: ['Plank','Side Plank','Copenhagen Plank','Cable Crunch','Hanging Leg Raise','Hanging Knee Raise','Toes-to-Bar',
    'Ab Wheel Rollout','Dragon Flag','Decline Sit-up','Dead Bug','Pallof Press','Russian Twist','Suitcase Carry',"Farmer's Carry"],
  Neck: ['Neck Curl','Neck Extension','Lateral Neck Flexion']
};
const DEFAULT_EX = Object.entries(EX_LIB).flatMap(([m, list]) => list.map(n => [n, m]));
const MUSCLES = [...Object.keys(EX_LIB), 'Other'];

function seedGym(){
  const ex = DEFAULT_EX.map(([name, muscle]) => ({id:uid(), name, muscle}));
  const by = n => ex.find(e => e.name === n).id;
  const r = (name, list) => ({id:uid(), name, items:list.map(n => ({exId:by(n), sets:3}))});
  return {unit:'kg', exercises:ex, workouts:[], active:null, routines:[
    r('Push', ['Bench Press','Overhead Press','Incline Dumbbell Press','Lateral Raise','Tricep Pushdown']),
    r('Pull', ['Deadlift','Pull-up','Barbell Row','Bicep Curl','Hammer Curl']),
    r('Legs', ['Squat','Romanian Deadlift','Leg Press','Lying Leg Curl','Standing Calf Raise'])
  ]};
}
function addMissingExercises(d){
  const have = new Set(d.exercises.map(e => e.name.toLowerCase()));
  DEFAULT_EX.forEach(([name, muscle]) => { if (!have.has(name.toLowerCase())) d.exercises.push({id:uid(), name, muscle}); });
}

let progEx = null, metric = 'e1rm';
const F = () => S.unit === 'lb' ? 2.20462 : 1;
const fmtW = kg => kg == null ? '' : String(Math.round(kg * F() * 10) / 10);
const parseW = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) && n >= 0 ? n / F() : null; };
const parseR = v => { const n = parseInt(v, 10); return isFinite(n) && n >= 0 ? n : null; };
const e1rm = s => s.r > 0 ? s.w * (1 + (s.r > 1 ? s.r / 30 : 0)) : 0;
const exById = id => S.exercises.find(e => e.id === id);
const exName = id => (exById(id) || {name:'Deleted exercise'}).name;
function fmtDur(ms){
  const m = Math.floor(ms / 60000), h = Math.floor(m / 60);
  if (h) return h + 'h ' + (m % 60) + 'm';
  return m + ':' + String(Math.floor(ms / 1000) % 60).padStart(2, '0');
}
function volume(w){ let v = 0; w.exercises.forEach(e => e.sets.forEach(s => v += s.w * s.r)); return v; }
function setCount(w){ return w.exercises.reduce((a, e) => a + e.sets.length, 0); }
function lastSetsFor(exId){
  for (let i = S.workouts.length - 1; i >= 0; i--) {
    const e = S.workouts[i].exercises.find(x => x.exId === exId);
    if (e) return e.sets;
  }
  return null;
}
function workoutsOn(dk){ return S.workouts.filter(w => dkey(new Date(w.start)) === dk); }

/* ---------- exercise picker ---------- */
function pickExercise(onPick){
  let q = '';
  openSheet(b => {
    html(b, `<h2>Add exercise</h2><input class="text-in" id="exq" placeholder="Search or type a new name" value="${esc(q)}"><div id="exlist"></div>`);
    const inp = b.querySelector('#exq');
    const draw = () => {
      const ql = q.trim().toLowerCase();
      const list = S.exercises.filter(e => !ql || e.name.toLowerCase().includes(ql));
      let h = '';
      if (ql && !S.exercises.some(e => e.name.toLowerCase() === ql))
        h += `<button class="pick" data-new="1"><span>+ Create “${esc(q.trim())}”</span><span class="muted small">new</span></button>`;
      MUSCLES.forEach(m => {
        const g = list.filter(e => (e.muscle || 'Other') === m).sort((a, c) => a.name.localeCompare(c.name));
        if (!g.length) return;
        h += `<div class="sec">${m}</div>` + g.map(e => `<button class="pick" data-id="${e.id}"><span>${esc(e.name)}</span><span class="muted">+</span></button>`).join('');
      });
      if (!h) h = '<div class="empty">Nothing found</div>';
      const L = b.querySelector('#exlist'); L.innerHTML = h;
      on(L, '[data-id]', btn => { closeSheet(); onPick(btn.dataset.id); });
      on(L, '[data-new]', () => { const ex = {id:uid(), name:q.trim(), muscle:'Other'}; S.exercises.push(ex); save(); closeSheet(); onPick(ex.id); });
    };
    inp.oninput = () => { q = inp.value; draw(); };
    draw();
  }, {full:true});
}

/* ---------- workout ---------- */
function startWorkout(name, items){
  S.active = {id:uid(), name, start:Date.now(), exercises: items.map(it => newEntry(it.exId, it.sets, it.reps, it.rest, it.effort))};
  save(); go('gym', 'workout');
}
function newEntry(exId, n, reps, rest, effort){
  const prev = lastSetsFor(exId);
  const count = n || (prev ? prev.length : 2);
  return {exId, reps:reps || '', rest:rest || 0, effort:effort || '', sets: Array.from({length: count}, () => ({w:null, r:null, done:false}))};
}
/** Double progression: reps first, then the smallest weight jump. */
function overloadHint(e){
  const m = String(e.reps || '').match(/(\d+)\s*-\s*(\d+)/); if (!m) return '';
  const prev = lastSetsFor(e.exId); if (!prev || !prev.length) return '';
  const top = +m[2], bottom = +m[1];
  const w = Math.max(...prev.map(s => s.w || 0));
  if (prev.every(s => s.r >= top)) return `<div class="coach up">↑ You hit ${top} on every set. Add the smallest weight jump today.</div>`;
  if (prev.some(s => s.r < bottom)) return `<div class="coach">Last time dipped under ${bottom} reps. Keep ${fmtW(w)} ${S.unit} and own the range.</div>`;
  return `<div class="coach">Same ${fmtW(w)} ${S.unit}. Beat last time by one rep. That's progress.</div>`;
}

/* ---------- rest timer (starts when you tick a set) ---------- */
let restT = null;
function startRest(sec){
  if (!sec) return;
  stopRest();
  const bar = document.createElement('div');
  bar.id = 'rest';
  bar.innerHTML = '<span class="grow"><b id="restT"></b><div class="muted tiny">Rest. Next set to failure.</div></span><button class="secondary" data-r="30">+30s</button><button class="primary" data-r="skip">Go</button>';
  document.body.appendChild(bar);
  let end = Date.now() + sec * 1000;
  bar.querySelector('[data-r="30"]').onclick = () => { end += 30000; tick(); };
  bar.querySelector('[data-r="skip"]').onclick = stopRest;
  const tick = () => {
    const left = Math.max(0, Math.round((end - Date.now()) / 1000));
    const t = document.getElementById('restT'); if (t) t.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
    if (left <= 0) { try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch(e) {} bar.classList.add('done'); const tt = document.getElementById('restT'); if (tt) tt.textContent = 'Go'; clearInterval(restT); restT = null; setTimeout(() => { if (!restT) stopRest(); }, 4000); }
  };
  tick(); restT = setInterval(tick, 500);
}
function stopRest(){ if (restT) clearInterval(restT); restT = null; const b = document.getElementById('rest'); if (b) b.remove(); }
VIEWS['gym/workout'] = {
  title: () => S.active ? 'Workout in progress' : 'Gym',
  render(){
    if (S.active) return viewActive();
    let h = '';
    const nx = nextProgramRoutine();
    if (S.program && S.user && (S.user.planVer || 1) < PLAN_VERSION) h += `<button class="card tap" data-act="onboard" style="color:var(--text);border:1px solid var(--accent)"><b>⚡ Your plan got an upgrade</b>
        <div class="muted small">Low volume, high intensity: 1–2 sets to failure, double progression, new split options and signature moves. Tap to rebuild yours.</div></button>`;
    if (S.program && nx) h += `<div class="card"><div class="muted small">${esc(S.program.split)} · next up</div><div class="item"><b style="font-size:20px">${esc(nx.r.name)}</b>
        <button class="primary" style="min-height:44px" data-act="start-routine" data-id="${nx.r.id}">Start</button></div>
        <div class="chips">${nx.r.items.map(i => `<span class="chip">${esc(exName(i.exId))}</span>`).join('')}</div></div>`;
    else h += `<button class="card tap" data-act="onboard" style="color:var(--text)"><b>✨ Build me a program</b><div class="muted small">Answer a few questions and get a science-based split with movements you pick.</div></button>`;
    h += `<button class="secondary big-start" data-act="start-empty">＋ Start empty workout</button><div class="sec">Your routines</div>`;
    if (!S.routines.length) h += `<div class="card muted">No routines yet. Make one in Routines.</div>`;
    S.routines.forEach(r => {
      h += `<button class="card tap" data-act="start-routine" data-id="${r.id}">
        <div class="item"><span class="t">${esc(r.name)}</span><span class="muted small">${pl(r.items.length, 'exercise')} ▸</span></div>
        <div class="chips">${r.items.map(i => `<span class="chip">${esc(exName(i.exId))}</span>`).join('')}</div></button>`;
    });
    const last = S.workouts[S.workouts.length - 1];
    if (last) h += `<div class="sec">Last workout</div><button class="card tap" data-act="open-wo" data-id="${last.id}">
        <div class="item"><span class="t">${esc(last.name)}</span><span class="muted small">${fmtDate(last.start)}</span></div>
        <div class="muted small">${pl(setCount(last), 'set')} · ${fmtNum(volume(last) * F())} ${S.unit} lifted</div></button>`;
    return h;
  }
};
function viewActive(){
  const a = S.active;
  let h = `<div class="wo-head"><input class="wo-name" data-field="wo-name" value="${esc(a.name)}" aria-label="Workout name"><span class="timer" id="elapsed">${fmtDur(Date.now() - a.start)}</span></div>`;
  if (!a.exercises.length) h += `<div class="empty">Add your first exercise to get going.</div>`;
  a.exercises.forEach((e, i) => {
    const prev = lastSetsFor(e.exId) || [];
    h += `<div class="card"><div class="ex-title"><b>${esc(exName(e.exId))}</b><button class="icon" data-act="rm-ex" data-i="${i}" aria-label="Remove exercise">✕</button></div>
      ${i === 0 ? `<div class="coach">🔥 Warm up first: 2–3 lighter ramp-up sets. Don't log them, they don't count.</div>` : ''}
      ${e.reps ? `<div class="muted small" style="margin:-4px 0 4px">${e.sets.length} × ${esc(e.reps)} reps${e.effort ? ' · ' + esc(e.effort) : ''}${e.rest ? ' · rest ' + Math.round(e.rest / 60 * 2) / 2 + ' min' : ''}</div>` : ''}
      ${overloadHint(e)}
      <div class="set-row hdr"><span>Set</span><span>Last time</span><span>${S.unit}</span><span>Reps</span><span></span></div>`;
    e.sets.forEach((s, j) => {
      const p = prev[j];
      h += `<div class="set-row ${s.done ? 'done' : ''}"><span class="setn">${j + 1}</span>
        <span class="prev" data-act="fill" data-i="${i}" data-j="${j}">${p ? fmtW(p.w) + ' × ' + p.r : '—'}</span>
        <input inputmode="decimal" data-field="w" data-i="${i}" data-j="${j}" value="${fmtW(s.w)}" placeholder="${p ? fmtW(p.w) : '0'}" aria-label="Weight">
        <input inputmode="numeric" data-field="r" data-i="${i}" data-j="${j}" value="${s.r == null ? '' : s.r}" placeholder="${p ? p.r : '0'}" aria-label="Reps">
        <button class="chk" data-act="done" data-i="${i}" data-j="${j}" aria-label="Set done">✓</button></div>`;
    });
    h += `<div class="row-btns"><button class="ghost" data-act="add-set" data-i="${i}">＋ Add set</button>${e.sets.length > 1 ? `<button class="ghost" style="color:var(--muted)" data-act="rm-set" data-i="${i}">− Remove set</button>` : ''}</div></div>`;
  });
  return h + `<button class="secondary wide" data-act="add-ex">＋ Add exercise</button>
    <button class="primary wide" data-act="finish">Finish workout</button>
    <button class="danger-link wide" data-act="cancel-wo">Cancel workout</button>`;
}
function finishWorkout(){
  const a = S.active;
  const exercises = a.exercises
    .map(e => ({exId:e.exId, sets:e.sets.filter(s => s.done && s.r != null).map(s => ({w:s.w || 0, r:s.r}))}))
    .filter(e => e.sets.length);
  if (!exercises.length) {
    if (confirm('No sets are ticked ✓ yet. Throw this workout away?')) { S.active = null; save(); render(); }
    return;
  }
  const prs = [];
  exercises.forEach(e => {
    let bestW = -1, bestE = -1, any = false;
    S.workouts.forEach(w => w.exercises.forEach(x => { if (x.exId === e.exId) x.sets.forEach(s => { any = true; bestW = Math.max(bestW, s.w); bestE = Math.max(bestE, e1rm(s)); }); }));
    const topW = Math.max(...e.sets.map(s => s.w)), topE = Math.max(...e.sets.map(e1rm));
    if (!any) return;
    if (topW > bestW && topW > 0) prs.push(`${exName(e.exId)}: heaviest ever, ${fmtW(topW)} ${S.unit}`);
    else if (topE > bestE && topE > 0) prs.push(`${exName(e.exId)}: best est. 1-rep max, ${fmtW(topE)} ${S.unit}`);
  });
  // "beat the logbook": best set better than last session's best on the same exercise
  let beat = 0, logged = 0;
  exercises.forEach(e => {
    const prev = lastSetsFor(e.exId); if (!prev) return;
    logged++;
    if (Math.max(...e.sets.map(e1rm)) > Math.max(...prev.map(e1rm)) + 0.01) beat++;
  });
  const w = {id:a.id, name:a.name.trim() || 'Workout', start:a.start, end:Date.now(), exercises};
  S.workouts.push(w); S.active = null; save(); render();
  openSheet(b => {
    html(b, `<h2>Workout done 💪</h2>
      ${logged ? `<div class="coach ${beat ? 'up' : ''}" style="margin-bottom:10px">${beat ? `Beat the logbook on ${beat} of ${logged} lifts.` : 'Matched the logbook. Same weight for a few weeks is normal: next time, one more rep.'}</div>` : ''}
      <div class="stat-grid"><div class="stat"><div class="v">${fmtDur(w.end - w.start)}</div><div class="l">Time</div></div>
      <div class="stat"><div class="v">${setCount(w)}</div><div class="l">Sets</div></div>
      <div class="stat"><div class="v">${fmtNum(volume(w) * F())}</div><div class="l">${S.unit} lifted</div></div>
      <div class="stat pr"><div class="v">${prs.length}</div><div class="l">New records</div></div></div>
      ${prs.map(p => `<div class="card">🏆 ${esc(p)}</div>`).join('')}
      <button class="primary wide" data-close>Done</button>`);
    on(b, '[data-close]', closeSheet);
  });
}

/* ---------- history ---------- */
VIEWS['gym/history'] = {render(){
  if (!S.workouts.length) return `<div class="empty">No workouts yet.<br>Finish one and it shows up here.</div>`;
  const weekAgo = Date.now() - 7 * 864e5;
  let h = `<div class="stat-grid"><div class="stat"><div class="v">${S.workouts.filter(w => w.start > weekAgo).length}</div><div class="l">This week</div></div>
    <div class="stat"><div class="v">${S.workouts.length}</div><div class="l">All time</div></div></div>`;
  let month = '';
  S.workouts.slice().reverse().forEach(w => {
    const m = new Date(w.start).toLocaleDateString(undefined, {month:'long', year:'numeric'});
    if (m !== month) { month = m; h += `<div class="sec">${m}</div>`; }
    h += `<button class="card tap" data-act="open-wo" data-id="${w.id}">
      <div class="item"><span class="t">${esc(w.name)}</span><span class="muted small">${fmtDate(w.start)}</span></div>
      <div class="muted small">${fmtDur(w.end - w.start)} · ${pl(setCount(w), 'set')} · ${fmtNum(volume(w) * F())} ${S.unit}</div>
      <div class="chips">${w.exercises.map(e => `<span class="chip">${esc(exName(e.exId))}</span>`).join('')}</div></button>`;
  });
  return h;
}};
function openWorkout(id){
  const w = S.workouts.find(x => x.id === id); if (!w) return;
  openSheet(b => {
    html(b, `<h2>${esc(w.name)}</h2><div class="muted small" style="margin:-8px 0 12px">${fmtDate(w.start)} · ${fmtDur(w.end - w.start)} · ${fmtNum(volume(w) * F())} ${S.unit}</div>`);
    w.exercises.forEach(e => html(b, `<div class="card"><b>${esc(exName(e.exId))}</b>${e.sets.map((s, j) =>
      `<div class="item small" style="padding:4px 0"><span class="muted">Set ${j + 1}</span><span>${fmtW(s.w)} ${S.unit} × ${s.r}</span></div>`).join('')}</div>`));
    html(b, `<button class="secondary wide" data-s="again">Do this workout again</button>
      <button class="secondary wide" data-s="routine">Save as routine</button>
      <button class="danger-btn wide" data-s="del">Delete workout</button>`);
    on(b, '[data-s="again"]', () => {
      if (S.active) return toast('Finish your current workout first');
      closeSheet(); startWorkout(w.name, w.exercises.map(e => ({exId:e.exId, sets:e.sets.length})));
    });
    on(b, '[data-s="routine"]', () => {
      S.routines.push({id:uid(), name:w.name, items:w.exercises.map(e => ({exId:e.exId, sets:e.sets.length}))});
      save(); toast('Saved to Routines'); closeSheet(); render();
    });
    on(b, '[data-s="del"]', () => {
      if (!confirm('Delete this workout? This cannot be undone.')) return;
      S.workouts = S.workouts.filter(x => x.id !== id); save(); closeSheet(); render();
    });
  });
}

/* ---------- progress ---------- */
function sessionsFor(exId){
  const out = [];
  S.workouts.forEach(w => w.exercises.forEach(e => { if (e.exId === exId) out.push({t:w.start, sets:e.sets}); }));
  return out;
}
const METRICS = {
  e1rm: {label:'Est. 1RM',   val: ss => Math.max(...ss.map(e1rm)),            w:true},
  top:  {label:'Top weight', val: ss => Math.max(...ss.map(s => s.w)),         w:true},
  reps: {label:'Best reps',  val: ss => Math.max(...ss.map(s => s.r)),         w:false},
  vol:  {label:'Volume',     val: ss => ss.reduce((a, s) => a + s.w * s.r, 0), w:true}
};
VIEWS['gym/progress'] = {
  render(){
    const done = new Set(); S.workouts.forEach(w => w.exercises.forEach(e => done.add(e.exId)));
    const ids = [...done].sort((a, b) => exName(a).localeCompare(exName(b)));
    if (!ids.length) return `<div class="empty">Finish a workout and your progress charts and records show up here.</div>`;
    if (!ids.includes(progEx)) progEx = S.workouts[S.workouts.length - 1].exercises[0].exId;
    const ss = sessionsFor(progEx), all = ss.flatMap(s => s.sets);
    const heavy = all.reduce((a, s) => (s.w > a.w || (s.w === a.w && s.r > a.r)) ? s : a, all[0]);
    const bestE = Math.max(...all.map(e1rm));
    const bestR = all.reduce((a, s) => s.r > a.r ? s : a, all[0]);
    const bestV = Math.max(...ss.map(s => METRICS.vol.val(s.sets)));
    let h = `<select data-field="prog-ex">${ids.map(id => `<option value="${id}" ${id === progEx ? 'selected' : ''}>${esc(exName(id))}</option>`).join('')}</select>
      <div class="seg">${Object.entries(METRICS).map(([k, m]) => `<button data-act="metric" data-m="${k}" class="${k === metric ? 'on' : ''}">${m.label}</button>`).join('')}</div>
      <div class="card"><canvas id="chart"></canvas></div>
      <div class="sec">Personal records</div>
      <div class="stat-grid">
        <div class="stat pr"><div class="v">${fmtW(heavy.w)}<span class="small"> ${S.unit}</span></div><div class="l">Heaviest (× ${heavy.r})</div></div>
        <div class="stat pr"><div class="v">${fmtW(bestE)}<span class="small"> ${S.unit}</span></div><div class="l">Est. 1-rep max</div></div>
        <div class="stat pr"><div class="v">${bestR.r}</div><div class="l">Most reps (${fmtW(bestR.w)} ${S.unit})</div></div>
        <div class="stat pr"><div class="v">${fmtNum(bestV * F())}</div><div class="l">Best session ${S.unit}</div></div>
      </div><div class="sec">Sessions (${ss.length})</div>`;
    ss.slice().reverse().slice(0, 15).forEach(s => {
      const top = s.sets.reduce((a, x) => e1rm(x) > e1rm(a) ? x : a, s.sets[0]);
      h += `<div class="card item small"><span>${fmtDate(s.t)}</span><span class="muted">${pl(s.sets.length, 'set')} · best ${fmtW(top.w)} × ${top.r}</span></div>`;
    });
    return h;
  },
  after(){
    const m = METRICS[metric];
    drawLine($('#chart'), sessionsFor(progEx).map(s => ({t:s.t, v:m.val(s.sets) * (m.w ? F() : 1)})));
  }
};

/* ---------- routines ---------- */
VIEWS['gym/routines'] = {render(){
  let h = `<button class="primary big-start" data-act="new-routine">＋ New routine</button>
    <button class="secondary wide" data-act="onboard" style="margin-bottom:12px">✨ ${S.program ? 'Rebuild my program' : 'Build me a program'}</button>`;
  if (!S.routines.length) h += `<div class="empty">No routines yet.</div>`;
  S.routines.forEach(r => {
    h += `<div class="card"><div class="item"><span class="t">${esc(r.name)}</span><button class="ghost" data-act="edit-routine" data-id="${r.id}">Edit</button></div>
      <div class="muted small">${r.items.map(i => `${esc(exName(i.exId))} · ${i.sets}×${i.reps ? esc(i.reps) : ''}`).join('<br>') || 'No exercises'}</div>
      <button class="secondary wide" data-act="start-routine" data-id="${r.id}">Start ${esc(r.name)}</button></div>`;
  });
  return h;
}};
function editRoutine(id){
  const orig = S.routines.find(r => r.id === id);
  const d = orig ? JSON.parse(JSON.stringify(orig)) : {id:uid(), name:'', items:[]};
  openSheet((b, sh) => {
    html(b, `<h2>${orig ? 'Edit routine' : 'New routine'}</h2>
      <input class="text-in" id="rname" placeholder="Name, e.g. Upper body" value="${esc(d.name)}">
      <div class="sec">Exercises</div>
      ${d.items.length ? '' : '<div class="muted small">No exercises yet.</div>'}
      ${d.items.map((it, k) => `<div class="card item"><span class="t grow">${esc(exName(it.exId))}</span>
        <div class="stepper"><button data-k="${k}" data-d="-1">−</button><span>${it.sets} sets</span><button data-k="${k}" data-d="1">＋</button></div>
        <button class="icon" data-rm="${k}" aria-label="Remove">✕</button></div>`).join('')}
      <button class="secondary wide" id="radd">＋ Add exercise</button>
      <button class="primary wide" id="rsave">Save routine</button>
      ${orig ? '<button class="danger-link wide" id="rdel">Delete routine</button>' : ''}`);
    const nameIn = b.querySelector('#rname'); nameIn.oninput = () => d.name = nameIn.value;
    on(b, '[data-d]', btn => { const it = d.items[+btn.dataset.k]; it.sets = clamp(it.sets + +btn.dataset.d, 1, 10); sh.refresh(); });
    on(b, '[data-rm]', btn => { d.items.splice(+btn.dataset.rm, 1); sh.refresh(); });
    on(b, '#radd', () => pickExercise(exId => { d.items.push({exId, sets:3}); sh.refresh(); }));
    on(b, '#rsave', () => {
      if (!d.name.trim()) return toast('Give the routine a name');
      if (!d.items.length) return toast('Add at least one exercise');
      d.name = d.name.trim();
      if (orig) Object.assign(orig, d); else S.routines.push(d);
      save(); closeSheet(); render();
    });
    on(b, '#rdel', () => {
      if (!confirm(`Delete the routine “${d.name}”? Your past workouts stay.`)) return;
      S.routines = S.routines.filter(r => r.id !== id); save(); closeSheet(); render();
    });
  });
}

/* ---------- gym actions ---------- */
Object.assign(ACTIONS, {
  'start-empty': () => startWorkout('Workout', []),
  'start-routine': b => {
    if (S.active) { go('gym', 'workout'); return toast('Finish your current workout first'); }
    const r = S.routines.find(x => x.id === b.dataset.id); if (r) startWorkout(r.name, r.items);
  },
  'open-wo': b => openWorkout(b.dataset.id),
  'add-ex': () => pickExercise(exId => { S.active.exercises.push(newEntry(exId)); save(); render(); window.scrollTo(0, document.body.scrollHeight); }),
  'rm-ex': b => {
    const a = S.active, e = a.exercises[+b.dataset.i];
    if (e.sets.some(s => s.done) && !confirm(`Remove ${exName(e.exId)} and its sets?`)) return;
    a.exercises.splice(+b.dataset.i, 1); save(); render();
  },
  'add-set': b => { const sets = S.active.exercises[+b.dataset.i].sets, last = sets[sets.length - 1]; sets.push({w:last ? last.w : null, r:last ? last.r : null, done:false}); save(); render(); },
  'rm-set': b => { S.active.exercises[+b.dataset.i].sets.pop(); save(); render(); },
  fill: b => {
    const e = S.active.exercises[+b.dataset.i], p = (lastSetsFor(e.exId) || [])[+b.dataset.j]; if (!p) return;
    const s = e.sets[+b.dataset.j]; s.w = p.w; s.r = p.r; save(); render();
  },
  done: b => {
    const e = S.active.exercises[+b.dataset.i], s = e.sets[+b.dataset.j];
    if (!s.done) {
      const p = (lastSetsFor(e.exId) || [])[+b.dataset.j];
      if (s.w == null && p) s.w = p.w;
      if (s.r == null && p) s.r = p.r;
      if (s.r == null || s.r === 0) return toast('Type your reps first');
      if (s.w == null) s.w = 0;
    }
    s.done = !s.done; save(); render();
    if (s.done && e.sets.some(x => !x.done) || s.done && S.active.exercises.indexOf(e) < S.active.exercises.length - 1) startRest(e.rest || 120);
  },
  finish: () => { stopRest(); finishWorkout(); },
  'cancel-wo': () => { if (confirm('Cancel this workout? Nothing from it will be saved.')) { stopRest(); S.active = null; save(); render(); } },
  metric: b => { metric = b.dataset.m; render(); },
  'new-routine': () => editRoutine(null),
  'edit-routine': b => editRoutine(b.dataset.id)
});
Object.assign(FIELDS, {
  'wo-name': el => { S.active.name = el.value; save(); },
  w: el => { S.active.exercises[+el.dataset.i].sets[+el.dataset.j].w = el.value === '' ? null : parseW(el.value); save(); },
  r: el => { S.active.exercises[+el.dataset.i].sets[+el.dataset.j].r = el.value === '' ? null : parseR(el.value); save(); },
  'prog-ex': (el, ev) => { if (ev === 'change') { progEx = el.value; render(); } }
});
setInterval(() => { const t = $('#elapsed'); if (t && S && S.active) t.textContent = fmtDur(Date.now() - S.active.start); }, 1000);
