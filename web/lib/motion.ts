/**
 * Los muelles de la página, en un solo sitio.
 *
 * Apple cambió el triplete de física (masa, rigidez, amortiguación) por dos
 * parámetros que un diseñador puede razonar: cuánto rebota y qué tan rápido
 * llega. La API de Motion mapea casi uno a uno con `bounce` y `duration`.
 *
 * La regla de reparto: por defecto **nada rebota**. El rebote se reserva para
 * lo que venía con momento físico —algo que soltaste, algo que aterriza—
 * porque un menú que simplemente apareció y hace overshoot se siente falso.
 */

/** Por defecto. Críticamente amortiguado: llega y se queda. */
export const MUELLE = { type: "spring", bounce: 0, duration: 0.4 } as const;

/** Más corto, para controles que responden bajo el dedo. */
export const MUELLE_CORTO = { type: "spring", bounce: 0, duration: 0.3 } as const;

/** Con momento: soltar un arrastre, un mensaje que aterriza. */
export const MUELLE_FISICO = { type: "spring", bounce: 0.2, duration: 0.4 } as const;

/**
 * Proyección de momento, tal cual la publica Apple en el código de
 * *Designing Fluid Interfaces*.
 *
 * No es la fórmula de libro de texto `v²/(2a)`: es decaimiento exponencial, y
 * es lo que hace que un flick se sienta como lanzar algo en vez de arrastrarlo
 * hasta el borde. Se proyecta dónde **iba a parar** el gesto y se elige el
 * destino más cercano a ese punto, no al punto donde se soltó.
 */
export function proyectar(velocidad: number, deceleracion = 0.998) {
  return ((velocidad / 1000) * deceleracion) / (1 - deceleracion);
}

/**
 * Resistencia progresiva en los bordes.
 *
 * Un tope duro se lee como "esto se congeló". La goma dice "responde, pero
 * aquí ya no hay más", que es lo que pasa con los objetos reales: frenan
 * antes de parar.
 */
export function goma(exceso: number, dimension: number, constante = 0.55) {
  return (exceso * dimension * constante) / (dimension + constante * Math.abs(exceso));
}
