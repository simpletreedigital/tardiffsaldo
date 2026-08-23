// Cloudflare Pages Function: runs on every request, before the page is served.
// Injects the shared lead-form.js script into every HTML page automatically,
// so no individual page file needs a manual <script src> reference.
//
// To change form behavior, edit /assets/js/lead-form.js directly.
// This file only controls whether/where that script gets loaded.

const FORM_SCRIPT_SNIPPET = `
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
