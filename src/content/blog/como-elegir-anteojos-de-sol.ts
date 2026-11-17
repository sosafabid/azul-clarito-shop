import { BLOG_AUTHOR, type BlogPost } from "@/domain/blog";

/**
 * Primer artículo de Diario Azul.
 * Regla editorial: de los productos solo se afirma lo que dice su ficha (montura, lentes, silueta).
 * Nada de medidas, materiales, precios ni protección UV.
 */
export const comoElegirAnteojosDeSol: BlogPost = {
  slug: "como-elegir-anteojos-de-sol",
  title: "Cómo elegir anteojos de sol según tu estilo: 5 modelos para encontrar el tuyo",
  subtitle: "Una guía sin fórmulas rígidas para encontrar el par que se parece a tu manera de vestir, de moverte y de pasar los días de sol.",
  category: "Estilo de verano",
  date: "2026-11-17",
  author: BLOG_AUTHOR,
  metaTitle: "Cómo elegir anteojos de sol según tu estilo | Azul Clarito",
  metaDescription: "Descubre cómo elegir anteojos de sol según tu rostro y estilo. Explora cinco modelos de Azul Clarito y encuentra tu favorito.",
  image: { src: "/blog/anteojos-de-sol.webp", alt: "Varios anteojos de sol de Azul Clarito sobre una tela blanca, con plantas al fondo", width: 955, height: 518 },
  keywords: ["cómo elegir anteojos de sol", "lentes de sol mujer", "tipos de lentes según el rostro", "anteojos de sol Costa Rica"],
  intro: [
    "Unos anteojos de sol hacen más que proteger la vista del brillo: completan un look. Una misma camiseta cambia de carácter según la montura que la acompañe, y por eso cómo elegir anteojos de sol es, en el fondo, una pregunta sobre estilo antes que sobre tendencias.",
    "Esta guía parte de lo cotidiano. Primero, cuatro maneras de llevar unos lentes. Después, una orientación sencilla sobre las formas que suelen acompañar a cada tipo de rostro. Y al final, cinco modelos de Azul Clarito para que veas cómo se traduce todo eso en piezas reales, ya sea que busques lentes de sol de mujer o simplemente un par que se sienta tuyo.",
  ],
  sections: [
    {
      id: "estilos",
      title: "Cuatro maneras de llevar unos anteojos",
      blocks: [
        { type: "p", text: "Antes de mirar monturas, conviene preguntarse cómo te vistes la mayoría de los días. Casi siempre hay un estilo que predomina, y el par ideal suele ir en esa dirección." },
        {
          type: "styleGuide",
          items: [
            { name: "Minimalista", text: "Líneas limpias, colores sobrios y pocos adornos. Una montura oscura y de forma discreta se integra con casi todo y deja que la ropa sea la protagonista." },
            { name: "Clásico", text: "Formas que no pasan de moda y tonos fáciles de combinar. Es el estilo de quien busca un par para usar durante años, sin pensarlo demasiado cada mañana." },
            { name: "Creativo", text: "Siluetas grandes, lentes de color o monturas con carácter. Aquí los anteojos son la pieza que se nota, y está bien que así sea." },
            { name: "Relajado y tropical", text: "Tonos cálidos, colores de arena y un aire de playa y tarde larga. Son los anteojos que acompañan una camiseta suelta, el pelo con sal y ningún apuro." },
          ],
        },
      ],
    },
    {
      id: "rostro",
      title: "Tipos de lentes según el rostro: una guía orientativa",
      blocks: [
        { type: "p", text: "Una idea útil para empezar: la montura suele verse mejor cuando contrasta un poco con las líneas del rostro, no cuando las repite. Pero es solo una orientación. Lo que de verdad decide es cómo te sientes con ellos puestos, así que conviene probar varias formas." },
        {
          type: "faceGuide",
          items: [
            { shape: "Rostro redondo", text: "Las monturas con líneas más definidas, como las rectangulares o de esquinas marcadas, aportan contraste y dan una sensación de estructura." },
            { shape: "Rostro cuadrado", text: "Las formas ovaladas o de contornos suaves tienden a equilibrar la mandíbula marcada y a dar más ligereza al conjunto." },
            { shape: "Rostro ovalado", text: "Es el más flexible: casi cualquier forma funciona. Conviene cuidar la proporción, que la montura no sea ni diminuta ni desbordada respecto al rostro." },
            { shape: "Rostro en forma de corazón", text: "Las monturas ovaladas o de líneas suaves, sin demasiado peso en la parte superior, suelen resultar equilibradas con una frente más ancha y un mentón más fino." },
          ],
        },
        { type: "p", text: "Piensa en estas ideas como un punto de partida y no como una regla. Mucha gente elige justo lo contrario porque le gusta cómo se ve, y ese suele ser el mejor argumento." },
      ],
    },
    {
      id: "modelos",
      title: "Cinco modelos de Azul Clarito para encontrar el tuyo",
      blocks: [
        { type: "p", text: "Estos son cinco anteojos de sol de la tienda de Azul Clarito, desde Limón, Costa Rica. Cada uno apunta a un ánimo distinto; la descripción visual es la de su ficha." },
        {
          type: "models",
          items: [
            {
              slug: "midnight-coast",
              name: "Midnight Coast",
              visual: "Montura negra · Lentes oscuros · Silueta ovalada estrecha",
              text: "Minimalistas, modernos y con un toque retro. Su forma ovalada y alargada crea una silueta distintiva, y la montura negra mantiene un estilo fácil de combinar. Encajan con quien prefiere los detalles sutiles pero con carácter, y por su silueta estrecha vale la pena probarlos si te gustan las líneas discretas.",
            },
            {
              slug: "ocean-muse",
              name: "Ocean Muse",
              visual: "Montura negra · Lentes oscuros · Silueta oversized",
              text: "El par para quien quiere que los anteojos se noten. La silueta oversized les da presencia, mientras la montura negra y los lentes oscuros mantienen el conjunto sobrio. Un buen punto de partida para el estilo creativo.",
            },
            {
              slug: "purple-tide",
              name: "Purple Tide",
              visual: "Montura oscura · Lentes azules · Silueta rectangular",
              text: "Los lentes azules le dan un toque de color a una montura oscura y de silueta rectangular. Es una opción para quien quiere salirse de lo neutro sin irse a los extremos, y su forma de líneas definidas es una de las que mencionamos al hablar del rostro redondo.",
            },
            {
              slug: "sandy-glow",
              name: "Sandy Glow",
              visual: "Montura transparente champagne · Lentes café",
              text: "Inspirados en los tonos cálidos de la arena y la luz del Caribe. La montura champagne translúcida y los lentes café forman una combinación delicada y luminosa, pensada para quienes aman los accesorios neutros. El más cercano al estilo relajado y tropical.",
            },
            {
              slug: "sunset-tortoise",
              name: "Sunset Tortoise",
              visual: "Montura de plástico carey · Lentes café · Silueta rectangular",
              text: "El carey es un clásico que siempre vuelve. Aquí se combina con lentes café y una silueta rectangular, para un aire cálido que va bien tanto con looks sencillos como con prendas más trabajadas.",
            },
          ],
        },
      ],
    },
    {
      id: "consejos",
      title: "Tres consejos antes de comprar",
      blocks: [
        {
          type: "tips",
          items: [
            { title: "Comodidad y ajuste", text: "Unos anteojos bonitos que aprietan las sienes o resbalan por la nariz terminan guardados en un cajón. Al probarlos, mueve la cabeza, agáchate y mira hacia arriba: deberían quedarse en su lugar sin molestar. Si compras en línea, revisa bien las fotos y la descripción de la ficha." },
            { title: "Combinación con tu guardarropa", text: "Piensa en las prendas que más usas. Una montura neutra, como el negro, el carey o un tono champagne, se lleva con casi todo. Un color de lente más llamativo funciona mejor si el resto de tu ropa es sencillo." },
            { title: "Verificación de la protección UV", text: "El color o lo oscuro del lente no dice nada sobre la protección UV: no se nota a simple vista. Antes de comprar, revisa la ficha del producto o consúltalo con el vendedor. Si tienes dudas sobre alguno de nuestros modelos, escríbenos y te respondemos." },
          ],
        },
      ],
    },
  ],
  cta: {
    title: "Encuentra tu par en la tienda",
    text: "Mira los cinco modelos con calma, compara sus fichas y elige el que va con tu estilo. En la tienda también encontrarás otras piezas de Azul Clarito.",
    label: "Ver la tienda",
  },
  faq: [
    {
      question: "¿Qué tipo de lentes favorecen a una cara redonda?",
      answer:
        "Como orientación general, las monturas con líneas más definidas, como las rectangulares o de esquinas marcadas, aportan contraste con las curvas del rostro. En Azul Clarito, Purple Tide y Sunset Tortoise tienen silueta rectangular. Aun así, lo mejor es probarlos: la forma que te hace sentir cómodo y seguro es la correcta.",
    },
    {
      question: "¿Qué color de lentes combina con todo?",
      answer:
        "Los tonos oscuros y neutros, como el negro o el café, suelen ser los más fáciles de combinar con cualquier ropa. Entre nuestros modelos, Midnight Coast y Ocean Muse tienen lentes oscuros, y Sandy Glow y Sunset Tortoise tienen lentes café.",
    },
    {
      question: "¿Se pueden usar anteojos de sol todos los días?",
      answer:
        "Sí, es habitual llevarlos en los días de sol. Lo importante es que sean cómodos y que su protección UV esté verificada en la ficha o con el vendedor, porque el color del lente no la garantiza. Si tienes dudas sobre tu salud visual, lo más seguro es consultar con un profesional.",
    },
    {
      question: "¿Dónde comprar anteojos de sol en Costa Rica?",
      answer:
        "En Azul Clarito Shop, la tienda en línea de Azul Clarito, desde Limón, Costa Rica. Puedes ver los cinco modelos de esta guía, con su foto y su ficha, en shop.azulclaritocr.com/shop.",
    },
  ],
};
