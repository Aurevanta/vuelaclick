/* «¿A dónde puedo ir con X €?»: mapa con los destinos que caben en el presupuesto. */
(function () {
  var DESTS = ['LIM', 'CUZ', 'BOG', 'UIO', 'SDQ', 'PUJ', 'ASU', 'VVI', 'LPB', 'SCL', 'EZE', 'TGU', 'SJO', 'PTY', 'MEX', 'CUN', 'GRU', 'MIA', 'JFK'];
  // Posición de cada etiqueta respecto a su punto, para que no se pisen
  var LABEL = {
    LIM: [-9, 4, 'end'], CUZ: [9, 6], BOG: [9, -2], UIO: [-9, -2, 'end'], SDQ: [-4, 16, 'middle'], PUJ: [9, 2],
    ASU: [9, 4], VVI: [9, -4], LPB: [-9, 4, 'end'], SCL: [-9, 4, 'end'], EZE: [9, 6], TGU: [-9, -4, 'end'],
    SJO: [-9, 8, 'end'], PTY: [9, 8], MEX: [-9, 4, 'end'], CUN: [9, -4], GRU: [9, 4], MIA: [9, -4], JFK: [9, 0]
  };
  var LON0 = -125, LON1 = 5, LAT0 = 50, LAT1 = -57, K = 7;
  var W = (LON1 - LON0) * K, H = (LAT0 - LAT1) * K;
  var MODES = {
    total: { min: 300, max: 2000, step: 25, value: 700 },
    month: { min: 30, max: 200, step: 5, value: 50 }
  };
  var state = { origin: 'MAD', mode: 'total', budget: { total: 700, month: 50 }, prices: {} };
  var money = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, useGrouping: 'always' });

  function x(lon) { return (lon - LON0) * K; }
  function y(lat) { return (LAT0 - lat) * K; }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function addDays(n) { var d = new Date(); d.setDate(d.getDate() + n); return iso(d); }

  // Para orígenes en España se dibuja Madrid en el borde derecho del mapa
  function originPoint() {
    var a = VC.airport(state.origin);
    return { x: Math.min(x(a.lon), W - 18), y: y(a.lat) };
  }

  function countriesPath() {
    var d = '';
    window.VC_COUNTRIES.features.forEach(function (f) {
      var polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
      polys.forEach(function (poly) {
        poly.forEach(function (ring) {
          var inside = ring.some(function (p) { return p[0] > LON0 - 5 && p[0] < LON1 + 5 && p[1] < LAT0 + 5 && p[1] > LAT1 - 5; });
          if (!inside) return;
          d += 'M' + ring.map(function (p) { return x(p[0]).toFixed(1) + ',' + y(p[1]).toFixed(1); }).join('L') + 'Z';
        });
      });
    });
    return d;
  }

  function arcPath(o, p) {
    var mx = (o.x + p.x) / 2, my = (o.y + p.y) / 2;
    var dx = p.x - o.x, dy = p.y - o.y, len = Math.sqrt(dx * dx + dy * dy);
    // curva hacia el norte, más alta cuanto más largo el trayecto
    var cx = mx + dy * 0.18, cy = my - Math.abs(dx) * 0.22 - len * 0.05;
    return 'M' + o.x + ',' + o.y + ' Q' + cx.toFixed(1) + ',' + cy.toFixed(1) + ' ' + p.x + ',' + p.y;
  }

  function build() {
    var svg = document.getElementById('ex-map');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var o = originPoint();
    var html = '<path class="ex-land" d="' + countriesPath() + '"/>';
    html += '<g class="ex-arcs">' + DESTS.map(function (c) {
      var a = VC.airport(c);
      return '<path class="ex-arc" data-code="' + c + '" pathLength="1" d="' + arcPath(o, { x: x(a.lon), y: y(a.lat) }) + '"/>';
    }).join('') + '</g>';
    html += '<g class="ex-home" transform="translate(' + o.x + ',' + o.y + ')"><circle r="16" class="ex-home-halo"/><circle r="7"/>' +
      '<text x="-12" y="-16" text-anchor="end">' + VC.airport(state.origin).city + '</text></g>';
    html += '<g class="ex-dots">' + DESTS.map(function (c) {
      var a = VC.airport(c), l = LABEL[c] || [9, 0];
      return '<g class="ex-dot" data-code="' + c + '" transform="translate(' + x(a.lon).toFixed(1) + ',' + y(a.lat).toFixed(1) + ')" tabindex="0" role="button">' +
        '<circle class="ex-pulse" r="6"/><circle class="ex-core" r="5"/>' +
        '<text x="' + l[0] + '" y="' + (l[1] + 4) + '" text-anchor="' + (l[2] || 'start') + '"><tspan class="ex-city">' + a.city + '</tspan>' +
        '<tspan class="ex-price" dx="6"></tspan></text></g>';
    }).join('') + '</g>';
    svg.innerHTML = html;
  }

  function loadPrices() {
    var key = state.origin;
    if (state.prices[key]) return Promise.resolve(state.prices[key]);
    var outDates = [], one = { adt: 1, chd: 0, inf: 0 };
    for (var i = 0; i < 14; i++) outDates.push(addDays(14 + i * 4));
    return Promise.all(DESTS.map(function (c) {
      var backDates = outDates.map(function (d) {
        var p = d.split('-'), dt = new Date(+p[0], +p[1] - 1, +p[2] + 16);
        return iso(dt);
      });
      return Promise.all([
        VC.api.cheapestByDate({ from: key, to: c }, one, 'Y', outDates),
        VC.api.cheapestByDate({ from: c, to: key }, one, 'Y', backDates)
      ]).then(function (r) {
        var out = r[0].reduce(function (a, b) { return b.price < a.price ? b : a; });
        var back = r[1].reduce(function (a, b) { return b.price < a.price ? b : a; });
        return { code: c, price: out.price + back.price, date: out.date, ret: back.date > out.date ? back.date : backDates[0] };
      });
    })).then(function (list) {
      var map = {};
      list.forEach(function (p) { map[p.code] = p; });
      state.prices[key] = map;
      return map;
    });
  }

  function monthly(price) { return (price - 100) / 12; }
  function fits(p) {
    return state.mode === 'total' ? p.price <= state.budget.total : VC.settings.canFinance(p.price) && monthly(p.price) <= state.budget.month;
  }

  function render() {
    var prices = state.prices[state.origin];
    if (!prices) return;
    var b = state.budget[state.mode];
    document.getElementById('ex-amount').textContent = money.format(b) + (state.mode === 'month' ? ' al mes' : '');
    var ok = [];
    DESTS.forEach(function (c) {
      var p = prices[c], yes = fits(p);
      if (yes) ok.push(p);
      var dot = document.querySelector('.ex-dot[data-code="' + c + '"]');
      dot.classList.toggle('is-on', yes);
      dot.querySelector('.ex-price').textContent = state.mode === 'total' ? money.format(p.price) : Math.ceil(monthly(p.price)) + ' €/mes';
      dot.setAttribute('aria-label', VC.airport(c).city + ', ' + money.format(p.price) + ' ida y vuelta' + (yes ? '' : ', fuera de presupuesto'));
      document.querySelector('.ex-arc[data-code="' + c + '"]').classList.toggle('is-on', yes);
    });
    ok.sort(function (a, b) { return a.price - b.price; });
    var count = document.getElementById('ex-count');
    count.textContent = ok.length
      ? (ok.length === 1 ? 'Te llega para 1 destino.' : 'Te llega para ' + ok.length + ' destinos.')
      : 'Todavía no llega para ningún destino. Sube un poco el presupuesto' + (state.mode === 'total' && VC.settings.finOn ? ' o prueba a pagarlo en cuotas.' : '.');
    document.getElementById('ex-list').innerHTML = ok.slice(0, 5).map(function (p) {
      var a = VC.airport(p.code);
      return '<li><button type="button" data-code="' + p.code + '"><span><strong>' + a.city + '</strong><small>' + a.country + '</small></span>' +
        '<span class="ex-li-price">' + (state.mode === 'total'
          ? money.format(p.price)
          : '100 € + 12 × ' + money.format(Math.ceil(monthly(p.price)))) + '</span></button></li>';
    }).join('');
  }

  function setMode(mode) {
    // si la agencia ha desactivado la financiación, no hay modo «cuota al mes»
    if (mode === 'month' && !VC.settings.finOn) {
      mode = 'total';
      document.querySelector('input[name=ex-mode][value=total]').checked = true;
    }
    state.mode = mode;
    var r = document.getElementById('ex-budget'), m = MODES[mode];
    r.min = m.min; r.max = m.max; r.step = m.step; r.value = state.budget[mode];
    r.setAttribute('aria-label', mode === 'total' ? 'Presupuesto total por persona' : 'Cuota mensual');
    document.getElementById('ex-hint').textContent = mode === 'total'
      ? 'Por persona, ida y vuelta, el día más barato de las próximas 8 semanas.'
      : 'Pagando 100 € al reservar y el resto en 12 cuotas sin intereses.';
    render();
  }

  function pick(code) {
    var p = state.prices[state.origin][code];
    VC.app.searchTrip({ trip: 'rt', from: state.origin, to: code, date: p.date, ret: p.ret });
  }

  function start() {
    var section = document.getElementById('explora');
    if (!section || !window.VC_COUNTRIES) return;
    build();
    loadPrices().then(function () { setMode(state.mode); });

    document.getElementById('ex-budget').addEventListener('input', function () {
      state.budget[state.mode] = +this.value;
      render();
    });
    section.querySelectorAll('input[name=ex-mode]').forEach(function (r) {
      r.addEventListener('change', function () { setMode(r.value); });
    });
    document.getElementById('ex-origin').addEventListener('change', function () {
      state.origin = this.value;
      build();
      loadPrices().then(render);
    });
    var svg = document.getElementById('ex-map');
    svg.addEventListener('click', function (e) {
      var dot = e.target.closest('.ex-dot');
      if (dot) pick(dot.dataset.code);
    });
    svg.addEventListener('keydown', function (e) {
      var dot = e.target.closest('.ex-dot');
      if (dot && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(dot.dataset.code); }
    });
    document.getElementById('ex-list').addEventListener('click', function (e) {
      var b = e.target.closest('[data-code]');
      if (b) pick(b.dataset.code);
    });
  }

  VC.explorer = { start: start };
  start();
})();
