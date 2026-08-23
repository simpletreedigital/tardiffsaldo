// Shared lead form handler — single source of truth for all forms sitewide.
// Referenced on every page automatically via /functions/_middleware.js.
// To change form behavior (payload shape, redirect, tracking), edit this file only.

(function () {
  var STORAGE_KEY = 'ts_attribution';
  var WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/dCXNdvDmGZAHcKccUmzw/webhook-trigger/lBvBBUBX5OjPWKVhAIHN';
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

  window.addEventListener('DOMContentLoaded', captureAttribution);

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
      utm_source: attribution.utm_source || '',
      utm_medium: attribution.utm_medium || '',
      utm_campaign: attribution.utm_campaign || '',
      utm_content: attribution.utm_content || '',
      utm_term: attribution.utm_term || '',
      gclick_id: attribution.gclid || '',
      page_url: window.location.href
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

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'generate_lead' });
    window.location.href = THANK_YOU_URL;
  };
})();
