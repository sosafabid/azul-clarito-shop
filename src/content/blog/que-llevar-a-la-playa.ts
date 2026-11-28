import { BLOG_AUTHOR, type BlogPost } from "@/domain/blog";

/**
 * Diario Azul: guía práctica de un día de playa en el Caribe costarricense.
 * Regla editorial: sin afirmaciones médicas ni de protección de los productos (la ficha no las especifica). Los consejos de sol
 * son generales y remiten a las indicaciones de cada fabricante.
 */
export const queLlevarALaPlaya: BlogPost = {
  slug: "que-llevar-a-la-playa",
  title: "Qué llevar a la playa: una guía práctica para un día junto al Caribe",
  subtitle: "Una lista para empacar sin olvidar nada, desde el sol y la hidratación hasta el bolso, con la lógica de un día largo en una playa tropical.",
  category: "Guías prácticas",
  date: "2026-11-27",
  author: BLOG_AUTHOR,
  metaTitle: "Qué llevar a la playa: lista práctica para un día en el Caribe | Azul Clarito",
  metaDescription: "Qué llevar a la playa en Costa Rica: lista de esenciales, cómo organizar el bolso, sol, hidratación y buenos hábitos. Incluye checklist para guardar.",
  image: { src: "/blog/playa.webp", alt: "Ilustración de Azul Clarito de un día de playa: sol amarillo sobre un cielo celeste y olas en tonos aqua y azul marino", width: 1280, height: 720 },
  keywords: ["qué llevar a la playa", "lista para ir a la playa", "accesorios para la playa", "qué empacar para la playa", "día de playa en Costa Rica", "esenciales para la playa"],
  intro: [
    "Un día de playa en el Caribe costarricense no se parece a una hora en la piscina. Llegas temprano, te quedas hasta que el sol baja, caminas por la arena, te mojas varias veces y rara vez hay una tienda a pocos pasos. Lo que no llevaste, te hace falta; lo que llevaste de más, lo cargas bajo el calor.",
    "Esta guía es un mapa para empacar con criterio: qué no puede faltar, qué conviene según cuánto tiempo te quedes y cómo organizar el bolso para que encontrar cada cosa no sea una excavación. Al final hay una lista para guardar o capturar en el celular. Y si lo tuyo es combinar practicidad con estilo, tienes más ideas en [Cómo elegir accesorios para un look tropical](/blog/como-elegir-accesorios-look-tropical).",
  ],
  sections: [
    {
      id: "esenciales",
      title: "Los esenciales que no se negocian",
      blocks: [
        { type: "p", text: "Antes de pensar en accesorios, la base: lo que hace que el día sea cómodo y seguro. Si solo pudieras llevar cinco cosas, serían estas." },
        {
          type: "bullets",
          items: [
            { lead: "Agua suficiente.", text: "El calor y el sol cansan más de lo que parece. Lleva más agua de la que crees necesitar, sobre todo si te quedarás varias horas." },
            { lead: "Protector solar.", text: "Elige uno que te funcione y sigue las instrucciones de su etiqueta, incluida la frecuencia con que se reaplica. El sol del trópico es intenso incluso con cielo nublado." },
            { lead: "Algo para cubrirte la cabeza.", text: "Una gorra o un sombrero reduce el sol directo sobre la cara y la coronilla, y hace más llevadero el mediodía." },
            { lead: "Una toalla.", text: "Mejor si seca rápido y no pesa; sirve para secarte, para sentarte y para tapar un hombro cuando el sol aprieta." },
            { lead: "Una bolsa para la basura.", text: "Lo que llevas, lo traes de vuelta. Una bolsa pequeña ocupa poco espacio y resuelve el problema." },
          ],
        },
      ],
    },
    {
      id: "sol",
      title: "Sol: cómo cuidarte sin complicarte",
      blocks: [
        { type: "p", text: "En las playas del Caribe el cielo cambia varias veces durante el día: sol fuerte, nubes, un chubasco y otra vez sol. Planear alrededor de ese ritmo ayuda más que llevar mil cosas." },
        { type: "h3", text: "Sombra y horarios" },
        { type: "p", text: "Si puedes elegir, aprovecha las primeras horas de la mañana y el final de la tarde para estar bajo el sol y busca sombra al mediodía. Un árbol, una sombrilla o un rato bajo un techo cerca de la playa cambian la experiencia." },
        { type: "h3", text: "Lentes de sol" },
        { type: "p", text: "Además de verse bien, los lentes oscuros hacen más cómodo mirar el mar, que refleja mucha luz. Lleva un estuche para no rayarlos entre la arena y la toalla; en [Cómo cuidar tus anteojos de sol](/blog/como-cuidar-anteojos-de-sol) está la rutina completa, y si estás por elegir un par, [esta guía](/blog/como-elegir-anteojos-de-sol) te ayuda a decidir según tu estilo." },
        { type: "h3", text: "La cabeza también cuenta" },
        { type: "p", text: "Una gorra es el accesorio que más trabajo hace en una playa. La [Tutty Gorra](/shop/tutty-gorra), de tono baby blue y con la tortuga de la marca, es un ejemplo de cómo un accesorio práctico puede ser también la pieza protagonista del look." },
        { type: "quote", text: "En la playa, lo mejor suele ser lo que no notas: la gorra que no aprieta, el bolso que no pesa, el agua que sí llevaste." },
      ],
    },
    {
      id: "bolso",
      title: "El bolso: llevar menos y llevarlo mejor",
      blocks: [
        { type: "p", text: "Un buen bolso de playa no es el más grande, es el que se deja arrastrar por la arena sin quejarse y donde las cosas se encuentran al primer intento. Piensa en tres zonas: lo que necesitas a mano (llaves, celular, protector), lo que quieres seco y lo que sabes que se va a mojar." },
        {
          type: "bullets",
          items: [
            { lead: "Una bolsa aparte para lo mojado.", text: "Traje de baño, toalla húmeda y ropa con arena van separados de lo demás." },
            { lead: "Los documentos y el dinero, a salvo.", text: "Lleva solo lo necesario y guárdalo en un bolsillo cerrado, lejos de la zona de arena y agua." },
            { lead: "Peso equilibrado.", text: "Si el camino a la playa es largo, un bolso de tela con asas cómodas se agradece más que uno rígido." },
          ],
        },
        { type: "p", text: "Si buscas uno con identidad, el [TUTTYTOTE](/shop/tuttytote) es un tote de estilo natural con la tortuguita de la marca, pensado para el día a día y para ir a la playa con ligereza. Y para llevar lo pequeño, la [Bolsa Conchita de Mar](/shop/bolsa-conchita-de-mar) tiene la inspiración marina de la tienda." },
      ],
    },
    {
      id: "comida",
      title: "Hidratación y algo para picar",
      blocks: [
        { type: "p", text: "Pasar horas al sol da hambre y sed. La regla práctica es llevar comida que aguante el calor sin echarse a perder y que se pueda comer con las manos." },
        {
          type: "list",
          items: [
            "Fruta entera o cortada en recipiente cerrado, como mango, piña o sandía.",
            "Frutos secos, galletas o barras que no se derritan.",
            "Una botella de agua grande, o dos, en lugar de varias pequeñas.",
            "Si llevas comida preparada, una hielera pequeña o un envase bien cerrado que se mantenga fuera del sol.",
            "Servilletas y una bolsa para los residuos, que vuelvan contigo.",
          ],
        },
        { type: "p", text: "Evita los envases de vidrio, que se rompen y son un riesgo en la arena, y deja en casa lo que no estés dispuesto a volver a cargar." },
      ],
    },
    {
      id: "cuidado",
      title: "Cuidado personal y pequeños extras",
      blocks: [
        { type: "p", text: "Los detalles marcan la diferencia en un día largo. No ocupan espacio y se agradecen cuando llegan." },
        {
          type: "tips",
          items: [
            { title: "Una muda seca", text: "Ponerte ropa seca al final del día hace más cómodo el regreso, sobre todo si hay viento o aire acondicionado en el trayecto." },
            { title: "Algo para el cabello", text: "La arena, el agua y el viento enredan. Una pinza o un cintillo resuelven el peinado en segundos, como las [Prensitas](/shop/prensita-conchita-de-mar) de concha o caracol." },
            { title: "Un detalle de estilo", text: "No todo tiene que ser práctico. Un tatuaje temporal, una pulsera o un collar marino hacen que la playa también sea un plan de estilo, aunque tampoco hace falta cargar todo." },
          ],
        },
      ],
    },
    {
      id: "habitos",
      title: "Buenos hábitos para cuidar la playa",
      blocks: [
        { type: "p", text: "Las playas del Caribe son también hogar de plantas, aves y animales marinos, y de las comunidades que viven cerca. Algunas costumbres sencillas ayudan a que sigan siendo lugares disfrutables." },
        {
          type: "list",
          items: [
            "Llévate toda tu basura, incluida la que no es tuya si ves algo a tu paso.",
            "No arranques conchas, plantas ni corales; déjalos donde están.",
            "Respeta las señales y las indicaciones de las autoridades locales sobre dónde bañarse; en algunas playas del Caribe hay corrientes fuertes y es importante informarse antes.",
            "Mantén el volumen de la música a un nivel que no moleste a quienes están cerca.",
            "Si el lugar es un área protegida, infórmate de sus reglas oficiales antes de ir.",
          ],
        },
      ],
    },
    {
      id: "checklist",
      title: "Checklist para guardar",
      blocks: [
        { type: "p", text: "Una lista corta para revisar antes de salir. Puedes guardarla en tus notas del celular y adaptarla a tu día." },
        { type: "h3", text: "Lo básico" },
        { type: "list", items: ["Agua suficiente para todo el día", "Protector solar", "Gorra o sombrero", "Lentes de sol con su estuche", "Toalla", "Bolsa para la basura"] },
        { type: "h3", text: "Para estar cómodo" },
        { type: "list", items: ["Traje de baño y una muda seca", "Calzado fácil de quitar y poner", "Bolsa aparte para lo mojado", "Pinza o cintillo para el cabello", "Documentos y dinero en un bolsillo cerrado"] },
        { type: "h3", text: "Para disfrutar" },
        { type: "list", items: ["Fruta o algo para picar", "Un libro o un cuaderno", "Música en un volumen amable", "Un detalle de estilo que te represente"] },
      ],
    },
  ],
  cta: {
    title: "Arma tu kit de playa con calma",
    text: "Gorras, bolsos, lentes y detalles con inspiración marina, creados desde Limón. Mira la tienda y elige lo que de verdad usarías en tu próximo día de playa.",
    label: "Ver la tienda",
  },
  faq: [
    {
      question: "¿Qué es lo más importante que llevar a la playa?",
      answer: "Agua suficiente, protección contra el sol según las indicaciones de cada producto, algo para cubrirte la cabeza, una toalla y una bolsa para llevarte tu basura. Lo demás depende de cuánto tiempo te quedes.",
    },
    {
      question: "¿Cómo organizo el bolso de playa?",
      answer: "Separa lo mojado de lo seco, deja a mano lo que usarás más (celular, protector, llaves) y lleva documentos y dinero en un bolsillo cerrado. Un bolso de tela, ligero y sin demasiados compartimentos, suele ser más práctico.",
    },
    {
      question: "¿Qué accesorios conviene llevar a la playa?",
      answer: "Una gorra, lentes de sol con estuche, un bolso cómodo y algo para sujetar el cabello son los más útiles. Si quieres sumar estilo, un collar o una pulsera marina funcionan bien sin estorbar.",
      link: { label: "Leer: Accesorios inspirados en el mar", href: "/blog/accesorios-inspirados-en-el-mar" },
    },
  ],
};
