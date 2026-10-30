/* Asistente de búsqueda: convierte una frase en una búsqueda.
   Funciona con reglas, sin IA ni servidor. Para la versión real se puede
   sustituir parse() por una llamada a un modelo de lenguaje desde el backend. */
(function () {
  var MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var NUM = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, quince: 15 };
  var PLACES = {
    'peru': 'LIM', 'colombia': 'BOG', 'ecuador': 'UIO', 'paraguay': 'ASU', 'bolivia': 'VVI', 'chile': 'SCL', 'argentina': 'EZE',
    'honduras': 'TGU', 'costa rica': 'SJO', 'panama': 'PTY', 'mexico': 'MEX', 'brasil': 'GRU', 'republica dominicana': 'SDQ',
    'dominicana': 'SDQ', 'estados unidos': 'MIA', 'eeuu': 'MIA', 'francia': 'CDG', 'holanda': 'AMS', 'paises bajos': 'AMS',
    'italia': 'FCO', 'inglaterra': 'LHR', 'reino unido': 'LHR', 'portugal': 'LIS', 'espana': 'MAD',
    'nueva york': 'JFK', 'new york': 'JFK', 'cdmx': 'MEX', 'mexico df': 'MEX', 'santa cruz de la sierra': 'VVI',
    'sao paulo': 'GRU', 'machu picchu': 'CUZ', 'caribe': 'PUJ'
  };
  var COMPANION_1 = 'madre|padre|mama|papa|pareja|novia|novio|esposa|esposo|marido|mujer|hermana|hermano|amiga|amigo|abuela|abuelo|suegra|suegro|tia|tio|prima|primo|companero|companera';
  var COMPANION_2 = 'padres|abuelos|suegros|tios';

  function norm(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function num(s) { return /^\d+$/.test(s) ? +s : NUM[s] || 0; }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function day(y, m, d) { return new Date(y, m, d); }
  function plus(d, n) { var c = new Date(d); c.setDate(c.getDate() + n); return c; }
  function today() { var t = new Date(); return day(t.getFullYear(), t.getMonth(), t.getDate()); }

  // Próxima fecha con ese día y mes que no haya pasado
  function upcoming(m, d, after) {
    var base = after || today();
    var c = day(base.getFullYear(), m, d);
    if (c < base) c = day(base.getFullYear() + 1, m, d);
    return c;
  }

  function easter(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
      g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
      l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    return day(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
  }

  function aliases() {
    var list = [];
    VC.AIRPORTS.forEach(function (a) { list.push([norm(a.city), a.code]); });
    Object.keys(PLACES).forEach(function (k) { list.push([k, PLACES[k]]); });
    return list.sort(function (a, b) { return b[0].length - a[0].length; });
  }

  function findPlaces(t) {
    var taken = [], found = [];
    aliases().forEach(function (al) {
      var re = new RegExp('\\b' + al[0].replace(/ /g, '\\s+') + '\\b', 'g'), m;
      while ((m = re.exec(t))) {
        var s = m.index, e = s + m[0].length;
        if (taken.some(function (r) { return s < r[1] && e > r[0]; })) continue;
        taken.push([s, e]);
        found.push({ code: al[1], at: s, end: e });
      }
    });
    return found.sort(function (a, b) { return a.at - b.at; });
  }

  function parse(text) {
    var t = norm(text);
    var r = { trip: 'rt', pax: { adt: 1, chd: 0, inf: 0 }, cabin: 'Y', direct: false, bags: false, budget: null, understood: [] };

    // --- Origen y destino
    var places = findPlaces(t);
    var route = /\b(?:de|desde)\s+(.+?)\s+(?:a|hasta|hacia|para)\s+/.exec(t);
    places.forEach(function (p) {
      var before = t.slice(Math.max(0, p.at - 18), p.at);
      if (/(desde|salgo de|saliendo de|vivo en|estoy en|salida de)\s+$/.test(before)) p.origin = true;
    });
    if (route && places.length >= 2) {
      var inFrom = places.filter(function (p) { return p.at >= route.index && p.at < route.index + route[0].length; });
      if (inFrom.length) inFrom[0].origin = true;
    }
    var origin = places.filter(function (p) { return p.origin; })[0];
    var dest = places.filter(function (p) { return !p.origin && (!origin || p.code !== origin.code); })[0];
    r.from = origin ? origin.code : null;
    r.to = dest ? dest.code : null;
    if (!r.from && r.to && VC.airport(r.to).cc !== 'ES') r.from = 'MAD';
    if (!r.from && r.to && VC.airport(r.to).cc === 'ES') { r.from = r.to; r.to = null; }

    // --- Ida o ida y vuelta
    if (/\b(solo|solamente) (de )?ida\b|\bsin vuelta\b|\bno vuelvo\b|\bida solamente\b/.test(t)) r.trip = 'ow';

    // --- Duración de la estancia
    var stay = 15;
    var dm = /\b(\d+|una|un|dos|tres|cuatro|quince|diez)\s+(semanas?|dias|mes(?:es)?)\b/.exec(t);
    if (dm) stay = num(dm[1]) * (/semana/.test(dm[2]) ? 7 : /mes/.test(dm[2]) ? 30 : 1);
    if (/\bun mes\b/.test(t)) stay = 30;

    // --- Fechas
    var now = today(), dep = null, ret = null;
    var monthRe = '(' + MONTHS.join('|') + ')';
    var explicit = [], m;
    var re = new RegExp('\\b(\\d{1,2})\\s*(?:de\\s+)?' + monthRe, 'g');
    while ((m = re.exec(t))) explicit.push([MONTHS.indexOf(m[2]), +m[1]]);
    var reNum = /\b(\d{1,2})\/(\d{1,2})\b/g;
    while ((m = reNum.exec(t))) explicit.push([+m[2] - 1, +m[1]]);
    if (explicit.length) {
      dep = upcoming(explicit[0][0], explicit[0][1]);
      if (explicit[1]) ret = upcoming(explicit[1][0], explicit[1][1], dep);
    } else if (/\bnavidad(es)?\b/.test(t)) {
      dep = upcoming(11, 19); ret = plus(dep, 18); r.understood.push('Navidad');
    } else if (/\b(fin de ano|nochevieja|ano nuevo)\b/.test(t)) {
      dep = upcoming(11, 28); ret = plus(dep, 7);
    } else if (/\bsemana santa\b/.test(t)) {
      var e = easter(now.getFullYear());
      if (plus(e, -10) < now) e = easter(now.getFullYear() + 1);
      dep = plus(e, -10); ret = plus(e, 1);
    } else if (/\bpuente de diciembre\b/.test(t)) {
      dep = upcoming(11, 5); ret = plus(dep, 4);
    } else if (/\bverano\b/.test(t)) {
      dep = upcoming(6, 15); ret = plus(dep, stay);
    } else if (/\b(este )?(fin de semana|finde)\b/.test(t)) {
      dep = plus(now, (5 - now.getDay() + 7) % 7 || 7); ret = plus(dep, 2);
    } else if (/\b(la semana que viene|proxima semana|semana proxima)\b/.test(t)) {
      dep = plus(now, ((8 - now.getDay()) % 7) || 7); ret = plus(dep, stay);
    } else if (/\bmanana\b/.test(t)) {
      dep = plus(now, 1);
    } else if ((m = /\ben (\d+|dos|tres|cuatro) (dias|semanas)\b/.exec(t))) {
      dep = plus(now, num(m[1]) * (m[2] === 'semanas' ? 7 : 1));
    } else if ((m = new RegExp('\\b(?:en|para|de|a principios de|a finales de)\\s+' + monthRe).exec(t))) {
      var mi = MONTHS.indexOf(m[1]);
      var d0 = /finales/.test(m[0]) ? 22 : /principios/.test(m[0]) ? 2 : 10;
      dep = upcoming(mi, d0);
      if (mi === now.getMonth() && dep.getFullYear() === now.getFullYear()) dep = plus(now, 7);
    }
    if (!dep) dep = plus(now, 30);
    if (dep < plus(now, 1)) dep = plus(now, 1);
    if (!ret) ret = plus(dep, stay);
    r.date = iso(dep);
    r.ret = iso(ret);

    // --- Viajeros
    var adults = 1, kids = 0, babies = 0;
    if (/\b(yo solo|yo sola|viajo solo|viajo sola)\b/.test(t)) adults = 1;
    var c1 = t.match(new RegExp('\\b(' + COMPANION_1 + ')\\b', 'g'));
    var c2 = t.match(new RegExp('\\b(' + COMPANION_2 + ')\\b', 'g'));
    adults += (c1 ? c1.length : 0) + (c2 ? c2.length * 2 : 0);
    if ((m = /\b(\d+|un|una|dos|tres|cuatro|cinco)\s+(hijos|hijas|ninos|ninas|nietos|sobrinos|crios|peques)\b/.exec(t))) kids = num(m[1]);
    else if (/\b(mis|los|las) (hijos|hijas|ninos|ninas|nietos|peques)\b/.test(t)) kids = 2;
    else if (/\bmi (hijo|hija|nino|nina|nieto|nieta|sobrino|sobrina)\b/.test(t)) kids = 1;
    if ((m = /\b(\d+|dos|tres)\s+bebes\b/.exec(t))) babies = num(m[1]);
    else if (/\bbebe\b/.test(t)) babies = 1;
    if ((m = /\b(\d+|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)\s+(adultos|personas|pasajeros|viajeros)\b/.exec(t))) {
      adults = /adultos/.test(m[2]) ? num(m[1]) : Math.max(1, num(m[1]) - kids - babies);
    }
    if ((m = /\bsomos\s+(\d+|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)\b/.exec(t))) adults = Math.max(1, num(m[1]) - kids - babies);
    adults = Math.min(adults, 9);
    kids = Math.min(kids, 9 - adults);
    babies = Math.min(babies, adults);
    r.pax = { adt: adults, chd: kids, inf: babies };

    // --- Presupuesto
    // Cantidad con «€/euros» o tras «máximo/hasta/presupuesto»; las pequeñas son días o personas
    var amount = 0, bre = /\b(?:(?:maximo|max|hasta|menos de|no mas de|presupuesto(?: de)?|tope(?: de)?)\s*(\d[\d.]*)|(\d[\d.]*)\s*(?:€|euros?\b|eur\b))/g, bm;
    while ((bm = bre.exec(t)) && !amount) {
      var n = +(bm[1] || bm[2]).replace(/\./g, '');
      if (n >= 50) amount = n;
    }
    if (amount) {
      var seats = adults + kids;
      r.budget = /\b(en total|entre todos|para todos|todo incluido)\b/.test(t) && seats > 1 ? Math.round(amount / seats) : amount;
      r.budgetTotal = /\b(en total|entre todos|para todos)\b/.test(t);
    }

    // --- Preferencias
    if (/\b(business|primera clase|clase ejecutiva)\b/.test(t)) r.cabin = 'C';
    else if (/\bpremium\b/.test(t)) r.cabin = 'W';
    if (/\b(directo|directos|sin escalas?)\b/.test(t)) r.direct = true;
    if (/\b(maleta|maletas|equipaje)\b/.test(t)) r.bags = true;
    return r;
  }

  var dayFmt = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  function fmt(isoDate) { var p = isoDate.split('-'); return dayFmt.format(new Date(+p[0], +p[1] - 1, +p[2])).replace('.', ''); }
  function plural(n, a, b) { return n + ' ' + (n === 1 ? a : b); }

  function summary(r) {
    var parts = [];
    parts.push('<strong>' + VC.airport(r.from).city + ' → ' + VC.airport(r.to).city + '</strong>');
    parts.push(r.trip === 'ow' ? 'solo ida el ' + fmt(r.date) : 'del ' + fmt(r.date) + ' al ' + fmt(r.ret));
    var p = [plural(r.pax.adt, 'adulto', 'adultos')];
    if (r.pax.chd) p.push(plural(r.pax.chd, 'niño', 'niños'));
    if (r.pax.inf) p.push(plural(r.pax.inf, 'bebé', 'bebés'));
    parts.push(p.join(', '));
    if (r.cabin !== 'Y') parts.push(VC.CABINS[r.cabin].label);
    if (r.budget) parts.push('hasta ' + r.budget + ' € por persona');
    if (r.direct) parts.push('solo directos');
    if (r.bags) parts.push('con maleta facturada');
    return parts.join(', ');
  }

  function say(html) {
    var box = document.getElementById('assist-reply');
    box.hidden = false;
    box.innerHTML = '<span class="assist-avatar" aria-hidden="true"><svg class="ic"><use href="#i-spark"/></svg></span><p>' + html + '</p>';
    box.classList.remove('pop');
    void box.offsetWidth;
    box.classList.add('pop');
  }

  function run(text) {
    if (!text.trim()) return;
    var r = parse(text);
    if (!r.to) {
      say(r.from
        ? 'Entiendo que sales de ' + VC.airport(r.from).city + '. ¿A dónde quieres ir? Por ejemplo: «a Lima en diciembre».'
        : 'No he encontrado el destino. Prueba con una ciudad o un país, por ejemplo: «Bogotá en marzo con mi pareja».');
      return;
    }
    if (r.from === r.to) { say('El origen y el destino son la misma ciudad. ¿Desde dónde sales?'); return; }
    say('Busco ' + summary(r) + '. Si algo no cuadra, cámbialo en el buscador.');
    setTimeout(function () {
      VC.app.searchTrip({
        trip: r.trip, from: r.from, to: r.to, date: r.date, ret: r.ret, pax: r.pax, cabin: r.cabin,
        budget: r.budget, direct: r.direct, bags: r.bags, flash: true
      });
    }, 650);
  }

  function start() {
    var form = document.getElementById('assist-form');
    if (!form) return;
    var input = document.getElementById('assist-input');
    form.addEventListener('submit', function (e) { e.preventDefault(); run(input.value); });
    document.getElementById('assist-chips').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      input.value = b.textContent;
      run(input.value);
    });
  }

  VC.assistant = { parse: parse, start: start };
  start();
})();
