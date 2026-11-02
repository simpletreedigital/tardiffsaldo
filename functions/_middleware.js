// Cloudflare Pages Function: runs on every request, before the page is served.
// Injects the shared lead-form.js script into every HTML page automatically,
// so no individual page file needs a manual <script src> reference.
//
// To change form behavior, edit /assets/js/lead-form.js directly.
// This file only controls whether/where that script gets loaded.

const FORM_SCRIPT_SNIPPET = `
<!-- TrustedForm (ActiveProspect) cert generation - populates the hidden
     xxTrustedFormCertUrl field below for lead-form.js to read on submit -->
<input type="hidden" id="xxTrustedFormCertUrl" name="xxTrustedFormCertUrl">
<script type="text/javascript">
(function() {
  var field = 'xxTrustedFormCertUrl';
  var provideReferrer = false;
  var invertFieldSensitivity = false;
  var tf = document.createElement('script');
  tf.type = 'text/javascript'; tf.async = true;
  tf.src = ('https:' == document.location.protocol ? 'https' : 'http') +
      '://api.trustedform.com/trustedform.js?provide_referrer=' + escape(provideReferrer) +
      '&field=' + escape(field) + '&l=' + new Date().getTime() + Math.random() +
      '&invert_field_sensitivity=' + invertFieldSensitivity;
  var s = document.getElementsByTagName('script')[0];
  s.parentNode.insertBefore(tf, s);
})();
</script>
<noscript><img src='https://api.trustedform.com/ns.gif' /></noscript>
<!-- Shared lead form handler (single source of truth, see /assets/js/lead-form.js) -->
<script src="/assets/js/lead-form.js" defer></script>
<!-- End lead form handler -->
`;

class BodyInjector {
  element(el) {
    el.append(FORM_SCRIPT_SNIPPET, { html: true });
  }
}

export async function onRequest(context) {
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';

  // Only rewrite actual HTML documents, leave images, CSS, JSON, etc. untouched
  if (!contentType.includes('text/html')) {
    return response;
  }

  return new HTMLRewriter()
    .on('body', new BodyInjector())
    .transform(response);
}
