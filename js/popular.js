'use strict';
/* ================= the exercise list grows from what people add =================
   When someone logged in adds their own exercise, its name + muscle get one vote (one per account, enforced by firestore.rules).
   At POP_MIN votes it shows up in everyone's lists as a popular exercise. */
const POP_MIN = 3, POP_MAX = 60, POP_KEY = 'gymtracker.popular', POP_DAY = 20 * 3600 * 1000;
const POP_NAME = /^[A-Za-z0-9][A-Za-z0-9 '&()\/+.-]{2,39}$/;
const POP_BAD = /fuck|shit|cunt|bitch|nigg|fagg|retard|rape|porn|penis|vagina|dick|cock\b|pussy|wank|slut|whore|nazi|hitler|suicide|kill|http|www|\.com/i;
const popSlug = n => n.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const popClean = n => String(n).replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
const popOk = (name, pool) => typeof name === 'string' && POP_NAME.test(name) && !POP_BAD.test(name) && Object.prototype.hasOwnProperty.call(POOL_GROUP, pool);

/** Put the popular list into this phone's exercises; drop ones that fell off the list unless you use them. */
function applyPopular(list){
  const key = n => n.toLowerCase(), want = new Map(list.map(x => [key(x[0]), x])), have = new Map(S.exercises.map(e => [key(e.name), e]));
  let changed = false;
  want.forEach(([name, pool], k) => { if (!have.has(k)) { S.exercises.push({id:uid(), name, muscle:POOL_GROUP[pool], pools:[pool], pop:1}); changed = true; } });
  const used = new Set();
  S.workouts.concat(S.active ? [S.active] : []).forEach(w => w.exercises.forEach(e => used.add(e.exId)));
  S.routines.forEach(r => r.items.forEach(i => used.add(i.exId)));
  const picks = new Set(Object.values((S.user && S.user.picks) || {}));
  const keep = S.exercises.filter(e => !e.pop || want.has(key(e.name)) || used.has(e.id) || picks.has(e.name));
  if (keep.length !== S.exercises.length) { S.exercises = keep; changed = true; }
  return changed;
}
function readPopular(){
  const c = lsGet(POP_KEY);
  return c && Array.isArray(c.list) ? c.list.filter(x => Array.isArray(x) && popOk(x[0], x[1]) && typeof x[2] === 'number') : null;
}
const popCount = name => { const x = (readPopular() || []).find(y => y[0].toLowerCase() === name.toLowerCase()); return x ? x[2] : 0; };
async function refreshPopular(force){
  const c = lsGet(POP_KEY);
  if (!force && c && Date.now() - c.t < POP_DAY && Date.now() >= c.t) return;
  const out = await fbFetch(FB.fs + FB_DB + ':runQuery', {structuredQuery:{from:[{collectionId:'community'}], where:{fieldFilter:{field:{fieldPath:'n'}, op:'GREATER_THAN_OR_EQUAL', value:{integerValue:String(POP_MIN)}}}, orderBy:[{field:{fieldPath:'n'}, direction:'DESCENDING'}], limit:POP_MAX}});
  const list = out.filter(x => x.document).map(x => fsDoc(x.document)).filter(d => !d.off && popOk(d.name, d.pool) && popSlug(d.name) === d._id).map(d => [d.name, d.pool, d.n]);
  lsSet(POP_KEY, {t:Date.now(), list});
  if (busyScreen()) return;               // goes in next time instead of changing lists under an open form
  if (applyPopular(list)) { save(); render(); }
}
/** One vote for each exercise you added yourself (only ones made since sharing existed, never with sharing off). */
async function shareExercises(){
  if (!A || S.shareEx === false) return;
  const me = A.uid;
  A.shared = A.shared || {};
  for (const e of S.exercises.filter(x => x.share && x.custom && !x.hidden && !x.pop && (x.pools || []).length)) {
    const name = popClean(e.name), slug = popSlug(name);
    if (!popOk(name, e.pools[0]) || A.shared[slug]) continue;
    try {
      const [doc, mine] = await fsGet(['community/' + slug, 'community/' + slug + '/by/' + me]);
      if (!A || A.uid !== me || S.shareEx === false) return;
      if (!mine) await fsCommit([wSet('community/' + slug + '/by/' + me, {t:Date.now(), uid:me}, {exists:false}),
        doc ? wSet('community/' + slug, {n:doc.n + 1}, {updateTime:doc._time}, ['n']) : wSet('community/' + slug, {name, pool:e.pools[0], n:1}, {exists:false})]);
      if (!A || A.uid !== me) return;
      A.shared[slug] = 1; saveA();
    } catch(err) { if (/OFFLINE|SIGNED_OUT/.test(err.code)) return; }      // busy or refused: try again another day
  }
}
/** Deleting an account takes its votes back too. */
async function unshareWrites(){
  const w = [];
  const slugs = Object.keys((A && A.shared) || {}).concat(S.exercises.filter(e => e.share && POP_NAME.test(popClean(e.name))).map(e => popSlug(popClean(e.name))));
  for (const slug of new Set(slugs)) {
    const [doc, mine] = await fsGet(['community/' + slug, 'community/' + slug + '/by/' + A.uid]);
    if (mine && doc) w.push([wDel('community/' + slug + '/by/' + A.uid), wSet('community/' + slug, {n:doc.n - 1}, {updateTime:doc._time}, ['n'])]);
  }
  return w;
}
function popularStart(){
  const list = readPopular();
  if (list && !busyScreen() && applyPopular(list)) { save(); render(); }
  setTimeout(() => refreshPopular().catch(() => {}), 4000);
  setInterval(() => { if (!document.hidden) refreshPopular().catch(() => {}); }, 3600 * 1000);
}
