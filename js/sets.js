'use strict';
/* ================= how many sets each movement gets =================
   Owner's rule: 2 sets for everything, 1 for what another movement in the same session already hits (rear delts after a row;
   hamstrings and glutes when stiff-leg deadlifts are there for lower back). Front and side delts never go under 2.
   u.setMode: 'smart' (that rule) or 'two' (2 for all). u.sets: {slotKey: n} chosen by hand, which always wins. */
const ERECTOR_HINGES = ['45° Back Extension', 'Back Extension', 'Good Morning', 'Stiff-Leg Deadlift', 'Romanian Deadlift', 'B-Stance RDL'];
const MIN_TWO = ['ohp', 'sideDelt'];
/** What a movement in a session takes a set off, by slot. */
function hitsFrom(slot, name){
  if (slot === 'lowerBack') return ERECTOR_HINGES.includes(name) ? ['hamCurl', 'hinge', 'glute'] : [];
  return {hRow:['rearDelt', 'traps', 'biHammer'], vPull:['biHammer'], hinge:['glute'], squat:['glute', 'adductors'], legPress:['glute']}[slot] || [];
}
/** day: [{slot, name, base, focus}] -> [{n, by}] (by = the movement that already hits it) */
function smartSets(day){
  return day.map((x, i) => {
    const src = day.find((y, j) => j !== i && hitsFrom(y.slot, y.name).includes(x.slot));
    let n = x.base || 2;
    if (src && !x.focus && !MIN_TWO.includes(x.slot)) n = Math.max(1, n - 1);
    if (MIN_TWO.includes(x.slot)) n = Math.max(2, n);
    return {n, by:src && n < (x.base || 2) ? src.name || SLOTS[src.slot].label : ''};
  });
}
function chosenSets(u, key, auto){ const o = u.sets && u.sets[key]; return o ? o : u.setMode === 'two' ? 2 : auto; }
const effortFor = (n, slot, style) => n === 1 ? 'one set to failure' : n === 2 && style.sets !== 3 ? 'both sets to failure' : style.sets === 3 ? style.effort : 'every set to failure';
function buildPlan(u){
  const plan = buildPlanRaw(u), picks = (typeof OB !== 'undefined' && OB && u === OB.d ? OB.picks : u.picks) || {}, names = resolvePicks(plan, picks, u.equip), keys = planKeys(plan), style = STYLES[u.style] || STYLES.hard2;
  plan.forEach((day, di) => {
    const auto = smartSets(day.slots.map((x, si) => ({slot:x.slot, name:names[di + ':' + si], base:x.sets, focus:x.focus})));
    day.slots.forEach((x, si) => { x.auto = auto[si].n; x.by = auto[si].by; x.sets = chosenSets(u, keys[di][si], x.auto); x.effort = effortFor(x.sets, x.slot, style); });
    day.minutes = Math.round(5 + day.slots.reduce((a, x) => a + x.sets * 2.5 + 1.5, 0));
  });
  return plan;
}
/** The rule on the routines you already have. */
function programSets(){
  const u = S.user, out = []; if (!u || !S.program) return out;
  S.routines.filter(r => S.program.ids.includes(r.id)).forEach(r => {
    const n = {}, all = r.items.concat(r.open || []).filter(x => x.slot && SLOTS[x.slot]).sort((a, b) => (a.pos == null ? 99 : a.pos) - (b.pos == null ? 99 : b.pos));
    const style = STYLES[u.style] || STYLES.hard2, focus = x => (u.focus || []).some(f => (FOCUS_OF[SLOTS[x.slot].m] || []).includes(f));
    const base = x => x.slot === 'triOH' || x.slot === 'triPush' ? 2 : style.sets === 3 && SLOTS[x.slot].small ? 2 : style.sets === 1 && ['quadIso', 'calves', 'traps'].includes(x.slot) ? 2 : style.sets;
    const auto = smartSets(all.map(x => ({slot:x.slot, name:x.exId ? exName(x.exId) : '', base:base(x), focus:focus(x)})));
    all.forEach((x, i) => { const k = x.k || x.slot + '#' + (n[x.slot] || 0); n[x.slot] = (n[x.slot] || 0) + 1; out.push({r, x, k, auto:auto[i].n, by:auto[i].by, want:chosenSets(u, k, auto[i].n)}); });
  });
  return out;
}
function applyProgramSets(){
  let c = 0; const style = STYLES[(S.user || {}).style] || STYLES.hard2;
  programSets().forEach(o => { if (o.x.sets !== o.want) { o.x.sets = o.want; if (o.x.effort) o.x.effort = effortFor(o.want, o.x.slot, style); c++; } });
  return c;
}
/** Once, for plans made before this rule. Only the standard two-set style: the others were picked on purpose. */
function migrateSets(){
  if (!S.user || !S.program || S.user.setsV) return;
  S.user.setsV = 1; let c = 0;
  if ((S.user.style || 'hard2') === 'hard2') c = applyProgramSets();
  save(); if (c) setTimeout(() => toast('Sets updated: 2 each, 1 where something else already hits it'), 1800);
}
function setPills(key, u, auto){ const o = u.sets && u.sets[key]; return `<div class="seg">${[0, 1, 2, 3, 4].map(n => `<button data-sk="${esc(key)}" data-n="${n}" class="${(o || 0) === n ? 'on' : ''}">${n || 'Auto ' + (u.setMode === 'two' ? 2 : auto)}</button>`).join('')}</div>`; }
function modePills(u){ return `<div class="seg"><button data-sm="smart" class="${u.setMode !== 'two' ? 'on' : ''}">Smart</button><button data-sm="two" class="${u.setMode === 'two' ? 'on' : ''}">2 for everything</button></div><div class="muted small" style="margin:6px 0 10px">${u.setMode === 'two' ? 'Every movement gets 2 sets.' : 'Everything gets 2, and 1 if another movement that day already hits it. Front and side delts always get at least 2.'}</div>`; }
function bindSets(root, u, after){
  on(root, '[data-sm]', b => { u.setMode = b.dataset.sm; u.sets = {}; after(); });
  on(root, '[data-sk]', b => { u.sets = Object.assign({}, u.sets); if (+b.dataset.n) u.sets[b.dataset.sk] = +b.dataset.n; else delete u.sets[b.dataset.sk]; after(); });
}
ACTIONS['plan-sets'] = () => openSheet((s, sh) => {
  const u = S.user, list = programSets(); if (!list.length) return html(s, '<h2>Sets</h2><div class="empty">Build a program first.</div>');
  html(s, '<h2>Sets</h2>' + modePills(u));
  let last = null;
  list.forEach(o => {
    if (o.r !== last) { last = o.r; html(s, `<div class="sec">${esc(o.r.name)} · ${pl(list.filter(x => x.r === o.r).reduce((a, x) => a + x.want, 0), 'set')}</div>`); }
    html(s, `<div class="card"><b>${o.x.exId ? esc(exName(o.x.exId)) : esc(SLOTS[o.x.slot].label) + ' <span class="muted">(choose later)</span>'}</b>${o.by && !(u.sets && u.sets[o.k]) && u.setMode !== 'two' ? `<div class="muted small">1 less: ${esc(o.by)} already hits it</div>` : ''}<div style="margin-top:6px">${setPills(o.k, u, o.auto)}</div></div>`);
  });
  bindSets(s, u, () => { applyProgramSets(); save(); sh.refresh(); render(); });
}, {full:true});
