// Cloudflare Pages Function: receives lead submissions from /assets/js/lead-form.js
// and writes them straight to GHL via the API (Contacts upsert + Opportunity create),
// replacing the "Webhook: Survey Create Contact" GHL workflow so field mapping is
// explicit and version-controlled here instead of hidden inside a workflow UI.
//
// Replicates exactly what that workflow did (verified against live GHL data before
// this was written): same custom field IDs, same tags, same assignedTo, same
// pipeline/stage. Downstream GHL automations (AI SMS Agent, Discovery Call
// Confirm+Remind, Immediate Call Request Handler, Sales Cadence) key off tags/
// opportunity-stage/contact-created triggers, which fire the same way whether the
// contact was created by a workflow or directly via API, so they are unaffected.
//
// Requires a Pages environment variable: GHL_API_KEY (the location's Private
// Integration Token, same one lead-form.js's old webhook URL was scoped to).

const LOCATION_ID = 'dCXNdvDmGZAHcKccUmzw';
const PIPELINE_ID = 'DrFWt5hW6eJeY2YWGoVN';
const PIPELINE_STAGE_ID = '347e129a-7cdb-441d-8f90-6bdd492abb3d'; // "Lead In"
const ASSIGNED_TO = 'n3oifwBd4fjOfcW8tK9m';
const DEFAULT_TAGS = ['survey trusts', 'survey', 'appt not booked'];

// contact.<fieldKey> -> custom field id, read from GHL's own
// /locations/{id}/customFields on 2026-11-02 — update here if a field is renamed.
const CUSTOM_FIELD_IDS = {
  utm_source: 'ORDPsGFeMG4T31FivBIr',
  utm_term: 'U1vSURVssnsSs1WD5phy',
  utm_medium: 'Zl32uVF6RWF4JRrfzRzm',
  utm_content: 'aX8QZMGn7Dc4ZztoWxqx',
  gclick_id: 'bt0nMSagW6yR9IUc0XI7',
  landing_page_url: 'cSSeBFAnwGd75AejUdWb',
  referrer: 'gHemZ23nywhsMAiUdY5C',
  page_url: 'mqsi6QE2qA0gzxhd68yI',
  xxTrustedFormCertUrl: 'sn4kA3FWocLl65SOjfvb',
  service: 'u5Egczk4XNNVOOc0SebK',
  utm_campaign: 'ugWbqjBdVS7eUdNgxoO9',
  message: 'yslUhkNyoVUH2Hq0x3oE',
  sms_consent: 'oCAob9hn31X8h28tObtg'
};

function toE164(raw) {
  var digits = (raw || '').replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits[0] === '1') return '+' + digits;
  return raw.indexOf('+') === 0 ? raw : '+' + digits;
}

function buildCustomFields(body) {
  var fields = [];
  Object.keys(CUSTOM_FIELD_IDS).forEach(function (key) {
    var value = body[key];
    // sms_consent is a CHECKBOX field in GHL, which takes an array of the
    // selected option(s) rather than a plain string.
    if (key === 'sms_consent') {
      fields.push({ id: CUSTOM_FIELD_IDS[key], field_value: value === true ? ['true'] : [] });
      return;
    }
    if (value === undefined || value === null) value = '';
    fields.push({ id: CUSTOM_FIELD_IDS[key], field_value: String(value) });
  });
  return fields;
}

async function ghlFetch(env, path, options) {
  var res = await fetch('https://services.leadconnectorhq.com' + path, {
    method: options.method,
    headers: {
      'Authorization': 'Bearer ' + env.GHL_API_KEY,
      'Version': '2021-07-28',
      'Content-Type': 'application/json'
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  var text = await res.text();
  var json;
  try { json = JSON.parse(text); } catch (e) { json = { raw: text }; }
  if (!res.ok) {
    throw new Error('GHL ' + path + ' -> ' + res.status + ': ' + text.slice(0, 500));
  }
  return json;
}

export async function onRequestPost(context) {
  var env = context.env;

  var body;
  try {
    body = await context.request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'invalid JSON' }), { status: 400 });
  }

  if (!env.GHL_API_KEY) {
    return new Response(JSON.stringify({ error: 'server not configured' }), { status: 500 });
  }

  var firstName = (body.first_name || '').trim();
  var lastName = (body.last_name || '').trim();
  var email = (body.email || '').trim();
  var phone = toE164(body.phone || '');

  if (!firstName || (!phone && !email)) {
    return new Response(JSON.stringify({ error: 'missing required fields' }), { status: 400 });
  }

  try {
    var contactRes = await ghlFetch(env, '/contacts/upsert', {
      method: 'POST',
      body: {
        locationId: LOCATION_ID,
        firstName: firstName,
        lastName: lastName,
        email: email || undefined,
        phone: phone || undefined,
        source: body.source || 'Website Form',
        tags: DEFAULT_TAGS,
        assignedTo: ASSIGNED_TO,
        customFields: buildCustomFields(body)
      }
    });

    var contactId = contactRes.contact && contactRes.contact.id;

    if (contactId) {
      await ghlFetch(env, '/opportunities/', {
        method: 'POST',
        body: {
          locationId: LOCATION_ID,
          pipelineId: PIPELINE_ID,
          pipelineStageId: PIPELINE_STAGE_ID,
          name: (firstName + ' ' + lastName).trim(),
          status: 'open',
          contactId: contactId,
          assignedTo: ASSIGNED_TO,
          monetaryValue: 0
        }
      });
    }

    return new Response(JSON.stringify({ ok: true, contactId: contactId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
