/* Selección de asientos sobre el plano del avión (datos simulados). */
(function () {
  var PRICE = { exit: 39, side: 18, middle: 12 };

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  // Configuración de cabina según duración del vuelo y clase
  function layout(seg, cabin) {
    var wide = seg.duration > 300;
    if (cabin === 'C') {
      return wide
        ? { rows: [1, 8], cols: ['A', '|', 'D', 'G', '|', 'K'], exits: [], free: true, name: 'Business, 1-2-1' }
        : { rows: [1, 5], cols: ['A', 'C', '|', 'D', 'F'], exits: [], free: true, name: 'Business, 2-2' };
    }
    return wide
      ? { rows: [10, 40], cols: ['A', 'B', 'C', '|', 'D', 'E', 'F', '|', 'G', 'H', 'K'], exits: [24], free: cabin === 'W', name: 'Fuselaje ancho, 3-3-3' }
      : { rows: [4, 30], cols: ['A', 'B', 'C', '|', 'D', 'E', 'F'], exits: [14, 15], free: cabin === 'W', name: 'Fuselaje estrecho, 3-3' };
  }

  function seatInfo(lay, row, col) {
    var i = lay.cols.indexOf(col);
    var edge = i === 0 || i === lay.cols.length - 1;
    var aisle = lay.cols[i - 1] === '|' || lay.cols[i + 1] === '|';
    var exit = lay.exits.indexOf(row) > -1;
    var kind = exit ? 'exit' : edge || aisle ? 'side' : 'middle';
    return {
      kind: kind,
      label: exit ? 'salida de emergencia' : edge ? 'ventanilla' : aisle ? 'pasillo' : 'centro',
      price: lay.free ? 0 : PRICE[kind]
    };
  }

  function occupied(seg, id) {
    return hash(seg.number + id) % 100 < 56;
  }

  function segKey(li, si) { return li + '-' + si; }

  // Viajeros que ocupan asiento (los bebés van en brazos)
  function seated(booking) {
    return booking.travellers.map(function (t, i) { return { t: t, i: i }; }).filter(function (x) { return x.t.type !== 'inf'; });
  }

  function segments(booking) {
    var list = [];
    booking.offers.forEach(function (o, li) {
      o.segments.forEach(function (s, si) { list.push({ key: segKey(li, si), seg: s }); });
    });
    return list;
  }

  function total(booking) {
    var sum = 0;
    Object.keys(booking.seats).forEach(function (k) {
      Object.keys(booking.seats[k]).forEach(function (t) { sum += booking.seats[k][t].price; });
    });
    return sum;
  }

  function render(container, booking, ui) {
    var segs = segments(booking);
    ui.seg = Math.min(ui.seg || 0, segs.length - 1);
    var cur = segs[ui.seg];
    var people = seated(booking);
    if (ui.who === undefined || !people.some(function (p) { return p.i === ui.who; })) ui.who = people[0].i;
    var lay = layout(cur.seg, booking.cabin);
    var mine = booking.seats[cur.key] || {};
    var takenBy = {};
    Object.keys(mine).forEach(function (t) { takenBy[mine[t].id] = +t; });

    var tabs = segs.length > 1 ? '<div class="seat-tabs" role="tablist">' + segs.map(function (s, i) {
      var done = Object.keys(booking.seats[s.key] || {}).length === people.length;
      return '<button type="button" role="tab" data-seg="' + i + '" aria-selected="' + (i === ui.seg) + '">' +
        (done ? '<svg class="ic"><use href="#i-check"/></svg>' : '') + s.seg.from + ' → ' + s.seg.to + '<small>' + s.seg.number + '</small></button>';
    }).join('') + '</div>' : '';

    var who = '<div class="seat-people">' + people.map(function (p) {
      var s = mine[p.i];
      var name = p.t.name ? p.t.name : 'Viajero ' + (p.i + 1);
      return '<button type="button" data-who="' + p.i + '" aria-pressed="' + (p.i === ui.who) + '"><span>' + name + '</span><strong>' + (s ? s.id : 'Sin asiento') + '</strong></button>';
    }).join('') + '</div>';

    var grid = '';
    for (var r = lay.rows[0]; r <= lay.rows[1]; r++) {
      if (r === 13) continue; // muchas aerolíneas no tienen fila 13
      var exitRow = lay.exits.indexOf(r) > -1;
      grid += '<div class="seat-row' + (exitRow ? ' exit' : '') + '" style="--cols:' + lay.cols.length + '"><span class="row-n">' + r + '</span>';
      lay.cols.forEach(function (c) {
        if (c === '|') { grid += '<span class="aisle"></span>'; return; }
        var id = r + c, info = seatInfo(lay, r, c);
        var occ = occupied(cur.seg, id) && takenBy[id] === undefined;
        var own = takenBy[id];
        var cls = 'seat ' + info.kind + (occ ? ' occ' : '') + (own !== undefined ? ' mine' : '');
        grid += '<button type="button" class="' + cls + '" data-seat="' + id + '"' + (occ ? ' disabled' : '') +
          ' aria-label="Fila ' + r + ', asiento ' + c + ', ' + info.label + (occ ? ', ocupado' : info.price ? ', ' + info.price + ' €' : ', incluido') + '"' +
          (own !== undefined ? ' aria-pressed="true"' : '') + '>' + (own !== undefined ? (people.findIndex(function (p) { return p.i === own; }) + 1) : c) + '</button>';
      });
      grid += '<span class="row-n">' + r + '</span></div>';
    }

    var legend = lay.free
      ? '<li><i class="seat side"></i>Incluido en tu tarifa</li><li><i class="seat occ"></i>Ocupado</li><li><i class="seat mine"></i>Tu elección</li>'
      : '<li><i class="seat middle"></i>Centro ' + PRICE.middle + ' €</li><li><i class="seat side"></i>Ventanilla o pasillo ' + PRICE.side + ' €</li>' +
        '<li><i class="seat exit"></i>Más espacio ' + PRICE.exit + ' €</li><li><i class="seat occ"></i>Ocupado</li>';

    container.innerHTML = '<h3>Elige dónde te sientas</h3>' + tabs + who +
      '<div class="seat-layout"><div class="plane"><div class="plane-nose"><span>' + cur.seg.number + ', ' + lay.name + '</span></div>' +
      '<div class="seat-grid">' + grid + '</div></div><ul class="seat-legend">' + legend + '</ul></div>' +
      '<div class="price-lines"><div><span>Asientos</span><span data-roll="seats">' + (total(booking) ? total(booking) + ' €' : 'Sin coste') + '</span></div></div>' +
      '<div class="booking-actions"><button type="button" class="back-btn" data-back><svg class="ic"><use href="#i-arrow"/></svg>Volver</button>' +
      '<span class="seat-actions"><button type="button" class="link" data-skip-seats>Saltar, me lo asignan gratis al facturar</button>' +
      '<button type="button" class="btn btn-sun" data-next>Ir al pago</button></span></div>';
  }

  // Devuelve true si el clic era del plano de asientos
  function click(e, booking, ui) {
    var segBtn = e.target.closest('[data-seg]');
    var whoBtn = e.target.closest('[data-who]');
    var seatBtn = e.target.closest('[data-seat]');
    if (segBtn) { ui.seg = +segBtn.dataset.seg; ui.who = undefined; return true; }
    if (whoBtn) { ui.who = +whoBtn.dataset.who; return true; }
    if (!seatBtn || seatBtn.disabled) return false;
    {
      var segs = segments(booking), cur = segs[ui.seg];
      var lay = layout(cur.seg, booking.cabin);
      var id = seatBtn.dataset.seat, row = parseInt(id, 10), col = id.replace(/^\d+/, '');
      var map = booking.seats[cur.key] = booking.seats[cur.key] || {};
      // si ese asiento ya era de otro viajero, se lo quitamos
      Object.keys(map).forEach(function (t) { if (map[t].id === id) delete map[t]; });
      map[ui.who] = { id: id, price: seatInfo(lay, row, col).price };
      // pasa al siguiente viajero sin asiento, o al siguiente vuelo
      var people = seated(booking);
      var next = people.filter(function (p) { return !map[p.i]; })[0];
      if (next) ui.who = next.i;
      else if (ui.seg < segs.length - 1) { ui.seg++; ui.who = undefined; }
      return true;
    }
  }

  // Primer asiento elegido del viajero principal, para el billete
  function firstSeat(booking) {
    var segs = segments(booking);
    var map = booking.seats[segs[0].key] || {};
    return map[0] ? map[0].id : null;
  }

  VC.seats = { render: render, click: click, total: total, segments: segments, firstSeat: firstSeat };
})();
