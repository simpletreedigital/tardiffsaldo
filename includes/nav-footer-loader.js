(function () {
  'use strict';

  // Resolve base path from script src
  var scripts = document.getElementsByTagName('script');
  var basePath = '/';
  for (var i = 0; i < scripts.length; i++) {
    var src = scripts[i].src || '';
    if (src.indexOf('nav-footer-loader') !== -1) {
      basePath = src.replace(/includes\/nav-footer-loader\.js.*/, '');
      break;
    }
  }

  function fetchInclude(url) {
    return fetch(url, { method: 'GET', headers: { 'Accept': 'text/html' } })
      .then(function (r) {
        if (!r.ok) throw new Error('Failed: ' + url + ' (' + r.status + ')');
        return r.text();
      });
  }

  function parseStyles(html) {
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    tmp.querySelectorAll('style, link[rel="stylesheet"]').forEach(function (el) {
      document.head.appendChild(el.cloneNode(true));
    });
  }

  function injectNav(html) {
    parseStyles(html);
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    // Remove style/link tags from the div before inserting (already moved to head)
    tmp.querySelectorAll('style, link').forEach(function (el) { el.remove(); });
    var nav = tmp.firstElementChild;
    if (!nav) return;
    var body = document.body;
    // Insert after any GTM noscript
    var refNode = null;
    body.querySelectorAll('noscript').forEach(function (ns) {
      if (ns.innerHTML.indexOf('googletagmanager') !== -1) refNode = ns;
    });
    body.insertBefore(nav, refNode ? refNode.nextSibling : body.firstChild);
    wireNav();
  }

  function injectFooter(html) {
    parseStyles(html);
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    tmp.querySelectorAll('style').forEach(function (el) { el.remove(); });
    // Append all child nodes
    while (tmp.firstChild) {
      document.body.appendChild(tmp.firstChild);
    }
    var yr = document.getElementById('gf-year');
    if (yr) yr.textContent = new Date().getFullYear();
  }

  function wireNav() {
    // Active link highlighting
    var path = window.location.pathname.replace(/\/$/, '') || '/';
    document.querySelectorAll('.gnav-menu a, .mob-nav a').forEach(function (a) {
      var href = (a.getAttribute('href') || '').replace(/\/$/, '');
      if (href && href !== '' && path === href) a.classList.add('active');
    });
    // CTA override
    document.querySelectorAll('script[data-cta]').forEach(function (s) {
      var btn = document.getElementById('gnav-cta-btn');
      if (btn) btn.textContent = s.dataset.cta;
    });
  }

  function run() {
    var navUrl = basePath + 'includes/nav.html';
    var footerUrl = basePath + 'includes/footer.html';

    fetchInclude(navUrl)
      .then(injectNav)
      .catch(function (e) { console.error('[nav-loader] Nav fetch failed:', e); });

    fetchInclude(footerUrl)
      .then(injectFooter)
      .catch(function (e) { console.error('[nav-loader] Footer fetch failed:', e); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
