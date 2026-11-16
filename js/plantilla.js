/* Creador de árbol genealógico de la web de Ramo: abuelos, padres, tíos, primos y hermanos, con nombres y fotos opcionales.
   Todo pasa en el navegador (nada se envía a ningún sitio). Se dibuja en un canvas con la misma función para la vista previa
   y para descargar (PNG o PDF A4 apaisado a 300 ppp). Los textos de cada idioma llegan en window.RAMO_PLANTILLA. */
(function () {
  "use strict";
  var T = window.RAMO_PLANTILLA, raiz = document.getElementById("creador");
  if (!T || !raiz) return;
  var CLAVE = "ramo-plantilla-" + T.idioma;

  // ---------- estado ----------
  var uid = 0;
  function persona(tipo, sexo) { return { id: "p" + (++uid), tipo: tipo, sexo: sexo, nombre: "", foto: null, hijos: [] }; }
  function inicial() {
    return {
      titulo: T.titulo_def, estilo: "jardin", fotos: true,
      yo: persona("yo", ""), papa: persona("papa", "h"), mama: persona("mama", "m"),
      abuelos: [persona("abuelo", "h"), persona("abuelo", "m"), persona("abuelo", "h"), persona("abuelo", "m")],
      hermanos: [persona("hermano", "h")],
      tiosP: [conHijos(persona("tio", "m"), ["h", "m"])],
      tiosM: [conHijos(persona("tio", "h"), ["h"])],
    };
  }
  function conHijos(p, sexos) { sexos.forEach(function (s) { p.hijos.push(persona("primo", s)); }); return p; }
  var E;
  try { E = JSON.parse(localStorage.getItem(CLAVE)); } catch (e) { E = null; }
  if (!E || !E.yo) E = inicial();
  (function renumerar(o) { // que los id nuevos no choquen con los guardados
    if (o && typeof o === "object") { if (typeof o.id === "string") uid = Math.max(uid, +o.id.slice(1) || 0); for (var k in o) renumerar(o[k]); }
  })(E);
  function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify(E)); } catch (e) { /* sin sitio o sin permiso: da igual */ } }

  // ---------- estilos ----------
  var ESTILOS = {
    jardin: { fondo: ["#f3f7ec", "#e4eed8"], linea: "#a2895f", tronco: "#c08a2c", h: "#2f6b9a", m: "#b5533c", yo: "#b07a12",
              texto: "#3b3a33", suave: "#7a7466", titulo: "#2f4a2a", relleno: "#ffffff", hoja: true },
    album:  { fondo: ["#f7f0e3", "#ecdfc8"], linea: "#9a7a52", tronco: "#9a6a32", h: "#3d5a80", m: "#a0453a", yo: "#8a5a12",
              texto: "#3a2a1a", suave: "#7a6650", titulo: "#5a3a1a", relleno: "#fffaf1", marco: true },
    colores:{ fondo: ["#ffffff", "#ffffff"], linea: "#7fae6a", tronco: "#7fae6a", h: "#3a86c8", m: "#e0607e", yo: "#e8a31c",
              texto: "#333333", suave: "#777777", titulo: "#e07a1c", relleno: "#ffffff", pastel: true },
    blanco: { fondo: ["#ffffff", "#ffffff"], linea: "#8a8a8a", tronco: "#555555", h: "#333333", m: "#333333", yo: "#111111",
              texto: "#222222", suave: "#777777", titulo: "#222222", relleno: "#ffffff" },
  };

  // ---------- colocación ----------
  // Fila 1: abuelos de papá y de mamá. Fila 2: tíos de papá, papá y mamá, tíos de mamá. Fila 3: primos, yo y hermanos.
  var W = 1485, H = 1050;
  function colocar() {
    var cols = [];   // fila 2, de izquierda a derecha, con su ancho en huecos
    E.tiosP.forEach(function (t) { cols.push({ p: t, w: Math.max(1, t.hijos.length), lado: "P" }); });
    var nk = 1 + E.hermanos.length, wc = Math.max(4.4, nk);
    cols.push({ pareja: true, w: wc });
    E.tiosM.forEach(function (t) { cols.push({ p: t, w: Math.max(1, t.hijos.length), lado: "M" }); });
    var total = cols.reduce(function (a, c) { return a + c.w; }, 0) + (cols.length - 1) * 0.25;
    var S = Math.min(170, (W - 90) / total), x = (W - total * S) / 2, nodos = [], lineas = [];
    var y1 = 300, y2 = 560, y3 = 820;
    var r = Math.min(46, S * 0.3), papa, mama, hijosP = [], hijosM = [];
    cols.forEach(function (c) {
      var cx = x + c.w * S / 2;
      if (c.pareja) {
        var sep = Math.max(1.45, 0.75 * Math.min(nk, 3)) * S;
        papa = { p: E.papa, x: cx - sep / 2, y: y2 }; mama = { p: E.mama, x: cx + sep / 2, y: y2 };
        nodos.push(papa, mama);
        var hs = [E.yo].concat(E.hermanos), x0 = cx - (hs.length - 1) * S / 2;
        var kids = hs.map(function (h, i) { var n = { p: h, x: x0 + i * S, y: y3 }; nodos.push(n); return n; });
        lineas.push({ pareja: [papa, mama] }); lineas.push({ desde: { x: cx, y: y2 }, hijos: kids, pareja: true, tronco: true });
        hijosP.push(papa); hijosM.unshift(mama);
      } else {
        var n = { p: c.p, x: cx, y: y2 }; nodos.push(n);
        (c.lado === "P" ? hijosP : hijosM).push(n);
        if (c.p.hijos.length) {
          var x1 = cx - (c.p.hijos.length - 1) * S / 2;
          lineas.push({ desde: n, hijos: c.p.hijos.map(function (h, i) { var k = { p: h, x: x1 + i * S, y: y3 }; nodos.push(k); return k; }) });
        }
      }
      x += c.w * S + 0.25 * S;
    });
    // los abuelos, encima de sus hijos (sin pisarse los de un lado con los del otro)
    function centro(hs) { return (hs[0].x + hs[hs.length - 1].x) / 2; }
    var g = Math.max(1.3 * S, 2.2 * r + 30), cp = centro(hijosP), cm = centro(hijosM);
    if (cm - cp < 2 * g + 0.4 * S) { var d = (2 * g + 0.4 * S - (cm - cp)) / 2; cp -= d; cm += d; }
    var ab = E.abuelos;
    var a = [{ p: ab[0], x: cp - g / 2, y: y1 }, { p: ab[1], x: cp + g / 2, y: y1 }, { p: ab[2], x: cm - g / 2, y: y1 }, { p: ab[3], x: cm + g / 2, y: y1 }];
    nodos.push.apply(nodos, a);
    lineas.push({ pareja: [a[0], a[1]] }, { pareja: [a[2], a[3]] });
    lineas.push({ desde: { x: cp, y: y1 }, hijos: hijosP, pareja: true, tronco: true });
    lineas.push({ desde: { x: cm, y: y1 }, hijos: hijosM, pareja: true, tronco: true });
    return { nodos: nodos, lineas: lineas, S: S, r: r };
  }

  // ---------- dibujo ----------
  var fotos = {};   // id → Image ya cargada
  function imagen(p) {
    if (!p.foto) return null;
    var f = fotos[p.id];
    if (!f || f.src !== p.foto) { f = fotos[p.id] = new Image(); f.onload = pedir; f.src = p.foto; }
    return f.complete && f.naturalWidth ? f : null;
  }
  function etiqueta(p) {
    var k = { yo: "yo", papa: "papa", mama: "mama" }[p.tipo];
    if (k) return T.et[k];
    return T.et[p.tipo + (p.sexo === "m" ? "_m" : "_h")];
  }
  function dibujar(ctx, k) {
    var st = ESTILOS[E.estilo] || ESTILOS.jardin, L = colocar(), r = L.r, S = L.S;
    ctx.save(); ctx.scale(k, k);
    var gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, st.fondo[0]); gr.addColorStop(1, st.fondo[1]);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    if (st.marco) {
      ctx.strokeStyle = st.tronco; ctx.lineWidth = 3; ctx.strokeRect(22, 22, W - 44, H - 44);
      ctx.lineWidth = 1; ctx.strokeRect(30, 30, W - 60, H - 60);
    }
    if (st.hoja) hojas(ctx, st);
    // título
    ctx.fillStyle = st.titulo; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    var tt = (E.titulo || "").trim() || T.titulo_def, ft = 62;
    do { ctx.font = "600 " + ft + "px Titulos, 'Barlow Semi Condensed', 'Arial Narrow', sans-serif"; ft -= 2; } while (ctx.measureText(tt).width > W - 160 && ft > 26);
    ctx.fillText(tt, W / 2, 128);
    // líneas
    L.lineas.forEach(function (l) {
      ctx.lineCap = "round";
      if (l.pareja && l.pareja.length === 2) {
        var a = l.pareja[0], b = l.pareja[1];
        ctx.strokeStyle = st.linea; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(a.x + r, a.y); ctx.lineTo(b.x - r, b.y); ctx.stroke();
        ctx.fillStyle = st.relleno; ctx.beginPath(); ctx.arc((a.x + b.x) / 2, a.y, 6, 0, 7); ctx.fill(); ctx.stroke();
        return;
      }
      var hs = l.hijos, y0 = l.pareja ? l.desde.y : l.desde.y + r + texto(S) + 6, yb = hs[0].y - r - 34;
      ctx.strokeStyle = l.tronco ? st.tronco : st.linea; ctx.lineWidth = l.tronco ? 4 : 3;
      ctx.beginPath();
      ctx.moveTo(l.desde.x, l.pareja ? y0 + 6 : y0); ctx.lineTo(l.desde.x, yb);
      var xa = Math.min(l.desde.x, hs[0].x), xb = Math.max(l.desde.x, hs[hs.length - 1].x);
      ctx.moveTo(xa, yb); ctx.lineTo(xb, yb);
      hs.forEach(function (h) { ctx.moveTo(h.x, yb); ctx.lineTo(h.x, h.y - r); });
      ctx.stroke();
    });
    // personas
    L.nodos.forEach(function (n) { nodo(ctx, st, n, r, S); });
    // pie
    ctx.fillStyle = st.suave; ctx.font = "400 17px system-ui, 'Segoe UI', Roboto, Arial, sans-serif"; ctx.textAlign = "center";
    ctx.fillText(T.pie, W / 2, H - 42);
    ctx.restore();
  }
  function texto(S) { return Math.max(17, Math.min(27, S * 0.17)) * 2.6; }
  function nodo(ctx, st, n, r, S) {
    var p = n.p, col = p.tipo === "yo" ? st.yo : p.sexo === "m" ? st.m : st.h, img = E.fotos ? imagen(p) : null;
    ctx.save();
    ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
    ctx.fillStyle = st.pastel ? (p.tipo === "yo" ? "#fff1cf" : p.sexo === "m" ? "#fde6ec" : "#e3f0fb") : st.relleno; ctx.fill();
    if (img) {
      ctx.save(); ctx.clip();
      var s = Math.max(2 * r / img.naturalWidth, 2 * r / img.naturalHeight);
      ctx.drawImage(img, n.x - img.naturalWidth * s / 2, n.y - img.naturalHeight * s / 2, img.naturalWidth * s, img.naturalHeight * s);
      ctx.restore();
    } else if (!E.fotos && p.nombre.trim()) {   // sin fotos: las iniciales; con fotos, el hueco vacío para pegarla o dibujar
      ctx.fillStyle = col; ctx.globalAlpha = .85; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = "600 " + Math.round(r * 0.8) + "px Titulos, 'Barlow Semi Condensed', sans-serif";
      ctx.fillText(iniciales(p.nombre), n.x, n.y + 2); ctx.globalAlpha = 1;
    } else if (E.fotos) {
      ctx.strokeStyle = col; ctx.globalAlpha = .35; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.arc(n.x, n.y, r - 7, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    ctx.lineWidth = p.tipo === "yo" ? 5 : 3; ctx.strokeStyle = col;
    ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.stroke();
    // etiqueta y nombre
    var fn = Math.max(17, Math.min(27, S * 0.17)), y = n.y + r + fn * 0.95;
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = col; ctx.font = "italic 500 " + Math.round(fn * 0.74) + "px system-ui, 'Segoe UI', Roboto, Arial, sans-serif";
    ajustar(ctx, etiqueta(p), S - 6); ctx.fillText(etiqueta(p), n.x, y);
    y += fn * 1.15;
    if (p.nombre.trim()) {
      ctx.fillStyle = st.texto; ctx.font = "650 " + Math.round(fn) + "px system-ui, 'Segoe UI', Roboto, Arial, sans-serif";
      ajustar(ctx, p.nombre.trim(), S - 4); ctx.fillText(p.nombre.trim(), n.x, y);
    } else {
      ctx.strokeStyle = st.suave; ctx.globalAlpha = .55; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(n.x - S * 0.4, y + 2); ctx.lineTo(n.x + S * 0.4, y + 2); ctx.stroke(); ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  function ajustar(ctx, t, ancho) {   // encoge la letra hasta que quepa
    var m = /(\d+)px/.exec(ctx.font), f = m ? +m[1] : 20;
    while (ctx.measureText(t).width > ancho && f > 9) { f--; ctx.font = ctx.font.replace(/\d+px/, f + "px"); }
  }
  function iniciales(s) { return s.trim().split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join(""); }
  function hojas(ctx, st) {   // unas ramitas en las esquinas
    ctx.save(); ctx.globalAlpha = .5;
    [[60, 60, 1], [W - 60, 60, -1]].forEach(function (c) {
      ctx.strokeStyle = "#8fb070"; ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(c[0], c[1] + 90); ctx.quadraticCurveTo(c[0] + 10 * c[2], c[1] + 20, c[0] + 110 * c[2], c[1]); ctx.stroke();
      for (var i = 0; i < 5; i++) {
        var t = i / 5, x = c[0] + (5 + 90 * t) * c[2], y = c[1] + 80 - 75 * t;
        ctx.fillStyle = i % 2 ? "#9cc07c" : "#7fa862";
        ctx.beginPath(); ctx.ellipse(x + 10 * c[2], y - 6, 13, 6, -0.6 * c[2], 0, 7); ctx.fill();
      }
    });
    ctx.restore();
  }

  // ---------- vista previa ----------
  var lienzo = raiz.querySelector("canvas"), pendiente = false;
  function pedir() { if (!pendiente) { pendiente = true; requestAnimationFrame(pintar); } }
  function pintar() {
    pendiente = false;
    var dpr = Math.min(2, window.devicePixelRatio || 1), ancho = lienzo.clientWidth || 800;
    lienzo.width = Math.round(ancho * dpr); lienzo.height = Math.round(ancho * dpr * H / W);
    dibujar(lienzo.getContext("2d"), lienzo.width / W);
  }
  window.addEventListener("resize", pedir);
  if (document.fonts && document.fonts.load) document.fonts.load("600 20px Titulos").then(pedir, pedir);

  // ---------- formulario ----------
  var panel = raiz.querySelector(".creador-datos");
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function boton(txt, fn, cls) { var b = el("button", cls || "mini", txt); b.type = "button"; b.addEventListener("click", fn); return b; }
  function fila(p, quitar) {
    var f = el("div", "persona " + (p.sexo === "m" ? "es-m" : p.sexo === "h" ? "es-h" : "es-yo"));
    var lab = el("label"), span = el("span", "et", etiqueta(p)), inp = el("input");
    inp.type = "text"; inp.value = p.nombre; inp.placeholder = T.ui.nombre; inp.maxLength = 40;
    inp.addEventListener("input", function () { p.nombre = inp.value; guardar(); pedir(); });
    lab.appendChild(span); lab.appendChild(inp); f.appendChild(lab);
    var foto = el("label", "foto-btn" + (p.foto ? " con" : ""), p.foto ? "" : "📷");
    foto.title = T.ui.foto;
    if (p.foto) foto.style.backgroundImage = "url(" + p.foto + ")";
    var fi = el("input"); fi.type = "file"; fi.accept = "image/*"; fi.hidden = true;
    fi.addEventListener("change", function () { if (fi.files[0]) leerFoto(fi.files[0], function (u) { p.foto = u; guardar(); montar(); pedir(); }); });
    foto.appendChild(fi); f.appendChild(foto);
    if (p.foto) f.appendChild(boton("×", function () { p.foto = null; guardar(); montar(); pedir(); }, "mini quitar-foto"));
    if (quitar) f.appendChild(boton("✕", quitar, "mini quitar"));
    return f;
  }
  function leerFoto(file, fin) {   // la foto, recortada en cuadrado y pequeña para que quepa en el navegador
    var fr = new FileReader();
    fr.onload = function () {
      var im = new Image();
      im.onload = function () {
        var c = document.createElement("canvas"), s = Math.min(im.width, im.height); c.width = c.height = 320;
        c.getContext("2d").drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, 320, 320);
        fin(c.toDataURL("image/jpeg", .82));
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  }
  function grupo(titulo) { var g = el("fieldset", "grupo"); g.appendChild(el("legend", null, titulo)); return g; }
  function tios(lista, titulo) {
    var g = grupo(titulo);
    lista.forEach(function (t, i) {
      var caja = el("div", "tio");
      caja.appendChild(fila(t, function () { lista.splice(i, 1); cambio(); }));
      var hs = el("div", "hijos");
      t.hijos.forEach(function (h, j) { hs.appendChild(fila(h, function () { t.hijos.splice(j, 1); cambio(); })); });
      var add = el("div", "anadir");
      if (t.hijos.length < 6) {
        add.appendChild(boton("+ " + T.et.primo_h, function () { t.hijos.push(persona("primo", "h")); cambio(); }));
        add.appendChild(boton("+ " + T.et.primo_m, function () { t.hijos.push(persona("primo", "m")); cambio(); }));
      }
      hs.appendChild(add); caja.appendChild(hs); g.appendChild(caja);
    });
    if (lista.length < 6) {
      var add = el("div", "anadir");
      add.appendChild(boton("+ " + T.et.tio_h, function () { lista.push(persona("tio", "h")); cambio(); }));
      add.appendChild(boton("+ " + T.et.tio_m, function () { lista.push(persona("tio", "m")); cambio(); }));
      g.appendChild(add);
    }
    return g;
  }
  function cambio() { guardar(); montar(); pedir(); }
  function montar() {
    panel.innerHTML = "";
    var g = grupo(T.ui.tu_familia);
    g.appendChild(fila(E.yo));
    E.hermanos.forEach(function (h, i) { g.appendChild(fila(h, function () { E.hermanos.splice(i, 1); cambio(); })); });
    if (E.hermanos.length < 8) {
      var add = el("div", "anadir");
      add.appendChild(boton("+ " + T.et.hermano_h, function () { E.hermanos.push(persona("hermano", "h")); cambio(); }));
      add.appendChild(boton("+ " + T.et.hermano_m, function () { E.hermanos.push(persona("hermano", "m")); cambio(); }));
      g.appendChild(add);
    }
    g.appendChild(fila(E.papa)); g.appendChild(fila(E.mama));
    panel.appendChild(g);
    var a = grupo(T.ui.abuelos);
    a.appendChild(el("p", "nota", T.ui.de_papa)); a.appendChild(fila(E.abuelos[0])); a.appendChild(fila(E.abuelos[1]));
    a.appendChild(el("p", "nota", T.ui.de_mama)); a.appendChild(fila(E.abuelos[2])); a.appendChild(fila(E.abuelos[3]));
    panel.appendChild(a);
    panel.appendChild(tios(E.tiosP, T.ui.tios_papa));
    panel.appendChild(tios(E.tiosM, T.ui.tios_mama));
  }
  // título, estilo y fotos
  var titulo = raiz.querySelector("#creador-titulo"), estilo = raiz.querySelector("#creador-estilo"), conFotos = raiz.querySelector("#creador-fotos");
  titulo.value = E.titulo; estilo.value = E.estilo; conFotos.checked = E.fotos;
  titulo.addEventListener("input", function () { E.titulo = titulo.value; guardar(); pedir(); });
  estilo.addEventListener("change", function () { E.estilo = estilo.value; guardar(); pedir(); });
  conFotos.addEventListener("change", function () { E.fotos = conFotos.checked; guardar(); pedir(); });
  raiz.querySelector("#creador-empezar").addEventListener("click", function () {
    E = inicial(); titulo.value = E.titulo; estilo.value = E.estilo; conFotos.checked = E.fotos; cambio();
  });

  // ---------- descargar ----------
  var A4 = [3508, 2480];   // A4 apaisado a 300 ppp
  function grande() { var c = document.createElement("canvas"); c.width = A4[0]; c.height = A4[1]; dibujar(c.getContext("2d"), A4[0] / W); return c; }
  function nombreArchivo(ext) {
    var t = ((E.titulo || "").trim() || T.titulo_def).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return (t || "arbol") + "." + ext;
  }
  function bajar(url, nombre) { var a = document.createElement("a"); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); }
  raiz.querySelector("#creador-png").addEventListener("click", function () {
    grande().toBlob(function (b) { var u = URL.createObjectURL(b); bajar(u, nombreArchivo("png")); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); }, "image/png");
  });
  var jspdf = null;
  function conJsPDF(fin) {
    if (window.jspdf) return fin(window.jspdf.jsPDF);
    if (jspdf) return jspdf.push(fin);
    jspdf = [fin];
    var s = document.createElement("script"); s.src = T.jspdf; s.async = true;
    s.onload = function () { var l = jspdf; jspdf = null; l.forEach(function (f) { f(window.jspdf.jsPDF); }); };
    s.onerror = function () { jspdf = null; alertar(); };
    document.head.appendChild(s);
  }
  function alertar() { var m = raiz.querySelector(".creador-aviso"); if (m) { m.hidden = false; } }
  raiz.querySelector("#creador-pdf").addEventListener("click", function () {
    conJsPDF(function (JsPDF) {
      var doc = new JsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      doc.addImage(grande().toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 297, 210);
      doc.save(nombreArchivo("pdf"));
    });
  });

  montar(); pintar();
})();
