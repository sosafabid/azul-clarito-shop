import { BLOG_AUTHOR, type BlogPost } from "@/domain/blog";

/**
 * Diario Azul: guía de regalos con productos reales de la tienda.
 * Regla editorial: sin precios, descuentos, paquetes ni disponibilidad inventados (la disponibilidad y el precio los muestra la ficha de cada producto).
 * La tienda no tiene música como producto, por eso la sección de música y creatividad se apoya en libros, cuadernos y arte.
 */
export const regalosOriginalesInspiradosEnElCaribe: BlogPost = {
  slug: "regalos-originales-inspirados-en-el-caribe",
  title: "Regalos originales inspirados en el Caribe",
  subtitle: "Ideas para sorprender a quien ama el mar, los accesorios, la naturaleza, la creatividad o sus raíces, con piezas reales de la tienda de Azul Clarito.",
  category: "Regalos",
  date: "2026-11-27",
  author: BLOG_AUTHOR,
  metaTitle: "Regalos originales inspirados en el Caribe | Azul Clarito",
  metaDescription: "Ideas de regalos originales inspirados en el mar y el Caribe: para quien ama la playa, los accesorios, la naturaleza, la creatividad y las raíces caribeñas.",
  image: { src: "/blog/regalos-originales.webp", alt: "Libros de poesía de Azul Clarito junto a flores secas y hojas tropicales sobre un fondo cálido", width: 1020, height: 573 },
  keywords: ["regalos originales", "regalos inspirados en el mar", "regalos tropicales", "regalos originales Costa Rica", "accesorios para regalar", "ideas de regalos diferentes"],
  intro: [
    "Regalar bien no depende del presupuesto, depende de la atención. Un regalo se recuerda cuando alguien nota que pensaste en esa persona: en lo que le gusta, en cómo es y en lo que cuenta de ella. Y por eso los regalos que vienen con una historia, como los que nacen del mar y del Caribe, suelen quedar mejor que los objetos genéricos.",
    "Esta guía organiza ideas según el tipo de persona a la que quieras sorprender: quien ama la playa, quien vive de accesorios, quien aprecia los pequeños detalles, quien se siente cerca de la naturaleza, quien crea y quien lleva el Caribe en la identidad. Todos los productos mencionados existen en la tienda; precios y disponibilidad los encuentras en la ficha de cada uno.",
  ],
  sections: [
    {
      id: "playa",
      title: "Para quien ama la playa",
      blocks: [
        { type: "p", text: "Hay personas para quienes un fin de semana perfecto es el que termina con arena en los zapatos. Para ellas, lo ideal son piezas que acompañen un día de sol y se sientan parte del plan." },
        {
          type: "models",
          items: [
            { slug: "tutty-gorra", name: "Tutty Gorra", visual: "Gorra baby blue · Tortuga", text: "Una gorra baby blue con la tortuga de la marca. Un regalo útil y con identidad." },
            { slug: "tuttytote", name: "TUTTYTOTE", visual: "Tote bag natural · Tortuguita", text: "Un tote de estilo natural con la tortuguita de Azul Clarito, ideal para llevar lo necesario a la playa." },
            { slug: "sandy-glow", name: "Sandy Glow", visual: "Montura transparente champagne · Lentes café", text: "Anteojos de montura transparente champagne y lentes café, con un aire cálido y relajado." },
          ],
        },
        { type: "p", text: "Para elegir con más criterio, puedes apoyarte en [Qué llevar a la playa](/blog/que-llevar-a-la-playa) y en [Cómo elegir anteojos de sol según tu estilo](/blog/como-elegir-anteojos-de-sol)." },
      ],
    },
    {
      id: "accesorios",
      title: "Para quien disfruta los accesorios",
      blocks: [
        { type: "p", text: "A quien vive de detalles le encanta un collar, un par de aretes o una pinza que le dé el toque final a su look." },
        {
          type: "models",
          items: [
            { slug: "collar-ocean-star", name: "Collar Ocean Star", visual: "Collar dorado · Dije de estrella de mar tornasol", text: "Un collar dorado con un dije de estrella de mar tornasol. Elegante y marino." },
            { slug: "aretes-monstera-deliciosa", name: "Aretes Monstera deliciosa", text: "Aretes con diseño de hoja de monstera, para quien ama las plantas y el trópico." },
            { slug: "mermaids-bracelet", name: "Mermaids Bracelet", visual: "Brazalete · Estrella y concha", text: "Un brazalete con estrella y concha, un regalo delicado para llevar todos los días." },
          ],
        },
        { type: "p", text: "Si quieres más ideas para combinarlos, en [Accesorios inspirados en el mar](/blog/accesorios-inspirados-en-el-mar) hay otros caminos." },
      ],
    },
    {
      id: "detalles",
      title: "Pequeños detalles para regalar",
      blocks: [
        { type: "p", text: "A veces el mejor regalo es el que cabe en la mano. Los detalles pequeños funcionan para cumpleaños, agradecimientos, intercambios o simplemente para decir «pensé en ti»." },
        {
          type: "models",
          items: [
            { slug: "prensita-conchita-de-mar", name: "Prensita Conchita de Mar", visual: "Pinza para el cabello · Concha nacarada", text: "Una pinza con forma de concha. Pequeña, práctica y bonita." },
            { slug: "imanes-tropicales", name: "Imanes tropicales", text: "Un set de imanes con tres diseños inspirados en el paisaje tropical del Caribe." },
            { slug: "post-its-tortuguitas-de-mar", name: "Post-its Tortuguitas de Mar", text: "Notas adhesivas con tortuguitas, olas y corales en tonos pastel." },
            { slug: "tattoo-tropical", name: "Tattoo Tropical", visual: "Tattoo temporal · Estética oceánica minimalista", text: "Un tatuaje temporal de estética oceánica, para quien le gusta experimentar sin compromiso." },
          ],
        },
      ],
    },
    {
      id: "naturaleza",
      title: "Para quien se inspira en la naturaleza",
      blocks: [
        { type: "p", text: "Hay quienes se sienten en casa entre plantas, conchas y paisajes. Para ellos, un objeto que recuerde la naturaleza tiene un valor especial." },
        {
          type: "models",
          items: [
            { slug: "un-pedacito-de-mar", name: "Un Pedacito de Mar", text: "Una obra de resina epóxica hecha a mano, una pieza única inspirada en el mar." },
            { slug: "portavasos-tortuguita", name: "Portavasos tortuguita", text: "Un portavasos tejido en crochet con forma de tortuga. Un detalle para el hogar con mucha personalidad." },
            { slug: "set-de-portavasos-mosaico-marino", name: "Set de Portavasos Mosaico Marino", text: "Un set de cuatro portavasos con un mosaico floral en tonos turquesa y nacarados." },
          ],
        },
      ],
    },
    {
      id: "creatividad",
      title: "Para quien ama la música y la creatividad",
      blocks: [
        { type: "p", text: "La música y la creatividad viven en la manera de ver el mundo. Aunque la tienda no incluye música como producto, sí tiene piezas que invitan a escribir, leer y soñar." },
        {
          type: "models",
          items: [
            { slug: "cuaderno-atardecer-de-mar", name: "Cuaderno Atardecer de Mar", text: "Un cuaderno de espiral con una escena de playa, olas turquesa y un atardecer rosado. Ideal para letras, ideas o diarios." },
            { slug: "cuaderno-seashell-vintage", name: "Cuaderno Seashell Vintage", text: "Un cuaderno de espiral con portada dorada y una ilustración vintage de una concha azul." },
            { slug: "romanticismo-cuantico", name: "Romanticismo cuántico", text: "Una obra poética digital que conecta la ciencia, el amor y la conciencia." },
          ],
        },
        { type: "p", text: "Si quieres entender el vínculo entre el mar, la música y la creatividad, lee [Azul Clarito: una marca que nace entre el mar, la música y la creatividad](/blog/historia-de-azul-clarito)." },
      ],
    },
    {
      id: "identidad",
      title: "Para quien lleva el Caribe en la identidad",
      blocks: [
        { type: "p", text: "Hay personas que, vivan donde vivan, llevan el Caribe consigo. Para ellas, un regalo con raíces significa más que uno con estilo." },
        {
          type: "models",
          items: [
            { slug: "camiseta-azul-clarito", name: "Camiseta Azul Clarito", text: "La camiseta oficial de la marca, inspirada en el Caribe." },
            { slug: "camiseta-tortuga", name: "Camiseta tortuga", text: "Una camiseta con una tortuga y un hibisco, los dos símbolos de la marca." },
          ],
        },
        { type: "p", text: "Y si lo que quieres es conocer el lugar que inspira todo esto, te invitamos a leer [Puerto Viejo, Costa Rica: una guía para descubrir el Caribe Sur](/blog/puerto-viejo-costa-rica-guia)." },
      ],
    },
    {
      id: "consejos",
      title: "Cómo elegir con confianza",
      blocks: [
        {
          type: "tips",
          items: [
            { title: "Piensa en su día a día", text: "El mejor regalo es el que se usa o se mira con frecuencia." },
            { title: "Elige una sola pieza con intención", text: "Mejor un detalle bien pensado que varios sin relación." },
            { title: "Revisa la ficha", text: "Cada producto muestra su descripción, sus opciones y su disponibilidad." },
          ],
        },
      ],
    },
  ],
  cta: {
    title: "Encuentra el regalo que cuente algo",
    text: "Mira con calma la tienda de Azul Clarito, donde cada pieza lleva un pedacito de mar. Cada ficha muestra su precio y disponibilidad.",
    label: "Explorar la tienda",
  },
  faq: [
    {
      question: "¿Qué regalos originales hay inspirados en el Caribe?",
      answer: "Accesorios con motivos marinos, gorras, bolsos, cuadernos, libros, piezas hechas a mano y camisetas de Azul Clarito son algunas opciones. Todas están en la tienda.",
    },
    {
      question: "¿Cómo elijo un regalo si no conozco bien los gustos de la persona?",
      answer: "Elige algo versátil y sencillo, como un accesorio pequeño, un cuaderno o un detalle que se pueda usar o exhibir con facilidad.",
    },
    {
      question: "¿Dónde veo el precio y la disponibilidad de cada producto?",
      answer: "En la ficha de cada producto de la tienda. Allí también están sus opciones y su descripción completa.",
      link: { label: "Leer: Accesorios inspirados en el mar", href: "/blog/accesorios-inspirados-en-el-mar" },
    },
  ],
};
