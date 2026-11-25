// Offline copy of the whole app. FILES is filled in by tools/build_web.py: path -> SHA-256.
// Files are kept by fingerprint, so an update only downloads what changed, and a file that doesn't match is refused.
const VERSION = 21;
const FILES = {
"app.webmanifest": "e9c687b09c8cec9d2503bbb4dc77eb6969a8cdb124c629686a95cc6bd3ded4f1",
"auth.html": "0e022a6ebad2cc151e50b407142d3018d386b665323b488b9e7ec79af4a733ef",
"icon-180.png": "4073fb93ec1c6228ff79ba935185594bcbc4b13bfd880c2fa121a51a24abe318",
"icon-192.png": "e3de9c8e9e8e2adb575420060d43ddcc72bdd1ede5d49afa41a94157eccf28ae",
"icon-512.png": "d77dc6122c614721a1bb7e84d0b900dc9c7fe6b9773202627e4760900323c934",
"index.html": "3e8ccac6bf89ffbe522f85183e822c59190ea797ea629473478968fed69dd4dd",
"privacy.html": "d641bc8f70988c3f30e359c0580941eae700a5cfd3330c3992c177521f5c6fe9",
"css/app.css": "f6f42d62be019cac0effc93df6a6996c79dc34da73567c5cd6f070d8cd3907c1",
"data/eatout.js": "f06df9250837cc2f5366e2c3a226e6439a71bd44bb4205bcc23a888b88b78f2a",
"data/foods_generic.js": "8489aafbff0d5cc1a91192021cc6b82b6f251b4a6fe0d52b671640973fee98d3",
"data/foods_uk.js": "0f6d54133ed3169ea8cda9fdb86be263730f88bc96db53a5f60455dbefdb761f",
"data/recipes.js": "96f6e1c7a342ff8489c93508ee73c5263a92f7dbd91e2bf2fb7cd635b2fecbd4",
"data/snacks.js": "cbcd92dfdc44393072842438ca55bd47899bceeab45d27404a6016699d9c81e7",
"js/boot.js": "d10fc5e8457e7c07edca2800bd9e214cf2b9b02eebaf7da84ba31e9ad21fa105",
"js/cloud.js": "ac5135f7d6957369b70c282a32fc855005e046d454c8dff17d1cbf39506a28e8",
"js/core.js": "4f2a1d61b4be0edd53aadadff0a94418ac1321dc0ea65a50b22c55b5b94a7972",
"js/food.js": "fe340bd3a0a822c8eaa78e78288b92adf2a81909804b0a57a38dc8af56c6a196",
"js/foodplus.js": "004880adaa1be2d637de65582e640abd61722a1b88704f903efc05c4ac2c8b43",
"js/friends.js": "c9f7a380ff42b7b8c25bf9122b5b802db168104fce5da615cee4ac4a28b7f4eb",
"js/gym.js": "4c617c3eff74e6d390dd4f2da90b36f0fecfeb8842f15307628481c516e0813b",
"js/gymplus.js": "ba11601a5dd7bf898a63c2267ab398143bb8db14742f1ffc0b5495f142cd109f",
"js/life.js": "140940708a02245d6574d089c431cfa813feccfbe3cea36ec83ff0a902ca06e8",
"js/lifeplus.js": "d3ac43966fa28c5267db7ebaa966639286d53b7b1a014de6cc5cf931a8ac0078",
"js/main.js": "1ae513589745240458c1c312ea3c5d252110d9c23a5c4f0fcbebc4f4537a2470",
"js/popular.js": "e0015055419df2732290b078bf87205e13a39f2efdd0fcec3a663e364ed527f8",
"js/program.js": "9e2ab19daa2eca739d7b0c8f505d7382b159d71e745a286d0167a423a38d898c",
"js/ranks.js": "7489b8023911c9647b6fc8ae7b11340c560441ed339da1b48e95aad4cc6bb9aa",
"js/recipes.js": "cd4f596d7cf9c0d79537865838900cc79f5c9d460f32980de046b1588d23c03c",
"js/schedule.js": "f3c70d9bdbbd4fa41a23bad6ae97f76a495af8c45872a8347435bc51a898e9d5",
"js/sets.js": "5213436d63660c7d6b3b2ba4fe3f854de16aca2314415ae7d1923f6831764c9b",
"js/snacks.js": "d456b12bda95812af1569d9637d5471f5f731bee73aafeb4a0747fd9572f69dd",
"js/typeit.js": "e9b5e456fb641b427f75b66c5b45d787d907e8338c50c8fa73d5f2081b469b36",
"js/update.js": "106d560ca729ef326df25ed80cb5cbf044dd89c4fc7fae959a6b7ab4b564e60e",
"js/widgets.js": "6c1d2ea72d3a5d2d09979861a6185a0fba7c0af72a69776bcc3a598712978815",
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
