import { BLOG_AUTHOR, type BlogPost } from "@/domain/blog";

/**
 * Diario Azul: accesorios inspirados en el mar.
 * Regla editorial: de cada producto solo se afirma lo que dice su ficha. Sin certificaciones, sin afirmaciones de sostenibilidad
 * y sin materiales que la ficha no mencione.
 */
export const accesoriosInspiradosEnElMar: BlogPost = {
  slug: "accesorios-inspirados-en-el-mar",
  title: "Accesorios inspirados en el mar: cómo llevar la naturaleza contigo",
  subtitle: "Conchas, estrellas, tortugas y flores tropicales: de dónde sale esta inspiración, cómo llevarla en el día a día y qué detalles dicen más de ti.",
  category: "Inspiración caribeña",
  date: "2026-11-26",
  author: BLOG_AUTHOR,
  metaTitle: "Accesorios inspirados en el mar: lleva la naturaleza contigo | Azul Clarito",
  metaDescription: "Accesorios marinos y tropicales para el día a día: cómo llevar conchas, estrellas y tortugas con estilo caribeño, y regalos inspirados en el mar.",
  image: { src: "/blog/accesorios-del-mar.webp", alt: "Cuadro azul con olas y espuma de mar junto a una hoja de palma, sobre una pared amarilla", width: 1086, height: 611 },
  keywords: ["accesorios inspirados en el mar", "accesorios marinos", "accesorios tropicales", "joyería inspirada en el mar", "accesorios de naturaleza", "estilo caribeño"],
  intro: [
    "Quien vive cerca del mar lo sabe: se mete en todo. En el color de las cosas, en lo que uno guarda en los bolsillos, en las ganas de llevar una concha en el cuello o una tortuga dibujada en la gorra. Los accesorios inspirados en el mar no son una moda reciente; son una manera antigua de llevar un lugar con uno.",
    "En esta guía hablamos de dónde nace esa inspiración, cómo incorporarla en el día a día sin que parezca un disfraz de verano y qué pequeños detalles dicen mucho de quien los lleva. Al final, algunas ideas de regalo con espíritu caribeño y piezas de la tienda de Azul Clarito, desde Limón, para verlo en la práctica.",
  ],
  sections: [
    {
      id: "inspiracion",
      title: "El mar y la selva como punto de partida",
      blocks: [
        { type: "p", text: "En el Caribe costarricense el mar y la vegetación no están separados: las palmas llegan hasta la arena, las flores crecen a pocos pasos de la espuma. Esa mezcla es la fuente de buena parte de los accesorios que llamamos tropicales." },
        { type: "h3", text: "Lo marino" },
        { type: "p", text: "Conchas, caracoles, estrellas de mar, olas y tortugas son formas que casi todos reconocemos. Su fuerza está en lo simple: una espiral, cinco puntas, un caparazón. Son motivos que se entienden sin explicación." },
        { type: "h3", text: "Lo botánico" },
        { type: "p", text: "Las flores tropicales aportan color y movimiento: pétalos grandes, curvas suaves. Combinadas con lo marino, completan el paisaje completo, el que sentimos al pisar la playa con la selva detrás." },
        { type: "quote", text: "La mejor inspiración no se inventa: se mira. Un caracol, una ola, una flor en la acera." },
      ],
    },
    {
      id: "color-y-forma",
      title: "Colores y formas que vienen de la naturaleza",
      blocks: [
        { type: "p", text: "Los accesorios marinos más logrados suelen tomar la paleta de lo que evocan: celestes y turquesas del agua poco profunda, blancos y cremas de la espuma, dorados de la arena al atardecer, algún toque de coral o rosa que recuerda a las flores." },
        { type: "p", text: "En cuanto a las formas, las curvas mandan: espirales, óvalos, ondas. Un accesorio con silueta orgánica se lleva distinto a uno de líneas rectas; tiene algo más suave, más relajado, y combina bien con ropa sencilla." },
      ],
    },
    {
      id: "dia-a-dia",
      title: "Cómo llevarlos en el día a día",
      blocks: [
        { type: "p", text: "La inspiración marina no es solo para la playa. Estas ideas ayudan a incorporarla sin exagerar:" },
        {
          type: "bullets",
          items: [
            { lead: "Un motivo marino por conjunto.", text: "Una concha, una estrella o una tortuga: elige una y deja que la ropa haga de fondo." },
            { lead: "Colores que se repiten.", text: "Si el accesorio trae celeste, que alguna otra prenda lo repita. Se ve pensado, no casual." },
            { lead: "Mezcla lo marino con lo cotidiano.", text: "Un collar con dije de estrella sobre una camiseta blanca es tan natural en la ciudad como en la playa." },
            { lead: "Menos es más con lo llamativo.", text: "Cuanto más grande o colorido sea el accesorio, más tranquilo debe ser el conjunto." },
          ],
        },
        { type: "p", text: "Para la ropa, nuestra [Camiseta tortuga](/shop/camiseta-tortuga) lleva una tortuga con hibisco: un buen punto de partida si quieres sumar un motivo marino sin llenarte de accesorios." },
      ],
    },
    {
      id: "detalles",
      title: "Los pequeños detalles que cuentan tu personalidad",
      blocks: [
        { type: "p", text: "Un accesorio pequeño dice mucho: una pinza con forma de concha en el pelo, un brazalete con una estrella, un tatuaje temporal en el hombro. No hace falta un conjunto completo para expresar de dónde eres o qué te gusta." },
        { type: "p", text: "La personalidad se nota más en las elecciones pequeñas y repetidas que en una sola pieza grande. Quien usa casi siempre el mismo tipo de detalle, una concha, una estrella, una flor, termina teniendo un estilo reconocible sin proponérselo." },
      ],
    },
    {
      id: "regalos",
      title: "Ideas de regalo inspiradas en el Caribe",
      blocks: [
        { type: "p", text: "Regalar algo inspirado en el mar es regalar un pedazo de paisaje. Estas ideas funcionan para distintas personas y presupuestos:" },
        {
          type: "bullets",
          items: [
            { lead: "Para quien ama las joyas discretas:", text: "el [Collar Ocean Star](/shop/collar-ocean-star), con su dije de estrella de mar, o el [Mermaids Bracelet](/shop/mermaids-bracelet), con estrella y concha." },
            { lead: "Para un detalle pequeño:", text: "los [Imanes tropicales](/shop/imanes-tropicales), tres imanes inspirados en el Caribe, o los [Post-its Tortuguitas de Mar](/shop/post-its-tortuguitas-de-mar)." },
            { lead: "Para el hogar:", text: "el [Portavasos tortuguita](/shop/portavasos-tortuguita), tejido a crochet con forma de tortuga." },
            { lead: "Para algo único:", text: "[Un Pedacito de Mar](/shop/un-pedacito-de-mar), un cuadro artesanal de resina epóxica, pieza única." },
          ],
        },
      ],
    },
    {
      id: "piezas",
      title: "Piezas de Azul Clarito inspiradas en el mar",
      blocks: [
        { type: "p", text: "Estas son algunas piezas de la tienda. La descripción visual es la de su ficha." },
        {
          type: "models",
          items: [
            { slug: "collar-ocean-star", name: "Collar Ocean Star", visual: "Collar dorado · Dije de estrella de mar tornasol", text: "Una estrella de mar para llevar cerca. Es un collar que sirve igual con una camiseta blanca de diario que con un vestido para salir." },
            { slug: "mermaids-bracelet", name: "Mermaids Bracelet", visual: "Brazalete · Estrella y concha", text: "Dos motivos marinos en una sola pieza. Un buen ejemplo de cómo un detalle pequeño puede decir bastante." },
            { slug: "prensita-caracol-de-mar", name: "Prensita Caracol de Mar", visual: "Pinza para el cabello · Caracol nacarado", text: "Un caracol en el pelo: discreto, fácil de llevar y con el tono suave que combina con casi todo." },
            { slug: "tattoo-tropical", name: "Tattoo Tropical", visual: "Tattoo temporal · Estética oceánica minimalista", text: "Para quien quiere el motivo sin llevar nada puesto. Ideal para un día de playa o para probar un diseño sin compromiso." },
            { slug: "tutty-gorra", name: "Tutty Gorra", visual: "Gorra baby blue · Tortuga", text: "La tortuga, símbolo de la marca, en una gorra de tono baby blue. El protagonista de un look sencillo." },
          ],
        },
      ],
    },
    {
      id: "naturaleza",
      title: "Conectar tu estilo con la naturaleza",
      blocks: [
        { type: "p", text: "Llevar una concha o una tortuga como accesorio es, al final, una forma de decir que algo del mar te importa. No necesita más explicación que esa. En Azul Clarito, la tortuga marina con una flor tropical es el símbolo de la marca porque resume esa idea: lo marino y lo botánico, juntos." },
        { type: "p", text: "Si estás pensando en tu próximo accesorio, empieza por la pregunta más sencilla: ¿qué parte del paisaje te gustaría llevar contigo? A partir de ahí, el resto del conjunto se acomoda." },
      ],
    },
  ],
  cta: {
    title: "Lleva un pedacito de mar contigo",
    text: "Collares, pinzas, gorras, imanes y más piezas con inspiración marina y tropical, creadas desde Limón. Mira la tienda con calma y elige la que te cuente algo.",
    label: "Ver la tienda",
  },
  faq: [
    {
      question: "¿Qué son los accesorios inspirados en el mar?",
      answer: "Son piezas cuyo diseño parte de elementos marinos: conchas, caracoles, estrellas de mar, olas, tortugas y, a menudo, flores tropicales. Pueden ser joyas, accesorios para el cabello, gorras o bolsos.",
    },
    {
      question: "¿Cómo combinar accesorios marinos sin que parezca un disfraz?",
      answer: "Elige un solo motivo por conjunto, repite un tono de color y deja el resto de la ropa en tonos tranquilos. Menos accesorios, pero mejor escogidos.",
    },
    {
      question: "¿Qué puedo regalar con inspiración caribeña?",
      answer: "Un collar con dije marino, un brazalete, unos imanes, un portavasos con forma de tortuga o una pieza de arte. Todas están en la tienda de Azul Clarito.",
      link: { label: "Ir a la tienda", href: "/shop" },
    },
    {
      question: "¿Qué significa la tortuga con flor de Azul Clarito?",
      answer: "Es el símbolo principal de la marca, que nació en Limón, Costa Rica. Junta lo marino y lo botánico, las dos fuentes de inspiración de esta guía.",
    },
  ],
};
