export async function onRequestPost(context) {
  var env = context.env;
  var log = [];

  async function call(label, path, body) {
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 8000);
    try {
      var res = await fetch('https://services.leadconnectorhq.com' + path, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': 'Bearer ' + env.GHL_API_KEY,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      clearTimeout(timeout);
      var text = await res.text();
      log.push({ step: label, status: res.status, body: text.slice(0, 800) });
      return { res: res, text: text };
    } catch (err) {
      clearTimeout(timeout);
      log.push({ step: label, caught: true, error: String(err), name: err && err.name });
      return null;
    }
  }

  var contactResult = await call('contacts_upsert_full_fields', '/contacts/upsert', {
    locationId: 'dCXNdvDmGZAHcKccUmzw',
    firstName: 'DebugProbe2',
    lastName: 'Test',
    email: 'debug-probe-test-2@example.com',
    phone: '+18055551234',
    source: 'Automated Test',
    tags: ['survey trusts', 'survey', 'appt not booked'],
    assignedTo: 'n3oifwBd4fjOfcW8tK9m',
    customFields: [
      { id: 'ORDPsGFeMG4T31FivBIr', field_value: 'google' },
      { id: 'u5Egczk4XNNVOOc0SebK', field_value: 'Trust & Estate Planning' },
      { id: 'oCAob9hn31X8h28tObtg', field_value: ['true'] }
    ]
  });

  var contactId = null;
  if (contactResult) {
    try {
      var parsed = JSON.parse(contactResult.text);
      contactId = parsed.contact && parsed.contact.id;
    } catch (e) {}
  }

  if (contactId) {
    await call('opportunity_create', '/opportunities/', {
      locationId: 'dCXNdvDmGZAHcKccUmzw',
      pipelineId: 'DrFWt5hW6eJeY2YWGoVN',
      pipelineStageId: '347e129a-7cdb-441d-8f90-6bdd492abb3d',
      name: 'DebugProbe2 Test',
      status: 'open',
      contactId: contactId,
      assignedTo: 'n3oifwBd4fjOfcW8tK9m',
      monetaryValue: 0
    });
  }

  return new Response(JSON.stringify({ contactId: contactId, log: log }, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
