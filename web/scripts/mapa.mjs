/**
 * Convierte el GeoJSON de departamentos de Colombia en rutas SVG ya proyectadas.
 *
 *   node scripts/mapa.mjs
 *
 * Se corre a mano, no en cada build: la geometría de un país no cambia, y
 * bajar 1,5 MB en cada despliegue para producir siempre el mismo archivo es
 * gasto sin sentido. El resultado, `lib/mapa.ts`, sí va versionado.
 *
 * Fuente: https://gist.github.com/john-guerra/43c7656821069d00dcbc
 * 33 features · 34.191 vértices · 1,5 MB
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");

const FUENTE =
  "https://gist.githubusercontent.com/john-guerra/43c7656821069d00dcbc/raw/be6a6e239cd5b5b803c6e7c2ec405b793a9064dd/Colombia.geo.json";

/**
 * San Andrés y Providencia se queda fuera.
 *
 * Está a unos 700 km de la costa: incluirlo obliga a encoger la Colombia
 * continental cerca de un tercio para dejarle sitio a una isla que a esta
 * escala son tres píxeles, y donde además no hay ningún punto de acopio en el
 * volcado. Se omite a conciencia y queda escrito en el archivo generado para
 * que nadie lo tome por un error.
 */
const FUERA = ["ARCHIPIELAGO DE SAN ANDRES PROVIDENCIA Y SANTA CATALINA"];

const ANCHO = 720;   // unidades del viewBox; la altura sale de la proporción
const MARGEN = 8;
const TOLERANCIA = 0.9; // en unidades del viewBox, ajustada abajo por conteo

// ------------------------------------------------------------------ proyección

/**
 * Equirectangular corregida por el coseno de la latitud media.
 *
 * Colombia va de 4°S a 13°N: tan cerca del ecuador, la diferencia con Mercator
 * no se aprecia a este tamaño, y esto evita traer una librería de proyecciones
 * entera para dos multiplicaciones.
 */
function hacerProyeccion(bbox) {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const latMedia = ((minLat + maxLat) / 2) * (Math.PI / 180);
  const k = Math.cos(latMedia);

  const anchoGeo = (maxLon - minLon) * k;
  const altoGeo = maxLat - minLat;
  const escala = (ANCHO - MARGEN * 2) / anchoGeo;
  const alto = altoGeo * escala + MARGEN * 2;

  const proyectar = (lat, lon) => [
    MARGEN + (lon - minLon) * k * escala,
    // La latitud crece hacia el norte y la Y del SVG hacia abajo: se invierte.
    MARGEN + (maxLat - lat) * escala,
  ];

  return { proyectar, alto, minLon, maxLat, k, escala };
}

// ---------------------------------------------------------------- simplificado

/** Distancia perpendicular de un punto al segmento a–b. */
function distanciaAlSegmento(p, a, b) {
  let [x, y] = p;
  const [x1, y1] = a;
  const [x2, y2] = b;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

/**
 * Douglas-Peucker iterativo.
 *
 * Recursivo se desborda la pila con anillos de miles de vértices, que es justo
 * lo que trae este archivo.
 */
function simplificar(puntos, tolerancia) {
  if (puntos.length < 3) return puntos;

  const conservar = new Uint8Array(puntos.length);
  conservar[0] = 1;
  conservar[puntos.length - 1] = 1;

  const pila = [[0, puntos.length - 1]];
  while (pila.length) {
    const [ini, fin] = pila.pop();
    let peor = 0;
    let indice = -1;
    for (let i = ini + 1; i < fin; i++) {
      const d = distanciaAlSegmento(puntos[i], puntos[ini], puntos[fin]);
      if (d > peor) {
        peor = d;
        indice = i;
      }
    }
    if (peor > tolerancia && indice !== -1) {
      conservar[indice] = 1;
      pila.push([ini, indice], [indice, fin]);
    }
  }

  return puntos.filter((_, i) => conservar[i]);
}

// --------------------------------------------------------------------- rutas

const r = (n) => Math.round(n * 10) / 10;

/** Un anillo proyectado y simplificado → un subpath cerrado. */
function anilloARuta(anillo, proyectar, tolerancia) {
  const puntos = anillo.map(([lon, lat]) => proyectar(lat, lon));
  const simple = simplificar(puntos, tolerancia);
  // Menos de cuatro vértices no encierra área visible: es ruido de islote.
  if (simple.length < 4) return null;
  return (
    "M" +
    simple.map(([x, y]) => `${r(x)} ${r(y)}`).join("L") +
    "Z"
  );
}

function poligonos(geometria) {
  return geometria.type === "Polygon" ? [geometria.coordinates] : geometria.coordinates;
}

// ---------------------------------------------------------------------- main

const res = await fetch(FUENTE);
if (!res.ok) throw new Error(`El GeoJSON respondió ${res.status}`);
const geo = await res.json();

const features = geo.features.filter((f) => !FUERA.includes(f.properties.NOMBRE_DPT));
console.log(`departamentos: ${features.length} (de ${geo.features.length}, sin San Andrés)`);

// bbox solo de lo que se va a dibujar
let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90;
const recorrer = (c) => {
  if (typeof c[0] === "number") {
    minLon = Math.min(minLon, c[0]); maxLon = Math.max(maxLon, c[0]);
    minLat = Math.min(minLat, c[1]); maxLat = Math.max(maxLat, c[1]);
  } else c.forEach(recorrer);
};
features.forEach((f) => recorrer(f.geometry.coordinates));

const { proyectar, alto } = hacerProyeccion([minLon, minLat, maxLon, maxLat]);
console.log(`bbox lon ${minLon.toFixed(2)}…${maxLon.toFixed(2)} · lat ${minLat.toFixed(2)}…${maxLat.toFixed(2)}`);

// Se busca la tolerancia que deja el mapa por debajo del presupuesto de
// vértices sin que se note el recorte. Se prueba en vez de adivinar.
function construir(tolerancia) {
  const deps = features.map((f) => {
    const d = poligonos(f.geometry)
      .map((poly) => poly.map((anillo) => anilloARuta(anillo, proyectar, tolerancia)).filter(Boolean).join(""))
      .filter(Boolean)
      .join("");
    return { nombre: f.properties.NOMBRE_DPT, dpto: f.properties.DPTO, d };
  }).filter((x) => x.d);
  const vertices = deps.reduce((n, x) => n + (x.d.match(/L/g)?.length ?? 0) + (x.d.match(/M/g)?.length ?? 0), 0);
  return { deps, vertices };
}

let tolerancia = TOLERANCIA;
let salida = construir(tolerancia);
while (salida.vertices > 4200 && tolerancia < 12) {
  tolerancia = +(tolerancia * 1.25).toFixed(3);
  salida = construir(tolerancia);
}
console.log(`tolerancia ${tolerancia} → ${salida.vertices.toLocaleString()} vértices`);

const contenido = `/**
 * Geometría de Colombia, generada. NO EDITAR A MANO.
 *
 *   node scripts/mapa.mjs
 *
 * Departamentos del GeoJSON de john-guerra, proyectados y simplificados
 * (Douglas-Peucker, tolerancia ${tolerancia}) hasta ${salida.vertices.toLocaleString()} vértices.
 *
 * San Andrés y Providencia no está a propósito: a 700 km de la costa, incluirlo
 * encogería la Colombia continental un tercio para dibujar una isla de tres
 * píxeles donde además no hay ningún acopio. Es una omisión decidida, no un
 * dato que falte.
 */

export const VIEWBOX = "0 0 ${ANCHO} ${Math.ceil(alto)}";
export const ANCHO_MAPA = ${ANCHO};
export const ALTO_MAPA = ${Math.ceil(alto)};

/**
 * lat/lon → coordenadas del viewBox.
 *
 * Vive acá, junto a la geometría, para que los puntos de acopio usen
 * exactamente la misma proyección que los departamentos. Si se calculara por
 * separado, cualquier ajuste del mapa desalinearía los puntos en silencio.
 */
export function proyectar(lat: number, lon: number): [number, number] {
  const k = ${Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180)};
  const escala = ${(ANCHO - MARGEN * 2) / ((maxLon - minLon) * Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180))};
  return [
    ${MARGEN} + (lon - ${minLon}) * k * escala,
    ${MARGEN} + (${maxLat} - lat) * escala,
  ];
}

export type Departamento = { nombre: string; dpto: string; d: string };

export const DEPARTAMENTOS: Departamento[] = ${JSON.stringify(salida.deps, null, 0)};
`;

mkdirSync(join(RAIZ, "lib"), { recursive: true });
writeFileSync(join(RAIZ, "lib", "mapa.ts"), contenido);
console.log(`lib/mapa.ts → ${(contenido.length / 1024).toFixed(1)} KB`);
