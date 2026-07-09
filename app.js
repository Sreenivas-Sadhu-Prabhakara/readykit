/* ============================================================
   readykit — client-side preparedness checklist engine.
   No network. No dependencies. State in localStorage.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- tiny helpers ---------- */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // Deterministic small hash for localStorage keys (djb2).
  function hash(str) {
    var h = 5381, i = str.length;
    while (i) { h = (h * 33) ^ str.charCodeAt(--i); }
    return "readykit:" + (h >>> 0).toString(36);
  }

  function plural(n, one, many) { return n === 1 ? one : (many || one + "s"); }

  /* ---------- category icons (inline, stroke = currentColor via CSS) ---------- */
  var ICONS = {
    water:  '<path d="M12 3s6 6.5 6 11a6 6 0 1 1-12 0c0-4.5 6-11 6-11z"/>',
    food:   '<path d="M4 5v14m4-14v6a3 3 0 0 1-6 0V5m14-1v16m0-9c-2 0-3-2-3-4s1-3 3-3"/>',
    medical:'<rect x="4" y="7" width="16" height="12" rx="2"/><path d="M12 11v4m-2-2h4M8 7V5h8v2"/>',
    docs:   '<path d="M7 3h7l4 4v14H7zM14 3v4h4"/>',
    power:  '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    comms:  '<path d="M4 14a10 10 0 0 1 16 0M7 17a6 6 0 0 1 10 0M12 21v-1"/>',
    tools:  '<path d="M14 6a4 4 0 0 0-5 5L3 17l4 4 6-6a4 4 0 0 0 5-5l-3 3-2-2 3-3a4 4 0 0 0-2-2z"/>',
    hygiene:'<path d="M8 3h8v4H8zM6 7h12l-1 14H7zM10 11v6m4-6v6"/>',
    infant: '<circle cx="12" cy="7" r="3"/><path d="M6 21c0-4 3-7 6-7s6 3 6 7"/>',
    elderly:'<circle cx="12" cy="5" r="2.5"/><path d="M12 8v7m0 0-3 6m3-6 3 6M8 12h5"/>',
    pets:   '<path d="M5 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm14 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm6 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 12c-3 0-5 2.5-5 5a3 3 0 0 0 3 3c1 0 1.5-.5 2-.5s1 .5 2 .5a3 3 0 0 0 3-3c0-2.5-2-5-5-5z"/>',
    gobag:  '<path d="M8 7V5a4 4 0 0 1 8 0v2m-11 0h14l-1 14H6z"/>'
  };

  /* ============================================================
     THE ENGINE — build a plan from a config.
     Every item: { name, qty, why, priority }
     priority: "critical" (life-safety flag) | "first" (pack first) | ""
     ============================================================ */
  function buildPlan(cfg) {
    var people = cfg.adults + cfg.children + cfg.infants + cfg.elderly;
    people = Math.max(people, 0);
    var days = cfg.days;
    var haz = cfg.hazards;
    var personDays = people * days;
    var cats = [];

    function cat(id, title, items) {
      var real = items.filter(Boolean);
      if (real.length) cats.push({ id: id, title: title, items: real });
    }

    /* ---- WATER ---- */
    var waterL = 4 * people * days;
    cat("water", "Water", [
      people > 0 && {
        name: "Drinking & hygiene water",
        qty: waterL + " L",
        why: "~4 L/person/day (≈1 gallon) for drinking + basic hygiene, for " + people + " " +
             plural(people, "person", "people") + " × " + days + " " + plural(days, "day") + ".",
        priority: "critical"
      },
      {
        name: "Water-purification tablets or unscented bleach",
        qty: (haz.typhoon || haz.outage) ? "60+ tablets" : "1 pack",
        why: haz.typhoon
          ? "Floodwater contaminates supply lines — treat any water you're unsure of before drinking."
          : "A backup way to make questionable water safe if stored supply runs low.",
        priority: "first"
      },
      {
        name: "Wide-mouth containers / jerry cans",
        qty: Math.max(2, Math.ceil(waterL / 20)) + " × 20 L",
        why: "Store and carry your water; refill from a safe source when the tap is cut.",
        priority: ""
      }
    ]);

    /* ---- FOOD ---- */
    cat("food", "Food", [
      people > 0 && {
        name: "Ready-to-eat, non-perishable food",
        qty: personDays + " person-days",
        why: people + " " + plural(people, "person", "people") + " × " + days + " " +
             plural(days, "day") + " of food that needs no cooking or refrigeration (canned goods, biscuits, noodles).",
        priority: "first"
      },
      { name: "Manual can opener", qty: "1", why: "Half a pantry of canned food is useless without one — and it needs no power.", priority: "" },
      { name: "Salt, sugar & basic seasoning", qty: "1 small kit", why: "Makes plain rations edible and helps replace what you lose sweating in the heat.", priority: "" },
      { name: "Reusable plates, cups & utensils", qty: people + " " + plural(people, "set"), why: "Eat and drink hygienically without wasting water on washing every time.", priority: "" }
    ]);

    /* ---- MEDICAL & FIRST AID ---- */
    cat("medical", "Medical & First Aid", [
      { name: "First-aid kit", qty: "1 stocked", why: "Bandages, antiseptic, gauze, tape, scissors — treat cuts and wounds before they get infected.", priority: "critical" },
      { name: "Pain / fever medication", qty: "1 pack", why: "Paracetamol or ibuprofen for injuries, fever, and headaches when a clinic isn't reachable.", priority: "first" },
      { name: "Oral rehydration salts (ORS)", qty: (haz.typhoon ? people * 4 : people * 2) + " sachets", why: "Diarrhoea and heat are the real post-disaster killers — ORS treats dehydration fast.", priority: haz.typhoon ? "first" : "" },
      { name: "Antiseptic & alcohol", qty: "1 bottle", why: "Clean wounds and hands when clean water is scarce and infection risk is high.", priority: "" },
      { name: "Digital thermometer", qty: "1", why: "Catch fever early in a crowded shelter where illness spreads quickly.", priority: "" }
    ]);

    /* ---- ELDERLY & MEDICATION ---- */
    cat("elderly", "Elderly & Medication", [
      cfg.meds && {
        name: "Prescription medication",
        qty: "≥7-day supply",
        why: "At least a 7-day supply of each prescription, in original labelled containers, plus a copy of the prescription.",
        priority: "critical"
      },
      cfg.elderly > 0 && { name: "Spare eyeglasses / hearing-aid batteries", qty: "1 spare set", why: "A lost or broken pair can leave someone dependent and unsafe in an evacuation.", priority: "first" },
      cfg.mobility && { name: "Mobility aid & spare parts", qty: "1 + basics", why: "Cane, walker or spare wheelchair parts so limited mobility never traps someone during evacuation.", priority: "first" },
      (cfg.elderly > 0 || cfg.meds) && { name: "Written medical & contact card", qty: (Math.max(cfg.elderly, 1)) + " " + plural(Math.max(cfg.elderly, 1), "card"), why: "Conditions, allergies, meds and next-of-kin on paper — responders can help even if you can't speak.", priority: "first" }
    ]);

    /* ---- INFANT & CHILD ---- */
    var diapers = days * 6;
    cat("infant", "Infant & Child", [
      cfg.infants > 0 && { name: "Infant formula / feeding supplies", qty: cfg.infants > 1 ? days + " days × " + cfg.infants : days + " days", why: "If breastfeeding isn't possible, ready-to-feed formula and clean bottles for " + days + " " + plural(days, "day") + ".", priority: "critical" },
      cfg.infants > 0 && { name: "Diapers", qty: (diapers * cfg.infants) + " (≈6/day)", why: "~6 diapers/day × " + days + " " + plural(days, "day") + (cfg.infants > 1 ? " × " + cfg.infants + " infants." : "."), priority: "first" },
      cfg.infants > 0 && { name: "Baby wipes & rash cream", qty: "2 packs", why: "Hygiene for infants when running water is unavailable.", priority: "" },
      cfg.children > 0 && { name: "Comfort item & simple games", qty: cfg.children + " " + plural(cfg.children, "item"), why: "A familiar toy, cards or a book keeps children calm through long, frightening waits.", priority: "" },
      cfg.children > 0 && { name: "Kid-friendly snacks", qty: cfg.children * days + " days", why: "Familiar snacks children will actually eat during the stress of an emergency.", priority: "" }
    ]);

    /* ---- POWER & LIGHT ---- */
    cat("power", "Power & Light", [
      { name: "Flashlight / headlamp", qty: Math.max(1, cfg.adults + cfg.elderly) + " " + plural(Math.max(1, cfg.adults + cfg.elderly), "unit"), why: "Hands-free light to move safely and signal for help — never use candles near gas or debris.", priority: "critical" },
      { name: "Spare batteries", qty: "2× device needs", why: "Twice what your flashlight and radio need — dead batteries make every other tool useless.", priority: "first" },
      { name: "Power bank", qty: (people <= 2 ? "1 × 10,000 mAh" : "2 × 10,000 mAh"), why: "Keep one phone alive for alerts and emergency calls when the grid is down.", priority: "first" },
      haz.outage && { name: "Solar / hand-crank charger", qty: "1", why: "Recharge lights and phones through a multi-day outage with no wall power at all.", priority: "" },
      { name: "Candles are a fire risk — skip if gas may leak", qty: "note", why: "After earthquakes and floods, prefer battery light; open flame can ignite leaking gas.", priority: "" }
    ]);

    /* ---- COMMUNICATION ---- */
    cat("comms", "Communication", [
      { name: "Battery / hand-crank radio", qty: "1", why: "The one link to official warnings and instructions when cell networks fail.", priority: "critical" },
      { name: "Whistle", qty: people + " " + plural(people, "whistle"), why: "Three sharp blasts carry far further than a shout — signal rescuers if trapped.", priority: "critical" },
      { name: "Written emergency contacts", qty: "1 card/person", why: "Family, neighbours, and local hotlines on paper — phones die, memory fails under stress.", priority: "first" },
      { name: "Family meeting-point plan", qty: "1 plan", why: "Agree now where to reunite if separated and phones are down.", priority: "first" },
      cfg.region === "ph" && { name: "PH hotlines: NDRRMC 911 / Red Cross 143", qty: "note", why: "Know the numbers before you need them; save and write them down.", priority: "" }
    ]);

    /* ---- TOOLS & SAFETY ---- */
    cat("tools", "Tools & Safety", [
      { name: "Multi-tool or knife", qty: "1", why: "Cut, open, and repair — the single most-used tool in any kit.", priority: "first" },
      { name: "Work gloves", qty: Math.max(1, cfg.adults) + " " + plural(Math.max(1, cfg.adults), "pair"), why: "Handle broken glass, debris and sharp metal safely during cleanup and rescue.", priority: "" },
      { name: "Duct tape & rope / paracord", qty: "1 roll + 15 m", why: "Seal, secure and improvise repairs — from tarps to splints.", priority: "" },
      haz.fire && { name: "Fire extinguisher (ABC)", qty: "1", why: "Stop a small fire before it spreads; check the gauge is in the green.", priority: "critical" },
      haz.fire && { name: "Smoke alarm — test & spare battery", qty: "1 check", why: "Early warning is the difference between escaping and being trapped by fire.", priority: "first" },
      (haz.earthquake || haz.typhoon) && { name: "Sturdy closed-toe shoes", qty: people + " " + plural(people, "pair"), why: "Broken glass and debris cover the floor after quakes and floods — kept by the bed.", priority: "first" },
      haz.earthquake && { name: "Wrench to shut off gas / water", qty: "1", why: "Shut utilities fast after a quake to prevent gas leaks and flooding.", priority: "first" }
    ]);

    /* ---- HYGIENE & SANITATION ---- */
    cat("hygiene", "Hygiene & Sanitation", [
      { name: "Hand sanitiser & soap", qty: "1 set/person", why: "Disease spreads fast where water and toilets are limited — clean hands prevent it.", priority: "first" },
      { name: "Toilet supplies (bags, tissue)", qty: personDays + " uses", why: "Plan for sanitation when plumbing fails: heavy-duty bags, tissue, and a lidded bucket.", priority: "" },
      { name: "Garbage bags", qty: "1 roll", why: "Waste containment, waterproofing, and improvised rain ponchos.", priority: "" },
      { name: "Feminine hygiene supplies", qty: days + " days", why: "Easy to overlook and hard to source mid-crisis — pack ahead.", priority: "" },
      (haz.typhoon || haz.earthquake) && { name: "N95 or surgical masks", qty: people * 3 + "+", why: "Dust from collapsed structures and mould after flooding irritate lungs — protect airways.", priority: "" }
    ]);

    /* ---- volcanic ashfall gets its own emphasis in Tools/Hygiene ---- */
    if (haz.volcanic) {
      cats.forEach(function (c) {
        if (c.id === "hygiene") {
          c.items.push({ name: "N95 respirator masks (ashfall)", qty: people * 4 + "+", why: "Volcanic ash is sharp, glassy dust — ordinary cloth masks won't protect your lungs.", priority: "critical" });
        }
        if (c.id === "tools") {
          c.items.push({ name: "Sealed goggles (ashfall)", qty: people + " " + plural(people, "pair"), why: "Ash scratches eyes badly — sealed goggles, not just glasses, during ashfall.", priority: "first" });
          c.items.push({ name: "Damp cloths / plastic sheeting", qty: "1 set", why: "Seal window and door gaps to keep fine ash out of your home.", priority: "" });
        }
      });
    }

    /* ---- PETS ---- */
    cat("pets", "Pets", [
      cfg.pets > 0 && { name: "Pet food", qty: (cfg.pets * days) + " pet-days", why: cfg.pets + " " + plural(cfg.pets, "pet") + " × " + days + " " + plural(days, "day") + " of food; pack their usual brand to avoid stomach upset.", priority: "first" },
      cfg.pets > 0 && { name: "Pet water", qty: (cfg.pets * days) + " L", why: "≈1 L/pet/day on top of the household water above — don't let them drink floodwater.", priority: "first" },
      cfg.pets > 0 && { name: "Leash, carrier & ID tags", qty: cfg.pets + " " + plural(cfg.pets, "set"), why: "Move pets safely and prove they're yours if you get separated at a shelter.", priority: "" },
      cfg.pets > 0 && { name: "Pet meds & vaccination records", qty: "1 copy", why: "Many evacuation centres require proof of vaccination to admit animals.", priority: "" }
    ]);

    /* ---- IMPORTANT DOCUMENTS ---- */
    cat("docs", "Important Documents", [
      { name: "IDs & documents in a waterproof bag", qty: "1 pouch", why: "Passports, IDs, land titles, insurance, birth certificates — sealed against water, ready to grab.", priority: "critical" },
      { name: "Cash in small bills", qty: (people <= 2 ? "≈3 days cash" : "≈" + days + " days cash"), why: "ATMs and card machines fail in outages — small bills for water, transport and food.", priority: "first" },
      { name: "Printed maps & contact list", qty: "1 set", why: "Evacuation routes and centres on paper when your phone can't load a map.", priority: "" },
      { name: "USB copy of key documents", qty: "1", why: "Photos of every document on a small drive as a backup to the paper originals.", priority: "" }
    ]);

    /* ---- GO-BAG ESSENTIALS ---- */
    cat("gobag", "Go-Bag Essentials", [
      { name: "Sturdy backpack per person", qty: Math.max(1, cfg.adults + cfg.elderly) + " " + plural(Math.max(1, cfg.adults + cfg.elderly), "bag"), why: "A grab-and-go bag each so you can evacuate in under 60 seconds if told to leave.", priority: "first" },
      { name: "Emergency blanket / warm layer", qty: people + " " + plural(people, "person"), why: "Shock and wet clothes cause dangerous chills even in warm climates.", priority: "first" },
      { name: "Rain poncho", qty: people + " " + plural(people, "poncho"), why: "Stay dry and mobile when you have to move through rain or floodwater.", priority: "" },
      { name: "Change of clothes", qty: "1 set/person", why: "Dry clothes prevent chills and skin infection after getting soaked.", priority: "" },
      { name: "Local map with your evac route marked", qty: "1", why: "Know your route to higher ground or the nearest centre before you need it.", priority: "" }
    ]);

    /* stable order */
    var order = ["water", "food", "medical", "elderly", "infant", "power", "comms", "tools", "hygiene", "pets", "docs", "gobag"];
    cats.sort(function (a, b) { return order.indexOf(a.id) - order.indexOf(b.id); });
    return { cats: cats, meta: { people: people, personDays: personDays, waterL: waterL, days: days } };
  }

  /* ============================================================
     STATE — read config from the form
     ============================================================ */
  function readConfig() {
    function num(id) { var v = parseInt($("#" + id).value, 10); return isNaN(v) || v < 0 ? 0 : v; }
    var hazards = {};
    $$("input[name=hazard]").forEach(function (c) { hazards[c.value] = c.checked; });
    return {
      region: ($("input[name=region]:checked") || {}).value || "ph",
      hazards: hazards,
      adults: num("adults"),
      children: num("children"),
      infants: num("infants"),
      elderly: num("elderly"),
      pets: num("pets"),
      meds: $("input[name=meds]").checked,
      mobility: $("input[name=mobility]").checked,
      days: parseInt(($("input[name=days]:checked") || {}).value || "3", 10)
    };
  }

  function configKey(cfg) {
    return hash(JSON.stringify([
      cfg.region, cfg.days, cfg.adults, cfg.children, cfg.infants, cfg.elderly, cfg.pets,
      cfg.meds, cfg.mobility, cfg.hazards.typhoon, cfg.hazards.earthquake,
      cfg.hazards.volcanic, cfg.hazards.fire, cfg.hazards.outage
    ]));
  }

  var checkedState = {};   // itemId -> bool
  var storageOk = true;
  var currentKey = "";

  function loadChecks(key) {
    checkedState = {};
    if (!storageOk) return;
    try {
      var raw = localStorage.getItem(key);
      if (raw) checkedState = JSON.parse(raw) || {};
    } catch (e) { checkedState = {}; }
  }
  function saveChecks() {
    if (!storageOk) return;
    try { localStorage.setItem(currentKey, JSON.stringify(checkedState)); }
    catch (e) { storageOk = false; }
  }

  /* ============================================================
     RENDER
     ============================================================ */
  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

  function renderSummary(cfg, meta) {
    var wrap = $("#summary");
    wrap.innerHTML = "";
    var card = el("div", "summary__card");

    var lead = el("p", "summary__lead");
    lead.appendChild(document.createTextNode("Kit for "));
    var em = el("em", null, meta.people + " " + plural(meta.people, "person", "people"));
    lead.appendChild(em);
    lead.appendChild(document.createTextNode(", " + cfg.days + " " + plural(cfg.days, "day") + " of supply."));
    card.appendChild(lead);

    var facts = el("div", "summary__facts");
    function fact(label, val) {
      var f = el("span", "fact");
      f.appendChild(document.createTextNode(label + " "));
      f.appendChild(el("b", null, val));
      facts.appendChild(f);
    }
    var parts = [];
    if (cfg.adults) parts.push(cfg.adults + " " + plural(cfg.adults, "adult"));
    if (cfg.children) parts.push(cfg.children + " " + plural(cfg.children, "child", "children"));
    if (cfg.infants) parts.push(cfg.infants + " " + plural(cfg.infants, "infant"));
    if (cfg.elderly) parts.push(cfg.elderly + " elderly");
    if (cfg.pets) parts.push(cfg.pets + " " + plural(cfg.pets, "pet"));

    fact("Household", parts.join(", ") || "0 people");
    fact("Water target", meta.waterL + " L");
    fact("Food", meta.personDays + " person-days");
    var hz = Object.keys(cfg.hazards).filter(function (k) { return cfg.hazards[k]; });
    var hzNames = { typhoon: "Typhoon/flood", earthquake: "Earthquake", volcanic: "Volcanic", fire: "Fire", outage: "Outage" };
    fact("Hazards", hz.map(function (k) { return hzNames[k]; }).join(", ") || "none selected");
    fact("Region", cfg.region === "ph" ? "Philippines" : "Generic");
    card.appendChild(facts);
    wrap.appendChild(card);
  }

  function renderChecklist(plan) {
    var root = $("#checklist");
    root.innerHTML = "";

    plan.cats.forEach(function (c) {
      var card = el("section", "cat");
      card.setAttribute("aria-labelledby", "cat-" + c.id);

      var head = el("div", "cat__head");
      var glyph = el("span", "cat__glyph");
      glyph.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[c.id] || ICONS.gobag) + "</svg>";
      head.appendChild(glyph);
      var h = el("h3", "cat__title", c.title);
      h.id = "cat-" + c.id;
      head.appendChild(h);
      var count = el("span", "cat__count");
      count.setAttribute("data-cat", c.id);
      head.appendChild(count);
      card.appendChild(head);

      var list = el("ul", "cat__list");
      c.items.forEach(function (item, i) {
        var id = c.id + "-" + i + "-" + slug(item.name);
        var li = el("li", "item");
        li.dataset.id = id;
        if (checkedState[id]) li.classList.add("is-done");

        var boxWrap = el("span", "item__box");
        var box = el("input");
        box.type = "checkbox";
        box.checked = !!checkedState[id];
        box.id = "chk-" + id;
        box.setAttribute("aria-label", item.name + " — " + item.qty);
        box.addEventListener("change", function () {
          checkedState[id] = box.checked;
          li.classList.toggle("is-done", box.checked);
          saveChecks();
          updateMeter();
        });
        boxWrap.appendChild(box);
        li.appendChild(boxWrap);

        var main = el("label", "item__main");
        main.setAttribute("for", "chk-" + id);
        main.appendChild(el("span", "item__name", item.name));
        if (item.qty && item.qty !== "note") main.appendChild(el("span", "item__qty", item.qty));
        if (item.priority === "critical") main.appendChild(el("span", "tag tag--critical", "life-safety"));
        else if (item.priority === "first") main.appendChild(el("span", "tag tag--first", "pack first"));
        li.appendChild(main);

        li.appendChild(el("p", "item__why", item.why));
        list.appendChild(li);
      });
      card.appendChild(list);
      root.appendChild(card);
    });

    updateMeter();
  }

  function updateMeter() {
    var boxes = $$("#checklist input[type=checkbox]");
    var total = boxes.length;
    var done = boxes.filter(function (b) { return b.checked; }).length;
    var pct = total ? Math.round((done / total) * 100) : 0;

    var fill = $("#meterFill");
    fill.style.width = pct + "%";
    fill.classList.toggle("is-full", pct === 100 && total > 0);
    $("#meterPct").textContent = pct + "%";
    $("#meterCount").textContent = done + " of " + total;

    // per-category counts
    $$(".cat").forEach(function (card) {
      var cb = $$("input[type=checkbox]", card);
      var d = cb.filter(function (b) { return b.checked; }).length;
      var badge = $(".cat__count", card);
      if (badge) badge.textContent = d + "/" + cb.length;
    });
  }

  /* ============================================================
     REGION preset behaviour
     ============================================================ */
  function applyRegionHint() {
    var region = ($("input[name=region]:checked") || {}).value || "ph";
    $("#regionHint").textContent = region === "ph"
      ? "Presets tune defaults for Philippine hazards. Follow NDRRMC & PAGASA advisories."
      : "Generic global defaults. Adjust hazards to match where you live.";
  }

  /* ============================================================
     BUILD
     ============================================================ */
  function build(preserveChecks) {
    var cfg = readConfig();
    var newKey = configKey(cfg);
    if (!preserveChecks || newKey !== currentKey) {
      currentKey = newKey;
      loadChecks(currentKey);
    }
    var plan = buildPlan(cfg);
    renderSummary(cfg, plan.meta);
    renderChecklist(plan);
  }

  /* ============================================================
     WIRE UP
     ============================================================ */
  function init() {
    // storage feature test
    try { localStorage.setItem("readykit:test", "1"); localStorage.removeItem("readykit:test"); }
    catch (e) { storageOk = false; }

    $("#controls").addEventListener("submit", function (e) {
      e.preventDefault();
      build(true);
      // gentle scroll to results
      var kit = $("#kit");
      if (kit && kit.scrollIntoView) kit.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    $("#printBtn").addEventListener("click", function () { window.print(); });

    $("#resetBtn").addEventListener("click", function () {
      checkedState = {};
      saveChecks();
      $$("#checklist input[type=checkbox]").forEach(function (b) {
        b.checked = false;
        var li = b.closest(".item");
        if (li) li.classList.remove("is-done");
      });
      updateMeter();
    });

    $$("input[name=region]").forEach(function (r) {
      r.addEventListener("change", applyRegionHint);
    });

    applyRegionHint();
    renderContour();
    build(true); // default kit visible on load
  }

  /* ============================================================
     CONTOUR SIGNATURE — layered topographic lines
     ============================================================ */
  function renderContour() {
    var g = $(".contour__lines");
    if (!g) return;
    var W = 1560, H = 520;          // slightly wider than viewBox for drift room
    var lines = 9;
    var frag = document.createDocumentFragment();

    for (var i = 0; i < lines; i++) {
      var baseY = 90 + i * ((H - 130) / (lines - 1));
      var amp = 26 + (i % 3) * 14;
      var wavelen = 260 + (i % 4) * 55;
      var phase = i * 0.9;
      var d = "M -60 " + baseY.toFixed(1);
      for (var x = -60; x <= W; x += 24) {
        var y = baseY
          + Math.sin((x / wavelen) + phase) * amp
          + Math.sin((x / (wavelen * 0.42)) + phase * 1.7) * (amp * 0.28);
        d += " L " + x + " " + y.toFixed(1);
      }
      var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("d", d);
      // gentle emphasis: a couple of lines pick up the amber/green tint
      if (i === 3) p.style.stroke = "rgba(246,162,30,0.30)";
      else if (i === 6) p.style.stroke = "rgba(79,180,119,0.28)";
      p.style.opacity = (0.35 + (i / lines) * 0.5).toFixed(2);
      p.style.animationDelay = (-i * 2.4) + "s";
      frag.appendChild(p);
    }
    g.appendChild(frag);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
