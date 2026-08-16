"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

/**
 * Un glifo animado por capacidad.
 *
 * No son iconos decorativos: cada uno representa el mecanismo de su tarjeta y
 * lo hace moviéndose. Cinco puntos que se juntan en uno explican «réplicas
 * agrupadas» más rápido que la frase; doce líneas que convergen explican qué
 * significa reunir doce plataformas.
 *
 * Se animan una sola vez al entrar en pantalla. Un bucle continuo en cuatro
 * tarjetas a la vez compite con el texto y es justo lo que la guía de
 * accesibilidad pide evitar.
 */

function useGlifo() {
  const ref = useRef<SVGSVGElement>(null);
  const enPantalla = useInView(ref, { once: true, amount: 0.6 });
  const reducido = useReducedMotion();
  return { ref, activo: enPantalla, reducido };
}

const TRAZO = { stroke: "var(--signal)", strokeWidth: 2, strokeLinecap: "round" } as const;

/**
 * Cinco réplicas que se apilan en un solo aviso.
 *
 * Cinco barras sueltas de distinta altura se juntan en el centro y quedan como
 * una sola, más alta. Es la agrupación dibujada: entra lo mismo, sale una vez.
 */
export function GlifoReplicas() {
  const { ref, activo, reducido } = useGlifo();
  const barras = [
    { x: 4, h: 14 },
    { x: 16, h: 22 },
    { x: 28, h: 10 },
    { x: 40, h: 18 },
    { x: 52, h: 12 },
  ];

  return (
    <svg ref={ref} className="glifo" viewBox="0 0 64 40" fill="none" aria-hidden="true">
      {barras.map((b, i) => (
        <motion.rect
          key={i}
          width="6"
          rx="3"
          fill="var(--signal)"
          initial={{ x: b.x, height: b.h, y: 20 - b.h / 2, opacity: 0.85 }}
          animate={
            activo
              ? { x: 29, height: i === 2 ? 30 : b.h, y: i === 2 ? 5 : 20 - b.h / 2, opacity: i === 2 ? 1 : 0 }
              : {}
          }
          transition={{
            duration: reducido ? 0 : 0.85,
            delay: reducido ? 0 : 0.3 + Math.abs(2 - i) * 0.06,
            ease: [0.16, 1, 0.3, 1],
          }}
        />
      ))}
    </svg>
  );
}

/** Muchas fuentes dispersas convergiendo en un punto. */
export function GlifoConverge() {
  const { ref, activo, reducido } = useGlifo();
  const y = [4, 12, 20, 28, 36];

  return (
    <svg ref={ref} className="glifo" viewBox="0 0 64 40" fill="none" aria-hidden="true">
      {y.map((yy, i) => (
        <motion.path
          key={i}
          d={`M4 ${yy} C 26 ${yy}, 30 20, 52 20`}
          {...TRAZO}
          strokeWidth={1.5}
          opacity={0.55}
          initial={{ pathLength: 0 }}
          animate={activo ? { pathLength: 1 } : {}}
          transition={{
            duration: reducido ? 0 : 0.85,
            delay: reducido ? 0 : 0.2 + i * 0.07,
            ease: [0.16, 1, 0.3, 1],
          }}
        />
      ))}
      <motion.circle
        cx="55" cy="20" r="5"
        fill="var(--signal)"
        initial={{ scale: 0 }}
        animate={activo ? { scale: 1 } : {}}
        transition={{ type: "spring", bounce: 0.35, duration: 0.6, delay: reducido ? 0 : 0.9 }}
        style={{ transformOrigin: "55px 20px" }}
      />
    </svg>
  );
}

/** La burbuja de siempre, con su visto. */
export function GlifoChat() {
  const { ref, activo, reducido } = useGlifo();

  return (
    <svg ref={ref} className="glifo" viewBox="0 0 64 40" fill="none" aria-hidden="true">
      <motion.path
        d="M10 8 h36 a6 6 0 0 1 6 6 v12 a6 6 0 0 1 -6 6 h-22 l-9 7 v-7 h-5 a6 6 0 0 1 -6 -6 v-12 a6 6 0 0 1 6 -6 z"
        {...TRAZO}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={activo ? { pathLength: 1, opacity: 1 } : {}}
        transition={{ duration: reducido ? 0 : 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
      />
      <motion.path
        d="M21 20 l5 5 l10 -11"
        {...TRAZO}
        strokeWidth={2.5}
        initial={{ pathLength: 0 }}
        animate={activo ? { pathLength: 1 } : {}}
        transition={{ duration: reducido ? 0 : 0.45, delay: reducido ? 0 : 0.85, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
}

export const GLIFOS = [GlifoReplicas, GlifoConverge, GlifoChat];
