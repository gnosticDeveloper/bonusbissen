# Diagrama de flujo para validación de canjes

```mermaid
flowchart TB
    A[Cliente muestra el código de canje al empleado] --> B[Empleado ingresa el código en el sistema]
    B --> C{¿El código es válido?}
    C -->|"No existe / ya fue usado"| D[Sistema rechaza el código]
    C -->|"Válido pero ya usado por otro empleado en simultáneo"| D
    D --> D2["Nota: revisar si el cliente veía el código como 'disponible' en su pantalla por no haber refrescado (estado stale) vs. una validación real en simultáneo (race condition)"]
    C -->|Válido| E[Sistema muestra la recompensa y los datos del cliente]
    E --> F{¿Tipo de recompensa?}
    F -->|Producto o servicio físico| G[Empleado verifica stock o disponibilidad]
    F -->|Descuento| H["Empleado debe aplicar el descuento MANUALMENTE en el sistema de cobro de terceros (POS). Bonus Bissen no tiene control ni visibilidad sobre esta aplicación"]
    G --> I{¿Está disponible?}
    H --> I
    I -->|Sí| J[Empleado entrega la recompensa o aplica el descuento]
    I -->|No| K{Empleado decide}
    J --> L[Empleado confirma el canje en el sistema]
    L --> M["Sistema marca el canje como 'Confirmado' e invalida el código"]
    K -->|Anular y devolver puntos| N[Sistema devuelve los puntos gastados al cliente]
    K -->|Anular sin devolver puntos| O["Sistema descarta el canje. Los puntos NO se devuelven"]
    N --> P["Sistema marca el canje como 'Anulado - con devolución'"]
    O --> Q["Sistema marca el canje como 'Anulado - sin devolución'"]
```

## FAQ

1. ¿Qué pasa si el código de canje ya fue usado o no existe?
> Si se ingresa un código que ya fue usado o no existe el sistema lo rechaza, especificando en cada escenario que fue o usado o que no existe tal código.

2. ¿Cómo se controla un canje de tipo descuento si el negocio usa un sistema de cobro de terceros para facturar?
> Todos los descuentos y recompensas que con negocio pueda ofrecer se aplican de forma manual. Bonus Bissen no interactua de ninguna forma con sistemas de terceros. Los descuentos, por ejemplo, deben aplicarse de forma manual por los empleados a la ahora de cobrar el producto o servicio.

3. ¿Qué diferencia hay entre "anular y devolver puntos" y "anular sin devolver puntos"? ¿Cuándo se usa cada opción?
> En ambos casos un canje queda anulado. Anular y devolver los puntos puede usarse cuando un cliente canjea una recompensa, pero al momento de ir a buscarla ya no está disponible (falta de stock, recompensa ya no es valida, etc.) y sin devolver los puntos se usa en casos donde ...

4. ¿Queda algún registro de quién anuló un canje y por qué?
> Si, se registra quién hace las validaciones (confirma y anular canjes), aunque bonus bissen no cuenta con una opción para especificar "por qués".

5. ¿Qué pasa si un cliente ve una recompensa o un código en su pantalla que ya fue eliminado o usado, porque no actualizó la app?
> El sistema valida internamente que al canjear una recompensa esta esté disponible. En cuyo caso que el cliente canjee algo que ya no está disponible por un estado `stale` del frontend, el servido responderá con un mensaje tipo "Esta recompensa ya no está disponible" y no se le descontaran los puntos.

6. ¿Puede un empleado modificar la cantidad de puntos que se devuelve al anular un canje, o siempre se devuelve el valor exacto que se gastó?
> Siempre se devuelve el valor exacto que se gastó.
