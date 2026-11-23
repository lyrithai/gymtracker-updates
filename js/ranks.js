'use strict';
/* ================= strength ranks + body diagram ================= */
const MUSCLE_NAMES = {chest:'Chest', shoulders:'Shoulders', biceps:'Biceps', triceps:'Triceps', forearms:'Forearms', abs:'Abs', traps:'Traps',
  lats:'Lats', upperback:'Upper back', lowerback:'Lower back', glutes:'Glutes', quads:'Quads', hamstrings:'Hamstrings', calves:'Calves'};
const LOWER = ['glutes','quads','hamstrings','calves','lowerback'];
const TIERS = [
  {n:'Iron', c:'#7c8594', x:0.3}, {n:'Bronze', c:'#c98a4b', x:0.5}, {n:'Silver', c:'#cfd6e0', x:0.75}, {n:'Gold', c:'#fbbf24', x:1.0},
  {n:'Platinum', c:'#5eead4', x:1.25}, {n:'Diamond', c:'#60a5fa', x:1.5}, {n:'Elite', c:'#e879f9', x:1.8}
];
// Rough standards: estimated 1-rep max ÷ bodyweight for a "Gold" (solid intermediate) adult man.
// Dumbbell lifts are per dumbbell. bw: bodyweight is part of the load (pull-ups, dips).
const STD = {
  'Bench Press':['chest',1.15], 'Paused Bench Press':['chest',1.1], 'Incline Bench Press':['chest',0.95], 'Dumbbell Bench Press':['chest',0.42],
  'Incline Dumbbell Press':['chest',0.36], 'Low-Incline Dumbbell Press':['chest',0.38], 'Machine Chest Press':['chest',1.0],
  'Hammer Strength Chest Press':['chest',1.1], 'Smith Machine Incline Press':['chest',0.95], 'Pec Deck':['chest',0.9], 'Chest Dips':['chest',1.45,'bw'],
  'Weighted Dips':['chest',1.45,'bw'], 'Close-Grip Bench Press':['triceps',1.0],
  'Overhead Press':['shoulders',0.7], 'Seated Dumbbell Shoulder Press':['shoulders',0.3], 'Machine Shoulder Press':['shoulders',0.75], 'Arnold Press':['shoulders',0.27],
  'Lateral Raise':['shoulders',0.14], 'Lean-Away Lateral Raise':['shoulders',0.12], 'Cable Lateral Raise':['shoulders',0.1], 'Machine Lateral Raise':['shoulders',0.45],
  'Reverse Pec Deck':['shoulders',0.6], 'Face Pull':['shoulders',0.45], 'Rear Delt Fly':['shoulders',0.12], 'Push Press':['shoulders',0.9],
  'Barbell Curl':['biceps',0.55], 'EZ Bar Curl':['biceps',0.55], 'Bicep Curl':['biceps',0.22], 'Incline Dumbbell Curl':['biceps',0.18], 'Hammer Curl':['biceps',0.25],
  'Preacher Curl':['biceps',0.45], 'Machine Preacher Curl':['biceps',0.5], 'Bayesian Curl':['biceps',0.15], 'Cable Curl':['biceps',0.5], 'Concentration Curl':['biceps',0.2],
  'Tricep Pushdown':['triceps',0.6], 'Rope Pushdown':['triceps',0.5], 'Overhead Cable Tricep Extension':['triceps',0.5], 'Katana Tricep Extension':['triceps',0.25],
  'Skull Crusher':['triceps',0.5], 'Dumbbell Skull Crusher':['triceps',0.2], 'JM Press':['triceps',0.8], 'Dips':['triceps',1.45,'bw'],
  'Wrist Curl':['forearms',0.5], 'Reverse Curl':['forearms',0.4], 'Reverse Wrist Curl':['forearms',0.3],
  'Cable Crunch':['abs',0.9],
  'Barbell Shrug':['traps',1.6], 'Dumbbell Shrug':['traps',0.6], 'Kelso Shrug':['traps',0.8], 'Rack Pull':['traps',2.2],
  'Pull-up':['lats',1.35,'bw'], 'Weighted Pull-up':['lats',1.35,'bw'], 'Chin-up':['lats',1.4,'bw'], 'Lat Pulldown':['lats',0.95], 'Neutral-Grip Pulldown':['lats',1.0],
  'Single-Arm Lat Pulldown':['lats',0.45], 'Kneeling Single-Arm Pulldown':['lats',0.4], 'Straight-Arm Pulldown':['lats',0.45], 'Cable Pullover':['lats',0.45],
  'Keenan Flaps':['lats',0.3], 'Dumbbell Pullover':['lats',0.35],
  'Barbell Row':['upperback',1.0], 'Pendlay Row':['upperback',0.95], 'Yates Row':['upperback',1.05], 'Seated Cable Row':['upperback',1.0],
  'Chest-Supported T-Bar Row':['upperback',0.9], 'T-Bar Row':['upperback',1.0], 'Dumbbell Row':['upperback',0.45], 'Machine Row':['upperback',1.0],
  'Seal Row':['upperback',0.8], 'Kroc Row':['upperback',0.5], 'Meadows Row':['upperback',0.5], 'Single-Arm Cable Row':['upperback',0.45],
  'Deadlift':['lowerback',2.0], 'Good Morning':['lowerback',0.9], 'Trap Bar Deadlift':['lowerback',2.1],
  'Squat':['quads',1.5], 'High-Bar Squat':['quads',1.45], 'Front Squat':['quads',1.2], 'Pause Squat':['quads',1.3], 'Hack Squat':['quads',1.6],
  'Pendulum Squat':['quads',1.6], 'Smith Machine Squat':['quads',1.5], 'Belt Squat':['quads',1.5], 'Leg Press':['quads',2.8], 'Leg Extension':['quads',1.0],
  'Goblet Squat':['quads',0.6], 'Bulgarian Split Squat':['quads',0.35],
  'Romanian Deadlift':['hamstrings',1.5], 'Stiff-Leg Deadlift':['hamstrings',1.4], 'Lying Leg Curl':['hamstrings',0.65], 'Seated Leg Curl':['hamstrings',0.75],
  'Hip Thrust':['glutes',2.0], 'Smith Machine Hip Thrust':['glutes',2.0], 'Glute Bridge':['glutes',1.8], 'Sumo Deadlift':['glutes',2.0], 'Hip Abduction':['glutes',1.2],
  'Standing Calf Raise':['calves',1.5], 'Seated Calf Raise':['calves',1.0], 'Leg Press Calf Raise':['calves',2.5]
};
function bodyweight(){ const w = S.body.weights; return (w.length ? w[w.length - 1].kg : S.food.profile.weight) || 75; }
function tierOf(ratio, gold){ let t = -1; TIERS.forEach((T, i) => { if (ratio >= gold * T.x) t = i; }); return t; }
/** {muscle: {tier, score, best:{name, w, r, e1, ratio}, gold, next}} from all logged workouts */
function computeRanks(){
  const bw = bodyweight(), fem = S.food.profile.sex === 'f';
  const out = {};
  Object.keys(MUSCLE_NAMES).forEach(m => out[m] = {tier:-1, score:0, best:null, lifts:[]});
  const best = {};
  S.workouts.forEach(w => w.exercises.forEach(e => {
    const name = exName(e.exId), st = STD[name]; if (!st) return;
    e.sets.forEach(s => {
      if (!(s.r > 0)) return;
      const load = (s.w || 0) + (st[2] === 'bw' ? bw : 0);
      const r = Math.min(s.r, 12);
      const e1 = load * (1 + (r > 1 ? r / 30 : 0));
      if (!best[name] || e1 > best[name].e1) best[name] = {name, w:s.w || 0, r:s.r, e1, t:w.start};
    });
  }));
  Object.values(best).forEach(b => {
    const [m, goldM, flag] = STD[b.name];
    const gold = goldM * (fem ? (LOWER.includes(m) ? 0.75 : 0.6) : 1);
    const ratio = b.e1 / bw, tier = tierOf(ratio, gold);
    const score = tier + (tier < TIERS.length - 1 ? clamp((ratio - (tier >= 0 ? gold * TIERS[tier].x : 0)) / (gold * TIERS[tier + 1].x - (tier >= 0 ? gold * TIERS[tier].x : 0)), 0, 0.99) : 0);
    const rec = Object.assign({}, b, {ratio, tier, score, gold, flag});
    out[m].lifts.push(rec);
    if (!out[m].best || score > out[m].score) Object.assign(out[m], {tier, score, best:rec, gold});
  });
  return out;
}
function rankColor(t){ return t < 0 ? '#262b35' : TIERS[t].c; }
function overallRank(R){
  const ranked = Object.values(R).filter(x => x.best);
  if (!ranked.length) return null;
  const avg = ranked.reduce((a, x) => a + Math.max(0, x.score), 0) / ranked.length;
  return {tier:Math.floor(avg), avg, n:ranked.length};
}

/* ---------- body diagram (original artwork, left half mirrored) ---------- */
const BODY_FRONT = {
  _skin: ['M100,9 C111,9 117,19 117,31 C117,43 110,51 100,51 Z', 'M91,49 L100,49 L100,62 L89,62 Z', 'M56,190 C51,192 50,202 53,208 C57,212 62,210 63,204 C64,198 62,191 56,190 Z',
          'M80,168 C88,176 96,180 100,182 L100,198 L80,198 C78,188 78,178 80,168 Z', 'M83,287 C80,292 81,300 85,303 L95,303 C98,299 98,291 95,287 Z', 'M84,375 L96,375 L99,389 L77,389 Z'],
  traps: ['M89,56 L75,66 L90,64 Z'],
  shoulders: ['M88,64 C74,62 61,67 56,80 C54,88 55,94 58,98 C64,94 70,88 74,80 C78,74 84,70 88,66 Z'],
  chest: ['M99,67 L88,66 C80,72 74,80 72,92 C72,100 76,106 84,108 C92,110 98,106 99,102 Z'],
  biceps: ['M57,100 C53,110 52,124 55,136 C59,140 65,140 68,136 C70,124 70,110 68,98 C64,96 60,97 57,100 Z'],
  forearms: ['M54,140 C50,156 49,172 51,188 C55,190 59,190 62,188 C66,172 68,156 67,140 C63,142 58,142 54,140 Z'],
  abs: ['M99,110 L89,112 C87,128 87,146 89,166 C93,170 96,172 99,172 Z', 'M87,112 C81,110 77,108 75,106 C74,124 76,144 80,160 C82,166 85,169 87,169 C85,150 85,130 87,112 Z'],
  quads: ['M80,199 C74,214 72,236 74,258 C76,272 80,281 84,285 L96,285 C98,270 99,248 99,228 C99,214 99,204 98,199 Z'],
  calves: ['M82,305 C77,319 77,338 80,355 C82,365 84,371 86,373 L94,373 C96,360 97,340 96,322 C96,314 95,308 94,305 Z']
};
const BODY_BACK = {
  _skin: BODY_FRONT._skin.slice(0, 4).concat(['M83,289 C80,293 81,299 85,301 L95,301 C98,298 98,292 95,289 Z', 'M84,375 L96,375 L99,389 L77,389 Z']),
  traps: ['M100,50 L91,53 C86,58 80,62 73,66 C83,70 93,78 100,98 Z'],
  shoulders: ['M73,66 C63,68 57,76 55,88 C56,94 58,98 60,98 C64,90 70,82 78,74 Z'],
  upperback: ['M100,98 C94,86 86,76 79,74 C75,82 75,92 79,101 C86,105 94,108 100,110 Z'],
  lats: ['M78,103 C74,97 72,90 72,84 C68,92 66,104 68,118 C72,136 80,150 90,160 L100,164 L100,111 C94,109 86,107 78,103 Z'],
  triceps: ['M57,100 C53,110 52,124 55,136 C59,140 65,140 68,136 C70,124 70,110 68,98 C64,96 60,97 57,100 Z'],
  forearms: BODY_FRONT.forearms,
  lowerback: ['M100,165 L90,161 C88,168 88,176 90,182 L100,184 Z'],
  glutes: ['M100,185 L90,183 C80,183 76,192 76,204 C76,216 84,224 94,224 C98,224 100,222 100,220 Z'],
  hamstrings: ['M77,223 C74,239 74,256 77,272 C79,280 82,285 85,287 L96,287 C98,272 99,254 99,236 C99,231 98,227 96,227 C88,229 81,227 77,223 Z'],
  calves: ['M81,303 C76,313 75,328 78,342 C80,356 84,367 87,373 L95,373 C97,360 98,342 97,322 C96,312 94,306 92,303 Z']
};
function bodySvg(parts, R){
  let s = '<svg viewBox="40 0 120 395" class="body">';
  for (const [k, paths] of Object.entries(parts)) {
    const fill = k === '_skin' ? '#1d2129' : rankColor(R[k] ? R[k].tier : -1);
    paths.forEach(d => {
      const attrs = k === '_skin' ? '' : ` data-act="muscle" data-m="${k}"`;
      s += `<path d="${d}" fill="${fill}"${attrs}/><path d="${d}" fill="${fill}" transform="translate(200,0) scale(-1,1)"${attrs}/>`;
    });
  }
  return s + '</svg>';
}

VIEWS['gym/ranks'] = {render(){
  const R = computeRanks(), O = overallRank(R), bw = bodyweight();
  let h = `<div class="card" style="text-align:center"><div class="muted small">Overall</div>
      <div style="font-size:26px;font-weight:900;color:${O ? TIERS[O.tier < 0 ? 0 : O.tier].c : 'var(--muted)'}">${O ? (O.tier < 0 ? 'Unranked' : TIERS[O.tier].n) : 'Unranked'}</div>
      <div class="muted small">${O ? O.n + ' of 14 muscle groups ranked' : 'Log some workouts to get ranked'} · at ${r1(bw)} kg bodyweight</div></div>
    <div class="bodies"><div><div class="muted tiny" style="text-align:center">FRONT</div>${bodySvg(BODY_FRONT, R)}</div><div><div class="muted tiny" style="text-align:center">BACK</div>${bodySvg(BODY_BACK, R)}</div></div>
    <div class="chips" style="justify-content:center;margin:6px 0 4px">${TIERS.map(T => `<span class="chip" style="color:${T.c}">● ${T.n}</span>`).join('')}</div>
    <div class="muted tiny" style="text-align:center;margin-bottom:6px">Tap a muscle. Ranks compare your best estimated 1-rep max to your bodyweight using rough strength standards.</div>`;
  h += `<div class="sec">Muscle groups</div>`;
  Object.keys(MUSCLE_NAMES).map(m => [m, R[m]]).sort((a, b) => (b[1].score + (b[1].best ? 1 : 0)) - (a[1].score + (a[1].best ? 1 : 0))).forEach(([m, x]) => {
    const t = x.best ? x.tier : -1, frac = x.best ? x.score - Math.max(t, 0) : 0;
    h += `<button class="food-row" data-act="muscle" data-m="${m}"><span class="grow"><div class="nm">${MUSCLE_NAMES[m]}</div>
      <div class="track" style="margin-top:6px"><i style="width:${x.best ? (t < 0 ? x.score * 100 : clamp(frac * 100, 4, 100)) : 0}%;background:${rankColor(t < 0 ? 0 : t)}"></i></div></span>
      <span class="kc" style="color:${x.best ? rankColor(t < 0 ? 0 : t) : 'var(--muted)'}">${x.best ? (t < 0 ? 'Iron soon' : TIERS[t].n) : '–'}</span></button>`;
  });
  return h;
}};
function openMuscle(m){
  const R = computeRanks(), x = R[m], bw = bodyweight();
  const lifts = Object.entries(STD).filter(([, v]) => v[0] === m).map(([n]) => n);
  openSheet(b => {
    if (!x.best) {
      html(b, `<h2>${MUSCLE_NAMES[m]}</h2><div class="muted">Not ranked yet. Log any of these and finish the workout:</div><div class="chips" style="margin-top:10px">${lifts.map(n => `<span class="chip">${esc(n)}</span>`).join('')}</div>`);
      return;
    }
    const t = x.tier, B = x.best, nextT = TIERS[t + 1];
    const needE1 = nextT ? x.gold * nextT.x * bw : null;
    const needLoad = needE1 != null ? needE1 / (1 + (B.r > 1 ? Math.min(B.r, 12) / 30 : 0)) - (B.flag === 'bw' ? bw : 0) : null;
    html(b, `<h2>${MUSCLE_NAMES[m]}</h2>
      <div style="font-size:24px;font-weight:900;color:${rankColor(t < 0 ? 0 : t)}">${t < 0 ? 'Not quite Iron yet' : TIERS[t].n}</div>
      <div class="card" style="margin-top:10px"><b>Best lift: ${esc(B.name)}</b><div class="muted small">${B.flag === 'bw' ? 'bodyweight + ' : ''}${r1(B.w)} kg × ${B.r} · est. 1-rep max ${r1(B.e1)} kg = ${r1(B.ratio)}× bodyweight</div>
      ${nextT ? `<div class="small" style="margin-top:8px">Next: <b style="color:${nextT.c}">${nextT.n}</b> at ${r1(x.gold * nextT.x)}× bodyweight → about <b>${r1(Math.max(0, needLoad))} kg × ${B.r}</b>${B.flag === 'bw' ? ' added' : ''} on ${esc(B.name)}</div>` : '<div class="small" style="margin-top:8px">Top rank. Elite.</div>'}</div>
      ${x.lifts.length > 1 ? `<div class="sec">Other lifts</div>` + x.lifts.filter(l => l !== B).map(l => `<div class="item small" style="padding:6px 0;border-bottom:1px solid var(--line)"><span>${esc(l.name)}</span><span style="color:${rankColor(l.tier < 0 ? 0 : l.tier)}">${l.tier < 0 ? '–' : TIERS[l.tier].n} · ${r1(l.ratio)}×</span></div>`).join('') : ''}
      <div class="muted tiny" style="margin-top:12px">Rough standards for ${S.food.profile.sex === 'f' ? 'women' : 'men'}. Machines differ between gyms, so treat machine ranks as a guide.</div>`);
  });
}
ACTIONS.muscle = b => openMuscle(b.dataset.m);
