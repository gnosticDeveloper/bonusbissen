import type { StoreData } from './types'

function daysAgo(days: number, extraHours = 0): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(d.getHours() - extraHours)
  return d.toISOString()
}

function minutesAgo(minutes: number): string {
  const d = new Date()
  d.setMinutes(d.getMinutes() - minutes)
  return d.toISOString()
}

function rewardImage(query: string): string {
  return `/placeholder.svg?height=320&width=480&query=${encodeURIComponent(query)}`
}

export function createSeedData(): StoreData {
  return {
    users: [
      {
        id: 'user-admin',
        name: 'Lucía Fernández',
        email: 'admin@bonusbissen.com',
        role: 'ADMIN',
        password: 'admin123',
      },
      {
        id: 'user-employee',
        name: 'Martín Gómez',
        email: 'empleado@bonusbissen.com',
        role: 'EMPLOYEE',
        password: 'empleado123',
      },
    ],
    customers: [
      { id: 'cust-1', name: 'Sofía Ramírez', phone: '+54 11 5512-3344', points: 1240, createdAt: daysAgo(120) },
      { id: 'cust-2', name: 'Juan Pérez', phone: '+54 11 4488-1122', points: 320, createdAt: daysAgo(88) },
      { id: 'cust-3', name: 'Camila Torres', phone: '+54 11 6677-8899', points: 75, createdAt: daysAgo(60) },
      { id: 'cust-4', name: 'Diego Morales', phone: '+54 11 3322-6655', points: 2050, createdAt: daysAgo(200) },
      { id: 'cust-5', name: 'Valentina Ruiz', phone: '+54 11 7788-9900', points: 540, createdAt: daysAgo(45) },
      { id: 'cust-6', name: 'Mateo Sánchez', phone: '+54 11 2211-4455', points: 15, createdAt: daysAgo(15) },
      { id: 'cust-7', name: 'Martina López', phone: '+54 11 9900-1122', points: 880, createdAt: daysAgo(30) },
    ],
    rewards: [
      {
        id: 'rew-1',
        title: 'Café de cortesía',
        description: 'Un café de especialidad de la casa, recién molido, para acompañar tu visita.',
        discountValue: 'Gratis',
        pointsRequired: 100,
        imageUrl: rewardImage('specialty coffee cup latte art'),
      },
      {
        id: 'rew-2',
        title: '2x1 en cervezas artesanales',
        description: 'Llevá dos pintas de nuestra selección de cervezas artesanales pagando una sola.',
        discountValue: '2x1',
        pointsRequired: 300,
        imageUrl: rewardImage('craft beer glasses bar'),
      },
      {
        id: 'rew-3',
        title: '20% OFF en tu cuenta',
        description: 'Descuento del 20% sobre el total de tu consumo, aplicable de lunes a jueves.',
        discountValue: '20% OFF',
        pointsRequired: 500,
        imageUrl: rewardImage('restaurant bill discount table'),
      },
      {
        id: 'rew-4',
        title: 'Tabla de picada para compartir',
        description: 'Tabla de fiambres, quesos y encurtidos ideal para compartir entre dos personas.',
        discountValue: 'Gratis',
        pointsRequired: 800,
        imageUrl: rewardImage('charcuterie board cheese platter'),
      },
      {
        id: 'rew-5',
        title: 'Botella de vino de la casa',
        description: 'Una botella de nuestro vino tinto seleccionado para acompañar tu cena.',
        discountValue: 'Gratis',
        pointsRequired: 1200,
        imageUrl: rewardImage('bottle of red wine restaurant'),
      },
    ],
    redemptions: [
      {
        id: 'red-1',
        code: 'BON-7F3K9Q',
        rewardId: 'rew-1',
        customerId: 'cust-1',
        claimedAt: minutesAgo(8),
        status: 'pending',
        resolvedAt: null,
        resolvedByUserId: null,
        resolvedByUserName: null,
        pointsRefunded: null,
        pointsSpent: 100,
      },
      {
        id: 'red-2',
        code: 'BON-2M8XP1',
        rewardId: 'rew-2',
        customerId: 'cust-4',
        claimedAt: daysAgo(0, 3),
        status: 'pending',
        resolvedAt: null,
        resolvedByUserId: null,
        resolvedByUserName: null,
        pointsRefunded: null,
        pointsSpent: 300,
      },
      {
        id: 'red-3',
        code: 'BON-9QW4RT',
        rewardId: 'rew-3',
        customerId: 'cust-5',
        claimedAt: daysAgo(2),
        status: 'confirmed',
        resolvedAt: daysAgo(2, -1),
        resolvedByUserId: 'user-employee',
        resolvedByUserName: 'Martín Gómez',
        pointsRefunded: null,
        pointsSpent: 500,
      },
      {
        id: 'red-4',
        code: 'BON-5TZ8LK',
        rewardId: 'rew-1',
        customerId: 'cust-7',
        claimedAt: daysAgo(5),
        status: 'cancelled',
        resolvedAt: daysAgo(4),
        resolvedByUserId: 'user-admin',
        resolvedByUserName: 'Lucía Fernández',
        pointsRefunded: true,
        pointsSpent: 100,
      },
      {
        id: 'red-5',
        code: 'BON-3JD6NB',
        rewardId: 'rew-4',
        customerId: 'cust-4',
        claimedAt: daysAgo(9),
        status: 'cancelled',
        resolvedAt: daysAgo(8),
        resolvedByUserId: 'user-admin',
        resolvedByUserName: 'Lucía Fernández',
        pointsRefunded: false,
        pointsSpent: 800,
      },
      {
        id: 'red-6',
        code: 'BON-8HK2WM',
        rewardId: 'rew-2',
        customerId: 'cust-1',
        claimedAt: daysAgo(14),
        status: 'confirmed',
        resolvedAt: daysAgo(14, -2),
        resolvedByUserId: 'user-employee',
        resolvedByUserName: 'Martín Gómez',
        pointsRefunded: null,
        pointsSpent: 300,
      },
    ],
    pointActions: [
      {
        id: 'act-1',
        customerId: 'cust-1',
        customerName: 'Sofía Ramírez',
        type: 'add',
        amount: 120,
        note: 'Consumo de $12.000',
        byUserId: 'user-employee',
        byUserName: 'Martín Gómez',
        createdAt: daysAgo(1),
      },
      {
        id: 'act-2',
        customerId: 'cust-4',
        customerName: 'Diego Morales',
        type: 'add',
        amount: 200,
        note: 'Consumo de $20.000',
        byUserId: 'user-admin',
        byUserName: 'Lucía Fernández',
        createdAt: daysAgo(3),
      },
      {
        id: 'act-3',
        customerId: 'cust-5',
        customerName: 'Valentina Ruiz',
        type: 'add',
        amount: 100,
        note: 'Puntos manuales de bienvenida',
        byUserId: 'user-admin',
        byUserName: 'Lucía Fernández',
        createdAt: daysAgo(4),
      },
      {
        id: 'act-4',
        customerId: 'cust-2',
        customerName: 'Juan Pérez',
        type: 'subtract',
        amount: -50,
        note: 'Corrección: puntos cargados de más',
        byUserId: 'user-employee',
        byUserName: 'Martín Gómez',
        createdAt: daysAgo(6),
      },
      {
        id: 'act-5',
        customerId: 'cust-7',
        customerName: 'Martina López',
        type: 'edit',
        amount: 30,
        note: 'Ajuste de carga: 50 → 80 puntos',
        byUserId: 'user-admin',
        byUserName: 'Lucía Fernández',
        createdAt: daysAgo(7),
      },
    ],
    organization: {
      name: 'Tu negocio',
      icon: '/placeholder.svg?height=160&width=160&query=cozy%20bar%20logo%20badge',
      hours: 'Lun a Jue 12:00 - 00:00 · Vie y Sáb 12:00 - 02:00 · Dom 16:00 - 23:00',
      address: 'Av. Corrientes 1234, Buenos Aires',
      description:
        'Bar de barrio con cocina de autor, cervezas artesanales y una carta de vinos cuidada. Un lugar para juntarse, brindar y volver.',
    },
  }
}
