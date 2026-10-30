/* Simulador de vuelos para la demo.
   Genera ofertas verosímiles y deterministas: la misma búsqueda devuelve
   siempre los mismos vuelos, así la demo se puede repetir delante del cliente. */
(function () {
  // Zona horaria fija por país (horario de invierno; suficiente para la demo)
  var TZ = { ES: 1, FR: 1, NL: 1, IT: 1, GB: 0, PT: 0, PE: -5, CO: -5, EC: -5, PA: -5, DO: -4, BO: -4,
    PY: -3, CL: -3, AR: -3, BR: -3, HN: -6, CR: -6, MX: -6, US: -5 };
  var TZ_OVERRIDE = { CUN: -5 };

  // Aeropuertos sin vuelos de largo radio: se llega a ellos desde su aeropuerto alimentador
  var FEEDER = { AGP: 'MAD', VLC: 'MAD', BIO: 'MAD', CUZ: 'LIM', LPB: 'LIM', TGU: 'PTY', SAP: 'PTY' };
  var LONG_HAUL_KM = 3500;

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function rng(seed) {
    var a = hash(seed);
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function km(a, b) {
    var R = 6371, toRad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * toRad, dLon = (b.lon - a.lon) * toRad;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  function tz(code) {
    if (code in TZ_OVERRIDE) return TZ_OVERRIDE[code];
    return TZ[VC.airport(code).cc];
  }

  function legal(x, y) {
    var d = km(VC.airport(x), VC.airport(y));
    return d < LONG_HAUL_KM || (!FEEDER[x] && !FEEDER[y]);
  }

  // Inserta los aeropuertos alimentadores necesarios para que cada tramo sea operable
  function fixPath(path) {
    var out = path.slice();
    if (out.length > 1 && !legal(out[0], out[1]) && FEEDER[out[0]] && FEEDER[out[0]] !== out[1]) {
      out.splice(1, 0, FEEDER[out[0]]);
    }
    var n = out.length;
    if (n > 1 && !legal(out[n - 2], out[n - 1]) && FEEDER[out[n - 1]] && FEEDER[out[n - 1]] !== out[n - 2]) {
      out.splice(n - 1, 0, FEEDER[out[n - 1]]);
    }
    for (var i = 1; i < out.length; i++) if (!legal(out[i - 1], out[i])) return null;
    return out.filter(function (c, i) { return c !== out[i - 1]; });
  }

  function routesFor(from, to) {
    var o = VC.airport(from), d = VC.airport(to);
    var direct = km(o, d);
    var routes = [];
    Object.keys(VC.AIRLINES).forEach(function (code) {
      var al = VC.AIRLINES[code];
      var touchesHub = al.hubs.indexOf(from) > -1 || al.hubs.indexOf(to) > -1;
      if (touchesHub) {
        var p = fixPath([from, to]);
        if (p) routes.push({ airline: code, path: p });
      }
      al.hubs.forEach(function (h) {
        if (h === from || h === to) return;
        var via = km(o, VC.airport(h)) + km(VC.airport(h), d);
        if (via / direct > 1.5) return;
        var p = fixPath([from, h, to]);
        if (p) routes.push({ airline: code, path: p });
      });
    });
    // máximo 2 escalas y sin rutas repetidas
    var seen = {};
    return routes.filter(function (r) {
      var key = r.airline + r.path.join('-');
      if (r.path.length > 4 || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function seasonFactor(date) {
    var m = date.getMonth(), day = date.getDate(), dow = date.getDay();
    var f = 1;
    if ((m === 11 && day >= 12) || (m === 0 && day <= 7)) f *= 1.38;
    else if (m === 6 || m === 7) f *= 1.24;
    else if (m === 1 || m === 10) f *= 0.9;
    if (dow === 5 || dow === 0) f *= 1.07;
    var ahead = (date - new Date()) / 864e5;
    if (ahead < 14) f *= 1.3;
    else if (ahead > 90) f *= 0.92;
    return f;
  }

  function parseDate(iso) {
    var p = iso.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  var DEP_SLOTS = [365, 430, 480, 545, 610, 700, 765, 840, 905, 990, 1070, 1145, 1235, 1310, 1390, 1430];

  function buildOffers(leg, pax, cabin) {
    var date = parseDate(leg.date);
    var routes = routesFor(leg.from, leg.to);
    var offers = [];
    routes.forEach(function (r) {
      var al = VC.AIRLINES[r.airline];
      var rand = rng(leg.date + r.airline + r.path.join(''));
      // las rutas cortas tienen varias frecuencias al día; el largo radio, una o dos
      var shortHaul = km(VC.airport(leg.from), VC.airport(leg.to)) < 2500;
      var departures = shortHaul ? 3 + Math.floor(rand() * 3) : rand() > 0.55 ? 2 : 1;
      for (var k = 0; k < departures; k++) {
        var depMin = DEP_SLOTS[Math.floor(rand() * DEP_SLOTS.length)];
        // tiempo absoluto en minutos UTC desde el inicio del día de salida
        var t = depMin - tz(r.path[0]) * 60;
        var segments = [];
        var totalKm = 0;
        for (var i = 0; i < r.path.length - 1; i++) {
          var a = r.path[i], b = r.path[i + 1];
          var dist = km(VC.airport(a), VC.airport(b));
          totalKm += dist;
          var dur = Math.round(dist / 820 * 60 + 35);
          if (i > 0) t += 70 + Math.floor(rand() * 150);
          var depLocal = t + tz(a) * 60;
          var arrLocal = t + dur + tz(b) * 60;
          // el tramo alimentador lo opera la aerolínea de la red del hub
          var carrier = r.airline;
          if (FEEDER[a] === b || FEEDER[b] === a) {
            carrier = { MAD: 'IB', LIM: 'LA', PTY: 'CM' }[FEEDER[a] === b ? b : a] || r.airline;
          }
          segments.push({
            from: a, to: b, carrier: carrier,
            number: carrier + ' ' + (100 + Math.floor(rand() * 8900)),
            depMin: depLocal, arrMin: arrLocal, duration: dur
          });
          t += dur;
        }
        var first = segments[0], last = segments[segments.length - 1];
        var elapsed = t - (depMin - tz(r.path[0]) * 60);
        var stops = segments.length - 1;

        var perAdult = (38 + totalKm * 0.043) * al.factor * seasonFactor(date) * VC.CABINS[cabin].mult;
        perAdult *= stops === 0 ? 1.12 : stops === 2 ? 0.86 : 1;
        perAdult *= 0.88 + rand() * 0.24;
        perAdult = Math.round(perAdult);
        var total = Math.round(perAdult * pax.adt + perAdult * 0.75 * pax.chd + perAdult * 0.1 * pax.inf);

        offers.push({
          id: leg.from + leg.to + leg.date + r.airline + r.path.join('') + k,
          airline: r.airline,
          segments: segments,
          via: r.path.slice(1, -1),
          stops: stops,
          depMin: first.depMin,
          arrMin: last.arrMin,
          dayOffset: Math.floor(last.arrMin / 1440),
          duration: elapsed,
          pricePerAdult: perAdult,
          price: total,
          bags: { personal: true, cabin: cabin !== 'Y' || al.bags > 0, checked: cabin === 'C' ? 2 : al.bags },
          seatsLeft: 1 + Math.floor(rand() * 9),
          refundable: cabin === 'C' || rand() > 0.7
        });
      }
    });
    return offers;
  }

  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  VC.simulator = {
    // Versión síncrona para generar datos de ejemplo (panel del agente)
    offers: buildOffers,

    search: function (params) {
      var legs = params.legs.map(function (leg) {
        return { from: leg.from, to: leg.to, date: leg.date, offers: buildOffers(leg, params.pax, params.cabin) };
      });
      // latencia simulada: una API real de consolidador tarda varios segundos
      return delay(1600 + Math.random() * 700).then(function () { return { legs: legs }; });
    },

    cheapestByDate: function (leg, pax, cabin, dates) {
      return dates.map(function (iso) {
        var offers = buildOffers({ from: leg.from, to: leg.to, date: iso }, pax, cabin);
        var min = offers.reduce(function (m, o) { return Math.min(m, o.price); }, Infinity);
        return { date: iso, price: isFinite(min) ? min : null };
      });
    },

    book: function (booking) {
      var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      var rand = rng(JSON.stringify(booking) + Date.now());
      var locator = '';
      for (var i = 0; i < 6; i++) locator += chars[Math.floor(rand() * chars.length)];
      return delay(900).then(function () { return { locator: locator, status: 'confirmed' }; });
    }
  };
})();
