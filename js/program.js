'use strict';
/* ================= program builder + onboarding =================
   The house mentality (from the coaches the owner follows: Keenan Malloy, Jacob Oestreicher, TNF, Naz Darwen, LividDak):
   - few working sets (1-2 per exercise), taken to failure or 0-1 reps short; warm-ups don't count; no junk volume
   - TNF-first: max 10 direct hard sets per muscle a week, all to failure; 6-10 reps; no overhead press on chest-press days; max 2 chest moves a session; long rests; few warm-ups
   - 8-12 for small muscles; beginners 8-12
   - double progression: reps first, then the smallest weight jump; same weight for weeks is normal
   - machines and cables set up so the target muscle is the limit; signature moves (Keenan flaps, Kelso shrug, TNF press, JM press)
   - leg days start with calves and leg extensions; priority muscles go first
   equip: m machine/cable, b barbell, d dumbbell, w bodyweight. First option = recommended (★). */
// Muscle pools: any movement that trains the muscle counts. You don't NEED a press, a fly does the job too.
// [name, equip, why]. A slot picks from its muscle's pool; its "prefer" list only decides the ★ default.
const POOLS = {
  upperChest: [['Smith Machine Incline Press','m','Stable and easy to progress'],['TNF Press','d','Reverse-grip incline press: elbows tucked, easy on the shoulders'],['Low-to-High Cable Fly','m','Upper chest fly, no pressing needed'],
    ['Low-Incline Dumbbell Press','d','Big stretch'],['Incline Dumbbell Fly','d','Huge stretch'],['Incline Dumbbell Press','d',''],['Incline Bench Press','b',''],['Deficit Push-up','w','']],
  midChest: [['Pec Deck','m','Constant tension, triceps out of it'],['Machine Chest Press','m','Stable, so you can go to true failure safely'],['Dumbbell Bench Press','d','Deep stretch at the bottom'],
    ['Hammer Strength Chest Press','m',''],['High-to-Low Cable Fly','m','Leans towards the lower chest'],['Cable Crossover','m',''],['Single-Arm Cable Fly','m',''],['Chest Dips','w','Lean forward'],
    ['Bench Press','b','Best for raw pressing strength'],['Decline Bench Press','b',''],['Weighted Dips','w',''],['Push-up','w','No kit needed']],
  lats: [['Lat Pulldown','m','Easy to load; same end point every rep'],['Keenan Flaps','m','Cuff at the elbow: lats do all the work, biceps out'],['Cable Pullover','m','Lats through a full stretch'],
    ['Single-Arm Lat Pulldown','m','Big stretch per side'],['Neutral-Grip Pulldown','m',''],['Kneeling Single-Arm Pulldown','m',''],['Straight-Arm Pulldown','m',''],
    ['Pull-up','w','The bodyweight classic'],['Chin-up','w',''],['Dumbbell Pullover','d','']],
  upperback: [['Chest-Supported T-Bar Row','m','No lower back, no cheating'],['Single-Arm Cable Row','m',''],['Seated Cable Row','m',''],['Machine Row','m',''],
    ['Seal Row','b',''],['Barbell Row','b',''],['Dumbbell Row','d','Works anywhere'],['Meadows Row','b','']],
  traps: [['Kelso Shrug','m','Chest-supported shrug for the mid-traps'],['Dumbbell Shrug','d',''],['Barbell Shrug','b','']],
  frontDelt: [['Machine Shoulder Press','m','Stable, easy on the joints'],['Seated Dumbbell Shoulder Press','d','Free path for your shoulders'],['Front Raise','d','Front delts only, no pressing'],['Arnold Press','d',''],['Overhead Press','b','Strength builder']],
  sideDelt: [['Cable Lateral Raise','m','Tension right where dumbbells go light'],['Behind-the-Back Cable Lateral Raise','m',''],['Cable Y-Raise','m',''],['Machine Lateral Raise','m',''],
    ['Lean-Away Lateral Raise','d',''],['Lateral Raise','d','Classic, works anywhere'],['Cable Upright Row','m','']],
  rearDelt: [['Reverse Pec Deck','m','Easiest rear delt move to feel'],['Cable Rear Delt Fly','m',''],['Face Pull','m',''],['Rear Delt Fly','d','']],
  triOverhead: [['Overhead Cable Tricep Extension','m','Long head at full stretch, best for size'],['Katana Tricep Extension','m',''],['Overhead Dumbbell Tricep Extension','d','Works anywhere']],
  triNormal: [['Tricep Pushdown','m','Simple to load heavy'],['JM Press','b','Heavy triceps press, a social-media favourite'],['Rope Pushdown','m',''],['Skull Crusher','b',''],
    ['Cross-Body Tricep Extension','m',''],['Dips','w','Bodyweight compound'],['Close-Grip Bench Press','b',''],['Dumbbell Skull Crusher','d',''],['Tricep Kickback','d','']],  biceps: [['Recline Curl','d','Lying back on the bench, upper arms behind you, so the biceps work at a long length'],['Hammer Curl','d','Biceps plus forearms'],['Bayesian Curl','m','Cable tension at the stretch'],['Incline Dumbbell Curl','d','Biceps at full stretch'],
    ['Cable Curl','m',''],['EZ Bar Curl','b',''],['Preacher Curl','m',''],['Machine Preacher Curl','m',''],['Spider Curl','d',''],['Concentration Curl','d','']],
  brachio: [['Reverse Curl','b','Palms down: brachioradialis does the work'],['Hammer Curl','d','Neutral grip, brachioradialis plus biceps'],['TNF Reverse Curl','m','Reverse-grip curl variation'],
    ['Cross-Body Hammer Curl','d',''],['Zottman Curl','d','Curl up palms-up, lower palms-down']],
  flexors: [['Wrist Curl','b','Forearm flexors, palms up'],['Dumbbell Wrist Curl','d',''],["Farmer's Carry",'d','Grip and flexors under load']],
  extensors: [['Reverse Wrist Curl','b','Forearm extensors, palms down'],['Dumbbell Reverse Wrist Curl','d',''],['Reverse Curl','b','']],
  lowerBack: [['45° Back Extension','m','Erectors with hamstrings and glutes'],['Stiff-Leg Deadlift','d','SLDL: lower back, with hamstrings and glutes'],['Back Extension','w',''],['Good Morning','b',''],['Jefferson Curl','b','Light and slow, spine through flexion']],
  adductors: [['Hip Adduction','m','Inner thighs, easy to load'],['Copenhagen Plank','w','Bodyweight adductor killer']],
  abductors: [['Hip Abduction','m','Glute med, side of the hip'],['Cable Hip Abduction','m',''],['Banded Lateral Walk','w','']],
  tibialis: [['Tibialis Raise','w','Front of the shin, knee and ankle health']],
  obliques: [['Cable Woodchopper','m','Rotation under load'],['Pallof Press','m','Anti-rotation'],['Side Plank','w',''],['Russian Twist','w','']],
  neck: [['Neck Curl','w','Front of the neck'],['Neck Extension','w','Back of the neck'],['Lateral Neck Flexion','w','Sides of the neck']],  quads: [['Pendulum Squat','m','Deep knee bend, quads take everything'],['Leg Extension','m','Do it first on leg day'],['Leg Press','m','Heavy and safe to push hard'],['Hack Squat','m',''],
    ['Smith Machine Squat','m',''],['Belt Squat','m',''],['Squat','b','Best for overall strength'],['Bulgarian Split Squat','d','Big glute and quad stretch'],['Walking Lunge','d',''],
    ['Goblet Squat','d','Works at home'],['Sissy Squat','w',''],['Reverse Nordic','w','']],
  hamstrings: [['Seated Leg Curl','m','Hamstrings at length, more growth'],['Romanian Deadlift','b','Best hamstring stretch under load'],['Lying Leg Curl','m',''],['Stiff-Leg Deadlift','d','SLDL: hamstrings stretched, lower back works hard too'],
    ['45° Back Extension','m','Hamstrings and glutes, easy on the back'],['B-Stance RDL','d',''],['Nordic Curl','w','']],
  glutes: [['Hip Thrust','b','Heaviest glute loading'],['Smith Machine Hip Thrust','m',''],['Hip Abduction','m',''],['Cable Glute Kickback','m',''],['45° Back Extension','m',''],['Glute Bridge','w','']],
  calves: [['Standing Calf Raise','d','Pause in the bottom stretch, no bouncing'],['Leg Press Calf Raise','m',''],['Seated Calf Raise','m','']],
  abs: [['Cable Crunch','m','Load abs like any other muscle'],['Hanging Leg Raise','w',''],['Ab Wheel Rollout','w',''],['Decline Sit-up','w',''],['Dead Bug','w','']]
};
// Slots = a muscle job in a day. pool = what you can pick from; prefer = the ★ default order.
const SLOTS = {
  chestIncline:{m:'chest', pool:'upperChest', label:'Upper chest', big:1, prefer:['Smith Machine Incline Press','TNF Press','Low-Incline Dumbbell Press']},
  chestPress:  {m:'chest', pool:'midChest', label:'Mid & lower chest', big:1, prefer:['Machine Chest Press','Dumbbell Bench Press']},
  chestFly:    {m:'chest', pool:'midChest', label:'Mid & lower chest', prefer:['Pec Deck','High-to-Low Cable Fly','Chest Dips']},
  vPull:       {m:'lats', pool:'lats', label:'Lats (width)', big:1, prefer:['Lat Pulldown','Pull-up']},
  latIso:      {m:'lats', pool:'lats', label:'Lats (full stretch)', prefer:['Keenan Flaps','Cable Pullover','Dumbbell Pullover']},
  hRow:        {m:'upperback', pool:'upperback', label:'Upper back (thickness)', big:1, prefer:['Chest-Supported T-Bar Row','Dumbbell Row']},
  traps:       {m:'traps', pool:'traps', label:'Traps', prefer:['Kelso Shrug']},
  ohp:         {m:'shoulders', pool:'frontDelt', label:'Front delts', big:1, prefer:['Machine Shoulder Press','Seated Dumbbell Shoulder Press']},
  sideDelt:    {m:'shoulders', pool:'sideDelt', label:'Side delts', small:1, prefer:['Cable Lateral Raise','Lateral Raise']},
  rearDelt:    {m:'shoulders', pool:'rearDelt', label:'Rear delts', small:1, prefer:['Reverse Pec Deck','Rear Delt Fly']},
  triOH:       {m:'triceps', pool:'triOverhead', label:'Triceps long head (overhead)', prefer:['Overhead Cable Tricep Extension','Overhead Dumbbell Tricep Extension']},
  triPush:     {m:'triceps', pool:'triNormal', label:'Triceps (pushdown / press)', prefer:['Tricep Pushdown','JM Press','Dips']},
  biLong:      {m:'biceps', pool:'biceps', label:'Biceps', prefer:['Recline Curl','Incline Dumbbell Curl']},
  biHammer:    {m:'forearms', pool:'brachio', label:'Brachioradialis', small:1, prefer:['Reverse Curl','Hammer Curl']},
  flexors:     {m:'forearms', pool:'flexors', label:'Forearm flexors', small:1, prefer:['Wrist Curl','Dumbbell Wrist Curl']},
  extensors:   {m:'forearms', pool:'extensors', label:'Forearm extensors', small:1, prefer:['Reverse Wrist Curl','Dumbbell Reverse Wrist Curl']},
  lowerBack:   {m:'lowerback', pool:'lowerBack', label:'Lower back (erectors)', prefer:['45° Back Extension','Back Extension']},
  adductors:   {m:'adductors', pool:'adductors', label:'Adductors (inner thigh)', prefer:['Hip Adduction','Copenhagen Plank']},
  abductors:   {m:'glutes', pool:'abductors', label:'Abductors (glute med)', small:1, prefer:['Hip Abduction','Banded Lateral Walk']},
  tibialis:    {m:'tibialis', pool:'tibialis', label:'Tibialis (shins)', small:1, prefer:['Tibialis Raise']},
  obliques:    {m:'abs', pool:'obliques', label:'Obliques', small:1, prefer:['Cable Woodchopper','Side Plank']},
  neck:        {m:'neck', pool:'neck', label:'Neck', small:1, prefer:['Neck Curl']},
  squat:       {m:'quads', pool:'quads', label:'Quads (squat)', big:1, prefer:['Pendulum Squat','Hack Squat','Goblet Squat']},
  legPress:    {m:'quads', pool:'quads', label:'Quads & glutes (press)', big:1, prefer:['Leg Press','Bulgarian Split Squat']},
  quadIso:     {m:'quads', pool:'quads', label:'Quads (leg extension)', prefer:['Leg Extension','Sissy Squat']},
  hinge:       {m:'hamstrings', pool:'hamstrings', label:'Hamstrings & glutes (hinge)', big:1, prefer:['Romanian Deadlift','Stiff-Leg Deadlift','45° Back Extension','B-Stance RDL']},
  hamCurl:     {m:'hamstrings', pool:'hamstrings', label:'Hamstrings (curl)', prefer:['Seated Leg Curl','Nordic Curl']},
  glute:       {m:'glutes', pool:'glutes', label:'Glutes', prefer:['Hip Thrust','Glute Bridge']},
  calves:      {m:'calves', pool:'calves', label:'Calves', small:1, prefer:['Standing Calf Raise']},
  abs:         {m:'abs', pool:'abs', label:'Abs', small:1, prefer:['Cable Crunch','Hanging Leg Raise']}
};
// Day templates: [slot, priority] (1 = core, 2 = important, 3 = extra; time limits drop 3s then 2s first)
const DAYS = {
  fb:   ['Full Body', [['chestIncline',1],['vPull',1],['chestFly',2],['hRow',1],['sideDelt',1],['triOH',1],['triPush',1],['biLong',1],['squat',1],['hamCurl',1],['quadIso',2],['hinge',2],['calves',2],['latIso',3],['biHammer',3],['abs',3]]],
  up:   ['Upper', [['chestIncline',1],['vPull',1],['chestFly',1],['hRow',1],['latIso',2],['sideDelt',1],['triOH',1],['triPush',1],['biLong',1],['rearDelt',2],['traps',2],['biHammer',3]]],
  lo:   ['Lower', [['calves',1],['quadIso',1],['squat',1],['hamCurl',1],['hinge',1],['legPress',2],['adductors',3],['glute',3],['abs',3]]],
  ant:  ['Anterior', [['chestIncline',1],['chestFly',1],['sideDelt',1],['triOH',1],['triPush',1],['biLong',1],['quadIso',1],['squat',1],['abs',3]]],
  post: ['Posterior', [['vPull',1],['hRow',1],['latIso',2],['rearDelt',1],['traps',2],['biHammer',3],['hamCurl',1],['hinge',1],['glute',2],['calves',2]]],
  push: ['Push', [['chestIncline',1],['chestFly',1],['sideDelt',1],['triOH',1],['triPush',1],['rearDelt',3]]],
  pull: ['Pull', [['vPull',1],['hRow',1],['latIso',1],['rearDelt',1],['traps',2],['biLong',1],['biLong',2],['biHammer',2]]],
  legs: ['Legs', [['calves',1],['quadIso',1],['squat',1],['hamCurl',1],['hinge',1],['legPress',2],['adductors',3],['abs',2]]],
  bChest:['Chest', [['chestIncline',1],['chestPress',1],['chestFly',1],['triOH',2],['triPush',2],['abs',3]]],
  bBack: ['Back', [['vPull',1],['hRow',1],['latIso',1],['traps',2],['rearDelt',2]]],
  bLegs: ['Legs', [['calves',1],['quadIso',1],['squat',1],['hamCurl',1],['hinge',1],['legPress',2],['glute',3]]],
  bShld: ['Shoulders', [['ohp',1],['sideDelt',1],['rearDelt',1],['sideDelt',2],['traps',3]]],
  bArms: ['Arms', [['biLong',1],['triOH',1],['biLong',1],['triPush',1],['biHammer',2],['abs',3]]]
};// Split options per days a week. days = the rotation; it repeats to fill the week.
const SPLITS = {
  2: [{id:'fb', name:'Full body', days:['fb'], why:'The same full-body session twice a week: every muscle twice a week.'}],
  3: [{id:'fbEOD', name:'Full body every other day', days:['fb'], why:'One full-body session, every other day. Every muscle hit 3–4 times a week.'},
      {id:'ppl', name:'Push / Pull / Legs', days:['push','pull','legs'], why:'Each muscle once a week, so every set goes all out.'}],
  4: [{id:'ul', name:'Upper / Lower', days:['up','lo'], why:'Upper, Lower, Upper, Lower: each muscle twice a week.'},
      {id:'ap', name:'Anterior / Posterior', days:['ant','post'], why:'Front of the body, then back of the body. Twice each a week.'},
      {id:'fbEOD', name:'Full body every other day', days:['fb'], why:'One full-body session every other day.'}],
  5: [{id:'pplul', name:'Push / Pull / Legs / Upper / Lower', days:['push','pull','legs','up','lo'], why:'Five days, every muscle twice a week, about an hour each.'},
      {id:'bro', name:'Bro split', days:['bChest','bBack','bLegs','bShld','bArms'], why:'One body part a day. Each muscle once a week, so you can absolutely bury it.'}],
  6: [{id:'ppl2', name:'Push / Pull / Legs', days:['push','pull','legs'], why:'Push, Pull, Legs, then again: every muscle twice a week.'},
      {id:'ap3', name:'Anterior / Posterior', days:['ant','post'], why:'Front and back days, three of each a week.'}]
};
const SCHEDULE = {2:'e.g. Mon & Thu', 3:'e.g. Mon, Wed, Fri', 4:'e.g. Mon, Tue, Thu, Fri', 5:'e.g. Mon–Fri', 6:'e.g. Mon–Sat, Sunday off'};
const STYLES = {
  hard2: {name:'2 hard sets, both to failure', sub:'Recommended. Volume is low, so every working set goes all the way.', sets:2, effort:'both sets to failure'},
  max1:  {name:'1 all-out set, more exercises', sub:'Maximalist: one set to failure per exercise, more angles per muscle.', sets:1, effort:'one all-out set to failure'},
  std3:  {name:'3 sets, pick which go to failure', sub:'More sets means more fatigue, so only the last set goes to failure, the rest stop 1–2 short.', sets:3, effort:'last set to failure, the rest 1–2 short'}
};
const FOCUS = [['chest','Chest'],['back','Back'],['shoulders','Shoulders'],['arms','Arms'],['legs','Legs'],['glutes','Glutes']];
const FOCUS_OF = {forearms:['arms'], adductors:['legs'], tibialis:['legs'], lowerback:['back'], neck:[], chest:['chest'], lats:['back'], upperback:['back'], traps:['back'], shoulders:['shoulders'], biceps:['arms'], triceps:['arms'], quads:['legs'], hamstrings:['legs','glutes'], glutes:['glutes'], calves:['legs'], abs:[]};
const EQUIP = {full:['m','b','d','w'], basic:['b','d','w'], home:['d','w']};

/** A muscle's movements: the built-in list plus your own exercises for it. */
function poolOf(key){
  const mine = (S.exercises || []).filter(e => !e.hidden && (e.pools || []).includes(key)).map(e => [e.name, '*', e.pop ? '🔥 Popular' + (popCount(e.name) ? ': added by ' + popCount(e.name) + ' people' : '') : 'Your exercise']);
  return POOLS[key].concat(mine.filter(o => !POOLS[key].some(p => p[0] === o[0])));
}
/** Options for a slot (equipment-filtered; your own are always offered), preferred first, minus 'exclude'. */
function slotOptions(key, equip, exclude){
  const ok = EQUIP[equip] || EQUIP.full, sl = SLOTS[key], pool = poolOf(sl.pool).filter(o => o[1] === '*' || ok.includes(o[1]));
  const rank = o => { const i = sl.prefer.indexOf(o[0]); return i < 0 ? 99 + pool.indexOf(o) : i; };
  return pool.slice().sort((a, b) => rank(a) - rank(b)).filter(o => !(exclude || []).includes(o[0]));
}
/** One pick per slot, shared by every day that has it. key = slot + which one it is that day (2 curls = #0, #1). */
function planKeys(plan){
  return plan.map(day => { const n = {}; return day.slots.map(x => { n[x.slot] = (n[x.slot] || 0) + 1; return x.slot + '#' + (n[x.slot] - 1); }); });
}
/** Movement for every 'day:slot': your pick for that key, else the first preferred one not used in any day the key shares. */
function resolvePicks(plan, picks, equip){
  const keys = planKeys(plan), order = [...new Set([].concat(...keys))], names = {}, out = {};
  const clash = k => { const u = []; keys.forEach(d => { if (d.includes(k)) d.forEach(o => { if (o !== k && names[o]) u.push(names[o]); }); }); return u; };
  const opts = (k, ex) => slotOptions(k.split('#')[0], equip, ex);
  order.forEach(k => { if (picks[k] === '') names[k] = ''; else if (picks[k] && opts(k, clash(k)).some(o => o[0] === picks[k])) names[k] = picks[k]; });
  order.forEach(k => { if (names[k] === undefined) names[k] = (opts(k, clash(k))[0] || opts(k)[0])[0]; });
  keys.forEach((d, di) => d.forEach((k, si) => { out[di + ':' + si] = names[k]; }));
  return out;
}
/** Plans made before picks were remembered: work out what you chose from the routines. */
function inferPicks(){
  const out = {}, ids = S.program ? S.program.ids : [];
  S.routines.filter(r => ids.includes(r.id)).forEach(r => {
    const seen = {};
    r.items.forEach(it => {
      const name = exName(it.exId);
      const sl = it.slot || Object.keys(SLOTS).filter(k => poolOf(SLOTS[k].pool).some(o => o[0] === name))
        .sort((a, b) => (SLOTS[b].prefer.includes(name) - SLOTS[a].prefer.includes(name)) || ((seen[a] || 0) - (seen[b] || 0)) || ((a === 'chestPress') - (b === 'chestPress')))[0];
      if (!sl) return;
      const k = sl + '#' + (seen[sl] || 0); seen[sl] = (seen[sl] || 0) + 1;
      if (!out[k]) out[k] = name;
    });
  });
  return out;
}
/* ---------- custom split: muscles per weekday ---------- */
const WEEKDAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const WEEKDAY_FULL = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
// every trainable part, grouped by region (the order also sets the order in a session)
const CM_GROUPS = [
  ['Chest', [['upperChest','Upper chest'],['midChest','Mid & lower chest']]],
  ['Back', [['lats','Lats'],['upperback','Upper back'],['traps','Traps'],['lowerback','Lower back']]],
  ['Shoulders', [['frontDelt','Front delts'],['sideDelt','Side delts'],['rearDelt','Rear delts']]],
  ['Arms', [['biceps','Biceps'],['triceps','Triceps'],['brachio','Brachioradialis'],['flexors','Forearm flexors'],['extensors','Forearm extensors']]],
  ['Legs', [['quads','Quads'],['hamstrings','Hamstrings'],['glutes','Glutes'],['adductors','Adductors'],['calves','Calves']]],
  ['Core', [['abs','Abs'],['obliques','Obliques']]]
];
const CUSTOM_MUSCLES = [].concat(...CM_GROUPS.map(g => g[1]));
const CM_LABEL = Object.fromEntries(CUSTOM_MUSCLES);
const CM_REGION = {}; CM_GROUPS.forEach(([r, l]) => l.forEach(([k]) => CM_REGION[k] = r));
const MUSCLE_SLOTS = {upperChest:[['chestIncline',1]], midChest:[['chestFly',1]],
  lats:[['vPull',1],['latIso',2]], upperback:[['hRow',1]], traps:[['traps',1]], lowerback:[['lowerBack',1]],
  frontDelt:[['ohp',1]], sideDelt:[['sideDelt',1]], rearDelt:[['rearDelt',1]],
  biceps:[['biLong',1]], triceps:[['triOH',1],['triPush',1]], brachio:[['biHammer',1]], flexors:[['flexors',1]], extensors:[['extensors',1]],
  quads:[['quadIso',1],['squat',1],['legPress',2]], hamstrings:[['hamCurl',1],['hinge',1]], glutes:[['glute',1]], adductors:[['adductors',1]], abductors:[['abductors',1]],
  calves:[['calves',1]], tibialis:[['tibialis',1]], abs:[['abs',1]], obliques:[['obliques',1]], neck:[['neck',1]]};
const DAY_TEMPLATES = [
  ['Push',['upperChest','midChest','sideDelt','triceps']],
  ['Pull',['lats','upperback','traps','rearDelt','biceps','brachio']],
  ['Legs',['quads','hamstrings','glutes','adductors','calves','abs']],
  ['Upper',['upperChest','midChest','lats','upperback','traps','sideDelt','rearDelt','biceps','triceps']],
  ['Lower',['quads','hamstrings','glutes','adductors','calves']],
  ['Full Body',['upperChest','lats','upperback','sideDelt','biceps','triceps','quads','hamstrings']],
  ['Anterior',['upperChest','midChest','sideDelt','biceps','triceps','quads','adductors','abs']],
  ['Posterior',['lats','upperback','traps','rearDelt','lowerback','brachio','hamstrings','glutes','calves']],
  ['Arms',['biceps','triceps','brachio','flexors','extensors']],
  ['Chest & Back',['upperChest','midChest','lats','upperback']],
  ['Shoulders & Arms',['frontDelt','sideDelt','rearDelt','biceps','triceps']]];
const TPL = n => DAY_TEMPLATES.find(t => t[0] === n)[1].slice();
const DEFAULT_WEEK = [TPL('Push'), TPL('Pull'), TPL('Legs'), [], TPL('Upper'), TPL('Lower'), []];
// weeks saved before the sub-muscle update used whole regions: convert them
const OLD_KEYS = {lowerChest:['midChest'], chest:['upperChest','midChest'], back:['lats','upperback'], shoulders:['sideDelt','rearDelt'], forearms:['brachio']};
function normWeek(week){
  return (week || DEFAULT_WEEK).map(ms => { const out = []; ms.forEach(m => (OLD_KEYS[m] || [m]).forEach(k => { if (CM_LABEL[k] && !out.includes(k)) out.push(k); })); return out; });
}
const UPPER_M = CM_GROUPS.slice(0, 4).flatMap(g => g[1].map(x => x[0]));
function dayName(ms){
  if (!ms.length) return 'Rest';
  const t = DAY_TEMPLATES.find(([, l]) => l.length === ms.length && l.every(m => ms.includes(m)));
  if (t) return t[0];
  const regions = [...new Set(CUSTOM_MUSCLES.filter(([k]) => ms.includes(k)).map(([k]) => CM_REGION[k]))];
  if (regions.length === 1) { const names = CUSTOM_MUSCLES.filter(([k]) => ms.includes(k)).map(([, l]) => l); return names.length <= 2 ? names.join(' & ') : regions[0]; }
  return regions.length <= 3 ? regions.join(' & ').replace(/ & (?=.* & )/g, ', ') : regions.slice(0, 2).join(', ') + ' +' + (regions.length - 2);
}
const SHORT = {'Full Body':'Full', Anterior:'Ant.', Posterior:'Post.', 'Chest & Back':'Ch·Bk', 'Shoulders & Arms':'Sh·Ar'};
const REGION_SHORT = {Chest:'Ch', Back:'Bk', Shoulders:'Sh', Arms:'Ar', Legs:'Lg', Core:'Co'};
/** short label for the 7-day strip */
function dayShort(ms){
  const n = dayName(ms);
  if (DAY_TEMPLATES.some(t => t[0] === n) || n === 'Rest') return SHORT[n] || n;
  return [...new Set(CUSTOM_MUSCLES.filter(([k]) => ms.includes(k)).map(([k]) => REGION_SHORT[CM_REGION[k]]))].join('·');
}
function customDays(week){
  const out = [];
  normWeek(week).forEach((ms, wd) => {
    if (!ms.length) return;
    const legsOnly = ms.every(m => !UPPER_M.includes(m));
    const order = legsOnly ? ['calves','quads','adductors','hamstrings','glutes','abs','obliques'] : CUSTOM_MUSCLES.map(([k]) => k);
    let slots = [];
    order.filter(m => ms.includes(m)).forEach(m => slots = slots.concat(MUSCLE_SLOTS[m] || []));
    // few parts in the day = room for a 2nd movement on each (bro-split style)
    if (ms.length <= 4) {
      if (ms.includes('midChest') && ms.length <= 2) slots.push(['chestPress', 2]);
      if (ms.includes('biceps')) slots.push(['biLong', 2]);
      if (ms.includes('sideDelt')) slots.push(['sideDelt', 2]);
      if (ms.includes('upperback')) slots.push(['hRow', 2]);
    }
    if (!legsOnly && ms.some(m => !UPPER_M.includes(m))) slots.sort((a, b) => a[1] - b[1]);   // mixed days: core moves first
    out.push({key:'c' + wd, name:dayName(ms), weekday:wd, raw:slots});
  });
  return out;
}
function splitOf(u){
  if (u.split === 'custom') return {id:'custom', name:'Custom split', why:'Your own week.', custom:true};
  const list = SPLITS[u.days] || SPLITS[4]; return list.find(s => s.id === u.split) || list[0];
}
function repsFor(slot, u){
  const small = SLOTS[slot].small, light = u.exp === 'beginner' || u.reps === 'moderate';
  return light ? (small ? '10-15' : '8-12') : (small ? '8-12' : '6-10');
}
/** Days -> [{key, name, weekday?, slots:[{slot, sets, reps, rest, effort}]}] fitted to the session length. */
function buildPlanRaw(u){   // sets.js has the final set counts
  const split = splitOf(u), style = STYLES[u.style] || STYLES.hard2;
  const focusOf = x => (u.focus || []).some(f => (FOCUS_OF[SLOTS[x.slot].m] || []).includes(f));
  const minutes = list => Math.round(5 + list.reduce((a, x) => a + x.sets * 2.5 + 1.5, 0));   // warm-up + ~2.5 min a hard set incl. rest + setup
  const raw = split.custom ? customDays(u.week || DEFAULT_WEEK) : split.days.map(dk => ({key:dk, name:DAYS[dk][0], raw:DAYS[dk][1]}));
  const days = raw.map(day => {
    let list = day.raw.filter(([s]) => slotOptions(s, u.equip).length).map(([slot, p]) => {
      let sets = style.sets;
      if (style.sets === 1 && ['quadIso','calves','traps'].includes(slot)) sets = 2;   // the usual two-set exceptions
      if (style.sets === 3 && SLOTS[slot].small) sets = 2;
      if (slot === 'triOH') sets = 2;
      if (slot === 'triPush') sets = 2;                        // normal triceps move: 2 sets
      return {slot, p, sets, reps:repsFor(slot, u), rest:SLOTS[slot].big ? 180 : 120, effort:style.effort};
    });
    list.forEach(x => { if (focusOf(x)) { x.focus = true; } });
    // priority muscles first (but calves and leg extensions keep opening leg days)
    const opener = x => (x.slot === 'calves' || x.slot === 'quadIso') && list.indexOf(x) < 2;
    list = list.filter(opener).concat(list.filter(x => !opener(x) && x.focus), list.filter(x => !opener(x) && !x.focus));
    const cap = +u.session || 60;
    // never drop the last exercise for a major muscle group in the day
    const MAJOR = {chest:'chest', lats:'back', upperback:'back', shoulders:'shoulders', triceps:'triceps', biceps:'biceps', quads:'quads', hamstrings:'hamstrings'};
    const grpOf = x => x.slot === 'triOH' || x.slot === 'triPush' ? x.slot : MAJOR[SLOTS[x.slot].m];   // both triceps moves are always kept
    const lastOfGroup = x => { const g = grpOf(x); return g && list.filter(y => grpOf(y) === g).length === 1; };
    for (const p of [3, 2, 1]) {
      while (minutes(list) > cap && list.length > 4) {
        let i = -1; for (let k = list.length - 1; k >= 0; k--) if (list[k].p === p && !list[k].focus && !lastOfGroup(list[k])) { i = k; break; }
        if (i < 0) break; list.splice(i, 1);
      }
    }
    // still too long: take a set off the biggest slots (never below 2) rather than lose a muscle
    while (minutes(list) > cap) {
      const c = list.filter(x => x.sets > 2).sort((a, b) => b.sets - a.sets)[0];
      if (!c) break; c.sets--;
    }
    return {key:day.key, name:day.name, weekday:day.weekday, slots:list, minutes:minutes(list)};
  });
  capWeekly(days, u, focusOf);
  days.forEach(d => d.minutes = minutes(d.slots));
  return days;
}
/** Max 10 direct hard sets per muscle group a week (12 for a focus muscle): every set is to failure, more is just fatigue. */
const CAP_GROUP = {lats:'back', upperback:'back'};
function capWeekly(days, u, focusOf){
  const per = u.split === 'custom' ? 1 : (u.days || days.length) / days.length;
  const grp = x => CAP_GROUP[SLOTS[x.slot].m] || SLOTS[x.slot].m;
  const minSets = () => 2;
  const stuck = new Set(['shoulders']);   // owner: shoulders recover well, extra volume is fine   // groups that can't go lower (e.g. the triceps 1+2 rule)
  for (let guard = 0; guard < 300; guard++) {
    const w = {}, foc = {};
    days.forEach(d => d.slots.forEach(x => { w[grp(x)] = (w[grp(x)] || 0) + x.sets * per; if (x.focus) foc[grp(x)] = true; }));
    const over = Object.keys(w).filter(g => !stuck.has(g) && w[g] > (foc[g] ? 12 : 10) + 0.01).sort((a, b) => w[b] - w[a]);
    if (!over.length) return;
    const g = over[0];
    // 1) drop an extra slot for that muscle (lowest priority, not the day's only one, not a triceps pair member)
    let best = null;
    days.forEach(d => d.slots.forEach((x, i) => {
      if (grp(x) !== g || x.focus || x.slot === 'triOH' || x.slot === 'triPush') return;
      if (d.slots.filter(y => grp(y) === g).length < 2) return;
      if (!best || x.p > best.x.p) best = {d, i, x};
    }));
    if (best && best.x.p >= 2) { best.d.slots.splice(best.i, 1); continue; }
    // 2) otherwise take a set off the slot with the most sets
    let cand = null;
    days.forEach(d => d.slots.forEach(x => { if (grp(x) === g && x.sets > minSets(x) && (!cand || x.sets > cand.sets)) cand = x; }));
    if (cand) { cand.sets--; continue; }
    stuck.add(g);
  }
}
function weeklySets(plan, u){
  const custom = u && u.split === 'custom';
  const per = custom ? 1 : (u && u.days ? u.days : plan.length) / plan.length, w = {};
  plan.forEach(d => d.slots.forEach(x => { const m = SLOTS[x.slot].m; w[m] = (w[m] || 0) + x.sets * per; }));
  Object.keys(w).forEach(k => w[k] = Math.round(w[k]));
  return w;
}

/* ---------- week coach: overlap, recovery and frequency tips (sub-muscle level) ---------- */
const CHESTS = ['upperChest','midChest'];
// what training X also hits hard (warn when it's trained the very next day)
const INDIRECT = {
  lats:      {biceps:'pulldowns already hammer your biceps', brachio:'every pull loads your brachioradialis', flexors:'your grip worked through every pull'},
  upperback: {biceps:'rows already work your biceps', rearDelt:'rows hit your rear delts hard', brachio:'rows load your brachioradialis'},
  upperChest:{triceps:'every press works your triceps', frontDelt:'incline pressing hits your front delts hard'},
  midChest:  {triceps:'every press works your triceps', frontDelt:'pressing hits your front delts'},
  frontDelt: {triceps:'overhead pressing works your triceps'},
  traps:     {upperback:'shrugs and rows share the mid-back'},
  quads:     {glutes:'squats and leg press hit your glutes', adductors:'deep squats load your adductors'},
  hamstrings:{glutes:'hinges load your glutes', lowerback:'RDLs work your lower back'},
  glutes:    {hamstrings:'hip thrusts and hinges overlap with your hamstrings'},
  lowerback: {hamstrings:'back extensions work your hamstrings'}
};
// small part trained the day BEFORE the big lift that needs it
const LIMITS = {biceps:{lats:'tired biceps give out before your lats on pulldowns', upperback:'tired biceps cut your rows short'},
  brachio:{lats:'tired forearms cut your pulls short', upperback:'tired forearms cut your rows short'}, flexors:{lats:'a fried grip cuts your pulls short', upperback:'a fried grip cuts your rows short'},
  triceps:{upperChest:'tired triceps cut your presses short', midChest:'tired triceps cut your presses short', frontDelt:'tired triceps cut your overhead presses short'},
  lowerback:{hamstrings:'a tired lower back limits your RDLs', quads:'a tired lower back limits heavy squats'}};
const SMALL_FAST = ['calves','tibialis','abs','obliques','brachio','flexors','extensors','neck','abductors'];
const GROUP_OF = m => CHESTS.includes(m) ? 'chest' : ['lats','upperback'].includes(m) ? 'back' : ['frontDelt','sideDelt','rearDelt'].includes(m) ? 'shoulders' : m;
function analyzeWeek(weekIn){
  const week = normWeek(weekIn), tips = [], D = i => WEEKDAYS[i], L = m => CM_LABEL[m];
  const trainDays = week.map((ms, i) => ms.length ? i : -1).filter(i => i >= 0);
  if (!trainDays.length) return [{t:'warn', msg:'Pick at least one training day.'}];
  for (let i = 0; i < 7; i++) {
    const A = week[i], j = (i + 1) % 7, B = week[j];
    if (!A.length || !B.length) continue;
    B.forEach(m => {
      if (A.includes(m)) {
        if (SMALL_FAST.includes(m)) tips.push({t:'tip', msg:`${L(m)} on ${D(i)} and ${D(j)}: small muscles recover fast, so back-to-back is OK if you're not sore.`});
        else tips.push({t:'warn', msg:`${L(m)} on ${D(i)} and ${D(j)} back-to-back: under 48 hours to recover. Put at least a day between them.`});
        return;
      }
      A.forEach(a => { const why = INDIRECT[a] && INDIRECT[a][m];
        if (why) tips.push({t:'warn', msg:`${L(m)} on ${D(j)} right after ${L(a).toLowerCase()} on ${D(i)}: ${why}, so expect overlap and weaker numbers. Train them together or put a day between.`}); });
      A.forEach(a => { const why = LIMITS[a] && LIMITS[a][m];
        if (why) tips.push({t:'warn', msg:`${L(a)} on ${D(i)} then ${L(m).toLowerCase()} on ${D(j)}: ${why}. Swap the order or train them together.`}); });
    });
  }
  week.forEach((ms, i) => {
    const has = k => ms.includes(k), chest = CHESTS.filter(has);
    if ((has('lats') || has('upperback')) && has('biceps')) tips.push({t:'good', msg:`${D(i)}: back + biceps together is a good pairing. Biceps are already warm and they recover on the same days.`});
    if (chest.length && has('triceps')) tips.push({t:'good', msg:`${D(i)}: chest + triceps together works well, the pressing overlap lands on one day.`});
    if (chest.length && has('frontDelt')) tips.push({t:'tip', msg:`${D(i)}: chest pressing already hits your front delts hard, so direct front delt work the same day is usually wasted. Side and rear delts are the ones that need it.`});
    if (ms.length >= 10) tips.push({t:'tip', msg:`${D(i)} trains ${ms.length} parts: each gets 1–2 sets. Fine, just keep it short and hard.`});
  });
  const freq = g => week.filter(ms => ms.some(m => GROUP_OF(m) === g)).length;
  [['chest','chest'],['back','back (lats or upper back)'],['shoulders','delts'],['quads','quads'],['hamstrings','hamstrings'],['biceps','biceps'],['triceps','triceps']].forEach(([g, name]) => {
    const n = freq(g);
    if (!n) tips.push({t:'warn', msg:`No ${name} this week. Add it to a day.`});
    else if (n === 1) tips.push({t:'tip', msg:`${name[0].toUpperCase() + name.slice(1)} once a week: fine if every set goes to failure, but twice a week usually grows faster.`});
    else if (n >= 3) tips.push({t:'tip', msg:`${name[0].toUpperCase() + name.slice(1)} ${n} times a week: the plan keeps it under 10 hard sets a week, so expect 1–2 sets each session.`});
  });
  if (!week.some(ms => ms.includes('sideDelt'))) tips.push({t:'tip', msg:'No side delts this week. They make your shoulders look wider and barely get hit by pressing.'});
  if (!week.some(ms => ms.includes('rearDelt'))) tips.push({t:'tip', msg:'No rear delts this week. Rows help a bit, but a reverse fly keeps your shoulders balanced.'});
  let run = 0, best = 0; for (let k = 0; k < 14; k++) { if (week[k % 7].length) { run++; best = Math.max(best, run); } else run = 0; }
  if (trainDays.length === 7) tips.push({t:'warn', msg:'No rest day. Even with low volume, take at least one full day off a week.'});
  else if (best >= 4) tips.push({t:'tip', msg:`${Math.min(best, 7)} training days in a row: watch your performance late in the streak, a rest day in the middle helps.`});
  if (!tips.some(x => x.t === 'warn')) tips.unshift({t:'good', msg:'No overlap problems: every muscle gets time to recover between sessions.'});
  return tips.filter((x, i, a) => a.findIndex(y => y.msg === x.msg) === i);
}
/* ---------- onboarding ---------- */
let OB = null;
const PLAN_VERSION = 6;
function startOnboarding(fromSettings){
  const p = S.food.profile, u = S.user || {};
  OB = {step:0, fromSettings:!!fromSettings, picks:Object.assign({}, u.picks || inferPicks()), pickIdx:0,
    d:{name:u.name || '', goals:u.goals || [], sex:p.sex || 'm', age:p.age || 25, height:p.height || 178, weight:(S.body.weights.length ? S.body.weights[S.body.weights.length - 1].kg : p.weight) || 75,
       hUnit:u.hUnit || 'cm', wUnit:u.wUnit || 'kg', nGoal:p.goal || 'maintain', activity:p.activity || 1.55,
       exp:u.exp || 'intermediate', days:u.days || 4, split:u.split || '', style:u.style || 'hard2', reps:u.reps || 'heavy',
       session:u.session || 60, equip:u.equip || 'full', focus:u.focus || [], sets:Object.assign({}, u.sets), setMode:u.setMode || 'smart', replace:true, week:normWeek(u.week)}};
  OB.calDay = 0;
  let el = $('#ob');
  if (!el) { el = document.createElement('div'); el.id = 'ob'; document.body.appendChild(el); }
  drawOB();
}
const OB_STEPS = ['welcome','goals','body','nutrition','experience','training','calendar','style','focus','split','pick','done'];
const obSkip = i => OB_STEPS[i] === 'calendar' && OB.d.split !== 'custom';
function obNext(){ do { OB.step = Math.min(OB.step + 1, OB_STEPS.length - 1); } while (obSkip(OB.step)); if (OB_STEPS[OB.step] === 'pick') OB.pickIdx = 0; drawOB(); }
function obBack(){
  if (OB_STEPS[OB.step] === 'pick' && OB.pickIdx > 0) { OB.pickIdx--; drawOB(); return true; }
  if (OB.step === 0) { if (OB.fromSettings) closeOB(); return true; }
  do { OB.step--; } while (OB.step > 0 && obSkip(OB.step)); if (OB_STEPS[OB.step] === 'pick') OB.pickIdx = Math.max(0, pickList().length - 1); drawOB(); return true;
}
function closeOB(){ const el = $('#ob'); if (el) el.remove(); OB = null; if (S.user) { S.user.skipVer = PLAN_VERSION; save(); } render(); }
function pickList(){
  const plan = buildPlan(OB.d), keys = planKeys(plan), out = [];
  plan.forEach((day, di) => day.slots.forEach((x, si) => {
    const id = keys[di][si], label = (day.weekday != null ? WEEKDAYS[day.weekday] + ' ' : '') + day.name, have = out.find(o => o.id === id);
    if (have) { have.days.push(di); have.where.push(label); } else out.push({di, si, day, x, id, days:[di], where:[label]});
  }));
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
    h += `<div class="ob-hero">💪</div><h1>Let's build your plan</h1><p class="muted">No junk volume. Fewer sets, taken to failure, on movements that actually hit the muscle, and you beat the logbook every week. A few questions and it's built around you.</p>
      <label class="f">What should we call you? (optional)</label><input class="text-in" data-in="name" value="${esc(d.name)}" placeholder="Your name">${A ? '' : '<button class="ghost wide" data-ob="login">I already have an account</button>'}`;
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
      [['beginner','Under a year','8–12 reps while you learn the moves and how failure feels'],['intermediate','1–3 years','6–10 reps: add reps, then weight'],['advanced','3+ years','6–10 reps, you know where your failure is']].map(([v, l, s]) => choice('exp', v, l, s)).join('');
  } else if (step === 'training') {
    const opts = SPLITS[d.days].concat([{id:'custom', name:'🗓️ Custom split', why:'Build your own week on a 7-day calendar. Tips warn you about overlap and recovery as you go.'}]);
    if (!opts.some(s => s.id === d.split)) d.split = opts[0].id;
    h += `<h1>How many days a week can you train?</h1><div class="grid5">${[2,3,4,5,6].map(n => `<button class="ob-num ${d.days === n ? 'on' : ''}" data-k="days" data-v="${n}">${n}</button>`).join('')}</div>
      <label class="f">Pick your split</label>` + opts.map((s, i) => choice('split', s.id, (i === 0 ? '★ ' : '') + s.name, s.why)).join('') +
      (d.split === 'custom' ? `<div class="muted small" style="margin:-4px 0 8px">You'll lay out your days on a calendar next.</div>` : '') +
      `<label class="f">How long per session?</label><div class="seg">${[45,60,75,90].map(n => `<button data-k="session" data-v="${n}" class="${+d.session === n ? 'on' : ''}">${n} min</button>`).join('')}</div>
      <label class="f">Where do you train?</label>` +
      [['full','Full gym','Machines, cables, free weights'],['basic','Basic gym','Barbells, dumbbells, benches'],['home','Home','Dumbbells and bodyweight']].map(([v, l, s]) => choice('equip', v, l, s)).join('');
  } else if (step === 'calendar') {
    const W = d.week, cd = OB.calDay, ms = W[cd], tips = analyzeWeek(W);
    h += `<h1>Build your week</h1><p class="muted">Tap a day, then pick a quick template or the exact muscles.</p><div class="cal">` +
      W.map((m, i) => `<button class="cal-day ${i === cd ? 'on' : ''} ${m.length ? '' : 'rest'}" data-cal="${i}"><b>${WEEKDAYS[i]}</b><span>${esc(dayShort(m))}</span></button>`).join('') +
      `</div><div class="card" style="margin-top:10px"><b>${WEEKDAY_FULL[cd]}: ${esc(dayName(ms))}</b>
        <div class="pills" style="margin:8px 0">${[['Rest', []]].concat(DAY_TEMPLATES).map(([n, l]) => `<button class="pill ${dayName(ms) === n ? 'on' : ''}" data-tpl="${esc(n)}">${esc(n)}</button>`).join('')}</div>
        <div class="row" style="align-items:flex-start;gap:8px"><div class="grow">${CM_GROUPS.map(([r, list]) => `<div class="muted tiny bold" style="margin:8px 0 2px;text-transform:uppercase;letter-spacing:.5px">${r}</div><div class="chips" style="margin-top:0">${list.map(([k, l]) => `<button class="chip mchip ${ms.includes(k) ? 'hot' : ''}" data-mus="${k}">${ms.includes(k) ? '✓ ' : '+ '}${l}</button>`).join('')}</div>`).join('')}</div>
        ${miniBody([].concat(...ms.map(m => MUSCLE_KEYS[m] || [])), 170, [].concat(...(W[(cd + 6) % 7] || []).map(m => MUSCLE_KEYS[m] || [])))}</div>
        ${(W[(cd + 6) % 7] || []).length ? `<div class="muted tiny" style="margin-top:6px">Bright = ${WEEKDAYS[cd]}. Faded = ${WEEKDAYS[(cd + 6) % 7]} (yesterday), so you can spot overlap.</div>` : ''}</div>
      <div class="sec">Coach's notes</div>` +
      tips.map(t => `<div class="coach ${t.t === 'good' ? 'up' : ''} ${t.t === 'warn' ? 'warn' : ''}">${t.t === 'warn' ? '⚠️' : t.t === 'good' ? '✅' : '💡'} ${esc(t.msg)}</div>`).join('');
    canNext = W.some(m => m.length);
    d.days = Math.max(1, W.filter(m => m.length).length);
  } else if (step === 'style') {
    h += `<h1>How hard do you want each set?</h1><p class="muted">Every working set should be close to failure. Warm-ups don't count.</p>` +
      Object.entries(STYLES).map(([k, s]) => choice('style', k, s.name, s.sub)).join('') +
      (d.exp === 'beginner' ? '' : `<label class="f">Rep ranges</label><div class="seg">${[['heavy','Heavy 6–10'],['moderate','Moderate 8–12']].map(([v, l]) => `<button data-k="reps" data-v="${v}" class="${d.reps === v ? 'on' : ''}">${l}</button>`).join('')}</div>`);
  } else if (step === 'focus') {
    h += `<h1>Any muscles to bring up?</h1><p class="muted">Optional, up to 2. They go first in the session, when you're freshest, and always keep both sets.</p>` +
      FOCUS.map(([v, l]) => choice('focus', v, l, '', true)).join('');
    canNext = d.focus.length <= 2;
    if (!canNext) h += `<div class="small" style="color:var(--danger)">Pick at most 2</div>`;
    next = d.focus.length ? 'Next' : 'Skip';
  } else if (step === 'split') {
    const plan = buildPlan(d), ws = weeklySets(plan, d), sp = splitOf(d);
    h += `<h1>${esc(sp.name)}</h1><p class="muted">${sp.custom ? 'Your week, as you laid it out.' : sp.why + ' ' + SCHEDULE[d.days] + (plan.length < d.days ? ', repeating the rotation' : '') + '.'}</p>` +
      plan.map((day, i) => `<div class="card"><div class="item"><b>${day.weekday != null ? WEEKDAYS[day.weekday] + ' · ' : ''}${esc(day.name)}</b><span class="muted small">~${day.minutes} min</span></div><div class="row" style="align-items:flex-start;gap:8px"><div class="chips grow">${day.slots.map(x => `<span class="chip ${x.focus ? 'hot' : ''}">${esc(SLOTS[x.slot].label)} · ${x.sets}×${x.reps}</span>`).join('')}</div>${miniBody([].concat(...day.slots.map(x => SLOT_KEYS[x.slot] || [])), 96)}</div></div>`).join('') +
      `<div class="sec">Hard sets per muscle per week</div><div class="chips">${Object.entries(ws).map(([m, n]) => `<span class="chip">${MUSCLE_NAMES[m] || {adductors:'Adductors', tibialis:'Tibialis', neck:'Neck'}[m] || m} ${n}</span>`).join('')}</div>
      <p class="muted small">Low volume on purpose: capped at 10 hard sets per muscle a week, and every set goes to failure. Next you pick a movement for each slot. Not sure? ★ is the pick.</p>
      <button class="ghost wide" data-ob="auto">Pick everything for me</button><button class="ghost wide" data-ob="empty0">Skip, I'll add exercises as I train</button>`;
    next = 'Pick my movements';
  } else if (step === 'pick') {
    const list = pickList(), it = list[OB.pickIdx];
    const resolved = resolvePicks(buildPlan(d), OB.picks, d.equip), nameOf = o => resolved[o.di + ':' + o.si];
    // movements already in a day this one is used on (yours or the defaults) aren't offered again
    const sameDay = list.filter(o => o.id !== it.id && o.days.some(x => it.days.includes(x))).map(nameOf).filter(Boolean);
    const cur = nameOf(it), opts = slotOptions(it.x.slot, d.equip, sameDay.filter(n => n !== cur));
    const slot = SLOTS[it.x.slot];
    const nth = +it.id.split('#')[1];
    h += `<div class="muted small">${OB.pickIdx + 1} of ${list.length} · ${esc(it.where.join(', '))}</div>
      <div class="row" style="align-items:center;gap:10px"><h1 class="grow">${esc(slot.label)}${nth ? ' (' + (nth === 1 ? '2nd' : '3rd') + ')' : ''}</h1>${miniBody(SLOT_KEYS[it.x.slot], 110)}</div>
      <p class="muted">${it.x.sets} × ${it.x.reps} reps, ${it.x.effort}. Pick whatever hits it best for you.${slot.m === 'chest' ? ' Presses and flies both work: fly-only chest is fine if presses beat up your shoulders or triceps.' : ''}</p>
      <label class="f">How many sets?</label>${setPills(it.id, d, it.x.auto)}${it.x.by && d.setMode !== 'two' ? `<div class="muted small" style="margin:4px 0">Auto is 1 less because ${esc(it.x.by)} already hits it.</div>` : ''}<details style="margin:8px 0"><summary class="ghost" style="min-height:44px;display:flex;align-items:center">All movements: ${d.setMode === 'two' ? '2 for everything' : 'Smart'}</summary>${modePills(d)}</details>
      ${it.days.length > 1 ? `<div class="coach up">Pick once: used on all ${it.days.length} days.</div>` : ''}${sameDay.length ? `<div class="muted small" style="margin:-2px 0 10px">Already picked: ${[...new Set(sameDay)].map(esc).join(', ')}</div>` : ''}` +
      opts.map((o, i) => `<button class="ob-opt ${cur === o[0] ? 'on' : ''}" data-pick="${esc(o[0])}"><b>${i === 0 ? '★ ' : ''}${esc(o[0])}</b><span>${i === 0 ? 'Recommended' + (o[2] ? ' · ' + esc(o[2]) : '') : esc(o[2] || '')}</span></button>`).join('') +
      `<button class="ob-opt ${cur === '' ? 'on' : ''}" data-pick=""><b>Leave empty</b><span>Choose it during a workout instead</span></button>
      <button class="secondary wide" data-ob="own">＋ Add my own exercise</button><button class="ghost wide" data-ob="empty">Leave the rest empty, I'll add as I go</button><button class="ghost wide" data-ob="auto">Use my picks and ★ for the rest</button>`;
    next = OB.pickIdx < list.length - 1 ? 'Next' : 'Review';
  } else if (step === 'done') {
    const plan = buildPlan(d);
    const sug = suggestTargets({sex:d.sex, age:d.age, height:d.height, weight:d.weight, activity:d.activity, goal:d.nGoal});
    h += `<h1>${d.name ? esc(d.name) + ', your' : 'Your'} plan is ready</h1>
      <div class="card"><b>The rules</b><div class="small" style="margin-top:6px;line-height:1.6">
        • 2 hard sets per movement, 1 when another movement that day already hits it. Front and side delts recover fast, so they always get at least 2.<br>• Warm up with 1–2 quick ramp-up sets on your first lift. Save your energy for the working sets.<br>• Every working set: ${STYLES[d.style].effort}.<br>• Rest fully: about 3 minutes on big lifts, 2 on the rest. Longer rest means you need fewer sets.<br>
        • Hit the top of the rep range on every set → add the smallest weight jump next time.<br>• Same weight for a few weeks is normal. Beat the logbook by a rep.<br>
        • Set every machine to your leverages: seat and pads so the target muscle hits a full stretch.<br>• Short on time? Finish the last set with myo-reps or a mechanical drop set instead of adding sets.<br>• Full control on the way down, same end point every rep. No ego.</div></div>
      <div class="card"><b>Daily food targets</b><div class="macro4"><div><b>${fmtNum(sug.kcal)}</b><span>kcal</span></div><div><b style="color:var(--p)">${sug.protein}</b><span>protein</span></div><div><b style="color:var(--c)">${sug.carbs}</b><span>carbs</span></div><div><b style="color:var(--f)">${sug.fat}</b><span>fat</span></div></div>
      <div class="muted small">Weigh in a few times a week. After 4 weeks the Body tab tells you if calories need moving.</div></div>` +
      plan.map((day, di) => `<div class="card"><b>${day.weekday != null ? WEEKDAY_FULL[day.weekday] + ': ' : ''}${esc(day.name)}</b>${day.slots.map((x, si) => {
        const name = resolvePicks(plan, OB.picks, d.equip)[di + ':' + si];
        return `<div class="item small" style="padding:4px 0"><span>${name ? esc(name) : `<span class="muted">${esc(SLOTS[x.slot].label)}: choose later</span>`}</span><span class="muted">${x.sets} × ${x.reps}</span></div>`; }).join('')}</div>`).join('') +
      (S.routines.length ? `<label class="row" style="margin:12px 0;gap:12px"><button class="tick ${d.replace ? 'on' : ''}" data-k="replace" data-v="${d.replace ? '' : '1'}">${d.replace ? '✓' : ''}</button><span>Replace my current routines (past workouts are kept)</span></label>` : '');
    next = 'Start my plan';
  }
  h += `</div><div class="ob-foot"><button class="primary wide" data-ob="next" ${canNext ? '' : 'disabled style="opacity:.4"'}>${next}</button></div>`;
  el.innerHTML = h;
  bindSets(el, d, () => drawOB());
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
    drawOB();
  });
  el.querySelectorAll('[data-cal]').forEach(b => b.onclick = () => { OB.calDay = +b.dataset.cal; drawOB(); });
  el.querySelectorAll('[data-tpl]').forEach(b => b.onclick = () => {
    const t = [['Rest', []]].concat(DAY_TEMPLATES).find(([n]) => n === b.dataset.tpl);
    d.week[OB.calDay] = t[1].slice(); drawOB();
  });
  el.querySelectorAll('[data-mus]').forEach(b => b.onclick = () => {
    const m = b.dataset.mus, w = d.week[OB.calDay];
    d.week[OB.calDay] = w.includes(m) ? w.filter(x => x !== m) : w.concat(m); drawOB();
  });
  el.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { const it = pickList()[OB.pickIdx]; OB.picks[it.id] = b.dataset.pick; drawOB(); });
  el.querySelectorAll('[data-ob]').forEach(b => b.onclick = () => {
    const a = b.dataset.ob;
    if (a === 'back') obBack();
    else if (a === 'close') closeOB();
    else if (a === 'own') {
      const it = pickList()[OB.pickIdx], pool = SLOTS[it.x.slot].pool;
      editExercise(null, {pool, onDone:e => { if (!OB) return; if (e.pools.includes(pool)) OB.picks[it.id] = e.name; drawOB(); }});
    }
    else if (a === 'login') openLogin(false);
    else if (a === 'empty' || a === 'empty0') {
      pickList().forEach((it, i) => { if (a === 'empty0' || i >= OB.pickIdx) OB.picks[it.id] = ''; });
      OB.step = OB_STEPS.indexOf('done'); drawOB(); el.scrollTop = 0;
    }
    else if (a === 'auto') { Object.keys(OB.picks).forEach(k => { if (OB.picks[k] === '') delete OB.picks[k]; }); OB.step = OB_STEPS.indexOf('done'); drawOB(); el.scrollTop = 0; }
    else if (a === 'next') {
      if (step === 'pick') {
        const list = pickList(), it = list[OB.pickIdx];
        OB.picks[it.id] = resolvePicks(buildPlan(d), OB.picks, d.equip)[it.di + ':' + it.si];
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
  S.user = {name:d.name.trim(), goals:d.goals, exp:d.exp, days:d.days, split:sp.id, week:d.week, style:d.style, reps:d.reps, session:d.session, equip:d.equip, focus:d.focus, picks:OB.picks, sets:d.sets, setMode:d.setMode, setsV:1,
    hUnit:d.hUnit, wUnit:d.wUnit, onboarded:true, planVer:PLAN_VERSION, at:Date.now()};
  S.food.profile = {sex:d.sex, age:d.age, height:Math.round(d.height), weight:r1(d.weight), activity:d.activity, goal:d.nGoal};
  S.food.targets = suggestTargets(S.food.profile);
  if (!S.body.weights.length || Math.abs(S.body.weights[S.body.weights.length - 1].kg - d.weight) > 0.05) {
    S.body.weights = S.body.weights.filter(w => w.d !== today()).concat({d:today(), kg:r1(d.weight)}).sort((a, b) => a.d.localeCompare(b.d));
  }
  const names = resolvePicks(plan, OB.picks, d.equip);
  const keys = planKeys(plan);
  const routines = plan.map((day, di) => {
    const all = day.slots.map((x, si) => ({name:names[di + ':' + si], k:keys[di][si], slot:x.slot, sets:x.sets, reps:x.reps, rest:x.rest, effort:x.effort, pos:si}));
    return {id:uid(), name:day.name, items:all.filter(x => x.name).map(({name, k, ...x}) => ({exId:exIdByName(name), ...x})), open:all.filter(x => !x.name).map(({name, ...x}) => x)};
  });
  const oldProgram = S.program ? S.program.ids : [];
  S.routines = d.replace ? routines : routines.concat(S.routines.filter(r => !oldProgram.includes(r.id)));
  S.program = {split:sp.name, ids:routines.map(r => r.id), created:Date.now()};
  if (sp.custom) { S.program.schedule = [null, null, null, null, null, null, null]; plan.forEach((day, i) => { S.program.schedule[day.weekday] = routines[i].id; }); }
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
  // custom split: follow the calendar
  if (S.program && S.program.schedule) {
    const sch = S.program.schedule, wd = (new Date().getDay() + 6) % 7;
    const doneToday = workoutsOn(today()).length > 0;
    const find = id => S.routines.find(r => r.id === id);
    if (sch[wd] && find(sch[wd]) && !doneToday) return {r:find(sch[wd]), known:true, today:true};
    for (let k = 1; k <= 7; k++) { const w2 = (wd + k) % 7; if (sch[w2] && find(sch[w2])) return {r:find(sch[w2]), known:true, rest:!sch[wd], doneToday, on:WEEKDAYS[w2]}; }
    return null;
  }
  const ids = S.program ? S.program.ids.filter(id => S.routines.some(r => r.id === id)) : [];
  const pool = ids.length ? ids.map(id => S.routines.find(r => r.id === id)) : S.routines;
  if (!pool.length) return null;
  const lastName = S.workouts.length ? S.workouts[S.workouts.length - 1].name : '';
  const idx = pool.findIndex(r => r.name === lastName);
  return {r:pool[(idx + 1) % pool.length], known:idx >= 0};
}
ACTIONS['onboard'] = () => startOnboarding(true);
