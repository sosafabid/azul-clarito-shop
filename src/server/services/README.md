# Servicios (lógica de negocio)

El recorrido de una compra está separado en etapas independientes:

```
PRODUCT → CART → CHECKOUT → PAYMENT → ORDER → FULFILLMENT → SHIPPING → EMAIL
catalog   cart   checkout   payments  orders  fulfillment   shipping    email
                                ↑
                            inventory (reserva / confirma / libera stock)
```

## Regla de dependencias

- Cada carpeta expone un **contrato** (`types.ts`: interfaces y tipos) y, cuando
  exista, su implementación. Las demás etapas dependen del contrato, no de los
  detalles internos.
- Las etapas **no se importan entre sí**. Se comunican con tipos y ids de
  `src/domain` y `src/types`.
- Quien une las etapas es **`checkout/`** (el orquestador): reserva stock →
  crea el pedido → pide el pago. Es el único lugar que conoce el orden completo.
- `payments/` y `email/` son **adaptadores**: hoy no hay ningún proveedor
  conectado; cambiar de proveedor significa agregar un adaptador, no tocar
  pedidos, carrito ni checkout.
- Todo lo que toque la base de datos o secretos empieza con `import "server-only"`
  para que no pueda terminar dentro de un componente cliente por accidente.

## Estado actual

Solo hay contratos y reglas puras (estados de pedido, stock, dinero). La
implementación real (consultas, checkout, pagos, emails) es de las siguientes fases.
