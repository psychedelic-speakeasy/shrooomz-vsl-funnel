// POST /api/lead  {email, page, utm...}  ->  {ok}
// Sends each opt-in to the email system (a GoHighLevel inbound webhook, or any URL that accepts JSON) so the
// welcome emails start. Set LEAD_WEBHOOK_URL in Cloudflare. The visitor always goes on to the video, even if this fails.
import { clean, json } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => ({}));
  const email = clean(b.email, 254);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ ok: false, error: "Please enter a valid email" }, 400);
  if (!env.LEAD_WEBHOOK_URL) return json({ ok: true, sent: false });
  const payload = { email, source: "vsl-optin", page: clean(b.page), submitted_at: new Date().toISOString() };
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "campaign_id", "medium_id", "content_id", "fbclid"])
    if (b[k]) payload[k] = clean(b[k]);
  try {
    const r = await fetch(env.LEAD_WEBHOOK_URL, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
    });
    return json({ ok: true, sent: r.ok });
  } catch {
    return json({ ok: true, sent: false });
  }
}
