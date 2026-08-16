"use client";

import { motion, useReducedMotion } from "motion/react";
import { CIUDADES, SISMO } from "@/lib/sismo";
import { MUELLE } from "@/lib/motion";
import { Reveal } from "./Reveal";

/**
 * Problema y solución, en ese orden y sin rodeos.
 *
 * La versión anterior era un selector arrastrable con intensidades Mercalli:
 * preciso y bonito, pero había que estudiarlo para entenderlo. Ante un jurado
 * que dedica dos minutos, un dato que hay que descifrar no suma, resta.
 *
 * Así que la comparación se muestra ya resuelta: un mensaje genérico arriba,
 * tres mensajes distintos abajo, y la diferencia se ve sin leer nada.
 */

/** Las tres que mejor cuentan la historia, de más fuerte a nada. */
const MUESTRA = ["pereira", "quibdo", "barranquilla"]
  .map((c) => CIUDADES.find((x) => x.clave === c)!)
  .filter(Boolean);

export function Problema() {
  const reducido = useReducedMotion();

  return (
    <section className="seccion" id="problema">
      <div className="contenido">
        <Reveal className="encabezado">
          <p className="etiqueta">El problema</p>
          <h2 className="h2">
            Un sismo tiene una sola magnitud. Pero no se siente igual en tu casa
            que a 700 kilómetros.
          </h2>
          <p className="lead">
            El {SISMO.fecha} tembló en el Chocó. En Pereira se movieron los
            edificios. En Barranquilla nadie se enteró. Todos recibieron
            exactamente el mismo aviso — quien recibió alguno.
          </p>
        </Reveal>

        {/* El antes, como lo ve la gente: una notificación en la pantalla.
            Dibujarla como notificación y no como caja de texto es lo que hace
            que se reconozca al instante — todos hemos visto esa banda. */}
        <Reveal delay={0.06}>
          <div className="broadcast">
            <div className="notificacion">
              <div className="notificacion-cabeza">
                <span className="notificacion-icono" aria-hidden="true">!</span>
                <span className="notificacion-app">Alerta sísmica</span>
                <span className="notificacion-hora dato">ahora</span>
              </div>
              <p className="notificacion-titulo">
                Sismo de magnitud {SISMO.magnitud} · {SISMO.lugar}
              </p>
            </div>

            {/* Las mismas palabras cayendo sobre siete ciudades distintas. */}
            <div className="broadcast-destinos" aria-hidden="true">
              {["Pereira", "Quibdó", "Manizales", "Cali", "Medellín", "Bogotá", "Barranquilla"].map((n, i) => (
                <motion.span
                  key={n}
                  className="destino"
                  initial={{ opacity: 0, y: reducido ? 0 : -6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ ...MUELLE, delay: 0.1 + i * 0.05 }}
                >
                  {n}
                </motion.span>
              ))}
            </div>

            <p className="broadcast-nota">
              El mismo mensaje para los siete. No dice si tienes que salir de tu
              casa o seguir durmiendo.
            </p>
          </div>
        </Reveal>

        {/* El después: el mismo evento, traducido a cada ciudad. */}
        <Reveal delay={0.04} className="encabezado">
          <p className="etiqueta">La solución</p>
          <h2 className="h2">Centinela traduce ese número a tu ciudad.</h2>
          <p className="lead">
            El mismo sismo, calculado para donde estás tú. Esto es lo que
            recibió cada quien:
          </p>
        </Reveal>

        <div className="muestras">
          {MUESTRA.map((c, i) => (
            <motion.article
              key={c.clave}
              className={`muestra ${c.alertar ? "" : "muestra-silencio"}`}
              initial={{ opacity: 0, y: reducido ? 0 : 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-15%" }}
              transition={{ ...MUELLE, delay: 0.08 * i }}
            >
              <header className="muestra-cabeza">
                <p className="muestra-ciudad">{c.nombre}</p>
                <p className="muestra-dist dato">a {c.distancia} km</p>
              </header>

              <div className="medidor" aria-hidden="true">
                <motion.span
                  className={`medidor-relleno ${c.alertar ? "" : "medidor-mudo"}`}
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: c.fuerza }}
                  viewport={{ once: true }}
                  transition={{ duration: reducido ? 0 : 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 + 0.08 * i }}
                />
              </div>

              {c.alertar ? (
                <>
                  <p className="muestra-veredicto">
                    Se sintió <em>{c.etiqueta}</em>
                  </p>
                  <p className="muestra-mensaje">
                    «En {c.nombre} se sintió {c.etiqueta}.»
                  </p>
                  <p className="muestra-pie">Centinela escribe</p>
                </>
              ) : (
                <>
                  <p className="muestra-veredicto muestra-veredicto-mudo">
                    {c.etiqueta}
                  </p>
                  <p className="muestra-mensaje muestra-mensaje-mudo">Silencio.</p>
                  <p className="muestra-pie">
                    Centinela no escribe — allá no hacía falta
                  </p>
                </>
              )}
            </motion.article>
          ))}
        </div>

        <Reveal delay={0.08}>
          <p className="lead pregunta">
            Un solo evento, siete ciudades, <strong>siete mensajes distintos</strong>.
            Eso es lo que ninguna alerta te da hoy: no la magnitud del sismo,
            sino lo que pasó donde vives.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
