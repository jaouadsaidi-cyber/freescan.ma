// Vue « AEM partout au Maroc » : une seule horloge de 12 s pour les trois trajets au départ d'Agadir.
// Chaque camionnette part, révèle son trajet, se gare ; le technicien apparaît, puis le badge d'intervention.
// Mouvement réduit : image figée où tout le monde est arrivé.
(function () {
  var svg = document.getElementById('carteMaroc');
  if (!svg) return;
  var CYCLE = 12000, FIN = 0.93, C30 = Math.cos(Math.PI / 6);
  var E = parseFloat(svg.getAttribute('data-echelle')) || 1;
  var calme = matchMedia('(prefers-reduced-motion: reduce)');
  if (/[?&]anim=1\b/.test(location.search)) calme = { matches: false };   // ?anim=1 : animer même si le système demande moins de mouvement

  var R = [0, 1, 2].map(function (i) {
    var p = document.getElementById('trajet-' + i), van = document.getElementById('van-' + i);
    return {
      p: p, L: p.getTotalLength(), rev: document.getElementById('revele-' + i),
      van: van, flip: van.querySelector('.flip'), va: van.querySelector('.va'), vb: van.querySelector('.vb'),
      techG: document.getElementById('tech-' + i), tech: document.querySelector('#tech-' + i + ' .pop'),
      bras: document.querySelector('#tech-' + i + ' .bras'),
      okG: document.getElementById('ok-' + i), ok: document.querySelector('#ok-' + i + ' .pop'),
      mod: 'a', mir: false
    };
  });
  // départs échelonnés, durée de trajet proportionnelle à la longueur
  var Lmax = Math.max.apply(null, R.map(function (r) { return r.L; }));
  R.forEach(function (r, i) { r.a = 0.03 + i * 0.07; r.b = r.a + 0.14 + 0.26 * r.L / Lmax; });

  function borne(k) { return k < 0 ? 0 : k > 1 ? 1 : k; }
  function douce(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function rebond(k) { k = borne(k); if (k === 0) return 0; var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); }

  function image(t) {
    var vis = 1 - borne((t - FIN) / 0.05);
    R.forEach(function (r) {
      var k = t < r.a ? 0 : t > r.b ? 1 : douce((t - r.a) / (r.b - r.a));
      r.rev.setAttribute('stroke-dashoffset', (1 - k).toFixed(4));
      r.p.style.opacity = vis;
      if (t < r.a) { r.van.setAttribute('opacity', 0); }
      else {
        var l = k * r.L, P = r.p.getPointAtLength(l);
        var Q = r.p.getPointAtLength(Math.min(r.L, l + 8)), M = r.p.getPointAtLength(Math.max(0, l - 8));
        var dx = Q.x - M.x, dy = Q.y - M.y;
        if (k < 1 && dx * dx + dy * dy > 0.5) {
          // direction écran décomposée sur les axes isométriques droite (cos30, .5) et gauche (-cos30, .5)
          var al = (dx / C30 + 2 * dy) / 2, be = (2 * dy - dx / C30) / 2;
          if (Math.abs(al) >= Math.abs(be)) { r.mod = al > 0 ? 'a' : 'b'; r.mir = false; }
          else { r.mod = be > 0 ? 'a' : 'b'; r.mir = true; }
        }
        var saut = k > 0 && k < 1 ? Math.abs(Math.sin(t * 170)) * 1.3 : 0;
        r.van.setAttribute('transform', 'translate(' + P.x.toFixed(1) + ',' + (P.y - saut * E).toFixed(1) + ') scale(' + E + ')');
        r.flip.setAttribute('transform', r.mir ? 'scale(-1,1)' : 'scale(1,1)');
        r.va.style.display = r.mod === 'a' ? '' : 'none';
        r.vb.style.display = r.mod === 'b' ? '' : 'none';
        r.van.setAttribute('opacity', vis);
      }
      r.tech.setAttribute('transform', 'scale(' + rebond((t - r.b - 0.01) / 0.05).toFixed(3) + ')');
      r.bras.setAttribute('transform', 'rotate(' + (t > r.b + 0.04 && t < FIN ? 15 * Math.sin(t * 95) : 0).toFixed(1) + ' 5.4 -19.5)');
      r.ok.setAttribute('transform', 'scale(' + rebond((t - r.b - 0.09) / 0.05).toFixed(3) + ')');
      r.techG.style.opacity = r.okG.style.opacity = vis;
    });
  }

  var raf = 0, t0 = 0, visible = false;
  function boucle(now) {
    if (!t0) t0 = now;
    image(((now - t0) % CYCLE) / CYCLE);
    raf = visible && !calme.matches ? requestAnimationFrame(boucle) : 0;
  }
  function relancer() {
    if (calme.matches) { cancelAnimationFrame(raf); raf = 0; image(0.85); return; }
    if (visible && !raf) raf = requestAnimationFrame(boucle);
  }
  new IntersectionObserver(function (es) { visible = es[0].isIntersecting; relancer(); }, { threshold: 0.1 }).observe(svg);
  if (calme.addEventListener) calme.addEventListener('change', relancer);
  image(calme.matches ? 0.85 : 0);
  window.__maroc = { image: image, etat: function () { return { visible: visible, raf: raf, calme: calme.matches }; } };   // contrôle
})();
