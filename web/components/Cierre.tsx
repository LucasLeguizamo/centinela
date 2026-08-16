"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { CAPACIDADES, CIFRAS, FUENTES, REPO, WHATSAPP } from "@/lib/datos";
import { MUELLE } from "@/lib/motion";
import { Contador } from "./Contador";
import { GLIFOS } from "./Glifos";
import { Reveal } from "./Reveal";

/* ============================================================================
   Cómo funciona
   ----------------------------------------------------------------------------
   Antes eran dos listas numeradas dentro de dos cajas: correcto y muerto. La
   palabra del titular es «circuito», así que ahora se dibuja como tal — una
   línea que se traza al entrar en pantalla y nodos que se encienden a su paso.
   El dato es el mismo; lo que cambia es que ahora se ve fluir.
   ========================================================================= */

const CIRCUITOS = [
  {
    etiqueta: "Antes y durante",
    titulo: "De la tierra a tu teléfono",
    pasos: [
      { t: "USGS · EMSC", d: "Redes sísmicas mundiales detectan el evento" },
      { t: "Intensidad por municipio", d: "Se calcula qué se sintió en cada ciudad" },
      { t: "Umbral", d: "Se descarta a quien no lo sintió" },
      { t: "WhatsApp", d: "Llega el mensaje, con lo que pasó donde estás" },
    ],
  },
  {
    etiqueta: "Después",
    titulo: "De doce webs a una respuesta",
    pasos: [
      { t: "Plataformas ciudadanas", d: "Se leen cada 30 minutos" },
      { t: "Normalización", d: "Todo a un mismo formato, con su fuente" },
      { t: "Deduplicación", d: "Cinco webs listan el mismo acopio; se ve uno" },
      { t: "WhatsApp", d: "El punto más cercano, o la web que cubre tu zona" },
    ],
  },
];

function Circuito({ c, retraso }: { c: (typeof CIRCUITOS)[number]; retraso: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const enPantalla = useInView(ref, { once: true, amount: 0.3 });
  const reducido = useReducedMotion();

  return (
    <div className="circuito" ref={ref}>
      <p className="etiqueta">{c.etiqueta}</p>
      <p className="circuito-titulo h3">{c.titulo}</p>

      <ol className="circuito-pasos">
        {/* La línea se traza de arriba abajo: es el recorrido del dato. */}
        <motion.span
          className="circuito-linea"
          aria-hidden="true"
          initial={{ scaleY: reducido ? 1 : 0 }}
          animate={enPantalla ? { scaleY: 1 } : {}}
          transition={{ duration: reducido ? 0 : 1.1, ease: [0.16, 1, 0.3, 1], delay: retraso }}
        />
        {c.pasos.map((p, i) => (
          <motion.li
            key={p.t}
            initial={{ opacity: 0, x: reducido ? 0 : -8 }}
            animate={enPantalla ? { opacity: 1, x: 0 } : {}}
            transition={{ ...MUELLE, delay: retraso + 0.18 + i * 0.16 }}
          >
            <span className="circuito-nodo" aria-hidden="true" />
            <span className="circuito-paso-t">{p.t}</span>
            <span className="circuito-paso-d">{p.d}</span>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

export function ComoFunciona() {
  return (
    <section className="seccion seccion-alterna" id="como">
      <div className="contenido">
        <Reveal className="encabezado">
          <p className="etiqueta">Cómo funciona</p>
          <h2 className="h2">Dos circuitos, un solo canal.</h2>
          <p className="lead">
            Uno lleva el sismo hasta tu teléfono. El otro lleva la ayuda hasta
            quien la necesita. Los dos terminan en el mismo chat.
          </p>
        </Reveal>

        <div className="circuitos">
          {CIRCUITOS.map((c, i) => (
            <Circuito key={c.etiqueta} c={c} retraso={i * 0.15} />
          ))}
        </div>

        {/* Las fuentes, como chips con pulso: «conectada» es un estado vivo, no
            una celda de tabla. */}
        <Reveal delay={0.1}>
          <div className="fuentes-fila">
            <p className="etiqueta">Fuentes conectadas</p>
            <div className="chips">
              {FUENTES.map((f) => (
                <div key={f.nombre} className="chip">
                  <span className="chip-pulso" aria-hidden="true" />
                  <span className="chip-nombre">{f.nombre}</span>
                  <span className="chip-uso">{f.uso}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================================
   Qué hace
   ----------------------------------------------------------------------------
   Cuatro tarjetas idénticas dicen «estas cuatro cosas valen lo mismo», que es
   justo lo contrario de lo que queremos. La primera es el diferencial del
   producto, así que ocupa el doble y lleva su propio gráfico; las otras tres
   la acompañan.
   ========================================================================= */

/** Onda que se aplana con la distancia: el diferencial, dibujado. */
function OndaDecreciente() {
  const ref = useRef<SVGSVGElement>(null);
  const enPantalla = useInView(ref, { once: true, amount: 0.5 });
  const reducido = useReducedMotion();

  const barras = Array.from({ length: 28 }, (_, i) => {
    const t = i / 27;
    return Math.max(0.08, Math.exp(-t * 2.6) * (0.55 + Math.sin(i * 1.9) * 0.45));
  });

  return (
    <svg ref={ref} className="onda" viewBox="0 0 280 64" aria-hidden="true" preserveAspectRatio="none">
      {barras.map((h, i) => (
        <motion.rect
          key={i}
          x={i * 10 + 1}
          width="3"
          rx="1.5"
          initial={{ height: 0, y: 32 }}
          animate={enPantalla ? { height: h * 60, y: 32 - (h * 60) / 2 } : {}}
          transition={{
            duration: reducido ? 0 : 0.5,
            delay: reducido ? 0 : i * 0.022,
            ease: [0.16, 1, 0.3, 1],
          }}
          fill="var(--signal)"
          opacity={0.25 + (1 - i / 27) * 0.75}
        />
      ))}
    </svg>
  );
}

export function Capacidades() {
  const [principal, ...resto] = CAPACIDADES;

  return (
    <section className="seccion" id="que-hace">
      <div className="contenido">
        <Reveal className="encabezado">
          <p className="etiqueta">Qué hace</p>
          <h2 className="h2">Cuatro decisiones que lo separan de una alerta cualquiera.</h2>
        </Reveal>

        <div className="bento">
          <Reveal className="bento-principal">
            <article className="capacidad capacidad-grande">
              <div className="capacidad-texto">
                <p className="capacidad-titulo-grande">{principal.titulo}</p>
                <p className="capacidad-detalle">{principal.detalle}</p>
              </div>
              <OndaDecreciente />
              <p className="capacidad-leyenda">
                A más distancia del epicentro, menos se siente — y menos falta
                escribir.
              </p>
            </article>
          </Reveal>

          {resto.map((c, i) => {
            const Glifo = GLIFOS[i];
            return (
              <Reveal key={c.titulo} delay={0.06 + i * 0.06}>
                <article className="capacidad">
                  {Glifo && <Glifo />}
                  <p className="h3">{c.titulo}</p>
                  <p className="capacidad-detalle">{c.detalle}</p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   Números
   ----------------------------------------------------------------------------
   Los mismos datos, pero contando. Una cifra quieta es un dato; una que sube
   frente a uno se siente contada por alguien.
   ========================================================================= */

export function Numeros() {
  return (
    <section className="seccion seccion-alterna" id="numeros">
      <div className="contenido">
        <Reveal className="encabezado">
          <p className="etiqueta">Lo verificado</p>
          <h2 className="h2">Números que se pueden comprobar.</h2>
        </Reveal>

        <div className="cifras">
          {CIFRAS.map((c, i) => (
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
                  <Contador valor={Number(c.valor)} />
                </p>
                <p className="cifra-unidad">{c.unidad}</p>
                <p className="cifra-nota">{c.nota}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
   Pruebalo
   ========================================================================= */

export function Pruebalo() {
  return (
    <section className="seccion seccion-cierre" id="pruebalo">
      <div className="contenido">
        <Reveal className="encabezado encabezado-centro">
          <h2 className="h2">Pruébalo ahora, desde tu silla.</h2>
          <p className="lead">
            Escanea el código y se abre WhatsApp con el mensaje ya escrito. Solo
            hay que tocar enviar.
          </p>
        </Reveal>

        <Reveal delay={0.06}>
          <div className="probar">
            <a className="qr" href={WHATSAPP} target="_blank" rel="noreferrer" aria-label="Abrir Centinela en WhatsApp">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/qr.svg" alt="Código QR para abrir Centinela en WhatsApp" width={220} height={220} />
            </a>
            <div className="probar-texto">
              <a className="boton boton-primario" href={WHATSAPP} target="_blank" rel="noreferrer">
                Abrir en WhatsApp
              </a>
              <p className="probar-nota">
                Tocas enviar, eliges tu ciudad y ya quedas cubierto. Sin instalar
                nada, sin crear cuenta, sin dar más datos que el municipio donde
                estás.
              </p>
            </div>
          </div>
        </Reveal>
      </div>

      <footer className="pie">
        <div className="contenido pie-contenido">
          <p>Centinela · alertas sísmicas por WhatsApp para quien el teléfono no avisa.</p>
          <p>
            <a href={REPO} target="_blank" rel="noreferrer">Código en GitHub</a> ·{" "}
            <a href="https://earthquake.usgs.gov/earthquakes/eventpage/us6000tjl2" target="_blank" rel="noreferrer">
              Evento en el USGS
            </a>
          </p>
        </div>
      </footer>
    </section>
  );
}
