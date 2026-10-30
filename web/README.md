# VuelaClic — web de demostración

Muestra de la web de la agencia con buscador de vuelos y un simulador que devuelve
ofertas verosímiles. No hay backend: son HTML, CSS y JavaScript estáticos.

## Cómo abrirla

Con servidor local (lo recomendado, y la forma en que se ha probado):

```bash
npx --yes http-server web -p 5173 -c-1
```

y abrir http://localhost:5173.

Abrir `index.html` con doble clic también debería funcionar (no usa módulos ni
peticiones a ficheros), pero no se ha comprobado.

## Guion para la demo con el cliente

Antes de empezar: abrir `admin.html` y pulsar «Reiniciar demo» al pie de la página.

1. **Asistente.** En el buscador, tocar el ejemplo «Lima en Navidad con mi madre,
   máximo 1.300 €». Rellena el formulario solo y busca con ese presupuesto.
2. **Globo.** Mientras carga, el globo vuela hasta la ruta. Pasar el ratón por un
   vuelo con escala: el globo dibuja el trayecto real (p. ej. Madrid → Bogotá → Lima).
3. Enseñar el calendario de precios, los filtros y Recomendado / Más barato / Más rápido.
4. Elegir ida y vuelta → Continuar → «Rellenar con datos de prueba».
5. **Asientos.** Elegir ventanilla para uno y salida de emergencia para otro.
6. Pagar con **Financiación**. El final muestra el flujo de cobro que pidió el cliente
   (VuelaClic cobra → reserva en GrupoVDT → VuelaClic paga a VDT → billete emitido)
   y el billete con QR, envío por WhatsApp y alta en el calendario.
7. **Explorador.** Bajar a «¿A dónde puedo ir con 700 €?», mover la barra y cambiar
   a «Cuota al mes»: se iluminan los destinos que caben en el presupuesto.
8. **Panel del agente.** Abrir «Acceso agencia» (pie de página): la reserva recién
   hecha aparece arriba con la etiqueta «Web». Enseñar el margen ganado, lo que se
   debe a GrupoVDT, «Confirmar cobro» de una transferencia y «Pagar a GrupoVDT».
9. Mover el **margen** del panel (p. ej. al 10 %) y repetir una búsqueda en la web:
   los precios ya incluyen el nuevo margen. Con el panel y la web abiertos en dos
   pestañas, una reserva nueva aparece en el panel al momento.

## Qué hay en la demo

| Función | Dónde |
|---|---|
| Panel de salidas animado (split-flap) | Portada |
| Asistente que entiende frases (destino, fechas, viajeros, presupuesto, directo, clase) | Buscador. Funciona con reglas, sin IA ni servidor |
| Buscador ida y vuelta, solo ida y multidestino con simulador | Buscador |
| Globo 3D con la ruta y las escalas | Resultados |
| Calendario de precios, filtros, ordenación, presupuesto | Resultados |
| Plano de asientos por vuelo y viajero | Reserva |
| Pago con tarjeta, Bizum, transferencia o Fliinow (simulado) | Reserva |
| Billete con QR, envío por WhatsApp y archivo de calendario | Reserva |
| Mapa «¿A dónde puedo ir con X €?» en precio total o cuota mensual | Portada |
| Panel del agente: ventas, margen, deuda con VDT, cobros pendientes | `admin.html` |

Las reservas de la demo, el margen y los cambios del panel se guardan en el
navegador (`localStorage`), solo en el equipo donde se hace la demo.

## Estructura

| Archivo | Qué hace |
|---|---|
| `index.html` | Página completa |
| `css/styles.css` | Estilos. Colores y fuentes en `:root` |
| `js/data.js` | Aeropuertos, aerolíneas asociadas y destinos destacados |
| `js/simulator.js` | Genera vuelos de forma determinista (misma búsqueda, mismos resultados) |
| `js/api.js` | Capa de proveedor (simulador o GrupoVDT), margen y almacenamiento de la demo |
| `js/app.js` | Interfaz: buscador, resultados, reserva |
| `js/assistant.js` | Asistente: convierte una frase en una búsqueda |
| `js/globe.js` | Globo 3D de resultados (carga `vendor/globe.gl.min.js` en la primera búsqueda) |
| `js/explorer.js` | Mapa «¿A dónde puedo ir con X €?» |
| `js/seats.js` | Plano de asientos |
| `admin.html`, `js/admin.js`, `css/admin.css` | Panel del agente |
| `data/countries.js` | Siluetas de países (Natural Earth, dominio público) para el globo y el mapa |
| `vendor/` | globe.gl 2.34.4 y qrcode-generator 1.4.4 (licencia MIT), servidos en local |
| `img/` | Fotos de destinos de Wikimedia Commons (ver `img/CREDITS.md`) |

## Conexión con GrupoVDT (pendiente)

GrupoVDT ofrece integración por API, marca blanca o GDS, pero no publica la
documentación técnica: hay que pedírsela a su departamento comercial junto con
credenciales de pruebas.

La web ya está preparada para el cambio. En `js/api.js`:

```js
VC.CONFIG = { provider: 'vdt', apiBase: '/api' };
```

Hace falta un backend propio (las credenciales de VDT nunca pueden ir en el
navegador) que exponga:

| Endpoint | Recibe | Devuelve |
|---|---|---|
| `POST /api/flights/search` | tramos, viajeros y clase | ofertas en el mismo formato que `simulator.js` |
| `POST /api/flights/calendar` | un tramo y 7 fechas | precio mínimo por fecha |
| `POST /api/bookings` | ofertas elegidas, viajeros, contacto y forma de pago | localizador |

### Flujo de cobro

El viajero paga a VuelaClic (pasarela del banco, Bizum, transferencia o
Fliinow). Solo cuando el cobro está confirmado, el backend confirma la reserva
en GrupoVDT y la paga con el crédito de agencia de VuelaClic. Así VuelaClic
nunca adelanta dinero por una reserva que el cliente no ha pagado.

En la demo, el margen de VuelaClic se aplica en el navegador para poder enseñarlo
desde el panel. En producción lo aplicará el backend, para que nadie pueda tocarlo.

Antes de producción quedan por decidir:

- Pasarela de pago con tarjeta (Redsys u otra) y alta de Bizum para comercios.
- Acuerdo con Fliinow para la financiación.
- Margen o cargo de gestión de VuelaClic sobre la tarifa neta de VDT.
- Textos legales: aviso legal, privacidad, condiciones de venta (agencia con
  título-licencia de la comunidad autónoma).
