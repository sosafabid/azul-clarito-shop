import { BLOG_AUTHOR, type BlogPost } from "@/domain/blog";

/**
 * Artículo 02 de Diario Azul.
 * Regla editorial: de cada producto solo se dice lo que dice su ficha en la tienda (verificado). Sin precios ni medidas.
 */
export const regalosParaMujer: BlogPost = {
  slug: "regalos-para-mujer-inspiracion-caribena",
  title: "Regalos para mujer: ideas con inspiración caribeña y detalles que cuentan una historia",
  subtitle: "Accesorios, decoración y pequeños detalles inspirados en el mar para regalar algo que de verdad signifique algo.",
  category: "Regalos con significado",
  date: "2026-11-17",
  author: BLOG_AUTHOR,
  metaTitle: "Regalos para mujer: ideas con inspiración caribeña",
  metaDescription: "Descubre regalos para mujer con inspiración caribeña: accesorios, decoración y pequeños detalles para sorprender con algo especial.",
  image: { src: "/blog/regalos-para-mujer.webp", alt: "Detalle de un cuadro artesanal de resina con olas, arena y conchas, junto a hojas de palma y flores secas", width: 1086, height: 611 },
  keywords: ["regalos para mujer", "ideas de regalos para mujer", "regalos originales", "regalos con significado", "accesorios inspirados en el mar"],
  modelCtaVerb: "Descubrir",
  intro: [
    "Hay regalos que se olvidan con el tiempo y otros que, por alguna razón, permanecen. A veces es una pieza que nos recuerda un lugar, un accesorio que se convierte en parte de nuestro estilo o un pequeño objeto que transforma un rincón de la casa.",
    "Elegir un regalo para una mujer no tiene que ser complicado. No siempre se trata de encontrar algo extraordinario o costoso, sino de descubrir un detalle que conecte con su personalidad, sus gustos y las cosas que disfruta.",
    "Si estás buscando regalos para mujer que se salgan un poco de lo convencional, aquí reunimos algunas ideas inspiradas en el mar, los colores tropicales y esa forma tan especial de disfrutar los pequeños placeres.",
  ],
  sections: [
    {
      id: "accesorios",
      title: "1. Para quien lleva el mar consigo: accesorios con personalidad",
      blocks: [
        { type: "p", text: "Hay personas que encuentran inspiración en el océano, incluso cuando están lejos de la playa. Para ellas, los accesorios con motivos marinos pueden ser una manera sutil de llevar un pedacito de ese universo a cualquier lugar." },
        { type: "p", text: "Las estrellas de mar, las conchas y los tonos tornasolados tienen una estética particular: evocan el movimiento del agua, la luz del sol y los colores que aparecen en la superficie del océano." },
        { type: "p", text: "En Azul Clarito encontramos dos opciones para quienes disfrutan de estos pequeños detalles:" },
        {
          type: "models",
          items: [
            { slug: "collar-ocean-star", name: "Collar Ocean Star", text: "Una pieza con dije de estrella de mar y detalles tornasol. Una opción para quienes disfrutan de los accesorios con inspiración marina y quieren incorporar ese estilo a sus combinaciones." },
            { slug: "mermaids-bracelet", name: "Mermaids Bracelet", text: "Un brazalete con detalles de estrella y concha, ideal para quienes sienten afinidad por los elementos del universo marino." },
          ],
        },
      ],
    },
    {
      id: "decoracion",
      title: "2. Para quien disfruta rodearse de cosas bonitas: decoración con inspiración marina",
      blocks: [
        { type: "p", text: "Un regalo también puede convertirse en parte de un espacio. Puede acompañar una mesa, darle personalidad a una habitación o convertirse en ese pequeño detalle que llama la atención cuando alguien visita la casa." },
        { type: "p", text: "La decoración inspirada en el mar tiene una cualidad especial: nos recuerda la naturaleza, los paisajes costeros y la tranquilidad de los días junto al agua." },
        { type: "p", text: "Si estás buscando un regalo para alguien que disfruta decorar sus espacios, estas piezas pueden ser una buena elección." },
        {
          type: "models",
          items: [
            { slug: "un-pedacito-de-mar", name: "Un Pedacito de Mar", text: "Una pieza de resina epóxica que captura una estética inspirada en el océano. Su nombre invita a imaginar esos pequeños fragmentos del paisaje marino que quisiéramos conservar." },
            { slug: "porta-vasos-memorias-de-mar", name: "Portavasos Memorias de Mar", text: "Un set de seis posavasos que lleva la inspiración marina a los momentos cotidianos. Porque incluso compartir un café puede convertirse en una experiencia especial cuando cuidamos los detalles." },
          ],
        },
      ],
    },
    {
      id: "detalles",
      title: "3. Para quien ama los detalles inesperados: pequeños regalos tropicales",
      blocks: [
        { type: "p", text: "No todos los regalos necesitan una ocasión especial. A veces, los detalles más memorables son aquellos que llegan sin aviso." },
        { type: "p", text: "Un objeto pequeño puede darle personalidad a un espacio, acompañar una rutina o simplemente sacar una sonrisa." },
        { type: "p", text: "Para quienes disfrutan de los elementos tropicales y los objetos con personalidad, estas son otras dos ideas:" },
        {
          type: "models",
          items: [
            { slug: "portavasos-tortuguita", name: "Portavasos Tortuguita", text: "Un posavasos tejido a crochet con forma de tortuga. Una alternativa diferente para quienes disfrutan de los detalles decorativos y los motivos inspirados en la naturaleza." },
            { slug: "imanes-tropicales", name: "Imanes Tropicales", text: "Tres diseños inspirados en la belleza tropical del Caribe. Se venden por unidad, y el diseño puede ser cualquiera de los tres. Un pequeño detalle para darle color y personalidad a superficies cotidianas." },
          ],
        },
      ],
    },
    {
      id: "como-elegir",
      title: "4. ¿Cómo elegir un regalo para mujer que realmente le guste?",
      blocks: [
        { type: "p", text: "Antes de comprar, vale la pena pensar un momento en la persona que recibirá el regalo. No se trata únicamente de elegir algo bonito, sino de encontrar algo que tenga sentido para ella." },
        { type: "p", text: "Estas preguntas pueden ayudarte:" },
        {
          type: "bullets",
          items: [
            { lead: "¿Qué disfruta hacer?", text: "Si le gusta decorar, una pieza para su espacio puede ser una buena opción. Si disfruta los accesorios, puedes buscar algo que complemente su estilo." },
            { lead: "¿Qué colores utiliza?", text: "Observar los tonos que suele llevar o incorporar a sus espacios puede darte pistas." },
            { lead: "¿Prefiere objetos prácticos o decorativos?", text: "Algunas personas disfrutan los objetos que utilizan todos los días; otras prefieren piezas que simplemente les alegren la vista." },
            { lead: "¿Qué detalles la representan?", text: "El mar, los animales, la naturaleza, los colores o ciertos símbolos pueden ayudarte a encontrar algo más personal." },
          ],
        },
        { type: "p", text: "Un buen regalo no tiene que ser complicado. A veces, basta con demostrar que prestaste atención." },
      ],
    },
    {
      id: "inspiracion",
      title: "5. Regalar también es compartir un pedacito de lo que nos inspira",
      blocks: [
        { type: "p", text: "En Azul Clarito nos gusta pensar que los objetos pueden conectar con recuerdos, lugares y emociones." },
        { type: "p", text: "Nuestra inspiración nace de una relación especial con el Caribe: sus colores, sus paisajes, su naturaleza y esa manera de encontrar belleza en las cosas sencillas." },
        { type: "p", text: "Por eso, nuestra selección reúne accesorios, objetos decorativos y pequeños detalles que pueden convertirse en regalos para distintas personalidades y ocasiones." },
      ],
    },
  ],
  cta: {
    title: "Descubre Azul Clarito Shop",
    text: "Si buscas algo diferente, te invitamos a explorar nuestra colección.",
    label: "Explorar todos los productos",
  },
  faq: [
    {
      question: "¿Qué regalarle a una mujer que tiene de todo?",
      answer: "Puedes optar por un detalle diferente, como un accesorio con un diseño particular, una pieza decorativa o un objeto que conecte con alguno de sus intereses. La originalidad y la intención pueden hacer que un regalo pequeño resulte memorable.",
    },
    {
      question: "¿Cuáles son algunas ideas de regalos originales para mujer?",
      answer: "Los accesorios, la decoración inspirada en la naturaleza, los objetos con motivos marinos y los pequeños detalles tropicales son alternativas para salir de los regalos tradicionales.",
    },
    {
      question: "¿Qué regalarle a una mujer que ama el mar?",
      answer: "Puedes considerar accesorios con estrellas de mar y conchas, decoración inspirada en el océano o pequeños objetos que evoquen los paisajes costeros.",
    },
    {
      question: "¿Dónde encontrar regalos diferentes en Costa Rica?",
      answer: "Puedes explorar tiendas en línea que reúnan accesorios, decoración y objetos con propuestas creativas. En Azul Clarito Shop encontrarás una selección de productos con inspiración caribeña.",
      link: { label: "Visitar Azul Clarito Shop", href: "/shop" },
    },
  ],
};
