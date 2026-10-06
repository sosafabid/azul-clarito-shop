import type { Metadata } from "next";
import { LegalDocument } from "@/components/account/LegalDocument";
import { legalConfig } from "@/config/legal";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  robots: legalConfig.reviewed ? undefined : { index: false, follow: false },
};

export default function TermsPage() {
  return (
    <LegalDocument title="Términos y condiciones" version={legalConfig.termsVersion}>
      <p>
        Estos términos regulan el uso del sitio y de la cuenta de {siteConfig.name}. Al crear una cuenta, la persona declara que los leyó y los acepta.
      </p>

      <h2>1. Quiénes somos</h2>
      <p>
        {siteConfig.name} es un proyecto artístico y de estilo de vida costarricense, nacido en Limón, que combina música, poesía, arte y objetos inspirados en el Caribe.
        {legalConfig.controller.name ? ` Responsable: ${legalConfig.controller.name}${legalConfig.controller.idNumber ? ` (cédula ${legalConfig.controller.idNumber})` : ""}.` : ""}
      </p>

      <h2>2. Cuenta de usuario</h2>
      <ul>
        <li>Para crear una cuenta se debe ser mayor de 18 años.</li>
        <li>Los datos que se entreguen deben ser verdaderos y mantenerse actualizados.</li>
        <li>La contraseña es personal. Cada persona es responsable de mantenerla en reserva y de lo que ocurra con su cuenta.</li>
        <li>Se puede eliminar la cuenta en cualquier momento desde “Mi cuenta”.</li>
        <li>Podemos suspender cuentas que hagan un uso fraudulento, abusivo o que ponga en riesgo el sitio.</li>
      </ul>

      <h2>3. Uso del sitio</h2>
      <p>
        El sitio debe usarse de buena fe y conforme a la ley. No está permitido intentar acceder a cuentas ajenas, alterar o sobrecargar el sitio, ni extraer su contenido de forma
        automatizada.
      </p>

      <h2>4. Compras</h2>
      <p>
        La compra en línea todavía no está habilitada. Cuando se habilite, se publicarán las condiciones de venta (precios, medios de pago, envíos, cambios y devoluciones) y se deberán
        aceptar al momento de comprar.
      </p>

      <h2>5. Propiedad intelectual</h2>
      <p>
        La música, letras, poesía, ilustraciones, fotografías, textos, nombre y logotipo de {siteConfig.name}, incluida la tortuga marina con flor tropical, pertenecen a sus
        titulares. No pueden copiarse, reproducirse ni usarse comercialmente sin autorización previa y por escrito.
      </p>

      <h2>6. Disponibilidad y responsabilidad</h2>
      <p>
        Procuramos que el sitio funcione de forma continua y segura, pero puede haber interrupciones. En la medida permitida por la ley, no respondemos por daños derivados de
        interrupciones ajenas a nuestro control.
      </p>

      <h2>7. Cambios en estos términos</h2>
      <p>
        Podemos actualizar estos términos. Cada versión tiene una fecha y cada aceptación queda registrada con la versión que la persona vio. Si hay cambios importantes, se
        pedirá una nueva aceptación.
      </p>

      <h2>8. Ley aplicable</h2>
      <p>Estos términos se rigen por las leyes de la República de Costa Rica.</p>

      <h2>9. Contacto</h2>
      <p>
        Para consultas sobre estos términos: <a className="font-semibold text-navy underline underline-offset-4" href={`mailto:${legalConfig.contactEmail}`}>{legalConfig.contactEmail}</a>.
      </p>
    </LegalDocument>
  );
}
