# Las webs ciudadanas del terremoto

Catálogo de las plataformas que la ciudadanía construyó tras el sismo de magnitud 7,4 del 10 de agosto de 2026, con epicentro a 5 km al sur de San José del Palmar, Chocó.

Ocho fueron auditadas visitando el sitio el 15 de agosto de 2026. Las demás están documentadas a través de prensa nacional y no pudieron abrirse desde una red con filtrado DNS: los dominios se registraron alrededor del 10 de agosto y varios resolutores corporativos los mandan a un sinkhole por política de dominio recién registrado. **No es un indicio de fraude, pero implica que sus cifras vienen de prensa y no de una visita directa.**

Los volúmenes son los que cada plataforma declaraba al momento de la consulta y cambian a diario.

## Por qué existe este documento

En cinco días aparecieron catorce plataformas. Ninguna se comunica con las otras. Un hilo de r/Colombia lo resumió mejor que cualquier análisis:

> No hay una "torre de control" que diga hacia dónde van, quién necesita y quién puede brindar ayudas. Sí he visto 20 plataformas que podrían hacer eso, pero ninguna está centralizada, otras están regionalizadas y algunas requieren un PC.

El problema no es que falten webs. Es que sobran y no se hablan. Este catálogo es el índice que faltaba, y `src/directorio.js` es su versión ejecutable: lo que el bot consulta para recomendar la plataforma correcta según qué necesita la persona y dónde está.

## Matriz de cobertura

| Plataforma | Desapa­recidos | Mas­cotas | Aco­pios | Dona­ción | San­gre | Vivien­da | Mapa daños | Volun­tariado | Diás­pora |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Colombia Te Busca | ● | | | | | | ○ | | |
| Encontrados | ● | | | | | | | | |
| Asocapitales *(oficial)* | ● | | | | | | | | |
| Ayuda Colombia | ● | ● | | | | | | | |
| Centros de Acopio | | | ● | | | | | | |
| Cuidar a Colombia | ○ | | ● | ● | ● | | ○ | | |
| Colombia Te Amo | ○ | | ● | ● | ● | | | ● | |
| Mapa del Terremoto | | | ● | | | ○ | ● | ● | |
| Help Them Directly | | | | ● | | ○ | | | ● |
| Colombia Hub | | | ● | ● | | | | ○ | ● |
| Mapa de Daños | ○ | | | | | | ● | ○ | |
| Techo Cafetero | | | | | | ● | | | |
| Terremoto Colombia | | | ○ | | | | ● | | |
| Donaciones Verifica | | | | ● | | | | | |
| Medicina Legal *(oficial)* | ● | | | | | | | | |

● función principal · ○ parcial o solo enlaza

El patrón salta a la vista: **todo el mundo construyó lo mismo**. Desaparecidos, acopios y directorios de donación tienen cinco o seis actores cada uno, mientras vivienda, mascotas y salud mental quedaron con uno solo o ninguno.

## Fichas

### Búsqueda de personas

**[Colombia Te Busca](https://colombiatebusca.com)** · nacional · *auditada en vivo*
El registro ciudadano más grande y el único con esquema territorial serio, con municipios bajo estándar DIVIPOLA. Genera carteles imprimibles y comparte por WhatsApp, Facebook y X. Lo hizo Óscar Conde, desarrollador de software.
**5.416 personas registradas · 4.275 por localizar · 1.137 localizadas.** No gestiona dinero.
Campos: foto, nombre, tipo y número de documento, edad, género, categoría, fecha, departamento, municipio, última ubicación, descripción y contacto de quien reporta.

**[Encontrados](https://encontrados.co)** · nacional · *vía prensa*
Además del registro ciudadano, cruza con el mural HOPE de Medicina Legal (RND/SIRDEC) acotado al sismo. **Es la única que puede cerrar un caso con autoridad.** Su código es público en [`encontradosco/encontrados`](https://github.com/encontradosco/encontrados), donde se ve el barrido automático cada seis horas.
**4.900+ casos** al 11 de agosto. Los organismos de rescate suben fotos de personas halladas.

**[Asocapitales](https://asocapitales.co/terremoto-colombia.html)** · nacional · oficial
El canal de las alcaldías para reportar desaparecidos.

**[Ayuda Colombia](https://ayuda-colombia.vercel.app)** · Manizales, Cali, Pereira, Villamaría, Medellín, Itagüí · *auditada en vivo*
La única que trata a las mascotas como caso de primera clase. Tiene sección de reencuentros y advertencia antifraude explícita: *"nunca envíes dinero a un contacto que encuentres aquí"*.
**201 casos · 55 personas · 146 mascotas.**

### Ayuda material

**[Centros de Acopio Colombia](https://emergency-rosy.vercel.app)** · nacional · *auditada en vivo*
La base de acopios más completa del país y la única con coordenadas GPS y metodología de verificación publicada. Acepta registro de centros nuevos.
**145 centros en 27 departamentos · 107 confirmados por canal oficial.**
Campos: nombre, dirección, artículos aceptados, artículos rechazados, necesidades urgentes, horarios, teléfono, estado y fecha de verificación, coordenadas.
Es la fuente conectada al bot. El volcado está en [`data/snapshots/`](../data/snapshots/).

**[Cuidar a Colombia](https://cuidarcolombia.vercel.app)** · nacional · *auditada en vivo*
El agregador más disciplinado: cada dato lleva fuente y fecha, y publica cuándo lo va a revisar de nuevo. Único que además desmiente cadenas falsas de WhatsApp. Lo hizo Santiago Jiménez Londoño.
**219 registros trazables · 107 fuentes consultadas · 13 municipios.** No intermedia ni recauda.

**[Colombia Te Amo](https://colombiateamo.com)** · nacional · *vía prensa*
Guía de ayuda mutua que reúne dinero, alimentos, sangre, voluntariado, salud mental y búsqueda de personas en un solo lugar.

**[Colombia Hub](https://colombiahub.org/terremoto-colombia-2026-como-ayudar/)** · diáspora · *auditada en vivo*
Pensada para colombianos fuera del país: organizaciones verificadas y acopios en Nueva York, Nueva Jersey y Florida. Admite registro de iniciativas nuevas. La hizo Orlando Arango.
**14+ acopios · 6 organizaciones.** No recibe ni procesa pagos.

**[Help Them Directly](https://helpthemdirectly.org/es/)** · Colombia y Venezuela · *auditada en vivo*
El modelo que llegó desde el sismo de Venezuela: perfiles de familias enlazados a su propia cuenta de recaudación, **sin intermediario financiero**. También permite publicar el caso propio. Categorías: vivienda de emergencia, atención médica, apoyo por fallecimiento y duelo.
**~160 casos listados.** No recopila ni administra donaciones.

**[Donaciones Verifica](https://terremoto-colombia-donacionesverifica.netlify.app)** · nacional · *vía prensa*
Botón de donación en un clic hacia canales verificados.

### Territorio, daños y vivienda

**[Mapa del Terremoto](https://www.mapadelterremoto.com)** · nacional · *vía prensa*
Mapa abierto de daños, albergues y acopios. Agrega portales oficiales, boletines y reportes ciudadanos, y **cuando las fuentes se contradicen preserva la discrepancia en vez de resolverla**, que es la decisión de diseño correcta en una emergencia. Tiene convocatoria para ingenieros, arquitectos y estudiantes.

**[Mapa de Daños](https://terremotovenezuela.com)** · Colombia y Venezuela · *auditada en vivo*
Mapa estructural con tres niveles: daño parcial, daño severo y colapso total. Reporte ciudadano con hasta ocho fotos, datos sísmicos del USGS en tiempo real y grupos de WhatsApp por ciudad, incluidos Cali, Chocó, Manizales y Pereira. Lo cura @mariangelli con un equipo voluntario.
**177+ edificios registrados · índice de colapso 18,6 %.**

**[Terremoto Colombia](https://terremotocolombia.co)** · nacional · *vía prensa*
Reportes ciudadanos, mapeo de impacto y acceso a fuentes oficiales.

**[Techo Cafetero](https://techocafetero.app)** · Quindío y Risaralda · *vía prensa*
Conecta a quien perdió su casa con propietarios que tienen un espacio disponible. **Es el único actor de vivienda temporal del catálogo**, y solo cubre el Eje Cafetero.

### Fuentes oficiales

- **Medicina Legal (RND/SIRDEC)** — la única fuente que puede cerrar un caso de desaparición con autoridad. 207 reportes al 14 de agosto.
- **UNGRD** — coordinación nacional de la respuesta.
- **Cruz Roja Colombiana** — WhatsApp +57 321 213 9525 · rcf@cruzrojacolombiana.org

## Dónde se solapan

**Desaparecidos: seis sistemas, solapamiento crítico.** Colombia Te Busca (5.416), Encontrados (4.900+), Ayuda Colombia (55), Asocapitales, Medicina Legal (207 oficiales) y El Espectador guardan personas desaparecidas **sin un identificador compartido**. La misma persona puede estar reportada cuatro veces, y cuando aparece en una sigue figurando como desaparecida en las otras tres. Nadie deduplica entre plataformas. Es el solapamiento que hace daño real.

**Donaciones: seis directorios.** Las mismas organizaciones con criterios de verificación distintos y ninguna forma de saber cuál está más fresca. Divide la confianza justo donde el fraude está atacando: la Policía Nacional y Bancolombia alertaron de campañas falsas que suplantan entidades por redes, SMS y WhatsApp.

**Acopios: cinco directorios, pero con un ganador claro.** Centros de Acopio tiene 145 puntos con GPS y verificación fechada; las otras cuatro listas podrían consumirlo en vez de recolectar en paralelo.

**Mapas de daño: tres, y se solapan poco.** Cada uno mapea cosas distintas, así que fusionarlos es más fácil que fusionar registros de personas.

## Lo que nadie cubre

Los huecos son más interesantes que los solapamientos, porque ahí es donde una plataforma nueva sí aportaría algo.

- **El lado de la necesidad.** Catorce plataformas dicen dónde donar. Ninguna dice qué falta y dónde, en tiempo real. Es exactamente la torre de control que la comunidad pidió.
- **Logística de última milla.** Nadie conecta el acopio de Bogotá con el camión que va al Chocó. Una caja sin transporte asignado no es ayuda, es almacenamiento.
- **Chocó rural.** El epicentro es el peor cubierto: casi todo el catálogo lista Cali, Pereira y Manizales.
- **Datos abiertos.** Solo Encontrados tiene repositorio público. Ninguna publica un feed consultable, así que agregar hoy exige raspar HTML.
- **Vivienda fuera del Eje Cafetero.** Un solo actor y limitado a dos departamentos.
- **Acceso desde el móvil y desde redes filtradas**, justo cuando la conexión es lo primero que falla.

## Cómo se unirían

En orden, porque cada paso depende del anterior. La regla que atraviesa todo: **lo que falta es un agregador de lectura, no otro formulario de captura.**

1. **Identificador canónico de persona.** Sin esto no hay deduplicación posible y lo demás es cosmético. La clave más barata que ya comparten casi todos los registros: tipo y número de documento normalizados más municipio DIVIPOLA. Donde no haya documento, nombre normalizado más fecha aproximada, marcado como coincidencia débil para revisión humana.

2. **Esquema mínimo común.** No hay que inventarlo: sale de intersectar los campos que Colombia Te Busca, Encontrados y Ayuda Colombia ya piden.

   ```json
   {
     "id_fuente": "colombiatebusca:3a6e9cdc",
     "doc": { "tipo": "CC", "numero_hash": "sha256:…" },
     "nombre": "…",
     "edad": 34,
     "genero": "F",
     "divipola": "76001",
     "ultima_ubicacion": "…",
     "estado": "por_localizar",
     "actualizado": "2026-08-15T15:52:00-05:00"
   }
   ```

3. **El estado como máquina, no como etiqueta.** `reportado` → `por_localizar` → `localizado` → `fallecido_identificado`, cada transición con marca de tiempo y fuente, para que un cierre se propague en vez de dejar el caso abierto para siempre.

4. **Un feed público por plataforma.** Un `/api/casos.json` estático con el esquema de arriba, regenerado cada pocos minutos. Es media tarde de trabajo por equipo y convierte catorce silos en catorce fuentes consumibles. **Es el paso con mejor relación esfuerzo-resultado de toda la lista.**

5. **Anclar en Medicina Legal.** El RND/SIRDEC es la única fuente que cierra un caso con autoridad, y Encontrados ya está construyendo ese adaptador en abierto. Es el punto de anclaje natural: no hay que duplicarlo.

6. **Conservar las contradicciones.** Cuando dos fuentes se contradicen, mostrar ambas con su procedencia en vez de elegir una en silencio. En una emergencia, un dato falso con aspecto de confirmado hace más daño que dos datos en conflicto.

## Metodología

El catálogo salió de una búsqueda sobre lo que la gente publicó en los treinta días previos al 15 de agosto de 2026 en Reddit, X, YouTube, TikTok, Hacker News y GitHub, más prensa nacional; y de visitar cada plataforma alcanzable para registrar qué datos maneja, quién la mantiene, si toca dinero y cuándo se verificó por última vez.

Fuentes consultadas para las fichas que no pudieron auditarse en vivo: El Tiempo, Infobae, Noticias Caracol, Publimetro, Pulzo, Vanguardia, El País (Cali), Semana, La FM y Noticias ONU.

**Las conversaciones ciudadanas que orientaron la búsqueda no se republican acá.** Son mensajes de personas buscando a su familia, con nombre de usuario y en un momento muy duro; citarlas para fundamentar un hallazgo es una cosa y volcarlas en bloque a un repositorio público es otra.
