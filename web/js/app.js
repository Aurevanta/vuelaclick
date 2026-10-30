/* VuelaClic — interfaz de la demo */
(function () {
  'use strict';

  // ---------- Utilidades ----------
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var moneyFmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, useGrouping: 'always' });
  var centsFmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' });
  var dayFmt = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  var longDayFmt = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  function money(n) { return moneyFmt.format(n); }
  function cents(n) { return centsFmt.format(n); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function icon(id) { return '<svg class="ic" aria-hidden="true"><use href="#i-' + id + '"/></svg>'; }

  function iso(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function fromIso(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(s, n) { var d = fromIso(s); d.setDate(d.getDate() + n); return iso(d); }
  function today() { return iso(new Date()); }
  function shortDay(s) { return dayFmt.format(fromIso(s)).replace('.', ''); }
  function clock(min) { var m = ((min % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
  function dur(min) { var h = Math.floor(min / 60), m = min % 60; return h ? h + ' h' + (m ? ' ' + m + ' min' : '') : m + ' min'; }
  function city(code) { return VC.airport(code).city; }
  function norm(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function reducedMotion() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  var toastTimer;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }

  // ---------- Estado ----------
  var form = {
    trip: 'rt',
    legs: [{ from: 'MAD', to: 'LIM', date: addDays(today(), 30), ret: addDays(today(), 51) }],
    pax: { adt: 1, chd: 0, inf: 0 },
    cabin: 'Y'
  };
  var search = null; // búsqueda en curso o mostrada

  function paxCount(p) { return p.adt + p.chd + p.inf; }
  function paxText(p) {
    var parts = [plural(p.adt, 'adulto', 'adultos')];
    if (p.chd) parts.push(plural(p.chd, 'niño', 'niños'));
    if (p.inf) parts.push(plural(p.inf, 'bebé', 'bebés'));
    return parts.join(', ');
  }

  // Convierte el formulario en los tramos que se envían al proveedor
  function legsForSearch() {
    var l = form.legs;
    if (form.trip === 'rt') return [{ from: l[0].from, to: l[0].to, date: l[0].date }, { from: l[0].to, to: l[0].from, date: l[0].ret }];
    if (form.trip === 'ow') return [{ from: l[0].from, to: l[0].to, date: l[0].date }];
    return l.map(function (x) { return { from: x.from, to: x.to, date: x.date }; });
  }

  // ---------- Panel de salidas (split-flap) ----------
  var FLAP_CHARS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:€';
  var BOARD_LEN = [5, 10, 6, 5];
  var boardPool = ['LIM', 'BOG', 'SDQ', 'UIO', 'ASU', 'VVI', 'SCL', 'EZE', 'SJO', 'MEX', 'GYE', 'PUJ', 'CUN', 'MIA', 'PTY', 'TGU'];
  var boardCursor = 0;

  function boardEntry(code) {
    var ap = VC.airport(code);
    var opts = VC.simulator.cheapestByDate({ from: 'MAD', to: code }, { adt: 1, chd: 0, inf: 0 }, 'Y', [addDays(today(), 40)]);
    var price = VC.pricing.sell(opts[0].price);
    var carriers = ['IB', 'UX', 'PU', 'LA', 'AV', 'CM'];
    var c = carriers[(code.charCodeAt(0) + code.charCodeAt(2)) % carriers.length];
    var t = 360 + ((code.charCodeAt(1) * 37) % 960);
    var name = norm(ap.city).toUpperCase().replace(/[^A-Z ]/g, '');
    return [clock(Math.round(t / 5) * 5), name, c + (1000 + (code.charCodeAt(0) * 53 + code.charCodeAt(1) * 7) % 8999), price + '€'];
  }

  function pad(text, len, right) {
    text = text.slice(0, len);
    while (text.length < len) text = right ? ' ' + text : text + ' ';
    return text;
  }

  function buildBoard() {
    var rows = $('#board-rows');
    rows.innerHTML = '';
    for (var r = 0; r < 5; r++) {
      var row = document.createElement('div');
      row.className = 'board-row';
      BOARD_LEN.forEach(function (len, col) {
        var g = document.createElement('div');
        g.className = 'flaps' + (col === 3 ? ' price' : '');
        for (var i = 0; i < len; i++) {
          var f = document.createElement('span');
          f.className = 'flap';
          f.textContent = ' ';
          g.appendChild(f);
        }
        row.appendChild(g);
      });
      rows.appendChild(row);
      setBoardRow(row, boardEntry(boardPool[boardCursor++ % boardPool.length]), r * 180);
    }
    var label = document.createElement('p');
    label.className = 'sr-only';
    rows.appendChild(label);
  }

  function setBoardRow(row, entry, startDelay) {
    var groups = row.querySelectorAll('.flaps');
    var animate = !reducedMotion();
    entry.forEach(function (value, col) {
      var target = pad(value, BOARD_LEN[col], col === 3);
      var flaps = groups[col].children;
      for (var i = 0; i < flaps.length; i++) {
        (function (flap, ch, idx) {
          if (!animate) { flap.textContent = ch; return; }
          var spins = 3 + (idx % 4) + col;
          var n = 0;
          setTimeout(function tick() {
            flap.classList.remove('flip');
            void flap.offsetWidth;
            flap.classList.add('flip');
            if (n < spins) {
              flap.textContent = FLAP_CHARS[Math.floor(Math.random() * FLAP_CHARS.length)];
              n++;
              setTimeout(tick, 70);
            } else {
              flap.textContent = ch;
            }
          }, (startDelay || 0) + idx * 25);
        })(flaps[i], target[i], i);
      }
    });
    row.setAttribute('aria-label', entry[1].trim() + ', ' + entry[0] + ', desde ' + entry[3]);
  }

  function startBoard() {
    buildBoard();
    var rowIndex = 0;
    function tickClock() {
      $('#board-clock').textContent = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' }).format(new Date());
    }
    tickClock();
    setInterval(tickClock, 15000);
    if (reducedMotion()) return;
    setInterval(function () {
      if (document.hidden) return;
      var rows = $$('#board-rows .board-row');
      var row = rows[rowIndex++ % rows.length];
      rows.forEach(function (r) { r.classList.remove('is-new'); });
      row.classList.add('is-new');
      setBoardRow(row, boardEntry(boardPool[boardCursor++ % boardPool.length]), 0);
    }, 3200);
  }

  // ---------- Buscador ----------
  function airportField(legIdx, key) {
    var code = form.legs[legIdx][key];
    var ap = code && VC.airport(code);
    var isFrom = key === 'from';
    return '<div class="field ac" data-leg="' + legIdx + '" data-key="' + key + '">' +
      icon(isFrom ? 'takeoff' : 'landing') +
      '<label class="field-text"><small>' + (isFrom ? 'Origen' : 'Destino') + '</small>' +
      '<input type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" autocomplete="off" spellcheck="false" ' +
      'placeholder="Ciudad o aeropuerto" value="' + (ap ? esc(ap.city) : '') + '"></label>' +
      (ap ? '<span class="code-chip">' + ap.code + '</span>' : '') +
      '</div>';
  }

  function dateField(legIdx, key, label) {
    var min = key === 'ret' ? form.legs[legIdx].date : (legIdx > 0 ? form.legs[legIdx - 1].date : today());
    return '<label class="field date">' + icon('cal') +
      '<span class="field-text"><small>' + label + '</small>' +
      '<input type="date" data-leg="' + legIdx + '" data-key="' + key + '" min="' + min + '" value="' + form.legs[legIdx][key] + '"></span></label>';
  }

  function renderLegs() {
    var html = '';
    form.legs.forEach(function (leg, i) {
      var cls = 'leg' + (form.trip === 'rt' ? '' : ' single-date');
      html += '<div class="' + cls + '">';
      if (form.trip === 'md') html += '<div class="leg-label">Tramo ' + (i + 1) + '</div>';
      html += airportField(i, 'from');
      html += '<button type="button" class="swap" data-leg="' + i + '" aria-label="Intercambiar origen y destino">' + icon('swap') + '</button>';
      html += airportField(i, 'to');
      if (form.trip === 'rt') html += '<div class="date-pair">' + dateField(i, 'date', 'Ida') + dateField(i, 'ret', 'Vuelta') + '</div>';
      else html += dateField(i, 'date', 'Fecha');
      html += '<button type="button" class="leg-remove" data-leg="' + i + '" aria-label="Quitar tramo ' + (i + 1) + '"' +
        (form.trip !== 'md' || form.legs.length <= 2 ? ' disabled' : '') + '>' + icon('close') + '</button>';
      html += '</div>';
    });
    $('#legs').innerHTML = html;
    $('#add-leg').hidden = form.trip !== 'md' || form.legs.length >= 4;
  }

  function setTrip(trip) {
    form.trip = trip;
    if (trip === 'md' && form.legs.length < 2) {
      var a = form.legs[0];
      form.legs.push({ from: a.to, to: '', date: addDays(a.date, 7) });
    }
    if (trip !== 'md') form.legs = form.legs.slice(0, 1);
    if (!form.legs[0].ret || form.legs[0].ret < form.legs[0].date) form.legs[0].ret = addDays(form.legs[0].date, 14);
    renderLegs();
  }

  // Autocompletado
  var ac = { field: null, items: [], active: -1 };

  function acOpen(field) {
    acClose();
    ac.field = field;
    var input = $('input', field);
    var list = document.createElement('ul');
    list.className = 'ac-list';
    list.id = 'ac-list';
    list.setAttribute('role', 'listbox');
    field.appendChild(list);
    input.setAttribute('aria-expanded', 'true');
    input.setAttribute('aria-controls', 'ac-list');
    acFilter('');
  }

  function acFilter(q) {
    if (!ac.field) return;
    var nq = norm(q.trim());
    var other = form.legs[+ac.field.dataset.leg][ac.field.dataset.key === 'from' ? 'to' : 'from'];
    ac.items = VC.AIRPORTS.filter(function (a) {
      if (a.code === other) return false;
      if (!nq) return true;
      return norm(a.city).indexOf(nq) === 0 || a.code.toLowerCase() === nq || norm(a.name).indexOf(nq) > -1 || norm(a.country).indexOf(nq) === 0;
    }).slice(0, 8);
    ac.active = ac.items.length ? 0 : -1;
    acRender();
  }

  function acRender() {
    var list = $('.ac-list', ac.field);
    if (!ac.items.length) {
      list.innerHTML = '<li class="ac-empty">No volamos a ese destino todavía. Escríbenos por WhatsApp y lo buscamos.</li>';
      return;
    }
    list.innerHTML = ac.items.map(function (a, i) {
      return '<li role="option" id="ac-' + i + '" data-code="' + a.code + '" aria-selected="' + (i === ac.active) + '">' +
        '<span class="code-chip">' + a.code + '</span>' +
        '<span><span class="ac-city">' + esc(a.city) + '</span><span class="ac-name">' + esc(a.name) + ', ' + esc(a.country) + '</span></span>' +
        '</li>';
    }).join('');
    $('input', ac.field).setAttribute('aria-activedescendant', ac.active > -1 ? 'ac-' + ac.active : '');
  }

  function acPick(code) {
    var field = ac.field;
    form.legs[+field.dataset.leg][field.dataset.key] = code;
    // en multidestino, el siguiente tramo sale desde donde termina este
    var li = +field.dataset.leg;
    if (form.trip === 'md' && field.dataset.key === 'to' && form.legs[li + 1] && !form.legs[li + 1].from) form.legs[li + 1].from = code;
    acClose();
    renderLegs();
    var next = field.dataset.key === 'from'
      ? $('.ac[data-leg="' + li + '"][data-key="to"] input')
      : $('input[type=date][data-leg="' + li + '"]');
    if (next && field.dataset.key === 'from' && !form.legs[li].to) next.focus();
  }

  function acClose() {
    if (!ac.field) return;
    var list = $('.ac-list', ac.field);
    if (list) list.remove();
    var input = $('input', ac.field);
    input.setAttribute('aria-expanded', 'false');
    var code = form.legs[+ac.field.dataset.leg][ac.field.dataset.key];
    input.value = code ? VC.airport(code).city : '';
    ac.field = null;
  }

  function bindSearchForm() {
    var legs = $('#legs');

    $$('input[name=trip]').forEach(function (r) {
      r.addEventListener('change', function () { setTrip(r.value); });
    });

    legs.addEventListener('focusin', function (e) {
      var field = e.target.closest('.ac');
      if (field && e.target.matches('input') && ac.field !== field) {
        acOpen(field);
        e.target.select();
      }
    });
    legs.addEventListener('input', function (e) {
      if (e.target.closest('.ac')) acFilter(e.target.value);
    });
    legs.addEventListener('keydown', function (e) {
      if (!ac.field || !e.target.closest('.ac')) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!ac.items.length) return;
        ac.active = (ac.active + (e.key === 'ArrowDown' ? 1 : -1) + ac.items.length) % ac.items.length;
        acRender();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (ac.active > -1) acPick(ac.items[ac.active].code);
      } else if (e.key === 'Escape') {
        acClose();
      }
    });
    legs.addEventListener('mousedown', function (e) {
      var li = e.target.closest('.ac-list li[data-code]');
      if (li) { e.preventDefault(); acPick(li.dataset.code); }
    });
    legs.addEventListener('focusout', function (e) {
      if (ac.field && !ac.field.contains(e.relatedTarget)) {
        // si escribió un código exacto o la única coincidencia, lo damos por bueno
        var typed = e.target.value && norm(e.target.value.trim());
        if (typed && ac.items.length === 1) { acPick(ac.items[0].code); return; }
        acClose();
      }
    });

    legs.addEventListener('change', function (e) {
      var t = e.target;
      if (t.type !== 'date' || !t.value) return;
      var i = +t.dataset.leg;
      form.legs[i][t.dataset.key] = t.value;
      if (t.dataset.key === 'date' && form.legs[i].ret && form.legs[i].ret < t.value) form.legs[i].ret = addDays(t.value, 7);
      for (var k = i + 1; k < form.legs.length; k++) {
        if (form.legs[k].date < form.legs[k - 1].date) form.legs[k].date = form.legs[k - 1].date;
      }
      renderLegs();
    });

    legs.addEventListener('click', function (e) {
      var swap = e.target.closest('.swap');
      if (swap) {
        var leg = form.legs[+swap.dataset.leg];
        var tmp = leg.from; leg.from = leg.to; leg.to = tmp;
        renderLegs();
        var btn = $('.swap[data-leg="' + swap.dataset.leg + '"]');
        btn.classList.add('spin');
        btn.focus();
        return;
      }
      var rm = e.target.closest('.leg-remove');
      if (rm && !rm.disabled) {
        form.legs.splice(+rm.dataset.leg, 1);
        renderLegs();
      }
    });

    $('#add-leg').addEventListener('click', function () {
      var last = form.legs[form.legs.length - 1];
      form.legs.push({ from: last.to, to: '', date: addDays(last.date, 5) });
      renderLegs();
      var inputs = $$('.ac[data-key="to"] input');
      inputs[inputs.length - 1].focus();
    });

    // Viajeros
    var pop = $('#pax-pop'), btn = $('#pax-btn');
    function togglePax(open) {
      pop.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      if (open) renderPax();
    }
    btn.addEventListener('click', function () { togglePax(pop.hidden); });
    $('#pax-done').addEventListener('click', function () { togglePax(false); btn.focus(); });
    document.addEventListener('click', function (e) {
      if (!pop.hidden && !e.target.closest('.pax-field')) togglePax(false);
    });
    pop.addEventListener('keydown', function (e) { if (e.key === 'Escape') { togglePax(false); btn.focus(); } });
    pop.addEventListener('click', function (e) {
      var s = e.target.closest('[data-step]');
      if (!s) return;
      var type = s.closest('.pax-row').dataset.type;
      form.pax[type] += +s.dataset.step;
      renderPax();
    });
    $$('input[name=cabin]').forEach(function (r) {
      r.addEventListener('change', function () { form.cabin = r.value; renderPax(); });
    });

    $('#search-form').addEventListener('submit', function (e) {
      e.preventDefault();
      togglePax(false);
      var err = validate();
      var box = $('#form-error');
      box.hidden = !err;
      box.textContent = err || '';
      if (!err) runSearch();
    });
  }

  function renderPax() {
    var p = form.pax;
    // límites habituales de las aerolíneas: máx. 9 plazas y un bebé por adulto
    if (p.inf > p.adt) p.inf = p.adt;
    $$('#pax-pop .pax-row').forEach(function (row) {
      var t = row.dataset.type, v = p[t];
      $('output', row).textContent = v;
      var seats = p.adt + p.chd;
      $('[data-step="-1"]', row).disabled = t === 'adt' ? v <= 1 : v <= 0;
      $('[data-step="1"]', row).disabled = t === 'inf' ? v >= p.adt : seats >= 9;
    });
    $('#pax-summary').textContent = paxText(p) + ', ' + VC.CABINS[form.cabin].label;
  }

  function validate() {
    for (var i = 0; i < form.legs.length; i++) {
      var l = form.legs[i];
      if (!l.from || !l.to) return form.trip === 'md' ? 'Elige origen y destino del tramo ' + (i + 1) + '.' : 'Elige de dónde sales y a dónde vas.';
      if (l.from === l.to) return 'El origen y el destino tienen que ser distintos.';
      if (!l.date || l.date < today()) return 'Elige una fecha de ida a partir de hoy.';
      if (form.trip === 'rt' && (!l.ret || l.ret < l.date)) return 'La vuelta tiene que ser el mismo día de la ida o después.';
    }
    return null;
  }

  // ---------- Resultados ----------
  var LOADING_LINES = [
    'Consultando Iberia, Air Europa y Plus Ultra…',
    'Comparando tarifas de LATAM, Avianca y Copa…',
    'Revisando escalas por Ámsterdam y París…',
    'Calculando equipaje y precio final…'
  ];

  // prefs: preferencias que se mantienen en todos los tramos (p. ej. «directo» dicho al asistente)
  function newFilters(prefs) {
    return { stops: prefs && prefs.direct ? [0] : [], times: [], airlines: [], bags: !!(prefs && prefs.bags) };
  }

  function routePath(legs) {
    if (form.trip === 'rt') return [legs[0].from, legs[0].to];
    return [legs[0].from].concat(legs.map(function (l) { return l.to; }));
  }

  function runSearch(keepLeg, prefs) {
    var legs = legsForSearch();
    var params = { legs: legs, pax: Object.assign({}, form.pax), cabin: form.cabin };
    var prev = search;
    prefs = prefs || (keepLeg && prev ? prev.prefs : {});
    search = {
      params: params,
      result: null,
      active: keepLeg && prev ? Math.min(prev.active, legs.length - 1) : 0,
      selected: legs.map(function () { return null; }),
      sort: 'best',
      prefs: prefs,
      budget: prefs.budget || null,
      filters: newFilters(prefs),
      open: {}
    };
    if (VC.routeGlobe) VC.routeGlobe.search(routePath(legs));
    var token = search;

    var section = $('#resultados');
    section.hidden = false;
    renderHead();
    renderLegTabs();
    renderFareCal();
    renderSelection();
    $('#offer-list').innerHTML = '';
    $('#empty').hidden = true;
    $('#loading').hidden = false;
    var line = 0;
    $('#loading-text').textContent = LOADING_LINES[0];
    var cycle = setInterval(function () { $('#loading-text').textContent = LOADING_LINES[++line % LOADING_LINES.length]; }, 650);
    if (!keepLeg) section.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' });

    VC.api.search(params).then(function (res) {
      if (search !== token) return;
      clearInterval(cycle);
      search.result = res;
      $('#loading').hidden = true;
      renderLegTabs();
      renderFilters();
      renderOffers();
      showLegOnGlobe();
    }).catch(function (err) {
      clearInterval(cycle);
      $('#loading').hidden = true;
      $('#empty').hidden = false;
      $('#empty h3').textContent = 'No hemos podido consultar los vuelos';
      $('#empty p').textContent = err.message + '. Vuelve a intentarlo en unos segundos.';
    });
  }

  function legName(i, n) {
    if (form.trip === 'rt' && n === 2) return i === 0 ? 'Ida' : 'Vuelta';
    if (n === 1) return 'Ida';
    return 'Tramo ' + (i + 1);
  }

  function renderHead() {
    var legs = search.params.legs;
    var path = form.trip === 'rt' ? [legs[0].from, legs[0].to] : [legs[0].from].concat(legs.map(function (l) { return l.to; }));
    $('#results-title').textContent = path.map(city).join(' → ');
    var dates = form.trip === 'rt' ? shortDay(legs[0].date) + ' – ' + shortDay(legs[1].date) : legs.map(function (l) { return shortDay(l.date); }).join(', ');
    $('#results-sub').textContent = dates + '. ' + paxText(search.params.pax) + ', ' + VC.CABINS[search.params.cabin].label + '.';
  }

  function renderLegTabs() {
    var legs = search.params.legs;
    var box = $('#leg-tabs');
    box.hidden = legs.length < 2;
    box.innerHTML = legs.map(function (l, i) {
      var done = search.selected[i];
      return '<button type="button" class="leg-tab" role="tab" data-leg="' + i + '" aria-selected="' + (i === search.active) + '">' +
        (done ? '<span class="done">' + icon('check') + '</span>' : '') +
        '<span>' + legName(i, legs.length) + '</span>' +
        '<small>' + l.from + ' → ' + l.to + ', ' + shortDay(l.date) + '</small></button>';
    }).join('');
  }

  function renderFareCal() {
    var leg = search.params.legs[search.active];
    var minDate = search.active > 0 ? search.params.legs[search.active - 1].date : today();
    var maxDate = search.active < search.params.legs.length - 1 ? search.params.legs[search.active + 1].date : null;
    var start = addDays(leg.date, -3);
    if (start < minDate) start = minDate;
    var dates = [];
    for (var i = 0; i < 7; i++) dates.push(addDays(start, i));
    var box = $('#fare-cal');
    box.innerHTML = dates.map(function (d) {
      return '<button type="button" class="fare-day skeleton" data-date="' + d + '"' + (d === leg.date ? ' aria-current="date"' : '') +
        (maxDate && d > maxDate ? ' disabled' : '') + '><small>' + shortDay(d) + '</small><strong>0000 €</strong></button>';
    }).join('');
    var token = search;
    VC.api.cheapestByDate(leg, search.params.pax, search.params.cabin, dates).then(function (rows) {
      if (search !== token) return;
      var prices = rows.map(function (r) { return r.price; }).filter(Boolean);
      var lo = Math.min.apply(null, prices), hi = Math.max.apply(null, prices);
      rows.forEach(function (r) {
        var b = $('.fare-day[data-date="' + r.date + '"]', box);
        b.classList.remove('skeleton');
        $('strong', b).textContent = r.price ? money(r.price) : '—';
        var k = hi === lo ? 0 : (r.price - lo) / (hi - lo);
        b.dataset.tone = k < 0.34 ? 'cheap' : k < 0.67 ? 'mid' : 'dear';
        b.setAttribute('aria-label', longDayFmt.format(fromIso(r.date)) + ', desde ' + money(r.price));
      });
    });
  }

  function currentOffers() {
    return search && search.result ? search.result.legs[search.active].offers : [];
  }

  function offerPath(o) { return o.segments.map(function (s) { return s.from; }).concat(o.segments[o.segments.length - 1].to); }

  function offerNote(o) {
    return VC.AIRLINES[o.airline].name + ', ' + (o.stops ? plural(o.stops, 'escala', 'escalas') + ' en ' + o.via.map(city).join(' y ') : 'directo') + ', ' + dur(o.duration);
  }

  // Globo: la ruta del tramo activo, o el vuelo elegido si ya hay uno
  function showLegOnGlobe() {
    if (!VC.routeGlobe || !search || !search.result) return;
    var sel = search.selected[search.active];
    if (sel) { VC.routeGlobe.show(offerPath(sel), offerNote(sel)); return; }
    var leg = search.params.legs[search.active];
    var n = applyFilters(currentOffers()).length;
    VC.routeGlobe.show([leg.from, leg.to], plural(n, 'vuelo encontrado', 'vuelos encontrados'));
  }

  // Presupuesto por persona para el viaje completo: lo que queda tras los demás tramos
  function budgetLimit() {
    if (!search.budget || !search.result) return Infinity;
    var other = 0;
    search.result.legs.forEach(function (leg, i) {
      if (i === search.active) return;
      var sel = search.selected[i];
      other += sel ? sel.pricePerAdult : Math.min.apply(null, leg.offers.map(function (o) { return o.pricePerAdult; }));
    });
    return search.budget - other;
  }

  function bucket(min) { return Math.floor((((min % 1440) + 1440) % 1440) / 360); }

  function applyFilters(offers) {
    var f = search.filters;
    var limit = budgetLimit();
    return offers.filter(function (o) {
      if (o.pricePerAdult > limit) return false;
      if (f.stops.length && f.stops.indexOf(Math.min(o.stops, 2)) < 0) return false;
      if (f.times.length && f.times.indexOf(bucket(o.depMin)) < 0) return false;
      if (f.airlines.length && f.airlines.indexOf(o.airline) < 0) return false;
      if (f.bags && !o.bags.checked) return false;
      return true;
    });
  }

  function scored(offers) {
    if (!offers.length) return [];
    var minP = Math.min.apply(null, offers.map(function (o) { return o.price; }));
    var minD = Math.min.apply(null, offers.map(function (o) { return o.duration; }));
    return offers.map(function (o) {
      return { o: o, score: o.price / minP + 0.6 * o.duration / minD + 0.12 * o.stops + (o.bags.checked ? 0 : 0.08) };
    });
  }

  function sortOffers(offers, mode) {
    var list = offers.slice();
    if (mode === 'price') list.sort(function (a, b) { return a.price - b.price || a.duration - b.duration; });
    else if (mode === 'fast') list.sort(function (a, b) { return a.duration - b.duration || a.price - b.price; });
    else list = scored(list).sort(function (a, b) { return a.score - b.score; }).map(function (x) { return x.o; });
    return list;
  }

  function renderFilters() {
    var offers = currentOffers();
    var f = search.filters;
    $('#f-budget').innerHTML = search.budget
      ? '<span class="budget-chip">Hasta ' + money(search.budget) + ' por persona<button type="button" id="budget-clear" aria-label="Quitar presupuesto">' + icon('close') + '</button></span>'
      : '';
    var stopNames = ['Directo', '1 escala', '2 escalas'];
    var stops = [0, 1, 2].map(function (s) {
      var group = offers.filter(function (o) { return Math.min(o.stops, 2) === s; });
      if (!group.length) return '';
      var min = Math.min.apply(null, group.map(function (o) { return o.price; }));
      return '<label class="check"><input type="checkbox" data-f="stops" value="' + s + '"' + (f.stops.indexOf(s) > -1 ? ' checked' : '') + '>' +
        '<span>' + stopNames[s] + '</span><span class="count">' + money(min) + '</span></label>';
    }).join('');
    $('#f-stops').innerHTML = stops;

    var counts = {};
    offers.forEach(function (o) { counts[o.airline] = (counts[o.airline] || 0) + 1; });
    $('#f-airlines').innerHTML = Object.keys(counts).sort(function (a, b) { return VC.AIRLINES[a].name.localeCompare(VC.AIRLINES[b].name); }).map(function (code) {
      var al = VC.AIRLINES[code];
      return '<label class="check"><input type="checkbox" data-f="airlines" value="' + code + '"' + (f.airlines.indexOf(code) > -1 ? ' checked' : '') + '>' +
        '<span class="al-dot" style="--al:' + al.color + '"></span><span>' + esc(al.name) + '</span><span class="count">' + counts[code] + '</span></label>';
    }).join('');

    $$('#f-time input').forEach(function (i) { i.checked = f.times.indexOf(+i.value) > -1; });
    $('#f-bags').checked = f.bags;
  }

  function bindFilters() {
    $('#filters').addEventListener('change', function (e) {
      var t = e.target;
      if (!search) return;
      var f = search.filters;
      if (t.id === 'f-bags') f.bags = t.checked;
      else {
        var key = t.dataset.f || 'times';
        var val = key === 'airlines' ? t.value : +t.value;
        var arr = f[key];
        var at = arr.indexOf(val);
        if (t.checked && at < 0) arr.push(val);
        if (!t.checked && at > -1) arr.splice(at, 1);
      }
      renderOffers();
    });
    function clear() {
      if (!search) return;
      search.filters = newFilters();
      search.prefs = {};
      search.budget = null;
      renderFilters();
      renderOffers();
    }
    $('#clear-filters').addEventListener('click', clear);
    $('#empty-clear').addEventListener('click', clear);
    $('#filters').addEventListener('click', function (e) {
      if (!e.target.closest('#budget-clear') || !search) return;
      search.budget = null;
      search.prefs.budget = null;
      renderFilters();
      renderOffers();
    });
    $('#filters-toggle').addEventListener('click', function () {
      var open = $('#filters').classList.toggle('open');
      this.setAttribute('aria-expanded', String(open));
    });
  }

  function bagsHtml(b) {
    var note = b.checked === 2 ? '2 maletas de 23 kg incluidas' : b.checked ? 'Maleta de 23 kg incluida' : 'Sin maleta facturada';
    return '<span class="bags">' +
      '<span class="bag" title="Mochila o bolso">' + icon('backpack') + '</span>' +
      '<span class="bag' + (b.cabin ? '' : ' off') + '" title="Maleta de cabina 10 kg">' + icon('cabin') + '</span>' +
      '<span class="bag' + (b.checked ? '' : ' off') + '" title="Maleta facturada 23 kg">' + icon('suitcase') + '</span>' +
      '</span><span class="bag-note">' + note + '</span>';
  }

  function stopsText(o) {
    if (!o.stops) return '<span class="direct">Directo</span>';
    var names = o.via.map(city);
    return o.stops === 1 ? '1 escala en ' + esc(names[0]) : '2 escalas: ' + esc(names.join(' y '));
  }

  function detailsHtml(o) {
    var html = '';
    o.segments.forEach(function (s, i) {
      if (i > 0) {
        var wait = s.depMin - o.segments[i - 1].arrMin;
        html += '<div class="layover">Escala en ' + esc(city(s.from)) + ': ' + dur(wait) + '</div>';
      }
      var al = VC.AIRLINES[s.carrier];
      html += '<div class="seg"><time>' + clock(s.depMin) + '</time><p><strong>' + esc(city(s.from)) + ' (' + s.from + ')</strong><br>' +
        esc(al.name) + ', vuelo ' + s.number + ', ' + dur(s.duration) + '</p></div>' +
        '<div class="seg"><time>' + clock(s.arrMin) + '</time><p><strong>' + esc(city(s.to)) + ' (' + s.to + ')</strong>' +
        (Math.floor(s.arrMin / 1440) > 0 ? '<br>Llegada al día siguiente' : '') + '</p></div>';
    });
    html += '<p class="fine">' + (o.refundable ? 'Tarifa con cambios y reembolso con penalización.' : 'Tarifa no reembolsable. Cambios con cargo.') + '</p>';
    return html;
  }

  function finText(price) {
    if (price < 300) return '';
    return 'o 100 € hoy y 6 cuotas de ' + cents((price - 100) / 6);
  }

  function renderOffers() {
    var all = currentOffers();
    var list = applyFilters(all);
    var sorted = sortOffers(list, search.sort);
    var cheapest = sortOffers(list, 'price')[0];
    var fastest = sortOffers(list, 'fast')[0];
    var best = sortOffers(list, 'best')[0];

    var tabs = $$('#sort-tabs button');
    var hint = { best: best, price: cheapest, fast: fastest };
    tabs.forEach(function (b) {
      var o = hint[b.dataset.sort];
      b.setAttribute('aria-selected', String(b.dataset.sort === search.sort));
      $('small', b).textContent = o ? money(o.price) + ', ' + dur(o.duration) : '';
    });

    $('#empty').hidden = sorted.length > 0;
    if (!sorted.length) {
      var overBudget = search.budget && all.length && applyFilters(all).length === 0 &&
        all.every(function (o) { return o.pricePerAdult > budgetLimit(); });
      if (overBudget) {
        var cheapestPP = Math.min.apply(null, all.map(function (o) { return o.pricePerAdult; }));
        $('#empty h3').textContent = 'Ningún vuelo entra en ' + money(search.budget) + ' por persona';
        $('#empty p').textContent = 'El más barato de este tramo cuesta ' + money(cheapestPP) + ' por persona. Prueba otras fechas en el calendario o quita el presupuesto.';
      } else {
        $('#empty h3').textContent = 'No hay vuelos con estos filtros';
        $('#empty p').textContent = 'Prueba a quitar algún filtro o a cambiar la fecha en el calendario de arriba.';
      }
    }
    var selected = search.selected[search.active];
    var pax = search.params.pax;
    var onlyOne = paxCount(pax) === 1;

    $('#offer-list').innerHTML = sorted.slice(0, 30).map(function (o, i) {
      var al = VC.AIRLINES[o.airline];
      var tags = '';
      if (o === best) tags += '<span class="tag tag-best">Recomendado</span>';
      if (o === cheapest) tags += '<span class="tag tag-cheap">Más barato</span>';
      if (o === fastest) tags += '<span class="tag tag-fast">Más rápido</span>';
      if (o.seatsLeft <= 4) tags += '<span class="tag tag-seats">' + (o.seatsLeft === 1 ? 'Queda 1 plaza' : 'Quedan ' + o.seatsLeft + ' plazas') + '</span>';
      var isSel = selected && selected.id === o.id;
      var open = search.open[o.id];
      var fin = finText(o.price);
      return '<li class="offer' + (isSel ? ' is-selected' : '') + '" style="--i:' + Math.min(i, 8) + '" data-id="' + esc(o.id) + '">' +
        '<div class="offer-main">' +
          '<div class="offer-top"><span class="al-badge" style="--al:' + al.color + '">' + o.airline + '</span><span class="al-name">' + esc(al.name) + '</span>' + tags + '</div>' +
          '<div class="offer-route">' +
            '<div class="pt"><strong>' + clock(o.depMin) + '</strong><span>' + o.segments[0].from + '</span></div>' +
            '<div class="track"><span>' + dur(o.duration) + '</span><div class="track-line">' +
              o.via.map(function (v, k) { return '<span class="stop" style="left:' + ((k + 1) / (o.stops + 1) * 100) + '%" title="' + esc(city(v)) + '"></span>'; }).join('') +
            '</div><span>' + stopsText(o) + '</span></div>' +
            '<div class="pt end"><strong>' + clock(o.arrMin) + (o.dayOffset > 0 ? '<sup>+' + o.dayOffset + '</sup>' : '') + '</strong><span>' + o.segments[o.segments.length - 1].to + '</span></div>' +
          '</div>' +
          '<div class="offer-meta">' + bagsHtml(o.bags) +
            '<button type="button" class="link details-btn" data-act="details" aria-expanded="' + !!open + '">' + (open ? 'Ocultar detalles' : 'Ver detalles') + '</button></div>' +
        '</div>' +
        '<div class="offer-stub">' +
          '<div class="offer-price">' + money(o.price) + '</div>' +
          '<div class="offer-per">' + (onlyOne ? 'Precio final con tasas' : money(o.pricePerAdult) + ' por adulto') + '</div>' +
          (fin ? '<div class="offer-fin">' + fin + '</div>' : '') +
          '<button type="button" class="btn ' + (isSel ? 'btn-ghost' : 'btn-sun') + '" data-act="pick">' + (isSel ? icon('check') + 'Elegido' : 'Elegir') + '</button>' +
        '</div>' +
        (open ? '<div class="offer-details">' + detailsHtml(o) + '</div>' : '') +
        '</li>';
    }).join('');
  }

  function bindResults() {
    $('#sort-tabs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-sort]');
      if (!b || !search || !search.result) return;
      search.sort = b.dataset.sort;
      renderOffers();
    });

    $('#offer-list').addEventListener('click', function (e) {
      var act = e.target.closest('[data-act]');
      if (!act) return;
      var id = act.closest('.offer').dataset.id;
      var offer = currentOffers().find(function (o) { return o.id === id; });
      if (act.dataset.act === 'details') {
        search.open[id] = !search.open[id];
        renderOffers();
        return;
      }
      search.selected[search.active] = offer;
      renderOffers();
      renderLegTabs();
      renderSelection();
      var n = search.params.legs.length;
      var next = search.selected.findIndex(function (s) { return !s; });
      if (next > -1) {
        toast(legName(search.active, n) + ' elegida. Ahora elige ' + legName(next, n).toLowerCase() + '.');
        setTimeout(function () { switchLeg(next); }, 450);
      } else {
        toast('Listo. Revisa el total y continúa con la reserva.');
      }
    });

    var hovered = null;
    $('#offer-list').addEventListener('mouseover', function (e) {
      var li = e.target.closest('.offer');
      if (!li || li.dataset.id === hovered || !VC.routeGlobe) return;
      hovered = li.dataset.id;
      var o = currentOffers().find(function (x) { return x.id === hovered; });
      if (o) VC.routeGlobe.show(offerPath(o), offerNote(o));
    });
    $('#offer-list').addEventListener('mouseleave', function () {
      hovered = null;
      showLegOnGlobe();
    });

    $('#leg-tabs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-leg]');
      if (b) switchLeg(+b.dataset.leg);
    });

    $('#fare-cal').addEventListener('click', function (e) {
      var b = e.target.closest('.fare-day');
      if (!b || b.disabled || b.getAttribute('aria-current')) return;
      var d = b.dataset.date;
      var i = search.active;
      if (form.trip === 'rt') {
        if (i === 0) {
          form.legs[0].date = d;
          if (form.legs[0].ret < d) form.legs[0].ret = d;
        } else form.legs[0].ret = d;
      } else {
        form.legs[i].date = d;
      }
      renderLegs();
      runSearch(true);
    });

    $('#edit-search').addEventListener('click', function () {
      $('#buscar').scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' });
      setTimeout(function () { var i = $('#legs input'); if (i) i.focus({ preventScroll: true }); }, 400);
    });

    $('#sel-continue').addEventListener('click', openBooking);
  }

  function switchLeg(i) {
    search.active = i;
    search.filters = newFilters(search.prefs);
    renderLegTabs();
    renderFareCal();
    renderFilters();
    renderOffers();
    showLegOnGlobe();
    var top = $('#leg-tabs').getBoundingClientRect().top;
    if (top < 60 || top > window.innerHeight * 0.6) {
      $('#leg-tabs').scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    }
  }

  function renderSelection() {
    var bar = $('#selection-bar');
    if (!search) { bar.hidden = true; return; }
    var any = search.selected.some(Boolean);
    bar.hidden = !any;
    document.body.classList.toggle('has-selection', any);
    var n = search.params.legs.length;
    $('#selection-legs').innerHTML = search.params.legs.map(function (l, i) {
      var o = search.selected[i];
      return '<div class="sel-leg' + (o ? '' : ' pending') + '"><span>' + legName(i, n) + '</span><strong>' + l.from + ' → ' + l.to + '</strong>' +
        '<span>' + (o ? clock(o.depMin) + ', ' + VC.AIRLINES[o.airline].name : 'Sin elegir') + '</span></div>';
    }).join('');
    var total = search.selected.reduce(function (s, o) { return s + (o ? o.price : 0); }, 0);
    $('#sel-total').textContent = money(total);
    var pc = paxCount(search.params.pax);
    $('#sel-pax').textContent = plural(pc, 'viajero', 'viajeros');
    $('#sel-continue').disabled = !search.selected.every(Boolean);
  }

  // ---------- Reserva ----------
  var booking = null;

  function openBooking() {
    booking = {
      step: 0,
      offers: search.selected.slice(),
      legs: search.params.legs,
      pax: search.params.pax,
      cabin: search.params.cabin,
      base: search.selected.reduce(function (s, o) { return s + o.price; }, 0),
      seats: {},
      seatUi: {},
      get total() { return this.base + VC.seats.total(this); },
      travellers: [],
      contact: { email: '', phone: '' },
      method: 'card',
      plan: 6
    };
    var types = [];
    for (var a = 0; a < booking.pax.adt; a++) types.push('adt');
    for (var c = 0; c < booking.pax.chd; c++) types.push('chd');
    for (var b = 0; b < booking.pax.inf; b++) types.push('inf');
    booking.travellers = types.map(function (t) { return { type: t, name: '', surname: '', birth: '', docType: 'DNI', doc: '' }; });
    renderBooking();
    $('#booking').showModal();
  }

  function stepsState() {
    $$('#booking-steps li').forEach(function (li, i) {
      li.className = i < booking.step ? 'done' : i === booking.step ? 'current' : '';
      if (i === booking.step) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
  }

  function tripSummary() {
    var n = booking.legs.length;
    return '<div class="trip-sum">' + booking.offers.map(function (o, i) {
      var l = booking.legs[i];
      return '<div class="trip-leg"><span class="al-badge" style="--al:' + VC.AIRLINES[o.airline].color + '">' + o.airline + '</span>' +
        '<div><span class="when">' + legName(i, n) + ', ' + longDayFmt.format(fromIso(l.date)) + '</span><br>' +
        '<strong>' + clock(o.depMin) + ' ' + esc(city(l.from)) + ' → ' + clock(o.arrMin) + (o.dayOffset > 0 ? ' (+' + o.dayOffset + ')' : '') + ' ' + esc(city(l.to)) + '</strong><br>' +
        '<span class="when">' + dur(o.duration) + ', ' + (o.stops ? plural(o.stops, 'escala', 'escalas') : 'directo') + ', ' + VC.AIRLINES[o.airline].name + '</span></div>' +
        '<span class="price">' + money(o.price) + '</span></div>';
    }).join('') + '</div>';
  }

  function priceLines() {
    var p = booking.pax;
    var perAdult = booking.offers.reduce(function (s, o) { return s + o.pricePerAdult; }, 0);
    var chd = Math.round(perAdult * 0.75) * p.chd, inf = Math.round(perAdult * 0.1) * p.inf;
    // los adultos se llevan el resto para que el desglose sume exactamente el total
    var lines = '<div><span>' + plural(p.adt, 'adulto', 'adultos') + '</span><span>' + money(booking.base - chd - inf) + '</span></div>';
    if (p.chd) lines += '<div><span>' + plural(p.chd, 'niño', 'niños') + '</span><span>' + money(chd) + '</span></div>';
    if (p.inf) lines += '<div><span>' + plural(p.inf, 'bebé', 'bebés') + '</span><span>' + money(inf) + '</span></div>';
    lines += '<div><span>Tasas de aeropuerto</span><span>Incluidas</span></div>';
    var seats = VC.seats.total(booking);
    if (seats) lines += '<div><span>Asientos elegidos</span><span>' + money(seats) + '</span></div>';
    lines += '<div class="total"><span>Total</span><span>' + money(booking.total) + '</span></div>';
    return '<div class="price-lines">' + lines + '</div>';
  }

  function renderBooking() {
    stepsState();
    var body = $('#booking-body');
    var s = booking.step;
    if (s === 0) {
      body.innerHTML = '<h3>Revisa tu viaje</h3>' + tripSummary() + priceLines() +
        '<div class="booking-actions"><span></span><button type="button" class="btn btn-sun" data-next>Añadir viajeros</button></div>';
    } else if (s === 1) {
      var typeName = { adt: 'Adulto', chd: 'Niño', inf: 'Bebé' };
      body.innerHTML = '<form id="pax-form" novalidate>' +
        '<div style="display:grid;gap:14px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><h3>¿Quién viaja?</h3>' +
        '<button type="button" class="link" data-fill>Rellenar con datos de prueba</button></div>' +
        booking.travellers.map(function (t, i) {
          return '<div class="pax-block"><h4>Viajero ' + (i + 1) + ', ' + typeName[t.type] + '</h4><div class="form-grid">' +
            '<label class="inp">Nombre<input required name="name" data-i="' + i + '" value="' + esc(t.name) + '" autocomplete="given-name"></label>' +
            '<label class="inp">Apellidos<input required name="surname" data-i="' + i + '" value="' + esc(t.surname) + '" autocomplete="family-name"></label>' +
            '<label class="inp">Fecha de nacimiento<input required type="date" name="birth" data-i="' + i + '" value="' + t.birth + '" max="' + today() + '"></label>' +
            '<label class="inp">Documento<span style="display:grid;grid-template-columns:auto 1fr;gap:6px">' +
              '<select name="docType" data-i="' + i + '">' + ['DNI', 'NIE', 'Pasaporte'].map(function (d) { return '<option' + (t.docType === d ? ' selected' : '') + '>' + d + '</option>'; }).join('') + '</select>' +
              '<input required name="doc" data-i="' + i + '" value="' + esc(t.doc) + '" aria-label="Número de documento"></span></label>' +
            '</div></div>';
        }).join('') +
        '<div class="pax-block"><h4>Contacto para enviarte el billete</h4><div class="form-grid">' +
          '<label class="inp">Email<input required type="email" name="email" value="' + esc(booking.contact.email) + '" autocomplete="email"></label>' +
          '<label class="inp">Teléfono (WhatsApp)<input required type="tel" name="phone" value="' + esc(booking.contact.phone) + '" autocomplete="tel"></label>' +
        '</div></div>' +
        '<p class="form-error" id="pax-error" hidden>Completa los campos marcados en rojo.</p>' +
        '<div class="booking-actions"><button type="button" class="back-btn" data-back>' + icon('arrow') + 'Volver</button>' +
        '<button type="submit" class="btn btn-sun">Elegir asientos</button></div>' +
        '</div></form>';
    } else if (s === 2) {
      VC.seats.render(body, booking, booking.seatUi);
    } else if (s === 3) {
      var fin = booking.total >= 300;
      body.innerHTML = '<h3>¿Cómo quieres pagar?</h3>' + priceLines() +
        '<div class="pay-methods" role="radiogroup" aria-label="Forma de pago">' +
          payOption('card', 'card', 'Tarjeta', 'Visa, Mastercard o Amex') +
          payOption('bizum', 'phone', 'Bizum', 'Al momento desde tu móvil') +
          payOption('transfer', 'bank', 'Transferencia', 'Plaza bloqueada 24 h') +
          (fin ? payOption('fin', 'split', 'Financiación', '100 € hoy y el resto en cuotas') : '') +
        '</div>' +
        '<div class="pay-extra" id="pay-extra"></div>' +
        '<p class="demo-note">Demostración: no se realiza ningún cobro ni se piden datos de tarjeta. En la web real, el pago lo procesa la pasarela del banco de VuelaClic.</p>' +
        '<div class="booking-actions"><button type="button" class="back-btn" data-back>' + icon('arrow') + 'Volver</button>' +
        '<button type="button" class="btn btn-sun" data-pay></button></div>';
      renderPayExtra();
    } else {
      body.innerHTML = '<h3>Estamos emitiendo tu billete</h3>' +
        '<ol class="flow" id="flow">' +
          flowStep(booking.method === 'transfer' ? 'Plaza bloqueada a la espera de tu transferencia' : 'Pago recibido por VuelaClic',
            booking.method === 'fin' ? 'Entrada de 100 € y plan de ' + booking.plan + ' cuotas aprobado' : 'Importe: ' + money(booking.total)) +
          flowStep('Reserva confirmada en GrupoVDT', 'La aerolínea guarda tus plazas') +
          flowStep('VuelaClic paga el billete a GrupoVDT', 'Con el crédito de agencia de VuelaClic') +
          flowStep('Billete emitido y enviado', 'A ' + (booking.contact.email || 'tu email') + ' y por WhatsApp') +
        '</ol><div id="ticket-slot"></div>';
      runFlow();
    }
  }

  function payOption(value, ic, title, sub) {
    return '<label><input type="radio" name="pay" value="' + value + '"' + (booking.method === value ? ' checked' : '') + '>' +
      '<span>' + icon(ic) + '<strong>' + title + '</strong><small>' + sub + '</small></span></label>';
  }

  function renderPayExtra() {
    var box = $('#pay-extra');
    var payBtn = $('[data-pay]');
    var m = booking.method;
    if (m === 'card') {
      box.innerHTML = '<p>Al pulsar pagar te llevamos a la página segura del banco para introducir la tarjeta.</p>';
      payBtn.textContent = 'Pagar ' + money(booking.total);
    } else if (m === 'bizum') {
      box.innerHTML = '<label class="inp">Móvil con Bizum<input type="tel" id="bizum-phone" value="' + esc(booking.contact.phone) + '"></label>' +
        '<p class="fine">Te llegará una solicitud de pago a la app de tu banco.</p>';
      payBtn.textContent = 'Pedir ' + money(booking.total) + ' por Bizum';
    } else if (m === 'transfer') {
      box.innerHTML = '<p>Te enviamos el número de cuenta por email. Guardamos tu plaza 24 horas y emitimos el billete cuando llegue la transferencia.</p>';
      payBtn.textContent = 'Bloquear plaza';
    } else {
      var rest = booking.total - 100;
      box.innerHTML = '<div class="calc-plans" role="radiogroup" aria-label="Número de cuotas">' + [3, 6, 12].map(function (n) {
          return '<label><input type="radio" name="plan" value="' + n + '"' + (booking.plan === n ? ' checked' : '') + '><span>' + n + ' cuotas</span></label>';
        }).join('') + '</div>' +
        '<div class="calc-result"><div><small>Hoy pagas</small><strong>100 €</strong></div>' +
        '<div><small>Y luego, cada mes</small><strong>' + cents(rest / booking.plan) + '</strong></div></div>' +
        '<p class="fine">Financiación de Fliinow sin intereses, sujeta a aprobación con tu DNI o NIE.</p>';
      payBtn.textContent = 'Pagar 100 € y financiar';
    }
  }

  function flowStep(title, sub) {
    return '<li><span class="dot">' + icon('check') + '</span><div><strong>' + esc(title) + '</strong><small>' + esc(sub) + '</small></div></li>';
  }

  function runFlow() {
    var steps = $$('#flow li');
    var wait = reducedMotion() ? 50 : 850;
    var i = 0;
    var seatsTotal = VC.seats.total(booking);
    var net = booking.offers.reduce(function (s, o) { return s + o.net; }, 0) + seatsTotal;
    var bookingPromise = VC.api.book({
      offers: booking.offers.map(function (o) { return o.id; }),
      legs: booking.offers.map(function (o, i) {
        var l = booking.legs[i];
        return { from: l.from, to: l.to, date: l.date, airline: o.airline, number: o.segments[0].number, dep: clock(o.depMin), stops: o.stops };
      }),
      lead: (booking.travellers[0].name + ' ' + booking.travellers[0].surname).trim() || 'Viajero',
      travellers: booking.travellers,
      pax: booking.pax,
      cabin: booking.cabin,
      contact: booking.contact,
      method: booking.method,
      plan: booking.method === 'fin' ? booking.plan : null,
      total: booking.total,
      seatsTotal: seatsTotal,
      net: net,
      margin: booking.total - net,
      source: 'web'
    });
    function next() {
      if (!$('#booking').open) return;
      if (i > 0) { steps[i - 1].classList.remove('busy'); steps[i - 1].classList.add('on'); }
      if (i === steps.length) {
        bookingPromise.then(showTicket);
        return;
      }
      steps[i].classList.add('busy');
      var current = i++;
      // la confirmación en VDT espera a la respuesta del proveedor
      if (current === 1) bookingPromise.then(function () { setTimeout(next, wait); });
      else setTimeout(next, wait);
    }
    next();
  }

  function qrSvg(text) {
    if (!window.qrcode) return '';
    var q = window.qrcode(0, 'M');
    q.addData(text);
    q.make();
    return q.createSvgTag({ cellSize: 3, margin: 0, scalable: true });
  }

  function shareText(res) {
    var lines = ['Mi reserva con VuelaClic', 'Localizador: ' + res.locator];
    booking.offers.forEach(function (o, i) {
      var l = booking.legs[i];
      lines.push(shortDay(l.date) + ', ' + clock(o.depMin) + ': ' + city(l.from) + ' → ' + city(l.to) + ' (' + o.segments[0].number + ')');
    });
    return lines.join('\n');
  }

  // Archivo .ics con un evento por tramo, para añadir el viaje al calendario del móvil
  function calendarFile(res) {
    function stamp(dateIso, min) {
      var m = ((min % 1440) + 1440) % 1440;
      return dateIso.replace(/-/g, '') + 'T' + String(Math.floor(m / 60)).padStart(2, '0') + String(m % 60).padStart(2, '0') + '00';
    }
    var ev = booking.offers.map(function (o, i) {
      var l = booking.legs[i];
      var end = addDays(l.date, Math.floor(o.arrMin / 1440));
      return ['BEGIN:VEVENT', 'UID:' + res.locator + '-' + i + '@vuelaclic.demo', 'DTSTAMP:' + stamp(today(), 0),
        'DTSTART:' + stamp(l.date, o.depMin), 'DTEND:' + stamp(end, o.arrMin),
        'SUMMARY:Vuelo ' + o.segments[0].number + ' ' + l.from + '-' + l.to,
        'DESCRIPTION:Localizador ' + res.locator + '. Reserva VuelaClic.', 'END:VEVENT'].join('\r\n');
    });
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//VuelaClic//Demo//ES'].concat(ev, ['END:VCALENDAR']).join('\r\n');
    return URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  }

  function showTicket(res) {
    booking.step = 4;
    stepsState();
    $$('#booking-steps li').forEach(function (li) { li.className = 'done'; });
    var first = booking.legs[0], o = booking.offers[0];
    var lastLeg = booking.legs[form.trip === 'rt' ? 0 : booking.legs.length - 1];
    var t = booking.travellers[0];
    var seat = VC.seats.firstSeat(booking);
    var qr = qrSvg(['VUELACLIC', res.locator, first.from + '-' + first.to, first.date, o.segments[0].number.replace(' ', ''), seat || '---',
      (t.surname + '/' + t.name).toUpperCase()].join('|'));
    $('#booking-title').textContent = booking.method === 'transfer' ? 'Plaza bloqueada' : '¡Buen viaje!';
    $('#booking-body h3').textContent = booking.method === 'transfer' ? 'Te esperamos con la transferencia' : 'Tu billete está emitido';
    $('#ticket-slot').innerHTML = '<div class="ticket" role="group" aria-label="Billete">' +
      '<div class="ticket-top">' +
        '<div class="ticket-row"><div><small>Localizador</small><span class="loc">' + res.locator + '</span></div>' +
        '<div style="text-align:right"><small>Pasajero</small><strong>' + esc((t.name + ' ' + t.surname).trim() || 'Viajero') + (booking.travellers.length > 1 ? ' +' + (booking.travellers.length - 1) : '') + '</strong></div></div>' +
        '<div class="ticket-row"><div><small>' + esc(city(first.from)) + '</small><span class="big">' + first.from + '</span></div>' +
        '<span class="ticket-plane">' + icon('plane') + '</span>' +
        '<div style="text-align:right"><small>' + esc(city(lastLeg.to)) + '</small><span class="big">' + lastLeg.to + '</span></div></div>' +
      '</div>' +
      '<div class="ticket-bottom">' +
        '<div><small>Salida</small><strong>' + shortDay(first.date) + ', ' + clock(o.depMin) + '</strong></div>' +
        '<div><small>Vuelo</small><strong>' + o.segments[0].number + '</strong></div>' +
        '<div><small>Asiento</small><strong>' + (seat || 'Al facturar') + '</strong></div>' +
        '<div><small>Pagado</small><strong>' + (booking.method === 'fin' ? '100 €' : booking.method === 'transfer' ? 'Pendiente' : money(booking.total)) + '</strong></div>' +
        (qr && booking.method !== 'transfer' ? '<div class="ticket-qr" aria-label="Código QR de la tarjeta de embarque">' + qr + '</div>' : '') +
      '</div></div>' +
      '<div class="ticket-share">' +
        '<a class="btn btn-wa" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(shareText(res)) + '">' + icon('whatsapp') + 'Enviar por WhatsApp</a>' +
        '<a class="btn btn-ghost" download="vuelaclic-' + res.locator + '.ics" href="' + calendarFile(res) + '">' + icon('cal') + 'Añadir al calendario</a>' +
      '</div>' +
      '<div class="booking-actions"><span class="fine">Proveedor: ' + esc(VC.api.provider.label) + '</span>' +
      '<button type="button" class="btn btn-sun" data-done>Hacer otra búsqueda</button></div>';
  }

  function bindBooking() {
    var dlg = $('#booking');
    $('#booking-close').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('close', function () { $('#booking-title').textContent = 'Tu reserva'; });
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) { dlg.close(); return; }
      if (booking.step === 2 && VC.seats.click(e, booking, booking.seatUi)) { renderBooking(); return; }
      if (e.target.closest('[data-next]')) { booking.step++; renderBooking(); }
      if (e.target.closest('[data-back]')) { booking.step--; renderBooking(); }
      if (e.target.closest('[data-skip-seats]')) { booking.seats = {}; booking.step = 3; renderBooking(); }
      if (e.target.closest('[data-fill]')) fillDemo();
      if (e.target.closest('[data-pay]')) {
        var bp = $('#bizum-phone');
        if (bp) booking.contact.phone = bp.value;
        booking.step = 4;
        renderBooking();
      }
      if (e.target.closest('[data-done]')) {
        dlg.close();
        search.selected = search.params.legs.map(function () { return null; });
        renderSelection();
        renderLegTabs();
        renderOffers();
        $('#buscar').scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' });
      }
    });
    dlg.addEventListener('input', function (e) {
      var t = e.target;
      if (t.dataset.i !== undefined) booking.travellers[+t.dataset.i][t.name] = t.value;
      else if (t.name === 'email' || t.name === 'phone') booking.contact[t.name] = t.value;
    });
    dlg.addEventListener('change', function (e) {
      var t = e.target;
      if (t.dataset.i !== undefined) booking.travellers[+t.dataset.i][t.name] = t.value;
      if (t.name === 'pay') { booking.method = t.value; renderPayExtra(); }
      if (t.name === 'plan') { booking.plan = +t.value; renderPayExtra(); }
    });
    dlg.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target;
      $$('input', f).forEach(function (i) { i.classList.add('touched'); });
      var ok = f.checkValidity();
      $('#pax-error').hidden = ok;
      if (!ok) { var bad = $('input:invalid', f); if (bad) bad.focus(); return; }
      booking.step = 2;
      renderBooking();
    });
  }

  function fillDemo() {
    var names = [['Lucía', 'Quispe Rojas'], ['Carlos', 'Mendoza Vega'], ['Valeria', 'Quispe Mendoza'], ['Mateo', 'Quispe Mendoza']];
    var ages = { adt: 34, chd: 8, inf: 1 };
    booking.travellers.forEach(function (t, i) {
      var n = names[i % names.length];
      t.name = n[0]; t.surname = n[1];
      var d = new Date(); d.setFullYear(d.getFullYear() - ages[t.type] - (i % 3)); d.setMonth(i * 2);
      t.birth = iso(d);
      t.docType = i % 2 ? 'NIE' : 'DNI';
      t.doc = t.docType === 'NIE' ? 'X' + (1234567 + i) + 'L' : (12345678 + i) + 'Z';
    });
    booking.contact = { email: 'lucia.quispe@ejemplo.com', phone: '+34 600 000 000' };
    renderBooking();
  }

  // ---------- Destinos destacados ----------
  function renderDestinations() {
    var grid = $('#dest-grid');
    grid.innerHTML = VC.FEATURED.map(function (f, i) {
      var ap = VC.airport(f.to);
      return '<button type="button" class="dest" data-i="' + i + '">' +
        '<img src="' + f.img + '" alt="" loading="lazy">' +
        '<span class="dest-price" data-price><small>desde</small>…</span>' +
        '<span class="dest-body"><span class="dest-tag">' + esc(f.tag) + '</span>' +
        '<span class="dest-city">' + esc(ap.city) + '</span>' +
        '<span class="dest-from">' + esc(ap.country) + ', saliendo de ' + esc(city(f.from)) + '</span></span></button>';
    }).join('');

    var base = addDays(today(), 30);
    var outDates = [], backDates = [];
    for (var d = 0; d < 7; d++) { outDates.push(addDays(base, d)); backDates.push(addDays(base, d + 21)); }
    var one = { adt: 1, chd: 0, inf: 0 };
    VC.FEATURED.forEach(function (f, i) {
      Promise.all([
        VC.api.cheapestByDate({ from: f.from, to: f.to }, one, 'Y', outDates),
        VC.api.cheapestByDate({ from: f.to, to: f.from }, one, 'Y', backDates)
      ]).then(function (res) {
        var out = res[0].reduce(function (a, b) { return b.price < a.price ? b : a; });
        var back = res[1].reduce(function (a, b) { return b.price < a.price ? b : a; });
        f.best = { out: out.date, back: back.date };
        var btn = $('.dest[data-i="' + i + '"]');
        $('[data-price]', btn).innerHTML = '<small>desde</small>' + money(out.price + back.price);
        btn.setAttribute('aria-label', 'Buscar vuelos a ' + VC.airport(f.to).city + ' desde ' + money(out.price + back.price) + ' ida y vuelta');
      });
    });

    grid.addEventListener('click', function (e) {
      var b = e.target.closest('.dest');
      if (!b) return;
      var f = VC.FEATURED[+b.dataset.i];
      $('input[name=trip][value=rt]').checked = true;
      form.trip = 'rt';
      form.legs = [{ from: f.from, to: f.to, date: f.best ? f.best.out : base, ret: f.best ? f.best.back : addDays(base, 21) }];
      renderLegs();
      runSearch();
    });
  }

  // ---------- Financiación ----------
  function bindCalc() {
    var range = $('#calc-price');
    function update() {
      var price = +range.value;
      var plan = +$('input[name=calc-plan]:checked').value;
      $('#calc-price-out').textContent = money(price);
      $('#calc-monthly').textContent = cents((price - 100) / plan);
      range.style.setProperty('--p', ((price - range.min) / (range.max - range.min) * 100) + '%');
    }
    range.addEventListener('input', update);
    $$('input[name=calc-plan]').forEach(function (r) { r.addEventListener('change', update); });
    update();
  }

  function renderMarquee() {
    var pills = Object.keys(VC.AIRLINES).map(function (k) {
      var a = VC.AIRLINES[k];
      return '<span class="al-pill"><i style="--al:' + a.color + '"></i>' + esc(a.name) + '</span>';
    }).join('');
    $('#marquee').innerHTML = pills + pills;
  }

  // ---------- API para el asistente y el explorador ----------
  VC.app = {
    searchTrip: function (o) {
      form.trip = o.trip || 'rt';
      $('input[name=trip][value=' + form.trip + ']').checked = true;
      form.legs = [{ from: o.from, to: o.to, date: o.date, ret: o.ret || addDays(o.date, 14) }];
      if (o.pax) form.pax = Object.assign({}, o.pax);
      if (o.cabin) {
        form.cabin = o.cabin;
        $('input[name=cabin][value=' + o.cabin + ']').checked = true;
      }
      renderLegs();
      renderPax();
      var prefs = { budget: o.budget || null, direct: !!o.direct, bags: !!o.bags };
      if (!o.flash || reducedMotion()) { runSearch(false, prefs); return; }
      // el buscador se rellena a la vista antes de saltar a los resultados
      var card = $('#search-form');
      card.classList.remove('flash');
      void card.offsetWidth;
      card.classList.add('flash');
      setTimeout(function () { runSearch(false, prefs); }, 900);
    }
  };

  // ---------- Arranque ----------
  renderLegs();
  renderPax();
  bindSearchForm();
  bindFilters();
  bindResults();
  bindBooking();
  startBoard();
  renderDestinations();
  bindCalc();
  renderMarquee();
})();
