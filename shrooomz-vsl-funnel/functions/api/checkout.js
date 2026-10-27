// POST /api/checkout  {plan, email, name}  ->  {clientSecret}
// Creates a Stripe customer and a PaymentIntent for the chosen package. setup_future_usage saves the card to the
// customer, which is what lets the upsells charge it again with one click and no form.
import { FRONT, FUNNEL, clean, isDemo, json, stripe } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => ({}));
  const plan = FRONT[b.plan];
  if (!plan) return json({ error: "Unknown package" }, 400);
  const email = clean(b.email, 254), name = clean(b.name, 120);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Please enter a valid email" }, 400);
  if (isDemo(env)) return json({ demo: true });

  const cust = await stripe(env, "POST", "customers", { email, name, metadata: { source: FUNNEL } });
  if (!cust.ok) return json({ error: cust.data.error?.message || "Could not start checkout" }, 502);

  const pi = await stripe(env, "POST", "payment_intents", {
    amount: plan.amount,
    currency: "usd",
    customer: cust.data.id,
    setup_future_usage: "off_session",
    payment_method_types: ["card"],
    receipt_email: email,
    metadata: {
      funnel: FUNNEL, product: plan.product, plan: b.plan,
      customerEmail: email, customerName: name, stripe_customer_id: cust.data.id,
    },
  });
  if (!pi.ok) return json({ error: pi.data.error?.message || "Could not start checkout" }, 502);
  return json({ clientSecret: pi.data.client_secret, id: pi.data.id });
}
