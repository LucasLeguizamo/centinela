// Persistencia con dos respaldos: Supabase si está configurado, archivos JSON
// si no.
//
// La razón de que sean dos y no uno: `data/*.json` se rompe en Vercel —el
// filesystem es efímero y cada invocación puede caer en otra instancia— pero
// exigir Supabase para correr un test o una demo local sería peor. El código
// que llama no sabe cuál está activo.
//
// Se activa Supabase con SUPABASE_URL + SUPABASE_SERVICE_KEY.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { distanciaSuperficie } from "./sismos.js";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATOS = join(RAIZ, "data");

const URL_SUPABASE = process.env.SUPABASE_URL;
const LLAVE_SUPABASE = process.env.SUPABASE_SERVICE_KEY;

export const usandoSupabase = Boolean(URL_SUPABASE && LLAVE_SUPABASE);

// ------------------------------------------------------------------ JSON

async function leerJson(archivo, porDefecto) {
  try {
    return JSON.parse(await readFile(join(DATOS, archivo), "utf8"));
  } catch {
    return porDefecto;
  }
}

async function escribirJson(archivo, valor) {
  await mkdir(DATOS, { recursive: true });
  await writeFile(join(DATOS, archivo), JSON.stringify(valor, null, 2));
}

// -------------------------------------------------------------- Supabase

/**
 * Cliente mínimo sobre PostgREST.
 *
 * No se usa @supabase/supabase-js a propósito: de esa librería aquí sólo se
 * necesitan select, upsert y rpc, y añadirla traería el cliente de auth,
 * realtime y storage a un proceso que no los toca. Son treinta líneas contra
 * un árbol de dependencias.
 */
async function pedir(ruta, opciones = {}) {
  const res = await fetch(`${URL_SUPABASE}/rest/v1/${ruta}`, {
    ...opciones,
    headers: {
      apikey: LLAVE_SUPABASE,
      Authorization: `Bearer ${LLAVE_SUPABASE}`,
      "Content-Type": "application/json",
      ...opciones.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`Supabase ${res.status} en ${ruta}: ${await res.text()}`);
  }
  return res.status === 204 ? null : res.json();
}

const rpc = (nombre, args) =>
  pedir(`rpc/${nombre}`, { method: "POST", body: JSON.stringify(args) });

// --------------------------------------------------------- suscriptores

export async function leerSuscriptores() {
  if (!usandoSupabase) return leerJson("suscriptores.json", []);
  return pedir("suscriptores?select=telefono,municipio");
}

export async function guardarSuscriptor({ telefono, municipio }) {
  if (usandoSupabase) {
    await pedir("suscriptores", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ telefono, municipio }),
    });
    return;
  }
  const todos = await leerJson("suscriptores.json", []);
  const otros = todos.filter((s) => s.telefono !== telefono);
  await escribirJson("suscriptores.json", [...otros, { telefono, municipio }]);
}

export async function borrarSuscriptor(telefono) {
  if (usandoSupabase) {
    await pedir(`suscriptores?telefono=eq.${encodeURIComponent(telefono)}`, {
      method: "DELETE",
    });
    return;
  }
  const todos = await leerJson("suscriptores.json", []);
  await escribirJson(
    "suscriptores.json",
    todos.filter((s) => s.telefono !== telefono)
  );
}

// ----------------------------------------------------------- respondidos

export async function leerRespondidos() {
  if (!usandoSupabase) return new Set(await leerJson("respondidos.json", []));
  const filas = await pedir("respondidos?select=mensaje_id");
  return new Set(filas.map((f) => f.mensaje_id));
}

export async function marcarRespondidos(ids) {
  if (ids.length === 0) return;
  if (usandoSupabase) {
    await pedir("respondidos", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates" },
      body: JSON.stringify(ids.map((mensaje_id) => ({ mensaje_id }))),
    });
    return;
  }
  const previos = await leerJson("respondidos.json", []);
  await escribirJson("respondidos.json", [...new Set([...previos, ...ids])]);
}

// -------------------------------------------------------------- enviados

export async function leerEnviados() {
  if (!usandoSupabase) return new Set(await leerJson("enviados.json", []));
  const filas = await pedir("enviados?select=clave");
  return new Set(filas.map((f) => f.clave));
}

export async function marcarEnviados(claves) {
  if (claves.length === 0) return;
  if (usandoSupabase) {
    await pedir("enviados", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates" },
      body: JSON.stringify(claves.map((clave) => ({ clave }))),
    });
    return;
  }
  const previos = await leerJson("enviados.json", []);
  await escribirJson("enviados.json", [...new Set([...previos, ...claves])]);
}

// -------------------------------------------------------------- recursos

/**
 * Deja la tabla igual a lo que la fuente publica ahora mismo.
 *
 * Lo que dejó de aparecer se marca `activo=false` en vez de borrarse: un
 * acopio que cierra tiene que desaparecer del bot, pero saber que existió y
 * cuándo dejó de estar es lo que permite auditar una respuesta vieja.
 */
export async function reemplazarRecursos(fuente, filas) {
  if (usandoSupabase) {
    const vistos = filas.map((f) => f.hash);
    await pedir("recursos", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(
        filas.map((f) => ({
          ...f,
          geo: f.lat != null && f.lon != null ? `POINT(${f.lon} ${f.lat})` : null,
          visto_en: new Date().toISOString(),
          activo: true,
        }))
      ),
    });
    const fuera = vistos.map((h) => `"${h}"`).join(",");
    await pedir(
      `recursos?fuente=eq.${encodeURIComponent(fuente)}&hash=not.in.(${fuera})`,
      { method: "PATCH", body: JSON.stringify({ activo: false }) }
    );
    return filas.length;
  }

  const todos = await leerJson("recursos.json", []);
  const otras = todos.filter((r) => r.fuente !== fuente);
  await escribirJson("recursos.json", [
    ...otras,
    ...filas.map((f) => ({ ...f, visto_en: new Date().toISOString(), activo: true })),
  ]);
  return filas.length;
}

/** Dedupe entre fuentes: mismo tipo y mismo nombre normalizado es lo mismo. */
function clave(recurso) {
  return (
    recurso.tipo +
    "|" +
    recurso.nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]/g, "")
  );
}

/**
 * Recursos de un tipo cerca de un punto, más cercano primero.
 *
 * En Supabase lo resuelve `recursos_cerca` con índice GiST. En el respaldo
 * JSON se calcula en memoria: con unos cientos de filas sobra, y mantiene el
 * bot corriendo en local sin base de datos.
 */
export async function buscarRecursos({ tipo, lat, lon, radioKm = 25, limite = 5 }) {
  if (usandoSupabase) {
    return rpc("recursos_cerca", {
      p_tipo: tipo,
      p_lat: lat,
      p_lon: lon,
      p_radio_km: radioKm,
      p_limite: limite,
    });
  }

  const todos = await leerJson("recursos.json", []);
  const unicos = new Map();

  for (const r of todos) {
    if (!r.activo || r.tipo !== tipo || r.lat == null || r.lon == null) continue;
    const k = clave(r);
    const previo = unicos.get(k);
    // Mismo criterio que la vista `recursos_unicos`: gana el verificado, y
    // entre iguales el verificado más recientemente.
    if (
      !previo ||
      (r.verificado && !previo.verificado) ||
      (r.verificado === previo.verificado &&
        (r.verificado_en ?? "") > (previo.verificado_en ?? ""))
    ) {
      unicos.set(k, r);
    }
  }

  return [...unicos.values()]
    .map((r) => ({
      ...r,
      distancia_km: Number(distanciaSuperficie(lat, lon, r.lat, r.lon).toFixed(1)),
    }))
    .filter((r) => r.distancia_km <= radioKm)
    .sort((a, b) =>
      a.verificado === b.verificado
        ? a.distancia_km - b.distancia_km
        : Number(b.verificado) - Number(a.verificado)
    )
    .slice(0, limite);
}
