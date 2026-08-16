"use client";

import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { ALTO_MAPA, ANCHO_MAPA, DEPARTAMENTOS, VIEWBOX, proyectar } from "@/lib/mapa";
import { PUNTOS, type Punto } from "@/lib/puntos";
import { SISMO } from "@/lib/sismo";
import { MUELLE, MUELLE_FISICO } from "@/lib/motion";

/** Salida fuerte: la incorporada de CSS es demasiado floja para esto. */
const SALIDA = [0.23, 1, 0.32, 1] as const;

/**
 * El mapa del hero: dónde golpeó y dónde se está ayudando, a la vez.
 *
 * Todo lo que se ve sale de datos reales. Los 50 puntos son los municipios
 * donde hay acopio en el volcado, y la intensidad de cada uno está calculada
 * con la misma fórmula que corre en el bot sobre sus coordenadas verdaderas.
 *
 * Dos codificaciones sobre el mismo punto, porque la sección cuenta dos cosas
 * a la vez: el **tamaño** es cuántos acopios hay ahí, y el **color** es cuánto
 * se sintió el sismo — una escala real de verde (leve) a rojo (fuerte), con
 * `--fuerza-pct` (ver `globals.css`). Un punto grande y rojo es una ciudad
 * golpeada que ya está recibiendo ayuda; uno pequeño y gris, una que ayuda sin
 * haberlo sentido.
 */

const [EPI_X, EPI_Y] = proyectar(SISMO.lat, SISMO.lon);

/** Radio según cuántos acopios: raíz cuadrada para que el área sea proporcional. */
function radio(p: Punto) {
  return 3.6 + Math.sqrt(p.acopios) * 2.6;
}

/**
 * `fuerza` es real, pero nunca se acerca a 1: el municipio con acopio más
 * cercano al epicentro está a 124 km, así que el máximo del set es ~0,59.
 * Mapear esa franja completa contra rojo↔verde requiere estirarla al 0–100%
 * real de los puntos que sí existen — si no, hasta el más fuerte se queda a
 * mitad de camino y todo el mapa sale amarillo-oliva.
 */
const FUERZA_MIN = Math.min(...PUNTOS.map((p) => p.fuerza));
const FUERZA_MAX = Math.max(...PUNTOS.map((p) => p.fuerza));

function porcentajeIntensidad(p: Punto) {
  return ((p.fuerza - FUERZA_MIN) / (FUERZA_MAX - FUERZA_MIN)) * 100;
}

export function MapaColombia({ momentoDelSismo = 0 }: { momentoDelSismo?: number } = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const enPantalla = useInView(ref, { once: true, amount: 0.25 });
  const reducido = useReducedMotion();
  const [activo, setActivo] = useState<Punto | null>(null);

  // Los puntos entran de dentro hacia fuera, ordenados por distancia al
  // epicentro: la onda del sismo recorriendo el país. Es la única animación de
  // la página donde el orden lo dictan los datos y no el maquetado.
  // La onda: cada municipio se enciende según su distancia real al epicentro.
  // El último llega sobre 1,35 s, para que todo esté quieto cuando entra la
  // línea del silencio en el titular. El hueco es deliberado, no sobra tiempo.
  const maxKm = Math.max(...PUNTOS.map((p) => p.km));
  const retraso = (p: Punto) =>
    reducido ? 0 : momentoDelSismo + 0.2 + (p.km / maxKm) * 0.78;

  const mostrado = activo ?? null;

  return (
    <div className="mapa" ref={ref}>
      <svg
        viewBox={VIEWBOX}
        className="mapa-svg"
        role="img"
        aria-label={`Mapa de Colombia con ${PUNTOS.length} municipios donde hay puntos de acopio`}
      >
        {/* Departamentos: estructura, no protagonismo. */}
        <g className="mapa-departamentos">
          {DEPARTAMENTOS.map((d, i) => (
            <motion.path
              key={d.dpto + i}
              d={d.d}
              initial={{ opacity: 0 }}
              animate={enPantalla ? { opacity: 1 } : {}}
              transition={{ duration: reducido ? 0 : 0.5, delay: reducido ? 0 : 0.1 + i * 0.01 }}
            />
          ))}
        </g>

        {/* El contorno del país se traza encima, en naranja. */}
        <g className="mapa-contorno">
          {DEPARTAMENTOS.map((d, i) => (
            <motion.path
              key={d.dpto + i}
              d={d.d}
              initial={{ pathLength: reducido ? 1 : 0 }}
              animate={enPantalla ? { pathLength: 1 } : {}}
              transition={{ duration: reducido ? 0 : 1.5, ease: SALIDA, delay: reducido ? 0 : 0.15 }}
            />
          ))}
        </g>

        {/* Epicentro: de acá sale todo, así que se dibuja antes que los puntos. */}
        <g className="mapa-epicentro">
          {[0, 0.18].map((desfase) => (
            <motion.circle
              key={desfase}
              cx={EPI_X}
              cy={EPI_Y}
              r="30"
              initial={{ transform: "scale(0.18)", opacity: 0 }}
              animate={
                enPantalla
                  ? { transform: "scale(1)", opacity: [0, 0.5, 0] }
                  : {}
              }
              transition={{
                duration: reducido ? 0 : 1.5,
                delay: reducido ? 0 : momentoDelSismo + desfase,
                ease: "easeOut",
              }}
              style={{ transformOrigin: `${EPI_X}px ${EPI_Y}px` }}
            />
          ))}
          <motion.g
            initial={{ transform: "scale(0.4)", opacity: 0 }}
            animate={enPantalla ? { transform: "scale(1)", opacity: 1 } : {}}
            transition={{ ...MUELLE_FISICO, delay: reducido ? 0 : momentoDelSismo }}
            style={{ transformOrigin: `${EPI_X}px ${EPI_Y}px` }}
          >
            <line x1={EPI_X - 7} y1={EPI_Y} x2={EPI_X + 7} y2={EPI_Y} />
            <line x1={EPI_X} y1={EPI_Y - 7} x2={EPI_X} y2={EPI_Y + 7} />
          </motion.g>
        </g>

        {/* Los municipios con acopio. */}
        <g>
          {PUNTOS.map((p) => {
            const [x, y] = proyectar(p.lat, p.lon);
            const activoEste = mostrado?.nombre === p.nombre;
            return (
              <motion.g
                key={p.nombre}
                className={`mapa-punto ${p.alertar ? "" : "mapa-punto-mudo"} ${activoEste ? "mapa-punto-activo" : ""}`}
                initial={{ transform: "scale(0.4)", opacity: 0 }}
                animate={enPantalla ? { transform: "scale(1)", opacity: 1 } : {}}
                transition={{ ...MUELLE_FISICO, delay: retraso(p) }}
                style={{ transformOrigin: `${x}px ${y}px` }}
              >
                {/* Área de toque cómoda: el círculo visible es pequeño y
                    apuntarle con el dedo o el ratón sería una pelea. */}
                <circle className="mapa-golpe" cx={x} cy={y} r={Math.max(radio(p) + 8, 14)} />
                <circle className="mapa-halo" cx={x} cy={y} r={radio(p) + 5} />
                <circle
                  className="mapa-nucleo"
                  cx={x}
                  cy={y}
                  r={radio(p)}
                  style={{ "--fuerza-pct": porcentajeIntensidad(p) } as React.CSSProperties}
                />
              </motion.g>
            );
          })}
        </g>
      </svg>

      {/* Botones invisibles superpuestos. Llevan TODA la interacción —ratón,
          dedo y teclado— porque están por encima del SVG: si los grupos de
          abajo escucharan el puntero, no les llegaría nunca. */}
      <div className="mapa-focos">
        {/* Ordenados de menos a más acopios para que el mayor quede encima en
            el DOM. Medellín y Rionegro están a 30 km: sus áreas se solapan, y
            sin este orden el punto de un acopio le robaba el hover al de 24. */}
        {[...PUNTOS].sort((a, b) => a.acopios - b.acopios).map((p) => {
          const [x, y] = proyectar(p.lat, p.lon);
          // El área de toque sigue al tamaño del punto: apuntar a un punto
          // grande no debería ser tan difícil como apuntar a uno pequeño.
          const lado = `${Math.max(radio(p) * 1.9, 22) / 10}rem`;
          return (
            <button
              key={p.nombre}
              className="mapa-foco"
              style={{
                left: `${(x / ANCHO_MAPA) * 100}%`,
                top: `${(y / ALTO_MAPA) * 100}%`,
                width: lado,
                height: lado,
              }}
              onPointerEnter={() => setActivo(p)}
              // Solo el ratón limpia al salir. En táctil, `pointerleave` se
              // dispara al levantar el dedo, así que borraba la selección justo
              // después de hacerla: se tocaba un punto y el panel se vaciaba.
              onPointerLeave={(e) => {
                if (e.pointerType !== "mouse") return;
                setActivo((a) => (a?.nombre === p.nombre ? null : a));
              }}
              onFocus={() => setActivo(p)}
              onBlur={() => setActivo((a) => (a?.nombre === p.nombre ? null : a))}
              onPointerDown={() => setActivo(p)}
              aria-label={`${p.nombre}: ${p.acopios} acopio${p.acopios > 1 ? "s" : ""}, se sintió ${p.etiqueta}`}
            />
          );
        })}
      </div>

      {/* En escritorio flota junto al punto; en móvil se apaga por CSS y la
          información va al panel fijo de abajo, que no tapa el mapa. */}
      <AnimatePresence>
        {mostrado && (
          <motion.div
            className="globo"
            key={mostrado.nombre}
            initial={{ opacity: 0, y: reducido ? 0 : 6, scale: reducido ? 1 : 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={reducido ? { duration: 0.14 } : MUELLE}
            style={posicionGlobo(mostrado)}
          >
            <Ficha p={mostrado} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mapa-panel">
        {mostrado ? (
          <Ficha p={mostrado} />
        ) : (
          <p className="mapa-pista">
            Toca un punto para ver qué pasó ahí y dónde se está ayudando.
          </p>
        )}
      </div>

      <div className="mapa-leyenda">
        <span><i className="leyenda-punto leyenda-punto-alta" /> Se sintió fuerte</span>
        <span><i className="leyenda-punto leyenda-punto-baja" /> Se sintió leve</span>
        <span><i className="leyenda-punto leyenda-punto-mudo" /> No se sintió</span>
        <span><i className="leyenda-cruz" /> Epicentro</span>
        <span className="leyenda-nota">El tamaño es cuántos acopios hay</span>
      </div>
    </div>
  );
}

/** El globo se voltea antes de salirse por los bordes del mapa. */
function posicionGlobo(p: Punto): React.CSSProperties {
  const [x, y] = proyectar(p.lat, p.lon);
  const px = (x / ANCHO_MAPA) * 100;
  const py = (y / ALTO_MAPA) * 100;
  const derecha = px > 55;
  const abajo = py < 40;

  return {
    left: `${px}%`,
    top: `${py}%`,
    transform: `translate(${derecha ? "calc(-100% - 14px)" : "14px"}, ${abajo ? "0" : "-100%"})`,
  };
}

function Ficha({ p }: { p: Punto }) {
  return (
    <div className="ficha">
      <div className="ficha-cabeza">
        <p className="ficha-ciudad">{p.nombre}</p>
        <p className="ficha-depto">{p.departamento}</p>
      </div>

      <div className={`ficha-estado ${p.alertar ? "" : "ficha-estado-mudo"}`}>
        {p.alertar ? (
          <>
            Se sintió <strong>{p.etiqueta}</strong> · a <span className="dato">{p.km} km</span> del epicentro
          </>
        ) : (
          <>
            No se sintió · a <span className="dato">{p.km} km</span> del epicentro
          </>
        )}
      </div>

      <div className="ficha-ayuda">
        <p className="ficha-titulo">
          {p.acopios} punto{p.acopios > 1 ? "s" : ""} de acopio
        </p>
        <p className="ficha-acopio">{p.punto.nombre}</p>
        <p className="ficha-dir">{p.punto.direccion}</p>
        {p.punto.urgente.length > 0 && (
          <p className="ficha-urgente">Más urgente: {p.punto.urgente.join(", ")}</p>
        )}
      </div>
    </div>
  );
}
