import { BLOG_AUTHOR, type BlogPost } from "@/domain/blog";

/**
 * Diario Azul: identidad y posicionamiento de la marca.
 * Regla editorial: solo información respaldada por el contexto de marca y el sitio. Sin fecha de fundación, biografías,
 * procesos de fabricación, impacto social ni historia de empresa inventados.
 */
export const historiaDeAzulClarito: BlogPost = {
  slug: "historia-de-azul-clarito",
  title: "Azul Clarito: una marca que nace entre el mar, la música y la creatividad",
  subtitle: "Un recorrido por el universo de Azul Clarito: su relación con el Caribe de Limón, la tortuga con flor tropical, las canciones y los objetos que llevan un pedacito de mar a la vida cotidiana.",
  category: "Universo Azul Clarito",
  date: "2026-11-27",
  author: BLOG_AUTHOR,
  metaTitle: "Azul Clarito: marca caribeña entre el mar y la música",
  metaDescription: "Conoce Azul Clarito, proyecto artístico y de estilo de vida nacido en Limón, Costa Rica: mar, música, poesía, arte y productos inspirados en el Caribe.",
  image: { src: "/blog/historia-de-azul-clarito.webp", alt: "Logo de Azul Clarito: tortuga marina con una flor de hibisco en la cabeza, un sol y olas celestes junto al nombre de la marca", width: 1280, height: 720 },
  keywords: ["Azul Clarito", "Azul Clarito Shop", "tienda online Costa Rica", "marca caribeña", "estilo de vida caribeño", "productos inspirados en el Caribe"],
  intro: [
    "Algunas marcas empiezan con un producto. Azul Clarito empieza con un lugar y una sensación: el Caribe de Limón, Costa Rica, el sonido del mar, la luz de la tarde y las ganas de convertir todo eso en canciones, poemas, dibujos y objetos. Primero viene la atmósfera; después, las cosas que permiten llevarla contigo.",
    "En este artículo no vas a encontrar una cronología ni una ficha de empresa. Es una forma de presentar el universo de Azul Clarito: qué lo inspira, cómo se ve, qué tipo de cosas lo forman y por qué su tienda se entiende mejor como una extensión del proyecto que como un catálogo.",
  ],
  sections: [
    {
      id: "origen",
      title: "Un proyecto que nace en Limón",
      blocks: [
        { type: "p", text: "Azul Clarito es un proyecto artístico y de estilo de vida que nace en Limón, Costa Rica. Combina música, poesía, arte, naturaleza y la vida junto al océano, con una identidad cálida, alegre, libre y cercana." },
        { type: "p", text: "Esa raíz no es decorativa. El Caribe costarricense, con su mar, su vegetación y su cultura, es el punto de partida de todo lo que la marca imagina, desde una canción hasta una camiseta. Si quieres conocer más de esa región, hemos escrito una guía de [Puerto Viejo y el Caribe Sur](/blog/puerto-viejo-costa-rica-guia)." },
        { type: "quote", text: "Entre ciencia, mar y canciones: la idea que une todo lo que hace Azul Clarito." },
      ],
    },
    {
      id: "simbolo",
      title: "La tortuga con flor tropical",
      blocks: [
        { type: "p", text: "El símbolo principal de la marca es una tortuga marina con una flor tropical. Reúne dos ideas: la calma de quien avanza sin prisa por el mar y la belleza de la naturaleza del trópico." },
        { type: "p", text: "La tortuga aparece en distintas piezas de la tienda, como la [Tutty Gorra](/shop/tutty-gorra), el [TUTTYTOTE](/shop/tuttytote) o la [Camiseta tortuga](/shop/camiseta-tortuga), que la combina con un hibisco. Es la forma más directa de reconocer el universo de Azul Clarito." },
      ],
    },
    {
      id: "identidad-visual",
      title: "Una identidad visual que se parece al lugar",
      blocks: [
        { type: "p", text: "La paleta de Azul Clarito se inspira en lo que se ve desde la costa: azul marino y celeste para el mar, aqua para el agua clara, amarillo para el sol, rosa y coral para el atardecer y beige para la arena." },
        {
          type: "bullets",
          items: [
            { lead: "Formas orgánicas.", text: "Ondas, olas, sol y flores tropicales, con líneas suaves que recuerdan a la naturaleza." },
            { lead: "Ilustraciones hechas con calidez.", text: "Dibujos limpios y alegres, de aire artesanal, con contornos azul marino gruesos y redondeados." },
            { lead: "Color con intención.", text: "Una paleta reconocible, sin saturación, que busca transmitir sol, mar y buenas vibras." },
          ],
        },
        { type: "p", text: "Si te interesa cómo se traduce esa identidad en la manera de vestir, lee [El estilo caribeño: colores, texturas y formas de expresión](/blog/estilo-caribeno-colores-texturas)." },
      ],
    },
    {
      id: "universo",
      title: "Música, poesía, arte y objetos",
      blocks: [
        { type: "p", text: "Azul Clarito no es solo una tienda. El sitio de la marca reúne su historia, su música, sus libros, sus videos, sus proyectos, sus redes y su espacio de colaboraciones, y el Shop es una parte de ese conjunto." },
        { type: "h3", text: "Las palabras" },
        { type: "p", text: "La poesía tiene un lugar propio. En la tienda hay obras como [Romanticismo cuántico](/shop/romanticismo-cuantico), que conecta ciencia, amor y conciencia, y otros libros de poesía en formato digital." },
        { type: "h3", text: "Los objetos" },
        { type: "p", text: "De ahí surgen piezas que permiten llevar el espíritu de la marca a lo cotidiano: accesorios, anteojos, gorras, bolsos, cuadernos, objetos para el hogar y piezas de arte hechas a mano, como [Un Pedacito de Mar](/shop/un-pedacito-de-mar)." },
        { type: "h3", text: "Las canciones" },
        { type: "p", text: "La música es parte de la identidad de Azul Clarito. Está en el sitio de la marca, y es la raíz de la frase que resume el universo: entre ciencia, mar y canciones." },
      ],
    },
    {
      id: "diferente",
      title: "Lo que distingue a Azul Clarito de una tienda convencional",
      blocks: [
        { type: "p", text: "Una tienda convencional empieza con productos y busca compradores. Azul Clarito empieza con un universo y ofrece objetos para entrar en él." },
        {
          type: "list",
          items: [
            "Primero la atmósfera, después los objetos: la tienda complementa la identidad artística y no la domina.",
            "Cada pieza intenta contar algo del Caribe, del mar o de la creatividad, en lugar de ser un artículo genérico «tropical».",
            "El contenido, como este Diario, la música y los libros, forma parte de la experiencia, no es un adorno.",
            "El objetivo es conectar y crear comunidad, además de vender.",
          ],
        },
        { type: "p", text: "Por eso, quien llega al sitio puede encontrar primero un poema, una canción o una guía y después una gorra; o al revés. En ambos casos, la idea es la misma." },
      ],
    },
    {
      id: "pedacito",
      title: "Un pedacito del Caribe en lo cotidiano",
      blocks: [
        { type: "p", text: "La promesa de Azul Clarito es sencilla: que puedas llevar algo del mar y del Caribe costarricense en tu día a día, sea una libreta junto a tu escritorio, un collar o una gorra para un día de sol." },
        { type: "p", text: "Si estás explorando por dónde empezar, estas guías pueden ayudarte: [Accesorios inspirados en el mar](/blog/accesorios-inspirados-en-el-mar), [Regalos originales inspirados en el Caribe](/blog/regalos-originales-inspirados-en-el-caribe) o [Cómo elegir una gorra](/blog/como-elegir-una-gorra)." },
      ],
    },
    {
      id: "piezas",
      title: "Piezas para empezar a conocer el universo",
      blocks: [
        {
          type: "models",
          items: [
            { slug: "tutty-gorra", name: "Tutty Gorra", visual: "Gorra baby blue · Tortuga", text: "La tortuga de la marca en una gorra baby blue." },
            { slug: "camiseta-azul-clarito", name: "Camiseta Azul Clarito", text: "La camiseta oficial de la marca, inspirada en el Caribe." },
            { slug: "cuaderno-atardecer-de-mar", name: "Cuaderno Atardecer de Mar", text: "Un cuaderno con una escena de playa y un atardecer rosado." },
          ],
        },
      ],
    },
  ],
  cta: {
    title: "Entra al universo Azul Clarito",
    text: "Explora la tienda, lee el Diario y deja que el mar, la música y la creatividad te acompañen en lo cotidiano.",
    label: "Visitar la tienda",
  },
  faq: [
    {
      question: "¿Qué es Azul Clarito?",
      answer: "Es un proyecto artístico y de estilo de vida nacido en Limón, Costa Rica, que combina música, poesía, arte, naturaleza y Caribe, y que cuenta con una tienda de productos inspirados en ese universo.",
    },
    {
      question: "¿Cuál es el símbolo de Azul Clarito?",
      answer: "Una tortuga marina con una flor tropical, que aparece en varias piezas de la tienda.",
    },
    {
      question: "¿Azul Clarito es solo una tienda online?",
      answer: "No. El sitio de la marca reúne su historia, su música, sus libros, sus videos y sus proyectos, y la tienda es una parte de ese universo.",
      link: { label: "Leer: Accesorios inspirados en el mar", href: "/blog/accesorios-inspirados-en-el-mar" },
    },
  ],
};
