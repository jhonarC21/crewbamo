/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ParkingSession, 
  AccessorySale, 
  TariffSettings, 
  PaymentMethod, 
  VehicleType,
  WashStatus,
  WashPackage,
  WashSession
} from '../types';
import { 
  formatCurrency, 
  formatPlate, 
  getVehicleTypeLabel,
  DEFAULT_WASH_PACKAGES
} from '../utils/parkingUtils';
import { dbService, authService } from '../lib/firebase';
import VehiclePhotoCapture from './VehiclePhotoCapture';
import PaymentGatewayModal from './PaymentGatewayModal';
import { 
  Droplet, 
  Sparkles, 
  Wind, 
  Wrench, 
  Clock, 
  CheckCircle2, 
  Play, 
  Check, 
  Plus, 
  X, 
  AlertTriangle, 
  Search, 
  Printer, 
  DollarSign, 
  User, 
  TrendingUp, 
  Calendar, 
  Car, 
  ClipboardList, 
  CheckCircle,
  HelpCircle,
  Smartphone,
  Trash2,
  FileText,
  Clock3,
  Waves,
  Camera,
  Eye,
  Globe
} from 'lucide-react';

interface CarWashManagementProps {
  sessions: ParkingSession[];
  accessorySales: AccessorySale[];
  settings: TariffSettings;
  isCashOpen: boolean;
  onSellAccessory: (sale: Omit<AccessorySale, 'id' | 'timestamp'>) => void;
  onRegisterVehiclePlate?: (info: {
    plate: string;
    vehicleType?: VehicleType;
    clientName?: string;
    clientPhone?: string;
    notes?: string;
  }) => void;
}

const SEED_WASHES: WashSession[] = [];

export default function CarWashManagement({
  sessions,
  accessorySales,
  settings,
  isCashOpen,
  onSellAccessory,
  onRegisterVehiclePlate
}: CarWashManagementProps) {
  
  // Active washes list
  const [washSessions, setWashSessions] = useState<WashSession[]>([]);
  // Wash Packages
  const [washPackages, setWashPackages] = useState<WashPackage[]>(DEFAULT_WASH_PACKAGES);
  
  // UI views / tabs
  const [washTab, setWashTab] = useState<'board' | 'packages' | 'new_wash'>('board');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form states for new wash registration
  const [selectedParkingId, setSelectedParkingId] = useState<string>('manual');
  const [manualPlate, setManualPlate] = useState('');
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType>('auto');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState(DEFAULT_WASH_PACKAGES[0].id);
  const [customPrice, setCustomPrice] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [washerName, setWasherName] = useState('');
  const [entryPhoto, setEntryPhoto] = useState<string | undefined>(undefined);
  const [gatewayWash, setGatewayWash] = useState<WashSession | null>(null);
  
  // Config state for Package editing
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [editPrices, setEditPrices] = useState<Record<VehicleType, number>>({
    auto: 0, hatchback: 0, suv: 0, moto: 0, bicicleta: 0, camioneta: 0, furgon: 0, otro: 0
  });

  // Success message toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [historyPreview, setHistoryPreview] = useState<{ title: string, url: string } | null>(null);

  // 1. Initial Loading
  useEffect(() => {
    const storedWashes = localStorage.getItem('estacionamiento_washes');
    if (storedWashes) {
      try {
        setWashSessions(JSON.parse(storedWashes));
      } catch (e) {
        setWashSessions([]);
      }
    } else {
      setWashSessions([]);
      localStorage.setItem('estacionamiento_washes', JSON.stringify([]));
    }

    const storedPackages = localStorage.getItem('estacionamiento_wash_packages');
    if (storedPackages) {
      try {
        setWashPackages(JSON.parse(storedPackages));
      } catch (e) {
        setWashPackages(DEFAULT_WASH_PACKAGES);
      }
    }
  }, []);

  // Save washes helper
  const saveWashes = (updated: WashSession[]) => {
    setWashSessions(updated);
    localStorage.setItem('estacionamiento_washes', JSON.stringify(updated));

    // Sincronizar en Firestore para consultas desde QR móvil
    const user = authService.getCurrentUser();
    if (user && user.uid) {
      updated.forEach(ws => {
        dbService.saveDocument('washSessions', ws.id, ws, user.uid);
      });
    }
  };

  // Save packages helper
  const savePackages = (updated: WashPackage[]) => {
    setWashPackages(updated);
    localStorage.setItem('estacionamiento_wash_packages', JSON.stringify(updated));
  };

  // Trigger brief success toast
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Handle selected active parking dropdown change
  const handleParkingSelect = (parkingId: string) => {
    setSelectedParkingId(parkingId);
    if (parkingId === 'manual') {
      setManualPlate('');
      setClientName('');
      setClientPhone('');
      setSelectedVehicleType('auto');
    } else {
      const activeSession = sessions.find(s => s.id === parkingId);
      if (activeSession) {
        setManualPlate(activeSession.plate);
        setSelectedVehicleType(activeSession.vehicleType);
        setClientName(activeSession.clientName || '');
        setClientPhone(activeSession.clientPhone || '');
      }
    }
    setCustomPrice(null);
  };

  // Handle Package Selection inside Form
  const handlePackageSelect = (pkgId: string) => {
    setSelectedPackageId(pkgId);
    setCustomPrice(null);
  };

  // Get current price of selected package and vehicle type
  const getCurrentPrice = () => {
    if (customPrice !== null) return customPrice;
    const pkg = washPackages.find(p => p.id === selectedPackageId);
    if (!pkg) return 0;
    return pkg.priceByVehicleType[selectedVehicleType] || 0;
  };

  // Handle Recording / Queueing New Wash
  const handleQueueWashSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const finalPlate = manualPlate.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
    if (!finalPlate) {
      setFormError('Por favor ingrese una patente válida.');
      return;
    }

    // Check if plate already in queue (not delivered)
    const isAlreadyInQueue = washSessions.some(ws => ws.plate.replace(/[^A-Z0-9]/g, '') === finalPlate && ws.status !== 'entregado');
    if (isAlreadyInQueue) {
      setFormError('Este vehículo ya se encuentra registrado con un servicio de lavado activo.');
      return;
    }

    const pkg = washPackages.find(p => p.id === selectedPackageId);
    if (!pkg) return;

    const finalPrice = getCurrentPrice();

    const newSession: WashSession = {
      id: `wash-${Date.now()}`,
      plate: finalPlate,
      vehicleType: selectedVehicleType,
      clientName: clientName.trim() || undefined,
      clientPhone: clientPhone.trim() || undefined,
      packageId: selectedPackageId,
      packageName: pkg.name,
      price: finalPrice,
      status: 'espera',
      entryTime: new Date().toISOString(),
      notes: notes.trim() || undefined,
      washerName: washerName.trim() || undefined,
      entryPhoto: entryPhoto
    };

    const updated = [newSession, ...washSessions];
    saveWashes(updated);
    
    // Auto-registrar patente en la Base de Datos de Vehículos
    if (onRegisterVehiclePlate) {
      onRegisterVehiclePlate({
        plate: finalPlate,
        vehicleType: selectedVehicleType,
        clientName: clientName.trim() || undefined,
        clientPhone: clientPhone.trim() || undefined,
        notes: notes.trim() ? `Lavado (${pkg.name}): ${notes.trim()}` : `Servicio de Lavado (${pkg.name})`
      });
    }

    // Reset Form
    setManualPlate('');
    setClientName('');
    setClientPhone('');
    setNotes('');
    setWasherName('');
    setEntryPhoto(undefined);
    setSelectedParkingId('manual');
    setCustomPrice(null);
    setWashTab('board');
    triggerToast(`🚗 ¡Vehículo ${formatPlate(finalPlate)} agregado a la fila de lavado!`);
  };

  // Status transitions
  const handleTransition = (sessionId: string, nextStatus: WashStatus, paymentMethod?: PaymentMethod, gatewayDetails?: string) => {
    const session = washSessions.find(ws => ws.id === sessionId);
    if (!session) return;

    if (nextStatus === 'entregado' && paymentMethod === 'tarjeta_online' && !gatewayDetails) {
      setGatewayWash(session);
      return;
    }

    const updated = washSessions.map(ws => {
      if (ws.id === sessionId) {
        const partial: Partial<WashSession> = { status: nextStatus };
        if (nextStatus === 'lavando') {
          partial.startTime = new Date().toISOString();
        } else if (nextStatus === 'listo') {
          partial.readyTime = new Date().toISOString();
        } else if (nextStatus === 'entregado') {
          partial.endTime = new Date().toISOString();
          partial.paymentMethod = paymentMethod || 'efectivo';
          if (gatewayDetails) {
            partial.notes = `[${gatewayDetails}] ` + (ws.notes || '');
          }
        }
        return { ...ws, ...partial };
      }
      return ws;
    });

    saveWashes(updated);

    // If entregado, trigger callback to record sale inside accessorySales & Cash Register!
    if (nextStatus === 'entregado') {
      const updatedSession = updated.find(ws => ws.id === sessionId) || session;
      if (updatedSession) {
        if (!isCashOpen) {
          alert('¡Advertencia! El servicio se entregará, pero el cobro no se reflejará en el arqueo diario porque la caja registradora está cerrada. Abra un turno de caja para sincronizar los cobros.');
        }

        onSellAccessory({
          itemId: updatedSession.packageId,
          itemName: `${updatedSession.packageName} (${getVehicleTypeLabel(updatedSession.vehicleType)})`,
          quantity: 1,
          unitPrice: updatedSession.price,
          totalPrice: updatedSession.price,
          paymentMethod: paymentMethod || 'efectivo',
          buyerPlate: updatedSession.plate,
          notes: updatedSession.notes ? `Lavado entregado. Obs: ${updatedSession.notes}` : 'Servicio de Lavado de Vehículos',
          ivaRate: 19,
          netPrice: Math.round(updatedSession.price / 1.19),
          ivaAmount: updatedSession.price - Math.round(updatedSession.price / 1.19)
        });

        triggerToast(`✅ Lavado de ${formatPlate(updatedSession.plate)} entregado y cobrado por ${formatCurrency(updatedSession.price, settings.currency)}`);
      }
    } else {
      const label = nextStatus === 'lavando' ? 'En Lavado 🧼' : nextStatus === 'secando' ? 'En Secado 💨' : 'Listo para retiro ✨';
      triggerToast(`🚗 ${formatPlate(session.plate)} avanzado a: ${label}`);
    }
  };

  // Update photo for a session (entry or exit)
  const handleUpdateWashPhotos = (sessionId: string, entry?: string, exit?: string) => {
    const updated = washSessions.map(ws => {
      if (ws.id === sessionId) {
        const partial: Partial<WashSession> = {};
        if (entry !== undefined) partial.entryPhoto = entry || undefined;
        if (exit !== undefined) partial.exitPhoto = exit || undefined;
        return { ...ws, ...partial };
      }
      return ws;
    });
    saveWashes(updated);
    triggerToast('📸 Registro fotográfico actualizado con éxito.');
  };

  // Delete / cancel wash session
  const handleDeleteWash = (id: string) => {
    const session = washSessions.find(ws => ws.id === id);
    if (!session) return;
    if (confirm(`¿Está seguro de eliminar de la fila el lavado para la patente ${formatPlate(session.plate)}?`)) {
      const filtered = washSessions.filter(ws => ws.id !== id);
      saveWashes(filtered);
      triggerToast('🗑️ Registro de lavado eliminado.');
    }
  };

  // Edit wash package pricing
  const handleStartEditPackage = (pkg: WashPackage) => {
    setEditingPackageId(pkg.id);
    setEditPrices({ ...pkg.priceByVehicleType });
  };

  const handleSavePackagePrices = (pkgId: string) => {
    const updated = washPackages.map(pkg => {
      if (pkg.id === pkgId) {
        return { ...pkg, priceByVehicleType: editPrices };
      }
      return pkg;
    });
    savePackages(updated);
    setEditingPackageId(null);
    triggerToast('💰 Tarifas de lavado actualizadas con éxito.');
  };

  // Print wash ticket receipt
  const handlePrintWashTicket = (session: WashSession) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Comprobante de Lavado - ${session.plate}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; color: #000; padding: 15px; max-width: 280px; margin: 0 auto; font-size: 11px; line-height: 1.4; }
            .center { text-align: center; }
            .header { border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
            .plate { font-size: 18px; font-weight: bold; border: 1px solid #000; padding: 4px; display: inline-block; margin: 8px 0; letter-spacing: 1px; }
            .section { border-bottom: 1px dashed #000; padding: 6px 0; }
            .footer { border-top: 1px dashed #000; margin-top: 15px; padding-top: 8px; font-size: 9px; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 2px 0; }
            .price { font-size: 13px; font-weight: bold; text-align: right; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="center header">
            <h3 style="margin: 0; font-size: 14px;">🌟 PARK-FLOW WASH 🌟</h3>
            <p style="margin: 3px 0 0 0; font-size: 8px;">CONTROL DE FILA DE LAVADO</p>
            <div class="plate">${formatPlate(session.plate)}</div>
            <p style="margin: 4px 0;">Nº Ticket: #${session.id.split('-')[1] || '0001'}</p>
          </div>

          <div class="section">
            <table>
              <tr><td><strong>Fecha:</strong></td><td style="text-align:right;">${new Date(session.entryTime).toLocaleDateString('es-CL')}</td></tr>
              <tr><td><strong>Hora:</strong></td><td style="text-align:right;">${new Date(session.entryTime).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</td></tr>
              <tr><td><strong>Tipo:</strong></td><td style="text-align:right; text-transform:uppercase;">${getVehicleTypeLabel(session.vehicleType)}</td></tr>
              <tr><td><strong>Cliente:</strong></td><td style="text-align:right;">${session.clientName || 'Particular'}</td></tr>
              ${session.washerName ? `<tr><td><strong>Lavador:</strong></td><td style="text-align:right;">${session.washerName}</td></tr>` : ''}
            </table>
          </div>

          <div class="section">
            <p style="margin: 0 0 4px 0;"><strong>Servicio Contratado:</strong></p>
            <p style="margin: 0; font-size: 11px;">${session.packageName}</p>
            ${session.notes ? `<p style="margin: 4px 0 0 0; font-size: 9px; color:#555; italic;">Obs: ${session.notes}</p>` : ''}
          </div>

          <div class="section">
            <table>
              <tr>
                <td><strong>VALOR SERVICIO:</strong></td>
                <td class="price">${formatCurrency(session.price, settings.currency)}</td>
              </tr>
              <tr>
                <td><strong>Estado Fila:</strong></td>
                <td style="text-align:right; font-weight:bold; text-transform:uppercase;">${session.status}</td>
              </tr>
            </table>
          </div>

          <div class="center" style="margin-top: 12px; margin-bottom: 12px; border-bottom: 1px dashed #000; padding-bottom: 12px;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(window.location.origin + window.location.pathname + '?plate=' + session.plate)}" style="width: 110px; height: 110px;" />
            <p style="font-size: 8px; margin: 4px 0 0 0; font-family: monospace; font-weight: bold; text-transform: uppercase;">Siga su lavado en vivo</p>
            <p style="font-size: 7px; margin: 1px 0 0 0; font-family: monospace; color: #444;">Escanee con su cámara celular</p>
          </div>

          <div class="center footer">
            <p style="margin: 0;">¡Muchas gracias por su preferencia!</p>
            <p style="margin: 4px 0 0 0;">Por favor presente este ticket para retirar su vehículo una vez que el estado cambie a "LISTO".</p>
            <p style="margin: 10px 0 0 0; font-size: 7px;">${new Date().toLocaleString('es-CL')}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Filter active vs historical washes
  const activeWashes = washSessions.filter(ws => ws.status !== 'entregado');
  const finishedWashes = washSessions.filter(ws => ws.status === 'entregado');

  // Search filter
  const filteredActiveWashes = activeWashes.filter(ws => {
    const query = searchQuery.toLowerCase().trim();
    return ws.plate.toLowerCase().includes(query) || 
           (ws.clientName || '').toLowerCase().includes(query) ||
           ws.packageName.toLowerCase().includes(query);
  });

  const filteredFinishedWashes = finishedWashes.filter(ws => {
    const query = searchQuery.toLowerCase().trim();
    return ws.plate.toLowerCase().includes(query) || 
           (ws.clientName || '').toLowerCase().includes(query);
  });

  // Calculate stats for today
  const todayStr = new Date().toDateString();
  const washesDeliveredToday = finishedWashes.filter(ws => {
    if (!ws.endTime) return false;
    return new Date(ws.endTime).toDateString() === todayStr;
  });

  const totalEarningsToday = washesDeliveredToday.reduce((sum, ws) => sum + ws.price, 0);
  const averageWashTimeMinutes = (() => {
    const timedWashes = finishedWashes.filter(ws => ws.startTime && ws.readyTime);
    if (timedWashes.length === 0) return 35; // Default average
    const totalMins = timedWashes.reduce((sum, ws) => {
      const start = new Date(ws.startTime!).getTime();
      const ready = new Date(ws.readyTime!).getTime();
      return sum + (ready - start) / (1000 * 60);
    }, 0);
    return Math.round(totalMins / timedWashes.length);
  })();

  // Icons Helper
  const getPackageIcon = (iconName: string) => {
    switch (iconName) {
      case 'Droplet': return <Droplet className="w-5 h-5 text-blue-400" />;
      case 'Sparkles': return <Sparkles className="w-5 h-5 text-indigo-400" />;
      case 'Wind': return <Wind className="w-5 h-5 text-cyan-400" />;
      case 'Wrench': return <Wrench className="w-5 h-5 text-amber-400" />;
      default: return <Droplet className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 border-2 border-blue-500 text-slate-100 px-6 py-4 rounded-2xl shadow-2xl z-50 animate-slide-left flex items-start gap-3 max-w-sm">
          <Waves className="w-6 h-6 text-blue-400 shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-0.5">
            <h4 className="font-bold text-xs uppercase tracking-wider text-blue-400">Lavado de Vehículos</h4>
            <p className="text-xs text-slate-300">{toastMessage}</p>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-200 ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* PANEL SUPERIOR DE BIENVENIDA Y ACCIONES */}
      <div className="bg-slate-950/40 p-6 rounded-2xl border border-slate-800/80 shadow-2xl space-y-4 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
              <h2 className="text-xl font-black text-white flex items-center gap-2 uppercase tracking-wide">
                <Waves className="w-6 h-6 text-blue-400 shrink-0" />
                Módulo de Lavado y Estética Automotriz
              </h2>
            </div>
            <p className="text-slate-400 text-xs">
              Monitoree el avance en tiempo real (Espera ➔ Lavando ➔ Secando ➔ Listo para entrega). Coordine cobros y gestione tarifas fácilmente.
            </p>
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setWashTab('board')}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                washTab === 'board'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Fila de Lavado ({activeWashes.length})
            </button>
            <button
              onClick={() => setWashTab('packages')}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                washTab === 'packages'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              Servicios y Tarifas
            </button>
            <button
              onClick={() => {
                setWashTab('new_wash');
                handleParkingSelect('manual');
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Ingresar Vehículo
            </button>
          </div>
        </div>
      </div>

      {/* METRICAS DE RENDIMIENTO */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-950/40 p-4.5 rounded-2xl border border-slate-800/80 shadow-md backdrop-blur-md space-y-2">
          <div className="w-8 h-8 rounded-lg bg-blue-950 text-blue-400 border border-blue-900/40 flex items-center justify-center">
            <Clock3 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">En Preparación</span>
            <span className="text-xl font-mono font-black text-white">
              {washSessions.filter(ws => ws.status === 'espera').length}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Vehículos en cola</span>
          </div>
        </div>

        <div className="bg-slate-950/40 p-4.5 rounded-2xl border border-slate-800/80 shadow-md backdrop-blur-md space-y-2">
          <div className="w-8 h-8 rounded-lg bg-yellow-950 text-yellow-400 border border-yellow-900/40 flex items-center justify-center">
            <Droplet className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Lavando / Secando</span>
            <span className="text-xl font-mono font-black text-white">
              {washSessions.filter(ws => ws.status === 'lavando' || ws.status === 'secando').length}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Operadores activos</span>
          </div>
        </div>

        <div className="bg-slate-950/40 p-4.5 rounded-2xl border border-slate-800/80 shadow-md backdrop-blur-md space-y-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-900/40 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Listos para Entrega</span>
            <span className="text-xl font-mono font-black text-emerald-400">
              {washSessions.filter(ws => ws.status === 'listo').length}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Esperando clientes</span>
          </div>
        </div>

        <div className="bg-slate-950/40 p-4.5 rounded-2xl border border-slate-800/80 shadow-md backdrop-blur-md space-y-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-900/40 flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Caja Lavado Hoy</span>
            <span className="text-xl font-mono font-black text-white">
              {formatCurrency(totalEarningsToday, settings.currency)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{washesDeliveredToday.length} entregas completadas</span>
          </div>
        </div>
      </div>

      {/* VISTA 1: FILA DE LAVADO (WORKFLOW BOARD) */}
      {washTab === 'board' && (
        <div className="space-y-6">
          
          {/* BARRA DE BÚSQUEDA */}
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

            <div className="text-xs text-slate-500 font-mono">
              [ {filteredActiveWashes.length} servicios activos en fila ]
            </div>
          </div>

          {/* TABLERO KANBAN DE PROGRESO DE LAVADO */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* COLUMNA 1: EN ESPERA */}
            <div className="bg-slate-950/30 p-4 rounded-2xl border border-slate-800/60 space-y-3 min-h-[400px]">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  En Espera ({filteredActiveWashes.filter(w => w.status === 'espera').length})
                </h3>
              </div>
              
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {filteredActiveWashes.filter(w => w.status === 'espera').length === 0 ? (
                  <p className="text-slate-600 text-center py-10 italic text-[11px]">[ Cola vacía ]</p>
                ) : (
                  filteredActiveWashes.filter(w => w.status === 'espera').map(w => (
                    <WashCard key={w.id} wash={w} onTransition={handleTransition} onDelete={handleDeleteWash} onPrint={handlePrintWashTicket} onUpdatePhotos={handleUpdateWashPhotos} settings={settings} />
                  ))
                )}
              </div>
            </div>

            {/* COLUMNA 2: LAVANDO */}
            <div className="bg-slate-950/30 p-4 rounded-2xl border border-slate-800/60 space-y-3 min-h-[400px]">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h3 className="text-xs font-black text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Droplet className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                  Lavando ({filteredActiveWashes.filter(w => w.status === 'lavando').length})
                </h3>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {filteredActiveWashes.filter(w => w.status === 'lavando').length === 0 ? (
                  <p className="text-slate-600 text-center py-10 italic text-[11px]">[ Ninguno en lavado ]</p>
                ) : (
                  filteredActiveWashes.filter(w => w.status === 'lavando').map(w => (
                    <WashCard key={w.id} wash={w} onTransition={handleTransition} onDelete={handleDeleteWash} onPrint={handlePrintWashTicket} onUpdatePhotos={handleUpdateWashPhotos} settings={settings} />
                  ))
                )}
              </div>
            </div>

            {/* COLUMNA 3: SECANDO */}
            <div className="bg-slate-950/30 p-4 rounded-2xl border border-slate-800/60 space-y-3 min-h-[400px]">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h3 className="text-xs font-black text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-cyan-500" />
                  Secando ({filteredActiveWashes.filter(w => w.status === 'secando').length})
                </h3>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {filteredActiveWashes.filter(w => w.status === 'secando').length === 0 ? (
                  <p className="text-slate-600 text-center py-10 italic text-[11px]">[ Ninguno en secado ]</p>
                ) : (
                  filteredActiveWashes.filter(w => w.status === 'secando').map(w => (
                    <WashCard key={w.id} wash={w} onTransition={handleTransition} onDelete={handleDeleteWash} onPrint={handlePrintWashTicket} onUpdatePhotos={handleUpdateWashPhotos} settings={settings} />
                  ))
                )}
              </div>
            </div>

            {/* COLUMNA 4: LISTO */}
            <div className="bg-slate-950/30 p-4 rounded-2xl border border-slate-800/60 space-y-3 min-h-[400px]">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h3 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-bounce" />
                  Listo para Entrega ({filteredActiveWashes.filter(w => w.status === 'listo').length})
                </h3>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {filteredActiveWashes.filter(w => w.status === 'listo').length === 0 ? (
                  <p className="text-slate-600 text-center py-10 italic text-[11px]">[ Ninguno listo ]</p>
                ) : (
                  filteredActiveWashes.filter(w => w.status === 'listo').map(w => (
                    <WashCard key={w.id} wash={w} onTransition={handleTransition} onDelete={handleDeleteWash} onPrint={handlePrintWashTicket} onUpdatePhotos={handleUpdateWashPhotos} settings={settings} />
                  ))
                )}
              </div>
            </div>

          </div>

          {/* HISTORIAL RECIENTE / ENTREGADOS */}
          <div className="bg-slate-950/40 rounded-2xl border border-slate-800/80 shadow-xl overflow-hidden backdrop-blur-md space-y-3 p-6">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <CheckCircle className="w-4.5 h-4.5 text-emerald-500" />
                Historial de Entregados y Cobrados ({filteredFinishedWashes.length})
              </h3>
              <p className="text-slate-400 text-[11px] mt-0.5">Automóviles que ya completaron su lavado, retiraron y registraron cobro.</p>
            </div>

            <div className="overflow-x-auto">
              {filteredFinishedWashes.length === 0 ? (
                <p className="text-slate-600 font-mono text-[11px] text-center py-10">[ Sin entregas en el registro ]</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                      <th className="py-2.5 px-4">Patente</th>
                      <th className="py-2.5 px-4">Cliente</th>
                      <th className="py-2.5 px-4">Servicio Lavado</th>
                      <th className="py-2.5 px-4">Monto Pagado</th>
                      <th className="py-2.5 px-4">Medio Pago</th>
                      <th className="py-2.5 px-4">Atendido Por</th>
                      <th className="py-2.5 px-4 text-center">Evidencia</th>
                      <th className="py-2.5 px-4 text-center">Horarios</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-xs text-slate-300">
                    {filteredFinishedWashes.map(w => (
                      <tr key={w.id} className="hover:bg-slate-900/30">
                        <td className="py-3 px-4 font-mono font-bold text-blue-400">{formatPlate(w.plate)}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold">{w.clientName || 'Cliente Particular'}</span>
                          {w.clientPhone && <span className="block text-[10px] text-slate-500">{w.clientPhone}</span>}
                        </td>
                        <td className="py-3 px-4 font-semibold">{w.packageName}</td>
                        <td className="py-3 px-4 font-mono font-black text-emerald-400">{formatCurrency(w.price, settings.currency)}</td>
                        <td className="py-3 px-4 uppercase text-[10px] font-bold text-slate-400">{w.paymentMethod}</td>
                        <td className="py-3 px-4 text-slate-400">{w.washerName || 'Sin asignar'}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {w.entryPhoto ? (
                              <button
                                onClick={() => setHistoryPreview({ title: `Foto de Ingreso - ${formatPlate(w.plate)}`, url: w.entryPhoto! })}
                                className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-blue-400 hover:text-blue-300 hover:border-slate-700 font-bold text-[9px] flex items-center gap-1 cursor-pointer"
                                title="Ver foto de ingreso"
                              >
                                <Camera className="w-3 h-3" />
                                <span>Ingreso</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-600 italic">Sin foto</span>
                            )}
                            {w.exitPhoto ? (
                              <button
                                onClick={() => setHistoryPreview({ title: `Foto de Salida - ${formatPlate(w.plate)}`, url: w.exitPhoto! })}
                                className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-emerald-400 hover:text-emerald-300 hover:border-slate-700 font-bold text-[9px] flex items-center gap-1 cursor-pointer"
                                title="Ver foto de salida"
                              >
                                <Camera className="w-3 h-3" />
                                <span>Salida</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-600 italic">Sin foto</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center text-[10px] text-slate-500 font-mono space-y-0.5">
                          <p>Ingreso: {new Date(w.entryTime).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</p>
                          {w.endTime && <p>Entrega: {new Date(w.endTime).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</p>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      )}

      {/* VISTA 2: PAQUETES DE LAVADO Y TARIFAS */}
      {washTab === 'packages' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LISTADO DE TARIFAS VIGENTES */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ClipboardList className="w-4.5 h-4.5 text-blue-500" />
              Estructura de Tarifas de Estética Automotriz
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {washPackages.map(pkg => {
                const isEditing = editingPackageId === pkg.id;

                return (
                  <div key={pkg.id} className="bg-slate-950/40 rounded-2xl border border-slate-800 p-5 space-y-4 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2.5">
                          {getPackageIcon(pkg.icon)}
                          <h4 className="font-bold text-slate-100">{pkg.name}</h4>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3 text-blue-400" />
                          ~{pkg.estimatedMinutes} min
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">{pkg.description}</p>
                    </div>

                    <div className="border-t border-slate-900 pt-3 space-y-2.5">
                      <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block">TARIFARIO SEGÚN VEHÍCULO</span>
                      
                      {isEditing ? (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {(['auto', 'hatchback', 'suv', 'moto', 'bicicleta', 'camioneta', 'furgon', 'otro'] as VehicleType[]).map(vt => (
                            <div key={vt} className="space-y-1">
                              <label className="text-[9px] text-slate-400 uppercase font-bold block">{getVehicleTypeLabel(vt)}</label>
                              <input
                                type="number"
                                value={editPrices[vt] || 0}
                                onChange={(e) => setEditPrices({ ...editPrices, [vt]: Number(e.target.value) })}
                                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white font-mono font-bold"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
                          {(['auto', 'hatchback', 'suv', 'moto', 'bicicleta', 'camioneta', 'furgon', 'otro'] as VehicleType[]).map(vt => (
                            <div key={vt} className="bg-slate-900/60 p-2 rounded border border-slate-850 text-center">
                              <span className="text-slate-500 font-bold uppercase tracking-wider block text-[8px]">{getVehicleTypeLabel(vt)}</span>
                              <span className="text-emerald-400 font-black mt-0.5 block">
                                {formatCurrency(pkg.priceByVehicleType[vt] || 0, settings.currency)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-900">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSavePackagePrices(pkg.id)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 rounded-lg text-[10px] uppercase tracking-wider transition-all"
                          >
                            Guardar Cambios
                          </button>
                          <button
                            onClick={() => setEditingPackageId(null)}
                            className="bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800 px-2.5 py-1.5 rounded-lg text-[10px]"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEditPackage(pkg)}
                          className="w-full bg-slate-900 hover:bg-slate-850 text-blue-400 border border-slate-800 font-bold py-1.5 rounded-lg text-[10px] uppercase tracking-wider transition-all"
                        >
                          Modificar Precios
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PANEL DE INFORMACION COMERCIAL */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Ayuda Comercial</h3>
            <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 shadow-md backdrop-blur-md space-y-4">
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">Política de Recargo por Tamaño</h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Es estándar en lavados cobrar tarifas proporcionales al volumen del vehículo. Esto compensa el mayor tiempo invertido y el consumo incrementado de insumos químicos (shampoo, abrillantador de plásticos y siliconas).
                </p>
              </div>

              <div className="p-3 bg-blue-950/20 border border-blue-900/40 rounded-xl space-y-1.5 text-xs">
                <span className="font-bold text-blue-400 flex items-center gap-1.5 uppercase text-[10px]">
                  <HelpCircle className="w-3.5 h-3.5" />
                  ¿Cómo cobrar un lavado?
                </span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Cuando ingresa un vehículo, asócielo con su patente en fila de espera. Durante la entrega al cliente final, haga clic en <strong>"Entregar y Cobrar"</strong>. Esto emitirá un cargo de venta que cargará la caja registradora de forma inmediata.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* VISTA 3: REGISTRO DE NUEVO VEHICULO EN COLA */}
      {washTab === 'new_wash' && (
        <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex justify-between items-start border-b border-slate-850 pb-4">
            <div>
              <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block mb-0.5">REGISTRO DE FILA</span>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Car className="w-5 h-5 text-blue-500" />
                Ingresar Vehículo a Fila de Lavado
              </h3>
            </div>
            <button
              onClick={() => setWashTab('board')}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {formError && (
            <div className="bg-rose-950/40 border border-rose-900/60 text-rose-300 p-3 rounded-xl text-xs flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleQueueWashSubmit} className="space-y-4 text-xs text-slate-300">
            
            {/* 1. SELECCIONAR ORIGEN (Vehículo en Parking vs Manual) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Asociar con Estacionado en Parking</label>
                <select
                  value={selectedParkingId}
                  onChange={(e) => handleParkingSelect(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-900/40 focus:outline-hidden"
                >
                  <option value="manual">[ Carga Manual / No Estacionado ]</option>
                  {sessions.filter(s => s.status === 'active').map(s => (
                    <option key={s.id} value={s.id}>
                      🚗 {formatPlate(s.plate)} - {s.clientName || 'Particular'} ({getVehicleTypeLabel(s.vehicleType)})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 block">Sincroniza datos del ticket de parking automáticamente si existe.</span>
              </div>

              {/* Placa Patente */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Placa Patente (Chile)</label>
                <input
                  type="text"
                  required
                  placeholder="ABCD12 o AB1234"
                  disabled={selectedParkingId !== 'manual'}
                  value={manualPlate}
                  onChange={(e) => setManualPlate(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white uppercase tracking-widest placeholder:text-slate-600 disabled:opacity-50"
                />
              </div>
            </div>

            {/* 2. DATOS DEL CLIENTE Y VEHICULO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo de Vehículo</label>
                <select
                  disabled={selectedParkingId !== 'manual'}
                  value={selectedVehicleType}
                  onChange={(e) => {
                    setSelectedVehicleType(e.target.value as VehicleType);
                    setCustomPrice(null);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl px-3 py-2 disabled:opacity-50"
                >
                  <option value="auto">Automóvil / Sedan</option>
                  <option value="hatchback">Hatchback / Compacto</option>
                  <option value="suv">SUV</option>
                  <option value="moto">Motocicleta</option>
                  <option value="bicicleta">Bicicleta</option>
                  <option value="camioneta">Camioneta</option>
                  <option value="furgon">Furgón / Van</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nombre del Cliente (Opcional)</label>
                <input
                  type="text"
                  placeholder="e.g. Juan Pérez"
                  disabled={selectedParkingId !== 'manual'}
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Teléfono Cliente (Opcional)</label>
                <input
                  type="text"
                  placeholder="+569 1234 5678"
                  disabled={selectedParkingId !== 'manual'}
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 disabled:opacity-50"
                />
              </div>
            </div>

            {/* 3. SELECCIÓN DE PAQUETE DE LAVADO */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Seleccione el Paquete de Estética</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {washPackages.map(pkg => {
                  const isSelected = selectedPackageId === pkg.id;
                  const price = pkg.priceByVehicleType[selectedVehicleType] || 0;

                  return (
                    <div
                      key={pkg.id}
                      onClick={() => handlePackageSelect(pkg.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected 
                          ? 'bg-blue-950/40 border-blue-500 text-blue-200 shadow-md shadow-blue-900/10'
                          : 'bg-slate-950/60 border-slate-850 hover:border-slate-800 text-slate-400'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <span className="font-bold text-slate-200 text-xs uppercase flex items-center gap-1.5">
                            {getPackageIcon(pkg.icon)}
                            {pkg.name}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">~{pkg.estimatedMinutes}m</span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">{pkg.description}</p>
                      </div>

                      <div className="border-t border-slate-900 mt-2.5 pt-2 flex justify-between items-center">
                        <span className="text-[9px] uppercase font-bold text-slate-500">PRECIO ({getVehicleTypeLabel(selectedVehicleType)}):</span>
                        <span className="font-mono text-xs font-black text-emerald-400">
                          {formatCurrency(price, settings.currency)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ajuste Manual de Precio */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Precio Personalizado / Convenio (Opcional)</label>
                <input
                  type="number"
                  placeholder="e.g. Aplicar descuento"
                  value={customPrice === null ? '' : customPrice}
                  onChange={(e) => setCustomPrice(e.target.value === '' ? null : Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-400 placeholder:text-slate-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lavador / Operador Asignado (Opcional)</label>
                <input
                  type="text"
                  placeholder="e.g. Juan Carlos"
                  value={washerName}
                  onChange={(e) => setWasherName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Importe Final Calculado</label>
                <div className="w-full bg-slate-950 border border-blue-900/30 rounded-xl px-3 py-2 font-mono font-black text-emerald-400 text-sm flex items-center justify-between">
                  <span>CLP:</span>
                  <span>{formatCurrency(getCurrentPrice(), settings.currency)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Instrucciones o Detalles Especiales</label>
              <textarea
                placeholder="e.g. Lavado cuidadoso de llantas, no mojar componentes de admisión, etc."
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 resize-none placeholder:text-slate-600 focus:outline-hidden focus:ring-1 focus:ring-blue-900"
              />
            </div>

            {/* FOTO DE EVIDENCIA DE INGRESO */}
            <div className="bg-slate-950/30 p-4 rounded-xl border border-slate-800/60 space-y-2">
              <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block">Inspección de Entrada</span>
              <VehiclePhotoCapture
                photo={entryPhoto}
                label="Foto de Evidencia (Ingreso)"
                onPhotoCaptured={(base64) => setEntryPhoto(base64)}
                onPhotoRemoved={() => setEntryPhoto(undefined)}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-blue-950/20 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Registrar e Ingresar a Fila de Espera
              </button>
              <button
                type="button"
                onClick={() => setWashTab('board')}
                className="bg-slate-950 hover:bg-slate-900 text-slate-400 border border-slate-850 px-5 py-3 rounded-xl text-xs uppercase font-bold tracking-wider"
              >
                Cancelar
              </button>
            </div>

          </form>
        </div>
      )}

      {/* MODAL DE VISUALIZACIÓN DE FOTO DEL HISTORIAL */}
      {historyPreview && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col justify-between p-6 animate-fade-in backdrop-blur-md">
          <div className="flex justify-between items-center border-b border-slate-900 pb-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
              <Camera className="w-4 h-4 text-blue-400" />
              {historyPreview.title}
            </h4>
            <button
              onClick={() => setHistoryPreview(null)}
              className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center max-h-[75vh] overflow-hidden my-4">
            <img
              src={historyPreview.url}
              alt="Evidencia Historial"
              className="max-w-full max-h-full object-contain rounded-xl border border-slate-800 shadow-2xl"
            />
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => setHistoryPreview(null)}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer"
            >
              Cerrar Vista
            </button>
          </div>
        </div>
      )}

      {/* ELECTRONIC PAYMENT GATEWAY MODAL */}
      {gatewayWash && (
        <PaymentGatewayModal
          amount={gatewayWash.price}
          description={`Servicio Lavado: ${gatewayWash.packageName}`}
          plate={gatewayWash.plate}
          currency={settings.currency}
          onSuccess={(data) => {
            const details = `Pasarela: ${data.provider.toUpperCase()} | Transacción: ${data.transactionId} | Aut: ${data.authCode}`;
            handleTransition(gatewayWash.id, 'entregado', 'tarjeta_online', details);
            setGatewayWash(null);
          }}
          onClose={() => {
            setGatewayWash(null);
          }}
        />
      )}

    </div>
  );
}

// WASH CARD SUB-COMPONENT FOR WORKFLOW BOARD
interface WashCardProps {
  key?: string;
  wash: WashSession;
  onTransition: (id: string, next: WashStatus, payment?: PaymentMethod) => void;
  onDelete: (id: string) => void;
  onPrint: (wash: WashSession) => void;
  onUpdatePhotos: (id: string, entry?: string, exit?: string) => void;
  settings: TariffSettings;
}

function WashCard({ wash, onTransition, onDelete, onPrint, onUpdatePhotos, settings }: WashCardProps) {
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<{ title: string, url: string } | null>(null);
  const [capturingPhotoType, setCapturingPhotoType] = useState<{ type: 'entry' | 'exit', label: string } | null>(null);

  // Status badging helpers
  const getStatusBadge = () => {
    switch (wash.status) {
      case 'espera': return <span className="text-[8px] font-black uppercase bg-slate-900 text-slate-400 border border-slate-800 px-1.5 py-0.5 rounded-md">En Espera</span>;
      case 'lavando': return <span className="text-[8px] font-black uppercase bg-blue-950 text-blue-400 border border-blue-900/40 px-1.5 py-0.5 rounded-md animate-pulse">Lavando</span>;
      case 'secando': return <span className="text-[8px] font-black uppercase bg-cyan-950 text-cyan-400 border border-cyan-900/40 px-1.5 py-0.5 rounded-md">Secado</span>;
      case 'listo': return <span className="text-[8px] font-black uppercase bg-emerald-950 text-emerald-400 border border-emerald-900/40 px-1.5 py-0.5 rounded-md">Listo</span>;
      default: return null;
    }
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-3.5 space-y-3 relative group hover:border-slate-700/60 transition-all shadow-md">
      
      {/* CARD TOP INFO */}
      <div className="flex justify-between items-start gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-black tracking-widest text-white uppercase bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-md">
              {formatPlate(wash.plate)}
            </span>
            {getStatusBadge()}
          </div>
          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block pt-0.5">
            {getVehicleTypeLabel(wash.vehicleType)} - {wash.clientName || 'Particular'}
          </span>
        </div>

        {/* Delete button (only if not delivering) */}
        {!showPaymentSelector && (
          <button
            onClick={() => onDelete(wash.id)}
            className="p-1 rounded text-slate-600 hover:text-rose-400 hover:bg-slate-950 transition-colors"
            title="Cancelar servicio"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* SERVICE PACKAGE INFO */}
      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 space-y-1">
        <p className="font-semibold text-slate-200 text-[11px] leading-tight">{wash.packageName}</p>
        
        {wash.notes && (
          <p className="text-[9px] text-slate-400 italic line-clamp-1 leading-snug">Obs: {wash.notes}</p>
        )}

        <div className="flex justify-between items-center pt-1 text-[10px] font-mono">
          <span className="text-slate-500 uppercase text-[8px]">Monto Cobro</span>
          <span className="font-black text-emerald-400">
            {formatCurrency(wash.price, settings.currency)}
          </span>
        </div>
      </div>

      {/* SECCIÓN DE FOTOS / EVIDENCIA */}
      <div className="border-t border-slate-950 pt-2.5 space-y-2">
        <div className="flex justify-between items-center text-[9px] uppercase font-black text-slate-500 tracking-wider">
          <span>Evidencia de Inspección</span>
          <span className="font-mono text-slate-600">[Fotos]</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {/* Foto de Entrada */}
          <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-850 flex flex-col justify-between min-h-[64px]">
            <span className="text-[8px] text-slate-400 block font-bold text-center uppercase">Ingreso</span>
            {wash.entryPhoto ? (
              <div className="relative group/img aspect-video rounded-md overflow-hidden mt-1 bg-black">
                <img src={wash.entryPhoto} alt="Ingreso" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={() => setViewingPhoto({ title: "Evidencia de Ingreso", url: wash.entryPhoto! })}
                    className="p-1 bg-blue-600 hover:bg-blue-500 rounded text-white cursor-pointer"
                    title="Ver foto de ingreso"
                  >
                    <Eye className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("¿Seguro que desea eliminar la foto de ingreso?")) {
                        onUpdatePhotos(wash.id, "", undefined);
                      }
                    }}
                    className="p-1 bg-rose-600 hover:bg-rose-500 rounded text-white cursor-pointer"
                    title="Eliminar foto de ingreso"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-1">
                <button
                  type="button"
                  onClick={() => setCapturingPhotoType({ type: 'entry', label: 'Foto de Ingreso' })}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-850 hover:text-white text-slate-500 border border-dashed border-slate-800 hover:border-slate-700 rounded-md text-[9px] font-bold flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                >
                  <Camera className="w-3 h-3" />
                  <span>Tomar</span>
                </button>
              </div>
            )}
          </div>

          {/* Foto de Salida */}
          <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-850 flex flex-col justify-between min-h-[64px]">
            <span className="text-[8px] text-slate-400 block font-bold text-center uppercase">Salida</span>
            {wash.exitPhoto ? (
              <div className="relative group/img aspect-video rounded-md overflow-hidden mt-1 bg-black">
                <img src={wash.exitPhoto} alt="Salida" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={() => setViewingPhoto({ title: "Evidencia de Salida", url: wash.exitPhoto! })}
                    className="p-1 bg-blue-600 hover:bg-blue-500 rounded text-white cursor-pointer"
                    title="Ver foto de salida"
                  >
                    <Eye className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("¿Seguro que desea eliminar la foto de salida?")) {
                        onUpdatePhotos(wash.id, undefined, "");
                      }
                    }}
                    className="p-1 bg-rose-600 hover:bg-rose-500 rounded text-white cursor-pointer"
                    title="Eliminar foto de salida"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-1">
                <button
                  type="button"
                  onClick={() => setCapturingPhotoType({ type: 'exit', label: 'Foto de Salida' })}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-850 hover:text-white text-slate-500 border border-dashed border-slate-800 hover:border-slate-700 rounded-md text-[9px] font-bold flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                >
                  <Camera className="w-3 h-3" />
                  <span>Tomar</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* WORKFLOW CONTROLS */}
      {!showPaymentSelector ? (
        <div className="flex items-center justify-between border-t border-slate-950 pt-2.5 gap-2">
          
          {/* Quick Print */}
          <button
            onClick={() => onPrint(wash)}
            className="p-1.5 bg-slate-950 hover:bg-slate-850 text-slate-400 border border-slate-850 hover:border-slate-800 rounded-lg text-[10px] flex items-center justify-center cursor-pointer transition-all"
            title="Imprimir Ticket de Lavado"
          >
            <Printer className="w-3.5 h-3.5 text-blue-500" />
          </button>

          {/* Workflow Action Transitions */}
          {wash.status === 'espera' && (
            <button
              onClick={() => onTransition(wash.id, 'lavando')}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] uppercase tracking-wider py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current" />
              Comenzar
            </button>
          )}

          {wash.status === 'lavando' && (
            <button
              onClick={() => onTransition(wash.id, 'secando')}
              className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] uppercase tracking-wider py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
            >
              <Wind className="w-3 h-3" />
              Secar
            </button>
          )}

          {wash.status === 'secando' && (
            <button
              onClick={() => onTransition(wash.id, 'listo')}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase tracking-wider py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Terminar
            </button>
          )}

          {wash.status === 'listo' && (
            <button
              onClick={() => setShowPaymentSelector(true)}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] uppercase tracking-wider py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-white shrink-0 animate-pulse" />
              Entregar
            </button>
          )}

        </div>
      ) : (
        <div className="bg-slate-950 p-2 rounded-lg border border-indigo-900/30 text-center space-y-2 animate-fade-in text-[10px]">
          <span className="font-bold text-slate-300 block uppercase tracking-wider">Seleccione Medio de Pago:</span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => {
                onTransition(wash.id, 'entregado', 'efectivo');
                setShowPaymentSelector(false);
              }}
              className="bg-emerald-950 hover:bg-emerald-900 border border-emerald-900/60 text-emerald-300 py-1.5 rounded font-bold uppercase cursor-pointer text-[9px]"
            >
              💵 Efectivo
            </button>
            <button
              onClick={() => {
                onTransition(wash.id, 'entregado', 'debito');
                setShowPaymentSelector(false);
              }}
              className="bg-blue-950 hover:bg-blue-900 border border-blue-900/60 text-blue-300 py-1.5 rounded font-bold uppercase cursor-pointer text-[9px]"
            >
              💳 Débito
            </button>
            <button
              onClick={() => {
                onTransition(wash.id, 'entregado', 'transferencia');
                setShowPaymentSelector(false);
              }}
              className="bg-purple-950 hover:bg-purple-900 border border-purple-900/60 text-purple-300 py-1.5 rounded font-bold uppercase cursor-pointer text-[9px]"
            >
              📲 Transf.
            </button>
            <button
              onClick={() => {
                onTransition(wash.id, 'entregado', 'tarjeta_online');
                setShowPaymentSelector(false);
              }}
              className="bg-indigo-950 hover:bg-indigo-900 border border-indigo-900/60 text-indigo-200 py-1.5 rounded font-bold uppercase cursor-pointer text-[9px] flex items-center justify-center gap-0.5"
            >
              🌐 Pasarela
            </button>
          </div>
          <button
            onClick={() => setShowPaymentSelector(false)}
            className="text-slate-500 hover:text-slate-300 block text-[9px] mx-auto mt-1 hover:underline animate-pulse"
          >
            Atrás / Cancelar
          </button>
        </div>
      )}

      {/* FOOTER INFO: WASHER */}
      <div className="text-[9px] text-slate-500 flex justify-between items-center border-t border-slate-950 pt-2 font-mono">
        <span>Atiende: {wash.washerName || 'Sin asignar'}</span>
        <span>Ingreso: {new Date(wash.entryTime).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>

      {/* MODAL PARA TOMAR FOTO INDIVIDUAL EN TARJETA */}
      {capturingPhotoType && (
        <div className="fixed inset-0 bg-slate-950/95 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-850 pb-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-blue-400" />
                Capturar {capturingPhotoType.label}
              </h4>
              <button onClick={() => setCapturingPhotoType(null)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <VehiclePhotoCapture
              photo={capturingPhotoType.type === 'entry' ? wash.entryPhoto : wash.exitPhoto}
              label={capturingPhotoType.label}
              onPhotoCaptured={(base64) => {
                if (capturingPhotoType.type === 'entry') {
                  onUpdatePhotos(wash.id, base64, undefined);
                } else {
                  onUpdatePhotos(wash.id, undefined, base64);
                }
                setCapturingPhotoType(null);
              }}
              onPhotoRemoved={() => {
                if (capturingPhotoType.type === 'entry') {
                  onUpdatePhotos(wash.id, "", undefined);
                } else {
                  onUpdatePhotos(wash.id, undefined, "");
                }
              }}
            />

            <button
              onClick={() => setCapturingPhotoType(null)}
              className="w-full bg-slate-950 hover:bg-slate-850 text-slate-400 py-2 border border-slate-800 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Cerrar Cámara
            </button>
          </div>
        </div>
      )}

      {/* MODAL PARA VER FOTO INDIVIDUAL AMPLIADA EN TARJETA */}
      {viewingPhoto && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col justify-between p-6 animate-fade-in backdrop-blur-md">
          <div className="flex justify-between items-center border-b border-slate-900 pb-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-400" />
              {viewingPhoto.title} - Patente: {formatPlate(wash.plate)}
            </h4>
            <button
              onClick={() => setViewingPhoto(null)}
              className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center max-h-[75vh] overflow-hidden my-4">
            <img
              src={viewingPhoto.url}
              alt="Evidencia"
              className="max-w-full max-h-full object-contain rounded-xl border border-slate-800 shadow-2xl"
            />
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => setViewingPhoto(null)}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer"
            >
              Cerrar Vista
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
