'use strict';
/* ================= recipes: browse, cost, meal prep, builder, QR share ================= */
const METHODS = {airfryer:['Air fryer','🌀'], microwave:['Microwave','⚡'], hob:['Hob / pan','🍳'], oven:['Oven','🔥'], nocook:['No-cook','🥗']};
const RTAGS = ['high protein','meal prep','budget','quick','breakfast','freezer friendly','vegetarian','vegan','fakeaway','low carb'];
let rMethod = 'all', rTag = '', rQuery = '', rSort = 'popular';

function catItem(cid){
  const c = window.RECIPE_DATA.catalogue[cid]; if (!c) return null;
  const pe = S.priceEdit[cid] || {};
  return {cid, key:c[0], name:c[1], pack:pe.pack || c[2], price:pe.price != null ? pe.price : c[3], shops:pe.shops || c[4], nutr:parseNutr(c[5])};
}
function allRecipes(){ return (window.RECIPE_DATA ? window.RECIPE_DATA.recipes : []).concat(S.myRecipes); }
function recipeById(id){ return allRecipes().find(r => r.id === id); }
const isMine = r => S.myRecipes.includes(r);
function ingsOf(r){
  return r.ing.map(x => Array.isArray(x)
    ? Object.assign(catItem(x[0]) || {name:x[0], nutr:NUTR.map(() => null)}, {g:x[1], note:x[2] || ''})
    : Object.assign({cid:null, nutr:(foodFromCache(x.key) || {nutr:NUTR.map(() => null)}).nutr}, x));
}
function calcRecipe(r, meals){
  meals = meals || r.serves;
  const fac = meals / r.serves, ings = ingsOf(r);
  const tot = NUTR.map(() => 0);
  let weight = 0, cost = 0, shop = 0, priced = true;
  ings.forEach(i => {
    const g = i.g * fac; weight += g;
    i.nutr.forEach((v, k) => { if (v != null) tot[k] += v * g / 100; });
    if (i.price != null && i.pack) { cost += i.price * g / i.pack; shop += Math.ceil(g / i.pack - 1e-9) * i.price; } else priced = false;
  });
  return {meals, fac, ings, tot, weight, cost, shop, priced, per:tot.map(v => v / meals), perCost:cost / meals};
}
function recipeAsFood(r){
  const c = calcRecipe(r);
  return {key:'rec:' + r.id, name:r.name, brand:'Recipe', serving:c.weight / r.serves, src:'rec', qty:'', nutr:c.tot.map(v => v * 100 / (c.weight || 1))};
}
const methodIcons = r => r.methods.map(m => METHODS[m] ? METHODS[m][1] : '').join(' ');

/* ---------- browse ---------- */
VIEWS['recipes/browse'] = {render(){
  let list = allRecipes();
  if (rMethod !== 'all') list = list.filter(r => r.methods.includes(rMethod));
  if (rTag) list = list.filter(r => (r.tags || []).includes(rTag));
  const t = tokensOf(rQuery);
  if (t.length) list = list.filter(r => { const s = norm(r.name + ' ' + (r.tags || []).join(' ') + ' ' + ingsOf(r).map(i => i.name).join(' ')); return t.every(x => s.includes(x)); });
  const withCalc = list.map(r => ({r, c:calcRecipe(r)}));
  if (rSort === 'cheap') withCalc.sort((a, b) => a.c.perCost - b.c.perCost);
  else if (rSort === 'protein') withCalc.sort((a, b) => b.c.per[1] - a.c.per[1]);
  else if (rSort === 'fast') withCalc.sort((a, b) => a.r.time - b.r.time);
  let h = `<input class="text-in" data-field="rq" placeholder="Search recipes or ingredients" value="${esc(rQuery)}">
    <div class="pills" style="margin-top:10px">${[['all','All']].concat(Object.entries(METHODS).map(([k, v]) => [k, v[1] + ' ' + v[0]])).map(([k, l]) => `<button class="pill ${rMethod === k ? 'on' : ''}" data-act="rmethod" data-m="${k}">${l}</button>`).join('')}</div>
    <div class="pills">${RTAGS.map(tg => `<button class="pill ${rTag === tg ? 'on' : ''}" data-act="rtag" data-t="${tg}">${tg}</button>`).join('')}</div>
    <div class="row between" style="margin:6px 0 10px"><span class="muted small">${pl(withCalc.length, 'recipe')}</span>
      <select data-field="rsort" style="width:auto;min-height:36px;font-size:13px">${[['popular','Sort: featured'],['cheap','Cheapest per meal'],['protein','Most protein'],['fast','Quickest']].map(([k, l]) => `<option value="${k}" ${rSort === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <button class="secondary wide" data-act="recipe-new" style="margin:0 0 12px">＋ Make your own recipe</button><button class="secondary wide" data-act="kitchen" style="margin:0 0 12px">🧊 What can I make?</button>`;
  if (!withCalc.length) h += `<div class="empty">No recipes match. Try another filter.</div>`;
  withCalc.forEach(({r, c}) => {
    h += `<button class="rcard" data-act="recipe" data-id="${r.id}"><div class="item"><span class="t">${esc(r.name)}</span><span>${methodIcons(r)}</span></div>
      <div class="rmeta"><span><b class="price">${money(c.perCost)}</b>/meal</span><span><b>${r.serves}</b> meals</span><span><b>${fmtNum(c.per[0])}</b> kcal</span><span><b>${Math.round(c.per[1])}g</b> protein</span><span>⏱ ${r.time} min</span></div>
      <div class="chips">${isMine(r) ? '<span class="chip hot">mine</span>' : ''}${(r.tags || []).slice(0, 3).map(tg => `<span class="chip">${esc(tg)}</span>`).join('')}</div></button>`;
  });
  h += `<div class="muted tiny" style="margin-top:8px">Prices are estimates from typical UK supermarket prices. Tap any ingredient's price in a recipe to set what you actually pay; it updates every recipe that uses it.</div>`;
  return h;
}};

/* ---------- recipe detail ---------- */
function openRecipe(r, startMeals){
  let meals = startMeals || r.serves;
  openSheet((b, sh) => {
    const c = calcRecipe(r, meals);
    html(b, `<h2>${esc(r.name)}</h2>
      <div class="chips" style="margin:-6px 0 12px">${r.methods.map(m => `<span class="chip hot">${METHODS[m][1]} ${METHODS[m][0]}</span>`).join('')}<span class="chip">⏱ ${r.time} min</span>${r.keeps ? `<span class="chip">🧊 ${esc(r.keeps)}</span>` : ''}</div>
      <div class="stat-grid">
        <div class="stat"><div class="l">Meals it makes</div><div class="stepper" style="margin-top:4px"><button data-m="-1">−</button><span style="min-width:36px;font-size:20px">${meals}</span><button data-m="1">＋</button></div></div>
        <div class="stat"><div class="v price">${money(c.perCost)}</div><div class="l">per meal</div></div>
      </div>
      <div class="card small"><b>${money(c.cost)}</b> of ingredients for ${pl(meals, 'meal')}${c.priced ? '' : ' (some prices missing)'} · about <b>${money(c.shop)}</b> at the till buying whole packs (the rest stays in your cupboard).</div>
      <div class="muted small">Per meal</div>
      <div class="macro4"><div><b>${fmtNum(c.per[0])}</b><span>kcal</span></div><div><b style="color:var(--p)">${Math.round(c.per[1])}</b><span>protein</span></div>
        <div><b style="color:var(--c)">${Math.round(c.per[2])}</b><span>carbs</span></div><div><b style="color:var(--f)">${Math.round(c.per[3])}</b><span>fat</span></div></div>
      <div class="sec">Ingredients</div>
      ${c.ings.map((i, k) => `<div class="ing"><span class="q">${fmtQty(i.g * c.fac)}</span><span class="grow"><div class="bold">${esc(i.name)}${i.note ? ' <span class="muted" style="font-weight:400">· ' + esc(i.note) + '</span>' : ''}</div>
        <div class="muted small">${i.price != null && i.pack ? `<button class="ghost" style="min-height:28px;padding:0;font-size:13px" data-price="${k}">${money(i.price * i.g * c.fac / i.pack)} of a ${money(i.price)} pack (${fmtQty(i.pack)}) ✎</button><br>` : `<button class="ghost" style="min-height:28px;padding:0;font-size:13px" data-price="${k}">Add price ✎</button><br>`}${i.shops ? '🛒 ' + esc(i.shops) : ''}</div></span></div>`).join('')}
      <div class="sec">Method</div>
      ${(r.steps || []).map((s, k) => `<div class="step"><i>${k + 1}</i><span>${esc(s)}</span></div>`).join('')}
      <button class="primary wide" data-r="log">Log a meal of this</button>
      <button class="secondary wide" data-r="plan">Add ${pl(meals, 'meal')} to meal prep</button>
      <button class="secondary wide" data-r="qr">Share as QR code</button>
      ${isMine(r) ? '<button class="secondary wide" data-r="edit">Edit recipe</button><button class="danger-link wide" data-r="del">Delete recipe</button>' : '<button class="ghost wide" data-r="copy">Make my own version</button>'}`);
    on(b, '[data-m]', btn => { meals = clamp(meals + +btn.dataset.m, 1, 40); sh.refresh(); });
    on(b, '[data-price]', btn => editPrice(c.ings[+btn.dataset.price], r, () => sh.refresh()));
    on(b, '[data-r="log"]', () => openFood(recipeAsFood(r), {dk:today()}));
    on(b, '[data-r="plan"]', () => {
      const it = S.plan.items.find(x => x.rid === r.id);
      if (it) it.meals += meals; else S.plan.items.push({rid:r.id, meals});
      save(); toast('Added to meal prep'); render();
    });
    on(b, '[data-r="qr"]', () => shareRecipeQR(r));
    on(b, '[data-r="edit"]', () => { closeSheet(); editRecipe(r); });
    on(b, '[data-r="copy"]', () => { closeSheet(); editRecipe(null, r); });
    on(b, '[data-r="del"]', () => {
      if (!confirm('Delete “' + r.name + '”?')) return;
      S.myRecipes = S.myRecipes.filter(x => x !== r); S.plan.items = S.plan.items.filter(x => x.rid !== r.id); save(); closeSheet(); render();
    });
  }, {full:true});
}
function fmtQty(g){ return g >= 1000 ? r1(g / 1000) + ' kg' : Math.round(g) + ' g'; }
function editPrice(i, r, after){
  const fields = [{k:'price', label:'Pack price (£)', v:i.price != null ? i.price : '', type:'number'}, {k:'pack', label:'Pack size (g)', v:i.pack || '', type:'number'}, {k:'shops', label:'Where to buy', v:i.shops || '', ph:'e.g. Aldi · Tesco'}];
  ask(i.name, fields, o => {
    if (o.price == null || !(o.pack > 0)) { toast('Enter a price and pack size'); return false; }
    if (i.cid) S.priceEdit[i.cid] = {price:o.price, pack:o.pack, shops:o.shops};
    else { const ing = r.ing.find(x => !Array.isArray(x) && x.key === i.key && x.name === i.name); if (ing) Object.assign(ing, {price:o.price, pack:o.pack, shops:o.shops}); }
    save(); after && after(); render();
  });
}

/* ---------- meal prep + shopping list ---------- */
VIEWS['recipes/prep'] = {render(){
  const items = S.plan.items.map(it => ({it, r:recipeById(it.rid)})).filter(x => x.r);
  if (!items.length) return `<div class="empty">Plan your week: open a recipe and tap <b>Add to meal prep</b>. You'll get one shopping list with the total cost and which shop to get each thing from.</div>
    <button class="primary wide" data-act="go" data-tab="recipes" data-sub="browse">Browse recipes</button>`;
  let meals = 0, cost = 0, kcal = 0, prot = 0;
  const shopping = {};
  items.forEach(({it, r}) => {
    const c = calcRecipe(r, it.meals);
    meals += it.meals; cost += c.cost; kcal += c.tot[0]; prot += c.tot[1];
    c.ings.forEach(i => {
      const id = i.cid || ('k:' + i.key + ':' + i.name);
      const s = shopping[id] = shopping[id] || {id, name:i.name, g:0, pack:i.pack, price:i.price, shops:i.shops || '', from:[]};
      s.g += i.g * c.fac; if (!s.from.includes(r.name)) s.from.push(r.name);
    });
  });
  const list = Object.values(shopping);
  let till = 0; list.forEach(s => { s.packs = s.pack ? Math.ceil(s.g / s.pack - 1e-9) : null; s.cost = s.packs != null && s.price != null ? s.packs * s.price : null; if (s.cost) till += s.cost; });
  let h = `<div class="stat-grid"><div class="stat"><div class="v">${meals}</div><div class="l">Meals planned</div></div>
    <div class="stat"><div class="v price">${money(till)}</div><div class="l">Shopping total</div></div>
    <div class="stat"><div class="v">${money(cost / meals)}</div><div class="l">Avg per meal</div></div>
    <div class="stat"><div class="v">${Math.round(prot / meals)}g</div><div class="l">Protein / meal</div></div></div>
    <div class="sec">The plan</div>`;
  items.forEach(({it, r}) => {
    const c = calcRecipe(r, it.meals);
    h += `<div class="card"><div class="item"><button class="tap grow" style="background:none;color:var(--text);padding:0" data-act="recipe" data-id="${r.id}"><b>${esc(r.name)}</b><div class="muted small">${methodIcons(r)} ${money(c.cost)} · ${fmtNum(c.per[0])} kcal · ${Math.round(c.per[1])}g protein each</div></button>
      <div class="stepper"><button data-act="plan-m" data-id="${r.id}" data-d="-1">−</button><span>${it.meals}</span><button data-act="plan-m" data-id="${r.id}" data-d="1">＋</button></div></div></div>`;
  });
  h += `<div class="sec">Shopping list</div><div class="muted small">The total is for whole packs, so things like oil, spices and protein powder last you weeks. Per-meal cost only counts what you use.</div>`;
  const byShop = {};
  list.forEach(s => { const shop = (s.shops.split('·')[0] || 'Anywhere').trim() || 'Anywhere'; (byShop[shop] = byShop[shop] || []).push(s); });
  Object.keys(byShop).sort().forEach(shop => {
    h += `<div class="muted small bold" style="margin:12px 0 0">🛒 Cheapest at ${esc(shop)}</div>`;
    byShop[shop].sort((a, b) => a.name.localeCompare(b.name)).forEach(s => {
      const got = !!S.plan.got[s.id];
      h += `<div class="shop-item ${got ? 'got' : ''}"><button class="tick ${got ? 'on' : ''}" data-act="got" data-id="${esc(s.id)}">${got ? '✓' : ''}</button>
        <span class="grow"><div class="bold">${esc(s.name)}</div><div class="muted small">need ${fmtQty(s.g)}${s.packs != null ? ' → buy ' + s.packs + ' × ' + fmtQty(s.pack) : ''}${s.shops.includes('·') ? ' · or ' + esc(s.shops.split('·').slice(1).join('·').trim()) : ''}</div></span>
        <span class="price">${s.cost != null ? money(s.cost) : '–'}</span></div>`;
    });
  });
  h += `<button class="secondary wide" data-act="plan-untick">Untick everything</button><button class="danger-link wide" data-act="plan-clear">Clear the plan</button>`;
  return h;
}};

/* ---------- recipe builder ---------- */
function editRecipe(r, copyOf){
  const src = r || copyOf;
  const d = src ? {name:(copyOf ? src.name + ' (mine)' : src.name), methods:src.methods.slice(), time:src.time, serves:src.serves, tags:(src.tags || []).join(', '), keeps:src.keeps || '',
      steps:(src.steps || []).join('\n'), ing:ingsOf(src).map(i => ({key:i.key || '', name:i.name, g:i.g, note:i.note || '', pack:i.pack || null, price:i.price != null ? i.price : null, shops:i.shops || ''}))}
    : {name:'', methods:[], time:20, serves:4, tags:'', keeps:'', steps:'', ing:[]};
  if (copyOf) ingsOf(copyOf).forEach(i => { if (i.key) cacheFood({key:i.key, name:i.name, brand:'', src:i.key.startsWith('g') ? 'gen' : 'uk', nutr:i.nutr}); });
  openSheet((b, sh) => {
    const tmp = {serves:d.serves, ing:d.ing.map(x => Object.assign({}, x))};
    const c = calcRecipe(tmp);
    html(b, `<h2>${r ? 'Edit recipe' : 'New recipe'}</h2>
      <label class="f">Name</label><input class="text-in" data-k="name" value="${esc(d.name)}" placeholder="e.g. Garlic chilli chicken">
      <label class="f">How it's cooked (pick any)</label>
      <div class="pills">${Object.entries(METHODS).map(([k, v]) => `<button class="pill ${d.methods.includes(k) ? 'on' : ''}" data-meth="${k}">${v[1]} ${v[0]}</button>`).join('')}</div>
      <div class="grid2"><div><label class="f">Minutes</label><input class="text-in" data-k="time" inputmode="numeric" value="${d.time}"></div>
      <div><label class="f">Meals it makes</label><input class="text-in" data-k="serves" inputmode="numeric" value="${d.serves}"></div></div>
      <label class="f">Tags (comma separated)</label><input class="text-in" data-k="tags" value="${esc(d.tags)}" placeholder="high protein, meal prep">
      <label class="f">Keeps for</label><input class="text-in" data-k="keeps" value="${esc(d.keeps)}" placeholder="Fridge 3 days">
      <div class="sec">Ingredients</div>
      ${d.ing.map((i, k) => `<div class="card" style="padding:10px 12px"><div class="item"><b class="grow ellipsis">${esc(i.name)}</b><button class="icon" data-rm="${k}">✕</button></div>
        <div class="grid2"><div><label class="f">Grams</label><input class="text-in" data-ig="${k}" inputmode="decimal" value="${r1(i.g)}"></div>
        <div><label class="f">Pack £ / size g</label><button class="secondary" style="width:100%" data-ip="${k}">${i.price != null && i.pack ? money(i.price) + ' / ' + fmtQty(i.pack) : 'Add price'}</button></div></div></div>`).join('')}
      <button class="secondary wide" id="radd">＋ Add ingredient</button>
      <div class="card small" style="margin-top:12px">Per meal: <b>${fmtNum(c.per[0] || 0)} kcal</b> · P ${Math.round(c.per[1] || 0)}g · C ${Math.round(c.per[2] || 0)}g · F ${Math.round(c.per[3] || 0)}g · <b class="price">${money(c.perCost || 0)}</b></div>
      <label class="f">Method (one step per line)</label><textarea data-k="steps" placeholder="Preheat the air fryer to 200°C…">${esc(d.steps)}</textarea>
      <button class="primary wide" id="rsave">Save recipe</button>`);
    b.querySelectorAll('[data-k]').forEach(i => i.oninput = () => { d[i.dataset.k] = i.value; });
    b.querySelectorAll('[data-ig]').forEach(i => i.onchange = () => { d.ing[+i.dataset.ig].g = num(i.value) || 0; sh.refresh(); });
    on(b, '[data-meth]', btn => { const k = btn.dataset.meth; d.methods = d.methods.includes(k) ? d.methods.filter(x => x !== k) : d.methods.concat(k); sh.refresh(); });
    on(b, '[data-rm]', btn => { d.ing.splice(+btn.dataset.rm, 1); sh.refresh(); });
    on(b, '[data-ip]', btn => {
      const i = d.ing[+btn.dataset.ip];
      ask(i.name, [{k:'price', label:'Pack price (£)', v:i.price != null ? i.price : '', type:'number'}, {k:'pack', label:'Pack size (g)', v:i.pack || '', type:'number'}, {k:'shops', label:'Where to buy', v:i.shops, ph:'e.g. Aldi · Tesco'}],
        o => { Object.assign(i, {price:o.price, pack:o.pack, shops:o.shops}); sh.refresh(); });
    });
    on(b, '#radd', () => openFoodSearch({onPick:(f, g) => {
      d.ing.push({key:f.key, name:f.name + (f.brand && f.src !== 'gen' ? ' (' + f.brand + ')' : ''), g, note:'', pack:packGrams(f.qty), price:null, shops:f.stores || ''});
      sh.refresh();
    }}));
    on(b, '#rsave', () => {
      if (!d.name.trim()) return toast('Give the recipe a name');
      if (!d.methods.length) return toast('Pick how it\'s cooked');
      if (!d.ing.length) return toast('Add at least one ingredient');
      const rec = {id:r ? r.id : 'my' + uid(), name:d.name.trim(), methods:d.methods, time:num(d.time) || 0, serves:Math.max(1, Math.round(num(d.serves) || 1)),
        tags:d.tags.split(',').map(s => s.trim().toLowerCase()).filter(Boolean), keeps:d.keeps.trim(),
        ing:d.ing.map(i => ({key:i.key, name:i.name, g:i.g, note:i.note, pack:i.pack, price:i.price, shops:i.shops})),
        steps:d.steps.split('\n').map(s => s.trim()).filter(Boolean)};
      if (r) Object.assign(r, rec); else S.myRecipes.push(rec);
      save(); closeSheet(); render(); toast('Recipe saved');
      openRecipe(r || rec);
    });
  }, {full:true});
}

/* ---------- QR share / import ---------- */
function recipeCode(r){
  if (!isMine(r)) return 'GTR1:' + JSON.stringify({b:r.id});
  return 'GTR1:' + JSON.stringify({n:r.name, m:r.methods, t:r.time, s:r.serves, tg:r.tags, k:r.keeps,
    i:r.ing.map(i => [i.key, Math.round(i.g), i.name, i.pack || 0, i.price == null ? -1 : i.price, i.shops || '']), st:r.steps});
}
function shareRecipeQR(r){
  const text = recipeCode(r);
  openSheet(b => {
    html(b, `<h2>Share “${esc(r.name)}”</h2><div id="qrbox" style="background:#fff;border-radius:14px;padding:14px;max-width:320px;margin:0 auto"></div>
      <div class="muted small" style="text-align:center;margin-top:10px">Your mate opens Gym Tracker → Food → Scan, and points it at this code. The recipe, its macros and prices get saved to their phone.</div>
      <button class="primary wide" data-c>Done</button>`);
    on(b, '[data-c]', closeSheet);
    try {
      const svg = new ZXing.BrowserQRCodeSvgWriter().write(text, 290, 290);
      svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%'); svg.setAttribute('viewBox', '0 0 290 290');
      b.querySelector('#qrbox').appendChild(svg);
    } catch(e) { b.querySelector('#qrbox').innerHTML = '<div style="color:#000">This recipe is too long for one QR code. Shorten the method steps and try again.</div>'; }
  });
}
async function genByKey(key){
  const db = await ensureDB('gen');
  if (!db.keys) { db.keys = new Map(); db.lines.forEach((l, i) => db.keys.set(l.slice(0, l.indexOf('\t')), i)); }
  const i = db.keys.get(key); return i == null ? null : lineToFood(db.lines[i], 'gen');
}
async function importRecipeCode(text){
  let o; try { o = JSON.parse(text.slice(5)); } catch(e) { return toast('That QR code is damaged'); }
  if (o.b) { const r = recipeById(o.b); if (r) { go('recipes', 'browse'); openRecipe(r); } else toast('Recipe not found in this version'); return; }
  toast('Importing recipe…');
  const ing = [];
  for (const [key, g, name, pack, price, shops] of o.i || []) {
    if (key && !S.food.cache[key]) {
      const f = key.startsWith('g') ? await genByKey(key) : /^\d+$/.test(key) ? await ukByCode(key) : null;
      if (f) cacheFood(f);
    }
    ing.push({key, g, name, note:'', pack:pack || null, price:price < 0 ? null : price, shops});
  }
  const rec = {id:'my' + uid(), name:o.n || 'Shared recipe', methods:o.m || [], time:o.t || 0, serves:o.s || 1, tags:o.tg || [], keeps:o.k || '', ing, steps:o.st || []};
  S.myRecipes.push(rec); save(); go('recipes', 'browse'); openRecipe(rec); toast('Recipe saved to your recipes');
}

/* ---------- actions ---------- */
Object.assign(ACTIONS, {
  rmethod: b => { rMethod = b.dataset.m; render(); },
  rtag: b => { rTag = rTag === b.dataset.t ? '' : b.dataset.t; render(); },
  recipe: b => { const r = recipeById(b.dataset.id); if (r) openRecipe(r); },
  'recipe-new': () => editRecipe(null),
  'plan-m': b => {
    const it = S.plan.items.find(x => x.rid === b.dataset.id); if (!it) return;
    it.meals += +b.dataset.d;
    if (it.meals <= 0) S.plan.items = S.plan.items.filter(x => x !== it);
    save(); render();
  },
  got: b => { const id = b.dataset.id; if (S.plan.got[id]) delete S.plan.got[id]; else S.plan.got[id] = 1; save(); render(); },
  'plan-untick': () => { S.plan.got = {}; save(); render(); },
  'plan-clear': () => { if (confirm('Clear the whole meal prep plan?')) { S.plan = {items:[], got:{}}; save(); render(); } }
});
Object.assign(FIELDS, {
  rq: (el, ev) => {
    if (ev !== 'input') return;
    rQuery = el.value;
    clearTimeout(FIELDS.rq.t);
    FIELDS.rq.t = setTimeout(() => { const pos = el.selectionStart; render(); const n = $('[data-field="rq"]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch(e) {} } }, 250);
  },
  rsort: (el, ev) => { if (ev === 'change') { rSort = el.value; render(); } }
});
