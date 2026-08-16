/**
 * Todo el contenido de la página, en un archivo.
 *
 * Está separado de los componentes a propósito: en plena hackatón el copy se
 * retoca cada media hora y quien lo retoca no tiene por qué pelearse con JSX.
 *
 * Regla que no se rompe: **acá no se inventa un número**. Cada cifra sale del
 * repo del bot o de una fuente citada, porque el jurado va a preguntar de
 * dónde salen y la respuesta tiene que existir.
 */

export const WHATSAPP = "https://wa.me/15553075027?text=Hola";
export const REPO = "https://github.com/LucasLeguizamo/centinela";

/* -------------------------------------------------------------- capacidades
   Lo que el producto hace hoy. Sin etiquetas de estado: una insignia de
   "en construcción" en una web de presentación se lee como "todavía no está
   listo", y lo que está listo no necesita anunciarlo.                        */

export const CAPACIDADES = [
  {
    titulo: "Sabe qué te tocó a ti",
    detalle:
      "No te manda la magnitud del epicentro. Calcula qué se sintió en tu municipio y te escribe solo si de verdad te tocó.",
  },
  {
    titulo: "No te despierta cinco veces",
    detalle:
      "Después de un sismo grande vienen las réplicas. Van agrupadas en un solo mensaje, no en cinco a las tres de la mañana.",
  },
  {
    titulo: "Te conecta con la ayuda",
    detalle:
      "Cuando deja de temblar, reúne en un solo chat las plataformas ciudadanas de acopios, donaciones y búsqueda de personas.",
  },
  {
    titulo: "Vive donde ya estás",
    detalle:
      "Sin descargar una app, sin crear cuenta, sin contraseñas. Un mensaje de WhatsApp y una pregunta: en qué ciudad estás.",
  },
];

/* ------------------------------------------------------- chat de la demo
   Los mensajes son los reales del bot: `src/responder.js` y `src/alertar.js`
   del repo. Nada está escrito para la ocasión.                               */

export type Mensaje = {
  de: "persona" | "bot";
  texto: string;
  /** Se marca la línea que sostiene toda la tesis del producto. */
  destacar?: string;
  /** Pausa antes de que aparezca, en segundos. */
  espera?: number;
};

/**
 * La conversación está recortada respecto a la real, y el recorte es una
 * decisión: el mensaje que sostiene la tesis es el último, así que cada
 * burbuja de más lo empuja fuera de la pantalla del jurado. Se conserva la
 * línea honesta del saludo —que el aviso llega después— porque esa sí es
 * parte del argumento.
 */
export const CONVERSACION: Mensaje[] = [
  { de: "persona", texto: "hola" },
  {
    de: "bot",
    espera: 0.5,
    texto:
      "Hola 👋 Soy Centinela.\n\nTe aviso cuando tiemble donde estás, y te digo qué tan fuerte se sintió *ahí* — no la magnitud del epicentro, que sola no dice nada.\n\n¿En qué ciudad estás?",
  },
  { de: "persona", texto: "Quibdó", espera: 0.9 },
  { de: "bot", espera: 0.45, texto: "Listo, quedaste suscrito para Quibdó ✅" },
  {
    de: "bot",
    espera: 1.2,
    texto:
      "⚠️ Sismo M7.4 detectado\n\n📍 5 km S of San José del Palmar, Colombia\n🕐 7:34:28 a. m. · 110 km de profundidad\n\nEn Quibdó se sintió moderado (a 152 km del epicentro).\n\nFuente: USGS",
    destacar: "En Quibdó se sintió moderado",
  },
];

/* ----------------------------------------------------------- las dos puertas
   Categorías reales de `src/directorio.js`.                                  */

export type Respuesta = {
  titulo: string;
  cuerpo: string;
  pie?: string;
  fuente?: string;
};

export type Categoria = {
  id: string;
  titulo: string;
  detalle: string;
  respuesta: Respuesta;
};

export const PUERTAS: { id: string; titulo: string; categorias: Categoria[] }[] = [
  {
    id: "ayudar",
    titulo: "Quiero ayudar",
    categorias: [
      {
        id: "acopio",
        titulo: "Llevar cosas",
        detalle: "Mercado, ropa, aseo",
        respuesta: {
          titulo: "Punto de Solidaridad Quibdó",
          cuerpo:
            "Calle 27A #23-44, Barrio Los Ángeles, sector San Gabriel, Quibdó, Chocó\nA 1,7 km de ti · Abierto ahora\nMás urgente hoy: agua potable, alimentos no perecederos, elementos de aseo",
          pie: "Te mandamos al punto más cercano que esté recibiendo, con lo que de verdad hace falta ahí. 145 centros en 51 municipios.",
          fuente: "Verificado el 13 de ago · Centros de Acopio Colombia",
        },
      },
      {
        id: "donar",
        titulo: "Donar dinero",
        detalle: "Canales verificados",
        respuesta: {
          titulo: "Organizaciones verificadas",
          cuerpo:
            "Cruz Roja Colombiana\nFundación PLAN\nBancos de Alimentos ABACO\n\nTe llevamos a la página oficial de cada una.",
          pie: "Tu donación va directo a la organización. Nunca te vamos a mandar un número de cuenta por chat: si te llega uno a nuestro nombre, no somos nosotros.",
        },
      },
      {
        id: "sangre",
        titulo: "Donar sangre",
        detalle: "Puntos y jornadas",
        respuesta: {
          titulo: "Jornadas activas cerca de ti",
          cuerpo:
            "Bancos de sangre y jornadas programadas, con horario y si están recibiendo hoy.\n\nLa sangre se necesita durante semanas, no solo los primeros días.",
          pie: "Solo te mandamos a puntos que podemos confirmar. Verificamos cada dato contra su fuente antes de dártelo.",
        },
      },
    ],
  },
  {
    id: "necesito",
    titulo: "Necesito ayuda",
    categorias: [
      {
        id: "buscar_persona",
        titulo: "Buscar a alguien",
        detalle: "Reportar o consultar",
        respuesta: {
          titulo: "Los cuatro registros del país, en un solo lugar",
          cuerpo:
            "Colombia Te Busca · Encontrados · Asocapitales · Ayuda Colombia\n\nBuscamos en todos a la vez y te decimos en cuáles registrar el caso para que lo vea la mayor cantidad de gente.",
          pie: "Están separados entre sí. Nosotros los reunimos, para que no tengas que llenar cuatro formularios distintos en el peor día de tu vida.",
          fuente: "5.416 personas reportadas · 1.137 ya localizadas",
        },
      },
      {
        id: "alojamiento",
        titulo: "Necesito dónde dormir",
        detalle: "Alojamiento temporal",
        respuesta: {
          titulo: "Alojamiento temporal",
          cuerpo:
            "Te conectamos con propietarios que tienen un espacio disponible cerca de donde estás.\n\nHoy con cobertura en el Eje Cafetero, y sumando ciudades cada semana.",
          pie: "Siempre te decimos qué cubre cada plataforma y qué no, para que no pierdas tiempo en la que no te sirve.",
        },
      },
      {
        id: "mascota",
        titulo: "Perdí mi mascota",
        detalle: "Reportar o buscar",
        respuesta: {
          titulo: "También buscamos mascotas",
          cuerpo:
            "Publica el caso con foto y zona, o mira los que ya están reportados cerca de ti.\n\nEs la única búsqueda de mascotas activa del país tras el sismo.",
          fuente: "146 mascotas reportadas · 201 casos activos",
        },
      },
    ],
  },
];

/* ------------------------------------------------------------------- cifras
   Todas comprobables. La procedencia va al lado del número, no en una nota
   al pie que nadie lee.                                                      */

export const CIFRAS = [
  {
    valor: "145",
    unidad: "puntos de acopio",
    nota: "en 51 municipios, verificados uno a uno contra su fuente",
  },
  {
    valor: "12",
    unidad: "plataformas ciudadanas",
    nota: "dispersas por todo el país, reunidas en un solo chat",
  },
  {
    valor: "7",
    unidad: "mensajes distintos",
    nota: "para un mismo sismo: uno por ciudad, según lo que se sintió ahí",
  },
  {
    valor: "0",
    unidad: "apps que instalar",
    nota: "funciona en el WhatsApp que la gente ya tiene abierto",
  },
];

export const FUENTES = [
  { nombre: "USGS FDSN", uso: "Detección de eventos en tiempo real", estado: "conectada" },
  { nombre: "EMSC Seismic Portal", uso: "Red europea, respaldo", estado: "conectada" },
];
