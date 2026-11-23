'use strict';
/* ================= program builder + onboarding ================= */
// Evidence-based hypertrophy programming: each muscle ~2x a week, ~10-20 hard sets a week,
// stable movements with a big stretch preferred. equip: m machine/cable, b barbell, d dumbbell, w bodyweight.
const SLOTS = {
  chestPress:  {m:'chest', what:'a chest press', opts:[['Machine Chest Press','m','Stable, so you can push close to failure safely'],['Dumbbell Bench Press','d','Deep stretch at the bottom'],['Bench Press','b','Best for raw pressing strength'],['Hammer Strength Chest Press','m',''],['Push-up','w','No kit needed']]},
  chestIncline:{m:'chest', what:'an incline press for your upper chest', opts:[['Low-Incline Dumbbell Press','d','Upper chest with a big stretch'],['Smith Machine Incline Press','m','Stable and easy to progress'],['Incline Bench Press','b',''],['Incline Dumbbell Press','d',''],['Deficit Push-up','w','']]},
  chestFly:    {m:'chest', what:'a chest fly', opts:[['Pec Deck','m','Constant tension, safe to take to failure'],['Low-to-High Cable Fly','m',''],['Cable Crossover','m',''],['Incline Dumbbell Fly','d','Huge stretch'],['Deficit Push-up','w','']]},
  vPull:       {m:'lats', what:'a vertical pull', opts:[['Lat Pulldown','m','Easy to load and progress'],['Neutral-Grip Pulldown','m',''],['Pull-up','w','The bodyweight classic'],['Chin-up','w',''],['Single-Arm Lat Pulldown','m','Big stretch per side']]},
  hRow:        {m:'upperback', what:'a row', opts:[['Chest-Supported T-Bar Row','m','No lower back fatigue, all upper back'],['Seated Cable Row','m',''],['Machine Row','m',''],['Seal Row','b',''],['Dumbbell Row','d','Works anywhere'],['Barbell Row','b','']]},
  latIso:      {m:'lats', what:'a lat isolation', opts:[['Cable Pullover','m','Lats through a full stretch'],['Keenan Flaps','m','Social-media favourite for lats'],['Straight-Arm Pulldown','m',''],['Dumbbell Pullover','d','']]},
  ohp:         {m:'shoulders', what:'an overhead press', opts:[['Machine Shoulder Press','m','Stable, easy on the joints'],['Seated Dumbbell Shoulder Press','d','Free path for your shoulders'],['Overhead Press','b','Strength builder']]},
  sideDelt:    {m:'shoulders', what:'a lateral raise for wider shoulders', opts:[['Cable Lateral Raise','m','Keeps tension where dumbbells go light'],['Lean-Away Lateral Raise','d',''],['Lateral Raise','d','Classic, works anywhere'],['Machine Lateral Raise','m',''],['Behind-the-Back Cable Lateral Raise','m','']]},
  rearDelt:    {m:'shoulders', what:'a rear delt move', opts:[['Reverse Pec Deck','m','Easiest rear delt move to feel'],['Cable Rear Delt Fly','m',''],['Face Pull','m',''],['Rear Delt Fly','d','']]},
  triOH:       {m:'triceps', what:'an overhead triceps extension', opts:[['Overhead Cable Tricep Extension','m','Long head in a stretch, best for growth'],['Katana Tricep Extension','m',''],['Skull Crusher','b',''],['Dumbbell Skull Crusher','d','']]},
  triPush:     {m:'triceps', what:'a triceps pushdown or dip', opts:[['Rope Pushdown','m',''],['Tricep Pushdown','m','Simple to load heavy'],['Dips','w','Heavy compound for triceps'],['Tricep Kickback','d','']]},
  biLong:      {m:'biceps', what:'a curl with a big stretch', opts:[['Incline Dumbbell Curl','d','Biceps at full stretch'],['Bayesian Curl','m','Cable tension at the stretch'],['Preacher Curl','m',''],['EZ Bar Curl','b','']]},
  biHammer:    {m:'biceps', what:'a hammer or heavy curl', opts:[['Hammer Curl','d','Biceps plus forearms'],['Cross-Body Hammer Curl','d',''],['EZ Bar Curl','b',''],['Cable Curl','m','']]},
  squat:       {m:'quads', what:'a squat pattern', opts:[['Hack Squat','m','Quads take the load, back stays fresh'],['Pendulum Squat','m',''],['Smith Machine Squat','m',''],['Squat','b','Best for overall strength'],['Leg Press','m',''],['Goblet Squat','d','Works at home']]},
  quadIso:     {m:'quads', what:'a quad isolation', opts:[['Leg Extension','m','Hits the part of the quad squats miss'],['Sissy Squat','w',''],['Reverse Nordic','w','']]},
  legPress:    {m:'quads', what:'a second leg compound', opts:[['Leg Press','m','Heavy and safe'],['Bulgarian Split Squat','d','Big glute and quad stretch'],['Walking Lunge','d',''],['Belt Squat','m','']]},
  hinge:       {m:'hamstrings', what:'a hip hinge', opts:[['Romanian Deadlift','b','Best hamstring stretch under load'],['Stiff-Leg Deadlift','b',''],['B-Stance RDL','d',''],['45° Back Extension','m','']]},
  hamCurl:     {m:'hamstrings', what:'a leg curl', opts:[['Seated Leg Curl','m','Trains hamstrings at length, more growth'],['Lying Leg Curl','m',''],['Nordic Curl','w','']]},
  glute:       {m:'glutes', what:'a glute move', opts:[['Hip Thrust','b','Heaviest glute loading'],['Smith Machine Hip Thrust','m',''],['Hip Abduction','m',''],['Cable Glute Kickback','m',''],['Glute Bridge','w','']]},
  calves:      {m:'calves', what:'a calf raise', opts:[['Standing Calf Raise','d','Pause in the bottom stretch'],['Leg Press Calf Raise','m',''],['Seated Calf Raise','m','']]},
  abs:         {m:'abs', what:'an ab move', opts:[['Cable Crunch','m','Load abs like any other muscle'],['Hanging Leg Raise','w',''],['Ab Wheel Rollout','w',''],['Decline Sit-up','w','']]},
  traps:       {m:'traps', what:'a shrug', opts:[['Kelso Shrug','m','Mid-traps, social-media favourite'],['Dumbbell Shrug','d',''],['Barbell Shrug','b','']]}
};
const DAYS = {
  fbA:  ['Full Body A', [['squat',3,'6-10'],['chestPress',3,'6-10'],['hRow',3,'8-12'],['hamCurl',3,'10-15'],['sideDelt',3,'12-20'],['biLong',2,'10-15'],['triPush',2,'10-15'],['calves',2,'10-15']]],
  fbB:  ['Full Body B', [['hinge',3,'6-10'],['chestIncline',3,'8-12'],['vPull',3,'8-12'],['quadIso',3,'10-15'],['sideDelt',3,'12-20'],['triOH',2,'10-15'],['biHammer',2,'10-15'],['abs',2,'10-15']]],
  fbC:  ['Full Body C', [['legPress',3,'8-12'],['chestFly',3,'10-15'],['hRow',3,'8-12'],['ohp',2,'8-12'],['hamCurl',2,'10-15'],['rearDelt',2,'12-20'],['biLong',2,'10-15'],['triOH',2,'10-15']]],
  upA:  ['Upper A', [['chestPress',3,'6-10'],['hRow',3,'8-12'],['vPull',3,'8-12'],['chestFly',2,'10-15'],['ohp',2,'8-12'],['sideDelt',3,'12-20'],['triOH',3,'10-15'],['biLong',3,'10-15']]],
  loA:  ['Lower A', [['squat',3,'6-10'],['hamCurl',3,'10-15'],['legPress',3,'8-12'],['quadIso',2,'10-15'],['calves',3,'10-15'],['abs',2,'10-15']]],
  upB:  ['Upper B', [['chestIncline',3,'8-12'],['vPull',3,'8-12'],['hRow',3,'8-12'],['chestFly',2,'10-15'],['sideDelt',3,'12-20'],['rearDelt',2,'12-20'],['biHammer',3,'10-15'],['triPush',3,'10-15']]],
  loB:  ['Lower B', [['hinge',3,'6-10'],['quadIso',3,'10-15'],['legPress',2,'8-12'],['hamCurl',3,'10-15'],['glute',2,'8-12'],['calves',3,'10-15'],['abs',2,'10-15']]],
  push: ['Push', [['chestIncline',3,'8-12'],['chestFly',3,'10-15'],['ohp',2,'8-12'],['sideDelt',4,'12-20'],['triOH',3,'10-15'],['triPush',2,'10-15']]],
  pull: ['Pull', [['vPull',3,'8-12'],['hRow',3,'8-12'],['latIso',2,'10-15'],['rearDelt',3,'12-20'],['biLong',3,'10-15'],['biHammer',2,'10-15'],['traps',2,'10-15']]],
  legs: ['Legs', [['hinge',3,'6-10'],['quadIso',3,'10-15'],['legPress',3,'8-12'],['hamCurl',3,'10-15'],['glute',2,'8-12'],['calves',3,'10-15']]],
  pushA:['Push A', [['chestPress',3,'6-10'],['chestIncline',3,'8-12'],['ohp',2,'8-12'],['sideDelt',4,'12-20'],['triOH',3,'10-15'],['triPush',2,'10-15']]],
  pullA:['Pull A', [['vPull',3,'8-12'],['hRow',3,'8-12'],['latIso',2,'10-15'],['rearDelt',3,'12-20'],['biLong',3,'10-15'],['biHammer',2,'10-15']]],
  legsA:['Legs A', [['squat',3,'6-10'],['hamCurl',3,'10-15'],['legPress',3,'8-12'],['quadIso',2,'10-15'],['calves',3,'10-15'],['abs',2,'10-15']]],
  pushB:['Push B', [['chestIncline',3,'8-12'],['chestFly',3,'10-15'],['ohp',2,'8-12'],['sideDelt',4,'12-20'],['triOH',2,'10-15'],['triPush',2,'10-15']]],
  pullB:['Pull B', [['hRow',3,'8-12'],['vPull',3,'8-12'],['latIso',2,'10-15'],['rearDelt',2,'12-20'],['biLong',2,'10-15'],['biHammer',2,'10-15'],['traps',2,'10-15']]],
  legsB:['Legs B', [['hinge',3,'6-10'],['quadIso',3,'10-15'],['legPress',3,'8-12'],['hamCurl',3,'10-15'],['glute',2,'8-12'],['calves',3,'10-15'],['abs',2,'10-15']]]
};
const SPLITS = {
  2: {name:'Full body × 2', days:['fbA','fbB'], why:'Two full-body days hit every muscle twice a week.'},
  3: {name:'Full body × 3', days:['fbA','fbB','fbC'], why:'Three full-body days: every muscle 2–3 times a week with short sessions.'},
  4: {name:'Upper / Lower', days:['upA','loA','upB','loB'], why:'Upper/lower twice: each muscle twice a week, the sweet spot for most people.'},
  5: {name:'Upper / Lower / Push / Pull / Legs', days:['upA','loA','push','pull','legs'], why:'Upper/lower plus push/pull/legs: every muscle twice a week with room for extra volume.'},
  6: {name:'Push / Pull / Legs × 2', days:['pushA','pullA','legsA','pushB','pullB','legsB'], why:'PPL twice: high volume, each muscle twice a week.'}
};
const SCHEDULE = {2:'e.g. Mon & Thu', 3:'e.g. Mon, Wed, Fri', 4:'e.g. Mon, Tue, Thu, Fri', 5:'e.g. Mon–Fri or with a rest day mid-week', 6:'e.g. Mon–Sat, Sunday off'};
const FOCUS = [['chest','Chest'],['back','Back'],['shoulders','Shoulders'],['arms','Arms'],['legs','Legs'],['glutes','Glutes']];
const FOCUS_OF = {chest:['chest'], lats:['back'], upperback:['back'], traps:['back'], shoulders:['shoulders'], biceps:['arms'], triceps:['arms'], quads:['legs'], hamstrings:['legs','glutes'], glutes:['glutes'], calves:['legs'], abs:[]};
const EQUIP = {full:['m','b','d','w'], basic:['b','d','w'], home:['d','w']};
// Hard sets that fit a session (about 3.3 minutes per set including rest and warm-ups).
const SET_BUDGET = {45:14, 60:18, 75:22, 90:26};

function slotOptions(key, equip){
  const ok = EQUIP[equip] || EQUIP.full;
  return SLOTS[key].opts.filter(o => ok.includes(o[1]));
}
/** Days -> [{key, name, slots:[{slot, sets, reps}]}] adjusted for time, experience and focus. */
const VOL_GROUP = {lats:'back', upperback:'back', traps:'back', hamstrings:'posterior', glutes:'posterior'};
function buildPlan(u){
  const split = SPLITS[u.days];
  const focusOf = x => (u.focus || []).some(f => (FOCUS_OF[SLOTS[x.slot].m] || []).includes(f));
  const days = split.days.map(dk => {
    const [name, slots] = DAYS[dk];
    const list = slots.filter(([s]) => slotOptions(s, u.equip).length).map(([slot, sets, reps]) => ({slot, sets, reps}));
    list.forEach((x, i) => {
      if (u.exp === 'beginner') x.sets = Math.min(x.sets, 3);
      if (u.exp === 'advanced' && i < 2) x.sets += 1;
      if (focusOf(x)) x.sets += 1;
    });
    return {key:dk, name, slots:list};
  });
  // Fit each session's time by trimming sets (never below 2, every movement kept). Sets come off whichever
  // muscle group already has the most weekly volume, so the week stays balanced; focus muscles are trimmed last.
  const grp = x => { const m = SLOTS[x.slot].m; return VOL_GROUP[m] || m; };
  const weekly = {};
  days.forEach(d => d.slots.forEach(x => weekly[grp(x)] = (weekly[grp(x)] || 0) + x.sets));
  const budget = (SET_BUDGET[u.session] || 18) - (u.exp === 'beginner' ? 2 : 0);
  days.forEach(d => {
    const total = () => d.slots.reduce((a, x) => a + x.sets, 0);
    while (total() > budget) {
      const cands = d.slots.filter(x => x.sets > 2);
      if (!cands.length) { if (d.slots.length <= 4) break; const gone = d.slots.pop(); weekly[grp(gone)] -= gone.sets; continue; }
      cands.sort((a, b) => (focusOf(a) - focusOf(b)) || (weekly[grp(b)] - weekly[grp(a)]) || (b.sets - a.sets));
      cands[0].sets--; weekly[grp(cands[0])]--;
    }
  });
  return days;
}
function weeklySets(plan){
  const w = {};
  plan.forEach(d => d.slots.forEach(x => { const m = SLOTS[x.slot].m; w[m] = (w[m] || 0) + x.sets; }));
  return w;
}

/* ---------- onboarding ---------- */
let OB = null;
function startOnboarding(fromSettings){
  const p = S.food.profile, u = S.user || {};
  OB = {step:0, fromSettings:!!fromSettings, picks:{}, pickIdx:0,
    d:{name:u.name || '', goals:u.goals || [], sex:p.sex || 'm', age:p.age || 25, height:p.height || 178, weight:(S.body.weights.length ? S.body.weights[S.body.weights.length - 1].kg : p.weight) || 75,
       hUnit:u.hUnit || 'cm', wUnit:u.wUnit || 'kg', nGoal:p.goal || 'maintain', activity:p.activity || 1.55,
       exp:u.exp || 'intermediate', days:u.days || 4, session:u.session || 60, equip:u.equip || 'full', focus:u.focus || [], replace:true}};
  let el = $('#ob');
  if (!el) { el = document.createElement('div'); el.id = 'ob'; document.body.appendChild(el); }
  drawOB();
}
const OB_STEPS = ['welcome','goals','body','nutrition','experience','training','focus','split','pick','done'];
function obNext(){ OB.step = Math.min(OB.step + 1, OB_STEPS.length - 1); if (OB_STEPS[OB.step] === 'pick') OB.pickIdx = 0; drawOB(); }
function obBack(){
  if (OB_STEPS[OB.step] === 'pick' && OB.pickIdx > 0) { OB.pickIdx--; drawOB(); return true; }
  if (OB.step === 0) { if (OB.fromSettings) { closeOB(); return true; } return true; }
  OB.step--; if (OB_STEPS[OB.step] === 'pick') OB.pickIdx = Math.max(0, pickList().length - 1); drawOB(); return true;
}
function closeOB(){ const el = $('#ob'); if (el) el.remove(); OB = null; render(); }
function pickList(){
  const plan = buildPlan(OB.d), out = [];
  plan.forEach((day, di) => day.slots.forEach((x, si) => out.push({di, si, day, x, id:di + ':' + si})));
  return out;
}
const lbToKg = lb => lb * 0.45359237;
function heightText(cm){ const inch = cm / 2.54; return Math.floor(inch / 12) + ' ft ' + Math.round(inch % 12) + ' in'; }
function drawOB(){
  const el = $('#ob'); if (!el || !OB) return;
  const d = OB.d, step = OB_STEPS[OB.step];
  const pct = Math.round(OB.step / (OB_STEPS.length - 1) * 100);
  let h = `<div class="ob-top"><button class="icon" data-ob="back" aria-label="Back" ${OB.step === 0 && !OB.fromSettings ? 'style="visibility:hidden"' : ''}>‹</button>
    <div class="track grow"><i style="width:${pct}%;background:var(--accent)"></i></div>${OB.fromSettings ? '<button class="icon" data-ob="close" aria-label="Close">✕</button>' : '<span style="width:44px"></span>'}</div><div class="ob-body">`;
  const choice = (key, val, label, sub, multi) => {
    const on_ = multi ? d[key].includes(val) : String(d[key]) === String(val);
    return `<button class="ob-opt ${on_ ? 'on' : ''}" data-k="${key}" data-v="${esc(val)}" data-multi="${multi ? 1 : 0}"><b>${label}</b>${sub ? `<span>${sub}</span>` : ''}</button>`;
  };
  let next = 'Next', canNext = true;
  if (step === 'welcome') {
    h += `<div class="ob-hero">💪</div><h1>Let's build your plan</h1><p class="muted">A few quick questions and you'll get a training split built around how often you can train, with movements you pick, plus calorie and protein targets for your goal.</p>
      <label class="f">What should we call you? (optional)</label><input class="text-in" data-in="name" value="${esc(d.name)}" placeholder="Your name">`;
    next = 'Let\'s go';
  } else if (step === 'goals') {
    h += `<h1>What do you want from this?</h1><p class="muted">Pick everything that fits.</p>` +
      [['muscle','Build muscle','Bigger, more defined'],['fat','Lose fat','Lean down, keep muscle'],['strength','Get stronger','Lift heavier'],['macros','Eat better','Hit calories and protein'],['budget','Meal prep on a budget','Cheap, high-protein food'],['habits','Build habits','Routine, sleep, steps, to-dos']]
        .map(([v, l, s]) => choice('goals', v, l, s, true)).join('');
    canNext = d.goals.length > 0;
  } else if (step === 'body') {
    const hIn = d.hUnit === 'cm' ? `<input class="text-in" data-num="height" inputmode="decimal" value="${Math.round(d.height)}">`
      : `<div class="grid2"><input class="text-in" data-ft="ft" inputmode="numeric" value="${Math.floor(d.height / 2.54 / 12)}" placeholder="ft"><input class="text-in" data-ft="in" inputmode="numeric" value="${Math.round(d.height / 2.54 % 12)}" placeholder="in"></div>`;
    const lb = d.weight / 0.45359237;
    const wIn = d.wUnit === 'kg' ? `<input class="text-in" data-num="weight" inputmode="decimal" value="${r1(d.weight)}">`
      : `<div class="grid2"><input class="text-in" data-st="st" inputmode="numeric" value="${Math.floor(lb / 14)}" placeholder="st"><input class="text-in" data-st="lb" inputmode="decimal" value="${Math.round(lb % 14)}" placeholder="lb"></div>`;
    h += `<h1>About you</h1><p class="muted">Used for your calorie target and strength ranks.</p>
      <label class="f">Sex</label><div class="seg">${[['m','Male'],['f','Female']].map(([v, l]) => `<button data-k="sex" data-v="${v}" class="${d.sex === v ? 'on' : ''}">${l}</button>`).join('')}</div>
      <label class="f">Age</label><input class="text-in" data-num="age" inputmode="numeric" value="${d.age}">
      <div class="row between"><label class="f">Height</label><div class="seg" style="margin-top:6px">${[['cm','cm'],['ft','ft/in']].map(([v, l]) => `<button data-k="hUnit" data-v="${v}" class="${d.hUnit === v ? 'on' : ''}" style="padding:0 12px">${l}</button>`).join('')}</div></div>${hIn}
      <div class="row between"><label class="f">Weight</label><div class="seg" style="margin-top:6px">${[['kg','kg'],['st','st/lb']].map(([v, l]) => `<button data-k="wUnit" data-v="${v}" class="${d.wUnit === v ? 'on' : ''}" style="padding:0 12px">${l}</button>`).join('')}</div></div>${wIn}
      <div class="muted small" style="margin-top:8px">${Math.round(d.height)} cm (${heightText(d.height)}) · ${r1(d.weight)} kg (${Math.floor(lb / 14)} st ${Math.round(lb % 14)} lb)</div>`;
    canNext = d.age > 12 && d.age < 100 && d.height > 120 && d.height < 230 && d.weight > 30 && d.weight < 300;
  } else if (step === 'nutrition') {
    h += `<h1>Your body goal right now</h1>` +
      [['cut','Lose fat','About 0.5 kg a week, keeping protein high'],['maintain','Maintain / recomp','Same weight, build muscle slowly'],['bulk','Lean bulk','Slow gain to build muscle with little fat']].map(([v, l, s]) => choice('nGoal', v, l, s)).join('') +
      `<h1 style="margin-top:18px;font-size:20px">Outside the gym you're…</h1>` +
      [[1.375,'Mostly sitting','Desk job or student'],[1.55,'On your feet a bit','Walk a fair amount'],[1.725,'On your feet all day','Active job'],[1.9,'Very active','Manual work plus lots of steps']].map(([v, l, s]) => choice('activity', v, l, s)).join('');
  } else if (step === 'experience') {
    h += `<h1>How long have you trained properly?</h1>` +
      [['beginner','Under a year','We keep volume moderate while you learn the moves'],['intermediate','1–3 years','Standard volume'],['advanced','3+ years','Extra sets on your main lifts']].map(([v, l, s]) => choice('exp', v, l, s)).join('');
  } else if (step === 'training') {
    h += `<h1>How many days a week can you train?</h1><div class="grid5">${[2,3,4,5,6].map(n => `<button class="ob-num ${d.days === n ? 'on' : ''}" data-k="days" data-v="${n}">${n}</button>`).join('')}</div>
      <p class="muted small">${SPLITS[d.days].name}: ${SPLITS[d.days].why}</p>
      <label class="f">How long per session?</label><div class="seg">${[45,60,75,90].map(n => `<button data-k="session" data-v="${n}" class="${+d.session === n ? 'on' : ''}">${n} min</button>`).join('')}</div>
      <label class="f">Where do you train?</label>` +
      [['full','Full gym','Machines, cables, free weights'],['basic','Basic gym','Barbells, dumbbells, benches'],['home','Home','Dumbbells and bodyweight']].map(([v, l, s]) => choice('equip', v, l, s)).join('');
  } else if (step === 'focus') {
    h += `<h1>Any muscles to bring up?</h1><p class="muted">Optional. Pick up to 2 and they get an extra set each session.</p>` +
      FOCUS.map(([v, l]) => choice('focus', v, l, '', true)).join('');
    canNext = d.focus.length <= 2;
    if (!canNext) h += `<div class="small" style="color:var(--danger)">Pick at most 2</div>`;
    next = d.focus.length ? 'Next' : 'Skip';
  } else if (step === 'split') {
    const plan = buildPlan(d), ws = weeklySets(plan);
    h += `<h1>Your split: ${SPLITS[d.days].name}</h1><p class="muted">${SPLITS[d.days].why} ${SCHEDULE[d.days]}.</p>` +
      plan.map((day, i) => `<div class="card"><b>Day ${i + 1}: ${esc(day.name)}</b><div class="chips">${day.slots.map(x => `<span class="chip">${MUSCLE_NAMES[SLOTS[x.slot].m]} · ${x.sets}×${x.reps}</span>`).join('')}</div></div>`).join('') +
      `<div class="sec">Hard sets per muscle per week</div><div class="chips">${Object.entries(ws).map(([m, n]) => `<span class="chip ${n >= 10 ? 'hot' : ''}">${MUSCLE_NAMES[m]} ${n}</span>`).join('')}</div>
      <p class="muted small">Next you pick a movement for each slot. Not sure? Tap ★ recommended.</p>
      <button class="ghost wide" data-ob="auto">Pick everything for me</button>`;
    next = 'Pick my movements';
  } else if (step === 'pick') {
    const list = pickList(), it = list[OB.pickIdx];
    const opts = slotOptions(it.x.slot, d.equip), cur = OB.picks[it.id] || opts[0][0];
    const slot = SLOTS[it.x.slot];
    h += `<div class="muted small">Day ${it.di + 1} · ${esc(it.day.name)} · ${OB.pickIdx + 1} of ${list.length}</div>
      <h1>You need ${slot.what}</h1><p class="muted">For your ${MUSCLE_NAMES[slot.m].toLowerCase()} · ${it.x.sets} sets of ${it.x.reps} reps. Pick one:</p>` +
      opts.map((o, i) => `<button class="ob-opt ${cur === o[0] ? 'on' : ''}" data-pick="${esc(o[0])}"><b>${i === 0 ? '★ ' : ''}${esc(o[0])}</b><span>${i === 0 ? 'Recommended' + (o[2] ? ' · ' + esc(o[2]) : '') : esc(o[2] || '')}</span></button>`).join('') +
      `<button class="ghost wide" data-ob="auto">Use ★ recommended for the rest</button>`;
    next = OB.pickIdx < list.length - 1 ? 'Next' : 'Review';
  } else if (step === 'done') {
    const plan = buildPlan(d), list = pickList();
    const sug = suggestTargets({sex:d.sex, age:d.age, height:d.height, weight:d.weight, activity:d.activity, goal:d.nGoal});
    h += `<h1>${d.name ? esc(d.name) + ', your' : 'Your'} plan is ready</h1>
      <div class="card"><b>Daily food targets</b><div class="macro4"><div><b>${fmtNum(sug.kcal)}</b><span>kcal</span></div><div><b style="color:var(--p)">${sug.protein}</b><span>protein</span></div><div><b style="color:var(--c)">${sug.carbs}</b><span>carbs</span></div><div><b style="color:var(--f)">${sug.fat}</b><span>fat</span></div></div>
      <div class="muted small">You can change these any time in Food → My foods.</div></div>` +
      plan.map((day, di) => `<div class="card"><b>Day ${di + 1}: ${esc(day.name)}</b>${day.slots.map((x, si) => {
        const id = di + ':' + si, name = OB.picks[id] || slotOptions(x.slot, d.equip)[0][0];
        return `<div class="item small" style="padding:4px 0"><span>${esc(name)}</span><span class="muted">${x.sets} × ${x.reps}</span></div>`; }).join('')}</div>`).join('') +
      (S.routines.length ? `<label class="row" style="margin:12px 0;gap:12px"><button class="tick ${d.replace ? 'on' : ''}" data-k="replace" data-v="${d.replace ? '' : '1'}">${d.replace ? '✓' : ''}</button><span>Replace my current routines (past workouts are kept)</span></label>` : '');
    next = 'Start my plan';
  }
  h += `</div><div class="ob-foot"><button class="primary wide" data-ob="next" ${canNext ? '' : 'disabled style="opacity:.4"'}>${next}</button></div>`;
  el.innerHTML = h;
  // inputs
  el.querySelectorAll('[data-in]').forEach(i => i.oninput = () => { d[i.dataset.in] = i.value; });
  el.querySelectorAll('[data-num]').forEach(i => i.onchange = () => { const v = num(i.value); if (v != null) d[i.dataset.num] = v; drawOB(); });
  el.querySelectorAll('[data-ft]').forEach(i => i.onchange = () => {
    const ft = num(el.querySelector('[data-ft="ft"]').value) || 0, inch = num(el.querySelector('[data-ft="in"]').value) || 0;
    d.height = (ft * 12 + inch) * 2.54; drawOB();
  });
  el.querySelectorAll('[data-st]').forEach(i => i.onchange = () => {
    const st = num(el.querySelector('[data-st="st"]').value) || 0, lb = num(el.querySelector('[data-st="lb"]').value) || 0;
    d.weight = lbToKg(st * 14 + lb); drawOB();
  });
  el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
    const k = b.dataset.k; let v = b.dataset.v;
    if (['days','session','activity','age'].includes(k)) v = +v;
    if (k === 'replace') v = !!v;
    if (b.dataset.multi === '1') d[k] = d[k].includes(v) ? d[k].filter(x => x !== v) : d[k].concat(v);
    else d[k] = v;
    if (k === 'days' || k === 'session' || k === 'equip' || k === 'exp' || k === 'focus') OB.picks = {};
    drawOB();
  });
  el.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => {
    const it = pickList()[OB.pickIdx]; OB.picks[it.id] = b.dataset.pick; drawOB();
  });
  el.querySelectorAll('[data-ob]').forEach(b => b.onclick = () => {
    const a = b.dataset.ob;
    if (a === 'back') obBack();
    else if (a === 'close') closeOB();
    else if (a === 'auto') { OB.step = OB_STEPS.indexOf('done'); drawOB(); }
    else if (a === 'next') {
      if (step === 'pick') {
        const list = pickList(), it = list[OB.pickIdx];
        if (!OB.picks[it.id]) OB.picks[it.id] = slotOptions(it.x.slot, d.equip)[0][0];
        if (OB.pickIdx < list.length - 1) { OB.pickIdx++; drawOB(); el.scrollTop = 0; return; }
      }
      if (step === 'done') { finishOnboarding(); return; }
      obNext(); el.scrollTop = 0;
    }
  });
}
function exIdByName(name){
  let e = S.exercises.find(x => x.name === name);
  if (!e) { e = {id:uid(), name, muscle:'Other'}; S.exercises.push(e); }
  return e.id;
}
function finishOnboarding(){
  const d = OB.d, plan = buildPlan(d);
  S.user = {name:d.name.trim(), goals:d.goals, exp:d.exp, days:d.days, session:d.session, equip:d.equip, focus:d.focus, hUnit:d.hUnit, wUnit:d.wUnit, onboarded:true, at:Date.now()};
  S.food.profile = {sex:d.sex, age:d.age, height:Math.round(d.height), weight:r1(d.weight), activity:d.activity, goal:d.nGoal};
  S.food.targets = suggestTargets(S.food.profile);
  if (!S.body.weights.length || Math.abs(S.body.weights[S.body.weights.length - 1].kg - d.weight) > 0.05) {
    S.body.weights = S.body.weights.filter(w => w.d !== today()).concat({d:today(), kg:r1(d.weight)}).sort((a, b) => a.d.localeCompare(b.d));
  }
  const routines = plan.map((day, di) => ({id:uid(), name:day.name, items:day.slots.map((x, si) => ({
    exId:exIdByName(OB.picks[di + ':' + si] || slotOptions(x.slot, d.equip)[0][0]), sets:x.sets, reps:x.reps}))}));
  S.routines = d.replace ? routines : routines.concat(S.routines.filter(r => !(S.program && S.program.ids.includes(r.id))));
  S.program = {split:SPLITS[d.days].name, ids:routines.map(r => r.id), created:Date.now()};
  save();
  const el = $('#ob'); if (el) el.remove(); OB = null;
  go('today'); toast('Plan saved. Your first workout: ' + routines[0].name);
}
function nextProgramRoutine(){
  const ids = S.program ? S.program.ids.filter(id => S.routines.some(r => r.id === id)) : [];
  const pool = ids.length ? ids.map(id => S.routines.find(r => r.id === id)) : S.routines;
  if (!pool.length) return null;
  const lastName = S.workouts.length ? S.workouts[S.workouts.length - 1].name : '';
  const idx = pool.findIndex(r => r.name === lastName);
  return {r:pool[(idx + 1) % pool.length], known:idx >= 0};
}
ACTIONS['onboard'] = () => startOnboarding(true);
