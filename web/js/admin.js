/* Panel del agente: reservas, margen y liquidación con GrupoVDT (datos simulados). */
(function () {
  'use strict';

  var $ = function (s) { return document.querySelector(s); };
  var money = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, useGrouping: 'always' });
  var dayFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });
  var CREDIT_LIMIT = 25000; // línea de crédito de la agencia en GrupoVDT (ejemplo)

  var NAMES = ['María Fernanda Quispe', 'José Luis Mamani', 'Carmen Rosa Huamán', 'Luis Alberto Torres', 'Ana Lucía Vargas',
    'Pedro Pablo Rojas', 'Rosa Elena Benítez', 'Jorge Andrés Gómez', 'Milagros Paredes', 'Wilmer Choque', 'Yesenia Martínez',
    'Óscar Cárdenas', 'Daniela Ríos', 'Héctor Villalba', 'Gladys Fernández', 'Santiago Ortiz', 'Patricia Medina', 'Kevin Salazar',
    'Lourdes Acosta', 'Franklin Herrera', 'Natalia Cabrera', 'Edwin Ramírez', 'Silvia Gutiérrez', 'Ronald Peralta'];
  var ROUTES = [['MAD', 'LIM'], ['MAD', 'LIM'], ['MAD', 'BOG'], ['BCN', 'LIM'], ['MAD', 'SDQ'], ['MAD', 'UIO'], ['MAD', 'ASU'],
    ['MAD', 'VVI'], ['MAD', 'TGU'], ['MAD', 'GYE'], ['BCN', 'BOG'], ['MAD', 'SJO'], ['MAD', 'EZE'], ['AGP', 'LIM'], ['MAD', 'CUZ']];
  var METHODS = ['card', 'card', 'card', 'bizum', 'bizum', 'fin', 'fin', 'fin', 'transfer'];
  var METHOD_LABEL = { card: 'Tarjeta', bizum: 'Bizum', transfer: 'Transferencia', fin: 'Fliinow' };

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function daysAgo(n, h) { var d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, (n * 17) % 60, 0, 0); return d; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // Reservas de ejemplo de las últimas 3 semanas, siempre las mismas
  function seedBookings() {
    var r = rng(20261030);
    var list = [];
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (var i = 0; i < 26; i++) {
      // las dos primeras son transferencias de hoy y de ayer, aún sin cobrar
      var ago = i < 2 ? i : Math.floor(r() * 21);
      var created = daysAgo(ago, 9 + Math.floor(r() * 11));
      var route = ROUTES[Math.floor(r() * ROUTES.length)];
      var dep = new Date(); dep.setDate(dep.getDate() + 15 + Math.floor(r() * 80));
      var ret = new Date(dep); ret.setDate(ret.getDate() + 14 + Math.floor(r() * 21));
      var pax = { adt: 1 + (r() > 0.6 ? 1 : 0), chd: r() > 0.8 ? 1 : 0, inf: 0 };
      var out = VC.simulator.offers({ from: route[0], to: route[1], date: iso(dep) }, pax, 'Y');
      var back = VC.simulator.offers({ from: route[1], to: route[0], date: iso(ret) }, pax, 'Y');
      if (!out.length || !back.length) continue;
      var o1 = out[Math.floor(r() * Math.min(out.length, 4))], o2 = back[Math.floor(r() * Math.min(back.length, 4))];
      var net = o1.price + o2.price;
      var total = Math.round(net * 1.07);
      var method = i < 2 ? 'transfer' : METHODS[Math.floor(r() * METHODS.length)];
      var locator = '';
      for (var k = 0; k < 6; k++) locator += chars[Math.floor(r() * chars.length)];
      list.push({
        locator: locator,
        createdAt: created.toISOString(),
        lead: NAMES[i % NAMES.length],
        pax: pax,
        legs: [
          { from: route[0], to: route[1], date: iso(dep), airline: o1.airline, number: o1.segments[0].number },
          { from: route[1], to: route[0], date: iso(ret), airline: o2.airline, number: o2.segments[0].number }
        ],
        method: method,
        plan: method === 'fin' ? [3, 6, 12][Math.floor(r() * 3)] : null,
        total: total,
        net: net,
        margin: total - net,
        status: method === 'transfer' && ago < 2 ? 'awaiting' : 'issued',
        settled: ago > 6,
        source: 'agency'
      });
    }
    return list;
  }

  var seeded = seedBookings();
  var filter = 'all';

  // Reservas de la web + ejemplo, con los cambios de estado que haya hecho el agente
  function allBookings() {
    var overrides = VC.store.get('admin', {});
    var web = VC.store.get('bookings', []).map(function (b) { return Object.assign({ settled: false }, b); });
    return web.concat(seeded).map(function (b) {
      return Object.assign({}, b, overrides[b.locator] || {});
    }).sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); });
  }

  function override(locator, patch) {
    var o = VC.store.get('admin', {});
    o[locator] = Object.assign(o[locator] || {}, patch);
    VC.store.set('admin', o);
  }

  var toastTimer;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2800);
  }

  function within(b, days) { return (Date.now() - new Date(b.createdAt)) / 864e5 <= days; }

  function renderKpis(list) {
    var month = list.filter(function (b) { return within(b, 30); });
    var sold = month.filter(function (b) { return b.status === 'issued'; });
    var sales = sold.reduce(function (s, b) { return s + b.total; }, 0);
    var margin = sold.reduce(function (s, b) { return s + b.margin; }, 0);
    var owed = list.filter(function (b) { return b.status === 'issued' && !b.settled; }).reduce(function (s, b) { return s + b.net; }, 0);
    var awaiting = list.filter(function (b) { return b.status === 'awaiting'; });
    var fin = sold.filter(function (b) { return b.method === 'fin'; }).reduce(function (s, b) { return s + b.total; }, 0);
    var cards = [
      { label: 'Ventas, 30 días', value: money.format(sales), note: sold.length + ' billetes emitidos' },
      { label: 'Tu margen', value: money.format(margin), note: sales ? (margin / sales * 100).toFixed(1).replace('.', ',') + ' % de lo vendido' : '', tone: 'tone-sun' },
      { label: 'Debes a GrupoVDT', value: money.format(owed), note: 'Billetes emitidos sin liquidar', tone: 'tone-night' },
      { label: 'Por cobrar', value: money.format(awaiting.reduce(function (s, b) { return s + b.total; }, 0)), note: awaiting.length === 1 ? '1 transferencia pendiente' : awaiting.length + ' transferencias pendientes' },
      { label: 'Financiado con Fliinow', value: money.format(fin), note: 'Fliinow te lo abona en 48 h' }
    ];
    $('#kpis').innerHTML = cards.map(function (c) {
      return '<div class="kpi' + (c.tone ? ' ' + c.tone : '') + '"><small>' + c.label + '</small><strong>' + c.value + '</strong><span>' + c.note + '</span></div>';
    }).join('');
    return owed;
  }

  function renderChart(list) {
    var days = [];
    for (var i = 13; i >= 0; i--) {
      var d = daysAgo(i, 12), key = iso(d);
      var dayList = list.filter(function (b) { return b.status === 'issued' && iso(new Date(b.createdAt)) === key; });
      days.push({
        date: d,
        net: dayList.reduce(function (s, b) { return s + b.net; }, 0),
        margin: dayList.reduce(function (s, b) { return s + b.margin; }, 0),
        count: dayList.length
      });
    }
    var max = Math.max.apply(null, days.map(function (d) { return d.net + d.margin; })) || 1;
    $('#chart').innerHTML = days.map(function (d, i) {
      var total = d.net + d.margin;
      var h = total / max * 100, mh = total ? d.margin / total * 100 : 0;
      var label = dayFmt.format(d.date).replace('.', '');
      return '<div class="bar" style="--h:' + h + '%;--i:' + i + '" title="' + label + ': ' + money.format(total) + ' vendidos, ' + money.format(d.margin) + ' de margen">' +
        '<div class="bar-fill">' + (total ? '<span class="bar-margin" style="height:' + mh + '%"></span>' : '') + '</div>' +
        '<small>' + d.date.getDate() + '</small></div>';
    }).join('');
    var sum = days.reduce(function (s, d) { return s + d.net + d.margin; }, 0);
    $('#chart').setAttribute('aria-label', 'Ventas de los últimos 14 días: ' + money.format(sum) + ' en total.');
  }

  function renderMargin() {
    var m = VC.pricing.markup;
    $('#margin-range').value = m;
    $('#margin-out').textContent = String(m).replace('.', ',') + ' %';
    // Ejemplo con un Madrid–Lima del mes que viene
    var d = new Date(); d.setDate(d.getDate() + 35);
    var offers = VC.simulator.offers({ from: 'MAD', to: 'LIM', date: iso(d) }, { adt: 1, chd: 0, inf: 0 }, 'Y');
    var net = Math.min.apply(null, offers.map(function (o) { return o.price; }));
    var sell = VC.pricing.sell(net);
    $('#margin-example').innerHTML =
      '<div><small>GrupoVDT te cobra</small><strong>' + money.format(net) + '</strong></div>' +
      '<div><small>El cliente paga</small><strong>' + money.format(sell) + '</strong></div>' +
      '<div class="win"><small>Ganas</small><strong>' + money.format(sell - net) + '</strong></div>' +
      '<p>Ejemplo: Madrid → Lima, solo ida, un adulto.</p>';
  }

  function renderSettle(owed, list) {
    var count = list.filter(function (b) { return b.status === 'issued' && !b.settled; }).length;
    $('#settle-text').innerHTML = owed
      ? 'Tienes <strong>' + money.format(owed) + '</strong> pendientes de pagar a GrupoVDT por ' + (count === 1 ? '1 billete emitido.' : count + ' billetes emitidos.')
      : 'Estás al día con GrupoVDT. No hay billetes pendientes de liquidar.';
    var used = Math.min(100, owed / CREDIT_LIMIT * 100);
    $('#credit-bar').style.width = used + '%';
    $('#credit-bar').classList.toggle('warn', used > 70);
    $('#credit-text').textContent = 'Crédito usado: ' + money.format(owed) + ' de ' + money.format(CREDIT_LIMIT) + '. Disponible para emitir: ' + money.format(Math.max(0, CREDIT_LIMIT - owed)) + '.';
    $('#settle-btn').disabled = !owed;
  }

  function statusChip(b) {
    if (b.status === 'awaiting') return '<span class="chip warn">Esperando transferencia</span>';
    if (!b.settled) return '<span class="chip ok">Emitido</span><span class="chip ghost">Sin liquidar</span>';
    return '<span class="chip ok">Emitido</span>';
  }

  function payChip(b) {
    return '<span class="pay pay-' + b.method + '">' + METHOD_LABEL[b.method] + (b.plan ? ', ' + b.plan + ' cuotas' : '') + '</span>';
  }

  function trip(b) {
    var l = b.legs;
    var path = [l[0].from].concat(l.map(function (x) { return x.to; }));
    if (l.length === 2 && l[1].to === l[0].from) path = [l[0].from, l[0].to];
    var d = l[0].date.split('-');
    return '<strong>' + path.join(' → ') + '</strong><small>' + dayFmt.format(new Date(+d[0], +d[1] - 1, +d[2])).replace('.', '') +
      (l.length === 2 && l[1].to === l[0].from ? ', ida y vuelta' : '') + '</small>';
  }

  function renderTable(list) {
    var q = $('#bk-q').value.trim().toLowerCase();
    var rows = list.filter(function (b) {
      if (filter === 'awaiting' && b.status !== 'awaiting') return false;
      if (filter === 'fin' && b.method !== 'fin') return false;
      if (filter === 'web' && b.source !== 'web') return false;
      if (q && b.lead.toLowerCase().indexOf(q) < 0 && b.locator.toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    $('#bk-empty').hidden = rows.length > 0;
    $('#bk-body').innerHTML = rows.map(function (b) {
      var created = new Date(b.createdAt);
      var paxN = b.pax.adt + b.pax.chd + b.pax.inf;
      return '<tr' + (b.source === 'web' ? ' class="is-web"' : '') + '>' +
        '<td><span class="loc">' + b.locator + '</span><small>' + dayFmt.format(created).replace('.', '') + ', ' + created.toTimeString().slice(0, 5) + '</small></td>' +
        '<td><strong>' + esc(b.lead) + '</strong><small>' + (paxN === 1 ? '1 viajero' : paxN + ' viajeros') + (b.source === 'web' ? ' <span class="chip web">Web</span>' : '') + '</small></td>' +
        '<td>' + trip(b) + '</td>' +
        '<td>' + payChip(b) + '</td>' +
        '<td>' + statusChip(b) + '</td>' +
        '<td class="num">' + money.format(b.total) + '</td>' +
        '<td class="num muted">' + money.format(b.net) + '</td>' +
        '<td class="num win">' + money.format(b.margin) + '</td>' +
        '<td>' + (b.status === 'awaiting' ? '<button type="button" class="btn btn-sun btn-sm" data-confirm="' + b.locator + '">Confirmar cobro</button>' : '') + '</td>' +
        '</tr>';
    }).join('');
  }

  function render() {
    var list = allBookings();
    var owed = renderKpis(list);
    renderChart(list);
    renderMargin();
    renderSettle(owed, list);
    renderTable(list);
  }

  function bind() {
    $('#sum-date').textContent = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
    var h = new Date().getHours();
    $('#sum-title').textContent = (h < 13 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches') + ', Juan';

    $('#margin-range').addEventListener('input', function () {
      VC.pricing.markup = +this.value;
      renderMargin();
    });
    $('#margin-range').addEventListener('change', function () {
      toast('Margen guardado: la web ya muestra los precios con un ' + String(this.value).replace('.', ',') + ' %.');
    });

    $('#settle-btn').addEventListener('click', function () {
      var list = allBookings().filter(function (b) { return b.status === 'issued' && !b.settled; });
      var sum = list.reduce(function (s, b) { return s + b.net; }, 0);
      list.forEach(function (b) { override(b.locator, { settled: true }); });
      toast('Pago de ' + money.format(sum) + ' enviado a GrupoVDT (simulado).');
      render();
    });

    $('#bk-tabs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-f]');
      if (!b) return;
      filter = b.dataset.f;
      document.querySelectorAll('#bk-tabs button').forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); });
      renderTable(allBookings());
    });
    $('#bk-q').addEventListener('input', function () { renderTable(allBookings()); });

    $('#bk-body').addEventListener('click', function (e) {
      var b = e.target.closest('[data-confirm]');
      if (!b) return;
      override(b.dataset.confirm, { status: 'issued', settled: false });
      toast('Transferencia confirmada. Billete ' + b.dataset.confirm + ' emitido en GrupoVDT.');
      render();
    });

    $('#reset-demo').addEventListener('click', function () {
      ['bookings', 'admin', 'markup'].forEach(function (k) {
        try { localStorage.removeItem('vc.' + k); } catch (e) { /* modo privado */ }
      });
      toast('Demo reiniciada: sin reservas de la web y margen al 7 %.');
      render();
    });

    // Si se hace una reserva en la web en otra pestaña, aparece aquí al momento
    window.addEventListener('storage', function (e) {
      if (e.key === 'vc.bookings') {
        render();
        var latest = VC.store.get('bookings', [])[0];
        if (latest) toast('Nueva reserva en la web: ' + latest.lead + ', ' + money.format(latest.total) + '.');
      }
    });
  }

  bind();
  render();
})();
