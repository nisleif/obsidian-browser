(function() {
  try { if (window.self !== window.top) return; } catch(e) {}

  // Guard: only run full setup once, but always run page-specific code
  if (window.obsidian && window.obsidian._initialized) {
    pageRefresh(); return;
  }

  window.obsidian = window.obsidian || {};
  var docEl = document.documentElement;
  var state = { adsBlocked: 0 };
  var toolbarInjected = false;
  var shieldOpen = false;

  function pageRefresh() {
    protectPadding();
    fixFixedHeaders();
    // Update active tab URL from JS (avoids Python race with loaded events)
    try { pywebview.api.update_active_tab(window.location.href, document.title || 'Untitled'); } catch(e) {}
    loadTabs();
    loadBookmarks();
    var u = document.getElementById('obs-url');
    if (u && u !== document.activeElement) u.value = window.location.href;
    var st = document.getElementById('obs-status-text');
    if (st) { clear(st); st.appendChild(txt(document.title || 'Obsidian')); }
    fixFixedHeaders();
    if (window.obsidian.refreshStatusBar) window.obsidian.refreshStatusBar();
  }

  function $(id) { return document.getElementById(id); }
  function tag(name, attrs) {
    var e = document.createElement(name);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function txt(text) { return document.createTextNode(text); }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

  // ─── CSS ─────────────────────────────────────────────────────
  function applyCSS() {
    var css = [
      '#obs-toolbar{all:initial;display:block!important;position:fixed!important;top:0!important;left:0!important;right:0!important;z-index:2147483647!important;font-size:13px!important;line-height:1!important;direction:ltr!important;text-align:left!important;font-family:"Segoe UI",system-ui,sans-serif!important}',
      '#obs-tb-bar{display:flex!important;align-items:center!important;gap:4px!important;padding:4px 8px!important;background:linear-gradient(135deg,#16213e,#1a1a3e)!important;border-bottom:1px solid #0f3460!important;height:34px!important}',
      '.obs-btn{background:none!important;border:none!important;color:#a0a0c0!important;font-size:15px!important;padding:2px 6px!important;cursor:pointer!important;border-radius:4px!important;min-width:28px;height:24px;text-align:center!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;transition:all .15s ease!important}',
      '.obs-btn:hover{background:#0f3460!important;color:#fff!important;transform:scale(1.05)!important}',
      '.obs-btn.active{color:#e94560!important}',
      '#obs-url{flex:1!important;padding:3px 8px!important;border:1px solid #0f3460!important;border-radius:6px!important;background:#1a1a2e!important;color:#eee!important;font-size:12px!important;outline:none!important;margin:0 4px!important;height:24px!important;min-width:0!important;transition:border-color .2s ease,box-shadow .2s ease!important}',
      '#obs-url:focus{border-color:#e94560!important;box-shadow:0 0 0 2px rgba(233,69,96,.15)!important}',
      '#obs-url::placeholder{color:#555!important;opacity:1!important}',
      // Tab bar
      '#obs-tab-bar{display:flex!important;align-items:center!important;background:#0f3460!important;height:30px!important;padding:0 4px!important;gap:2px!important;overflow-x:auto!important}',
      '#obs-tab-bar::-webkit-scrollbar{height:2px!important}',
      '#obs-tab-bar::-webkit-scrollbar-thumb{background:#333!important;border-radius:2px!important}',
      '.obs-tab{display:inline-flex!important;align-items:center!important;gap:4px!important;padding:2px 10px!important;background:#1a1a2e!important;border:1px solid #0f3460!important;border-radius:4px 4px 0 0!important;cursor:pointer!important;font-size:11px!important;color:#999!important;white-space:nowrap!important;max-width:160px!important;height:24px!important;flex-shrink:0!important;overflow:hidden!important;transition:all .15s ease!important}',
      '.obs-tab.active{background:#16213e!important;color:#eee!important;border-bottom-color:#16213e!important}',
      '.obs-tab:hover:not(.active){background:#1f1f3a!important;color:#ccc!important}',
      '.obs-tab-title{overflow:hidden!important;text-overflow:ellipsis!important;max-width:110px!important;display:inline-block!important}',
      '.obs-tab-close{background:none!important;border:none!important;color:#666!important;font-size:12px!important;cursor:pointer!important;padding:0 2px!important;line-height:1!important;transition:color .15s ease!important}',
      '.obs-tab-close:hover{color:#e94560!important}',
      '.obs-tab-add{background:none!important;border:none!important;color:#555!important;font-size:18px!important;cursor:pointer!important;padding:0 2px!important;height:22px!important;width:22px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;flex-shrink:0!important;border-radius:50%!important;transition:all .15s ease!important;margin-top:1px!important}',
      '.obs-tab-add:hover{background:#0f3460!important;color:#fff!important}',
      // Status bar
      '#obs-status{position:fixed!important;bottom:0!important;left:0!important;right:0!important;z-index:2147483647!important;display:flex!important;justify-content:space-between!important;padding:2px 8px!important;background:linear-gradient(135deg,#0d1117,#141a26)!important;border-top:1px solid #0f3460!important;height:22px!important;align-items:center!important;font-size:10px!important;color:#888!important}',
      '#obs-status-left{display:flex!important;align-items:center!important;gap:8px!important;overflow:hidden!important;flex:1!important}',
      '#obs-status-right{display:flex!important;align-items:center!important;gap:8px!important}',
      '.obs-st-badge{display:inline-flex!important;align-items:center!important;gap:3px!important;padding:1px 5px!important;border-radius:3px!important;font-size:9px!important;font-weight:600!important}',
      '.obs-st-badge.stealth-on{background:#0a3a1a!important;color:#4caf50!important;border:1px solid #4caf50!important}',
      '.obs-st-badge.stealth-off{background:#3a0a0a!important;color:#e94560!important;border:1px solid #e94560!important}',
      '.obs-st-badge.ads{background:#1a1a3a!important;color:#64b5f6!important;border:1px solid #0f3460!important}',
      '.obs-st-badge.https{background:#0a2a0a!important;color:#66bb6a!important;border:1px solid #2e7d32!important}',
      '.obs-st-badge.http{background:#3a1a0a!important;color:#ffa726!important;border:1px solid #e65100!important}',
      // Shield dropdown
      '#obs-shield-drop{position:fixed!important;right:8px!important;width:240px!important;background:#16213e!important;border:1px solid #0f3460!important;border-radius:8px!important;z-index:2147483647!important;font-size:12px!important;color:#ccc!important;box-shadow:0 8px 24px rgba(0,0,0,.5)!important;opacity:0!important;visibility:hidden!important;transform:translateY(-6px)!important;transition:all .2s ease!important}',
      '#obs-shield-drop.open{opacity:1!important;visibility:visible!important;transform:translateY(0)!important}',
      '#obs-shield-drop .sd-header{padding:10px 14px!important;background:#0f3460!important;border-radius:6px 6px 0 0!important;font-weight:600!important;color:#fff!important;font-size:13px!important}',
      '#obs-shield-drop .sd-row{display:flex!important;justify-content:space-between!important;align-items:center!important;padding:8px 14px!important;border-bottom:1px solid #1a1a2e!important}',
      '#obs-shield-drop .sd-label{color:#888!important}',
      '#obs-shield-drop .sd-value{color:#eee!important;font-weight:500!important}',
      '#obs-shield-drop .sd-value.on{color:#4caf50!important}',
      '#obs-shield-drop .sd-value.off{color:#e94560!important}',
      '#obs-shield-drop .sd-btn{display:block!important;width:100%!important;padding:8px 14px!important;border:none!important;background:none!important;color:#ccc!important;text-align:left!important;cursor:pointer!important;font-size:12px!important;font-family:inherit!important}',
      '#obs-shield-drop .sd-btn:hover{background:#0f3460!important;color:#fff!important}',
      '.sd-switch{position:relative!important;width:36px!important;height:20px!important;display:inline-block!important}',
      '.sd-switch input{opacity:0!important;width:0!important;height:0!important}',
      '.sd-slider{position:absolute!important;cursor:pointer!important;top:0!important;left:0!important;right:0!important;bottom:0!important;background:#555!important;border-radius:20px!important;transition:.3s!important}',
      '.sd-slider:before{position:absolute!important;content:""!important;height:16px!important;width:16px!important;left:2px!important;bottom:2px!important;background:#fff!important;border-radius:50%!important;transition:.3s!important}',
      'input:checked+.sd-slider{background:#e94560!important}',
      'input:checked+.sd-slider:before{transform:translateX(16px)!important}',
      // Bookmarks bar
      '#obs-bookmarks{display:flex!important;align-items:center!important;gap:2px!important;padding:2px 8px!important;background:#1a1a2e!important;height:24px!important;overflow-x:auto!important}',
      '#obs-bookmarks::-webkit-scrollbar{height:1px!important}',
      '#obs-bookmarks::-webkit-scrollbar-thumb{background:#333!important}',
      '.obs-bm{background:none!important;border:none!important;color:#888!important;font-size:11px!important;cursor:pointer!important;padding:2px 6px!important;white-space:nowrap!important;border-radius:2px!important;font-family:inherit!important}',
      '.obs-bm:hover{background:#0f3460!important;color:#eee!important}',
      '.obs-bm-add{background:none!important;border:none!important;color:#555!important;font-size:14px!important;cursor:pointer!important;padding:2px 4px!important}',
      '.obs-bm-add:hover{color:#fff!important}',
      // Menu
      '#obs-menu{position:fixed!important;right:8px!important;width:200px!important;background:#16213e!important;border:1px solid #0f3460!important;border-radius:8px!important;z-index:2147483647!important;font-size:12px!important;color:#ccc!important;box-shadow:0 8px 24px rgba(0,0,0,.5)!important;opacity:0!important;visibility:hidden!important;transform:translateY(-6px)!important;transition:all .2s ease!important}',
      '#obs-menu.open{opacity:1!important;visibility:visible!important;transform:translateY(0)!important}',
      '.obs-menu-item{display:flex!important;align-items:center!important;gap:8px!important;width:100%!important;padding:8px 14px!important;border:none!important;background:none!important;color:#ccc!important;text-align:left!important;cursor:pointer!important;font-size:12px!important;font-family:inherit!important}',
      '.obs-menu-item:hover{background:#0f3460!important;color:#fff!important}',
      '.obs-menu-sep{height:1px!important;background:#0f3460!important;margin:4px 8px!important}',
      // Scrape output
      '#obs-scrape{position:fixed!important;bottom:22px!important;right:8px!important;width:400px!important;max-height:300px!important;background:#1a1a2e!important;border:1px solid #0f3460!important;border-radius:6px!important;padding:8px!important;overflow:auto!important;z-index:2147483646!important;font-size:11px!important;color:#ccc!important;white-space:pre-wrap!important;word-break:break-all!important;font-family:monospace!important}',
      // Obsidian Tools Panel
      '#obs-tp{position:fixed!important;right:0!important;width:360px!important;bottom:20px!important;background:#16213e!important;border-left:1px solid #0f3460!important;z-index:2147483646!important;font-size:12px!important;color:#ccc!important;display:none!important;flex-direction:column!important;box-shadow:-6px 0 24px rgba(0,0,0,.4)!important;animation:obsSlideIn .2s ease!important}',
      '#obs-tp.open{display:flex!important}',
      '@keyframes obsSlideIn{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}',
      '#obs-tp-hdr{display:flex!important;align-items:center!important;justify-content:space-between!important;padding:8px 12px!important;background:#0f3460!important;border-bottom:1px solid #1a1a2e!important;flex-shrink:0!important}',
      '#obs-tp-hdr span{font-weight:600!important;color:#fff!important;font-size:13px!important}',
      '#obs-tp-close{background:none!important;border:none!important;color:#888!important;font-size:18px!important;cursor:pointer!important;padding:0 4px!important;line-height:1!important}',
      '#obs-tp-close:hover{color:#e94560!important}',
      '#obs-tp-body{flex:1!important;overflow-y:auto!important;padding:8px!important}',
      '#obs-tp-body::-webkit-scrollbar{width:4px!important}',
      '#obs-tp-body::-webkit-scrollbar-thumb{background:#0f3460!important;border-radius:2px!important}',
      '.obs-tp-section{margin-bottom:8px!important}',
      '.obs-tp-section-title{padding:4px 8px!important;color:#e94560!important;font-size:11px!important;font-weight:600!important;text-transform:uppercase!important;letter-spacing:.5px!important}',
      '.obs-tp-row{display:flex!important;flex-wrap:wrap!important;gap:4px!important;padding:2px 8px 6px!important}',
      '.obs-tp-btn{background:#1a1a2e!important;border:1px solid #0f3460!important;border-radius:4px!important;color:#ccc!important;padding:5px 10px!important;cursor:pointer!important;font-size:11px!important;font-family:inherit!important}',
      '.obs-tp-btn:hover{background:#0f3460!important;color:#fff!important;border-color:#e94560!important}',
      '#obs-tp-out{background:#0d1117!important;border:1px solid #0f3460!important;border-radius:4px!important;padding:8px!important;margin:4px 8px 8px!important;font-size:11px!important;font-family:monospace!important;color:#aaa!important;white-space:pre-wrap!important;word-break:break-all!important;overflow:auto!important;max-height:200px!important;flex-shrink:0!important;min-height:40px!important}',
      '#obs-tp-input{display:flex!important;gap:4px!important;padding:4px 8px!important;flex-shrink:0!important}',
      '#obs-tp-input input{flex:1!important;padding:4px 8px!important;border:1px solid #0f3460!important;border-radius:4px!important;background:#1a1a2e!important;color:#eee!important;font-size:11px!important;outline:none!important;font-family:monospace!important}',
      '#obs-tp-input input:focus{border-color:#e94560!important}',
      '#obs-tp-input button{padding:4px 10px!important;background:#e94560!important;border:none!important;border-radius:4px!important;color:#fff!important;cursor:pointer!important;font-size:11px!important;font-family:inherit!important}',
      '#obs-tp-input button:hover{background:#d63850!important}'
    ].join('');
    try {
      var s = new CSSStyleSheet(); s.replaceSync(css);
      if (document.adoptedStyleSheets) {
        document.adoptedStyleSheets = [s].concat(Array.from(document.adoptedStyleSheets));
      } else {
        document.adoptedStyleSheets = [s];
      }
    } catch(e) {
      try { var st = tag('style'); st.textContent = css; document.head.appendChild(st); } catch(e2) {}
    }
  }

  // ─── Build Toolbar ─────────────────────────────────────────
  function injectToolbar() {
    if ($('obs-toolbar')) return;
    if (!document.body) return false;

    applyCSS();

    // ── Toolbar bar ──
    var bar = tag('div', {id:'obs-tb-bar'});
    var backBtn = tag('button', {class:'obs-btn',id:'obs-btn-back',title:'Back'}); backBtn.appendChild(txt('\u25C0'));
    var fwdBtn = tag('button', {class:'obs-btn',id:'obs-btn-fwd',title:'Forward'}); fwdBtn.appendChild(txt('\u25B6'));
    var refBtn = tag('button', {class:'obs-btn',id:'obs-btn-refresh',title:'Refresh'}); refBtn.appendChild(txt('\u21BB'));
    var urlInput = tag('input', {type:'text',id:'obs-url',placeholder:'Search or enter URL...',spellcheck:'false',autocomplete:'off'});
    var shieldBtn = tag('button', {class:'obs-btn',id:'obs-btn-shield',title:'Shield & Tools'}); shieldBtn.appendChild(txt('\uD83D\uDEE1\uFE0F'));
    var menuBtn = tag('button', {class:'obs-btn',id:'obs-btn-menu',title:'Menu'}); menuBtn.appendChild(txt('\u2630'));
    bar.append(backBtn, fwdBtn, refBtn, urlInput, shieldBtn, menuBtn);

    // ── Tab bar ──
    var tabBar = tag('div', {id:'obs-tab-bar'});

    // ── Bookmarks bar ──
    var bmBar = tag('div', {id:'obs-bookmarks'});

    // ── Status bar (rich) ──
    var statusBar = tag('div', {id:'obs-status'});
    var statusL = tag('span', {id:'obs-status-left'});
    var statusText = tag('span', {id:'obs-status-text'}); statusText.appendChild(txt('Obsidian Ready'));
    statusL.appendChild(statusText);
    var statusR = tag('span', {id:'obs-status-right'});
    var stStealth = tag('span', {id:'obs-st-stealth',class:'obs-st-badge stealth-off'}); stStealth.appendChild(txt('\u26D2 Stealth: OFF'));
    var stAds = tag('span', {id:'obs-st-ads',class:'obs-st-badge ads'}); stAds.appendChild(txt('Ads: 0'));
    var stHttps = tag('span', {id:'obs-st-https',class:'obs-st-badge https'}); stHttps.appendChild(txt('HTTPS'));
    statusR.append(stStealth, stAds, stHttps);
    statusBar.append(statusL, statusR);

    // ── Container ──
    var tb = tag('div', {id:'obs-toolbar'});
    tb.append(bar, tabBar, bmBar, statusBar);
    document.body.appendChild(tb);

    // ── Shield dropdown ──
    if (!$('obs-shield-drop')) {
      var sd = tag('div', {id:'obs-shield-drop'});
      var sdH = tag('div', {class:'sd-header'}); sdH.appendChild(txt('\uD83D\uDEE1\uFE0F Obsidian Shield'));
      sd.appendChild(sdH);
      // Stealth toggle
      var sr1 = tag('div', {class:'sd-row'});
      var sl1 = tag('span', {class:'sd-label'}); sl1.appendChild(txt('Stealth Mode'));
      var sw = tag('label', {class:'sd-switch'});
      var swIn = tag('input', {type:'checkbox',id:'obs-stealth-switch'});
      var swSl = tag('span', {class:'sd-slider'});
      sw.append(swIn, swSl);
      sr1.append(sl1, sw);
      sd.appendChild(sr1);
      // Stats
      var sr2 = tag('div', {class:'sd-row'}); var sl2 = tag('span', {class:'sd-label'}); sl2.appendChild(txt('Ads Blocked'));
      var sv2 = tag('span', {id:'sd-ads',class:'sd-value'}); sv2.appendChild(txt('0')); sr2.append(sl2, sv2); sd.appendChild(sr2);
      // Divider
      var sep = tag('div', {class:'obs-menu-sep'}); sd.appendChild(sep);
      // Actions
      var a1 = tag('button', {class:'sd-btn'}); a1.appendChild(txt('\uD83D\uDCC4 Scrape Page'));
      a1.onclick = function() { doScrape(); sd.classList.remove('open'); shieldOpen = false; };
      var a2 = tag('button', {class:'sd-btn'}); a2.appendChild(txt('\u{1F4F1} Toggle DevTools'));
      a2.onclick = function() { try{pywebview.api.toggle_devtools();}catch(e){} sd.classList.remove('open'); shieldOpen = false; };
      var a3 = tag('button', {class:'sd-btn'}); a3.appendChild(txt('\uD83D\uDEE0\uFE0F Obsidian Tools'));
      a3.onclick = function() { toggleToolsPanel(); sd.classList.remove('open'); shieldOpen = false; };
      sd.append(sep, a1, a2, a3);
      document.body.appendChild(sd);
    }

    // ── Menu dropdown ──
    if (!$('obs-menu')) {
      var menu = tag('div', {id:'obs-menu'});
      var mi = [
        {html:'\u2B50 Bookmark This Page', action:function(){ doBookmark(); }},
        {html:'\u{1F4D1} Bookmarks', action:function(){ toggleBookmarks(); }},
        {sep:true},
        {html:'\u{1F50D} Scrape Links', action:function(){ doScrapeLinks(); }},
        {html:'\u{1F5BC} Scrape Images', action:function(){ doScrapeImages(); }},
        {html:'\u{1F4BE} Scrape Text', action:function(){ doScrapeText(); }},
        {sep:true},
        {html:'\u2139\uFE0F About', action:function(){ alert('Obsidian Browser v1.0\nStealth browser with Obsidian Tools\nWebView2 + CloakBrowser'); }}
      ];
      mi.forEach(function(item) {
        if (item.sep) { var s = tag('div', {class:'obs-menu-sep'}); menu.appendChild(s); }
        else {
          var b = tag('button', {class:'obs-menu-item'}); b.appendChild(txt(item.html));
          b.onclick = function() { item.action(); menu.classList.remove('open'); };
          menu.appendChild(b);
        }
      });
      document.body.appendChild(menu);
    }

    // ── Apply padding for toolbar (prevents content overlap) ──
    docEl.style.paddingTop = '0px';
    document.body.style.paddingTop = calcPaddingTop();
    document.body.style.paddingBottom = '22px';

    // ── Wire events ──
    urlInput.addEventListener('focus', function() { this.select(); });
    urlInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        var url = this.value.trim();
        if (!url) return;
        if (!url.match(/^[a-zA-Z]+:\/\//)) url = 'https://' + url;
        window.location.href = url;
      }
    });
    backBtn.onclick = function() { window.history.back(); };
    fwdBtn.onclick = function() { window.history.forward(); };
    refBtn.onclick = function() { window.location.reload(); };

    shieldBtn.onclick = function(e) {
      e.stopPropagation();
      shieldOpen = !shieldOpen;
      $('obs-shield-drop').classList.toggle('open', shieldOpen);
      $('obs-menu').classList.remove('open');
      updateShield();
    };

    menuBtn.onclick = function(e) {
      e.stopPropagation();
      $('obs-menu').classList.toggle('open');
      $('obs-shield-drop').classList.remove('open');
      shieldOpen = false;
    };

    // Stealth switch
    swIn.onchange = function() {
      try {
        pywebview.api.toggle_stealth().then(function(en) {
          window.obsidian.setStealthStatus(en);
        });
      } catch(e) {}
    };

    // Close dropdowns on click outside
    document.addEventListener('click', function(e) {
      if (!e.target.closest('#obs-shield-drop') && !e.target.closest('#obs-btn-shield')) {
        var sd = $('obs-shield-drop'); if (sd) sd.classList.remove('open'); shieldOpen = false;
      }
      if (!e.target.closest('#obs-menu') && !e.target.closest('#obs-btn-menu')) {
        var m = $('obs-menu'); if (m) m.classList.remove('open');
      }
    });

    // ── Load tabs ──
    loadTabs();
    loadBookmarks();

    toolbarInjected = true;
    console.log('[Obsidian] Toolbar injected');
    window.obsidian.setStatusText(document.title || 'Obsidian');
    return true;
  }

  // ─── Tabs ────────────────────────────────────────────────────
  function loadTabs() {
    var tb = $('obs-tab-bar'); if (!tb) return;
    clear(tb);
    try {
      pywebview.api.get_tabs().then(function(data) {
        if (!data || !data.tabs) return;
        data.tabs.forEach(function(t) {
          var tabEl = tag('div', {class:'obs-tab' + (t.id === data.active ? ' active' : ''), 'data-id':t.id, title:t.title || 'New Tab'});
          var title = tag('span', {class:'obs-tab-title'}); title.appendChild(txt(t.title || 'New Tab'));
          tabEl.appendChild(title);
          var closeBtn = tag('button', {class:'obs-tab-close'}); closeBtn.appendChild(txt('\u2716'));
          closeBtn.onclick = function(e) {
            e.stopPropagation();
            try { pywebview.api.close_tab(t.id); } catch(e) {}
          };
          tabEl.appendChild(closeBtn);
          tabEl.onclick = function() {
            if (t.id !== data.active) { try { pywebview.api.switch_tab(t.id); } catch(e) {} }
          };
          tb.appendChild(tabEl);
        });
        // Add button
        var addBtn = tag('button', {class:'obs-tab-add'}); addBtn.appendChild(txt('+'));
        addBtn.onclick = function() { try { pywebview.api.add_tab(); } catch(e) {} };
        tb.appendChild(addBtn);
      });
    } catch(e) {}
  }

  // ─── Bookmarks ───────────────────────────────────────────────
  function loadBookmarks() {
    var bb = $('obs-bookmarks'); if (!bb) return;
    clear(bb);
    try {
      pywebview.api.get_bookmarks().then(function(bms) {
        if (!bms) return;
        bms.forEach(function(b) {
          var bEl = tag('button', {class:'obs-bm', title:b.url});
          bEl.appendChild(txt(b.title || b.url));
          bEl.onclick = function() { window.location.href = b.url; };
          bb.appendChild(bEl);
        });
        var addBm = tag('button', {class:'obs-bm-add', title:'Bookmark this page'});
        addBm.appendChild(txt('\u2B50'));
        addBm.onclick = function() { doBookmark(); };
        bb.appendChild(addBm);
      });
    } catch(e) {}
  }

  function doBookmark() {
    try {
      pywebview.api.add_bookmark(window.location.href, document.title).then(function() { loadBookmarks(); });
    } catch(e) {}
  }

  function toggleBookmarks() {
    var bb = $('obs-bookmarks');
    if (bb) {
      bb.style.display = bb.style.display === 'none' ? 'flex' : 'none';
      if (document.body) document.body.style.paddingTop = calcPaddingTop();
    }
  }

  // ─── Shield Dropdown ─────────────────────────────────────────
  function updateShield() {
    try {
      pywebview.api.get_stats().then(function(stats) {
        if (!stats) return;
        var ae = $('sd-ads');
        if (ae) { clear(ae); ae.appendChild(txt('' + (stats.ads_blocked || 0))); }
        var sw = $('obs-stealth-switch');
        if (sw) sw.checked = !!stats.stealth;
        // Also refresh status bar from Python stealth status
        if (typeof window.obsidian.setStealthStatus === 'function') {
          window.obsidian.setStealthStatus(!!stats.stealth);
        }
        if (typeof window.obsidian.refreshStatusBar === 'function') {
          window.obsidian.refreshStatusBar();
        }
      });
    } catch(e) {}
  }

  // ─── Scraping ────────────────────────────────────────────────
  function showScrapeResult(text) {
    var out = $('obs-scrape');
    if (!out) {
      out = tag('div', {id:'obs-scrape'});
      out.appendChild(txt(''));
      document.body.appendChild(out);
    }
    clear(out); out.appendChild(txt(text));
    // Auto-dismiss after 6 seconds
    if (window._obsScrapeTimer) clearTimeout(window._obsScrapeTimer);
    window._obsScrapeTimer = setTimeout(function() {
      var o = $('obs-scrape');
      if (o && o.parentNode) o.parentNode.removeChild(o);
    }, 6000);
  }

  function doScrape() {
    try {
      pywebview.api.scrape_page().then(function(r) {
        showScrapeResult(r || 'No result');
      });
    } catch(e) {}
  }

  function doScrapeLinks() {
    var links = document.querySelectorAll('a[href]');
    var urls = [];
    for (var i = 0; i < links.length; i++) {
      var h = links[i].getAttribute('href');
      if (h && !h.startsWith('javascript') && !h.startsWith('#')) urls.push(h);
    }
    showScrapeResult('Found ' + urls.length + ' links:\n' + urls.join('\n'));
  }

  function doScrapeImages() {
    var imgs = document.querySelectorAll('img[src]');
    var urls = [];
    for (var i = 0; i < imgs.length; i++) urls.push(imgs[i].getAttribute('src'));
    showScrapeResult('Found ' + urls.length + ' images:\n' + urls.join('\n'));
  }

  function doScrapeText() {
    var text = document.body.innerText || document.body.textContent || '';
    showScrapeResult('Page text (' + text.length + ' chars):\n' + text.substring(0, 3000));
  }

  // ─── Bridge ──────────────────────────────────────────────────
  window.obsidian.setStealthStatus = function(enabled) {
    var btn = $('obs-btn-shield');
    if (btn) btn.classList.toggle('active', enabled);
    var sw = $('obs-stealth-switch');
    if (sw) sw.checked = enabled;
    var st = $('obs-st-stealth');
    if (st) {
      st.className = 'obs-st-badge ' + (enabled ? 'stealth-on' : 'stealth-off');
      clear(st);
      st.appendChild(txt(enabled ? '\u26D2 Stealth: ON' : '\u26D2 Stealth: OFF'));
    }
  };
  window.obsidian.setStatusText = function(text) {
    var el = $('obs-status-text');
    if (el) { clear(el); el.appendChild(txt(text)); }
  };
  window.obsidian.getStats = function() {
    return { adsBlocked: state.adsBlocked };
  };
  window.obsidian.refreshStatusBar = function() {
    // Update HTTPS badge
    var h = $('obs-st-https');
    if (h) {
      var isHttps = window.location.protocol === 'https:';
      h.className = 'obs-st-badge ' + (isHttps ? 'https' : 'http');
      clear(h);
      h.appendChild(txt(isHttps ? 'HTTPS' : 'HTTP'));
    }
    // Update ads badge
    var a = $('obs-st-ads');
    if (a) {
      clear(a);
      a.appendChild(txt('Ads: ' + state.adsBlocked));
    }
  };

  // ─── Body Padding Guard (dynamic based on visible toolbar elements) ──
  function calcPaddingTop() {
    var h = 34; // toolbar bar
    var tb = $('obs-tab-bar');
    if (tb && tb.style.display !== 'none') h += 30;
    var bb = $('obs-bookmarks');
    if (bb && bb.style.display !== 'none') h += 24;
    return h + 'px';
  }

  function protectPadding() {
    function applyPad() {
      if (document.body) {
        document.body.style.paddingTop = calcPaddingTop();
        document.body.style.paddingBottom = '22px';
      }
    }
    applyPad();
    var padGuard = new MutationObserver(function() {
      if (document.body) applyPad();
    });
    if (document.body) padGuard.observe(document.body, { attributes: true, attributeFilter: ['style'], subtree: false });
  }

  function positionDropdowns() {
    var h = parseInt(calcPaddingTop()) || 88;
    var sd = document.getElementById('obs-shield-drop');
    if (sd) sd.style.top = h + 'px';
    var mn = document.getElementById('obs-menu');
    if (mn) mn.style.top = h + 'px';
    var tp = document.getElementById('obs-tp');
    if (tp) tp.style.top = h + 'px';
  }
  function protectToolbar() {
    var guard = new MutationObserver(function(muts) {
      for (var i = 0; i < muts.length; i++) {
        for (var j = 0; j < muts[i].removedNodes.length; j++) {
          if (muts[i].removedNodes[j] && muts[i].removedNodes[j].id === 'obs-toolbar') {
            injectToolbar(); return;
          }
        }
      }
    });
    if (document.body) guard.observe(document.body, { childList: true, subtree: false });

    var statusTicks = 0;
    var _lastTitle = '';
    setInterval(function() {
      if (!$('obs-toolbar') && document.body) injectToolbar();
      var el = $('obs-url');
      if (el && el !== document.activeElement) el.value = window.location.href;
      positionDropdowns();
      // Update status text only on title change (don't overwrite custom messages)
      var title = document.title || 'Obsidian';
      if (title !== _lastTitle) {
        var st = $('obs-status-text');
        if (st && toolbarInjected) { clear(st); st.appendChild(txt(title)); }
        _lastTitle = title;
      }
      // Re-apply body padding if lost
      if (document.body) {
        var desired = calcPaddingTop();
        if (document.body.style.paddingTop !== desired) {
          document.body.style.paddingTop = desired;
          document.body.style.paddingBottom = '22px';
        }
      }
      statusTicks++;
      // Fix fixed/sticky page headers + refresh status bar every 3s
      if (statusTicks % 3 === 0) {
        fixFixedHeaders();
        if (window.obsidian.refreshStatusBar) window.obsidian.refreshStatusBar();
      }
    }, 1000);

    var origPush = window.history.pushState;
    window.history.pushState = function() {
      origPush.apply(this, arguments);
      setTimeout(function() {
        if (!$('obs-toolbar')) injectToolbar();
        else { var u = $('obs-url'); if (u) u.value = window.location.href; }
      }, 1000);
    };
    window.addEventListener('popstate', function() {
      setTimeout(function() {
        if (!$('obs-toolbar')) injectToolbar();
        else { var u = $('obs-url'); if (u) u.value = window.location.href; }
      }, 1000);
    });
  }

  // ─── Adblock ─────────────────────────────────────────────────
  function scanAds() {
    var ads = [
      'iframe[src*="doubleclick"]','iframe[src*="adsystem"]','ins.adsbygoogle',
      'ins.adsbygoogle','[id*="google_ads"]','[class*="advertisement"]',
      '[class*="ad-container"]','[class*="ad-slot"]','[data-ad-*]','[id^="div-gpt"]',
      '[class*="sponsored"]','[class*="promoted"]','[aria-label*="advertisement"]',
      '.ytp-ad-module','.ytp-ad-overlay-container','.video-ads',
      'ytd-ad-slot-renderer','ytd-display-ad-renderer',
      '#masthead-ad','#player-ads','[class*="ytp-ad"]',
      'ytd-ad-slot-renderer','ytd-in-feed-ad-renderer','ytd-ad-slot-renderer',
      '.ytd-video-masthead-ad-v3-renderer','.ytd-companion-slot-renderer',
      '.ytd-merch-shelf-renderer','.ytd-promoted-sparkles-text-search-renderer',
      '.ytd-search-pyv-renderer','.ytd-promoted-video-renderer',
    ];
    var count = 0;
    for (var i = 0; i < ads.length; i++) {
      try {
        var els = document.querySelectorAll(ads[i]);
        for (var j = 0; j < els.length; j++) {
          if (els[j].style.display !== 'none') { els[j].style.display = 'none'; count++; }
        }
      } catch(e) {}
    }
    if (count > 0) state.adsBlocked += count;
    return count;
  }

  function setupAdblock() {
    scanAds(); // Initial scan for already-loaded ads
    var mo = new MutationObserver(function() { scanAds(); fixFixedHeaders(); });
    if (document.body) mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style','class'] });
    // Periodic rescan for SPA-loaded ads (YouTube)
    setInterval(function() {
      var c = scanAds();
      if (c > 0 && window.obsidian.refreshStatusBar) window.obsidian.refreshStatusBar();
    }, 3000);
  }

  // ─── Keyboard ─────────────────────────────────────────────────
  function setupKeyboard() {
    document.addEventListener('keydown', function(e) {
      var k = e.key;
      if (typeof k === 'string') k = k.toLowerCase();
      // URL bar focus: Ctrl+L, F6, Alt+D
      if ((e.ctrlKey && k === 'l') || k === 'f6' || (e.altKey && k === 'd')) {
        e.preventDefault(); e.stopPropagation();
        var u = $('obs-url'); if (u) { u.focus(); u.select(); }
        return;
      }
      // Refresh: Ctrl+R, F5
      if ((e.ctrlKey && k === 'r') || k === 'f5') {
        e.preventDefault(); e.stopPropagation();
        var b = $('obs-btn-refresh'); if (b) b.click();
        return;
      }
      // New tab: Ctrl+T
      if (e.ctrlKey && k === 't') {
        e.preventDefault(); e.stopPropagation();
        pywebview.api.add_tab();
        return;
      }
      // Close tab: Ctrl+W
      if (e.ctrlKey && k === 'w') {
        e.preventDefault(); e.stopPropagation();
        var ta = document.querySelector('.obs-tab.active');
        if (ta) { var tid = ta.getAttribute('data-id'); if (tid) pywebview.api.close_tab(tid); }
        return;
      }
      // Escape: close dropdowns/panel
      if (k === 'escape') {
        var sd = $('obs-shield-drop'); if (sd && sd.classList.contains('open')) { sd.classList.remove('open'); shieldOpen = false; e.preventDefault(); }
        var m = $('obs-menu'); if (m && m.classList.contains('open')) { m.classList.remove('open'); e.preventDefault(); }
        var tp = $('obs-tp'); if (tp && tp.classList.contains('open')) { tp.classList.remove('open'); e.preventDefault(); }
        return;
      }
    }, true); // use capture phase to intercept before page handlers
  }

  // ─── Fix Fixed/Sticky Page Headers (prevents overlap) ───────
  function fixFixedHeaders(root) {
    var toolbarH = parseInt(calcPaddingTop()) || 88;
    root = root || document;
    var all = root.querySelectorAll('*');
    var skip = {'obs-toolbar':1,'obs-tp':1,'obs-shield-drop':1,'obs-menu':1,'obs-scrape':1,'obs-status':1};
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (skip[el.id]) continue;
      try {
        var pos = window.getComputedStyle(el).position;
        if (pos !== 'fixed' && pos !== 'sticky') continue;
        if (el.getAttribute('data-obs-fixed')) continue;
        var topStr = window.getComputedStyle(el).top;
        var topVal = parseInt(topStr);
        if (isNaN(topVal) || topVal < 0 || topVal >= toolbarH) continue;
        el.style.top = (topVal + toolbarH) + 'px';
        el.setAttribute('data-obs-fixed', '1');
      } catch(e) {}
      if (el.shadowRoot) fixFixedHeaders(el.shadowRoot);
    }
  }

  // ─── Obsidian Tools Panel ────────────────────────────────────
  function injectToolsPanel() {
    if ($('obs-tp')) return;
    var panel = tag('div', {id:'obs-tp'});
    // Header
    var hdr = tag('div', {id:'obs-tp-hdr'});
    var hdrT = tag('span'); hdrT.appendChild(txt('\uD83D\uDEE0\uFE0F Obsidian Tools'));
    var closeBtn = tag('button', {id:'obs-tp-close'}); closeBtn.appendChild(txt('\u2716'));
    closeBtn.onclick = function() { panel.classList.remove('open'); };
    hdr.append(hdrT, closeBtn);
    panel.appendChild(hdr);
    // Input bar (for DNS, port scan, etc.)
    var inpBar = tag('div', {id:'obs-tp-input'});
    var inpField = tag('input', {type:'text',id:'obs-tp-input-field',placeholder:'Target URL/host...'});
    var inpBtn = tag('button', {id:'obs-tp-input-btn'}); inpBtn.appendChild(txt('Go'));
    inpBar.append(inpField, inpBtn);
    panel.appendChild(inpBar);
    // Body (sections)
    var body = tag('div', {id:'obs-tp-body'});
    // Sections: Scan, Inspect, Network, Test, Config
    var sections = [
      {title:'\u{1F50D} Scan', tools:[
        {label:'Security Scan', action:'runSecurityScan'},
        {label:'Link Analysis', action:'runLinkAnalysis'},
        {label:'Tech Detection', action:'runTechDetection'},
        {label:'Secret Scan', action:'runSecretScan'}
      ]},
      {title:'\u{1F4CB} Inspect', tools:[
        {label:'Cookies', action:'viewCookies'},
        {label:'Headers', action:'viewBrowserHeaders'},
        {label:'Page Info', action:'viewPageInfo'}
      ]},
      {title:'\u{1F310} Network', tools:[
        {label:'DNS Lookup', action:'runDNSTool'},
        {label:'Port Scan', action:'runPortScanTool'},
        {label:'URL Fuzz', action:'runURLFuzzTool'},
        {label:'SSL Info', action:'runSSLInfoTool'}
      ]},
      {title:'\u{1F4A5} Test', tools:[
        {label:'XSS Test', action:'runXSSTest'},
        {label:'SQLi Test', action:'runSQLiTest'},
        {label:'Form Dump', action:'runFormDump'}
      ]},
      {title:'\u2699\uFE0F Config', tools:[
        {label:'User-Agent', action:'runUATool'},
        {label:'Proxy Config', action:'runProxyTool'}
      ]},
      {title:'\u{1F4E6} Resources', tools:[
        {label:'HackingTool Repo', action:'openHackingTool'},
        {label:'Obsidian Docs', action:'openObsidianDocs'}
      ]}
    ];
    sections.forEach(function(sec) {
      var secEl = tag('div', {class:'obs-tp-section'});
      var secTitle = tag('div', {class:'obs-tp-section-title'}); secTitle.appendChild(txt(sec.title));
      secEl.appendChild(secTitle);
      var row = tag('div', {class:'obs-tp-row'});
      sec.tools.forEach(function(tl) {
        var btn = tag('button', {class:'obs-tp-btn'}); btn.appendChild(txt(tl.label));
        btn.onclick = function() { runTool(tl.action); };
        row.appendChild(btn);
      });
      secEl.appendChild(row);
      body.appendChild(secEl);
    });
    panel.appendChild(body);
    // Output area
    var out = tag('div', {id:'obs-tp-out'}); out.appendChild(txt('Select a tool to run.'));
    panel.appendChild(out);
    document.body.appendChild(panel);
  }

  function toggleToolsPanel() {
    var p = $('obs-tp');
    if (p) {
      p.classList.toggle('open');
      if (p.classList.contains('open')) {
        var out = $('obs-tp-out');
        if (out) { clear(out); out.appendChild(txt('Select a tool to run.')); }
      }
    }
    var menu = $('obs-menu'); if (menu) menu.classList.remove('open');
    var sd = $('obs-shield-drop'); if (sd) sd.classList.remove('open'); shieldOpen = false;
  }

  // ─── Tool Descriptions ────────────────────────────────────────
  var toolDescriptions = {
    runSecurityScan: 'Analyzes page security: HTTPS, mixed content, security headers (HSTS, CSP, XFO), cookie flags, and more.',
    runLinkAnalysis: 'Extracts and categorizes all links: internal/external URLs, anchors, JavaScript links, mailto links.',
    runTechDetection: 'Identifies web technologies: JS frameworks (React, Vue, Angular), CSS frameworks, server metadata.',
    runSecretScan: 'Scans HTML source for exposed secrets: API keys, AWS tokens, JWT, private keys, passwords, OAuth IDs.',
    viewCookies: 'Lists all cookies for the current domain: name, value, size. Use DevTools for HttpOnly/Secure/SameSite flags.',
    viewBrowserHeaders: 'Fetches HTTP response headers for the current URL via XHR. Shows status, headers, redirects.',
    viewPageInfo: 'Displays full page metadata: URL, DOM stats, storage, navigator properties, scripts, forms, iframes.',
    runDNSTool: 'Resolves a hostname to IP addresses. Enter a domain (e.g. google.com). Returns all A/AAAA records.',
    runPortScanTool: 'TCP port scan on 25 common ports. Enter a hostname or IP. Shows open ports with service names.',
    runURLFuzzTool: 'Bruteforces 40+ common paths (admin, .env, .git, config, api). Enter base URL. Finds hidden endpoints.',
    runSSLInfoTool: 'Retrieves SSL/TLS certificate details: issuer, subject, expiry, cipher, ALPN, version. Enter hostname.',
    runXSSTest: 'Analyzes forms for XSS vulnerabilities. Lists all input fields with suggested XSS payloads for manual testing.',
    runSQLiTest: 'Analyzes forms for SQL injection. Identifies input fields and provides SQLi payloads for manual testing.',
    runFormDump: 'Extracts all form elements: action, method, input names/types, current values. Useful for form analysis.',
    runUATool: 'Changes the browser User-Agent. Shortcuts: "desktop", "mobile", "bot". Or enter any custom UA string.',
    runProxyTool: 'Routes traffic through an HTTP/S proxy. Enter proxy URL (e.g. http://127.0.0.1:8080). Type "clear" to disable.',
    openHackingTool: 'Links to the HackingTool GitHub repo — a curated collection of Kali Linux security tools and exploits.',
    openObsidianDocs: 'Shows this help: available tools, keyboard shortcuts, and version info.'
  };

  // ─── Tool Router ──────────────────────────────────────────────
  var toolTarget = null;

  function runTool(action) {
    toolTarget = action;
    var inp = $('obs-tp-input-field');
    var inpBtn = $('obs-tp-input-btn');
    var out = $('obs-tp-out');
    if (!out) return;
    clear(out);

    // Show description first
    var desc = toolDescriptions[action] || '';
    if (desc) {
      var descEl = tag('div', {style:'color:#64b5f6;font-size:11px;padding:4px 6px;margin-bottom:6px;border-left:3px solid #e94560;background:#0a0e1a;border-radius:2px;font-family:sans-serif'});
      descEl.appendChild(txt('\u2139\uFE0F ' + desc));
      out.appendChild(descEl);
    }

    // Determine if this tool needs input
    var needsInput = ['runDNSTool','runPortScanTool','runURLFuzzTool','runSSLInfoTool','runUATool','runProxyTool'].indexOf(action) >= 0;
    if (needsInput) {
      inp.value = '';
      inp.placeholder = getInputPlaceholder(action);
      inp.style.display = '';
      inpBtn.style.display = '';
      inpBtn.onclick = function() { executeTool(action, inp.value.trim()); };
      inp.onkeydown = function(e) { if (e.key === 'Enter') inpBtn.click(); };
      inp.focus();
      var hint = tag('div', {style:'color:#888;font-size:10px;margin-top:4px'}); hint.appendChild(txt('Enter target above and click Go.'));
      out.appendChild(hint);
    } else {
      inp.style.display = 'none';
      inpBtn.style.display = 'none';
      var sep = tag('div', {style:'margin:6px 0;border-top:1px solid #0f3460'}); out.appendChild(sep);
      var running = tag('div', {style:'color:#888;margin-top:4px'}); running.appendChild(txt('Running...'));
      out.appendChild(running);
      executeTool(action, null);
    }
  }

  function getInputPlaceholder(action) {
    switch (action) {
      case 'runDNSTool': return 'hostname (e.g. google.com)';
      case 'runPortScanTool': return 'hostname (e.g. 192.168.1.1)';
      case 'runURLFuzzTool': return 'base URL (e.g. https://example.com)';
      case 'runSSLInfoTool': return 'hostname (e.g. google.com)';
      case 'runUATool': return 'User-Agent string or: desktop / mobile / bot';
      case 'runProxyTool': return 'proxy URL (e.g. http://127.0.0.1:8080) or: clear';
      default: return 'enter value...';
    }
  }

  function executeTool(action, input) {
    var out = $('obs-tp-out');
    if (!out) return;
    clear(out);
    out.appendChild(txt('Running...'));

    switch (action) {
      case 'runSecurityScan': runSecurityScan(); break;
      case 'runLinkAnalysis': runLinkAnalysis(); break;
      case 'runTechDetection': runTechDetection(); break;
      case 'runSecretScan': runSecretScan(); break;
      case 'viewCookies': viewCookies(); break;
      case 'viewBrowserHeaders': viewBrowserHeaders(); break;
      case 'viewPageInfo': viewPageInfo(); break;
      case 'runDNSTool': if (input) runDNSTool(input); else showResult('Enter a hostname.'); break;
      case 'runPortScanTool': if (input) runPortScanTool(input); else showResult('Enter a hostname.'); break;
      case 'runURLFuzzTool': if (input) runURLFuzzTool(input); else showResult('Enter a base URL.'); break;
      case 'runSSLInfoTool': if (input) runSSLInfoTool(input); else showResult('Enter a hostname.'); break;
      case 'runXSSTest': runXSSTest(); break;
      case 'runSQLiTest': runSQLiTest(); break;
      case 'runFormDump': runFormDump(); break;
      case 'runUATool': if (input) runUATool(input); else showResult('Enter a User-Agent.'); break;
      case 'runProxyTool': if (input) runProxyTool(input); else showResult('Enter a proxy URL or "clear".'); break;
      case 'openHackingTool': openHackingTool(); break;
      case 'openObsidianDocs': openObsidianDocs(); break;
      default: showResult('Unknown tool: ' + action);
    }
  }

  function showResult(text) {
    var out = $('obs-tp-out');
    if (!out) return;
    clear(out);
    if (typeof text === 'object') {
      try { out.appendChild(txt(JSON.stringify(text, null, 2))); } catch(e) { out.appendChild(txt(String(text))); }
    } else {
      out.appendChild(txt(String(text)));
    }
  }

  // ─── Tool Functions ──────────────────────────────────────────

  // ── Security Scan ──
  function runSecurityScan() {
    var lines = [];
    var url = window.location.href;
    lines.push('=== Security Scan ===');
    lines.push('URL: ' + url);
    lines.push('');

    // HTTPS check
    var isHTTPS = url.indexOf('https://') === 0;
    lines.push('[+] Protocol: ' + (isHTTPS ? 'HTTPS (secure)' : 'HTTP (insecure!)'));
    if (!isHTTPS) lines.push('  WARNING: Connection is not encrypted!');

    // Mixed content check
    var mixed = [];
    try {
      var resources = document.querySelectorAll('img[src], script[src], link[href], iframe[src], video[src], audio[src], source[src], object[data]');
      for (var i = 0; i < resources.length; i++) {
        var src = resources[i].getAttribute('src') || resources[i].getAttribute('href') || resources[i].getAttribute('data') || '';
        if (isHTTPS && src.indexOf('http://') === 0) mixed.push(src.substring(0, 80));
      }
    } catch(e) {}
    if (mixed.length > 0) {
      lines.push('[!] Mixed Content: ' + mixed.length + ' insecure resources loaded over HTTPS:');
      mixed.forEach(function(m) { lines.push('  - ' + m); });
    } else {
      lines.push('[+] No mixed content detected.');
    }

    // Security headers check (via fetch)
    lines.push('');
    lines.push('[+] Checking security headers...');
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('HEAD', url, true);
      xhr.onload = function() {
        var h = {};
        xhr.getAllResponseHeaders().split('\r\n').forEach(function(l) {
          var p = l.indexOf(':');
          if (p > 0) h[l.substring(0, p).trim().toLowerCase()] = l.substring(p + 1).trim();
        });
        var checks = {
          'strict-transport-security': 'HSTS',
          'content-security-policy': 'CSP',
          'x-frame-options': 'X-Frame-Options',
          'x-content-type-options': 'X-Content-Type-Options',
          'referrer-policy': 'Referrer-Policy',
          'permissions-policy': 'Permissions-Policy'
        };
        var foundAny = false;
        for (var key in checks) {
          if (h[key]) {
            lines.push('[+] ' + checks[key] + ': ' + h[key].substring(0, 60));
            foundAny = true;
          }
        }
        if (!foundAny) lines.push('[!] No security headers found!');
        showResult(lines.join('\n'));
      };
      xhr.onerror = function() {
        lines.push('[!] Could not check headers (CORS blocked)');
        showResult(lines.join('\n'));
      };
      xhr.send();
      return;
    } catch(e) {
      lines.push('[!] XHR check failed: ' + e.message);
    }
    showResult(lines.join('\n'));
  }

  // ── Link Analysis ──
  function runLinkAnalysis() {
    var links = document.querySelectorAll('a[href]');
    var total = links.length;
    var internal = 0, external = 0, anchor = 0, javascript = 0, mailto = 0;
    var currentHost = window.location.host;
    var extLinks = [];
    for (var i = 0; i < links.length; i++) {
      var h = links[i].getAttribute('href') || '';
      if (h.indexOf('#') === 0) { anchor++; }
      else if (h.indexOf('javascript:') === 0) { javascript++; }
      else if (h.indexOf('mailto:') === 0) { mailto++; }
      else if (h.indexOf('http') === 0 || h.indexOf('//') === 0) {
        if (h.indexOf(currentHost) > 0) { internal++; }
        else { external++; if (external <= 10) extLinks.push(h.substring(0, 80)); }
      } else { internal++; }
    }
    var lines = [];
    lines.push('=== Link Analysis ===');
    lines.push('Total links: ' + total);
    lines.push('Internal: ' + internal);
    lines.push('External: ' + external);
    lines.push('Anchors (#): ' + anchor);
    lines.push('JavaScript: ' + javascript);
    lines.push('Mailto: ' + mailto);
    if (extLinks.length > 0) {
      lines.push('');
      lines.push('External links (first 10):');
      extLinks.forEach(function(l) { lines.push('  ' + l); });
    }
    showResult(lines.join('\n'));
  }

  // ── Tech Detection ──
  function runTechDetection() {
    var lines = [];
    lines.push('=== Tech Stack Detection ===');
    // Meta tags
    var metaGen = document.querySelector('meta[name="generator"]');
    if (metaGen) lines.push('[+] Generator: ' + (metaGen.getAttribute('content') || 'unknown'));
    // JS libraries (check window properties)
    var checks = {
      'React': 'typeof React !== "undefined"',
      'ReactDOM': 'typeof ReactDOM !== "undefined"',
      'Vue': 'typeof Vue !== "undefined"',
      'Angular': 'typeof angular !== "undefined"',
      'jQuery': 'typeof jQuery !== "undefined"',
      'jQuery (fn)': 'typeof $ !== "undefined" && $.fn',
      'Bootstrap': 'typeof bootstrap !== "undefined"',
      'Bootstrap CSS': 'typeof $ !== "undefined" && typeof $.fn !== "undefined" && $.fn.tooltip',
      'D3.js': 'typeof d3 !== "undefined"',
      'Google Analytics': 'typeof ga !== "undefined" || typeof gtag !== "undefined"',
      'WordPress': 'typeof wp !== "undefined"',
      'Modernizr': 'typeof Modernizr !== "undefined"',
      'Lodash': 'typeof _ !== "undefined"',
      'Moment.js': 'typeof moment !== "undefined"',
      'Three.js': 'typeof THREE !== "undefined"',
      'Chart.js': 'typeof Chart !== "undefined"',
      'GSAP': 'typeof TweenMax !== "undefined" || typeof gsap !== "undefined"',
    };
    var found = [];
    for (var name in checks) {
      try {
        if (eval(checks[name])) found.push(name);
      } catch(e) {}
    }
    if (found.length > 0) {
      lines.push('[+] Detected libraries/frameworks:');
      found.forEach(function(f) { lines.push('  - ' + f); });
    } else {
      lines.push('[-] No common libraries detected.');
    }
    // CSS classes that indicate frameworks
    var cssIndicators = {
      'container': 'Bootstrap',
      'navbar': 'Bootstrap',
      'btn': 'Bootstrap',
      'pure-g': 'Pure CSS',
      'mdl-': 'Material Design Lite',
      'tailwind': 'Tailwind CSS'
    };
    lines.push('');
    lines.push('[+] Checking CSS framework indicators...');
    var cssFound = false;
    for (var cls in cssIndicators) {
      try {
        var el = document.querySelector('[class*="' + cls + '"]');
        if (el) { lines.push('  - ' + cssIndicators[cls] + ' (class: ' + cls + ')'); cssFound = true; }
      } catch(e) {}
    }
    if (!cssFound) lines.push('  None detected.');
    lines.push('');
    lines.push('[+] Page info:');
    lines.push('  Title: ' + (document.title || 'none'));
    lines.push('  Lang: ' + (document.documentElement.lang || 'none'));
    lines.push('  Charset: ' + (document.characterSet || 'unknown'));
    lines.push('  Links: ' + document.querySelectorAll('link').length);
    lines.push('  Scripts: ' + document.querySelectorAll('script').length);
    lines.push('  Images: ' + document.querySelectorAll('img').length);
    lines.push('  Forms: ' + document.querySelectorAll('form').length);
    showResult(lines.join('\n'));
  }

  // ── Secret Scan ──
  function runSecretScan() {
    var lines = [];
    lines.push('=== Secret Scanner ===');
    var html = document.documentElement.outerHTML || '';
    // Don't scan huge pages
    if (html.length > 200000) {
      lines.push('[!] Page too large, scanning first 200K chars');
      html = html.substring(0, 200000);
    }
    var patterns = [
      {name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/g},
      {name: 'AWS Secret Key', regex: /aws(.{0,20})?['\"][0-9a-zA-Z\/+]{40}['\"]/gi},
      {name: 'API Key (generic)', regex: /['\"]api[_-]?key['\"]\s*[:=]\s*['\"][0-9a-zA-Z]{16,40}['\"]/gi},
      {name: 'Bearer Token', regex: /bearer\s+[0-9a-zA-Z._\-]{20,}/gi},
      {name: 'GitHub Token', regex: /ghp_[0-9a-zA-Z]{36}/g},
      {name: 'Slack Token', regex: /xox[baprs]-[0-9a-zA-Z\-]{10,}/g},
      {name: 'Private Key', regex: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/g},
      {name: 'Password in HTML', regex: /(?:password|passwd|pwd)\s*[=:]\s*['\"][^'\"]{4,}['\"]/gi},
      {name: 'JWT Token', regex: /eyJ[0-9a-zA-Z_-]+\.eyJ[0-9a-zA-Z_-]+\.[0-9a-zA-Z_-]+/g},
      {name: 'Google OAuth', regex: /[0-9]+-[0-9a-zA-Z_]{32}\.apps\.googleusercontent\.com/g},
      {name: 'Slack Webhook', regex: /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9\/]+/g},
      {name: 'Heroku API Key', regex: /[hH][eE][rR][oO][kK][uU].*[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}/g},
      {name: 'npm token', regex: /npm_[a-z0-9]{36}/g},
      {name: 'SSH Private Key', regex: /-----BEGIN OPENSSH PRIVATE KEY-----/g},
    ];
    var totalFound = 0;
    patterns.forEach(function(p) {
      try {
        p.regex.lastIndex = 0;
        var matches = html.match(p.regex);
        if (matches && matches.length > 0) {
          lines.push('[!] ' + p.name + ': ' + matches.length + ' match(es)');
          matches.slice(0, 3).forEach(function(m) {
            var safe = m.length > 30 ? m.substring(0, 20) + '...' + m.substring(m.length-10) : m;
            lines.push('    ' + safe);
          });
          totalFound += matches.length;
        }
      } catch(e) {}
    });
    if (totalFound === 0) {
      lines.push('[+] No secrets found in page source.');
    } else {
      lines.push('');
      lines.push('[!] Total: ' + totalFound + ' potential secrets found');
      lines.push('    Review carefully before sharing.');
    }
    showResult(lines.join('\n'));
  }

  // ── Cookie Viewer ──
  function viewCookies() {
    var lines = [];
    lines.push('=== Cookies ===');
    var cookies = document.cookie.split(';').filter(function(c){return c.trim().length > 0;});
    if (cookies.length === 0) {
      lines.push('No cookies for this domain.');
    } else {
      lines.push('Found ' + cookies.length + ' cookie(s):');
      lines.push('');
      cookies.forEach(function(c) {
        var parts = c.split('=');
        var name = parts.shift().trim();
        var val = parts.join('=').trim();
        lines.push('  Name:  ' + name);
        lines.push('  Value: ' + (val.length > 40 ? val.substring(0, 40) + '...' : val));
        lines.push('  Size:  ' + c.length + ' bytes');
        lines.push('');
      });
    }
    // Try to get more cookie info via Python API
    try {
      lines.push('Note: Use DevTools for cookie flags (HttpOnly, Secure, SameSite).');
    } catch(e) {}
    showResult(lines.join('\n'));
  }

  // ── Header Viewer ──
  function viewBrowserHeaders() {
    var lines = [];
    lines.push('=== HTTP Headers ===');
    var url = window.location.href;
    lines.push('Fetching headers for: ' + url);
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('HEAD', url, true);
      xhr.onload = function() {
        var raw = xhr.getAllResponseHeaders();
        if (raw) {
          lines.push('Status: ' + xhr.status);
          lines.push('');
          raw.split('\r\n').forEach(function(l) {
            if (l.trim()) lines.push('  ' + l);
          });
        } else {
          lines.push('[!] No headers returned (CORS or same-origin issue)');
        }
        showResult(lines.join('\n'));
      };
      xhr.onerror = function() {
        lines.push('[!] Could not fetch headers (CORS blocked)');
        showResult(lines.join('\n'));
      };
      xhr.send();
      return;
    } catch(e) {
      lines.push('[!] Error: ' + e.message);
    }
    showResult(lines.join('\n'));
  }

  // ── Page Info ──
  function viewPageInfo() {
    var lines = [];
    lines.push('=== Page Information ===');
    lines.push('URL: ' + window.location.href);
    lines.push('Host: ' + window.location.host);
    lines.push('Protocol: ' + window.location.protocol);
    lines.push('Path: ' + window.location.pathname);
    lines.push('Title: ' + (document.title || 'none'));
    lines.push('Charset: ' + (document.characterSet || 'unknown'));
    lines.push('Content-Type: ' + (document.contentType || 'unknown'));
    lines.push('Ready State: ' + document.readyState);
    lines.push('Referrer: ' + (document.referrer || 'none'));
    lines.push('Cookies: ' + document.cookie.split(';').length + ' total');
    lines.push('DOM Size: ' + document.querySelectorAll('*').length + ' elements');
    lines.push('Images: ' + document.querySelectorAll('img').length);
    lines.push('Scripts: ' + document.querySelectorAll('script').length);
    lines.push('Stylesheets: ' + document.querySelectorAll('link[rel=stylesheet]').length);
    lines.push('Forms: ' + document.querySelectorAll('form').length);
    lines.push('Iframes: ' + document.querySelectorAll('iframe').length);
    lines.push('Local Storage: ' + (typeof localStorage !== 'undefined' ? Object.keys(localStorage).length + ' keys' : 'N/A'));
    lines.push('Session Storage: ' + (typeof sessionStorage !== 'undefined' ? Object.keys(sessionStorage).length + ' keys' : 'N/A'));
    lines.push('');
    lines.push('User-Agent: ' + navigator.userAgent.substring(0, 80));
    lines.push('Platform: ' + navigator.platform);
    lines.push('Languages: ' + navigator.languages.join(', '));
    lines.push('Cookie Enabled: ' + navigator.cookieEnabled);
    showResult(lines.join('\n'));
  }

  // ── DNS Lookup ──
  function runDNSTool(hostname) {
    showResult('Looking up ' + hostname + '...');
    try {
      pywebview.api.resolve_dns(hostname).then(function(r) {
        var lines = ['=== DNS Lookup: ' + hostname + ' ==='];
        if (r.error) { lines.push('Error: ' + r.error); }
        else {
          lines.push('IP addresses (' + r.count + '):');
          r.ips.forEach(function(ip) { lines.push('  ' + ip); });
        }
        showResult(lines.join('\n'));
      });
    } catch(e) {
      showResult('Error: ' + e.message);
    }
  }

  // ── Port Scan ──
  function runPortScanTool(hostname) {
    showResult('Scanning ' + hostname + ' (25 ports)...');
    try {
      pywebview.api.port_scan(hostname).then(function(r) {
        var lines = ['=== Port Scan: ' + hostname + ' ==='];
        if (r.error) { lines.push('Error: ' + r.error); }
        else {
          lines.push('Open ports: ' + r.total_open);
          if (r.ports && r.ports.open && r.ports.open.length > 0) {
            r.ports.open.forEach(function(p) {
              lines.push('  ' + p.port + '/tcp  ' + p.service);
            });
          } else {
            lines.push('  No open ports found.');
          }
        }
        showResult(lines.join('\n'));
      });
    } catch(e) {
      showResult('Error: ' + e.message);
    }
  }

  // ── URL Fuzzer ──
  function runURLFuzzTool(baseUrl) {
    showResult('Fuzzing ' + baseUrl + ' (40 paths)...');
    try {
      pywebview.api.url_fuzz(baseUrl).then(function(r) {
        var lines = ['=== URL Fuzzer: ' + baseUrl + ' ==='];
        if (r.error) { lines.push('Error: ' + r.error); }
        else {
          lines.push('Found ' + r.found + ' accessible paths:');
          if (r.results && r.results.length > 0) {
            r.results.forEach(function(p) { lines.push('  [' + p.status + '] ' + p.path); });
          } else {
            lines.push('  None found.');
          }
        }
        showResult(lines.join('\n'));
      });
    } catch(e) {
      showResult('Error: ' + e.message);
    }
  }

  // ── SSL Info ──
  function runSSLInfoTool(hostname) {
    showResult('Fetching SSL info for ' + hostname + ':443...');
    try {
      pywebview.api.get_ssl_info(hostname, 443).then(function(r) {
        var lines = ['=== SSL Certificate: ' + hostname + ' ==='];
        if (r.error) { lines.push('Error: ' + r.error); }
        else {
          lines.push('Subject:');
          for (var k in r.subject) lines.push('  ' + k + ' = ' + r.subject[k]);
          lines.push('Issuer:');
          for (var k2 in r.issuer) lines.push('  ' + k2 + ' = ' + r.issuer[k2]);
          lines.push('Version: ' + r.version);
          lines.push('Issued: ' + r.issued);
          lines.push('Expires: ' + r.expires);
          if (r.alpn) lines.push('ALPN: ' + r.alpn);
          if (r.cipher) lines.push('Cipher: ' + r.cipher);
        }
        showResult(lines.join('\n'));
      });
    } catch(e) {
      showResult('Error: ' + e.message);
    }
  }

  // ── XSS Test ──
  function runXSSTest() {
    var lines = [];
    lines.push('=== XSS Test ===');
    var forms = document.querySelectorAll('form');
    if (forms.length === 0) {
      lines.push('No forms found on this page.');
      showResult(lines.join('\n'));
      return;
    }
    lines.push('Found ' + forms.length + ' form(s). Testing input fields...');
    var payloads = [
      '<script>alert(1)</script>',
      '"><script>alert(1)</script>',
      '"><img src=x onerror=alert(1)>',
      '\'><svg/onload=alert(1)>',
      '<ScRiPt>alert(1)</sCrIpT>',
      'javascript:alert(1)',
    ];
    var tested = 0;
    forms.forEach(function(f) {
      var inputs = f.querySelectorAll('input[type=text], input[type=search], input[type=url], input:not([type]), textarea');
      inputs.forEach(function(inp) {
        if (inp.name || inp.id) {
          var name = inp.name || inp.id;
          tested++;
          lines.push('  [!] Potential XSS vector: <' + (f.id ? '#' + f.id : 'form') + '> field "' + name + '"');
          if (tested <= 5) {
            lines.push('      Test payload: ' + payloads[tested % payloads.length]);
          }
        }
      });
    });
    lines.push('');
    lines.push('Tested ' + tested + ' input(s). ' + (tested > 0 ? 'Manual verification required.' : 'No testable inputs.'));
    lines.push('');
    lines.push('Note: Automated XSS testing requires clicking submit.');
    lines.push('Use the XSS payloads in forms manually to verify.');
    showResult(lines.join('\n'));
  }

  // ── SQLi Test ──
  function runSQLiTest() {
    var lines = [];
    lines.push('=== SQL Injection Test ===');
    var forms = document.querySelectorAll('form');
    if (forms.length === 0) {
      lines.push('No forms found on this page.');
      showResult(lines.join('\n'));
      return;
    }
    lines.push('Found ' + forms.length + ' form(s). Analyzing forms...');
    var payloads = [
      "' OR '1'='1",
      "' OR 1=1--",
      "' UNION SELECT 1--",
      "admin' --",
      "1' ORDER BY 1--",
      "1' AND 1=1--",
      "1' AND 1=2--",
    ];
    forms.forEach(function(f) {
      var method = (f.method || 'GET').toUpperCase();
      var action = f.action || window.location.href;
      var inputs = f.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=checkbox]):not([type=radio]), textarea, select');
      lines.push('');
      lines.push('  Form: action=' + action + ' method=' + method + ' fields=' + inputs.length);
      inputs.forEach(function(inp) {
        var name = inp.name || inp.id || 'unnamed';
        var type = inp.type || 'text';
        lines.push('    Field: ' + name + ' (type=' + type + ')');
        if (inputs.length <= 3) {
          lines.push('      Test: ' + payloads[0]);
        }
      });
    });
    lines.push('');
    lines.push('SQLi testing requires actual form submission.');
    lines.push('Suggested manual payloads above.');
    showResult(lines.join('\n'));
  }

  // ── Form Dump ──
  function runFormDump() {
    var lines = [];
    lines.push('=== Form Dump ===');
    var forms = document.querySelectorAll('form');
    if (forms.length === 0) {
      lines.push('No forms found.');
      showResult(lines.join('\n'));
      return;
    }
    forms.forEach(function(f, idx) {
      lines.push('');
      lines.push('Form #' + (idx + 1) + ':');
      lines.push('  Action: ' + (f.action || '(none)'));
      lines.push('  Method: ' + (f.method || 'GET').toUpperCase());
      lines.push('  ID: ' + (f.id || '(none)'));
      lines.push('  Name: ' + (f.name || '(none)'));
      lines.push('  Class: ' + (f.className || '(none)'));
      var inputs = f.querySelectorAll('input, textarea, select, button');
      lines.push('  Fields (' + inputs.length + '):');
      inputs.forEach(function(inp) {
        var name = inp.name || inp.id || '(unnamed)';
        var type = inp.type || inp.tagName.toLowerCase() || 'unknown';
        var val = '';
        if (inp.tagName === 'SELECT') {
          var opts = inp.querySelectorAll('option[selected]');
          if (opts.length > 0) val = opts[0].text;
        } else if (inp.type !== 'password') {
          val = inp.value || '';
        } else {
          val = '********';
        }
        lines.push('    - ' + name + ' (' + type + ') = "' + val.substring(0, 40) + '"');
      });
    });
    showResult(lines.join('\n'));
  }

  // ── User-Agent Tool ──
  function runUATool(input) {
    var ua = input;
    var uas = {
      'desktop': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'mobile': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      'bot': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    };
    if (uas[input.toLowerCase()]) ua = uas[input.toLowerCase()];
    try {
      pywebview.api.set_user_agent(ua).then(function(r) {
        var lines = ['=== User-Agent ==='];
        lines.push('Set to: ' + (r.user_agent || ua));
        lines.push('');
        lines.push('Current navigator UA: ' + navigator.userAgent);
        lines.push('');
        lines.push('Note: UA changes apply to future requests via the backend.');
        showResult(lines.join('\n'));
      });
    } catch(e) {
      showResult('Error: ' + e.message);
    }
  }

  // ── Proxy Tool ──
  function runProxyTool(input) {
    if (input.toLowerCase() === 'clear' || input.toLowerCase() === 'off' || input.toLowerCase() === 'none') {
      try {
        pywebview.api.clear_proxy().then(function(r) {
          showResult('Proxy cleared.\nAll traffic will connect directly.');
        });
      } catch(e) { showResult('Error: ' + e.message); }
      return;
    }
    try {
      pywebview.api.set_proxy(input).then(function(r) {
        showResult('Proxy set to: ' + input + '\nAll traffic will route through this proxy.');
      });
    } catch(e) { showResult('Error: ' + e.message); }
  }

  // ── Resource Links ──
  function openHackingTool() {
    var lines = [
      '=== HackingTool ===',
      'GitHub: https://github.com/Z4nzu/hackingtool',
      '',
      'A collection of Kali Linux hacking tools:',
      '- Information Gathering',
      '- Web Attack / XSS / SQLi',
      '- Phishing / RAT / Keylogger',
      '- Reverse Engineering',
      '- DDOS / Forensics',
      '- Payload Generator',
      '- Steganography',
      '- And more...',
      '',
      'Note: Most tools require Linux/Kali.',
      'The browser integrates web-security equivalents.',
      '',
      'Open in browser? (use URL bar to navigate)'
    ];
    showResult(lines.join('\n'));
  }

  function openObsidianDocs() {
    var lines = [
      '=== Obsidian Tools ===',
      'Version 1.0',
      '',
      'Available tools:',
      '  Scan: Security, Links, Tech, Secrets',
      '  Inspect: Cookies, Headers, Page Info',
      '  Network: DNS, Port Scan, URL Fuzz, SSL',
      '  Test: XSS, SQLi, Form Dump',
      '  Config: User-Agent, Proxy',
      '',
      'Keyboard shortcuts:',
      '  Ctrl+L/F6/Alt+D : Focus URL bar',
      '  Ctrl+R/F5       : Refresh',
      '  Ctrl+T          : New tab',
      '  Ctrl+W          : Close tab',
      '  Escape          : Close dropdowns/panel'
    ];
    showResult(lines.join('\n'));
  }

  // Close tools panel when clicking outside
  document.addEventListener('click', function(e) {
    if (!e.target.closest('#obs-tp') && !e.target.closest('#obs-btn-shield') && !e.target.closest('#obs-shield-drop') && !e.target.closest('button.sd-btn')) {
      var tp = $('obs-tp'); if (tp && tp.classList.contains('open')) tp.classList.remove('open');
    }
  });

  // ─── Init ────────────────────────────────────────────────────
  injectToolbar();
  injectToolsPanel();
  protectToolbar();
  protectPadding();
  setupAdblock();
  setupKeyboard();
  fixFixedHeaders();
  positionDropdowns();
  // Initialize tabs from JS (avoids Python race with loaded events)
  try {
    pywebview.api.init_tabs(window.location.href, document.title || 'New Tab').then(function() {
      loadTabs();
      loadBookmarks();
    });
  } catch(e) { loadTabs(); loadBookmarks(); }
  if (window.obsidian.refreshStatusBar) window.obsidian.refreshStatusBar();
  window.obsidian._initialized = true;
  // Enable stealth ON by default on first run
  try {
    pywebview.api.toggle_stealth().then(function(en) {
      if (window.obsidian.setStealthStatus) window.obsidian.setStealthStatus(!!en);
    });
  } catch(e) {}
})();
