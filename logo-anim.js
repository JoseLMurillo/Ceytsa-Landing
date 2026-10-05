/* logo-anim.js — Animación del logo CE&T: ramificación desde la C.
   Uso automático: cualquier elemento con el atributo data-logo-anim.
   Uso manual:     const a = new LogoAnim(el, { speed: 1.5 }); a.update({ color:'#0af' }); a.play(); a.stop(); */
(function () {
  "use strict";

  var DEFAULTS = {
    speed: 1, // 0.25 a 3 (multiplicador)
    repeat: 1, // 1, 2, 3... o 0 / 'infinite' para infinitas
    hold: 1.5, // pausa entre ciclos (segundos)
    bounce: true, // círculos con rebote
    color: "#7ccbec", // color del logo
    shadow: true, // sombra del logo
    shadowColor: "#000",
    textColor: "#111", // color del texto E&T S.A.S
    bg: "#f3ffff", // fondo de la tarjeta ('transparent' para quitarlo)
    thickness: 14, // grosor de las ramas
    showText: false,
    final: "./img/logo_sin_letra_baja.png", // logo original al terminar ('' o 'none' para desactivar)
  };

  // [id, x, y, radio, padre]
  var NODES = [
    ["a", 195, 125, 36, "c"],
    ["t", 225, 45, 50, "a"],
    ["l", 92, 132, 38, "a"],
    ["u", 415, 135, 36, "c"],
    ["b", 180, 230, 38, "c"],
    ["b1", 212, 276, 12, "b"],
    ["b2", 106, 270, 25, "b"],
    ["b3", 45, 235, 22, "b2"],
    ["r", 343, 278, 28, "c"],
    ["r1", 320, 317, 10, "r"],
    ["r2", 407, 308, 14, "r"],
  ].map(function (n) {
    return { id: n[0], x: n[1], y: n[2], r: n[3], p: n[4] };
  });

  var C = { x: 280, y: 212 };
  var NS = "http://www.w3.org/2000/svg";
  var uid = 0;

  var num = function (v, d) {
    return v == null || v === "" || isNaN(+v) ? d : +v;
  };
  var bool = function (v, d) {
    return v == null ? d : !(v === "false" || v === "0");
  };
  var mk = function (cls, attrs, parent) {
    var e = document.createElementNS(NS, attrs.tag || "path");
    delete attrs.tag;
    attrs["class"] = cls;
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  };

  function LogoAnim(el, opts) {
    var d = el.dataset;
    this.el = el;
    this.o = Object.assign(
      {},
      DEFAULTS,
      {
        speed: num(d.speed, DEFAULTS.speed),
        repeat:
          d.repeat == null
            ? DEFAULTS.repeat
            : d.repeat === "infinite"
              ? 0
              : num(d.repeat, 1),
        hold: num(d.hold, DEFAULTS.hold),
        bounce: bool(d.bounce, DEFAULTS.bounce),
        color: d.color || DEFAULTS.color,
        shadow: bool(d.shadow, DEFAULTS.shadow),
        shadowColor: d.shadowColor || DEFAULTS.shadowColor,
        textColor: d.textColor || DEFAULTS.textColor,
        bg: d.bg || DEFAULTS.bg,
        thickness: num(d.thickness, DEFAULTS.thickness),
        showText: bool(d.showText, DEFAULTS.showText),
        final: d.final == null ? DEFAULTS.final : d.final,
      },
      opts,
    );
    this.reduced =
      window.matchMedia &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.anims = [];
    this.token = 0;
    this.finalOk = false;
    this.build();
    this.applyStyle();
    this.play();
  }

  LogoAnim.prototype.build = function () {
    var id = ++uid,
      el = this.el;
    this.id = id;
    el.classList.add("logo-anim", "la-pending");
    el.innerHTML =
      '<svg class="la-svg" viewBox="-10 -10 680 350" focusable="false" aria-hidden="true">' +
      '<defs><filter id="la-sh-' +
      id +
      '" x="-20%" y="-20%" width="140%" height="140%">' +
      '<feDropShadow dx="-5" dy="5" stdDeviation="0" style="flood-color:var(--la-shadow)"/></filter></defs>' +
      '<g class="la-all"><g class="la-edges"></g><g class="la-nodes"></g>' +
      '<g class="la-cg">' +
      '<path class="la-carc" pathLength="1" stroke-dasharray="1 2" d="M318.1 190A44 44 0 1 0 318.1 234"/>' +
      '<path class="la-ctail" pathLength="1" stroke-dasharray="1 2" d="M283 212H314"/>' +
      '<circle class="la-cdot" cx="283" cy="212" r="17"/></g>' +
      '<g class="la-txt">' +
      '<text class="la-t" x="350" y="240" font-size="112" textLength="152" lengthAdjust="spacingAndGlyphs">E&amp;T</text>' +
      '<text class="la-t" x="515" y="240" font-size="46" textLength="124" lengthAdjust="spacingAndGlyphs">S.A.S</text>' +
      "</g></g>" +
      '<image class="la-orig" x="2" y="0" width="638" height="359.2" preserveAspectRatio="none" opacity="0"/>' +
      "</svg>";

    var q = (this.q = function (s) {
      return el.querySelector(s);
    });
    var P = { c: { x: C.x, y: C.y, r: 46 } };
    NODES.forEach(function (n) {
      P[n.id] = n;
    });
    NODES.forEach(function (n) {
      var p = P[n.p],
        dx = n.x - p.x,
        dy = n.y - p.y,
        len = Math.hypot(dx, dy),
        off = n.p === "c" ? 46 : p.r * 0.7;
      n.len = len;
      n.edge = mk(
        "la-e",
        {
          pathLength: 1,
          "stroke-dasharray": "1 2",
          d:
            "M" +
            (p.x + (dx / len) * off) +
            " " +
            (p.y + (dy / len) * off) +
            "L" +
            n.x +
            " " +
            n.y,
        },
        q(".la-edges"),
      );
      n.el = mk(
        "la-n",
        { tag: "circle", cx: n.x, cy: n.y, r: n.r },
        q(".la-nodes"),
      );
      n.el.style.transformOrigin = n.x + "px " + n.y + "px";
    });
    // Los nodos viven en el módulo; cada instancia guarda sus propias referencias
    this.nodes = NODES.map(function (n) {
      return { id: n.id, p: n.p, len: n.len, edge: n.edge, el: n.el };
    });
    q(".la-carc").style.transformOrigin = C.x + "px " + C.y + "px";
    q(".la-cdot").style.transformOrigin = "283px 212px";

    // Precarga del logo original (si falla, la animación simplemente termina en el dibujo)
    var self = this,
      src = this.o.final;
    this.ready =
      src && src !== "none"
        ? new Promise(function (res) {
            var im = new Image();
            im.onload = function () {
              self.finalOk = true;
              q(".la-orig").setAttribute("href", src);
              res();
            };
            im.onerror = res;
            im.src = src;
            setTimeout(res, 2500);
          })
        : Promise.resolve();
  };

  LogoAnim.prototype.applyStyle = function () {
    var o = this.o,
      s = this.el.style;
    s.setProperty("--la-color", o.color);
    s.setProperty("--la-text", o.textColor);
    s.setProperty("--la-bg", o.bg);
    s.setProperty("--la-shadow", o.shadowColor);
    s.setProperty("--la-ew", o.thickness);
    this.q(".la-all").setAttribute(
      "filter",
      o.shadow ? "url(#la-sh-" + this.id + ")" : "none",
    );
    this.q(".la-txt").style.display = o.showText ? "" : "none";
  };

  LogoAnim.prototype.schedule = function () {
    var o = this.o,
      q = this.q,
      self = this;
    var k = this.reduced ? 0.001 : 1 / Math.max(0.1, o.speed);
    this.anims.forEach(function (a) {
      a.cancel();
    });
    this.anims = [];
    var A = function (el, kf, op) {
      var a = el.animate(kf, Object.assign({ fill: "both" }, op));
      self.anims.push(a);
      return a;
    };
    var nodeEase = o.bounce
      ? "cubic-bezier(.3,1.6,.5,1)"
      : "cubic-bezier(.2,.8,.3,1)";
    var dash = [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }];
    var pop = [{ transform: "scale(0)" }, { transform: "scale(1)" }];

    // 1) La C se dibuja girando desde el centro
    var cd = 750 * k;
    A(q(".la-carc"), dash, { duration: cd, easing: "ease-in-out" });
    A(
      q(".la-carc"),
      [{ transform: "rotate(-140deg)" }, { transform: "rotate(0deg)" }],
      { duration: cd, easing: "cubic-bezier(.2,.7,.3,1)" },
    );
    A(q(".la-cdot"), pop, {
      duration: 420 * k,
      delay: cd * 0.45,
      easing: nodeEase,
    });
    A(q(".la-ctail"), dash, {
      duration: 260 * k,
      delay: cd * 0.45 + 300 * k,
      easing: "ease-out",
    });

    // 2) Ramificación: cada rama crece desde su padre y al llegar nace el círculo
    var t0 = { c: cd * 0.6 },
      cnt = {},
      end = cd + 300 * k;
    this.nodes.forEach(function (n) {
      var i = (cnt[n.p] = (cnt[n.p] == null ? -1 : cnt[n.p]) + 1);
      var s = t0[n.p] + i * 90 * k,
        ed = (240 + n.len * 2.4) * k,
        nd = 430 * k;
      A(n.edge, dash, {
        duration: ed,
        delay: s,
        easing: "cubic-bezier(.4,0,.2,1)",
      });
      A(n.el, pop, { duration: nd, delay: s + ed * 0.8, easing: nodeEase });
      t0[n.id] = s + ed * 0.8 + nd * 0.45;
      end = Math.max(end, s + ed * 0.8 + nd);
    });

    // 3) El texto aparece al final
    var fin = end;
    if (o.showText) {
      var ts = end * 0.72;
      A(
        q(".la-txt"),
        [
          { opacity: 0, transform: "translateX(-26px)" },
          { opacity: 1, transform: "translateX(0)" },
        ],
        { duration: 650 * k, delay: ts, easing: "ease-out" },
      );
      fin = Math.max(end, ts + 650 * k);
    }

    // 4) Al terminar, el dibujo se funde con el logo original
    if (this.finalOk) {
      var op = {
        duration: 600 * k,
        delay: fin + 250 * k,
        easing: "ease-in-out",
      };
      A(q(".la-orig"), [{ opacity: 0 }, { opacity: 1 }], op);
      A(q(".la-all"), [{ opacity: 1 }, { opacity: 0 }], op);
    }
  };

  LogoAnim.prototype.play = async function () {
    var my = ++this.token,
      o = this.o;
    await this.ready;
    if (my !== this.token) return;
    var reps = o.repeat === "infinite" ? 0 : +o.repeat,
      i = 0;
    if (this.reduced) reps = 1;
    while (my === this.token) {
      this.schedule();
      this.el.classList.remove("la-pending");
      try {
        await Promise.all(
          this.anims.map(function (a) {
            return a.finished;
          }),
        );
      } catch (e) {
        return;
      }
      if (my !== this.token) return;
      i++;
      if (reps !== 0 && i >= reps) return;
      await new Promise(function (r) {
        setTimeout(r, o.hold * 1000);
      });
    }
  };

  LogoAnim.prototype.stop = function () {
    this.token++;
    this.anims.forEach(function (a) {
      a.cancel();
    });
    this.el.classList.remove("la-pending");
  };

  LogoAnim.prototype.update = function (opts) {
    Object.assign(this.o, opts || {});
    this.applyStyle();
    this.play();
  };

  window.LogoAnim = LogoAnim;

  var init = function () {
    document.querySelectorAll("[data-logo-anim]").forEach(function (el) {
      if (!el._logoAnim) el._logoAnim = new LogoAnim(el);
    });
  };
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();



document.addEventListener('DOMContentLoaded', () => {
  const hero = document.querySelector('.hero');

  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const mouseX = (x - centerX) / centerX;
    const mouseY = (y - centerY) / centerY;
    
    hero.style.setProperty('--mouse-x', mouseX);
    hero.style.setProperty('--mouse-y', mouseY);
  });
  
  // ¡Se eliminó el hero.addEventListener('mouseleave', ...) para que se quede en su lugar!
});