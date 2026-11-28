import { BLOG_AUTHOR, type BlogPost } from "@/domain/blog";

/**
 * Diario Azul: guía para elegir jabones artesanales.
 * Regla editorial: sin afirmaciones dermatológicas ni médicas; no se llama a ningún jabón hipoalergénico, orgánico, natural,
 * terapéutico ni certificado. La tienda NO tiene hoy jabones en su catálogo, por eso el artículo no enlaza a productos.
 * PENDIENTE (manual): si se agregan jabones a la tienda, añadir un bloque `models` con sus slugs reales.
 */
export const jabonesArtesanalesComoElegir: BlogPost = {
  slug: "jabones-artesanales-como-elegir",
  title: "Jabones artesanales: qué buscar al elegir uno",
  subtitle: "Cómo leer una lista de ingredientes, qué preguntar antes de comprar y cómo guardar tu jabón para que dure, sin promesas que nadie puede cumplir.",
  category: "Cuidado personal",
  date: "2026-11-27",
  author: BLOG_AUTHOR,
  metaTitle: "Jabones artesanales: qué buscar al elegir uno | Azul Clarito",
  metaDescription: "Guía para elegir jabones artesanales: cómo leer ingredientes, aromas, preguntas antes de comprar, cómo guardarlos y cómo escoger uno como regalo.",
  image: { src: "/blog/jabones.webp", alt: "Barras de jabón artesanal de distintos colores y texturas sobre una tabla de madera, junto a hojas tropicales verdes", width: 1200, height: 675 },
  keywords: ["jabones artesanales", "cómo elegir jabón artesanal", "jabón para cuidado personal", "ingredientes de jabones", "jabones naturales", "cuidado personal"],
  intro: [
    "Un jabón artesanal se ve diferente. Los colores son irregulares, los cortes no son perfectos, el aroma tiene matices. Esa personalidad es, para muchas personas, la razón de elegirlo. Pero la belleza no es un criterio suficiente: detrás de cada barra hay decisiones sobre ingredientes, fragancia y elaboración que vale la pena entender.",
    "Esta guía no promete resultados para tu piel ni recomienda productos como si fueran un tratamiento. Es una brújula para comprar con criterio: qué distingue a un jabón artesanal, cómo leer su etiqueta, qué preguntarle a quien lo hace y cómo cuidarlo en casa. Si estás pensando en regalarlo, también hay un apartado para eso.",
  ],
  sections: [
    {
      id: "que-es",
      title: "Qué distingue a un jabón artesanal",
      blocks: [
        { type: "p", text: "La palabra «artesanal» suele indicar que el jabón se elabora en lotes pequeños y con intervención manual, en lugar de producirse en grandes líneas industriales. Eso explica su apariencia y, a veces, que cada lote tenga pequeñas diferencias." },
        { type: "p", text: "Ahora bien, «artesanal» no es un sello regulado que garantice calidad, ingredientes o beneficios por sí solo. Es una descripción del modo de hacerlo, y lo importante sigue estando en la etiqueta y en lo que la persona que lo elabora pueda contarte." },
        { type: "quote", text: "«Artesanal» te dice cómo se hizo. La etiqueta y las respuestas de quien lo hizo te dicen qué contiene." },
      ],
    },
    {
      id: "ingredientes",
      title: "Cómo entender la lista de ingredientes",
      blocks: [
        { type: "p", text: "Leer una etiqueta no requiere ser químico. Estas ideas básicas ayudan a orientarte." },
        {
          type: "bullets",
          items: [
            { lead: "Lee la lista completa.", text: "Una etiqueta clara enumera los ingredientes. Si no hay información, pregunta." },
            { lead: "Observa el orden.", text: "En muchos productos, los ingredientes se enumeran de mayor a menor cantidad, aunque cada fabricante puede seguir su propio criterio." },
            { lead: "Distingue aceites, fragancias y aditivos.", text: "Un jabón puede incluir aceites, mantecas, aromas, colorantes y otros añadidos; saber cuáles lleva te permite decidir con más información." },
            { lead: "Desconfía de las promesas absolutas.", text: "Si una etiqueta dice que cura, trata o resuelve un problema de la piel, desconfía: un jabón de cuidado personal no es un medicamento." },
          ],
        },
        { type: "p", text: "También conviene prestar atención a términos como «natural» u «orgánico». Son palabras que pueden usarse con distintos significados, y a menos que el producto indique una certificación verificable, no son garantía de nada." },
      ],
    },
    {
      id: "aroma",
      title: "Aroma y preferencias personales",
      blocks: [
        { type: "p", text: "La fragancia es una decisión muy personal. Hay quien busca un aroma intenso que llene el baño y quien prefiere uno discreto o ninguno." },
        {
          type: "list",
          items: [
            "Si es posible, huele el jabón antes de comprarlo.",
            "Piensa en tus gustos: cítricos, florales, herbales, dulces o neutros.",
            "Recuerda que un aroma intenso en la barra puede sentirse distinto en la ducha.",
            "Si compras como regalo, elige un aroma amable, no extremo.",
          ],
        },
      ],
    },
    {
      id: "piel",
      title: "Tipo de piel: una conversación, no una receta",
      blocks: [
        { type: "p", text: "Cada piel es diferente, y lo que funciona a una persona puede no funcionarle a otra. Por eso, aquí no hay una lista de «jabones para cada tipo de piel»." },
        {
          type: "bullets",
          items: [
            { lead: "Conoce tu experiencia.", text: "Si algún ingrediente o aroma te ha molestado antes, evítalo y revisa la etiqueta." },
            { lead: "Prueba con calma.", text: "Si estrenas un jabón, empieza con un uso moderado y observa cómo te sientes." },
            { lead: "Consulta a un profesional.", text: "Si tienes una piel sensible o alguna condición, la persona indicada para orientarte es un profesional de la salud." },
          ],
        },
      ],
    },
    {
      id: "preguntas",
      title: "Preguntas que vale la pena hacer antes de comprar",
      blocks: [
        {
          type: "list",
          items: [
            "¿Qué ingredientes lleva? ¿Puedo ver la lista completa?",
            "¿Lleva fragancia o colorantes? ¿De qué tipo?",
            "¿Cómo debo guardarlo y cuánto suele durar?",
            "¿Es un lote nuevo o lleva tiempo almacenado?",
            "¿Cuenta con alguna indicación de uso por parte de quien lo elabora?",
            "¿Se vende con alguna política de cambios o contacto?",
          ],
        },
        { type: "p", text: "Si quien lo vende responde con claridad, es buena señal. Si evita las preguntas o promete resultados exagerados, mejor reconsidera." },
      ],
    },
    {
      id: "guardar",
      title: "Cómo guardar y conservar tu jabón",
      blocks: [
        { type: "p", text: "Un jabón de barra dura más si no se queda empapado. Estas costumbres ayudan, sin importar de dónde venga." },
        {
          type: "tips",
          items: [
            { title: "Que se seque entre usos", text: "Usa una jabonera con drenaje o una superficie que deje escurrir el agua." },
            { title: "Lejos del chorro directo", text: "Un jabón que recibe agua constantemente se desgasta más rápido." },
            { title: "Un lugar fresco y aireado", text: "Evita guardarlo en espacios cerrados y húmedos; si tienes barras sin usar, déjalas en un lugar seco." },
          ],
        },
      ],
    },
    {
      id: "regalo",
      title: "Cómo elegir un jabón como regalo",
      blocks: [
        { type: "p", text: "Un jabón puede ser un regalo sencillo y agradable, siempre que se elija con cuidado." },
        {
          type: "bullets",
          items: [
            { lead: "Piensa en la persona.", text: "¿Prefiere aromas suaves o intensos? ¿Tiene alguna sensibilidad que conozcas?" },
            { lead: "Elige una presentación cuidada.", text: "Un empaque sencillo y limpio hace que el detalle se sienta especial." },
            { lead: "Acompáñalo.", text: "Un jabón puede combinarse con otro detalle pequeño; si buscas ideas, mira [Regalos originales inspirados en el Caribe](/blog/regalos-originales-inspirados-en-el-caribe)." },
          ],
        },
        { type: "p", text: "Si quieres explorar otros detalles con inspiración marina para regalar, en [Accesorios inspirados en el mar](/blog/accesorios-inspirados-en-el-mar) hay más ideas." },
      ],
    },
  ],
  cta: {
    title: "Mira los detalles de la tienda",
    text: "Accesorios, cuadernos y detalles con inspiración marina creados desde Limón, para elegir con calma.",
    label: "Ver la tienda",
  },
  faq: [
    {
      question: "¿Qué significa que un jabón sea artesanal?",
      answer: "Normalmente indica que se elabora en lotes pequeños y con intervención manual. No es un sello regulado, así que conviene revisar la etiqueta y preguntar por los ingredientes.",
    },
    {
      question: "¿Cómo leo la lista de ingredientes de un jabón?",
      answer: "Busca una lista completa y clara, distingue entre aceites, fragancias y aditivos y desconfía de las promesas absolutas. Si no hay información, pregunta a quien lo elabora.",
    },
    {
      question: "¿Cómo guardo un jabón artesanal para que dure?",
      answer: "Déjalo secar entre usos, usa una jabonera con drenaje y evita el contacto constante con el agua. Guarda las barras sin usar en un lugar fresco y seco.",
      link: { label: "Leer: Regalos originales inspirados en el Caribe", href: "/blog/regalos-originales-inspirados-en-el-caribe" },
    },
  ],
};
