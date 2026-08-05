/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ParkingSession, AccessorySale, TariffSettings, PaymentMethod, VehicleType } from '../types';
import { 
  formatCurrency, 
  formatDuration, 
  formatPlate, 
  getVehicleTypeLabel 
} from '../utils/parkingUtils';
import { 
  Search, 
  Car, 
  Wrench, 
  Clock, 
  Coins, 
  User, 
  ChevronRight, 
  Calendar, 
  Printer, 
  Plus, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  FileText, 
  Tag, 
  Filter, 
  Sparkles, 
  PlusCircle, 
  Activity, 
  ArrowRight,
  Sparkle
} from 'lucide-react';

interface VehicleServicesHistoryProps {
  sessions: ParkingSession[];
  accessorySales: AccessorySale[];
  settings: TariffSettings;
  isCashOpen: boolean;
  onSellAccessory: (sale: Omit<AccessorySale, 'id' | 'timestamp'>) => void;
}

// Predefined services list for ease of recording
const PREDEFINED_SERVICES = [
  { id: 'srv-lavado-ext', name: '🧼 Lavado Exterior Simple', price: 6000, category: 'Lavado' },
  { id: 'srv-lavado-full', name: '✨ Lavado Full (Int + Ext)', price: 10000, category: 'Lavado' },
  { id: 'srv-aspirado', name: '💨 Aspirado y Perfumado', price: 4000, category: 'Limpieza' },
  { id: 'srv-opticos', name: '💡 Pulido de Ópticos (Focos)', price: 15000, category: 'Estética' },
  { id: 'srv-silicona', name: '🛞 Silicona de Neumáticos y Renovador', price: 3000, category: 'Estética' },
  { id: 'srv-personalizado', name: '🛠️ Servicio Técnico / Otro', price: 0, category: 'Personalizado' }
];

export default function VehicleServicesHistory({
  sessions,
  accessorySales,
  settings,
  isCashOpen,
  onSellAccessory
}: VehicleServicesHistoryProps) {
  
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<'all' | 'parking' | 'sales'>('all');
  const [selectedPlate, setSelectedPlate] = useState<string | null>(null);

  // States for recording a new service
  const [isRecordingService, setIsRecordingService] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState(PREDEFINED_SERVICES[0].id);
  const [customServiceName, setCustomServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState<number>(PREDEFINED_SERVICES[0].price);
  const [servicePaymentMethod, setServicePaymentMethod] = useState<PaymentMethod>('efectivo');
  const [serviceNotes, setServiceNotes] = useState('');
  const [serviceError, setServiceError] = useState('');
  const [successNotification, setSuccessNotification] = useState<string | null>(null);

  // Handle service selection changes
  const handleServiceChange = (id: string) => {
    setSelectedServiceId(id);
    const service = PREDEFINED_SERVICES.find(s => s.id === id);
    if (service) {
      if (service.id === 'srv-personalizado') {
        setServicePrice(0);
        setCustomServiceName('');
      } else {
        setServicePrice(service.price);
        setCustomServiceName(service.name);
      }
    }
  };

  // Process Recording Custom Service
  const handleRecordServiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlate) return;

    if (!isCashOpen) {
      setServiceError('No se pueden registrar servicios si la caja registradora está cerrada. Abra el turno primero.');
      return;
    }

    const service = PREDEFINED_SERVICES.find(s => s.id === selectedServiceId);
    let finalName = '';
    if (selectedServiceId === 'srv-personalizado') {
      if (!customServiceName.trim()) {
        setServiceError('Por favor ingrese el nombre del servicio personalizado.');
        return;
      }
      finalName = `🛠️ ${customServiceName.trim()}`;
    } else {
      finalName = service?.name || 'Servicio';
    }

    if (servicePrice < 0) {
      setServiceError('El precio del servicio no puede ser negativo.');
      return;
    }

    // Sell accessory as a Service record
    onSellAccessory({
      itemId: selectedServiceId,
      itemName: finalName,
      quantity: 1,
      unitPrice: servicePrice,
      totalPrice: servicePrice,
      paymentMethod: servicePaymentMethod,
      buyerPlate: selectedPlate.toUpperCase().replace(/[^A-Z0-9]/g, ''),
      notes: serviceNotes.trim() ? serviceNotes.trim() : 'Registrado desde pestaña de servicios',
      ivaRate: 19,
      netPrice: Math.round(servicePrice / 1.19),
      ivaAmount: servicePrice - Math.round(servicePrice / 1.19)
    });

    // Reset Form
    setIsRecordingService(false);
    setServiceNotes('');
    setServiceError('');
    setSuccessNotification(`¡Servicio "${finalName}" registrado con éxito para el vehículo ${formatPlate(selectedPlate)}!`);
    
    setTimeout(() => {
      setSuccessNotification(null);
    }, 5000);
  };

  // Group all data by plate to create our Master Registry
  const uniquePlatesMap = new Map<string, {
    plate: string;
    clientName: string;
    vehicleType: VehicleType;
    parkingCount: number;
    parkingSpent: number;
    parkingMinutes: number;
    salesCount: number;
    salesSpent: number;
    lastDate: string;
  }>();

  // 1. Process all parking sessions
  sessions.forEach(s => {
    const cleanPlate = s.plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanPlate) return;

    const existing = uniquePlatesMap.get(cleanPlate);
    const amount = s.status === 'completed' ? (s.chargedAmount || 0) : 0;
    const minutes = s.status === 'completed' ? (s.durationMinutes || 0) : 0;
    const sessionDate = s.exitTime || s.entryTime;

    if (existing) {
      existing.parkingCount += 1;
      existing.parkingSpent += amount;
      existing.parkingMinutes += minutes;
      if (s.clientName && !existing.clientName) {
        existing.clientName = s.clientName;
      }
      if (new Date(sessionDate).getTime() > new Date(existing.lastDate).getTime()) {
        existing.lastDate = sessionDate;
      }
    } else {
      uniquePlatesMap.set(cleanPlate, {
        plate: s.plate.toUpperCase(),
        clientName: s.clientName || '',
        vehicleType: s.vehicleType,
        parkingCount: 1,
        parkingSpent: amount,
        parkingMinutes: minutes,
        salesCount: 0,
        salesSpent: 0,
        lastDate: sessionDate
      });
    }
  });

  // 2. Process all accessory sales linked to a buyerPlate
  accessorySales.forEach(as => {
    if (!as.buyerPlate) return;
    const cleanPlate = as.buyerPlate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanPlate) return;

    const existing = uniquePlatesMap.get(cleanPlate);
    if (existing) {
      existing.salesCount += as.quantity;
      existing.salesSpent += as.totalPrice;
      if (new Date(as.timestamp).getTime() > new Date(existing.lastDate).getTime()) {
        existing.lastDate = as.timestamp;
      }
    } else {
      // Find a typical vehicle type matching existing records, otherwise default to 'auto'
      uniquePlatesMap.set(cleanPlate, {
        plate: as.buyerPlate.toUpperCase(),
        clientName: '',
        vehicleType: 'auto',
        parkingCount: 0,
        parkingSpent: 0,
        parkingMinutes: 0,
        salesCount: as.quantity,
        salesSpent: as.totalPrice,
        lastDate: as.timestamp
      });
    }
  });

  const vehiclesRegistry = Array.from(uniquePlatesMap.values());

  // Filter and Search
  const filteredRegistry = vehiclesRegistry.filter(v => {
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery = 
      v.plate.toLowerCase().includes(query) ||
      v.clientName.toLowerCase().includes(query);

    const matchesVehicleType = vehicleTypeFilter === 'all' || v.vehicleType === vehicleTypeFilter;

    let matchesServiceType = true;
    if (serviceTypeFilter === 'parking') {
      matchesServiceType = v.parkingCount > 0;
    } else if (serviceTypeFilter === 'sales') {
      matchesServiceType = v.salesCount > 0;
    }

    return matchesQuery && matchesVehicleType && matchesServiceType;
  });

  // Sort: default by last visit date
  const sortedRegistry = [...filteredRegistry].sort(
    (a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime()
  );

  // Selected Vehicle Calculations
  const selectedVehicleData = selectedPlate ? uniquePlatesMap.get(selectedPlate.toUpperCase().replace(/[^A-Z0-9]/g, '')) : null;

  // Compile timeline for selected vehicle
  const timelineEvents: {
    id: string;
    type: 'parking' | 'service_sale' | 'product_sale';
    date: string;
    title: string;
    description: string;
    amount: number;
    paymentMethod?: PaymentMethod;
    badgeText: string;
    badgeColor: string;
    notes?: string;
    details?: React.ReactNode;
  }[] = [];

  if (selectedPlate) {
    const cleanPlate = selectedPlate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Add sessions
    sessions.filter(s => s.plate.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanPlate)
      .forEach(s => {
        const isCompleted = s.status === 'completed';
        timelineEvents.push({
          id: s.id,
          type: 'parking',
          date: s.entryTime,
          title: `🅿️ Estacionamiento: ${getVehicleTypeLabel(s.vehicleType)}`,
          description: isCompleted 
            ? `Estadía finalizada de ${formatDuration(s.durationMinutes || 0)}`
            : `Vehículo actualmente adentro desde las ${new Date(s.entryTime).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`,
          amount: isCompleted ? (s.chargedAmount || 0) : 0,
          paymentMethod: s.paymentMethod,
          badgeText: isCompleted ? 'Completado' : 'Activo',
          badgeColor: isCompleted ? 'bg-emerald-950/60 text-emerald-400 border-emerald-900/40' : 'bg-amber-950/60 text-amber-400 border-amber-900/40',
          notes: s.notes,
          details: (
            <div className="text-[10px] space-y-1 font-mono text-slate-400 mt-1">
              <p>Ingreso: {new Date(s.entryTime).toLocaleString('es-CL')}</p>
              {s.exitTime && <p>Salida: {new Date(s.exitTime).toLocaleString('es-CL')}</p>}
              {s.durationMinutes && <p>Minutos Totales: {s.durationMinutes} min</p>}
            </div>
          )
        });
      });

    // Add sales/services
    accessorySales.filter(as => as.buyerPlate?.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanPlate)
      .forEach(as => {
        const isWash = as.itemId.startsWith('srv-');
        timelineEvents.push({
          id: as.id,
          type: isWash ? 'service_sale' : 'product_sale',
          date: as.timestamp,
          title: as.itemName,
          description: `Venta registrada x${as.quantity} unidad(es)`,
          amount: as.totalPrice,
          paymentMethod: as.paymentMethod,
          badgeText: isWash ? 'Servicio Lavado' : 'Compra Tienda',
          badgeColor: isWash ? 'bg-indigo-950/60 text-indigo-400 border-indigo-900/40' : 'bg-blue-950/60 text-blue-400 border-blue-900/40',
          notes: as.notes,
          details: (
            <div className="text-[10px] space-y-1 font-mono text-slate-400 mt-1">
              <p>Fecha: {new Date(as.timestamp).toLocaleString('es-CL')}</p>
              <p>P. Unitario: {formatCurrency(as.unitPrice, settings.currency)}</p>
              <p>Neto: {formatCurrency(as.netPrice || 0, settings.currency)} + IVA: {formatCurrency(as.ivaAmount || 0, settings.currency)}</p>
            </div>
          )
        });
      });

    // Sort timeline: descending (newest first)
    timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // General statistics
  const totalVehicles = uniquePlatesMap.size;
  const totalParkingsRendered = sessions.length;
  const totalWashesAndSales = accessorySales.filter(as => as.buyerPlate).length;
  const totalRevenueGenerated = sessions.reduce((sum, s) => sum + (s.chargedAmount || 0), 0) + 
                                accessorySales.filter(as => as.buyerPlate).reduce((sum, as) => sum + as.totalPrice, 0);

  // Print single sheet list of services
  const handlePrintVehicleSummary = () => {
    if (!selectedVehicleData) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const serviceLines = timelineEvents.map(evt => `
      <tr>
        <td style="padding: 6px; border-bottom: 1px solid #ddd; font-size: 11px;">
          ${new Date(evt.date).toLocaleDateString('es-CL')}
        </td>
        <td style="padding: 6px; border-bottom: 1px solid #ddd; font-size: 11px;">
          <strong>${evt.title}</strong><br/>
          <span style="color:#666; font-size:10px">${evt.description}</span>
        </td>
        <td style="padding: 6px; border-bottom: 1px solid #ddd; font-size: 11px; text-transform: uppercase;">
          ${evt.paymentMethod || 'N/A'}
        </td>
        <td style="padding: 6px; border-bottom: 1px solid #ddd; font-size: 11px; text-align: right; font-weight: bold;">
          ${formatCurrency(evt.amount, settings.currency)}
        </td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Ficha de Servicios - ${selectedVehicleData.plate}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; color: #000; padding: 20px; max-width: 400px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 15px; }
            .plate { font-size: 24px; font-weight: bold; border: 2px solid #000; padding: 5px 10px; display: inline-block; margin: 10px 0; letter-spacing: 2px; }
            .stats { margin-bottom: 15px; font-size: 12px; line-height: 1.4; }
            table { w-full; border-collapse: collapse; margin-top: 10px; }
            th { text-align: left; border-bottom: 1px dashed #000; padding: 4px; font-size: 11px; }
            .total { font-size: 16px; font-weight: bold; text-align: right; border-top: 2px dashed #000; padding-top: 10px; margin-top: 15px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <h3>PARK-FLOW CONTROL</h3>
            <p style="font-size: 10px; margin: 2px 0;">INFORME DE SERVICIOS PRESTADOS</p>
            <div class="plate">${formatPlate(selectedVehicleData.plate)}</div>
            <p style="font-size: 11px; margin: 5px 0;"><strong>Cliente:</strong> ${selectedVehicleData.clientName || 'Particular'}</p>
          </div>
          
          <div class="stats">
            <strong>Resumen de Servicios:</strong><br/>
            - Total Visitas Estacionamiento: ${selectedVehicleData.parkingCount}<br/>
            - Total Consumo Tienda/Servicios: ${selectedVehicleData.salesCount}<br/>
            - Estadía Acumulada: ${selectedVehicleData.parkingMinutes} min<br/>
            <strong>- Facturación Acumulada: ${formatCurrency(selectedVehicleData.parkingSpent + selectedVehicleData.salesSpent, settings.currency)}</strong>
          </div>

          <table style="width: 100%;">
            <thead>
              <tr>
                <th style="padding: 4px; border-bottom: 1px solid #000; font-size:10px;">FECHA</th>
                <th style="padding: 4px; border-bottom: 1px solid #000; font-size:10px;">DETALLE</th>
                <th style="padding: 4px; border-bottom: 1px solid #000; font-size:10px;">PAGO</th>
                <th style="padding: 4px; border-bottom: 1px solid #000; font-size:10px; text-align: right;">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${serviceLines}
            </tbody>
          </table>

          <div class="total">
            TOTAL CONSOLIDADO: ${formatCurrency(selectedVehicleData.parkingSpent + selectedVehicleData.salesSpent, settings.currency)}
          </div>
          
          <p style="text-align: center; font-size: 9px; margin-top: 30px; border-top: 1px dashed #000; padding-top: 10px;">
            Santiago de Chile - ${new Date().toLocaleString('es-CL')}
          </p>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      
      {/* Toast de Notificación Exito */}
      {successNotification && (
        <div className="fixed bottom-6 right-6 bg-slate-900 border-2 border-emerald-500 text-slate-100 px-6 py-4 rounded-2xl shadow-2xl z-50 animate-slide-left flex items-start gap-3 max-w-md">
          <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-400">¡Registro Exitoso!</h4>
            <p className="text-xs text-slate-300">{successNotification}</p>
          </div>
          <button onClick={() => setSuccessNotification(null)} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cabecera Principal */}
      <div className="bg-slate-950/40 p-6 rounded-2xl border border-slate-800/80 shadow-2xl space-y-4 backdrop-blur-md">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Wrench className="w-5.5 h-5.5 text-blue-500" />
              Histórico de Servicios por Vehículo
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Ficha integrada por patente de automóviles. Controle visitas, lavados, y consumos consolidados con auditoría completa.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 px-4 py-2 rounded-xl text-right">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">FACTURACIÓN VEHÍCULOS</span>
            <span className="text-sm font-mono font-black text-emerald-400">
              {formatCurrency(totalRevenueGenerated, settings.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Tarjetas Bento de Métricas Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-950/40 p-4.5 rounded-2xl border border-slate-800/80 shadow-md backdrop-blur-md space-y-2">
          <div className="w-8 h-8 rounded-lg bg-blue-950 text-blue-400 border border-blue-900/40 flex items-center justify-center">
            <Car className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Flota Registrada</span>
            <span className="text-xl font-mono font-black text-white">{totalVehicles}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Patentes atendidas</span>
          </div>
        </div>

        <div className="bg-slate-950/40 p-4.5 rounded-2xl border border-slate-800/80 shadow-md backdrop-blur-md space-y-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-900/40 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Estacionamientos</span>
            <span className="text-xl font-mono font-black text-white">{totalParkingsRendered}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Tickets emitidos</span>
          </div>
        </div>

        <div className="bg-slate-950/40 p-4.5 rounded-2xl border border-slate-800/80 shadow-md backdrop-blur-md space-y-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-900/40 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Servicios Estéticos</span>
            <span className="text-xl font-mono font-black text-white">{totalWashesAndSales}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Lavados / Tienda</span>
          </div>
        </div>

        <div className="bg-slate-950/40 p-4.5 rounded-2xl border border-slate-800/80 shadow-md backdrop-blur-md space-y-2">
          <div className="w-8 h-8 rounded-lg bg-amber-950 text-amber-400 border border-amber-900/40 flex items-center justify-center">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Ticket Promedio</span>
            <span className="text-xl font-mono font-black text-white">
              {formatCurrency(totalVehicles > 0 ? Math.round(totalRevenueGenerated / totalVehicles) : 0, settings.currency)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Por vehículo único</span>
          </div>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Columna Izquierda / Central: Listado de Vehículos con Filtros */}
        <div className={`${selectedPlate ? 'xl:col-span-2' : 'xl:col-span-3'} space-y-4`}>
          
          {/* Barra de Búsqueda y Filtros */}
          <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/80 shadow-md backdrop-blur-md flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por patente o cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-900/40 focus:border-blue-500 transition-all text-white placeholder:text-slate-500"
              />
            </div>

            <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
              {/* Filtro por Tipo de Vehículo */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>Tipo:</span>
                <select
                  value={vehicleTypeFilter}
                  onChange={(e) => setVehicleTypeFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-xs rounded-lg px-2.5 py-1 text-slate-300 focus:outline-hidden"
                >
                  <option value="all">Todos</option>
                  <option value="auto">Auto</option>
                  <option value="suv">SUV</option>
                  <option value="moto">Moto</option>
                  <option value="camioneta">Camioneta</option>
                  <option value="furgon">Furgón</option>
                </select>
              </div>

              {/* Filtro por Tipo de Servicio recibido */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>Servicio:</span>
                <select
                  value={serviceTypeFilter}
                  onChange={(e) => setServiceTypeFilter(e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 text-xs rounded-lg px-2.5 py-1 text-slate-300 focus:outline-hidden"
                >
                  <option value="all">Todos los Registros</option>
                  <option value="parking">Con Estacionamiento</option>
                  <option value="sales">Con Lavado / Tienda</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabla / Listado de Registros */}
          <div className="bg-slate-950/40 rounded-2xl border border-slate-800/80 shadow-2xl overflow-hidden backdrop-blur-md">
            <div className="overflow-x-auto">
              {sortedRegistry.length === 0 ? (
                <div className="p-16 text-center text-slate-500 font-mono text-xs">
                  [ No se encontraron registros de vehículos ]
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/60 text-slate-500 text-[10px] font-bold uppercase tracking-wider bg-slate-950/10">
                      <th className="py-3.5 px-6">Placa Patente</th>
                      <th className="py-3.5 px-6">Cliente Relacionado</th>
                      <th className="py-3.5 px-6">Categoría</th>
                      <th className="py-3.5 px-6 text-center">Frecuencia</th>
                      <th className="py-3.5 px-6 text-right">Consumo Total</th>
                      <th className="py-3.5 px-6 text-center">Último Servicio</th>
                      <th className="py-3.5 px-6 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-xs">
                    {sortedRegistry.map((v) => {
                      const isSelected = selectedPlate?.toUpperCase().replace(/[^A-Z0-9]/g, '') === v.plate.replace(/[^A-Z0-9]/g, '');
                      const totalConsumo = v.parkingSpent + v.salesSpent;

                      return (
                        <tr 
                          key={v.plate}
                          onClick={() => setSelectedPlate(v.plate)}
                          className={`hover:bg-slate-900/40 cursor-pointer transition-all duration-150 ${
                            isSelected ? 'bg-slate-900/80 font-semibold text-blue-400' : 'text-slate-300'
                          }`}
                        >
                          {/* Chilean Plate Badge */}
                          <td className="py-3.5 px-6">
                            <div className="flex items-center gap-2">
                              {/* Chilean Style Plate Card */}
                              <div className="w-[100px] bg-white border-2 border-black rounded-sm flex flex-col items-center justify-between shadow-md py-0.5 select-none relative overflow-hidden">
                                <div className="w-full bg-blue-600 text-[6px] text-white font-extrabold tracking-widest text-center uppercase py-0.2">
                                  Chile
                                </div>
                                <div className="text-black font-black font-mono text-center text-xs tracking-widest py-0.5 uppercase">
                                  {formatPlate(v.plate).replace('•', ' ')}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Client Name */}
                          <td className="py-3.5 px-6">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-200 block">{v.clientName || 'Cliente Particular'}</span>
                              <span className="text-[10px] text-slate-500 font-mono uppercase">{v.plate}</span>
                            </div>
                          </td>

                          {/* Vehicle Type */}
                          <td className="py-3.5 px-6 uppercase tracking-wider text-[10px] font-bold text-slate-400">
                            {getVehicleTypeLabel(v.vehicleType)}
                          </td>

                          {/* Frequency Counts */}
                          <td className="py-3.5 px-6 text-center">
                            <div className="flex justify-center gap-1.5 text-[10px]">
                              {v.parkingCount > 0 && (
                                <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-900/40 font-bold uppercase">
                                  🅿️ {v.parkingCount}
                                </span>
                              )}
                              {v.salesCount > 0 && (
                                <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-900/40 font-bold uppercase">
                                  🧼 {v.salesCount}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Total Consumption */}
                          <td className="py-3.5 px-6 text-right font-mono">
                            <span className="font-black text-emerald-400 text-xs block">
                              {formatCurrency(totalConsumo, settings.currency)}
                            </span>
                            <span className="text-[9px] text-slate-500 block">
                              {v.parkingMinutes > 0 ? `${v.parkingMinutes} min estadía` : 'Sin parking'}
                            </span>
                          </td>

                          {/* Last Visit/Service Date */}
                          <td className="py-3.5 px-6 text-center text-slate-400 font-mono text-[11px]">
                            {new Date(v.lastDate).toLocaleDateString('es-CL')}
                            <span className="block text-[9px] text-slate-600">
                              {new Date(v.lastDate).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>

                          {/* Action Button */}
                          <td className="py-3.5 px-6 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPlate(v.plate);
                              }}
                              className="text-blue-500 hover:text-blue-400 font-extrabold uppercase text-[10px] tracking-wider inline-flex items-center gap-0.5"
                            >
                              Ver Ficha
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Ficha Consolidada y Registro de Servicios */}
        {selectedPlate && selectedVehicleData ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 h-fit space-y-6 xl:col-span-1 border-t-4 border-t-blue-500 animate-slide-left">
            
            {/* Header Ficha */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div>
                <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest block mb-0.5">HISTORIAL GENERAL DE SERVICIOS</span>
                <div className="flex items-center gap-2">
                  <h3 className="font-mono text-lg font-black text-white tracking-widest uppercase">
                    {formatPlate(selectedVehicleData.plate)}
                  </h3>
                  <span className="text-[9px] font-bold bg-blue-950 text-blue-400 border border-blue-900/40 px-2 py-0.5 rounded uppercase">
                    Atendido
                  </span>
                </div>
              </div>
              <button 
                onClick={() => {
                  setSelectedPlate(null);
                  setIsRecordingService(false);
                }}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Datos Resumen */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-xs space-y-3">
              <div className="flex justify-between border-b border-slate-900 pb-2">
                <span className="text-slate-400">Cliente Asociado:</span>
                <span className="font-bold text-white text-right">{selectedVehicleData.clientName || 'Cliente Particular'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-2">
                <span className="text-slate-400">Frecuencia Estacionamiento:</span>
                <span className="font-bold text-blue-400 font-mono">{selectedVehicleData.parkingCount} visitas</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-2">
                <span className="text-slate-400">Consumos y Servicios:</span>
                <span className="font-bold text-indigo-400 font-mono">{selectedVehicleData.salesCount} cargos</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-400 font-bold">TOTAL RECAUDADO:</span>
                <span className="font-mono text-emerald-400 font-black text-sm">
                  {formatCurrency(selectedVehicleData.parkingSpent + selectedVehicleData.salesSpent, settings.currency)}
                </span>
              </div>
            </div>

            {/* Panel para Registrar Nuevo Servicio Prestado */}
            {!isRecordingService ? (
              <button
                onClick={() => {
                  if (!isCashOpen) {
                    alert('Debe abrir la caja registradora primero para ingresar servicios cobrados.');
                    return;
                  }
                  setIsRecordingService(true);
                }}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl shadow-md hover:shadow-blue-900/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                Registrar Servicio Prestado / Lavado
              </button>
            ) : (
              <form onSubmit={handleRecordServiceSubmit} className="bg-slate-950/60 p-4 rounded-xl border border-blue-900/30 space-y-4 animate-fade-in text-xs">
                <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5 uppercase text-[10px] tracking-wide text-blue-400">
                    <Sparkle className="w-3.5 h-3.5 text-blue-400" />
                    Registrar Servicio
                  </span>
                  <button 
                    type="button" 
                    onClick={() => setIsRecordingService(false)}
                    className="text-slate-500 hover:text-slate-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {serviceError && (
                  <div className="bg-rose-950/40 border border-rose-900/60 text-rose-300 p-2.5 rounded-lg text-[11px] flex gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
                    <span>{serviceError}</span>
                  </div>
                )}

                {/* Seleccionar Servicio Predefinido */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Seleccione Servicio</label>
                  <select
                    value={selectedServiceId}
                    onChange={(e) => handleServiceChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-xs text-white rounded-lg px-2.5 py-2 focus:outline-hidden"
                  >
                    {PREDEFINED_SERVICES.map(srv => (
                      <option key={srv.id} value={srv.id}>
                        {srv.name} {srv.price > 0 ? `(${formatCurrency(srv.price, settings.currency)})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Si es Personalizado, mostrar campo de nombre */}
                {selectedServiceId === 'srv-personalizado' && (
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Nombre del Servicio Personalizado</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Lavado Chasis o Reparación"
                      value={customServiceName}
                      onChange={(e) => setCustomServiceName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                )}

                {/* Precio del Servicio */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Monto Cobrado ({settings.currency})</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    required
                    value={servicePrice}
                    onChange={(e) => setServicePrice(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white font-mono"
                  />
                </div>

                {/* Forma de Pago */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Forma de Pago</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([
                      { key: 'efectivo', label: 'Efectivo' },
                      { key: 'debito', label: 'Débito' },
                      { key: 'transferencia', label: 'Transf.' }
                    ] as const).map(p => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setServicePaymentMethod(p.key)}
                        className={`py-1 rounded text-[10px] font-bold border transition-colors ${
                          servicePaymentMethod === p.key 
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Observaciones del servicio */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Observaciones / Detalles</label>
                  <textarea
                    placeholder="e.g. Con lavado de llantas, incluye silicona, etc."
                    rows={1.5}
                    value={serviceNotes}
                    onChange={(e) => setServiceNotes(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 resize-none"
                  />
                </div>

                {/* Botón de Confirmar */}
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Registrar Cobro de Servicio
                </button>
              </form>
            )}

            {/* Timeline Histórica */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  Línea de Tiempo de Servicios ({timelineEvents.length})
                </h4>
                <button
                  onClick={handlePrintVehicleSummary}
                  className="text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 bg-slate-950 px-2 py-1 rounded text-[9px] uppercase font-bold flex items-center gap-1 transition-all"
                  title="Imprimir ficha de servicios"
                >
                  <Printer className="w-3 h-3 text-blue-500" />
                  Imprimir
                </button>
              </div>

              {timelineEvents.length === 0 ? (
                <p className="text-slate-500 text-center py-4 italic text-xs">[ No hay registros históricos para este auto ]</p>
              ) : (
                <div className="relative border-l border-slate-800 pl-4 space-y-4 ml-2 max-h-[400px] overflow-y-auto pr-1">
                  {timelineEvents.map((evt) => (
                    <div key={evt.id} className="relative group/evt">
                      {/* Bullet indicador */}
                      <span className="absolute -left-[20px] top-1.5 w-2.2 h-2.2 rounded-full bg-blue-600 border border-slate-900 group-hover/evt:scale-110 transition-transform" />
                      
                      <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850 hover:bg-slate-950/90 transition-all text-xs">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[10px] font-mono text-slate-500">
                            {new Date(evt.date).toLocaleDateString('es-CL')} - {new Date(evt.date).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className={`text-[8px] font-bold uppercase border px-1.5 py-0.2 rounded-full ${evt.badgeColor}`}>
                            {evt.badgeText}
                          </span>
                        </div>

                        <p className="font-bold text-slate-200 mt-1">{evt.title}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{evt.description}</p>
                        
                        {evt.details}

                        {evt.notes && (
                          <div className="bg-slate-900/60 p-2 border border-slate-850 rounded text-[10px] text-slate-400 italic mt-2 leading-relaxed">
                            Obs: {evt.notes}
                          </div>
                        )}

                        <div className="flex justify-between items-center border-t border-slate-900 mt-2.5 pt-2 font-mono">
                          <span className="text-[9px] text-slate-500 uppercase">Cobro Facturado</span>
                          <span className="font-extrabold text-emerald-400">
                            {formatCurrency(evt.amount, settings.currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="bg-slate-950/30 rounded-2xl border border-slate-850 p-12 text-center xl:col-span-1 border-dashed flex flex-col items-center justify-center space-y-4 shadow-inner">
            <div className="w-12 h-12 rounded-full bg-slate-900/80 text-slate-600 flex items-center justify-center border border-slate-800">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Ficha del Vehículo</p>
              <p className="text-slate-500 text-xs mt-1 max-w-xs mx-auto leading-relaxed">
                Seleccione una placa patente de la tabla para abrir el panel de auditoría, registrar nuevos lavados o imprimir resúmenes consolidados de servicios.
              </p>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
