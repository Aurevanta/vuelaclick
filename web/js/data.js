/* Datos de referencia para el simulador de la demo.
   Cuando se conecte GrupoVDT, los aeropuertos podrán seguir saliendo de aquí
   (o de su endpoint de localizaciones) y las aerolíneas vendrán en cada oferta. */
window.VC = window.VC || {};

VC.AIRPORTS = [
  // España
  { code: 'MAD', city: 'Madrid', name: 'Adolfo Suárez Madrid-Barajas', country: 'España', cc: 'ES', lat: 40.47, lon: -3.56 },
  { code: 'BCN', city: 'Barcelona', name: 'Josep Tarradellas El Prat', country: 'España', cc: 'ES', lat: 41.30, lon: 2.08 },
  { code: 'AGP', city: 'Málaga', name: 'Costa del Sol', country: 'España', cc: 'ES', lat: 36.67, lon: -4.49 },
  { code: 'VLC', city: 'Valencia', name: 'Manises', country: 'España', cc: 'ES', lat: 39.49, lon: -0.47 },
  { code: 'BIO', city: 'Bilbao', name: 'Loiu', country: 'España', cc: 'ES', lat: 43.30, lon: -2.91 },
  // Latinoamérica
  { code: 'LIM', city: 'Lima', name: 'Jorge Chávez', country: 'Perú', cc: 'PE', lat: -12.02, lon: -77.11 },
  { code: 'CUZ', city: 'Cusco', name: 'Alejandro Velasco Astete', country: 'Perú', cc: 'PE', lat: -13.54, lon: -71.94 },
  { code: 'BOG', city: 'Bogotá', name: 'El Dorado', country: 'Colombia', cc: 'CO', lat: 4.70, lon: -74.15 },
  { code: 'MDE', city: 'Medellín', name: 'José María Córdova', country: 'Colombia', cc: 'CO', lat: 6.16, lon: -75.42 },
  { code: 'UIO', city: 'Quito', name: 'Mariscal Sucre', country: 'Ecuador', cc: 'EC', lat: -0.13, lon: -78.36 },
  { code: 'GYE', city: 'Guayaquil', name: 'José Joaquín de Olmedo', country: 'Ecuador', cc: 'EC', lat: -2.16, lon: -79.88 },
  { code: 'SDQ', city: 'Santo Domingo', name: 'Las Américas', country: 'R. Dominicana', cc: 'DO', lat: 18.43, lon: -69.67 },
  { code: 'PUJ', city: 'Punta Cana', name: 'Punta Cana', country: 'R. Dominicana', cc: 'DO', lat: 18.57, lon: -68.36 },
  { code: 'ASU', city: 'Asunción', name: 'Silvio Pettirossi', country: 'Paraguay', cc: 'PY', lat: -25.24, lon: -57.52 },
  { code: 'VVI', city: 'Santa Cruz', name: 'Viru Viru', country: 'Bolivia', cc: 'BO', lat: -17.64, lon: -63.14 },
  { code: 'LPB', city: 'La Paz', name: 'El Alto', country: 'Bolivia', cc: 'BO', lat: -16.51, lon: -68.19 },
  { code: 'SCL', city: 'Santiago', name: 'Arturo Merino Benítez', country: 'Chile', cc: 'CL', lat: -33.39, lon: -70.79 },
  { code: 'EZE', city: 'Buenos Aires', name: 'Ministro Pistarini', country: 'Argentina', cc: 'AR', lat: -34.82, lon: -58.54 },
  { code: 'TGU', city: 'Tegucigalpa', name: 'Toncontín / Palmerola', country: 'Honduras', cc: 'HN', lat: 14.38, lon: -87.62 },
  { code: 'SAP', city: 'San Pedro Sula', name: 'Ramón Villeda Morales', country: 'Honduras', cc: 'HN', lat: 15.45, lon: -87.92 },
  { code: 'SJO', city: 'San José', name: 'Juan Santamaría', country: 'Costa Rica', cc: 'CR', lat: 9.99, lon: -84.21 },
  { code: 'PTY', city: 'Panamá', name: 'Tocumen', country: 'Panamá', cc: 'PA', lat: 9.07, lon: -79.38 },
  { code: 'MEX', city: 'Ciudad de México', name: 'Benito Juárez', country: 'México', cc: 'MX', lat: 19.44, lon: -99.07 },
  { code: 'CUN', city: 'Cancún', name: 'Cancún', country: 'México', cc: 'MX', lat: 21.04, lon: -86.87 },
  { code: 'GRU', city: 'São Paulo', name: 'Guarulhos', country: 'Brasil', cc: 'BR', lat: -23.43, lon: -46.47 },
  // Resto del mundo
  { code: 'MIA', city: 'Miami', name: 'Miami International', country: 'Estados Unidos', cc: 'US', lat: 25.80, lon: -80.29 },
  { code: 'JFK', city: 'Nueva York', name: 'John F. Kennedy', country: 'Estados Unidos', cc: 'US', lat: 40.64, lon: -73.78 },
  { code: 'CDG', city: 'París', name: 'Charles de Gaulle', country: 'Francia', cc: 'FR', lat: 49.01, lon: 2.55 },
  { code: 'AMS', city: 'Ámsterdam', name: 'Schiphol', country: 'Países Bajos', cc: 'NL', lat: 52.31, lon: 4.76 },
  { code: 'FCO', city: 'Roma', name: 'Fiumicino', country: 'Italia', cc: 'IT', lat: 41.80, lon: 12.25 },
  { code: 'LHR', city: 'Londres', name: 'Heathrow', country: 'Reino Unido', cc: 'GB', lat: 51.47, lon: -0.45 },
  { code: 'LIS', city: 'Lisboa', name: 'Humberto Delgado', country: 'Portugal', cc: 'PT', lat: 38.77, lon: -9.13 }
];

// hubs: aeropuertos desde los que la aerolínea opera directo o hace escala
VC.AIRLINES = {
  IB: { name: 'Iberia', color: '#D7192D', hubs: ['MAD'], factor: 1.08, bags: 1 },
  UX: { name: 'Air Europa', color: '#0B2C8F', hubs: ['MAD'], factor: 1.0, bags: 1 },
  PU: { name: 'Plus Ultra', color: '#E39A00', hubs: ['MAD'], factor: 0.9, bags: 1 },
  LV: { name: 'Level', color: '#33373D', hubs: ['BCN'], factor: 0.86, bags: 0 },
  LA: { name: 'LATAM', color: '#E3124B', hubs: ['LIM', 'SCL', 'GRU', 'BOG'], factor: 1.02, bags: 1 },
  AV: { name: 'Avianca', color: '#C8102E', hubs: ['BOG'], factor: 0.97, bags: 1 },
  CM: { name: 'Copa Airlines', color: '#0C4C8A', hubs: ['PTY'], factor: 0.99, bags: 1 },
  KL: { name: 'KLM', color: '#00A1DE', hubs: ['AMS'], factor: 1.12, bags: 1 },
  AF: { name: 'Air France', color: '#0B1F4D', hubs: ['CDG'], factor: 1.1, bags: 1 }
};

VC.CABINS = {
  Y: { label: 'Turista', mult: 1 },
  W: { label: 'Turista Premium', mult: 1.75 },
  C: { label: 'Business', mult: 3.4 }
};

// Destinos destacados de la home (los que más empuja el cliente en sus campañas)
VC.FEATURED = [
  { to: 'LIM', from: 'MAD', img: 'img/lima.jpg', tag: 'Equipaje 2×23 kg' },
  { to: 'SDQ', from: 'MAD', img: 'img/santo-domingo.jpg', tag: 'Caribe' },
  { to: 'UIO', from: 'MAD', img: 'img/quito.jpg', tag: 'Directo' },
  { to: 'BOG', from: 'BCN', img: 'img/bogota.jpg', tag: 'Desde Barcelona' },
  { to: 'ASU', from: 'MAD', img: 'img/asuncion.jpg', tag: '1 escala' },
  { to: 'VVI', from: 'MAD', img: 'img/santa-cruz.jpg', tag: 'Bolivia' },
  { to: 'TGU', from: 'MAD', img: 'img/tegucigalpa.jpg', tag: 'Honduras' },
  { to: 'SJO', from: 'MAD', img: 'img/san-jose.jpg', tag: 'Costa Rica' },
  { to: 'CUZ', from: 'MAD', img: 'img/cusco.jpg', tag: 'Machu Picchu' }
];

VC.airport = function (code) {
  return VC.AIRPORTS.find(function (a) { return a.code === code; });
};
