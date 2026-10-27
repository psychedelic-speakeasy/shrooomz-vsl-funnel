// Funnel settings that are safe to be public. Edit here, not in the pages.
window.FUNNEL = {
  pixelId: "723231497191383",                                                   // Meta pixel (Mighty Micro)
  cortanaSrc: "https://use.shrooomz.com/api/hub/v1/cmvf4incm0007qk020yawqjsk",   // Cortana: add the new domain in Cortana first
  // Where each page sends people. "yes" = they bought the offer, "no" = they said no thanks.
  flow: {
    "upsell-1": { yes: "/upsell-2", no: "/upsell-2" },
    "upsell-2": { yes: "/upsell-3", no: "/upsell-2b" },
    "upsell-2b": { yes: "/upsell-3", no: "/upsell-3" },
    "upsell-3": { yes: "/upsell-4", no: "/upsell-4" },
    "upsell-4": { yes: "/thank-you", no: "/upsell-4b" },
    "upsell-4b": { yes: "/thank-you", no: "/thank-you" },
  },
  // Which button buys which offer, matched on the button's words. Codes and prices are in functions/api/_lib.js.
  offers: {
    "upsell-1": [[/12[- ]month/i, "upsell1_12month"], [/6[- ]month/i, "upsell1_6month"]],
    "upsell-2": [[/accept|transformation dose|yes/i, "upsell2_hero_dose"]],
    "upsell-2b": [[/hero.?s dose|yes/i, "downsell_hero_dose_c"]],
    "upsell-3": [[/12 months/i, "upsell4_12month"], [/6 months/i, "upsell4_6month"], [/3 months/i, "upsell4_3month"]],
    "upsell-4": [[/add gummies|yes/i, "upsell3_1order"]],
    "upsell-4b": [[/gummies|\$49|yes/i, "downsell_gummies"]],
  },
  // How each upsell is listed on the thank you page
  names: {
    upsell1_6month: "Secret Shrooomz 6 Month Supply", upsell1_12month: "Secret Shrooomz 12 Month Supply",
    upsell2_hero_dose: "Transformation Shrooomz", downsell_hero_dose_c: "Transformation Shrooomz",
    upsell4_3month: "Super Shrooomz 3 Month Supply", upsell4_6month: "Super Shrooomz 6 Month Supply",
    upsell4_12month: "Super Shrooomz 12 Month Supply", upsell3_1order: "Gummy Shrooomz, 1 Jar",
    downsell_gummies: "Gummy Shrooomz, 1 Jar",
  },
  packages: { "1m": ["1 Month Supply", 99], "3m": ["3 Month Supply", 199], "6m": ["6 Month Supply", 297] },
};
