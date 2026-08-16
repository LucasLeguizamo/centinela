import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Problema } from "@/components/Problema";
import { Conversacion } from "@/components/Conversacion";
import { Ayuda } from "@/components/Ayuda";
import { Capacidades, ComoFunciona, Numeros, Pruebalo } from "@/components/Cierre";
import { LineaSismo } from "@/components/LineaSismo";

/**
 * El orden es el argumento.
 *
 * Un sismo no termina cuando deja de temblar, y la página cuelga de esa frase.
 * `LineaSismo` va justo después del hero, no al final: deja de ser un anexo
 * de roadmap para ser la respuesta directa a "¿y con qué me ayuda esto de
 * verdad?" — por eso el propio hero linkea ahí. Sigue marcada como boceto
 * (el badge "En diseño" no se negocia, nada de esto llega al bot todavía),
 * pero el lugar que ocupa en la página ya no es el de un pendiente.
 *
 * Después de eso, el resto sigue el mismo argumento de siempre: el problema
 * y su solución con un ejemplo real, cómo se usa, qué pasa cuando ya tembló,
 * y al final cómo está construido.
 */
export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <LineaSismo />
        <Problema />
        <Conversacion />
        <Ayuda />
        <ComoFunciona />
        <Capacidades />
        <Numeros />
        <Pruebalo />
      </main>
    </>
  );
}
