import React, { useState } from 'react';
import { 
  FileText, Plus, Search, CheckCircle, XCircle, Clock, Printer, 
  Trash2, Tag, Car, Wrench, ShoppingBag, Eye, Send, Copy, ArrowRight
} from 'lucide-react';
import { ServiceQuote, QuoteItem, VehicleType, TariffSettings, InventoryItem, WashPackage } from '../types';
import { formatCurrency, formatPlate, normalizePlate, getVehicleTypeLabel } from '../utils/parkingUtils';

interface ServiceQuotesProps {
  quotes: ServiceQuote[];
  onSaveQuote: (quote: ServiceQuote) => void;
  onUpdateQuoteStatus?: (quoteId: string, status: ServiceQuote['status']) => void;
  onDeleteQuote: (quoteId: string) => void;
  inventory: InventoryItem[];
  washPackages?: WashPackage[];
  settings: TariffSettings;
  onPrintTicket?: (ticketData: any) => void;
}

export const ServiceQuotes: React.FC<ServiceQuotesProps> = ({
  quotes,
  onSaveQuote,
  onUpdateQuoteStatus = () => {},
  onDeleteQuote,
  inventory,
  washPackages = [],
  settings,
  onPrintTicket
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'pendiente' | 'aprobada' | 'rechazada'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedQuoteForDetail, setSelectedQuoteForDetail] = useState<ServiceQuote | null>(null);

  // Form state for creating/editing quote
  const [clientName, setClientName] = useState('');
  const [clientRut, setClientRut] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [plate, setPlate] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('auto');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [ivaRate, setIvaRate] = useState<number>(19);
  const [notes, setNotes] = useState('');
  const [validDays, setValidDays] = useState<number>(7);

  // Quote line items state
  const [items, setItems] = useState<QuoteItem[]>([]);

  // Item builder inputs
  const [itemType, setItemType] = useState<QuoteItem['type']>('wash');
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemUnitPrice, setItemUnitPrice] = useState<number>(0);

  // Quick preset selection
  const handleSelectWashPreset = (pkg: WashPackage) => {
    const price = pkg.priceByVehicleType[vehicleType] || pkg.priceByVehicleType.auto || 10000;
    setItemType('wash');
    setItemName(pkg.name);
    setItemDescription(pkg.description);
    setItemQuantity(1);
    setItemUnitPrice(price);
  };

  const handleSelectInventoryPreset = (item: InventoryItem) => {
    setItemType('inventory');
    setItemName(item.name);
    setItemDescription(item.description || '');
    setItemQuantity(1);
    setItemUnitPrice(item.price);
  };

  const handleSelectEngravingPreset = () => {
    setItemType('engraving');
    setItemName('🔍 Grabado de Patente en Vidrios y Espejos (6 piezas)');
    setItemDescription('Grabado ácido / cuarzo imborrable en parabrisas, luneta y 4 vidrios laterales');
    setItemQuantity(1);
    setItemUnitPrice(19900);
  };

  const handleAddItem = () => {
    if (!itemName.trim() || itemUnitPrice <= 0 || itemQuantity <= 0) {
      alert('Por favor ingrese un nombre válido y un precio mayor a 0.');
      return;
    }

    const newItem: QuoteItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: itemType,
      name: itemName.trim(),
      description: itemDescription.trim() || undefined,
      quantity: itemQuantity,
      unitPrice: itemUnitPrice,
      totalPrice: itemQuantity * itemUnitPrice
    };

    setItems([...items, newItem]);

    // Reset item builder inputs
    setItemName('');
    setItemDescription('');
    setItemQuantity(1);
    setItemUnitPrice(0);
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter(i => i.id !== itemId));
  };

  // Calculations
  const grossSubtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const netAmount = ivaRate > 0 ? Math.round(grossSubtotal / (1 + ivaRate / 100)) : grossSubtotal;
  const ivaAmount = grossSubtotal - netAmount;
  const totalAmount = grossSubtotal;

  const handleSaveNewQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      alert('Debe ingresar el nombre del cliente.');
      return;
    }
    if (items.length === 0) {
      alert('Debe agregar al menos un ítem o servicio a la cotización.');
      return;
    }

    const today = new Date();
    const validUntilDate = new Date(today.getTime() + validDays * 24 * 3600 * 1000).toISOString().split('T')[0];

    const newQuote: ServiceQuote = {
      id: `quote-${Date.now()}`,
      quoteNumber: `COT-${1000 + quotes.length + 1}`,
      clientName: clientName.trim(),
      clientRut: clientRut.trim() || undefined,
      clientPhone: clientPhone.trim() || undefined,
      clientEmail: clientEmail.trim() || undefined,
      plate: plate ? normalizePlate(plate) : undefined,
      vehicleType,
      brand: brand.trim() || undefined,
      model: model.trim() || undefined,
      items,
      netAmount,
      ivaRate,
      ivaAmount,
      totalAmount,
      status: 'pendiente',
      createdAt: today.toISOString(),
      validUntil: validUntilDate,
      notes: notes.trim() || undefined
    };

    onSaveQuote(newQuote);
    setShowCreateModal(false);
    resetForm();
  };

  const resetForm = () => {
    setClientName('');
    setClientRut('');
    setClientPhone('');
    setClientEmail('');
    setPlate('');
    setVehicleType('auto');
    setBrand('');
    setModel('');
    setItems([]);
    setNotes('');
    setIvaRate(19);
  };

  const filteredQuotes = quotes.filter(q => {
    const matchesTab = activeTab === 'all' ? true : q.status === activeTab;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      q.quoteNumber.toLowerCase().includes(query) ||
      q.clientName.toLowerCase().includes(query) ||
      (q.plate && q.plate.toLowerCase().includes(query)) ||
      (q.clientRut && q.clientRut.toLowerCase().includes(query));
    return matchesTab && matchesSearch;
  });

  const getStatusBadge = (status: ServiceQuote['status']) => {
    switch (status) {
      case 'aprobada':
        return <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Aprobada</span>;
      case 'rechazada':
        return <span className="bg-rose-950/80 text-rose-400 border border-rose-800/80 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1"><XCircle className="w-3 h-3" /> Rechazada</span>;
      case 'convertida':
        return <span className="bg-purple-950/80 text-purple-400 border border-purple-800/80 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1"><ArrowRight className="w-3 h-3" /> Convertida</span>;
      case 'pendiente':
      default:
        return <span className="bg-amber-950/80 text-amber-400 border border-amber-800/80 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1"><Clock className="w-3 h-3" /> Pendiente</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Encabezado y Acción Principal */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950/40 p-5 rounded-2xl border border-slate-800/80 shadow-2xl backdrop-blur-md">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-500" />
            Cotizaciones de Servicios y Artículos
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Genere presupuestos formales para lavado, accesorios, grabado de patentes o paquetes corporativos.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-lg shadow-blue-900/30 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nueva Cotización
        </button>
      </div>

      {/* Tabs y Buscador */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {[
            { key: 'all', label: 'Todas', count: quotes.length },
            { key: 'pendiente', label: 'Pendientes', count: quotes.filter(q => q.status === 'pendiente').length },
            { key: 'aprobada', label: 'Aprobadas', count: quotes.filter(q => q.status === 'aprobada').length },
            { key: 'rechazada', label: 'Rechazadas', count: quotes.filter(q => q.status === 'rechazada').length }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className="bg-slate-950/80 text-[10px] px-2 py-0.5 rounded-full border border-slate-800 font-mono">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por folores, cliente o patente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500"
          />
        </div>
      </div>

      {/* Lista de Cotizaciones */}
      {filteredQuotes.length === 0 ? (
        <div className="bg-slate-950/40 rounded-2xl border border-slate-800 p-12 text-center text-slate-400">
          <FileText className="w-10 h-10 mx-auto text-slate-600 mb-3" />
          <p className="font-bold text-sm text-white">No se encontraron cotizaciones</p>
          <p className="text-xs mt-1 text-slate-500">Cree una nueva cotización con el botón de la parte superior.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuotes.map(q => (
            <div
              key={q.id}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-900/40">
                      {q.quoteNumber}
                    </span>
                    <h3 className="font-bold text-white text-base mt-1.5">{q.clientName}</h3>
                    {q.clientRut && <p className="text-slate-400 text-xs font-mono">{q.clientRut}</p>}
                  </div>
                  <div>{getStatusBadge(q.status)}</div>
                </div>

                {q.plate && (
                  <div className="inline-flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-xs">
                    <Car className="w-3.5 h-3.5 text-blue-400" />
                    <span className="font-mono font-bold text-white tracking-wider">{formatPlate(q.plate)}</span>
                    {q.vehicleType && (
                      <span className="text-[10px] text-slate-400 uppercase">({getVehicleTypeLabel(q.vehicleType)})</span>
                    )}
                  </div>
                )}

                {/* Resumen de ítems */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1.5 text-xs">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">
                    Ítems incluidos ({q.items.length})
                  </span>
                  <ul className="space-y-1 divide-y divide-slate-850">
                    {q.items.map(item => (
                      <li key={item.id} className="pt-1 first:pt-0 flex justify-between items-center text-slate-300 text-[11px]">
                        <span className="truncate pr-2">• {item.quantity}x {item.name}</span>
                        <span className="font-mono font-bold text-slate-200">{formatCurrency(item.totalPrice, settings.currency)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Pie con totales y acciones */}
              <div className="border-t border-slate-800/80 pt-3 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase block">Total Cotizado</span>
                    <span className="text-lg font-mono font-black text-emerald-400">
                      {formatCurrency(q.totalAmount, settings.currency)}
                    </span>
                  </div>
                  <div className="text-right text-[10px] text-slate-400">
                    <div>Validez hasta: <span className="font-mono text-slate-200">{q.validUntil || 'N/A'}</span></div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex gap-1.5">
                    {q.status === 'pendiente' && (
                      <>
                        <button
                          onClick={() => onUpdateQuoteStatus(q.id, 'aprobada')}
                          className="bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/80 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                          title="Aprobar Cotización"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Aprobar
                        </button>
                        <button
                          onClick={() => onUpdateQuoteStatus(q.id, 'rechazada')}
                          className="bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                          title="Rechazar Cotización"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setSelectedQuoteForDetail(q)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                      title="Ver Detalle / Imprimir Ticket"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Detalle
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`¿Eliminar la cotización ${q.quoteNumber}?`)) {
                          onDeleteQuote(q.id);
                        }
                      }}
                      className="bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 p-1.5 rounded-lg border border-rose-900/40 transition-colors cursor-pointer"
                      title="Eliminar Cotización"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CREAR NUEVA COTIZACIÓN */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-800 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500">NUEVA COTIZACIÓN FORMAL</span>
                <h3 className="text-lg font-bold text-white">Generar Presupuesto de Servicios</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveNewQuote} className="p-6 space-y-5 overflow-y-auto text-xs text-slate-200">
              
              {/* Sección Datos Cliente */}
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">1. Datos del Cliente y Vehículo</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nombre / Empresa *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Transportes del Norte S.A."
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-medium focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">RUT / ID Fiscal</label>
                    <input
                      type="text"
                      placeholder="e.g. 76.543.210-K"
                      value={clientRut}
                      onChange={e => setClientRut(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Teléfono</label>
                    <input
                      type="tel"
                      placeholder="+56 9 1234 5678"
                      value={clientPhone}
                      onChange={e => setClientPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="contacto@empresa.cl"
                      value={clientEmail}
                      onChange={e => setClientEmail(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Patente</label>
                    <input
                      type="text"
                      placeholder="AB CD 12"
                      value={plate}
                      onChange={e => setPlate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white uppercase font-mono font-bold focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tipo Vehículo</label>
                    <select
                      value={vehicleType}
                      onChange={e => setVehicleType(e.target.value as VehicleType)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-white font-medium focus:outline-hidden focus:border-blue-500"
                    >
                      <option value="auto">Automóvil</option>
                      <option value="suv">SUV</option>
                      <option value="moto">Moto</option>
                      <option value="camioneta">Camioneta</option>
                      <option value="furgon">Furgón</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Marca / Modelo</label>
                    <input
                      type="text"
                      placeholder="Toyota RAV4"
                      value={brand}
                      onChange={e => setBrand(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Atajos Rápidos de Servicios */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Atajos Rápidos de Servicios / Artículos</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleSelectEngravingPreset}
                    className="bg-slate-800 hover:bg-slate-700 text-blue-300 px-3 py-1.5 rounded-lg border border-slate-700 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Wrench className="w-3.5 h-3.5 text-blue-400" />
                    + Grabado de Patente
                  </button>

                  {washPackages.map(pkg => (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => handleSelectWashPreset(pkg)}
                      className="bg-slate-800 hover:bg-slate-700 text-emerald-300 px-3 py-1.5 rounded-lg border border-slate-700 text-[11px] font-bold transition-all cursor-pointer"
                    >
                      + {pkg.name.split(' ')[0]} {pkg.name.split(' ')[1] || ''}
                    </button>
                  ))}

                  {inventory.slice(0, 3).map(inv => (
                    <button
                      key={inv.id}
                      type="button"
                      onClick={() => handleSelectInventoryPreset(inv)}
                      className="bg-slate-800 hover:bg-slate-700 text-amber-300 px-3 py-1.5 rounded-lg border border-slate-700 text-[11px] font-bold transition-all cursor-pointer"
                    >
                      + {inv.name.substring(0, 20)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Creador de Ítem Manual */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">2. Agregar Detalle al Presupuesto</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Nombre del servicio o producto..."
                      value={itemName}
                      onChange={e => setItemName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-medium focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      min="1"
                      placeholder="Cant."
                      value={itemQuantity}
                      onChange={e => setItemQuantity(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-white font-mono font-bold focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      placeholder="Precio Unit ($)"
                      value={itemUnitPrice || ''}
                      onChange={e => setItemUnitPrice(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-white font-mono font-bold focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Descripción o especificaciones (opcional)..."
                    value={itemDescription}
                    onChange={e => setItemDescription(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-300 text-[11px] focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 text-xs"
                >
                  <Plus className="w-4 h-4" />
                  Añadir Ítem a la Cotización
                </button>
              </div>

              {/* Lista de Ítems Agregados */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">3. Resumen de Ítems ({items.length})</span>
                
                {items.length === 0 ? (
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-center text-slate-500 italic">
                    No ha agregado ningún ítem aún.
                  </div>
                ) : (
                  <div className="bg-slate-950 rounded-xl border border-slate-800 divide-y divide-slate-850 overflow-hidden">
                    {items.map((item, idx) => (
                      <div key={item.id} className="p-3 flex justify-between items-center gap-3">
                        <div className="space-y-0.5">
                          <p className="font-bold text-white text-xs">{idx + 1}. {item.name}</p>
                          {item.description && <p className="text-[10px] text-slate-400">{item.description}</p>}
                          <p className="text-[10px] text-slate-500 font-mono">
                            {item.quantity} x {formatCurrency(item.unitPrice, settings.currency)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-black text-emerald-400 text-sm">
                            {formatCurrency(item.totalPrice, settings.currency)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-rose-500 hover:text-rose-400 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totales e Impuestos */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Impuesto IVA (19% Chileno):</span>
                  <select
                    value={ivaRate}
                    onChange={e => setIvaRate(Number(e.target.value))}
                    className="bg-slate-900 border border-slate-800 text-white rounded px-2 py-0.5 font-bold"
                  >
                    <option value={19}>19% Incluido</option>
                    <option value={0}>Exento / 0%</option>
                  </select>
                </div>

                <div className="border-t border-slate-850 pt-2 flex justify-between items-center text-slate-300">
                  <span>Monto Neto:</span>
                  <span className="font-mono font-bold">{formatCurrency(netAmount, settings.currency)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Monto IVA ({ivaRate}%):</span>
                  <span className="font-mono">{formatCurrency(ivaAmount, settings.currency)}</span>
                </div>
                <div className="border-t border-slate-800 pt-2 flex justify-between items-center">
                  <span className="font-bold text-white uppercase text-sm">TOTAL FINAL PRESUPUESTADO:</span>
                  <span className="font-mono font-black text-xl text-emerald-400">{formatCurrency(totalAmount, settings.currency)}</span>
                </div>
              </div>

              {/* Validez y Notas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Días de Validez</label>
                  <select
                    value={validDays}
                    onChange={e => setValidDays(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-bold"
                  >
                    <option value={7}>7 Días</option>
                    <option value={15}>15 Días</option>
                    <option value={30}>30 Días</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Observaciones / Condiciones</label>
                  <input
                    type="text"
                    placeholder="e.g. Incluye garantía de 3 meses en grabado"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/30 cursor-pointer uppercase tracking-wider"
                >
                  Guardar y Emitir Cotización
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE Y REVISE COTIZACIÓN */}
      {selectedQuoteForDetail && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-800">
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 font-mono">
                  {selectedQuoteForDetail.quoteNumber}
                </span>
                <h3 className="text-lg font-bold text-white">{selectedQuoteForDetail.clientName}</h3>
              </div>
              <button onClick={() => setSelectedQuoteForDetail(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-200">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <p><strong>Fecha emisión:</strong> {new Date(selectedQuoteForDetail.createdAt).toLocaleDateString('es-CL')}</p>
                <p><strong>Válida hasta:</strong> {selectedQuoteForDetail.validUntil || 'N/A'}</p>
                {selectedQuoteForDetail.clientRut && <p><strong>RUT:</strong> {selectedQuoteForDetail.clientRut}</p>}
                {selectedQuoteForDetail.clientPhone && <p><strong>Teléfono:</strong> {selectedQuoteForDetail.clientPhone}</p>}
                {selectedQuoteForDetail.plate && <p><strong>Patente:</strong> <span className="font-mono font-bold text-white">{formatPlate(selectedQuoteForDetail.plate)}</span></p>}
              </div>

              <div className="space-y-2">
                <span className="font-bold text-slate-400 uppercase text-[10px]">Detalle de Servicios</span>
                <div className="bg-slate-950 rounded-xl border border-slate-800 divide-y divide-slate-850 p-3">
                  {selectedQuoteForDetail.items.map(i => (
                    <div key={i.id} className="py-1.5 first:pt-0 last:pb-0 flex justify-between">
                      <div>
                        <p className="font-bold text-white">{i.quantity}x {i.name}</p>
                        {i.description && <p className="text-[10px] text-slate-400">{i.description}</p>}
                      </div>
                      <span className="font-mono font-bold text-emerald-400">{formatCurrency(i.totalPrice, settings.currency)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-900/40 flex justify-between items-center text-emerald-300">
                <span className="font-bold uppercase text-xs">Total Cotizado:</span>
                <span className="text-xl font-mono font-black text-emerald-400">
                  {formatCurrency(selectedQuoteForDetail.totalAmount, settings.currency)}
                </span>
              </div>

              {selectedQuoteForDetail.notes && (
                <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-400">
                  <strong>Observaciones:</strong> {selectedQuoteForDetail.notes}
                </div>
              )}

              <div className="pt-2 flex justify-between gap-2">
                <button
                  onClick={() => {
                    alert(`Imprimiendo ticket para cotización ${selectedQuoteForDetail.quoteNumber}...`);
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-blue-400" />
                  Imprimir Ticket
                </button>

                <button
                  onClick={() => setSelectedQuoteForDetail(null)}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2 rounded-xl cursor-pointer"
                >
                  Cerrar
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
