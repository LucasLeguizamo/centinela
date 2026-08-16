"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { MUELLE } from "@/lib/motion";

/**
 * Aparición al entrar en pantalla.
 *
 * Con movimiento reducido no desaparece el feedback: se queda el fundido de
 * opacidad, que ayuda a entender que algo llegó, y se quita el desplazamiento,
 * que es la parte vestibular y la que molesta.
 *
 * `once` evita que el bloque vuelva a animarse al subir. Repetirlo llama la
 * atención sobre la animación en vez de sobre el contenido.
 */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reducido = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reducido ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px -12% 0px" }}
      transition={{ ...MUELLE, delay }}
    >
      {children}
    </motion.div>
  );
}
