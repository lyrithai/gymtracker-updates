'use strict';
/* ================= strength ranks + body diagram ================= */
const MUSCLE_NAMES = {chest:'Chest', shoulders:'Shoulders', biceps:'Biceps', triceps:'Triceps', forearms:'Forearms', abs:'Abs', traps:'Traps',
  lats:'Lats', upperback:'Upper back', lowerback:'Lower back', glutes:'Glutes', quads:'Quads', hamstrings:'Hamstrings', calves:'Calves'};
// Ranked parts (same as the custom-split picker)
const UNIT_GROUPS = [
  ['Chest', [['upperChest','Upper chest'],['midChest','Mid & lower chest']]],
  ['Back', [['lats','Lats'],['upperback','Upper back'],['traps','Traps'],['lowerback','Lower back']]],
  ['Shoulders', [['frontDelt','Front delts'],['sideDelt','Side delts'],['rearDelt','Rear delts']]],
  ['Arms', [['biceps','Biceps'],['triceps','Triceps'],['brachio','Brachioradialis'],['flexors','Forearm flexors'],['extensors','Forearm extensors']]],
  ['Legs', [['quads','Quads'],['hamstrings','Hamstrings'],['glutes','Glutes'],['adductors','Adductors'],['calves','Calves']]],
  ['Core', [['abs','Abs'],['obliques','Obliques']]]
];
const UNITS = Object.fromEntries([].concat(...UNIT_GROUPS.map(g => g[1])));
const LOWER = ['glutes','quads','hamstrings','calves','lowerback','adductors'];
const TIERS = [
  {n:'Iron', c:'#7c8594', x:0.3}, {n:'Bronze', c:'#c98a4b', x:0.5}, {n:'Silver', c:'#cfd6e0', x:0.75}, {n:'Gold', c:'#fbbf24', x:1.0},
  {n:'Platinum', c:'#5eead4', x:1.25}, {n:'Diamond', c:'#60a5fa', x:1.5}, {n:'Elite', c:'#e879f9', x:1.8}
];
// Rough standards (my estimates, not an official table): estimated 1-rep max ÷ bodyweight for a "Gold" (solid intermediate) man.
// Dumbbells: per dumbbell. Single-arm cables: per side. bw: bodyweight is part of the load. half: half your bodyweight is part of the load.
// reps: no added load, so it's the best reps in one set (Gold = that many reps).
const STD = {
  // upper chest
  'Smith Machine Incline Press':['upperChest',0.95], 'Incline Bench Press':['upperChest',0.95], 'Incline Dumbbell Press':['upperChest',0.36], 'Low-Incline Dumbbell Press':['upperChest',0.38],
  'TNF Press':['upperChest',0.3], 'Low-to-High Cable Fly':['upperChest',0.15], 'Incline Dumbbell Fly':['upperChest',0.18], 'Deficit Push-up':['upperChest',22,'reps'],
  // mid chest
  'Bench Press':['midChest',1.15], 'Paused Bench Press':['midChest',1.1], 'Machine Chest Press':['midChest',1.0], 'Hammer Strength Chest Press':['midChest',1.1],
  'Dumbbell Bench Press':['midChest',0.42], 'Pec Deck':['midChest',0.9], 'Cable Crossover':['midChest',0.2], 'Single-Arm Cable Fly':['midChest',0.18],
  'Chest Fly':['midChest',0.18], 'Svend Press':['midChest',0.25], 'Push-up':['midChest',30,'reps'],
  // lower chest
  'High-to-Low Cable Fly':['midChest',0.2], 'Decline Bench Press':['midChest',1.2], 'Chest Dips':['midChest',1.45,'bw'], 'Weighted Dips':['midChest',1.45,'bw'],
  // lats
  'Lat Pulldown':['lats',0.95], 'Neutral-Grip Pulldown':['lats',1.0], 'Single-Arm Lat Pulldown':['lats',0.45], 'Kneeling Single-Arm Pulldown':['lats',0.4],
  'Straight-Arm Pulldown':['lats',0.45], 'Cable Pullover':['lats',0.45], 'Keenan Flaps':['lats',0.3], 'Dumbbell Pullover':['lats',0.35],
  'Pull-up':['lats',1.35,'bw'], 'Weighted Pull-up':['lats',1.35,'bw'], 'Chin-up':['lats',1.4,'bw'],
  // upper back
  'Chest-Supported T-Bar Row':['upperback',0.9], 'Seated Cable Row':['upperback',1.0], 'Machine Row':['upperback',1.0], 'Single-Arm Cable Row':['upperback',0.45],
  'Seal Row':['upperback',0.8], 'Barbell Row':['upperback',1.0], 'Pendlay Row':['upperback',0.95], 'Yates Row':['upperback',1.05], 'T-Bar Row':['upperback',1.0],
  'Dumbbell Row':['upperback',0.45], 'Kroc Row':['upperback',0.5], 'Meadows Row':['upperback',0.5],
  // traps
  'Kelso Shrug':['traps',0.8], 'Dumbbell Shrug':['traps',0.6], 'Barbell Shrug':['traps',1.6], 'Rack Pull':['traps',2.2],
  // lower back
  'Deadlift':['lowerback',2.0], 'Trap Bar Deadlift':['lowerback',2.1], 'Good Morning':['lowerback',0.9], 'Jefferson Curl':['lowerback',0.4],
  '45° Back Extension':['lowerback',0.9,'half'], 'Back Extension':['lowerback',0.9,'half'],
  // delts
  'Machine Shoulder Press':['frontDelt',0.75], 'Seated Dumbbell Shoulder Press':['frontDelt',0.3], 'Overhead Press':['frontDelt',0.7], 'Arnold Press':['frontDelt',0.27],
  'Push Press':['frontDelt',0.9], 'Front Raise':['frontDelt',0.15], 'Z Press':['frontDelt',0.6], 'Landmine Press':['frontDelt',0.6],
  'Lateral Raise':['sideDelt',0.14], 'Lean-Away Lateral Raise':['sideDelt',0.12], 'Cable Lateral Raise':['sideDelt',0.1], 'Behind-the-Back Cable Lateral Raise':['sideDelt',0.09],
  'Cable Y-Raise':['sideDelt',0.08], 'Machine Lateral Raise':['sideDelt',0.45], 'Upright Row':['sideDelt',0.55], 'Cable Upright Row':['sideDelt',0.5],
  'Reverse Pec Deck':['rearDelt',0.6], 'Cable Rear Delt Fly':['rearDelt',0.1], 'Face Pull':['rearDelt',0.45], 'Rear Delt Fly':['rearDelt',0.12],
  // arms
  'Preacher Curl':['biceps',0.45], 'Machine Preacher Curl':['biceps',0.5], 'Bayesian Curl':['biceps',0.15], 'Incline Dumbbell Curl':['biceps',0.18], 'Cable Curl':['biceps',0.5],
  'EZ Bar Curl':['biceps',0.55], 'Barbell Curl':['biceps',0.55], 'Bicep Curl':['biceps',0.22], 'Spider Curl':['biceps',0.18], 'Concentration Curl':['biceps',0.2], 'Drag Curl':['biceps',0.45],
  'Overhead Cable Tricep Extension':['triceps',0.5], 'Katana Tricep Extension':['triceps',0.25], 'Overhead Dumbbell Tricep Extension':['triceps',0.3], 'Tricep Pushdown':['triceps',0.6],
  'Rope Pushdown':['triceps',0.5], 'JM Press':['triceps',0.8], 'Skull Crusher':['triceps',0.5], 'Dumbbell Skull Crusher':['triceps',0.2], 'Cross-Body Tricep Extension':['triceps',0.15],
  'Close-Grip Bench Press':['triceps',1.0], 'Tricep Kickback':['triceps',0.12], 'Tate Press':['triceps',0.2], 'Dips':['triceps',1.45,'bw'],
  'Reverse Curl':[['brachio','extensors'],0.4], 'Hammer Curl':[['brachio','biceps'],0.25], 'TNF Reverse Curl':['brachio',0.35], 'Cross-Body Hammer Curl':['brachio',0.25], 'Zottman Curl':['brachio',0.18],
  'Wrist Curl':['flexors',0.5], 'Dumbbell Wrist Curl':['flexors',0.2], "Farmer's Carry":['flexors',0.6],
  'Reverse Wrist Curl':['extensors',0.3], 'Dumbbell Reverse Wrist Curl':['extensors',0.12],
  // legs
  'Squat':['quads',1.5], 'High-Bar Squat':['quads',1.45], 'Front Squat':['quads',1.2], 'Pause Squat':['quads',1.3], 'Hack Squat':['quads',1.6], 'Pendulum Squat':['quads',1.6],
  'Smith Machine Squat':['quads',1.5], 'Belt Squat':['quads',1.5], 'Leg Press':['quads',2.8], 'Single-Leg Leg Press':['quads',1.3], 'Leg Extension':['quads',1.0],
  'Goblet Squat':['quads',0.6], 'Bulgarian Split Squat':['quads',0.35], 'Walking Lunge':['quads',0.3], 'Reverse Lunge':['quads',0.3], 'Sissy Squat':['quads',15,'reps'], 'Reverse Nordic':['quads',12,'reps'],
  'Romanian Deadlift':['hamstrings',1.5], 'Stiff-Leg Deadlift':['hamstrings',1.4], 'Lying Leg Curl':['hamstrings',0.65], 'Seated Leg Curl':['hamstrings',0.75],
  'B-Stance RDL':['hamstrings',0.5], 'Single-Leg RDL':['hamstrings',0.4], 'Nordic Curl':['hamstrings',6,'reps'],
  'Hip Thrust':['glutes',2.0], 'Smith Machine Hip Thrust':['glutes',2.0], 'Glute Bridge':['glutes',1.8], 'Sumo Deadlift':['glutes',2.0], 'Cable Glute Kickback':['glutes',0.25],
  'Cable Pull-Through':['glutes',0.6], 'Hip Abduction':['glutes',1.2], 'Cable Hip Abduction':['glutes',0.2],
  'Hip Adduction':['adductors',1.2],
  'Standing Calf Raise':['calves',1.5], 'Seated Calf Raise':['calves',1.0], 'Leg Press Calf Raise':['calves',2.5],
  // core
  'Cable Crunch':['abs',0.9], 'Hanging Leg Raise':['abs',15,'reps'], 'Ab Wheel Rollout':['abs',12,'reps'], 'Decline Sit-up':['abs',25,'reps'], 'Toes-to-Bar':['abs',12,'reps'],
  'Dead Bug':['abs',20,'reps'], 'Cable Woodchopper':['obliques',0.35], 'Pallof Press':['obliques',0.3], 'Russian Twist':['obliques',40,'reps']
};
const unitsOf = st => Array.isArray(st[0]) ? st[0] : [st[0]];
function bodyweight(){ const w = S.body.weights; return (w.length ? w[w.length - 1].kg : S.food.profile.weight) || 75; }
function tierOfRel(rel){ let t = -1; TIERS.forEach((T, i) => { if (rel >= T.x) t = i; }); return t; }
const scoreOf = (rel, t) => t >= TIERS.length - 1 ? t : t + clamp((rel - (t >= 0 ? TIERS[t].x : 0)) / (TIERS[t + 1].x - (t >= 0 ? TIERS[t].x : 0)), 0, 0.99);
/** {unit: {tier, score, best, lifts}} from every finished workout. rel = your number ÷ the Gold standard. */
function computeRanks(){
  const bw = bodyweight(), fem = S.food.profile.sex === 'f';
  const out = {};
  Object.keys(UNITS).forEach(u => out[u] = {tier:-1, score:0, best:null, lifts:[]});
  const best = {};
  S.workouts.forEach(w => w.exercises.forEach(e => {
    const name = exName(e.exId), st = STD[name]; if (!st) return;
    e.sets.forEach(s => {
      if (!(s.r > 0)) return;
      let val;
      if (st[2] === 'reps') val = s.r;
      else {
        const load = (s.w || 0) + (st[2] === 'bw' ? bw : st[2] === 'half' ? bw * 0.5 : 0);
        val = load * (1 + (Math.min(s.r, 12) > 1 ? Math.min(s.r, 12) / 30 : 0));
      }
      if (!best[name] || val > best[name].val) best[name] = {name, w:s.w || 0, r:s.r, val, t:w.start};
    });
  }));
  Object.values(best).forEach(b => {
    const st = STD[b.name], flag = st[2];
    unitsOf(st).forEach(u => {
      if (!out[u]) return;
      const gold = st[1] * (fem ? (LOWER.includes(u) ? 0.75 : 0.6) : 1);
      const rel = flag === 'reps' ? b.val / gold : b.val / bw / gold;
      const tier = tierOfRel(rel), score = scoreOf(rel, tier);
      const rec = Object.assign({}, b, {rel, tier, score, gold, flag, ratio:flag === 'reps' ? null : b.val / bw});
      out[u].lifts.push(rec);
      if (!out[u].best || score > out[u].score) Object.assign(out[u], {tier, score, best:rec});
    });
  });
  // the drawing has one forearm region: show the best of the three forearm parts
  const fa = ['brachio','flexors','extensors'].map(u => [u, out[u]]).sort((a, b) => (b[1].best ? b[1].score + 1 : 0) - (a[1].best ? a[1].score + 1 : 0))[0];
  out.forearms = Object.assign({unit:fa[0]}, fa[1]);
  return out;
}
function rankColor(t){ return t < 0 ? '#262b35' : TIERS[t].c; }
function overallRank(R){
  const ranked = Object.keys(UNITS).map(u => R[u]).filter(x => x.best);
  if (!ranked.length) return null;
  const avg = ranked.reduce((a, x) => a + Math.max(0, x.score), 0) / ranked.length;
  return {tier:Math.floor(avg), avg, n:ranked.length};
}
/* ---------- body diagram (original artwork, left half mirrored) ---------- */
const BODY_FRONT = {
  _skin: ['M100,9 C111,9 117,19 117,31 C117,43 110,51 100,51 Z', 'M91,49 L100,49 L100,62 L89,62 Z', 'M56,190 C51,192 50,202 53,208 C57,212 62,210 63,204 C64,198 62,191 56,190 Z',
          'M80,168 C88,176 96,180 100,182 L100,198 L80,198 C78,188 78,178 80,168 Z', 'M83,287 C80,292 81,300 85,303 L95,303 C98,299 98,291 95,287 Z', 'M84,375 L96,375 L99,389 L77,389 Z'],
  traps: ['M89,56 L75,66 L90,64 Z'],
  deltF: ['M88,64 C74,62 61,67 56,80 C54,88 55,94 58,98 C64,94 70,88 74,80 C78,74 84,70 88,66 Z'],
  chestU: ['M99,67 L88,66 C80,72 75,79 73,87 L99,87 Z'],
  chestM: ['M99,87 L73,87 C72,90 72,96 72,98 C72,103 76,106 84,108 C92,110 98,106 99,102 Z'],
  deltS: ['M65,69 C59,73 56,79 55,86 C55,91 56,95 58,98 C59,90 61,82 66,74 Z'],
  biceps: ['M57,100 C53,110 52,124 55,136 C59,140 65,140 68,136 C70,124 70,110 68,98 C64,96 60,97 57,100 Z'],
  forearms: ['M54,140 C50,156 49,172 51,188 C55,190 59,190 62,188 C66,172 68,156 67,140 C63,142 58,142 54,140 Z'],
  abs: ['M99,110 L89,112 C87,128 87,146 89,166 C93,170 96,172 99,172 Z'],
  obliques: ['M87,112 C81,110 77,108 75,106 C74,124 76,144 80,160 C82,166 85,169 87,169 C85,150 85,130 87,112 Z'],

  quads: ['M80,199 C74,214 72,236 74,258 C76,272 80,281 84,285 L92,285 C93,262 93,236 92,212 C92,206 93,201 94,199 Z'],
  adductors: ['M94,199 L98,199 C99,206 99,216 99,228 C99,248 98,268 96,285 L92,285 C93,262 93,236 92,212 C92,206 93,201 94,199 Z'],
  calves: ['M82,305 C77,319 77,338 80,355 C82,365 84,371 86,373 L94,373 C96,360 97,340 96,322 C96,314 95,308 94,305 Z']
};
const BODY_BACK = {
  _skin: BODY_FRONT._skin.slice(0, 4).concat(['M83,289 C80,293 81,299 85,301 L95,301 C98,298 98,292 95,289 Z', 'M84,375 L96,375 L99,389 L77,389 Z']),
  traps: ['M100,50 L91,53 C86,58 80,62 73,66 C83,70 93,78 100,98 Z'],
  deltR: ['M73,66 C63,68 57,76 55,88 C56,94 58,98 60,98 C64,90 70,82 78,74 Z'],
  deltS: ['M64,69 C59,73 56,80 55,88 C56,94 58,98 60,98 C60,90 61,82 66,74 Z'],
  upperback: ['M100,98 C94,86 86,76 79,74 C75,82 75,92 79,101 C86,105 94,108 100,110 Z'],
  lats: ['M78,103 C74,97 72,90 72,84 C68,92 66,104 68,118 C72,136 80,150 90,160 L100,164 L100,111 C94,109 86,107 78,103 Z'],
  triceps: ['M57,100 C53,110 52,124 55,136 C59,140 65,140 68,136 C70,124 70,110 68,98 C64,96 60,97 57,100 Z'],
  forearms: BODY_FRONT.forearms,
  lowerback: ['M100,165 L90,161 C88,168 88,176 90,182 L100,184 Z'],
  glutes: ['M100,185 L90,183 C80,183 76,192 76,204 C76,216 84,224 94,224 C98,224 100,222 100,220 Z'],
  hamstrings: ['M77,223 C74,239 74,256 77,272 C79,280 82,285 85,287 L96,287 C98,272 99,254 99,236 C99,231 98,227 96,227 C88,229 81,227 77,223 Z'],
  calves: ['M81,303 C76,313 75,328 78,342 C80,356 84,367 87,373 L95,373 C97,360 98,342 97,322 C96,312 94,306 92,303 Z']
};
const RANK_KEY = {chestU:'upperChest', chestM:'midChest', deltF:'frontDelt', deltS:'sideDelt', deltR:'rearDelt'};
const rankKey = k => RANK_KEY[k] || k;
/** fill(k) gives each region's colour; clickable regions open the rank sheet */
function bodySvg(parts, fill, clickable, vb){
  if (typeof fill !== 'function') { const R = fill; fill = k => rankColor(R[rankKey(k)] ? R[rankKey(k)].tier : -1); clickable = true; }
  let s = '<svg viewBox="' + (vb || '40 0 120 395') + '" class="body">';
  for (const [k, paths] of Object.entries(parts)) {
    const col = k === '_skin' ? '#1d2129' : fill(k);
    paths.forEach(d => {
      const attrs = k === '_skin' || !clickable || !(UNITS[rankKey(k)] || rankKey(k) === 'forearms') ? '' : ` data-act="muscle" data-m="${rankKey(k)}"`;
      s += `<path d="${d}" fill="${col}"${attrs}/><path d="${d}" fill="${col}" transform="translate(200,0) scale(-1,1)"${attrs}/>`;
    });
  }
  return s + '</svg>';
}

VIEWS['gym/ranks'] = {render(){
  const R = computeRanks(), O = overallRank(R), bw = bodyweight(), total = Object.keys(UNITS).length;
  let h = `<div class="card" style="text-align:center"><div class="muted small">Overall</div>
      <div style="font-size:26px;font-weight:900;color:${O ? TIERS[O.tier < 0 ? 0 : O.tier].c : 'var(--muted)'}">${O ? (O.tier < 0 ? 'Unranked' : TIERS[O.tier].n) : 'Unranked'}</div>
      <div class="muted small">${O ? O.n + ' of ' + total + ' muscles ranked' : 'Log some workouts to get ranked'} · at ${r1(bw)} kg bodyweight</div></div>
    <div class="bodies"><div><div class="muted tiny" style="text-align:center">FRONT</div>${bodySvg(BODY_FRONT, R)}</div><div><div class="muted tiny" style="text-align:center">BACK</div>${bodySvg(BODY_BACK, R)}</div></div>
    <div class="chips" style="justify-content:center;margin:6px 0 4px">${TIERS.map(T => `<span class="chip" style="color:${T.c}">● ${T.n}</span>`).join('')}</div>
    <div class="muted tiny" style="text-align:center;margin-bottom:6px">Tap any muscle. Ranks compare your best estimated 1-rep max to your bodyweight (or best reps, for bodyweight moves) using rough strength standards.</div>`;
  UNIT_GROUPS.forEach(([region, list]) => {
    h += `<div class="sec">${region}</div>`;
    list.forEach(([u, label]) => {
      const x = R[u], t = x.best ? x.tier : -1, frac = x.best ? x.score - Math.max(t, 0) : 0;
      h += `<button class="food-row" data-act="muscle" data-m="${u}"><span class="grow"><div class="nm">${label}</div>
        <div class="track" style="margin-top:6px"><i style="width:${x.best ? (t < 0 ? x.score * 100 : clamp(frac * 100, 4, 100)) : 0}%;background:${rankColor(t < 0 ? 0 : t)}"></i></div></span>
        <span class="kc" style="color:${x.best ? rankColor(t < 0 ? 0 : t) : 'var(--muted)'}">${x.best ? (t < 0 ? 'Iron soon' : TIERS[t].n) : '–'}</span></button>`;
    });
  });
  return h;
}};
function openMuscle(m){
  const R = computeRanks(), bw = bodyweight();
  if (m === 'forearms') m = R.forearms.unit;
  const x = R[m], name = UNITS[m];
  const lifts = Object.entries(STD).filter(([, v]) => unitsOf(v).includes(m)).map(([n]) => n);
  openSheet(b => {
    if (!x.best) {
      html(b, `<h2>${name}</h2><div class="muted">Not ranked yet. Log any of these and finish the workout:</div><div class="chips" style="margin-top:10px">${lifts.map(n => `<span class="chip">${esc(n)}</span>`).join('')}</div>`);
      return;
    }
    const t = x.tier, B = x.best, nextT = TIERS[t + 1];
    let best, next = '';
    if (B.flag === 'reps') {
      best = `${B.r} reps in one set (Gold = ${Math.round(B.gold)})`;
      if (nextT) next = `Next: <b style="color:${nextT.c}">${nextT.n}</b> at <b>${Math.ceil(B.gold * nextT.x)} reps</b> in one set`;
    } else {
      const add = B.flag === 'bw' ? bw : B.flag === 'half' ? bw * 0.5 : 0;
      best = `${B.flag === 'bw' ? 'bodyweight + ' : B.flag === 'half' ? 'half bodyweight + ' : ''}${r1(B.w)} kg × ${B.r} · est. 1-rep max ${r1(B.val)} kg = ${(B.ratio).toFixed(2)}× bodyweight (Gold = ${(B.gold).toFixed(2)}×)`;
      if (nextT) {
        const needE1 = B.gold * nextT.x * bw, rr = Math.min(B.r, 12);
        const needLoad = needE1 / (1 + (rr > 1 ? rr / 30 : 0)) - add;
        next = `Next: <b style="color:${nextT.c}">${nextT.n}</b> at ${(B.gold * nextT.x).toFixed(2)}× bodyweight → about <b>${r1(Math.max(0, needLoad))} kg × ${B.r}</b>${add ? ' added' : ''}`;
      }
    }
    html(b, `<h2>${name}</h2>
      <div style="font-size:24px;font-weight:900;color:${rankColor(t < 0 ? 0 : t)}">${t < 0 ? 'Not quite Iron yet' : TIERS[t].n}</div>
      <div class="card" style="margin-top:10px"><b>Best lift: ${esc(B.name)}</b><div class="muted small">${best}</div>
      <div class="small" style="margin-top:8px">${nextT ? next + ' on ' + esc(B.name) : 'Top rank. Elite.'}</div></div>
      ${x.lifts.length > 1 ? `<div class="sec">Other lifts for ${name.toLowerCase()}</div>` + x.lifts.filter(l => l !== B).map(l => `<div class="item small" style="padding:6px 0;border-bottom:1px solid var(--line)"><span>${esc(l.name)}</span><span style="color:${rankColor(l.tier < 0 ? 0 : l.tier)}">${l.tier < 0 ? '–' : TIERS[l.tier].n}</span></div>`).join('') : ''}
      <div class="muted tiny" style="margin-top:12px">Rough standards for ${S.food.profile.sex === 'f' ? 'women' : 'men'}, my own estimates. Machines and cable stacks differ between gyms, so treat machine and cable ranks as a guide.</div>`);
  });
}ACTIONS.muscle = b => openMuscle(b.dataset.m);

/* ---------- mini diagrams: light up what a day / slot / exercise trains ---------- */
const SLOT_KEYS = {chestIncline:['chestU'], chestPress:['chestM'], chestFly:['chestM'], vPull:['lats'], latIso:['lats'], hRow:['upperback'], traps:['traps'],
  ohp:['deltF'], sideDelt:['deltS'], rearDelt:['deltR'], triOH:['triceps'], triPush:['triceps'], biLong:['biceps'], biHammer:['forearms'],
  squat:['quads','glutes','adductors'], legPress:['quads','glutes'], quadIso:['quads'], hinge:['hamstrings','glutes','lowerback'], hamCurl:['hamstrings'], glute:['glutes'], calves:['calves'], abs:['abs'],
  flexors:['forearms'], extensors:['forearms'], lowerBack:['lowerback'], adductors:['adductors'], abductors:['glutes'], tibialis:['tibialis'], obliques:['obliques'], neck:['neck']};
const MUSCLE_KEYS = {upperChest:['chestU'], midChest:['chestM'], lats:['lats'], upperback:['upperback'], traps:['traps'], lowerback:['lowerback'],
  frontDelt:['deltF'], sideDelt:['deltS'], rearDelt:['deltR'], biceps:['biceps'], triceps:['triceps'], brachio:['forearms'], flexors:['forearms'], extensors:['forearms'],
  quads:['quads'], hamstrings:['hamstrings'], glutes:['glutes'], adductors:['adductors'], abductors:['glutes'], calves:['calves'], tibialis:['tibialis'],
  abs:['abs'], obliques:['obliques'], neck:['neck'],
  chest:['chestU','chestM'], back:['lats','upperback'], shoulders:['deltF','deltS','deltR'], forearms:['forearms']};
const POOL_KEYS = {upperChest:['chestU'], midChest:['chestM'], lats:['lats'], upperback:['upperback'], traps:['traps'], frontDelt:['deltF'],
  sideDelt:['deltS'], rearDelt:['deltR'], triOverhead:['triceps'], triNormal:['triceps'], biceps:['biceps'], brachio:['forearms'], flexors:['forearms'], extensors:['forearms'], lowerBack:['lowerback'],
  adductors:['adductors'], abductors:['glutes'], tibialis:['tibialis'], obliques:['obliques'], neck:['neck'], quads:['quads'],
  hamstrings:['hamstrings'], glutes:['glutes'], calves:['calves'], abs:['abs']};
/** keys: regions to light up. second: regions to light up softly (e.g. indirectly worked). */
const FRONT_ONLY = ['chestU','chestM','deltF','biceps','abs','obliques','quads','adductors','tibialis'], BACK_ONLY = ['deltR','upperback','lats','triceps','lowerback','glutes','hamstrings'];
/** auto: only draw the side(s) of the body that are working (for small spaces) */
function miniBody(keys, h, second, auto){
  const on_ = new Set(keys || []), soft = new Set(second || []);
  const fill = k => on_.has(k) ? 'var(--accent)' : soft.has(k) ? 'rgba(163,230,53,.35)' : '#2b303b';
  let front = true, back = true;
  if (auto && on_.size) { front = [...on_].some(k => !BACK_ONLY.includes(k)); back = [...on_].some(k => !FRONT_ONLY.includes(k)); if (!front && !back) front = back = true; }
  // auto: zoom to the upper or lower half when that's all that works
  const LOW = ['quads','hamstrings','glutes','calves','lowerback'];
  let vb = null;
  if (auto && on_.size) { const ks = [...on_]; if (ks.every(k => !LOW.includes(k))) vb = '40 4 120 200'; else if (ks.every(k => LOW.includes(k))) vb = '40 150 120 240'; }
  return `<div class="mini-body" style="height:${h || 120}px">${front ? bodySvg(BODY_FRONT, fill, false, vb) : ''}${back ? bodySvg(BODY_BACK, fill, false, vb) : ''}</div>`;
}
function exerciseKeys(name){
  const k = new Set();
  Object.keys(POOLS).forEach(p => { if (poolOf(p).some(o => o[0] === name)) (POOL_KEYS[p] || []).forEach(x => k.add(x)); });
  return [...k];
}