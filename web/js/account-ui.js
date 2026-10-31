/* Área de cliente en la web: registro, acceso y "Mi cuenta" (viajes, datos y viajeros). */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var money = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, useGrouping: 'always' });
  var dayFmt = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  var sinceFmt = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
  var METHOD = { card: 'Tarjeta', bizum: 'Bizum', transfer: 'Transferencia', fin: 'Financiado con Fliinow' };

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function icon(id) { return '<svg class="ic" aria-hidden="true"><use href="#i-' + id + '"/></svg>'; }
  function initials(u) { return ((u.name || '?')[0] + (u.surname || '')[0]).toUpperCase(); }
  function city(code) { var a = VC.airport(code); return a ? a.city : code; }
  function fromIso(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function toast(msg) { if (VC.app && VC.app.toast) VC.app.toast(msg); }

  var dlg = $('#account');
  var body = $('#account-body');
  var view = 'login';
  var tab = 'trips';
  var prefill = {};

  // ---------- Botón de la cabecera ----------
  function renderHeader(u) {
    var btn = $('#account-btn');
    btn.innerHTML = u
      ? '<span class="acc-avatar" aria-hidden="true">' + esc(initials(u)) + '</span><span class="acc-name">' + esc(u.name) + '</span>'
      : icon('user') + '<span class="acc-name">Entrar</span>';
    btn.setAttribute('aria-label', u ? 'Mi cuenta, ' + u.name : 'Entrar o crear cuenta');
  }

  // ---------- Vistas ----------
  function switcher(active) {
    return '<div class="acc-switch" role="tablist">' +
      '<button type="button" role="tab" data-view="login" aria-selected="' + (active === 'login') + '">Entrar</button>' +
      '<button type="button" role="tab" data-view="register" aria-selected="' + (active === 'register') + '">Crear cuenta</button></div>';
  }

  function passField(name, label, auto) {
    return '<label class="inp">' + label + '<span class="pass-wrap"><input required type="password" name="' + name + '" minlength="' + (name === 'password' && view === 'register' ? 8 : 1) + '" autocomplete="' + auto + '">' +
      '<button type="button" class="pass-eye" data-eye aria-label="Mostrar contraseña">Ver</button></span></label>';
  }

  function loginView() {
    var d = VC.auth.DEMO;
    return '<h2 id="account-title">Hola de nuevo</h2><p class="acc-lead">Entra para ver tus viajes y reservar más rápido.</p>' +
      switcher('login') +
      '<form class="acc-form" id="login-form" novalidate>' +
        '<label class="inp">Email<input required type="email" name="email" autocomplete="email" value="' + esc(prefill.email || '') + '"></label>' +
        passField('password', 'Contraseña', 'current-password') +
        '<button type="button" class="link acc-forgot" data-forgot>¿Has olvidado la contraseña?</button>' +
        '<p class="form-error" id="acc-error" hidden></p>' +
        '<button type="submit" class="btn btn-sun acc-submit">Entrar</button>' +
      '</form>' +
      '<div class="acc-demo">' + icon('spark') + '<div><strong>Cuenta de prueba</strong><small>' + esc(d.email) + ' · ' + esc(d.password) + '</small></div>' +
        '<button type="button" class="btn btn-ghost btn-xs" data-demo>Usarla</button></div>';
  }

  function registerView() {
    return '<h2 id="account-title">Crea tu cuenta</h2><p class="acc-lead">Gratis y en un minuto. Guardamos tus viajes y los datos de quien viaja contigo.</p>' +
      switcher('register') +
      '<form class="acc-form" id="register-form" novalidate><div class="form-grid">' +
        '<label class="inp">Nombre<input required name="name" autocomplete="given-name" value="' + esc(prefill.name || '') + '"></label>' +
        '<label class="inp">Apellidos<input required name="surname" autocomplete="family-name" value="' + esc(prefill.surname || '') + '"></label>' +
        '<label class="inp full">Email<input required type="email" name="email" autocomplete="email" value="' + esc(prefill.email || '') + '"></label>' +
        '<label class="inp full">Teléfono (WhatsApp)<input required type="tel" name="phone" autocomplete="tel" value="' + esc(prefill.phone || '') + '"></label>' +
        '<div class="full">' + passField('password', 'Contraseña', 'new-password') +
          '<div class="pass-meter" aria-hidden="true"><i></i><i></i><i></i></div><small class="pass-hint" id="pass-hint">Mínimo 8 caracteres.</small></div>' +
      '</div>' +
      '<label class="check acc-check"><input type="checkbox" name="terms" required><span>He leído y acepto las <a href="legal.html#condiciones" target="_blank">condiciones</a> y la <a href="legal.html#privacidad" target="_blank">política de privacidad</a></span></label>' +
      '<label class="check acc-check"><input type="checkbox" name="newsletter" checked> Quiero recibir ofertas de vuelos por email o WhatsApp</label>' +
      '<p class="form-error" id="acc-error" hidden></p>' +
      '<button type="submit" class="btn btn-sun acc-submit">Crear cuenta</button>' +
      '</form>';
  }

  function tripCard(b) {
    var l = b.legs;
    var round = l.length === 2 && l[1].to === l[0].from;
    var path = round ? [l[0].from, l[0].to] : [l[0].from].concat(l.map(function (x) { return x.to; }));
    var status = b.status === 'cancelled' ? '<span class="chip-s bad">Cancelada</span>'
      : b.status === 'awaiting' ? '<span class="chip-s warn">Esperando transferencia</span>'
      : '<span class="chip-s ok">Billete emitido</span>';
    var wa = 'https://wa.me/34647778336?text=' + encodeURIComponent('Hola Juan, tengo una consulta sobre mi reserva ' + b.locator);
    return '<li class="trip-card">' +
      '<div class="trip-card-top"><span class="trip-route">' + path.map(function (c) { return esc(city(c)); }).join(' → ') + (round ? ' <small>ida y vuelta</small>' : '') + '</span>' + status + '</div>' +
      '<div class="trip-card-meta">' +
        '<span>' + icon('cal') + dayFmt.format(fromIso(l[0].date)).replace(/\./g, '') + (round ? ' – ' + dayFmt.format(fromIso(l[1].date)).replace(/\./g, '') : '') + '</span>' +
        '<span>' + icon('plane') + esc(l.map(function (x) { return x.number; }).join(', ')) + '</span>' +
        '<span>' + icon('user') + (b.travellers ? b.travellers.length : 1) + (b.travellers && b.travellers.length > 1 ? ' viajeros' : ' viajero') + '</span>' +
      '</div>' +
      '<div class="trip-card-foot"><span><small>Localizador</small><b class="loc">' + esc(b.locator) + '</b></span>' +
        '<span><small>' + esc(METHOD[b.method] || '') + (b.plan ? ', ' + b.plan + ' cuotas' : '') + '</small><b>' + money.format(b.total) + '</b></span>' +
        '<a class="btn btn-ghost btn-xs" href="' + wa + '" target="_blank" rel="noopener">' + icon('whatsapp') + 'Consultar</a></div>' +
    '</li>';
  }

  function profileView(u) {
    var trips = VC.auth.bookings();
    var today = new Date().toISOString().slice(0, 10);
    var upcoming = trips.filter(function (b) { return b.legs[b.legs.length - 1].date >= today && b.status !== 'cancelled'; });
    var past = trips.filter(function (b) { return upcoming.indexOf(b) < 0; });
    var html = '<div class="acc-head"><span class="acc-avatar big" aria-hidden="true">' + esc(initials(u)) + '</span>' +
      '<div><h2 id="account-title">' + esc(u.name + ' ' + u.surname) + '</h2><small>' + esc(u.email) + ' · Cliente desde ' + sinceFmt.format(new Date(u.createdAt)) + '</small></div>' +
      '<button type="button" class="link acc-logout" data-logout>Cerrar sesión</button></div>' +
      '<div class="acc-tabs" role="tablist">' +
        ['trips:Mis viajes', 'data:Mis datos', 'pax:Viajeros'].map(function (t) {
          var p = t.split(':');
          return '<button type="button" role="tab" data-tab="' + p[0] + '" aria-selected="' + (tab === p[0]) + '">' + p[1] +
            (p[0] === 'trips' && trips.length ? ' <span class="count-pill">' + trips.length + '</span>' : '') + '</button>';
        }).join('') + '</div>';

    if (tab === 'trips') {
      if (!trips.length) {
        html += '<div class="acc-empty">' + icon('suitcase') + '<h3>Aún no tienes viajes</h3><p>Cuando reserves con esta cuenta, aquí verás tus billetes, fechas y pagos.</p>' +
          '<button type="button" class="btn btn-sun" data-go-search>Buscar vuelos</button></div>';
      } else {
        if (upcoming.length) html += '<h3 class="acc-sub">Próximos viajes</h3><ul class="trip-cards">' + upcoming.map(tripCard).join('') + '</ul>';
        if (past.length) html += '<h3 class="acc-sub">Viajes anteriores</h3><ul class="trip-cards past">' + past.map(tripCard).join('') + '</ul>';
      }
    } else if (tab === 'data') {
      html += '<form class="acc-form" id="profile-form"><div class="form-grid">' +
        '<label class="inp">Nombre<input required name="name" value="' + esc(u.name) + '"></label>' +
        '<label class="inp">Apellidos<input required name="surname" value="' + esc(u.surname) + '"></label>' +
        '<label class="inp full">Email<input type="email" value="' + esc(u.email) + '" disabled></label>' +
        '<label class="inp full">Teléfono (WhatsApp)<input required type="tel" name="phone" value="' + esc(u.phone) + '"></label></div>' +
        '<label class="check acc-check"><input type="checkbox" name="newsletter"' + (u.newsletter ? ' checked' : '') + '> Recibir ofertas de vuelos</label>' +
        '<button type="submit" class="btn btn-sun acc-submit">Guardar cambios</button></form>';
    } else {
      var list = u.travellers || [];
      var typeName = { adt: 'Adulto', chd: 'Niño', inf: 'Bebé' };
      html += '<p class="acc-lead">Los rellenamos solos en tu próxima reserva.</p>' + (list.length
        ? '<ul class="pax-saved">' + list.map(function (t, i) {
            return '<li><span class="acc-avatar sm" aria-hidden="true">' + esc((t.name[0] + (t.surname[0] || '')).toUpperCase()) + '</span>' +
              '<div><strong>' + esc(t.name + ' ' + t.surname) + '</strong><small>' + typeName[t.type] + ' · ' + esc(t.docType) + ' ' + esc(t.doc) + '</small></div>' +
              '<button type="button" class="icon-btn" data-del-pax="' + i + '" aria-label="Borrar a ' + esc(t.name) + '">' + icon('close') + '</button></li>';
          }).join('') + '</ul>'
        : '<div class="acc-empty">' + icon('user') + '<h3>Sin viajeros guardados</h3><p>Se guardan al hacer tu primera reserva.</p></div>');
    }
    return html;
  }

  function render() {
    var u = VC.auth.current();
    if (u) view = 'profile';
    else if (view === 'profile') view = 'login';
    dlg.classList.toggle('is-profile', view === 'profile');
    body.innerHTML = view === 'profile' ? profileView(u) : view === 'register' ? registerView() : loginView();
  }

  function open(v, data) {
    view = v || (VC.auth.current() ? 'profile' : 'login');
    prefill = data || {};
    if (view === 'profile' && data && data.tab) tab = data.tab;
    render();
    if (!dlg.open) dlg.showModal();
    var first = $('input:not([disabled])', body);
    if (first && !first.value) first.focus();
  }

  function showError(msg) {
    var e = $('#acc-error');
    if (!e) return;
    e.textContent = msg;
    e.hidden = !msg;
  }

  function validate(form) {
    $$('input', form).forEach(function (i) { i.classList.add('touched'); });
    if (form.checkValidity()) return true;
    var bad = $('input:invalid', form);
    showError(bad && bad.name === 'terms' ? 'Tienes que aceptar las condiciones para crear la cuenta.'
      : bad && bad.name === 'password' && bad.value ? 'La contraseña necesita al menos 8 caracteres.'
      : 'Revisa los campos marcados en rojo.');
    if (bad) bad.focus();
    return false;
  }

  function strength(p) {
    var s = 0;
    if (p.length >= 8) s++;
    if (/[0-9]/.test(p) && /[a-zA-Z]/.test(p)) s++;
    if (p.length >= 12 || /[^a-zA-Z0-9]/.test(p)) s++;
    return p.length < 8 ? 0 : s;
  }

  function busy(form, on, label) {
    var b = $('.acc-submit', form);
    b.disabled = on;
    if (label) b.textContent = label;
  }

  // ---------- Eventos ----------
  function bind() {
    $('#account-btn').addEventListener('click', function () { open(); });
    $('#account-close').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) { dlg.close(); return; }
      var t = e.target;
      var v = t.closest('[data-view]');
      if (v) { view = v.dataset.view; prefill = {}; render(); var f = $('input', body); if (f) f.focus(); return; }
      var tb = t.closest('[data-tab]');
      if (tb) { tab = tb.dataset.tab; render(); return; }
      if (t.closest('[data-eye]')) {
        var btn = t.closest('[data-eye]'), inp = btn.previousElementSibling;
        var show = inp.type === 'password';
        inp.type = show ? 'text' : 'password';
        btn.textContent = show ? 'Ocultar' : 'Ver';
        btn.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
        return;
      }
      if (t.closest('[data-demo]')) {
        $('#login-form [name=email]').value = VC.auth.DEMO.email;
        $('#login-form [name=password]').value = VC.auth.DEMO.password;
        $('#login-form').requestSubmit();
        return;
      }
      if (t.closest('[data-forgot]')) {
        var em = $('#login-form [name=email]').value.trim();
        showError('');
        toast(em ? 'Te hemos enviado un enlace a ' + em + ' para crear una contraseña nueva (simulado).' : 'Escribe tu email y te mandamos un enlace para cambiarla.');
        return;
      }
      if (t.closest('[data-logout]')) {
        VC.auth.logout();
        view = 'login';
        tab = 'trips';
        dlg.close();
        toast('Has cerrado la sesión.');
        return;
      }
      if (t.closest('[data-go-search]')) {
        dlg.close();
        $('#buscar').scrollIntoView({ behavior: 'smooth' });
        return;
      }
      var del = t.closest('[data-del-pax]');
      if (del) {
        var list = (VC.auth.current().travellers || []).slice();
        list.splice(+del.dataset.delPax, 1);
        VC.auth.update({ travellers: list });
        render();
      }
    });

    dlg.addEventListener('input', function (e) {
      if (e.target.name === 'password' && view === 'register') {
        var s = strength(e.target.value);
        $$('.pass-meter i', body).forEach(function (i, n) { i.className = n < s ? 'on s' + s : ''; });
        $('#pass-hint').textContent = ['Mínimo 8 caracteres.', 'Válida. Mejor si mezclas letras y números.', 'Buena contraseña.', 'Contraseña muy segura.'][s];
      }
    });

    dlg.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target;
      showError('');
      if (!validate(f)) return;
      var data = {};
      new FormData(f).forEach(function (v, k) { data[k] = v; });

      if (f.id === 'login-form') {
        busy(f, true, 'Entrando…');
        VC.auth.login(data.email, data.password).then(function (u) {
          toast('Hola, ' + u.name + '. Ya puedes reservar con tus datos guardados.');
          tab = 'trips';
          if (prefill.returnTo === 'booking') dlg.close(); else render();
        }).catch(function (err) { busy(f, false, 'Entrar'); showError(err.message); });
      } else if (f.id === 'register-form') {
        busy(f, true, 'Creando cuenta…');
        data.newsletter = !!data.newsletter;
        VC.auth.register(data).then(function (u) {
          toast('Cuenta creada. ¡Te damos la bienvenida, ' + u.name + '!');
          tab = 'trips';
          if (prefill.returnTo === 'booking') dlg.close(); else render();
        }).catch(function (err) { busy(f, false, 'Crear cuenta'); showError(err.message); });
      } else if (f.id === 'profile-form') {
        VC.auth.update({ name: data.name.trim(), surname: data.surname.trim(), phone: data.phone.trim(), newsletter: !!data.newsletter });
        toast('Datos guardados.');
        render();
      }
    });

    VC.auth.onChange(renderHeader);
    // si inicia o cierra sesión en otra pestaña, la cabecera se entera
    window.addEventListener('storage', function (e) {
      if (e.key === 'vc.session' || e.key === 'vc.users') { renderHeader(VC.auth.current()); if (dlg.open) render(); }
    });
  }

  VC.account = { open: open };

  bind();
  renderHeader(VC.auth.current());
  VC.auth.seedDemo();
})();
