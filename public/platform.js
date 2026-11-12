/* THE LAST PLATFORM: draws the rail from the manifest (emergences.js),
   times the carrier pulse, and takes word. */
(function () {
  "use strict";
  var worlds = window.EMERGENCES || [];
  var platform = window.PLATFORM || {};
  var mount = document.getElementById("emergences");

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ---------- a world's mark ---------- */
  function drawMark(m, name) {
    var style = (m && m.style) || "plain";
    var mark = el("span", "mark mark-" + style);
    if (style === "moonline") {
      (m.craters || []).forEach(function (c) {
        var s = el("span", "crater");
        s.style.cssText = "left:" + c.l + "%;top:" + c.t + "%;width:" + c.s +
          "%;padding-bottom:" + c.s + "%;opacity:" + c.o;
        mark.appendChild(s);
      });
      mark.appendChild(el("span", "word-of", m.text));
    } else {
      mark.textContent = (m && m.text) || name;
    }
    return mark;
  }

  /* ---------- the rail ---------- */
  mount.textContent = "";
  worlds.forEach(function (w) {
    var a = el("article", "emergence live");
    a.id = w.id;
    var node = el("span", "node"); node.setAttribute("aria-hidden", "true");
    a.appendChild(node);
    a.appendChild(el("p", "inscription", w.inscription || w.state));

    var h = el("h2");
    h.setAttribute("aria-label", (w.mark && w.mark.text) || w.id);
    h.appendChild(drawMark(w.mark, w.id));
    a.appendChild(h);

    if (w.line) a.appendChild(el("p", "line", w.line));
    if (w.facts && w.facts.length) {
      var ul = el("ul", "facts");
      w.facts.forEach(function (f) { ul.appendChild(el("li", null, f)); });
      a.appendChild(ul);
    }
    if (w.access) {
      var t = el("p", "terms");
      t.appendChild(el("b", null, "Its terms"));
      t.appendChild(document.createTextNode(w.access));
      a.appendChild(t);
    }
    if (w.doors && w.doors.length) {
      var d = el("div", "doors");
      w.doors.forEach(function (door) {
        if (door.href) {
          var link = el("a", "door", door.label + " ›");
          link.href = door.href;
          d.appendChild(link);
        } else {
          var shut = el("span", "door shut", door.label + " ");
          shut.appendChild(el("em", null, "· not yet open"));
          d.appendChild(shut);
        }
      });
      a.appendChild(d);
    }
    mount.appendChild(a);
  });

  /* ---------- the carrier: measure the rail, time the catches ---------- */
  var rail = document.getElementById("rail");
  var pulse = document.getElementById("pulse");
  var codex = document.getElementById("codex");
  codex.classList.add("live");
  var SECONDS_PER_1000PX = 4.6;

  function tune() {
    var h = rail.offsetHeight;
    var dur = Math.max(10, (h / 1000) * SECONDS_PER_1000PX);
    rail.style.setProperty("--carry", dur + "s");
    pulse.style.setProperty("--carry-end", h + "px");
    var top = rail.getBoundingClientRect().top;
    function sync(node) {
      var y = node.getBoundingClientRect().top - top + 40;
      node.style.setProperty("--catch", (-(dur * (1 - Math.min(1, y / h)))).toFixed(2) + "s");
    }
    Array.prototype.forEach.call(rail.querySelectorAll(".emergence"), sync);
    sync(codex);
  }
  tune();
  window.addEventListener("resize", tune);
  window.addEventListener("load", tune);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(tune);

  /* ---------- sending word ---------- */
  var box = document.getElementById("signup");
  if (platform.signup) {
    box.textContent = "";
    var form = el("form", "signup");
    form.action = platform.signup;
    form.method = "POST";
    var field = el("div", "field");
    var label = el("label", null, "Email address");
    label.htmlFor = "word-email";
    var input = el("input");
    input.type = "email"; input.name = "email"; input.id = "word-email";
    input.required = true; input.autocomplete = "email";
    field.appendChild(label); field.appendChild(input);
    var trap = el("input", "trap");
    trap.type = "text"; trap.name = "_gotcha"; trap.tabIndex = -1;
    trap.setAttribute("aria-hidden", "true"); trap.autocomplete = "off";
    var button = el("button", null, "Send word");
    button.type = "submit";
    form.appendChild(field); form.appendChild(trap); form.appendChild(button);
    var said = el("p", "said");
    said.setAttribute("role", "status");
    box.appendChild(form); box.appendChild(said);

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      button.disabled = true;
      said.textContent = "Sending.";
      fetch(platform.signup, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form)
      }).then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        form.hidden = true;
        said.textContent = "Word sent. You will hear when a world emerges.";
      }).catch(function () {
        button.disabled = false;
        said.textContent = "That did not go through. Check the address and send it again.";
      });
    });
  }
})();
