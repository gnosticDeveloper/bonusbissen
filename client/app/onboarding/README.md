# Onboarding

## Recorrido

Cinco diapositivas: Organización → Plan → Mercado Pago → Sucursal → Programa de puntos. Organización requiere cuenta y sesión ADMIN según los contratos existentes. El root consume `PlanSelectionScreen` de `./pago/plan-selection-screen` y `PaymentScreen` de `./pago/payment-button`, ambos con `{ expectedOrganizationId, onContinue, disabled }`. Cada callback vuelve a consultar el estado backend antes de avanzar. Los screens de billing pertenecen a otro alcance: no se modifican aquí.

No hay card común envolviendo las slides: Organización usa una columna centrada y angosta; Plan dispone de ancho para sus cards; Mercado Pago conserva sus columnas; Sucursal y Programa usan ancho de formulario. Sólo desde `lg` se amplía el layout de `max-w-2xl` a `max-w-6xl` y se compacta el espaciado exterior. En mobile se conservan anchos, padding y separación existentes. No se fija la altura ni se recorta contenido: el documento hace scroll vertical cuando sea necesario. El root no ofrece botones «Actualizar estado», consultas de facturas ni enlaces de escape a Mi negocio o gestión de billing. Sólo los errores ofrecen reintento contextual de consulta. Mi negocio se abre mediante finalización verificada. El footer de logout del root aparece fuera de Plan/MP; esos screens ya tienen su propio footer. `leaveOnboarding` revoca ambas sesiones mediante el helper existente, elimina sus cookies y expira el hint, sin borrar recursos ni la preferencia local.

Billing utiliza autenticación independiente. `adminOrganization` valida el contexto específico del onboarding y no es un helper genérico de billing. Sucursal, programa y finalización verifican en sus Server Actions que `GET /organization` informe un `billingPlanName` no vacío y `mercadoPagoSubscriptionStatus === "authorized"`. El response no incluye un ID de plan: no se inventa ni se infiere ID, precio o permisos a partir del nombre. Es un requisito de este recorrido frontend, no una política global nueva del backend. Ausencia o cualquier otro estado bloquean la configuración. No se exige una factura pagada: las cuotas pueden cobrarse en el futuro. El progreso local no autoriza cobros ni acredita pagos.

### Contratos TypeScript

- `OnboardingState.userId: string | null`: identidad verificada con sesión y backend. No se obtiene de localStorage ni de una cookie de progreso. Sin identidad verificada, el cliente no lee ni escribe progreso local.
- `finishOnboarding(): Promise<FinishResult>` devuelve `{ error: string }` o `{ error: null, userId: string, destination: string }`. La navegación se realiza en el cliente después del intento de limpieza local. El destino se construye en servidor después de verificar organización, suscripción autorizada, sucursal activa y programa vinculado. No hay un endpoint nuevo de completion: se verifica la configuración persistida mediante los GET existentes.
- `OnboardingProgressStore`: interfaz async `load(userId)`, `save(userId, progress)` y `clear(userId)` en `client/lib/onboarding-progress.ts`. `createOnboardingProgressStore()` selecciona la implementación predeterminada y serializa las operaciones. El componente sólo conoce esta fábrica y la interfaz; también acepta un adapter opcional `progressStore` para pruebas o integración.

## Persistencia y reanudación

LocalStorage guarda solamente una preferencia de navegación, nunca habilita etapas. Clave: `onboarding-progress:v3:{userId codificado}`. Sólo guarda versión 3, usuario, organización y paso (0–4). Al leer v2 se migran 0→0, 1→2, 2→3 y 3→4; desde v1 se migran 0→0, 1→3 y 2→4. La lectura prioriza v3, luego v2 y finalmente v1. Al guardar v3 se eliminan las claves anteriores; al finalizar se limpian las tres versiones. No guarda campos de formularios, contraseñas, tokens ni datos de pago. La escritura usa una lista explícita de campos permitidos.

Antes de guardar se espera la restauración, evitando sobrescribir el paso almacenado al montar. Cada cambio de paso se persiste. La restauración sólo acepta el mismo usuario y organización y limita el paso según los recursos verificados por el backend. `availableStep` devuelve 0 sin organización verificada, 1 sin `billingPlanName`, 2 sin autorización, 3 sin sucursales y 4 en los demás casos, en ese orden. Incluso una organización autorizada con recursos existentes vuelve a Plan si backend no informa un nombre de plan. Un paso local nunca evita estas restricciones. Un paso guardado en Plan (1) o Mercado Pago (2) avanza al máximo verificado si backend ya confirmó su requisito. Esto evita quedar atrapado en el paso anterior tras un retorno externo o la migración. `/billing` mantiene su retorno a `/onboarding/pago`; «Continuar configuración» vuelve a `/onboarding`, que consulta backend de nuevo. No se usa query ni almacenamiento como evidencia de autorización. También se refresca el estado al continuar desde cada diapositiva o avanzar desde el navegador de pasos. Se restaura sólo al montar o cambiar la identidad/organización, no después de cada refresh o mutación del mismo contexto. Las acciones exitosas mantienen su avance explícito; ante fallos, el paso actual se limita según los recursos verificados. Una restauración lenta no sobrescribe navegación ni resultados de acciones posteriores, y una respuesta de otro contexto se descarta. Las operaciones async se serializan, para que una escritura pendiente no reaparezca después del borrado.

La cookie `onboarding_progress` es sólo un hint temporal con IDs, httpOnly, SameSite=Lax, Secure en producción, siete días y path `/onboarding`. Su owner se compara con las identidades de sesión antes de usarla. Una cookie ajena no permite exponer recursos ni escribir en otro negocio. Sin cookie válida, una sesión ADMIN y `GET /organization` permiten recuperar el negocio; la cookie no autoriza nada por sí sola.

El primer ingreso, la cuenta recién creada y la organización pendiente del primer login admin no muestran un error de sesión: no tener sesión admin todavía es normal. Una sesión realmente expirada o no verificable sí informa reingreso o reintento. Una cookie de otra cuenta no bloquea crear una organización; sólo se reemplaza tras confirmar el alta en backend para el usuario actual. Para retomar un negocio con una cookie ajena se requiere selección explícita y login ADMIN verificado.

Al vencer las sesiones se vuelve a Organización para reingresar. Sin identidad verificada no se muestra el progreso de la cuenta anterior. «Ya creé una organización: retomar» permite buscar el negocio cuando no hay un hint propio disponible. No se renuevan tokens con lógica nueva. Si las sesiones customer y dashboard pertenecen a personas distintas, se exige reingreso con la misma cuenta.

Al finalizar, el servidor verifica de nuevo los recursos y expira el hint. El cliente espera `clear(userId)` antes de `router.push(destination)`. Si el backend rechaza el cierre no se borra el progreso. Si falla el borrado local, se informa el fallo y se navega igualmente después del intento: el almacenamiento opcional del navegador no bloquea un cierre confirmado por backend. Puede quedar un hint local obsoleto, que se volverá a validar contra sesión y backend al regresar. Si localStorage no está disponible al cargar/guardar, se informa sin impedir que los recursos se guarden en backend.

## Límites

- El bloqueo global de rutas/dashboard/settings queda pendiente de aclaración del usuario. Este cambio sólo aplica gates dentro del onboarding y sus acciones; no agrega protección global ni modifica Java, billing lib o `pago/**`.
- Los recursos se consultan sin caché. Sucursal y programa ya existentes se reutilizan para evitar altas duplicadas en reintentos secuenciales.
- No hay claves de idempotencia ni coordinación entre pestañas/dispositivos. La garantía de exactamente una creación requiere soporte backend.
- Si se pierde la respuesta de creación de organización antes de guardar el hint, se debe usar «retomar». El backend rechaza una nueva creación para quien ya es staff.
- No se selecciona sucursal automáticamente ni se asigna al staff al cerrar; el destino es Mi negocio de la organización.
- No se persisten campos sin enviar. AddressSelector sigue usando georef.

## Validación

Desde `client`, ejecutar las suites por separado porque la suite de acciones reemplaza módulos del runtime Next:

```sh
bun test ./app/onboarding/onboarding.test.js
bun test ./lib/onboarding-progress.test.js
bun test ./app/onboarding/pago/billing.test.js
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

Cobertura: autorización/owner, expiración, recuperación sin cookie, reintentos, vínculo de programa, destino de cierre, aislamiento local por usuario, registros corruptos, allowlist, migraciones v1/v2→v3, retorno autorizado, revocación de plan/suscripción, bloqueo de setup/cierre sin plan aun estando autorizado, restauración limitada por backend, almacenamiento bloqueado y orden save → clear → navegación. La prueba de persistencia verifica que el gate de plan precede a checkout y recursos posteriores; las acciones de checkout permanecen a cargo de billing.

Guías Next.js consultadas en la versión instalada (16.3.4):
- `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`: layouts anidados y su persistencia entre navegaciones.
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md`: navegación cliente con destino verificado y diferencias respecto de `refresh()`.

Validación de este refactor: 52 tests de onboarding, 16 de persistencia y 17 de billing pasan, ejecutados en procesos separados. TypeScript (`tsc --noEmit --incremental false`) y `git diff --check` pasan. ESLint sobre los archivos TypeScript del alcance falla al cargar la regla `react/display-name`: `contextOrFilename.getFilename is not a function` (ESLint 10.10.0 / plugin React); no se modifican dependencias para resolverlo.

No se ejecutó build ni E2E contra backend ni cobro real; la adaptación visual requiere revisión manual en desktop alto/bajo y mobile.
