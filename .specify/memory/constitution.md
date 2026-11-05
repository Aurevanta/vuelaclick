# Constitución — Web de VuelaClic

> La constitución recoge los principios **no negociables** del proyecto. Toda especificación
> (`spec.md`), plan (`plan.md`) y tarea (`tasks.md`) debe poder justificarse contra estos
> artículos. Si una decisión los contradice, se cambia la decisión, no la constitución (salvo
> enmienda explícita, ver §Gobernanza).

**Versión:** 1.0.1 · **Ratificada:** 2026-10-31 · **Última enmienda:** 2026-11-05 (la web deja de ofrecer financiación; los principios no cambian)

---

## Artículo I — El dinero entra en VuelaClic y después va a GrupoVDT

El viajero **siempre** paga a VuelaClic (tarjeta, Bizum o transferencia) y VuelaClic
confirma y paga la reserva a GrupoVDT con su crédito de agencia. La web nunca envía un pago
directamente a GrupoVDT ni emite un billete sin cobro confirmado (salvo la transferencia, que solo
**bloquea** la plaza 24 h). Un flujo que se salte este orden viola este artículo.

## Artículo II — El proveedor de vuelos es intercambiable

La interfaz solo habla con `VC.api` (`search`, `cheapestByDate`, `book`). Qué responde detrás
(`mock` = simulador, `vdt` = backend con GrupoVDT) se decide en `VC.CONFIG.provider`. El simulador
devuelve **exactamente el mismo formato de oferta** que devolverá el backend, para que pasar a real
no toque la interfaz. Ninguna pantalla puede depender del simulador ni de GrupoVDT directamente.

## Artículo III — El margen y los ajustes de la agencia mandan

El precio de venta es siempre el neto de GrupoVDT más el margen de `VC.pricing`. Lo que la agencia
decide en su panel (margen, formas de pago, aviso) se lee de una **única
fuente** (`VC.settings`, en producción el backend) y se respeta en **toda** la web: tarjetas,
explorador, portada y pago. Anunciar algo que el panel ha desactivado viola este
artículo.

## Artículo IV — Sin secretos en el navegador ni en lo publicado

Las credenciales de GrupoVDT y del TPV viven **solo en el servidor**. En el repositorio
no hay contraseñas en claro: las del panel van como hash y la real de Juan está en
`credenciales-panel.md`, ignorado por git. Todo lo que hay en `web/` se publica, así que allí no van
README, notas internas ni datos de prueba sensibles. Antes de cada commit se comprueba que no viajan
secretos.

## Artículo V — Accesible y responsive, comprobado

- Contraste AA (4,5:1 en texto normal) **de día y de noche**.
- El foco del teclado nunca se pierde al repintar; todo se puede usar sin ratón.
- `prefers-reduced-motion` se respeta en cualquier animación nueva.
- Sin desbordes horizontales de **320 a 1920 px**, en la web, el panel y la página legal.

Un cambio de interfaz no está terminado hasta medirlo en esos anchos.

## Artículo VI — Verificación visual, no solo «sin errores en consola»

Todo cambio visible se comprueba **en el navegador**, con capturas de pantalla, en modo día y noche
y en móvil. Los fallos reales del proyecto (texto blanco sobre blanco en el aviso nocturno, sello
encima de «LIM», tarjeta estirada en la transición) no daban ningún error: solo se vieron mirando.

## Artículo VII — Movimiento con intención

Hay **un** gesto visual protagonista (la ruta de vuelo que sigue al scroll) y el resto del
movimiento responde a lo que hace el usuario (elegir, abrir, pagar). No se añaden apariciones al
hacer scroll en cada sección ni efectos decorativos sueltos. Cada efecto nuevo funciona sin el
navegador más moderno (respaldo) y sin animación si el usuario la ha desactivado.

## Artículo VIII — Marca: VuelaClic en la web, Aurevanta en sus documentos

- La web usa la identidad de VuelaClic: tokens de `:root` en `css/styles.css` y el símbolo
  `#vc-logo`. Ningún color de marca se escribe suelto fuera de los tokens.
- Los documentos de Aurevanta Labs (presupuestos, facturas) siguen su guía: fondo oscuro, Geist,
  degradado de marca con moderación y **logo original sin recolorear ni sobre fondo claro**.

## Artículo IX — Privacidad y legalidad por defecto

- Sin cookies de analítica ni publicidad sin aviso de consentimiento previo.
- Aceptar las condiciones es obligatorio antes de pagar y se guarda la fecha de aceptación.
- Los datos de los viajeros solo se usan para emitir; en producción se guardan en el servidor,
  nunca en `localStorage`.
- Los textos legales se completan y los revisa un abogado antes de vender de verdad.

## Artículo X — Estático y sin compilación (la web)

La web es HTML, CSS y JavaScript sin paso de compilación: scripts clásicos (no módulos ES),
patrón IIFE y espacio de nombres `VC`. Las librerías van con versión fija y servidas en local
(`web/vendor/`). El backend de la fase real (spec 002) es un proyecto aparte y no cambia esta regla.

## Artículo XI — Publicar lo decide el usuario

Cada cambio se sube a la rama `miguel` y se despliega como **borrador** de Netlify. El paso a
producción lo hace el usuario (Netlify → Deploys → Publish deploy). Mientras sea demo, la web lleva
`X-Robots-Tag: noindex`.

---

## Gobernanza

- Esta constitución prevalece sobre cualquier otra práctica del repositorio.
- **Flujo SDD:** toda funcionalidad nueva empieza con `specs/NNN-nombre/spec.md` (qué y por qué),
  sigue con `plan.md` (cómo) y `tasks.md` (pasos), y solo después se implementa. Las dudas abiertas
  se marcan `[NEEDS CLARIFICATION]` y se resuelven antes de implementar esa parte.
- **Enmiendas:** requieren justificación escrita, incremento de versión y actualización de los
  artefactos SDD afectados.
- **Versionado semántico de la constitución:** MAJOR = se elimina o redefine un principio;
  MINOR = se añade un principio o una sección; PATCH = aclaraciones sin cambio de significado.
- Toda revisión de código comprueba el cumplimiento de estos artículos. La complejidad que los
  contradiga debe justificarse o rechazarse.
