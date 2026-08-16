import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Problema } from "@/components/Problema";
import { Conversacion } from "@/components/Conversacion";
import { Ayuda } from "@/components/Ayuda";
import { Mundo } from "@/components/Mundo";
import { Capacidades, ComoFunciona, Numeros, Pruebalo } from "@/components/Cierre";

/**
 * El orden es el argumento.
 *
 * Un sismo no termina cuando deja de temblar, y la página cuelga de esa frase.
 * Primero el problema y su solución con un ejemplo real, después cómo se usa,
 * después qué pasa cuando ya tembló, y al final cómo está construido y hacia
 * dónde va.
 *
 * Cada sección responde una sola pregunta del jurado, en el orden en que se
 * la hace: qué problema resuelven, cómo se ve, qué más hace, y si es real.
 */
export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Problema />
        <Conversacion />
        <Ayuda />
        <ComoFunciona />
        <Capacidades />
        {/* La evidencia va acá y no antes: primero se entiende qué hace el
            producto, y recién después el catálogo del planeta demuestra que el
            problema que resuelve es real. Al revés serían datos sin destino. */}
        <Mundo />
        <Numeros />
        <Pruebalo />
      </main>
    </>
  );
}
