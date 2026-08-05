/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TariffSettings, TariffBlock, AppUser, UserRole } from '../types';
import { 
  Settings, 
  Coins, 
  Database, 
  Save, 
  Plus, 
  Trash2, 
  HelpCircle, 
  Check, 
  Clock, 
  Info, 
  Layers, 
  Smartphone,
  Download,
  Upload,
  RefreshCw,
  Users,
  UserPlus,
  Shield,
  Lock,
  Image,
  CreditCard,
  Printer
} from 'lucide-react';
import { formatCurrency } from '../utils/parkingUtils';
import { print58mmTicket } from '../utils/ticketGenerator';

interface TariffsConfigProps {
  settings: TariffSettings;
  capacity: number;
  onSaveSettings: (settings: TariffSettings) => void;
  onSaveCapacity: (capacity: number) => void;
  onResetData: () => void;
  onImportData: (data: any) => void;
  onExportData: () => void;
  users: AppUser[];
  onSaveUsers: (users: AppUser[]) => void;
  currentUser: AppUser | null;
  companyLogo: string;
  showLogoInHeader: boolean;
  showLogoInTicket: boolean;
  onUpdateLogoSettings: (logo: string, showHeader: boolean, showTicket: boolean) => void;
}

export default function TariffsConfig({
  settings,
  capacity,
  onSaveSettings,
  onSaveCapacity,
  onResetData,
  onImportData,
  onExportData,
  users,
  onSaveUsers,
  currentUser,
  companyLogo,
  showLogoInHeader,
  showLogoInTicket,
  onUpdateLogoSettings
}: TariffsConfigProps) {
  
  // State locales para configuración
  const [currency, setCurrency] = useState(settings.currency);
  const [defaultBlockModel, setDefaultBlockModel] = useState(settings.defaultBlockModel);
  const [baseHourlyRate, setBaseHourlyRate] = useState(settings.baseHourlyRate);
  const [minFractionMinutes, setMinFractionMinutes] = useState(settings.minFractionMinutes);
  const [blocks, setBlocks] = useState<TariffBlock[]>(settings.blocks);
  const [localCapacity, setLocalCapacity] = useState(capacity);
  const [debitCommissionRate, setDebitCommissionRate] = useState(settings.debitCommissionRate ?? 2.95);
  const [debitCommissionProvider, setDebitCommissionProvider] = useState(settings.debitCommissionProvider ?? 'TUU');

  // Configuración de Ticket Térmico de Ingreso (58mm)
  const [businessName, setBusinessName] = useState(settings.businessName ?? 'ESTACIONAMIENTO & BAMO GARAGE');
  const [businessId, setBusinessId] = useState(settings.businessId ?? '78.084.649-6');
  const [businessAddress, setBusinessAddress] = useState(settings.businessAddress ?? 'Av. Principal 1234, Santiago');
  const [businessPhone, setBusinessPhone] = useState(settings.businessPhone ?? '+569 9 393 9952');
  const [ticketFooter, setTicketFooter] = useState(settings.ticketFooter ?? 'GRACIAS POR SU PREFERENCIA. CONSERVE ESTE TICKET PARA EL RETIRO Y COBRO DE SU VEHÍCULO.');
  const [showQrInTicket, setShowQrInTicket] = useState(settings.showQrInTicket ?? true);

  // Manejo de logo de empresa
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 250 * 1024) {
      alert("La imagen excede los 250 KB recomendados. Por favor suba una imagen de menor tamaño o con mayor compresión.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      onUpdateLogoSettings(base64String, showLogoInHeader, showLogoInTicket);
    };
    reader.readAsDataURL(file);
  };

  const handleToggleHeader = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateLogoSettings(companyLogo, e.target.checked, showLogoInTicket);
  };

  const handleToggleTicket = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateLogoSettings(companyLogo, showLogoInHeader, e.target.checked);
  };

  const handleRemoveLogo = () => {
    onUpdateLogoSettings('', showLogoInHeader, showLogoInTicket);
  };

  // States para gestión de usuarios
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('operador');
  const [newUserPin, setNewUserPin] = useState('');
  const [userFormError, setUserFormError] = useState('');

  const handleAddUserLocal = (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError('');

    if (!newUserName.trim()) {
      setUserFormError('El nombre es requerido.');
      return;
    }

    if (newUserPin.length !== 4) {
      setUserFormError('El PIN debe ser exactamente de 4 dígitos.');
      return;
    }

    // Verificar si el PIN ya está en uso por otro usuario
    const pinExists = users.some(u => u.pin === newUserPin);
    if (pinExists) {
      setUserFormError('Este PIN ya se encuentra asignado a otro usuario. Elija uno diferente.');
      return;
    }

    const newUser: AppUser = {
      id: `user-${Date.now()}`,
      name: newUserName.trim(),
      role: newUserRole,
      pin: newUserPin,
      createdAt: new Date().toISOString()
    };

    onSaveUsers([...users, newUser]);
    
    // Resetear form
    setNewUserName('');
    setNewUserRole('operador');
    setNewUserPin('');
  };

  // States de feedback
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [capacitySuccess, setCapacitySuccess] = useState(false);

  // Manejar edición de costo de bloque
  const handleBlockCostChange = (id: string, cost: number) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, cost } : b));
  };

  // Manejar edición de límites de bloque
  const handleBlockLimitChange = (id: string, field: 'minMinutes' | 'maxMinutes', val: number) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, [field]: val } : b));
  };

  // Agregar nuevo bloque
  const handleAddBlock = () => {
    const newId = `b-${Date.now()}`;
    const lastBlock = blocks[blocks.length - 1];
    const newMin = lastBlock && lastBlock.maxMinutes !== Infinity ? lastBlock.maxMinutes + 1 : 0;
    
    const newBlock: TariffBlock = {
      id: newId,
      name: `Tramo de Tiempo ${blocks.length + 1}`,
      minMinutes: newMin,
      maxMinutes: newMin + 30,
      cost: 1000
    };
    
    setBlocks([...blocks, newBlock]);
  };

  // Eliminar bloque
  const handleRemoveBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
  };

  // Guardar configuración de tarifas
  const handleSaveTariff = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      currency,
      defaultBlockModel,
      baseHourlyRate: Number(baseHourlyRate),
      minFractionMinutes: Number(minFractionMinutes),
      blocks,
      debitCommissionRate: Number(debitCommissionRate),
      debitCommissionProvider,
      businessName,
      businessId,
      businessAddress,
      businessPhone,
      ticketFooter,
      showQrInTicket
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Guardar capacidad
  const handleSaveCapacityLocal = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveCapacity(Number(localCapacity));
    setCapacitySuccess(true);
    setTimeout(() => setCapacitySuccess(false), 3000);
  };

  // Manejo de importación de respaldo
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && Array.isArray(parsed.sessions)) {
            onImportData(parsed);
            alert('Datos importados con éxito.');
          } else {
            alert('Formato de archivo inválido.');
          }
        } catch (err) {
          alert('Error al leer el archivo JSON.');
        }
      };
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-200">
      
      {/* Encabezado Principal */}
      <div className="bg-slate-950/40 p-6 rounded-2xl border border-slate-800/80 shadow-2xl backdrop-blur-md">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-500" />
          Ajustes de Estacionamiento y Tarifas
        </h2>
        <p className="text-slate-400 text-xs mt-1">
          Configure los tramos de cobro, el modelo de cálculo financiero y la capacidad operativa general del establecimiento.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Izquierda: Configuración Financiera y Capacidad */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Tarjeta Capacidad */}
          <div className="bg-slate-950/40 p-6 rounded-2xl border border-slate-800/80 shadow-2xl space-y-4 backdrop-blur-md">
            <h3 className="font-bold text-white text-sm flex items-center gap-1.5 uppercase tracking-wider">
              <Database className="w-4 h-4 text-blue-500" />
              Capacidad Operativa
            </h3>
            <p className="text-slate-400 text-xs">
              Configure la cantidad de cupos físicos totales con los que cuenta el estacionamiento para calcular disponibilidad en vivo.
            </p>

            <form onSubmit={handleSaveCapacityLocal} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Cupos Totales
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={localCapacity}
                  onChange={(e) => setLocalCapacity(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-mono font-bold text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                {capacitySuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400 animate-pulse" />
                    ¡Actualizado con éxito!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Actualizar Capacidad
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Tarjeta Moneda y Modelo */}
          <div className="bg-slate-950/40 p-6 rounded-2xl border border-slate-800/80 shadow-2xl space-y-4 backdrop-blur-md">
            <h3 className="font-bold text-white text-sm flex items-center gap-1.5 uppercase tracking-wider">
              <Coins className="w-4 h-4 text-blue-500" />
              Formato y Algoritmo
            </h3>
            <p className="text-slate-400 text-xs">
              Defina el símbolo de su moneda local y el modelo matemático de cobro.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Símbolo Monetario
                </label>
                <input
                  type="text"
                  maxLength={5}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-mono font-bold text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Algoritmo de Cálculo de Tramos
                </label>
                <select
                  value={defaultBlockModel}
                  onChange={(e) => setDefaultBlockModel(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 focus:outline-hidden focus:border-blue-500 bg-none"
                >
                  <option value="cumulative" className="bg-slate-950">Tramos Acumulativos (Sumatoria cruzada)</option>
                  <option value="flat_ranges" className="bg-slate-950">Rangos Fijos (Cobro según tramo final)</option>
                  <option value="simple_hourly" className="bg-slate-950">Lineal Proporcional (Por hora lineal)</option>
                </select>
              </div>

              <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-850 text-xs text-slate-400 space-y-1 leading-relaxed">
                <p className="font-bold text-slate-300 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-blue-500" /> Detalle de algoritmo:
                </p>
                {defaultBlockModel === 'cumulative' && (
                  <p>Suma los costos de cada tramo recorrido. Por ejemplo, si un vehículo está 45 minutos, se cobrará Tramo 1 (0-30m) + Tramo 2 (31-60m) en total.</p>
                )}
                {defaultBlockModel === 'flat_ranges' && (
                  <p>Identifica en qué tramo de tiempo calza la estadía total y aplica exclusivamente el cobro fijo correspondiente a ese tramo, sin sumas.</p>
                )}
                {defaultBlockModel === 'simple_hourly' && (
                  <p>Ignora los tramos complejos y cobra linealmente basándose en el valor de la hora base adicional y las fracciones mínimas configuradas.</p>
                )}
              </div>

              {/* Comisión Débito */}
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 space-y-3">
                <h4 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-blue-400" />
                  Comisión Terminal Débito
                </h4>
                <p className="text-slate-400 text-[10px] leading-relaxed">
                  Ingrese el porcentaje de comisión que cobra su prestadora (TUU o Mercado Pago) para percibir en caja solo el ingreso neto real.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">
                      Prestadora
                    </label>
                    <select
                      value={debitCommissionProvider}
                      onChange={(e) => setDebitCommissionProvider(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 focus:outline-hidden"
                    >
                      <option value="TUU">TUU</option>
                      <option value="Mercado Pago">Mercado Pago</option>
                      <option value="Transbank">Transbank</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">
                      Comisión (%)
                    </label>
                    <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5">
                      <input
                        type="number"
                        min="0"
                        max="25"
                        step="0.01"
                        value={debitCommissionRate}
                        onChange={(e) => setDebitCommissionRate(Number(e.target.value))}
                        className="w-full bg-transparent text-right font-mono font-bold text-white text-xs focus:outline-hidden"
                      />
                      <span className="text-slate-500 font-mono text-xs ml-1">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tarjeta de Respaldo y Herramientas */}
          <div className="bg-slate-950/40 p-6 rounded-2xl border border-slate-800/80 shadow-2xl space-y-4 backdrop-blur-md">
            <h3 className="font-bold text-white text-sm flex items-center gap-1.5 uppercase tracking-wider">
              <Database className="w-4 h-4 text-blue-500" />
              Copias de Seguridad
            </h3>
            <p className="text-slate-400 text-xs">
              Guarde un archivo de respaldo con todo el historial de la aplicación o restaure el sistema.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onExportData}
                className="py-2.5 px-3 bg-blue-950/30 hover:bg-blue-950/50 border border-blue-900/40 text-blue-400 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Exportar JSON
              </button>
              
              <label className="py-2.5 px-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-center">
                <Upload className="w-3.5 h-3.5 text-blue-500" />
                Importar JSON
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  className="hidden"
                />
              </label>
            </div>

            <button
              onClick={() => {
                if (confirm('¿Está seguro de reiniciar la base de datos local? Esto eliminará todos los registros actuales y cargará los vehículos demostrativos.')) {
                  onResetData();
                }
              }}
              className="w-full bg-rose-950/40 hover:bg-rose-950/60 text-rose-400 border border-rose-900/50 font-bold text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 mt-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Restaurar Datos de Demostración
            </button>
          </div>

          {/* Tarjeta de Identidad Visual y Logo */}
          <div className="bg-slate-950/40 p-6 rounded-2xl border border-slate-800/80 shadow-2xl space-y-4 backdrop-blur-md">
            <h3 className="font-bold text-white text-sm flex items-center gap-1.5 uppercase tracking-wider">
              <Image className="w-4 h-4 text-blue-500" />
              Identidad Visual y Logo
            </h3>
            <p className="text-slate-400 text-xs">
              Personalice la apariencia cargando el logo corporativo de su empresa.
            </p>

            <div className="space-y-4">
              {/* Contenedor de Logo / Uploader */}
              {companyLogo ? (
                <div className="space-y-3">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center relative group">
                    <img
                      src={companyLogo}
                      alt="Logo Empresa"
                      className="max-h-24 max-w-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute top-2 right-2 p-1.5 bg-rose-950 hover:bg-rose-900 text-rose-400 border border-rose-900/30 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar logo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-slate-900/40 hover:bg-slate-900/60 group">
                    <Upload className="w-8 h-8 text-slate-500 group-hover:text-blue-500 transition-colors" />
                    <span className="text-xs font-bold text-slate-300">Seleccionar imagen de logo</span>
                    <span className="text-[10px] text-slate-500">PNG o JPG (Recomendado: 120x80px, Máx: 250KB)</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* Toggles de visualización */}
              <div className="space-y-3 pt-2">
                <label className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-800/60 rounded-xl cursor-pointer hover:bg-slate-900/80 transition-colors">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-slate-300">Logo en barra superior</span>
                    <span className="text-[10px] text-slate-500">Muestra el logo en la cabecera principal</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showLogoInHeader}
                    onChange={handleToggleHeader}
                    className="w-4 h-4 rounded-sm border-slate-800 bg-slate-900 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-800/60 rounded-xl cursor-pointer hover:bg-slate-900/80 transition-colors">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-slate-300">Logo en tickets térmicos</span>
                    <span className="text-[10px] text-slate-500">Imprime el logo en la parte superior del PDF</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showLogoInTicket}
                    onChange={handleToggleTicket}
                    className="w-4 h-4 rounded-sm border-slate-800 bg-slate-900 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Tarjeta de Configuración de Ticket Térmico 58mm */}
          <div className="bg-slate-950/40 p-6 rounded-2xl border border-slate-800/80 shadow-2xl space-y-4 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-1.5 uppercase tracking-wider">
                <Printer className="w-4 h-4 text-emerald-500" />
                Ticket Térmico 58mm (Ingreso)
              </h3>
              <button
                type="button"
                onClick={() => {
                  const sampleSession = {
                    id: 'sample-001',
                    plate: 'AB-12-34',
                    vehicleType: 'auto' as const,
                    brand: 'Toyota',
                    model: 'Yaris',
                    color: 'Gris',
                    entryTime: new Date().toISOString(),
                    status: 'active' as const,
                    clientName: 'Cliente Prueba',
                    clientPhone: '+569 8765 4321',
                    notes: 'Vehículo de muestra para test de impresión'
                  };
                  print58mmTicket(
                    sampleSession,
                    {
                      currency,
                      defaultBlockModel,
                      baseHourlyRate: Number(baseHourlyRate),
                      minFractionMinutes: Number(minFractionMinutes),
                      blocks,
                      businessName,
                      businessId,
                      businessAddress,
                      businessPhone,
                      ticketFooter,
                      showQrInTicket
                    },
                    companyLogo,
                    showLogoInTicket
                  );
                }}
                className="px-2.5 py-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800/60 text-emerald-300 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="Imprimir muestra de ticket 58mm"
              >
                <Printer className="w-3 h-3" />
                Probar Ticket 58mm
              </button>
            </div>
            <p className="text-slate-400 text-xs">
              Personalice la información comercial y el pie de página que se imprime en los tickets de 58mm para los vehículos ingresados.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nombre / Razón Social</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Ej: ESTACIONAMIENTO CENTRAL"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">RUT Empresa</label>
                  <input
                    type="text"
                    value={businessId}
                    onChange={(e) => setBusinessId(e.target.value)}
                    placeholder="78.084.649-6"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={businessPhone}
                    onChange={(e) => setBusinessPhone(e.target.value)}
                    placeholder="+569 1234 5678"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Dirección Comercial</label>
                <input
                  type="text"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  placeholder="Av. Principal 1234, Ciudad"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Pie de Página / Políticas</label>
                <textarea
                  rows={2}
                  value={ticketFooter}
                  onChange={(e) => setTicketFooter(e.target.value)}
                  placeholder="Políticas del recibo..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500 resize-none"
                />
              </div>

              <label className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-800/60 rounded-xl cursor-pointer hover:bg-slate-900/80 transition-colors">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-slate-300">Incluir Código QR en Ticket</span>
                  <span className="text-[10px] text-slate-500">Permite al cliente escanear con su celular para ver su tiempo</span>
                </div>
                <input
                  type="checkbox"
                  checked={showQrInTicket}
                  onChange={(e) => setShowQrInTicket(e.target.checked)}
                  className="w-4 h-4 rounded-sm border-slate-800 bg-slate-900 text-emerald-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
              </label>
            </div>
          </div>

        </div>

        {/* Columna Derecha: Bloques de Tramos de Tiempo (Editable) */}
        <div className="lg:col-span-2 bg-slate-950/40 p-6 rounded-2xl border border-slate-800/80 shadow-2xl flex flex-col justify-between backdrop-blur-md">
          <div className="space-y-6">
            
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-1.5">
                  <Layers className="w-5 h-5 text-blue-500" />
                  Estructura de Tramos de Tiempo
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Edite y organice los límites de minutos y el valor asignado por cada tramo.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddBlock}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-lg shadow-blue-900/30"
              >
                <Plus className="w-4 h-4" />
                Agregar Tramo
              </button>
            </div>

            {/* Configuración de Costos Base Lineales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-850">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 flex items-center gap-1">
                  Hora Adicional (Costo Lineal)
                  <HelpCircle className="w-3.5 h-3.5 text-slate-500 cursor-help" title="Se aplica para calcular cobros después de que se exceden todos los tramos configurados." />
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={baseHourlyRate}
                  onChange={(e) => setBaseHourlyRate(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 flex items-center gap-1">
                  Fracción Mínima (Minutos)
                  <HelpCircle className="w-3.5 h-3.5 text-slate-500 cursor-help" title="Minutos mínimos por fracción para el cálculo lineal de hora simple." />
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={minFractionMinutes}
                  onChange={(e) => setMinFractionMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-white focus:outline-hidden"
                />
              </div>
            </div>

            {/* Listado Editable de Tramos de Tiempo */}
            <div className="space-y-3">
              {blocks.map((block, index) => (
                <div 
                  key={block.id}
                  className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/50 hover:border-slate-700/80 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group"
                >
                  <div className="space-y-1.5 w-full md:w-auto">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-950 text-blue-400 text-[10px] font-bold flex items-center justify-center border border-blue-900/40">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        value={block.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, name: val } : b));
                        }}
                        className="font-bold text-xs text-white bg-transparent border-b border-transparent hover:border-slate-800 focus:border-blue-500 focus:outline-hidden px-1 py-0.5 w-full md:w-48"
                      />
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>Rango:</span>
                      <input
                        type="number"
                        min="0"
                        value={block.minMinutes}
                        onChange={(e) => handleBlockLimitChange(block.id, 'minMinutes', Number(e.target.value))}
                        className="w-12 bg-slate-950 text-center border-b border-slate-800 text-slate-300 font-bold focus:outline-hidden rounded font-mono"
                      />
                      <span>a</span>
                      {block.maxMinutes === Infinity ? (
                        <button
                          type="button"
                          onClick={() => handleBlockLimitChange(block.id, 'maxMinutes', block.minMinutes + 60)}
                          className="font-bold text-blue-400 hover:underline text-[10px]"
                        >
                          Infinito (Adicional)
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            value={block.maxMinutes}
                            onChange={(e) => handleBlockLimitChange(block.id, 'maxMinutes', Number(e.target.value))}
                            className="w-12 bg-slate-950 text-center border-b border-slate-800 text-slate-300 font-bold focus:outline-hidden rounded font-mono"
                          />
                          <span>minutos</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Inputs de Cobros */}
                  <div className="flex items-center gap-3.5 w-full md:w-auto justify-between md:justify-end">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-medium">Costo:</span>
                      <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 w-32">
                        <span className="text-xs font-bold text-slate-500 font-mono">{currency}</span>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={block.cost}
                          onChange={(e) => handleBlockCostChange(block.id, Number(e.target.value))}
                          className="w-full bg-transparent text-right font-black text-white text-xs font-mono focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveBlock(block.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors shrink-0 cursor-pointer"
                      title="Eliminar tramo"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>

                </div>
              ))}
            </div>

          </div>

          <div className="border-t border-slate-850 pt-4 mt-8 flex justify-end">
            <button
              onClick={handleSaveTariff}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider py-3 px-6 rounded-xl transition-all duration-150 flex items-center gap-1.5 shadow-lg shadow-blue-900/30 cursor-pointer"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400 animate-pulse" />
                  ¡Tarifas Guardadas!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar Configuración Financiera
                </>
              )}
            </button>
          </div>

        </div>

      </div>

      {/* SECCIÓN DE USUARIOS ADMINISTRADOS (Solo Administradores) */}
      <div className="bg-slate-950/40 p-6 rounded-2xl border border-slate-800/80 shadow-2xl backdrop-blur-md space-y-6">
        <div className="flex justify-between items-center border-b border-slate-850 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Gestión de Usuarios y Personal de Turno
            </h3>
            <p className="text-slate-400 text-xs mt-1">
              Agregue, edite o elimine administradores y prestadores de servicios. Los operadores (prestadores) solo podrán registrar entradas pero no podrán realizar modificaciones, cobros o ajustes.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulario para agregar usuario */}
          <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-850 space-y-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-blue-400" />
              Registrar Nuevo Usuario
            </h4>

            {userFormError && (
              <div className="bg-rose-950/40 border border-rose-900/60 text-rose-300 p-3 rounded-lg text-xs">
                {userFormError}
              </div>
            )}

            <form onSubmit={handleAddUserLocal} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Juan Pérez"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs font-bold text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Rol de Acceso</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs font-bold text-slate-300 focus:outline-hidden"
                >
                  <option value="operador">Operador (Prestador de Servicios)</option>
                  <option value="admin">Administrador (Control Total)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">PIN de Seguridad (4 dígitos)</label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  placeholder="e.g. 4321"
                  value={newUserPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setNewUserPin(val);
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs font-bold font-mono text-white focus:outline-hidden focus:border-blue-500 tracking-widest text-center"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
              >
                <Plus className="w-4 h-4" />
                Guardar Usuario
              </button>
            </form>
          </div>

          {/* Listado de usuarios */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Shield className="w-4 h-4 text-blue-400" />
              Personal Registrado ({users.length})
            </h4>

            <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="p-3.5 rounded-xl border border-slate-850 bg-slate-900/30 flex justify-between items-center gap-4 hover:border-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                      user.role === 'admin' ? 'bg-blue-950 text-blue-400 border border-blue-900/40' : 'bg-slate-850 text-slate-400 border border-slate-800'
                    }`}>
                      {user.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-xs text-white flex items-center gap-1.5">
                        {user.name}
                        {user.role === 'admin' ? (
                          <span className="text-[9px] bg-blue-900/40 text-blue-400 border border-blue-800 px-1.5 py-0.5 rounded-md uppercase font-bold font-sans">Admin</span>
                        ) : (
                          <span className="text-[9px] bg-emerald-950/50 text-emerald-400 border border-emerald-900/40 px-1.5 py-0.5 rounded-md uppercase font-bold font-sans">Operador</span>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Creado: {new Date(user.createdAt).toLocaleDateString('es-CL')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-sans">PIN</p>
                      <p className="text-xs font-mono font-bold text-slate-300 tracking-wider">
                        {user.id === 'user-admin-1' && currentUser?.id !== 'user-admin-1' ? '••••' : user.pin}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={user.id === 'user-admin-1' || user.id === currentUser?.id}
                      onClick={() => {
                        if (confirm(`¿Está seguro de eliminar al usuario "${user.name}"?`)) {
                          onSaveUsers(users.filter(u => u.id !== user.id));
                        }
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${
                        user.id === 'user-admin-1' || user.id === currentUser?.id
                          ? 'text-slate-800 cursor-not-allowed'
                          : 'text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 cursor-pointer'
                      }`}
                      title={user.id === 'user-admin-1' ? 'El Administrador Principal no puede ser eliminado' : user.id === currentUser?.id ? 'No puedes eliminarte a ti mismo' : 'Eliminar usuario'}
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
