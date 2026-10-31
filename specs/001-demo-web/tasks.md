# Tareas — Demo de la web de VuelaClic

**Feature ID:** 001 · Acompaña a [`spec.md`](spec.md) y [`plan.md`](plan.md) · Fecha: 2026-10-30

Reconstruidas desde el historial de la rama `miguel` al pasar a SDD (31/10/2026).

## F0 — Base y simulador
- [X] T001 Estructura estática, tokens de marca de las creatividades, simulador determinista y `VC.api` (FR-02, FR-03) · `ce8e42b`
- [X] T002 Reserva en 5 pasos con pagos simulados y billete con QR, WhatsApp y `.ics` (FR-10, FR-12, FR-14) · `ce8e42b`, `4ff4822`
- [X] T003 Configuración de Netlify (`publish = web`, `noindex`) · `2cc1f9b`

## F1 — Funciones «guau»
- [X] T010 Asistente en lenguaje natural (FR-01) · `4ff4822`
- [X] T011 Globo 3D de la ruta (FR-04) · `4ff4822`
- [X] T012 Explorador por presupuesto y plano de asientos (FR-11, FR-40) · `4ff4822`
- [X] T013 Panel del agente: ventas, margen, liquidación (FR-31, FR-32) · `4ff4822`
- [X] T014 Logos reales de aerolíneas y pancarta de VuelaClic en el globo (FR-40) · `4c84327`
- [X] T015 Noveno destino para cerrar la rejilla sin huecos (FR-40) · `aa63409`

## F2 — Responsive
- [X] T020 Desbordes en móvil: financiación, formulario y diálogo (NFR-02) · `4dc82e3`
- [X] T021 Panel del agente en pantallas estrechas (NFR-02) · `3cf8c61`
- [X] T022 Cabecera en una sola línea con los botones nuevos (NFR-02) · `7f61bb2`

## F3 — Cuentas, panel y legal
- [X] T030 Modo noche con luna y estrellas (FR-43) · `90457c1`
- [X] T031 Cuentas de cliente y Mis viajes (FR-20, FR-21) · `35e68ec`
- [X] T032 Panel: acceso, ficha de reserva, cancelaciones, clientes, ajustes (FR-30, FR-33–FR-35) · `35e68ec`
- [X] T033 Usuario administrador de Juan y botón «Agencia» (FR-30) · `19ab69e`
- [X] T034 Página legal y aceptación obligatoria de condiciones (FR-13, FR-41) · `2bbd98a`

## F4 — Marca y movimiento
- [X] T040 Logo fiel al original con más presencia (FR-42) · `20b85a5`
- [X] T041 Puntero de avión (FR-44) · `e0e7a03`
- [X] T042 Ruta de vuelo con el scroll, transición del billete, totales que ruedan, sello y cielo según la hora (FR-43, FR-44) · `e0b0946`

## F5 — Auditoría
- [X] T050 Auditoría completa: 20 hallazgos en [`docs/auditoria`](../../docs/auditoria/audit-report.md)
- [X] T051 Arreglos de la demo (lotes 1 y 2): foco, contraste, financiación según el panel, cabeceras, favicon, README fuera de `web/` (NFR-01, NFR-03, FR-05) · `fdae5a5`
- [ ] T052 Lote 3 de la auditoría (calidad): fuentes en local, imágenes WebP con `srcset`, pestañas con flechas, `js/utils.js` común y logo en un solo archivo (F-0010, F-0016–F-0019)
- [ ] T053 Que el usuario publique en producción el último borrador de Netlify (Art. XI)
