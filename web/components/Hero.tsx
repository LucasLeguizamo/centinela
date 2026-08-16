"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { TOTAL_DESAPARECIDOS_TEXTO, TOTAL_LOCALIZADOS_TEXTO, WHATSAPP } from "@/lib/datos";
import { TOTAL_ACOPIOS, TOTAL_MUNICIPIOS } from "@/lib/puntos";
import { MUELLE } from "@/lib/motion";
import { MapaColombia } from "./MapaColombia";

/**
 * La apertura cuenta la historia que cuenta el hero, no una entrada bonita.
 *
 * El hero dice tres cosas: un instante exacto (7:34 del 10 de agosto), un
 * sismo en el Chocó, y una injusticia — unos teléfonos sonaron y otros no. La
 * secuencia está montada sobre eso:
 *
 *   1. Aparece la fecha. Estamos situando un momento.
 *   2. **Tiembla.** El epicentro dispara sus anillos antes que el titular, para
 *      que el texto se lea como consecuencia del sismo y no como un rótulo.
 *   3. «Los Android sonaron.» entra mientras la onda cruza el país y los
 *      municipios se van encendiendo. Llega acompañada.
 *   4. **Una pausa sostenida.** La onda termina y no pasa nada más.
 *   5. «Los iPhone no.» entra sola, más lenta, sin nada moviéndose alrededor.
 *
 * Esa asimetría entre cómo llegan las dos líneas ES el mensaje. La primera
 * llega con la onda; la segunda llega en silencio, y el silencio se oye porque
 * antes hubo movimiento. Si las dos entraran igual, la frase seguiría estando
 * pero nadie la sentiría.
 */

/** El compás, en segundos. Un solo sitio para ajustar el ritmo entero. */
const T = {
  fecha: 0.12,
  /** El sismo. Todo lo demás cuelga de acá. */
  sismo: 0.35,
  /** Llega con la onda cruzando; aterriza sobre 1,47 s. */
  sonaron: 0.62,
  /**
   * Arranca 0,58 s después de que la primera línea se asentó y la onda paró.
   * Ese hueco es la única parte de la animación que no se ve: se oye.
   */
  silencio: 2.05,
  lead: 2.6,
  acciones: 2.72,
  nota: 2.82,
  /** El dato del mapa llega último: es un anexo al titular, no parte de él. */
  dato: 3.05,
};

const SALIDA = [0.23, 1, 0.32, 1] as const;

/**
 * Una línea del titular subiendo desde detrás de su máscara.
 *
 * `tono` cambia cómo llega: la que viene con la onda entra con decisión; la
 * del silencio tarda más y se asienta más suave, como algo que no tuvo quien
 * lo anunciara.
 */
function Linea({
  children,
  retraso,
  tono = "onda",
}: {
  children: ReactNode;
  retraso: number;
  tono?: "onda" | "silencio";
}) {
  const reducido = useReducedMotion();
  const duracion = tono === "silencio" ? 1.15 : 0.85;

  if (reducido) {
    return (
      <motion.span
        className="linea-titular"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: retraso }}
      >
        {children}
      </motion.span>
    );
  }

  return (
    <span className="mascara-linea">
      <motion.span
        className="linea-titular"
        // Cadena de transform completa y no el atajo `y`: el atajo no se
        // acelera por hardware y suelta fotogramas justo al cargar, que es
        // cuando el navegador está más ocupado.
        initial={{ transform: "translateY(108%)" }}
        animate={{ transform: "translateY(0%)" }}
        transition={{ duration: duracion, ease: SALIDA, delay: retraso }}
      >
        {children}
      </motion.span>
    </span>
  );
}

export function Hero() {
  const reducido = useReducedMotion();

  const entra = (retraso: number) => ({
    initial: { opacity: 0, transform: reducido ? "none" : "translateY(18px)" },
    animate: { opacity: 1, transform: "translateY(0px)" },
    transition: { ...MUELLE, delay: retraso },
  });

  return (
    <header className="hero">
      <div className="hero-rejilla">
        <div className="hero-texto">
          <motion.p className="etiqueta" {...entra(T.fecha)}>
            10 de agosto de 2026 · 7:34 a. m. · Chocó
          </motion.p>

          <h1 className="display hero-titulo">
            <Linea retraso={T.sonaron}>Los Android sonaron.</Linea>
            <Linea retraso={T.silencio} tono="silencio">
              Los iPhone no.
            </Linea>
          </h1>

          <motion.p className="lead" {...entra(T.lead)}>
            No fue una falla. Apple solo opera alertas sísmicas en Estados Unidos
            y Taiwán. Si tienes un iPhone en Colombia, no tienes nada.
          </motion.p>

          <motion.div className="fila hero-acciones" {...entra(T.acciones)}>
            <a className="boton boton-primario" href={WHATSAPP} target="_blank" rel="noreferrer">
              Probarlo en WhatsApp
            </a>
            {/* Entrada directa a Línea Sismo — es la sección que sigue al
                hero, no un enlace a un anexo al final de la página. */}
            <a className="boton boton-secundario" href="#linea-sismo">
              Ayuda en caso de sismo
            </a>
            <a className="boton boton-fantasma" href="#problema">
              Ver cómo funciona
            </a>
          </motion.div>

          <motion.p className="hero-nota" {...entra(T.nota)}>
            Centinela avisa por WhatsApp qué tan fuerte se sintió el sismo{" "}
            <strong>en tu municipio</strong>, te ayuda a{" "}
            <strong>buscar a alguien no localizado</strong>, y te conecta con{" "}
            <strong>{TOTAL_ACOPIOS} puntos de acopio</strong> en{" "}
            {TOTAL_MUNICIPIOS} municipios.
          </motion.p>
        </div>

        {/* El mapa está desde el principio; lo que ocurre dentro es el sismo. */}
        <motion.div
          className="hero-mapa"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reducido ? 0.25 : 0.6, ease: SALIDA, delay: 0.1 }}
        >
          {/* Mismo número que ya responde el chat de Ayuda — no uno nuevo.
              Lleva a Línea Sismo (la vitrina de búsqueda, con el mapa
              tocable), no al chat: es la entrada natural para "quiero ver
              cómo se busca a alguien". Va antes del mapa, no encima:
              superpuesta chocaba con la leyenda de abajo en pantallas donde
              el mapa no llena todo el alto disponible. */}
          <motion.a className="hero-dato" href="#linea-sismo" {...entra(T.dato)}>
            <span className="hero-dato-n dato">{TOTAL_DESAPARECIDOS_TEXTO}</span>
            <span className="hero-dato-txt">
              personas reportadas desaparecidas · {TOTAL_LOCALIZADOS_TEXTO} ya localizadas
            </span>
            <span className="hero-dato-cta">Buscar a alguien →</span>
          </motion.a>

          <MapaColombia momentoDelSismo={T.sismo} />
        </motion.div>
      </div>
    </header>
  );
}
