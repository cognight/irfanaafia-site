(function () {
  "use strict";

  var CFG = window.SITE;
  var EVENT = CFG.eventKey || CFG.events[0].id; // which event this page is for: "walima" or "nikkah"
  var $ = function (id) { return document.getElementById(id); };
  var VIEWS = ["loading", "lost", "form", "done", "closed"];
  var OTHER = CFG.otherEvents || {}; // the other event's name, date and address, for families invited to both
  var EMBED = /[?&]embed=1(&|$)/.test(window.location.search); // true when this page is showing on top of the other invitation

  var code = "";        // the household's code from their link, for example rizwan-chacha
  var household = null; // { display, code, people: [{ id, name, ask, coming }], also }
  var replied = false;  // true once this household has answered
  var message = "";     // the note they left for us
  var open = true;      // false once the RSVP deadline has passed
  var draft = [];       // answers while filling in the form: [{ id, coming, name }]

  // ---------- talking to the Google script (or sample data while previewing) ----------

  function api(action, payload) {
    if (!CFG.apiUrl) return demoApi(action, payload);
    var body = JSON.stringify(Object.assign({ action: action, event: EVENT }, payload));
    // No Content-Type header on purpose: it keeps this a "simple" request that Google accepts from any page.
    return fetch(CFG.apiUrl, { method: "POST", body: body }).then(function (r) {
      if (!r.ok) throw new Error("bad status");
      return r.json();
    });
  }

  // Sample guests, only used while apiUrl is empty (preview). An empty name is a guest whose name we do not have yet.
  var DEMO = {
    rahman: { display: "Rahman & Family", people: ["Yusuf Rahman", "Maryam Rahman", "Bilal Rahman", "", ""] },
    siddiqui: { display: "Siddiqui & Family", people: ["Imran Siddiqui", "Sana Siddiqui"] },
    ayesha: { display: "Ayesha Malik", people: ["Ayesha Malik"] },
    chaudhry: { display: "Chaudhry & Family", people: ["Tariq Chaudhry", "Nadia Chaudhry", "Hamid Chaudhry", "Sara Chaudhry", "Omar Chaudhry", "Hina Chaudhry", "Zain Chaudhry", "Noor Chaudhry", "", "", "", ""] }
  };
  var DEADLINE = Date.parse("2026-12-14T05:00:00Z"); // end of Dec 13 in Toronto
  var DEMO_STORE = "demoPeople-" + EVENT;

  function codeKey(c) { return String(c).toLowerCase().replace(/[^a-z0-9]/g, ""); }
  function demoStore() { try { return JSON.parse(localStorage.getItem(DEMO_STORE) || "{}"); } catch (e) { return {}; } }

  function demoApi(action, p) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        var store = demoStore(), key = codeKey(p.code), d = DEMO[key];
        if (!d) { resolve({ ok: false, error: "unknown" }); return; }
        if (action === "submit") {
          store[key] = { people: p.people, message: p.message || "" };
          localStorage.setItem(DEMO_STORE, JSON.stringify(store));
        }
        var s = store[key], by = {};
        (s ? s.people : []).forEach(function (a) { by[a.id] = a; });
        resolve({
          ok: true,
          household: {
            display: d.display, code: key, also: "",
            people: d.people.map(function (n, i) {
              var a = by[i + 1];
              return { id: i + 1, name: n || (a && a.name) || "", ask: !n, coming: a ? a.coming : null };
            })
          },
          replied: !!s, message: s ? s.message : "", open: Date.now() < DEADLINE
        });
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

  // The date, set out the way a printed card does it: month on top, the day large in the
  // middle with the weekday and time either side, the year underneath.
  function dateBox(ev) {
    var p = ev.dateParts, full = ev.dateText + (ev.timeText ? " at " + ev.timeText : "");
    if (!p) return el("p", "when-line", full);
    var box = el("div", "datebox");
    box.setAttribute("role", "img");
    box.setAttribute("aria-label", full);
    box.appendChild(el("p", "db-month", p.month));
    var row = el("div", "db-row");
    row.appendChild(el("span", "db-side", p.weekday));
    row.appendChild(el("span", "db-day", p.day));
    row.appendChild(el("span", "db-side", p.time || p.year));
    box.appendChild(row);
    if (p.time) box.appendChild(el("p", "db-year", p.year));
    return box;
  }

  function eventCard(ev) {
    var card = el("div", "event");
    card.appendChild(el("h3", null, ev.heading || ev.name));
    card.appendChild(dateBox(ev));
    card.appendChild(el("p", "at", "at"));
    var where = el("p", "where", ev.venue);
    if (ev.address) where.appendChild(el("small", null, ev.address));
    card.appendChild(where);

    // the map and calendar buttons appear once those details are filled in (config.js)
    var actions = el("div", "actions");
    if (ev.mapsUrl) {
      var map = el("a", "btn secondary", "Open map");
      map.href = ev.mapsUrl; map.target = "_blank"; map.rel = "noopener";
      actions.appendChild(map);
    }
    if (ev.startUTC) {
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
    }
    if (actions.firstChild) card.appendChild(actions);
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

  // Put the guest's name on the invitation: "Dear Rahman & Family".
  function greet(name) {
    var film = $("film");
    var eyebrow = film && film.querySelector(".eyebrow"), lead = film && film.querySelector(".lead");
    if (!eyebrow || !lead || !name) return;
    var invite = lead.textContent; // "invite you to celebrate our"
    eyebrow.textContent = "Dear " + String(name).replace(/^the\s+/i, "");
    eyebrow.classList.add("is-name");
    film.classList.add("has-name");
    // add "together with our families" as an extra line, unless the name is long
    // enough to need two lines itself (the words must stay clear of the couple)
    lead.textContent = "";
    lead.appendChild(document.createTextNode("together with our families"));
    lead.appendChild(document.createElement("br"));
    lead.appendChild(document.createTextNode(invite));
    function fit() {
      var line = parseFloat(getComputedStyle(eyebrow).lineHeight) || 16;
      if (eyebrow.offsetHeight > line * 1.6) lead.textContent = invite;
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit); else fit();
  }

  // A family invited to both events sees both, side by side, right under the picture.
  function otherLink(embed) {
    var o = OTHER[household.also];
    return o ? o.path + "?i=" + encodeURIComponent(household.code || code) + (embed ? "&embed=1" : "") : "";
  }

  // The other invitation opens on top of this page and plays from its opening.
  // Closing it (the Back pill, the phone's Back, or Esc) returns to this page as it was.
  var overlay = null;
  function openOther(e) {
    var o = OTHER[household.also];
    if (!o) return;
    if (e) e.preventDefault();
    if (overlay) return;
    overlay = el("div", "overlay");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", o.name + " invitation");
    var page = document.createElement("iframe");
    page.src = otherLink(true);
    page.title = o.name + " invitation";
    page.setAttribute("allow", "autoplay");
    overlay.appendChild(page);
    var back = el("button", "overlay-close", "Back to the " + eventById(EVENT).name);
    back.type = "button";
    back.addEventListener("click", closeOther);
    overlay.appendChild(back);
    document.body.appendChild(overlay);
    document.documentElement.classList.add("has-overlay");
    try { history.pushState({ overlay: true }, ""); } catch (err) {}
  }
  function removeOverlay() {
    if (!overlay) return;
    overlay.parentNode.removeChild(overlay);
    overlay = null;
    document.documentElement.classList.remove("has-overlay");
  }
  function closeOther() {
    if (!overlay) return;
    if (history.state && history.state.overlay) history.back(); // the Back handler below removes it
    else removeOverlay();
  }
  window.addEventListener("popstate", removeOverlay);
  window.addEventListener("keydown", function (e) { if (e.key === "Escape") closeOther(); });
  window.addEventListener("message", function (e) {
    if (e.origin === window.location.origin && e.data === "close-invitation") closeOther();
  });

  function showAlso() {
    var o = OTHER[household.also], box = $("both-events"), here = eventById(EVENT);
    if (!o || !box || EMBED) return; // inside the overlay, the Back pill is the way back
    function tile(tag, name, date, note) {
      var t = el(tag, "tile");
      t.appendChild(el("b", null, name));
      t.appendChild(el("span", null, date));
      t.appendChild(el("em", null, note));
      return t;
    }
    var mine = tile("div", here.name, here.shortDate || here.dateText, "This invitation");
    mine.className += " is-here";
    var theirs = tile("a", o.name, o.shortDate || "", "Open invitation");
    theirs.href = otherLink();
    theirs.addEventListener("click", openOther);
    var tiles = box.querySelector(".both-tiles");
    tiles.textContent = "";
    // earliest event first
    if (o.before) { tiles.appendChild(theirs); tiles.appendChild(mine); }
    else { tiles.appendChild(mine); tiles.appendChild(theirs); }
    box.hidden = false;
  }

  function take(r) {
    household = r.household;
    replied = !!r.replied;
    message = r.message || "";
    open = r.open;
  }

  function start() {
    code = (new URLSearchParams(window.location.search).get("i") || "").trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9 _-]{1,39}$/.test(code)) { show("lost"); return; }
    api("get", { code: code }).then(function (r) {
      if (!r.ok) { show("lost"); return; }
      take(r);
      greet(household.display);
      showAlso();
      if (replied) { renderDone(); show("done"); }
      else if (!open) { show("closed"); }
      else { renderForm(); show("form"); }
    }).catch(function () {
      $("view-lost").querySelector("h2").textContent = "We could not reach the server";
      $("view-lost").querySelector("p").textContent = "Please check your internet connection and reload this page.";
      show("lost");
    });
  }

  // ---------- the reply: one tap for the whole family ----------

  var choice = null;  // true = attending, false = not attending, null = not chosen yet
  var custom = false; // true while the family is choosing person by person

  function renderForm() {
    var ev = eventById(EVENT), people = household.people, many = people.length > 1;
    $("form-title").textContent = household.display;
    $("message").value = message;
    showError("form-error");
    var wrap = $("events");
    wrap.textContent = "";
    wrap.appendChild(eventCard(ev));

    var yesCount = people.filter(function (p) { return p.coming === true; }).length;
    var noCount = people.filter(function (p) { return p.coming === false; }).length;
    custom = many && yesCount > 0 && noCount > 0; // they chose person by person last time
    choice = yesCount ? true : (noCount ? false : null);
    draft = people.map(function (p) {
      return { id: p.id, coming: custom ? p.coming !== false : true, name: p.ask ? (p.name || "") : "" };
    });

    wrap.appendChild(el("p", "q", "Will you be joining us?"));
    var answer = el("div", "answer");
    var yes = el("button", "yes", "Attending");
    var no = el("button", "no", "Not attending");
    yes.type = no.type = "button";
    answer.appendChild(yes); answer.appendChild(no);
    wrap.appendChild(answer);

    // a family can also answer person by person, but only if they ask to
    var some = null, list = null, rows = [];
    if (many) {
      some = el("button", "some");
      some.type = "button";
      wrap.appendChild(some);
      list = el("ul", "people");
      people.forEach(function (p, i) {
        var d = draft[i];
        var li = el("li", "person");
        var label = p.name || "Guest " + (i + 1);
        if (p.ask) {
          var who = el("div", "who");
          var input = document.createElement("input");
          input.type = "text";
          input.maxLength = 40;
          input.value = d.name;
          input.placeholder = "Guest's name";
          input.autocomplete = "off";
          input.setAttribute("autocapitalize", "words");
          input.setAttribute("aria-label", "Name of guest " + (i + 1));
          input.addEventListener("input", function () { d.name = input.value; });
          who.appendChild(input);
          li.appendChild(who);
        } else {
          li.appendChild(el("p", "who", p.name));
        }
        var pick = el("div", "pick");
        var a = el("button", "yes", "Coming");
        var b = el("button", "no", "Can't come");
        a.type = b.type = "button";
        a.setAttribute("aria-label", label + ": coming");
        b.setAttribute("aria-label", label + ": can't come");
        function paint() {
          a.setAttribute("aria-pressed", d.coming === true ? "true" : "false");
          b.setAttribute("aria-pressed", d.coming === false ? "true" : "false");
        }
        a.addEventListener("click", function () { d.coming = true; paint(); });
        b.addEventListener("click", function () { d.coming = false; paint(); });
        rows.push(paint);
        paint();
        pick.appendChild(a); pick.appendChild(b);
        li.appendChild(pick);
        list.appendChild(li);
      });
      wrap.appendChild(list);
    }

    function refresh() {
      yes.setAttribute("aria-pressed", choice === true ? "true" : "false");
      no.setAttribute("aria-pressed", choice === false ? "true" : "false");
      if (!many) return;
      some.hidden = choice === false;
      some.textContent = custom ? "All of us are coming" : "Only some of you? Choose who is coming";
      list.hidden = !(custom && choice !== false);
    }
    yes.addEventListener("click", function () { choice = true; refresh(); });
    no.addEventListener("click", function () { choice = false; custom = false; refresh(); });
    if (some) {
      some.addEventListener("click", function () {
        custom = !custom;
        choice = true;
        if (!custom) draft.forEach(function (d) { d.coming = true; });
        rows.forEach(function (f) { f(); });
        refresh();
      });
    }
    refresh();
  }

  $("rsvp-form").addEventListener("submit", function (e) {
    e.preventDefault();
    showError("form-error");
    if (choice === null) { showError("form-error", "Please tap Attending or Not attending."); return; }
    var people = draft.map(function (d) {
      return { id: d.id, coming: choice === false ? false : (custom ? d.coming : true), name: custom ? d.name.trim() : "" };
    });
    var btn = $("send-btn");
    busy(btn, true, "Sending...");
    api("submit", { code: code, people: people, message: $("message").value.trim() }).then(function (r) {
      if (!r.ok) {
        showError("form-error", r.error === "closed"
          ? "Sorry, replies have closed. Please contact Irfan or Aafia directly."
          : "Something went wrong. Please try again.");
        return;
      }
      take(r);
      renderDone();
      show("done");
    }).catch(function () {
      showError("form-error", NETWORK_MSG);
    }).then(function () { busy(btn, false, "Send my reply"); });
  });

  // ---------- thank you ----------

  function renderDone() {
    var ev = eventById(EVENT);
    $("done-title").textContent = household.display;
    var sum = $("done-summary"), extra = $("done-extra");
    sum.textContent = ""; extra.textContent = "";
    sum.className = "summary";

    function names(list) { return list.map(function (p) { return p.name || "Guest"; }).join(", "); }
    var coming = household.people.filter(function (p) { return p.coming === true; });
    var away = household.people.filter(function (p) { return p.coming === false; });

    var line = el("p");
    if (coming.length) {
      line.appendChild(document.createTextNode("We will see you at the " + ev.name + ": "));
      line.appendChild(el("strong", null, coming.length + (coming.length === 1 ? " guest" : " guests")));
      line.appendChild(document.createTextNode("."));
      sum.appendChild(line);
      if (away.length) {
        sum.appendChild(el("p", "who-list", "Coming: " + names(coming)));
        sum.appendChild(el("p", "who-list", "Not able to come: " + names(away)));
      }
      extra.appendChild(eventCard(ev));
    } else {
      line.textContent = "We are sorry you cannot make the " + ev.name + ". You will be missed.";
      sum.appendChild(line);
    }
    if (message) sum.appendChild(el("p", null, "Your message has been passed on to us."));

    // invited to both events: remind them the other one needs its own reply
    var other = OTHER[household.also];
    if (other && EMBED) {
      // shown inside the other invitation: one button to go back to it
      var back = el("button", "btn primary", "Back to the " + other.name + " invitation");
      back.type = "button";
      back.addEventListener("click", function () { window.parent.postMessage("close-invitation", window.location.origin); });
      extra.appendChild(back);
    } else if (other) {
      var next = el("div", "next-event");
      next.appendChild(el("p", null, "One more: you are also invited to our " + other.name + ". Please reply there too."));
      var go = el("a", "btn primary", "Reply for the " + other.name);
      go.href = otherLink();
      go.addEventListener("click", openOther);
      next.appendChild(go);
      extra.appendChild(next);
    }

    $("change-btn").hidden = !open;
    $("done-note").textContent = open
      ? "You can change your answer any time until " + CFG.deadlineText + "."
      : "Replies are now closed. To make a change, please contact Irfan or Aafia directly.";
  }

  $("change-btn").addEventListener("click", function () {
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
  var OPENING_SECONDS = 5.6; // how long the opening scene shows before the invitation
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
    try { localStorage.setItem("filmSeen", "1"); } catch (e) {}
  }

  function startOpening() {
    showingCard = false;
    // put everything back to the start in one go, without the slow glide playing backwards
    frame.classList.add("no-move");
    frame.classList.remove("is-card", "is-through", "is-seen", "is-pushing");
    frame.classList.add("is-opening");
    void frame.offsetWidth;
    frame.classList.remove("no-move");
    (card.pause && card.pause());
    try { opening.currentTime = 0; } catch (e) {}
    play(opening).then(function () {
      if (!showingCard) frame.classList.add("is-pushing"); // the camera starts to glide in
    }).catch(showCard); // phones that will not play video go straight to the invitation
    timers.push(setTimeout(function () { if (opening.currentTime < 0.2) showCard(); }, 4000)); // slow connection
    timers.push(setTimeout(showCard, 12000));
  }

  if (!still) {
    opening.addEventListener("timeupdate", function () {
      if (!showingCard && opening.currentTime >= OPENING_SECONDS) showCard();
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
