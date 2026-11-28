import { BLOG_AUTHOR, type BlogPost } from "@/domain/blog";

/**
 * Diario Azul: guía para elegir y combinar gorras.
 * Regla editorial: sin materiales, tallas ni características técnicas inventadas; las fichas de las gorras solo confirman color y diseño.
 * Los consejos de ajuste y cuidado son generales, e invitan a seguir las indicaciones de cada prenda.
 * PENDIENTE: la portada es una ilustración provisional; conviene sustituirla por una foto real de la Tutty Gorra.
 */
export const comoElegirUnaGorra: BlogPost = {
  slug: "como-elegir-una-gorra",
  title: "Cómo elegir una gorra para complementar tu estilo",
  subtitle: "Siluetas, ajuste, color y combinaciones para que la gorra deje de ser un accesorio olvidado y se convierta en la pieza que cierra tu look.",
  category: "Estilo y tendencias",
  date: "2026-11-27",
  author: BLOG_AUTHOR,
  metaTitle: "Cómo elegir una gorra y combinarla con tu estilo | Azul Clarito",
  metaDescription: "Cómo elegir una gorra: siluetas, ajuste, colores y combinaciones para looks casuales y tropicales. Ideas para la playa, cuidado y gorras de Azul Clarito.",
  image: { src: "/blog/gorra.webp", alt: "Ilustración de Azul Clarito sobre fondo azul marino con un sol amarillo y olas en tonos aqua, celeste y arena", width: 1280, height: 720 },
  keywords: ["cómo elegir una gorra", "gorras para mujer", "cómo combinar gorras", "gorras casuales", "accesorios para complementar un look", "estilo urbano y tropical"],
  intro: [
    "Hay accesorios que se compran con ilusión y se olvidan en un cajón. Con la gorra pasa a menudo: el día que la eliges bien, se vuelve la pieza que usas sin pensar; cuando no, termina colgada de un perchero. La diferencia casi nunca está en la moda del momento sino en tres cosas muy concretas: cómo te queda, qué color lleva y con qué la combinas.",
    "Esta guía es un recorrido práctico para elegir una gorra que se sienta tuya, para combinarla con looks casuales o tropicales, para llevarla en un día de playa y para cuidarla. Sin recetas rígidas: un gorra es, sobre todo, una forma sencilla de decir algo sobre tu estilo.",
  ],
  sections: [
    {
      id: "silueta",
      title: "Las siluetas más comunes",
      blocks: [
        { type: "p", text: "Antes de pensar en el diseño, conviene entender la forma. La silueta marca la actitud de la gorra y cómo se acomoda a tu rostro." },
        {
          type: "styleGuide",
          items: [
            { name: "Gorra de visera curva", text: "La más versátil y habitual. Se adapta a casi cualquier look casual y suele resultar cómoda para el día a día." },
            { name: "Gorra de visera plana", text: "Más urbana y marcada. Funciona bien con un estilo más gráfico o de calle." },
            { name: "Gorra tipo dad hat", text: "De perfil suave y relajado, con una copa más baja. Da un aire natural y sin esfuerzo." },
            { name: "Gorra de camionero", text: "Con la parte trasera de malla. Es un estilo con carácter, más retro y deportivo." },
          ],
        },
        { type: "p", text: "Si no sabes por dónde empezar, una visera curva y un tono suave suelen ser un acierto seguro." },
      ],
    },
    {
      id: "ajuste",
      title: "Ajuste y comodidad",
      blocks: [
        { type: "p", text: "Una gorra bonita que aprieta o se resbala se queda en casa. Antes de decidir, pruébala con calma y fíjate en estos puntos:" },
        {
          type: "list",
          items: [
            "Que no te apriete la frente ni deje marca después de unos minutos.",
            "Que no se mueva con el viento ni cuando agachas la cabeza.",
            "Que la visera te dé sombra sin tapar la visión.",
            "Que se sienta bien con tu peinado habitual, ya sea suelto, con cola o con trenzas.",
            "Si tiene cierre o ajuste, que puedas regularlo con facilidad.",
          ],
        },
        { type: "p", text: "Cada gorra es distinta; revisa la información de la tienda o del fabricante antes de comprar, sobre todo en lo que se refiere a tallas y ajuste." },
      ],
    },
    {
      id: "color",
      title: "Cómo elegir el color",
      blocks: [
        { type: "p", text: "El color de la gorra define cuánto protagonismo tendrá en tu look. Hay tres caminos sencillos." },
        { type: "h3", text: "El neutro que va con todo" },
        { type: "p", text: "Negro, blanco, beige o gris combinan con casi cualquier ropa. Son una buena opción si quieres una gorra para usar a diario." },
        { type: "h3", text: "El tono suave" },
        { type: "p", text: "Un azul claro, un celeste o un tono pastel aportan color sin gritar. La [Tutty Gorra](/shop/tutty-gorra), de tono baby blue y con la tortuga de Azul Clarito, es un buen ejemplo: combina con blancos, arenas, denim y casi cualquier prenda lisa." },
        { type: "h3", text: "El color como protagonista" },
        { type: "p", text: "Si eliges una gorra de color vivo o con un diseño llamativo, deja que sea la pieza principal y mantén el resto del conjunto más sobrio." },
        { type: "quote", text: "Una gorra no tiene que combinar con todo, solo tiene que tener sentido con una o dos cosas que ya usas." },
      ],
    },
    {
      id: "combinar",
      title: "Cómo combinar una gorra con tu look",
      blocks: [
        { type: "h3", text: "Look casual de todos los días" },
        { type: "p", text: "Camiseta lisa, jeans o short y tenis o sandalias. La gorra sustituye al accesorio que normalmente faltaría y le da identidad al conjunto." },
        { type: "h3", text: "Look tropical" },
        { type: "p", text: "Una camiseta blanca o en tono arena, un short ligero y una gorra de color suave. Si usas un diseño con motivos marinos, como la tortuga de la Tutty Gorra o la ballena de la [Gorra Azul Clarito – Whale](/shop/gorra-azul-clarito-whale), deja que sea la pieza principal y evita sumar más estampados." },
        { type: "h3", text: "Estilo urbano y tropical" },
        { type: "p", text: "Es una combinación muy actual: una pieza de aire urbano, como una gorra o unos tenis, junto con detalles de inspiración marina, como un collar o una pinza. Si te interesa el tema, en [El estilo caribeño: colores, texturas y formas de expresión](/blog/estilo-caribeno-colores-texturas) profundizamos en cómo equilibrarlos." },
      ],
    },
    {
      id: "playa",
      title: "Gorras para la playa y el día a día",
      blocks: [
        { type: "p", text: "La gorra es una de las piezas más útiles de un día de sol: aporta sombra a la cara, mantiene el cabello en su sitio y es fácil de llevar. Para un día largo, combínala con unos lentes oscuros; si estás por elegir unos, esta [guía de anteojos de sol](/blog/como-elegir-anteojos-de-sol) puede ayudarte." },
        { type: "p", text: "Y si estás organizando una salida de playa, tu bolso, tu agua y tu protector también cuentan: lo explicamos en [Qué llevar a la playa](/blog/que-llevar-a-la-playa)." },
      ],
    },
    {
      id: "modelos",
      title: "Gorras de Azul Clarito",
      blocks: [
        { type: "p", text: "Estas son las gorras de la tienda. Las descripciones son las de sus fichas; consulta cada una para ver los detalles de ajuste y tallas." },
        {
          type: "models",
          items: [
            { slug: "tutty-gorra", name: "Tutty Gorra", visual: "Gorra baby blue · Tortuga", text: "La tortuga, símbolo de la marca, sobre un tono baby blue. Una gorra sencilla y fácil de combinar para un día de sol." },
            { slug: "gorra-azul-clarito-whale", name: "Gorra Azul Clarito – Whale", visual: "Gorra · Diseño de ballena", text: "Una gorra con una ballena como protagonista: una opción con carácter marino para un look sencillo." },
          ],
        },
      ],
    },
    {
      id: "cuidado",
      title: "Cómo cuidar tu gorra",
      blocks: [
        { type: "p", text: "Una gorra bien cuidada dura más y se ve mejor. Estos consejos son generales; si tu gorra trae etiqueta con instrucciones, síguelas." },
        {
          type: "bullets",
          items: [
            { lead: "Revisa la etiqueta.", text: "Es la mejor guía para saber si se puede lavar a mano o a máquina." },
            { lead: "Lava con suavidad.", text: "Si la etiqueta lo permite, usa agua fría y un jabón suave, sin frotar con fuerza el diseño." },
            { lead: "Sécala a la sombra.", text: "El sol directo y el calor excesivo pueden desgastar los colores y deformar la visera." },
            { lead: "Guárdala bien.", text: "Cuélgala o déjala sobre una superficie, sin aplastar la visera dentro de un bolso." },
            { lead: "Sudor y sal.", text: "Después de la playa, déjala secar al aire y limpia con un paño húmedo si hace falta." },
          ],
        },
      ],
    },
    {
      id: "detalle",
      title: "Un detalle pequeño que cambia el conjunto",
      blocks: [
        { type: "p", text: "Probablemente no llevas la gorra todos los días, pero cuando la llevas hace que un conjunto simple parezca pensado. Elegirla bien es, en el fondo, elegir con qué actitud quieres salir." },
      ],
    },
  ],
  cta: {
    title: "Encuentra la gorra que cuente tu historia",
    text: "Dos gorras con inspiración marina, creadas desde Limón. Mira la tienda y elige la que te acompañe en tu próximo día de sol.",
    label: "Ver gorras en la tienda",
  },
  faq: [
    {
      question: "¿Cómo elijo una gorra que me quede bien?",
      answer: "Fíjate en que no apriete la frente, que no se mueva con el viento y que la visera dé sombra sin tapar la vista. Pruébala con tu peinado habitual y revisa la información de ajuste antes de comprar.",
    },
    {
      question: "¿Con qué combino una gorra de color claro?",
      answer: "Con prendas lisas y neutros como blanco, arena, denim o negro. Una gorra baby blue, por ejemplo, funciona bien con casi cualquier camiseta lisa.",
    },
    {
      question: "¿Cómo cuido una gorra?",
      answer: "Sigue la etiqueta, lava con suavidad, sécala a la sombra y guárdala sin aplastar la visera. Después de la playa, déjala secar al aire.",
      link: { label: "Leer: Qué llevar a la playa", href: "/blog/que-llevar-a-la-playa" },
    },
  ],
};
