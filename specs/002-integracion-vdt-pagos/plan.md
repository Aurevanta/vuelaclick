# Plan: web real con GrupoVDT, pagos y servidor

**Feature ID:** 002 · Acompaña a [`spec.md`](spec.md) · Tareas: [`tasks.md`](tasks.md)

## Contexto

La demo (spec 001) ya tiene la interfaz completa y un contrato de datos estable: `VC.api` con
`search`, `cheapestByDate` y `book`, y el formato de oferta del simulador. Falta lo que no puede
vivir en el navegador: credenciales, cobro, emisión y datos de clientes.

## Decisión de arquitectura (propuesta)

```
Navegador (web/, estática, Netlify) ──HTTPS──▶ API de VuelaClic (servidor propio)
                                                 ├─ GrupoVDT (API de vuelos)
                                                 ├─ Redsys (tarjeta y Bizum) ◀── notificación del banco
                                                 ├─ Fliinow (financiación)
                                                 ├─ Correo saliente (SMTP)
                                                 └─ Base de datos (cuentas, reservas, ajustes)
```

- **Servidor:** Node.js con un framework ligero (Fastify o Express) y PostgreSQL, en la VM de Aurevanta
  con Coolify (IP fija, por si GrupoVDT la exige). `[NEEDS CLARIFICATION]` hasta conocer la API.
- **La web sigue en Netlify** (Art. X) y cambia `VC.CONFIG.provider` a `vdt` y `apiBase` a la URL del servidor.
- **Contrato:** el servidor traduce las respuestas de GrupoVDT al formato de oferta del simulador
  (Art. II); si GrupoVDT cambia, se toca solo el adaptador.

## Endpoints

| Método y ruta | Qué hace | Requisitos |
|---|---|---|
| `POST /api/flights/search` | Tramos, viajeros y clase → ofertas con margen | FR-60, FR-63 |
| `POST /api/flights/calendar` | Un tramo y 7 fechas → precio mínimo por fecha | FR-60 |
| `POST /api/flights/reprice` | Confirma el precio antes de cobrar | FR-61 |
| `POST /api/bookings` | Crea la reserva «pendiente de pago» y devuelve el formulario de Redsys o los datos de transferencia | FR-70–FR-72 |
| `POST /api/payments/redsys/notify` | Notificación firmada del banco → marca pagada y lanza la emisión | FR-70, FR-73 |
| `GET /api/bookings/:locator` | Estado de la reserva para la pantalla del billete | US-32 |
| `/api/auth/*` | Registro, acceso, recuperación, sesión | FR-80 |
| `/api/admin/*` | Panel: reservas, clientes, margen, ajustes, confirmar transferencia, cancelar | FR-81 |

## Estados de una reserva

```
pendiente_de_pago ──pago confirmado──▶ pagada ──emisión OK──▶ emitida
       │                                  └──emisión falla──▶ pendiente_de_emision (aviso a Juan)
       └──transferencia vence (24 h)──▶ anulada
emitida ──cancelación en el panel──▶ cancelada (reembolso fuera de la API)
```

Solo `pagada` permite emitir (Art. I).

## Fases (las del presupuesto)

1. **Semana 1 — Base:** servidor, base de datos, cuentas y panel con sesión segura.
2. **Semanas 2–3 — GrupoVDT:** adaptador, búsqueda, calendario, reprecio, reserva y emisión en pruebas.
3. **Semana 4 — Pagos:** Redsys (tarjeta y Bizum) con notificación, transferencia y Fliinow en pruebas.
4. **Semana 5 — Publicación:** pruebas con el cliente, accesos reales, quitar lo de demo y publicar.

## Cumplimiento de la constitución

| Artículo | Cómo se cumple |
|---|---|
| I | Máquina de estados: solo se emite desde `pagada`, confirmada por la notificación del banco |
| II | Adaptador de GrupoVDT al formato del simulador; la interfaz no cambia |
| III | Margen y ajustes en la base de datos, leídos por la web y el panel |
| IV | Credenciales solo en variables de entorno del servidor; hash Argon2id/bcrypt |
| IX | Datos personales en el servidor; contrato de encargado del tratamiento |
| X | La web sigue estática en Netlify |

## Riesgos

| Riesgo | Mitigación |
|---|---|
| API de GrupoVDT en XML/SOAP o con certificación | Cláusula API 02: se presupuesta aparte antes de empezar |
| GrupoVDT tarda en dar acceso | Cláusula API 05: a los 60 días se publica con reserva por WhatsApp |
| Cobro sin emisión | Estado `pendiente_de_emision` y aviso inmediato |
| Límites de peticiones | Caché de búsquedas (FR-63) |
