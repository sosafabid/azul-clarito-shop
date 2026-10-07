-- Método de envío conceptual "Envío nacional" (nombre y descripción editables en el panel de Envíos).
-- NO inserta tarifas, zonas ni montos: hasta que se configure una tarifa, el checkout dice
-- "El envío para este destino todavía no está configurado."
-- Solo se crea si todavía no existe NINGÚN método (si ya configuraste uno, no se duplica ni se cambia nada).
INSERT INTO "shipping_methods" ("code", "name", "description", "type", "is_active", "sort_order")
SELECT 'envio-nacional', 'Envío nacional', 'Gestionamos manualmente el envío dentro de Costa Rica. El pedido será preparado y enviado por el servicio disponible para tu destino.', 'DELIVERY', true, 0
WHERE NOT EXISTS (SELECT 1 FROM "shipping_methods");
