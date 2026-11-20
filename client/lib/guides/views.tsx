import { Award, Building2, Coins, Home, QrCode, ReceiptText, ShieldAlert, UserRoundGroup, UsersRound } from "lucide-react";
import { Term } from "@/components/guides/guide-term";
import { OVERDUE_AFTER_DAYS } from "@/lib/helpers/dashboard";
import { UserRole } from "@/lib/types/user";
import type { GuideStep, ViewGuide } from "./types";

/*
 * Every dashboard guide lives here. To extend one, add a step or tip with a NEW id (and, for steps,
 * `addedOn`): users who already finished the tour see only that step, marked "Nuevo"; new users see
 * it in sequence with the rest. Never reuse or rename an id that already shipped. Steps whose target isn't on screen (an empty
 * list, the sidebar on a phone) are left for a later visit instead of being marked as seen.
 *
 * Targets are `data-guide="<name>"` attributes on the page's elements.
 */

const BOTH = [UserRole.ADMIN, UserRole.CASHIER];
const ADMIN = [UserRole.ADMIN];

const HELP_BUTTON_STEP = (id: string): GuideStep => ({
  id,
  target: "help-button",
  title: "¿Dudas? Tocá el «?»",
  body: <p>En las pantallas con más reglas vas a encontrar este botón, con una explicación paso a paso de cómo funciona cada cosa.</p>,
});

export const VIEW_GUIDES: ViewGuide[] = [
  {
    id: "home",
    path: "/inicio",
    title: "Inicio",
    summary: "Cómo leer el resumen del local y atender los canjes pendientes.",
    icon: Home,
    roles: BOTH,
    steps: [
      {
        id: "welcome",
        title: "Te damos la bienvenida al panel",
        body: (
          <>
            <p>Desde acá vos y tu equipo atienden a los clientes: suman puntos, entregan recompensas y siguen cómo viene el local.</p>
            <p>La primera vez que entrás a cada pantalla te mostramos una guía corta como esta. Si querés repasarla, la encontrás en <strong>Ayuda</strong>.</p>
          </>
        ),
      },
      {
        id: "storefront",
        target: "storefront-switcher",
        title: "Trabajás sobre un local",
        body: (
          <p>
            Todo lo que ves y registrás en el panel corresponde al local que elegiste al entrar. Si tenés más de uno asignado, podés cambiar desde acá.
          </p>
        ),
      },
      {
        id: "stats",
        target: "home-stats",
        title: "Un vistazo a los últimos 30 días",
        body: (
          <p>
            Canjes, canjes que esperan entrega, clientes activos y puntos otorgados en el <Term id="programa">programa de puntos</Term> de este local. Cada
            número se compara con los 30 días anteriores.
          </p>
        ),
      },
      {
        id: "pending",
        target: "home-pending",
        title: "Canjes por entregar",
        body: (
          <p>
            Cuando un cliente pide una recompensa, aparece acá hasta que alguien del equipo revisa su <Term id="codigo-canje">código de canje</Term> y
            confirma la entrega. Los que esperan hace más de {OVERDUE_AFTER_DAYS} días se resaltan en amarillo.
          </p>
        ),
      },
      {
        id: "nav-storefront",
        target: "nav-section-storefront",
        title: "Lo de todos los días",
        body: (
          <p>
            En <strong>Local</strong> tenés lo que usás en el mostrador: sumar puntos, validar canjes y consultar las recompensas.
          </p>
        ),
      },
      {
        id: "nav-organization",
        target: "nav-section-org",
        title: "La configuración de tu negocio",
        roles: ADMIN,
        body: (
          <p>
            En <strong>Organización</strong> cargás el logo y el banner, creás locales y programas de puntos, sumás cajeros y revisás quién hizo cada cosa.
          </p>
        ),
      },
      {
        id: "nav-account",
        target: "nav-section-account",
        title: "Ayuda y tu cuenta",
        body: (
          <p>
            En <strong>Cuenta</strong> encontrás estas guías cuando las necesites, tus datos personales y la configuración del panel, donde podés cambiar el tema o apagar estas guías.
          </p>
        ),
      },
    ],
    tips: [
      {
        id: "validate",
        target: "home-validate",
        body: <p>Tocá <strong>Validar</strong> para confirmar la entrega sin salir del inicio.</p>,
      },
      {
        id: "pending-badge",
        target: "nav-badge-redemptions",
        body: <p>Este número te avisa cuántos canjes esperan entrega en todo el negocio.</p>,
      },
      {
        id: "collapse",
        target: "sidebar-toggle",
        body: <p>Achicá la barra lateral para ganar espacio. La próxima vez que entres la vas a encontrar igual.</p>,
      },
    ],
  },
  {
    id: "points",
    path: "/administrar-puntos",
    title: "Administrar puntos",
    summary: "Cómo sumar puntos por una compra, restar y corregir movimientos.",
    icon: Coins,
    roles: BOTH,
    steps: [
      {
        id: "search",
        target: "customer-search",
        title: "Buscá al cliente",
        body: (
          <>
            <p>Escribí su nombre o email y elegilo de la lista. Al lado de cada nombre ves cuántos puntos tiene en el programa de este local.</p>
            <p>
              Si dice <strong>Saldo no disponible</strong>, todavía no se <Term id="afiliacion">afilió</Term> a este local: pedile que lo haga antes de
              sumarle puntos.
            </p>
          </>
        ),
      },
      {
        id: "mode",
        target: "grant-mode",
        title: "Por monto o manual",
        body: (
          <>
            <p>
              <strong>Por monto</strong> convierte la compra en puntos: 1 punto por cada $1.000 gastados. <strong>Manual</strong> te deja sumar o restar una
              cantidad exacta.
            </p>
            <p>
              Si una resta supera los puntos que tiene, te pedimos confirmar: el cliente queda con <Term id="deuda">puntos en deuda</Term>.
            </p>
          </>
        ),
      },
      {
        id: "history",
        target: "points-history",
        title: "Historial y correcciones",
        body: (
          <p>
            Cada movimiento queda registrado con quién lo hizo. Con el lápiz registrás una <Term id="correccion">corrección</Term>: el movimiento original no
            se borra, se suma un ajuste que queda a la vista.
          </p>
        ),
      },
      HELP_BUTTON_STEP("help"),
    ],
    tips: [
      {
        id: "note",
        target: "grant-note",
        body: <p>Dejá una nota con el motivo. Después ayuda a entender cada movimiento, a vos y al resto del equipo.</p>,
      },
      {
        id: "edit",
        target: "points-edit",
        body: <p>Si te equivocaste, corregí el movimiento desde acá en lugar de cargar uno nuevo.</p>,
      },
    ],
  },
  {
    id: "redemptions",
    path: "/verificacion-canjes",
    title: "Validación de canjes",
    summary: "Cómo revisar el código de un cliente y entregar o anular su recompensa.",
    icon: QrCode,
    roles: BOTH,
    steps: [
      {
        id: "code",
        target: "code-search",
        title: "Ingresá el código de canje",
        body: (
          <>
            <p>
              El cliente ve su <Term id="codigo-canje">código de canje</Term> en la app, en <strong>Mis canjes</strong>. Al buscarlo ves la recompensa, quién
              la pidió y cuántos puntos costó.
            </p>
            <p>Un código solo funciona en los locales que comparten el mismo programa de puntos.</p>
          </>
        ),
      },
      {
        id: "resolved",
        target: "resolved-list",
        title: "Entregados y anulados",
        body: (
          <p>
            Cuando confirmás la entrega o anulás un canje, pasa a esta lista con el nombre de quien lo resolvió. Si anulás devolviendo los puntos, el
            cliente los recupera al instante.
          </p>
        ),
      },
      HELP_BUTTON_STEP("help"),
    ],
    tips: [
      {
        id: "format",
        target: "code-input",
        body: <p>El código tiene 6 caracteres: cuatro números, una letra y un número. Por ejemplo, 1234A5.</p>,
      },
    ],
  },
  {
    id: "rewards",
    path: "/gestion-recompensas",
    title: "Gestión de recompensas",
    summary: "Qué recompensas pueden pedir tus clientes y cómo mantener el catálogo.",
    icon: Award,
    roles: BOTH,
    steps: [
      {
        id: "catalog",
        target: "rewards-list",
        title: "El catálogo de este local",
        body: (
          <p>
            Las recompensas pertenecen al <Term id="programa">programa de puntos</Term>, no al local: acá ves las del programa del local en el que estás.
          </p>
        ),
      },
      {
        id: "create",
        target: "create-reward",
        title: "Creá tus recompensas",
        roles: ADMIN,
        body: <p>Elegí el nombre, cuántos puntos cuesta, una imagen y el programa. Aparecen enseguida en la app de tus clientes.</p>,
      },
      {
        id: "read-only",
        title: "Para consultar",
        roles: [UserRole.CASHIER],
        body: <p>Podés ver el catálogo para atender a los clientes. Si hay que cambiar algo, avisale a un administrador.</p>,
      },
      {
        id: "view",
        target: "reward-view",
        title: "Cuadrícula o lista",
        body: <p>Elegí cómo ver el catálogo. Lo recordamos en este dispositivo.</p>,
      },
    ],
    tips: [
      {
        id: "edit",
        target: "reward-actions",
        roles: ADMIN,
        body: <p>Desde acá editás una recompensa o la eliminás del catálogo.</p>,
      },
    ],
  },
  {
    id: "customers",
    path: "/clientes",
    title: "Clientes",
    summary: "Quiénes se sumaron a este local y cómo viene su actividad.",
    icon: UsersRound,
    roles: ADMIN,
    steps: [
      {
        id: "table",
        target: "customers-table",
        title: "Quiénes se sumaron a este local",
        body: (
          <p>
            El <strong>Saldo</strong> es el de todo el programa. <strong>Sumados</strong> y <strong>Canjeados</strong> cuentan solo lo que pasó en este
            local.
          </p>
        ),
      },
      {
        id: "search",
        target: "customers-search",
        title: "Encontrá a un cliente",
        body: <p>Buscá por nombre, usuario o email.</p>,
      },
    ],
    tips: [
      {
        id: "sort",
        target: "customers-sort",
        body: <p>Tocá un encabezado para ordenar la lista, por ejemplo por saldo o por último movimiento.</p>,
      },
    ],
  },
  {
    id: "join-qr",
    path: "/codigo-qr",
    title: "QR de afiliación",
    summary: "El código que tus clientes escanean para sumarse al local.",
    icon: QrCode,
    roles: ADMIN,
    steps: [
      {
        id: "card",
        target: "qr-card",
        title: "El QR para tu mostrador",
        body: (
          <p>
            Imprimí este <Term id="qr">código QR</Term> o mostralo en una pantalla. Al escanearlo con el celular, el cliente llega a la página para sumarse a
            este local y empezar a juntar puntos.
          </p>
        ),
      },
    ],
    tips: [
      {
        id: "format",
        target: "qr-format",
        body: (
          <p>
            ¿Lo vas a mandar a imprimir? Elegí entre <Term id="formatos-imagen">PNG o SVG</Term> según dónde lo uses.
          </p>
        ),
      },
    ],
  },
  {
    id: "organization",
    path: "/mi-negocio",
    title: "Mi negocio",
    summary: "Tu marca, tus locales y tus programas de puntos.",
    icon: Building2,
    roles: ADMIN,
    steps: [
      {
        id: "brand",
        target: "org-section",
        title: "Ponele tu marca",
        body: <p>El nombre, el logo y el banner de tu negocio aparecen en la app de clientes, en la lista de negocios y en la página de cada local.</p>,
      },
      {
        id: "storefronts",
        target: "storefronts-section",
        title: "Tus locales",
        body: (
          <p>
            Cada local es un lugar físico o una tienda online donde tus clientes se afilian y suman puntos. Podés editarlos, cambiar su color o crear uno
            nuevo; los activos aparecen en la app de clientes.
          </p>
        ),
      },
      {
        id: "programs",
        target: "programs-section",
        title: "Programas de puntos",
        body: (
          <p>
            Los puntos pertenecen al <Term id="programa">programa</Term>, no al local: si dos locales comparten programa, el cliente usa sus puntos en
            cualquiera de los dos. Cada local puede tener un solo programa.
          </p>
        ),
      },
      HELP_BUTTON_STEP("help"),
    ],
    tips: [
      {
        id: "preview",
        target: "org-preview",
        body: <p>Mirá cómo ven tu negocio tus clientes desde el celular.</p>,
      },
    ],
  },
  {
    id: "billing",
    path: "/facturacion",
    title: "Facturación",
    summary: "Tu plan, el próximo vencimiento y tus facturas.",
    icon: ReceiptText,
    roles: ADMIN,
    steps: [
      {
        id: "plan",
        target: "billing-plan",
        title: "Tu plan y sus vencimientos",
        body: (
          <p>
            Acá ves el plan contratado, si la <Term id="cobro-automatico">autorización de cobro</Term> en Mercado Pago está activa y cuándo vence la próxima
            factura.
          </p>
        ),
      },
      {
        id: "invoices",
        target: "billing-invoices",
        title: "Historial de facturas",
        body: (
          <p>
            Cada factura muestra si está pagada y su referencia de pago. Podés descargar el comprobante en <Term id="pdf">PDF</Term> para tus registros.
          </p>
        ),
      },
    ],
    tips: [
      {
        id: "refresh",
        target: "billing-refresh",
        body: <p>Si acabás de pagar, tocá <strong>Actualizar</strong> para ver el estado más reciente.</p>,
      },
    ],
  },
  {
    id: "employees",
    path: "/empleados",
    title: "Empleados",
    summary: "Quién trabaja en cada local y cómo sumar cajeros.",
    icon: UserRoundGroup,
    roles: ADMIN,
    steps: [
      {
        id: "table",
        target: "staff-table",
        title: "Tu equipo",
        body: (
          <p>
            Cada persona tiene un rol y uno o más locales asignados. Los administradores ven todo el negocio; los cajeros, solo lo que pasa en su local.
          </p>
        ),
      },
      {
        id: "add",
        target: "add-cashier",
        title: "Sumá un cajero",
        body: (
          <p>
            Buscá la cuenta de Bonus Bissen de la persona y elegí en qué local va a trabajar. Si todavía no tiene cuenta, primero tiene que crearla desde la
            app.
          </p>
        ),
      },
      {
        id: "filter",
        target: "staff-filter",
        title: "Filtrá por local",
        body: <p>Mirá de un vistazo quién trabaja en cada local.</p>,
      },
    ],
    tips: [],
  },
  {
    id: "audit",
    path: "/auditoria",
    title: "Auditoría",
    summary: "Quién hizo cada operación, a quién afectó y cuándo.",
    icon: ShieldAlert,
    roles: ADMIN,
    steps: [
      {
        id: "filters",
        target: "audit-filters",
        title: "Quién hizo qué, y cuándo",
        body: (
          <>
            <p>Cada operación del negocio queda registrada: puntos, correcciones, canjes, altas de personal y cierres de sesión.</p>
            <p>Para empezar, elegí al menos un filtro: quién hizo la operación, a quién afectó o qué tipo de operación fue.</p>
          </>
        ),
      },
      {
        id: "records",
        target: "audit-records",
        title: "Los resultados",
        body: (
          <p>
            Van del más reciente al más antiguo, con fecha y hora de Argentina. En <strong>Detalle</strong> ves el motivo, la recompensa o el local cuando
            están disponibles.
          </p>
        ),
      },
      HELP_BUTTON_STEP("help"),
    ],
    tips: [],
  },
];

/** The guide for a dashboard pathname (`/d/<slug>/<route>`), if the role can open that view. */
export function findViewGuide(pathname: string, role: UserRole): ViewGuide | null {
  const route = pathname.match(/^\/d\/[^/]+(\/[^?#]*)$/)?.[1]?.replace(/\/$/, "");
  if (!route) return null;
  return VIEW_GUIDES.find((view) => view.path === route && view.roles.includes(role)) ?? null;
}
