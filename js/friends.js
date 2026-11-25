'use strict';
/* ================= username, friends, comparing ranks ================= */
const USER_RE = /^[a-z0-9_]{3,20}$/;
const pairId = (a, b) => a < b ? a + '_' + b : b + '_' + a;
const FRIEND_QR = 'GYMFRIEND:';
function rankSummary(){
  const R = computeRanks(), O = overallRank(R), m = {};
  Object.keys(UNITS).forEach(u => { if (R[u].best) m[u] = [R[u].tier, Math.round(R[u].score * 100) / 100]; });
  return JSON.stringify({o:O ? [O.tier, Math.round(O.avg * 100) / 100, O.n] : null, m});
}
/** Ranks only: no weights, lifts, food or bodyweight ever go in the part friends can read. */
async function publishRanks(){
  if (!A || !A.username) return;
  const ranks = A.show ? rankSummary() : '';
  if (ranks === A.ranks) return;
  await fsCommit([wSet('profiles/' + A.uid, {u:A.username, show:A.show, ranks, t:Date.now()})]);
  A.ranks = ranks; saveA();
}
/** Never trust what comes back: numbers only, known muscles only. */
function readRanks(s){
  try {
    const d = JSON.parse(s), m = {}, n = (v, lo, hi) => typeof v === 'number' && isFinite(v) ? clamp(v, lo, hi) : lo, T = TIERS.length - 1;
    Object.keys(UNITS).forEach(u => { const x = d.m && d.m[u]; if (Array.isArray(x)) m[u] = {tier:Math.round(n(x[0], -1, T)), score:n(x[1], 0, T), best:true}; });
    const fa = ['brachio','flexors','extensors'].map(u => m[u]).filter(Boolean).sort((a, b) => b.score - a.score)[0];
    return {m, fore:fa, o:Array.isArray(d.o) ? {tier:Math.round(n(d.o[0], 0, T)), avg:n(d.o[1], 0, T), n:Math.round(n(d.o[2], 0, 99))} : null};
  } catch(e) { return null; }
}
const tierName = t => t < 0 ? 'Unranked' : TIERS[t].n;
function openUsername(then){
  ask(A.username ? 'Change username' : 'Pick a username', [{k:'u', label:'Friends add you with this. Letters, numbers and _ (3 to 20).', v:A.username, type:'text', ph:'e.g. liftking'}], o => {
    const u = o.u.trim().toLowerCase().replace(/^@/, '');
    if (!USER_RE.test(u)) { toast('Use 3 to 20 letters, numbers or _'); return false; }
    if (u === A.username) return;
    setUsername(u).then(() => { closeSheet(); render(); toast('You\'re @' + u); if (then) then(); else if (sheets.length) sheets[sheets.length - 1].refresh(); }, e => toast(/ALREADY_EXISTS|FAILED_PRECONDITION|PERMISSION_DENIED/.test(e.code) ? '@' + u + ' is taken' : cloudMsg(e)));
    return false;
  });
}
async function setUsername(u){
  const ranks = A.show ? rankSummary() : '';
  await fsCommit([wSet('usernames/' + u, {uid:A.uid}, {exists:false})].concat(A.username ? [wDel('usernames/' + A.username)] : [], [wSet('profiles/' + A.uid, {u, show:A.show, ranks, t:Date.now()})]));
  A.username = u; A.ranks = ranks; saveA();
}
async function loadFriends(){
  const all = await fsQuery('friendships', 'users', A.uid), other = f => f.users.find(x => x !== A.uid);
  const fr = all.filter(f => f.status === 'friends'), profs = fr.length ? await fsGet(fr.map(f => 'profiles/' + other(f))) : [];
  const name = f => f.from === A.uid ? f.toName : f.fromName;
  return {
    friends:fr.map((f, i) => ({f, uid:other(f), name:(profs[i] && profs[i].u) || name(f), r:profs[i] && profs[i].show && profs[i].ranks ? readRanks(profs[i].ranks) : null})).sort((a, b) => (b.r && b.r.o ? b.r.o.avg + 1 : 0) - (a.r && a.r.o ? a.r.o.avg + 1 : 0)),
    inn:all.filter(f => f.status === 'pending' && f.to === A.uid).map(f => ({f, name:f.fromName})),
    out:all.filter(f => f.status === 'pending' && f.from === A.uid).map(f => ({f, name:f.toName})),
    blocked:all.filter(f => f.status === 'blocked' && f.blocker === A.uid).map(f => ({f, name:name(f)}))
  };
}
async function addFriend(raw){
  const u = String(raw).trim().toLowerCase().replace(/^@/, '');
  if (!USER_RE.test(u)) return toast('Type their username');
  if (u === A.username) return toast('That\'s you');
  const [x] = await fsGet(['usernames/' + u]);
  if (!x) return toast('No one is called @' + u);
  const id = pairId(A.uid, x.uid);
  const have = (await fsQuery('friendships', 'users', A.uid)).find(f => f._id === id);
  if (have) {
    if (have.status === 'pending' && have.to === A.uid) { await fsCommit([wSet('friendships/' + id, {status:'friends', blocker:''}, {exists:true}, ['status', 'blocker'])]); return toast('You\'re now friends with @' + u); }
    return toast(have.status === 'friends' ? 'You\'re already friends' : have.status === 'blocked' ? 'You can\'t add @' + u : 'Request already sent');
  }
  const users = [A.uid, x.uid].sort((a, b) => a < b ? -1 : 1);
  await fsCommit([wSet('friendships/' + id, {users, from:A.uid, to:x.uid, fromName:A.username, toName:u, status:'pending', blocker:'', t:Date.now()}, {exists:false})]);
  toast('Request sent to @' + u);
}
function openFriends(prefill){
  if (!A) return openLogin(true);
  if (!A.username) return openUsername(() => openFriends(prefill));
  let data = null, err = '', typed = prefill || '', busy = false, sheet;
  const load = async () => { try { data = await loadFriends(); err = ''; } catch(e) { err = cloudMsg(e); } if (sheets.includes(sheet)) sheet.refresh(); };
  const act = async f => { if (busy) return; busy = true; try { await f(); } catch(e) { toast(cloudMsg(e)); } busy = false; load(); };
  sheet = openSheet(b => {
    const mine = readRanks(rankSummary());
    html(b, `<h2>Friends</h2><div class="card"><div class="item"><span><span class="muted small">Your username</span><br><b>@${esc(A.username)}</b></span><button class="ghost" id="myqr">My QR</button></div></div>
      <div class="row"><input class="text-in grow" id="fu" autocapitalize="none" placeholder="Friend's username" value="${esc(typed)}"><button class="primary" id="fadd" style="min-width:64px">Add</button></div>
      <button class="ghost wide" id="fscan">▦ Scan a friend's QR</button>`);
    if (err) html(b, `<div class="coach warn">${esc(err)}</div>`);
    if (!data && !err) html(b, '<div class="muted" style="text-align:center;padding:24px">Loading…</div>');
    if (data) {
      if (data.inn.length) html(b, `<div class="sec">Requests</div>` + data.inn.map((x, i) => `<div class="card"><div class="item"><b>@${esc(x.name)}</b><span class="row"><button class="secondary" style="min-height:44px" data-no="${i}">Ignore</button><button class="primary" style="min-height:44px" data-yes="${i}">Accept</button></span></div></div>`).join(''));
      const board = data.friends.map((x, i) => ({x, i, name:'@' + x.name, o:x.r && x.r.o, hidden:!x.r})).concat({me:true, name:'You', o:mine && mine.o}).sort((p, q) => (q.o ? q.o.avg + 1 : 0) - (p.o ? p.o.avg + 1 : 0));
      html(b, `<div class="sec">Leaderboard</div>` + board.map((p, n) => `<button class="food-row" ${p.me ? 'disabled style="opacity:1"' : `data-f="${p.i}"`}><span class="muted" style="width:26px">${n + 1}</span><span class="grow"><div class="nm">${esc(p.name)}</div><div class="muted small">${p.o ? pl(p.o.n, 'muscle') + ' ranked' : p.hidden ? 'Ranks hidden' : 'No ranks yet'}</div></span><span class="kc" style="color:${p.o ? rankColor(p.o.tier) : 'var(--muted)'}">${p.o ? tierName(p.o.tier) : '–'}</span></button>`).join(''));
      if (!data.friends.length) html(b, '<div class="empty">No friends yet. Add someone by username or QR.</div>');
      if (data.out.length) html(b, `<div class="sec">Sent</div>` + data.out.map((x, i) => `<div class="item" style="padding:6px 0"><span>@${esc(x.name)} <span class="muted small">waiting</span></span><button class="ghost" data-cancel="${i}">Cancel</button></div>`).join(''));
      if (data.blocked.length) html(b, `<div class="sec">Blocked</div>` + data.blocked.map((x, i) => `<div class="item" style="padding:6px 0"><span>@${esc(x.name)}</span><button class="ghost" data-unb="${i}">Unblock</button></div>`).join(''));
    }
    const fu = b.querySelector('#fu'); fu.oninput = () => typed = fu.value;
    on(b, '#fadd', () => act(async () => { await addFriend(typed); typed = ''; }));
    on(b, '#myqr', () => showMyQR());
    on(b, '#fscan', () => openScanner(() => {}));
    on(b, '[data-yes]', x => act(() => fsCommit([wSet('friendships/' + data.inn[x.dataset.yes].f._id, {status:'friends', blocker:''}, {exists:true}, ['status', 'blocker'])])));
    on(b, '[data-no]', x => act(() => fsCommit([wDel('friendships/' + data.inn[x.dataset.no].f._id)])));
    on(b, '[data-cancel]', x => act(() => fsCommit([wDel('friendships/' + data.out[x.dataset.cancel].f._id)])));
    on(b, '[data-unb]', x => act(() => fsCommit([wDel('friendships/' + data.blocked[x.dataset.unb].f._id)])));
    on(b, '[data-f]', x => openFriend(data.friends[x.dataset.f], act));
  }, {full:true});
  load();
}
function openFriend(x, act){
  const mine = readRanks(rankSummary()), r = x.r;
  openSheet(b => {
    html(b, `<h2>@${esc(x.name)}</h2>`);
    if (!r) html(b, '<div class="muted">Their ranks are hidden or not shared yet.</div>');
    else {
      const fill = k => { const u = rankKey(k), v = u === 'forearms' ? r.fore : r.m[u]; return rankColor(v ? v.tier : -1); };
      html(b, `<div class="card" style="text-align:center"><div class="muted small">Overall</div><div style="font-size:26px;font-weight:900;color:${r.o ? rankColor(r.o.tier) : 'var(--muted)'}">${r.o ? tierName(r.o.tier) : 'Unranked'}</div><div class="muted small">You: ${mine && mine.o ? tierName(mine.o.tier) : 'Unranked'}</div></div>
        <div class="bodies"><div><div class="muted tiny" style="text-align:center">FRONT</div>${bodySvg(BODY_FRONT, fill, false)}</div><div><div class="muted tiny" style="text-align:center">BACK</div>${bodySvg(BODY_BACK, fill, false)}</div></div>
        <div class="item muted small" style="padding:8px 0"><span>Muscle</span><span class="row"><span style="width:84px;text-align:right">You</span><span style="width:84px;text-align:right">@${esc(x.name.slice(0, 9))}</span></span></div>`);
      const cell = (v, win) => `<span style="width:84px;text-align:right;color:${v ? rankColor(Math.max(0, v.tier)) : 'var(--muted)'};font-weight:${win ? 800 : 400}">${v ? tierName(v.tier) : '–'}</span>`;
      html(b, UNIT_GROUPS.map(([, list]) => list.map(([u, label]) => { const a = mine && mine.m[u], z = r.m[u]; return a || z ? `<div class="item small" style="padding:9px 0;border-bottom:1px solid var(--line)"><span>${label}</span><span class="row">${cell(a, (a ? a.score : -1) > (z ? z.score : -1))}${cell(z, (z ? z.score : -1) > (a ? a.score : -1))}</span></div>` : ''; }).join('')).join(''));
    }
    html(b, '<button class="secondary wide" data-rm>Remove friend</button><button class="danger-link wide" data-bl>Block</button>');
    on(b, '[data-rm]', () => { if (!confirm('Remove @' + x.name + '?')) return; closeSheet(); act(() => fsCommit([wDel('friendships/' + x.f._id)])); });
    on(b, '[data-bl]', () => { if (!confirm('Block @' + x.name + '? They can\'t see your ranks or add you again.')) return; closeSheet(); act(() => fsCommit([wSet('friendships/' + x.f._id, {status:'blocked', blocker:A.uid}, {exists:true}, ['status', 'blocker'])])); });
  }, {full:true});
}
function showMyQR(){
  openSheet(b => {
    html(b, `<h2>@${esc(A.username)}</h2><div class="qrbox" style="background:#fff;border-radius:16px;padding:16px;width:260px;margin:0 auto"></div><div class="muted small" style="text-align:center;margin-top:12px">Your friend opens Friends → Scan a friend's QR</div>`);
    const w = new ZXing.BrowserQRCodeSvgWriter(); b.querySelector('.qrbox').appendChild(w.write(FRIEND_QR + A.username, 228, 228));
  });
}
/** scanner hook: true if the code was a friend's */
function friendCode(text){
  if (!String(text).startsWith(FRIEND_QR)) return false;
  const u = text.slice(FRIEND_QR.length).trim().toLowerCase(); if (!USER_RE.test(u)) return false;
  while (sheets.length) closeSheet();
  openFriends(u);
  return true;
}
ACTIONS.friends = () => openFriends();
function friendsCard(){
  return `<button class="card tap" style="color:var(--text)" data-act="friends"><div class="item"><b>👥 Friends</b><span class="muted small">›</span></div><div class="muted small">${A ? 'Compare ranks and see the leaderboard' : 'Make an account to compare ranks with friends'}</div></button>`;
}
