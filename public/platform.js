/* THE LAST PLATFORM: builds the drum of chambers from the manifest (emergences.js),
   runs the drum (turning, waking, entering), and holds the locations people drop.
   chambers3d.js draws the chambers in three dimensions; without WebGL the flat ones here are used.

   thelastplatform.com/?specimen places two test worlds in the chambers, to see how
   a world sits, wakes and engulfs. They are never shown without that flag. */
(function () {
  "use strict";
  var platform = window.PLATFORM || {};
  var worlds = (window.EMERGENCES || []).slice();
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hoverable = window.matchMedia("(hover: hover)").matches;

  if (/[?&]specimen\b/.test(location.search)) {
    worlds = [
      { id: "specimen-one", name: "Specimen One", inscription: "test world",
        line: "A test world. It exists to show how a world sits in a chamber, wakes, and takes the screen.",
        terms: "Its own terms would be written here.",
        doors: [{ label: "Its door", href: "" }],
        feel: { liquid: ["#F2C14E", "#7A2E0E"], glow: "#FFB23E", ink: "#1A0E05", ground: "#E9A93A" } },
      { id: "specimen-two", name: "Specimen Two", inscription: "test world",
        line: "A second test world with a different feeling, to show that each one brings its own.",
        terms: "Its own terms would be written here.",
        doors: [{ label: "Its door", href: "" }],
        feel: { liquid: ["#7FE3D0", "#06302F"], glow: "#4FD8C4", ink: "#E6FFFA", ground: "#052422" } },
      { id: "specimen-three", name: "Specimen Three", state: "forming",
        feel: { liquid: ["#C9A0F2", "#1E0B33"], glow: "#B98CF0" } }
    ];
  }

  var VACANT = { liquid: ["#34363B", "#0A0A0B"], glow: "#8A8E96" };
  /* the drum holds what has just emerged or is forming; worlds that have settled stand on the shelves below */
  var all = worlds;
  worlds = all.filter(function (w) { return !w || !w.shelf; });
  var N = Math.max(6, worlds.filter(Boolean).length + 1);    /* six chambers, always at least one vacant */
  var STEP = 360 / N;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function rgb(hex) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var v = parseInt(h, 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }
  function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function hex(c) { return "#" + c.map(function (v) { v = Math.round(v).toString(16); return v.length < 2 ? "0" + v : v; }).join(""); }
  function toward(a, b, k) { a = rgb(a); b = rgb(b); return hex([0, 1, 2].map(function (i) { return a[i] + (b[i] - a[i]) * k; })); }
  /* something forming has not taken its own feeling yet: only a trace of it shows in the grey */
  function unformed(f) {
    if (!f || !f.liquid) return { liquid: ["#5A5D64", "#0B0B0C"], glow: "#C8CCD2" };
    return { liquid: [toward(f.liquid[0], VACANT.liquid[0], 0.55), toward(f.liquid[1], VACANT.liquid[1], 0.7)],
      glow: toward(f.glow || f.liquid[0], "#C8CCD2", 0.45) };
  }

  /* ---------- build the chambers ---------- */
  var ring = document.getElementById("ring");
  var drum = document.getElementById("drum");
  var chambers = [];
  function chamber(entry, parent) {
    var forming = entry && entry.state === "forming" ? entry : null;
    var w = forming ? null : entry;
    var c = el("div", "chamber" + (w ? " holds" : "") + (forming ? " forming" : "") + (entry && entry.form === "tank" ? " tank" : ""));
    var top = el("div", "cap top"); top.appendChild(el("i")); top.appendChild(el("u", null, entry && entry.no ? pad(entry.no) : ""));
    var base = el("div", "cap base"); base.appendChild(el("i"));
    var tube = el("div", "tube");
    var cv = el("canvas");
    tube.appendChild(cv);
    if (entry) tube.appendChild(el("span", "emerging", entry.name));
    c.appendChild(tube); c.appendChild(top); c.appendChild(base);
    parent.appendChild(c);
    var feel = (w && w.feel) || (forming ? unformed(forming.feel) : VACANT);
    var bubbles = [];
    for (var b = 0; b < 26; b++) {
      bubbles.push({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 2.6,
        v: 0.03 + Math.random() * 0.09, ph: Math.random() * 6.28 });
    }
    return { el: c, cv: cv, ctx: cv.getContext("2d"), world: w, forming: forming, e: 0.2, feel: feel,
      no: entry && entry.no, form: entry && entry.form,
      a: rgb(feel.liquid[0]), b: rgb(feel.liquid[1]), g: rgb(feel.glow || feel.liquid[0]), bubbles: bubbles };
  }
  for (var i = 0; i < N; i++) chambers.push(chamber(worlds[i] || null, drum));

  /* ---------- the shelves ---------- */
  var shelves = [];
  var shelfHome = document.getElementById("shelves");
  (platform.shelves || []).forEach(function (def) {
    var held = all.filter(function (w) { return w && w.shelf === def.id; });
    if (!held.length) return;
    var sec = el("section", "shelf"); sec.setAttribute("aria-label", def.label || "Shelf");
    var stand = el("div", "stand"); stand.setAttribute("aria-hidden", "true");
    var plaque = el("div", "plaque");
    var sh = { def: def, el: sec, host: stand, bays: [], gl: null, hover: -1, inview: false, energy: [], awake: [] };
    held.forEach(function (w) {
      var b = chamber(w, stand);
      sh.bays.push(b);
      var cap = el("button", "bay-cap"); cap.type = "button";
      cap.appendChild(el("span", "bay-no", w.no ? pad(w.no) : ""));
      cap.appendChild(el("span", "bay-name", w.name));
      cap.setAttribute("aria-label", "Enter " + w.name);
      cap.addEventListener("click", function () { enterCh(b, rectOf(sh, sh.bays.indexOf(b))); });
      plaque.appendChild(cap);
    });
    sec.appendChild(stand);
    if (def.label) sec.appendChild(el("p", "shelf-label", def.label));
    sec.appendChild(plaque);
    shelfHome.appendChild(sec);
    sh.attach = function (r) { sh.gl = r; stand.classList.add("gl"); r.size(); };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { sh.inview = es[0].intersectionRatio > 0.55; sh.onscreen = es[0].isIntersecting; },
        { threshold: [0, 0.55, 0.6] }).observe(stand);
    } else { sh.inview = sh.onscreen = true; }
    function at(ev) {
      var r = stand.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top, rs = regionsOf(sh);
      for (var k = 0; k < rs.length; k++) if (x >= rs[k].left && x <= rs[k].right && y >= rs[k].top - 20 && y <= rs[k].bottom) return k;
      return -1;
    }
    stand.addEventListener("pointermove", function (ev) { if (ev.pointerType === "mouse") sh.hover = at(ev); });
    stand.addEventListener("pointerleave", function () { sh.hover = -1; });
    stand.addEventListener("click", function (ev) { var k = at(ev); if (k >= 0) enterCh(sh.bays[k], rectOf(sh, k)); });
    shelves.push(sh);
  });
  function regionsOf(sh) {
    if (sh.gl) return sh.gl.regions();
    var r0 = sh.host.getBoundingClientRect();
    return sh.bays.map(function (b) { var r = b.el.getBoundingClientRect();
      return { left: r.left - r0.left, right: r.right - r0.left, top: r.top - r0.top, bottom: r.bottom - r0.top }; });
  }
  function rectOf(sh, k) {
    var r0 = sh.host.getBoundingClientRect(), g = regionsOf(sh)[k];
    return { left: r0.left + g.left, top: r0.top + g.top, width: g.right - g.left, height: g.bottom - g.top };
  }

  var R = 0, gl = null;
  function unit() { return gl ? ring.clientHeight * 0.44 : drum.offsetWidth * 1.95; }
  function halfTube() { return gl ? ring.clientHeight * 0.15 : drum.offsetWidth * 0.62; }
  function measure() {
    var cw = drum.offsetWidth;
    R = Math.round((cw * 1.95) / (2 * Math.tan(Math.PI / N)));
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    shelves.forEach(function (sh) { sh.bays.forEach(function (ch) {
      var r = ch.cv.parentNode; ch.w = r.clientWidth; ch.h = r.clientHeight;
      ch.cv.width = Math.round(ch.w * dpr); ch.cv.height = Math.round(ch.h * dpr); ch.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }); });
    chambers.forEach(function (ch, idx) {
      var r = ch.cv.parentNode;
      ch.w = r.clientWidth; ch.h = r.clientHeight;
      ch.cv.width = Math.round(ch.w * dpr); ch.cv.height = Math.round(ch.h * dpr);
      ch.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ch.el.style.transform = "rotateY(" + idx * STEP + "deg) translateZ(" + R + "px)";
    });
  }

  /* ---------- what is inside a chamber ---------- */
  function draw(ch, t, dt) {
    var x = ch.ctx, w = ch.w, h = ch.h, e = ch.e;
    var breath = 0.5 + 0.5 * Math.sin(t * 0.7 + ch.bubbles[0].ph);
    x.clearRect(0, 0, w, h);
    var lift = 0.16 + e * 0.5 + breath * 0.08 * (0.4 + e);
    var g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, rgba(ch.a, lift * 0.75));
    g.addColorStop(1, rgba(ch.b, 0.9));
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    var cy = h * (0.52 + 0.03 * Math.sin(t * 0.4));
    var rg = x.createRadialGradient(w / 2, cy, 0, w / 2, cy, h * 0.55);
    rg.addColorStop(0, rgba(ch.g, 0.08 + e * 0.5 + breath * 0.06));
    rg.addColorStop(1, rgba(ch.g, 0));
    x.fillStyle = rg; x.fillRect(0, 0, w, h);
    if (ch.forming) {                      /* something gathering at the core */
      var beat = 0.5 + 0.5 * Math.sin(t * 1.15 + ch.bubbles[1].ph);
      var ny = h * 0.56, nr = h * (0.1 + 0.05 * beat);
      var ng = x.createRadialGradient(w / 2, ny, 0, w / 2, ny, nr * 2.2);
      ng.addColorStop(0, rgba(ch.g, 0.34 + 0.3 * beat)); ng.addColorStop(0.4, rgba(ch.g, 0.1 + 0.1 * beat)); ng.addColorStop(1, rgba(ch.g, 0));
      x.fillStyle = ng; x.fillRect(0, 0, w, h);
    }
    /* the surface of the liquid */
    var sy = h * 0.07 + Math.sin(t * 1.3) * 1.5;
    x.fillStyle = "rgba(0,0,0,.72)";
    x.beginPath(); x.moveTo(0, 0); x.lineTo(w, 0); x.lineTo(w, sy);
    x.quadraticCurveTo(w / 2, sy + 5 + Math.sin(t * 1.9) * 2, 0, sy); x.closePath(); x.fill();
    /* bubbles */
    var live = Math.round(5 + e * 21);
    for (var i = 0; i < live; i++) {
      var b = ch.bubbles[i];
      b.y -= b.v * dt * (0.35 + e * 1.5);
      if (b.y < 0.07) { b.y = 1.03; b.x = 0.12 + Math.random() * 0.76; }
      var bx = (b.x + Math.sin(t * 1.6 + b.ph) * 0.03) * w, by = b.y * h;
      x.beginPath(); x.arc(bx, by, b.r, 0, 6.283);
      x.strokeStyle = "rgba(255,255,255," + (0.1 + e * 0.38) + ")"; x.lineWidth = 0.8; x.stroke();
      x.fillStyle = "rgba(255,255,255," + (0.02 + e * 0.07) + ")"; x.fill();
    }
  }

  /* ---------- turning the drum ---------- */
  var rot = 0, target = 0, dragging = false, hovering = false, entered = false;
  var readout = document.getElementById("readout");
  var shown = -1;
  function mod(n) { return ((n % N) + N) % N; }
  function front() { return mod(Math.round(target)); }

  function showReadout() {
    var idx = front();
    if (idx === shown) return;
    shown = idx;
    var w = chambers[idx].world, fm = chambers[idx].forming;
    readout.textContent = "";
    var no = chambers[idx].no;
    readout.appendChild(el("p", "r-num", (no ? pad(no) : "—") + (w && w.inscription ? " · " + w.inscription : "")));
    if (fm) {
      readout.appendChild(el("p", "r-name forming", fm.name));
      readout.appendChild(el("p", "r-state", "Forming"));
      readout.appendChild(el("p", "r-line", fm.line || "Not yet a world. It cannot be entered."));
    } else if (w) {
      readout.appendChild(el("p", "r-name", w.name));
      var btn = el("button", "r-enter", "Enter");
      btn.type = "button";
      btn.setAttribute("aria-label", "Enter " + w.name);
      btn.addEventListener("click", function () { enter(idx); });
      readout.appendChild(btn);
    } else {
      readout.appendChild(el("p", "r-name vacant", "Vacant"));
      readout.appendChild(el("p", "r-line", worlds.filter(Boolean).length ? "Waiting for what emerges next." : "The conditions are set. Nothing has emerged yet."));
    }
  }
  function turn(by) { target = Math.round(target) + by; showReadout(); }
  document.getElementById("prev").addEventListener("click", function () { turn(-1); });
  document.getElementById("next").addEventListener("click", function () { turn(1); });
  window.addEventListener("keydown", function (ev) {
    if (entered) { if (ev.key === "Escape") leave(); return; }
    if (ev.target && /INPUT|TEXTAREA/.test(ev.target.tagName)) return;
    if (ev.key === "ArrowRight") turn(1);
    if (ev.key === "ArrowLeft") turn(-1);
  });

  var sx = 0, sr = 0, moved = 0;
  ring.addEventListener("pointerdown", function (ev) {
    if (ev.pointerType === "mouse" && ev.button !== 0) return;
    dragging = true; moved = 0; sx = ev.clientX; sr = rot;
    ring.classList.add("dragging");
  });
  window.addEventListener("pointermove", function (ev) {
    if (!dragging) return;
    var dx = ev.clientX - sx;
    moved = Math.max(moved, Math.abs(dx));
    rot = sr - dx / unit();
    target = rot;
  });
  function release(ev) {
    if (!dragging) return;
    dragging = false; ring.classList.remove("dragging");
    target = Math.round(rot); showReadout();
    if (moved < 8 && ev && ev.type === "pointerup") tap(ev);
  }
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);

  function tap(ev) {
    var mid = ring.getBoundingClientRect(); var cx = mid.left + mid.width / 2;
    var off = (ev.clientX - cx) / (halfTube() * 2);
    if (Math.abs(off) > 0.5) { turn(off > 0 ? 1 : -1); return; }
    if (chambers[front()].world) enter(front());
  }
  ring.addEventListener("pointermove", function (ev) {
    if (ev.pointerType !== "mouse") return;
    var mid = ring.getBoundingClientRect(); var cx = mid.left + mid.width / 2;
    hovering = Math.abs(ev.clientX - cx) < halfTube();
  });
  ring.addEventListener("pointerleave", function () { hovering = false; });

  /* ---------- the loop ---------- */
  var last = 0, energy = [], awakeNow = [], near = [];
  function frame(now) {
    var t = now / 1000, dt = Math.min(0.05, t - last); last = t;
    if (!dragging) rot += (target - rot) * (reduce ? 1 : 1 - Math.exp(-dt * 7));
    var settled = Math.abs(target - rot) < 0.08 && !dragging;
    var f = front();
    var onscreen = !document.hidden && ring.getBoundingClientRect().bottom > 0;
    if (!gl) drum.style.transform = "translateZ(" + -R + "px) rotateY(" + -rot * STEP + "deg)";
    for (var i = 0; i < N; i++) {
      var ch = chambers[i];
      var d = Math.abs(mod(i - rot + N / 2) - N / 2);
      var vis = d < 1.75;
      var awake = !!ch.world && i === f && settled && (hovering || !hoverable || entered === ch);
      if (awake !== ch.awake) { ch.awake = awake; ch.el.classList.toggle("awake", awake); }
      var stir = !!ch.forming && i === f && settled && (hovering || !hoverable);
      var want = ch.world ? (awake ? 1 : 0.42) : ch.forming ? (stir ? 0.47 : 0.33) : 0.14;
      ch.e += (want - ch.e) * (1 - Math.exp(-dt * 2.6));
      energy[i] = ch.e; awakeNow[i] = awake; near[i] = vis;
      if (gl) continue;
      ch.el.style.opacity = vis ? Math.max(0, 1 - d * 0.5).toFixed(3) : 0;
      ch.el.style.visibility = vis ? "visible" : "hidden";
      if (vis && !entered) draw(ch, t, reduce ? 0 : dt * 10);
    }
    shelves.forEach(function (sh) {
      for (var k = 0; k < sh.bays.length; k++) {
        var b = sh.bays[k];
        var aw = !!b.world && (hoverable ? sh.hover === k : sh.inview) || (entered && entered === b);
        if (aw !== b.awake) { b.awake = aw; b.el.classList.toggle("awake", aw); }
        b.e += ((aw ? 1 : 0.42) - b.e) * (1 - Math.exp(-dt * 2.6));
        sh.energy[k] = b.e; sh.awake[k] = aw;
        if (!sh.gl && sh.onscreen && !entered) draw(b, t, reduce ? 0 : dt * 10);
      }
      if (sh.gl && sh.onscreen && !document.hidden && !(entered && worldEl.classList.contains("settled")))
        sh.gl.render({ dt: reduce ? 0 : dt, energy: sh.energy, awake: sh.awake });
    });
    if (gl && onscreen && !(entered && worldEl.classList.contains("settled"))) {
      gl.render({ dt: reduce ? 0 : dt, rot: rot, energy: energy, awake: awakeNow, near: near });
    }
    requestAnimationFrame(frame);
  }

  /* the three-dimensional chambers (chambers3d.js) attach here when WebGL is there */
  window.LP = {
    ring: ring, count: N, chambers: chambers, shelves: shelves,
    bleed: function () { return parseFloat(getComputedStyle(ring).marginLeft) * -1 || 0; },
    attach: function (r) { gl = r; ring.classList.add("gl"); r.size(); }
  };

  /* ---------- entering a world: it takes the whole screen ---------- */
  var worldEl = document.getElementById("world");
  var lastFocus = null;
  function enter(idx) { enterCh(chambers[idx], chambers[idx].el.getBoundingClientRect()); }
  function enterCh(ch, r) {
    var w = ch.world;
    if (!w || entered) return;
    var f = w.feel || {};
    worldEl.style.setProperty("--ox", (r.left + r.width / 2) + "px");
    worldEl.style.setProperty("--oy", (r.top + r.height / 2) + "px");
    worldEl.style.setProperty("--w-ground", f.ground || (f.liquid && f.liquid[1]) || "#111");
    worldEl.style.setProperty("--w-ink", f.ink || "#fff");
    worldEl.style.setProperty("--w-glow", f.glow || "transparent");
    document.getElementById("world-insc").textContent = w.inscription || "";
    document.getElementById("world-name").textContent = w.name;
    document.getElementById("world-line").textContent = w.line || "";
    document.getElementById("world-terms").textContent = w.terms || "";
    var doors = document.getElementById("world-doors");
    doors.textContent = "";
    (w.doors || []).forEach(function (d) {
      var n;
      if (d.href) { n = el("a", "w-door", d.label); n.href = d.href; }
      else { n = el("span", "w-door shut", d.label + " · not yet open"); }
      doors.appendChild(n);
    });
    lastFocus = document.activeElement;
    worldEl.hidden = false;
    entered = ch;
    void worldEl.offsetWidth;
    worldEl.classList.add("open");
    setTimeout(function () { if (entered) worldEl.classList.add("settled"); }, 1000);
    document.body.style.overflow = "hidden";
    document.getElementById("world-back").focus({ preventScroll: true });
    try { history.replaceState(null, "", "#" + w.id); } catch (e) {}
  }
  function leave() {
    if (!entered) return;
    worldEl.classList.remove("open"); worldEl.classList.remove("settled");
    entered = false;
    document.body.style.overflow = "";
    setTimeout(function () { if (!entered) worldEl.hidden = true; }, reduce ? 0 : 950);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
  }
  document.getElementById("world-back").addEventListener("click", leave);

  /* ---------- switching on ---------- */
  var boot = document.getElementById("boot");
  function ready() {
    boot.classList.add("done");
    var id = (location.hash || "").slice(1);
    if (!id) return;
    worlds.forEach(function (w, idx) { if (w && w.id === id && !w.state) { target = rot = idx; shown = -1; showReadout(); enter(idx); } });
    shelves.forEach(function (sh) { sh.bays.forEach(function (b, k) { if (b.world && b.world.id === id) {
      sh.el.scrollIntoView({ block: "center" }); setTimeout(function () { enterCh(b, rectOf(sh, k)); }, 60); } }); });
  }
  var seen = false;
  try { seen = sessionStorage.getItem("lp.on") === "1"; sessionStorage.setItem("lp.on", "1"); } catch (e) {}
  if (seen || reduce || /[?&]noboot\b/.test(location.search)) {
    boot.style.transition = "none"; ready();
  } else {
    /* the full arrival: Loading (its ellipsis moving), then who this is, then Welcome back, then in */
    var dots = boot.querySelector(".dots"), timers = [];
    var b1 = boot.querySelector(".b1"), b2 = boot.querySelector(".b2"), b3 = boot.querySelector(".b3");
    function at(ms, fn) { timers.push(setTimeout(fn, ms)); }
    at(150, function () { b1.classList.add("on"); });
    [[400, "."], [750, ".."], [1100, "..."], [1450, ""], [1650, "."], [1950, ".."], [2250, "..."]].forEach(function (bt) {
      at(bt[0], function () { dots.textContent = bt[1]; });
    });
    at(2600, function () { b1.classList.remove("on"); });
    at(2700, function () { b2.classList.add("on"); });
    at(7300, function () { b3.classList.add("on"); });
    at(9800, ready);
    boot.addEventListener("click", function () { timers.forEach(clearTimeout); ready(); });
  }

  measure(); showReadout();
  window.addEventListener("resize", measure);
  requestAnimationFrame(frame);

  /* ---------- sending word ---------- */
  var box = document.getElementById("signup");
  if (platform.signup) {
    box.textContent = "";
    var form = el("form", "signup");
    form.action = platform.signup; form.method = "POST";
    var field = el("div", "field");
    var label = el("label", null, "Where you can be reached"); label.htmlFor = "word-email";
    var input = el("input"); input.type = "email"; input.name = "email"; input.id = "word-email";
    input.required = true; input.autocomplete = "email";
    field.appendChild(label); field.appendChild(input);
    var trap = el("input", "trap"); trap.type = "text"; trap.name = "_gotcha"; trap.tabIndex = -1;
    trap.setAttribute("aria-hidden", "true"); trap.autocomplete = "off";
    var button = el("button", null, "INSERT"); button.type = "submit";
    form.appendChild(field); form.appendChild(trap); form.appendChild(button);
    var said = el("p", "said"); said.setAttribute("role", "status");
    box.appendChild(form); box.appendChild(said);
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      button.disabled = true; said.textContent = "Inserting.";
      fetch(platform.signup, { method: "POST", headers: { Accept: "application/json" }, body: new FormData(form) })
        .then(function (r) {
          if (!r.ok) throw new Error(String(r.status));
          form.hidden = true;
          said.textContent = "Held. If a chamber fills, word may reach you there.";
        })
        .catch(function () {
          button.disabled = false;
          said.textContent = "That did not land. Check the address and insert it again.";
        });
    });
  }
})();
