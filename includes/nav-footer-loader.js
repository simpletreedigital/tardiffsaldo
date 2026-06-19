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
    while (wrap.firstChild) {
      document.body.insertBefore(wrap.firstChild, ref);
    }
    wireNav();
  }

  /* ── inject footer as last child of <body> ── */
  function injectFooter(html) {
    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    while (wrap.firstChild) {
      document.body.appendChild(wrap.firstChild);
    }
    var yr = document.getElementById('gf-year');
    if (yr) yr.textContent = new Date().getFullYear();
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
