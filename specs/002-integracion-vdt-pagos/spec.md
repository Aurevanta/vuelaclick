# Especificación — Web real: GrupoVDT, pagos y servidor

**Feature ID:** 002 · **Estado:** borrador, pendiente de aceptación del presupuesto · **Fecha:** 2026-10-31 · Plan: [`plan.md`](plan.md)

> QUÉ y POR QUÉ. El cómo está en [`plan.md`](plan.md) y el avance en [`tasks.md`](tasks.md).
> Alcance y condiciones acordados en el presupuesto de Aurevanta Labs, incluido su apartado 07,
> «Condiciones de la integración con GrupoVDT». El presupuesto no se guarda en este repositorio.

## 1. Resumen

La demo (spec 001) pasa a **vender de verdad**:
- vuelos reales de GrupoVDT con el margen de VuelaClic;
- cobro real al viajero (tarjeta y Bizum por Redsys, y transferencia);
- emisión del billete en GrupoVDT solo después del cobro (Art. I);
- cuentas, reservas y panel guardados en un servidor seguro, no en el navegador (Art. IV, IX).

La interfaz de la demo se mantiene: solo cambia el proveedor de `VC.api` de `mock` a `vdt` (Art. II).

## 2. Usuarios

| Usuario | Necesidad |
|---|---|
| Viajero | Comprar un vuelo real y recibir el billete emitido |
| Juan (administrador) | Que cada venta quede cobrada, emitida y apuntada, y saber al momento si algo falla |
| Aurevanta (mantenimiento) | Detectar caídas de GrupoVDT o del banco y adaptarse a cambios de su API |

## 3. Historias de usuario

- **US-30 — Vuelos reales.** Como viajero, quiero ver vuelos y precios reales de GrupoVDT, con el precio confirmado antes de pagar.
- **US-31 — Pago real.** Como viajero, quiero pagar con tarjeta o Bizum en la página segura del banco, o por transferencia.
- **US-32 — Billete emitido.** Como viajero, quiero recibir el billete emitido por correo y WhatsApp en cuanto se confirme el pago.
- **US-33 — Nada se pierde.** Como Juan, quiero que si se cobra y la emisión falla, la reserva quede marcada en el panel para devolver el dinero o emitir a mano.
- **US-34 — Panel seguro.** Como Juan, quiero que solo yo (y quien yo autorice) pueda entrar al panel, con datos guardados en el servidor.
- **US-35 — Cuentas reales.** Como viajero, quiero que mi cuenta y mis viajes estén en el servidor y me sirvan desde cualquier dispositivo.

## 4. Requisitos funcionales

### GrupoVDT
- **FR-60:** Búsqueda, precios por fecha, reglas de tarifa, reserva, emisión, consulta y anulación antes de emitir, por la API de GrupoVDT, traducidas al formato de oferta del simulador.
- **FR-61:** El precio se **vuelve a confirmar** con GrupoVDT justo antes de cobrar; si cambió, se avisa al viajero.
- **FR-62:** Si la API no ofrece asientos o equipaje extra, se piden como solicitud al agente.
- **FR-63:** Caché de búsquedas para respetar los límites de peticiones de GrupoVDT.
- **FR-64:** Si GrupoVDT no responde, la web lo dice y ofrece WhatsApp.

### Pagos
- **FR-70:** Tarjeta y Bizum por Redsys (TPV virtual de VuelaClic), confirmados por la notificación del banco al servidor, no por la vuelta del navegador.
- **FR-71:** Transferencia: plaza bloqueada 24 h, confirmación manual desde el panel y anulación automática al vencer.
- **FR-72:** *Retirada el 2026-11-05: la web no ofrece financiación.*
- **FR-73:** Solo con pago confirmado se emite en GrupoVDT (Art. I). Emisión fallida = reserva «pendiente de emisión» y aviso a Juan.

### Servidor, cuentas y panel
- **FR-80:** Cuentas de cliente y del panel en el servidor, con contraseñas Argon2id o bcrypt, sesión en cookie `HttpOnly`/`Secure`/`SameSite` y límite de intentos.
- **FR-81:** Reservas, clientes, margen y ajustes en base de datos; el panel lee del servidor.
- **FR-82:** Correos de confirmación (reserva, billete, transferencia pendiente, recuperación de contraseña).
- **FR-83:** Registro de errores y alertas a Juan y a Aurevanta (caída de GrupoVDT, de Redsys, emisión fallida).

## 5. Requisitos no funcionales

- **NFR-10:** Credenciales de GrupoVDT y Redsys solo en variables de entorno del servidor (Art. IV).
- **NFR-11:** Datos personales en el servidor, cifrado en tránsito y copias diarias; contrato de encargado del tratamiento firmado (Art. IX).
- **NFR-12:** La web pública se mantiene estática y sin compilación (Art. X); el servidor es aparte.
- **NFR-13:** Quitar `noindex`, ayudas de demo y avisos de demostración al publicar (hallazgo F-0003).

## 6. Dudas abiertas

- **[NEEDS CLARIFICATION] Tipo de API de GrupoVDT:** REST/JSON (incluido en el precio) o XML/SOAP/certificación (se presupuesta aparte). Pedir documentación y entorno de pruebas.
- **[NEEDS CLARIFICATION] IP fija:** si GrupoVDT exige registrar la IP del servidor, condiciona el alojamiento.
- **[NEEDS CLARIFICATION] Banco y TPV:** entidad de VuelaClic, alta en Redsys y Bizum.
- **[NEEDS CLARIFICATION] Dominio y correo:** `vuelaclic.es` u otro; proveedor de correo.
- **[NEEDS CLARIFICATION] Datos legales de VuelaClic:** razón social, NIF, número de agencia de viajes y garantía, para `legal.html`.

## 7. Fuera de alcance

Cambios y reembolsos automáticos tras la emisión, hoteles, paquetes, seguros, otros mayoristas, SEO y otros idiomas (presupuesto, apartado 06 y cláusula API 04).

## 8. Criterios de aceptación

- Una compra real de prueba en el entorno de pruebas de GrupoVDT y de Redsys termina en un billete emitido y en un correo al viajero.
- Una emisión forzada a fallar deja la reserva cobrada y marcada en el panel, y avisa a Juan.
- Cerrar el navegador tras pagar no pierde la reserva (la confirma la notificación del banco).
- No hay credenciales ni datos personales en la web publicada ni en el repositorio.
