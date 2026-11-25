'use strict';
S = load();
applyTheme();
loadHealth();
save();
render();
if (!S.user || !S.user.onboarded) startOnboarding(false);
else if ((S.user.planVer || 1) < PLAN_VERSION && S.user.skipVer !== PLAN_VERSION) startOnboarding(true);   // new plan builder: walk through it once more (closable, nothing lost)
migrateSets();
fixTargets();
cloudStart();
popularStart();
takePending();
pushWidgets();
pushReminders();
// Warm up the food databases in the background so the first search is instant.
setTimeout(() => { ensureDB('gen').then(() => ensureDB('uk')).catch(() => {}); }, 1500);
