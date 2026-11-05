/* Cuentas de cliente de la demo. Lo usan la web (registro, acceso, Mis viajes)
   y el panel de la agencia (listado de clientes).
   En producción esto vive en el backend: aquí las cuentas se guardan en el
   navegador y la contraseña solo como hash, nunca en claro. */
(function () {
  'use strict';

  // Cuenta de prueba para enseñar la demo sin registrarse
  var DEMO = { name: 'Lucía', surname: 'Quispe Rojas', email: 'lucia.quispe@ejemplo.com', phone: '+34 600 000 000', password: 'viaja2026' };

  function norm(email) { return String(email || '').trim().toLowerCase(); }

  function hash(text) {
    var salted = 'vuelaclic-demo:' + text;
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(salted)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
      });
    }
    // sin contexto seguro (algunos file://) se usa un hash simple: solo es una demo
    var h = 2166136261;
    for (var i = 0; i < salted.length; i++) { h ^= salted.charCodeAt(i); h = Math.imul(h, 16777619); }
    return Promise.resolve('fnv' + (h >>> 0).toString(16));
  }

  function users() { return VC.store.get('users', []); }
  function saveUsers(list) { VC.store.set('users', list); }
  function find(email) { var e = norm(email); return users().filter(function (u) { return u.email === e; })[0] || null; }
  function publicUser(u) {
    if (!u) return null;
    var copy = Object.assign({}, u);
    delete copy.passHash;
    return copy;
  }

  var listeners = [];
  function emit() { var u = VC.auth.current(); listeners.forEach(function (fn) { fn(u); }); }

  VC.auth = {
    DEMO: DEMO,
    hash: hash,

    current: function () { return publicUser(find(VC.store.get('session', null))); },

    onChange: function (fn) { listeners.push(fn); },

    register: function (data) {
      var email = norm(data.email);
      if (find(email)) return Promise.reject(new Error('Ya hay una cuenta con ese email. Prueba a entrar.'));
      return hash(data.password).then(function (h) {
        var u = {
          id: 'u' + Date.now().toString(36),
          name: data.name.trim(), surname: data.surname.trim(), email: email, phone: (data.phone || '').trim(),
          newsletter: !!data.newsletter, createdAt: new Date().toISOString(), lastLogin: new Date().toISOString(),
          termsAcceptedAt: new Date().toISOString(),
          travellers: [], passHash: h, source: 'web'
        };
        saveUsers([u].concat(users()));
        VC.store.set('session', email);
        emit();
        return publicUser(u);
      });
    },

    login: function (email, password) {
      var u = find(email);
      return hash(password).then(function (h) {
        if (!u || u.passHash !== h) throw new Error('El email o la contraseña no coinciden.');
        VC.auth.update({ lastLogin: new Date().toISOString() }, u.email);
        VC.store.set('session', u.email);
        emit();
        return VC.auth.current();
      });
    },

    logout: function () { VC.store.set('session', null); emit(); },

    update: function (patch, email) {
      var e = email || VC.store.get('session', null);
      saveUsers(users().map(function (u) { return u.email === e ? Object.assign({}, u, patch) : u; }));
      if (!email) emit();
    },

    // Guarda los viajeros de una reserva para rellenarlos la próxima vez
    rememberTravellers: function (list) {
      var u = find(VC.store.get('session', null));
      if (!u) return;
      var saved = (u.travellers || []).slice();
      list.forEach(function (t) {
        if (!t.name || !t.doc) return;
        saved = saved.filter(function (s) { return s.doc !== t.doc; });
        saved.push({ type: t.type, name: t.name, surname: t.surname, birth: t.birth, docType: t.docType, doc: t.doc });
      });
      VC.auth.update({ travellers: saved.slice(-8) });
    },

    // Reservas del cliente: las hechas con su cuenta o con su email de contacto
    bookings: function (email) {
      var e = norm(email || VC.store.get('session', null));
      if (!e) return [];
      return VC.store.get('bookings', []).filter(function (b) {
        return b.userEmail === e || (b.contact && norm(b.contact.email) === e);
      });
    },

    all: function () { return users().map(publicUser); },

    // La cuenta de prueba se crea sola la primera vez, con un viaje pasado
    seedDemo: function () {
      if (find(DEMO.email)) return Promise.resolve();
      return hash(DEMO.password).then(function (h) {
        var created = new Date(); created.setMonth(created.getMonth() - 4);
        saveUsers(users().concat([{
          id: 'udemo', name: DEMO.name, surname: DEMO.surname, email: DEMO.email, phone: DEMO.phone,
          newsletter: true, createdAt: created.toISOString(), lastLogin: created.toISOString(), passHash: h, source: 'web',
          travellers: [{ type: 'adt', name: 'Lucía', surname: 'Quispe Rojas', birth: '1991-03-14', docType: 'DNI', doc: '12345678Z' }]
        }]));
        var dep = new Date(); dep.setMonth(dep.getMonth() - 3);
        var ret = new Date(dep); ret.setDate(ret.getDate() + 21);
        var booked = new Date(created); booked.setDate(booked.getDate() + 2);
        var iso = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
        var list = VC.store.get('bookings', []);
        list.push({
          locator: 'QX7LMA', createdAt: booked.toISOString(), userEmail: DEMO.email,
          lead: 'Lucía Quispe Rojas', pax: { adt: 1, chd: 0, inf: 0 }, cabin: 'Y',
          legs: [
            { from: 'MAD', to: 'LIM', date: iso(dep), airline: 'IB', number: 'IB 6651', dep: '23:55', stops: 0 },
            { from: 'LIM', to: 'MAD', date: iso(ret), airline: 'IB', number: 'IB 6650', dep: '19:40', stops: 0 }
          ],
          travellers: [{ type: 'adt', name: 'Lucía', surname: 'Quispe Rojas', birth: '1991-03-14', docType: 'DNI', doc: '12345678Z' }],
          contact: { email: DEMO.email, phone: DEMO.phone },
          method: 'card', total: 1012, seatsTotal: 0, net: 946, margin: 66,
          status: 'issued', settled: true, source: 'web'
        });
        VC.store.set('bookings', list);
      });
    }
  };
})();
