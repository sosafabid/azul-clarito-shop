import "server-only";
import { serverConfig } from "@/config/server";
import type { PaymentProvider } from "./types";

export class PaymentProviderNotConfiguredError extends Error {
  constructor(providerId?: string) {
    super(
      providerId
        ? `El proveedor de pagos "${providerId}" no está registrado.`
        : "No hay ningún proveedor de pagos configurado (variable PAYMENT_PROVIDER).",
    );
    this.name = "PaymentProviderNotConfiguredError";
  }
}

const providers = new Map<string, PaymentProvider>();

/** Registra un adaptador de pagos (se llamará desde el archivo del adaptador). */
export function registerPaymentProvider(provider: PaymentProvider): void {
  providers.set(provider.id, provider);
}

/** Devuelve el proveedor activo, o el indicado. Falla si no hay ninguno. */
export function getPaymentProvider(id: string | undefined = serverConfig.payments.provider): PaymentProvider {
  if (!id) throw new PaymentProviderNotConfiguredError();
  const provider = providers.get(id);
  if (!provider) throw new PaymentProviderNotConfiguredError(id);
  return provider;
}
