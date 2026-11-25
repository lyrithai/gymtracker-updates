'use strict';
/* ================= type what you ate: "2 eggs, 2 slices toast with butter, 200g chicken" ================= */
/* Everyday words -> [food table search, grams for one, name for "one"]. Amounts are typical UK portions and can be changed before logging. */
const TYPE_FOODS = [
  [/^(eggs?|boiled eggs?)$/, 'eggs chicken whole boiled', 50, 'egg'], [/^fried eggs?$/, 'eggs chicken fried', 55, 'egg'], [/^poached eggs?$/, 'eggs chicken poached', 50, 'egg'], [/^scrambled eggs?$/, 'eggs scrambled', 60, 'egg'], [/^omelettes?$/, 'omelette', 120, 'omelette'],
  [/^(white )?(toast|bread|slices? of (bread|toast))$/, 'bread white sliced', 38, 'slice'], [/^(brown|wholemeal|wholegrain) (toast|bread)$/, 'bread wholemeal average', 38, 'slice'], [/^bagels?$/, 'bagels plain', 85, 'bagel'], [/^crumpets?$/, 'crumpets', 55, 'crumpet'], [/^croissants?$/, 'croissants', 50, 'croissant'], [/^(tortilla )?wraps?$/, 'tortilla wheat', 61, 'wrap'], [/^pitt?a( bread)?s?$/, 'bread pitta', 60, 'pitta'], [/^naan( bread)?s?$/, 'bread naan', 130, 'naan'],
  [/^bananas?$/, 'bananas flesh only', 100, 'banana'], [/^apples?$/, 'apples eating raw flesh', 130, 'apple'], [/^oranges?$/, 'oranges flesh only', 140, 'orange'], [/^pears?$/, 'pears raw flesh', 140, 'pear'], [/^(satsumas?|clementines?|tangerines?)$/, 'oranges flesh only', 65, 'satsuma'], [/^grapes$/, 'grapes', 100, 'handful'], [/^strawberr(y|ies)$/, 'strawberries raw', 12, 'strawberry'], [/^blueberr(y|ies)$/, 'blueberries', 80, 'handful'], [/^avocados?$/, 'avocado flesh only', 130, 'avocado'], [/^kiwis?$/, 'kiwi fruit flesh', 60, 'kiwi'], [/^mangos?|mangoes$/, 'mangoes ripe raw', 150, 'mango'],
  [/^(porridge|oats|oatmeal)$/, 'porridge oats unfortified', 45, 'bowl (dry oats)'], [/^weetabix$/, 'weetabix', 19, 'biscuit'], [/^(cornflakes|corn flakes)$/, 'corn flakes', 30, 'bowl'], [/^granola$/, 'muesli crunchy nuts', 45, 'bowl'],
  [/^(chicken|chicken breasts?|grilled chicken)$/, 'chicken breast grilled without skin', 130, 'breast'], [/^chicken thighs?$/, 'chicken thighs casseroled meat only diced', 90, 'thigh'], [/^(beef )?mince$/, 'beef mince stewed', 125, 'portion'], [/^steaks?$/, 'beef rump steak grilled lean', 180, 'steak'], [/^bacon$|^(rashers?|slices?) of bacon$/, 'bacon rashers back grilled', 25, 'rasher'], [/^sausages?$/, 'sausages pork grilled', 45, 'sausage'], [/^ham$/, 'ham', 25, 'slice'], [/^turkey$/, 'turkey breast', 100, 'portion'], [/^salmon( fillets?)?$/, 'salmon farmed flesh only grilled', 120, 'fillet'], [/^tuna$|^tins? of tuna$/, 'tuna canned in brine drained', 102, 'tin'], [/^(cod|white fish)$/, 'cod flesh only baked', 130, 'fillet'], [/^prawns$/, 'prawns king purchased cooked', 80, 'portion'], [/^fish fingers?$/, 'fish fingers grilled', 28, 'finger'], [/^tofu$/, 'tofu soya bean steamed', 100, 'portion'],
  [/^(rice|white rice)$/, 'rice white boiled', 180, 'portion (cooked)'], [/^brown rice$/, 'rice brown boiled', 180, 'portion (cooked)'], [/^pasta|spaghetti$/, 'pasta white boiled', 220, 'portion (cooked)'], [/^noodles$/, 'noodles egg boiled', 200, 'portion (cooked)'], [/^(potato|potatoes|boiled potatoes)$/, 'potatoes old boiled', 175, 'portion'], [/^(jacket potato|baked potato)(es)?$/, 'potatoes baked flesh and skin', 220, 'potato'], [/^mash(ed potato(es)?)?$/, 'potatoes mashed', 180, 'portion'], [/^(chips)$/, 'chips oven', 165, 'portion'], [/^(sweet potato)(es)?$/, 'sweet potato baked', 150, 'potato'], [/^couscous$/, 'couscous plain cooked', 150, 'portion (cooked)'],
  [/^(baked )?beans$/, 'baked beans canned in tomato sauce', 200, 'half tin'], [/^peas$/, 'peas frozen boiled', 80, 'portion'], [/^broccoli$/, 'broccoli boiled', 80, 'portion'], [/^carrots?$/, 'carrots old boiled', 70, 'portion'], [/^tomato(es)?$/, 'tomatoes standard raw', 85, 'tomato'], [/^cucumber$/, 'cucumber raw', 50, 'portion'], [/^salad$/, 'lettuce', 80, 'bowl'], [/^mushrooms?$/, 'mushrooms', 60, 'portion'], [/^sweetcorn$/, 'sweetcorn kernels canned drained', 80, 'portion'], [/^onions?$/, 'onions raw', 60, 'onion'], [/^peppers?$/, 'peppers capsicum green raw', 120, 'pepper'],
  [/^milk$|^glass(es)? of milk$/, 'milk semi-skimmed pasteurised', 200, 'glass'], [/^(coffee|black coffee|americano)$/, 'coffee infusion', 250, 'mug'], [/^tea|black tea$/, 'tea black infusion', 250, 'mug'], [/^(latte|flat white|cappuccino|milky coffee)$/, 'milk semi-skimmed pasteurised', 220, 'cup'], [/^orange juice|oj$/, 'orange juice', 200, 'glass'], [/^(coke|cola)$/, 'cola', 330, 'can'], [/^(diet coke|coke zero|pepsi max)$/, 'cola diet', 330, 'can'], [/^(beer|lager)|pints?( of (beer|lager))?$/, 'lager standard', 568, 'pint'], [/^wine|red wine|white wine|glass(es)? of wine$/, 'wine red', 175, 'glass'],
  [/^(greek yogh?urt)$/, 'yogurt greek style plain', 150, 'bowl'], [/^yogh?urts?$/, 'yogurt low fat plain', 125, 'pot'], [/^cheese|cheddar$/, 'cheese cheddar', 30, 'portion'], [/^(cottage cheese)$/, 'cottage cheese', 100, 'portion'], [/^butter$/, 'butter', 10, 'spread'], [/^(peanut butter|pb)$/, 'peanut butter smooth', 16, 'tablespoon'], [/^jam$/, 'jam stone fruit', 15, 'spoon'], [/^honey$/, 'honey', 15, 'spoon'], [/^mayo(nnaise)?$/, 'mayonnaise retail', 15, 'tablespoon'], [/^ketchup$/, 'tomato ketchup', 15, 'tablespoon'], [/^(olive )?oil$/, 'oil olive', 11, 'tablespoon'], [/^sugar$/, 'sugar white', 4, 'teaspoon'],
  [/^almonds?$/, 'almonds', 1.2, 'almond'], [/^(nuts|mixed nuts|handful of nuts)$/, 'mixed nuts', 30, 'handful'], [/^(crisps|bags? of crisps|packets? of crisps)$/, 'potato crisps fried', 25, 'bag'], [/^(chocolate)$/, 'chocolate milk', 25, 'few squares'], [/^biscuits?$/, 'biscuits digestive plain', 15, 'biscuit'], [/^(pizza)$/, 'pizza cheese and tomato', 100, 'slice']
];
const NUMW = {a:1, an:1, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10, half:.5, couple:2};
const UNITG = {g:1, gram:1, grams:1, kg:1000, ml:1, l:1000, litre:1000, oz:28.35, tbsp:15, tablespoon:15, tablespoons:15, tsp:5, teaspoon:5, teaspoons:5, scoop:30, scoops:30, pint:568, pints:568, cup:240, cups:240};
const HOLDERS = /^(slices?|pieces?|bowls?|glass(?:es)?|mugs?|cups?|cans?|tins?|pots?|bars?|bags?|packets?|handfuls?|portions?|rashers?|fillets?|plates?|servings?) (?:of )?/;
/** One bit of text -> {q, g (if given), text}. */
function parseBit(t){
  t = t.trim().toLowerCase().replace(/^(some|the|my|about|around|like|roughly)\s+/, '').replace(/½/g, '0.5').replace(/^a couple( of)? /, '2 ').replace(/^half an? /, '0.5 ');
  let q = 1, g = null, m;
  if ((m = /^(\d+(?:[.,]\d+)?)\s*(kg|g|grams?|ml|l|litres?|oz|tbsp|tablespoons?|tsp|teaspoons?|scoops?|pints?)\b\s*(?:of\s+)?(.+)$/.exec(t))) { g = parseFloat(m[1].replace(',', '.')) * (UNITG[m[2]] || UNITG[m[2].replace(/s$/, '')] || 1); t = m[3]; }
  else if ((m = /^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(kg|g|grams?|ml)$/.exec(t))) { g = parseFloat(m[2].replace(',', '.')) * (UNITG[m[3]] || 1); t = m[1]; }
  else if ((m = /^(\d+(?:[.,]\d+)?)\s*x?\s+(.+)$/.exec(t))) { q = parseFloat(m[1].replace(',', '.')); t = m[2]; }
  else if ((m = /^(a|an|one|two|three|four|five|six|seven|eight|nine|ten|half)\s+(.+)$/.exec(t))) { q = NUMW[m[1]]; t = m[2]; }
  return {q, g, text:t.replace(/^of\s+/, '').trim()};
}
const splitBits = s => s.split(/\s*(?:,|;|\n|\+|&|\band\b|\bwith\b|\bthen\b)\s*/i).map(x => x.trim()).filter(x => /[a-z]/i.test(x));
/** Best food for some words: your own foods, then the basics list, then basic foods, then shop products. */
function findFood(text, gen, uk){
  const bare = text.replace(HOLDERS, ''), tryT = [text, bare];
  for (const t of tryT) { const own = myFoodsAsFoods().concat(S.food.recent.map(foodFromCache).filter(Boolean)).find(f => norm(f.name) === norm(t)); if (own) return {f:own, one:own.serving || 100, unit:'serving'}; }
  for (const t of tryT) for (const [re, q, g, unit] of TYPE_FOODS) if (re.test(t)) { const f = searchLines(gen, tokensOf(q), 1)[0] || searchLines(gen, tokensOf(q).slice(0, 2), 1)[0] || searchLines(gen, tokensOf(q).slice(0, 1), 1)[0]; if (f) return {f, one:g, unit}; }
  const tk = tokensOf(bare); if (!tk.length) return null;
  const own = myFoodsAsFoods().find(f => tk.every(x => norm(f.name).includes(x))); if (own) return {f:own, one:own.serving || 100, unit:'serving'};
  const a = searchLines(uk, tk, 1)[0], b = searchLines(gen, tk, 1)[0], one = tk.map(x => x.replace(/s$/, ''));
  const f = (tk.length === 1 ? b || a : a || b) || searchLines(uk, one, 1)[0] || searchLines(gen, one, 1)[0];
  return f ? {f, one:f.serving || 100, unit:f.serving ? 'serving' : '100 g'} : null;
}
async function parseMeal(str){
  const [gen, uk] = await Promise.all([ensureDB('gen'), ensureDB('uk')]);
  return splitBits(str).map(bit => { const p = parseBit(bit), r = findFood(p.text, gen, uk); return r ? {bit, f:r.f, g:p.g != null ? p.g : r.one * p.q, unit:r.unit, q:p.q} : {bit, f:null}; });
}
ACTIONS.typeit = () => {
  const dk = foodDate && tab === 'food' ? foodDate : today(); let txt = '', items = null, busy = false, meal = defaultMeal();
  openSheet((s, sh) => {
    html(s, `<h2>Type what you ate</h2><textarea id="tt" placeholder="2 eggs, 2 slices of toast with butter, coffee">${esc(txt)}</textarea><button class="${items ? 'secondary' : 'primary'} wide" data-go>${busy ? 'Finding…' : items ? 'Find again' : 'Find foods'}</button>`);
    const ta = s.querySelector('#tt'); ta.oninput = () => { txt = ta.value; }; if (!items) setTimeout(() => ta.focus(), 250);
    if (items) {
      let t = [0, 0, 0, 0];
      items.forEach((x, i) => {
        if (!x.f) return html(s, `<div class="card"><div class="item"><b>${esc(x.bit)}</b><button class="ghost" data-f="${i}">Search</button></div><div class="muted small">Couldn't find this one.</div></div>`);
        const v = scaled(x.f.nutr, x.g); t = t.map((a, k) => a + (v[k] || 0));
        html(s, `<div class="card"><div class="muted tiny">“${esc(x.bit)}”</div><div class="item"><b class="grow">${esc(x.f.name)}</b><b>${fmtNum(v[0] || 0)}</b></div><div class="muted small">${esc(x.f.brand || '')} P ${r1(v[1] || 0)} · C ${r1(v[2] || 0)} · F ${r1(v[3] || 0)}</div>
          <div class="row" style="margin-top:8px"><input class="text-in" style="width:96px" inputmode="decimal" data-g="${i}" value="${r1(x.g)}" aria-label="Grams"><span class="muted small grow">g</span><button class="ghost" data-f="${i}">Not this</button><button class="icon" data-x="${i}" aria-label="Remove">✕</button></div></div>`);
      });
      const n = items.filter(x => x.f).length;
      html(s, `<div class="seg">${MEALS.map(([k, l]) => `<button data-m="${k}" class="${meal === k ? 'on' : ''}">${l}</button>`).join('')}</div>${n ? `<button class="primary wide" data-log>Log ${fmtNum(t[0])} kcal · ${Math.round(t[1])} g protein</button>` : ''}<div class="muted tiny" style="margin-top:8px">Amounts without grams are typical portions. Check them before logging.</div>`);
    }
    on(s, '[data-go]', async () => { if (busy || !txt.trim()) return; busy = true; sh.refresh(); try { items = await parseMeal(txt); } catch(e) { toast('Could not load the food database'); } busy = false; sh.refresh(); });
    s.querySelectorAll('[data-g]').forEach(i => i.onchange = () => { const v = num(i.value); if (v > 0) items[+i.dataset.g].g = v; sh.refresh(); });
    on(s, '[data-f]', b => { const i = +b.dataset.f; openFoodSearch({q:parseBit(items[i].bit).text, onFood:f => { const was = items[i].g; items[i] = Object.assign({}, items[i], {f, g:was || f.serving || 100}); sh.refresh(); }}); });
    on(s, '[data-x]', b => { items.splice(+b.dataset.x, 1); sh.refresh(); }); on(s, '[data-m]', b => { meal = b.dataset.m; sh.refresh(); });
    on(s, '[data-log]', () => { const l = items.filter(x => x.f); l.forEach(x => addEntry(dk, meal, x.f, x.g, r1(x.g) + ' g')); closeSheet(); render(); toast('Logged ' + pl(l.length, 'food')); });
  }, {full:true});
};
