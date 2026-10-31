# Onboarding

Todo el cambio vive en esta carpeta. No modifica proxy, landing, autenticación compartida ni backend.

## Recorrido

- `/onboarding/pago`: simulación explícita, sin tarjetas ni cobros. La acción guarda una marca httpOnly por 24 horas y redirige a `/onboarding`. No es autorización ni prueba de pago.
- Organización: reutiliza las acciones customer de registro/ingreso y sus schemas. Crea con `POST /organizations` (USER). Guarda inmediatamente el ID devuelto y solicita nuevamente las credenciales mediante la acción dashboard existente. Nunca persiste contraseñas en estado, cookies o almacenamiento del navegador.
- Sucursal: `POST /storefronts` (ADMIN); física con AddressSelector/georef, u online. Recupera sucursales activas ya existentes en lugar de repetir el alta inicial.
- Programa: `POST /point-programs` (ADMIN), vinculado a una sucursal activa del negocio verificada en backend. Si ya está vinculada, recupera el programa sin crear otro.
- Cierre: verifica nuevamente recursos y sesión y redirige a `/d/{organizationId}/mi-negocio`. No llama a `selectStorefront`: el backend no asigna la sucursal creada al staff.

## Reanudación y permisos

La cookie `onboarding_progress` dura siete días, es httpOnly, SameSite=Lax, Secure en producción y está acotada a `/onboarding`. Contiene sólo IDs de organización y usuario; **no se considera una credencial**. La organización se verifica con `GET /organization` y las colecciones se recuperan sin caché desde el backend. Cada mutación vuelve a verificar la sesión y usa los helpers autenticados existentes; el backend sigue siendo la autoridad de permisos.

Si vence la sesión, el ingreso vuelve a aparecer dentro de Organización. No se renuevan tokens mediante lógica nueva. La opción «Ya creé una organización: retomar» permite buscar el negocio e ingresar si se perdió o venció la cookie, o si se perdió la respuesta de creación. No permite acceder sin credenciales ADMIN. Un usuario ya staff no puede crear otra organización: se muestra el error del backend y puede usar ese reingreso.

Los campos sin enviar no se persisten. Se recuperan únicamente recursos guardados. No se intenta almacenar datos sensibles ni contraseñas para facilitar la recarga.

## Límites del contrato

- No hay bloqueo de permisos para el alta completa: los controladores permiten ADMIN sin sucursal seleccionada.
- No hay claves de idempotencia en estos endpoints. La consulta previa evita duplicaciones secuenciales (incluida una respuesta perdida de sucursal/programa), pero no garantiza exactamente una creación ante solicitudes concurrentes desde pestañas o dispositivos distintos. Resolverlo completamente requiere soporte transaccional/idempotencia del backend. El botón se bloquea durante cada envío.
- Si se pierde la respuesta de `POST /organizations` antes de guardar la cookie, se debe usar «retomar». El backend rechaza una nueva creación para un usuario que ya es staff.
- Este recorrido configura la primera sucursal activa. En negocios recuperados reutiliza las existentes; la gestión de recursos adicionales o programas inactivos se hace en Mi negocio.
- AddressSelector utiliza el servicio georef existente; la búsqueda requiere disponibilidad de ese servicio.
- La publicación de las rutas públicas y los tests de proxy quedan fuera de este cambio, a cargo de la integración indicada por el usuario.

## Validación

Compilador local: `node node_modules/typescript/bin/tsc --noEmit` desde `client`.
No se agregaron tests superficiales ni se ejecutó un flujo E2E contra un backend con sesiones reales.
