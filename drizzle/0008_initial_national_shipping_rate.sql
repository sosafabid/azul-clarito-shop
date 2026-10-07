-- Configuración INICIAL del "Envío nacional" (todo se puede cambiar después desde Admin → Envíos; esto es solo el punto de partida).
-- Es DATO en la base de datos, no una constante del código: cambiar la tarifa NO requiere modificar código ni redeploy.
-- Es idempotente y no pisa lo que ya hayas configurado.

-- 1) El método, solo si todavía no existe ningún método.
INSERT INTO "shipping_methods" ("code", "name", "description", "type", "is_active", "sort_order")
SELECT 'envio-nacional', 'Envío nacional', 'Gestionamos manualmente el envío dentro de Costa Rica. Preparamos cuidadosamente tu pedido y lo enviamos mediante el servicio disponible para tu destino.', 'DELIVERY', true, 0
WHERE NOT EXISTS (SELECT 1 FROM "shipping_methods");

-- 2) La descripción de la migración anterior se actualiza SOLO si nadie la editó (no pisa cambios hechos en el panel).
UPDATE "shipping_methods"
SET "description" = 'Gestionamos manualmente el envío dentro de Costa Rica. Preparamos cuidadosamente tu pedido y lo enviamos mediante el servicio disponible para tu destino.'
WHERE "code" = 'envio-nacional'
  AND "description" = 'Gestionamos manualmente el envío dentro de Costa Rica. El pedido será preparado y enviado por el servicio disponible para tu destino.';

-- 3) Tarifa inicial: ₡4.000 para todo Costa Rica (colones). Solo si el método todavía no tiene ninguna tarifa.
INSERT INTO "shipping_rates" ("method_id", "country_code", "zone_name", "price", "currency", "is_active")
SELECT m."id", 'CR', 'Todo Costa Rica', 4000, 'CRC', true
FROM "shipping_methods" m
WHERE m."code" = 'envio-nacional'
  AND NOT EXISTS (SELECT 1 FROM "shipping_rates" r WHERE r."method_id" = m."id");
