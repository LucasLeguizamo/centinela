"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { DEPARTAMENTOS, VIEWBOX } from "@/lib/mapa";
import { MUELLE_CORTO } from "@/lib/motion";
import { Reveal } from "./Reveal";

/**
 * Ayuda en caso de sismo — el boceto de Línea Sismo, tangible.
 *
 * Línea Sismo es el diseño (sin construir) de tres vitrinas públicas que se
 * llenan por WhatsApp: persona no localizada, ayuda con daños, donaciones.
 * Documentado en `docs/CIRCUITOS.md` y en el mockup de referencia (machete),
 * salido de una sesión de co-diseño.
 *
 * El layout de las tres pestañas —lista a la izquierda, mapa con el
 * departamento resaltado a la derecha— replica ese mockup a propósito, no es
 * una interpretación libre.
 *
 * Dos reglas separan el boceto del resto de la página:
 *
 * 1. **La geometría es real.** El contorno de Colombia y cada departamento
 *    resaltado salen de `lib/mapa.ts` — la misma fuente que usa el mapa del
 *    hero. Las personas, los centros y los lugares son de ejemplo: se marca.
 *    No hay etiqueta "buscando" — la regla del producto es que apenas
 *    alguien se localiza, sale de la vitrina; lo que sí hay es el botón de
 *    check (`.ls-encontrado`) que dispararía esa salida, con el folio como
 *    prueba de que no es decorativo.
 * 2. **Nada finge estar conectado.** El check "reportar encontrado/a" no
 *    abre WhatsApp — un botón que parece funcionar y no funciona es peor que
 *    uno que se ve claramente apagado.
 *
 * El pin de Venezuela es el caso límite de la regla 1: el sismo doble de
 * junio de 2026 es real, tiene contorno real (`glynnbird/countriesgeojson`,
 * no un GeoJSON por departamento como Colombia, así que no hay resaltado
 * por estado) y sus cuatro zonas más golpeadas (`REGIONES_VENEZUELA`) —
 * pero **nunca va a tener cards de personas**. El registro ciudadano real de
 * esa tragedia (~29.500 nombres, desaparecidosvenezuela.com) sigue abierto
 * para familias buscando a alguien ahora mismo; no es contenido de ejemplo
 * para una demo, así que no se reutiliza, sin importar cuánto se parezca el
 * resto del boceto.
 */

/* ============================================================================
   Datos de ejemplo — Colombia
   ----------------------------------------------------------------------------
   Todo acá es ficticio, tal como lo define el mockup de referencia. Ninguna
   dirección es real, ningún nombre corresponde a una persona real.
   ========================================================================= */

/**
 * Las ocho ciudades tocables del mapa: las cinco de siempre (mismas que usa
 * `lib/sismo.ts` para el comparador del hero) más Barranquilla, Cartagena y
 * Bucaramanga — para que la demo cubra las grandes ciudades del país, no
 * solo el corredor cafetero-Chocó del sismo. El `dpto` es el código DANE del
 * departamento en `lib/mapa.ts`: la geometría es por departamento, no por
 * municipio, así que "Cali" en el mapa es en realidad el Valle del Cauca
 * resaltado — la misma aproximación que ya se usaba solo para Bogotá.
 */
type CiudadClave =
  | "bogota"
  | "medellin"
  | "cali"
  | "quibdo"
  | "pereira"
  | "barranquilla"
  | "cartagena"
  | "bucaramanga";

/**
 * `cx`/`cy` son el promedio de los vértices reales de cada departamento en
 * `lib/mapa.ts` (calculado una vez, no a ojo) — el punto donde va el marcador
 * y, más importante, el centro del área de toque cómoda. Bogotá D.C. mide
 * 29×67 unidades contra las 188×198 de Antioquia: sin un punto de toque
 * propio, apuntarle con el dedo es casi imposible aunque el departamento
 * "exista" en el mapa.
 */
type Ciudad = { clave: CiudadClave; nombre: string; dpto: string; cx: number; cy: number };

const CIUDADES: Ciudad[] = [
  { clave: "bogota", nombre: "Bogotá", dpto: "11", cx: 287.9, cy: 480.0 },
  { clave: "medellin", nombre: "Medellín", dpto: "05", cx: 187.9, cy: 320.1 },
  { clave: "cali", nombre: "Cali", dpto: "76", cx: 142.5, cy: 500.2 },
  { clave: "quibdo", nombre: "Quibdó", dpto: "27", cx: 122.2, cy: 374.4 },
  { clave: "pereira", nombre: "Pereira", dpto: "66", cx: 193.4, cy: 435.3 },
  { clave: "barranquilla", nombre: "Barranquilla", dpto: "08", cx: 242.0, cy: 115.9 },
  { clave: "cartagena", nombre: "Cartagena", dpto: "13", cx: 254.3, cy: 194.9 },
  { clave: "bucaramanga", nombre: "Bucaramanga", dpto: "68", cx: 326.1, cy: 341.5 },
];

function ciudadPorDpto(dpto: string) {
  return CIUDADES.find((c) => c.dpto === dpto);
}

/**
 * El folio sigue el formato de `docs/CIRCUITOS.md` (PD-AAMMDD-NNNN): no es
 * decorativo, es lo que el botón "Reportar encontrado/a" de cada tarjeta
 * necesita para explicar qué mandaría — "ENCONTRADO {folio}" por WhatsApp,
 * el mismo texto que cierra el Circuito 1 en el diseño real.
 */
type Persona = { id: string; nombre: string; direccion: string; descripcion: string; folio: string };

/** Todo ficticio — ver el aviso debajo de cada lista. */
const PERSONAS_EJEMPLO: Record<CiudadClave, Persona[]> = {
  bogota: [
    {
      id: "p-bog-1",
      nombre: "David Rodríguez",
      direccion: "Cra 69d #1-45 sur, Bogotá D.C.",
      descripcion:
        "Hombre de estatura media-alta, complexión atlética, cabello corto y oscuro, piel clara y facciones marcadas. Ojos oscuros.",
      folio: "PD-240815-0417",
    },
    {
      id: "p-bog-2",
      nombre: "Valentina Rojas Mendoza",
      direccion: "Calle 12C #6-25, Bogotá D.C.",
      descripcion:
        "Mujer de estatura media, complexión delgada, cabello largo y oscuro, piel clara y facciones suaves. Ojos grandes.",
      folio: "PD-240815-0592",
    },
    {
      id: "p-bog-3",
      nombre: "Nicolás Herrera Castro",
      direccion: "Carrera 15 entre calles 88 y 90, Bogotá D.C.",
      descripcion:
        "Hombre alto, complexión robusta, cabello corto castaño, piel morena y mandíbula marcada. Ojos oscuros.",
      folio: "PD-240815-0641",
    },
  ],
  medellin: [
    {
      id: "p-med-1",
      nombre: "Andrés Felipe Gómez",
      direccion: "Calle 33 #74-10, Medellín",
      descripcion: "Hombre joven, contextura media, cabello rizado oscuro, tez trigueña. Cicatriz pequeña en la ceja izquierda.",
      folio: "PD-240815-0108",
    },
    {
      id: "p-med-2",
      nombre: "Camila Andrea Zapata",
      direccion: "Carrera 80 #45-22, Medellín",
      descripcion: "Mujer de estatura baja, contextura delgada, cabello corto teñido de rojizo, tez clara. Usa gafas.",
      folio: "PD-240815-0173",
    },
  ],
  cali: [
    {
      id: "p-cal-1",
      nombre: "Juan Esteban Marín",
      direccion: "Carrera 100 #16-30, Cali",
      descripcion: "Hombre alto, delgado, cabello corto negro, tez morena. Tatuaje en el antebrazo derecho.",
      folio: "PD-240815-0229",
    },
    {
      id: "p-cal-2",
      nombre: "Laura Sofía Perea",
      direccion: "Calle 5 #38-12, Cali",
      descripcion: "Mujer de estatura media, cabello afro, tez oscura, contextura media.",
      folio: "PD-240815-0284",
    },
  ],
  quibdo: [
    {
      id: "p-qui-1",
      nombre: "Yeison Mosquera Palacios",
      direccion: "Barrio Kennedy, Quibdó",
      descripcion: "Hombre joven, contextura delgada, cabello corto, tez oscura. Camiseta azul al momento de la última vista.",
      folio: "PD-240815-0031",
    },
    {
      id: "p-qui-2",
      nombre: "Dayana Córdoba Rentería",
      direccion: "Barrio Obrero, Quibdó",
      descripcion: "Mujer de estatura media, cabello trenzado, tez oscura, contextura media.",
      folio: "PD-240815-0052",
    },
  ],
  pereira: [
    {
      id: "p-per-1",
      nombre: "Santiago Valencia Ríos",
      direccion: "Barrio Cuba, Pereira",
      descripcion: "Hombre adulto, contextura robusta, cabello corto canoso, tez clara.",
      folio: "PD-240815-0316",
    },
    {
      id: "p-per-2",
      nombre: "Manuela Osorio Bedoya",
      direccion: "Barrio Álamos, Pereira",
      descripcion: "Mujer joven, contextura delgada, cabello largo castaño, tez clara.",
      folio: "PD-240815-0347",
    },
  ],
  barranquilla: [
    {
      id: "p-baq-1",
      nombre: "Kevin Andrés Palomino",
      direccion: "Barrio El Prado, Barranquilla",
      descripcion: "Hombre joven, contextura delgada, cabello corto, tez trigueña. Camiseta del Junior al momento de la última vista.",
      folio: "PD-240815-0402",
    },
    {
      id: "p-baq-2",
      nombre: "Ana Milena Barros",
      direccion: "Barrio Riomar, Barranquilla",
      descripcion: "Mujer de estatura media, cabello liso teñido rubio, tez clara, contextura media.",
      folio: "PD-240815-0455",
    },
  ],
  cartagena: [
    {
      id: "p-ctg-1",
      nombre: "Rafael Enrique Julio",
      direccion: "Barrio Getsemaní, Cartagena",
      descripcion: "Hombre adulto, contextura media, cabello corto canoso, tez morena.",
      folio: "PD-240815-0509",
    },
    {
      id: "p-ctg-2",
      nombre: "Ingrid Paola Meza",
      direccion: "Barrio Manga, Cartagena",
      descripcion: "Mujer joven, contextura delgada, cabello largo negro, tez trigueña.",
      folio: "PD-240815-0561",
    },
  ],
  bucaramanga: [
    {
      id: "p-bga-1",
      nombre: "Diego Alejandro Suárez",
      direccion: "Barrio Cabecera, Bucaramanga",
      descripcion: "Hombre joven, contextura atlética, cabello corto negro, tez clara.",
      folio: "PD-240815-0618",
    },
    {
      id: "p-bga-2",
      nombre: "Paula Andrea Rincón",
      direccion: "Barrio San Francisco, Bucaramanga",
      descripcion: "Mujer de estatura media, cabello corto castaño, tez clara.",
      folio: "PD-240815-0663",
    },
  ],
};

/**
 * Las tres categorías, y sus nombres (`CATEGORIAS_DONACION` más abajo), están
 * alineadas a propósito con las tres opciones reales de "Quiero ayudar" en
 * el menú de WhatsApp: Llevar cosas · Donar dinero · Donar sangre. No es
 * "Voluntariado" porque esa opción no existe en el bot real — se cambió acá
 * para que la demo diga lo mismo que el producto que ya corre.
 */
type CategoriaDonacion = "economicas" | "sangre" | "suministros";

type Centro = { id: string; categoria: CategoriaDonacion; nombre: string; direccion: string; detalle: string };

/**
 * Los centros de Quibdó, Pereira, Barranquilla, Cartagena y Bucaramanga no
 * son inventados — son acopios reales de `data/snapshots/` (el mismo
 * volcado que usa el mapa del hero), con la dirección recortada a lo
 * esencial. El resto sí es de ejemplo: no se conocía un centro real por
 * ciudad para completar la demo, y toca decirlo en vez de fingir que todo
 * salió de la misma fuente.
 */
const CENTROS_EJEMPLO: Record<CiudadClave, Centro[]> = {
  bogota: [
    { id: "c-bog-1", categoria: "suministros", nombre: "Cruz Roja Colombiana", direccion: "Carrera 24 #73-38, Bogotá D.C.", detalle: "Recibe agua potable, alimentos no perecederos, cobijas y colchonetas." },
    { id: "c-bog-2", categoria: "suministros", nombre: "Centro de Salvamento Acuático", direccion: "Av. La Esmeralda #63-81, Bogotá D.C.", detalle: "Punto de recepción de ayuda humanitaria básica: alimentos, agua, elementos de higiene." },
    { id: "c-bog-3", categoria: "suministros", nombre: "Palacio de los Deportes", direccion: "Calle 63 #59A-06, Bogotá D.C.", detalle: "Acopio de alimentos no perecederos, cobijas, colchonetas, higiene y primeros auxilios." },
    { id: "c-bog-4", categoria: "economicas", nombre: "Fondo de Reconstrucción Bogotá", direccion: "Carrera 7 #26-20, Bogotá D.C.", detalle: "Canaliza donaciones económicas hacia la reconstrucción de vivienda afectada." },
    { id: "c-bog-5", categoria: "sangre", nombre: "Hemocentro Distrital", direccion: "Calle 26 #51-20, Bogotá D.C.", detalle: "Jornada de donación de sangre — todos los tipos bienvenidos." },
  ],
  medellin: [
    { id: "c-med-1", categoria: "suministros", nombre: "Comfama Centro", direccion: "Calle 51 #55-78, Medellín", detalle: "Recibe agua potable, alimentos no perecederos y kits de aseo." },
    { id: "c-med-2", categoria: "economicas", nombre: "Fondo Unidos por Antioquia", direccion: "Carrera 43A #1-50, Medellín", detalle: "Canaliza donaciones económicas hacia familias afectadas." },
    { id: "c-med-3", categoria: "sangre", nombre: "Banco de Sangre Hemocentro de Antioquia", direccion: "Calle 55 #46-27, Medellín", detalle: "Puntos fijos y jornadas móviles de donación." },
  ],
  cali: [
    { id: "c-cal-1", categoria: "suministros", nombre: "Cruz Roja Valle", direccion: "Avenida 2N #26N-40, Cali", detalle: "Recibe agua potable, alimentos no perecederos y elementos de primeros auxilios." },
    { id: "c-cal-2", categoria: "economicas", nombre: "Fundación Un Nuevo Cali", direccion: "Calle 13 #8-30, Cali", detalle: "Recibe donaciones económicas para reconstrucción de vivienda." },
    { id: "c-cal-3", categoria: "sangre", nombre: "Banco de Sangre Cruz Roja Valle", direccion: "Avenida 2N #26N-40, Cali", detalle: "Jornada de donación de sangre esta semana." },
  ],
  quibdo: [
    { id: "c-qui-1", categoria: "suministros", nombre: "Punto de Solidaridad Quibdó", direccion: "Calle 27A #23-44, Quibdó", detalle: "Recibe agua potable, alimentos no perecederos y elementos de aseo." },
    { id: "c-qui-2", categoria: "economicas", nombre: "Fondo Chocó Resiliente", direccion: "Carrera 2 #26-10, Quibdó", detalle: "Canaliza donaciones económicas para la región." },
    { id: "c-qui-3", categoria: "sangre", nombre: "Banco de Sangre Hospital San Francisco de Asís", direccion: "Quibdó", detalle: "Necesita donantes O negativo con urgencia." },
  ],
  pereira: [
    { id: "c-per-1", categoria: "suministros", nombre: "Complejo Bodeguero Alpaca", direccion: "Vía La Romelia, Pereira", detalle: "Recibe agua potable, alimentos no perecederos y elementos de aseo." },
    { id: "c-per-2", categoria: "economicas", nombre: "Fondo Eje Cafetero Solidario", direccion: "Carrera 8 #23-40, Pereira", detalle: "Recibe donaciones económicas para la reconstrucción." },
    { id: "c-per-3", categoria: "sangre", nombre: "Banco de Sangre Hospital Universitario San Jorge", direccion: "Pereira", detalle: "Jornada de donación de sangre, todos los tipos." },
  ],
  barranquilla: [
    { id: "c-baq-1", categoria: "suministros", nombre: "ACSC Barranquilla", direccion: "Carrera 54 #68-196, Barranquilla", detalle: "Recibe insumos médicos nuevos y vigentes, y material para curaciones." },
    { id: "c-baq-2", categoria: "economicas", nombre: "Fondo Atlántico Solidario", direccion: "Calle 84 #52-10, Barranquilla", detalle: "Canaliza donaciones económicas para la región Caribe." },
    { id: "c-baq-3", categoria: "sangre", nombre: "Banco de Sangre Hospital Universidad del Norte", direccion: "Barranquilla", detalle: "Puntos de donación, cita previa recomendada." },
  ],
  cartagena: [
    { id: "c-ctg-1", categoria: "suministros", nombre: "ACSC Cartagena", direccion: "Manga, Calle 28 #26-53, Cartagena", detalle: "Recibe insumos médicos nuevos y vigentes, y material para curaciones." },
    { id: "c-ctg-2", categoria: "economicas", nombre: "Fondo Heroica Solidaria", direccion: "Centro Histórico, Cartagena", detalle: "Recibe donaciones económicas para reconstrucción." },
    { id: "c-ctg-3", categoria: "sangre", nombre: "Banco de Sangre Hospital Universitario del Caribe", direccion: "Cartagena", detalle: "Jornada de donación, se necesitan todos los tipos." },
  ],
  bucaramanga: [
    { id: "c-bga-1", categoria: "suministros", nombre: "ACSC Bucaramanga", direccion: "Calle 45 #28-36, Bucaramanga", detalle: "Recibe insumos médicos nuevos y vigentes, y material para curaciones." },
    { id: "c-bga-2", categoria: "economicas", nombre: "Fondo Santander Resiliente", direccion: "Cabecera del Llano, Bucaramanga", detalle: "Canaliza donaciones económicas para la región." },
    { id: "c-bga-3", categoria: "sangre", nombre: "Banco de Sangre Hospital Universitario de Santander", direccion: "Bucaramanga", detalle: "Jornada de donación de sangre esta semana." },
  ],
};

type Lugar = { id: string; nombre: string; direccion: string; detalle: string };

const LUGARES_EJEMPLO: Record<CiudadClave, Lugar[]> = {
  bogota: [
    { id: "l-bog-1", nombre: "Fachada rota", direccion: "Carrera 24 #73-38, Bogotá D.C.", detalle: "Requiere clavos, madera y lámina para asegurar la fachada." },
    { id: "l-bog-2", nombre: "Techo colapsado parcialmente", direccion: "Calle 45 #13-12, Bogotá D.C.", detalle: "Requiere cuadrilla de evaluación estructural y lona impermeable." },
    { id: "l-bog-3", nombre: "Grietas en muro de carga", direccion: "Carrera 68 #24-10, Bogotá D.C.", detalle: "Vivienda evacuada preventivamente — requiere revisión antes de reingresar." },
  ],
  medellin: [
    { id: "l-med-1", nombre: "Muro agrietado", direccion: "Carrera 70 #44-12, Medellín", detalle: "Requiere revisión estructural urgente." },
    { id: "l-med-2", nombre: "Sin agua potable", direccion: "Calle 30 #65-20, Medellín", detalle: "Requiere carrotanque o bombeo temporal." },
  ],
  cali: [
    { id: "l-cal-1", nombre: "Fachada colapsada", direccion: "Calle 44 #6-18, Cali", detalle: "Requiere maquinaria pesada para retirar escombros." },
    { id: "l-cal-2", nombre: "Grietas en columnas", direccion: "Carrera 56 #12-40, Cali", detalle: "Edificio evacuado — requiere ingeniero estructural." },
  ],
  quibdo: [
    { id: "l-qui-1", nombre: "Techo de zinc levantado", direccion: "Barrio Tomás Pérez, Quibdó", detalle: "Requiere láminas de zinc y clavos." },
    { id: "l-qui-2", nombre: "Vivienda inundada parcialmente", direccion: "Barrio Kennedy, Quibdó", detalle: "Requiere bombeo de agua y desinfección." },
  ],
  pereira: [
    { id: "l-per-1", nombre: "Deslizamiento en ladera", direccion: "Barrio Boston, Pereira", detalle: "Requiere evaluación geotécnica antes de reingresar." },
    { id: "l-per-2", nombre: "Fachada con grietas", direccion: "Barrio Álamos, Pereira", detalle: "Requiere revisión estructural." },
  ],
  barranquilla: [
    { id: "l-baq-1", nombre: "Andén hundido", direccion: "Carrera 46 #70-20, Barranquilla", detalle: "Requiere señalización y relleno urgente." },
    { id: "l-baq-2", nombre: "Poste eléctrico caído", direccion: "Barrio Simón Bolívar, Barranquilla", detalle: "Zona sin energía — requiere revisión de la empresa eléctrica." },
  ],
  cartagena: [
    { id: "l-ctg-1", nombre: "Muralla con grietas", direccion: "Centro Histórico, Cartagena", detalle: "Requiere evaluación patrimonial antes de cualquier intervención." },
    { id: "l-ctg-2", nombre: "Techo de palma dañado", direccion: "Barrio Boston, Cartagena", detalle: "Requiere material vegetal y amarres." },
  ],
  bucaramanga: [
    { id: "l-bga-1", nombre: "Talud inestable", direccion: "Vía a Floridablanca, Bucaramanga", detalle: "Requiere evaluación geotécnica." },
    { id: "l-bga-2", nombre: "Fachada con grietas", direccion: "Barrio García Rovira, Bucaramanga", detalle: "Requiere revisión estructural." },
  ],
};

/** Silueta genérica: no hay foto real que mostrar en un ejemplo. */
function IconoSilueta() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="5" />
      <path d="M2,23 C2,15 22,15 22,23 Z" />
    </svg>
  );
}

/**
 * El mapa de Colombia, tecleable de verdad en las cinco ciudades con datos
 * de ejemplo. El resto de los departamentos son parte del contorno, sin
 * interacción — no tienen nada que mostrar todavía, y un botón que no hace
 * nada al tocarlo es peor que uno que no responde al mouse.
 */
function MapaResaltado({
  activa,
  hover,
  etiqueta,
  onHover,
  onSeleccionar,
}: {
  activa: string;
  hover: string | null;
  etiqueta: string;
  onHover: (dpto: string | null) => void;
  onSeleccionar: (dpto: string) => void;
}) {
  return (
    <svg viewBox={VIEWBOX} className="mapa-svg ls-mapa-svg" role="img" aria-label={etiqueta}>
      {/* Solo color acá — la interacción vive en los marcadores de abajo. Un
          departamento chico como Bogotá D.C. puede pintarse aunque nadie
          logre tocarlo con precisión; separar las dos cosas es lo que
          permite arreglar el toque sin tocar el color. */}
      <g className="mapa-departamentos">
        {DEPARTAMENTOS.map((d, i) => {
          const clases = [
            d.dpto === activa ? "ls-dpto-activo" : "",
            d.dpto === hover ? "ls-dpto-hover" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return <path key={d.dpto + i} d={d.d} className={clases} />;
        })}
      </g>
      <g className="mapa-contorno">
        {DEPARTAMENTOS.map((d, i) => (
          <path key={d.dpto + i} d={d.d} />
        ))}
      </g>

      {/* Marcadores: un punto visible en el centroide real de cada ciudad, y
          un área de toque bastante más grande alrededor (invisible) — el
          mismo patrón que ya usa `.mapa-focos` en el mapa del hero para el
          mismo problema (formas reales chicas, dedos no tan precisos). */}
      <g className="ls-ciudades">
        {CIUDADES.map((c) => {
          const esActiva = c.dpto === activa;
          const esHover = c.dpto === hover;
          return (
            <g key={c.clave}>
              <circle
                className={`ls-ciudad-punto ${esActiva ? "ls-ciudad-punto-activo" : ""}`}
                cx={c.cx}
                cy={c.cy}
                r={esActiva || esHover ? 9 : 6}
                aria-hidden="true"
              />
              <circle
                className="ls-ciudad-foco"
                cx={c.cx}
                cy={c.cy}
                r={22}
                tabIndex={0}
                role="button"
                aria-label={`Ver ${c.nombre}`}
                aria-pressed={esActiva}
                onPointerEnter={() => onHover(c.dpto)}
                onPointerLeave={() => onHover(null)}
                onFocus={() => onHover(c.dpto)}
                onBlur={() => onHover(null)}
                onClick={() => onSeleccionar(c.dpto)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSeleccionar(c.dpto);
                  }
                }}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/** El mapa + su tooltip de nombre al pasar el cursor — el tooltip vive en HTML, no en SVG, porque seguir el puntero con `<text>` es una pelea que no vale la pena. */
function ColumnaMapa({
  activa,
  onSeleccionar,
  etiqueta,
  pie,
}: {
  activa: string;
  onSeleccionar: (dpto: string) => void;
  etiqueta: string;
  pie: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const marco = useRef<HTMLDivElement>(null);

  const seguirCursor = (e: React.PointerEvent) => {
    const caja = marco.current?.getBoundingClientRect();
    if (!caja) return;
    setPos({ x: e.clientX - caja.left, y: e.clientY - caja.top });
  };

  const ciudadHover = hover ? ciudadPorDpto(hover) : undefined;

  return (
    <div className="ls-col-mapa">
      <div className="ls-mapa" ref={marco} onPointerMove={seguirCursor}>
        <MapaResaltado activa={activa} hover={hover} etiqueta={etiqueta} onHover={setHover} onSeleccionar={onSeleccionar} />
        {ciudadHover && (
          <div className="ls-mapa-tooltip" style={{ left: pos.x, top: pos.y }} aria-hidden="true">
            {ciudadHover.nombre}
          </div>
        )}
      </div>
      <p className="ls-mapa-cabo">{pie}</p>
    </div>
  );
}

/**
 * Venezuela, 2026 — evento real, solo cifras agregadas y zonas, nunca un
 * nombre. El registro ciudadano real de esta tragedia (~29.500 personas,
 * desaparecidosvenezuela.com) sigue abierto para las familias que buscan a
 * alguien ahora mismo — no es material de ejemplo para una demo, así que no
 * se toca acá.
 *
 * Las cifras de este sismo se mueven mucho y las fuentes no coinciden entre
 * sí (sin censo actualizado desde 2011, cifras oficiales retenidas) — eso
 * también se muestra en vez de esconderse detrás de un número falso y
 * prolijo.
 */
const EVENTO_VENEZUELA = {
  cuando: "24 de junio de 2026 · doblete M7.2 y M7.5, 39 segundos aparte",
  muertos: "6.301+",
  muertosNota: "cifra reportada el 11 de agosto de 2026 — sigue en aumento",
  desaparecidos: "18.000–71.000",
  desaparecidosNota: "sin cifra oficial ni censo actualizado desde 2011; la ONU llegó a estimar hasta 50.000",
  fuenteTexto: "Wikipedia (ES) · Infobae · Al Jazeera",
  fuenteUrl: "https://es.wikipedia.org/wiki/Terremotos_de_Venezuela_de_2026",
};

type RegionVenezuela = { id: string; nombre: string; x: number; y: number; dato: string };

/**
 * Las cuatro zonas que el periodismo real nombra una y otra vez — con lo que
 * cada una reportó, no un promedio inventado. `x`/`y` son sus coordenadas
 * reales (lat/lon de cada capital) proyectadas con la misma función que el
 * contorno de abajo — no ubicadas a ojo sobre el dibujo.
 *
 * Única excepción: La Guaira y Caracas están a 12 km una de otra en la vida
 * real, y proyectadas tal cual quedaban un pin encima del otro — "1" ni se
 * veía. Se separaron unos milímetros a mano, manteniendo la posición
 * relativa real (La Guaira en la costa, al norte de Caracas).
 */
const REGIONES_VENEZUELA: RegionVenezuela[] = [
  {
    id: "guaira",
    nombre: "La Guaira",
    x: 144, y: 36,
    dato: "1.400+ edificios destruidos · aeropuerto Simón Bolívar cerrado · entre 1.579 y 71.000 personas sin contar, solo en este estado",
  },
  {
    id: "caracas",
    nombre: "Caracas",
    x: 156, y: 54,
    dato: "junto con La Guaira, la mayor concentración de víctimas del país",
  },
  {
    id: "yaracuy",
    nombre: "Yaracuy",
    x: 111.5, y: 52.1,
    dato: "epicentro del primer sismo (M7.2), municipio Veroes, cerca de San Felipe",
  },
  {
    id: "carabobo",
    nombre: "Carabobo",
    x: 127.9, y: 56.0,
    dato: "reporte inicial: 9 muertos en colapsos — cifra temprana, sin actualizar desde entonces",
  },
];

/**
 * Contorno real de Venezuela — ya no es una nube dibujada a mano. Sale de
 * `glynnbird/countriesgeojson` (dominio público, 92 vértices) proyectado con
 * una ecuatorial simple: `k = cos(latitud central)` corrige el achatamiento
 * de la longitud, igual que hace `proyectar()` en `lib/mapa.ts` para
 * Colombia. Las cuatro zonas de arriba están proyectadas con la misma
 * fórmula, así que el punto cae donde debería caer, no donde se veía bien.
 */
function MapaVenezuelaMini({
  activa,
  onElegir,
}: {
  activa: string | null;
  onElegir: (id: string) => void;
}) {
  return (
    <svg viewBox="0 0 320 280" className="mapa-svg ls-mapa-svg" role="img" aria-label="Mapa de Venezuela con las cuatro zonas más golpeadas">
      <path
        className="ls-ven-blob"
        d="M55.1,20.5 L54.5,25.7 L41.7,28.3 L48.8,38.2 L48.5,49.7 L38.9,62.5 L47.2,79.9 L56.6,78.5 L61.5,62.6 L54.7,54.9 L53.6,38.2 L80.8,29.3 L77.8,18.9 L85.5,12.0 L93.3,27.5 L108.6,27.8 L122.8,40.1 L123.7,47.4 L143.3,47.5 L166.6,45.3 L179.1,55.1 L195.9,57.8 L208.1,51.0 L208.4,45.4 L235.4,44.1 L261.6,43.8 L243.1,50.3 L250.5,60.7 L268.0,62.3 L284.6,73.2 L288.1,90.8 L299.4,90.3 L308.0,95.5 L290.7,108.4 L288.8,116.4 L296.3,124.5 L290.8,128.7 L277.4,132.2 L277.8,142.4 L271.9,148.4 L286.7,165.1 L289.6,171.3 L281.6,179.7 L257.2,187.9 L241.4,191.3 L235.1,196.5 L217.8,191.0 L201.6,188.2 L197.5,190.2 L207.3,195.9 L206.4,210.7 L209.4,224.5 L227.9,226.4 L229.1,231.0 L213.5,237.3 L211.0,246.6 L202.0,250.2 L185.7,255.4 L181.5,262.1 L164.5,263.5 L152.5,251.9 L145.8,230.0 L140.0,222.3 L132.1,217.4 L143.1,206.5 L142.4,201.5 L136.2,195.0 L131.8,180.4 L133.5,164.6 L138.4,157.2 L142.3,145.4 L134.6,141.6 L122.1,144.1 L106.4,143.0 L97.6,145.3 L82.2,126.4 L69.5,123.6 L41.4,125.7 L36.2,118.0 L30.8,116.2 L30.0,111.6 L32.6,103.5 L30.9,94.6 L26.1,89.8 L23.3,79.7 L12.0,78.2 L18.1,65.3 L20.7,49.6 L27.1,41.5 L35.5,35.2 L41.1,24.2 L55.1,20.5 Z"
      />
      {REGIONES_VENEZUELA.map((r, i) => (
        <g
          key={r.id}
          className={`ls-ven-pin ${activa === r.id ? "ls-ven-pin-activo" : ""}`}
          tabIndex={0}
          role="button"
          aria-label={`${r.nombre}: ${r.dato}`}
          onClick={() => onElegir(r.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onElegir(r.id);
            }
          }}
        >
          <circle cx={r.x} cy={r.y} r={activa === r.id ? 8 : 6.5} />
          <text x={r.x} y={r.y + 3.5}>{i + 1}</text>
        </g>
      ))}
    </svg>
  );
}

type Pestana = "desaparecidos" | "donaciones" | "ayuda";

/** Mismo orden y mismas palabras que "Quiero ayudar" en el menú real de WhatsApp. */
const CATEGORIAS_DONACION: { id: CategoriaDonacion; nombre: string }[] = [
  { id: "suministros", nombre: "Llevar cosas" },
  { id: "economicas", nombre: "Donar dinero" },
  { id: "sangre", nombre: "Donar sangre" },
];

/** Panel de Colombia: las tres pestañas del mockup, cada una lista + mapa — todas siguiendo a la ciudad que se toque en el mapa. */
function PanelColombia() {
  const [tab, setTab] = useState<Pestana>("desaparecidos");
  const [categoria, setCategoria] = useState<CategoriaDonacion>("suministros");
  const [ciudad, setCiudad] = useState<CiudadClave>("bogota");
  const reducido = useReducedMotion();

  const infoCiudad = CIUDADES.find((c) => c.clave === ciudad)!;
  const personas = PERSONAS_EJEMPLO[ciudad];
  const centrosVisibles = CENTROS_EJEMPLO[ciudad].filter((c) => c.categoria === categoria);
  const lugares = LUGARES_EJEMPLO[ciudad];

  const elegirDpto = (dpto: string) => {
    const c = ciudadPorDpto(dpto);
    if (c) setCiudad(c.clave);
  };

  return (
    <div className="ls-panel">
      <div className="ls-tabs" role="tablist" aria-label="Vitrina">
        <button type="button" role="tab" aria-selected={tab === "desaparecidos"} className={`ls-tab ${tab === "desaparecidos" ? "ls-tab-activo" : ""}`} onClick={() => setTab("desaparecidos")}>
          Desaparecidos
        </button>
        <button type="button" role="tab" aria-selected={tab === "donaciones"} className={`ls-tab ${tab === "donaciones" ? "ls-tab-activo" : ""}`} onClick={() => setTab("donaciones")}>
          Donaciones
        </button>
        <button type="button" role="tab" aria-selected={tab === "ayuda"} className={`ls-tab ${tab === "ayuda" ? "ls-tab-activo" : ""}`} onClick={() => setTab("ayuda")}>
          Ayuda
        </button>
      </div>

      {tab === "donaciones" && (
        <div className="ls-subtabs" role="tablist" aria-label="Tipo de donación">
          {CATEGORIAS_DONACION.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={categoria === c.id}
              className={`ls-subtab ${categoria === c.id ? "ls-subtab-activo" : ""}`}
              onClick={() => setCategoria(c.id)}
            >
              {c.nombre}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={ciudad + tab + (tab === "donaciones" ? categoria : "")}
          initial={{ opacity: 0, y: reducido ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reducido ? 0 : -4 }}
          transition={MUELLE_CORTO}
          className="ls-cols"
        >
          <div className="ls-col-lista">
            {tab === "desaparecidos" && (
              <>
                <p className="ls-lista-titulo">🔍 Personas desaparecidas {infoCiudad.nombre}</p>
                <ul className="ls-lista">
                  {personas.map((p) => (
                    <li key={p.id} className="ls-tarjeta">
                      <div className="ls-avatar"><IconoSilueta /></div>
                      <div className="ls-tarjeta-info">
                        <p className="ls-tarjeta-nombre">{p.nombre}</p>
                        <p className="ls-tarjeta-meta">{p.direccion}</p>
                        <p className="ls-tarjeta-desc">{p.descripcion}</p>
                      </div>
                      <button
                        type="button"
                        className="ls-encontrado"
                        disabled
                        aria-label={`Reportar a ${p.nombre} como encontrado/a`}
                        title={`Folio ${p.folio}. En el producto real esto abre WhatsApp con "ENCONTRADO ${p.folio}" — el bot valida que sea el mismo número que reportó, antes de cerrar el caso (Circuito PD, docs/CIRCUITOS.md). Acá está apagado a propósito.`}
                      >
                        <svg viewBox="0 0 20 20" aria-hidden="true">
                          <path d="M4 10.2l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="ls-disclaimer">
                  Personas y direcciones de ejemplo, no reales. El check
                  reporta a alguien como encontrado/a — abriría WhatsApp con
                  "ENCONTRADO + folio" en el diseño real, así que acá está
                  apagado a propósito.
                </p>
              </>
            )}

            {tab === "donaciones" && (
              <>
                <p className="ls-lista-titulo">🏪 Centros de donaciones {infoCiudad.nombre}</p>
                <ul className="ls-lista">
                  {centrosVisibles.map((c) => (
                    <li key={c.id} className="ls-tarjeta">
                      <div className="ls-avatar ls-avatar-lugar" aria-hidden="true">📍</div>
                      <div className="ls-tarjeta-info">
                        <p className="ls-tarjeta-nombre">{c.nombre}</p>
                        <p className="ls-tarjeta-meta">{c.direccion}</p>
                        <p className="ls-tarjeta-desc">{c.detalle}</p>
                      </div>
                      <span className="ls-tarjeta-barra" aria-hidden="true" />
                    </li>
                  ))}
                </ul>
                <p className="ls-disclaimer">Centros y direcciones de ejemplo, no verificados.</p>
              </>
            )}

            {tab === "ayuda" && (
              <>
                <p className="ls-lista-titulo">🏚️ Reportar daños {infoCiudad.nombre}</p>
                <ul className="ls-lista">
                  {lugares.map((l) => (
                    <li key={l.id} className="ls-tarjeta">
                      <div className="ls-avatar ls-avatar-lugar" aria-hidden="true">🛠️</div>
                      <div className="ls-tarjeta-info">
                        <p className="ls-tarjeta-nombre">{l.nombre}</p>
                        <p className="ls-tarjeta-meta">{l.direccion}</p>
                        <p className="ls-tarjeta-desc">{l.detalle}</p>
                      </div>
                      <span className="ls-tarjeta-barra" aria-hidden="true" />
                    </li>
                  ))}
                </ul>
                <p className="ls-disclaimer">Reportes de ejemplo, no verificados.</p>
              </>
            )}
          </div>

          <ColumnaMapa
            activa={infoCiudad.dpto}
            onSeleccionar={elegirDpto}
            etiqueta={`Mapa de Colombia, ${infoCiudad.nombre} resaltada. Pasá el cursor para ver el nombre de cada zona tocable, tocá una para cambiar de ciudad.`}
            pie={`${infoCiudad.nombre} · geometría real, ciudad de ejemplo`}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Pantalla: países con actividad y, para Colombia, las tres pestañas de Línea Sismo. */
function Selector() {
  const [pais, setPais] = useState<"COL" | "VEN">("COL");
  const [regionActiva, setRegionActiva] = useState<string | null>(null);

  return (
    <div className="ls-selector">
      <div>
        <p className="etiqueta">Actividad sísmica reciente</p>
        <div className="ls-paises" role="group" aria-label="Elegir país">
          <button
            type="button"
            className={`ls-pais ${pais === "COL" ? "ls-pais-activo" : ""}`}
            onClick={() => setPais("COL")}
          >
            Colombia
          </button>
          <button
            type="button"
            className={`ls-pais ${pais === "VEN" ? "ls-pais-activo" : ""}`}
            onClick={() => setPais("VEN")}
          >
            Venezuela
          </button>
          <button type="button" className="ls-pais" disabled title="Sin datos cargados todavía">
            Panamá
          </button>
        </div>
      </div>

      {pais === "COL" ? (
        <PanelColombia />
      ) : (
        <div className="ls-panel">
          <div className="ls-evento-cab">
            <p className="etiqueta">Evento real · {EVENTO_VENEZUELA.cuando}</p>
          </div>

          <div className="ls-evento-cifras">
            <div className="ls-evento-cifra ls-evento-cifra-alta">
              <b className="dato">{EVENTO_VENEZUELA.muertos}</b>
              <span>muertos · {EVENTO_VENEZUELA.muertosNota}</span>
            </div>
            <div className="ls-evento-cifra">
              <b className="dato">{EVENTO_VENEZUELA.desaparecidos}</b>
              <span>desaparecidos · {EVENTO_VENEZUELA.desaparecidosNota}</span>
            </div>
          </div>

          {/* Misma interfaz que Colombia a propósito — lista a la izquierda,
              mapa a la derecha — para que se sienta el mismo producto. Lo
              que cambia es el contenido: zonas citadas, no personas
              inventadas. Ver la nota de honestidad más abajo. */}
          <div className="ls-cols">
            <div className="ls-col-lista">
              <p className="ls-lista-titulo">📍 Zonas más golpeadas</p>
              <ul className="ls-lista">
                {REGIONES_VENEZUELA.map((r, i) => (
                  <li
                    key={r.id}
                    className={`ls-tarjeta ${regionActiva === r.id ? "ls-tarjeta-activa" : ""}`}
                    onMouseEnter={() => setRegionActiva(r.id)}
                  >
                    <span className="ls-ven-region-n">{i + 1}</span>
                    <div className="ls-tarjeta-info">
                      <p className="ls-tarjeta-nombre">{r.nombre}</p>
                      <p className="ls-tarjeta-desc">{r.dato}</p>
                    </div>
                    <span className="ls-tarjeta-barra ls-tarjeta-barra-alta" aria-hidden="true" />
                  </li>
                ))}
              </ul>
              <p className="ls-evento-fuente">
                Fuente:{" "}
                <a href={EVENTO_VENEZUELA.fuenteUrl} target="_blank" rel="noreferrer">
                  {EVENTO_VENEZUELA.fuenteTexto}
                </a>
              </p>
            </div>

            <div className="ls-col-mapa">
              <MapaVenezuelaMini activa={regionActiva} onElegir={setRegionActiva} />
              <p className="ls-mapa-cabo">Contorno real · glynnbird/countriesgeojson</p>
            </div>
          </div>

          <p className="ls-evento-nota">
            Las pestañas de Colombia son un boceto. Acá no hay pestañas ni
            cards de personas — el registro ciudadano real de esta tragedia
            sigue abierto para las familias que buscan a alguien ahora mismo,
            y no es contenido de ejemplo para una demo.
          </p>
        </div>
      )}
    </div>
  );
}

export function LineaSismo() {
  return (
    <section className="seccion seccion-linea-sismo" id="linea-sismo">
      <div className="contenido">
        <Reveal className="encabezado">
          <div className="fila">
            <p className="etiqueta">Línea Sismo</p>
            <span className="hito-estado hito-wip">Demo</span>
          </div>
          <h2 className="h2">Ayuda en caso de sismo.</h2>
          <p className="lead">
            Reportar a alguien no localizado, un daño, o una donación — y verlo
            en un mapa público.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="ls-marco">
            <Selector />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
