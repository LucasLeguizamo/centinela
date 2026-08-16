/**
 * El catálogo mundial de los últimos 30 días, resumido para la página.
 *
 *   pnpm mundo
 *
 * Produce `lib/mundo.ts`. Se genera y no se consulta en vivo a propósito: si el
 * USGS tarda o se cae mientras alguien presenta, la sección tiene que seguir
 * ahí. El precio es que la ventana envejece — córrelo antes de cada deploy.
 *
 * Del catálogo completo bajan 10 mil y pico de eventos al mes. Acá no cabe ni
 * hace falta: se guardan los conteos por umbral (que es el dato honesto de
 * «cuánto tiembla el mundo»), los M6+ uno por uno, y el pedazo de Colombia.
 * El resto queda a un enlace del USGS, que es donde está completo de verdad.
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://earthquake.usgs.gov/fdsnws/event/1";

/** La misma caja que usa el bot en `src/sismos.js`. */
const COLOMBIA = { minlatitude: -5, maxlatitude: 14, minlongitude: -82, maxlongitude: -66 };

const DIAS = 30;
const hasta = new Date();
const desde = new Date(hasta.getTime() - DIAS * 864e5);
const iso = (d) => d.toISOString().slice(0, 10);
const ventana = { starttime: iso(desde), endtime: iso(hasta) };

const url = (ruta, params) =>
  `${API}/${ruta}?${new URLSearchParams({ ...ventana, ...params })}`;

const traer = async (ruta, params) => {
  const r = await fetch(url(ruta, params));
  if (!r.ok) throw new Error(`USGS ${r.status} en ${ruta} ${JSON.stringify(params)}`);
  return ruta === "count" ? Number(await r.text()) : r.json();
};

/* ------------------------------------------------------------------ conteos */

// Los umbrales no son arbitrarios: 2.5 es donde el USGS considera completo el
// catálogo mundial, 4.5 es el umbral de reporte internacional, y 6 es donde un
// sismo empieza a hacer daño de verdad.
const UMBRALES = [0, 2.5, 4.5, 6, 7];
const conteos = Object.fromEntries(
  await Promise.all(
    UMBRALES.map(async (m) => [m, await traer("count", { minmagnitude: m })])
  )
);

/* ------------------------------------------------------------------ eventos */

const { features: grandes } = await traer("query", {
  format: "geojson",
  minmagnitude: 4.5,
  orderby: "magnitude",
});

const { features: locales } = await traer("query", {
  format: "geojson",
  ...COLOMBIA,
  orderby: "magnitude",
});

/**
 * El USGS publica los lugares en inglés: «68 km NNW of Ende, Indonesia».
 *
 * En una página en español eso se lee como un JSON pegado sin mirar. Se
 * traduce lo que es mecánico y seguro —la distancia, el rumbo y los países
 * que de verdad aparecen— y lo demás pasa tal cual: un topónimo traducido a
 * ojo es peor que uno en inglés, y acá cada dato tiene que aguantar que el
 * jurado lo busque.
 *
 * ponytail: tabla fija de países. Si algún mes aparece uno que no está, sale
 * en inglés y no se rompe nada; se agrega y ya.
 */
const RUMBOS = {
  N: "N", S: "S", E: "E", W: "O",
  NE: "NE", NW: "NO", SE: "SE", SW: "SO",
  NNE: "NNE", ENE: "ENE", ESE: "ESE", SSE: "SSE",
  SSW: "SSO", WSW: "OSO", WNW: "ONO", NNW: "NNO",
};

const PAISES = {
  Mexico: "México", Japan: "Japón", Philippines: "Filipinas", Peru: "Perú",
  Brazil: "Brasil", Turkey: "Turquía", Greece: "Grecia", Italy: "Italia",
  Spain: "España", "New Zealand": "Nueva Zelanda", Russia: "Rusia",
  Taiwan: "Taiwán", Iran: "Irán", Afghanistan: "Afganistán",
  "Papua New Guinea": "Papúa Nueva Guinea", "Solomon Islands": "Islas Salomón",
  Fiji: "Fiyi", "United States": "Estados Unidos", Morocco: "Marruecos",
  "Dominican Republic": "República Dominicana", Haiti: "Haití",
};

/** Zonas de mar abierto: no tienen país, y en inglés quedan durísimas. */
const ZONAS = {
  "Kermadec Islands": "islas Kermadec",
  "South Sandwich Islands": "islas Sandwich del Sur",
  "Fiji Islands": "islas Fiyi",
  "Balleny Islands": "islas Balleny",
  "Andreanof Islands": "islas Andreanof",
  "Aleutian Islands": "islas Aleutianas",
  "Mid-Atlantic Ridge": "dorsal mesoatlántica",
  "Pacific-Antarctic Ridge": "dorsal Pacífico-Antártica",
};

const CARDINALES = {
  north: "al norte", south: "al sur", east: "al este", west: "al oeste",
  northeast: "al noreste", northwest: "al noroeste",
  southeast: "al sureste", southwest: "al suroeste",
};

const traducirLugar = (lugar) => {
  let t = lugar
    // A los eventos grandes el USGS les pone nombre propio, siempre con la
    // misma forma: «The 2026 Kumamoto Region, Japan Earthquake».
    .replace(/^The (\d{4}) (.+?),\s*(.+?) Earthquake$/i,
      (_, anio, zona, pais) =>
        `terremoto de ${zona.replace(/\s+Region$/i, "")}, ${PAISES[pais] ?? pais} (${anio})`)
    // «68 km NNW of Ende» → «68 km al NNO de Ende»
    .replace(/^(\d+)\s*km\s+([NSEW]{1,3})\s+of\s+/i, (_, km, rumbo) => {
      const r = RUMBOS[rumbo.toUpperCase()];
      return r ? `${km} km al ${r} de ` : `${km} km de `;
    })
    // «south of the Kermadec Islands» → «al sur de las Kermadec Islands»
    .replace(/^(north|south|east|west|northeast|northwest|southeast|southwest)\s+of\s+the\s+/i,
      (_, c) => `${CARDINALES[c.toLowerCase()]} de las `)
    .replace(/^(north|south|east|west|northeast|northwest|southeast|southwest)\s+of\s+/i,
      (_, c) => `${CARDINALES[c.toLowerCase()]} de `)
    .replace(/^(.+?)\s+region$/i, (_, zona) => {
      const z = ZONAS[zona] ?? zona;
      return `región de ${z.startsWith("islas") ? "las " : ""}${z}`;
    });

  for (const [en, es] of Object.entries(ZONAS)) t = t.replace(en, es);

  // El país va al final, después de la última coma.
  const coma = t.lastIndexOf(", ");
  if (coma > 0) {
    const pais = t.slice(coma + 2);
    if (PAISES[pais]) t = `${t.slice(0, coma)}, ${PAISES[pais]}`;
  }
  return t;
};

/**
 * Fechas ya escritas, no objetos `Date`.
 *
 * `toLocaleDateString` no da lo mismo en el Node del build que en el Chrome
 * del visitante —distinta versión de ICU, distinto string— y React lo canta
 * como error de hidratación en consola. Formateado acá una sola vez, el
 * servidor y el navegador escriben exactamente lo mismo.
 */
const enEspanol = (d, opciones) => d.toLocaleString("es-CO", opciones);
const miles = (n) => n.toLocaleString("es-CO");

/**
 * `sig` es el índice de significancia del USGS: no es la magnitud, es cuánto
 * importó. Mezcla energía, cuánta gente lo reportó y el impacto estimado — y
 * es la razón por la que este resumen existe, porque ordena el mes por daño y
 * no por número.
 */
const limpiar = (f) => {
  const cuando = new Date(f.properties.time);
  return {
  id: f.id,
  magnitud: +f.properties.mag.toFixed(1),
  lugar: traducirLugar(f.properties.place),
  /** El original del USGS, para que se pueda buscar el evento tal cual. */
  lugarUsgs: f.properties.place,
  hora: cuando.toISOString(),
  fechaCorta: enEspanol(cuando, { day: "numeric", month: "short" }),
  horaCorta: enEspanol(cuando, { hour: "numeric", minute: "2-digit" }),
  profundidadKm: Math.round(f.geometry.coordinates[2]),
  lat: +f.geometry.coordinates[1].toFixed(3),
  lon: +f.geometry.coordinates[0].toFixed(3),
  significancia: f.properties.sig,
  reportes: f.properties.felt ?? 0,
  // PAGER: el pronóstico de víctimas y pérdidas del propio USGS.
  alerta: f.properties.alert ?? null,
  tsunami: Boolean(f.properties.tsunami),
  reportesTexto: miles(f.properties.felt ?? 0),
  significanciaTexto: miles(f.properties.sig),
  };
};

const seisMas = grandes.filter((f) => f.properties.mag >= 6).map(limpiar);
const porSignificancia = [...grandes]
  .sort((a, b) => b.properties.sig - a.properties.sig)
  .slice(0, 6)
  .map(limpiar);
const colombia = locales.map(limpiar).sort((a, b) => b.magnitud - a.magnitud);

/**
 * El par que sostiene la sección: el sismo más grande del mes contra el más
 * significativo. Si son el mismo, la comparación no dice nada y la página lo
 * dirá con honestidad en vez de forzarla.
 */
const masGrande = seisMas[0];
const masSignificativo = porSignificancia[0];

const contenido = `/**
 * Catálogo mundial de los últimos ${DIAS} días, generado. NO EDITAR A MANO.
 *
 *   pnpm mundo
 *
 * Ventana ${ventana.starttime} → ${ventana.endtime}, fuente USGS FDSN.
 * ${conteos[0].toLocaleString("es-CO")} eventos de cualquier magnitud, ${seisMas.length} de M6 o más.
 */

export type EventoMundial = {
  id: string;
  magnitud: number;
  lugar: string;
  lugarUsgs: string;
  /** ISO 8601 en UTC, por si algún día hace falta recalcular algo. */
  hora: string;
  /** Ya formateados acá: en el componente darían distinto y React se queja. */
  fechaCorta: string;
  horaCorta: string;
  profundidadKm: number;
  lat: number;
  lon: number;
  /** Índice de significancia del USGS: cuánto importó, no cuánto midió. */
  significancia: number;
  reportes: number;
  /** Alerta PAGER: green | yellow | orange | red. */
  alerta: string | null;
  tsunami: boolean;
  reportesTexto: string;
  significanciaTexto: string;
};

export const VENTANA = {
  desde: "${ventana.starttime}",
  hasta: "${ventana.endtime}",
  desdeCorta: "${enEspanol(desde, { day: "numeric", month: "long" })}",
  hastaCorta: "${enEspanol(hasta, { day: "numeric", month: "long" })}",
  anio: ${hasta.getFullYear()},
  dias: ${DIAS},
};

/** Cuántos sismos hubo en el mundo, por umbral de magnitud. */
export const CONTEOS: Record<string, number> = ${JSON.stringify(conteos)};

/** Los mismos conteos ya escritos, para pintarlos sin formatear en el cliente. */
export const CONTEOS_TEXTO: Record<string, string> = ${JSON.stringify(
  Object.fromEntries(Object.entries(conteos).map(([k, v]) => [k, miles(v)]))
)};

/** Todos los M6 o más del período, de mayor a menor. */
export const SEIS_MAS: EventoMundial[] = ${JSON.stringify(seisMas)};

/** Los que más importaron, que no son los mismos que los más grandes. */
export const POR_SIGNIFICANCIA: EventoMundial[] = ${JSON.stringify(porSignificancia)};

/** Lo que se movió dentro de la caja de Colombia, a cualquier magnitud. */
export const COLOMBIA: EventoMundial[] = ${JSON.stringify(colombia)};

export const MAS_GRANDE = SEIS_MAS[0];
export const MAS_SIGNIFICATIVO = POR_SIGNIFICANCIA[0];

/** Falso cuando el más grande fue también el más grave: entonces no hay contraste que contar. */
export const HAY_CONTRASTE = ${masGrande?.id !== masSignificativo?.id};

export const CATALOGO_USGS =
  "https://earthquake.usgs.gov/earthquakes/search/";
`;

writeFileSync(join(RAIZ, "lib", "mundo.ts"), contenido);

console.log(`${ventana.starttime} → ${ventana.endtime}`);
for (const m of UMBRALES) console.log(`  M${m}+  ${conteos[m].toLocaleString("es-CO")}`);
console.log(`  M6+ detallados: ${seisMas.length} · Colombia: ${colombia.length}`);
console.log(`  más grande: M${masGrande?.magnitud} ${masGrande?.lugar}`);
console.log(`  más significativo: M${masSignificativo?.magnitud} ${masSignificativo?.lugar}`);
console.log(`lib/mundo.ts → ${(contenido.length / 1024).toFixed(1)} KB`);
