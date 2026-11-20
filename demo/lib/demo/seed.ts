import { auditForClaim, auditForCorrection, auditForExchangeResolution, auditForGrant, auditForStaffCreate } from "./audit";
import {
  ExchangeState,
  UserRole,
  type DemoState,
  type Exchange,
  type Reward,
  type Transaction,
} from "./types";

export const DEMO_VERSION = 3;

/** Ids the rest of the demo refers to (tours, hints, credentials). */
export const DEMO_IDS = {
  org: "org-demo",
  centro: "sf-centro",
  palermo: "sf-palermo",
  club: "pp-club",
  granos: "pp-granos",
  customer: "c-sofia",
  admin: "st-lucia",
} as const;

/** Credentials shown on the sign-in pages. Simulated: nothing leaves the browser. */
export const DEMO_CREDENTIALS = {
  customer: { identifier: "sofia", password: "cliente123", name: "Sofía Ramírez" },
  admin: { identifier: "lucia", password: "admin123", name: "Lucía Fernández", role: "Administradora · 2 locales" },
  cashier: { identifier: "martin", password: "cajero123", name: "Martín Gómez", role: "Cajero · Centro" },
} as const;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function addMonths(iso: string, months: number): string {
  const date = new Date(iso);
  date.setMonth(date.getMonth() + months);
  return date.toISOString();
}

export function createSeed(): DemoState {
  const now = Date.now();
  const ago = (days: number, hours = 0) => new Date(now - days * DAY - hours * HOUR).toISOString();
  const minutesAgo = (minutes: number) => new Date(now - minutes * 60 * 1000).toISOString();
  const ahead = (days: number) => new Date(now + days * DAY).toISOString();

  const state: DemoState = {
    version: DEMO_VERSION,
    organizations: [
      { id: DEMO_IDS.org, name: "Tu negocio", category: "Bar y cocina", logoUrl: null, bannerUrl: null, managed: true },
      { id: "org-espiga", name: "Panadería La Espiga", category: "Panadería", logoUrl: null, bannerUrl: null, managed: false },
      { id: "org-rayuela", name: "Librería Rayuela", category: "Librería", logoUrl: null, bannerUrl: null, managed: false },
    ],
    storefronts: [
      {
        id: DEMO_IDS.centro,
        orgId: DEMO_IDS.org,
        name: "Centro",
        online: false,
        address: "Av. Corrientes 1234",
        city: "Buenos Aires",
        province: "Ciudad Autónoma de Buenos Aires",
        category: "Bar",
        color: "#d4822b",
        hours: "Lun a Sáb · 12:00 - 00:00",
        description: "Bar de barrio con cocina de autor, cervezas artesanales y una carta de vinos cuidada. Un lugar para juntarse, brindar y volver.",
        active: true,
      },
      {
        id: DEMO_IDS.palermo,
        orgId: DEMO_IDS.org,
        name: "Palermo",
        online: false,
        address: "Honduras 4800",
        city: "Buenos Aires",
        province: "Ciudad Autónoma de Buenos Aires",
        category: "Cafetería",
        color: "#2f6f5e",
        hours: "Todos los días · 8:00 - 20:00",
        description: "Nuestra cafetería de especialidad: tostado propio, pastelería del día y un patio para quedarse un rato más.",
        active: true,
      },
      {
        id: "sf-espiga",
        orgId: "org-espiga",
        name: "Barrio Norte",
        online: false,
        address: "Av. Santa Fe 2650",
        city: "Buenos Aires",
        province: "Ciudad Autónoma de Buenos Aires",
        category: "Panadería",
        color: "#b5523b",
        hours: "Lun a Sáb · 7:00 - 20:30",
        description: "Panadería de masa madre y facturas recién horneadas desde 1987.",
        active: true,
      },
      {
        id: "sf-rayuela",
        orgId: "org-rayuela",
        name: "Pichincha",
        online: false,
        address: "Brown 2100",
        city: "Rosario",
        province: "Santa Fe",
        category: "Librería",
        color: "#3f4f8c",
        hours: "Lun a Sáb · 10:00 - 20:00",
        description: "Libros nuevos y usados, café en la terraza y presentaciones de autores cada semana.",
        active: true,
      },
    ],
    programs: [
      { id: DEMO_IDS.club, orgId: DEMO_IDS.org, name: "Club Tu negocio", unitLabel: "puntos", active: true, expirationMonths: null, storefrontIds: [DEMO_IDS.centro] },
      { id: DEMO_IDS.granos, orgId: DEMO_IDS.org, name: "Granos Palermo", unitLabel: "granos", active: true, expirationMonths: 6, storefrontIds: [DEMO_IDS.palermo] },
      { id: "pp-espiga", orgId: "org-espiga", name: "Migas La Espiga", unitLabel: "migas", active: true, expirationMonths: null, storefrontIds: ["sf-espiga"] },
      { id: "pp-rayuela", orgId: "org-rayuela", name: "Páginas Rayuela", unitLabel: "páginas", active: true, expirationMonths: 12, storefrontIds: ["sf-rayuela"] },
    ],
    rewards: [],
    customers: [
      { id: "c-sofia", name: "Sofía Ramírez", username: "sofia", email: "sofia@ejemplo.com", emailVerified: true, avatarUrl: null, password: "cliente123", createdAt: ago(220) },
      { id: "c-juan", name: "Juan Pérez", username: "juanp", email: "juan.perez@ejemplo.com", emailVerified: true, avatarUrl: null, password: "cliente123", createdAt: ago(95) },
      { id: "c-camila", name: "Camila Torres", username: "camit", email: "camila@ejemplo.com", emailVerified: false, avatarUrl: null, password: "cliente123", createdAt: ago(61) },
      { id: "c-diego", name: "Diego Morales", username: "diegom", email: "diego.morales@ejemplo.com", emailVerified: true, avatarUrl: null, password: "cliente123", createdAt: ago(210) },
      { id: "c-valentina", name: "Valentina Ruiz", username: "valer", email: "vale.ruiz@ejemplo.com", emailVerified: true, avatarUrl: null, password: "cliente123", createdAt: ago(46) },
      { id: "c-mateo", name: "Mateo Sánchez", username: "mateos", email: "mateo@ejemplo.com", emailVerified: false, avatarUrl: null, password: "cliente123", createdAt: ago(16) },
      { id: "c-martina", name: "Martina López", username: "martilopez", email: "martina.lopez@ejemplo.com", emailVerified: true, avatarUrl: null, password: "cliente123", createdAt: ago(140) },
      { id: "c-tomas", name: "Tomás Herrera", username: "tomash", email: "tomas.herrera@ejemplo.com", emailVerified: true, avatarUrl: null, password: "cliente123", createdAt: ago(3) },
    ],
    affiliations: [
      { userId: "c-sofia", storefrontId: DEMO_IDS.centro, joinedAt: ago(120) },
      { userId: "c-sofia", storefrontId: DEMO_IDS.palermo, joinedAt: ago(180) },
      { userId: "c-sofia", storefrontId: "sf-espiga", joinedAt: ago(200) },
      { userId: "c-juan", storefrontId: DEMO_IDS.centro, joinedAt: ago(88) },
      { userId: "c-camila", storefrontId: DEMO_IDS.palermo, joinedAt: ago(60) },
      { userId: "c-diego", storefrontId: DEMO_IDS.centro, joinedAt: ago(200) },
      { userId: "c-diego", storefrontId: DEMO_IDS.palermo, joinedAt: ago(195) },
      { userId: "c-valentina", storefrontId: DEMO_IDS.centro, joinedAt: ago(45) },
      { userId: "c-mateo", storefrontId: DEMO_IDS.palermo, joinedAt: ago(15) },
      { userId: "c-martina", storefrontId: DEMO_IDS.centro, joinedAt: ago(30) },
      { userId: "c-martina", storefrontId: "sf-espiga", joinedAt: ago(90) },
    ],
    transactions: [],
    exchanges: [],
    staff: [
      {
        id: DEMO_IDS.admin,
        userId: "u-lucia",
        username: "lucia",
        name: "Lucía Fernández",
        email: "lucia@tunegocio.com",
        emailVerified: true,
        password: "admin123",
        role: UserRole.ADMIN,
        active: true,
        storefrontIds: [DEMO_IDS.centro, DEMO_IDS.palermo],
        createdAt: ago(240),
      },
      {
        id: "st-martin",
        userId: "u-martin",
        username: "martin",
        name: "Martín Gómez",
        email: "martin@tunegocio.com",
        emailVerified: true,
        password: "cajero123",
        role: UserRole.CASHIER,
        active: true,
        storefrontIds: [DEMO_IDS.centro],
        createdAt: ago(200),
      },
      {
        id: "st-ana",
        userId: "u-ana",
        username: "ana",
        name: "Ana Costa",
        email: "ana@tunegocio.com",
        emailVerified: false,
        password: "cajero123",
        role: UserRole.CASHIER,
        active: true,
        storefrontIds: [DEMO_IDS.palermo],
        createdAt: ago(190),
      },
    ],
    audit: [],
    deviceSessions: {
      "c-sofia": [
        { id: "ds-1", device: "Chrome en Windows", current: true, createdAt: ago(2), lastUsedAt: ago(0) },
        { id: "ds-2", device: "Safari en iPhone", current: false, createdAt: ago(34), lastUsedAt: ago(1, 5) },
      ],
    },
    billing: {
      planName: "Plan Negocio",
      cycle: "monthly",
      subscriptionStatus: "authorized",
      nextInvoiceDueAt: ahead(18),
      invoices: [
        { id: "inv-1003", invoiceNumber: 1003, createdAt: ago(12), dueAt: ahead(18), paymentStatus: "pending", overdue: false, paidAt: null, paymentReference: null },
        { id: "inv-1002", invoiceNumber: 1002, createdAt: ago(42), dueAt: ago(12), paymentStatus: "paid", overdue: false, paidAt: ago(40), paymentReference: "MP-90214477" },
        { id: "inv-1001", invoiceNumber: 1001, createdAt: ago(72), dueAt: ago(42), paymentStatus: "paid", overdue: false, paidAt: ago(71), paymentReference: "MP-88730125" },
      ],
    },
    session: { customerId: null, staff: null },
  };

  /* ---------- rewards ---------- */

  const reward = (id: string, programId: string, title: string, description: string, costPoints: number, discountValue: number, imageUrl: string | null, daysAgo: number): Reward => ({
    id,
    programId,
    title,
    description,
    costPoints,
    discountValue,
    imageUrl,
    active: true,
    createdAt: ago(daysAgo),
  });

  state.rewards = [
    reward("rw-coffee", DEMO_IDS.club, "Café de cortesía", "Un café de especialidad de la casa, recién molido, para acompañar tu visita.", 30, 100, "/mock-images/mock-coffee.jpeg", 150),
    reward("rw-beer", DEMO_IDS.club, "2x1 en cervezas artesanales", "Llevá dos pintas de nuestra selección de cervezas artesanales pagando una sola.", 60, 50, "/mock-images/mock-beer.jpg", 140),
    reward("rw-picada", DEMO_IDS.club, "Tabla de picada para compartir", "Tabla de fiambres, quesos y encurtidos ideal para compartir entre dos personas.", 150, 100, "/mock-images/mock-picada.avif", 120),
    reward("rw-wine", DEMO_IDS.club, "Botella de vino de la casa", "Una botella de nuestro vino tinto seleccionado para acompañar tu cena.", 250, 100, "/mock-images/mock-wine.webp", 90),
    reward("rw-p-coffee", DEMO_IDS.granos, "Café de especialidad", "Cualquier café de la barra, con el tostado de la semana.", 15, 100, "/mock-images/mock-coffee.jpeg", 170),
    reward("rw-p-medialunas", DEMO_IDS.granos, "Media docena de medialunas", "Seis medialunas de manteca recién horneadas, para llevar o para el patio.", 25, 100, null, 160),
    reward("rw-p-off", DEMO_IDS.granos, "20% OFF en tu cuenta", "Descuento del 20% sobre el total de tu consumo, de lunes a jueves.", 60, 20, "/mock-images/mock-20-off.jpg", 100),
    reward("rw-p-wine", DEMO_IDS.granos, "Vino para llevar", "Una botella de nuestra selección para disfrutar en casa.", 120, 100, "/mock-images/mock-wine.webp", 60),
    reward("rw-e-medialuna", "pp-espiga", "Medialuna de regalo", "Una medialuna de manteca con tu café de la mañana.", 10, 100, null, 300),
    reward("rw-e-pan", "pp-espiga", "Pan de masa madre", "Una hogaza de masa madre de campo, recién salida del horno.", 40, 100, null, 280),
    reward("rw-r-sena", "pp-rayuela", "Señalador artesanal", "Un señalador de cuero hecho a mano por artesanos de la ciudad.", 80, 100, null, 260),
    reward("rw-r-off", "pp-rayuela", "10% OFF en libros", "Descuento del 10% en cualquier libro nuevo de la librería.", 400, 10, null, 240),
  ];

  /* ---------- ledger ---------- */

  const programOf = (storefrontId: string) => state.programs.find((p) => p.storefrontIds.includes(storefrontId))!;
  let seq = 0;
  const nextId = (prefix: string) => `${prefix}-seed-${++seq}`;

  const grant = (userId: string, storefrontId: string, points: number, createdAt: string, note: string | null, byStaffId: string | null): Transaction => {
    const program = programOf(storefrontId);
    const tx: Transaction = {
      id: nextId("tx"),
      userId,
      programId: program.id,
      storefrontId,
      kind: "grant",
      points,
      note,
      byStaffId,
      createdAt,
      expiresAt: program.expirationMonths && points > 0 ? addMonths(createdAt, program.expirationMonths) : null,
    };
    state.transactions.push(tx);
    if (byStaffId) state.audit.push(auditForGrant(state, tx));
    return tx;
  };

  const correct = (original: Transaction, delta: number, createdAt: string, note: string, byStaffId: string) => {
    const tx: Transaction = {
      id: nextId("tx"),
      userId: original.userId,
      programId: original.programId,
      storefrontId: original.storefrontId,
      kind: "correction",
      points: delta,
      note,
      byStaffId,
      createdAt,
      expiresAt: original.expiresAt,
      correctsId: original.id,
    };
    state.transactions.push(tx);
    state.audit.push(auditForCorrection(state, tx, original));
  };

  const claim = (userId: string, rewardId: string, storefrontId: string, code: string, createdAt: string): Exchange => {
    const rw = state.rewards.find((r) => r.id === rewardId)!;
    const exchange: Exchange = {
      id: nextId("ex"),
      code,
      rewardId,
      userId,
      programId: rw.programId,
      storefrontId,
      costPoints: rw.costPoints,
      state: ExchangeState.PENDING,
      createdAt,
      resolvedAt: null,
      resolvedByStaffId: null,
      refunded: null,
    };
    state.exchanges.push(exchange);
    state.transactions.push({
      id: nextId("tx"),
      userId,
      programId: rw.programId,
      storefrontId,
      kind: "redeem",
      points: -rw.costPoints,
      note: null,
      byStaffId: null,
      createdAt,
      expiresAt: null,
      exchangeId: exchange.id,
    });
    state.audit.push(auditForClaim(state, exchange));
    return exchange;
  };

  const resolve = (exchange: Exchange, nextState: ExchangeState.COMPLETED | ExchangeState.CANCELLED, resolvedAt: string, byStaffId: string | null, refunded = false) => {
    exchange.state = nextState;
    exchange.resolvedAt = resolvedAt;
    exchange.resolvedByStaffId = byStaffId;
    exchange.refunded = nextState === ExchangeState.CANCELLED ? refunded : null;
    if (nextState === ExchangeState.CANCELLED && refunded) {
      state.transactions.push({
        id: nextId("tx"),
        userId: exchange.userId,
        programId: exchange.programId,
        storefrontId: exchange.storefrontId,
        kind: "refund",
        points: exchange.costPoints,
        note: null,
        byStaffId,
        createdAt: resolvedAt,
        expiresAt: null,
        exchangeId: exchange.id,
      });
    }
    if (byStaffId) state.audit.push(auditForExchangeResolution(state, exchange, byStaffId));
  };

  const { centro, palermo } = DEMO_IDS;

  // Club Tu negocio (Centro): no expiration.
  grant("c-sofia", centro, 20, ago(110), "Puntos de bienvenida", "st-lucia");
  grant("c-sofia", centro, 45, ago(100), "Compra de $45.000", "st-martin");
  grant("c-sofia", centro, 32, ago(70), "Compra de $32.500", "st-martin");
  grant("c-sofia", centro, 60, ago(40), "Cena de cumpleaños", "st-martin");
  const sofiaCoffee = claim("c-sofia", "rw-coffee", centro, "4821K7", ago(25));
  resolve(sofiaCoffee, ExchangeState.COMPLETED, ago(25, -1), "st-martin");
  grant("c-sofia", centro, 28, ago(20), "Compra de $28.000", "st-martin");
  grant("c-sofia", centro, 17, ago(6), "Compra de $17.200", "st-lucia");
  claim("c-sofia", "rw-beer", centro, "7305B2", minutesAgo(8));

  grant("c-juan", centro, 38, ago(80), "Compra de $38.000", "st-martin");
  grant("c-juan", centro, 25, ago(30), "Compra de $25.400", "st-martin");
  grant("c-juan", centro, -10, ago(29), "Corrección: puntos cargados de más", "st-lucia");

  grant("c-diego", centro, 120, ago(180), "Evento privado", "st-lucia");
  grant("c-diego", centro, 85, ago(90), "Compra de $85.000", "st-martin");
  const diegoPicada = claim("c-diego", "rw-picada", centro, "2290M4", ago(12));
  resolve(diegoPicada, ExchangeState.CANCELLED, ago(11), "st-lucia", true);
  grant("c-diego", centro, 64, ago(10), "Compra de $64.300", "st-martin");
  claim("c-diego", "rw-beer", centro, "9184T1", ago(0, 3));

  grant("c-valentina", centro, 40, ago(44), "Compra de $40.000", "st-martin");
  grant("c-valentina", centro, 22, ago(5), "Compra de $22.000", "st-martin");
  const valeCoffee = claim("c-valentina", "rw-coffee", centro, "5547R8", ago(2));
  resolve(valeCoffee, ExchangeState.COMPLETED, ago(2, -1), "st-martin");

  grant("c-martina", centro, 50, ago(29), "Compra de $50.000", "st-martin");
  const martinaGrant = grant("c-martina", centro, 30, ago(8), "Compra de $55.000", "st-martin");
  correct(martinaGrant, 25, ago(7), "Se cargó $30.000 en lugar de $55.000", "st-lucia");
  const martinaCoffee = claim("c-martina", "rw-coffee", centro, "6612C3", ago(9));
  resolve(martinaCoffee, ExchangeState.CANCELLED, ago(4), "st-lucia", false);

  // Granos Palermo: points expire after 6 months.
  grant("c-sofia", palermo, 30, ago(178), "Compra de $30.000", "st-ana");
  const sofiaPalermoCoffee = claim("c-sofia", "rw-p-coffee", palermo, "3378D6", ago(20));
  resolve(sofiaPalermoCoffee, ExchangeState.COMPLETED, ago(20, -1), "st-ana");
  grant("c-sofia", palermo, 18, ago(30), "Compra de $18.000", "st-ana");
  grant("c-sofia", palermo, 12, ago(3), "Desayuno con amigas", "st-ana");

  grant("c-camila", palermo, 25, ago(58), "Compra de $25.000", "st-ana");
  grant("c-camila", palermo, 40, ago(20), "Compra de $40.800", "st-ana");
  claim("c-camila", "rw-p-off", palermo, "8053P9", ago(0, 1));

  const diegoOld = grant("c-diego", palermo, 14, ago(192), "Compra de $14.000", "st-ana");
  state.transactions.push({
    id: nextId("tx"),
    userId: "c-diego",
    programId: DEMO_IDS.granos,
    storefrontId: palermo,
    kind: "expire",
    points: -14,
    note: null,
    byStaffId: null,
    createdAt: diegoOld.expiresAt!,
    expiresAt: diegoOld.expiresAt,
    correctsId: diegoOld.id,
  });
  grant("c-diego", palermo, 33, ago(15), "Compra de $33.000", "st-ana");

  grant("c-mateo", palermo, 12, ago(14), "Compra de $12.000", "st-ana");
  grant("c-mateo", palermo, 9, ago(2), "Compra de $9.500", "st-ana");

  // Example businesses the customer is a member of (not administrable in the demo panel).
  grant("c-sofia", "sf-espiga", 25, ago(150), null, null);
  const sofiaMedialuna = claim("c-sofia", "rw-e-medialuna", "sf-espiga", "1146E2", ago(50));
  resolve(sofiaMedialuna, ExchangeState.COMPLETED, ago(50), null);
  grant("c-sofia", "sf-espiga", 20, ago(60), null, null);
  grant("c-martina", "sf-espiga", 15, ago(40), null, null);

  // Staff onboarding.
  state.audit.push(auditForStaffCreate(state, state.staff[1], DEMO_IDS.centro, "st-lucia", ago(200)));
  state.audit.push(auditForStaffCreate(state, state.staff[2], DEMO_IDS.palermo, "st-lucia", ago(190)));

  return state;
}
