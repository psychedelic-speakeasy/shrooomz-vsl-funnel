// GET /api/config  ->  {demo, publishableKey}
// The publishable key is safe to show in a browser. The secret key never leaves the server.
import { isDemo, json } from "./_lib.js";

export async function onRequestGet({ env }) {
  return json({ demo: isDemo(env), publishableKey: isDemo(env) ? null : env.STRIPE_PUBLISHABLE_KEY });
}
