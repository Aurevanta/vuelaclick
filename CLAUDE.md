# VuelaClic — web de la agencia de viajes

Web de venta de vuelos para VuelaClic (Juan Gómez), hecha por Aurevanta Labs. Hoy es una **demo
estática** en `web/` con un simulador de vuelos, publicada en Netlify (`vuelaclick.netlify.app`).
La fase real (GrupoVDT, pagos y servidor) está especificada pero sin empezar.

**Metodología SDD (Spec-Driven Development, estilo GitHub Spec Kit).** Antes de tocar funcionalidad,
leer en este orden:
1. [`.specify/memory/constitution.md`](.specify/memory/constitution.md) — principios no negociables.
2. La especificación de la funcionalidad (`specs/NNN-nombre/spec.md`) — qué y por qué.
3. Su `plan.md` — cómo.
4. Su `tasks.md` — backlog y avance.

| Spec | Estado |
|---|---|
| [`001-demo-web`](specs/001-demo-web/spec.md) | Entregada. Pendientes: lote 3 de la auditoría y publicar el último borrador |
| [`002-integracion-vdt-pagos`](specs/002-integracion-vdt-pagos/spec.md) | Borrador, bloqueado por las dudas `[NEEDS CLARIFICATION]` y la aceptación del presupuesto |

**Flujo para cualquier cambio nuevo:**
1. Si es una funcionalidad nueva, crear `specs/NNN-nombre/` con `spec.md`; si amplía una existente, añadir sus FR a esa spec.
2. Escribir o actualizar `plan.md` comprobando cada artículo de la constitución.
3. Desglosar en `tasks.md` con IDs y la referencia a sus FR; las dudas, como `[NEEDS CLARIFICATION]`.
4. Implementar, verificar en el navegador (Art. V y VI) y marcar la tarea `[X]` con el commit.

Toda función nueva debe poder justificarse contra la constitución. Si la contradice, se cambia la
decisión o se enmienda la constitución con su versión.

## Trabajo diario

- **Servidor local:** `npx --yes http-server web -p 5173 -c-1` (configurado en `.claude/launch.json` como `web`).
- **Borrador de Netlify:** `npx --yes netlify-cli@17.38.1 deploy --dir web --site bd4a4651-5e9d-4484-84a7-85642b0d7575 --message "<qué cambia>"`.
  La publicación a producción la hace el usuario (Art. XI).
- **Rama:** `miguel`. Commits en español, describiendo el cambio.
- **Demos:** `?cielo=amanecer|atardecer|noche` fuerza el cielo; cuentas de prueba en el [README](README.md).
- **Auditoría:** `docs/auditoria/`. Los presupuestos y documentos comerciales de Aurevanta no se suben a este repositorio.

## Cosas que no son evidentes

- La interfaz solo llama a `VC.api`; el simulador devuelve el mismo formato que devolverá GrupoVDT (Art. II).
- Todo lo de `web/` se publica: nunca poner ahí notas, README ni credenciales (Art. IV). La contraseña real de Juan está en `credenciales-panel.md` (ignorado por git).
- Las transiciones de color no avanzan en el navegador integrado cuando el panel está oculto: para medir contraste, desactivar las transiciones antes.
