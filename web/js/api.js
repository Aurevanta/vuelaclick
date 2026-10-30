/* Capa de acceso a datos. La interfaz no sabe de dónde vienen los vuelos:
   siempre llama a VC.api.*, y aquí se decide si responde el simulador o GrupoVDT.

   Flujo de cobro acordado con el cliente:
     1. El viajero paga a VuelaClic (tarjeta, Bizum, transferencia o financiación).
     2. VuelaClic confirma la reserva en GrupoVDT y le paga con su crédito de agencia.
     3. GrupoVDT emite el billete y VuelaClic lo envía al viajero.
   Por eso el pago nunca va directo a VDT desde la web. */
(function () {
  VC.CONFIG = {
    // 'mock' para la demo. Cambiar a 'vdt' cuando exista el backend con credenciales.
    provider: 'mock',
    // Backend propio que habla con GrupoVDT (las credenciales nunca van al navegador)
    apiBase: '/api'
  };

  // Almacenamiento local de la demo: margen y reservas hechas en este navegador.
  // En producción todo esto vive en el backend.
  VC.store = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem('vc.' + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { localStorage.setItem('vc.' + key, JSON.stringify(value)); } catch (e) { /* modo privado */ }
    }
  };

  // GrupoVDT vende a tarifa neta; VuelaClic añade su margen en porcentaje.
  VC.pricing = {
    get markup() { return VC.store.get('markup', 7); },
    set markup(v) { VC.store.set('markup', v); },
    sell: function (net) { return Math.round(net * (1 + this.markup / 100)); }
  };

  function withMargin(offer) {
    offer.net = offer.price;
    offer.netPerAdult = offer.pricePerAdult;
    offer.price = VC.pricing.sell(offer.price);
    offer.pricePerAdult = VC.pricing.sell(offer.pricePerAdult);
    return offer;
  }

  function post(path, body) {
    return fetch(VC.CONFIG.apiBase + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) {
      if (!res.ok) throw new Error('El servicio de vuelos respondió ' + res.status);
      return res.json();
    });
  }

  var providers = {
    mock: {
      label: 'Simulador de demostración',
      search: function (params) {
        return VC.simulator.search(params).then(function (res) {
          res.legs.forEach(function (leg) { leg.offers.forEach(withMargin); });
          return res;
        });
      },
      cheapestByDate: function (leg, pax, cabin, dates) {
        return Promise.resolve(VC.simulator.cheapestByDate(leg, pax, cabin, dates).map(function (r) {
          return { date: r.date, price: r.price === null ? null : VC.pricing.sell(r.price) };
        }));
      },
      book: function (booking) {
        return VC.simulator.book(booking).then(function (res) {
          var list = VC.store.get('bookings', []);
          list.unshift(Object.assign({}, booking, {
            locator: res.locator,
            createdAt: new Date().toISOString(),
            status: booking.method === 'transfer' ? 'awaiting' : 'issued'
          }));
          VC.store.set('bookings', list.slice(0, 50));
          return res;
        });
      }
    },

    // Pendiente: GrupoVDT no publica su API. Al recibir la documentación,
    // el backend expondrá estos tres endpoints, aplicará el margen y traducirá
    // sus respuestas al mismo formato de oferta que genera el simulador.
    vdt: {
      label: 'GrupoVDT',
      search: function (params) { return post('/flights/search', params); },
      cheapestByDate: function (leg, pax, cabin, dates) {
        return post('/flights/calendar', { leg: leg, pax: pax, cabin: cabin, dates: dates });
      },
      book: function (booking) { return post('/bookings', booking); }
    }
  };

  VC.api = {
    get provider() { return providers[VC.CONFIG.provider]; },
    search: function (params) { return this.provider.search(params); },
    cheapestByDate: function (leg, pax, cabin, dates) { return this.provider.cheapestByDate(leg, pax, cabin, dates); },
    book: function (booking) { return this.provider.book(booking); }
  };
})();
