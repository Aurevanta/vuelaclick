# Tareas — Web real: GrupoVDT, pagos y servidor

**Feature ID:** 002 · Acompaña a [`spec.md`](spec.md) y [`plan.md`](plan.md) · Fecha: 2026-10-31

## F0 — Antes de empezar (bloqueantes)
- [ ] V001 Aceptación del presupuesto y pago de inicio
- [ ] V002 Documentación, entorno de pruebas y credenciales de GrupoVDT; confirmar si es REST/JSON `[NEEDS CLARIFICATION]`
- [ ] V003 Alta del TPV virtual en Redsys con Bizum y claves de pruebas `[NEEDS CLARIFICATION]`
- [ ] V005 Dominio, correo y datos legales de VuelaClic `[NEEDS CLARIFICATION]`
- [ ] V006 Elegir alojamiento del servidor (VM con Coolify si GrupoVDT exige IP fija) `[NEEDS CLARIFICATION]`

## F1 — Base (semana 1)
- [ ] V010 Servidor Node.js + PostgreSQL con migraciones, variables de entorno y copias diarias (NFR-10, NFR-11)
- [ ] V011 Cuentas en el servidor: registro, acceso, recuperación, Argon2id/bcrypt, cookie segura y límite de intentos (FR-80)
- [ ] V012 Panel con datos del servidor: reservas, clientes, margen y ajustes (FR-81)
- [ ] V013 Pasar `account-ui.js`, `accounts.js` y `admin.js` de `localStorage` a la API (FR-80, FR-81)

## F2 — GrupoVDT (semanas 2–3)
- [ ] V020 Adaptador de GrupoVDT → formato de oferta del simulador, con tests sobre respuestas reales grabadas (FR-60)
- [ ] V021 `POST /api/flights/search` y `/calendar` con caché (FR-60, FR-63)
- [ ] V022 `POST /api/flights/reprice` y aviso de cambio de precio en la reserva (FR-61)
- [ ] V023 Reserva y emisión en pruebas; asientos y equipaje como solicitud si la API no los ofrece (FR-60, FR-62)
- [ ] V024 Avisos de caída de GrupoVDT en la web (FR-64)

## F3 — Pagos (semana 4)
- [ ] V030 Redsys: formulario firmado, notificación `notify` verificada y estados de la reserva (FR-70, FR-73)
- [ ] V031 Transferencia con bloqueo de 24 h y anulación automática (FR-71)
- [ ] V033 Emisión fallida → `pendiente_de_emision` y aviso (FR-73, FR-83)
- [ ] V034 Correos de reserva, billete, transferencia y contraseña (FR-82)

## F4 — Publicación (semana 5)
- [ ] V040 `VC.CONFIG.provider = 'vdt'` y `apiBase` del servidor; CSP con el dominio de la API
- [ ] V041 Quitar `noindex`, «Rellenar con datos de prueba», avisos de demo y `?cielo=` si no se quiere público (NFR-13)
- [ ] V042 Completar `legal.html` y revisión de un abogado; contrato de encargado del tratamiento (Art. IX)
- [ ] V043 Pruebas de aceptación de la spec (compra completa, emisión fallida, cierre del navegador tras pagar)
- [ ] V044 Paso a producción con accesos reales y primeras emisiones supervisadas (cláusula API 12)
