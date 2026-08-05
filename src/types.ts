/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type VehicleType = 'auto' | 'hatchback' | 'suv' | 'moto' | 'bicicleta' | 'camioneta' | 'furgon' | 'otro';

export type PaymentMethod = 'efectivo' | 'debito' | 'transferencia' | 'tarjeta_online';

export interface TariffBlock {
  id: string;
  name: string;
  minMinutes: number;
  maxMinutes: number; // Use Infinity for open-ended last block
  cost: number;
}

export interface TariffSettings {
  currency: string;
  defaultBlockModel: 'cumulative' | 'flat_ranges' | 'simple_hourly';
  baseHourlyRate: number;
  minFractionMinutes: number; // e.g. 15 mins minimum fraction
  blocks: TariffBlock[];
  debitCommissionRate?: number;
  debitCommissionProvider?: string;
  // Configuración del Ticket Térmico 58mm
  businessName?: string;
  businessId?: string;
  businessAddress?: string;
  businessPhone?: string;
  ticketFooter?: string;
  showQrInTicket?: boolean;
}

export interface ParkingSession {
  id: string;
  plate: string; // Patente normalized (uppercase, no spaces/hyphens or kept clean)
  vehicleType: VehicleType;
  brand?: string; // Marca
  model?: string; // Modelo
  color?: string; // Color
  year?: string;  // Año
  clientName?: string;
  clientPhone?: string;
  entryTime: string; // ISO String
  exitTime?: string; // ISO String when completed
  status: 'active' | 'completed';
  notes?: string;
  chargedAmount?: number;
  durationMinutes?: number;
  paymentMethod?: PaymentMethod; // payment method used
}

export interface CashMovement {
  id: string;
  timestamp: string; // ISO string
  type: 'ingreso' | 'egreso'; // input / output
  amount: number;
  description: string;
}

export interface CashSession {
  id: string;
  openedAt: string; // ISO string
  closedAt?: string; // ISO string
  openingBalance: number; // Starting cash
  closingBalance?: number; // Physical count of cash
  expectedBalance?: number; // Calculated cash based on sales and manual movements
  status: 'open' | 'closed';
  notes?: string;
  movements: CashMovement[]; // Manual inputs / outputs during the session
  cashSales: number; // Sum of cash payments received
  debitoSales: number; // Sum of debit card payments received
  transferenciaSales: number; // Sum of bank transfer payments received
  tarjetaOnlineSales?: number; // Sum of online gateway payments received
}

export interface VehicleStats {
  plate: string;
  totalVisits: number;
  totalDurationMinutes: number;
  totalSpent: number;
  lastVisit: string;
  sessions: ParkingSession[];
}

export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  minStock: number; // Alerts when stock drops below this value
  category: string; // e.g. 'Aromatizantes', 'Limpieza', 'Seguridad', 'Herramientas', 'Otros'
  ivaRate?: number; // VAT percentage, e.g. 19 for 19%, 0 for exempt/exento
  brand?: string;
  color?: string;
  fragrance?: string;
  weightValue?: number;
  weightUnit?: 'gr' | 'ml';
  barcode?: string;
}

export interface AccessorySale {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  paymentMethod: PaymentMethod;
  timestamp: string; // ISO string
  buyerPlate?: string; // Optional linking to a vehicle plate
  notes?: string;
  ivaRate?: number; // VAT percentage applied at time of sale
  netPrice?: number; // Net total price (Total - IVA)
  ivaAmount?: number; // IVA tax amount
}

export type WashStatus = 'espera' | 'lavando' | 'secando' | 'listo' | 'entregado';

export interface WashPackage {
  id: string;
  name: string;
  description: string;
  priceByVehicleType: Record<VehicleType, number>;
  estimatedMinutes: number;
  icon: string;
}

export interface WashSession {
  id: string;
  plate: string;
  vehicleType: VehicleType;
  clientName?: string;
  clientPhone?: string;
  packageId: string;
  packageName: string;
  price: number;
  status: WashStatus;
  entryTime: string; // ISO string
  startTime?: string; // ISO string when washing starts
  readyTime?: string; // ISO string when ready
  endTime?: string; // ISO string when delivered & paid
  paymentMethod?: PaymentMethod;
  notes?: string;
  washerName?: string;
  entryPhoto?: string; // Base64 Data URL of entry condition
  exitPhoto?: string;  // Base64 Data URL of exit condition
}

export type UserRole = 'admin' | 'operador';

export interface AppUser {
  id: string;
  name: string;
  role: UserRole;
  pin: string; // PIN for session lock/unlocking
  createdAt: string;
}

export interface ServiceBooking {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  plate: string;
  vehicleType: VehicleType;
  serviceType: 'parking' | 'wash' | 'both';
  washPackageId?: string;
  washPackageName?: string;
  bookingDate: string; // YYYY-MM-DD
  bookingTime: string; // HH:MM
  notes?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  rejectionReason?: string;
  createdAt: string;
}

export interface PortalClient {
  id: string;
  email: string;
  name: string;
  phone: string;
  plates: string[]; // List of registered license plates
  createdAt: string;
}

// --- COTIZACIONES DE SERVICIOS Y ARTÍCULOS ---
export interface QuoteItem {
  id: string;
  type: 'parking' | 'wash' | 'inventory' | 'engraving' | 'custom';
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ServiceQuote {
  id: string;
  quoteNumber: string; // e.g. "COT-1001"
  clientName: string;
  clientRut?: string;
  clientPhone?: string;
  clientEmail?: string;
  plate?: string;
  vehicleType?: VehicleType;
  brand?: string;
  model?: string;
  items: QuoteItem[];
  netAmount: number;
  ivaRate: number; // e.g. 19 or 0
  ivaAmount: number;
  totalAmount: number;
  status: 'borrador' | 'pendiente' | 'aprobada' | 'rechazada' | 'convertida';
  createdAt: string; // ISO string
  validUntil?: string; // ISO date YYYY-MM-DD
  notes?: string;
  convertedToType?: 'active_parking' | 'accessory_sale' | 'wash';
}

// --- ESTACIONAMIENTO MENSUAL NOCTURNO ---
export interface NightSubscription {
  id: string;
  plate: string;
  clientName: string;
  clientRut?: string;
  clientPhone?: string;
  clientEmail?: string;
  vehicleType: VehicleType;
  brand?: string;
  model?: string;
  color?: string;
  schedule: string; // e.g. "20:00 - 08:00"
  monthlyFee: number; // e.g. 45000
  startDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  status: 'al_dia' | 'por_vencer' | 'vencido' | 'suspendido';
  lastPaymentDate?: string; // ISO string
  notes?: string;
  paymentHistory: {
    id: string;
    paymentDate: string;
    periodMonth: string; // e.g. "2026-07"
    amount: number;
    paymentMethod: PaymentMethod;
    notes?: string;
  }[];
}

export interface NightCheckLog {
  id: string;
  subscriptionId: string;
  plate: string;
  entryTime: string; // ISO String
  exitTime?: string; // ISO String
  status: 'parked' | 'checked_out';
  notes?: string;
}

// --- BASE DE DATOS DE VEHÍCULOS / REGISTRO DE PATENTES ---
export interface VehicleRecord {
  id: string; // ID único (ej: patente normalizada "AB123CD")
  plate: string; // Patente visible (ej: "AB-12-34")
  vehicleType: VehicleType;
  brand?: string;
  model?: string;
  color?: string;
  year?: string;
  clientName?: string;
  clientRut?: string;
  clientPhone?: string;
  clientEmail?: string;
  internalNotes?: string; // Observaciones internas (ej: "Rayón puerta derecha", "VIP", "Cliente exigente", "Advertencia")
  vipStatus?: boolean; // Marcar como cliente VIP
  alertFlag?: boolean; // Activar advertencia/alerta al ingresar
  alertMessage?: string; // Detalle de la alerta
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
}




