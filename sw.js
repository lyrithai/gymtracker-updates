// Offline copy of the whole app. FILES is filled in by tools/build_web.py: path -> SHA-256.
// Files are kept by fingerprint, so an update only downloads what changed, and a file that doesn't match is refused.
const VERSION = 14;
const FILES = {
"app.webmanifest": "e9c687b09c8cec9d2503bbb4dc77eb6969a8cdb124c629686a95cc6bd3ded4f1",
"icon-180.png": "4073fb93ec1c6228ff79ba935185594bcbc4b13bfd880c2fa121a51a24abe318",
"icon-192.png": "e3de9c8e9e8e2adb575420060d43ddcc72bdd1ede5d49afa41a94157eccf28ae",
"icon-512.png": "d77dc6122c614721a1bb7e84d0b900dc9c7fe6b9773202627e4760900323c934",
"index.html": "8e4250f5348108acf3764c19619351f48adfe82045517a66eb58e07179d9be8c",
"css/app.css": "56cfa1e861dc6c3b660d0edf35109f9b228d1b66da5040bcf2a873d17f0e0a84",
"data/foods_generic.js": "8489aafbff0d5cc1a91192021cc6b82b6f251b4a6fe0d52b671640973fee98d3",
"data/foods_uk.js": "0f6d54133ed3169ea8cda9fdb86be263730f88bc96db53a5f60455dbefdb761f",
"data/recipes.js": "96f6e1c7a342ff8489c93508ee73c5263a92f7dbd91e2bf2fb7cd635b2fecbd4",
"js/boot.js": "572fee39415aa2651f9f8bc44ed6bed49ad2ce971a22adc6deb2fcf4f47c0949",
"js/core.js": "972e2ef21feb7d02910024751ec5778b8a47a2931eec575fbe81231dc461fd84",
"js/food.js": "048e4d9a55391ca118f4900c4160b26ee7df42bdc9ece5f72ffeff5ff39d65af",
"js/gym.js": "1929f1404505568f32009e7298ad8fdab52364b0029126d4a851e98ea37fa227",
"js/life.js": "e988c9e4601b388b869f464fc9d32db3da4013d4ce09f332504118906de13929",
"js/main.js": "01aaa26254f053ff9fde720fe189459ab2f822a5e0a129f8328290936e9c696f",
"js/program.js": "152409eb9ba9008366544f21b96f4f24b03666f34d1910cfd3e7edf24340d553",
"js/ranks.js": "863a456a4b0da7c50a3df2806f6fcf6b1911dde90d1ca214c65ca9cb9a0d080c",
"js/recipes.js": "ef4949910d051aeb19536c097b18fa517fc2140dc6498a4c9eaadf32c1de370c",
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
