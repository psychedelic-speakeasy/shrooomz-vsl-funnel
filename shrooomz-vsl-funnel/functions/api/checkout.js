// POST /api/checkout  {plan, email, name, shipping}  ->  {clientSecret}
// Creates a Stripe customer and a PaymentIntent for the chosen package. setup_future_usage saves the card to the
// customer, which is what lets the upsells charge it again with one click and no form.
import { FRONT, FUNNEL, clean, isDemo, json, stripe } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => ({}));
  const plan = FRONT[b.plan];
  if (!plan) return json({ error: "Unknown package" }, 400);
  const email = clean(b.email, 254), name = clean(b.name, 120);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Please enter a valid email" }, 400);

  const s = b.shipping || {};
  const addr = { line1: clean(s.line1), line2: clean(s.line2) || undefined, city: clean(s.city),
                 state: clean(s.state, 40), postal_code: clean(s.zip, 12), country: "US" };
  if (!addr.line1 || !addr.city || !addr.state || !addr.postal_code)
    return json({ error: "Please complete your shipping address" }, 400);
  const shipTo = [addr.line1, addr.line2, addr.city, addr.state, addr.postal_code].filter(Boolean).join(", ");

  if (isDemo(env)) return json({ demo: true });

  const cust = await stripe(env, "POST", "customers", { email, name, address: addr, metadata: { source: FUNNEL } });
  if (!cust.ok) return json({ error: cust.data.error?.message || "Could not start checkout" }, 502);

  const pi = await stripe(env, "POST", "payment_intents", {
    amount: plan.amount,
    currency: "usd",
    customer: cust.data.id,
    setup_future_usage: "off_session",
    payment_method_types: ["card"],
    receipt_email: email,
    shipping: { name, address: addr },
    metadata: {
      ship_to: shipTo,
      funnel: FUNNEL, product: plan.product, plan: b.plan,
      customerEmail: email, customerName: name, stripe_customer_id: cust.data.id,
    },
  });
  if (!pi.ok) return json({ error: pi.data.error?.message || "Could not start checkout" }, 502);
  return json({ clientSecret: pi.data.client_secret, id: pi.data.id });
}
