'use strict';
/* ================= self-update: the Android shell calls these ================= */
const APPQ = new URLSearchParams(location.search);
function appVersionText(){
  if (window.WEB_VERSION) return 'Web app v' + window.WEB_VERSION;
  return 'App v' + (APPQ.get('v') || '?') + ' · shell ' + (APPQ.get('s') || '?') + (APPQ.get('live') ? ' · updated copy' : ' · built-in copy') + (window.LIVE_FAILED ? ' (update failed to load, using built-in)' : '');
}
// A newer, signature-checked version has been downloaded. It is used from the next launch; this offers it now.
window.onUpdateReady = function(version, path, go){   // go: web app's way of switching
  const old = document.getElementById('upd'); if (old) old.remove();
  const d = document.createElement('div');
  d.id = 'upd';
  d.style.cssText = 'position:fixed;left:12px;right:12px;bottom:76px;z-index:30;background:var(--card2);border:1px solid var(--accent);border-radius:14px;padding:12px 14px;display:flex;align-items:center;gap:10px;box-shadow:0 6px 24px rgba(0,0,0,.5)';
  d.innerHTML = '<span class="grow"><b>Update ready</b><div class="muted small">' + (version ? 'Version ' + version + ' downloaded.' : 'Downloaded.') + ' It also loads automatically next time.</div></span>' +
    '<button class="primary" style="min-height:40px" id="upgo">Load now</button><button class="icon" id="upx" aria-label="Later">✕</button>';
  document.body.appendChild(d);
  d.querySelector('#upx').onclick = () => d.remove();
  d.querySelector('#upgo').onclick = () => {
    if (S && S.active) { if (!confirm('Your workout in progress is saved and will still be there. Load the update now?')) return; }
    save();
    if (go) return go();
    location.replace('index.html?v=' + encodeURIComponent(version) + '&s=' + encodeURIComponent(APPQ.get('s') || '') + '&live=' + encodeURIComponent(path));
  };
};
window.onUpdateNeedsInstall = function(version){
  toast('Version ' + version + ' needs a new app install. Ask for the new APK.');
};
