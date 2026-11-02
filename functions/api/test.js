export async function onRequestPost(context) {
  return new Response(JSON.stringify({ ok: true, hasKey: !!context.env.GHL_API_KEY }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
