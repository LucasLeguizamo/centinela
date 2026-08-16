"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  CATALOGO_USGS,
  COLOMBIA,
  CONTEOS,
  CONTEOS_TEXTO,
  HAY_CONTRASTE,
  MAS_GRANDE,
  MAS_SIGNIFICATIVO,
  SEIS_MAS,
  VENTANA,
  type EventoMundial,
} from "@/lib/mundo";
import { MUELLE } from "@/lib/motion";
import { Contador } from "./Contador";
import { Reveal } from "./Reveal";

/**
 * El catálogo mundial del último mes, que existe por un solo motivo.
 *
 * Toda la página argumenta que la magnitud sola no dice nada. Esta sección
 * deja de argumentarlo y lo demuestra con el catálogo entero del planeta: el
 * sismo más grande del mes y el más grave **no son el mismo**, y no por poco.
 * Cualquiera puede abrir el USGS y comprobarlo, que es justo lo que queremos
 * que haga el jurado.
 *
 * La lista larga no está y no debería estar. Diez mil filas no son un
 * argumento, son un volcado; van los M6+ uno por uno, el pedazo de Colombia, y
 * un enlace al catálogo del USGS para el que quiera los diez mil.
 */

/** PAGER en palabras. Un chip que dice «yellow» no lo entiende nadie. */
const ALERTA: Record<string, string> = {
  green: "sin víctimas previstas",
  yellow: "impacto local",
  orange: "impacto regional",
  red: "impacto grave",
};

function Fila({ e, i }: { e: EventoMundial; i: number }) {
  const reducido = useReducedMotion();
  return (
    <motion.li
      className="sismo"
      initial={{ opacity: 0, y: reducido ? 0 : 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ ...MUELLE, delay: Math.min(i * 0.04, 0.4) }}
    >
      <span className="sismo-mag dato">M{e.magnitud.toFixed(1)}</span>
      <span className="sismo-lugar">{e.lugar}</span>
      <span className="sismo-cuando dato">
        {e.fechaCorta} · {e.profundidadKm} km
      </span>
      {e.alerta && e.alerta !== "green" ? (
        <span className={`sismo-alerta sismo-alerta-${e.alerta}`}>{ALERTA[e.alerta]}</span>
      ) : (
        <span className="sismo-alerta sismo-alerta-nada">{ALERTA.green}</span>
      )}
    </motion.li>
  );
}

/** Una de las dos mitades del contraste: el grande contra el grave. */
function Carta({ e, rotulo, tesis }: { e: EventoMundial; rotulo: string; tesis: string }) {
  return (
    <article className="contraste-carta">
      <p className="etiqueta">{rotulo}</p>
      <p className="contraste-mag">M{e.magnitud.toFixed(1)}</p>
      <p className="contraste-lugar">{e.lugar}</p>
      <p className="contraste-cuando dato">
        {e.fechaCorta} · {e.horaCorta} · {e.profundidadKm} km de profundidad
      </p>
      <dl className="contraste-datos">
        <div>
          <dt>Alerta del USGS</dt>
          <dd className={e.alerta === "red" ? "contraste-rojo" : undefined}>
            {e.alerta ? ALERTA[e.alerta] : "sin evaluar"}
          </dd>
        </div>
        <div>
          <dt>Gente que lo reportó</dt>
          <dd>{e.reportesTexto}</dd>
        </div>
        <div>
          <dt>Significancia</dt>
          <dd>{e.significanciaTexto}</dd>
        </div>
      </dl>
      <p className="contraste-tesis">{tesis}</p>
    </article>
  );
}

export function Mundo() {
  const enColombia = COLOMBIA.length;
  const replicas = COLOMBIA.filter((e) => e.lugar.includes("San José del Palmar")).length;

  return (
    <section className="seccion" id="mundo">
      <div className="contenido">
        <Reveal className="encabezado">
          <p className="etiqueta">El histórico · últimos {VENTANA.dias} días</p>
          <h2 className="h2">
            El planeta tembló {CONTEOS_TEXTO[0]} veces este mes. Nos importaron{" "}
            {enColombia}.
          </h2>
          <p className="lead">
            Catálogo mundial del USGS entre el {VENTANA.desdeCorta} y el{" "}
            {VENTANA.hastaCorta} de {VENTANA.anio}. Todos los eventos, de
            cualquier magnitud, en cualquier parte del mundo.
          </p>
        </Reveal>

        <div className="cifras cifras-mundo">
          {[
            { valor: CONTEOS[0], unidad: "sismos en total", nota: "cualquier magnitud, todo el planeta" },
            { valor: CONTEOS[2.5], unidad: "de M2.5 o más", nota: "el umbral desde el que el catálogo mundial está completo" },
            { valor: CONTEOS[6], unidad: "de M6 o más", nota: "la magnitud desde la que un sismo hace daño" },
            { valor: enColombia, unidad: "en Colombia", nota: `${replicas} de ellos en el mismo punto del Chocó` },
          ].map((c, i) => (
            <Reveal key={c.unidad} delay={0.05 * i}>
              <article className="cifra">
                <motion.span
                  className="cifra-regla"
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.05 * i }}
                />
                <p className="cifra-valor">
                  <Contador valor={c.valor} />
                </p>
                <p className="cifra-unidad">{c.unidad}</p>
                <p className="cifra-nota">{c.nota}</p>
              </article>
            </Reveal>
          ))}
        </div>

        {/* El corazón de la sección: dos eventos del mismo mes, el grande y el
            grave, que no son el mismo. No hay nada que argumentar acá — se
            ponen los dos al lado y se lee solo. */}
        {HAY_CONTRASTE && (
          <>
            <Reveal delay={0.04} className="encabezado">
              <p className="etiqueta">La prueba</p>
              <h2 className="h2">
                El sismo más grande del mes no fue el más grave.
              </h2>
              <p className="lead">
                Los dos pasaron en los últimos {VENTANA.dias} días. Uno midió más;
                el otro dejó al país durmiendo en la calle. Si la magnitud
                bastara, esta comparación no existiría.
              </p>
            </Reveal>

            <Reveal delay={0.06}>
              <div className="contraste">
                <Carta
                  e={MAS_GRANDE}
                  rotulo="El más grande"
                  tesis="Más energía, mar de por medio y poca gente encima. El número más alto del mes se sintió menos que el otro."
                />
                <div className="contraste-vs" aria-hidden="true">
                  <span>contra</span>
                </div>
                <Carta
                  e={MAS_SIGNIFICATIVO}
                  rotulo="El más grave"
                  tesis="Tres décimas menos de magnitud y el evento más significativo del planeta en todo el mes. Eso es lo que ninguna alerta por magnitud te habría dicho."
                />
              </div>
            </Reveal>
          </>
        )}

        <Reveal delay={0.04} className="encabezado">
          <p className="etiqueta">Los grandes</p>
          <h2 className="h2">Los {SEIS_MAS.length} sismos de M6 o más del período.</h2>
        </Reveal>

        <Reveal delay={0.06}>
          <ol className="sismos">
            {SEIS_MAS.map((e, i) => (
              <Fila key={e.id} e={e} i={i} />
            ))}
          </ol>
        </Reveal>

        <Reveal delay={0.04} className="encabezado">
          <p className="etiqueta">Lo nuestro</p>
          <h2 className="h2">Y lo que se movió en Colombia.</h2>
          <p className="lead">
            A cualquier magnitud, dentro de la misma caja que vigila el bot. La
            mayoría no los sintió nadie — y por eso Centinela no escribió.
          </p>
        </Reveal>

        <Reveal delay={0.06}>
          <ol className="sismos">
            {COLOMBIA.map((e, i) => (
              <Fila key={e.id} e={e} i={i} />
            ))}
          </ol>
        </Reveal>

        <Reveal delay={0.08}>
          <p className="sismos-pie">
            Los {CONTEOS_TEXTO[0]} eventos completos están en el{" "}
            <a href={CATALOGO_USGS} target="_blank" rel="noreferrer">
              catálogo del USGS
            </a>
            , que es de donde salieron estos. Acá van los que se pueden leer.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
