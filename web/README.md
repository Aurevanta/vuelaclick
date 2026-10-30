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

1. El panel de salidas del inicio cambia solo cada pocos segundos.
2. Buscar Madrid → Lima ida y vuelta. Enseñar el calendario de precios por día,
   los filtros y las pestañas Recomendado / Más barato / Más rápido.
3. Elegir ida y vuelta. La barra inferior suma el total.
4. Continuar → «Rellenar con datos de prueba» → pagar con **Financiación**.
5. La pantalla final muestra el flujo de cobro que pidió el cliente:
   VuelaClic cobra → reserva en GrupoVDT → VuelaClic paga a VDT → billete emitido.
6. Tocar una tarjeta de «Destinos» lanza la búsqueda con las fechas más baratas.
7. Probar «Multidestino» (Madrid → Lima → Cusco).

## Estructura

| Archivo | Qué hace |
|---|---|
| `index.html` | Página completa |
| `css/styles.css` | Estilos. Colores y fuentes en `:root` |
| `js/data.js` | Aeropuertos, aerolíneas asociadas y destinos destacados |
| `js/simulator.js` | Genera vuelos de forma determinista (misma búsqueda, mismos resultados) |
| `js/api.js` | Capa de proveedor: decide si responde el simulador o GrupoVDT |
| `js/app.js` | Interfaz: buscador, resultados, reserva |
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

Antes de producción quedan por decidir:

- Pasarela de pago con tarjeta (Redsys u otra) y alta de Bizum para comercios.
- Acuerdo con Fliinow para la financiación.
- Margen o cargo de gestión de VuelaClic sobre la tarifa neta de VDT.
- Textos legales: aviso legal, privacidad, condiciones de venta (agencia con
  título-licencia de la comunidad autónoma).
