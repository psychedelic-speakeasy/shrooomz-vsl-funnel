// Shared server code for the funnel's API (Cloudflare Pages Functions). No npm packages: Stripe is called directly.

// Every price lives here, on the server. The pages only send an offer code, never an amount.
// Names and codes match what the current site already writes to Stripe, so reports keep working.
export const FRONT = {
  "1m": { amount: 9900, product: "Shrooomz 1-Month Supply" },
  "3m": { amount: 19900, product: "Shrooomz 3-Month Supply" },
  "6m": { amount: 29700, product: "Shrooomz 6-Month Supply" },
};

export const UPSELLS = {
  upsell1_6month: { amount: 29700, name: "Secret Shrooomz — 6 Month Supply (6 Refill Pouches, 120 Capsules)" },
  upsell1_12month: { amount: 59700, name: "Secret Shrooomz — 12 Month Supply (12 Refill Pouches, 240 Capsules)" },
  upsell2_hero_dose: { amount: 9900, name: "Transformation Shrooomz — Single Session (15 Capsules, 6,000mg)", qty: true },
  downsell_hero_dose_c: { amount: 7900, name: "Transformation Shrooomz — Single Session Pack", qty: true },
  upsell4_3month: { amount: 14900, name: "Super Shrooomz — 3 Month Supply (30 doses)" },
  upsell4_6month: { amount: 29700, name: "Super Shrooomz — 6 Month Supply (60 doses)" },
  upsell4_12month: { amount: 59700, name: "Super Shrooomz — 12 Month Supply (120 doses)" },
  upsell3_1order: { amount: 9900, name: "Gummy Shrooomz — 1 Jar (40 Gummies)" },
  downsell_gummies: { amount: 4900, name: "Gummy Shrooomz — 1 Jar (40 Gummies)" },
};

export const FUNNEL = "vsl";            // written to Stripe as metadata.funnel on every front-end order
export const FLOW_VERSION = "vsl-1";

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

export const isDemo = (env) => !env.STRIPE_SECRET_KEY || !env.STRIPE_PUBLISHABLE_KEY;

// Form-encode nested params the way Stripe expects (metadata[key]=value, a[b][c]=d).
function encode(obj, prefix, out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") encode(v, key, out);
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  }
  return out;
}

export async function stripe(env, method, path, params, idempotencyKey) {
  const headers = { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` };
  let url = `https://api.stripe.com/v1/${path}`, body;
  if (method === "GET") {
    if (params) url += "?" + encode(params).join("&");
  } else {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = encode(params || {}).join("&");
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  }
  const r = await fetch(url, { method, headers, body });
  return { ok: r.ok, data: await r.json() };
}

export const clean = (s, max = 200) => String(s || "").trim().slice(0, max);
