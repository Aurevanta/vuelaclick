# Especificación — Demo de la web de VuelaClic

**Feature ID:** 001 · **Estado:** entregada (demo) · **Fecha:** 2026-10-30 · Plan: [`plan.md`](plan.md)

> QUÉ y POR QUÉ. El cómo está en [`plan.md`](plan.md) y el avance en [`tasks.md`](tasks.md).
> Especificación escrita a posteriori (31/10/2026) para pasar el proyecto a SDD: recoge lo que ya
> está construido y funciona en la demo.

## 1. Resumen

VuelaClic es una agencia de viajes de una persona (Juan Gómez) que vende vuelos a Latinoamérica,
sobre todo por WhatsApp. Pidió una **muestra de web moderna** para enseñar a sus clientes:
- un buscador de vuelos con resultados verosímiles (simulador, porque aún no hay API de GrupoVDT);
- su propio cobro al viajero, que después él paga a GrupoVDT (Art. I);
- efectos visuales del mundo de los viajes y los colores y tipografías de sus creatividades.

La demo está publicada en Netlify (`vuelaclick.netlify.app`) y guarda todo en el navegador.

## 2. Usuarios

| Usuario | Necesidad |
|---|---|
| Viajero (cliente de VuelaClic) | Encontrar un vuelo barato con maleta, pagarlo como le venga mejor y tener el billete en el móvil |
| Viajero con cuenta | Reservar más rápido con sus datos guardados y ver sus viajes |
| Juan (agente, administrador) | Ver ventas y margen, cobrar transferencias, saber cuánto debe a GrupoVDT y ajustar la web sin programar |

## 3. Historias de usuario

- **US-01 — Buscar como hablo.** Como viajero, quiero escribir «Lima en Navidad con mi madre, máximo 1.300 €» y que el buscador se rellene solo.
- **US-02 — Buscar con formulario.** Como viajero, quiero buscar ida y vuelta, solo ida o multidestino, con viajeros y clase.
- **US-03 — Comparar.** Como viajero, quiero ver precios por día, filtrar (escalas, horario, aerolínea, equipaje, presupuesto) y ordenar (recomendado, más barato, más rápido).
- **US-04 — Ver la ruta.** Como viajero, quiero ver en un globo 3D por dónde vuela cada opción.
- **US-05 — Reservar.** Como viajero, quiero revisar el viaje, poner los datos de quien viaja, elegir asiento y pagar con tarjeta, Bizum, transferencia o en cuotas.
- **US-06 — Tener el billete.** Como viajero, quiero un billete con localizador y QR, enviarlo por WhatsApp y añadirlo al calendario.
- **US-07 — Inspirarme.** Como viajero, quiero ver destinos destacados con precio y un mapa de «¿a dónde puedo ir con X €?» en total o en cuotas.
- **US-08 — Mi cuenta.** Como viajero, quiero registrarme, entrar, ver mis viajes y guardar a mis acompañantes.
- **US-09 — Panel de agencia.** Como Juan, quiero entrar con contraseña y ver ventas, margen, deuda con GrupoVDT, cobros pendientes, reservas y clientes.
- **US-10 — Controlar la web.** Como Juan, quiero cambiar el margen, activar o quitar formas de pago, fijar el mínimo para financiar y publicar un aviso.
- **US-11 — Confiar.** Como viajero, quiero leer las condiciones, la privacidad y las cookies antes de pagar.
- **US-12 — Una web que enamore.** Como Juan, quiero una web con identidad propia que se recuerde: logo con presencia, cielo que cambia con la hora, modo noche y movimiento de viaje.

## 4. Requisitos funcionales

### Búsqueda y resultados
- **FR-01:** Asistente en lenguaje natural que entiende destino, fechas (incluidas Navidad y Semana Santa), viajeros, presupuesto, clase, directos y equipaje.
- **FR-02:** Buscador con autocompletado de aeropuertos (combobox accesible), tres tipos de viaje y validación: origen ≠ destino, fechas desde hoy, vuelta ≥ ida y tramos en orden.
- **FR-03:** Calendario de 7 días con el precio mínimo de cada día, filtros, ordenación y presupuesto por persona.
- **FR-04:** Globo 3D con la ruta y las escalas de la opción señalada; se carga solo al buscar.
- **FR-05:** Precio final con tasas y margen de la agencia; mensaje de cuotas solo si la financiación está activa y supera el mínimo (Art. III).

### Reserva y billete
- **FR-10:** Reserva en 5 pasos: viaje, viajeros, asientos, pago y billete.
- **FR-11:** Plano de asientos por vuelo y viajero, con precio por tipo y asientos de salida de emergencia.
- **FR-12:** Formas de pago según el panel; transferencia bloquea la plaza 24 h; financiación con Fliinow (100 € y 3, 6 o 12 cuotas).
- **FR-13:** Aceptación obligatoria de condiciones y privacidad antes de pagar, guardando la fecha.
- **FR-14:** Billete con localizador, QR, sello «EMITIDO» o «RESERVADO», envío por WhatsApp y archivo `.ics`.

### Cuentas de cliente
- **FR-20:** Registro, acceso, «Mis viajes» (próximos y anteriores), datos y viajeros guardados; contraseñas solo como hash.
- **FR-21:** Con sesión iniciada, contacto y viajeros se rellenan solos; al reservar sin cuenta se ofrece crearla y el viaje queda asociado.

### Panel de la agencia
- **FR-30:** Acceso con usuario y contraseña (Juan como administrador y una cuenta de demostración).
- **FR-31:** Ventas, margen, deuda con GrupoVDT, cobros pendientes y gráfico de 14 días.
- **FR-32:** Margen ajustable en caliente; liquidación con GrupoVDT y crédito disponible.
- **FR-33:** Reservas con ficha (vuelos, viajeros, contacto, cobro), confirmar transferencia, cancelar y reembolsar con doble confirmación.
- **FR-34:** Clientes con filtros, búsqueda y exportación CSV de los que aceptan ofertas.
- **FR-35:** Ajustes que cambian la web: formas de pago, mínimo para financiar y aviso superior.

### Contenido, legal y marca
- **FR-40:** Destinos destacados (9, sin huecos en la rejilla), explorador por presupuesto, calculadora de cuotas y logos reales de aerolíneas.
- **FR-41:** Página legal: aviso legal, condiciones de contratación, privacidad, cookies y créditos de fotos.
- **FR-42:** Logo de VuelaClic fiel al original, más grande en la cabecera y compacto al bajar.
- **FR-43:** Modo noche (luna y estrellas) y cielo según la hora real; `?cielo=` para enseñarlo en demos.
- **FR-44:** Movimiento: ruta de vuelo ligada al scroll, tarjeta que se transforma en la reserva, totales que ruedan, sello del billete y puntero de avión.

## 5. Requisitos no funcionales

- **NFR-01:** Accesibilidad AA y foco conservado (Art. V).
- **NFR-02:** Sin desbordes de 320 a 1920 px (Art. V).
- **NFR-03:** Cabeceras de seguridad en Netlify (CSP, frame-ancestors, nosniff…) y nada interno publicado (Art. IV).
- **NFR-04:** Portada ligera: imágenes diferidas y globo cargado al buscar.
- **NFR-05:** Sin compilación (Art. X).

## 6. Fuera de alcance

Conexión real con GrupoVDT, cobro real, servidor y base de datos: son la [spec 002](../002-integracion-vdt-pagos/spec.md).
Todo dato de la demo vive en `localStorage` del navegador.

## 7. Criterios de aceptación

- Una búsqueda de la portada devuelve ofertas, y la reserva completa termina en un billete con QR en menos de 2 minutos.
- Lo que se cambia en el panel (margen, pagos, aviso) se ve en la web al recargar.
- La [auditoría](../../docs/auditoria/audit-report.md) no deja hallazgos P1 propios de la demo abiertos (los P1 restantes son de la fase real).
