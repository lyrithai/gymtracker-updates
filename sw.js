// Offline copy of the whole app. FILES is filled in by tools/build_web.py: path -> SHA-256.
// Files are kept by fingerprint, so an update only downloads what changed, and a file that doesn't match is refused.
const VERSION = 18;
const FILES = {
"app.webmanifest": "e9c687b09c8cec9d2503bbb4dc77eb6969a8cdb124c629686a95cc6bd3ded4f1",
"auth.html": "0e022a6ebad2cc151e50b407142d3018d386b665323b488b9e7ec79af4a733ef",
"icon-180.png": "4073fb93ec1c6228ff79ba935185594bcbc4b13bfd880c2fa121a51a24abe318",
"icon-192.png": "e3de9c8e9e8e2adb575420060d43ddcc72bdd1ede5d49afa41a94157eccf28ae",
"icon-512.png": "d77dc6122c614721a1bb7e84d0b900dc9c7fe6b9773202627e4760900323c934",
"index.html": "d930b45a6ff2fca1acb8b66e747d8a38573b149e029a277cf0c4a7947d0c2594",
"privacy.html": "ed7071ebf9e93c1dd99ca58691640f7bec220913accdbf2925051859c205fd0e",
"css/app.css": "940c1337f6c6e2557b519b864acfc7b737ef7af845bb664292158ebd66fa6f10",
"data/foods_generic.js": "8489aafbff0d5cc1a91192021cc6b82b6f251b4a6fe0d52b671640973fee98d3",
"data/foods_uk.js": "0f6d54133ed3169ea8cda9fdb86be263730f88bc96db53a5f60455dbefdb761f",
"data/recipes.js": "96f6e1c7a342ff8489c93508ee73c5263a92f7dbd91e2bf2fb7cd635b2fecbd4",
"data/snacks.js": "cbcd92dfdc44393072842438ca55bd47899bceeab45d27404a6016699d9c81e7",
"js/boot.js": "8a2c45878538e918e7b766d3e28e5fefdb7772f03c92c6d2e529078bfd0962e0",
"js/cloud.js": "ac5135f7d6957369b70c282a32fc855005e046d454c8dff17d1cbf39506a28e8",
"js/core.js": "3d9a5602d2d002539eb908a3cc5207b32ccf3e60bf9329eba8059c143befd8a5",
"js/food.js": "a3a8f6e6f8b0fe7c5419ad44e12639948fb1b9ea7d54b09f2f90e421664a354c",
"js/friends.js": "c9f7a380ff42b7b8c25bf9122b5b802db168104fce5da615cee4ac4a28b7f4eb",
"js/gym.js": "386a82805aae4be7ad16a0a2d2a2b1aaf99a6d0b9e50807a38817c4605d38d0a",
"js/life.js": "5e436796eb91a892ed126a0fbc78e01d0f4ada9c149574d729f7ecfd0710c791",
"js/main.js": "f0e47ff5611ee5a95601610863a93a9e820860110a006a875924834275ba7610",
"js/popular.js": "e0015055419df2732290b078bf87205e13a39f2efdd0fcec3a663e364ed527f8",
"js/program.js": "6f0752ced0864e74799f1cfd4be2554f400601c7faccc5b85bc0f571663719b8",
"js/ranks.js": "7489b8023911c9647b6fc8ae7b11340c560441ed339da1b48e95aad4cc6bb9aa",
"js/recipes.js": "ef4949910d051aeb19536c097b18fa517fc2140dc6498a4c9eaadf32c1de370c",
"js/schedule.js": "7fd8a58f8ffd4bdeec1a9fe163bc0314ae3463a8c56af17be1267951f5be27ed",
"js/snacks.js": "b70a4ecfa9ca647d48cc181bd9fda2f5dc45c83af7663dbc57784c5c85acb7cc",
"js/update.js": "106d560ca729ef326df25ed80cb5cbf044dd89c4fc7fae959a6b7ab4b564e60e",
"lib/zxing.min.js": "d7cc8f69dd70bdcf3ac00c9ae572bf2acb9f4132ba379c72df842e4db918652d"
};
const CACHE = 'gymtracker-files';
const base = new URL('./', self.location).href;
const keyOf = p => base + p + '?sha=' + FILES[p];

async function grab(cache, p){
  if (await cache.match(keyOf(p))) return;
  const r = await fetch(base + p + '?v=' + FILES[p].slice(0, 12), {cache:'no-store'});
  if (!r.ok) throw new Error(p + ' ' + r.status);
  const buf = await r.clone().arrayBuffer();
  const sha = [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map(b => b.toString(16).padStart(2, '0')).join('');
  if (sha !== FILES[p]) throw new Error('not matching ' + p);
  await cache.put(keyOf(p), r);
}
self.addEventListener('install', e => e.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  for (const p of Object.keys(FILES)) await grab(cache, p);
})()));
self.addEventListener('activate', e => e.waitUntil((async () => {
  const cache = await caches.open(CACHE), keep = new Set(Object.keys(FILES).map(keyOf));
  for (const r of await cache.keys()) if (!keep.has(r.url)) await cache.delete(r);
  await self.clients.claim();
})()));
self.addEventListener('message', e => { if (e.data === 'go') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(base)) return;   // food search etc. goes straight to the internet
  const p = decodeURI(e.request.url.slice(base.length).split(/[?#]/)[0]) || 'index.html';
  if (!FILES[p]) return;
  e.respondWith((async () => {
    const hit = await (await caches.open(CACHE)).match(keyOf(p));
    return hit || fetch(e.request);
  })());
});
