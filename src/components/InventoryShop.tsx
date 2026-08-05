/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { InventoryItem, AccessorySale, TariffSettings, PaymentMethod } from '../types';
import { formatCurrency } from '../utils/parkingUtils';
import { 
  ShoppingBag, 
  Package, 
  History, 
  Plus, 
  PlusCircle, 
  Minus, 
  Trash2, 
  Edit3, 
  AlertTriangle, 
  Search, 
  Filter, 
  CheckCircle, 
  User, 
  CreditCard, 
  Wallet, 
  ArrowRightLeft,
  X,
  RefreshCw,
  TrendingUp,
  Tag,
  Bluetooth,
  Scale,
  Palette,
  Wind,
  Layers,
  Sparkles,
  SearchCode
} from 'lucide-react';

interface InventoryShopProps {
  settings: TariffSettings;
  inventory: InventoryItem[];
  accessorySales: AccessorySale[];
  activeVehicles: string[]; // List of active plates to facilitate autocomplete/linking
  isCashOpen: boolean; // Must warning/block sales if cash register is not open
  onAddProduct: (product: Omit<InventoryItem, 'id'>) => void;
  // Permite editar el producto en la base de datos
  onEditProduct: (id: string, product: Partial<InventoryItem>) => void;
  onDeleteProduct: (id: string) => void;
  onSellAccessory: (sale: Omit<AccessorySale, 'id' | 'timestamp'>) => void;
}

export default function InventoryShop({
  settings,
  inventory,
  accessorySales,
  activeVehicles,
  isCashOpen,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onSellAccessory
}: InventoryShopProps) {

  // Navegación interna
  const [subTab, setSubTab] = useState<'shop' | 'inventory' | 'sales'>('shop');

  // Filtros y Búsqueda de Productos
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');

  // Formulario Crear / Editar Producto
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  // States de campos del formulario de producto (Incluidos los nuevos campos requeridos)
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrice, setProdPrice] = useState<number>(0);
  const [prodIvaRate, setProdIvaRate] = useState<number>(19);
  const [prodStock, setProdStock] = useState<number>(0);
  const [prodMinStock, setProdMinStock] = useState<number>(3);
  const [prodCategory, setProdCategory] = useState('Otros');
  const [prodBrand, setProdBrand] = useState('');
  const [prodColor, setProdColor] = useState('');
  const [prodFragrance, setProdFragrance] = useState('');
  const [prodWeightValue, setProdWeightValue] = useState<number | ''>('');
  const [prodWeightUnit, setProdWeightUnit] = useState<'gr' | 'ml'>('gr');
  const [prodBarcode, setProdBarcode] = useState('');

  // Control de Conexión Bluetooth del Lector
  const [isBtConnected, setIsBtConnected] = useState<boolean>(() => localStorage.getItem('bt_scanner_connected') === 'true');
  const [isBtConnecting, setIsBtConnecting] = useState<boolean>(false);
  const [simulatedScanInput, setSimulatedScanInput] = useState('');

  // Formulario de Venta Rápida
  const [selectedItemForSale, setSelectedItemForSale] = useState<InventoryItem | null>(null);
  const [saleQuantity, setSaleQuantity] = useState<number>(1);
  const [salePaymentMethod, setSalePaymentMethod] = useState<PaymentMethod>('efectivo');
  const [salePlate, setSalePlate] = useState('');
  const [saleNotes, setSaleNotes] = useState('');
  const [saleError, setSaleError] = useState('');
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Categorías expandidas
  const categories = ['Todas', 'Aromatizantes', 'Limpieza', 'Seguridad', 'Electrónica', 'Accesorios', 'Herramientas', 'Otros'];

  // Capturador global de códigos de barra (Emula el Bluetooth Wedge Scanner físico)
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyPress = (e: KeyboardEvent) => {
      // No capturar si el usuario está activamente escribiendo en campos de texto, salvo si es específico
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.tagName === 'SELECT'
      ) {
        // No interferir si están editando código de barras o búsqueda
        if (target.id !== 'shop-search' && !target.classList.contains('scan-capture')) {
          return;
        }
      }

      const currentTime = Date.now();
      
      // Si la pulsación demora más de 120ms, probablemente sea teclado manual humano
      if (currentTime - lastKeyTime > 120) {
        buffer = '';
      }
      
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          e.preventDefault();
          processBarcodeScan(buffer);
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    if (isBtConnected) {
      window.addEventListener('keydown', handleKeyPress);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [inventory, subTab, isBtConnected]);

  // Procesar código de barra detectado
  const processBarcodeScan = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    const found = inventory.find(
      item => (item.barcode && item.barcode.trim() === cleanCode) || item.id === cleanCode
    );

    if (found) {
      if (subTab === 'shop') {
        handleSelectForSale(found);
        triggerSuccess(`🔍 ESCANEO OK: ${found.name}`);
      } else {
        handleOpenEditModal(found);
        triggerSuccess(`🔍 ESCANEO OK: Editando "${found.name}"`);
      }
    } else {
      triggerSuccess(`⚠️ ESCANEO: Código "${cleanCode}" no registrado en inventario`);
    }
  };

  // Conexión/Desconexión de Lector Bluetooth
  const handleToggleBluetooth = () => {
    if (isBtConnected) {
      setIsBtConnected(false);
      localStorage.setItem('bt_scanner_connected', 'false');
      triggerSuccess('Lector de códigos Bluetooth desconectado');
    } else {
      setIsBtConnecting(true);
      setTimeout(() => {
        setIsBtConnected(true);
        setIsBtConnecting(false);
        localStorage.setItem('bt_scanner_connected', 'true');
        triggerSuccess('Lector Bluetooth QR y Código de Barras conectado con éxito');
      }, 1500);
    }
  };

  // Filtrar productos
  const filteredProducts = inventory.filter(item => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      item.name.toLowerCase().includes(query) || 
      (item.description || '').toLowerCase().includes(query) ||
      (item.brand || '').toLowerCase().includes(query) ||
      (item.barcode || '').toLowerCase().includes(query);
      
    const matchesCategory = categoryFilter === 'Todas' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Abrir modal de creación
  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setProdName('');
    setProdDesc('');
    setProdPrice(1000);
    setProdIvaRate(19);
    setProdStock(10);
    setProdMinStock(3);
    setProdCategory('Accesorios');
    setProdBrand('');
    setProdColor('');
    setProdFragrance('');
    setProdWeightValue('');
    setProdWeightUnit('gr');
    setProdBarcode('');
    setIsProductModalOpen(true);
  };

  // Abrir modal de edición
  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setProdName(item.name);
    setProdDesc(item.description || '');
    setProdPrice(item.price);
    setProdIvaRate(item.ivaRate !== undefined ? item.ivaRate : 19);
    setProdStock(item.stock);
    setProdMinStock(item.minStock);
    setProdCategory(item.category);
    setProdBrand(item.brand || '');
    setProdColor(item.color || '');
    setProdFragrance(item.fragrance || '');
    setProdWeightValue(item.weightValue !== undefined ? item.weightValue : '');
    setProdWeightUnit(item.weightUnit || 'gr');
    setProdBarcode(item.barcode || '');
    setIsProductModalOpen(true);
  };

  // Guardar/Actualizar Producto
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim() || prodPrice <= 0) return;

    const productData = {
      name: prodName.trim(),
      description: prodDesc.trim() || undefined,
      price: prodPrice,
      ivaRate: prodIvaRate,
      stock: prodStock,
      minStock: prodMinStock,
      category: prodCategory,
      brand: prodBrand.trim() || undefined,
      color: prodColor.trim() || undefined,
      fragrance: prodFragrance.trim() || undefined,
      weightValue: prodWeightValue !== '' ? Number(prodWeightValue) : undefined,
      weightUnit: prodWeightValue !== '' ? prodWeightUnit : undefined,
      barcode: prodBarcode.trim() || undefined
    };

    if (editingItem) {
      onEditProduct(editingItem.id, productData);
      triggerSuccess('Producto actualizado con éxito');
    } else {
      onAddProduct(productData);
      triggerSuccess('Producto creado e ingresado al inventario');
    }
    setIsProductModalOpen(false);
  };

  // Disparar cartel de éxito
  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setShowSuccessNotification(true);
    setTimeout(() => setShowSuccessNotification(false), 3500);
  };

  // Abrir venta rápida
  const handleSelectForSale = (item: InventoryItem) => {
    if (item.stock <= 0) {
      triggerSuccess(`⚠️ El producto "${item.name}" no tiene stock disponible`);
      return;
    }
    setSelectedItemForSale(item);
    setSaleQuantity(1);
    setSalePaymentMethod('efectivo');
    setSalePlate('');
    setSaleNotes('');
    setSaleError('');
  };

  // Realizar la venta
  const handleCompleteSale = (e: React.FormEvent) => {
    e.preventDefault();
    setSaleError('');

    if (!selectedItemForSale) return;
    if (saleQuantity <= 0) {
      setSaleError('La cantidad debe ser mayor a cero.');
      return;
    }
    if (saleQuantity > selectedItemForSale.stock) {
      setSaleError(`No hay suficiente stock. Disponible: ${selectedItemForSale.stock} unidades.`);
      return;
    }

    const currentIvaRate = selectedItemForSale.ivaRate !== undefined ? selectedItemForSale.ivaRate : 19;
    const totalPrice = selectedItemForSale.price * saleQuantity;
    const netPrice = Math.round(totalPrice / (1 + currentIvaRate / 100));
    const ivaAmount = totalPrice - netPrice;

    onSellAccessory({
      itemId: selectedItemForSale.id,
      itemName: selectedItemForSale.name,
      quantity: saleQuantity,
      unitPrice: selectedItemForSale.price,
      totalPrice: totalPrice,
      paymentMethod: salePaymentMethod,
      buyerPlate: salePlate.trim().toUpperCase() || undefined,
      notes: saleNotes.trim() || undefined,
      ivaRate: currentIvaRate,
      netPrice: netPrice,
      ivaAmount: ivaAmount
    });

    triggerSuccess(`Venta registrada: ${saleQuantity}x ${selectedItemForSale.name}`);
    setSelectedItemForSale(null);
  };

  // Ajuste rápido de stock (+5 o -5 en control)
  const handleQuickStockAdjust = (id: string, currentStock: number, diff: number) => {
    const newStock = Math.max(0, currentStock + diff);
    onEditProduct(id, { stock: newStock });
    triggerSuccess(`Stock ajustado a ${newStock} unidades`);
  };

  return (
    <div className="space-y-6 animate-fade-in relative">

      {/* Alerta flotante de éxito */}
      {showSuccessNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950 border border-emerald-500/80 text-emerald-400 font-bold text-xs uppercase tracking-wider py-3.5 px-6 rounded-xl flex items-center gap-3 shadow-2xl animate-fade-in border-l-4">
          <CheckCircle className="w-5 h-5 text-emerald-400 animate-pulse" />
          <span>{successMessage}</span>
        </div>
      )}
      
      {/* Encabezado Principal */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-r from-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-950/60 rounded-xl border border-blue-900/40 text-blue-400">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Accesorios y Tienda</h2>
            <p className="text-xs text-slate-400">Control de inventario, ventas rápidas e integración con lectores Bluetooth.</p>
          </div>
        </div>

        {/* Panel de Conexión del Lector de Códigos de Barra / QR por Bluetooth */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 shadow-lg">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isBtConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
              Lector Bluetooth: {isBtConnected ? 'CONECTADO WEDGE' : 'DESCONECTADO'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleBluetooth}
              disabled={isBtConnecting}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                isBtConnected
                  ? 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-900/50'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'
              }`}
            >
              {isBtConnecting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <Bluetooth className="w-3.5 h-3.5" />
                  {isBtConnected ? 'Desconectar Lector' : 'Enlazar Bluetooth'}
                </>
              )}
            </button>

            {isBtConnected && (
              <div className="flex items-center gap-1 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                <input
                  type="text"
                  placeholder="Simular Código..."
                  value={simulatedScanInput}
                  onChange={(e) => setSimulatedScanInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      processBarcodeScan(simulatedScanInput);
                      setSimulatedScanInput('');
                    }
                  }}
                  className="w-24 bg-transparent outline-hidden text-[10px] font-mono text-white placeholder-slate-600 uppercase"
                />
                <button
                  onClick={() => {
                    processBarcodeScan(simulatedScanInput);
                    setSimulatedScanInput('');
                  }}
                  className="text-blue-400 hover:text-white text-[9px] font-bold uppercase tracking-wider"
                >
                  Ok
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs de Navegación Secundaria */}
      <div className="flex border-b border-slate-800/80 gap-1 overflow-x-auto pb-px">
        <button
          onClick={() => setSubTab('shop')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            subTab === 'shop'
              ? 'border-blue-500 text-blue-400 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/20'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Venta Rápida (Tienda)
        </button>
        <button
          onClick={() => setSubTab('inventory')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            subTab === 'inventory'
              ? 'border-blue-500 text-blue-400 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/20'
          }`}
        >
          <Package className="w-4 h-4" />
          Control de Inventario
        </button>
        <button
          onClick={() => setSubTab('sales')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            subTab === 'sales'
              ? 'border-blue-500 text-blue-400 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/20'
          }`}
        >
          <History className="w-4 h-4" />
          Historial de Ventas
        </button>
      </div>

      {/* TAB 1: VENTA RÁPIDA (TIENDA INTERACTIVA) */}
      {subTab === 'shop' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Listado de Productos Disponibles */}
          <div className="xl:col-span-2 space-y-5">
            
            {/* Buscador y Filtro */}
            <div className="flex flex-col sm:flex-row gap-3 bg-slate-950/20 p-4 rounded-xl border border-slate-800/80">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  id="shop-search"
                  type="text"
                  placeholder="Buscar accesorio por nombre, marca, SKU o descripción..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/80 pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Categorías */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800 text-xs text-slate-300 focus:outline-hidden focus:border-blue-500"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Grid de Cards de Productos */}
            {filteredProducts.length === 0 ? (
              <div className="bg-slate-950/20 border border-slate-850 p-16 rounded-2xl text-center font-mono text-xs text-slate-500">
                [ No se encontraron accesorios con los filtros actuales ]
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProducts.map(item => {
                  const isLowStock = item.stock <= item.minStock;
                  return (
                    <div 
                      key={item.id}
                      className={`bg-slate-950/30 p-5 rounded-2xl border transition-all hover:border-slate-700/80 flex flex-col justify-between gap-4 relative group ${
                        isLowStock ? 'border-amber-950/50 hover:border-amber-500/30' : 'border-slate-850'
                      }`}
                    >
                      {/* Atributo flotante stock crítico */}
                      {isLowStock && (
                        <span className="absolute top-4 right-4 bg-amber-950/60 border border-amber-900/60 text-amber-400 font-bold px-2 py-0.5 rounded-md text-[9px] uppercase tracking-wide flex items-center gap-1 animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          Stock Crítico
                        </span>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-900 text-slate-400 border border-slate-850 px-2 py-0.5 rounded text-[9px] uppercase font-bold">
                            {item.category}
                          </span>
                          {item.brand && (
                            <span className="bg-blue-950/30 text-blue-400 border border-blue-900/30 px-2 py-0.5 rounded text-[9px] uppercase font-bold">
                              {item.brand}
                            </span>
                          )}
                          {item.barcode && (
                            <span className="font-mono text-[9px] text-slate-500 tracking-wider">
                              SKU: {item.barcode}
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="font-black text-white text-sm tracking-tight group-hover:text-blue-400 transition-colors">
                            {item.name}
                          </h4>
                          <p className="text-slate-400 text-xs mt-1 font-medium">{item.description || 'Sin descripción provista.'}</p>
                        </div>

                        {/* Fila de Especificaciones del producto (Color, Peso, Fragancia) */}
                        <div className="flex flex-wrap gap-2 pt-1">
                          {item.color && (
                            <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-md text-[9px] text-slate-400 font-semibold border border-slate-850">
                              <Palette className="w-3 h-3 text-slate-500" />
                              Color: {item.color}
                            </div>
                          )}
                          {item.fragrance && (
                            <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-md text-[9px] text-slate-400 font-semibold border border-slate-850">
                              <Wind className="w-3 h-3 text-slate-500" />
                              Frangancia: {item.fragrance}
                            </div>
                          )}
                          {item.weightValue && (
                            <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-md text-[9px] text-slate-400 font-semibold border border-slate-850">
                              <Scale className="w-3 h-3 text-slate-500" />
                              Peso: {item.weightValue}{item.weightUnit}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center border-t border-slate-850/60 pt-3">
                        <div className="space-y-0.5">
                          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Precio</span>
                          <p className="font-mono font-black text-base text-emerald-400">
                            {formatCurrency(item.price, settings.currency)}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-right text-xs font-mono">
                            <span className="text-slate-500 block text-[9px] font-sans uppercase font-bold tracking-wider">Disponibilidad</span>
                            <strong className={item.stock <= 0 ? 'text-rose-400' : 'text-slate-300'}>
                              {item.stock} u.
                            </strong>
                          </span>

                          <button
                            onClick={() => handleSelectForSale(item)}
                            disabled={item.stock <= 0}
                            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                              item.stock <= 0
                                ? 'bg-slate-900 text-slate-600 border border-slate-850 cursor-not-allowed'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20'
                            }`}
                          >
                            Vender
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>

          {/* Panel Lateral: Detalle de Venta */}
          <div>
            {selectedItemForSale ? (
              <form onSubmit={handleCompleteSale} className="bg-slate-950/40 p-6 rounded-2xl border border-slate-800 shadow-2xl space-y-5 backdrop-blur-md sticky top-[130px] animate-fade-in">
                <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 font-sans">Nueva Venta</span>
                    <h3 className="font-black text-white text-sm">{selectedItemForSale.name}</h3>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setSelectedItemForSale(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                {saleError && (
                  <div className="bg-rose-950/40 border border-rose-900/60 text-rose-300 p-3 rounded-xl text-xs font-sans">
                    {saleError}
                  </div>
                )}

                {/* Cantidad */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cantidad a Vender</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSaleQuantity(q => Math.max(1, q - 1))}
                      className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-white hover:bg-slate-800"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      required
                      min="1"
                      max={selectedItemForSale.stock}
                      value={saleQuantity}
                      onChange={(e) => setSaleQuantity(Math.min(selectedItemForSale.stock, Math.max(1, Number(e.target.value))))}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-lg py-1.5 text-center text-sm text-white font-mono font-bold focus:outline-hidden focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setSaleQuantity(q => Math.min(selectedItemForSale.stock, q + 1))}
                      className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-white hover:bg-slate-800"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Forma de Pago */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Método de Pago</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['efectivo', 'debito', 'transferencia'] as PaymentMethod[]).map(method => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setSalePaymentMethod(method)}
                        className={`py-2 rounded-xl text-[10px] font-bold uppercase transition-all border cursor-pointer ${
                          salePaymentMethod === method
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {method === 'efectivo' && '💵 Efec.'}
                        {method === 'debito' && '💳 Déb.'}
                        {method === 'transferencia' && '📲 Trans.'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Patente Asociada (Opcional) */}
                <div className="space-y-1.5">
                  <label htmlFor="salePlate" className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Asociar a Vehículo Estacionado (Opcional)</label>
                  <select
                    id="salePlate"
                    value={salePlate}
                    onChange={(e) => setSalePlate(e.target.value)}
                    className="w-full bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 text-xs text-slate-300 focus:outline-hidden"
                  >
                    <option value="">-- Cliente Particular (Sin auto) --</option>
                    {activeVehicles.map(plate => (
                      <option key={plate} value={plate}>🚗 Patente: {plate}</option>
                    ))}
                  </select>
                </div>

                {/* Observaciones de Venta */}
                <div className="space-y-1.5">
                  <label htmlFor="saleNotes" className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Notas de Venta</label>
                  <input
                    id="saleNotes"
                    type="text"
                    placeholder="e.g. Entregado al cliente, pendiente de retiro..."
                    value={saleNotes}
                    onChange={(e) => setSaleNotes(e.target.value)}
                    className="w-full bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-hidden"
                  />
                </div>

                {/* Desglose de Caja / IVA */}
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-850/60 text-xs font-mono space-y-2">
                  <div className="flex justify-between text-slate-500 text-[10px]">
                    <span>Precio Unitario:</span>
                    <span>{formatCurrency(selectedItemForSale.price, settings.currency)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[10px]">
                    <span>Cantidad:</span>
                    <span>{saleQuantity} unidades</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[10px]">
                    <span>IVA Recargo ({selectedItemForSale.ivaRate !== undefined ? selectedItemForSale.ivaRate : 19}%):</span>
                    <span>Incluido en el total</span>
                  </div>
                  <hr className="border-slate-800/80" />
                  <div className="flex justify-between items-baseline font-sans">
                    <span className="text-white font-bold uppercase text-[10px]">Monto Total:</span>
                    <span className="font-mono font-black text-lg text-emerald-400">
                      {formatCurrency(selectedItemForSale.price * saleQuantity, settings.currency)}
                    </span>
                  </div>
                </div>

                {/* Botón de Confirmación */}
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl shadow-lg hover:shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  Registrar Cobro
                </button>
              </form>
            ) : (
              <div className="bg-slate-950/20 p-8 rounded-2xl border border-slate-800 border-dashed text-center text-slate-500 text-xs font-mono space-y-2 py-12">
                <ShoppingBag className="w-8 h-8 text-slate-600 mx-auto" />
                <p>[ Tienda en Espera ]</p>
                <p className="text-[10px] text-slate-600 font-sans leading-relaxed max-w-[200px] mx-auto">
                  Selecciona el botón <strong>&quot;Vender&quot;</strong> en cualquier accesorio del catálogo o escanea un código de barras para iniciar.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 2: GESTIÓN DE INVENTARIO */}
      {subTab === 'inventory' && (
        <div className="space-y-6">
          
          {/* Barra de Filtros y Botón Añadir */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/80 shadow-2xl backdrop-blur-md">
            <div>
              <h3 className="font-bold text-white text-base">Control Físico y Auditoría de Stock</h3>
              <p className="text-slate-400 text-xs mt-0.5">Definición de productos, ajuste rápido de stock y alarmas críticas.</p>
            </div>

            <button
              onClick={handleOpenCreateModal}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Ingresar Producto
            </button>
          </div>

          {/* Tabla de Productos del Inventario */}
          <div className="bg-slate-950/40 rounded-2xl border border-slate-800/80 shadow-2xl overflow-hidden backdrop-blur-md">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800/60 text-slate-500 text-[10px] font-bold uppercase tracking-wider bg-slate-950/10">
                  <th className="py-4 px-6">Código / SKU</th>
                  <th className="py-4 px-6">Accesorio / Marca</th>
                  <th className="py-4 px-6">Categoría</th>
                  <th className="py-4 px-6 text-right">Precio Público</th>
                  <th className="py-4 px-6 text-center">Color / Fragr.</th>
                  <th className="py-4 px-6 text-center">Peso</th>
                  <th className="py-4 px-6 text-center">Stock Disponible</th>
                  <th className="py-4 px-6 text-center">Ajuste Rápido</th>
                  <th className="py-4 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {inventory.map((item) => {
                  const isLowStock = item.stock <= item.minStock;
                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-slate-900/20 transition-colors ${
                        isLowStock ? 'bg-amber-950/5' : ''
                      }`}
                    >
                      {/* SKU / Código */}
                      <td className="py-4 px-6 font-mono text-[11px] text-slate-400">
                        {item.barcode ? (
                          <span className="bg-slate-950 border border-slate-850 px-2.5 py-1 rounded text-slate-300">
                            {item.barcode}
                          </span>
                        ) : (
                          <span className="text-slate-600">S/N - Generado</span>
                        )}
                      </td>

                      {/* Nombre y Marca */}
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          <p className="font-bold text-white text-sm">{item.name}</p>
                          <div className="flex gap-1.5">
                            {item.brand && (
                              <span className="text-[9px] uppercase font-bold text-blue-400 bg-blue-950/30 px-1.5 py-0.5 rounded border border-blue-900/20">
                                {item.brand}
                              </span>
                            )}
                            {item.description && (
                              <span className="text-[10px] text-slate-500 max-w-[150px] truncate">
                                {item.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Categoría */}
                      <td className="py-4 px-6">
                        <span className="text-[10px] uppercase font-bold tracking-wide text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-850">
                          {item.category}
                        </span>
                      </td>

                      {/* Precio */}
                      <td className="py-4 px-6 text-right font-mono font-bold text-emerald-400">
                        {formatCurrency(item.price, settings.currency)}
                      </td>

                      {/* Color & Fragancia */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {item.color ? (
                            <span className="text-[10px] text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-850">
                              🎨 {item.color}
                            </span>
                          ) : null}
                          {item.fragrance ? (
                            <span className="text-[10px] text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-850">
                              🌸 {item.fragrance}
                            </span>
                          ) : null}
                          {!item.color && !item.fragrance && (
                            <span className="text-slate-600 font-mono">-</span>
                          )}
                        </div>
                      </td>

                      {/* Peso */}
                      <td className="py-4 px-6 text-center font-mono text-slate-400">
                        {item.weightValue ? (
                          <span>{item.weightValue} {item.weightUnit}</span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Stock */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <span className={`font-mono font-black px-2.5 py-1 rounded-lg text-xs border ${
                            item.stock <= 0
                              ? 'bg-rose-950/50 text-rose-400 border-rose-900/55 animate-pulse'
                              : isLowStock
                                ? 'bg-amber-950/50 text-amber-400 border-amber-900/55 animate-pulse'
                                : 'bg-slate-900 text-slate-200 border-slate-850'
                          }`}>
                            {item.stock} u.
                          </span>
                          <span className="text-[9px] text-slate-500 font-semibold font-sans uppercase">
                            Min: {item.minStock} u.
                          </span>
                        </div>
                      </td>

                      {/* Ajuste Rápido */}
                      <td className="py-4 px-6 text-center">
                        <div className="inline-flex gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-850">
                          <button
                            onClick={() => handleQuickStockAdjust(item.id, item.stock, -1)}
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                            title="Restar 1 unidad"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleQuickStockAdjust(item.id, item.stock, 1)}
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                            title="Sumar 1 unidad"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                            title="Editar producto"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`¿Está seguro de eliminar "${item.name}"? Esta acción no se puede deshacer.`)) {
                                onDeleteProduct(item.id);
                                triggerSuccess('Producto eliminado del catálogo');
                              }
                            }}
                            className="p-1.5 bg-slate-950 hover:bg-rose-950/40 hover:text-rose-400 border border-slate-850 hover:border-rose-900/50 rounded-lg text-slate-500 transition-all cursor-pointer"
                            title="Eliminar producto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* TAB 3: REGISTRO DE VENTAS */}
      {subTab === 'sales' && (() => {
        const totalAccSales = accessorySales.reduce((sum, s) => sum + s.totalPrice, 0);
        const totalAccNet = accessorySales.reduce((sum, s) => {
          if (s.netPrice !== undefined) return sum + s.netPrice;
          const rate = s.ivaRate !== undefined ? s.ivaRate : 19;
          return sum + Math.round(s.totalPrice / (1 + rate / 100));
        }, 0);
        const totalAccIva = totalAccSales - totalAccNet;

        return (
          <div className="bg-slate-950/40 rounded-2xl border border-slate-800/80 shadow-2xl overflow-hidden">
            
            <div className="px-6 py-4 border-b border-slate-800/80 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-950/20">
              <div>
                <h3 className="font-bold text-white text-sm">Historial de Ventas de Accesorios</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Control de auditoría y facturación de productos anexos con registro de IVA.</p>
              </div>
              
              {/* Monto acumulado de ventas de accesorios */}
              <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-850">
                  <span className="text-slate-500 font-bold uppercase">Neto:</span>
                  <span className="font-bold text-slate-300">
                    {formatCurrency(totalAccNet, settings.currency)}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-850">
                  <span className="text-slate-500 font-bold uppercase">IVA:</span>
                  <span className="font-bold text-slate-300">
                    {formatCurrency(totalAccIva, settings.currency)}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-900/50 px-3 py-1.5 rounded-xl">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-500 font-bold uppercase">Total Facturado:</span>
                  <span className="font-bold text-emerald-400">
                    {formatCurrency(totalAccSales, settings.currency)}
                  </span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto text-xs">
              {accessorySales.length === 0 ? (
                <div className="p-12 text-center text-slate-500 font-mono text-xs">
                  [ No hay ventas registradas en el historial ]
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/60 text-slate-500 text-[10px] font-bold uppercase tracking-wider bg-slate-950/10">
                      <th className="py-3.5 px-6">Fecha y Hora</th>
                      <th className="py-3.5 px-6">Accesorio</th>
                      <th className="py-3.5 px-6 text-center">Cant.</th>
                      <th className="py-3.5 px-6 text-right">P. Unitario</th>
                      <th className="py-3.5 px-6 text-right">Monto Neto</th>
                      <th className="py-3.5 px-6 text-right">IVA Cobrado</th>
                      <th className="py-3.5 px-6 text-right font-black">Total</th>
                      <th className="py-3.5 px-6">Medio de Pago</th>
                      <th className="py-3.5 px-6">Cliente (Vehículo)</th>
                      <th className="py-3.5 px-6">Notas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {[...accessorySales].reverse().map((sale) => {
                      const currentIvaRate = sale.ivaRate !== undefined ? sale.ivaRate : 19;
                      const calculatedNet = sale.netPrice !== undefined ? sale.netPrice : Math.round(sale.totalPrice / (1 + currentIvaRate / 100));
                      const calculatedIva = sale.ivaAmount !== undefined ? sale.ivaAmount : (sale.totalPrice - calculatedNet);

                      return (
                        <tr key={sale.id} className="hover:bg-slate-900/30 text-slate-300">
                          
                          {/* Fecha */}
                          <td className="py-4 px-6 font-mono text-[11px] text-slate-400">
                            {new Date(sale.timestamp).toLocaleString('es-CL', {
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                          </td>

                          {/* Producto */}
                          <td className="py-4 px-6 font-bold text-slate-200">
                            {sale.itemName}
                          </td>

                          {/* Cantidad */}
                          <td className="py-4 px-6 text-center font-mono font-bold">
                            {sale.quantity}
                          </td>

                          {/* Precio Unitario */}
                          <td className="py-4 px-6 text-right font-mono text-slate-400">
                            {formatCurrency(sale.unitPrice, settings.currency)}
                          </td>

                          {/* Neto */}
                          <td className="py-4 px-6 text-right font-mono text-slate-400">
                            {formatCurrency(calculatedNet, settings.currency)}
                          </td>

                          {/* IVA */}
                          <td className="py-4 px-6 text-right font-mono text-slate-400">
                            <div className="space-y-0.5">
                              <p>{formatCurrency(calculatedIva, settings.currency)}</p>
                              <p className="text-[8px] text-slate-500 font-semibold">({currentIvaRate}%)</p>
                            </div>
                          </td>

                          {/* Total */}
                          <td className="py-4 px-6 text-right font-mono font-black text-emerald-400">
                            {formatCurrency(sale.totalPrice, settings.currency)}
                          </td>

                          {/* Medio Pago */}
                          <td className="py-4 px-6">
                            <span className="text-[9px] uppercase tracking-wider text-slate-300 font-medium bg-slate-950 border border-slate-850 px-2 py-0.5 rounded">
                              {sale.paymentMethod === 'efectivo' && '💵 Efectivo'}
                              {sale.paymentMethod === 'debito' && '💳 Débito'}
                              {sale.paymentMethod === 'transferencia' && '📲 Transf.'}
                            </span>
                          </td>

                          {/* Vehículo */}
                          <td className="py-4 px-6">
                            {sale.buyerPlate ? (
                              <span className="font-mono bg-slate-900 border border-slate-850/60 text-slate-300 font-bold px-2 py-0.5 rounded text-[11px]">
                                🚗 {sale.buyerPlate}
                              </span>
                            ) : (
                              <span className="text-slate-600 font-mono">-</span>
                            )}
                          </td>

                          {/* Notas */}
                          <td className="py-4 px-6 text-slate-500 italic max-w-[150px] truncate">
                            {sale.notes || '-'}
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

          </div>
        );
      })()}

      {/* MODAL / FORMULARIO CREAR O EDITAR PRODUCTO */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in max-h-[90vh] flex flex-col">
            
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-500" />
                <h4 className="font-bold text-white text-sm">
                  {editingItem ? 'Editar Accesorio del Catálogo' : 'Ingresar Nuevo Accesorio'}
                </h4>
              </div>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 gap-4">
                {/* Fila 1: Nombre y Marca */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Nombre del Producto</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Aromatizante Gel Premium"
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      className="w-full bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs text-white focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Marca / Proveedor</label>
                    <input
                      type="text"
                      placeholder="Ej. Glade, Meguiars, Sonax"
                      value={prodBrand}
                      onChange={(e) => setProdBrand(e.target.value)}
                      className="w-full bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs text-white focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Fila 2: Categoría y Código SKU/Barras */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Categoría</label>
                    <select
                      value={prodCategory}
                      onChange={(e) => setProdCategory(e.target.value)}
                      className="w-full bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs text-slate-300 focus:outline-hidden focus:border-blue-500"
                    >
                      {categories.filter(c => c !== 'Todas').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Código de Barras / SKU / QR</label>
                    <input
                      type="text"
                      placeholder="Ej. 7801234567890"
                      value={prodBarcode}
                      onChange={(e) => setProdBarcode(e.target.value)}
                      className="w-full bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs text-white font-mono focus:outline-hidden focus:border-blue-500 scan-capture"
                    />
                  </div>
                </div>

                {/* Fila 3: Color, Fragancia y Peso */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Color</label>
                    <input
                      type="text"
                      placeholder="Ej. Azul, Negro, Transparente"
                      value={prodColor}
                      onChange={(e) => setProdColor(e.target.value)}
                      className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs text-white focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Fragancia / Aroma</label>
                    <input
                      type="text"
                      placeholder="Ej. Lavanda, Vainilla, Citrus"
                      value={prodFragrance}
                      onChange={(e) => setProdFragrance(e.target.value)}
                      className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs text-white focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                  <div className="flex gap-1.5 items-end">
                    <div className="flex-1">
                      <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Peso / Contenido</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Ej. 250"
                        value={prodWeightValue}
                        onChange={(e) => setProdWeightValue(e.target.value !== '' ? Number(e.target.value) : '')}
                        className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs text-white font-mono focus:outline-hidden focus:border-blue-500"
                      />
                    </div>
                    <select
                      value={prodWeightUnit}
                      onChange={(e) => setProdWeightUnit(e.target.value as 'gr' | 'ml')}
                      className="bg-slate-950 px-2 py-2 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono focus:outline-hidden"
                    >
                      <option value="gr">gr</option>
                      <option value="ml">ml</option>
                    </select>
                  </div>
                </div>

                {/* Fila 4: Precio, IVA, Stock, Stock Mínimo */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Precio de Venta</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      required
                      value={prodPrice}
                      onChange={(e) => setProdPrice(Number(e.target.value))}
                      className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs text-white font-mono font-bold focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Tasa IVA (%)</label>
                    <select
                      value={prodIvaRate}
                      onChange={(e) => setProdIvaRate(Number(e.target.value))}
                      className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono focus:outline-hidden focus:border-blue-500"
                    >
                      <option value="19">19% (Estándar)</option>
                      <option value="10">10% (Reducido)</option>
                      <option value="5">5% (Preferencial)</option>
                      <option value="0">0% (Exento)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Stock Inicial</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={prodStock}
                      onChange={(e) => setProdStock(Number(e.target.value))}
                      className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs text-white font-mono focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Stock Mínimo</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={prodMinStock}
                      onChange={(e) => setProdMinStock(Number(e.target.value))}
                      className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs text-white font-mono focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Descripción o Atributos Adicionales (Opcional)</label>
                  <textarea
                    placeholder="Ej. Medidas 40x40cm, densidad de absorción premium, biodegradable..."
                    value={prodDesc}
                    onChange={(e) => setProdDesc(e.target.value)}
                    rows={2.5}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-hidden focus:border-blue-500 resize-none"
                  />
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="pt-4 border-t border-slate-850 flex justify-end gap-2 mt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-950 transition-colors border border-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider py-2.5 px-5 rounded-xl shadow-lg shadow-blue-900/30 transition-all cursor-pointer"
                >
                  {editingItem ? 'Guardar Cambios' : 'Ingresar Accesorio'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
