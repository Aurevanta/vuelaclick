# Plan de remediación

## Estado (31/10/2026)

**Lotes 1 y 2 aplicados a la demo** y verificados en el navegador:
- F-0002, F-0007, F-0008, F-0009, F-0014, F-0015;
- F-0005, F-0006, F-0012, F-0020;
- F-0013, en parte: vista previa al compartir (Open Graph).

Durante la verificación apareció un fallo nuevo y quedó corregido: el aviso flotante (toast) era ilegible en modo noche (1,18:1).

Quedan pendientes el **lote 3** (calidad) y el **lote 4** (paso a web real).

Ordenado por prioridad y agrupado en lotes que se pueden hacer y probar de una vez. Los tiempos son estimados.

## Lote 1 · Ahora, en la demo (unas 3 h)

| Hallazgo | Arreglo | Tiempo | Riesgo |
|---|---|---|---|
| F-0002 Foco perdido | Devolver el foco al asiento, al botón de detalles o a la oferta tras cada render | 60 min | Bajo |
| F-0008 Financiación | Función única `canFinance(price)` que lea `VC.settings`, usada en tarjetas, explorador, calculadora y portada | 40 min | Bajo |
| F-0007 Contraste | Ajustar verde, rojo y grises de texto pequeño; botón WhatsApp más oscuro | 30 min | Bajo |
| F-0009 aria-live | Quitarlo de la sección y anunciar solo el resumen | 15 min | Bajo |
| F-0014 Multidestino | Validar el orden de fechas entre tramos | 10 min | Bajo |
| F-0015 Fechas UTC | Usar la fecha local en «Mis viajes» y en la cuenta de prueba | 10 min | Bajo |

**Cómo comprobarlo:**
- repetir el script de accesibilidad: cero contrastes por debajo de 4,5:1;
- el foco sigue en el asiento tras elegirlo;
- con la financiación desactivada en el panel, no aparece "cuotas" en los resultados;
- auditoría responsive de 320 a 1920 px.

## Lote 2 · Publicación de la demo (aprox. 1 h 30)

| Hallazgo | Arreglo | Tiempo | Riesgo |
|---|---|---|---|
| F-0006 README público | Moverlo fuera de `web/` (a la raíz del repositorio) | 10 min | Bajo |
| F-0005 Cabeceras | CSP, frame-ancestors, nosniff, Referrer-Policy y Permissions-Policy en `netlify.toml`; probar globo, QR y fuentes | 45 min | Medio |
| F-0012 Favicon | Favicon SVG con la «V», PNG 180×180 y manifest | 25 min | Bajo |
| F-0020 Créditos | Llevar los créditos de fotos a `legal.html` | 15 min | Bajo |

**Cómo comprobarlo:**
- `curl -I` muestra las cabeceras nuevas;
- `/README.md` devuelve 404;
- la consola no muestra errores de CSP en la portada, la búsqueda (globo), el billete (QR), el panel y la página legal.

## Lote 3 · Calidad (aprox. 4 h, cuando haya tiempo)

| Hallazgo | Arreglo | Tiempo | Riesgo |
|---|---|---|---|
| F-0010 Google Fonts | Servir las fuentes desde `/fonts` | 40 min | Bajo |
| F-0018 Imágenes | Versiones de 480 y 960 px en WebP/AVIF con `srcset` | 40 min | Bajo |
| F-0013 SEO | Open Graph con imagen de marca, canonical, JSON-LD TravelAgency | 40 min | Bajo |
| F-0019 Pestañas | Navegación con flechas o cambiar a `aria-pressed` | 45 min | Bajo |
| F-0016 y F-0017 Duplicados | `js/utils.js` común; logo en un solo sitio; dividir `app.js` | 2–3 h | Medio |

## Lote 4 · Paso a web real (proyecto aparte, requiere decisiones)

| Hallazgo | Qué hace falta | Decisión del cliente |
|---|---|---|
| F-0001 Acceso al panel | Backend con autenticación, contraseñas Argon2id, límite de intentos y 2FA | Proveedor de alojamiento del backend |
| F-0004 Datos personales | Base de datos en servidor; el navegador solo guarda la sesión | Mismo backend; contrato de encargado del tratamiento |
| F-0003 Lanzamiento | Quitar noindex y ayudas de demo; completar `legal.html`; conectar GrupoVDT, pasarela bancaria y Fliinow | Datos de la empresa, banco y documentación de GrupoVDT |
| F-0011 Publicidad de crédito | Texto con ejemplo representativo junto a las cuotas | Validación de Fliinow y del asesor legal |

## Decisiones pendientes del usuario

1. ¿Se aplican ya los lotes 1 y 2 a la demo?
2. Para el paso a web real: ¿quién aloja el backend y quién revisa los textos legales?
