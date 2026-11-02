// Shared lead form handler — single source of truth for all forms sitewide.
// Referenced on every page automatically via /functions/_middleware.js.
// To change form behavior (payload shape, redirect, tracking), edit this file only.

(function () {
  var STORAGE_KEY = 'ts_attribution';
  // Same-origin Cloudflare Pages Function (see /functions/api/lead.js) — calls GHL's
  // API directly server-side with the real token, instead of posting to a public
  // GHL inbound-webhook URL that then relied on a GHL workflow to map fields.
  var WEBHOOK_URL = '/api/lead';
  var THANK_YOU_URL = 'https://tardiffsaldo.com/thank-you/';

  // Capture UTM/gclid params on every page load and persist them for the
  // session, so attribution survives even if the visitor lands on one page
  // (e.g. a Google Ads landing page) and converts from a different page.
  function captureAttribution() {
    var params = new URLSearchParams(window.location.search);
    var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid'];
    var existing = {};
    try {
      existing = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
    } catch (e) {
      existing = {};
    }
    var found = false;
    keys.forEach(function (key) {
      var val = params.get(key);
      if (val) {
        existing[key] = val;
        found = true;
      }
    });
    // Always refresh the landing page URL to the first page seen this session
    if (!existing.landing_page_url) {
      existing.landing_page_url = window.location.href;
    }
    if (found || !existing.landing_page_url) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
      } catch (e) {}
    } else {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
      } catch (e) {}
    }
    return existing;
  }

  function getAttribution() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  var SEARCH_ENGINE_HOSTS = /google\.|bing\.|yahoo\.|duckduckgo\.|ecosia\.|baidu\./;

  // Best-effort fallback so utm_source is never blank just because a visitor's
  // landing URL lacked query params (e.g. a bookmarked or copy-pasted link).
  // Real Google Ads clicks always carry utm_source via the campaign's final
  // URL suffix, so this only fills gaps — it never overrides a captured value.
  function deriveSource(attribution) {
    if (attribution.utm_source) return attribution.utm_source;
    if (attribution.gclid) return 'google';
    var ref = '';
    try { ref = document.referrer || ''; } catch (e) {}
    if (!ref) return 'direct';
    try {
      var host = new URL(ref).hostname.replace(/^www\./, '');
      if (/google\./.test(host)) return 'google';
      if (/bing\./.test(host)) return 'bing';
      if (/facebook\.|instagram\./.test(host)) return 'facebook';
      if (/chatgpt\.com|openai\.com/.test(host)) return host;
      return host;
    } catch (e) {
      return 'direct';
    }
  }

  // A visitor with no UTM params and no gclid is either organic search,
  // a referral from another site, or direct/bookmarked traffic. None of
  // that is paid, so without this, SEO leads land in GHL with a blank
  // utm_medium and are indistinguishable from direct traffic.
  function deriveMedium(attribution) {
    if (attribution.utm_medium) return attribution.utm_medium;
    if (attribution.gclid) return 'cpc';
    var ref = '';
    try { ref = document.referrer || ''; } catch (e) {}
    if (!ref) return 'direct';
    try {
      var host = new URL(ref).hostname.replace(/^www\./, '');
      if (host === window.location.hostname) return 'direct';
      if (SEARCH_ENGINE_HOSTS.test(host)) return 'organic';
      return 'referral';
    } catch (e) {
      return 'direct';
    }
  }

  window.addEventListener('DOMContentLoaded', captureAttribution);

  // TrustedForm populates #xxTrustedFormCertUrl asynchronously (usually
  // within ~1s of page load). Give it a brief window to finish on fast
  // submissions rather than sending the cert field blank.
  function waitForTrustedFormCert(maxWaitMs) {
    var deadline = Date.now() + maxWaitMs;
    return new Promise(function (resolve) {
      (function poll() {
        var el = document.getElementById('xxTrustedFormCertUrl');
        if ((el && el.value) || Date.now() >= deadline) {
          resolve((el && el.value) || '');
        } else {
          setTimeout(poll, 100);
        }
      })();
    });
  }

  window.handleFormSubmit = async function () {
    var fname = (document.getElementById('ts-fname') || {}).value || '';
    var lname = (document.getElementById('ts-lname') || {}).value || '';
    var phone = (document.getElementById('ts-phone') || {}).value || '';
    var email = (document.getElementById('ts-email') || {}).value || '';
    var serviceEl = document.getElementById('ts-service');
    var service = serviceEl ? serviceEl.value : '';
    var messageEl = document.getElementById('ts-message');
    var message = messageEl ? messageEl.value.trim() : '';
    var smsEl = document.getElementById('ts-sms-consent');
    var sms = smsEl ? smsEl.checked : false;

    fname = fname.trim();
    phone = phone.trim();
    email = email.trim();

    if (!fname || (!phone && !email)) {
      alert('Please fill in your name and at least one way to reach you.');
      return;
    }

    var btn = document.getElementById('ts-submit-btn');
    var sourceLabel = (btn && btn.getAttribute('data-source')) || document.title || 'Website Form';
    if (btn) {
      btn.textContent = 'Submitting...';
      btn.disabled = true;
    }

    var attribution = getAttribution();
    var trustedFormCertUrl = await waitForTrustedFormCert(1000);

    // Store for GTM Enhanced Conversions (used across site + landing pages)
    try {
      window.localStorage.setItem('email', email.toLowerCase());
      window.localStorage.setItem('phone', phone.replace(/[^\d+]/g, ''));
      window.localStorage.setItem('fname', fname);
      window.localStorage.setItem('lname', lname);
    } catch (e) {}

    var payload = {
      first_name: fname,
      last_name: lname,
      phone: phone,
      email: email,
      service: service,
      message: message,
      sms_consent: sms,
      source: sourceLabel,
      utm_source: deriveSource(attribution),
      utm_medium: deriveMedium(attribution),
      utm_campaign: attribution.utm_campaign || '',
      utm_content: attribution.utm_content || '',
      utm_term: attribution.utm_term || '',
      gclick_id: attribution.gclid || '',
      page_url: window.location.href,
      landing_page_url: attribution.landing_page_url || window.location.href,
      referrer: (function () { try { return document.referrer || ''; } catch (e) { return ''; } })(),
      xxTrustedFormCertUrl: trustedFormCertUrl
    };

    try {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.error(e);
    }

    // Use GTM's eventCallback/eventTimeout instead of an immediate redirect.
    // A bare `dataLayer.push` followed by `location.href = ...` is a known
    // race condition: the push returns synchronously, but GTM processes
    // triggers and fires the Google Ads conversion tag asynchronously, so an
    // immediate navigation can abort the conversion pixel's network request
    // before it's sent (silently dropping the conversion). eventCallback
    // fires once GTM has finished dispatching this event to all its tags;
    // eventTimeout is a safety cap so a visitor is never stuck if GTM is
    // slow to load or fails outright.
    var redirected = false;
    function goToThankYou() {
      if (redirected) return;
      redirected = true;
      window.location.href = THANK_YOU_URL;
    }
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'generate_lead',
      eventCallback: goToThankYou,
      eventTimeout: 1500
    });
    setTimeout(goToThankYou, 1500);
  };
})();
