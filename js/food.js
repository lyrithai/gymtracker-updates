'use strict';
/* ================= food: databases, diary, nutrients, scanning ================= */
// Same order as tools/build_foods.py. rdi: UK reference nutrient intake for adults ({m,f} or one number). limit = upper guide, not a target.
const NUTR = [
  {k:'kcal', l:'Energy', u:'kcal', g:'Macros'}, {k:'protein', l:'Protein', u:'g', g:'Macros'},
  {k:'carbs', l:'Carbs', u:'g', g:'Macros'}, {k:'fat', l:'Fat', u:'g', g:'Macros'},
  {k:'fiber', l:'Fibre', u:'g', g:'Carbs', rdi:30}, {k:'sugar', l:'Sugars', u:'g', g:'Carbs', rdi:90, limit:true},
  {k:'satfat', l:'Saturated fat', u:'g', g:'Fats', rdi:{m:30, f:20}, limit:true}, {k:'mono', l:'Monounsaturated', u:'g', g:'Fats'},
  {k:'poly', l:'Polyunsaturated', u:'g', g:'Fats'}, {k:'trans', l:'Trans fat', u:'g', g:'Fats'},
  {k:'chol', l:'Cholesterol', u:'mg', g:'Fats', rdi:300, limit:true}, {k:'sodium', l:'Sodium', u:'mg', g:'Minerals', rdi:2400, limit:true},
  {k:'potassium', l:'Potassium', u:'mg', g:'Minerals', rdi:3500}, {k:'calcium', l:'Calcium', u:'mg', g:'Minerals', rdi:700},
  {k:'iron', l:'Iron', u:'mg', g:'Minerals', rdi:{m:8.7, f:14.8}}, {k:'magnesium', l:'Magnesium', u:'mg', g:'Minerals', rdi:{m:300, f:270}},
  {k:'phosphorus', l:'Phosphorus', u:'mg', g:'Minerals', rdi:550}, {k:'zinc', l:'Zinc', u:'mg', g:'Minerals', rdi:{m:9.5, f:7}},
  {k:'copper', l:'Copper', u:'mg', g:'Minerals', rdi:1.2}, {k:'manganese', l:'Manganese', u:'mg', g:'Minerals', rdi:1.4},
  {k:'selenium', l:'Selenium', u:'µg', g:'Minerals', rdi:{m:75, f:60}}, {k:'iodine', l:'Iodine', u:'µg', g:'Minerals', rdi:140},
  {k:'vita', l:'Vitamin A', u:'µg', g:'Vitamins', rdi:{m:700, f:600}}, {k:'vitd', l:'Vitamin D', u:'µg', g:'Vitamins', rdi:10},
  {k:'vite', l:'Vitamin E', u:'mg', g:'Vitamins', rdi:{m:4, f:3}}, {k:'vitk', l:'Vitamin K', u:'µg', g:'Vitamins', rdi:70},
  {k:'b1', l:'Thiamin (B1)', u:'mg', g:'Vitamins', rdi:{m:1.0, f:0.8}}, {k:'b2', l:'Riboflavin (B2)', u:'mg', g:'Vitamins', rdi:{m:1.3, f:1.1}},
  {k:'b3', l:'Niacin (B3)', u:'mg', g:'Vitamins', rdi:{m:16.5, f:13.2}}, {k:'b6', l:'Vitamin B6', u:'mg', g:'Vitamins', rdi:{m:1.4, f:1.2}},
  {k:'b12', l:'Vitamin B12', u:'µg', g:'Vitamins', rdi:1.5}, {k:'folate', l:'Folate', u:'µg', g:'Vitamins', rdi:200},
  {k:'b5', l:'Pantothenic acid (B5)', u:'mg', g:'Vitamins', rdi:6}, {k:'biotin', l:'Biotin', u:'µg', g:'Vitamins', rdi:50},
  {k:'vitc', l:'Vitamin C', u:'mg', g:'Vitamins', rdi:40}, {k:'omega3', l:'Omega-3', u:'g', g:'Fats', rdi:{m:1.6, f:1.1}},
  {k:'alcohol', l:'Alcohol', u:'g', g:'Other'}, {k:'water', l:'Water', u:'g', g:'Other'},
  {k:'caffeine', l:'Caffeine', u:'mg', g:'Other', rdi:400, limit:true}
];
const NI = {}; NUTR.forEach((n, i) => NI[n.k] = i);
const OFF_COLS = [['energy-kcal_100g',1],['proteins_100g',1],['carbohydrates_100g',1],['fat_100g',1],['fiber_100g',1],['sugars_100g',1],
  ['saturated-fat_100g',1],['monounsaturated-fat_100g',1],['polyunsaturated-fat_100g',1],['trans-fat_100g',1],['cholesterol_100g',1e3],
  ['sodium_100g',1e3],['potassium_100g',1e3],['calcium_100g',1e3],['iron_100g',1e3],['magnesium_100g',1e3],['phosphorus_100g',1e3],
  ['zinc_100g',1e3],['copper_100g',1e3],['manganese_100g',1e3],['selenium_100g',1e6],['iodine_100g',1e6],['vitamin-a_100g',1e6],
  ['vitamin-d_100g',1e6],['vitamin-e_100g',1e3],['vitamin-k_100g',1e6],['vitamin-b1_100g',1e3],['vitamin-b2_100g',1e3],
  ['vitamin-pp_100g',1e3],['vitamin-b6_100g',1e3],['vitamin-b12_100g',1e6],['folates_100g',1e6],['pantothenic-acid_100g',1e3],
  ['biotin_100g',1e6],['vitamin-c_100g',1e3],['omega-3-fat_100g',1],['alcohol_100g',1],['water_100g',1],['caffeine_100g',1e3]];
const MEALS = [['breakfast','Breakfast'],['lunch','Lunch'],['dinner','Dinner'],['snacks','Snacks']];
const SRC_BADGE = {uk:['b-uk','UK'], gen:['b-gen','TABLE'], my:['b-my','MINE'], web:['b-web','ONLINE'], rec:['b-rec','RECIPE']};
let foodDate = null;

function rdiFor(n){ if (n.rdi == null) return null; return typeof n.rdi === 'number' ? n.rdi : n.rdi[S.food.profile.sex === 'f' ? 'f' : 'm']; }
function parseNutr(s){ const a = String(s || '').split(','); return NUTR.map((_, i) => { const v = a[i]; return v === undefined || v === '' ? null : +v; }); }
function nutrStr(arr){ const o = arr.map(v => v == null || !isFinite(v) ? '' : String(Math.round(v * 1000) / 1000)); while (o.length && o[o.length - 1] === '') o.pop(); return o.join(','); }

/* ---------- databases ---------- */
const DB = {};
function loadScript(src){ return new Promise((ok, bad) => { const s = document.createElement('script'); s.src = (window.ASSET_BASE || '') + src; s.onload = ok; s.onerror = () => bad(new Error('load ' + src)); document.head.appendChild(s); }); }
const norm = s => s.toLowerCase().replace(/['’`]/g, '').replace(/&amp;/g, '&');
async function ensureDB(which){
  if (DB[which]) return DB[which];
  if (DB[which + '_p']) return DB[which + '_p'];
  DB[which + '_p'] = (async () => {
    await loadScript(which === 'gen' ? 'data/foods_generic.js' : 'data/foods_uk.js');
    const raw = which === 'gen' ? window.DB_GENERIC : window.DB_UK;
    const lines = raw.split('\n');
    const lower = lines.map(l => { const a = l.indexOf('\t'), b = l.indexOf('\t', a + 1), c = l.indexOf('\t', b + 1); return norm(l.slice(a + 1, b) + ' ' + l.slice(b + 1, c)); });
    if (which === 'gen') window.DB_GENERIC = null; else window.DB_UK = null;
    DB[which] = {lines, lower, src: which === 'gen' ? 'gen' : 'uk'};
    return DB[which];
  })();
  return DB[which + '_p'];
}
function lineToFood(line, src){
  const p = line.split('\t');
  return {key:p[0], name:p[1], brand:src === 'gen' ? '' : p[2], cat:src === 'gen' ? p[2] : '', qty:p[3], serving:num(p[4]), stores:p[5], src, nutr:parseNutr(p[7])};
}
async function ukByCode(code){
  const db = await ensureDB('uk');
  if (!db.codes) { db.codes = new Map(); db.lines.forEach((l, i) => db.codes.set(l.slice(0, l.indexOf('\t')), i)); }
  let i = db.codes.get(code);
  if (i == null && code.length === 12) i = db.codes.get('0' + code);   // UPC-A -> EAN-13
  if (i == null && code.length === 13 && code[0] === '0') i = db.codes.get(code.slice(1));
  return i == null ? null : lineToFood(db.lines[i], 'uk');
}

/* ---------- food objects + cache ---------- */
function cacheFood(f){ S.food.cache[f.key] = [f.name, f.brand || '', nutrStr(f.nutr), f.serving || '', f.src, f.qty || '', f.stores || '']; }
function foodFromCache(key){
  const c = S.food.cache[key]; if (!c) return null;
  return {key, name:c[0], brand:c[1], nutr:parseNutr(c[2]), serving:num(c[3]), src:c[4], qty:c[5], stores:c[6] || ''};
}
function packGrams(qty){
  const m = String(qty || '').toLowerCase().replace(',', '.').match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l|cl)\b/);
  if (!m) return null;
  const v = +m[1], u = m[2];
  const g = u === 'kg' || u === 'l' ? v * 1000 : u === 'cl' ? v * 10 : v;
  return g > 0 && g < 20000 ? g : null;
}
function unitsFor(f){
  const u = [['g', 1, 'g']];
  if (f.serving) u.unshift(['serving', f.serving, f.src === 'rec' ? 'portion (' + r1(f.serving) + ' g)' : 'serving (' + r1(f.serving) + ' g)']);
  const pg = packGrams(f.qty); if (pg && pg !== f.serving) u.push(['pack', pg, 'whole pack (' + r1(pg) + ' g)']);
  u.push(['oz', 28.35, 'oz']);
  return u;
}
function scaled(nutr, g){ return nutr.map(v => v == null ? null : v * g / 100); }
function kcalOf(f, g){ return (f.nutr[0] || 0) * g / 100; }

/* ---------- day totals ---------- */
function dayEntries(dk){ return S.food.log[dk] || []; }
function dayTotals(dk){
  const t = NUTR.map(() => 0), known = NUTR.map(() => false);
  dayEntries(dk).forEach(e => {
    const f = foodFromCache(e.key); if (!f) return;
    f.nutr.forEach((v, i) => { if (v != null) { t[i] += v * e.g / 100; known[i] = true; } });
  });
  return {t, known};
}

/* ---------- diary view ---------- */
VIEWS['food/diary'] = {render(){
  foodDate = foodDate || today();
  const T = S.food.targets, {t} = dayTotals(foodDate);
  const left = T.kcal - t[0];
  let h = `<div class="datebar"><button class="icon" data-act="fday" data-d="-1">‹</button><b>${dlabel(foodDate)}</b><button class="icon" data-act="fday" data-d="1">›</button></div>
    <div class="card sum">${ring(t[0], T.kcal, fmtNum(t[0]), left >= 0 ? fmtNum(left) + ' left' : fmtNum(-left) + ' over')}
    <div class="bars">${bar('Protein', t[1], T.protein, 'var(--p)')}${bar('Carbs', t[2], T.carbs, 'var(--c)')}${bar('Fat', t[3], T.fat, 'var(--f)')}</div></div>
    <div class="row" style="margin-bottom:12px"><button class="primary grow" data-act="food-add" data-meal="">＋ Add food</button><button class="secondary" data-act="scan" style="min-width:110px">▦ Scan</button></div>`;
  MEALS.forEach(([m, label]) => {
    const es = dayEntries(foodDate).filter(e => e.meal === m);
    const kc = es.reduce((a, e) => { const f = foodFromCache(e.key); return a + (f ? kcalOf(f, e.g) : 0); }, 0);
    h += `<div class="card"><div class="meal-h"><b>${label}</b><span class="row"><span class="muted small">${fmtNum(kc)} kcal</span><button class="icon" data-act="food-add" data-meal="${m}" aria-label="Add to ${label}">＋</button></span></div>`;
    es.forEach(e => {
      const f = foodFromCache(e.key);
      h += `<button class="entry" data-act="food-entry" data-id="${e.id}"><span class="grow"><div class="nm ellipsis">${esc(f ? f.name : 'Unknown food')}</div>
        <div class="muted small ellipsis">${esc(e.label || r1(e.g) + ' g')}${f && f.brand ? ' · ' + esc(f.brand) : ''} · P ${r1(f ? (f.nutr[1] || 0) * e.g / 100 : 0)}g</div></span>
        <span class="kc">${fmtNum(f ? kcalOf(f, e.g) : 0)}</span></button>`;
    });
    if (!es.length) h += `<div class="muted small">Nothing yet</div>`;
    h += `</div>`;
  });
  h += `<button class="ghost wide" data-act="food-copy">Copy yesterday's food to ${dlabel(foodDate).toLowerCase()}</button>`;
  return h;
}};

function addEntry(dk, meal, f, g, label){
  cacheFood(f);
  (S.food.log[dk] = S.food.log[dk] || []).push({id:uid(), meal, key:f.key, g, label});
  S.food.recent = [f.key, ...S.food.recent.filter(k => k !== f.key)].slice(0, 60);
  save();
}
function defaultMeal(){
  const h = new Date().getHours();
  return h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 21 ? 'dinner' : 'snacks';
}

/* ---------- food detail: amount + nutrition ---------- */
function openFood(f, opt){
  opt = opt || {};   // {entry, dk, meal, onPick(g,label) for recipe builder}
  const units = unitsFor(f);
  let unit = units[0][0], amt = f.serving ? 1 : 100;
  if (opt.entry) { unit = 'g'; amt = r1(opt.entry.g); }
  if (opt.g) { unit = 'g'; amt = opt.g; }
  let meal = opt.entry ? opt.entry.meal : (opt.meal || defaultMeal());
  let showAll = false;
  openSheet((b, sh) => {
    const uf = (units.find(u => u[0] === unit) || units[0])[1];
    const g = (num(amt) || 0) * uf, n = scaled(f.nutr, g);
    const badge = SRC_BADGE[f.src] || SRC_BADGE.uk;
    const micro = NUTR.map((d, i) => ({d, i})).filter(({i}) => i > 3 && n[i] != null && (showAll || [4,5,6,11,12,13,14,34,23,30].includes(i)));
    html(b, `<h2>${esc(f.name)}</h2>
      <div class="muted small" style="margin:-8px 0 10px"><span class="badge ${badge[0]}">${badge[1]}</span>${esc([f.brand, f.qty].filter(Boolean).join(' · '))}${f.stores ? '<br>Sold at: ' + esc(f.stores) : ''}</div>
      <div class="amt"><input class="text-in" id="famt" inputmode="decimal" value="${esc(amt)}"><select id="funit">${units.map(u => `<option value="${u[0]}" ${u[0] === unit ? 'selected' : ''}>${esc(u[2])}</option>`).join('')}</select></div>
      <div class="macro4"><div><b>${fmtNum(n[0] || 0)}</b><span>kcal</span></div><div><b style="color:var(--p)">${r1(n[1] || 0)}</b><span>protein</span></div>
        <div><b style="color:var(--c)">${r1(n[2] || 0)}</b><span>carbs</span></div><div><b style="color:var(--f)">${r1(n[3] || 0)}</b><span>fat</span></div></div>
      <div class="muted tiny" style="margin-bottom:6px">${r1(g)} g · per 100 g: ${fmtNum(f.nutr[0] || 0)} kcal, ${r1(f.nutr[1] || 0)} g protein</div>
      ${micro.map(({d, i}) => `<div class="item small" style="padding:5px 0;border-bottom:1px solid var(--line)"><span class="muted">${d.l}</span><span>${r1(n[i])} ${d.u}</span></div>`).join('')}
      <button class="ghost" id="fmore">${showAll ? 'Show less' : 'All nutrients'}</button>
      ${opt.onPick ? '' : `<label class="f">Meal</label><div class="seg">${MEALS.map(([k, l]) => `<button data-meal="${k}" class="${meal === k ? 'on' : ''}">${l}</button>`).join('')}</div>`}
      <button class="primary wide" id="fok">${opt.onPick ? 'Use this amount' : opt.entry ? 'Update' : 'Add to ' + dlabel(opt.dk || foodDate || today()).toLowerCase()}</button>
      ${opt.entry ? '<button class="danger-link wide" id="fdel">Remove from diary</button>' : ''}
      ${f.src === 'my' ? '<button class="ghost wide" id="fedit">Edit this food</button>' : ''}`);
    const ai = b.querySelector('#famt'), us = b.querySelector('#funit');
    ai.oninput = () => { amt = ai.value; const pos = ai.selectionStart; sh.refresh(); const n2 = sh.body.querySelector('#famt'); n2.focus(); try { n2.setSelectionRange(pos, pos); } catch(e) {} };
    us.onchange = () => { unit = us.value; amt = unit === 'g' ? r1(g || 100) : unit === 'oz' ? r1((g || 100) / 28.35) : 1; sh.refresh(); };
    on(b, '#fmore', () => { showAll = !showAll; sh.refresh(); });
    on(b, '[data-meal]', btn => { meal = btn.dataset.meal; sh.refresh(); });
    on(b, '#fok', () => {
      if (!(g > 0)) return toast('Enter an amount');
      const u = units.find(x => x[0] === unit);
      const label = unit === 'g' ? r1(g) + ' g' : r1(num(amt)) + ' × ' + u[2];
      if (opt.onPick) { closeSheet(); opt.onPick(g, label); return; }
      if (opt.entry) { Object.assign(opt.entry, {g, meal, label}); cacheFood(f); save(); }
      else addEntry(opt.dk || foodDate || today(), meal, f, g, label);
      closeSheet(); if (opt.after) opt.after(); render(); toast(opt.entry ? 'Updated' : 'Added ' + fmtNum(n[0] || 0) + ' kcal');
    });
    on(b, '#fdel', () => {
      const dk = opt.dk; S.food.log[dk] = dayEntries(dk).filter(e => e !== opt.entry); save(); closeSheet(); render();
    });
    on(b, '#fedit', () => { closeSheet(); editMyFood(S.food.mine.find(m => m.key === f.key)); });
  });
}

/* ---------- search ---------- */
function searchLines(db, tokens, max){
  const out = [], L = db.lower, first = tokens[0];
  for (let i = 0; i < L.length; i++) {
    const s = L[i];
    let ok = true;
    for (const t of tokens) if (s.indexOf(t) < 0) { ok = false; break; }
    if (!ok) continue;
    let sc = 0;
    if (s.startsWith(first)) sc += 4;
    for (const t of tokens) { const k = s.indexOf(t); if (k === 0 || s[k - 1] === ' ' || s[k - 1] === ',') sc += 1; }
    sc -= s.length / 120;
    if (db.src === 'uk') sc -= i / L.length * 2;  // popular (most scanned) first
    out.push([sc, i]);
    if (out.length > 4000) break;
  }
  out.sort((a, b) => b[0] - a[0]);
  return out.slice(0, max).map(([, i]) => lineToFood(db.lines[i], db.src));
}
function myFoodsAsFoods(){
  const mine = S.food.mine.map(m => ({key:m.key, name:m.name, brand:m.brand, serving:m.serving, qty:'', src:'my', nutr:parseNutr(m.nutr)}));
  const recs = allRecipes().map(r => recipeAsFood(r));
  return mine.concat(recs);
}
function tokensOf(q){ return norm(q).split(/[\s,]+/).filter(Boolean); }

function openFoodSearch(opt){
  opt = opt || {};   // {meal, dk, onPick(food, g, label)}
  let q = '', filter = 'all', web = null, webBusy = false, loading = false;
  openSheet((b, sh) => {
    html(b, `<h2>${opt.onPick ? 'Add ingredient' : 'Add food'}</h2>
      <div class="row"><input class="text-in grow" id="fq" placeholder="Search 155,000+ foods" value="${esc(q)}"><button class="secondary" id="fscan" style="min-width:56px">▦</button></div>
      <div class="pills" style="margin:8px 0">${[['all','All'],['recent','Recent'],['my','Mine & recipes'],['uk','UK shops'],['gen','Basic foods']].map(([k, l]) => `<button class="pill ${filter === k ? 'on' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
      <div id="fres"></div>`);
    const inp = b.querySelector('#fq');
    if (!q) setTimeout(() => inp.focus(), 250);
    let timer = 0;
    inp.oninput = () => {
      q = inp.value; web = null; clearTimeout(timer); timer = setTimeout(draw, 180);
      if (tokensOf(q).length) res.innerHTML = '<div class="empty">Searching…</div>';
    };
    on(b, '[data-f]', btn => { filter = btn.dataset.f; sh.refresh(); });
    on(b, '#fscan', () => openScanner(f => pick(f)));
    const res = b.querySelector('#fres');
    function pick(f){
      if (opt.onPick) openFood(f, {onPick:(g, label) => { cacheFood(f); closeSheet(); opt.onPick(f, g, label); }});
      else openFood(f, {meal:opt.meal, dk:opt.dk, after:() => closeSheet()});
    }
    function rows(list){
      return list.map((f, i) => { const bd = SRC_BADGE[f.src];
        return `<button class="food-row" data-i="${i}"><span class="grow"><div class="nm ellipsis">${esc(f.name)}</div>
          <div class="muted small ellipsis"><span class="badge ${bd[0]}">${bd[1]}</span>${esc([f.brand, f.qty].filter(Boolean).join(' · ') || f.cat || '')}</div></span>
          <span class="kc">${fmtNum(f.nutr[0] || 0)}<div class="muted tiny">kcal/100g</div></span></button>`; }).join('');
    }
    async function draw(){
      const tokens = tokensOf(q);
      let list = [], note = '';
      if (filter === 'recent' || (!tokens.length && filter === 'all')) {
        list = S.food.recent.map(foodFromCache).filter(Boolean);
        if (tokens.length) list = list.filter(f => tokens.every(t => norm(f.name + ' ' + (f.brand || '')).includes(t)));
        if (!list.length) note = tokens.length ? '' : 'Type to search UK shop products (Tesco, Sainsbury\'s, Aldi, Lidl, Asda…) and basic foods, or scan a barcode.';
      } else {
        const mine = myFoodsAsFoods().filter(f => tokens.every(t => norm(f.name + ' ' + (f.brand || '')).includes(t)));
        if (filter === 'all' || filter === 'my') list = list.concat(mine.slice(0, filter === 'my' ? 100 : 8));
        if (tokens.length && (filter === 'all' || filter === 'gen' || filter === 'uk')) {
          if (!DB.gen || !DB.uk) { loading = true; res.innerHTML = '<div class="empty">Loading the food database…</div>'; }
          const [gen, uk] = await Promise.all([ensureDB('gen'), ensureDB('uk')]);
          loading = false;
          if (tokensOf(q).join(' ') !== tokens.join(' ')) return;   // typed more meanwhile
          if (filter === 'all' || filter === 'gen') list = list.concat(searchLines(gen, tokens, filter === 'gen' ? 60 : 8));
          if (filter === 'all' || filter === 'uk') list = list.concat(searchLines(uk, tokens, filter === 'uk' ? 80 : 40));
        }
      }
      if (web) list = list.concat(web);
      res.innerHTML = (note ? `<div class="empty">${note}</div>` : '') + rows(list) +
        (tokens.length && !list.length && !webBusy ? '<div class="empty">No matches on this phone.</div>' : '') +
        (tokens.length ? `<button class="secondary wide" id="fweb">${webBusy ? 'Searching online…' : web ? 'Online results added above' : 'Search Open Food Facts online'}</button>` : '') +
        `<button class="ghost wide" id="fnew">＋ Create a food${tokens.length ? ' “' + esc(q.trim()) + '”' : ''}</button>`;
      on(res, '[data-i]', btn => pick(list[+btn.dataset.i]));
      on(res, '#fweb', async () => {
        if (webBusy || web) return;
        webBusy = true; draw();
        try { web = await offSearch(q); if (!web.length) toast('Nothing found online either'); }
        catch(e) { web = null; toast('Online search didn\'t work. Open Food Facts allows about 10 searches a minute, so try again shortly (or check your internet).'); }
        webBusy = false; draw();
      });
      on(res, '#fnew', () => editMyFood(null, {name:q.trim(), after:f => pick(f)}));
    }
    draw();
  }, {full:true});
}

/* ---------- Open Food Facts online ---------- */
const OFF_FIELDS = 'code,product_name,generic_name,brands,quantity,serving_quantity,stores,nutriments';
function offToFood(p){
  const n = p.nutriments || {};
  const vals = OFF_COLS.map(([c, f]) => { const v = n[c]; return v === undefined || v === '' || !isFinite(+v) ? null : +v * f; });
  if (vals[0] == null && n['energy-kj_100g'] != null) vals[0] = n['energy-kj_100g'] / 4.184;
  if (vals[0] == null || vals[1] == null || vals[2] == null || vals[3] == null) return null;
  const name = (p.product_name || p.generic_name || '').trim(); if (!name) return null;
  return {key:String(p.code), name, brand:(p.brands || '').split(',')[0].trim(), qty:p.quantity || '', serving:num(p.serving_quantity),
    stores:(p.stores || '').split(',').slice(0, 4).join(', '), src:'web', nutr:vals};
}
async function offSearch(q){
  // uk. only returns products sold in the UK; world. is the fallback. Both are rate limited (about 10 searches a minute).
  const path = '/cgi/search.pl?action=process&json=1&search_simple=1&page_size=30&fields=' + OFF_FIELDS + '&search_terms=' + encodeURIComponent(q);
  let lastErr;
  for (const host of ['https://uk.openfoodfacts.org', 'https://world.openfoodfacts.org']) {
    try {
      const r = await fetch(host + path); if (!r.ok) throw new Error('http ' + r.status);
      const j = await r.json();
      return (j.products || []).map(offToFood).filter(Boolean);
    } catch(e) { lastErr = e; }
  }
  throw lastErr;
}
async function offProduct(code){
  const r = await fetch('https://world.openfoodfacts.org/api/v2/product/' + encodeURIComponent(code) + '.json?fields=' + OFF_FIELDS);
  if (!r.ok) return null;
  const j = await r.json();
  return j && j.product ? offToFood(Object.assign({code}, j.product)) : null;
}
async function lookupBarcode(code){
  const mine = S.food.mine.find(m => m.barcode === code);
  if (mine) return {key:mine.key, name:mine.name, brand:mine.brand, serving:mine.serving, src:'my', nutr:parseNutr(mine.nutr)};
  const c = foodFromCache(code); if (c) return c;
  const local = await ukByCode(code); if (local) return local;
  try { return await offProduct(code); } catch(e) { return null; }
}

/* ---------- barcode / QR scanner ---------- */
function openScanner(onFood){
  let reader = null, done = false;
  const sh = openSheet(b => {
    html(b, `<h2>Scan a barcode or QR code</h2>
      <div class="scan-box"><video id="svid" playsinline muted></video><div class="aim"></div></div>
      <div class="muted small" style="text-align:center;margin:8px 0" id="smsg">Point the camera at a food barcode, or a recipe QR code from a friend</div>
      <label class="f">Or type the barcode number</label>
      <div class="row"><input class="text-in grow" id="scode" inputmode="numeric" placeholder="e.g. 5000159484695"><button class="secondary" id="sgo" style="min-width:70px">Find</button></div>`);
    on(b, '#sgo', () => { const v = b.querySelector('#scode').value.trim(); if (v) handle(v); });
  }, {full:true});
  sh.onClose = () => { done = true; try { reader && reader.reset(); } catch(e) {} };
  const msg = t => { const m = sh.body.querySelector('#smsg'); if (m) m.textContent = t; };
  async function handle(text){
    if (done) return; done = true;
    try { reader && reader.reset(); } catch(e) {}
    text = String(text).trim();
    if (text.startsWith('GTR1:')) { closeSheet(); importRecipeCode(text); return; }
    const m = text.match(/openfoodfacts\.org\/product\/(\d{8,14})/);
    const code = m ? m[1] : (/^\d{8,14}$/.test(text) ? text : null);
    if (!code) { closeSheet(); openSheet(b => { html(b, `<h2>QR code</h2><div class="card" style="word-break:break-word">${esc(text)}</div><button class="primary wide" data-c>Close</button>`); on(b, '[data-c]', closeSheet); }); return; }
    msg('Looking up ' + code + '…');
    const f = await lookupBarcode(code);
    closeSheet();
    if (f) { onFood(f); return; }
    if (confirm('Barcode ' + code + ' isn\'t in the database yet. Add it yourself from the label?')) editMyFood(null, {barcode:code, after:onFood});
  }
  if (!window.ZXing) { msg('Scanner failed to load. Type the number instead.'); return; }
  try {
    const hints = new Map();
    const F_ = ZXing.BarcodeFormat;
    hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [F_.EAN_13, F_.EAN_8, F_.UPC_A, F_.UPC_E, F_.QR_CODE, F_.CODE_128]);
    hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
    reader = new ZXing.BrowserMultiFormatReader(hints, 250);
    reader.decodeFromConstraints({video:{facingMode:'environment', width:{ideal:1280}, height:{ideal:720}}}, sh.body.querySelector('#svid'), (res) => {
      if (res && !done) { try { navigator.vibrate && navigator.vibrate(60); } catch(e) {} handle(res.getText()); }
    }).catch(() => msg('Camera not available. Allow camera access, or type the number below.'));
  } catch(e) { msg('Camera not available. Type the number below.'); }
}

/* ---------- my foods ---------- */
function editMyFood(m, opt){
  opt = opt || {};
  const isNew = !m;
  const n = m ? parseNutr(m.nutr) : NUTR.map(() => null);
  const d = m ? {name:m.name, brand:m.brand || '', serving:m.serving || '', barcode:m.barcode || ''} : {name:opt.name || '', brand:'', serving:'', barcode:opt.barcode || ''};
  let per = 'g100';
  const fields = [['kcal','Calories (kcal)'],['protein','Protein (g)'],['carbs','Carbs (g)'],['sugar','of which sugars (g)'],['fat','Fat (g)'],['satfat','of which saturates (g)'],['fiber','Fibre (g)']];
  const vals = {}; fields.forEach(([k]) => vals[k] = n[NI[k]] == null ? '' : r1(n[NI[k]]));
  vals.salt = n[NI.sodium] == null ? '' : r1(n[NI.sodium] / 400);
  openSheet((b, sh) => {
    html(b, `<h2>${isNew ? 'Create a food' : 'Edit food'}</h2>
      <label class="f">Name</label><input class="text-in" data-k="name" value="${esc(d.name)}" placeholder="e.g. Mum's lasagne">
      <div class="grid2"><div><label class="f">Brand / shop</label><input class="text-in" data-k="brand" value="${esc(d.brand)}"></div>
      <div><label class="f">Serving size (g)</label><input class="text-in" data-k="serving" inputmode="decimal" value="${esc(d.serving)}"></div></div>
      <label class="f">Barcode (optional, links scans to this food)</label><input class="text-in" data-k="barcode" inputmode="numeric" value="${esc(d.barcode)}">
      <label class="f">Nutrition values are</label>
      <div class="seg"><button data-per="g100" class="${per === 'g100' ? 'on' : ''}">per 100 g</button><button data-per="srv" class="${per === 'srv' ? 'on' : ''}">per serving</button></div>
      <div class="grid2">${fields.map(([k, l]) => `<div><label class="f">${l}</label><input class="text-in" data-v="${k}" inputmode="decimal" value="${esc(vals[k])}"></div>`).join('')}
      <div><label class="f">Salt (g)</label><input class="text-in" data-v="salt" inputmode="decimal" value="${esc(vals.salt)}"></div></div>
      <button class="primary wide" id="msave">Save food</button>
      ${isNew ? '' : '<button class="danger-link wide" id="mdel">Delete food</button>'}`);
    b.querySelectorAll('[data-k]').forEach(i => i.oninput = () => d[i.dataset.k] = i.value);
    b.querySelectorAll('[data-v]').forEach(i => i.oninput = () => vals[i.dataset.v] = i.value);
    on(b, '[data-per]', btn => { per = btn.dataset.per; sh.refresh(); });
    on(b, '#msave', () => {
      if (!d.name.trim()) return toast('Give it a name');
      const serving = num(d.serving);
      if (per === 'srv' && !(serving > 0)) return toast('Enter the serving size in grams');
      const k = num(vals.kcal), p = num(vals.protein), c = num(vals.carbs), fa = num(vals.fat);
      if (k == null || p == null || c == null || fa == null) return toast('Calories, protein, carbs and fat are needed');
      const fac = per === 'srv' ? 100 / serving : 1;
      const arr = NUTR.map(() => null);
      fields.forEach(([key]) => { const v = num(vals[key]); if (v != null) arr[NI[key]] = v * fac; });
      const salt = num(vals.salt); if (salt != null) arr[NI.sodium] = salt * 400 * fac;
      const key = m ? m.key : 'my:' + uid();
      const rec = {key, name:d.name.trim(), brand:d.brand.trim(), serving:serving || null, barcode:d.barcode.trim(), nutr:nutrStr(arr)};
      if (m) Object.assign(m, rec); else S.food.mine.push(rec);
      const f = {key, name:rec.name, brand:rec.brand, serving:rec.serving, src:'my', nutr:arr};
      cacheFood(f); save(); closeSheet(); render(); toast('Food saved');
      if (opt.after) opt.after(f);
    });
    on(b, '#mdel', () => { if (!confirm('Delete this food? Diary entries keep their numbers.')) return; S.food.mine = S.food.mine.filter(x => x !== m); save(); closeSheet(); render(); });
  });
}
VIEWS['food/mine'] = {render(){
  let h = `<div class="card"><div class="item"><span><b>Daily targets</b><div class="muted small">${fmtNum(S.food.targets.kcal)} kcal · P ${S.food.targets.protein} · C ${S.food.targets.carbs} · F ${S.food.targets.fat}</div></span>
    <button class="ghost" data-act="targets">Edit</button></div></div>
    <button class="primary big-start" data-act="myfood-new">＋ Create a food</button>
    <div class="sec">My foods (${S.food.mine.length})</div>`;
  if (!S.food.mine.length) h += `<div class="muted small">Foods you add yourself (or that aren't in the database) show up here. Scanning an unknown barcode lets you add it.</div>`;
  S.food.mine.slice().sort((a, b) => a.name.localeCompare(b.name)).forEach(m => {
    const n = parseNutr(m.nutr);
    h += `<button class="food-row" data-act="myfood" data-k="${esc(m.key)}"><span class="grow"><div class="nm ellipsis">${esc(m.name)}</div><div class="muted small">${esc(m.brand || '')}${m.barcode ? ' · ▦ ' + esc(m.barcode) : ''}</div></span>
      <span class="kc">${fmtNum(n[0] || 0)}<div class="muted tiny">kcal/100g</div></span></button>`;
  });
  h += `<div class="sec">Recently logged</div>`;
  const rec = S.food.recent.slice(0, 15).map(foodFromCache).filter(Boolean);
  if (!rec.length) h += `<div class="muted small">Nothing yet.</div>`;
  rec.forEach(f => { h += `<div class="item small" style="padding:6px 0;border-bottom:1px solid var(--line)"><span class="ellipsis">${esc(f.name)}</span><span class="muted">${fmtNum(f.nutr[0] || 0)} kcal/100g</span></div>`; });
  return h;
}};

/* ---------- nutrients view (full breakdown) ---------- */
VIEWS['food/nutrients'] = {render(){
  foodDate = foodDate || today();
  const {t, known} = dayTotals(foodDate), T = S.food.targets;
  const tgt = {kcal:T.kcal, protein:T.protein, carbs:T.carbs, fat:T.fat};
  let h = `<div class="datebar"><button class="icon" data-act="fday" data-d="-1">‹</button><b>${dlabel(foodDate)}</b><button class="icon" data-act="fday" data-d="1">›</button></div>`;
  if (!dayEntries(foodDate).length) return h + `<div class="empty">Log some food to see your vitamins and minerals.</div>`;
  let grp = '';
  NUTR.forEach((n, i) => {
    if (n.g === 'Other' && !known[i]) return;
    if (n.g !== grp) { grp = n.g; h += `<div class="sec">${grp}</div>`; }
    const target = tgt[n.k] != null ? tgt[n.k] : rdiFor(n);
    const v = t[i];
    const pct = target ? v / target * 100 : null;
    const col = !known[i] ? 'var(--line)' : n.limit ? (pct > 100 ? 'var(--danger)' : 'var(--accent)') : (pct >= 100 ? 'var(--accent)' : pct >= 50 ? 'var(--gold)' : 'var(--danger)');
    h += `<div class="nrow"><span>${n.l}${n.limit ? ' <span class="muted tiny">limit</span>' : ''}</span>
      <span class="muted">${known[i] ? r1(v) : '–'} ${n.u}${target ? ' / ' + r1(target) + (pct != null && known[i] ? ' · ' + Math.round(pct) + '%' : '') : ''}</span>
      ${target ? `<div class="track"><i style="width:${known[i] ? clamp(pct, 0, 100) : 0}%;background:${col}"></i></div>` : ''}</div>`;
  });
  h += `<div class="muted tiny" style="margin-top:12px">Targets: your macro goals plus UK reference intakes for adults. Shop products often only list the main nutrients, so vitamins and minerals count what's known; basic foods (TABLE) have the full set.</div>`;
  return h;
}};

/* ---------- targets ---------- */
function suggestTargets(p){
  const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'f' ? -161 : 5);
  let kcal = bmr * p.activity;
  if (p.goal === 'cut') kcal *= 0.8; else if (p.goal === 'bulk') kcal *= 1.1;
  kcal = Math.round(kcal / 10) * 10;
  const protein = Math.round(p.weight * (p.goal === 'cut' ? 2.2 : 2.0));
  const fat = Math.round(kcal * 0.25 / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return {kcal, protein, carbs, fat};
}
function openTargets(){
  const p = Object.assign({}, S.food.profile), T = Object.assign({}, S.food.targets);
  openSheet((b, sh) => {
    const sug = suggestTargets(p);
    html(b, `<h2>Calories & macros</h2>
      <div class="sec">About you</div>
      <div class="seg"><button data-sex="m" class="${p.sex === 'm' ? 'on' : ''}">Male</button><button data-sex="f" class="${p.sex === 'f' ? 'on' : ''}">Female</button></div>
      <div class="grid3"><div><label class="f">Age</label><input class="text-in" data-p="age" inputmode="numeric" value="${p.age}"></div>
      <div><label class="f">Height cm</label><input class="text-in" data-p="height" inputmode="numeric" value="${p.height}"></div>
      <div><label class="f">Weight kg</label><input class="text-in" data-p="weight" inputmode="decimal" value="${p.weight}"></div></div>
      <label class="f">How active</label><select data-p="activity">${[[1.2,'Desk job, little exercise'],[1.375,'Train 1–3 days a week'],[1.55,'Train 3–5 days a week'],[1.725,'Train 6–7 days a week'],[1.9,'Very active job + training']].map(([v, l]) => `<option value="${v}" ${+p.activity === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <label class="f">Goal</label><div class="seg">${[['cut','Lose fat'],['maintain','Maintain'],['bulk','Lean bulk']].map(([k, l]) => `<button data-goal="${k}" class="${p.goal === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="card" style="margin-top:12px"><div class="muted small">Suggested</div><b>${fmtNum(sug.kcal)} kcal</b> · P ${sug.protein} g · C ${sug.carbs} g · F ${sug.fat} g
        <button class="secondary wide" id="tuse">Use these</button></div>
      <div class="sec">Your daily targets</div>
      <div class="grid2">${[['kcal','Calories'],['protein','Protein g'],['carbs','Carbs g'],['fat','Fat g']].map(([k, l]) => `<div><label class="f">${l}</label><input class="text-in" data-t="${k}" inputmode="numeric" value="${T[k]}"></div>`).join('')}</div>
      <button class="primary wide" id="tsave">Save targets</button>`);
    b.querySelectorAll('[data-p]').forEach(i => { const ev = i.tagName === 'SELECT' ? 'onchange' : 'onchange'; i[ev] = () => { p[i.dataset.p] = num(i.value) || p[i.dataset.p]; sh.refresh(); }; });
    b.querySelectorAll('[data-t]').forEach(i => i.oninput = () => T[i.dataset.t] = num(i.value) || 0);
    on(b, '[data-sex]', btn => { p.sex = btn.dataset.sex; sh.refresh(); });
    on(b, '[data-goal]', btn => { p.goal = btn.dataset.goal; sh.refresh(); });
    on(b, '#tuse', () => { Object.assign(T, sug); sh.refresh(); });
    on(b, '#tsave', () => { S.food.profile = p; S.food.targets = T; save(); closeSheet(); render(); toast('Targets saved'); });
  });
}

/* ---------- food actions ---------- */
Object.assign(ACTIONS, {
  fday: b => { foodDate = dadd(foodDate || today(), +b.dataset.d); render(); },
  'food-add': b => openFoodSearch({meal:b.dataset.meal || defaultMeal(), dk:foodDate || today()}),
  'food-entry': b => {
    const dk = foodDate || today(), e = dayEntries(dk).find(x => x.id === b.dataset.id); if (!e) return;
    const f = foodFromCache(e.key); if (f) openFood(f, {entry:e, dk});
  },
  scan: () => openScanner(f => openFood(f, {dk:foodDate || today()})),
  'food-copy': () => {
    const dk = foodDate || today(), src = dayEntries(dadd(dk, -1));
    if (!src.length) return toast('Nothing logged the day before');
    S.food.log[dk] = dayEntries(dk).concat(src.map(e => Object.assign({}, e, {id:uid()})));
    save(); render(); toast('Copied ' + pl(src.length, 'item'));
  },
  targets: () => openTargets(),
  'myfood-new': () => editMyFood(null),
  myfood: b => editMyFood(S.food.mine.find(m => m.key === b.dataset.k))
});
