# Planes y autorización de cobros

Dos pantallas independientes, sin cambios en el estado, las acciones raíz, el progreso ni el layout del onboarding:

```tsx
import { PlanSelectionScreen } from "./pago/plan-selection-screen";
import { PaymentScreen } from "./pago/payment-button";

<PlanSelectionScreen
  expectedOrganizationId={organizationId}
  onContinue={goToPayment}
  disabled={transitioning}
/>
<PaymentScreen
  expectedOrganizationId={organizationId}
  onContinue={goToNextStep}
  disabled={transitioning}
/>
```

## Contrato para integrar las slides

Ambas aceptan `expectedOrganizationId?: string`, `onContinue?: () => void` y `disabled?: boolean`. El padre monta únicamente la slide visible. No se agrega un argumento de plan al callback ni se modifica el progreso compartido.

- `PlanSelectionScreen`: carga catálogo real con `getBillingPlans(expectedOrganizationId)`. Las cards usan ID, nombre, precio y moneda del backend, una ilustración local sin servicios externos y un checklist temporal compartido sobre el recorrido. No inventan tiers, cupos ni beneficios diferenciados. Al elegir, se vuelve a validar el ID contra el catálogo, se hace PUT, se consulta nuevamente la organización esperada y se comprueba su nombre de plan antes de llamar a `onContinue()`. El ID solicitado y aceptado por PUT es la referencia de selección; el GET no permite verificar su identidad estable. Sin callback, va a `/onboarding/pago`.
- `PaymentScreen`: conserva el contrato anterior. A la izquierda pide el email de Mercado Pago y prepara un enlace seguro; a la derecha muestra imagen, nombre del plan y ciclo mensual. No contiene selector, facturas, tarjeta, información fiscal, cobro anual, impuestos ni un supuesto total a pagar hoy. Solo llama a `onContinue()` después de reconsultar y verificar `authorized`; sin callback vuelve a `/onboarding`.
- La ruta independiente `/onboarding/pago` no selecciona planes. Si falta un plan, ofrece un enlace a `/onboarding` para elegirlo.
- Cerrar sesión está al pie de cada componente. Revoca la sesión dashboard y elimina solo sus cookies, sin cerrar la sesión de cliente.

## Backend y límite de identidad del plan

- `GET /organization`: organización actual, nombre del plan y estado de autorización.
- `GET /organization/billing-plans`: catálogo con IDs, nombres, precios y monedas; solo se usa en selección.
- `PUT /organization/billing-plan`: exclusivamente `{ billingPlanId }`. Puede modificar el importe de una suscripción existente.
- `POST /organization/billing/checkout`: exclusivamente `{ payerEmail }`. Se verifican `initPoint` y `status`; no se envía una URL de retorno inventada.
- `DELETE /organization/billing/subscription`: acción conservada y probada, sin UI de cancelación en este recorrido.

**La organización no devuelve `billingPlanId`.** `BillingPlan.name` no es único ni en la entidad ni en `9__billing.sql`. Incluso si el catálogo actual tuviera un solo nombre coincidente, no prueba la identidad del plan asignado: podría existir otro inactivo. Por eso pago no consulta el catálogo ni deduce precios por nombre; muestra únicamente el nombre informado y el ciclo mensual disponible en el backend. Para un resumen con precio verificable hace falta exponer un ID estable del plan asignado o un resumen de suscripción desde el backend. No se modificó backend ni se agregó estado de progreso para sortear esta limitación.

`BillingData` ya no contiene facturas. Ninguna de estas acciones consulta `/organization/invoices`. Los helpers de formato/esquema de facturas de `lib/billing.ts` permanecen independientes del flujo.

## Sesión, consultas y concurrencia

Cada acción verifica la sesión dashboard, exige ADMIN y compara la organización con el ID esperado antes de consultar catálogo o mutar. La carga inicial es una Server Action para permitir renovación y rotación de cookies. No se usa el helper que redirige si falta sesión. Solo se renueva ante token ausente o vencido. Una pantalla independiente fija la organización de su primera carga; no cambia silenciosamente de negocio.

`RequestGate` impide solapar cargas, consultas automáticas, selección, checkout, continuación y logout dentro de la instancia. Al desmontar o cambiar de organización, un `AbortController` invalida respuestas y evita cambios de estado, navegación y callbacks tardíos. **No cancela la Server Action ya enviada ni revierte una mutación en backend**; el fetch servidor tiene su propio timeout de 15 segundos. No se promete exclusión entre pestañas ni idempotencia de red.

Mientras la autorización está `pending` (o existe un checkout todavía sin estado), se consulta cada 5 segundos con la pestaña visible y al recuperar foco/visibilidad. Ambos disparadores comparten un presupuesto máximo de 12 intentos automáticos por montaje; no se reinicia con cada render, error ni retry. Se detienen timers/listeners al salir de pendiente, ante error, al deshabilitar la pantalla o al desmontar. Al agotar el presupuesto no aparece un botón de actualización manual: se informa que la confirmación puede demorar y que puede volver más tarde. Una consulta fallida muestra un retry contextual que solo hace GET; nunca repite automáticamente PUT, POST ni DELETE. Una mutación podría haberse aplicado aunque su respuesta se haya perdido.

Estados `pending`, `authorized`, `paused`, `cancelled`, `finished`, ausencia y desconocidos tienen tratamiento explícito. **`authorized` no confirma un pago.** No se utilizan parámetros de regreso, localStorage ni cookies de progreso como evidencia de pago. El regreso configurado en backend debe llevar a una entrada que monte esta pantalla; la ruta frontend `/billing` existente deriva a `/onboarding/pago`.

El checkout admite únicamente HTTPS, sin credenciales ni puertos alternativos, con hosts exactos de Mercado Pago incluidos en `safeCheckoutUrl`. Un host distinto se rechaza. No se ejecutó un cobro real ni una prueba visual de navegador contra Mercado Pago.

## Validación

Desde `client`:

```sh
bun test ./app/onboarding/pago/billing.test.js ./app/onboarding/pago/request-gate.test.js
bun x tsc --noEmit --incremental false
bun x eslint app/onboarding/pago lib/billing.ts lib/billing-api.ts
```

Resultado de esta implementación: **21 tests pasaron**, TypeScript pasó con `--noEmit --incremental false` y `git diff --check` pasó para los archivos versionados del scope.

Los tests cubren ausencia de llamadas a facturas/planes en pago, catálogo real, nombres duplicados sin inferencia de precios, rechazo de IDs no disponibles, sesión y renovación, organización esperada, contratos de mutación, URLs seguras, errores HTTP/red/JSON, logout, exclusión mutua, invalidación al desmontar y presupuesto finito de polling/foco. No sustituyen una prueba de integración visual ni del proveedor.

Las guías locales `node_modules/next/dist/docs` no están disponibles en esta instalación. ESLint está bloqueado por una incompatibilidad existente: `react/display-name` intenta llamar a `contextOrFilename.getFilename`, que no es una función. No se modificaron dependencias para resolverla.
