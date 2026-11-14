(function () {
  "use strict";

  var CFG = window.SITE;
  var $ = function (id) { return document.getElementById(id); };
  var VIEWS = ["loading", "lost", "form", "done", "closed"];

  var code = "";        // the personal code from the guest's link
  var household = null; // { display, max, events: [eventId] }
  var saved = null;     // the guest's saved reply, if any: { answers, message }
  var open = true;      // false once the RSVP deadline has passed
  var answers = {};     // draft answers while filling in the form

  // ---------- talking to the Google script (or sample data while previewing) ----------

  function api(action, payload) {
    if (!CFG.apiUrl) return demoApi(action, payload);
    var body = JSON.stringify(Object.assign({ action: action, event: CFG.eventKey }, payload));
    // No Content-Type header on purpose: it keeps this a "simple" request that Google accepts from any page.
    return fetch(CFG.apiUrl, { method: "POST", body: body }).then(function (r) {
      if (!r.ok) throw new Error("bad status");
      return r.json();
    });
  }

  // Sample guests, only used while apiUrl is empty (preview).
  var DEMO = {
    RAHMAN: { display: "The Rahman Family", max: 5, events: ["nikkah"] },
    SIDDIQ: { display: "The Siddiqui Family", max: 2, events: ["nikkah"] },
    AYESHA: { display: "Ayesha Malik", max: 1, events: ["nikkah"] },
    CHAUDH: { display: "The Chaudhry Family", max: 12, events: ["nikkah"] }
  };
  var DEADLINE = Date.parse("2026-12-14T05:00:00Z"); // end of Dec 13 in Toronto

  function demoStore() { try { return JSON.parse(localStorage.getItem("demoRepliesNikkah") || "{}"); } catch (e) { return {}; } }

  function demoApi(action, p) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        var store = demoStore(), h = DEMO[p.code];
        if (!h) { resolve({ ok: false, error: "unknown" }); return; }
        if (action === "get") {
          resolve({ ok: true, household: h, response: store[p.code] || null, open: Date.now() < DEADLINE });
        } else if (action === "submit") {
          store[p.code] = { answers: p.answers, message: p.message || "" };
          localStorage.setItem("demoRepliesNikkah", JSON.stringify(store));
          resolve({ ok: true, response: store[p.code] });
        }
      }, 450);
    });
  }

  // ---------- small helpers ----------

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function eventById(id) { return CFG.events.filter(function (e) { return e.id === id; })[0]; }

  var firstShow = true;
  function show(name) {
    VIEWS.forEach(function (v) { $("view-" + v).hidden = v !== name; });
    if (firstShow) { firstShow = false; return; } // the first screen opens at the top, under the invitation art
    var card = $("view-" + name), h = card.querySelector("h2");
    window.scrollTo({ top: Math.max(card.offsetTop - 16, 0), behavior: "smooth" });
    if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  }

  function showError(id, text) {
    var p = $(id);
    if (!text) { p.hidden = true; return; }
    p.textContent = text;
    p.hidden = false;
  }

  function busy(btn, on, label) {
    btn.disabled = on;
    if (label) btn.textContent = label;
  }

  var NETWORK_MSG = "We could not reach the server. Please check your internet connection and try again.";

  function googleCalUrl(ev) {
    return "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      "&text=" + encodeURIComponent(ev.calendarTitle) +
      "&dates=" + ev.startUTC + "/" + ev.endUTC +
      "&ctz=America%2FToronto" +
      "&location=" + encodeURIComponent(ev.venue + ", " + ev.address);
  }

  function eventCard(ev) {
    var card = el("div", "event");
    card.appendChild(el("h3", null, ev.name));
    card.appendChild(el("p", "when-line", ev.dateText + (ev.timeText ? " at " + ev.timeText : "")));
    var where = el("p", "where", ev.venue);
    if (ev.address) where.appendChild(el("small", null, ev.address));
    card.appendChild(where);

    // the map and calendar buttons appear once those details are filled in (config.js)
    var actions = el("div", "actions");
    if (ev.mapsUrl) {
      var map = el("a", "btn secondary", "Open in Google Maps");
      map.href = ev.mapsUrl; map.target = "_blank"; map.rel = "noopener";
      actions.appendChild(map);
    }
    if (!ev.startUTC) { if (ev.mapsUrl) card.appendChild(actions); return card; }

    var d = el("details", "cal");
    d.appendChild(el("summary", null, "Add to calendar"));
    var links = el("div", "cal-links");
    var g = el("a", null, "Google Calendar");
    g.href = googleCalUrl(ev); g.target = "_blank"; g.rel = "noopener";
    links.appendChild(g);
    if (ev.icsFile) {
      var ics = el("a", null, "Apple or Outlook");
      ics.href = ev.icsFile;
      links.appendChild(ics);
    }
    d.appendChild(links);
    actions.appendChild(d);
    card.appendChild(actions);
    return card;
  }

  // ---------- opening the personal link ----------

  $("deadline-2").textContent = CFG.deadlineText;

  if (!CFG.apiUrl) {
    var note = $("demo-note");
    note.hidden = false;
    note.appendChild(document.createTextNode("Preview with sample guests. Try these personal links: "));
    Object.keys(DEMO).forEach(function (k, i) {
      if (i) note.appendChild(document.createTextNode(", "));
      var a = el("a", null, DEMO[k].display);
      a.href = "?i=" + k;
      note.appendChild(a);
    });
  }

  // Put the guest's name on the invitation: "Dear Rahman Family".
  function greet(name) {
    var film = $("film");
    var eyebrow = film && film.querySelector(".eyebrow"), lead = film && film.querySelector(".lead");
    if (!eyebrow || !lead || !name) return;
    var who = "Dear " + String(name).replace(/^the\s+/i, "");
    eyebrow.textContent = who;
    eyebrow.classList.add("is-name");
    film.classList.add("has-name");
    // add "together with our families" as an extra line, unless the name is long
    // enough to need two lines itself (the words must stay clear of the couple)
    lead.textContent = "";
    lead.appendChild(document.createTextNode("together with our families"));
    lead.appendChild(document.createElement("br"));
    lead.appendChild(document.createTextNode("invite you to our"));
    function fit() {
      var line = parseFloat(getComputedStyle(eyebrow).lineHeight) || 16;
      if (eyebrow.offsetHeight > line * 1.6) lead.textContent = "invite you to our";
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit); else fit();
  }

  function start() {
    code = (new URLSearchParams(window.location.search).get("i") || "").trim();
    if (!/^[A-Za-z0-9]{4,24}$/.test(code)) { show("lost"); return; }
    api("get", { code: code }).then(function (r) {
      if (!r.ok) { show("lost"); return; }
      household = r.household;
      greet(household.display);
      saved = r.response;
      open = r.open;
      if (saved) { renderDone(); show("done"); }
      else if (!open) { show("closed"); }
      else { answers = {}; renderForm(); show("form"); }
    }).catch(function () {
      $("view-lost").querySelector("h2").textContent = "We could not reach the server";
      $("view-lost").querySelector("p").textContent = "Please check your internet connection and reload this page.";
      show("lost");
    });
  }

  // ---------- the reply form ----------

  function renderForm() {
    var prior = saved ? saved.answers : {};
    $("form-title").textContent = "Welcome, " + household.display;
    $("message").value = saved ? (saved.message || "") : "";
    showError("form-error");
    var wrap = $("events");
    wrap.textContent = "";

    household.events.forEach(function (evId) {
      var ev = eventById(evId);
      if (!ev) return;
      answers[evId] = prior[evId] ? { attending: prior[evId].attending, count: prior[evId].count } : { attending: null, count: null };
      var card = eventCard(ev);

      card.appendChild(el("p", "q", "Will you be joining us?"));
      var choice = el("div", "choice");
      var yes = el("button", "btn yes", "Yes, we will be there");
      var no = el("button", "btn no", "Sorry, we cannot make it");
      yes.type = no.type = "button";
      choice.appendChild(yes); choice.appendChild(no);
      card.appendChild(choice);

      var countWrap = el("div", "count-wrap");
      card.appendChild(countWrap);

      function refresh() {
        var a = answers[evId];
        yes.setAttribute("aria-pressed", a.attending === true ? "true" : "false");
        no.setAttribute("aria-pressed", a.attending === false ? "true" : "false");
        countWrap.textContent = "";
        if (a.attending === true) {
          countWrap.appendChild(el("p", "q", "How many people will be coming, including you?"));
          var grid = el("div", "counts");
          for (var n = 1; n <= household.max; n++) {
            (function (n) {
              var b = el("button", null, String(n));
              b.type = "button";
              b.setAttribute("aria-pressed", a.count === n ? "true" : "false");
              b.setAttribute("aria-label", n + (n === 1 ? " person" : " people"));
              b.addEventListener("click", function () { a.count = n; refresh(); });
              grid.appendChild(b);
            })(n);
          }
          countWrap.appendChild(grid);
          countWrap.appendChild(el("p", "limit-note", household.max === 1 ? "Your invitation is for 1 guest." : "Your invitation is for up to " + household.max + " guests."));
        }
      }
      yes.addEventListener("click", function () { answers[evId].attending = true; refresh(); });
      no.addEventListener("click", function () { answers[evId].attending = false; answers[evId].count = 0; refresh(); });
      refresh();
      wrap.appendChild(card);
    });
  }

  $("rsvp-form").addEventListener("submit", function (e) {
    e.preventDefault();
    showError("form-error");
    var ids = Object.keys(answers), i, a;
    for (i = 0; i < ids.length; i++) {
      a = answers[ids[i]];
      var name = eventById(ids[i]).name;
      if (a.attending === null) { showError("form-error", "Please tell us if you can come to the " + name + "."); return; }
      if (a.attending && !a.count) { showError("form-error", "Please choose how many people are coming to the " + name + "."); return; }
    }
    var btn = $("send-btn");
    busy(btn, true, "Sending...");
    api("submit", { code: code, answers: answers, message: $("message").value.trim() }).then(function (r) {
      if (!r.ok) {
        showError("form-error", r.error === "closed"
          ? "Sorry, replies have closed. Please contact Irfan or Aafia directly."
          : "Something went wrong. Please try again.");
        return;
      }
      saved = r.response;
      renderDone();
      show("done");
    }).catch(function () {
      showError("form-error", NETWORK_MSG);
    }).then(function () { busy(btn, false, "Send my reply"); });
  });

  // ---------- thank you ----------

  function renderDone() {
    $("done-title").textContent = "Thank you, " + household.display;
    var sum = $("done-summary"), extra = $("done-extra");
    sum.textContent = ""; extra.textContent = "";
    sum.className = "summary";

    household.events.forEach(function (evId) {
      var ev = eventById(evId), a = saved.answers[evId];
      if (!ev || !a) return;
      var p = el("p");
      if (a.attending) {
        p.appendChild(document.createTextNode("We will see you at the " + ev.name + ": "));
        p.appendChild(el("strong", null, a.count + (a.count === 1 ? " guest" : " guests")));
        p.appendChild(document.createTextNode("."));
        extra.appendChild(eventCard(ev));
      } else {
        p.textContent = "We are sorry you cannot make the " + ev.name + ". You will be missed.";
      }
      sum.appendChild(p);
    });
    if (saved.message) sum.appendChild(el("p", null, "Your message has been passed on to us."));

    $("change-btn").hidden = !open;
    $("done-note").textContent = open
      ? "You can change your answer any time until " + CFG.deadlineText + "."
      : "Replies are now closed. To make a change, please contact Irfan or Aafia directly.";
  }

  $("change-btn").addEventListener("click", function () {
    answers = {};
    renderForm();
    show("form");
  });

  start();
})();

// The invitation film: the opening scene plays once, then we walk through the gateway
// into the invitation. The invitation keeps moving gently, but only while it is on screen
// (saves battery). People who have seen the opening before go straight to the invitation.
(function () {
  var frame = document.getElementById("film");
  if (!frame) return;
  var card = frame.querySelector(".scene-card");
  var opening = frame.querySelector(".scene-open");
  var replay = frame.querySelector(".replay");
  var still = frame.classList.contains("is-still"); // this phone asked for less motion
  var OPENING_SECONDS = Number(frame.getAttribute("data-opening-seconds")) || 7.8; // when the opening hands over to the invitation
  var SEEN_KEY = frame.getAttribute("data-seen-key") || "nikkahFilmSeen";
  // The opening ends on the very picture the invitation loop shows at this many seconds in,
  // so the loop is lined up there and the hand-over cannot be seen.
  var HANDOFF = Number(frame.getAttribute("data-handoff")) || 0;
  var linedUp = false;
  var showingCard = !frame.classList.contains("is-opening");
  var onScreen = true, timers = [];

  function play(v) {
    if (!v.play) return Promise.resolve(); // the invitation is a still picture; the page moves it
    var p = v.play();
    return (p && p.then) ? p : Promise.resolve();
  }
  function quiet() {}

  function showCard() {
    if (showingCard) return;
    showingCard = true;
    timers.forEach(clearTimeout);
    timers = [];
    frame.classList.remove("is-opening");
    frame.classList.add("is-card", "is-through");
    if (onScreen) play(card).catch(quiet);
    setTimeout(function () { if (showingCard) opening.pause(); }, 2300);
    try { localStorage.setItem(SEEN_KEY, "1"); } catch (e) {}
  }

  function startOpening() {
    showingCard = false;
    // put everything back to the start in one go, without the slow glide playing backwards
    frame.classList.add("no-move");
    frame.classList.remove("is-card", "is-through", "is-seen", "is-pushing", "doors-open");
    frame.classList.add("is-opening");
    void frame.offsetWidth;
    frame.classList.remove("no-move");
    (card.pause && card.pause());
    linedUp = false;
    try { card.currentTime = 0; } catch (e) {}
    try { opening.currentTime = 0; } catch (e) {}
    play(opening).then(function () {
      if (!showingCard) frame.classList.add("is-pushing"); // the camera starts to glide in
    }).catch(showCard); // phones that will not play video go straight to the invitation
    timers.push(setTimeout(function () { if (opening.currentTime < 0.2) showCard(); }, 4000)); // slow connection
    timers.push(setTimeout(showCard, 14000));
  }

  if (!still) {
    opening.addEventListener("timeupdate", function () {
      if (showingCard) return;
      // the initials on the doors fade just before the doors begin to open
      if (opening.currentTime >= 2.3) frame.classList.add("doors-open");
      if (!linedUp && HANDOFF && opening.currentTime >= OPENING_SECONDS - 2.5) {
        linedUp = true;
        try { card.currentTime = HANDOFF; } catch (e) {}
      }
      if (opening.currentTime >= OPENING_SECONDS) showCard();
    });
    opening.addEventListener("ended", showCard);
    frame.querySelector(".opening").addEventListener("click", showCard); // a tap skips ahead
    if (replay) replay.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
      startOpening();
    });
    if (!showingCard) startOpening();
  }

  if (!("IntersectionObserver" in window)) {
    if (!still && showingCard) play(card).catch(quiet);
    return;
  }
  new IntersectionObserver(function (entries) {
    onScreen = entries[0].isIntersecting;
    frame.classList.toggle("is-offscreen", !onScreen);
    if (still || !showingCard) return;
    if (onScreen) play(card).catch(quiet); else (card.pause && card.pause());
  }).observe(frame);
})();
