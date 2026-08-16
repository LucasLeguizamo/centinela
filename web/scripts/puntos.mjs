/**
 * Agrupa los acopios raspados por municipio y les calcula la intensidad.
 *
 *   node scripts/puntos.mjs
 *
 * Produce `lib/puntos.ts`, que es lo único que llega al navegador: unos 10 KB
 * con los 50 municipios y los campos que el globo necesita, en vez de los
 * 160 KB del volcado completo con sus 145 filas y sus veinte columnas.
 *
 * La intensidad no viene del volcado: se calcula acá con la misma fórmula que
 * corre en el bot, a partir de las coordenadas reales de cada municipio.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");

const { intensidadEn, describirIntensidad, distanciaKm } = await import(
  join(RAIZ, "lib", "sismo.ts")
);

// El volcado es del bot, no de la web: `data/snapshots/` del repo. Tener una
// copia acá era pedir que un día divergieran y que la página mostrara acopios
// que el bot ya no manda.
const VOLCADO = "acopios-2026-08-15.json";
const acopios = JSON.parse(
  readFileSync(join(RAIZ, "..", "data", "snapshots", VOLCADO), "utf8")
);

/**
 * «Bogotá D.C.» y «Bogotá» son el mismo sitio y llegan escritos de las dos
 * formas según quién publicó el acopio. Sin esta normalización salen dos
 * puntos superpuestos en el mapa con la mitad de los datos cada uno.
 */
const normalizar = (m) => (m || "").replace(/\s*D\.?\s*C\.?$/i, "").trim();

const porMunicipio = new Map();
for (const a of acopios) {
  if (a.lat == null || a.lon == null) continue;
  const nombre = normalizar(a.municipio);
  if (!nombre) continue;
  if (!porMunicipio.has(nombre)) porMunicipio.set(nombre, []);
  porMunicipio.get(nombre).push(a);
}

const puntos = [...porMunicipio.entries()]
  .map(([nombre, lista]) => {
    // Centroide de los acopios del municipio: más fiel que quedarse con el
    // primero, que podría estar en un extremo de la ciudad.
    const lat = lista.reduce((s, a) => s + a.lat, 0) / lista.length;
    const lon = lista.reduce((s, a) => s + a.lon, 0) / lista.length;

    const mmi = intensidadEn({ nombre, lat, lon, clave: "", region: "" });
    const { etiqueta, alertar, fuerza } = describirIntensidad(mmi);

    // Se muestra el que tenga necesidades declaradas; si ninguno las declara,
    // el primero verificado. Un acopio sin datos no ayuda a nadie a decidir.
    const principal =
      lista.find((a) => a.verificado && a.urgente?.length) ??
      lista.find((a) => a.urgente?.length) ??
      lista.find((a) => a.verificado) ??
      lista[0];

    // El departamento va al final de la dirección compuesta por el conector.
    const partes = (principal.direccion || "").split(", ");
    const departamento = partes.length > 1 ? partes[partes.length - 1] : "";

    return {
      nombre,
      departamento,
      lat: +lat.toFixed(4),
      lon: +lon.toFixed(4),
      acopios: lista.length,
      km: distanciaKm({ nombre, lat, lon, clave: "", region: "" }),
      mmi: +mmi.toFixed(1),
      etiqueta,
      alertar,
      fuerza: +fuerza.toFixed(3),
      punto: {
        nombre: principal.nombre,
        direccion: principal.direccion,
        horario: principal.horario || null,
        urgente: (principal.urgente || []).slice(0, 3),
        verificado: Boolean(principal.verificado),
      },
    };
  })
  // De mayor a menor intensidad: el orden del DOM decide qué punto queda
  // encima cuando dos se solapan, y arriba tiene que estar el más golpeado.
  .sort((a, b) => b.mmi - a.mmi);

const avisados = puntos.filter((p) => p.alertar).length;

const contenido = `/**
 * Municipios con acopio, generados. NO EDITAR A MANO.
 *
 *   node scripts/puntos.mjs
 *
 * ${puntos.length} municipios y ${acopios.length} acopios de
 * data/snapshots/${VOLCADO}. La intensidad de cada uno está calculada con la
 * misma fórmula que corre en el bot, sobre las coordenadas reales del municipio: a
 * ${avisados} de los ${puntos.length} se les habría escrito.
 */

export type Punto = {
  nombre: string;
  departamento: string;
  lat: number;
  lon: number;
  acopios: number;
  km: number;
  mmi: number;
  etiqueta: string;
  alertar: boolean;
  /** 0–1, para el tamaño y el color del punto sin recalcular nada. */
  fuerza: number;
  punto: {
    nombre: string;
    direccion: string;
    horario: string | null;
    urgente: string[];
    verificado: boolean;
  };
};

export const PUNTOS: Punto[] = ${JSON.stringify(puntos, null, 0)};

export const TOTAL_ACOPIOS = ${acopios.length};
export const TOTAL_MUNICIPIOS = ${puntos.length};
export const TOTAL_AVISADOS = ${avisados};
`;

writeFileSync(join(RAIZ, "lib", "puntos.ts"), contenido);
console.log(
  `${puntos.length} municipios · ${acopios.length} acopios · ${avisados} avisados`
);
console.log(`lib/puntos.ts → ${(contenido.length / 1024).toFixed(1)} KB`);
