// Runs on every page: Meta pixel + Cortana, then the job of the page it is on (body data-page="...").
(function () {
  var F = window.FUNNEL, page = document.body.getAttribute("data-page"), q = new URLSearchParams(location.search);
  var NO = /no thanks|no, thanks|keep my current|don.t want|skip/i;

  // Tracking
  !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v;
    s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  fbq("init", F.pixelId); fbq("track", "PageView");
  if (F.cortanaSrc) { var c = document.createElement("script"); c.async = true; c.src = F.cortanaSrc; document.head.appendChild(c); }
  var track = function (ev, data, id) { try { fbq("track", ev, data || {}, id ? { eventID: id } : {}); } catch (e) {} };

  // Order kept in the browser tab so every page knows the order and the thank you page can list it
  var store = {
    get: function () { try { return JSON.parse(sessionStorage.getItem("order") || "{}"); } catch (e) { return {}; } },
    set: function (o) { try { sessionStorage.setItem("order", JSON.stringify(o)); } catch (e) {} },
  };
  var keep = ["email", "utm_source", "utm_medium", "utm_campaign", "utm_content", "campaign_id", "medium_id", "content_id", "fbclid"];
  var carry = function (url, extra) {   // pass email and ad tags along from page to page
    var u = new URL(url, location.origin);
    keep.forEach(function (k) { if (q.get(k) && !u.searchParams.has(k)) u.searchParams.set(k, q.get(k)); });
    Object.keys(extra || {}).forEach(function (k) { u.searchParams.set(k, extra[k]); });
var same = u.host === location.host;
    return (same ? "" : u.origin) + u.pathname + u.search;  };

  if (page === "optin") {
    document.querySelectorAll("form").forEach(function (f) {
      f.addEventListener("submit", function (e) {
        e.preventDefault();
        var email = (f.querySelector("input[type=email]") || {}).value || "";
        var body = { email: email, page: location.pathname };
        keep.forEach(function (k) { if (q.get(k)) body[k] = q.get(k); });
        track("Lead");
        fetch("/api/lead", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), keepalive: true })
          .catch(function () {});
        location.href = carry("/watch", { email: email });
      });
    });
  }

  if (page === "watch") {
    track("ViewContent");
    document.querySelectorAll("a.btn").forEach(function (a) { a.setAttribute("href", carry(a.getAttribute("href"))); });
  }

  if (/^upsell-/.test(page)) {
    // Front-end sale just went through: Stripe sends them here with ?payment_intent=pi_...
    var order = store.get();
    if (q.get("redirect_status") && q.get("redirect_status") !== "succeeded")
      return (location.href = "/checkout?plan=" + encodeURIComponent(q.get("plan") || "3m"));
    if (q.get("payment_intent") && order.pi !== q.get("payment_intent")) {
      var pk = F.packages[q.get("plan")] || F.packages["3m"];
      order = { pi: q.get("payment_intent"), secret: q.get("payment_intent_client_secret"), plan: q.get("plan"),
                items: [["Secret Shrooomz " + pk[0], pk[1]]] };
      store.set(order);
      if (order.pi !== "demo") track("Purchase", { value: pk[1], currency: "USD", content_name: pk[0] }, order.pi);
    }
    var flow = F.flow[page] || {}, offers = F.offers[page] || [];
    var go = function (to) { location.href = carry(to, { plan: q.get("plan") || order.plan || "" }); };
    document.querySelectorAll("a, button").forEach(function (el) {
      var text = (el.innerText || "").trim();
      if (!text) return;
      var offer = null;
      if (!NO.test(text)) offers.some(function (o) { if (o[0].test(text)) { offer = o[1]; return true; } return false; });
      if (!offer && !NO.test(text)) return;
      el.addEventListener("click", function (e) {
        e.preventDefault(); e.stopPropagation();
        if (!offer) return go(flow.no);
        if (el.dataset.busy) return;
        el.dataset.busy = "1"; var label = el.innerHTML; el.innerHTML = "Processing...";
        var sel = document.querySelector("select"), qty = sel ? sel.value : 1;
        var done = function (amount, id) {
          order.items = (order.items || []).concat([[(F.names[offer] || offer) + (qty > 1 ? " x" + qty : ""), amount / 100]]);
          store.set(order);
          if (!/^demo/.test(id)) track("Purchase", { value: amount / 100, currency: "USD", content_name: offer }, id);
          go(flow.yes);
        };
        var fail = function (msg) { el.innerHTML = label; delete el.dataset.busy; alert(msg || "Sorry, that did not go through. Please try again."); };
        fetch("/api/upsell", { method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ pi: order.pi, secret: order.secret, offer: offer, qty: qty }) })
          .then(function (r) { return r.json(); })
          .then(function (r) {
            if (r.ok) return done(r.amount, r.id);
            if (!r.requires_action) return fail(r.error);
            // The bank wants the buyer to confirm this charge (3D Secure): show Stripe's confirm box, then carry on
            return fetch("/api/config").then(function (x) { return x.json(); }).then(function (cfg) {
              return loadStripe().then(function () { return Stripe(cfg.publishableKey).confirmCardPayment(r.client_secret); });
            }).then(function (res) {
              if (res.error) return fail(res.error.message);
              done(res.paymentIntent.amount, res.paymentIntent.id);
            });
          })
          .catch(function () { fail(); });
      }, true);
    });
  }

  if (page === "thank-you") {
    var o = store.get(), items = o.items || [];
    if (items.length) {
      var total = items.reduce(function (s, i) { return s + i[1]; }, 0);
      document.querySelectorAll("body *").forEach(function (el) {
        if (el.children.length) return;
        var t = el.textContent.trim();
        if (t === "Shrooomz 3-Month Supply") el.innerHTML = items.map(function (i) { return i[0]; }).join("<br>");
        if (t === "$199.00") el.textContent = "$" + total.toFixed(2);
      });
    }
  }

  function loadStripe() {
    return new Promise(function (ok, bad) {
      if (window.Stripe) return ok();
      var s = document.createElement("script"); s.src = "https://js.stripe.com/v3/"; s.onload = ok; s.onerror = bad;
      document.head.appendChild(s);
    });
  }
})();
