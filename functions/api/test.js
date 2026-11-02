export async function onRequestPost(context) {
  var env = context.env;
  var controller = new AbortController();
  var timeout = setTimeout(function () { controller.abort(); }, 8000);
  try {
    var res = await fetch('https://services.leadconnectorhq.com/contacts/upsert', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': 'Bearer ' + env.GHL_API_KEY,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        locationId: 'dCXNdvDmGZAHcKccUmzw',
        firstName: 'DebugProbe',
        lastName: 'Test',
        email: 'debug-probe-test@example.com'
      })
    });
    clearTimeout(timeout);
    var text = await res.text();
    return new Response(JSON.stringify({ status: res.status, body: text.slice(0, 500) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    clearTimeout(timeout);
    return new Response(JSON.stringify({ caught: true, error: String(err), name: err && err.name }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
