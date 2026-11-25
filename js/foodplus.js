'use strict';
/* ================= food extras: real maintenance, weekly budget, day plans, kitchen, saved meals, eating out, meal deals,
   protein per £, typed logging, caffeine cutoff, supplements, compare ================= */

/* ---------- weight trend (used by a few things) ---------- */
function linFit(pts){   // [[x, y]] -> slope
  const n = pts.length, mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n;
  const den = pts.reduce((a, p) => a + (p[0] - mx) ** 2, 0); return den ? pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0) / den : 0;
}
const dayNum = k => Math.round(dparse(k).getTime() / 864e5);

/* ---------- 16: your real maintenance ---------- */
/** Last 28 finished days: what you ate against what your weight did. Needs enough of both to mean anything. */
function realMaintenance(){
  const t = today(), from = dadd(t, -28), ws = S.body.weights.filter(w => w.d > from && w.d <= t);
  const rows = []; for (let i = 1; i <= 28; i++) { const d = dadd(t, -i), k = dayTotals(d).t[0]; if (k >= Math.max(700, S.food.targets.kcal * .4)) rows.push([d, k]); }
  const span = ws.length > 1 ? dayNum(ws[ws.length - 1].d) - dayNum(ws[0].d) : 0, need = [];
  if (rows.length < 12) need.push(pl(12 - rows.length, 'more fully logged day'));
  if (ws.length < 6) need.push(pl(6 - ws.length, 'more weigh-in'));
  else if (span < 13) need.push(pl(13 - span, 'more day') + ' between your first and last weigh-in');
  if (need.length) return {need};
  const inSpan = rows.filter(r => r[0] >= ws[0].d), use = inSpan.length >= 10 ? inSpan : rows;
  const slope = linFit(ws.map(w => [dayNum(w.d), w.kg])), eat = use.reduce((a, r) => a + r[1], 0) / use.length;
  const kcal = Math.round((eat - slope * 7700) / 10) * 10, guess = bmrOf(S.food.profile) * S.food.profile.activity;
  return {kcal, eat, perWeek:slope * 7, days:use.length, odd:kcal < guess * .7 || kcal > guess * 1.4};
}
function adaptCard(){
  const m = realMaintenance();
  if (m.need) return `<div class="card"><b>Your real maintenance</b><div class="muted small">Works out what you actually burn from your food log and weight. Still needs ${m.need.join(' and ')} in the last 4 weeks.</div></div>`;
  const p = S.food.profile, sug = suggestTargets(Object.assign({}, p, {activity:clamp(m.kcal / bmrOf(p), 1, 2.6)}));
  return `<div class="card"><div class="item"><b>Your real maintenance</b><b style="color:var(--accent)">~${fmtNum(m.kcal)} kcal</b></div>
    <div class="muted small">You averaged ${fmtNum(m.eat)} kcal over ${m.days} logged days while your weight moved ${m.perWeek >= 0 ? '+' : ''}${r1(m.perWeek)} kg a week.${m.odd ? ' That\'s far from the usual estimate, so check for food you didn\'t log before trusting it.' : ''}</div>
    ${Math.abs(sug.kcal - S.food.targets.kcal) > 60 && !m.odd ? `<button class="secondary wide" data-act="adapt-use">Use ${fmtNum(sug.kcal)} kcal for your goal</button>` : ''}</div>`;
}
ACTIONS['adapt-use'] = () => {
  const m = realMaintenance(), p = S.food.profile; if (m.need) return;
  const act = clamp(m.kcal / bmrOf(p), 1, 2.6), sug = suggestTargets(Object.assign({}, p, {activity:act}));
  if (!confirm('Change your target from ' + fmtNum(S.food.targets.kcal) + ' to ' + fmtNum(sug.kcal) + ' kcal?')) return;
  S.food.targets = sug; S.food.macroV = 1; save(); render(); toast('Targets updated');
};

/* ---------- 17: weekly budget ---------- */
/** Mon-Sun. Only counts days from when you turned it on, so old unlogged days don't look like savings. */
function weekBudget(){
  const T = S.food.targets.kcal, a = weekStart(), t = today(), on_ = S.food.flexFrom && S.food.flexFrom > a ? S.food.flexFrom : a;
  let past = 0, n = 0, unlogged = 0;
  for (let d = a; d < t; d = dadd(d, 1)) { const k = dayTotals(d).t[0]; if (d < on_ || k < 500) { past += T; if (d >= on_) unlogged++; } else past += k; n++; }
  const total = T * 7, left = 7 - n;
  return {total, past, days:left, today:(total - past) / left, unlogged};
}
/** What to aim for on a day: your target, or your share of what's left this week (never below 85% or above 120% of it, nor under the floor). */
function targetsOn(dk){
  const T = S.food.targets; if (!S.food.flex || dk !== today()) return T;
  const b = weekBudget(), k = Math.round(clamp(b.today, Math.max(minKcal(S.food.profile), T.kcal * .85), T.kcal * 1.2) / 10) * 10;
  return Math.abs(k - T.kcal) < 20 ? T : balanceScale(T, k);
}
/** Protein stays put; carbs and fat take the change in their own ratio. */
function balanceScale(T, k){
  const rest = Math.max(1, T.carbs * 4 + T.fat * 9), f = Math.max(0, (k - T.protein * 4) / rest), fat = Math.round(T.fat * f);
  return {kcal:k, protein:T.protein, fat, carbs:Math.max(0, Math.round((k - T.protein * 4 - fat * 9) / 4))};
}
ACTIONS.budget = () => openSheet((s, sh) => {
  const b = weekBudget(), T = S.food.targets.kcal, used = b.past + dayTotals(today()).t[0], tt = targetsOn(today());
  html(s, `<h2>Weekly budget</h2><div class="stat-grid"><div class="stat"><div class="v">${fmtNum(b.total - used)}</div><div class="l">kcal left this week</div></div><div class="stat"><div class="v">${fmtNum(b.today)}</div><div class="l">a day for ${pl(b.days, 'day')}</div></div></div>
    <div class="track"><i style="width:${clamp(used / b.total * 100, 0, 100)}%;background:${used > b.total ? 'var(--danger)' : 'var(--accent)'}"></i></div>
    <button class="${S.food.flex ? 'secondary' : 'primary'} wide" data-x>${S.food.flex ? 'Turn off: same target every day' : 'Turn on: spread the week'}</button>
    <div class="muted small" style="margin-top:8px;line-height:1.6">With it on, a big Saturday comes out of the other days and a light day adds to them. Protein never changes, and a day never goes below 85% or above 120% of your normal ${fmtNum(T)}, so one blowout doesn't turn into starving.${S.food.flex ? ' Today: <b>' + fmtNum(tt.kcal) + '</b>.' : ''}${b.unlogged ? '<br>' + pl(b.unlogged, 'day') + ' this week had little or no food logged, so ' + (b.unlogged === 1 ? 'it counts' : 'they count') + ' as on target.' : ''}</div>`);
  on(s, '[data-x]', () => { S.food.flex = !S.food.flex; S.food.flexFrom = S.food.flex ? today() : ''; save(); sh.refresh(); render(); });
});

/* ---------- 19: whole-day plan ---------- */
let dayPlan = null;
function planPool(){
  const rec = allRecipes().map(r => { const f = recipeAsFood(r); return {f, g:f.serving, tags:r.tags || [], rid:r.id}; }).filter(x => x.g > 0 && kcalOf(x.f, x.g) > 120);
  const sn = window.SNACKS.map(s => ({f:snackFood(s), g:s.g, tags:['snack']}));
  return {breakfast:rec.filter(x => x.tags.includes('breakfast')), main:rec.filter(x => !x.tags.includes('breakfast') && !x.tags.includes('dessert')), snack:sn};
}
const pick1 = a => a[Math.floor(Math.random() * a.length)];
function planTotals(p){ const t = [0, 0, 0, 0]; p.forEach(x => { const k = x.g * x.m / 100; for (let i = 0; i < 4; i++) t[i] += (x.f.nutr[i] || 0) * k; }); return t; }
function planCost(p, T, L){
  const t = planTotals(p), w = (a, b, up, dn) => a > b ? (a - b) * up : (b - a) * dn;
  return Math.abs(t[0] - L.kcal) / 25 + w(t[1], L.protein, .04, .35) + w(t[3], L.fat, .22, .04) + w(t[2], L.carbs, .03, .03) + p.reduce((a, x) => a + Math.abs(x.m - 1) * 1.2, 0);
}
/** Fills what isn't logged yet today. Tries a few thousand days and keeps the closest. */
function makeDayPlan(dk, locked){
  const P = planPool(), T = targetsOn(dk), {t} = dayTotals(dk), has = m => dayEntries(dk).some(e => e.meal === m);
  const L = {kcal:T.kcal - t[0], protein:T.protein - t[1], carbs:T.carbs - t[2], fat:T.fat - t[3]};
  let slots = [['breakfast', P.breakfast.length ? P.breakfast : P.main], ['lunch', P.main], ['dinner', P.main], ['snacks', P.snack], ['snacks', P.snack]].filter(([m]) => m === 'snacks' || !has(m));
  if (L.kcal < 100) return {items:[], L};
  if (L.kcal < 350) slots = [['snacks', P.snack]]; else if (L.kcal < 700 && slots.length > 3) slots = slots.slice(-2);
  const ms = [.75, 1, 1.25, 1.5], mk = ([meal, pool]) => Object.assign({meal, pool}, pick1(pool), {m:pool === P.snack ? 1 : pick1(ms)});
  let best = null, bc = 1e9;
  const lock = (i, meal) => locked && locked[i] && locked[i].meal === meal ? locked[i] : null;
  for (let k = 0; k < 900; k++) {
    let p = slots.map((s, i) => lock(i, s[0]) || mk(s)), c = planCost(p, T, L);
    for (let j = 0; j < 14; j++) { const i = Math.floor(Math.random() * p.length); if (lock(i, slots[i][0])) continue; const q = p.slice(); q[i] = Math.random() < .5 && q[i].pool !== P.snack ? Object.assign({}, q[i], {m:pick1(ms)}) : mk(slots[i]); const d = planCost(q, T, L) + (new Set(q.map(x => x.f.key)).size < q.length ? 8 : 0); if (d < c) { p = q; c = d; } }
    if (c < bc) { best = p; bc = c; }
  }
  return {items:best, L};
}
ACTIONS.dayplan = () => {
  const dk = foodDate && tab === 'food' ? foodDate : today();
  dayPlan = makeDayPlan(dk);
  openSheet((s, sh) => {
    const p = dayPlan, t = planTotals(p.items), L = p.L;
    html(s, `<h2>Plan the rest of ${dlabel(dk).toLowerCase()}</h2>`);
    if (!p.items.length) return html(s, '<div class="empty">You\'ve used today\'s calories, so there\'s nothing left to plan.</div>');
    html(s, `<div class="card"><div class="macro4">${[['kcal', t[0], L.kcal, 'var(--text)'], ['protein', t[1], L.protein, 'var(--p)'], ['carbs', t[2], L.carbs, 'var(--c)'], ['fat', t[3], L.fat, 'var(--f)']].map(([l, v, w, c]) => `<div><b style="color:${c}">${fmtNum(v)}</b><span>${l} of ${fmtNum(w)}</span></div>`).join('')}</div></div>`);
    p.items.forEach((x, i) => { const v = scaled(x.f.nutr, x.g * x.m); html(s, `<div class="card"><div class="muted tiny" style="text-transform:uppercase">${MEALS.find(m => m[0] === x.meal)[1]}</div><div class="item"><b class="grow">${esc(x.f.name)}${x.m !== 1 ? ' <span class="muted">× ' + x.m + '</span>' : ''}</b><b>${fmtNum(v[0])}</b></div><div class="muted small">P ${Math.round(v[1] || 0)} · C ${Math.round(v[2] || 0)} · F ${Math.round(v[3] || 0)} g</div>
      <div class="quick" style="margin-top:8px"><button class="secondary" data-swap="${i}">Swap</button><button class="secondary" data-log="${i}">Log it</button>${x.rid ? `<button class="secondary" data-rec="${x.rid}">Recipe</button>` : ''}</div></div>`); });
    html(s, '<button class="primary wide" data-all>Log all of it</button><button class="secondary wide" data-new>New plan</button>');
    const log = x => addEntry(dk, x.meal, x.f, x.g * x.m, r1(x.m) + ' portion' + (x.m === 1 ? '' : 's'));
    on(s, '[data-swap]', b => { const i = +b.dataset.swap, old = p.items[i].f.key, lk = p.items.map((x, j) => j === i ? null : x); let n = null; for (let k = 0; k < 4; k++) { n = makeDayPlan(dk, lk); if (n.items.length !== p.items.length || n.items[i].f.key !== old) break; } dayPlan = n; sh.refresh(); });
    on(s, '[data-log]', b => { const i = +b.dataset.log; log(p.items[i]); dayPlan = {items:p.items.filter((_, j) => j !== i), L:makeLeft(dk)}; render(); toast('Logged'); if (!dayPlan.items.length) closeSheet(); else sh.refresh(); });
    on(s, '[data-all]', () => { p.items.forEach(log); closeSheet(); render(); toast('Logged ' + pl(p.items.length, 'meal')); });
    on(s, '[data-new]', () => { dayPlan = makeDayPlan(dk); sh.refresh(); s.scrollTop = 0; });
    on(s, '[data-rec]', b => openRecipe(recipeById(b.dataset.rec)));
  }, {full:true});
};
function makeLeft(dk){ const T = targetsOn(dk), {t} = dayTotals(dk); return {kcal:T.kcal - t[0], protein:T.protein - t[1], carbs:T.carbs - t[2], fat:T.fat - t[3]}; }

/* ---------- 20: what's in my kitchen ---------- */
const STAPLES = ['spray', 'oil', 'soy', 'herb', 'gargr', 'chp', 'pap', 'cum', 'stock'];
ACTIONS.kitchen = () => {
  let q = '', view = 'r';
  S.pantry = S.pantry || {}; if (!Object.keys(S.pantry).length) STAPLES.forEach(k => S.pantry[k] = 1);
  openSheet((s, sh) => {
    const cat = Object.keys(window.RECIPE_DATA.catalogue).map(catItem), have = cat.filter(c => S.pantry[c.cid]);
    html(s, `<h2>What's in my kitchen</h2><div class="seg"><button data-v="r" class="${view === 'r' ? 'on' : ''}">What I can make</button><button data-v="i" class="${view === 'i' ? 'on' : ''}">My ingredients (${have.length})</button></div>`);
    if (view === 'i') {
      html(s, `<input class="text-in" id="kq" placeholder="Find an ingredient" value="${esc(q)}" style="margin:10px 0"><div id="kl"></div>`);
      const l = s.querySelector('#kl'), draw = () => { const t = tokensOf(q); l.innerHTML = cat.filter(c => t.every(x => norm(c.name).includes(x))).sort((a, b) => (S.pantry[b.cid] ? 1 : 0) - (S.pantry[a.cid] ? 1 : 0) || a.name.localeCompare(b.name)).map(c => `<div class="todo"><button class="tick ${S.pantry[c.cid] ? 'on' : ''}" data-k="${c.cid}" aria-label="${esc(c.name)}">${S.pantry[c.cid] ? '✓' : ''}</button><span class="tt">${esc(c.name)}</span></div>`).join(''); on(l, '[data-k]', b => { const k = b.dataset.k; if (S.pantry[k]) delete S.pantry[k]; else S.pantry[k] = 1; save(); b.classList.toggle('on', !!S.pantry[k]); b.textContent = S.pantry[k] ? '✓' : ''; }); };
      const i = s.querySelector('#kq'); i.oninput = () => { q = i.value; draw(); }; draw();
    } else {
      const list = allRecipes().map(r => { const ing = ingsOf(r), miss = ing.filter(x => !(x.cid && S.pantry[x.cid])); return {r, miss, n:ing.length}; }).filter(x => x.n && x.miss.length < x.n - 1).sort((a, b) => a.miss.length - b.miss.length || a.miss.length / a.n - b.miss.length / b.n).slice(0, 20);
      if (have.length <= STAPLES.length) html(s, '<div class="coach" style="margin-top:10px">Tick what you\'ve got under <b>My ingredients</b> first.</div>');
      list.forEach(x => html(s, `<button class="rcard" style="margin-top:10px" data-r="${x.r.id}"><div class="item"><span class="t">${esc(x.r.name)}</span><span>${methodIcons(x.r)}</span></div><div class="small" style="color:${x.miss.length ? 'var(--gold)' : 'var(--accent)'}">${x.miss.length ? 'Need ' + esc(x.miss.map(m => m.name.replace(/ \(.*/, '')).slice(0, 5).join(', ')) + (x.miss.length > 5 ? ' +' + (x.miss.length - 5) : '') : 'You have everything'}</div></button>`));
    }
    on(s, '[data-v]', b => { view = b.dataset.v; sh.refresh(); s.scrollTop = 0; });
    on(s, '[data-r]', b => openRecipe(recipeById(b.dataset.r)));
  }, {full:true});
};

/* ---------- 22: saved meals ---------- */
const mealsS = () => S.food.meals = S.food.meals || [];
function mealTotals(m){ const t = [0, 0, 0, 0]; m.items.forEach(x => { const f = foodFromCache(x.key); if (f) scaled(f.nutr, x.g).forEach((v, i) => { if (i < 4) t[i] += v || 0; }); }); return t; }
ACTIONS['meal-save'] = b => {
  const dk = foodDate || today(), meal = b.dataset.meal, es = dayEntries(dk).filter(e => e.meal === meal); if (!es.length) return;
  ask('Save this meal', [{k:'n', label:'Name', v:'', ph:'e.g. Usual breakfast'}], o => { if (!o.n.trim()) { toast('Name it'); return false; } mealsS().push({id:uid(), name:o.n.trim(), items:es.map(e => ({key:e.key, g:e.g, label:e.label || ''}))}); save(); toast('Saved. Find it in More ways to log.'); });
};
ACTIONS.meals = () => openSheet((s, sh) => {
  const dk = foodDate && tab === 'food' ? foodDate : today(); let meal = defaultMeal();
  html(s, `<h2>Saved meals</h2>` + (mealsS().length ? '' : '<div class="empty">Log a meal in your diary, then tap ☆ next to it to save it here.</div>') +
    mealsS().map(m => { const t = mealTotals(m); return `<div class="card"><div class="item"><b class="grow">${esc(m.name)}</b><b>${fmtNum(t[0])} kcal</b></div><div class="muted small">P ${Math.round(t[1])} · C ${Math.round(t[2])} · F ${Math.round(t[3])} g<br>${esc(m.items.map(x => (foodFromCache(x.key) || {}).name || '').filter(Boolean).join(', '))}</div>
      <div class="quick" style="margin-top:8px"><button class="primary" data-log="${m.id}">Log to ${MEALS.find(x => x[0] === meal)[1].toLowerCase()}</button><button class="secondary" data-del="${m.id}">Delete</button></div></div>`; }).join(''));
  on(s, '[data-log]', b => { const m = mealsS().find(x => x.id === b.dataset.log); m.items.forEach(x => { const f = foodFromCache(x.key); if (f) addEntry(dk, meal, f, x.g, x.label); }); closeSheet(); render(); toast('Logged ' + m.name); });
  on(s, '[data-del]', b => { if (!confirm('Delete this saved meal? Your diary keeps its entries.')) return; S.food.meals = mealsS().filter(x => x.id !== b.dataset.del); save(); sh.refresh(); });
}, {full:true});

/* ---------- 23: eating out ---------- */
ACTIONS.eatout = () => {
  let chain = null, sort = 'p';
  openSheet((s, sh) => {
    const D = window.EATOUT || []; const T = targetsOn(today()), left = T.kcal - dayTotals(today()).t[0];
    if (!chain) { html(s, `<h2>Eating out</h2>` + (D.length ? D.map((c, i) => `<button class="pick" data-c="${i}"><span><b>${esc(c.chain)}</b><div class="muted small">${pl(c.items.length, 'item')}</div></span><span class="muted">›</span></button>`).join('') : '<div class="empty">No menus yet.</div>')); return on(s, '[data-c]', b => { chain = D[+b.dataset.c]; sh.refresh(); s.scrollTop = 0; }); }
    const full = x => x.p != null && x.c != null && x.f != null, items = chain.items.slice().sort((a, b) => sort === 'k' ? a.k - b.k : sort === 'd' ? (b.p || 0) / b.k - (a.p || 0) / a.k : (b.p || 0) - (a.p || 0));
    html(s, `<h2>${esc(chain.chain)}</h2><div class="pills">${[['p', 'Most protein'], ['d', 'Best protein for calories'], ['k', 'Fewest calories']].map(([k, l]) => `<button class="pill ${sort === k ? 'on' : ''}" data-s="${k}">${l}</button>`).join('')}</div><div class="muted small" style="margin:6px 0">${fmtNum(left)} kcal left today</div>` +
      items.map(x => `<button class="food-row" data-i="${chain.items.indexOf(x)}"><span class="grow"><div class="nm">${esc(x.n)}</div><div class="muted small">${full(x) ? `P ${r1(x.p)} · C ${r1(x.c)} · F ${r1(x.f)} g` : 'Only calories published' + (x.p != null ? ' · P ' + r1(x.p) : '')}</div></span><span class="kc" style="${x.k > left ? 'color:var(--gold)' : ''}">${fmtNum(x.k)}<div class="muted tiny">kcal</div></span></button>`).join('') +
      `<button class="secondary wide" data-back>All places</button><div class="muted tiny" style="margin-top:8px">From ${esc(chain.source.replace(/^https?:\/\/(www\.)?/, '').split('/')[0])}, checked ${dlabel(chain.checked)}. Menus change, so check in store. Not for allergies.</div>`);
    on(s, '[data-s]', b => { sort = b.dataset.s; sh.refresh(); });
    on(s, '[data-back]', () => { chain = null; sh.refresh(); s.scrollTop = 0; });
    on(s, '[data-i]', b => { const x = chain.items[+b.dataset.i], g = x.g || 100, n = NUTR.map(() => null); n[0] = x.k * 100 / g; [['p', 1], ['c', 2], ['f', 3]].forEach(([k, i]) => { if (x[k] != null) n[i] = x[k] * 100 / g; }); openFood({key:'out:' + norm(chain.chain + x.n).replace(/[^a-z0-9]/g, ''), name:x.n, brand:chain.chain, serving:g, src:'web', qty:'', nutr:n}, {dk:today()}); });
  }, {full:true});
};

/* ---------- 24: meal deal ---------- */
const DEAL_SHOPS = [['tesco', /tesco/i], ['sainsburys', /sainsbury/i], ['boots', /boots/i], ['coop', /co-?op/i], ['morrisons', /morrison/i], ['asda', /asda/i], ['waitrose', /waitrose/i], ['mands', /m ?& ?s|marks/i]];
const DEAL_NAMES = {tesco:'Tesco', sainsburys:'Sainsbury\'s', boots:'Boots', coop:'Co-op', morrisons:'Morrisons', asda:'Asda', waitrose:'Waitrose', mands:'M&S'};
const DEAL_MAIN = /\b(sandwich|sandwiches|triple|baguette|sushi|pasta salad|sub|wrap)\b/i, DEAL_NOT = /wraps|thins|bread|filler|paste|spread|cream|biscuit|short|cookie|crisps|mayo|season|kit|mix|sauce|cheese slices|ice|wafer|choc|multi|rolls|bites|cake|bar\b|tortilla|snack|dressing|vinegar|rice|pickle|dip|soy|ham\b.*\d pack|sliced|bake|sourdough|loaf|cheesecake|triple (choc|malt|cheese b)/i;
const DEAL_SNACK = /protein bar|protein yog|protein pudding|skyr|popcorn|fruit (salad|pot)|melon|grapes|apple (slices|& grape)|boiled egg|egg.*(spinach|protein)|jerky|biltong|hummus.*(pot|snack)|edamame|crisps|rice cakes|nuts|mango|pineapple/i;
const DEAL_DRINK = /(diet|zero|max|sugar free|no sugar|light|water|still|sparkling|smoothie|protein (shake|milk|drink)|milkshake|orange juice|iced coffee|latte|energy)/i;
let dealDB = null;
async function dealData(){
  if (dealDB) return dealDB;
  const db = await ensureDB('uk'), out = {main:{}, snack:[], drink:[]};
  db.lines.forEach(l => {
    const a = l.split('\t'), nm = a[1] || '', g = num(a[4]), pg = packGrams(a[3]); if (!g && !pg) return;
    const main = DEAL_MAIN.test(nm) && !DEAL_NOT.test(nm), sn = !main && DEAL_SNACK.test(nm) && pg && pg <= 170 && pg >= 18, dr = !main && !sn && DEAL_DRINK.test(nm) && pg && pg >= 250 && pg <= 600 && /ml|cl|l\b/i.test(a[3] || '');
    if (!main && !sn && !dr) return;
    const f = lineToFood(l, 'uk'), q = main ? (pg && pg >= 120 && pg <= 460 ? pg : g) : pg, v = scaled(f.nutr, q);
    if (v[0] == null || v[1] == null || v[2] == null || v[3] == null || Math.abs(v[1] * 4 + v[2] * 4 + v[3] * 9 - v[0]) > Math.max(30, v[0] * .2)) return;
    const x = {f, g:q, v:v.slice(0, 4)};
    if (main) { if (q < 120 || q > 460 || v[0] < 150 || v[0] > 750) return; const s = DEAL_SHOPS.find(([, re]) => re.test(a[2] || '')); if (s) (out.main[s[0]] = out.main[s[0]] || []).push(x); }
    else if (sn) { if (v[0] >= 15 && v[0] <= 350) out.snack.push(x); }
    else if (/flavou?r(ed)? water|squash|cordial|syrup|concentrate/i.test(nm) === false && v[0] <= 450) out.drink.push(x);
  });
  const own = /tesco|sainsbury|morrison|asda|aldi|lidl|waitrose|co-?op|marks|m&s|boots/i;
  out.snack = out.snack.slice(0, 700); out.drink = out.drink.slice(0, 260); out.own = own;
  return dealDB = out;
}
ACTIONS.mealdeal = () => {
  let shop = S.food.dealShop || 'tesco', aim = 'p', seed = 0, deals = null;
  openSheet((s, sh) => {
    html(s, `<h2>Best meal deal</h2><div class="pills">${DEAL_SHOPS.map(([k]) => `<button class="pill ${shop === k ? 'on' : ''}" data-s="${k}">${DEAL_NAMES[k]}</button>`).join('')}</div><div class="pills">${[['p', 'Most protein'], ['l', 'Fewest calories'], ['b', 'Fits my day']].map(([k, l]) => `<button class="pill ${aim === k ? 'on' : ''}" data-a="${k}">${l}</button>`).join('')}</div><div id="dl"><div class="empty">Looking…</div></div>`);
    on(s, '[data-s]', b => { shop = S.food.dealShop = b.dataset.s; seed = 0; save(); sh.refresh(); }); on(s, '[data-a]', b => { aim = b.dataset.a; seed = 0; sh.refresh(); });
    dealData().then(D => {
      const el = s.querySelector('#dl'); if (!el) return;
      const L = makeLeft(today()), room = {kcal:clamp(L.kcal * .6, 350, 1000), protein:Math.max(25, L.protein * .5)};
      const sc = v => aim === 'p' ? v[1] * 3 - v[0] / 9 : aim === 'l' ? -v[0] + v[1] * 2 : -Math.abs(v[0] - room.kcal) / 3 + Math.min(v[1], room.protein) * 4;
      const other = x => { const w = x.f.brand || ''; return !D.own.test(w) || DEAL_SHOPS.find(y => y[0] === shop)[1].test(w); };
      const top = (l, n) => { const seen = new Set(); return l.slice().sort((a, b) => sc(b.v) - sc(a.v)).filter(x => { const k = norm(x.f.name).slice(0, 14); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, n); };
      const M = top(D.main[shop] || [], 24), N = top(D.snack.filter(other), 24), R = top(D.drink.filter(other), 16);
      if (!M.length || !N.length || !R.length) { el.innerHTML = '<div class="empty">Not enough products listed for this shop.</div>'; return; }
      const all = []; M.forEach(a => N.forEach(b => R.forEach(c => { const v = a.v.map((q, i) => q + b.v[i] + c.v[i]); all.push([sc(v), a, b, c, v]); }))); all.sort((x, y) => y[0] - x[0]);
      const show = []; for (const d of all) { if (show.length >= 24) break; if (show.filter(x => x[1] === d[1]).length < 1 && show.filter(x => x[2] === d[2]).length < 2) show.push(d); }
      const pg = show.slice(seed % Math.max(1, show.length)).concat(show).slice(0, Math.min(3, show.length));
      el.innerHTML = pg.map((d, i) => `<div class="card"><div class="item"><b>${fmtNum(d[4][0])} kcal</b><b style="color:var(--p)">${Math.round(d[4][1])} g protein</b></div>${[1, 2, 3].map(k => `<div class="small" style="margin-top:4px">${['', '🥪', '🍎', '🥤'][k]} ${esc(d[k].f.name)}${d[k].f.brand ? ' <span class="muted">' + esc(d[k].f.brand) + '</span>' : ''} <span class="muted">${fmtNum(d[k].v[0])}</span></div>`).join('')}<button class="secondary wide" data-l="${i}">Log all three</button></div>`).join('') + '<button class="ghost wide" data-m>Show me others</button><div class="muted tiny">From the product database, so some may have left the shelves or not be in the deal: check the label in store.</div>';
      on(el, '[data-m]', () => { seed += 3; sh.refresh(); });
      on(el, '[data-l]', b => { const d = pg[+b.dataset.l]; [1, 2, 3].forEach(k => addEntry(today(), defaultMeal(), d[k].f, d[k].g, r1(d[k].g) + ' g')); closeSheet(); render(); toast('Meal deal logged'); });
    }).catch(() => { const el = s.querySelector('#dl'); if (el) el.innerHTML = '<div class="empty">Could not load the food database.</div>'; });
  }, {full:true});
};

/* ---------- 25: protein per pound ---------- */
ACTIONS.ppp = () => openSheet((s, sh) => {
  const list = Object.keys(window.RECIPE_DATA.catalogue).map(catItem).filter(c => c.price > 0 && c.pack > 0 && (c.nutr[1] || 0) >= 4).map(c => ({c, p:c.pack * c.nutr[1] / 100 / c.price, k:(c.nutr[1] * 4) / Math.max(1, c.nutr[0])})).sort((a, b) => b.p - a.p), hi = list[0] ? list[0].p : 1;
  const seen = list.filter(x => x.k >= .16);
  html(s, `<h2>Protein for your money</h2><div class="muted small" style="margin:-8px 0 8px">Grams of protein per £1. Typical prices: tap one to set what you pay.</div>` + seen.map(x => `<button class="food-row" data-c="${x.c.cid}"><span class="grow"><div class="nm">${esc(x.c.name)}</div><div class="track" style="margin-top:5px"><i style="width:${x.p / hi * 100}%;background:var(--p)"></i></div><div class="muted small">${money(x.c.price)} · ${fmtQty(x.c.pack)} · ${r1(x.c.nutr[1])} g per 100 g · ${esc(x.c.shops || '')}</div></span><span class="kc">${Math.round(x.p)} g</span></button>`).join(''));
  on(s, '[data-c]', b => editPrice(catItem(b.dataset.c), null, () => sh.refresh()));
}, {full:true});

/* ---------- 31: compare two foods ---------- */
ACTIONS.compare = () => {
  const P = [null, null]; let per = '100';
  openSheet((s, sh) => {
    html(s, `<h2>Compare two foods</h2><div class="grid2">${[0, 1].map(i => `<div><button class="card tap" style="color:var(--text);min-height:76px" data-p="${i}"><b>${P[i] ? esc(P[i].name) : 'Choose ' + (i ? 'second' : 'first')}</b><div class="muted small">${P[i] ? esc(P[i].brand || '') : 'Search'}</div></button><button class="secondary wide" style="margin-top:0" data-s="${i}">▦ Scan</button></div>`).join('')}</div>`);
    if (P[0] && P[1]) {
      const sv = P.every(f => f.serving); if (!sv) per = '100';
      html(s, `<div class="seg" style="margin-top:12px"><button data-u="100" class="${per === '100' ? 'on' : ''}">Per 100 g</button><button data-u="s" class="${per === 's' ? 'on' : ''}" ${sv ? '' : 'disabled style="opacity:.4"'}>Per serving</button><button data-u="k" class="${per === 'k' ? 'on' : ''}">Per 100 kcal</button></div>`);
      const g = P.map(f => per === '100' ? 100 : per === 's' ? f.serving : f.nutr[0] > 0 ? 10000 / f.nutr[0] : 100), V = P.map((f, i) => scaled(f.nutr, g[i]));
      NUTR.forEach((n, i) => { const a = V[0][i], b = V[1][i]; if ((a == null && b == null) || ((a || 0) < .05 && (b || 0) < .05)) return; const low = n.limit || i === 0 || i === 3, w = a == null || b == null || Math.abs(a - b) < Math.max(a, b) * .03 ? -1 : (a > b) !== low ? 0 : 1, c = x => w === x && !(i === 2) ? 'color:var(--accent);font-weight:700' : ''; html(s, `<div class="cmp"><span style="${c(0)}">${a == null ? '–' : r1(a)}</span><span class="muted">${n.l} ${n.u}</span><span style="${c(1)}">${b == null ? '–' : r1(b)}</span></div>`); });
    }
    on(s, '[data-p]', b => { const i = +b.dataset.p; openFoodSearch({onFood:f => { P[i] = f; sh.refresh(); }}); });
    on(s, '[data-s]', b => { const i = +b.dataset.s; openScanner(f => { P[i] = f; sh.refresh(); }); });
    on(s, '[data-u]', b => { per = b.dataset.u; sh.refresh(); });
  }, {full:true});
};

/* ---------- 28: caffeine ---------- */
function caffCut(){ const c = S.food.caff; return c ? {bed:c.bed, cut:(c.bed - c.gap * 60 + 1440) % 1440} : null; }
function nextBed(){ const sl = S.blocks.find(b => /sleep|bed/i.test(b.title)); return sl ? sl.start : 1380; }
ACTIONS.caffeine = () => openSheet((s, sh) => {
  const c = S.food.caff || {bed:nextBed(), gap:8}, mg = dayTotals(today()).t[NI.caffeine], cut = (c.bed - c.gap * 60 + 1440) % 1440;
  html(s, `<h2>Caffeine cutoff</h2><div class="stat-grid"><div class="stat"><div class="v">${fmtT(cut)}</div><div class="l">Last one</div></div><div class="stat"><div class="v">${Math.round(mg)} mg</div><div class="l">Logged today</div></div></div>
    <label class="f">Bedtime</label><input class="text-in" type="time" id="cb" value="${toHM(c.bed)}"><label class="f">Hours before bed</label><div class="seg">${[6, 8, 10, 12].map(h => `<button data-g="${h}" class="${c.gap === h ? 'on' : ''}">${h}</button>`).join('')}</div>
    <div class="muted small" style="margin-top:8px;line-height:1.6">8 hours suits most people. Pick more if caffeine hits you hard or you drink a lot at once. Up to 400 mg a day is generally fine for healthy adults, less when pregnant or under 18. Shop products often don't list caffeine, so the total can read low.</div><button class="primary wide" data-x>Save</button>${S.food.caff ? '<button class="ghost wide" data-off>Turn off</button>' : ''}`);
  on(s, '[data-g]', b => { c.gap = +b.dataset.g; S.food.caff = c; save(); sh.refresh(); }); s.querySelector('#cb').onchange = e => { const v = fromHM(e.target.value); if (v != null) { c.bed = v; S.food.caff = c; save(); sh.refresh(); } };
  on(s, '[data-x]', () => { S.food.caff = c; save(); closeSheet(); render(); }); on(s, '[data-off]', () => { S.food.caff = null; save(); closeSheet(); render(); });
});

/* ---------- 29: supplements ---------- */
const suppS = () => S.supps = S.supps || [];
function tickSupp(x, d){ x.days = x.days || {}; if (x.days[d]) { delete x.days[d]; if (x.left != null) x.left += x.per || 1; } else { x.days[d] = 1; if (x.left != null) x.left = Math.max(0, x.left - (x.per || 1)); } }
const suppDays = x => x.left == null ? null : Math.floor(x.left / (x.per || 1));
function suppCard(){
  if (!suppS().length) return '';
  const d = today();
  return `<div class="card"><div class="item"><b>💊 Supplements</b><button class="ghost" data-act="supps">Edit</button></div>` + suppS().map(x => `<div class="todo"><button class="tick ${x.days && x.days[d] ? 'on' : ''}" data-act="supp-tick" data-id="${x.id}" aria-label="${esc(x.name)}">${x.days && x.days[d] ? '✓' : ''}</button><span class="tt">${esc(x.name)}${x.dose ? ' <span class="muted small">' + esc(x.dose) + '</span>' : ''}</span>${suppDays(x) != null ? `<span class="small" style="color:${suppDays(x) <= 5 ? 'var(--gold)' : 'var(--muted)'}">${pl(suppDays(x), 'day')} left</span>` : ''}</div>`).join('') + '</div>';
}
ACTIONS['supp-tick'] = b => { const x = suppS().find(y => y.id === b.dataset.id); if (x) { tickSupp(x, today()); save(); render(); } };
function editSupp(x, after){
  const isNew = !x; x = x || {id:uid(), name:'', dose:'', left:null, per:1, days:{}};
  ask(isNew ? 'Add supplement' : 'Edit supplement', [{k:'name', label:'Name', v:x.name, ph:'e.g. Creatine'}, {k:'dose', label:'Dose (optional)', v:x.dose, ph:'e.g. 5 g'}, {k:'left', label:'Servings left in the tub (optional)', v:x.left == null ? '' : x.left, type:'number'}, {k:'per', label:'Servings a day', v:x.per, type:'number'}], o => {
    if (!o.name.trim()) { toast('Name it'); return false; }
    Object.assign(x, {name:o.name.trim(), dose:o.dose.trim(), left:o.left == null ? null : Math.max(0, o.left), per:o.per > 0 ? o.per : 1}); if (isNew) suppS().push(x); save(); after && after(); render();
  });
}
ACTIONS.supps = () => openSheet((s, sh) => {
  html(s, '<h2>Supplements</h2>' + (suppS().length ? '' : '<div class="empty">Creatine, vitamin D, whatever you take. Ticking one counts the tub down.</div>') + suppS().map(x => `<div class="food-row"><span class="grow"><div class="nm">${esc(x.name)}</div><div class="muted small">${esc(x.dose || '')}${suppDays(x) != null ? ' · ' + pl(suppDays(x), 'day') + ' left' : ''}</div></span><button class="ghost" data-e="${x.id}">Edit</button><button class="icon" data-d="${x.id}" aria-label="Delete">✕</button></div>`).join('') + '<button class="primary wide" data-n>＋ Add supplement</button>');
  on(s, '[data-n]', () => editSupp(null, () => sh.refresh())); on(s, '[data-e]', b => editSupp(suppS().find(x => x.id === b.dataset.e), () => sh.refresh()));
  on(s, '[data-d]', b => { if (!confirm('Delete this supplement and its history?')) return; S.supps = suppS().filter(x => x.id !== b.dataset.d); save(); sh.refresh(); render(); });
});

/* ---------- all the ways to log ---------- */
const FOOD_TOOLS = [['typeit', '⌨️', 'Type it', '“2 eggs, toast, coffee”'], ['meals', '☆', 'Saved meals', 'One tap'], ['dayplan', '🗓️', 'Plan my day', 'Meals that hit your macros'], ['snacks', '🍿', 'Snack ideas', 'That fit what\'s left'], ['eatout', '🍔', 'Eating out', 'Greggs, KFC, Nando\'s and more'], ['mealdeal', '🥪', 'Best meal deal', 'By shop'],
  ['kitchen', '🧊', 'My kitchen', 'Cook what you have'], ['ppp', '💷', 'Protein per £', 'Cheapest protein'], ['compare', '⚖️', 'Compare', 'Two products'], ['budget', '📊', 'Weekly budget', 'Spread the week'], ['caffeine', '☕', 'Caffeine', 'Cutoff time'], ['supps', '💊', 'Supplements', 'Daily ticks']];
ACTIONS.foodtools = () => openSheet(s => {
  html(s, '<h2>More ways to log</h2><div class="tools">' + FOOD_TOOLS.map(([k, i, l, d]) => `<button data-k="${k}"><span style="font-size:22px">${i}</span><b>${l}</b><span class="muted tiny">${esc(d)}</span></button>`).join('') + '</div>');
  on(s, '[data-k]', b => { closeSheet(); ACTIONS[b.dataset.k](b); });
}, {full:true});
