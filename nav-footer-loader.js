(function(){
  var basePath = (function(){
    // Determine root from script src or default to /
    var scripts = document.getElementsByTagName('script');
    for(var i=0;i<scripts.length;i++){
      var src = scripts[i].src || '';
      if(src.indexOf('nav-footer-loader')!==-1){
        return src.replace(/includes\/nav-footer-loader\.js.*/,'');
      }
    }
    return '/';
  })();

  function fetchHTML(url, cb){
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function(){
      if(xhr.readyState === 4) cb(xhr.status === 200 ? xhr.responseText : '');
    };
    xhr.send();
  }

  function injectNav(html){
    if(!html) return;
    var div = document.createElement('div');
    div.innerHTML = html;
    var body = document.body;
    // Insert after GTM noscript if present
    var noscripts = body.querySelectorAll('noscript');
    var refNode = null;
    noscripts.forEach(function(ns){ if(ns.innerHTML.indexOf('googletagmanager')!==-1) refNode = ns; });
    if(refNode && refNode.nextSibling){
      body.insertBefore(div.firstChild, refNode.nextSibling);
    } else {
      body.insertBefore(div.firstChild, body.firstChild);
    }
    // Move style tags to head
    div.querySelectorAll('style,link').forEach(function(el){
      document.head.appendChild(el.cloneNode(true));
    });
    wireNav();
  }

  function injectFooter(html){
    if(!html) return;
    var div = document.createElement('div');
    div.innerHTML = html;
    document.body.appendChild(div.firstChild);
    div.querySelectorAll('style').forEach(function(el){
      document.head.appendChild(el.cloneNode(true));
    });
    // Set year
    var yr = document.getElementById('gf-year');
    if(yr) yr.textContent = new Date().getFullYear();
  }

  function wireNav(){
    // Active link
    var path = window.location.pathname.replace(/\/$/, '') || '/';
    document.querySelectorAll('.gnav-menu a, .mob-nav a').forEach(function(a){
      var href = (a.getAttribute('href') || '').replace(/\/$/, '');
      if(href && path === href) a.classList.add('active');
    });
    // CTA override from data-cta on loader script
    var scripts = document.querySelectorAll('script[src*="nav-footer-loader"]');
    scripts.forEach(function(s){
      var cta = s.dataset.cta;
      if(cta){
        var btn = document.getElementById('gnav-cta-btn');
        if(btn) btn.textContent = cta;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    fetchHTML(basePath + 'includes/nav.html', injectNav);
    fetchHTML(basePath + 'includes/footer.html', injectFooter);
  });
})();
