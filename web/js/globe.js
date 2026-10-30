/* Globo 3D de la cabecera de resultados.
   La librería (globe.gl, 1,4 MB) se carga en la primera búsqueda, no al abrir la web. */
(function () {
  var stage, world, planeTimer = null, ready = null, routeCountries = [];

  function webglOk() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('No se pudo cargar ' + src)); };
      document.head.appendChild(s);
    });
  }

  function reduced() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  // Punto intermedio de la ortodrómica entre a y b (t de 0 a 1)
  function lerpGreatCircle(a, b, t) {
    var r = Math.PI / 180;
    var lat1 = a.lat * r, lon1 = a.lon * r, lat2 = b.lat * r, lon2 = b.lon * r;
    var d = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin((lat2 - lat1) / 2), 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon2 - lon1) / 2), 2)));
    if (!d) return { lat: a.lat, lng: a.lon };
    var A = Math.sin((1 - t) * d) / Math.sin(d), B = Math.sin(t * d) / Math.sin(d);
    var x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    var y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    var z = A * Math.sin(lat1) + B * Math.sin(lat2);
    return { lat: Math.atan2(z, Math.sqrt(x * x + y * y)) / r, lng: Math.atan2(y, x) / r };
  }

  function bearing(p, q) {
    var r = Math.PI / 180;
    var y = Math.sin((q.lng - p.lng) * r) * Math.cos(q.lat * r);
    var x = Math.cos(p.lat * r) * Math.sin(q.lat * r) - Math.sin(p.lat * r) * Math.cos(q.lat * r) * Math.cos((q.lng - p.lng) * r);
    return Math.atan2(y, x) / r;
  }

  function init() {
    if (ready) return ready;
    stage = document.getElementById('route-stage');
    if (!stage || !webglOk()) { ready = Promise.reject(new Error('sin WebGL')); ready.catch(function () {}); return ready; }
    ready = loadScript('vendor/globe.gl.min.js').then(function () {
      var el = stage.querySelector('.globe');
      world = Globe()(el)
        .backgroundColor('rgba(0,0,0,0)')
        .showAtmosphere(true)
        .atmosphereColor('#29B5F2')
        .atmosphereAltitude(0.18)
        .hexPolygonsData(window.VC_COUNTRIES.features)
        .hexPolygonResolution(3)
        .hexPolygonMargin(0.42)
        .hexPolygonUseDots(true)
        .hexPolygonColor(countryColor())
        .arcColor(function () { return ['rgba(255,197,49,0.95)', 'rgba(41,181,242,0.95)']; })
        .arcStroke(0.9)
        .arcAltitudeAutoScale(0.42)
        .arcDashLength(0.45)
        .arcDashGap(0.12)
        .arcDashAnimateTime(reduced() ? 0 : 1800)
        .labelLat('lat').labelLng('lng').labelText('code')
        .labelColor(function () { return '#FFFFFF'; })
        .labelSize(1.5).labelDotRadius(0.55).labelResolution(2)
        .labelAltitude(0.01)
        .htmlElementsData([])
        .htmlElement(function (d) {
          var p = document.createElement('div');
          if (d.kind === 'banner') {
            // Pancarta remolcada con el logo de VuelaClic
            p.className = 'globe-banner';
            p.innerHTML = '<span class="banner-flag"><svg class="banner-swoosh" viewBox="0 0 64 40" aria-hidden="true">' +
              '<path d="M4 34C18 30 40 16 60 4" fill="none" stroke="#1B5BE0" stroke-width="6" stroke-linecap="round"/></svg>' +
              '<span class="logo-word">Vuela<b>Clic</b></span></span>';
          } else {
            p.className = 'globe-plane';
            p.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><use href="#i-plane"/></svg>';
          }
          d.el = p;
          return p;
        })
        .htmlAltitude(0.06)
        .htmlTransitionDuration(0);
      world.globeMaterial().color.set('#0C2C78');
      world.globeMaterial().emissive.set('#081C4F');
      var controls = world.controls();
      controls.enableZoom = false;
      controls.autoRotate = false;
      size();
      window.addEventListener('resize', size);
      return world;
    });
    ready.catch(function () { if (stage) stage.hidden = true; });
    return ready;
  }

  // Una función nueva en cada llamada para que el globo vuelva a pintar los países
  function countryColor() {
    var on = routeCountries.slice();
    return function (f) { return on.indexOf(f.properties.cc) > -1 ? '#FFC531' : 'rgba(190, 220, 255, 0.55)'; };
  }

  function size() {
    if (!world) return;
    world.width(stage.clientWidth).height(stage.clientHeight);
  }

  function airportsOf(path) { return path.map(function (c) { return VC.airport(c); }); }

  function draw(path) {
    var aps = airportsOf(path);
    var countries = aps.map(function (a) { return a.cc; });
    if (countries.join() !== routeCountries.join()) {
      routeCountries = countries;
      world.hexPolygonColor(countryColor());
    }
    world.labelsData(aps.map(function (a) { return { lat: a.lat, lng: a.lon, code: a.code }; }));
    var arcs = [];
    for (var i = 1; i < aps.length; i++) {
      arcs.push({ startLat: aps[i - 1].lat, startLng: aps[i - 1].lon, endLat: aps[i].lat, endLng: aps[i].lon });
    }
    world.arcsData(arcs);
  }

  function frame(path, ms) {
    var aps = airportsOf(path);
    var a = aps[0], b = aps[aps.length - 1];
    var mid = lerpGreatCircle(a, b, 0.5);
    var km = 0;
    for (var i = 1; i < aps.length; i++) km += distance(aps[i - 1], aps[i]);
    var alt = Math.min(1.9, Math.max(0.8, km / 6500));
    world.pointOfView({ lat: mid.lat - 6, lng: mid.lng, altitude: alt }, ms);
  }

  function distance(a, b) {
    var r = Math.PI / 180;
    var x = Math.pow(Math.sin((b.lat - a.lat) * r / 2), 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.pow(Math.sin((b.lon - a.lon) * r / 2), 2);
    return 6371 * 2 * Math.asin(Math.sqrt(x));
  }

  function stopPlane() {
    if (planeTimer) cancelAnimationFrame(planeTimer);
    planeTimer = null;
    if (world) world.htmlElementsData([]);
  }

  // Avión que recorre la ruta (con sus escalas) en bucle, remolcando la pancarta de VuelaClic
  function flyPlane(path) {
    stopPlane();
    var aps = airportsOf(path);
    var legs = aps.length - 1;
    if (legs < 1) return;
    // u va de 0 a «legs»: la parte entera es el tramo y la decimal, cuánto lleva recorrido
    function at(u) {
      var li = Math.min(Math.floor(u), legs - 1);
      return lerpGreatCircle(aps[li], aps[li + 1], u - li);
    }
    var plane = { kind: 'plane', lat: aps[0].lat, lng: aps[0].lon };
    var banner = { kind: 'banner', lat: aps[0].lat, lng: aps[0].lon };
    if (reduced()) {
      var mid = at(legs / 2);
      banner.lat = mid.lat; banner.lng = mid.lng;
      world.htmlElementsData([banner]);
      return;
    }
    world.htmlElementsData([plane, banner]);
    var start = performance.now(), perLeg = 2600, gap = 0.2;
    function step(now) {
      var u = (Math.max(0, now - start) % (perLeg * legs)) / perLeg;
      var p = at(u), q = at(Math.min(u + 0.01, legs)), b = at(Math.max(u - gap, 0));
      plane.lat = p.lat; plane.lng = p.lng;
      banner.lat = b.lat; banner.lng = b.lng;
      world.htmlElementsData([plane, banner]);
      if (plane.el) plane.el.firstChild.style.transform = 'rotate(' + bearing(p, q) + 'deg)';
      // la pancarta aparece cuando el avión ya ha despegado y se recoge al aterrizar
      if (banner.el) banner.el.style.opacity = u < gap || u > legs - 0.03 ? 0 : 1;
      planeTimer = requestAnimationFrame(step);
    }
    planeTimer = requestAnimationFrame(step);
  }

  function caption(path, note) {
    var aps = airportsOf(path);
    var km = 0;
    for (var i = 1; i < aps.length; i++) km += distance(aps[i - 1], aps[i]);
    stage.querySelector('.stage-route').textContent = path.join(' → ');
    stage.querySelector('.stage-note').textContent = Math.round(km).toLocaleString('es-ES') + ' km' + (note ? ', ' + note : '');
  }

  VC.routeGlobe = {
    // Al lanzar la búsqueda: vuela la cámara hasta la ruta y anima el avión
    search: function (path) {
      document.getElementById('route-stage').classList.add('is-searching');
      return init().then(function () {
        stage.hidden = false;
        size();
        var a = VC.airport(path[0]);
        world.pointOfView({ lat: a.lat - 6, lng: a.lon, altitude: 2.2 }, 0);
        draw(path);
        caption(path, 'buscando vuelos');
        setTimeout(function () { frame(path, reduced() ? 0 : 1800); }, 250);
        flyPlane(path);
      }).catch(function () {});
    },
    // Resultados listos o vuelo señalado: muestra el trayecto con sus escalas
    show: function (path, note) {
      if (!world) return;
      stage.classList.remove('is-searching');
      draw(path);
      caption(path, note);
      frame(path, reduced() ? 0 : 900);
      flyPlane(path);
    },
    pause: stopPlane
  };
})();
