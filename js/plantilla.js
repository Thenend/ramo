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
    espacio:{ fondo: ["#141c46", "#2a1a5e"], linea: "#8f9be6", tronco: "#ffd45c", h: "#7cc8ff", m: "#ff9ccb", yo: "#ffd45c",
              texto: "#f6f3ff", suave: "#c3bdea", titulo: "#ffd45c", relleno: "#eef0ff", deco: espacio },
    dinosaurios:{ fondo: ["#f8f4dc", "#e5efc6"], linea: "#8a7a4a", tronco: "#6f9a3c", h: "#2f7a8a", m: "#c0563a", yo: "#d08a12",
              texto: "#3a3424", suave: "#7a7158", titulo: "#4f7a2a", relleno: "#ffffff", pastel: true, deco: dinosaurios },
    mar:    { fondo: ["#e6f8ff", "#b4e0f2"], linea: "#3f8fb0", tronco: "#2a7fa8", h: "#1f6fb2", m: "#e0577a", yo: "#e8901c",
              texto: "#173a4f", suave: "#4f7486", titulo: "#1f6f9a", relleno: "#ffffff", pastel: true, deco: mar },
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
    if (st.deco) { ctx.save(); st.deco(ctx); ctx.restore(); }
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
    if (enPantalla && p.id === nuevo) {   // halo en la vista previa (no sale al descargar)
      ctx.fillStyle = col; ctx.globalAlpha = .22; ctx.beginPath(); ctx.arc(n.x, n.y, r + 16, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    }
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

  // ---------- dibujos de los estilos para niños (en las esquinas, lejos de las personas) ----------
  function azar(sem) { return function () { sem = (sem * 16807) % 2147483647; return (sem - 1) / 2147483646; }; }
  function circulo(ctx, x, y, r, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  function elipse(ctx, x, y, rx, ry, a, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, a || 0, 0, Math.PI * 2); ctx.fill(); }
  function estrella(ctx, x, y, r1, r2, puntas, color, giro) {
    ctx.fillStyle = color; ctx.beginPath();
    for (var i = 0; i < puntas * 2; i++) {
      var a = (giro || -Math.PI / 2) + i * Math.PI / puntas, r = i % 2 ? r2 : r1;
      ctx[i ? "lineTo" : "moveTo"](x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
  }

  function espacio(ctx) {
    var a = azar(7);
    for (var i = 0; i < 170; i++) {   // estrellas
      ctx.globalAlpha = 0.35 + a() * 0.6;
      circulo(ctx, a() * W, a() * H, 0.7 + a() * 1.9, a() < 0.8 ? "#ffffff" : "#ffe9a8");
    }
    ctx.globalAlpha = 1;
    [[250, 70, 11], [W - 300, 190, 9], [70, 520, 10], [W - 60, 470, 12], [420, H - 60, 8], [W - 470, H - 70, 10]].forEach(function (e) {
      estrella(ctx, e[0], e[1], e[2], e[2] * 0.28, 4, "#fff6c8");
    });
    // planeta con anillo, arriba a la izquierda
    var px = 120, py = 125, pr = 50;
    ctx.save(); ctx.translate(px, py); ctx.rotate(-0.35);
    ctx.strokeStyle = "#ffd9a0"; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.ellipse(0, 0, pr * 1.75, pr * 0.42, 0, Math.PI, Math.PI * 2); ctx.stroke();
    var g = ctx.createLinearGradient(0, -pr, 0, pr); g.addColorStop(0, "#ffbe74"); g.addColorStop(1, "#e2583a");
    circulo(ctx, 0, 0, pr, g);
    ctx.globalAlpha = .25; elipse(ctx, 0, -14, pr * 0.95, 7, 0, "#fff"); elipse(ctx, 0, 16, pr * 0.9, 6, 0, "#8a2a1a"); ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.ellipse(0, 0, pr * 1.75, pr * 0.42, 0, 0, Math.PI); ctx.stroke();
    ctx.restore();
    // luna, arriba a la derecha
    circulo(ctx, W - 125, 118, 44, "#f3eed8");
    [[-14, -10, 9], [12, 8, 12], [-6, 20, 6], [18, -18, 5]].forEach(function (c) { circulo(ctx, W - 125 + c[0], 118 + c[1], c[2], "#dcd3b4"); });
    // planeta pequeño, abajo a la izquierda
    circulo(ctx, 70, H - 62, 24, "#3fc1b0");
    ctx.globalAlpha = .35; elipse(ctx, 70, H - 68, 21, 4, 0, "#ffffff"); elipse(ctx, 70, H - 55, 20, 3, 0, "#0f6f66"); ctx.globalAlpha = 1;
    // cohete, abajo a la derecha
    ctx.save(); ctx.translate(W - 78, H - 72); ctx.rotate(0.6); ctx.scale(0.72, 0.72);
    var fl = ctx.createLinearGradient(0, 40, 0, 95); fl.addColorStop(0, "#ffd23c"); fl.addColorStop(1, "rgba(255,110,40,0)");
    ctx.fillStyle = fl; ctx.beginPath(); ctx.moveTo(-14, 40); ctx.quadraticCurveTo(0, 110, 14, 40); ctx.fill();
    ctx.fillStyle = "#e8454a"; ctx.beginPath(); ctx.moveTo(-22, 20); ctx.lineTo(-38, 50); ctx.lineTo(-18, 42); ctx.fill();
    ctx.beginPath(); ctx.moveTo(22, 20); ctx.lineTo(38, 50); ctx.lineTo(18, 42); ctx.fill();
    ctx.fillStyle = "#f4f4fa"; ctx.beginPath(); ctx.moveTo(0, -62); ctx.bezierCurveTo(30, -36, 26, 20, 20, 44);
    ctx.lineTo(-20, 44); ctx.bezierCurveTo(-26, 20, -30, -36, 0, -62); ctx.fill();
    ctx.fillStyle = "#e8454a"; ctx.beginPath(); ctx.moveTo(0, -62); ctx.bezierCurveTo(14, -50, 20, -40, 22, -32); ctx.lineTo(-22, -32);
    ctx.bezierCurveTo(-20, -40, -14, -50, 0, -62); ctx.fill();
    circulo(ctx, 0, -6, 12, "#5a6fd0"); circulo(ctx, 0, -6, 8, "#9fd8ff");
    ctx.restore();
  }

  function dinosaurios(ctx) {
    // cometa, arriba a la izquierda
    var cx = 190, cy = 118, cola = ctx.createLinearGradient(cx, cy, 40, 30);
    cola.addColorStop(0, "rgba(255,200,90,.85)"); cola.addColorStop(1, "rgba(255,200,90,0)");
    ctx.fillStyle = cola; ctx.beginPath(); ctx.moveTo(cx + 4, cy - 12); ctx.lineTo(30, 22); ctx.lineTo(18, 70); ctx.lineTo(cx - 10, cy + 10); ctx.fill();
    ctx.strokeStyle = "rgba(255,230,160,.7)"; ctx.lineWidth = 2;
    [[-6, 0], [6, 14]].forEach(function (d) { ctx.beginPath(); ctx.moveTo(cx + d[0], cy + d[1] - 6); ctx.lineTo(60 + d[0] * 6, 40 + d[1] * 3); ctx.stroke(); });
    var halo = ctx.createRadialGradient(cx, cy, 2, cx, cy, 30);
    halo.addColorStop(0, "rgba(255,250,220,1)"); halo.addColorStop(.45, "rgba(255,214,120,.8)"); halo.addColorStop(1, "rgba(255,190,80,0)");
    circulo(ctx, cx, cy, 30, halo); circulo(ctx, cx, cy, 9, "#fffbe8");
    // volcán al fondo, abajo (lo tapan las colinas por la base)
    ctx.save(); ctx.translate(460, H - 70);
    ctx.globalAlpha = .45; [[18, -112, 14], [34, -128, 18], [58, -138, 13]].forEach(function (h) { circulo(ctx, h[0], h[1], h[2], "#b9b2a4"); }); ctx.globalAlpha = 1;
    ctx.fillStyle = "#c2a483"; ctx.beginPath(); ctx.moveTo(-110, 20); ctx.lineTo(-20, -86); ctx.lineTo(16, -86); ctx.lineTo(110, 20); ctx.fill();
    ctx.fillStyle = "#b08f6c"; ctx.beginPath(); ctx.moveTo(16, -86); ctx.lineTo(110, 20); ctx.lineTo(40, 20); ctx.lineTo(6, -60); ctx.fill();
    ctx.fillStyle = "#ff7a3a"; ctx.beginPath(); ctx.moveTo(-20, -86); ctx.lineTo(16, -86); ctx.lineTo(10, -74);
    ctx.quadraticCurveTo(2, -78, 0, -62); ctx.quadraticCurveTo(-6, -78, -14, -74); ctx.fill();
    ctx.restore();
    // colinas abajo
    ctx.fillStyle = "#cfe3a2"; ctx.beginPath(); ctx.moveTo(0, H);
    ctx.lineTo(0, H - 70); ctx.quadraticCurveTo(W * 0.25, H - 110, W * 0.5, H - 72); ctx.quadraticCurveTo(W * 0.75, H - 36, W, H - 86);
    ctx.lineTo(W, H); ctx.fill();
    // pteranodon, arriba a la derecha, y otro pequeño más lejos
    pteranodon(ctx, W - 150, 112, 1, "#9a86d2", "#7a66b8");
    pteranodon(ctx, W - 300, 70, 0.45, "#b9abe2", "#9d8dd0");
    // diplodocus, abajo a la izquierda
    ctx.save(); ctx.translate(205, H - 30); ctx.scale(0.55, 0.55);
    var v = "#6fae52";
    ctx.fillStyle = v; ctx.beginPath(); ctx.moveTo(-58, -30); ctx.quadraticCurveTo(-120, -20, -150, 8); ctx.quadraticCurveTo(-110, -6, -56, -8); ctx.fill();
    ctx.beginPath(); ctx.moveTo(38, -50); ctx.bezierCurveTo(60, -80, 70, -140, 98, -150); ctx.lineTo(108, -136); ctx.bezierCurveTo(88, -124, 76, -70, 58, -28); ctx.fill();
    elipse(ctx, 0, -32, 70, 36, 0, v);
    elipse(ctx, 110, -146, 22, 12, -0.1, v);
    [-46, -20, 22, 46].forEach(function (x) { ctx.fillRect(x - 9, -16, 18, 30); });
    ctx.globalAlpha = .35; [[-20, -44, 9], [10, -50, 7], [32, -36, 6], [-40, -26, 6]].forEach(function (c) { circulo(ctx, c[0], c[1], c[2], "#d9f0b0"); }); ctx.globalAlpha = 1;
    circulo(ctx, 118, -150, 3.5, "#2a3a1a");
    ctx.restore();
    // estegosaurio, abajo a la derecha (mirando a la izquierda)
    ctx.save(); ctx.translate(W - 110, H - 40); ctx.scale(-0.66, 0.66);
    var n = "#e8955a";
    ctx.fillStyle = "#d0603a";
    [[-40, -58], [-14, -70], [14, -70], [40, -58]].forEach(function (pl) {
      ctx.beginPath(); ctx.moveTo(pl[0] - 15, pl[1] + 16); ctx.lineTo(pl[0], pl[1] - 22); ctx.lineTo(pl[0] + 15, pl[1] + 16); ctx.fill();
    });
    ctx.fillStyle = n; ctx.beginPath(); ctx.moveTo(-60, -30); ctx.quadraticCurveTo(-110, -30, -135, -6); ctx.quadraticCurveTo(-100, -10, -58, -10); ctx.fill();
    ctx.fillStyle = "#d0603a"; ctx.beginPath(); ctx.moveTo(-122, -16); ctx.lineTo(-130, -36); ctx.lineTo(-114, -18); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-110, -20); ctx.lineTo(-112, -40); ctx.lineTo(-100, -22); ctx.fill();
    elipse(ctx, 0, -32, 72, 34, 0, n);
    elipse(ctx, 78, -22, 22, 13, 0.25, n);
    ctx.fillStyle = n; [-44, -18, 22, 46].forEach(function (x) { ctx.fillRect(x - 9, -16, 18, 30); });
    circulo(ctx, 88, -26, 3.5, "#3a2412");
    ctx.restore();
    // huellas
    ctx.globalAlpha = .18;
    [[W - 470, H - 40], [W - 420, H - 56], [W - 370, H - 44]].forEach(function (h) {
      elipse(ctx, h[0], h[1], 9, 12, 0, "#5a4a2a");
      [-9, 0, 9].forEach(function (d) { circulo(ctx, h[0] + d, h[1] - 15, 3.5, "#5a4a2a"); });
    });
    ctx.globalAlpha = 1;
  }

  function pteranodon(ctx, x, y, t, ala, cuerpo) {   // de frente con las alas abiertas y la cabeza de perfil
    ctx.save(); ctx.translate(x, y); ctx.scale(t, t);
    [-1, 1].forEach(function (l) {   // alas: borde de delante con la «muñeca»; la membrana llega hasta los tobillos
      ctx.fillStyle = ala; ctx.beginPath(); ctx.moveTo(6 * l, -6);
      ctx.quadraticCurveTo(34 * l, -30, 58 * l, -30); ctx.lineTo(64 * l, -36); ctx.lineTo(66 * l, -28);
      ctx.quadraticCurveTo(96 * l, -26, 122 * l, -6);
      ctx.quadraticCurveTo(64 * l, -4, 10 * l, 30); ctx.lineTo(6 * l, 14); ctx.fill();
      ctx.strokeStyle = cuerpo; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(6 * l, -6);
      ctx.quadraticCurveTo(34 * l, -30, 58 * l, -30); ctx.lineTo(64 * l, -32); ctx.quadraticCurveTo(96 * l, -26, 122 * l, -6); ctx.stroke();
    });
    elipse(ctx, 0, 6, 8, 22, 0, cuerpo);
    ctx.fillStyle = cuerpo; ctx.beginPath(); ctx.moveTo(-4, 22); ctx.lineTo(-11, 34); ctx.lineTo(-1, 26); ctx.moveTo(4, 22); ctx.lineTo(11, 34); ctx.lineTo(1, 26); ctx.fill();
    // cabeza de perfil mirando a la izquierda: pico largo y cresta hacia atrás
    elipse(ctx, -2, -22, 11, 8, 0, cuerpo);
    ctx.beginPath(); ctx.moveTo(-8, -26); ctx.lineTo(-48, -16); ctx.lineTo(-8, -17); ctx.fill();
    ctx.beginPath(); ctx.moveTo(2, -28); ctx.lineTo(34, -42); ctx.lineTo(8, -20); ctx.fill();
    circulo(ctx, -5, -24, 2.4, "#ffffff"); circulo(ctx, -5.5, -24, 1.2, "#1a1430");
    ctx.restore();
  }
  function pez(ctx, x, y, t, cuerpo, raya, izq) {
    ctx.save(); ctx.translate(x, y); ctx.scale(izq ? -t : t, t);
    ctx.fillStyle = cuerpo; ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(-60, -20); ctx.lineTo(-56, 0); ctx.lineTo(-60, 20); ctx.fill();
    elipse(ctx, 0, 0, 42, 25, 0, cuerpo);
    ctx.fillStyle = raya; ctx.beginPath(); ctx.ellipse(-8, 0, 7, 23, 0, 0, Math.PI * 2); ctx.fill();
    circulo(ctx, 22, -6, 6, "#ffffff"); circulo(ctx, 24, -6, 3, "#1a2a3a");
    ctx.restore();
  }
  function mar(ctx) {
    var a = azar(11);
    // rayos de luz
    ctx.globalAlpha = .18; ctx.fillStyle = "#ffffff";
    [[300, 120], [700, 90], [1100, 130]].forEach(function (r) { ctx.beginPath(); ctx.moveTo(r[0], 0); ctx.lineTo(r[0] + r[1], 0); ctx.lineTo(r[0] + r[1] * 2.6, H); ctx.lineTo(r[0] + r[1] * 1.4, H); ctx.fill(); });
    ctx.globalAlpha = 1;
    // arena
    ctx.fillStyle = "#f3e2b4"; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, H - 62);
    ctx.quadraticCurveTo(W * 0.3, H - 90, W * 0.55, H - 64); ctx.quadraticCurveTo(W * 0.8, H - 42, W, H - 72); ctx.lineTo(W, H); ctx.fill();
    // algas
    function alga(x, alto, color, fase) {
      ctx.strokeStyle = color; ctx.lineWidth = 9; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x, H - 22);
      for (var i = 1; i <= 4; i++) ctx.quadraticCurveTo(x + (i % 2 ? 14 : -14) * fase, H - 22 - alto * (i - 0.5) / 4, x, H - 22 - alto * i / 4);
      ctx.stroke();
    }
    alga(34, 84, "#3f9a62", 1); alga(60, 64, "#5bb878", -1); alga(86, 90, "#2f8a56", 1);
    alga(W - 38, 88, "#3f9a62", -1); alga(W - 64, 66, "#5bb878", 1);
    // estrella de mar y concha
    ctx.save(); ctx.translate(W - 190, H - 48); estrella(ctx, 0, 0, 30, 13, 5, "#ff6f61", -Math.PI / 2 + 0.2); ctx.restore();
    ctx.save(); ctx.translate(210, H - 46); ctx.fillStyle = "#f7a9b8";
    ctx.beginPath(); ctx.moveTo(0, 12); ctx.arc(0, 12, 26, Math.PI * 1.1, Math.PI * 1.9); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#e07a90"; ctx.lineWidth = 2; [-0.35, -0.15, 0.05, 0.25].forEach(function (d) { ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(Math.sin(d) * 24, 12 - Math.cos(d) * 24); ctx.stroke(); });
    ctx.restore();
    // peces
    pez(ctx, 130, 120, 1.15, "#ff9a3c", "#ffffff", false);
    pez(ctx, 200, 200, 0.6, "#ff9a3c", "#ffffff", false);
    pez(ctx, W - 135, 115, 1.1, "#ffd23c", "#2f7fd0", true);
    pez(ctx, W - 215, 190, 0.6, "#7fd0e0", "#2f7fd0", true);
    // burbujas
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2.5; ctx.globalAlpha = .75;
    [[26, 330], [W - 26, 340]].forEach(function (c) {
      for (var i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(c[0] + (a() - 0.5) * 12, c[1] + i * 42, 4 + a() * 6, 0, Math.PI * 2); ctx.stroke(); }
    });
    ctx.globalAlpha = 1;
  }

  // ---------- vista previa ----------
  var lienzo = raiz.querySelector("canvas"), pendiente = false;
  function pedir() { if (!pendiente) { pendiente = true; requestAnimationFrame(pintar); } }
  function pintar() {
    pendiente = false;
    var dpr = Math.min(2, window.devicePixelRatio || 1), ancho = lienzo.clientWidth || 800;
    lienzo.width = Math.round(ancho * dpr); lienzo.height = Math.round(ancho * dpr * H / W);
    enPantalla = true; dibujar(lienzo.getContext("2d"), lienzo.width / W); enPantalla = false;
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
    inp.type = "text"; inp.dataset.id = p.id; inp.value = p.nombre; inp.placeholder = T.ui.nombre; inp.maxLength = 40;
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
        add.appendChild(boton("+ " + T.et.primo_h, function () { anadir(t.hijos, persona("primo", "h")); }));
        add.appendChild(boton("+ " + T.et.primo_m, function () { anadir(t.hijos, persona("primo", "m")); }));
      }
      hs.appendChild(add); caja.appendChild(hs); g.appendChild(caja);
    });
    if (lista.length < 6) {
      var add = el("div", "anadir");
      add.appendChild(boton("+ " + T.et.tio_h, function () { anadir(lista, persona("tio", "h")); }));
      add.appendChild(boton("+ " + T.et.tio_m, function () { anadir(lista, persona("tio", "m")); }));
      g.appendChild(add);
    }
    return g;
  }
  function cambio() { guardar(); montar(); pedir(); }
  var nuevo = null, tNuevo = 0, enPantalla = false;
  function anadir(lista, p) {   // la persona nueva sale resaltada en el árbol y con el cursor en su nombre
    lista.push(p); nuevo = p.id; cambio();
    var i = raiz.querySelector('input[data-id="' + p.id + '"]'); if (i) i.focus();
    clearTimeout(tNuevo); tNuevo = setTimeout(function () { nuevo = null; pedir(); }, 1800);
  }
  function montar() {
    panel.innerHTML = "";
    var g = grupo(T.ui.tu_familia);
    g.appendChild(fila(E.yo));
    E.hermanos.forEach(function (h, i) { g.appendChild(fila(h, function () { E.hermanos.splice(i, 1); cambio(); })); });
    if (E.hermanos.length < 8) {
      var add = el("div", "anadir");
      add.appendChild(boton("+ " + T.et.hermano_h, function () { anadir(E.hermanos, persona("hermano", "h")); }));
      add.appendChild(boton("+ " + T.et.hermano_m, function () { anadir(E.hermanos, persona("hermano", "m")); }));
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
