import { BLOG_AUTHOR, type BlogPost } from "@/domain/blog";

/**
 * Diario Azul: accesorios para un look tropical.
 * Regla editorial: de cada producto solo se afirma lo que dice su ficha; nada de materiales, medidas ni promesas.
 */
export const comoElegirAccesoriosLookTropical: BlogPost = {
  slug: "como-elegir-accesorios-look-tropical",
  title: "Cómo elegir accesorios para un look tropical sin sobrecargarlo",
  subtitle: "Una guía de edición: qué pieza deja hablar al protagonista, cuáles acompañan y cómo se ve todo junto en un día de playa o en uno cualquiera.",
  category: "Estilo tropical",
  date: "2026-11-26",
  author: BLOG_AUTHOR,
  metaTitle: "Accesorios para un look tropical sin sobrecargarlo | Azul Clarito",
  metaDescription: "Aprende a combinar accesorios tropicales con color, equilibrio y naturaleza. Ideas de estilo caribeño para la playa y el día a día, con piezas de Azul Clarito.",
  image: { src: "/blog/look-tropical.webp", alt: "Gorra beige con una ola dibujada, bolsa de tela con una tortuga marina azul y camiseta blanca con la etiqueta de Azul Clarito", width: 1000, height: 563 },
  keywords: ["accesorios para look tropical", "accesorios tropicales", "estilo caribeño", "accesorios para verano", "cómo combinar accesorios", "moda tropical"],
  intro: [
    "Un look tropical se echa a perder cuando todo quiere ser protagonista. La camiseta estampada, el collar de conchas, la gorra de colores, el bolso con dibujo y los lentes azules compiten por la misma atención, y el resultado se parece más a un disfraz de vacaciones que a una manera de vestir.",
    "Elegir accesorios para un look tropical es sobre todo un ejercicio de edición: decidir qué pieza habla y cuáles la acompañan. Estas son las ideas que usamos en Azul Clarito, desde Limón, para llevar el verano caribeño sin cargar el conjunto, con ejemplos concretos y piezas de la tienda para verlas en la práctica.",
  ],
  sections: [
    {
      id: "color",
      title: "El color manda: una paleta corta para todo el día",
      blocks: [
        { type: "p", text: "El error más común en la moda tropical no es usar demasiado color, sino usar demasiados colores distintos. El Caribe tiene una paleta generosa, pero el mar, la arena y el cielo funcionan porque cada uno ocupa su lugar." },
        { type: "h3", text: "La regla de tres tonos" },
        { type: "p", text: "Una guía sencilla para cualquier conjunto: un tono neutro que ocupe casi todo (blanco, beige, arena), un color de mar que se repita en una o dos piezas (celeste, turquesa, azul profundo) y un acento cálido que aparezca una sola vez (amarillo sol, coral, rosa). Si cada accesorio trae un color nuevo, el conjunto se fragmenta; si repiten el mismo, se siente pensado." },
        { type: "h3", text: "Dejar que lo natural elija por ti" },
        { type: "p", text: "Cuando dudes, mira alrededor. Un atardecer sobre el mar junta azul, dorado y rosa sin esfuerzo; una playa de arena clara pide tonos suaves. Tomar la paleta de un paisaje que conoces es más seguro que combinar colores desde cero." },
        { type: "quote", text: "Si una pieza trae mucho color, que el resto se calme. Si el conjunto es sobrio, ahí sí puede brillar el accesorio." },
      ],
    },
    {
      id: "protagonista",
      title: "Una pieza que habla y el resto que acompaña",
      blocks: [
        { type: "p", text: "Los accesorios con personalidad lucen más cuando la ropa les da espacio. Una gorra con dibujo se aprecia sobre una camiseta lisa; un bolso con una ilustración se nota si el resto del conjunto es de un solo color." },
        {
          type: "bullets",
          items: [
            { lead: "Elige la pieza protagonista primero.", text: "Puede ser la gorra, el bolso o un collar. Todo lo demás se decide en función de ella." },
            { lead: "Que la ropa sea la base tranquila.", text: "Tonos lisos y cortes sencillos hacen que un accesorio de carácter se vea intencional y no accidental." },
            { lead: "Deja uno o dos accesorios de apoyo.", text: "Pequeños, discretos y en la misma paleta: una pinza en el pelo, una pulsera fina." },
          ],
        },
      ],
    },
    {
      id: "naturaleza",
      title: "Inspiración botánica y marina, sin caer en el cliché",
      blocks: [
        { type: "p", text: "Flores tropicales, conchas, estrellas de mar y tortugas son motivos que funcionan precisamente porque vienen del paisaje que queremos evocar. El riesgo es acumularlos: una flor, una concha y una tortuga en un mismo conjunto cuentan tres historias a la vez." },
        { type: "p", text: "La salida es elegir un solo motivo por conjunto y dejar que el resto haga de fondo. Un día la protagonista es la flor, otro la concha; así cada look tiene un tema claro y las piezas se pueden repetir de mil maneras. En Azul Clarito, de hecho, la tortuga marina con una flor tropical es nuestro símbolo, y la usamos con la misma lógica: una presencia clara, sin ruido alrededor." },
      ],
    },
    {
      id: "no-sobrecargar",
      title: "Cómo evitar sobrecargar un conjunto",
      blocks: [
        {
          type: "tips",
          items: [
            { title: "Cuenta tus puntos de atención", text: "Cabeza, cuello, manos y bolso son zonas donde se concentran los accesorios. Con dos zonas activas suele ser suficiente; la tercera ya compite." },
            { title: "Antes de salir, quita una pieza", text: "El clásico consejo de mirarte al espejo y retirar un accesorio funciona también con el estilo tropical, que ya trae suficiente energía de por sí." },
            { title: "Repite una forma o un tono", text: "Si la gorra lleva azul, que el bolso o la pinza repitan ese azul. Repetir ordena; sumar sin repetir desordena." },
          ],
        },
      ],
    },
    {
      id: "dia-a-dia",
      title: "Accesorios para la playa y para todos los días",
      blocks: [
        { type: "h3", text: "Para un día de playa" },
        { type: "p", text: "La playa pide piezas cómodas y prácticas: una gorra para el sol, un bolso donde quepa todo y un detalle en el pelo que lo mantenga en su sitio. Un tatuaje temporal de estética oceánica, como el [Tattoo Tropical](/shop/tattoo-tropical), suma un detalle sin añadir nada que cargar." },
        { type: "h3", text: "Para la ciudad y el día a día" },
        { type: "p", text: "Fuera de la playa el truco es bajar el volumen: una sola pieza tropical y el resto en tonos tranquilos. Un tote para el diario, un collar discreto o una pinza en el pelo bastan para que el verano se note sin que el conjunto parezca de vacaciones." },
        {
          type: "bullets",
          items: [
            { lead: "Ejemplo 1, día de playa:", text: "camiseta blanca, short en tono arena, gorra con dibujo azul y una pinza en el pelo. Dos accesorios, una sola paleta." },
            { lead: "Ejemplo 2, almuerzo de domingo:", text: "vestido liso y un collar con dije marino. El resto, sin adornos." },
            { lead: "Ejemplo 3, trabajo o estudio:", text: "ropa neutra y un tote con ilustración. El accesorio hace de acento y el resto se queda en silencio." },
          ],
        },
      ],
    },
    {
      id: "piezas",
      title: "Piezas de Azul Clarito para ver el equilibrio en práctica",
      blocks: [
        { type: "p", text: "Estas son algunas piezas de la tienda que ilustran lo que hemos hablado. La descripción visual es la de su ficha." },
        {
          type: "models",
          items: [
            { slug: "tutty-gorra", name: "Tutty Gorra", visual: "Gorra baby blue · Tortuga", text: "Una pieza protagonista de la cabeza: el azul suave y la tortuga ya traen el tema, así que el resto del conjunto puede ser liso." },
            { slug: "gorra-azul-clarito-whale", name: "Gorra Azul Clarito – Whale", visual: "Gorra · Diseño de ballena", text: "La alternativa si prefieres otro animal marino como motivo. Funciona con la misma lógica: un solo protagonista y ropa sencilla alrededor." },
            { slug: "tuttytote", name: "TUTTYTOTE", visual: "Tote bag natural · Tortuguita", text: "Un fondo natural con una tortuguita: ideal como pieza de apoyo en un día de ciudad, o como bolso para llevar lo justo a la playa." },
            { slug: "baby-bag-estrellitas-de-mar", name: "Baby Bag Estrellitas de Mar", visual: "Bolso tejido turquesa · Cinco estrellas de mar", text: "Un bolso con mucho color. Pide un conjunto neutro y pocos accesorios más; con él puesto, la estrella ya es la protagonista." },
            { slug: "prensa-flor-de-mar", name: "Prensa Flor de Mar", visual: "Accesorio para el cabello · Flor tropical", text: "El toque botánico en pequeño: una flor en el pelo sin tener que cargar nada más. Va bien con ropa lisa." },
            { slug: "prensita-conchita-de-mar", name: "Prensita Conchita de Mar", visual: "Pinza para el cabello · Concha nacarada", text: "Para quienes prefieren el motivo marino en lugar del floral. Discreta y fácil de repetir con otros tonos suaves." },
            { slug: "collar-ocean-star", name: "Collar Ocean Star", visual: "Collar dorado · Dije de estrella de mar tornasol", text: "Un collar que aporta brillo sin gritar. Su dije marino va bien con un escote limpio y ningún otro adorno en el cuello." },
          ],
        },
      ],
    },
  ],
  cta: {
    title: "Arma tu look con calma",
    text: "Elige una pieza protagonista, suma una o dos de apoyo y deja que el resto del conjunto respire. En la tienda encontrarás gorras, bolsos, accesorios para el pelo y más piezas inspiradas en el Caribe.",
    label: "Ver la tienda",
  },
  faq: [
    {
      question: "¿Cuántos accesorios conviene usar en un look tropical?",
      answer: "No hay un número exacto, pero una buena guía es mantener dos zonas activas (por ejemplo, cabeza y bolso) y dejar el resto en calma. Si dudas, quita una pieza antes de salir.",
    },
    {
      question: "¿Qué colores combinan mejor con un estilo caribeño?",
      answer: "Los neutros como blanco, beige y arena funcionan de base, y los tonos de mar (celeste, turquesa, azul profundo) como color principal. Un acento cálido, como amarillo o coral, basta en una sola pieza.",
    },
    {
      question: "¿Se pueden llevar accesorios tropicales todos los días?",
      answer: "Sí, siempre que bajes el volumen en la ciudad: una sola pieza con motivo tropical y ropa en tonos tranquilos. El truco está en la repetición de tonos, no en acumular motivos.",
    },
    {
      question: "¿Dónde encontrar accesorios tropicales en Costa Rica?",
      answer: "En la tienda en línea de Azul Clarito, desde Limón, puedes ver gorras, bolsos, accesorios para el cabello y más piezas con inspiración caribeña.",
      link: { label: "Ir a la tienda", href: "/shop" },
    },
  ],
};
