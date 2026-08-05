/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TariffSettings, VehicleType, ParkingSession, CashSession, InventoryItem, AccessorySale, WashPackage, ServiceBooking, ServiceQuote, NightSubscription, VehicleRecord } from '../types';

/**
 * Normaliza la patente a mayúsculas y quita espacios
 */
export function normalizePlate(plate: string): string {
  return plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Formatea la patente para visualización atractiva (e.g., AB·CD·12 o AB·12·34)
 */
export function formatPlate(plate: string): string {
  const clean = normalizePlate(plate);
  if (clean.length === 6) {
    // Formato clásico chileno/latino de 6 caracteres (AABB11 -> AA·BB·11)
    if (isNaN(Number(clean.substring(2, 4)))) {
      // Nuevas patentes (letras letras letras letras números números: ABCD12 -> AB·CD·12)
      return `${clean.substring(0, 2)}·${clean.substring(2, 4)}·${clean.substring(4, 6)}`;
    } else {
      // Patentes antiguas (letras letras números números números números: AB1234 -> AB·12·34)
      return `${clean.substring(0, 2)}·${clean.substring(2, 4)}·${clean.substring(4, 6)}`;
    }
  }
  // Retornar en bloques de 3 o como esté si tiene otro largo
  if (clean.length === 7) {
    return `${clean.substring(0, 3)}·${clean.substring(3, 7)}`;
  }
  return clean;
}

/**
 * Calcula la diferencia en minutos entre dos fechas ISO
 */
export function calculateMinutes(entryStr: string, exitStr: string): number {
  const entry = new Date(entryStr);
  const exit = new Date(exitStr);
  const diffMs = exit.getTime() - entry.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60));
}

/**
 * Calcula la tarifa en base a los minutos transcurridos y la configuración
 */
export function calculateFee(minutes: number, settings: TariffSettings): number {
  if (minutes <= 0) return 0;

  const { defaultBlockModel, baseHourlyRate, minFractionMinutes, blocks } = settings;

  // 1. Tarifa por Rangos Fijos (Flat Ranges) - El costo del bloque en el que caiga el tiempo completo
  if (defaultBlockModel === 'flat_ranges') {
    // Encontrar el bloque que contiene los minutos
    const matchedBlock = blocks.find(b => minutes >= b.minMinutes && minutes <= b.maxMinutes);
    if (matchedBlock) {
      return matchedBlock.cost;
    }
    // Si excede el máximo bloque configurado, se aplica la tarifa base por hora adicional
    const maxConfiguredMinutes = blocks.reduce((max, b) => b.maxMinutes > max ? b.maxMinutes : max, 0);
    const lastBlock = blocks.find(b => b.maxMinutes === Infinity || b.maxMinutes >= maxConfiguredMinutes);
    const baseCost = lastBlock ? lastBlock.cost : 0;
    
    if (minutes > maxConfiguredMinutes) {
      const extraMinutes = minutes - maxConfiguredMinutes;
      const extraHours = Math.ceil(extraMinutes / 60);
      return baseCost + (extraHours * baseHourlyRate);
    }
    return 0;
  }

  // 2. Tarifa Acumulativa por Tramos (Cumulative Blocks) - Suma de los costos de cada tramo transitado
  if (defaultBlockModel === 'cumulative') {
    let totalCost = 0;
    let remainingMinutes = minutes;

    // Ordenar bloques por minuto de inicio
    const sortedBlocks = [...blocks].sort((a, b) => a.minMinutes - b.minMinutes);

    for (const block of sortedBlocks) {
      if (remainingMinutes <= 0) break;

      const blockLength = block.maxMinutes === Infinity 
        ? Infinity 
        : (block.maxMinutes - block.minMinutes + 1);

      if (remainingMinutes >= blockLength) {
        totalCost += block.cost;
        remainingMinutes -= blockLength;
      } else {
        // Fracción del bloque - cobro proporcional o costo completo del bloque
        // Por seguridad en tramos, si entró al tramo se cobra completo o de forma prorrateada.
        // Aquí cobraremos el costo de este bloque ya que ingresó en él.
        totalCost += block.cost;
        remainingMinutes = 0;
      }
    }

    // Si aún quedan minutos (excede todos los tramos acumulativos)
    if (remainingMinutes > 0) {
      const extraHours = Math.ceil(remainingMinutes / 60);
      totalCost += extraHours * baseHourlyRate;
    }

    return totalCost;
  }

  // 3. Tarifa Horaria Simple (Simple Hourly Rate con Fracciones)
  // Aplica una tarifa lineal basada en horas, con un mínimo redondeable (e.g., cada 15 minutos)
  const fractionBlocks = Math.ceil(minutes / minFractionMinutes);
  const costPerFraction = (baseHourlyRate / 60) * minFractionMinutes;
  return Math.ceil(fractionBlocks * costPerFraction);
}

/**
 * Retorna el nombre en español del tipo de vehículo
 */
export function getVehicleTypeLabel(type: VehicleType): string {
  const labels: Record<VehicleType, string> = {
    auto: 'Automóvil',
    hatchback: 'Hatchback',
    suv: 'SUV',
    moto: 'Motocicleta',
    bicicleta: 'Bicicleta',
    camioneta: 'Camioneta',
    furgon: 'Furgón / Van',
    otro: 'Otro / Especial'
  };
  return labels[type] || 'Vehículo';
}

/**
 * Formatea montos en moneda local (e.g. $1.500 CLP)
 */
export function formatCurrency(amount: number, symbol: string = '$'): string {
  return `${symbol}${amount.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Formatea la duración legible en español (e.g., "1h 45m" o "22m")
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Genera datos de semilla para que la aplicación no aparezca vacía e ilustre historial inmediato
 */
export function getSeedSessions(): ParkingSession[] {
  const now = new Date();
  
  // Crear fechas en el pasado
  const minutesAgo = (mins: number) => {
    const d = new Date(now.getTime() - mins * 60 * 1000);
    return d.toISOString();
  };

  return [
    {
      id: 'seed-1',
      plate: 'KPDX45',
      vehicleType: 'auto',
      brand: 'Hyundai',
      model: 'Accent',
      color: 'Gris Plata',
      year: '2019',
      clientName: 'Alejandro Toledo',
      clientPhone: '+56987654321',
      entryTime: minutesAgo(45), // hace 45 minutos (activo)
      status: 'active',
      notes: 'Estacionado cerca de la entrada'
    },
    {
      id: 'seed-2',
      plate: 'BBRR90',
      vehicleType: 'suv',
      brand: 'Toyota',
      model: 'RAV4',
      color: 'Blanco',
      year: '2021',
      clientName: 'Carolina Mendoza',
      entryTime: minutesAgo(120), // hace 2 horas (activo)
      status: 'active'
    },
    {
      id: 'seed-3',
      plate: 'LLYY12',
      vehicleType: 'moto',
      brand: 'Yamaha',
      model: 'FZ6',
      color: 'Negro',
      year: '2018',
      clientName: 'Martín Silva',
      entryTime: minutesAgo(15), // hace 15 minutos (activo)
      status: 'active'
    },
    // Sesiones completadas (para el historial)
    {
      id: 'seed-4',
      plate: 'KPDX45', // El mismo cliente entró ayer
      vehicleType: 'auto',
      brand: 'Hyundai',
      model: 'Accent',
      color: 'Gris Plata',
      year: '2019',
      clientName: 'Alejandro Toledo',
      clientPhone: '+56987654321',
      entryTime: minutesAgo(1500), // ayer
      exitTime: minutesAgo(1380), // estuvo 2 horas (120 min)
      status: 'completed',
      durationMinutes: 120,
      chargedAmount: 3000,
      notes: 'Visita recurrente',
      paymentMethod: 'efectivo'
    },
    {
      id: 'seed-5',
      plate: 'KPDX45', // El mismo cliente entró anteayer
      vehicleType: 'auto',
      brand: 'Hyundai',
      model: 'Accent',
      color: 'Gris Plata',
      year: '2019',
      clientName: 'Alejandro Toledo',
      clientPhone: '+56987654321',
      entryTime: minutesAgo(2940), // anteayer
      exitTime: minutesAgo(2850), // estuvo 1.5 horas (90 min)
      status: 'completed',
      durationMinutes: 90,
      chargedAmount: 2500,
      paymentMethod: 'debito'
    },
    {
      id: 'seed-6',
      plate: 'FSDY23',
      vehicleType: 'camioneta',
      brand: 'Ford',
      model: 'Ranger',
      color: 'Rojo',
      year: '2020',
      clientName: 'Constructor S.A. (Daniel)',
      entryTime: minutesAgo(600),
      exitTime: minutesAgo(360), // estuvo 4 horas (240 min)
      status: 'completed',
      durationMinutes: 240,
      chargedAmount: 6000,
      paymentMethod: 'transferencia'
    },
    {
      id: 'seed-7',
      plate: 'LLYY12', // Moto recurrente
      vehicleType: 'moto',
      brand: 'Yamaha',
      model: 'FZ6',
      color: 'Negro',
      year: '2018',
      clientName: 'Martín Silva',
      entryTime: minutesAgo(800),
      exitTime: minutesAgo(740), // estuvo 1 hora
      status: 'completed',
      durationMinutes: 60,
      chargedAmount: 1500,
      paymentMethod: 'efectivo'
    },
    {
      id: 'seed-8',
      plate: 'HJKW88',
      vehicleType: 'furgon',
      brand: 'Peugeot',
      model: 'Partner',
      color: 'Blanco',
      year: '2017',
      clientName: 'Repartos Express',
      entryTime: minutesAgo(1200),
      exitTime: minutesAgo(1170), // estuvo 30 minutos
      status: 'completed',
      durationMinutes: 30,
      chargedAmount: 1000,
      paymentMethod: 'debito'
    }
  ];
}

/**
 * Obtiene la configuración de tarifas por defecto (Tramos de Chile / América Latina típicos)
 */
export function getDefaultTariffSettings(): TariffSettings {
  return {
    currency: '$',
    defaultBlockModel: 'cumulative',
    baseHourlyRate: 2000, // Tarifa por hora adicional
    minFractionMinutes: 15,
    debitCommissionRate: 2.95,
    debitCommissionProvider: 'TUU',
    businessName: 'ESTACIONAMIENTO & BAMO GARAGE',
    businessId: '78.084.649-6',
    businessAddress: 'Av. Principal 1234, Santiago',
    businessPhone: '+569 9 393 9952',
    ticketFooter: 'GRACIAS POR SU PREFERENCIA. CONSERVE ESTE TICKET PARA EL RETIRO Y COBRO DE SU VEHÍCULO.',
    showQrInTicket: true,
    blocks: [
      { id: 'b1', name: 'Primeros 30 minutos (Mínimo)', minMinutes: 0, maxMinutes: 30, cost: 1000 },
      { id: 'b2', name: 'Siguiente bloque de 30 minutos (Total 1 hora)', minMinutes: 31, maxMinutes: 60, cost: 1000 },
      { id: 'b3', name: 'Segunda hora completa', minMinutes: 61, maxMinutes: 120, cost: 1800 },
      { id: 'b4', name: 'Bloque de estacionamiento prolongado (por cada hora extra)', minMinutes: 121, maxMinutes: Infinity, cost: 1500 }
    ]
  };
}

/**
 * Obtiene sesiones de caja iniciales simuladas para poblar el historial de arqueos
 */
export function getSeedCashSessions(): CashSession[] {
  return [
    {
      id: 'cash-seed-1',
      openedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 1.5).toISOString(), // hace 1.5 días
      closedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 * 1.1).toISOString(), // cerrado tras ~10 horas
      openingBalance: 15000,
      closingBalance: 20500,
      expectedBalance: 20500,
      status: 'closed',
      notes: 'Turno tarde anterior. Cuadrado sin novedades. Recambio de sencillo exitoso.',
      movements: [
        {
          id: 'mov-seed-1',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000 * 1.3).toISOString(),
          type: 'egreso',
          amount: 1500,
          description: 'Cinta adhesiva de embalaje'
        }
      ],
      cashSales: 7000,
      debitoSales: 3500,
      transferenciaSales: 6000
    }
  ];
}

/**
 * Obtiene el inventario inicial simulado de accesorios para vehículos
 */
export function getSeedInventoryItems(): InventoryItem[] {
  return [
    {
      id: 'inv-1',
      name: 'Aromatizante Pino (Varios aromas)',
      description: 'Colgante aromatizante de larga duración para el espejo retrovisor.',
      price: 1500,
      stock: 25,
      minStock: 5,
      category: 'Aromatizantes',
      ivaRate: 19
    },
    {
      id: 'inv-2',
      name: 'Silicona Líquida Brillo Interior (500ml)',
      description: 'Limpia, protege y abrillanta tableros, gomas y plásticos del automóvil.',
      price: 4900,
      stock: 8,
      minStock: 3,
      category: 'Limpieza',
      ivaRate: 19
    },
    {
      id: 'inv-3',
      name: 'Paño de Microfibra Premium 40x40',
      description: 'Súper absorbente, ideal para secado de carrocería y limpieza de vidrios sin rayar.',
      price: 2000,
      stock: 18,
      minStock: 5,
      category: 'Limpieza',
      ivaRate: 19
    },
    {
      id: 'inv-4',
      name: 'Cables de Puente para Batería 500A',
      description: 'Cables reforzados de 2.5 metros con pinzas de alta resistencia para emergencias.',
      price: 13900,
      stock: 4,
      minStock: 2,
      category: 'Seguridad',
      ivaRate: 19
    },
    {
      id: 'inv-5',
      name: 'Cargador Rápido USB Dual de Auto (36W)',
      description: 'Cargador para encendedor con dos puertos USB (QC 3.0 + PD) carga ultra rápida.',
      price: 6500,
      stock: 7,
      minStock: 2,
      category: 'Electrónica',
      ivaRate: 19
    },
    {
      id: 'inv-6',
      name: 'Líquido Limpiaparabrisas Concentrado (1L)',
      description: 'Remueve grasa, insectos y polvo del parabrisas. Mejora la visibilidad y repelencia.',
      price: 3500,
      stock: 12,
      minStock: 4,
      category: 'Limpieza',
      ivaRate: 19
    },
    {
      id: 'inv-7',
      name: 'Kit de Fusibles de Repuesto (10 unidades)',
      description: 'Surtido de fusibles mini y estándar para todo tipo de vehículo con extractor.',
      price: 2500,
      stock: 15,
      minStock: 3,
      category: 'Seguridad',
      ivaRate: 19
    }
  ];
}

/**
 * Obtiene ventas simuladas anteriores de accesorios
 */
export function getSeedAccessorySales(): AccessorySale[] {
  return [
    {
      id: 'sale-1',
      itemId: 'inv-1',
      itemName: 'Aromatizante Pino (Varios aromas)',
      quantity: 2,
      unitPrice: 1500,
      totalPrice: 3000,
      paymentMethod: 'efectivo',
      timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), // Hace 3 horas
      buyerPlate: 'AB-CD-12',
      notes: 'Llevó de aroma Lavanda y Vainilla.',
      ivaRate: 19,
      netPrice: 2521,
      ivaAmount: 479
    },
    {
      id: 'sale-2',
      itemId: 'inv-3',
      itemName: 'Paño de Microfibra Premium 40x40',
      quantity: 1,
      unitPrice: 2000,
      totalPrice: 2000,
      paymentMethod: 'debito',
      timestamp: new Date(Date.now() - 1 * 3600 * 1000).toISOString(), // Hace 1 hora
      buyerPlate: 'XX-YY-99',
      ivaRate: 19,
      netPrice: 1681,
      ivaAmount: 319
    }
  ];
}

export const DEFAULT_WASH_PACKAGES: WashPackage[] = [
  {
    id: 'wp-simple',
    name: '🧼 Lavado Simple (Eco)',
    description: 'Lavado exterior premium con espuma activa pH neutro, limpieza básica de llantas, paso de ruedas y secado manual con microfibra anti-rayas.',
    priceByVehicleType: {
      auto: 5000,
      hatchback: 5000,
      suv: 7000,
      moto: 3500,
      bicicleta: 2500,
      camioneta: 8000,
      furgon: 9000,
      otro: 6000
    },
    estimatedMinutes: 20,
    icon: 'Droplet'
  },
  {
    id: 'wp-full',
    name: '✨ Lavado Full (Premium)',
    description: 'Lavado exterior simple + aspirado profundo de alfombras, asientos y maleta. Limpieza detallada de tableros, consolas, vidrios internos y abrillantado de neumáticos.',
    priceByVehicleType: {
      auto: 10000,
      hatchback: 10000,
      suv: 12000,
      moto: 6000,
      bicicleta: 4000,
      camioneta: 14000,
      furgon: 15000,
      otro: 11000
    },
    estimatedMinutes: 45,
    icon: 'Sparkles'
  },
  {
    id: 'wp-tapiceria',
    name: '🛋️ Lavado de Tapiz Completo',
    description: 'Desinfección de interiores por vapor e higienización completa de tapizados (asientos, puertas, techo y alfombra) mediante máquina de inyección-extracción profesional.',
    priceByVehicleType: {
      auto: 45000,
      hatchback: 45000,
      suv: 55000,
      moto: 15000,
      bicicleta: 8000,
      camioneta: 60000,
      furgon: 65000,
      otro: 50000
    },
    estimatedMinutes: 180,
    icon: 'Wind'
  },
  {
    id: 'wp-motor',
    name: '⚙️ Lavado de Motor e Inferior',
    description: 'Remoción técnica de grasa y suciedad extrema en el compartimento del motor y chasis usando vapor seco, agua caliente y sellador protector de gomas y dieléctrico.',
    priceByVehicleType: {
      auto: 15000,
      hatchback: 15000,
      suv: 18000,
      moto: 8000,
      bicicleta: 5000,
      camioneta: 22000,
      furgon: 24000,
      otro: 17000
    },
    estimatedMinutes: 60,
    icon: 'Wrench'
  }
];

export function getSeedBookings(): ServiceBooking[] {
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0];
  
  return [
    {
      id: 'book-1',
      clientName: 'Daniel Jara',
      clientPhone: '+56911223344',
      clientEmail: 'daniel.jara@gmail.com',
      plate: 'AABB12',
      vehicleType: 'auto',
      serviceType: 'both',
      washPackageId: 'wp-full',
      washPackageName: '✨ Lavado Full (Premium)',
      bookingDate: todayStr,
      bookingTime: '11:30',
      notes: 'Solicitó estacionamiento y lavado full. Llegará puntual.',
      status: 'pending',
      createdAt: new Date().toISOString()
    },
    {
      id: 'book-2',
      clientName: 'Marcela Vivanco',
      clientPhone: '+56955667788',
      clientEmail: 'marcela.v@outlook.com',
      plate: 'KPDX45',
      vehicleType: 'suv',
      serviceType: 'wash',
      washPackageId: 'wp-tapiceria',
      washPackageName: '🛋️ Lavado de Tapiz Completo',
      bookingDate: todayStr,
      bookingTime: '15:00',
      notes: 'Mancha de café en el asiento del copiloto. Requiere secado rápido si es posible.',
      status: 'approved',
      createdAt: new Date().toISOString()
    },
    {
      id: 'book-3',
      clientName: 'Felipe Sandoval',
      clientPhone: '+56988990011',
      plate: 'LLYY12',
      vehicleType: 'camioneta',
      serviceType: 'parking',
      bookingDate: tomorrowStr,
      bookingTime: '09:00',
      notes: 'Necesita espacio amplio para camioneta doble cabina por todo el día.',
      status: 'approved',
      createdAt: new Date().toISOString()
    }
  ];
}

export function getSeedQuotes(): ServiceQuote[] {
  const today = new Date().toISOString();
  const nextWeek = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0];

  return [
    {
      id: 'quote-1',
      quoteNumber: 'COT-1001',
      clientName: 'Transportes Del Sur Ltda.',
      clientRut: '76.890.123-K',
      clientPhone: '+56977889900',
      clientEmail: 'contacto@transdelsur.cl',
      plate: 'FSDY23',
      vehicleType: 'camioneta',
      brand: 'Ford',
      model: 'Ranger',
      items: [
        {
          id: 'qi-1',
          type: 'wash',
          name: '✨ Lavado Full (Premium) - Camioneta',
          description: 'Aspirado profundo, lavado exterior y desinfección',
          quantity: 2,
          unitPrice: 14000,
          totalPrice: 28000
        },
        {
          id: 'qi-2',
          type: 'engraving',
          name: '🔍 Grabado de Patente en Vidrios y Espejos (6 Piezas)',
          description: 'Grabado de seguridad imborrable según norma legal',
          quantity: 1,
          unitPrice: 19900,
          totalPrice: 19900
        },
        {
          id: 'qi-3',
          type: 'inventory',
          name: 'Aromatizante Pino (Varios aromas)',
          quantity: 3,
          unitPrice: 1500,
          totalPrice: 4500
        }
      ],
      netAmount: 44034,
      ivaRate: 19,
      ivaAmount: 8366,
      totalAmount: 52400,
      status: 'aprobada',
      createdAt: today,
      validUntil: nextWeek,
      notes: 'Cotización corporativa aprobada para preparación de vehículo flotilla.'
    },
    {
      id: 'quote-2',
      quoteNumber: 'COT-1002',
      clientName: 'Gonzalo Morales',
      clientPhone: '+56922334455',
      plate: 'KPDX45',
      vehicleType: 'auto',
      brand: 'Hyundai',
      model: 'Accent',
      items: [
        {
          id: 'qi-4',
          type: 'wash',
          name: '🛋️ Lavado de Tapiz Completo - Automóvil',
          description: 'Lavado con máquina inyección-extracción e higienización',
          quantity: 1,
          unitPrice: 45000,
          totalPrice: 45000
        }
      ],
      netAmount: 37815,
      ivaRate: 19,
      ivaAmount: 7185,
      totalAmount: 45000,
      status: 'pendiente',
      createdAt: today,
      validUntil: nextWeek,
      notes: 'Pendiente de confirmación de horario por parte del cliente.'
    }
  ];
}

export function getSeedNightSubscriptions(): NightSubscription[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  // Expiry in 20 days
  const expiry20 = new Date(Date.now() + 20 * 24 * 3600 * 1000).toISOString().split('T')[0];
  // Expiry in 3 days (por vencer)
  const expiry3 = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0];
  // Expiry expired 5 days ago (vencido)
  const expiryPast = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString().split('T')[0];

  return [
    {
      id: 'sub-1',
      plate: 'KPDX45',
      clientName: 'Alejandro Toledo',
      clientRut: '18.456.789-2',
      clientPhone: '+56987654321',
      clientEmail: 'atoledo@gmail.com',
      vehicleType: 'auto',
      brand: 'Hyundai',
      model: 'Accent',
      color: 'Gris Plata',
      schedule: '20:00 - 08:00',
      monthlyFee: 45000,
      startDate: `${year}-${month}-01`,
      expiryDate: expiry20,
      status: 'al_dia',
      lastPaymentDate: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
      notes: 'Reserva cupo B-04. Cliente nocturno habitual.',
      paymentHistory: [
        {
          id: 'pay-1',
          paymentDate: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
          periodMonth: `${year}-${month}`,
          amount: 45000,
          paymentMethod: 'transferencia',
          notes: 'Pago mensualidad con transferencia BancoEstado'
        }
      ]
    },
    {
      id: 'sub-2',
      plate: 'BBRR90',
      clientName: 'Carolina Mendoza',
      clientRut: '16.123.456-7',
      clientPhone: '+56911223344',
      vehicleType: 'suv',
      brand: 'Toyota',
      model: 'RAV4',
      color: 'Blanco',
      schedule: '20:00 - 08:00',
      monthlyFee: 50000,
      startDate: `${year}-${month}-01`,
      expiryDate: expiry3,
      status: 'por_vencer',
      lastPaymentDate: new Date(Date.now() - 27 * 24 * 3600 * 1000).toISOString(),
      notes: 'Recordatorio enviado por WhatsApp.',
      paymentHistory: [
        {
          id: 'pay-2',
          paymentDate: new Date(Date.now() - 27 * 24 * 3600 * 1000).toISOString(),
          periodMonth: `${year}-${month}`,
          amount: 50000,
          paymentMethod: 'debito',
          notes: 'Pago con tarjeta de débito en caja'
        }
      ]
    },
    {
      id: 'sub-3',
      plate: 'FSDY23',
      clientName: 'Roberto Gómez',
      clientRut: '15.987.654-3',
      clientPhone: '+56944556677',
      vehicleType: 'camioneta',
      brand: 'Ford',
      model: 'Ranger',
      color: 'Rojo',
      schedule: '19:30 - 08:30',
      monthlyFee: 55000,
      startDate: `${year}-05-01`,
      expiryDate: expiryPast,
      status: 'vencido',
      lastPaymentDate: new Date(Date.now() - 38 * 24 * 3600 * 1000).toISOString(),
      notes: 'Mensualidad vencida. Pendiente regularización.',
      paymentHistory: []
    }
  ];
}

/**
 * Semillas iniciales para la base de datos de vehículos / patentes
 */
export function getSeedVehicleRecords(): VehicleRecord[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'BBCL12',
      plate: 'BB·CL·12',
      vehicleType: 'auto',
      brand: 'Chevrolet',
      model: 'Sail',
      color: 'Gris Plata',
      year: '2021',
      clientName: 'Juan Pérez',
      clientRut: '18.765.432-1',
      clientPhone: '+569 8765 4321',
      clientEmail: 'juan.perez@gmail.com',
      internalNotes: 'Cliente VIP del establecimiento. Solicita siempre cuidado con la pintura al estacionar o lavar.',
      vipStatus: true,
      alertFlag: false,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'KPRT88',
      plate: 'KP·RT·88',
      vehicleType: 'suv',
      brand: 'Hyundai',
      model: 'Tucson',
      color: 'Negro',
      year: '2022',
      clientName: 'María González',
      clientRut: '17.890.123-4',
      clientPhone: '+569 9876 5432',
      clientEmail: 'mgonzalez@outlook.com',
      internalNotes: 'Atención: Rayón superficial en parachoques trasero izquierdo al momento de ingresar.',
      vipStatus: false,
      alertFlag: true,
      alertMessage: 'Verificar estado de parachoques trasero al ingresar',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'BBRR90',
      plate: 'BB·RR·90',
      vehicleType: 'suv',
      brand: 'Toyota',
      model: 'RAV4',
      color: 'Blanco',
      year: '2023',
      clientName: 'Carolina Mendoza',
      clientRut: '16.123.456-7',
      clientPhone: '+569 1122 3344',
      clientEmail: 'carolina.mendoza@empresa.cl',
      internalNotes: 'Suscriptora mensual nocturna. Estacionar preferentemente en el sector central.',
      vipStatus: true,
      alertFlag: false,
      createdAt: now,
      updatedAt: now
    }
  ];
}


