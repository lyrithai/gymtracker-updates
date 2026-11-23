'use strict';
/* ================= today + life: to-do, habits, body ================= */

/* ---------- to-do helpers ---------- */
function todoDue(t){ return t.due || ''; }
function completeTodo(t){
  if (t.repeat && t.repeat !== 'none' && !t.done) {
    const base = t.due && t.due > today() ? t.due : today();
    t.due = dadd(base, t.repeat === 'daily' ? 1 : t.repeat === 'weekly' ? 7 : 30);
    t.lastDone = today();
    toast('Done. Next: ' + dlabel(t.due));
  } else {
    t.done = !t.done; t.doneAt = t.done ? Date.now() : null;
  }
  save(); render();
}
function todoRow(t){
  const overdue = !t.done && t.due && t.due < today();
  return `<div class="todo ${t.done ? 'done' : ''}"><button class="tick ${t.done ? 'on' : ''}" data-act="todo-tick" data-id="${t.id}">${t.done ? '✓' : ''}</button>
    <button class="tt tap" style="background:none;color:var(--text);padding:0" data-act="todo-edit" data-id="${t.id}"><div>${esc(t.text)}</div>
    <div class="small ${overdue ? '' : 'muted'}" style="${overdue ? 'color:var(--danger)' : ''}">${t.due ? (overdue ? 'Overdue · ' : '') + dlabel(t.due) : 'Anytime'}${t.repeat && t.repeat !== 'none' ? ' · repeats ' + t.repeat : ''}</div></button></div>`;
}
function editTodo(t){
  const isNew = !t;
  t = t || {id:uid(), text:'', due:today(), repeat:'none', done:false};
  ask(isNew ? 'New to-do' : 'Edit to-do', [
    {k:'text', label:'What needs doing?', v:t.text, ph:'e.g. Buy chicken for meal prep'},
    {k:'due', label:'When (leave empty for anytime)', v:t.due, type:'date'},
    {k:'repeat', label:'Repeat', v:t.repeat || 'none', type:'select', opts:[['none','Doesn\'t repeat'],['daily','Every day'],['weekly','Every week'],['monthly','Every month']]}
  ], o => {
    if (!o.text.trim()) { toast('Type the to-do'); return false; }
    Object.assign(t, {text:o.text.trim(), due:o.due || '', repeat:o.repeat});
    if (isNew) S.todos.push(t);
    save(); render();
  }, isNew ? 'Add to-do' : 'Save');
}

/* ---------- habits ---------- */
function habitStreak(h){
  let n = 0, d = today();
  if (!h.days[d]) d = dadd(d, -1);   // today not done yet doesn't break the streak
  while (h.days[d]) { n++; d = dadd(d, -1); }
  return n;
}
function editHabit(h){
  const isNew = !h;
  h = h || {id:uid(), name:'', icon:'✅', days:{}};
  ask(isNew ? 'New habit' : 'Edit habit', [
    {k:'name', label:'Habit', v:h.name, ph:'e.g. 10k steps, creatine, read 20 min'},
    {k:'icon', label:'Emoji', v:h.icon, ph:'✅'}
  ], o => {
    if (!o.name.trim()) { toast('Name the habit'); return false; }
    Object.assign(h, {name:o.name.trim(), icon:(o.icon || '✅').trim().slice(0, 4)});
    if (isNew) S.habits.push(h);
    save(); render();
  }, isNew ? 'Add habit' : 'Save');
}

/* ---------- today ---------- */
VIEWS.today = {
  title: () => {
    const h = new Date().getHours();
    return (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening') + (S.user && S.user.name ? ', ' + S.user.name : '');
  },
  render(){
    const dk = today(), T = S.food.targets, {t} = dayTotals(dk);
    const left = T.kcal - t[0];
    let h = `<div class="muted small" style="margin:-6px 0 12px">${new Date().toLocaleDateString(undefined, {weekday:'long', day:'numeric', month:'long'})}</div>
      <button class="card tap sum" data-act="go" data-tab="food" data-sub="diary" style="color:var(--text)">${ring(t[0], T.kcal, fmtNum(t[0]), left >= 0 ? fmtNum(left) + ' left' : fmtNum(-left) + ' over')}
      <div class="bars">${bar('Protein', t[1], T.protein, 'var(--p)')}${bar('Carbs', t[2], T.carbs, 'var(--c)')}${bar('Fat', t[3], T.fat, 'var(--f)')}</div></button>
      <div class="quick" style="margin-bottom:12px"><button class="primary" data-act="food-add" data-meal="">＋ Food</button><button class="secondary" data-act="scan">▦ Scan</button></div>`;
    // gym
    const done = workoutsOn(dk);
    h += `<div class="card"><div class="item"><b>🏋️ Gym</b>`;
    if (S.active) h += `<button class="primary" style="min-height:40px" data-act="go" data-tab="gym" data-sub="workout">Continue workout</button></div><div class="muted small">${esc(S.active.name)} · started ${fmtDur(Date.now() - S.active.start)} ago</div>`;
    else if (done.length) h += `<span class="chip hot">Done ✓</span></div><div class="muted small">${done.map(w => esc(w.name) + ' · ' + pl(setCount(w), 'set')).join('<br>')}</div>`;
    else {
      h += `<button class="ghost" data-act="go" data-tab="gym" data-sub="workout">Open</button></div>`;
      const nx = nextProgramRoutine();
      if (nx) h += `<button class="secondary wide" data-act="start-routine" data-id="${nx.r.id}">Start ${esc(nx.r.name)}${nx.known || S.program ? ' (next up)' : ''}</button>`;
    }
    h += `</div>`;
    // water
    const water = S.body.water[dk] || 0, wg = S.body.waterGoal;
    h += `<div class="card"><div class="item"><b>💧 Water</b><span class="muted small">${(water / 1000).toFixed(2)} / ${(wg / 1000).toFixed(1)} L</span></div>
      <div class="track" style="margin:8px 0 10px"><i style="width:${clamp(water / wg * 100, 0, 100)}%;background:var(--p)"></i></div>
      <div class="quick"><button class="secondary" data-act="water" data-ml="250">+250 ml</button><button class="secondary" data-act="water" data-ml="500">+500 ml</button><button class="secondary" data-act="water" data-ml="-250">−250</button></div></div>`;
    // habits
    h += `<div class="card"><div class="item"><b>🔥 Habits</b><button class="ghost" data-act="go" data-tab="life" data-sub="habits">All</button></div>`;
    if (!S.habits.length) h += `<div class="muted small">No habits yet. <button class="ghost" style="padding:0;min-height:0" data-act="habit-new">Add one</button></div>`;
    S.habits.forEach(x => {
      const on_ = !!x.days[dk];
      h += `<div class="todo"><button class="tick ${on_ ? 'on' : ''}" data-act="habit-tick" data-id="${x.id}" data-d="${dk}">${on_ ? '✓' : ''}</button><span class="tt">${esc(x.icon)} ${esc(x.name)}</span><span class="muted small">🔥 ${habitStreak(x)}</span></div>`;
    });
    h += `</div>`;
    // to-dos
    const due = S.todos.filter(x => !x.done && x.due && x.due <= dk).sort((a, b) => todoDue(a).localeCompare(todoDue(b)));
    h += `<div class="card"><div class="item"><b>📝 To-do today</b><button class="ghost" data-act="todo-new">＋ Add</button></div>`;
    if (!due.length) h += `<div class="muted small">Nothing due. Nice.</div>`;
    due.forEach(x => h += todoRow(x));
    h += `</div>`;
    // weight
    const lw = S.body.weights[S.body.weights.length - 1];
    h += `<div class="card"><div class="item"><b>⚖️ Weight</b><button class="ghost" data-act="weight-log">Log</button></div>
      <div class="muted small">${lw ? r1(lw.kg) + ' kg · ' + dlabel(lw.d) : 'Not logged yet'}</div></div>`;
    return h;
  }
};

/* ---------- to-do view ---------- */
VIEWS['life/todo'] = {render(){
  const dk = today();
  const open = S.todos.filter(t => !t.done);
  const groups = [
    ['Overdue', open.filter(t => t.due && t.due < dk)],
    ['Today', open.filter(t => t.due === dk)],
    ['Upcoming', open.filter(t => t.due && t.due > dk)],
    ['Anytime', open.filter(t => !t.due)],
  ];
  let h = `<div class="row" style="margin-bottom:6px"><input class="text-in grow" id="tquick" placeholder="Add a to-do for today…"><button class="primary" data-act="todo-quick" style="min-width:60px">Add</button></div>
    <button class="ghost" data-act="todo-new">More options (date, repeat)</button>`;
  groups.forEach(([label, list]) => {
    if (!list.length) return;
    h += `<div class="sec">${label}</div>` + list.sort((a, b) => todoDue(a).localeCompare(todoDue(b))).map(todoRow).join('');
  });
  const doneList = S.todos.filter(t => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
  if (doneList.length) h += `<div class="sec">Done</div>` + doneList.slice(0, 10).map(todoRow).join('') + `<button class="ghost wide" data-act="todo-clear">Clear done items</button>`;
  if (!S.todos.length) h += `<div class="empty">Nothing on your list.</div>`;
  return h;
}};

/* ---------- habits view ---------- */
VIEWS['life/habits'] = {render(){
  const days = Array.from({length:7}, (_, i) => dadd(today(), i - 6));
  let h = `<button class="primary big-start" data-act="habit-new">＋ New habit</button>`;
  if (!S.habits.length) h += `<div class="empty">Track daily habits like steps, creatine, sleep by 11, stretching or reading. Tap a day to tick it.</div>`;
  S.habits.forEach(x => {
    const last30 = Array.from({length:30}, (_, i) => dadd(today(), -i)).filter(d => x.days[d]).length;
    h += `<div class="card"><div class="item"><button class="tap grow" style="background:none;color:var(--text);padding:0" data-act="habit-edit" data-id="${x.id}"><b>${esc(x.icon)} ${esc(x.name)}</b></button>
      <span class="muted small">🔥 ${habitStreak(x)} · ${last30}/30</span></div>
      <div class="habit-days">${days.map(d => `<button class="${x.days[d] ? 'on' : ''}" data-act="habit-tick" data-id="${x.id}" data-d="${d}">${dparse(d).toLocaleDateString(undefined, {weekday:'narrow'})}<br>${dparse(d).getDate()}</button>`).join('')}</div></div>`;
  });
  return h;
}};

/* ---------- weight trend: weekly averages, adjust calories only after 4 weeks ---------- */
function weekAvg(fromAgo, toAgo){
  const a = dadd(today(), -toAgo), b = dadd(today(), -fromAgo);
  const v = S.body.weights.filter(w => w.d >= a && w.d <= b).map(w => w.kg);
  return v.length ? {avg:v.reduce((x, y) => x + y, 0) / v.length, n:v.length} : null;
}
function weightTrendCard(){
  const now = weekAvg(0, 6), prev = weekAvg(7, 13), month = weekAvg(28, 34);
  if (!now) return '';
  const goal = S.food.profile.goal || 'maintain';
  let h = `<div class="card"><div class="item"><b>Weekly average</b><span>${r1(now.avg)} kg</span></div>`;
  if (prev) { const ch = now.avg - prev.avg; h += `<div class="muted small">${ch >= 0 ? '+' : ''}${r1(ch)} kg vs last week (${ch >= 0 ? '+' : ''}${r1(ch / prev.avg * 100)}%). Daily weight jumps around; only the weekly average matters.</div>`; }
  if (!month) {
    h += `<div class="coach" style="margin-top:8px">Weigh in at least 3 times a week, same time of day. After 4 weeks you'll get a calorie call here.</div>`;
  } else {
    const rate = (now.avg - month.avg) / month.avg * 100 / 4;   // % per week over the last ~4 weeks
    const want = {cut:[-1.0, -0.5], maintain:[-0.25, 0.25], bulk:[0.1, 0.4]}[goal];
    let msg, cls = '';
    if (rate < want[0]) msg = goal === 'cut' ? 'Dropping faster than 1% a week: add about 150 kcal a day so you keep the muscle.' : 'Losing weight: add about 150–200 kcal a day.';
    else if (rate > want[1]) msg = goal === 'bulk' ? 'Gaining faster than a lean bulk should: take off about 150 kcal a day.' : 'Weight is creeping up: take off about 150 kcal a day.';
    else { msg = 'Right on track for your goal. Keep calories where they are.'; cls = 'up'; }
    h += `<div class="coach ${cls}" style="margin-top:8px">4-week trend: ${rate >= 0 ? '+' : ''}${r1(rate)}% a week. ${msg}</div>`;
  }
  return h + `</div>`;
}

/* ---------- body view ---------- */
VIEWS['life/body'] = {
  render(){
    const W = S.body.weights;
    let h = `<div class="item" style="margin-bottom:6px"><b>⚖️ Body weight</b><button class="primary" style="min-height:40px" data-act="weight-log">＋ Log weight</button></div>`;
    if (W.length) {
      const last = W[W.length - 1], first = W[0];
      const wkAgo = W.filter(w => w.d <= dadd(today(), -7)).pop();
      h += `<div class="stat-grid"><div class="stat"><div class="v">${r1(last.kg)}</div><div class="l">kg now</div></div>
        <div class="stat"><div class="v">${wkAgo ? (last.kg - wkAgo.kg >= 0 ? '+' : '') + r1(last.kg - wkAgo.kg) : '–'}</div><div class="l">vs a week ago</div></div></div>
        <div class="card"><canvas id="wchart"></canvas></div>
        <div class="muted small" style="margin-bottom:8px">${W.length > 1 ? 'Since ' + dlabel(first.d) + ': ' + (last.kg - first.kg >= 0 ? '+' : '') + r1(last.kg - first.kg) + ' kg' : ''}</div>
        ${weightTrendCard()}`;
    } else h += `<div class="muted small">Log your weight a few times a week, same time of day, to see the trend.</div>`;
    const days = Array.from({length:7}, (_, i) => dadd(today(), -i));
    h += `<div class="sec">💧 Water (goal ${(S.body.waterGoal / 1000).toFixed(1)} L)</div><div class="card">`;
    days.forEach(d => { const v = S.body.water[d] || 0; h += `<div class="bar"><div class="lbl"><span>${dlabel(d)}</span><span class="muted">${(v / 1000).toFixed(2)} L</span></div><div class="track"><i style="width:${clamp(v / S.body.waterGoal * 100, 0, 100)}%;background:var(--p)"></i></div></div>`; });
    h += `<button class="ghost" data-act="water-goal">Change water goal</button></div>`;
    const sl = days.map(d => S.body.sleep[d]).filter(v => v != null);
    h += `<div class="sec">😴 Sleep</div><div class="card"><div class="item"><span>${sl.length ? 'Last 7 days avg: <b>' + r1(sl.reduce((a, b) => a + b, 0) / sl.length) + ' h</b>' : 'No sleep logged yet'}</span>
      <button class="ghost" data-act="sleep-log">＋ Log</button></div>`;
    days.forEach(d => { if (S.body.sleep[d] != null) h += `<div class="item small" style="padding:5px 0;border-top:1px solid var(--line)"><span>${dlabel(d)}</span><span>${r1(S.body.sleep[d])} h</span></div>`; });
    h += `</div>`;
    if (W.length) h += `<div class="sec">Weight log</div>` + W.slice().reverse().slice(0, 20).map(w => `<div class="item small" style="padding:7px 0;border-bottom:1px solid var(--line)"><span>${dlabel(w.d)}</span><span>${r1(w.kg)} kg <button class="icon" style="min-height:30px" data-act="weight-del" data-d="${w.d}">✕</button></span></div>`).join('');
    return h;
  },
  after(){ drawLine($('#wchart'), S.body.weights.map(w => ({t:dparse(w.d).getTime(), v:w.kg}))); }
};

/* ---------- actions ---------- */
Object.assign(ACTIONS, {
  'todo-new': () => editTodo(null),
  'todo-edit': b => {
    const t = S.todos.find(x => x.id === b.dataset.id); if (!t) return;
    openSheet(s => {
      html(s, `<h2>${esc(t.text)}</h2><div class="muted small">${t.due ? dlabel(t.due) : 'Anytime'}${t.repeat && t.repeat !== 'none' ? ' · repeats ' + t.repeat : ''}</div>
        <button class="secondary wide" data-x="edit">Edit</button><button class="secondary wide" data-x="tom">Move to tomorrow</button><button class="danger-link wide" data-x="del">Delete</button>`);
      on(s, '[data-x="edit"]', () => { closeSheet(); editTodo(t); });
      on(s, '[data-x="tom"]', () => { t.due = dadd(today(), 1); save(); closeSheet(); render(); });
      on(s, '[data-x="del"]', () => { S.todos = S.todos.filter(x => x !== t); save(); closeSheet(); render(); });
    });
  },
  'todo-tick': b => { const t = S.todos.find(x => x.id === b.dataset.id); if (t) completeTodo(t); },
  'todo-quick': () => {
    const i = $('#tquick'); const v = i && i.value.trim(); if (!v) return toast('Type a to-do');
    S.todos.push({id:uid(), text:v, due:today(), repeat:'none', done:false}); save(); render(); setTimeout(() => { const n = $('#tquick'); n && n.focus(); }, 50);
  },
  'todo-clear': () => { S.todos = S.todos.filter(t => !t.done); save(); render(); },
  'habit-new': () => editHabit(null),
  'habit-edit': b => {
    const x = S.habits.find(y => y.id === b.dataset.id); if (!x) return;
    openSheet(s => {
      html(s, `<h2>${esc(x.icon)} ${esc(x.name)}</h2><div class="muted small">Current streak ${habitStreak(x)} days · done ${Object.keys(x.days).length} days in total</div>
        <button class="secondary wide" data-x="edit">Rename</button><button class="danger-link wide" data-x="del">Delete habit</button>`);
      on(s, '[data-x="edit"]', () => { closeSheet(); editHabit(x); });
      on(s, '[data-x="del"]', () => { if (!confirm('Delete this habit and its history?')) return; S.habits = S.habits.filter(y => y !== x); save(); closeSheet(); render(); });
    });
  },
  'habit-tick': b => {
    const x = S.habits.find(y => y.id === b.dataset.id); if (!x) return;
    const d = b.dataset.d; if (x.days[d]) delete x.days[d]; else x.days[d] = 1;
    save(); render();
  },
  water: b => { const d = today(); S.body.water[d] = Math.max(0, (S.body.water[d] || 0) + +b.dataset.ml); save(); render(); },
  'water-goal': () => ask('Daily water goal', [{k:'l', label:'Litres', v:S.body.waterGoal / 1000, type:'number'}], o => { if (!(o.l > 0)) return false; S.body.waterGoal = Math.round(o.l * 1000); save(); render(); }),
  'weight-log': () => {
    const last = S.body.weights[S.body.weights.length - 1];
    ask('Log weight', [{k:'kg', label:'Weight (kg)', v:last ? r1(last.kg) : '', type:'number'}, {k:'d', label:'Date', v:today(), type:'date'}], o => {
      if (!(o.kg > 20 && o.kg < 400)) { toast('Enter your weight in kg'); return false; }
      const d = o.d || today();
      S.body.weights = S.body.weights.filter(w => w.d !== d).concat({d, kg:o.kg}).sort((a, b) => a.d.localeCompare(b.d));
      S.food.profile.weight = S.body.weights[S.body.weights.length - 1].kg;
      save(); render(); toast('Weight logged');
    });
  },
  'weight-del': b => { if (!confirm('Delete this weight entry?')) return; S.body.weights = S.body.weights.filter(w => w.d !== b.dataset.d); save(); render(); },
  'sleep-log': () => ask('Log sleep', [{k:'h', label:'Hours slept', v:'', type:'number', ph:'e.g. 7.5'}, {k:'d', label:'Night of (the date you woke up)', v:today(), type:'date'}], o => {
    if (!(o.h > 0 && o.h < 24)) { toast('Enter hours slept'); return false; }
    S.body.sleep[o.d || today()] = o.h; save(); render();
  })
});
