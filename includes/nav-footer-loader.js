(function () {
  'use strict';

  var NAV_URL    = '/includes/nav.html';
  var FOOTER_URL = '/includes/footer.html';

  /* ── fetch helper (XHR for broadest compatibility) ── */
  function fetchHTML(url, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) cb(null, xhr.responseText);
      else cb(new Error('HTTP ' + xhr.status));
    };
    xhr.onerror = function () { cb(new Error('Network error fetching ' + url)); };
    xhr.send();
  }

  /* ── inject nav as first child of <body> ── */
  function injectNav(html) {
    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    var ref = document.body.firstChild;
    var inserted = [];
    while (wrap.firstChild) {
      var node = wrap.firstChild;
      document.body.insertBefore(node, ref);
      inserted.push(node);
    }
    activateScripts(inserted);
    wireNav();
  }

  /* ── inject footer as last child of <body> ── */
  function injectFooter(html) {
    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    var inserted = [];
    while (wrap.firstChild) {
      var node = wrap.firstChild;
      document.body.appendChild(node);
      inserted.push(node);
    }
    activateScripts(inserted);
    var yr = document.getElementById('gf-year');
    if (yr) yr.textContent = new Date().getFullYear();
  }


  /* ── re-create <script> nodes so they actually execute ──
     Scripts parsed via innerHTML are flagged "already started" by the HTML
     spec and never run, even once moved into the document. Cloning them into
     fresh elements is the only way to make them execute. This is why the GHL
     chat widget silently stopped loading. GTM is NOT handled here - it lives
     directly in each page's <head> so it loads as early as possible. */
  function activateScripts(nodes) {
    nodes.forEach(function (node) {
      if (node.nodeType !== 1) return;
      var scripts = node.tagName === 'SCRIPT'
        ? [node]
        : Array.prototype.slice.call(node.querySelectorAll('script'));
      scripts.forEach(function (old) {
        var s = document.createElement('script');
        for (var i = 0; i < old.attributes.length; i++) {
          s.setAttribute(old.attributes[i].name, old.attributes[i].value);
        }
        if (old.textContent) s.text = old.textContent;
        old.parentNode.replaceChild(s, old);
      });
    });
  }

  /* ── active link highlighting ── */
  function setActiveLink() {
    var path = window.location.pathname.replace(/\/$/, '') || '/';
    var links = document.querySelectorAll('nav.gnav-primary a');
    links.forEach(function (a) {
      var href = (a.getAttribute('href') || '').replace(/\/$/, '') || '/';
      if (path === href || (href !== '' && href !== '/' && path.indexOf(href) === 0)) {
        a.classList.add('gnav-active');
      }
    });
  }

  /* ── burger menu ── */
  function wireNav() {
    var ham = document.getElementById('gnav-ham');
    var mob = document.getElementById('gnav-mobile');
    if (ham && mob) {
      ham.addEventListener('click', function () {
        var open = mob.classList.toggle('open');
        ham.setAttribute('aria-expanded', String(open));
      });
    }
    setActiveLink();
  }

  /* ── boot ── */
  function boot() {
    fetchHTML(NAV_URL, function (err, html) {
      if (!err) injectNav(html);
    });
    fetchHTML(FOOTER_URL, function (err, html) {
      if (!err) injectFooter(html);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
