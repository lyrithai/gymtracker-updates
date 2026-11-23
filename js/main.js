'use strict';
S = load();
save();
render();
if (!S.user || !S.user.onboarded) startOnboarding(false);
// Warm up the food databases in the background so the first search is instant.
setTimeout(() => { ensureDB('gen').then(() => ensureDB('uk')).catch(() => {}); }, 1500);
