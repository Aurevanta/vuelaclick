# Auditoría de la web de VuelaClic

**Fecha:** 31 de octubre de 2026 · **Rama:** `miguel` (commit `20b85a5`) · **Alcance:** carpeta `web/` y `netlify.toml`
**Modo de operación:** MODO-A (acceso al código, servidor local y navegador) · **Tipo:** AUDIT-ONLY (sin cambios en el código)

La web es una **demo estática** (HTML, CSS y JavaScript sin compilación) que simula el buscador, la reserva y el panel de la agencia. Varios hallazgos solo importan **cuando la web pase a ser real**, y así se indica en cada uno.

## Resumen de hallazgos

| Severidad | Nº | Hallazgos |
|---|---|---|
| P0 Crítica | 0 | — |
| P1 Alta | 4 | F-0001 acceso al panel solo en el navegador · F-0002 foco de teclado perdido · F-0003 elementos de demo que bloquean el lanzamiento · F-0004 datos personales en el navegador |
| P2 Media | 7 | F-0005 cabeceras de seguridad · F-0006 README público · F-0007 contraste · F-0008 financiación ignora los ajustes · F-0009 aria-live excesivo · F-0010 Google Fonts · F-0011 publicidad de crédito (hipótesis) |
| P3 Baja | 9 | F-0012 favicon · F-0013 metadatos SEO · F-0014 validación multidestino · F-0015 fechas en UTC · F-0016 utilidades duplicadas · F-0017 logo duplicado · F-0018 imágenes · F-0019 pestañas con teclado · F-0020 enlace de créditos |

El detalle de cada hallazgo, en formato para máquina, está en [findings.json](findings.json).

---

## F0 · Reconocimiento

- **Páginas:**
  - `index.html`: web pública con buscador, resultados, reserva y cuenta.
  - `admin.html`: panel de la agencia.
  - `legal.html`: aviso legal, condiciones, privacidad y cookies.
- **Código:** 6.098 líneas entre JS, CSS y HTML. Los archivos más grandes son `app.js` (1.481 líneas) y `styles.css` (1.232).
- **Librerías:** `globe.gl` 2.34.4 (1,48 MB, se carga solo al buscar) y `qrcode-generator` 1.4.4, servidas en local.
- **Datos:** `localStorage` hace de "base de datos" de la demo. Guarda reservas, cuentas, margen y ajustes.
- **Despliegue:** Netlify, con `publish = "web"`. La única cabecera propia es `X-Robots-Tag: noindex`.

## F1 · Patologías típicas del código generado por IA

| Comprobación | Resultado |
|---|---|
| Funciones o imports inexistentes | No encontrados. No hay errores de JS en la consola en ninguna página. |
| Marcadores olvidados (`TODO`, `YOUR_…`, `password123`) | No. Los `@ejemplo.com` y los datos `[en amarillo]` de `legal.html` son intencionados y están documentados. |
| Paradigmas mezclados | No. Todo usa el mismo patrón: IIFE + espacio de nombres `VC`. |
| Archivos de más de 800 líneas mezclando responsabilidades | Sí: `app.js` → F-0016. |
| Credenciales en el código | Solo las de demo. Juan solo como hash. → F-0001 y F-0006. |

## F2 · Arquitectura

- La capa `VC.api` separa bien la interfaz del proveedor: con `mock` responde el simulador y con `vdt` el backend futuro. Es el punto fuerte para conectar GrupoVDT.
- `VC.settings`, `VC.auth` y `VC.pricing` ya funcionan como contratos que el backend podrá implementar.
- Lo que falta en arquitectura es el backend en sí: autenticación, almacenamiento y pagos (F-0001, F-0004).

## F3 · Calidad de código y fallos funcionales

- **F-0008:** la financiación se anuncia aunque el panel la desactive. Hay mínimos fijos de 300 € en `app.js:726` y `explorer.js:102`.
- **F-0014:** en multidestino no se comprueba el orden de las fechas entre tramos.
- **F-0015:** hay dos cálculos de "hoy" en UTC. Lo correcto, como en el resto, es la hora local.
- **F-0016 y F-0017:** hay utilidades y el símbolo del logo duplicados.
- **Revisado y sin fallos:** validación del buscador (mismo origen y destino, fechas pasadas, vuelta antes de la ida), cálculo del total con asientos, desglose de precios y flujo de cancelación del panel con doble confirmación.

## F4 · Seguridad (OWASP)

- **A03 Inyección / XSS: sin hallazgos.** Revisé los 42 usos de `innerHTML` e `insertAdjacentHTML`. Todos los datos que escribe el usuario (nombres, emails, teléfonos, documentos, aviso del panel) pasan por `esc()` o por `textContent`. El asistente solo pinta ciudades y números que él mismo calcula.
- **A07 Autenticación: F-0001.** El panel se abre poniendo `sessionStorage.vc.adminSession` a mano, verificado en el navegador. Para la demo es aceptable. Para la web real es imprescindible un backend.
- **A05 Configuración: F-0005.** Faltan CSP, `frame-ancestors`, `nosniff`, `Referrer-Policy` y `Permissions-Policy`. HSTS sí está.
- **Exposición de información: F-0006.** `README.md` es público en Netlify y contiene las credenciales de demo.
- **Enlaces externos:** todos llevan `rel="noopener"`. Los `target="_blank"` sin él apuntan a la propia web, sin riesgo.
- **Contraseña real de Juan:** fuera del repositorio, en `credenciales-panel.md`, ignorado por git. Correcto.

## F5 · Rendimiento

- **Portada:** unos 540 KB de recursos, sin contar las fotos ni el globo. DOMContentLoaded a los 463 ms en local.
- **Bien hecho:** las 27 imágenes usan `loading="lazy"`. El globo (1,48 MB) solo se descarga al hacer la primera búsqueda. `prefers-reduced-motion` desactiva las animaciones.
- **Mejorable:** fotos de 960 px sin `srcset` ni WebP/AVIF (F-0018). `data/countries.js` (158 KB) se carga aunque el usuario no llegue al explorador (mejora menor, no se registra como hallazgo).

## F6 · Interfaz y accesibilidad

No pude usar axe-core porque está bloqueado al ser código externo. Hice las mismas comprobaciones con un script propio en 8 estados: portada, resultados, cada paso de la reserva, registro y modo noche.

- **Sin problemas:**
  - todos los botones y enlaces tienen nombre accesible;
  - todos los campos tienen etiqueta;
  - no hay IDs duplicados y hay un único `h1`;
  - los diálogos tienen título;
  - el autocompletado tiene rol `combobox` con `aria-activedescendant`;
  - cada asiento se describe ("Fila 12, asiento A, ventanilla, 18 €").
- **Responsive:** sin desbordes de 320 a 1920 px (auditoría anterior).
- **F-0002 (P1):** el foco se pierde al volver a pintar el contenido. Verificado: `document.activeElement` pasa a `BODY` tras elegir un asiento, abrir detalles o elegir un vuelo.
- **F-0007:** contrastes por debajo de 4,5:1. Están medidos en el propio hallazgo.
- **F-0009:** la sección entera de resultados es `aria-live`.
- **F-0019:** las pestañas no se manejan con las flechas del teclado.
- **F-0012 y F-0020:** falta favicon y el enlace de créditos abre un `.md` en bruto.

## F7 · Internacionalización

La web está solo en español, y es lo previsto. Los precios usan `Intl.NumberFormat('es-ES')` y las fechas `Intl.DateTimeFormat('es-ES')`, que es correcto. No hay hallazgos.

## F8 · Dependencias

Hay dos librerías, con versión fija, servidas en local y con licencia MIT. No tienen vulnerabilidades conocidas relevantes para este uso: no procesan datos de terceros. No hay `package.json` ni dependencias de compilación.

## F9 · API y contratos

El backend de GrupoVDT todavía no existe. Los tres endpoints previstos (`/api/flights/search`, `/api/flights/calendar` y `/api/bookings`) están documentados en el README. No hay hallazgos en la parte simulada.

## F10 · Observabilidad

En la demo no hay registro de errores ni analítica, y es coherente con la política de cookies. **Para la web real** hará falta un registro de errores en el backend y alertas si falla la conexión con GrupoVDT o con la pasarela de pago. Si se añade analítica, primero habrá que añadir el aviso de consentimiento.

## F11 · Infraestructura

Ver F-0005 (cabeceras) y F-0006 (archivos publicados). El HTTPS y el HSTS de Netlify están bien.

## F12 · Privacidad y RGPD

- **F-0004:** datos de identidad en `localStorage`. Aceptable en la demo; en la web real tienen que ir al backend.
- **F-0010:** Google Fonts envía la IP de cada visitante a Google.
- **F-0011 (por confirmar):** los mensajes de "cuotas sin intereses" pueden exigir información obligatoria de crédito al consumo.
- **Bien hecho:**
  - casilla de condiciones obligatoria antes de pagar, guardando la fecha de aceptación;
  - casilla de ofertas separada y opcional;
  - política de privacidad con bases legales y plazos de conservación;
  - sin cookies de seguimiento.

## F13 · Documentación y SEO

- El README está completo: guion de la demo, estructura e integración con GrupoVDT. Pero se publica (F-0006).
- **F-0013:** faltan Open Graph, canonical, JSON-LD, robots.txt y sitemap. Solo importa cuando se quite el `noindex`.

---

## Hipótesis a confirmar

- **F-0011:** si los mensajes de cuotas obligan a mostrar TIN, TAE e importe total depende de cómo comercialice Fliinow su producto. Hay que confirmarlo con Fliinow y con el asesor legal.
- **CSP y globo:** al añadir la CSP (F-0005) hay que comprobar que `globe.gl` funciona sin `unsafe-eval`. No lo he verificado.

## Qué no se ha podido revisar

- El backend, la pasarela de pago y la integración con GrupoVDT, porque aún no existen.
- Accesibilidad con lectores de pantalla reales (NVDA, VoiceOver). Solo revisé estructura y ARIA.
- El rendimiento en una red móvil real. Medí en local, sin limitar la conexión.
