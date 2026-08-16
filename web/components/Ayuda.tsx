"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { PUERTAS } from "@/lib/datos";
import { MUELLE, MUELLE_FISICO } from "@/lib/motion";
import { Reveal } from "./Reveal";

/**
 * El menú de ayuda, dentro de un WhatsApp de verdad y manejado por el usuario.
 *
 * Dos decisiones deliberadas:
 *
 * 1. **Se ve como WhatsApp, no como una web.** El producto vive ahí, así que
 *    enseñarlo en tarjetas de sitio web obliga al jurado a imaginarse la
 *    traducción. Con los botones y la lista reales, no hay nada que imaginar.
 * 2. **No se reproduce solo.** Una animación automática se mira; una que
 *    responde al dedo se entiende. Además deja al jurado probar el recorrido
 *    que le interese en vez del que elegimos nosotros.
 */

type Turno =
  | { tipo: "bot"; texto: string }
  | { tipo: "yo"; texto: string }
  | { tipo: "botones" }
  | { tipo: "lista"; puerta: number }
  | { tipo: "respuesta"; puerta: number; categoria: number };

const SALUDO: Turno[] = [
  {
    tipo: "bot",
    texto:
      "Hola 👋 Soy Centinela.\n\nTe aviso cuando tiemble donde estás. Y si ya tembló, te conecto con la ayuda — para los dos lados.",
  },
  { tipo: "botones" },
];

export function Ayuda() {
  const reducido = useReducedMotion();
  const [turnos, setTurnos] = useState<Turno[]>(SALUDO);
  const hiloRef = useRef<HTMLDivElement>(null);

  // El hilo se desplaza al último mensaje, como haría WhatsApp. `smooth` salvo
  // que el visor pida movimiento reducido.
  useEffect(() => {
    const el = hiloRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: reducido ? "auto" : "smooth" });
  }, [turnos, reducido]);

  const elegirPuerta = (puerta: number) => {
    setTurnos((t) => [
      ...t.filter((x) => x.tipo !== "botones"),
      { tipo: "yo", texto: PUERTAS[puerta].titulo },
      {
        tipo: "bot",
        texto:
          puerta === 0
            ? "Perfecto. ¿En qué quieres ayudar?"
            : "Estoy acá. ¿Qué necesitas?",
      },
      { tipo: "lista", puerta },
    ]);
  };

  const elegirCategoria = (puerta: number, categoria: number) => {
    setTurnos((t) => [
      ...t.filter((x) => x.tipo !== "lista"),
      { tipo: "yo", texto: PUERTAS[puerta].categorias[categoria].titulo },
      { tipo: "respuesta", puerta, categoria },
      { tipo: "botones" },
    ]);
  };

  const reiniciar = () => setTurnos(SALUDO);

  return (
    <section className="seccion seccion-alterna" id="ayuda">
      <div className="contenido">
        {/* Encabezado a todo lo ancho: el ojo entra por acá y sabe en qué
            sección está antes de encontrarse con nada más. */}
        <Reveal className="encabezado">
          <p className="etiqueta">Después del sismo</p>
          <h2 className="h2">Cuando deja de temblar, empieza el otro problema.</h2>
          <p className="lead">
            Encontrar dónde llevar la ayuda, o dónde pedirla, no debería ser
            otro problema encima del que ya tienes.
          </p>
        </Reveal>

        {/* Teléfono a la izquierda, argumento a la derecha. El chat es la
            prueba; el texto de al lado explica por qué importa. */}
        <div className="dos-columnas dos-columnas-invertida">
          <Reveal delay={0.06} className="columna-chat">
            <div className="wa">
              <div className="wa-barra">
                <span className="wa-avatar" aria-hidden="true">C</span>
                <div className="wa-quien">
                  <p className="wa-nombre">Centinela</p>
                  <p className="wa-estado">en línea</p>
                </div>
                <button className="wa-reiniciar" onPointerDown={reiniciar}>
                  Reiniciar
                </button>
              </div>

              <div className="wa-hilo" ref={hiloRef}>
                <AnimatePresence initial={false}>
                  {turnos.map((t, i) => (
                    <motion.div
                      key={`${t.tipo}-${i}`}
                      layout={!reducido}
                      initial={{ opacity: 0, y: reducido ? 0 : 12, scale: reducido ? 1 : 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={reducido ? { duration: 0.18 } : MUELLE_FISICO}
                      className="wa-turno"
                    >
                      {t.tipo === "bot" && <Burbuja lado="bot" texto={t.texto} />}
                      {t.tipo === "yo" && <Burbuja lado="yo" texto={t.texto} />}

                      {t.tipo === "botones" && (
                        <div className="wa-botones">
                          {PUERTAS.map((p, j) => (
                            <button key={p.id} className="wa-boton" onPointerDown={() => elegirPuerta(j)}>
                              {p.titulo}
                            </button>
                          ))}
                        </div>
                      )}

                      {t.tipo === "lista" && (
                        <div className="wa-lista">
                          {PUERTAS[t.puerta].categorias.map((c, j) => (
                            <button
                              key={c.id}
                              className="wa-fila"
                              onPointerDown={() => elegirCategoria(t.puerta, j)}
                            >
                              <span className="wa-fila-titulo">{c.titulo}</span>
                              <span className="wa-fila-detalle">{c.detalle}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {t.tipo === "respuesta" && (
                        <Respuesta puerta={t.puerta} categoria={t.categoria} />
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </Reveal>

          <div className="columna-texto">
            <Reveal delay={0.04}>
              <p className="invitacion">
                Toca los botones. Es el mismo recorrido que hace la gente.
              </p>
            </Reveal>

            <Reveal delay={0.08}>
              <ol className="pasos-numerados">
                <li>
                  <strong>Eliges de qué lado estás.</strong>
                  <span>
                    Quien viene a dar y quien viene a pedir están en momentos
                    opuestos. No los mezclamos en el mismo menú.
                  </span>
                </li>
                <li>
                  <strong>Dices qué necesitas.</strong>
                  <span>
                    Llevar cosas, donar, buscar a alguien, dónde dormir. Cuatro
                    toques como máximo.
                  </span>
                </li>
                <li>
                  <strong>Recibes algo concreto.</strong>
                  <span>
                    Una dirección con horario y qué falta ahí, no un listado de
                    doce webs para que las revises tú.
                  </span>
                </li>
              </ol>
            </Reveal>

            <Reveal delay={0.12}>
              <div className="garantias">
                <p><strong>Lo más cercano primero.</strong> Si hay un punto cerca te manda ahí; si no, a la plataforma que cubre tu zona.</p>
                <p><strong>Con fuente y fecha.</strong> Cada dato se puede rastrear hasta quién lo publicó y cuándo.</p>
                <p><strong>Nunca un número de cuenta.</strong> Para donar te llevamos a la página oficial de la organización.</p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

function Burbuja({ lado, texto }: { lado: "bot" | "yo"; texto: string }) {
  return (
    <div className={`wa-burbuja wa-burbuja-${lado}`}>
      {texto.split("\n").map((l, i) => (
        <p key={i} className={l === "" ? "wa-hueco" : undefined}>
          {l}
        </p>
      ))}
    </div>
  );
}

function Respuesta({ puerta, categoria }: { puerta: number; categoria: number }) {
  const r = PUERTAS[puerta].categorias[categoria].respuesta;
  return (
    <div className="wa-burbuja wa-burbuja-bot wa-respuesta">
      <p className="wa-respuesta-titulo">{r.titulo}</p>
      {r.cuerpo.split("\n").map((l, i) => (
        <p key={i} className={l === "" ? "wa-hueco" : undefined}>
          {l}
        </p>
      ))}
      {r.pie && <p className="wa-respuesta-pie">{r.pie}</p>}
      {r.fuente && <p className="wa-respuesta-fuente">{r.fuente}</p>}
    </div>
  );
}
