"use client";

import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * Un número que cuenta hasta su valor al entrar en pantalla.
 *
 * Una cifra estática es un dato; una que sube frente a uno se siente como algo
 * que alguien contó. Es la diferencia entre leer «145» y ver que son 145.
 *
 * La curva es `easeOut`, no lineal: arranca rápido y frena al final, que es
 * como se comporta cualquier cosa que se detiene de verdad. Un conteo lineal
 * se lee como un marcador de aeropuerto.
 */
export function Contador({ valor, duracion = 1.4 }: { valor: number; duracion?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const enPantalla = useInView(ref, { once: true, amount: 0.6 });
  const reducido = useReducedMotion();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!enPantalla) return;
    if (reducido) {
      setN(valor);
      return;
    }
    const control = animate(0, valor, {
      duration: duracion,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setN(Math.round(v)),
    });
    return () => control.stop();
  }, [enPantalla, reducido, valor, duracion]);

  // `tabular-nums` en el CSS evita que el ancho baile mientras cuenta.
  return (
    <span ref={ref} className="dato">
      {n.toLocaleString("es-CO")}
    </span>
  );
}
