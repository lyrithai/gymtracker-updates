'use strict';
/* ================= snack ideas that fit what's left today ================= */
const SNACK_TASTES = [['any','Anything'],['sweet','🍓 Sweet'],['savoury','🥓 Savoury'],['crunchy','🥨 Crunchy'],['fresh','🍉 Fresh'],['creamy','🥣 Creamy'],['choc','🍫 Chocolatey'],['cheesy','🧀 Cheesy'],['spicy','🌶️ Spicy'],['filling','💪 Filling'],['mine','⭐ My foods']];
let snkTaste = 'any', snkPage = 0;
/** What's left for a snack now: today's targets minus what's logged, minus room kept for main meals you haven't had yet. */
function snackRoom(dk){
  const T = S.food.targets, {t} = dayTotals(dk), has = m => dayEntries(dk).some(e => e.meal === m), h = new Date().getHours() + new Date().getMinutes() / 60;
  const ahead = dk > today() ? [['breakfast', .25], ['lunch', .3], ['dinner', .35]] : dk < today() ? [] : [['breakfast', .25, 11], ['lunch', .3, 15], ['dinner', .35, 21.5]].filter(([m, , till]) => h < till);
  const keep = ahead.filter(([m]) => !has(m)), part = keep.reduce((a, x) => a + x[1], 0);
  const left = {kcal:T.kcal - t[0], protein:T.protein - t[1], carbs:T.carbs - t[2], fat:T.fat - t[3]};
  const room = {}; Object.keys(left).forEach(k => room[k] = left[k] - T[k] * part);
  return {left, room, meals:keep.map(x => x[0])};
}
const snackFood = s => ({key:s.id, name:s.n, brand:'Snack idea', serving:s.g, src:'rec', qty:'', nutr:parseNutr(s.nutr)});
/** Your own foods and recent ones, at the amount you last had, if that's snack sized. */
function mySnacks(){
  const last = {};
  Object.keys(S.food.log).sort().forEach(d => S.food.log[d].forEach(e => last[e.key] = e.g));
  const keys = [...new Set(S.food.mine.map(m => m.key).concat(S.food.recent))], out = [];
  keys.forEach(k => {
    if (k.startsWith('snk-')) return;
    const m = S.food.mine.find(x => x.key === k), f = foodFromCache(k) || (m && {key:k, name:m.name, brand:m.brand, serving:m.serving, src:'my', qty:'', nutr:parseNutr(m.nutr)});
    if (!f) return;
    const g = last[k] || f.serving; if (!g) return;
    const v = scaled(f.nutr, g);
    if (v[0] >= 20 && v[0] <= 350) out.push({own:1, food:f, id:k, n:f.name, f:['mine'], g, m:[v[0], v[1] || 0, v[2] || 0, v[3] || 0], how:f.brand || ''});
  });
  return out;
}
function snackScore(s, R){
  const [k, p, c, f] = s.m, T = S.food.targets, pos = x => Math.max(0, x);
  let v = 0;
  v -= pos(p - pos(R.room.protein)) / 12;                       // going over
  v -= pos(c - pos(R.room.carbs)) / 8 + pos(f - pos(R.room.fat)) / 4;
  const behind = clamp(R.room.protein / Math.max(40, T.protein * .35), 0, 1.2);
  v += behind * Math.min(p, 25) / 6 + p * 4 / Math.max(60, k);  // protein for its calories, more so when you're behind
  const want = clamp(R.room.kcal * .6, 40, 220); v -= Math.abs(k - want) / 130;   // a decent size for what's left
  return v;
}
function snackPicks(dk){
  const R = snackRoom(dk), eaten = new Set(dayEntries(dk).map(e => e.key)), max = Math.max(0, R.room.kcal);
  const all = snkTaste === 'mine' ? mySnacks() : window.SNACKS.filter(s => snkTaste === 'any' || s.f.includes(snkTaste)).concat(snkTaste === 'any' ? mySnacks() : []);
  let fit = all.filter(s => s.m[0] <= Math.min(350, max + 5)), tight = false;
  if (!fit.length) { tight = true; fit = all.filter(s => s.m[0] <= Math.max(60, pos0(R.left.kcal))); if (!fit.length) fit = all.slice().sort((a, b) => a.m[0] - b.m[0]).slice(0, 4); }
  const ranked = fit.map(s => [s, tight ? -s.m[0] / 50 : snackScore(s, R) - (eaten.has(s.id) ? 2 : 0)]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  // spread them out: not four yogurts in a row
  const out = [], pool = ranked.slice();
  while (pool.length) {
    const page = [];
    for (let i = 0; i < pool.length && page.length < 4;) {
      const s = pool[i];
      const alike = page.some(x => x.n.split(/[ ,]/)[0] === s.n.split(/[ ,]/)[0] || mainOf(x) === mainOf(s)) || (snkTaste === 'any' && page.filter(x => x.f[0] === s.f[0]).length >= 2);
      if (alike && pool.length - i > 1) { i++; continue; }
      page.push(s); pool.splice(i, 1);
    }
    if (!page.length) page.push(...pool.splice(0, 4));
    out.push(page);
  }
  return {R, pages:out, tight};
}
const mainOf = s => s.i ? s.i.slice().sort((a, b) => b[1] - a[1])[0][0] : s.id;
const pos0 = x => Math.max(0, x);
function openSnacks(){
  const dk = foodDate && tab === 'food' ? foodDate : today();
  snkPage = 0;
  openSheet((b, sh) => {
    const {R, pages, tight} = snackPicks(dk), n = pages.length, list = n ? pages[snkPage % n] : [], L = R.left, over = L.kcal < 0;
    html(b, `<h2>Snack ideas</h2><div class="pills" style="margin-bottom:10px">${SNACK_TASTES.map(([k, l]) => `<button class="pill ${snkTaste === k ? 'on' : ''}" data-t="${k}">${l}</button>`).join('')}</div>
      <div class="card"><b>${over ? fmtNum(-L.kcal) + ' kcal over today' : fmtNum(L.kcal) + ' kcal left'}</b> <span class="muted small">P ${Math.round(pos0(L.protein))} · C ${Math.round(pos0(L.carbs))} · F ${Math.round(pos0(L.fat))} g</span>
      ${R.meals.length ? `<div class="muted small">Keeping room for ${R.meals.join(' and ')}, so about <b>${fmtNum(pos0(R.room.kcal))} kcal</b> for a snack now.</div>` : ''}</div>`);
    if (tight && list.length) html(b, `<div class="coach">${over ? 'You\'re past today\'s target. One day won\'t hurt: if you\'re hungry, eat. These are the lightest.' : 'Not much room right now, so these are the lightest.'}</div>`);
    if (!list.length) html(b, `<div class="empty">${snkTaste === 'mine' ? 'Nothing snack sized in your foods yet. Log a few and they show up here.' : 'Nothing here.'}</div>`);
    list.forEach((s, i) => {
      const after = L.kcal - s.m[0];
      html(b, `<div class="card"><div class="item"><b class="grow">${s.own ? '⭐ ' : ''}${esc(s.n)}</b><b>${fmtNum(s.m[0])} kcal</b></div>
        <div class="small" style="margin:2px 0"><span style="color:var(--p)">P ${r1(s.m[1])}</span> · <span style="color:var(--c)">C ${r1(s.m[2])}</span> · <span style="color:var(--f)">F ${r1(s.m[3])}</span> g</div>
        <div class="muted small">${s.own ? r1(s.g) + ' g, like last time' + (s.how ? ' · ' + esc(s.how) : '') : s.i.map(x => r1(x[1]) + ' g ' + esc(x[0])).join(', ') + (s.how ? '<br>' + esc(s.how) : '')}</div>
        <div class="item" style="margin-top:8px"><span class="muted small">${after >= 0 ? 'Leaves ' + fmtNum(after) + ' kcal' : fmtNum(-after) + ' kcal over'}</span><button class="primary" style="min-height:44px" data-add="${i}">Log it</button></div></div>`);
    });
    if (n > 1) html(b, `<button class="secondary wide" data-more>Show me others</button>`);
    html(b, `<div class="muted tiny" style="margin-top:10px">Numbers come from the app's food data for the amounts shown. Brands differ, and check labels for allergies.</div>`);
    on(b, '[data-t]', x => { snkTaste = x.dataset.t; snkPage = 0; sh.refresh(); });
    on(b, '[data-more]', () => { snkPage++; sh.refresh(); b.scrollTop = 0; });
    on(b, '[data-add]', x => { const s = list[+x.dataset.add]; addEntry(dk, 'snacks', s.own ? s.food : snackFood(s), s.g, s.own ? r1(s.g) + ' g' : '1 portion (' + r1(s.g) + ' g)'); closeSheet(); render(); toast('Logged ' + s.n); });
  }, {full:true});
}
ACTIONS.snacks = openSnacks;
