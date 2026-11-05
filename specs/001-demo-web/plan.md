# Plan: demo de la web de VuelaClic

**Feature ID:** 001 · Acompaña a [`spec.md`](spec.md) · Tareas: [`tasks.md`](tasks.md)

## Contexto técnico

| | |
|---|---|
| Lenguaje | HTML, CSS y JavaScript sin compilación (Art. X) |
| Librerías | `globe.gl` 2.34.4 y `qrcode-generator` 1.4.4, en `web/vendor/` |
| Datos | `localStorage` (`vc.*`); siluetas de países de Natural Earth en `web/data/countries.js` |
| Tipografías | Bricolage Grotesque (titulares), Figtree (texto), Poppins solo para el logo |
| Despliegue | Netlify, carpeta `web/`, borradores con `netlify-cli@17.38.1`; producción la publica el usuario (Art. XI) |
| Pruebas | Servidor local `http-server` en el puerto 5173 y navegador integrado; auditoría responsive y de contraste por script |

## Arquitectura

```
web/index.html ─┬─ js/data.js         aeropuertos, aerolíneas, cabinas, destinos destacados
                ├─ js/simulator.js    ofertas deterministas (misma búsqueda, mismos resultados)
                ├─ js/api.js          VC.api (mock | vdt), VC.pricing, VC.settings, VC.store
                ├─ js/accounts.js     VC.auth: cuentas, hash de contraseña, viajes del cliente
                ├─ js/globe.js        globo 3D de la ruta
                ├─ js/seats.js        plano de asientos
                ├─ js/app.js          buscador, resultados, reserva, billete, tema, cabecera, movimiento
                ├─ js/account-ui.js   ventana Entrar / Crear cuenta / Mi cuenta
                ├─ js/explorer.js     mapa «¿a dónde puedo ir con X €?»
                └─ js/assistant.js    asistente en lenguaje natural
web/admin.html ── js/admin.js         panel de la agencia (usa api.js y accounts.js)
web/legal.html                        aviso legal, condiciones, privacidad, cookies, créditos
```

Todo cuelga del espacio de nombres `VC`. Las pantallas solo llaman a `VC.api`, así que cambiar
`VC.CONFIG.provider` de `mock` a `vdt` no toca la interfaz (Art. II).

## Decisiones

- **Simulador determinista** (semilla por búsqueda): la misma búsqueda da las mismas ofertas, para que
  las demos sean repetibles.
- **Margen aplicado en `api.js`** sobre el neto del proveedor (`withMargin`), no en la interfaz (Art. III).
- **`VC.settings` como única fuente** de formas de pago y aviso.
- **Seguridad de la demo:** el panel comprueba la contraseña con SHA-256 y sal fija en el navegador.
  Es solo para enseñar; la autenticación real va en el backend (spec 002, Art. IV).
- **Movimiento:** CSS scroll-driven animations y `offset-path` para la ruta, View Transitions API para la
  reserva, con respaldo en JS y sin animación si se pide movimiento reducido (Art. VII).
- **Cabeceras de Netlify:** CSP con `'unsafe-inline'` en scripts por los scripts de tema del `<head>` y
  los `onerror` de los logos; probada con globo, QR y fuentes.

## Cumplimiento de la constitución

| Artículo | Cómo se cumple |
|---|---|
| I | La reserva cobra en el paso de pago y solo después «confirma en GrupoVDT»; la transferencia bloquea 24 h |
| II | `VC.api` con proveedores `mock` y `vdt` (este último, a la espera del backend) |
| III | `VC.pricing` y `VC.settings`; el panel cambia la web |
| IV | Credenciales de Juan fuera de git; README y créditos fuera de `web/` |
| V–VI | Auditorías de contraste y desbordes en 8 estados y 8 anchos, con capturas |
| VII | Un gesto protagonista (ruta de vuelo) y el resto, respuesta a acciones |
| VIII | Tokens en `:root`; logo como símbolo `#vc-logo` |
| IX | Casilla de condiciones obligatoria, sin cookies de seguimiento |
| X | Scripts clásicos, sin `package.json` |
| XI | Borradores en Netlify; publica el usuario |

## Riesgos conocidos

- Los datos viven en el navegador: borrar el historial reinicia la demo (botón «Reiniciar demo» en el panel).
- El acceso al panel se puede saltar desde la consola (hallazgo F-0001): aceptado para la demo.
