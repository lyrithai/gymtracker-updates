'use strict';
/* ================= program builder + onboarding =================
   The house mentality (from the coaches the owner follows: Keenan Malloy, Jacob Oestreicher, TNF, Naz Darwen, LividDak):
   - few working sets (1-2 per exercise), taken to failure or 0-1 reps short; warm-ups don't count; no junk volume
   - heavy-ish reps (5-9) for most moves, 8-12 for small muscles; beginners 8-12
   - double progression: reps first, then the smallest weight jump; same weight for weeks is normal
   - machines and cables set up so the target muscle is the limit; signature moves (Keenan flaps, Kelso shrug, TNF press, JM press)
   - leg days start with calves and leg extensions; priority muscles go first
   equip: m machine/cable, b barbell, d dumbbell, w bodyweight. First option = recommended (★). */
const SLOTS = {
  chestPress:  {m:'chest', what:'a flat chest press', big:1, opts:[['Machine Chest Press','m','Stable, so you can go to true failure safely'],['Hammer Strength Chest Press','m',''],['Dumbbell Bench Press','d','Deep stretch at the bottom'],['Bench Press','b','Best for raw pressing strength'],['Push-up','w','No kit needed']]},
  chestIncline:{m:'chest', what:'an incline press for your upper chest', big:1, opts:[['Smith Machine Incline Press','m','Stable and easy to progress'],['TNF Press','d','Reverse-grip incline press: elbows tucked, easy on the shoulders, ego-proof'],['Low-Incline Dumbbell Press','d','Upper chest with a big stretch'],['Incline Bench Press','b',''],['Deficit Push-up','w','']]},
  chestFly:    {m:'chest', what:'a chest fly', opts:[['Pec Deck','m','Constant tension, triceps out of it'],['Low-to-High Cable Fly','m',''],['High-to-Low Cable Fly','m',''],['Cable Crossover','m',''],['Incline Dumbbell Fly','d','Huge stretch']]},
  vPull:       {m:'lats', what:'a pulldown', big:1, opts:[['Lat Pulldown','m','Easy to load; pull to the same end point every rep'],['Neutral-Grip Pulldown','m',''],['Single-Arm Lat Pulldown','m','Big stretch per side'],['Pull-up','w','The bodyweight classic'],['Chin-up','w','']]},
  latIso:      {m:'lats', what:'a lat isolation', opts:[['Keenan Flaps','m','Cuff at the elbow: lats do all the work, biceps taken out'],['Cable Pullover','m','Lats through a full stretch'],['Kneeling Single-Arm Pulldown','m',''],['Dumbbell Pullover','d','']]},
  hRow:        {m:'upperback', what:'a row', big:1, opts:[['Chest-Supported T-Bar Row','m','No lower back, no cheating, all upper back'],['Single-Arm Cable Row','m',''],['Seated Cable Row','m',''],['Machine Row','m',''],['Seal Row','b',''],['Dumbbell Row','d','Works anywhere']]},
  traps:       {m:'traps', what:'a shrug', opts:[['Kelso Shrug','m','Chest-supported shrug for the mid-traps'],['Dumbbell Shrug','d',''],['Barbell Shrug','b','']]},
  ohp:         {m:'shoulders', what:'an overhead press', big:1, opts:[['Machine Shoulder Press','m','Stable, easy on the joints'],['Seated Dumbbell Shoulder Press','d','Free path for your shoulders'],['Overhead Press','b','Strength builder']]},
  sideDelt:    {m:'shoulders', what:'a lateral raise for wider shoulders', small:1, opts:[['Cable Lateral Raise','m','Tension right where dumbbells go light'],['Behind-the-Back Cable Lateral Raise','m',''],['Cable Y-Raise','m',''],['Machine Lateral Raise','m',''],['Lean-Away Lateral Raise','d',''],['Lateral Raise','d','Classic, works anywhere']]},
  rearDelt:    {m:'shoulders', what:'a rear delt move', small:1, opts:[['Reverse Pec Deck','m','Easiest rear delt move to feel'],['Cable Rear Delt Fly','m',''],['Face Pull','m',''],['Rear Delt Fly','d','']]},
  triOH:       {m:'triceps', what:'an overhead triceps extension', opts:[['Overhead Cable Tricep Extension','m','Long head in a stretch, best for size'],['Katana Tricep Extension','m',''],['Skull Crusher','b',''],['Dumbbell Skull Crusher','d','']]},
  triPush:     {m:'triceps', what:'a heavy triceps move', opts:[['Tricep Pushdown','m','Simple to load heavy and progress'],['JM Press','b','Heavy triceps press, a social-media favourite'],['Rope Pushdown','m',''],['Dips','w','Bodyweight compound'],['Tricep Kickback','d','']]},
  biLong:      {m:'biceps', what:'a curl', opts:[['Preacher Curl','m','Arm locked in, biceps are the only thing that can fail'],['Bayesian Curl','m','Cable tension at the stretch'],['Incline Dumbbell Curl','d','Biceps at full stretch'],['EZ Bar Curl','b','']]},
  biHammer:    {m:'biceps', what:'a hammer or reverse curl', opts:[['Hammer Curl','d','Biceps plus forearms'],['Cable Curl','m',''],['Reverse Curl','b','Forearms and brachialis'],['Cross-Body Hammer Curl','d','']]},
  squat:       {m:'quads', what:'a squat pattern', big:1, opts:[['Pendulum Squat','m','Deep knee bend, quads take everything'],['Hack Squat','m',''],['Smith Machine Squat','m',''],['Squat','b','Best for overall strength'],['Goblet Squat','d','Works at home']]},
  legPress:    {m:'quads', what:'a leg press or lunge', big:1, opts:[['Leg Press','m','Heavy and safe to push hard'],['Belt Squat','m',''],['Bulgarian Split Squat','d','Big glute and quad stretch'],['Walking Lunge','d','']]},
  quadIso:     {m:'quads', what:'a leg extension', opts:[['Leg Extension','m','Do it first on leg day, before you press'],['Sissy Squat','w',''],['Reverse Nordic','w','']]},
  hinge:       {m:'hamstrings', what:'a hip hinge', big:1, opts:[['Romanian Deadlift','b','Best hamstring stretch under load'],['Stiff-Leg Deadlift','b',''],['45° Back Extension','m','Hamstrings and glutes, easy on the back'],['B-Stance RDL','d','']]},
  hamCurl:     {m:'hamstrings', what:'a leg curl', opts:[['Seated Leg Curl','m','Hamstrings at length, more growth'],['Lying Leg Curl','m',''],['Nordic Curl','w','']]},
  glute:       {m:'glutes', what:'a glute move', opts:[['Hip Thrust','b','Heaviest glute loading'],['Smith Machine Hip Thrust','m',''],['Hip Abduction','m',''],['Cable Glute Kickback','m',''],['Glute Bridge','w','']]},
  calves:      {m:'calves', what:'a calf raise', small:1, opts:[['Standing Calf Raise','d','Pause in the bottom stretch, no bouncing'],['Leg Press Calf Raise','m',''],['Seated Calf Raise','m','']]},
  abs:         {m:'abs', what:'an ab move', small:1, opts:[['Cable Crunch','m','Load abs like any other muscle'],['Hanging Leg Raise','w',''],['Ab Wheel Rollout','w',''],['Decline Sit-up','w','']]}
};
// Day templates: [slot, priority] (1 = core, 2 = important, 3 = extra; time limits drop 3s then 2s first)
const DAYS = {
  fbA:  ['Full Body A', [['chestIncline',1],['vPull',1],['chestFly',2],['hRow',2],['sideDelt',1],['triOH',1],['biLong',1],['quadIso',1],['squat',1],['hamCurl',1],['calves',3],['abs',3]]],
  fbB:  ['Full Body B', [['chestPress',1],['latIso',1],['hRow',1],['rearDelt',2],['sideDelt',1],['triPush',1],['biHammer',1],['calves',2],['legPress',1],['hinge',1],['hamCurl',2],['traps',3]]],
  upA:  ['Upper A', [['chestIncline',1],['vPull',1],['chestFly',1],['hRow',1],['sideDelt',1],['triOH',1],['biLong',1],['rearDelt',3]]],
  loA:  ['Lower A', [['calves',2],['quadIso',1],['squat',1],['hamCurl',1],['hinge',2],['abs',3]]],
  upB:  ['Upper B', [['chestPress',1],['latIso',1],['hRow',1],['ohp',2],['sideDelt',1],['triPush',1],['biHammer',2],['traps',3]]],
  loB:  ['Lower B', [['calves',2],['hamCurl',1],['hinge',1],['quadIso',1],['legPress',1],['glute',3]]],
  ant:  ['Anterior', [['chestIncline',1],['chestPress',2],['chestFly',1],['ohp',2],['sideDelt',1],['triOH',1],['biLong',1],['quadIso',1],['squat',1],['abs',3]]],
  post: ['Posterior', [['vPull',1],['hRow',1],['latIso',2],['rearDelt',1],['traps',2],['biHammer',3],['hamCurl',1],['hinge',1],['glute',2],['calves',2]]],
  push: ['Push', [['chestIncline',1],['chestPress',2],['chestFly',1],['ohp',2],['sideDelt',1],['triOH',1],['triPush',2]]],
  pull: ['Pull', [['vPull',1],['hRow',1],['latIso',1],['rearDelt',1],['traps',2],['biLong',1],['biHammer',2]]],
  legs: ['Legs', [['calves',1],['quadIso',1],['squat',1],['hamCurl',1],['hinge',1],['legPress',2],['abs',2]]],
  bChest:['Chest', [['chestIncline',1],['chestPress',1],['chestFly',1],['triPush',2],['abs',3]]],
  bBack: ['Back', [['vPull',1],['hRow',1],['latIso',1],['traps',2],['rearDelt',2]]],
  bLegs: ['Legs', [['calves',1],['quadIso',1],['squat',1],['hamCurl',1],['hinge',1],['legPress',2],['glute',3]]],
  bShld: ['Shoulders', [['ohp',1],['sideDelt',1],['rearDelt',1],['sideDelt',2],['traps',3]]],
  bArms: ['Arms', [['biLong',1],['triOH',1],['biHammer',1],['triPush',1],['abs',3]]]
};
// Split options per days a week. days = the rotation; it repeats to fill the week.
const SPLITS = {
  2: [{id:'fb', name:'Full body A/B', days:['fbA','fbB'], why:'Two full-body days: every muscle twice a week.'}],
  3: [{id:'fbEOD', name:'Full body every other day', days:['fbA','fbB'], why:'Alternate A and B. Every muscle hit every other day, short focused sessions.'},
      {id:'ppl', name:'Push / Pull / Legs', days:['push','pull','legs'], why:'Each muscle once a week, so every set goes all out.'}],
  4: [{id:'ul', name:'Upper / Lower', days:['upA','loA','upB','loB'], why:'Upper and lower twice: each muscle twice a week.'},
      {id:'ap', name:'Anterior / Posterior', days:['ant','post'], why:'Front of the body, then back of the body. Twice each a week.'},
      {id:'fbEOD', name:'Full body every other day', days:['fbA','fbB'], why:'Alternate A and B: every muscle hit about twice a week.'}],
  5: [{id:'pplul', name:'Push / Pull / Legs / Upper / Lower', days:['push','pull','legs','upA','loA'], why:'Five days, every muscle twice a week, about an hour each.'},
      {id:'bro', name:'Bro split', days:['bChest','bBack','bLegs','bShld','bArms'], why:'One body part a day. Each muscle once a week, so you can absolutely bury it.'}],
  6: [{id:'ppl2', name:'Push / Pull / Legs ×2', days:['push','pull','legs'], why:'PPL twice a week: high frequency, still low volume per session.'},
      {id:'ap3', name:'Anterior / Posterior ×3', days:['ant','post'], why:'Front and back days, three of each a week.'}]
};
const SCHEDULE = {2:'e.g. Mon & Thu', 3:'e.g. Mon, Wed, Fri', 4:'e.g. Mon, Tue, Thu, Fri', 5:'e.g. Mon–Fri', 6:'e.g. Mon–Sat, Sunday off'};
const STYLES = {
  hard2: {name:'2 hard sets per exercise', sub:'Recommended. First set 1 rep short of failure, last set to failure.', sets:2, effort:'last set to failure'},
  max1:  {name:'1 all-out set, more exercises', sub:'Maximalist: one set to failure per exercise, more angles per muscle.', sets:1, effort:'one all-out set to failure'},
  std3:  {name:'3 sets, leave 1–2 in the tank', sub:'Easier to recover from while you learn the moves.', sets:3, effort:'stop 1–2 reps short of failure'}
};
const FOCUS = [['chest','Chest'],['back','Back'],['shoulders','Shoulders'],['arms','Arms'],['legs','Legs'],['glutes','Glutes']];
const FOCUS_OF = {chest:['chest'], lats:['back'], upperback:['back'], traps:['back'], shoulders:['shoulders'], biceps:['arms'], triceps:['arms'], quads:['legs'], hamstrings:['legs','glutes'], glutes:['glutes'], calves:['legs'], abs:[]};
const EQUIP = {full:['m','b','d','w'], basic:['b','d','w'], home:['d','w']};

function slotOptions(key, equip){ const ok = EQUIP[equip] || EQUIP.full; return SLOTS[key].opts.filter(o => ok.includes(o[1])); }
function splitOf(u){ const list = SPLITS[u.days] || SPLITS[4]; return list.find(s => s.id === u.split) || list[0]; }
function repsFor(slot, u){
  const small = SLOTS[slot].small, light = u.exp === 'beginner' || u.reps === 'moderate';
  return light ? (small ? '10-15' : '8-12') : (small ? '8-12' : '5-9');
}
/** Days -> [{key, name, slots:[{slot, sets, reps, rest, effort}]}] fitted to the session length. */
function buildPlan(u){
  const split = splitOf(u), style = STYLES[u.style] || STYLES.hard2;
  const focusOf = x => (u.focus || []).some(f => (FOCUS_OF[SLOTS[x.slot].m] || []).includes(f));
  const minutes = list => Math.round(5 + list.reduce((a, x) => a + x.sets * 2.5 + 1.5, 0));   // warm-up + ~2.5 min a hard set incl. rest + setup
  return split.days.map(dk => {
    const [name, slots] = DAYS[dk];
    let list = slots.filter(([s]) => slotOptions(s, u.equip).length).map(([slot, p]) => {
      let sets = style.sets;
      if (style.sets === 1 && ['quadIso','calves','traps'].includes(slot)) sets = 2;   // the usual two-set exceptions
      if (style.sets === 3 && SLOTS[slot].small) sets = 2;
      return {slot, p, sets, reps:repsFor(slot, u), rest:SLOTS[slot].big ? 150 : 90, effort:style.effort};
    });
    list.forEach(x => { if (focusOf(x)) { x.sets += 1; x.focus = true; } });
    // priority muscles first (but calves and leg extensions keep opening leg days)
    const opener = x => (x.slot === 'calves' || x.slot === 'quadIso') && list.indexOf(x) < 2;
    list = list.filter(opener).concat(list.filter(x => !opener(x) && x.focus), list.filter(x => !opener(x) && !x.focus));
    const cap = +u.session || 60;
    for (const p of [3, 2, 1]) {
      while (minutes(list) > cap && list.length > 4) {
        let i = -1; for (let k = list.length - 1; k >= 0; k--) if (list[k].p === p && !list[k].focus) { i = k; break; }
        if (i < 0) break; list.splice(i, 1);
      }
    }
    return {key:dk, name, slots:list, minutes:minutes(list)};
  });
}
function weeklySets(plan, u){
  const per = (u && u.days ? u.days : plan.length) / plan.length, w = {};
  plan.forEach(d => d.slots.forEach(x => { const m = SLOTS[x.slot].m; w[m] = (w[m] || 0) + x.sets * per; }));
  Object.keys(w).forEach(k => w[k] = Math.round(w[k]));
  return w;
}

/* ---------- onboarding ---------- */
let OB = null;
const PLAN_VERSION = 2;
function startOnboarding(fromSettings){
  const p = S.food.profile, u = S.user || {};
  OB = {step:0, fromSettings:!!fromSettings, picks:{}, pickIdx:0,
    d:{name:u.name || '', goals:u.goals || [], sex:p.sex || 'm', age:p.age || 25, height:p.height || 178, weight:(S.body.weights.length ? S.body.weights[S.body.weights.length - 1].kg : p.weight) || 75,
       hUnit:u.hUnit || 'cm', wUnit:u.wUnit || 'kg', nGoal:p.goal || 'maintain', activity:p.activity || 1.55,
       exp:u.exp || 'intermediate', days:u.days || 4, split:u.split || '', style:u.style || 'hard2', reps:u.reps || 'heavy',
       session:u.session || 60, equip:u.equip || 'full', focus:u.focus || [], replace:true}};
  let el = $('#ob');
  if (!el) { el = document.createElement('div'); el.id = 'ob'; document.body.appendChild(el); }
  drawOB();
}
const OB_STEPS = ['welcome','goals','body','nutrition','experience','training','style','focus','split','pick','done'];
function obNext(){ OB.step = Math.min(OB.step + 1, OB_STEPS.length - 1); if (OB_STEPS[OB.step] === 'pick') OB.pickIdx = 0; drawOB(); }
function obBack(){
  if (OB_STEPS[OB.step] === 'pick' && OB.pickIdx > 0) { OB.pickIdx--; drawOB(); return true; }
  if (OB.step === 0) { if (OB.fromSettings) closeOB(); return true; }
  OB.step--; if (OB_STEPS[OB.step] === 'pick') OB.pickIdx = Math.max(0, pickList().length - 1); drawOB(); return true;
}
function closeOB(){ const el = $('#ob'); if (el) el.remove(); OB = null; render(); }
function pickList(){
  const plan = buildPlan(OB.d), out = [];
  plan.forEach((day, di) => day.slots.forEach((x, si) => out.push({di, si, day, x, id:di + ':' + si})));
  return out;
}
function defaultPick(it){ return slotOptions(it.x.slot, OB.d.equip)[0][0]; }
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
    h += `<div class="ob-hero">💪</div><h1>Let's build your plan</h1><p class="muted">No junk volume. Fewer sets, taken to failure, on movements that actually hit the muscle, and you beat the logbook every week. A few questions and it's built around you.</p>
      <label class="f">What should we call you? (optional)</label><input class="text-in" data-in="name" value="${esc(d.name)}" placeholder="Your name">`;
    next = 'Let\'s go';
  } else if (step === 'goals') {
    h += `<h1>What are you here for?</h1><p class="muted">Pick everything that fits.</p>` +
      [['muscle','Build muscle','Bigger, more defined'],['fat','Lose fat','Lean down, keep the muscle'],['strength','Get stronger','Move more weight'],['macros','Eat better','Hit calories and protein'],['budget','Meal prep on a budget','Cheap, high-protein food'],['habits','Build habits','Steps, sleep, routine, to-dos']]
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
      [['cut','Cut','Lose about 0.5–1% bodyweight a week, protein high'],['maintain','Maintain / recomp','Same weight, build muscle slowly'],['bulk','Lean bulk (maingain)','Small surplus, slow gain, barely any fat']].map(([v, l, s]) => choice('nGoal', v, l, s)).join('') +
      `<h1 style="margin-top:18px;font-size:20px">Outside the gym you're…</h1>` +
      [[1.375,'Mostly sitting','Desk job or student'],[1.55,'On your feet a bit','About 7–10k steps'],[1.725,'On your feet all day','Active job or 15k+ steps'],[1.9,'Very active','Manual work plus lots of steps']].map(([v, l, s]) => choice('activity', v, l, s)).join('');
  } else if (step === 'experience') {
    h += `<h1>How long have you trained properly?</h1>` +
      [['beginner','Under a year','8–12 reps while you learn the moves and how failure feels'],['intermediate','1–3 years','Heavier 5–9 reps'],['advanced','3+ years','Heavier 5–9 reps, you know your failure']].map(([v, l, s]) => choice('exp', v, l, s)).join('');
  } else if (step === 'training') {
    const opts = SPLITS[d.days];
    if (!opts.some(s => s.id === d.split)) d.split = opts[0].id;
    h += `<h1>How many days a week can you train?</h1><div class="grid5">${[2,3,4,5,6].map(n => `<button class="ob-num ${d.days === n ? 'on' : ''}" data-k="days" data-v="${n}">${n}</button>`).join('')}</div>
      <label class="f">Pick your split</label>` + opts.map((s, i) => choice('split', s.id, (i === 0 ? '★ ' : '') + s.name, s.why)).join('') +
      `<label class="f">How long per session?</label><div class="seg">${[45,60,75,90].map(n => `<button data-k="session" data-v="${n}" class="${+d.session === n ? 'on' : ''}">${n} min</button>`).join('')}</div>
      <label class="f">Where do you train?</label>` +
      [['full','Full gym','Machines, cables, free weights'],['basic','Basic gym','Barbells, dumbbells, benches'],['home','Home','Dumbbells and bodyweight']].map(([v, l, s]) => choice('equip', v, l, s)).join('');
  } else if (step === 'style') {
    h += `<h1>How hard do you want each set?</h1><p class="muted">Every working set should be close to failure. Warm-ups don't count.</p>` +
      Object.entries(STYLES).map(([k, s]) => choice('style', k, s.name, s.sub)).join('') +
      (d.exp === 'beginner' ? '' : `<label class="f">Rep ranges</label><div class="seg">${[['heavy','Heavy 5–9'],['moderate','Moderate 8–12']].map(([v, l]) => `<button data-k="reps" data-v="${v}" class="${d.reps === v ? 'on' : ''}">${l}</button>`).join('')}</div>`);
  } else if (step === 'focus') {
    h += `<h1>Any muscles to bring up?</h1><p class="muted">Optional, up to 2. They go first in the session, when you're freshest, and get an extra set.</p>` +
      FOCUS.map(([v, l]) => choice('focus', v, l, '', true)).join('');
    canNext = d.focus.length <= 2;
    if (!canNext) h += `<div class="small" style="color:var(--danger)">Pick at most 2</div>`;
    next = d.focus.length ? 'Next' : 'Skip';
  } else if (step === 'split') {
    const plan = buildPlan(d), ws = weeklySets(plan, d), sp = splitOf(d);
    h += `<h1>${esc(sp.name)}</h1><p class="muted">${sp.why} ${SCHEDULE[d.days]}${plan.length < d.days ? ', repeating the rotation' : ''}.</p>` +
      plan.map((day, i) => `<div class="card"><div class="item"><b>${esc(day.name)}</b><span class="muted small">~${day.minutes} min</span></div><div class="chips">${day.slots.map(x => `<span class="chip ${x.focus ? 'hot' : ''}">${MUSCLE_NAMES[SLOTS[x.slot].m]} · ${x.sets}×${x.reps}</span>`).join('')}</div></div>`).join('') +
      `<div class="sec">Hard sets per muscle per week</div><div class="chips">${Object.entries(ws).map(([m, n]) => `<span class="chip">${MUSCLE_NAMES[m]} ${n}</span>`).join('')}</div>
      <p class="muted small">Low volume on purpose: every one of these sets is to failure or 1 rep short. Next you pick a movement for each slot. Not sure? ★ is the pick.</p>
      <button class="ghost wide" data-ob="auto">Pick everything for me</button>`;
    next = 'Pick my movements';
  } else if (step === 'pick') {
    const list = pickList(), it = list[OB.pickIdx];
    const opts = slotOptions(it.x.slot, d.equip), cur = OB.picks[it.id] || opts[0][0];
    const slot = SLOTS[it.x.slot];
    h += `<div class="muted small">${esc(it.day.name)} · ${OB.pickIdx + 1} of ${list.length}</div>
      <h1>You need ${slot.what}</h1><p class="muted">For your ${MUSCLE_NAMES[slot.m].toLowerCase()} · ${it.x.sets} × ${it.x.reps} reps, ${it.x.effort}. Pick one:</p>` +
      opts.map((o, i) => `<button class="ob-opt ${cur === o[0] ? 'on' : ''}" data-pick="${esc(o[0])}"><b>${i === 0 ? '★ ' : ''}${esc(o[0])}</b><span>${i === 0 ? 'Recommended' + (o[2] ? ' · ' + esc(o[2]) : '') : esc(o[2] || '')}</span></button>`).join('') +
      `<button class="ghost wide" data-ob="auto">Use ★ for the rest</button>`;
    next = OB.pickIdx < list.length - 1 ? 'Next' : 'Review';
  } else if (step === 'done') {
    const plan = buildPlan(d);
    const sug = suggestTargets({sex:d.sex, age:d.age, height:d.height, weight:d.weight, activity:d.activity, goal:d.nGoal});
    h += `<h1>${d.name ? esc(d.name) + ', your' : 'Your'} plan is ready</h1>
      <div class="card"><b>The rules</b><div class="small" style="margin-top:6px;line-height:1.6">
        • Warm up your first lift with 2–3 lighter sets. They don't count.<br>• Every working set: ${STYLES[d.style].effort}.<br>
        • Hit the top of the rep range on every set → add the smallest weight jump next time.<br>• Same weight for a few weeks is normal. Beat the logbook by a rep.<br>
        • Full control on the way down, same end point every rep. No ego.</div></div>
      <div class="card"><b>Daily food targets</b><div class="macro4"><div><b>${fmtNum(sug.kcal)}</b><span>kcal</span></div><div><b style="color:var(--p)">${sug.protein}</b><span>protein</span></div><div><b style="color:var(--c)">${sug.carbs}</b><span>carbs</span></div><div><b style="color:var(--f)">${sug.fat}</b><span>fat</span></div></div>
      <div class="muted small">Weigh in a few times a week. After 4 weeks the Body tab tells you if calories need moving.</div></div>` +
      plan.map((day, di) => `<div class="card"><b>${esc(day.name)}</b>${day.slots.map((x, si) => {
        const name = OB.picks[di + ':' + si] || slotOptions(x.slot, d.equip)[0][0];
        return `<div class="item small" style="padding:4px 0"><span>${esc(name)}</span><span class="muted">${x.sets} × ${x.reps}</span></div>`; }).join('')}</div>`).join('') +
      (S.routines.length ? `<label class="row" style="margin:12px 0;gap:12px"><button class="tick ${d.replace ? 'on' : ''}" data-k="replace" data-v="${d.replace ? '' : '1'}">${d.replace ? '✓' : ''}</button><span>Replace my current routines (past workouts are kept)</span></label>` : '');
    next = 'Start my plan';
  }
  h += `</div><div class="ob-foot"><button class="primary wide" data-ob="next" ${canNext ? '' : 'disabled style="opacity:.4"'}>${next}</button></div>`;
  el.innerHTML = h;
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
    if (['days','split','session','equip','exp','focus','style','reps'].includes(k)) OB.picks = {};
    drawOB();
  });
  el.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { const it = pickList()[OB.pickIdx]; OB.picks[it.id] = b.dataset.pick; drawOB(); });
  el.querySelectorAll('[data-ob]').forEach(b => b.onclick = () => {
    const a = b.dataset.ob;
    if (a === 'back') obBack();
    else if (a === 'close') closeOB();
    else if (a === 'auto') { OB.step = OB_STEPS.indexOf('done'); drawOB(); el.scrollTop = 0; }
    else if (a === 'next') {
      if (step === 'pick') {
        const list = pickList(), it = list[OB.pickIdx];
        if (!OB.picks[it.id]) OB.picks[it.id] = defaultPick(it);
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
  const d = OB.d, plan = buildPlan(d), sp = splitOf(d);
  S.user = {name:d.name.trim(), goals:d.goals, exp:d.exp, days:d.days, split:sp.id, style:d.style, reps:d.reps, session:d.session, equip:d.equip, focus:d.focus,
    hUnit:d.hUnit, wUnit:d.wUnit, onboarded:true, planVer:PLAN_VERSION, at:Date.now()};
  S.food.profile = {sex:d.sex, age:d.age, height:Math.round(d.height), weight:r1(d.weight), activity:d.activity, goal:d.nGoal};
  S.food.targets = suggestTargets(S.food.profile);
  if (!S.body.weights.length || Math.abs(S.body.weights[S.body.weights.length - 1].kg - d.weight) > 0.05) {
    S.body.weights = S.body.weights.filter(w => w.d !== today()).concat({d:today(), kg:r1(d.weight)}).sort((a, b) => a.d.localeCompare(b.d));
  }
  const routines = plan.map((day, di) => ({id:uid(), name:day.name, items:day.slots.map((x, si) => ({
    exId:exIdByName(OB.picks[di + ':' + si] || slotOptions(x.slot, d.equip)[0][0]), sets:x.sets, reps:x.reps, rest:x.rest, effort:x.effort}))}));
  const oldProgram = S.program ? S.program.ids : [];
  S.routines = d.replace ? routines : routines.concat(S.routines.filter(r => !oldProgram.includes(r.id)));
  S.program = {split:sp.name, ids:routines.map(r => r.id), created:Date.now()};
  // goal-based starter habits (only adds ones that don't exist)
  const addHabit = (name, icon) => { if (!S.habits.some(h => h.name.toLowerCase() === name.toLowerCase())) S.habits.push({id:uid(), name, icon, days:{}}); };
  if (d.goals.includes('macros') || d.goals.includes('muscle')) addHabit('Hit protein target', '🥩');
  if (d.goals.includes('fat') || d.goals.includes('habits')) addHabit('10k steps', '🚶');
  if (d.goals.includes('habits')) addHabit('8 hours sleep', '😴');
  save();
  const el = $('#ob'); if (el) el.remove(); OB = null;
  go('today'); toast('Plan saved. First up: ' + routines[0].name);
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
