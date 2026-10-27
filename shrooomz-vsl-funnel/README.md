# Shrooomz VSL funnel: build and go-live guide

This folder is a complete website, ready to deploy to **Cloudflare Pages**. It is the funnel you clicked through on
shrooomz.hellrichmedia.com, wired to your own Stripe so it takes real orders, with one-click upsells.

**For Claude (or whoever deploys it):** follow the steps below in order. Do not rebuild or restyle the pages. Every
page, price and button is already done and tested. Your job is to deploy it, add the settings, test it in Stripe
test mode, then switch it to live.

## What is in here

| Page (URL on the new domain) | File | What it does |
|---|---|---|
| `/` | `public/index.html` | Opt-in. Sends the email to your email system, then goes to the video |
| `/watch` | `public/watch.html` | The video page. Packages appear at the price point (1 month $99, 6 months $297, 3 months $199) |
| `/checkout` | `public/checkout.html` | Stripe card form for the package they picked. Saves the card for the upsells |
| `/upsell-1` | `public/upsell-1.html` | More supply: 6 months $297 or 12 months $597 (6-month buyers skip this page) |
| `/upsell-2` | `public/upsell-2.html` | Transformation Shrooomz (hero dose) $99. "No thanks" goes to `/upsell-2b` |
| `/upsell-2b` | `public/upsell-2b.html` | Hero dose downsell $79 |
| `/upsell-3` | `public/upsell-3.html` | Super Shrooomz: 3 months $149, 6 months $297, 12 months $597 |
| `/upsell-4` | `public/upsell-4.html` | Gummies $99. "No thanks" goes to `/upsell-4b` |
| `/upsell-4b` | `public/upsell-4b.html` | Gummies downsell $49 |
| `/thank-you` | `public/thank-you.html` | Order confirmed, lists everything they bought |

Server code (runs on Cloudflare, not in the browser), in `functions/api/`:

- `checkout.js` creates the Stripe customer and the payment for the chosen package. The card is saved to the customer.
- `upsell.js` charges the saved card when they click yes on an upsell. One click, no form.
- `lead.js` sends each opt-in email to your email system.
- `config.js` gives the page your Stripe publishable key.
- `_lib.js` holds **every price** and product name. The pages never send a price, only an offer code, so nobody can
  change what they pay.

Stripe records each sale the same way your current site does (`funnel`, `product` on the first order;
`upsell`, `product_name`, `one_click_upsell` on upsells), with `funnel = vsl`, so your reports and Cortana keep working
and you can see the new funnel's sales separately.

## Step 1: Deploy to Cloudflare Pages

Functions only deploy with Wrangler or Git, **not** by dragging the folder into the dashboard.

1. Install Node.js, then in this folder run: `npx wrangler login` (log in to your Cloudflare account).
2. Run: `npx wrangler pages deploy public --project-name shrooomz-vsl-funnel`
3. It prints a `*.pages.dev` link. Open it. With no Stripe keys yet the site runs in **demo mode** (a navy bar on the
   checkout says so). Click through the whole funnel. No card is charged in demo mode.

## Step 2: Add your domain

Cloudflare dashboard, Workers and Pages, `shrooomz-vsl-funnel`, Custom domains, Set up a domain. Add the new domain
(for example `yourdomain.com`, or `www.yourdomain.com`). If the domain is on your Cloudflare it connects by itself.

## Step 3: Settings (environment variables)

Cloudflare dashboard, the Pages project, Settings, Variables and Secrets. Add these for **Production**, then redeploy
(run the deploy command from Step 1 again):

| Name | Type | Value |
|---|---|---|
| `STRIPE_SECRET_KEY` | Secret | Your Stripe secret key. Start with the **test** key (`sk_test_...`) |
| `STRIPE_PUBLISHABLE_KEY` | Text | The matching publishable key (`pk_test_...` for test) |
| `LEAD_WEBHOOK_URL` | Secret | Where opt-in emails go. In GoHighLevel: Automation, create a workflow with an Inbound Webhook trigger, copy its URL here. Any URL that accepts JSON works |

Your Meta pixel ID and the Cortana script are in `public/js/settings.js`. They are already set to your current
pixel (Mighty Micro) and your Cortana script.

## Step 4: Test with Stripe test mode (do not skip)

With the **test** keys in place:

1. Go through the funnel on the real domain. Use card `4242 4242 4242 4242`, any future date, any CVC.
2. On each upsell click yes on at least one and no on at least one. Each yes should go straight to the next page.
3. In Stripe (test mode), Payments: you should see the first order plus one payment per upsell you said yes to, all on
   the same customer, with the metadata above.
4. Test a card that asks for bank confirmation: `4000 0027 6000 3184`. On an upsell, Stripe shows a confirm box; approve
   it and the funnel carries on.
5. Test a declined card: `4000 0000 0000 0002`. The checkout shows the error and nothing is charged.
6. Check the email from the opt-in arrived in GoHighLevel.

## Step 5: Go live

1. Swap both Stripe settings to your **live** keys (`sk_live_...`, `pk_live_...`) and redeploy.
2. Do one real order at $99 (1 month) and refund it in Stripe.
3. Tell Hell Rich Media the final URL. We point the ads at it.

## Before or straight after go-live

- **Video:** in `public/watch.html`, replace the `.player` placeholder with your Vturb embed. In Vturb: hide the
  progress bar, turn off skipping, autoplay muted with tap for sound, and use "delayed elements" to show the packages
  at the price (the notes at the top of that file explain it). Until then a still image shows and the packages appear
  after 6:15, or at once with `?reveal=1` on the link.
- **Cortana:** add the new domain in Cortana so it tracks there. If Cortana gives you a new script link for the new
  domain, put it in `public/js/settings.js` as `cortanaSrc`.
- **Meta:** verify the new domain in Business Manager (Brand safety, Domains).
- **Email deliverability:** the new domain is clean, so set up its sending records before you send from it: in
  GoHighLevel add the domain as a sending domain and add the SPF, DKIM and DMARC records it gives you in Cloudflare DNS.
- **Text to fill in:** anything in [square brackets] on the pages (guarantee days, shipping, product facts) needs your
  words. Search the `public` folder for `[`.
- **PayPal, crypto and bank wire** are not in this checkout yet (card only). They can be added later.
- **Super Shrooomz 6 and 12 month** product names in `_lib.js` are our best guess, as there were no sales of those
  yet to copy from. Check they read the way you want in Stripe.

## Changing things later

- Prices or product names: `functions/api/_lib.js`, and the matching words on the page.
- Which page leads where, or which button buys which offer: `public/js/settings.js`.
- Upsells only work within 2 hours of the first order, and each one can only be charged once per order.
