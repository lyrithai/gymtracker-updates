// Builds the page and loads the app's files in order from ASSET_BASE (bundled or updated copy).
(function(){
  var B = window.ASSET_BASE || '';
  var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = B + 'css/app.css';
  document.head.appendChild(css);
  document.body.insertAdjacentHTML('beforeend',
    '<header><h1 id="title">Today</h1><button class="icon" data-act="settings" aria-label="Settings">⚙</button></header>' +
    '<div id="subnav"></div><main id="view"></main>' +
    '<nav id="nav">' +
    '<button data-act="tab" data-tab="today"><svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>Today</button>' +
    '<button data-act="tab" data-tab="food"><svg viewBox="0 0 24 24"><path d="M7 3v8a3 3 0 0 0 3 3v7M7 3v5M10 3v5M4 3v5a3 3 0 0 0 3 3M17 21V3c-2 1-3 4-3 7s1 4 3 4"/></svg>Food</button>' +
    '<button data-act="tab" data-tab="recipes"><svg viewBox="0 0 24 24"><path d="M4 10h16v3a8 8 0 0 1-16 0zM8 6c0-1 1-2 2-2M12 6c0-1 1-2 2-2M2 10h20"/></svg>Recipes</button>' +
    '<button data-act="tab" data-tab="gym"><svg viewBox="0 0 24 24"><path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12"/></svg>Gym</button>' +
    '<button data-act="tab" data-tab="life"><svg viewBox="0 0 24 24"><path d="M9 11l2 2 4-4"/><rect x="4" y="4" width="16" height="16" rx="3"/></svg>Life</button>' +
    '</nav><div id="toast"></div>');
  var files = ['lib/zxing.min.js', 'js/core.js', 'js/gym.js', 'js/food.js', 'data/recipes.js', 'data/snacks.js', 'data/sweets.js', 'js/recipes.js', 'js/snacks.js', 'js/life.js', 'js/schedule.js', 'js/ranks.js', 'js/program.js', 'js/sets.js', 'js/update.js', 'js/cloud.js', 'js/friends.js', 'js/popular.js', 'data/eatout.js', 'js/gymplus.js', 'js/foodplus.js', 'js/typeit.js', 'js/lifeplus.js', 'js/widgets.js', 'js/main.js'];
  var i = 0;
  (function next(){
    if (i >= files.length) { window.BOOT_OK = true; return; }
    var s = document.createElement('script');
    s.src = B + files[i++];
    s.onload = next;
    s.onerror = function(){ window.BOOT_ERROR = 'could not load ' + s.src; };
    document.head.appendChild(s);
  })();
})();
