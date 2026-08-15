// Sube a Supabase lo que hoy vive en data/*.json.
//
//   node src/migrar.js
//
// Sin esto, el primer despliegue con SUPABASE_URL configurado arranca con la
// tabla vacía: `revisarYAlertar` imprime "No hay suscriptores todavía" y no
// alerta a nadie. Falla en silencio y parece que todo está bien, que es
// exactamente lo que no puede pasar con una lista de gente esperando un aviso.
//
// Es idempotente: correrlo dos veces no duplica ni pisa nada.

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  usandoSupabase,
  guardarSuscriptor,
  marcarRespondidos,
  marcarEnviados,
} from "./db.js";

const DATOS = join(dirname(fileURLToPath(import.meta.url)), "..", "data");

async function leer(archivo, porDefecto) {
  try {
    return JSON.parse(await readFile(join(DATOS, archivo), "utf8"));
  } catch {
    return porDefecto;
  }
}

export async function migrar() {
  if (!usandoSupabase) {
    throw new Error(
      "Nada que migrar: falta SUPABASE_URL o SUPABASE_SERVICE_KEY. " +
        "Sin ellas el repo ya está usando data/*.json como almacenamiento."
    );
  }

  const suscriptores = await leer("suscriptores.json", []);
  for (const s of suscriptores) {
    // `alta` no existe en el esquema —la tabla usa `creado_en` con default—,
    // y mandarlo haría fallar el insert entero por una columna desconocida.
    await guardarSuscriptor({ telefono: s.telefono, municipio: s.municipio });
  }

  const respondidos = await leer("respondidos.json", []);
  await marcarRespondidos(respondidos);

  const enviados = await leer("enviados.json", []);
  await marcarEnviados(enviados);

  return {
    suscriptores: suscriptores.length,
    respondidos: respondidos.length,
    enviados: enviados.length,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await migrar().catch((error) => {
    // Un stack trace acá no ayuda a nadie: el fallo esperado es "falta una
    // variable de entorno", y eso se dice en una línea.
    console.error(error.message);
    process.exit(1);
  });
  console.log(
    `Migrado a Supabase: ${r.suscriptores} suscriptor(es), ` +
      `${r.respondidos} respondido(s), ${r.enviados} enviado(s).`
  );
  if (r.suscriptores === 0) {
    console.warn(
      "\n⚠️  Cero suscriptores. Si esperabas alguno, revisá data/suscriptores.json " +
        "antes de desplegar: con la tabla vacía nadie recibe alertas."
    );
  }
}
