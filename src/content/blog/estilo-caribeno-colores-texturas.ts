import { BLOG_AUTHOR, type BlogPost } from "@/domain/blog";

/**
 * Diario Azul: el estilo caribeño como expresión de lugar e identidad.
 * Regla editorial: evitar estereotipos y descripciones simplistas de la cultura caribeña; hablar de color, textura y actitud
 * sin afirmar materiales de productos concretos (las fichas no los especifican).
 * PENDIENTE: la portada es una ilustración provisional; puede reemplazarse por una foto editorial de producto.
 */
export const estiloCaribenoColoresTexturas: BlogPost = {
  slug: "estilo-caribeno-colores-texturas",
  title: "El estilo caribeño: colores, texturas y formas de expresión",
  subtitle: "Una mirada al estilo que nace del mar, la vegetación y la arquitectura del Caribe, y cómo llevarlo a lo cotidiano sin caer en el disfraz.",
  category: "Estilo y tendencias",
  date: "2026-11-27",
  author: BLOG_AUTHOR,
  metaTitle: "Estilo caribeño: colores, texturas y expresión | Azul Clarito",
  metaDescription: "Descubre el estilo caribeño: colores del mar y la vegetación, texturas, estampados y accesorios para llevar la inspiración del Caribe a tu día a día.",
  image: { src: "/blog/estilo-caribeno.webp", alt: "Ilustración de Azul Clarito en tonos rosa, celeste y aqua con un sol amarillo y olas sobre un fondo de color pastel", width: 1280, height: 720 },
  keywords: ["estilo caribeño", "moda caribeña", "estilo tropical", "colores tropicales", "inspiración caribeña", "accesorios tropicales"],
  intro: [
    "Si le preguntas a alguien por el estilo caribeño, es probable que escuches una lista: colores vivos, flores, palmeras. Todo eso existe, pero no explica nada. El estilo del Caribe se parece menos a un uniforme de vacaciones y más a una manera de relacionarse con el entorno: con la luz, con el clima, con la música y con la historia del lugar.",
    "En esta guía recorremos de dónde vienen los colores y las texturas, cómo se leen los estampados, por qué los accesorios importan tanto y cómo equilibrar un look cargado de personalidad. Si lo que buscas es ponerlo en práctica, te servirá después [Cómo elegir accesorios para un look tropical](/blog/como-elegir-accesorios-look-tropical).",
  ],
  sections: [
    {
      id: "lugar",
      title: "Un estilo que nace de un lugar",
      blocks: [
        { type: "p", text: "Cualquier estilo con identidad se explica por su entorno. En el Caribe, el mar, la humedad, el sol intenso, la vegetación y la arquitectura de madera pintada han influido durante generaciones en qué se viste, cómo se decora y cómo se celebra. No es una receta, es una consecuencia." },
        { type: "p", text: "Pensarlo así evita el error más común: tratar el Caribe como una estética genérica de playa. Hay un Caribe de cada lugar, y el de Limón tiene su propia historia, que combina el mar, las comunidades afrocaribeñas, la selva y el puerto. Si te interesa esa mirada, te cuento más en [Puerto Viejo, una guía para descubrir el Caribe Sur](/blog/puerto-viejo-costa-rica-guia)." },
        { type: "quote", text: "El estilo caribeño no se disfraza: se vive. Empieza en el lugar, no en la tendencia." },
      ],
    },
    {
      id: "colores",
      title: "Los colores: mar, vegetación y casas pintadas",
      blocks: [
        { type: "p", text: "La paleta caribeña no es un solo tono saturado. Es una conversación entre colores que se explican por lo que se ve afuera." },
        {
          type: "bullets",
          items: [
            { lead: "Azules y aguamarinas.", text: "El mar cambia de color según la hora y la profundidad: del celeste claro al turquesa y al azul profundo. Son la base de cualquier paleta marina." },
            { lead: "Verdes de selva.", text: "Hojas de monstera, palmeras y vegetación densa aportan verdes que van del fresco al profundo." },
            { lead: "Amarillos y arenas.", text: "La luz del sol y la arena pueden convertirse en un amarillo cálido o en un beige suave que equilibra los demás tonos." },
            { lead: "Rosas, corales y rojos.", text: "Atardeceres, flores tropicales y fachadas pintadas inspiran toques cálidos que dan vida a una paleta fría." },
          ],
        },
        { type: "p", text: "Los colores tropicales funcionan mejor cuando hay una jerarquía: uno protagonista, uno o dos de apoyo y un neutro que descanse la vista. Es la misma lógica que usa Azul Clarito en su identidad, con azules como base y toques de amarillo, rosa y coral." },
      ],
    },
    {
      id: "texturas",
      title: "Texturas: lo que se siente tanto como lo que se ve",
      blocks: [
        { type: "p", text: "Un look tropical se vuelve más interesante cuando se pueden percibir las superficies. Algunas combinaciones que suelen funcionar bien:" },
        {
          type: "list",
          items: [
            "Tejidos y crochet, por su aire artesanal, como el [Crop top Mermaids](/shop/crop-top-mermaids), de crochet y de inspiración marina.",
            "Telas ligeras y frescas, pensadas para el calor y la humedad.",
            "Acabados nacarados y brillos suaves que recuerdan a conchas y a la luz sobre el agua.",
            "Tonos naturales, como los del tote de estilo natural, que equilibran las piezas más coloridas.",
            "Detalles hechos a mano, que le dan personalidad a lo cotidiano.",
          ],
        },
      ],
    },
    {
      id: "estampados",
      title: "Estampados y patrones: contar sin gritar",
      blocks: [
        { type: "p", text: "Los estampados tropicales (hojas, flores, olas, animales marinos) pueden ser un acierto o un exceso. Todo depende de cómo se dosifican." },
        { type: "h3", text: "Una pieza, un estampado" },
        { type: "p", text: "Si la camiseta lleva un dibujo grande, como la [Camiseta tortuga](/shop/camiseta-tortuga), con una tortuga y un hibisco, deja el resto del conjunto más sereno. Dos protagonistas se restan atención." },
        { type: "h3", text: "Mezclar con intención" },
        { type: "p", text: "Si quieres combinar estampados, que compartan una paleta y que uno sea claramente más grande que el otro. Un patrón pequeño y uno grande dialogan mejor que dos del mismo tamaño." },
      ],
    },
    {
      id: "accesorios",
      title: "Accesorios: donde vive la personalidad",
      blocks: [
        { type: "p", text: "Un mismo conjunto de camiseta y short puede decir cosas muy distintas según lo que lo acompañe. Los accesorios son el lugar para contar quién eres sin tocar la ropa." },
        {
          type: "models",
          items: [
            { slug: "collar-ocean-star", name: "Collar Ocean Star", visual: "Collar dorado · Dije de estrella de mar tornasol", text: "Un collar dorado con estrella de mar tornasol, que convierte una camiseta lisa en un look con intención." },
            { slug: "aretes-monstera-deliciosa", name: "Aretes Monstera deliciosa", text: "Aretes con diseño de hoja de monstera, una referencia directa a la vegetación tropical." },
            { slug: "prensa-flor-de-mar", name: "Prensa Flor de Mar", visual: "Accesorio para el cabello · Flor tropical", text: "Una flor tropical como accesorio para el cabello: pequeña, práctica y fácil de combinar." },
            { slug: "tutty-gorra", name: "Tutty Gorra", visual: "Gorra baby blue · Tortuga", text: "La gorra baby blue con la tortuga de la marca, para llevar el símbolo de Azul Clarito en lo cotidiano." },
          ],
        },
        { type: "p", text: "Para ver más ideas de piezas con inspiración marina, mira [Accesorios inspirados en el mar](/blog/accesorios-inspirados-en-el-mar)." },
      ],
    },
    {
      id: "equilibrio",
      title: "Equilibrar color y sencillez",
      blocks: [
        { type: "p", text: "El riesgo de cualquier estilo con carácter es el exceso. Algunas reglas simples ayudan a que un look caribeño se vea natural." },
        {
          type: "tips",
          items: [
            { title: "Elige un protagonista", text: "Una pieza que cuente la historia y las demás, a su servicio." },
            { title: "Repite un color", text: "Si la gorra es azul, que otro elemento retome ese azul." },
            { title: "Suma un neutro", text: "Blanco, beige o arena descansan la vista y hacen que los colores brillen." },
            { title: "Quita antes de salir", text: "Si dudas entre cinco accesorios, quita uno o dos." },
          ],
        },
      ],
    },
    {
      id: "diario",
      title: "Tres looks caribeños para el día a día",
      blocks: [
        {
          type: "bullets",
          items: [
            { lead: "Mañana de playa.", text: "Camiseta blanca, short claro, gorra baby blue y un collar sencillo. Una paleta de azul y arena." },
            { lead: "Paseo por la ciudad.", text: "Camiseta de estampado grande, pantalón neutro, aretes de hoja tropical. El color se queda en la camiseta y en un detalle." },
            { lead: "Atardecer con amigos.", text: "Vestido o conjunto liso, una pinza de flor en el cabello y una pulsera marina. Pocas piezas, bien elegidas." },
          ],
        },
      ],
    },
    {
      id: "identidad",
      title: "Estilo, lugar e identidad",
      blocks: [
        { type: "p", text: "Al final, el estilo caribeño es una manera de conectar lo que llevas puesto con el lugar de donde vienes o con el que te inspira. No importa si vives frente al mar o a cientos de kilómetros: lo que cuenta es que lo que elijas tenga sentido para ti y no sea solo una tendencia." },
        { type: "p", text: "Esa es la idea detrás de Azul Clarito: llevar un pedacito del Caribe costarricense a la vida cotidiana. Puedes conocer más sobre la marca en [Azul Clarito: una marca entre el mar, la música y la creatividad](/blog/historia-de-azul-clarito)." },
      ],
    },
  ],
  cta: {
    title: "Encuentra la pieza que cuente tu historia",
    text: "Accesorios, ropa y detalles inspirados en el mar y en el Caribe costarricense. Mira la tienda y elige con calma.",
    label: "Ver la tienda",
  },
  faq: [
    {
      question: "¿Qué es el estilo caribeño?",
      answer: "Es una manera de vestir y decorar inspirada en el mar, la vegetación, la luz y la arquitectura del Caribe, y en las culturas que lo habitan. Se expresa en colores, texturas, estampados y accesorios, sin ser una receta única.",
    },
    {
      question: "¿Cómo combinar colores tropicales sin saturar?",
      answer: "Elige un color protagonista, uno o dos de apoyo y un neutro. Si llevas un estampado grande, mantén el resto del conjunto sobrio.",
    },
    {
      question: "¿Qué accesorios tropicales funcionan en el día a día?",
      answer: "Una gorra, un collar sencillo, aretes con motivos de hojas o una pinza para el cabello son piezas fáciles de combinar y que suman personalidad sin saturar.",
      link: { label: "Leer: Cómo elegir accesorios para un look tropical", href: "/blog/como-elegir-accesorios-look-tropical" },
    },
  ],
};
