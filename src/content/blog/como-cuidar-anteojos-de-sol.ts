import { BLOG_AUTHOR, type BlogPost } from "@/domain/blog";

/**
 * Diario Azul: cuidado de anteojos de sol.
 * Regla editorial: consejos generales de cuidado, sin afirmar nada sobre protección UV, materiales ni tratamientos de los lentes
 * (las fichas de los modelos no lo especifican). Si un par trae indicaciones del fabricante, esas mandan.
 */
export const comoCuidarAnteojosDeSol: BlogPost = {
  slug: "como-cuidar-anteojos-de-sol",
  title: "Cómo cuidar tus anteojos de sol para que duren más",
  subtitle: "Una guía práctica para limpiar, guardar y proteger tus lentes del calor, la arena y el agua salada, con una rutina que cabe en dos minutos al día.",
  category: "Guías prácticas",
  date: "2026-11-26",
  author: BLOG_AUTHOR,
  metaTitle: "Cómo cuidar anteojos de sol para que duren más | Azul Clarito",
  metaDescription: "Aprende a limpiar y guardar tus anteojos de sol, y a protegerlos de la arena, el calor y el agua salada. Guía práctica con una rutina diaria sencilla.",
  image: { src: "/blog/cuidado-anteojos.webp", alt: "Varios anteojos de sol de Azul Clarito, con monturas oscuras, carey y transparente, sobre una tela blanca al aire libre", width: 920, height: 492 },
  keywords: ["cómo cuidar anteojos de sol", "limpiar anteojos de sol", "cuidar lentes de sol", "guardar anteojos de sol", "mantenimiento de lentes"],
  intro: [
    "Casi nadie rompe unos anteojos de sol de un golpe. Lo que los desgasta es lo cotidiano: el roce con la camiseta cuando los limpiamos, el fondo del bolso lleno de llaves, el calor del carro estacionado, la arena que se pega después de la playa. Son pequeños gestos que, repetidos, dejan los lentes rayados y las monturas flojas.",
    "Esta guía reúne lo que de verdad cambia la vida útil de unos lentes: cómo limpiarlos sin dañarlos, qué materiales usar y cuáles evitar, cómo guardarlos y qué hacer cuando el día termina con sal y arena. Son consejos generales de cuidado; si tu par trae indicaciones del fabricante, esas van primero. Y si todavía estás eligiendo el tuyo, puedes empezar por [Cómo elegir anteojos de sol según tu estilo](/blog/como-elegir-anteojos-de-sol).",
  ],
  sections: [
    {
      id: "limpiar",
      title: "Cómo limpiar tus lentes correctamente",
      blocks: [
        { type: "p", text: "La limpieza es donde más se dañan los lentes, casi siempre con la mejor intención. La clave es no frotar nunca una superficie con partículas encima: la arena, aunque no se vea, funciona como un papel de lija en miniatura." },
        {
          type: "tips",
          items: [
            { title: "Enjuaga primero", text: "Antes de tocar el lente, déjalo bajo un chorro de agua dulce y tibia para arrastrar polvo, sal y arena. Este paso por sí solo evita la mayoría de los rayones." },
            { title: "Un poco de jabón suave", text: "Una gota de jabón de platos suave y sin aromas fuertes, extendida con los dedos limpios sobre ambos lados del lente y sobre la montura. Enjuaga de nuevo." },
            { title: "Seca con cuidado", text: "Sacude el exceso de agua y seca con un paño de microfibra limpio, con toques suaves o movimientos muy ligeros. Si el paño está sucio, ensucia." },
          ],
        },
        { type: "quote", text: "Primero se enjuaga, después se limpia, al final se seca. Saltarse el primer paso es lo que más rayones deja." },
      ],
    },
    {
      id: "materiales",
      title: "Qué usar y qué evitar al limpiar",
      blocks: [
        { type: "h3", text: "Los materiales que sí ayudan" },
        {
          type: "bullets",
          items: [
            { lead: "Paño de microfibra limpio.", text: "El mejor aliado. Lávalo de vez en cuando con jabón suave y sin suavizante, y guárdalo dentro del estuche." },
            { lead: "Agua dulce tibia.", text: "Ni caliente ni helada: los cambios bruscos de temperatura no son amigos de las monturas." },
            { lead: "Jabón suave.", text: "Una gota basta. Cuanto menos producto, menos residuos que limpiar después." },
          ],
        },
        { type: "h3", text: "Lo que conviene evitar" },
        {
          type: "bullets",
          items: [
            { lead: "La camiseta, servilletas y papel toalla.", text: "Parecen suaves, pero pueden arrastrar partículas y dejar marcas finas sobre el lente." },
            { lead: "Limpiavidrios, alcohol, cloro y solventes.", text: "Son productos pensados para otras superficies. Como no sabemos cómo reaccionaría cada lente o montura, lo más prudente es no probarlos." },
            { lead: "Soplarlos o limpiarlos con saliva.", text: "Es lo más a mano, pero deja residuos y no resuelve la suciedad." },
            { lead: "Frotar en seco.", text: "Con el lente sucio de arena o polvo es la manera más rápida de rayarlo." },
          ],
        },
      ],
    },
    {
      id: "guardar",
      title: "Dónde y cómo guardarlos",
      blocks: [
        { type: "p", text: "Un buen estuche cambia mucho: evita que los lentes se rayen entre llaves y monedas y mantiene la montura en su forma. Si no tienes uno, una funda de tela suave también sirve." },
        {
          type: "list",
          items: [
            "Guárdalos siempre en su estuche o funda, nunca sueltos en el fondo del bolso.",
            "Si los apoyas en una mesa, deja los lentes hacia arriba, de modo que no toquen la superficie.",
            "Evita dejarlos sobre el tablero del carro, expuestos al sol.",
            "No los cuelgues del cuello de la camiseta ni los uses como diadema todo el día: las monturas se abren y se aflojan.",
            "Guárdalos secos y en un lugar con aire, no dentro de una bolsa húmeda.",
          ],
        },
      ],
    },
    {
      id: "clima",
      title: "Calor, humedad, arena y agua salada",
      blocks: [
        { type: "p", text: "En el Caribe costarricense los anteojos pasan buena parte del tiempo en condiciones exigentes. Ninguna es un problema si se maneja bien; todas lo son si se ignoran." },
        { type: "h3", text: "Calor" },
        { type: "p", text: "Dejarlos dentro de un carro al sol es una de las maneras más comunes de deformar una montura. Si tienes que dejarlos en el vehículo, que sea dentro del estuche y fuera del sol directo." },
        { type: "h3", text: "Humedad" },
        { type: "p", text: "Un estuche que se guarda mojado atrapa humedad. Seca los lentes y la montura antes de guardarlos y deja el estuche abierto un rato si regresas de un día de lluvia." },
        { type: "h3", text: "Arena y agua salada" },
        { type: "p", text: "Después de la playa, el orden importa: enjuaga con agua dulce, sacude, limpia con jabón suave si hace falta y seca con microfibra. La sal que se queda seca sobre el lente forma una película difícil de quitar, y la arena, si se frota, deja marcas permanentes." },
      ],
    },
    {
      id: "errores",
      title: "Los errores más comunes",
      blocks: [
        {
          type: "bullets",
          items: [
            { lead: "Limpiar con lo primero que hay a mano.", text: "La camiseta, la servilleta o el borde de la falda parecen inofensivos, pero son los principales responsables de los rayones." },
            { lead: "Guardarlos sin estuche.", text: "En el fondo del bolso o en el bolsillo del short suelen terminar rayados." },
            { lead: "Usarlos de diadema.", text: "Estiran las varillas y la montura pierde ajuste con el tiempo." },
            { lead: "Dejarlos en el carro.", text: "El calor acumulado dentro de un vehículo puede deformar la montura." },
          ],
        },
      ],
    },
    {
      id: "rutina",
      title: "Una rutina diaria de dos minutos",
      blocks: [
        {
          type: "list",
          items: [
            "Al llegar a casa, enjuágalos con agua dulce si estuvieron en la playa o en un lugar con polvo.",
            "Una gota de jabón suave, un nuevo enjuague y secado con microfibra limpia.",
            "Revisa que las varillas cierren bien y que no haya tornillos flojos.",
            "Guárdalos en su estuche, secos y fuera del sol directo.",
          ],
        },
        { type: "p", text: "Si en algún momento notas rayones profundos, tornillos que no sostienen o una montura que ya no ajusta, quizá sea hora de cambiarlos. Es una buena excusa para elegir otro par." },
      ],
    },
    {
      id: "modelos",
      title: "Anteojos de Azul Clarito para cuidar",
      blocks: [
        { type: "p", text: "Estos son los cinco modelos de la tienda. La descripción visual es la de su ficha, que no detalla el material de los lentes ni de la montura; por eso los consejos de esta guía son generales." },
        {
          type: "models",
          items: [
            { slug: "midnight-coast", name: "Midnight Coast", visual: "Montura negra · Lentes oscuros · Silueta ovalada estrecha", text: "Una montura negra y de línea discreta: un par para llevar a diario y que se beneficia de un estuche propio." },
            { slug: "ocean-muse", name: "Ocean Muse", visual: "Montura negra · Lentes oscuros · Silueta oversized", text: "Su silueta oversized tiene más superficie de lente expuesta: conviene guardarlos con los lentes hacia arriba y en estuche." },
            { slug: "purple-tide", name: "Purple Tide", visual: "Montura oscura · Lentes azules · Silueta rectangular", text: "Los lentes azules se ven mejor limpios: un paño de microfibra a mano marca la diferencia." },
            { slug: "sandy-glow", name: "Sandy Glow", visual: "Montura transparente champagne · Lentes café", text: "Una montura transparente suele mostrar bien las huellas: límpiala con el mismo cuidado que los lentes." },
            { slug: "sunset-tortoise", name: "Sunset Tortoise", visual: "Montura de plástico carey · Lentes café · Silueta rectangular", text: "El carey es un clásico para usar durante años; una rutina de cuidado básica ayuda a que siga luciendo bien." },
          ],
        },
      ],
    },
  ],
  cta: {
    title: "Cuida tus lentes, estrena otros cuando quieras",
    text: "Con un estuche y un paño de microfibra, tus anteojos duran mucho más. Y cuando quieras un par nuevo, en la tienda tienes cinco modelos para elegir con calma.",
    label: "Ver anteojos en la tienda",
  },
  faq: [
    {
      question: "¿Cómo se limpian unos anteojos de sol sin rayarlos?",
      answer: "Primero se enjuagan con agua dulce tibia para quitar arena y polvo, luego se limpian con una gota de jabón suave y se secan con un paño de microfibra limpio. Lo que más daña es frotarlos en seco.",
    },
    {
      question: "¿Se pueden limpiar con la camiseta?",
      answer: "Es lo que hace casi todo el mundo, pero no es lo más recomendable: la tela puede arrastrar partículas y dejar marcas finas en el lente. Un paño de microfibra limpio es mucho más seguro.",
    },
    {
      question: "¿Qué hago si llevé los anteojos a la playa?",
      answer: "Enjuágalos con agua dulce antes de limpiarlos, sin frotar, y sécalos con microfibra. Así evitas que la sal y la arena queden sobre el lente.",
    },
    {
      question: "¿Cómo elijo unos anteojos de sol nuevos?",
      answer: "Piensa en tu estilo y en la forma de tu rostro, y prueba varios modelos. Lo explicamos en detalle en nuestra guía sobre cómo elegirlos.",
      link: { label: "Leer: Cómo elegir anteojos de sol según tu estilo", href: "/blog/como-elegir-anteojos-de-sol" },
    },
  ],
};
