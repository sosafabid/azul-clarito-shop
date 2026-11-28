import type { Metadata } from "next";
import { CookiePreferencesButton } from "@/components/analytics/CookiePreferencesButton";
import { LegalDocument } from "@/components/account/LegalDocument";
import { legalConfig } from "@/config/legal";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  robots: legalConfig.reviewed ? undefined : { index: false, follow: false },
};

export default function PrivacyPage() {
  const { controller } = legalConfig;
  return (
    <LegalDocument title="Política de Privacidad" version={legalConfig.privacyVersion}>
      <p>
        Esta política explica qué datos personales guarda {siteConfig.name}, para qué los usa y qué derechos tiene cada persona, conforme a la {legalConfig.lawName}.
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <p>
        {controller.name ? controller.name : siteConfig.name}
        {controller.idNumber ? ` · cédula ${controller.idNumber}` : ""}
        {controller.address ? ` · ${controller.address}` : ""}. Contacto para ejercer derechos:{" "}
        <a className="font-semibold text-navy underline underline-offset-4" href={`mailto:${legalConfig.contactEmail}`}>{legalConfig.contactEmail}</a>.
      </p>

      <h2>2. Datos que recopilamos</h2>
      <ul>
        <li>
          <strong>De la cuenta:</strong> nombre, correo, teléfono (opcional) y contraseña. La contraseña <strong>nunca se guarda</strong>: solo se conserva una huella cifrada que no
          permite recuperarla.
        </li>
        <li>
          <strong>Del consentimiento:</strong> qué se aceptó o retiró, la versión del texto y la fecha.
        </li>
        <li>
          <strong>Técnicos mínimos:</strong> cookies necesarias para mantener el ingreso, el carrito y recordar tu elección sobre cookies. Las cookies de medición y de publicidad solo se activan si las aceptás (ver sección 10).
        </li>
        <li>
          <strong>Cuando se habiliten las compras:</strong> direcciones de entrega y el historial de pedidos.
        </li>
      </ul>

      <h2>3. Para qué usamos los datos</h2>
      <ul>
        <li>Crear y administrar la cuenta, y mantenerla segura.</li>
        <li>Cuando se habiliten las compras: gestionar pedidos, pagos, envíos y atención posterior.</li>
        <li>
          Enviar novedades, lanzamientos y promociones <strong>solo si la persona lo autorizó</strong> (permiso opcional que no es necesario para comprar y se puede retirar en cualquier
          momento).
        </li>
      </ul>

      <h2>4. Consentimiento</h2>
      <p>
        El tratamiento de los datos se basa en el consentimiento informado de la persona, que es voluntario. Se puede retirar el permiso de comunicaciones comerciales desde “Mi
        cuenta” y se puede eliminar la cuenta en cualquier momento.
      </p>

      <h2>5. Con quién se comparten</h2>
      <p>
        Usamos proveedores que alojan el sitio y la base de datos y que actúan por nuestra cuenta; sus servidores pueden estar fuera de Costa Rica. Cuando se habiliten las compras se
        compartirán los datos necesarios con los proveedores de pago y de transporte. No vendemos datos personales.
      </p>

      <h2>6. Cuánto tiempo los conservamos</h2>
      <p>
        Mientras la cuenta esté activa. Al eliminarla se borran la cuenta, las sesiones, las direcciones y los consentimientos. Los pedidos ya realizados se conservan, sin vínculo
        con la cuenta, por obligaciones legales y contables.
      </p>

      <h2>7. Derechos de las personas</h2>
      <ul>
        <li><strong>Acceso:</strong> en “Mi cuenta” se ve lo que guardamos.</li>
        <li><strong>Rectificación:</strong> se pueden corregir el nombre y el teléfono desde “Mi cuenta”.</li>
        <li><strong>Revocación del consentimiento:</strong> desde “Mi cuenta”.</li>
        <li><strong>Eliminación:</strong> desde “Mi cuenta”, con la contraseña.</li>
      </ul>
      <p>
        Para otras solicitudes, escribir a {legalConfig.contactEmail}. Si considera que sus derechos no fueron atendidos, puede acudir a la Agencia de Protección de Datos de los
        Habitantes (PRODHAB).
      </p>

      <h2>8. Seguridad</h2>
      <p>
        Aplicamos medidas técnicas para proteger los datos: contraseñas protegidas con cifrado de un solo sentido, sesiones que se pueden cerrar, bloqueo temporal ante intentos
        repetidos de ingreso y acceso restringido al panel interno.
      </p>

      <h2>9. Cambios en esta política</h2>
      <p>Cada versión de esta política tiene fecha y cada aceptación queda registrada con la versión vista. Si hay cambios importantes, se pedirá una nueva autorización.</p>

      <h2>10. Cookies y herramientas de medición</h2>
      <p>Usamos tres tipos de cookies. Las opcionales empiezan apagadas y solo se activan si las aceptás en el aviso de cookies.</p>
      <ul>
        <li>
          <strong>Necesarias (siempre activas):</strong> la sesión de ingreso, el carrito de quien compra sin cuenta, el proceso de pago y la cookie que recuerda tu elección sobre cookies (dura 180 días). Sin ellas la tienda no funciona.
        </li>
        <li>
          <strong>Medición (opcional):</strong> Google Analytics 4, para saber qué páginas y productos se ven, qué se agrega al carrito, cuántas personas inician una compra y cuántas la completan. Enviamos el producto, el monto y el número de pedido; <strong>no enviamos nombre, correo, teléfono, dirección ni datos de pago</strong>. Las señales de Google y la personalización de anuncios están desactivadas.
        </li>
        <li>
          <strong>Publicidad (opcional):</strong> Meta Pixel, para medir el resultado de anuncios en Facebook e Instagram, con los mismos límites de datos. Solo se usa cuando esté activado en la tienda y lo aceptes.
        </li>
      </ul>
      <p>
        Mientras no aceptes, no se carga ningún script de Google ni de Meta. Estos proveedores pueden tratar datos en servidores fuera de Costa Rica. Podés cambiar o retirar tu permiso cuando quieras:{" "}
        <CookiePreferencesButton className="font-semibold text-navy underline underline-offset-4">Preferencias de cookies</CookiePreferencesButton>.
      </p>
    </LegalDocument>
  );
}
