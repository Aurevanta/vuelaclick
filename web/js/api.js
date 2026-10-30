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
      search: VC.simulator.search,
      cheapestByDate: function (leg, pax, cabin, dates) {
        return Promise.resolve(VC.simulator.cheapestByDate(leg, pax, cabin, dates));
      },
      book: VC.simulator.book
    },

    // Pendiente: GrupoVDT no publica su API. Al recibir la documentación,
    // el backend expondrá estos tres endpoints y traducirá sus respuestas
    // al mismo formato de oferta que genera el simulador.
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
