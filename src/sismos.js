// Detección de sismos (US-002) e intensidad en la ubicación del usuario (US-003).
//
// La tesis del producto vive acá: todo el mundo publica la magnitud del
// epicentro; nadie te dice qué te tocó a vos. La magnitud es un número del
// sismo, la intensidad es un número de tu casa.

const USGS = "https://earthquake.usgs.gov/fdsnws/event/1/query";

// Caja que cubre Colombia y el borde de sus vecinos: un sismo en Ecuador o
// Panamá se siente en Nariño o el Chocó.
const BBOX = { minlat: -5, maxlat: 14, minlon: -82, maxlon: -66 };

// ponytail: tabla fija de municipios. Alcanza para la demo; el día que haya
// que cubrir los 1.100 del país, se reemplaza por el shapefile del DANE.
export const MUNICIPIOS = {
  bogota: { nombre: "Bogotá", lat: 4.711, lon: -74.072 },
  medellin: { nombre: "Medellín", lat: 6.244, lon: -75.581 },
  cali: { nombre: "Cali", lat: 3.452, lon: -76.532 },
  barranquilla: { nombre: "Barranquilla", lat: 10.968, lon: -74.781 },
  quibdo: { nombre: "Quibdó", lat: 5.694, lon: -76.658 },
  pereira: { nombre: "Pereira", lat: 4.813, lon: -75.696 },
  manizales: { nombre: "Manizales", lat: 5.07, lon: -75.52 },
  armenia: { nombre: "Armenia", lat: 4.535, lon: -75.681 },
  bucaramanga: { nombre: "Bucaramanga", lat: 7.119, lon: -73.122 },
  cucuta: { nombre: "Cúcuta", lat: 7.894, lon: -72.508 },
  pasto: { nombre: "Pasto", lat: 1.214, lon: -77.278 },
  tumaco: { nombre: "Tumaco", lat: 1.789, lon: -78.815 },
  buenaventura: { nombre: "Buenaventura", lat: 3.884, lon: -77.019 },
  monteria: { nombre: "Montería", lat: 8.748, lon: -75.881 },
  cartagena: { nombre: "Cartagena", lat: 10.391, lon: -75.479 },
};

export function normalizarMunicipio(texto) {
  const clave = texto
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]/g, "");
  return MUNICIPIOS[clave] ? { clave, ...MUNICIPIOS[clave] } : null;
}

/** Distancia sobre la superficie, en km. */
function distanciaSuperficie(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Distancia al hipocentro: la profundidad importa y mucho. */
export function distanciaHipocentral(sismo, lugar) {
  const sup = distanciaSuperficie(sismo.lat, sismo.lon, lugar.lat, lugar.lon);
  return Math.sqrt(sup ** 2 + (sismo.profundidadKm || 0) ** 2);
}

/**
 * Intensidad Mercalli estimada (MMI) según Atkinson & Wald (2007).
 *
 * ponytail: son los coeficientes de California, no de los Andes. Sobreestima
 * un poco en corteza continental colombiana. Para decidir "¿le aviso o no?"
 * sobra; si algún día hay que reportar cifras, se calibra contra el catálogo
 * de intensidades del SGC o se consume el ShakeMap del USGS cuando exista.
 */
export function intensidadEn(sismo, lugar) {
  const R = Math.max(distanciaHipocentral(sismo, lugar), 1);
  const M = sismo.magnitud;
  const logR = Math.log10(R);
  const B = Math.max(Math.log10(R / 30), 0);

  const mmi =
    12.27 +
    2.27 * (M - 6) +
    0.1304 * (M - 6) ** 2 +
    -1.3 * logR +
    -0.000707 * R +
    1.95 * B +
    -0.577 * M * logR;

  return Math.min(Math.max(mmi, 1), 12);
}

/** MMI → lo que una persona realmente percibió. */
export function describirIntensidad(mmi) {
  if (mmi < 2) return { etiqueta: "no se sintió", alertar: false };
  if (mmi < 3) return { etiqueta: "apenas perceptible", alertar: false };
  if (mmi < 4) return { etiqueta: "leve", alertar: true };
  if (mmi < 5) return { etiqueta: "moderado", alertar: true };
  if (mmi < 6) return { etiqueta: "fuerte", alertar: true };
  if (mmi < 7) return { etiqueta: "muy fuerte", alertar: true };
  if (mmi < 8) return { etiqueta: "con posibles daños", alertar: true };
  return { etiqueta: "destructivo", alertar: true };
}

/** US-002: sismos recientes en la región, más nuevo primero. */
export async function sismosRecientes({ desdeMinutos = 60, magnitudMinima = 2.5 } = {}) {
  const desde = new Date(Date.now() - desdeMinutos * 60_000).toISOString();
  const url =
    `${USGS}?format=geojson&starttime=${desde}` +
    `&minlatitude=${BBOX.minlat}&maxlatitude=${BBOX.maxlat}` +
    `&minlongitude=${BBOX.minlon}&maxlongitude=${BBOX.maxlon}` +
    `&minmagnitude=${magnitudMinima}&orderby=time`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`USGS respondió ${res.status}`);
  const data = await res.json();

  return data.features.map((f) => ({
    id: f.id,
    magnitud: f.properties.mag,
    lugar: f.properties.place,
    hora: new Date(f.properties.time),
    lon: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
    profundidadKm: f.geometry.coordinates[2],
    url: f.properties.url,
  }));
}

/** US-003 + US-004: ¿le aviso a este suscriptor, y qué le digo? */
export function evaluarAlerta(sismo, lugar) {
  const mmi = intensidadEn(sismo, lugar);
  const { etiqueta, alertar } = describirIntensidad(mmi);
  const distanciaKm = Math.round(distanciaHipocentral(sismo, lugar));

  return {
    alertar,
    mmi: Number(mmi.toFixed(1)),
    etiqueta,
    distanciaKm,
    mensaje:
      `⚠️ Sismo M${sismo.magnitud} detectado\n\n` +
      `📍 ${sismo.lugar}\n` +
      `🕐 ${sismo.hora.toLocaleTimeString("es-CO", { timeZone: "America/Bogota" })} · ` +
      `${Math.round(sismo.profundidadKm)} km de profundidad\n\n` +
      `En ${lugar.nombre} se sintió ${etiqueta} (a ${distanciaKm} km del epicentro).\n\n` +
      `Fuente: USGS\n${sismo.url}`,
  };
}
