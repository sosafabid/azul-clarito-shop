import { BLOG_AUTHOR, type BlogPost } from "@/domain/blog";

/**
 * Diario Azul: guía de Puerto Viejo y el Caribe Sur.
 * Regla editorial: solo información general y verificable. Sin horarios, tarifas, precios, itinerarios de transporte ni
 * recomendaciones de negocios concretos; quien viaje debe confirmar todo en fuentes oficiales.
 * PENDIENTE: la portada es una ilustración provisional; conviene reemplazarla por fotografía real del Caribe Sur.
 */
export const puertoViejoCostaRicaGuia: BlogPost = {
  slug: "puerto-viejo-costa-rica-guia",
  title: "Puerto Viejo, Costa Rica: una guía para descubrir el Caribe Sur",
  subtitle: "Playas, selva, cultura afrocaribeña y territorios indígenas en una de las zonas más singulares del país, con ideas para decidir cómo recorrerla.",
  category: "Caribe costarricense",
  date: "2026-11-27",
  author: BLOG_AUTHOR,
  metaTitle: "Puerto Viejo, Costa Rica: guía del Caribe Sur | Azul Clarito",
  metaDescription: "Guía de Puerto Viejo de Talamanca: playas, naturaleza, cultura afrocaribeña, qué hacer, cómo viajar con respeto y qué confirmar antes de ir al Caribe Sur.",
  image: { src: "/blog/puerto-viejo.webp", alt: "Ilustración de Azul Clarito del Caribe sur de Costa Rica: sol coral sobre un cielo color arena y olas rosadas, aqua y azul marino", width: 1280, height: 720 },
  keywords: ["Puerto Viejo Costa Rica", "qué hacer en Puerto Viejo", "turismo en el Caribe Sur", "playas de Puerto Viejo", "visitar Limón Costa Rica", "Caribe costarricense"],
  intro: [
    "Hay lugares que se entienden más por su ritmo que por su lista de atracciones. Puerto Viejo, en el cantón de Talamanca, en la provincia de Limón, es uno de ellos: un pueblo costero del Caribe Sur donde la selva llega casi hasta la arena, las bicicletas son parte del paisaje y la mezcla de culturas se nota en la música, en el idioma y en la mesa.",
    "Esta guía no es un itinerario cerrado ni una lista de negocios recomendados. Es una manera de orientarte: qué hace especial a esta zona, qué playas y espacios naturales suelen mencionarse, cómo diferenciarla de otros puntos del Caribe y cómo visitarla con respeto. Los horarios, las tarifas, los transportes y las condiciones del mar cambian; por eso al final te dejamos qué confirmar antes de ir.",
  ],
  sections: [
    {
      id: "donde",
      title: "Dónde está y por qué se siente distinto",
      blocks: [
        { type: "p", text: "Puerto Viejo de Talamanca está en la costa caribeña del sur del país, en la provincia de Limón, hacia la frontera con Panamá. No es lo mismo que Puerto Limón, la capital provincial y ciudad portuaria, ni que Cahuita, otro destino del Caribe Sur con su propio parque nacional, ni que Manzanillo, al final de la ruta costera. Cada uno tiene su carácter, y conviene tenerlo claro para planear." },
        { type: "p", text: "Lo que distingue a esta parte del Caribe es la combinación: mar cálido, vegetación densa, comunidades afrocaribeñas con una historia propia y territorios indígenas en la cordillera de Talamanca, cuyos pueblos, entre ellos bribris y cabécares, mantienen su cultura hasta hoy." },
        { type: "quote", text: "El Caribe costarricense no es una versión del Pacífico con otro mar. Tiene su propia historia, su propia lengua y su propio ritmo." },
      ],
    },
    {
      id: "cultura",
      title: "Cultura afrocaribeña: el corazón del lugar",
      blocks: [
        { type: "p", text: "La identidad del Caribe de Costa Rica se formó, en buena parte, con la llegada de personas de origen afrocaribeño, sobre todo de Jamaica, a la provincia de Limón entre los siglos XIX y XX, vinculadas al puerto, a la construcción del ferrocarril y a las plantaciones. De ahí vienen el inglés criollo (mekatelyu), la música, la gastronomía y muchas tradiciones que siguen vivas." },
        { type: "p", text: "Por eso, visitar el Caribe Sur con respeto empieza por mirarlo como un territorio con historia y gente, no solo como un paisaje. Escucha, pregunta con amabilidad y apoya, siempre que puedas, a quienes viven y trabajan en la zona." },
        { type: "h3", text: "La mesa caribeña" },
        { type: "p", text: "La cocina caribeña costarricense tiene sabores propios, con coco, pescado y especias que no encontrarás igual en otras regiones. Prueba lo que preparan allí, pregunta por los platos de la zona y evita comparar con la comida de otros lugares: aquí se trata de conocer." },
      ],
    },
    {
      id: "playas",
      title: "Playas de Puerto Viejo y alrededores",
      blocks: [
        { type: "p", text: "La costa al sur de Puerto Viejo suele mencionarse como una sucesión de playas con personalidades distintas. Estas son las más citadas, de norte a sur." },
        {
          type: "bullets",
          items: [
            { lead: "Playa Negra.", text: "Cerca del centro del pueblo, conocida por su arena oscura. Un lugar para pasear y ver el atardecer." },
            { lead: "Playa Cocles.", text: "Una de las más conocidas y largas, muy asociada al surf. El oleaje puede ser fuerte: infórmate antes de bañarte." },
            { lead: "Playa Chiquita y Punta Uva.", text: "Hacia el sur, con paisajes de vegetación que llega al borde del mar. Suelen describirse como más tranquilas, aunque las condiciones cambian según el día." },
            { lead: "Manzanillo.", text: "Cerca del final de la ruta costera, en el límite del refugio de vida silvestre Gandoca-Manzanillo. Un entorno más apartado." },
          ],
        },
        { type: "p", text: "Las corrientes y el oleaje del Caribe pueden ser fuertes en algunos tramos. Consulta las señales, la información local y las recomendaciones de las autoridades antes de meterte al agua, y nunca nades solo en un lugar que no conoces." },
      ],
    },
    {
      id: "naturaleza",
      title: "Naturaleza cerca",
      blocks: [
        { type: "p", text: "Parte del atractivo del Caribe Sur es que la naturaleza no está lejos: está en la puerta. Hay espacios protegidos que conviene conocer con guía y con respeto." },
        {
          type: "bullets",
          items: [
            { lead: "Refugio Nacional de Vida Silvestre Gandoca-Manzanillo.", text: "Un área protegida al sur de Puerto Viejo, asociada a bosque, humedales y playas donde anidan tortugas marinas en ciertas épocas. Si quieres participar en actividades con tortugas, elige opciones autorizadas que sigan las normas de protección." },
            { lead: "Parque Nacional Cahuita.", text: "Hacia el norte, con bosque costero y arrecife. Es otro destino, con su administración y reglas propias; conviene visitarlo como una experiencia aparte." },
            { lead: "La cordillera de Talamanca.", text: "Es territorio de comunidades indígenas. Si visitas una, hazlo a través de proyectos y guías de la propia comunidad, con respeto por sus normas." },
          ],
        },
      ],
    },
    {
      id: "actividades",
      title: "Qué hacer en Puerto Viejo",
      blocks: [
        { type: "p", text: "No hace falta llenar el día. Muchas de las mejores experiencias son sencillas, y conviene dejar espacio para improvisar." },
        {
          type: "list",
          items: [
            "Recorrer la zona en bicicleta, una costumbre muy asociada al pueblo.",
            "Caminar por la playa a distintas horas y ver cómo cambia la luz.",
            "Hacer excursiones guiadas de naturaleza por senderos y áreas protegidas.",
            "Aprender a surfear o probar otras actividades de agua con operadores formales.",
            "Conocer la cultura local en conversaciones, música y gastronomía.",
            "Visitar mercados y comercios de artesanías y de emprendedores locales.",
          ],
        },
      ],
    },
    {
      id: "tipos",
      title: "Sugerencias según el tipo de viajero",
      blocks: [
        { type: "h3", text: "Si viajas en pareja" },
        { type: "p", text: "Deja los planes grandes y elige uno o dos momentos con calma: un atardecer en la playa, una caminata corta y una cena sin prisa." },
        { type: "h3", text: "Si te gusta la naturaleza" },
        { type: "p", text: "Prioriza áreas protegidas con guías y dedica un día a cada espacio, en lugar de intentar verlo todo." },
        { type: "h3", text: "Si viajas con familia" },
        { type: "p", text: "Elige playas con condiciones de baño adecuadas para niños, según la información del día, y deja siempre una vía de regreso fácil." },
        { type: "h3", text: "Si te interesa la cultura" },
        { type: "p", text: "Dedica tiempo a conversar, a escuchar música y a conocer la historia afrocaribeña del lugar, y a apoyar a proyectos locales." },
        { type: "h3", text: "Si viajas solo" },
        { type: "p", text: "Comparte tu plan con alguien, ten un contacto de emergencia a mano y mantén las precauciones habituales de cualquier destino turístico." },
      ],
    },
    {
      id: "responsable",
      title: "Viajar con respeto y qué confirmar antes de ir",
      blocks: [
        {
          type: "bullets",
          items: [
            { lead: "Confirma lo que cambia.", text: "Horarios, tarifas, transporte, condiciones del mar y accesos pueden variar. Consulta fuentes oficiales, como el Instituto Costarricense de Turismo, SINAC o los canales de cada lugar." },
            { lead: "Cuida lo natural.", text: "No tomes conchas ni plantas, no alimentes a la fauna y llévate tu basura." },
            { lead: "Respeta a la comunidad.", text: "Pregunta antes de fotografiar a personas, evita el ruido excesivo y aprende sobre la historia del lugar." },
            { lead: "Compra local.", text: "Apoyar a negocios y artesanos de la zona deja valor donde se vive." },
          ],
        },
        { type: "p", text: "Para llevar a la mano lo básico, te puede servir nuestra guía [Qué llevar a la playa](/blog/que-llevar-a-la-playa), y si quieres entender la identidad que inspira nuestro proyecto, lee [Azul Clarito: una marca entre el mar, la música y la creatividad](/blog/historia-de-azul-clarito)." },
      ],
    },
  ],
  cta: {
    title: "Un pedacito del Caribe, también en casa",
    text: "Azul Clarito nace en Limón y se inspira en este mar. Si quieres llevar algo de ese espíritu a tu día a día, mira la tienda.",
    label: "Ver la tienda",
  },
  faq: [
    {
      question: "¿Dónde queda Puerto Viejo, Costa Rica?",
      answer: "Puerto Viejo de Talamanca está en la costa caribeña del sur del país, en la provincia de Limón. No es lo mismo que Puerto Limón, la capital provincial, ni que Cahuita o Manzanillo, otros destinos del Caribe Sur.",
    },
    {
      question: "¿Qué hacer en Puerto Viejo?",
      answer: "Pasear en bicicleta, recorrer sus playas, hacer excursiones guiadas de naturaleza, conocer la cultura afrocaribeña y probar la gastronomía local. Confirma siempre horarios y condiciones antes de ir.",
    },
    {
      question: "¿Cómo viajar de forma responsable al Caribe Sur?",
      answer: "Cuidando la naturaleza, respetando a las comunidades afrocaribeñas e indígenas, comprando local y consultando fuentes oficiales antes de visitar áreas protegidas.",
      link: { label: "Leer: Qué llevar a la playa", href: "/blog/que-llevar-a-la-playa" },
    },
  ],
};
