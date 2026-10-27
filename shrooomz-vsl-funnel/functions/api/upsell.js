// POST /api/upsell  {pi, secret, offer, qty}  ->  {ok, id, amount} | {requires_action, client_secret} | {ok:false, error}
// One-click upsell: charges the card saved at checkout (the front-end PaymentIntent `pi`) with no form.
// The amount always comes from the server's offer list. The same offer can only be charged once per order, and only
// by the buyer's own browser: `secret` is the order's client secret, which Stripe gives only to that browser.
import { FLOW_VERSION, FUNNEL, UPSELLS, isDemo, json, stripe } from "./_lib.js";

const MAX_AGE_SECONDS = 2 * 60 * 60;   // upsells only within 2 hours of the order

export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => ({}));
  const offer = UPSELLS[b.offer];
  if (!offer) return json({ ok: false, error: "Unknown offer" }, 400);
  const qty = offer.qty ? Math.min(Math.max(parseInt(b.qty, 10) || 1, 1), 5) : 1;
  if (isDemo(env)) return json({ ok: true, demo: true, id: `demo_${b.offer}`, amount: offer.amount * qty });

  if (!/^pi_[A-Za-z0-9]+$/.test(b.pi || "")) return json({ ok: false, error: "Order not found" }, 400);
  const front = await stripe(env, "GET", `payment_intents/${b.pi}`);
  const p = front.data;
  if (!front.ok || p.status !== "succeeded" || p.metadata?.funnel !== FUNNEL || p.client_secret !== b.secret)
    return json({ ok: false, error: "Order not found" }, 400);
  if (Date.now() / 1000 - p.created > MAX_AGE_SECONDS) return json({ ok: false, error: "This offer has expired" }, 400);

  const r = await stripe(env, "POST", "payment_intents", {
    amount: offer.amount * qty,
    currency: "usd",
    customer: p.customer,
    payment_method: p.payment_method,
    off_session: true,
    confirm: true,
    receipt_email: p.receipt_email || undefined,
    metadata: {
      product_name: offer.name, upsell: b.offer, quantity: qty, one_click_upsell: "true", flow_version: FLOW_VERSION,
      customer_email: p.metadata?.customerEmail, customer_name: p.metadata?.customerName, parent_payment_intent: p.id,
    },
  }, `${p.id}-${b.offer}`);

  if (r.ok && r.data.status === "succeeded") return json({ ok: true, id: r.data.id, amount: r.data.amount });
  const err = r.data.error;
  if (err?.code === "authentication_required" && err.payment_intent?.client_secret)
    return json({ ok: false, requires_action: true, client_secret: err.payment_intent.client_secret });
  return json({ ok: false, error: err?.message || "The card was declined" }, 402);
}
