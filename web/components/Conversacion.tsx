"use client";

import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CONVERSACION } from "@/lib/datos";
import { MUELLE_FISICO } from "@/lib/motion";
import { Reveal } from "./Reveal";

/**
 * La conversación se escribe sola al llegar a la sección.
 *
 * Antes los mensajes entraban con retrasos escalonados, y el resultado era que
 * para cuando alguien llegaba scrolleando ya estaban todos puestos: la
 * animación existía pero nadie la veía. Ahora se reproduce paso a paso desde
 * el momento en que el teléfono entra de verdad en pantalla, con el «escribiendo…»
 * entre mensajes.
 *
 * Ese indicador no es adorno: es lo que convierte una lista de burbujas en una
 * conversación. Da el ritmo de alguien al otro lado y hace evidente que esto es
 * un chat, no una captura.
 */
export function Conversacion() {
  const ref = useRef<HTMLDivElement>(null);
  // `amount` alto a propósito: se dispara cuando el teléfono está de verdad a
  // la vista, no cuando asoma por el borde inferior.
  const enPantalla = useInView(ref, { once: true, amount: 0.45 });
  const reducido = useReducedMotion();

  const [visibles, setVisibles] = useState(0);
  const [escribiendo, setEscribiendo] = useState(false);

  useEffect(() => {
    if (!enPantalla) return;

    // Con movimiento reducido no hay puesta en escena: se muestra todo.
    if (reducido) {
      setVisibles(CONVERSACION.length);
      return;
    }

    let cancelado = false;
    const relojes: ReturnType<typeof setTimeout>[] = [];

    const paso = (i: number) => {
      if (cancelado || i >= CONVERSACION.length) {
        setEscribiendo(false);
        return;
      }
      const m = CONVERSACION[i];
      // Solo el bot "escribe": lo que teclea la persona aparece de golpe,
      // igual que en un chat real desde el lado de quien mira.
      const pausa = m.de === "bot" ? 900 : 500;

      if (m.de === "bot") setEscribiendo(true);

      relojes.push(
        setTimeout(() => {
          if (cancelado) return;
          setEscribiendo(false);
          setVisibles(i + 1);
          relojes.push(setTimeout(() => paso(i + 1), 420));
        }, pausa)
      );
    };

    relojes.push(setTimeout(() => paso(0), 350));
    return () => {
      cancelado = true;
      relojes.forEach(clearTimeout);
    };
  }, [enPantalla, reducido]);

  return (
    <section className="seccion" id="demo">
      <div className="contenido">
        <div className="dos-columnas">
          <div className="columna-texto">
            <Reveal className="encabezado">
              <p className="etiqueta">Cómo se usa</p>
              <h2 className="h2">Un mensaje. Una pregunta. Listo.</h2>
              <p className="lead">
                Nadie instala una app para un sismo que todavía no pasó. Pero
                todo el mundo ya tiene WhatsApp abierto.
              </p>
            </Reveal>

            <Reveal delay={0.08}>
              <ol className="pasos-numerados">
                <li>
                  <strong>Escribes «hola».</strong>
                  <span>Eso es todo el registro. Sin app, sin cuenta, sin contraseña.</span>
                </li>
                <li>
                  <strong>Eliges tu ciudad.</strong>
                  <span>Una sola pregunta, de una lista. Es el único dato que pedimos.</span>
                </li>
                <li>
                  <strong>Recibes lo que te tocó a ti.</strong>
                  <span>Qué se sintió en tu municipio, no la magnitud del epicentro.</span>
                </li>
              </ol>
            </Reveal>
          </div>

          <Reveal delay={0.06} className="columna-chat">
            <div className="chat-marco" ref={ref}>
              <div className="chat-notch" aria-hidden="true" />
              <div className="chat-barra">
                <span className="chat-avatar" aria-hidden="true">C</span>
                <div>
                  <p className="chat-nombre">Centinela</p>
                  <p className="chat-estado">en línea</p>
                </div>
              </div>

              <div className="chat-hilo">
                {CONVERSACION.slice(0, visibles).map((m, i) => (
                  <motion.div
                    key={i}
                    className={`burbuja burbuja-${m.de}`}
                    initial={{ opacity: 0, y: reducido ? 0 : 12, scale: reducido ? 1 : 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={reducido ? { duration: 0.2 } : MUELLE_FISICO}
                  >
                    {m.destacar ? (
                      <Destacado texto={m.texto} destacar={m.destacar} />
                    ) : (
                      <Texto texto={m.texto} />
                    )}
                  </motion.div>
                ))}

                <AnimatePresence>
                  {escribiendo && (
                    <motion.div
                      className="burbuja burbuja-bot burbuja-escribiendo"
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={MUELLE_FISICO}
                      aria-label="Centinela está escribiendo"
                    >
                      <span className="punto" />
                      <span className="punto" />
                      <span className="punto" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/** Los asteriscos del formato de WhatsApp, tal cual los manda el bot. */
function Texto({ texto }: { texto: string }) {
  return (
    <>
      {texto.split("\n").map((linea, i) => (
        <p key={i} className={linea === "" ? "burbuja-hueco" : undefined}>
          {linea.split(/(\*[^*]+\*)/g).map((trozo, j) =>
            trozo.startsWith("*") && trozo.endsWith("*") && trozo.length > 2 ? (
              <em key={j} className="burbuja-enfasis">{trozo.slice(1, -1)}</em>
            ) : (
              trozo
            )
          )}
        </p>
      ))}
    </>
  );
}

/** La línea que sostiene la tesis va resaltada, no en negrita cualquiera. */
function Destacado({ texto, destacar }: { texto: string; destacar: string }) {
  return (
    <>
      {texto.split("\n").map((linea, i) => {
        if (!linea.includes(destacar)) {
          return (
            <p key={i} className={linea === "" ? "burbuja-hueco" : undefined}>
              {linea}
            </p>
          );
        }
        const [antes, despues] = linea.split(destacar);
        return (
          <p key={i}>
            {antes}
            <mark className="burbuja-marca">{destacar}</mark>
            {despues}
          </p>
        );
      })}
    </>
  );
}
