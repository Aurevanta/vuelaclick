/* Panel del agente: reservas, clientes, margen, liquidación con GrupoVDT y ajustes
   de la web (datos simulados). */
(function () {
  'use strict';

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var money = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, useGrouping: 'always' });
  var dayFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });
  var longFmt = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  var CREDIT_LIMIT = 25000; // línea de crédito de la agencia en GrupoVDT (ejemplo)

  // Acceso de demostración. En producción lo valida el backend y nunca vive en el navegador.
  var ADMIN = { email: 'agencia@vuelaclic.com', password: 'juan2026' };

  var NAMES = ['María Fernanda Quispe', 'José Luis Mamani', 'Carmen Rosa Huamán', 'Luis Alberto Torres', 'Ana Lucía Vargas',
    'Pedro Pablo Rojas', 'Rosa Elena Benítez', 'Jorge Andrés Gómez', 'Milagros Paredes', 'Wilmer Choque', 'Yesenia Martínez',
    'Óscar Cárdenas', 'Daniela Ríos', 'Héctor Villalba', 'Gladys Fernández', 'Santiago Ortiz', 'Patricia Medina', 'Kevin Salazar',
    'Lourdes Acosta', 'Franklin Herrera', 'Natalia Cabrera', 'Edwin Ramírez', 'Silvia Gutiérrez', 'Ronald Peralta'];
  var ROUTES = [['MAD', 'LIM'], ['MAD', 'LIM'], ['MAD', 'BOG'], ['BCN', 'LIM'], ['MAD', 'SDQ'], ['MAD', 'UIO'], ['MAD', 'ASU'],
    ['MAD', 'VVI'], ['MAD', 'TGU'], ['MAD', 'GYE'], ['BCN', 'BOG'], ['MAD', 'SJO'], ['MAD', 'EZE'], ['AGP', 'LIM'], ['MAD', 'CUZ']];
  var METHODS = ['card', 'card', 'card', 'bizum', 'bizum', 'fin', 'fin', 'fin', 'transfer'];
  var METHOD_LABEL = { card: 'Tarjeta', bizum: 'Bizum', transfer: 'Transferencia', fin: 'Fliinow' };
  var TYPE_LABEL = { adt: 'Adulto', chd: 'Niño', inf: 'Bebé' };

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
  function fromIso(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function daysAgo(n, h) { var d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, (n * 17) % 60, 0, 0); return d; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function plain(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function city(code) { var a = VC.airport(code); return a ? a.city : code; }
  function icon(id) { return '<svg class="ic" aria-hidden="true"><use href="#i-' + id + '"/></svg>'; }

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
      var name = NAMES[i % NAMES.length];
      var parts = name.split(' ');
      var travellers = [{ type: 'adt', name: parts.slice(0, -1).join(' '), surname: parts[parts.length - 1], docType: r() > 0.5 ? 'NIE' : 'Pasaporte', doc: 'Y' + (1000000 + Math.floor(r() * 8999999)) + 'K' }];
      for (var a = 1; a < pax.adt + pax.chd; a++) {
        travellers.push({ type: a < pax.adt ? 'adt' : 'chd', name: NAMES[(i + a * 7) % NAMES.length].split(' ')[0], surname: parts[parts.length - 1], docType: 'Pasaporte', doc: 'P' + (100000 + Math.floor(r() * 899999)) });
      }
      list.push({
        locator: locator,
        createdAt: created.toISOString(),
        lead: name,
        pax: pax,
        travellers: travellers,
        contact: { email: plain(parts[0] + '.' + parts[parts.length - 1]) + '@ejemplo.com', phone: '+34 6' + String(10000000 + Math.floor(r() * 89999999)).replace(/(\d{2})(\d{3})(\d{3})/, '$1 $2 $3') },
        newsletter: r() > 0.35,
        legs: [
          { from: route[0], to: route[1], date: iso(dep), airline: o1.airline, number: o1.segments[0].number, dep: clock(o1.depMin) },
          { from: route[1], to: route[0], date: iso(ret), airline: o2.airline, number: o2.segments[0].number, dep: clock(o2.depMin) }
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
  function clock(min) { var m = ((min % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }

  var seeded = seedBookings();
  var filter = 'all';
  var clientFilter = 'all';
  var userCount = VC.auth.all().length;

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
    var host = $('#bk-dialog').open ? $('#bk-dialog') : document.body;
    if (t.parentNode !== host) host.appendChild(t);
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
    if (b.status === 'cancelled') return '<span class="chip bad">Cancelada</span>' + (b.refunded ? '<span class="chip ghost">Reembolsada</span>' : '');
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
    return '<strong>' + path.join(' → ') + '</strong><small>' + dayFmt.format(fromIso(l[0].date)).replace('.', '') +
      (l.length === 2 && l[1].to === l[0].from ? ', ida y vuelta' : '') + '</small>';
  }

  function renderTable(list) {
    var q = $('#bk-q').value.trim().toLowerCase();
    var rows = list.filter(function (b) {
      if (filter === 'awaiting' && b.status !== 'awaiting') return false;
      if (filter === 'fin' && b.method !== 'fin') return false;
      if (filter === 'web' && b.source !== 'web') return false;
      var email = b.contact ? b.contact.email.toLowerCase() : '';
      if (q && b.lead.toLowerCase().indexOf(q) < 0 && b.locator.toLowerCase().indexOf(q) < 0 && email.indexOf(q) < 0) return false;
      return true;
    });
    $('#bk-empty').hidden = rows.length > 0;
    $('#bk-body').innerHTML = rows.map(function (b) {
      var created = new Date(b.createdAt);
      var paxN = b.pax.adt + b.pax.chd + b.pax.inf;
      return '<tr class="' + (b.source === 'web' ? 'is-web' : '') + (b.status === 'cancelled' ? ' is-cancelled' : '') + '" data-open="' + b.locator + '">' +
        '<td><span class="loc">' + b.locator + '</span><small>' + dayFmt.format(created).replace('.', '') + ', ' + created.toTimeString().slice(0, 5) + '</small></td>' +
        '<td><strong>' + esc(b.lead) + '</strong><small>' + (paxN === 1 ? '1 viajero' : paxN + ' viajeros') + (b.source === 'web' ? ' <span class="chip web">Web</span>' : '') + '</small></td>' +
        '<td>' + trip(b) + '</td>' +
        '<td>' + payChip(b) + '</td>' +
        '<td>' + statusChip(b) + '</td>' +
        '<td class="num">' + money.format(b.total) + '</td>' +
        '<td class="num muted">' + money.format(b.net) + '</td>' +
        '<td class="num win">' + (b.status === 'cancelled' ? '—' : money.format(b.margin)) + '</td>' +
        '<td class="row-actions">' + (b.status === 'awaiting' ? '<button type="button" class="btn btn-sun btn-sm" data-confirm="' + b.locator + '">Confirmar cobro</button>' : '') +
          '<button type="button" class="link" data-open="' + b.locator + '">Ver ficha</button></td>' +
        '</tr>';
    }).join('');
  }

  // ---------- Ficha de una reserva ----------
  var pendingCancel = null;

  function openBooking(locator) {
    var b = allBookings().filter(function (x) { return x.locator === locator; })[0];
    if (!b) return;
    pendingCancel = null;
    var c = b.contact || { email: '', phone: '' };
    var wa = 'https://wa.me/' + c.phone.replace(/\D/g, '') + '?text=' + encodeURIComponent('Hola ' + b.lead.split(' ')[0] + ', te escribo de VuelaClic por tu reserva ' + b.locator + '.');
    var travellers = b.travellers && b.travellers.length ? b.travellers : [{ type: 'adt', name: b.lead, surname: '', docType: '', doc: '' }];
    var html =
      '<header class="bkd-head"><div><small>Localizador</small><h2 id="bkd-title" class="loc">' + b.locator + '</h2></div>' + statusChip(b) + '</header>' +
      '<p class="bkd-meta">Reservada el ' + longFmt.format(new Date(b.createdAt)).replace(/\./g, '') + ' · ' + (b.source === 'web' ? 'Hecha en la web' + (b.userEmail ? ' con cuenta de cliente' : ' sin cuenta') : 'Hecha en la agencia') + '</p>' +
      '<section><h3>Vuelos</h3><ul class="bkd-legs">' + b.legs.map(function (l) {
        return '<li><span class="bkd-code">' + l.from + ' → ' + l.to + '</span><span>' + esc(city(l.from)) + ' → ' + esc(city(l.to)) + '<small>' +
          longFmt.format(fromIso(l.date)).replace(/\./g, '') + (l.dep ? ', ' + l.dep : '') + ' · ' + esc(l.number) + ' · ' + esc(VC.AIRLINES[l.airline].name) + '</small></span></li>';
      }).join('') + '</ul></section>' +
      '<section><h3>Viajeros</h3><ul class="bkd-pax">' + travellers.map(function (t) {
        return '<li><strong>' + esc((t.name + ' ' + t.surname).trim()) + '</strong><small>' + (TYPE_LABEL[t.type] || '') + (t.doc ? ' · ' + esc(t.docType) + ' ' + esc(t.doc) : '') + '</small></li>';
      }).join('') + '</ul></section>' +
      '<section class="bkd-cols"><div><h3>Contacto</h3><p>' + esc(c.email || 'Sin email') + '<br>' + esc(c.phone || 'Sin teléfono') + '</p>' +
        (c.phone ? '<a class="btn btn-wa btn-sm" href="' + wa + '" target="_blank" rel="noopener">' + icon('whatsapp') + 'Escribir por WhatsApp</a>' : '') + '</div>' +
      '<div><h3>Cobro</h3><dl class="bkd-money">' +
        '<div><dt>Forma de pago</dt><dd>' + payChip(b) + '</dd></div>' +
        '<div><dt>Venta</dt><dd>' + money.format(b.total) + '</dd></div>' +
        '<div><dt>Neto GrupoVDT</dt><dd>' + money.format(b.net) + '</dd></div>' +
        '<div><dt>Tu margen</dt><dd class="win">' + money.format(b.margin) + '</dd></div>' +
        '<div><dt>Liquidado a VDT</dt><dd>' + (b.settled ? 'Sí' : 'No') + '</dd></div>' +
      '</dl></div></section>' +
      '<footer class="bkd-actions">' +
        (b.status === 'awaiting' ? '<button type="button" class="btn btn-sun" data-confirm="' + b.locator + '">Confirmar cobro y emitir</button>' : '') +
        (b.status !== 'cancelled' ? '<button type="button" class="btn btn-danger" data-cancel="' + b.locator + '">' + (b.status === 'awaiting' ? 'Anular reserva' : 'Cancelar y reembolsar') + '</button>' : '') +
        '<p class="fine" id="bkd-note"></p>' +
      '</footer>';
    $('#bkd-body').innerHTML = html;
    if (!$('#bk-dialog').open) $('#bk-dialog').showModal();
  }

  function cancelBooking(locator) {
    var b = allBookings().filter(function (x) { return x.locator === locator; })[0];
    if (pendingCancel !== locator) {
      pendingCancel = locator;
      $('[data-cancel]').textContent = 'Pulsa otra vez para confirmar';
      $('#bkd-note').textContent = b.status === 'awaiting'
        ? 'Se libera la plaza en GrupoVDT. No hay nada que devolver.'
        : 'Se cancela en GrupoVDT y se devuelven ' + money.format(b.total) + ' al cliente por ' + METHOD_LABEL[b.method] + '.' + (b.settled ? ' Como ya lo liquidaste, pide el reembolso a GrupoVDT.' : '');
      return;
    }
    override(locator, { status: 'cancelled', refunded: b.status !== 'awaiting' });
    toast(b.status === 'awaiting' ? 'Reserva ' + locator + ' anulada y plaza liberada.' : 'Reserva ' + locator + ' cancelada. Reembolso de ' + money.format(b.total) + ' en curso (simulado).');
    render();
    openBooking(locator);
  }

  // ---------- Clientes ----------
  function clients(list) {
    var map = {};
    function key(email) { return String(email || '').toLowerCase(); }
    VC.auth.all().forEach(function (u) {
      map[u.email] = { name: u.name + ' ' + u.surname, email: u.email, phone: u.phone, createdAt: u.createdAt, account: true, newsletter: u.newsletter, bookings: [] };
    });
    list.forEach(function (b) {
      var k = key(b.contact && b.contact.email);
      if (!k) return;
      if (!map[k]) {
        map[k] = { name: b.lead, email: k, phone: b.contact.phone, createdAt: b.createdAt, account: false, newsletter: !!b.newsletter, source: b.source, bookings: [] };
      }
      map[k].bookings.push(b);
      if (b.createdAt < map[k].createdAt) map[k].createdAt = b.createdAt;
    });
    return Object.keys(map).map(function (k) {
      var c = map[k];
      c.spent = c.bookings.filter(function (b) { return b.status !== 'cancelled'; }).reduce(function (s, b) { return s + b.total; }, 0);
      c.last = c.bookings.slice().sort(function (a, b) { return b.legs[0].date.localeCompare(a.legs[0].date); })[0] || null;
      return c;
    }).sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); });
  }

  function renderClients(list) {
    var all = clients(list);
    var withAccount = all.filter(function (c) { return c.account; }).length;
    var news = all.filter(function (c) { return c.newsletter; }).length;
    $('#cl-stats').textContent = all.length + ' clientes · ' + withAccount + ' con cuenta en la web · ' + news + ' aceptan ofertas';
    var q = plain($('#cl-q').value.trim());
    var rows = all.filter(function (c) {
      if (clientFilter === 'web' && !c.account) return false;
      if (clientFilter === 'news' && !c.newsletter) return false;
      if (q && plain(c.name + ' ' + c.email + ' ' + (c.phone || '')).indexOf(q) < 0) return false;
      return true;
    });
    $('#cl-empty').hidden = rows.length > 0;
    $('#cl-body').innerHTML = rows.map(function (c) {
      var ini = c.name.split(' ').map(function (p) { return p[0]; }).slice(0, 2).join('').toUpperCase();
      var origin = c.account ? '<span class="chip web">Cuenta web</span>' : c.source === 'web' ? '<span class="chip ghost">Web sin cuenta</span>' : '<span class="chip ghost">Agencia</span>';
      return '<tr>' +
        '<td><span class="cl-name"><span class="cl-avatar" aria-hidden="true">' + esc(ini) + '</span><strong>' + esc(c.name) + '</strong></span></td>' +
        '<td>' + esc(c.email) + '<small>' + esc(c.phone || '') + (c.newsletter ? ' · acepta ofertas' : '') + '</small></td>' +
        '<td>' + dayFmt.format(new Date(c.createdAt)).replace('.', '') + '<small>' + new Date(c.createdAt).getFullYear() + '</small></td>' +
        '<td>' + origin + '</td>' +
        '<td class="num">' + c.bookings.length + '</td>' +
        '<td class="num">' + money.format(c.spent) + '</td>' +
        '<td>' + (c.last ? '<strong>' + c.last.legs[0].from + ' → ' + c.last.legs[0].to + '</strong><small>' + dayFmt.format(fromIso(c.last.legs[0].date)).replace('.', '') + '</small>' : '<span class="muted">Sin viajes</span>') + '</td>' +
        '<td>' + (c.bookings.length ? '<button type="button" class="link" data-client="' + esc(c.email) + '">Ver reservas</button>' : '') + '</td>' +
        '</tr>';
    }).join('');
  }

  function exportClients() {
    var rows = clients(allBookings()).filter(function (c) { return c.newsletter; });
    var csv = ['Nombre;Email;Teléfono;Alta;Reservas;Gastado'].concat(rows.map(function (c) {
      return [c.name, c.email, c.phone || '', c.createdAt.slice(0, 10), c.bookings.length, c.spent].map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(';');
    })).join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'clientes-vuelaclic.csv';
    a.click();
    toast(rows.length + ' clientes exportados.');
  }

  // ---------- Ajustes de la web ----------
  function renderSettings() {
    var s = VC.settings.get();
    var labels = { card: ['Tarjeta', 'Pasarela del banco'], bizum: ['Bizum', 'Solicitud al móvil'], transfer: ['Transferencia', 'Plaza bloqueada 24 h'], fin: ['Financiación', 'Fliinow, 3 a 12 cuotas'] };
    $('#pay-switches').innerHTML = Object.keys(labels).map(function (k) {
      return '<label class="switch"><input type="checkbox" data-pay="' + k + '"' + (s.pay[k] ? ' checked' : '') + '><span class="switch-ui" aria-hidden="true"></span>' +
        '<span><strong>' + labels[k][0] + '</strong><small>' + labels[k][1] + '</small></span></label>';
    }).join('');
    $('#fin-min').value = s.finMin;
    $('#notice-on').checked = s.noticeOn;
    $('#notice-text').value = s.notice;
    renderPreview();
  }

  function renderPreview() {
    var txt = $('#notice-text').value.trim();
    var p = $('#notice-preview');
    p.textContent = txt || 'Escribe un texto para ver cómo queda';
    p.classList.toggle('off', !$('#notice-on').checked || !txt);
  }

  function render() {
    var list = allBookings();
    var owed = renderKpis(list);
    renderChart(list);
    renderMargin();
    renderSettle(owed, list);
    renderTable(list);
    renderClients(list);
  }

  // ---------- Acceso ----------
  function unlock(on) {
    document.body.classList.toggle('is-locked', !on);
    try { if (on) sessionStorage.setItem('vc.adminSession', '1'); else sessionStorage.removeItem('vc.adminSession'); } catch (e) { /* modo privado */ }
  }

  function bindLogin() {
    var f = $('#adm-login-form');
    $('#login-fill').addEventListener('click', function () {
      f.email.value = ADMIN.email;
      f.password.value = ADMIN.password;
      f.querySelector('.login-submit').focus();
    });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = f.email.value.trim().toLowerCase() === ADMIN.email && f.password.value === ADMIN.password;
      $('#login-error').hidden = ok;
      if (!ok) { f.password.select(); return; }
      f.reset();
      unlock(true);
      scrollTo(0, 0);
      toast('Sesión iniciada. Bienvenido, Juan.');
    });
    $('#adm-logout').addEventListener('click', function () {
      unlock(false);
      toast('Has salido del panel.');
    });
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
      $$('#bk-tabs button').forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); });
      renderTable(allBookings());
    });
    $('#bk-q').addEventListener('input', function () { renderTable(allBookings()); });

    function confirmPay(locator) {
      override(locator, { status: 'issued', settled: false });
      toast('Transferencia confirmada. Billete ' + locator + ' emitido en GrupoVDT.');
      render();
    }

    $('#bk-body').addEventListener('click', function (e) {
      var c = e.target.closest('[data-confirm]');
      if (c) { confirmPay(c.dataset.confirm); return; }
      var row = e.target.closest('[data-open]');
      if (row && !e.target.closest('a')) openBooking(row.dataset.open);
    });

    $('#bk-dialog').addEventListener('click', function (e) {
      var dlg = $('#bk-dialog');
      if (e.target === dlg || e.target.closest('#bkd-close')) { dlg.close(); return; }
      var c = e.target.closest('[data-confirm]');
      if (c) { confirmPay(c.dataset.confirm); openBooking(c.dataset.confirm); return; }
      var x = e.target.closest('[data-cancel]');
      if (x) cancelBooking(x.dataset.cancel);
    });

    $('#cl-tabs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-f]');
      if (!b) return;
      clientFilter = b.dataset.f;
      $$('#cl-tabs button').forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); });
      renderClients(allBookings());
    });
    $('#cl-q').addEventListener('input', function () { renderClients(allBookings()); });
    $('#cl-body').addEventListener('click', function (e) {
      var b = e.target.closest('[data-client]');
      if (!b) return;
      filter = 'all';
      $$('#bk-tabs button').forEach(function (x) { x.setAttribute('aria-selected', String(x.dataset.f === 'all')); });
      $('#bk-q').value = b.dataset.client;
      renderTable(allBookings());
      $('#reservas').scrollIntoView({ behavior: 'smooth' });
    });
    $('#cl-export').addEventListener('click', exportClients);

    $('#pay-switches').addEventListener('change', function (e) {
      var k = e.target.dataset.pay;
      if (!k) return;
      var s = VC.settings.get();
      s.pay[k] = e.target.checked;
      if (!Object.keys(s.pay).some(function (m) { return s.pay[m]; })) {
        e.target.checked = true;
        toast('Deja al menos una forma de pago activa.');
        return;
      }
      VC.settings.set({ pay: s.pay });
      toast(e.target.closest('label').querySelector('strong').textContent + (e.target.checked ? ' activada en la web.' : ' desactivada en la web.'));
    });
    $('#fin-min').addEventListener('change', function () {
      var v = Math.max(100, Math.min(2000, Math.round(+this.value / 50) * 50 || 300));
      this.value = v;
      VC.settings.set({ finMin: v });
      toast('La financiación se ofrece desde ' + money.format(v) + '.');
    });
    $('#notice-text').addEventListener('input', renderPreview);
    $('#notice-on').addEventListener('change', renderPreview);
    $('#notice-save').addEventListener('click', function () {
      var on = $('#notice-on').checked, txt = $('#notice-text').value.trim();
      VC.settings.set({ noticeOn: on, notice: txt });
      toast(on && txt ? 'Aviso publicado en la web.' : 'Aviso retirado de la web.');
    });

    $('#reset-demo').addEventListener('click', function () {
      ['bookings', 'admin', 'markup', 'users', 'session', 'settings'].forEach(function (k) {
        try { localStorage.removeItem('vc.' + k); } catch (e) { /* modo privado */ }
      });
      VC.auth.seedDemo().then(function () {
        toast('Demo reiniciada: sin reservas ni clientes de la web, margen al 7 % y ajustes por defecto.');
        render();
        renderSettings();
      });
    });

    // Lo que pase en la web en otra pestaña aparece aquí al momento
    window.addEventListener('storage', function (e) {
      if (e.key === 'vc.bookings') {
        render();
        var latest = VC.store.get('bookings', [])[0];
        if (latest) toast('Nueva reserva en la web: ' + latest.lead + ', ' + money.format(latest.total) + '.');
      }
      if (e.key === 'vc.users') {
        // también cambia al iniciar sesión; solo se avisa si hay una cuenta más
        var n = VC.auth.all().length;
        render();
        if (n > userCount) { var u = VC.auth.all()[0]; toast('Nuevo cliente registrado: ' + u.name + ' ' + u.surname + '.'); }
        userCount = n;
      }
    });
  }

  bindLogin();
  bind();
  render();
  VC.auth.seedDemo().then(function () { userCount = VC.auth.all().length; render(); });
  renderSettings();
})();
