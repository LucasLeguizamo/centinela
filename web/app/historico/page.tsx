import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Mundo } from "@/components/Mundo";
import { VENTANA } from "@/lib/mundo";

/**
 * El catálogo mundial, en su propia ruta.
 *
 * Fuera de la landing a propósito: la portada tiene un solo trabajo, que es
 * llevar a alguien de «no sabía que esto existía» a escribirle al WhatsApp, y
 * diez mil sismos en el medio del recorrido lo frenan. Acá vive quien ya
 * quiere comprobar los números — el jurado que pregunta de dónde salen.
 */
export const metadata: Metadata = {
  title: "Histórico mundial · Centinela",
  description:
    `Todos los sismos del mundo entre el ${VENTANA.desdeCorta} y el ${VENTANA.hastaCorta} de ${VENTANA.anio}, según el catálogo del USGS. El más grande del mes no fue el más grave.`,
};

export default function Historico() {
  return (
    <>
      <Nav />
      <main>
        <Mundo />
      </main>
    </>
  );
}
