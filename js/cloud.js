'use strict';
/* ================= account + sync (Firebase REST, no SDK) =================
   The app works fully without an account. The login lives in its own key, never inside S or a backup.
   Sync: S (minus the workout in progress) is merged three ways: last synced copy / this phone / server. */
const FB = {key:'AIzaSyDK7WUFpz21RB1P8RrkaTxXg3_csxg2occ', project:'gym-tracker-558b4', back:'https://lyrithai.github.io/gymtracker-updates/auth.html',
  idt:'https://identitytoolkit.googleapis.com/v1/accounts:', tok:'https://securetoken.googleapis.com/v1/token', fs:'https://firestore.googleapis.com/v1/'};
const FB_DB = 'projects/' + FB.project + '/databases/(default)/documents';
const AKEY = 'gymtracker.account', OWNER = 'gymtracker.owner', PENDING = 'gymtracker.authp', RETURN = 'gymtracker.authr';
const lsGet = k => { try { return JSON.parse(localStorage.getItem(k)); } catch(e) { return null; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); return true; } catch(e) { return false; } };
let A = lsGet(AKEY);          // {uid, email, refresh, provider, rev, username, show, ranks} or null
let idTok = null, idExp = 0, syncing = null, syncT = 0, syncState = '', syncAt = 0;
const saveA = () => lsSet(AKEY, A);

/* ---------- small store for the last synced copy and safety copies ---------- */
const idb = (() => {
  let p = null;
  const open = () => p = p || new Promise((ok, no) => { const r = indexedDB.open('gymtracker-cloud', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
  const run = (mode, f) => open().then(db => new Promise((ok, no) => { const t = db.transaction('kv', mode), r = f(t.objectStore('kv')); t.oncomplete = () => ok(r.result); t.onerror = t.onabort = () => no(t.error); }));
  return {get:k => run('readonly', s => s.get(k)), set:(k, v) => run('readwrite', s => s.put(v, k)), del:k => run('readwrite', s => s.delete(k))};
})();

/* ---------- talking to Firebase ---------- */
class CloudError extends Error { constructor(code, status){ super(code); this.code = code; this.status = status; } }
async function fbFetch(url, body, tok, form){
  let r, j;
  try {
    r = await fetch(url, {method:'POST', headers:Object.assign({'Content-Type':form ? 'application/x-www-form-urlencoded' : 'application/json'}, tok ? {Authorization:'Bearer ' + tok} : {}), body:form ? new URLSearchParams(body).toString() : JSON.stringify(body)});
  } catch(e) { throw new CloudError('OFFLINE', 0); }
  try { j = await r.json(); } catch(e) { j = null; }
  if (!r.ok) {
    const er = (Array.isArray(j) ? j[0] : j) || {}, m = er.error || {};
    throw new CloudError(String((m.status && url.startsWith(FB.fs) ? m.status : m.message) || r.status).split(' : ')[0], r.status);
  }
  return j;
}
const auth = (method, body) => fbFetch(FB.idt + method + '?key=' + FB.key, body);
async function token(){
  if (!A) throw new CloudError('SIGNED_OUT');
  if (idTok && Date.now() < idExp) return idTok;
  const me = A;
  try {
    const j = await fbFetch(FB.tok + '?key=' + FB.key, {grant_type:'refresh_token', refresh_token:me.refresh}, null, true);
    if (A !== me) throw new CloudError('SIGNED_OUT');
    idTok = j.id_token; idExp = Date.now() + (j.expires_in - 120) * 1000; A.refresh = j.refresh_token; saveA();
    return idTok;
  } catch(e) {
    if (A === me && /^(TOKEN_EXPIRED|USER_DISABLED|USER_NOT_FOUND|INVALID_REFRESH_TOKEN)/.test(e.code)) { signOutLocal(); toast('Please log in again'); }
    throw e;
  }
}
const fsEnc = v => typeof v === 'string' ? {stringValue:v} : typeof v === 'boolean' ? {booleanValue:v} : typeof v === 'number' ? {integerValue:String(Math.round(v))} : {arrayValue:{values:v.map(fsEnc)}};
const fsDec = v => 'stringValue' in v ? v.stringValue : 'booleanValue' in v ? v.booleanValue : 'integerValue' in v ? +v.integerValue : 'arrayValue' in v ? (v.arrayValue.values || []).map(fsDec) : null;
const fsDoc = d => { const o = {_id:d.name.split('/').pop(), _time:d.updateTime}; Object.entries(d.fields || {}).forEach(([k, v]) => o[k] = fsDec(v)); return o; };
const wSet = (path, o, cur, mask) => Object.assign({update:{name:FB_DB + '/' + path, fields:Object.fromEntries(Object.entries(o).map(([k, v]) => [k, fsEnc(v)]))}}, cur ? {currentDocument:cur} : {}, mask ? {updateMask:{fieldPaths:mask}} : {});
const wDel = path => ({delete:FB_DB + '/' + path});
async function fsCommit(writes){ return fbFetch(FB.fs + FB_DB + ':commit', {writes}, await token()); }
async function fsGet(paths){
  const out = await fbFetch(FB.fs + FB_DB + ':batchGet', {documents:paths.map(p => FB_DB + '/' + p)}, await token());
  return paths.map(p => { const x = out.find(y => y.found && y.found.name === FB_DB + '/' + p); return x ? fsDoc(x.found) : null; });
}
async function fsQuery(coll, field, value){
  const out = await fbFetch(FB.fs + FB_DB + ':runQuery', {structuredQuery:{from:[{collectionId:coll}], where:{fieldFilter:{field:{fieldPath:field}, op:'ARRAY_CONTAINS', value:fsEnc(value)}}, limit:200}}, await token());
  return out.filter(x => x.document).map(x => fsDoc(x.document));
}

/* ---------- three-way merge ---------- */
const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
const same = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);
/** Lists whose items each have a unique id (or key / rid / date) merge item by item; anything else is one value. */
function listKey(...lists){
  for (const k of ['id', 'key', 'rid', 'd']) {
    if (lists.every(l => Array.isArray(l) && l.every(x => isObj(x) && x[k] != null) && new Set(l.map(x => x[k])).size === l.length) && lists.some(l => l.length)) return k;
  }
  return null;
}
/** base: what both sides had last time (undefined = nothing). Both changed the same value: this phone's wins, or the server's the first time (no base). */
function merge3(base, mine, theirs, first){
  if (same(mine, theirs)) return theirs;
  if (!first || base !== undefined) {
    if (same(base, mine)) return theirs;
    if (same(base, theirs)) return mine;
  }
  if (mine === undefined) return theirs;      // deleted here but edited there: keep the edit
  if (theirs === undefined) return mine;
  if (isObj(mine) && isObj(theirs)) {
    const b = isObj(base) ? base : {}, out = {};
    [...new Set(Object.keys(theirs).concat(Object.keys(mine)))].forEach(k => {
      const v = merge3(b[k], mine[k], theirs[k], first);
      if (v !== undefined) out[k] = v;
    });
    return out;
  }
  if (Array.isArray(mine) && Array.isArray(theirs)) {
    const bl = Array.isArray(base) ? base : [], k = listKey(mine, theirs) ? listKey(...[mine, theirs].concat(bl.length ? [bl] : [])) : null;
    if (k) {
      const by = l => new Map(l.map(x => [x[k], x])), B = by(bl), M = by(mine), T = by(theirs), out = [];
      [...new Set([...T.keys(), ...M.keys()])].forEach(id => {
        const v = merge3(B.get(id), M.get(id), T.get(id), first);
        if (v !== undefined) out.push(v);
      });
      return out;
    }
  }
  return first ? theirs : mine;
}
/** Every phone makes its own ids for the built-in exercises: use the server's id for the same name, everywhere it's mentioned. */
function alignExercises(local, remote, base){
  const ids = new Set(remote.exercises.map(e => e.id)), byName = new Map(remote.exercises.map(e => [e.name.toLowerCase(), e.id])), map = {};
  local.exercises.forEach(e => { const r = byName.get(e.name.toLowerCase()); if (r && r !== e.id && !ids.has(e.id)) map[e.id] = r; });
  if (!Object.keys(map).length) return;
  const walk = o => {
    if (!o || typeof o !== 'object') return;
    if (typeof o.exId === 'string' && map[o.exId]) o.exId = map[o.exId];
    Object.values(o).forEach(walk);
  };
  [local, base].forEach(d => {
    if (!d) return;
    walk(d);
    const seen = new Set();
    (d.exercises || []).forEach(e => { if (map[e.id]) e.id = map[e.id]; });
    d.exercises = (d.exercises || []).filter(e => !seen.has(e.id) && seen.add(e.id));
  });
}
const snapshot = () => { const d = JSON.parse(JSON.stringify(S)); delete d.active; return d; };
const isFresh = d => !d.workouts.length && !d.todos.length && !d.blocks.length && !d.myRecipes.length && !d.food.mine.length && !Object.values(d.food.log).some(l => l.length);

/* ---------- sync ---------- */
const CHUNK = 240000;
function chunks(s){
  const out = [];
  for (let i = 0; i < s.length;) {
    let e = Math.min(s.length, i + CHUNK);
    if (e < s.length && /[\uD800-\uDBFF]/.test(s[e - 1])) e--;    // don't cut an emoji in half
    out.push(s.slice(i, e)); i = e;
  }
  return out;
}
async function pullRemote(root, meta){
  const parts = await fsGet(Array.from({length:meta.n}, (_, i) => root + 'c' + i));
  if (parts.some(p => !p || p.rev !== meta.rev)) throw new CloudError('CHANGED');    // someone saved while we were reading
  return parts.map(p => p.s).join('');
}
const busyScreen = () => sheets.length || (typeof OB !== 'undefined' && OB) || (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName));
function setSync(s){ syncState = s; const el = document.getElementById('syncline'); if (el) el.textContent = syncText(); }
function syncText(){
  return syncState === 'busy' ? 'Saving to your account…' : syncState === 'offline' ? 'Offline. Saves when you\'re back online.' : syncState === 'error' ? 'Could not save to your account. Trying again soon.'
    : syncAt ? 'Saved to your account at ' + new Date(syncAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'Not saved to your account yet';
}
function sync(opt){
  if (!A) return Promise.resolve(false);
  if (syncing) return opt && opt.first ? syncing.then(() => sync(opt)) : syncing;
  setSync('busy');
  syncing = doSync(opt || {}).then(done => { if (done) { syncAt = Date.now(); setSync('ok'); } else { setSync(''); queueSync(20000); } return done; }, e => {
    setSync(e.code === 'OFFLINE' ? 'offline' : 'error'); if (A) queueSync(e.code === 'OFFLINE' ? 60000 : 120000);
    if (opt && opt.first) throw e; return false;
  }).finally(() => { syncing = null; });
  return syncing;
}
async function doSync({first}){
  const me = A.uid, root = 'users/' + me + '/data/';
  const still = () => { if (!A || A.uid !== me) throw new CloudError('SIGNED_OUT'); };
  for (let tries = 0; tries < 4; tries++) {
    const [meta] = await fsGet([root + 'meta']);
    let baseStr = await idb.get('base.' + me).catch(() => null); still();
    let pushStr;
    if (meta && (meta.rev !== A.rev || !baseStr)) {
      let remoteStr;
      try { remoteStr = await pullRemote(root, meta); } catch(e) { if (e.code === 'CHANGED') continue; throw e; }
      still();
      if (!first && busyScreen()) return false;      // don't swap the data under an open form
      const remote = JSON.parse(remoteStr), local = snapshot(), base = baseStr ? JSON.parse(baseStr) : undefined;
      let merged;
      if (first && !base && isFresh(local)) merged = remote;
      else { alignExercises(local, remote, base); merged = merge3(base, local, remote, !base); }
      const active = S.active;
      if (active) { const tmp = {exercises:snapshot().exercises, active:JSON.parse(JSON.stringify(active))}; alignExercises(tmp, remote); merged.active = tmp.active; }
      addMissingExercises(merged); S = defaults(merged); save.quiet = true; save(); save.quiet = false;
      if (!sheets.length && !OB) render();
      pushStr = JSON.stringify(snapshot());
      await idb.set('base.' + me, remoteStr).catch(() => {}); still(); A.rev = meta.rev; saveA();
      if (pushStr === remoteStr) { await publishRanks(); return true; }
    } else {
      pushStr = JSON.stringify(snapshot());
      if (meta && pushStr === baseStr) { await publishRanks(); return true; }
    }
    const parts = chunks(pushStr), rev = uid() + uid();
    const writes = [wSet(root + 'meta', {rev, n:parts.length, t:Date.now()}, meta ? {updateTime:meta._time} : {exists:false})].concat(parts.map((s, i) => wSet(root + 'c' + i, {rev, s})));
    for (let i = parts.length; meta && i < meta.n; i++) writes.push(wDel(root + 'c' + i));
    try { await fsCommit(writes); } catch(e) { if (/FAILED_PRECONDITION|ABORTED|ALREADY_EXISTS/.test(e.code)) continue; throw e; }
    still();
    await idb.set('base.' + me, pushStr).catch(() => {}); still(); A.rev = rev; saveA();
    await publishRanks();
    return true;
  }
  return false;
}
function queueSync(ms){ if (!A) return; clearTimeout(syncT); syncT = setTimeout(() => sync(), ms); }
window.onSaved = () => { if (A && !save.quiet) queueSync(8000); };
document.addEventListener('visibilitychange', () => { if (A) { if (document.hidden) { if (!syncing) sync(); } else queueSync(500); } });
window.addEventListener('online', () => queueSync(500));
setInterval(() => { if (A && !document.hidden) sync(); }, 5 * 60000);

/* ---------- logging in and out ---------- */
const AUTH_MSG = {EMAIL_EXISTS:'That email already has an account. Log in instead.', INVALID_LOGIN_CREDENTIALS:'Wrong email or password.', INVALID_PASSWORD:'Wrong email or password.', EMAIL_NOT_FOUND:'Wrong email or password.',
  INVALID_EMAIL:'That email doesn\'t look right.', MISSING_EMAIL:'Type your email first.', MISSING_PASSWORD:'Type your password.', WEAK_PASSWORD:'Use at least 6 characters for the password.', USER_DISABLED:'This account is turned off.',
  TOO_MANY_ATTEMPTS_TRY_LATER:'Too many tries. Wait a bit and try again.', QUOTA_EXCEEDED:'Too many requests today. Try again later.', OFFLINE:'You\'re offline. Connect to the internet and try again.', PERMISSION_DENIED:'The server said no. Update the app and try again.'};
const cloudMsg = e => AUTH_MSG[e.code] || 'Something went wrong (' + (e.code || e.message) + ')';
/** Makes the phone's data this account's data. Another account's data on the phone is put away safely, never mixed in. */
async function signedIn(r, provider){
  const owner = lsGet(OWNER);
  if (owner && owner !== r.localId) {
    if (!confirm('This phone has another account\'s data on it. Switch accounts? The other data is kept safe on this phone and comes back when that account logs in again.')) return false;
    await idb.set('state.' + owner, JSON.stringify(S));
    const mine = await idb.get('state.' + r.localId).catch(() => null);
    S = defaults(mine ? JSON.parse(mine) : seedGym()); save.quiet = true; save(); save.quiet = false;
  } else if (!owner) await idb.set('before-login', JSON.stringify(S)).catch(() => {});
  lsSet(OWNER, r.localId);
  A = {uid:r.localId, email:r.email || '', refresh:r.refreshToken, provider, rev:null, username:'', show:true, ranks:''};
  idTok = r.idToken; idExp = Date.now() + ((+r.expiresIn || 3600) - 120) * 1000;
  saveA();
  while (sheets.length) closeSheet();
  toast('Logged in. Loading your data…');
  try {
    const [p] = await fsGet(['profiles/' + A.uid]);
    if (p) { A.username = p.u; A.show = p.show; saveA(); }
    await sync({first:true});
  } catch(e) { toast(cloudMsg(e)); }
  if (S.user && S.user.onboarded) { const el = $('#ob'); if (el) el.remove(); OB = null; }
  render();
  if (!S.user || !S.user.onboarded) { if (!OB) startOnboarding(false); } else if (A && !A.username && syncState === 'ok') openUsername();
  return true;
}
function signOutLocal(){ A = null; idTok = null; clearTimeout(syncT); lsSet(AKEY, null); syncState = ''; syncAt = 0; }
const googleReady = () => !!window.WEB_VERSION || +(APPQ.get('s') || 0) >= 4;
async function googleLogin(){
  const r = await auth('createAuthUri', {providerId:'google.com', continueUri:FB.back, authFlowType:'CODE_FLOW', customParameter:{prompt:'select_account'}});
  if (!r.authUri) throw new CloudError('NO_GOOGLE');
  lsSet(PENDING, {sid:r.sessionId, state:new URL(r.authUri).searchParams.get('state'), t:Date.now()});
  save();
  location.href = r.authUri;     // Android: the app hands this to your browser
}
async function googleReturn(url){
  const p = lsGet(PENDING), q = new URL(url).searchParams;
  lsSet(PENDING, null);
  if (!p || Date.now() - p.t > 15 * 60000 || q.get('state') !== p.state) return toast('That login expired. Try again.');
  if (q.get('error')) return toast('Google login cancelled');
  try {
    const r = await auth('signInWithIdp', {requestUri:FB.back + '?' + q.toString(), sessionId:p.sid, returnSecureToken:true, returnIdpCredential:false});
    if (r.needConfirmation || !r.idToken) return toast('That email already uses a password. Log in with your email instead.');
    await signedIn(r, 'google');
  } catch(e) { toast(cloudMsg(e)); }
}
window.onAuthReturn = url => { googleReturn(FB.back + '?' + String(url).split('?').slice(1).join('?')); return true; };
function openLogin(startNew){
  let mode = startNew ? 'new' : 'in', email = '', busy = false;
  openSheet((b, sh) => {
    html(b, `<h2>${mode === 'new' ? 'Create an account' : 'Log in'}</h2><div class="muted small" style="margin:-8px 0 12px">Saves your data so it follows you to any phone, and lets you add friends.</div>
      ${googleReady() ? '<button class="secondary wide" id="gg"><b>G</b>&nbsp; Continue with Google</button>' : '<div class="muted small">Google login needs the newest app install (APK). Email works now.</div>'}
      <label class="f">Email</label><input class="text-in" id="em" type="email" autocomplete="email" autocapitalize="none" value="${esc(email)}">
      <label class="f">Password</label><input class="text-in" id="pw" type="password" autocomplete="${mode === 'new' ? 'new-password' : 'current-password'}">
      ${mode === 'new' ? `<div class="muted small" style="margin-top:8px">Your data is stored on Google Firebase in London. You can delete your account any time. ${googleReady() ? '<a href="https://lyrithai.github.io/gymtracker-updates/privacy.html" target="_blank" style="color:var(--accent)">Privacy</a>' : 'Privacy: lyrithai.github.io/gymtracker-updates/privacy.html'}</div>` : ''}
      <button class="primary wide" id="ok">${mode === 'new' ? 'Create account' : 'Log in'}</button>
      ${mode === 'in' ? '<button class="ghost wide" id="fp">Forgot password</button>' : ''}
      <button class="ghost wide" id="sw">${mode === 'new' ? 'I already have an account' : 'Create an account instead'}</button>`);
    const em = b.querySelector('#em'), pw = b.querySelector('#pw');
    em.oninput = () => email = em.value;
    const run = async (label, f) => { if (busy) return; busy = true; toast(label); try { await f(); } catch(e) { toast(cloudMsg(e)); } busy = false; };
    on(b, '#gg', () => run('Opening Google…', googleLogin));
    on(b, '#sw', () => { mode = mode === 'new' ? 'in' : 'new'; sh.refresh(); });
    on(b, '#fp', () => { if (!email.trim()) return toast('Type your email first'); run('Sending…', async () => {
      try { await auth('sendOobCode', {requestType:'PASSWORD_RESET', email:email.trim()}); } catch(e) { if (e.code !== 'EMAIL_NOT_FOUND') throw e; }
      toast('If that email has an account, a reset link is on its way'); }); });
    on(b, '#ok', () => run(mode === 'new' ? 'Creating…' : 'Logging in…', async () => {
      const r = await auth(mode === 'new' ? 'signUp' : 'signInWithPassword', {email:email.trim(), password:pw.value, returnSecureToken:true});
      await signedIn(r, 'password');
    }));
  });
}
async function logOut(){
  if (!confirm('Log out? Your data stays on this phone and in your account.')) return;
  try { while (sheets.length) closeSheet(); await sync(); } catch(e) {}
  signOutLocal(); render(); toast('Logged out');
}
async function deleteAccount(){
  if (!confirm('Delete your account, its saved copy and your friends list? This can\'t be undone. The data on this phone stays.')) return;
  try {
    const t = JSON.parse(atob((await token()).split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (Date.now() / 1000 - t.auth_time > 240) { alert('For safety, log out, log in again, then delete within a few minutes.'); return; }
    if (syncing) await syncing.catch(() => {});
    clearTimeout(syncT);
    const me = A.uid, root = 'users/' + me + '/data/', [meta] = await fsGet([root + 'meta']), fr = await fsQuery('friendships', 'users', me);
    const [p] = await fsGet(['profiles/' + me]);
    const w = fr.filter(f => f.status !== 'blocked' || f.blocker === me).map(f => wDel('friendships/' + f._id));
    for (let i = 0; meta && i < meta.n; i++) w.push(wDel(root + 'c' + i));
    if (meta) w.push(wDel(root + 'meta'));
    if (p) w.push(wDel('usernames/' + p.u), wDel('profiles/' + me));
    const tok = await token();
    if (w.length) await fsCommit(w);
    await auth('delete', {idToken:tok});
    await idb.del('base.' + me).catch(() => {});
    lsSet(OWNER, null); signOutLocal(); while (sheets.length) closeSheet(); render(); toast('Account deleted');
  } catch(e) { toast(cloudMsg(e)); }
}

/* ---------- settings ---------- */
function accountHtml(){
  return A ? `<div class="sec">Account</div><div class="card"><b>${A.username ? '@' + esc(A.username) : esc(A.email)}</b>${A.username ? `<div class="muted small">${esc(A.email)}</div>` : ''}<div class="muted small" id="syncline">${esc(syncText())}</div></div>
      <button class="secondary wide" data-cl="friends">👥 Friends</button><button class="secondary wide" data-cl="user">${A.username ? 'Change username' : 'Pick a username'}</button>
      ${A.username ? `<button class="secondary wide" data-cl="show">Friends can see my ranks: ${A.show ? 'On' : 'Off'}</button>` : ''}
      <button class="secondary wide" data-cl="out">Log out</button><button class="danger-link wide" data-cl="del">Delete account</button>`
    : `<div class="sec">Account</div><div class="muted small" style="margin-bottom:8px">Save your data to an account so it follows you to any phone, and see friends' ranks.</div>
      <button class="primary wide" data-cl="new">Create an account</button><button class="secondary wide" data-cl="in">Log in</button>`;
}
function accountButtons(b, sh){
  on(b, '[data-cl]', async x => {
    const k = x.dataset.cl;
    if (k === 'new' || k === 'in') openLogin(k === 'new');
    else if (k === 'friends') openFriends();
    else if (k === 'user') openUsername();
    else if (k === 'out') logOut();
    else if (k === 'del') deleteAccount();
    else if (k === 'show') { const was = A.show; A.show = !was; A.ranks = null; try { await publishRanks(); saveA(); sh.refresh(); } catch(e) { A.show = was; toast(cloudMsg(e)); } }
  });
}
/** called from main.js once the app is up */
function cloudStart(){
  const r = lsGet(RETURN);
  if (r) { lsSet(RETURN, null); googleReturn(r); }
  else if (A) queueSync(1500);
}
