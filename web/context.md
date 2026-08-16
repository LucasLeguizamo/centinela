# Línea Sismo en la landing — contexto para el equipo

Resumen de lo que se agregó a la landing (`web/`) esta sesión: un boceto
interactivo de **Línea Sismo**, el flujo de reportes ciudadanos (persona no
localizada, ayuda con daños, donaciones) diseñado en `docs/CIRCUITOS.md`.
Nada de esto está conectado al bot todavía — es la maqueta tangible de ese
diseño, hecha para mostrarse en la demo.

## Qué se construyó

### 1. Una sección nueva: "Ayuda en caso de sismo"

Vive justo después del Hero, no al final de la página — se decidió subirla
de posición porque deja de ser un anexo de roadmap para ser la respuesta
directa a "¿y con qué me ayuda esto de verdad?". El Hero tiene un botón
grande, **"Ayuda en caso de sismo"**, que entra directo ahí.

La sección lleva la etiqueta **"Línea Sismo"** y la insignia **"En diseño"**
de forma permanente y visible — es un boceto, no el producto, y eso se dice
dos veces: en la insignia y en una nota debajo del título.

### 2. Selector de país

Arriba de todo, tres pastillas: **Colombia** (activa), **Venezuela**, y
**Panamá** (deshabilitada, sin datos todavía).

### 3. Colombia — las tres pestañas del mockup

Reproduce el machete que armó el equipo: tres pestañas (**Desaparecidos ·
Donaciones · Ayuda**), cada una con el mismo layout — lista de tarjetas a la
izquierda, mapa de Colombia a la derecha con **Bogotá D.C. resaltada**.

- **Desaparecidos**: nombre, dirección y descripción física de la persona.
  Sin folio, sin etiqueta "buscando/encontrado" — la regla del producto es
  que apenas alguien aparece, sale de la lista; no se queda marcado.
- **Donaciones**: tiene sub-filtros propios (**Económicas · Voluntariado ·
  Suministros**). Cada tarjeta es un centro con dirección y qué recibe.
- **Ayuda**: lugares que reportan un daño (fachada rota, techo colapsado,
  etc.), con dirección y qué necesitan — esto es el circuito **DAÑ** de
  `docs/CIRCUITOS.md`.

Todas las personas, centros y lugares son **de ejemplo, no reales** — se
avisa debajo de cada lista.

### 4. Venezuela — mismo diseño, contenido real y sin nombres

Venezuela usa la **misma interfaz** que Colombia (tarjetas + mapa, misma
identidad visual), pero el contenido es distinto a propósito:

- El evento es real: doblete de sismos M7.2 y M7.5 del 24 de junio de 2026,
  con cifras citadas (más de 6.300 muertos, entre 18.000 y 71.000
  desaparecidos según la fuente — la cifra no está clara ni siquiera en el
  periodismo real, y eso se muestra tal cual en vez de inventar un número
  limpio).
- La "lista" son las cuatro zonas más golpeadas (La Guaira, Caracas,
  Yaracuy, Carabobo), cada una con lo que reportó la prensa — no personas.
- El mapa es una **silueta esquemática**, marcada como tal — no sale de una
  geometría oficial como el mapa de Colombia.
- **Decisión que no se negocia:** Venezuela nunca va a tener tarjetas de
  personas, ni de ejemplo. Existe un registro ciudadano real
  (desaparecidosvenezuela.com, ~29.500 nombres) de familias buscando a
  alguien ahora mismo. Usar esos datos —o inventar unos parecidos— en una
  demo sería apropiarse de una tragedia real en curso.

### 5. Cambios en el Hero

- El mapa creció (más ancho, más alto).
- Los puntos del mapa pasaron de un solo color con opacidad variable a una
  **escala real de verde a rojo** según qué tan fuerte se sintió el sismo en
  cada municipio — mismo dato de siempre (`fuerza`, ya calculado), color
  distinto.
- El texto principal ahora menciona explícitamente que Centinela ayuda a
  **buscar a alguien no localizado**, no solo a encontrar acopios.
- Hay una tarjeta con el número real de personas reportadas desaparecidas
  (5.416, con 1.137 ya localizadas) que lleva al chat real de Ayuda — es el
  mismo dato que ya usa ese chat, no uno nuevo.

## La regla de honestidad detrás de todo esto

Esta landing tiene una regla dura, ya existente antes de esta sesión: **acá
no se inventa un número.** Todo lo que se ve en Línea Sismo respeta esa
regla de dos maneras distintas:

- Para **Colombia**, el contenido es claramente ficticio y se avisa como
  tal — es un boceto de cómo se navegaría, no datos reales presentados como
  si lo fueran.
- Para **Venezuela**, es al revés: el contenido tiene que ser **real y
  citado**, porque la tragedia es real y sigue en curso. Por eso no tiene
  tarjetas de personas — no hay forma de mostrar eso de manera responsable
  en una demo.

## Dónde vive en el código

- `web/components/LineaSismo.tsx` — toda la sección nueva.
- `web/components/Hero.tsx` y `web/components/MapaColombia.tsx` — los
  cambios del Hero.
- `web/app/globals.css` — los estilos nuevos, todos con el prefijo `.ls-`.
- `web/lib/datos.ts` — las dos cifras reales (desaparecidos/localizados) que
  comparten el Hero y el chat de Ayuda.
