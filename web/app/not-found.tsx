import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { WHATSAPP } from "@/lib/datos";

export const metadata: Metadata = {
  title: "Página no encontrada · Centinela",
  robots: { index: false, follow: true },
};

/**
 * La 404 no es una disculpa: es una salida. Solo tres, y en el orden en que
 * sirven — volver a la portada, ver el histórico, o irse directo al bot, que
 * es lo único que hace algo por alguien durante un sismo.
 */
export default function NoEncontrada() {
  return (
    <>
      <Nav />
      <main className="seccion perdido">
        <div className="encabezado encabezado-centro">
          <p className="etiqueta dato">Error 404</p>
          <h1 className="display">Esta página no existe</h1>
          <p className="lead">
            El enlace que seguiste no lleva a ninguna parte. Lo demás sigue en pie.
          </p>
          <div className="fila hero-acciones" style={{ justifyContent: "center" }}>
            <a className="boton boton-primario" href="/">
              Ir a la portada
            </a>
            <a className="boton boton-secundario" href="/historico">
              Ver el histórico
            </a>
            <a className="boton boton-fantasma" href={WHATSAPP} target="_blank" rel="noreferrer">
              Abrir el bot
            </a>
          </div>
        </div>
      </main>
    </>
  );
}
