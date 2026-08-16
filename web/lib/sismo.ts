/**
 * La física del sismo, importada del bot — no copiada.
 *
 * Cuando la página vivía en su propio repo, `src/sismos.js` estaba portado a
 * mano acá y había que acordarse de tocar los dos lados. Ahora comparten
 * archivo: lo que la página muestra es literalmente lo que el bot calculó, y
 * `pnpm test` en la raíz cubre la fórmula que se ve en pantalla.
 */

import {
  distanciaHipocentral as hipocentral,
  intensidadEn as mmiDe,
  describirIntensidad as percepcionDe,
} from "../../src/sismos.js";

export type Municipio = {
  clave: string;
  nombre: string;
  lat: number;
  lon: number;
  /** Para el texto: dónde queda, en lenguaje humano. */
  region: string;
};

/** El evento real. Datos del USGS, evento us6000tjl2. */
export const SISMO = {
  magnitud: 7.4,
  lugar: "5 km al sur de San José del Palmar, Chocó",
  lat: 4.8436,
  lon: -76.2422,
  profundidadKm: 110.285,
  hora: "7:34:28 a. m.",
  fecha: "10 de agosto de 2026",
  url: "https://earthquake.usgs.gov/earthquakes/eventpage/us6000tjl2",
} as const;

/**
 * Las ciudades del comparador, ordenadas por distancia al epicentro.
 *
 * El orden importa: el arrastre recorre de la más cercana a la más lejana, así
 * que la intensidad baja de forma monótona y el gesto se siente como alejarse
 * del sismo en vez de saltar por un mapa.
 */
export const MUNICIPIOS: Municipio[] = [
  { clave: "pereira", nombre: "Pereira", lat: 4.813, lon: -75.696, region: "Risaralda" },
  { clave: "manizales", nombre: "Manizales", lat: 5.07, lon: -75.52, region: "Caldas" },
  { clave: "quibdo", nombre: "Quibdó", lat: 5.694, lon: -76.658, region: "Chocó" },
  { clave: "cali", nombre: "Cali", lat: 3.452, lon: -76.532, region: "Valle del Cauca" },
  { clave: "medellin", nombre: "Medellín", lat: 6.244, lon: -75.581, region: "Antioquia" },
  { clave: "bogota", nombre: "Bogotá", lat: 4.711, lon: -74.072, region: "Cundinamarca" },
  { clave: "barranquilla", nombre: "Barranquilla", lat: 10.968, lon: -74.781, region: "Atlántico" },
];

/**
 * Distancia al hipocentro, no al epicentro.
 *
 * La profundidad importa y mucho: este sismo estaba a 110 km bajo tierra, así
 * que incluso justo encima del epicentro había 110 km de roca de por medio.
 * Ignorarla sobreestimaría la intensidad de las ciudades más cercanas.
 */
export function distanciaHipocentral(m: Municipio) {
  return hipocentral(SISMO, m);
}

/** Distancia en superficie, que es la que la gente entiende. */
export function distanciaKm(m: Municipio) {
  return Math.round(distanciaHipocentral(m));
}

/**
 * Intensidad Mercalli estimada (MMI) según Atkinson & Wald (2007).
 *
 * Los coeficientes son de California y sobreestiman un poco en los Andes. Para
 * decidir "¿le aviso o no?" sobra; para publicar cifras habría que calibrar
 * contra el catálogo de intensidades del SGC. Está dicho en la página, no
 * escondido.
 */
export function intensidadEn(m: Municipio) {
  return mmiDe(SISMO, m);
}

export type Percepcion = {
  etiqueta: string;
  alertar: boolean;
  /** 0–1, para dibujar la barra sin volver a normalizar en cada componente. */
  fuerza: number;
};

/**
 * MMI → lo que una persona realmente percibió.
 *
 * La etiqueta y el umbral salen del bot; `fuerza` se agrega acá porque solo la
 * necesita el dibujo (barras y puntos del mapa) y no tiene por qué viajar al
 * WhatsApp de nadie.
 */
export function describirIntensidad(mmi: number): Percepcion {
  const fuerza = Math.min(Math.max((mmi - 1) / 7, 0), 1);
  return { ...percepcionDe(mmi), fuerza };
}

/** Todo lo que la página necesita saber de una ciudad, ya calculado. */
export function evaluar(m: Municipio) {
  const mmi = intensidadEn(m);
  const p = describirIntensidad(mmi);
  return {
    ...m,
    ...p,
    mmi: Number(mmi.toFixed(1)),
    distancia: distanciaKm(m),
  };
}

export type Evaluacion = ReturnType<typeof evaluar>;

export const CIUDADES = MUNICIPIOS.map(evaluar);
