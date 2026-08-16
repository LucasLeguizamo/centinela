"use client";

import { useEffect, useState } from "react";
import { WHATSAPP } from "@/lib/datos";

/**
 * Chrome flotante: el contenido pasa por debajo en vez de que la barra se coma
 * una franja fija. El material solo se "enciende" cuando hay algo debajo que
 * separar — sobre el hero, donde no hay nada que ocultar, se mantiene
 * transparente y no compite con el titular.
 */
export function Nav() {
  const [pegada, setPegada] = useState(false);

  useEffect(() => {
    const alScroll = () => setPegada(window.scrollY > 24);
    alScroll();
    window.addEventListener("scroll", alScroll, { passive: true });
    return () => window.removeEventListener("scroll", alScroll);
  }, []);

  return (
    <nav className={`chrome nav ${pegada ? "nav-pegada" : ""}`}>
      <div className="nav-contenido">
        <a href="/" className="nav-marca">
          <span className="nav-punto" aria-hidden="true" />
          Centinela
        </a>

        <div className="nav-enlaces">
          <a href="/#problema">El problema</a>
          <a href="/#demo">Cómo se usa</a>
          <a href="/#ayuda">Después del sismo</a>
          <a href="/#como">Cómo funciona</a>
          <a href="/historico">El histórico</a>
        </div>

        <a className="boton boton-primario nav-cta" href={WHATSAPP} target="_blank" rel="noreferrer">
          Probarlo
        </a>
      </div>
    </nav>
  );
}
