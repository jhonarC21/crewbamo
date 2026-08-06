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
 * Genera datos de semilla para la aplicación (vacíos para producción en vivo)
 */
export function getSeedSessions(): ParkingSession[] {
  return [];
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
 * Obtiene sesiones de caja iniciales
 */
export function getSeedCashSessions(): CashSession[] {
  return [];
}

/**
 * Obtiene el inventario inicial de accesorios para vehículos
 */
export function getSeedInventoryItems(): InventoryItem[] {
  return [];
}

/**
 * Obtiene ventas anteriores de accesorios
 */
export function getSeedAccessorySales(): AccessorySale[] {
  return [];
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
  return [];
}

export function getSeedQuotes(): ServiceQuote[] {
  return [];
}

export function getSeedNightSubscriptions(): NightSubscription[] {
  return [];
}

/**
 * Semillas iniciales para la base de datos de vehículos / patentes
 */
export function getSeedVehicleRecords(): VehicleRecord[] {
  return [];
}


