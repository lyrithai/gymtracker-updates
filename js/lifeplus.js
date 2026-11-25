'use strict';
/* ================= body and life extras: photos, measurements, trend, forecast, reminders, focus timer, month recap, themes ================= */

/* ---------- 34 + 35: smoothed weight and forecast ---------- */
/** Each weigh-in pulls the trend part of the way towards it; longer gaps pull harder. */
function weightTrend(){
  let t = null, last = 0;
  return S.body.weights.map(w => { const n = dayNum(w.d); t = t == null ? w.kg : t + (w.kg - t) * (1 - Math.pow(.88, Math.max(1, n - last))); last = n; return {d:w.d, kg:t}; });
}
function weightRate(days){
  const from = dadd(today(), -(days || 28)), p = weightTrend().filter(w => w.d >= from);
  if (p.length < 4 || dayNum(p[p.length - 1].d) - dayNum(p[0].d) < 10) return null;
  return linFit(p.map(w => [dayNum(w.d), w.kg])) * 7;
}
function forecastCard(){
  const tr = weightTrend(); if (tr.length < 2) return '';
  const now = tr[tr.length - 1].kg, rate = weightRate(28), g = S.body.goalKg;
  let h = `<div class="card"><div class="item"><b>Trend weight</b><b style="color:var(--accent)">${r1(now)} kg</b></div><div class="muted small">Smooths out water and salt. ${rate == null ? 'Weigh in over 10+ days for your rate.' : 'Moving ' + (rate >= 0 ? '+' : '') + (Math.round(rate * 100) / 100) + ' kg a week.'}</div>`;
  if (g) {
    const diff = g - now, weeks = rate ? diff / rate : -1;
    h += `<div class="coach ${weeks > 0 ? 'up' : ''}" style="margin-top:8px">${Math.abs(diff) < .3 ? 'You\'re at your goal of ' + r1(g) + ' kg.' : rate == null ? 'Goal ' + r1(g) + ' kg. The date shows once there\'s enough data.' : Math.abs(rate) < .05 ? 'Goal ' + r1(g) + ' kg. Your weight is flat, so there\'s no date at this rate.' : weeks < 0 ? 'Goal ' + r1(g) + ' kg. You\'re moving the other way right now.' : weeks > 104 ? 'Goal ' + r1(g) + ' kg. More than two years away at this rate.' : `At this rate you reach <b>${r1(g)} kg</b> around <b>${dparse(dadd(today(), Math.round(weeks * 7))).toLocaleDateString(undefined, {day:'numeric', month:'long', year:'numeric'})}</b>.`}</div>`;
  }
  return h + `<button class="ghost" data-act="goal-kg">${g ? 'Change goal weight' : 'Set a goal weight'}</button></div>`;
}
ACTIONS['goal-kg'] = () => ask('Goal weight', [{k:'kg', label:'kg (leave empty for none)', v:S.body.goalKg || '', type:'number'}], o => {
  if (o.kg == null) { S.body.goalKg = null; save(); render(); return; }
  if (!(o.kg >= 30 && o.kg <= 300)) { toast('Enter a weight in kg'); return false; }
  const bmi = o.kg / Math.pow(S.food.profile.height / 100, 2);
  if (bmi < 18.5 && o.kg < bodyweight() && !confirm('That\'s under the healthy range for your height (' + r1(18.5 * Math.pow(S.food.profile.height / 100, 2)) + ' kg and up). It\'s worth talking to a GP first. Set it anyway?')) return false;
  S.body.goalKg = o.kg; save(); render();
});

/* ---------- 33: tape measurements ---------- */
const TAPE = ['Waist', 'Chest', 'Shoulders', 'Left arm', 'Right arm', 'Forearm', 'Hips', 'Left thigh', 'Right thigh', 'Calf', 'Neck'];
const tapeS = () => S.body.tape = S.body.tape || [];   // [{id, d, m:{Waist:80}}]
let tapeKey = 'Waist';
ACTIONS.tape = () => openSheet((s, sh) => {
  const L = tapeS().slice().sort((a, b) => a.d.localeCompare(b.d)), used = TAPE.filter(k => L.some(x => x.m[k] != null)); if (used.length && !used.includes(tapeKey)) tapeKey = used[0];
  html(s, `<h2>Measurements</h2><button class="primary wide" data-n>＋ Measure today</button>`);
  if (!used.length) html(s, '<div class="empty">Same time of day, same spot, tape snug but not tight.</div>');
  else {
    const pts = L.filter(x => x.m[tapeKey] != null).map(x => ({t:dparse(x.d).getTime(), v:x.m[tapeKey]})), ch = pts[pts.length - 1].v - pts[0].v;
    html(s, `<div class="pills" style="margin:12px 0 8px">${used.map(k => `<button class="pill ${k === tapeKey ? 'on' : ''}" data-k="${k}">${k}</button>`).join('')}</div><div class="card"><div class="item"><b>${tapeKey}: ${r1(pts[pts.length - 1].v)} cm</b><span class="muted small">${pts.length > 1 ? (ch >= 0 ? '+' : '') + r1(ch) + ' cm since ' + dlabel(L.find(x => x.m[tapeKey] != null).d) : ''}</span></div><canvas id="tapec"></canvas></div>` +
      L.slice().reverse().slice(0, 20).map(x => `<div class="item small" style="border-bottom:1px solid var(--line)"><button class="tap grow" style="background:none;color:var(--text);min-height:44px;padding:0" data-e="${x.id}">${dlabel(x.d)} · <span class="muted">${Object.entries(x.m).map(([k, v]) => k + ' ' + r1(v)).join(', ')}</span></button><button class="icon" data-d="${x.id}" aria-label="Delete">✕</button></div>`).join(''));
    setTimeout(() => drawLine(s.querySelector('#tapec'), pts), 0);
  }
  const edit = x => ask(x ? dlabel(x.d) : 'Measure today (cm)', TAPE.map(k => ({k, label:k, v:x && x.m[k] != null ? x.m[k] : '', type:'number'})), o => {
    const m = {}; TAPE.forEach(k => { if (o[k] > 5 && o[k] < 300) m[k] = o[k]; }); if (!Object.keys(m).length) { toast('Fill in at least one'); return false; }
    if (x) x.m = m; else { const t = tapeS().find(y => y.d === today()); if (t) Object.assign(t.m, m); else tapeS().push({id:uid(), d:today(), m}); } save(); sh.refresh();
  });
  on(s, '[data-n]', () => edit(null)); on(s, '[data-e]', b => edit(tapeS().find(x => x.id === b.dataset.e))); on(s, '[data-k]', b => { tapeKey = b.dataset.k; sh.refresh(); });
  on(s, '[data-d]', b => { if (!confirm('Delete this measurement?')) return; S.body.tape = tapeS().filter(x => x.id !== b.dataset.d); save(); sh.refresh(); });
}, {full:true});

/* ---------- 32: progress photos (this phone only: never synced or shared) ---------- */
const Photos = {
  db:null,
  open(){ return this.db ? Promise.resolve(this.db) : new Promise((ok, bad) => { const r = indexedDB.open('gymtracker.photos', 1); r.onupgradeneeded = () => r.result.createObjectStore('p', {keyPath:'id'}); r.onsuccess = () => ok(this.db = r.result); r.onerror = () => bad(r.error); }); },
  async run(mode, fn){ const db = await this.open(); return new Promise((ok, bad) => { const t = db.transaction('p', mode), r = fn(t.objectStore('p')); t.oncomplete = () => ok(r && r.result); t.onerror = t.onabort = () => bad(t.error); }); },
  all(){ return this.run('readonly', s => s.getAll()).then(l => l.sort((a, b) => a.d.localeCompare(b.d) || a.at - b.at)); },
  put(x){ return this.run('readwrite', s => s.put(x)); },
  del(id){ return this.run('readwrite', s => s.delete(id)); }
};
const POSES = ['Front', 'Side', 'Back'];
const shrink = (src, w, h) => { const k = Math.min(1, 1280 / Math.max(w, h)), c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k); c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', .85); };
ACTIONS.photos = () => {
  let list = null, pose = 'Front', cmp = null;
  const root = openSheet((s, sh) => {
    html(s, `<h2>Progress photos</h2><div class="seg">${POSES.map(p => `<button data-p="${p}" class="${p === pose ? 'on' : ''}">${p}</button>`).join('')}</div>`);
    if (!list) { html(s, '<div class="empty">Loading…</div>'); Photos.all().then(l => { list = l; sh.refresh(); }).catch(() => { list = []; sh.refresh(); toast('Photos aren\'t available here'); }); }
    else {
      const L = list.filter(x => x.pose === pose);
      html(s, `<div class="quick" style="margin-top:10px"><button class="primary" data-cam>📷 Take photo</button><button class="secondary" data-up>From gallery</button></div><input type="file" accept="image/*" id="pf" style="display:none">`);
      if (L.length > 1) {
        const a = L.find(x => cmp && x.id === cmp[0]) || L[0], b = L.find(x => cmp && x.id === cmp[1]) || L[L.length - 1];
        html(s, `<div class="sec">Then and now</div><div class="ba"><img src="${b.img}" alt="${esc(b.d)}"><div class="ba-top"><img src="${a.img}" alt="${esc(a.d)}"></div><i></i><span class="ba-l">${dlabel(a.d)}</span><span class="ba-r">${dlabel(b.d)}</span></div><input type="range" min="0" max="100" value="50" id="bar" style="width:100%;min-height:44px" aria-label="Slide to compare">
          <div class="grid2"><select data-c="0">${L.map(x => `<option value="${x.id}" ${x === a ? 'selected' : ''}>${dlabel(x.d)}</option>`).join('')}</select><select data-c="1">${L.map(x => `<option value="${x.id}" ${x === b ? 'selected' : ''}>${dlabel(x.d)}</option>`).join('')}</select></div>`);
        const set = v => { s.querySelector('.ba-top').style.clipPath = `inset(0 ${100 - v}% 0 0)`; s.querySelector('.ba i').style.left = v + '%'; }; set(50); s.querySelector('#bar').oninput = e => set(+e.target.value);
        s.querySelectorAll('[data-c]').forEach(x => x.onchange = () => { cmp = [a.id, b.id]; cmp[+x.dataset.c] = x.value; sh.refresh(); });
      }
      html(s, `<div class="sec">All ${pose.toLowerCase()} photos</div>` + (L.length ? `<div class="pgrid">${L.slice().reverse().map(x => `<button data-v="${x.id}"><img src="${x.img}" alt=""><span>${dlabel(x.d)}${x.kg ? ' · ' + r1(x.kg) + ' kg' : ''}</span></button>`).join('')}</div>` : '<div class="empty">Same light, same spot, every couple of weeks. The camera shows your last photo faintly so you can line up.</div>') +
        '<div class="muted tiny" style="margin-top:10px">Photos stay on this phone only. They aren\'t in your account, your backup or the friends page, so uninstalling the app deletes them.</div>');
      const add = async img => { const x = {id:uid(), at:Date.now(), d:today(), pose, img, kg:bodyweight()}; try { await Photos.put(x); list.push(x); sh.refresh(); toast('Photo saved'); } catch(e) { toast('Could not save: storage may be full'); } };
      on(s, '[data-cam]', () => ghostCamera(L[L.length - 1], add));
      on(s, '[data-up]', () => s.querySelector('#pf').click());
      s.querySelector('#pf').onchange = e => { const f = e.target.files[0]; if (!f) return; const u = URL.createObjectURL(f), im = new Image(); im.onload = () => { add(shrink(im, im.naturalWidth, im.naturalHeight)); URL.revokeObjectURL(u); }; im.onerror = () => toast('That isn\'t a photo this phone can open'); im.src = u; };
      on(s, '[data-v]', b => { const x = list.find(y => y.id === b.dataset.v); openSheet(v => { html(v, `<h2>${dlabel(x.d)}</h2><img src="${x.img}" style="width:100%;border-radius:14px" alt=""><button class="danger-link wide" data-del>Delete photo</button>`); on(v, '[data-del]', async () => { if (!confirm('Delete this photo? It can\'t be undone.')) return; await Photos.del(x.id); list = list.filter(y => y !== x); closeSheet(); sh.refresh(); }); }, {full:true}); });
    }
    on(s, '[data-p]', b => { pose = b.dataset.p; cmp = null; sh.refresh(); });
  }, {full:true});
  return root;
};
function ghostCamera(prev, done){
  let stream = null, face = 'environment', op = .35, dead = false;
  const sh = openSheet((s, me) => {
    html(s, `<h2>Line up</h2><div class="ghost-cam"><video playsinline muted autoplay></video>${prev ? `<img src="${prev.img}" style="opacity:${op}" alt="">` : ''}<b id="cd"></b></div>${prev ? `<input type="range" min="0" max="80" value="${op * 100}" id="go" style="width:100%;min-height:44px" aria-label="How strong the last photo shows">` : ''}
      <div class="quick"><button class="primary" data-s="0">Take it</button><button class="secondary" data-s="5">5 s timer</button><button class="secondary" data-f>Flip</button></div><div class="muted small" id="gm" style="margin-top:8px"></div>`);
    const v = s.querySelector('video'), msg = t => { const m = s.querySelector('#gm'); if (m) m.textContent = t; };
    const start = async () => { try { if (stream) stream.getTracks().forEach(t => t.stop()); const st = await navigator.mediaDevices.getUserMedia({video:{facingMode:face, width:{ideal:1280}, height:{ideal:1280}}}); if (dead) return st.getTracks().forEach(t => t.stop()); stream = st; v.srcObject = st; v.style.transform = face === 'user' ? 'scaleX(-1)' : ''; await v.play(); } catch(e) { msg('Camera not available. Allow camera access, or use From gallery.'); } };
    start();
    const g = s.querySelector('#go'); if (g) g.oninput = () => { op = g.value / 100; s.querySelector('.ghost-cam img').style.opacity = op; };
    on(s, '[data-f]', () => { face = face === 'user' ? 'environment' : 'user'; start(); });
    on(s, '[data-s]', b => { let n = +b.dataset.s; const cd = s.querySelector('#cd'); const go = () => { if (dead) return; if (n > 0) { cd.textContent = n--; return setTimeout(go, 1000); } cd.textContent = ''; if (!v.videoWidth) return msg('The camera isn\'t ready yet.');
      const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; const x = c.getContext('2d'); if (face === 'user') { x.translate(c.width, 0); x.scale(-1, 1); } x.drawImage(v, 0, 0); const img = shrink(c, c.width, c.height); closeSheet(); done(img); }; go(); });
  }, {full:true});
  sh.onClose = () => { dead = true; if (stream) stream.getTracks().forEach(t => t.stop()); };
}

/* ---------- 45: reminders (Android app) ---------- */
const NATIVE = window.GTNative && typeof window.GTNative.setReminders === 'function' ? window.GTNative : null;
const REM_KINDS = [['Breakfast', 'Log your breakfast', 'food/diary', 540], ['Lunch', 'Log your lunch', 'food/diary', 780], ['Dinner', 'Log your dinner', 'food/diary', 1170], ['Water', 'Time for some water', 'today', 900], ['Training', 'Time to train', 'gym/workout', 1020], ['Weigh in', 'Hop on the scales', 'life/body', 450], ['Supplements', 'Take your supplements', 'today', 510], ['Bedtime', 'Wind down', 'life/schedule', 1350], ['Last coffee', 'Caffeine cutoff', 'caffeine', 840]];
const remS = () => S.reminders = S.reminders || [];
function pushReminders(){ if (NATIVE) NATIVE.setReminders(JSON.stringify(remS().filter(r => r.on).map(r => ({id:r.id, title:r.title, body:r.body, min:r.min, days:r.days, go:r.go})))); }
ACTIONS.reminders = () => openSheet((s, sh) => {
  html(s, '<h2>Reminders</h2>');
  if (!NATIVE) return html(s, `<div class="empty">${window.WEB_VERSION ? 'iPhone home-screen apps can\'t set these without a server. Use the Clock or Reminders app for now.' : 'Install the newest Android app to use reminders.'}</div>`);
  if (!NATIVE.notifyAllowed()) html(s, '<div class="coach warn">Notifications are off for this app.</div><button class="primary wide" data-ask>Allow notifications</button>');
  html(s, remS().slice().sort((a, b) => a.min - b.min).map(r => `<div class="food-row"><button class="tick ${r.on ? 'on' : ''}" data-t="${r.id}" aria-label="On or off">${r.on ? '✓' : ''}</button><button class="tap grow" style="background:none;color:var(--text);padding:0;min-height:44px" data-e="${r.id}"><div class="nm">${esc(r.title)}</div><div class="muted small">${fmtT(r.min)} · ${daysLabel(r.days)}</div></button><button class="icon" data-d="${r.id}" aria-label="Delete">✕</button></div>`).join('') +
    `<div class="sec">Add one</div><div class="chips">${REM_KINDS.map((k, i) => `<button class="pill" data-k="${i}">${k[0]}</button>`).join('')}<button class="pill" data-k="own">Your own</button></div><div class="muted tiny" style="margin-top:10px">Android may show them a few minutes late to save battery.</div>`);
  const edit = (r, isNew) => openSheet((b, me) => {
    html(b, `<h2>${isNew ? 'New reminder' : 'Edit reminder'}</h2><label class="f">Says</label><input class="text-in" id="rt" value="${esc(r.title)}"><label class="f">Time</label><input class="text-in" type="time" id="rm" value="${toHM(r.min)}"><label class="f">Days</label><div class="cal">${WEEKDAYS.map((w, i) => `<button class="cal-day ${r.days.includes(i) ? 'on' : ''}" style="min-height:48px" data-w="${i}"><b>${w}</b></button>`).join('')}</div><button class="primary wide" data-ok>Save</button>`);
    const keep = () => { r.title = b.querySelector('#rt').value.trim() || r.title; const v = fromHM(b.querySelector('#rm').value); if (v != null) r.min = v; };
    on(b, '[data-w]', x => { keep(); const i = +x.dataset.w; r.days = r.days.includes(i) ? r.days.filter(y => y !== i) : r.days.concat(i); me.refresh(); });
    on(b, '[data-ok]', () => { keep(); if (!r.days.length) return toast('Pick a day'); if (isNew) remS().push(r); else Object.assign(remS().find(x => x.id === r.id), r); save(); pushReminders(); closeSheet(); sh.refresh(); if (!NATIVE.notifyAllowed()) NATIVE.notifyAsk(); });
  });
  on(s, '[data-ask]', () => NATIVE.notifyAsk());
  on(s, '[data-k]', b => { const k = REM_KINDS[+b.dataset.k]; edit({id:uid(), title:k ? k[0] : 'Reminder', body:k ? k[1] : '', go:k ? k[2] : 'today', min:k ? k[3] : 720, days:[0, 1, 2, 3, 4, 5, 6], on:true}, true); });
  on(s, '[data-e]', b => edit(JSON.parse(JSON.stringify(remS().find(x => x.id === b.dataset.e))), false));
  on(s, '[data-t]', b => { const r = remS().find(x => x.id === b.dataset.t); r.on = !r.on; save(); pushReminders(); sh.refresh(); });
  on(s, '[data-d]', b => { S.reminders = remS().filter(x => x.id !== b.dataset.d); save(); pushReminders(); sh.refresh(); });
}, {full:true});
window.onNotify = () => { const s = sheets[sheets.length - 1]; if (s) s.refresh(); };

/* ---------- 49: focus timer ---------- */
const focusS = () => { const f = S.focus = S.focus || {}; f.log = f.log || []; if (f.on === undefined) f.on = null; return f; };   // on: {title, start, end}
const focusLeft = () => { const o = focusS().on; return o ? Math.max(0, Math.round((o.end - Date.now()) / 1000)) : 0; };
const mmss = s => (s >= 3600 ? Math.floor(s / 3600) + ':' + String(Math.floor(s % 3600 / 60)).padStart(2, '0') : Math.floor(s / 60)) + ':' + String(s % 60).padStart(2, '0');
function focusCard(){ const o = focusS().on; return o ? `<button class="card tap" style="color:var(--text)" data-act="focus"><div class="item"><b>🎯 ${esc(o.title)}</b><b class="focus-t" style="color:var(--accent)">${mmss(focusLeft())}</b></div></button>` : ''; }
function startFocus(title, min){ beepReady(); focusS().on = {title, start:Date.now(), end:Date.now() + min * 60000}; save(); }
function endFocus(done){
  const f = focusS(), o = f.on; if (!o) return;
  const min = Math.round((Math.min(Date.now(), o.end) - o.start) / 60000); f.on = null;
  if (min >= 1) f.log.push({id:uid(), d:dkey(new Date(o.start)), title:o.title, min});
  save(); if (done) { try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch(e) {} beep(); toast(o.title + ': ' + min + ' min done'); }
  const s = sheets[sheets.length - 1]; if (s && s.focus) s.refresh(); if (!sheets.length) render();
}
setInterval(() => { if (typeof S === 'undefined' || !S || !S.focus || !S.focus.on) return; if (focusLeft() <= 0) return endFocus(true); document.querySelectorAll('.focus-t').forEach(t => t.textContent = mmss(focusLeft())); }, 1000);
ACTIONS.focus = () => {
  let title = '', min = 25;
  const sh = openSheet((s, me) => {
    const f = focusS(), n = nowNext(), cur = n.cur.filter(x => !/sleep/i.test(x.b.title))[0], wk = {}; f.log.filter(x => x.d >= weekStart()).forEach(x => wk[x.title] = (wk[x.title] || 0) + x.min);
    html(s, '<h2>Focus timer</h2>');
    if (f.on) html(s, `<div class="card" style="text-align:center"><div class="muted">${esc(f.on.title)}</div><div class="focus-t" style="font-size:56px;font-weight:900">${mmss(focusLeft())}</div></div><button class="danger-btn wide" data-stop>Stop</button>`);
    else {
      title = title || (cur ? cur.b.title : '');
      html(s, `<label class="f">On what?</label><input class="text-in" id="ft" value="${esc(title)}" placeholder="Study, work, reading"><div class="chips">${[...new Set(S.blocks.map(b => b.title))].filter(t => !/sleep/i.test(t)).slice(0, 8).map(t => `<button class="pill" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div>
        <label class="f">For how long?</label><div class="seg">${[15, 25, 50, 90].map(m => `<button data-m="${m}" class="${m === min ? 'on' : ''}">${m} min</button>`).join('')}</div>${cur && cur.to - nowMin() > 4 ? `<button class="secondary wide" data-end="${cur.to - nowMin()}">Until ${esc(cur.b.title)} ends (${fmtLen(cur.to - nowMin())})</button>` : ''}<button class="primary wide" data-go>Start</button>`);
      const i = s.querySelector('#ft'); i.oninput = () => { title = i.value; };
    }
    html(s, `<div class="sec">This week</div>` + (Object.keys(wk).length ? Object.entries(wk).sort((a, b) => b[1] - a[1]).map(([t, m]) => `<div class="item small" style="padding:6px 0"><span>${esc(t)}</span><b>${fmtLen(m)}</b></div>`).join('') : '<div class="muted small">Nothing yet.</div>'));
    on(s, '[data-t]', b => { title = b.dataset.t; me.refresh(); }); on(s, '[data-m]', b => { min = +b.dataset.m; me.refresh(); });
    on(s, '[data-go]', () => { startFocus(title.trim() || 'Focus', min); me.refresh(); render(); }); on(s, '[data-end]', b => { startFocus(title.trim() || cur.b.title, +b.dataset.end); me.refresh(); render(); });
    on(s, '[data-stop]', () => { endFocus(false); me.refresh(); render(); });
  });
  sh.focus = true;
};

/* ---------- 50: month recap ---------- */
function monthStats(ym){
  const inM = d => d.startsWith(ym), W = S.workouts.filter(w => inM(dkey(new Date(w.start)))), food = Object.keys(S.food.log).filter(d => inM(d) && S.food.log[d].length && dayTotals(d).t[0] > 500);
  const before = {}; let prs = 0; S.workouts.forEach(w => { const m = inM(dkey(new Date(w.start))); w.exercises.forEach(e => { const b = bestOf(e.sets); if (before[e.exId] != null && b > before[e.exId] * 1.001 && m) prs++; before[e.exId] = Math.max(before[e.exId] || 0, b); }); });
  const tr = weightTrend().filter(w => inM(w.d)), cnt = {}; W.forEach(w => w.exercises.forEach(e => cnt[exName(e.exId)] = (cnt[exName(e.exId)] || 0) + e.sets.length));
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
  return {W:W.length, vol:W.reduce((a, w) => a + volume(w), 0), sets:W.reduce((a, w) => a + setCount(w), 0), min:W.reduce((a, w) => a + (w.end - w.start) / 60000, 0), prs, top:top && top[0], cardio:cardioS().log.filter(x => inM(x.d)).reduce((a, x) => a + x.min, 0), food:food.length,
    kcal:food.length ? food.reduce((a, d) => a + dayTotals(d).t[0], 0) / food.length : 0, prot:food.length ? food.reduce((a, d) => a + dayTotals(d).t[1], 0) / food.length : 0, kg:tr.length > 1 ? tr[tr.length - 1].kg - tr[0].kg : null, ticks:S.habits.reduce((a, h) => a + Object.keys(h.days).filter(inM).length, 0), focus:focusS().log.filter(x => inM(x.d)).reduce((a, x) => a + x.min, 0)};
}
function drawRecap(c, ym){
  const m = monthStats(ym), W = 1080, H = 1350, g = c.getContext('2d'), css = getComputedStyle(document.documentElement), col = n => css.getPropertyValue(n).trim(); c.width = W; c.height = H;
  const font = (z, b) => g.font = (b ? '800 ' : '500 ') + z + 'px system-ui,Roboto,sans-serif';
  g.fillStyle = col('--bg'); g.fillRect(0, 0, W, H); const gr = g.createRadialGradient(W, 0, 50, W, 0, 900); gr.addColorStop(0, col('--accent') + '55'); gr.addColorStop(1, col('--accent') + '00'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = col('--text'); font(84, 1); g.fillText(dparse(ym + '-01').toLocaleDateString(undefined, {month:'long'}), 80, 150); g.fillStyle = col('--muted'); font(36); g.fillText(dparse(ym + '-01').getFullYear() + (S.user && S.user.name ? ' · ' + S.user.name : ''), 80, 205);
  const cells = [[m.W, 'workouts'], [m.prs, 'new bests'], [fmtNum(m.vol * F()), S.unit + ' lifted'], [m.sets, 'hard sets'], [Math.round(m.cardio), 'cardio minutes'], [m.food, 'days of food logged'], [m.prot ? Math.round(m.prot) + ' g' : '–', 'protein a day'], [m.kg == null ? '–' : (m.kg >= 0 ? '+' : '') + r1(m.kg) + ' kg', 'trend weight'], [m.ticks, 'habits ticked'], [m.focus ? fmtLen(Math.round(m.focus)) : '–', 'focused']];
  cells.forEach(([v, l], i) => { const x = 80 + (i % 2) * 470, y = 270 + Math.floor(i / 2) * 178; g.fillStyle = col('--card'); g.beginPath(); g.roundRect ? g.roundRect(x, y, 450, 158, 28) : g.rect(x, y, 450, 158); g.fill(); g.fillStyle = i < 2 ? col('--accent') : col('--text'); let z = 62; font(z, 1); while (g.measureText(String(v)).width > 400 && z > 24) font(z -= 2, 1); g.fillText(v, x + 28, y + 80); g.fillStyle = col('--muted'); font(30); g.fillText(l, x + 28, y + 126); });
  if (m.top) { g.fillStyle = col('--muted'); font(34); g.fillText('Most trained: ', 80, 1240); const w = g.measureText('Most trained: ').width; g.fillStyle = col('--text'); let z = 34; font(z, 1); while (g.measureText(m.top).width > 900 - w && z > 18) font(--z, 1); g.fillText(m.top, 80 + w, 1240); }
}
ACTIONS.recap = () => {
  let off = new Date().getDate() <= 5 ? 1 : 0;
  openSheet((s, sh) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - off); const ym = dkey(d).slice(0, 7), share = !!(navigator.canShare && window.File);
    html(s, `<h2>Month recap</h2><div class="datebar"><button class="icon" data-o="1" aria-label="Earlier">‹</button><b>${d.toLocaleDateString(undefined, {month:'long', year:'numeric'})}</b><button class="icon" data-o="-1" aria-label="Later" ${off ? '' : 'disabled style="opacity:.3"'}>›</button></div><canvas id="rc" style="width:100%;height:auto;border-radius:18px"></canvas><div class="muted small" style="margin-top:8px">${window.WEB_VERSION && share ? '' : 'Screenshot it to share.'}</div>${window.WEB_VERSION && share ? '<button class="primary wide" data-s>Share</button>' : ''}`);
    const c = s.querySelector('#rc'); drawRecap(c, ym);
    on(s, '[data-o]', b => { off = Math.max(0, off + +b.dataset.o); sh.refresh(); });
    on(s, '[data-s]', () => c.toBlob(async bl => { const f = new File([bl], 'recap.png', {type:'image/png'}); try { if (navigator.canShare({files:[f]})) await navigator.share({files:[f]}); else toast('Sharing isn\'t available here. Screenshot it instead.'); } catch(e) {} }));
  }, {full:true});
};

/* ---------- colour themes ---------- */
const THEMES = {lime:['Lime', '#a3e635', '#13210a'], blue:['Blue', '#60a5fa', '#071a33'], purple:['Purple', '#c084fc', '#220a35'], pink:['Pink', '#f472b6', '#350a20'], red:['Red', '#f87171', '#350a0a'], orange:['Orange', '#fb923c', '#331604'], gold:['Gold', '#fbbf24', '#2e2003'], teal:['Teal', '#2dd4bf', '#04241f'], white:['White', '#f1f5f9', '#10151d']};
const BACKS = {dark:['Dark', '#0f1115', '#1a1d24', '#22262f', '#2c313c', '#151821'], black:['Pure black', '#000000', '#101114', '#1a1c21', '#25282f', '#08090b'], navy:['Navy', '#0b1220', '#131d31', '#1c2942', '#293856', '#101a2c'], plum:['Plum', '#150f1c', '#20172b', '#2c203a', '#3b2d4c', '#1b1324']};
function applyTheme(){
  const t = THEMES[S.theme] || THEMES.lime, b = BACKS[S.back] || BACKS.dark, r = document.documentElement.style;
  [['--accent', t[1]], ['--accent-ink', t[2]], ['--k', t[1]], ['--bg', b[1]], ['--card', b[2]], ['--card2', b[3]], ['--line', b[4]], ['--nav', b[5]]].forEach(([k, v]) => r.setProperty(k, v));
}
ACTIONS.themes = () => openSheet((s, sh) => {
  html(s, `<h2>Colours</h2><label class="f">Accent</label><div class="tools">${Object.entries(THEMES).map(([k, t]) => `<button data-t="${k}" style="${(S.theme || 'lime') === k ? 'outline:2px solid ' + t[1] : ''}"><span style="width:26px;height:26px;border-radius:13px;background:${t[1]}"></span><b>${t[0]}</b></button>`).join('')}</div><label class="f">Background</label><div class="tools">${Object.entries(BACKS).map(([k, t]) => `<button data-b="${k}" style="background:${t[2]};${(S.back || 'dark') === k ? 'outline:2px solid var(--accent)' : ''}"><b>${t[0]}</b></button>`).join('')}</div>`);
  on(s, '[data-t]', b => { S.theme = b.dataset.t; save(); applyTheme(); sh.refresh(); render(); }); on(s, '[data-b]', b => { S.back = b.dataset.b; save(); applyTheme(); sh.refresh(); render(); });
});

/* ---------- tools on Today ---------- */
const LIFE_TOOLS = [['focus', '🎯', 'Focus timer'], ['photos', '📸', 'Photos'], ['tape', '📏', 'Measure'], ['recovery', '🫁', 'Recovery'], ['cardio', '🫀', 'Cardio'], ['recap', '🏅', 'Month recap'], ['reminders', '⏰', 'Reminders'], ['themes', '🎨', 'Colours']];
function toolsCard(){ return `<div class="sec">Tools</div><div class="tools">${LIFE_TOOLS.concat(window.GTNative && window.GTNative.widgetKinds ? [['widgets', '🧩', 'Widgets']] : []).map(([k, i, l]) => `<button data-act="${k}"><span style="font-size:22px">${i}</span><b>${l}</b></button>`).join('')}</div>`; }
