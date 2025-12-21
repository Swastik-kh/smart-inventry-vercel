
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Pencil, Save, X, Building2, User, Phone, MapPin, Search, Calendar, CheckCircle2, Store as StoreIcon, AlertCircle, RefreshCcw, FileDigit, SlidersHorizontal, BarChart4 } from 'lucide-react';
import { Input } from './Input';
import { Store, InventoryItem } from '../types';
import { NepaliDatePicker } from './NepaliDatePicker';

interface StoreSetupProps {
  currentFiscalYear: string;
  stores: Store[];
  onAddStore: (store: Store) => void;
  onUpdateStore: (store: Store) => void;
  onDeleteStore: (storeId: string) => void;
  inventoryItems?: InventoryItem[]; 
  onUpdateInventoryItem?: (item: InventoryItem) => void; 
}

export const StoreSetup: React.FC<StoreSetupProps> = ({ 
  currentFiscalYear, 
  stores, 
  onAddStore, 
  onUpdateStore, 
  onDeleteStore,
  inventoryItems = [],
  onUpdateInventoryItem
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contactPerson: '',
    contactPhone: '',
    fiscalYear: currentFiscalYear,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // State for Global Stock Level Configuration Modal
  const [showStockLevelModal, setShowStockLevelModal] = useState(false);

  // Generate unique registration number
  const generateStoreRegNo = () => {
    const fyClean = currentFiscalYear.replace('/', '');
    const maxNum = stores
      .filter(s => s.fiscalYear === currentFiscalYear && s.regNo.startsWith(`S-${fyClean}-`))
      .map(s => parseInt(s.regNo.split('-')[2]))
      .reduce((max, num) => Math.max(max, num), 0);
    
    return `S-${fyClean}-${String(maxNum + 1).padStart(3, '0')}`;
  };

  useEffect(() => {
    if (!editingStoreId && !showForm) {
      setFormData(prev => ({ ...prev, fiscalYear: currentFiscalYear }));
    } else if (editingStoreId) {
        const editingStore = stores.find(s => s.id === editingStoreId);
        if (editingStore && editingStore.fiscalYear !== formData.fiscalYear) {
            setFormData(prev => ({ ...prev, fiscalYear: editingStore.fiscalYear }));
        }
    }
  }, [currentFiscalYear, editingStoreId, showForm, stores]);


  const handleAddNew = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEditClick = (store: Store) => {
    setEditingStoreId(store.id);
    setFormData({
      name: store.name,
      address: store.address,
      contactPerson: store.contactPerson || '',
      contactPhone: store.contactPhone || '',
      fiscalYear: store.fiscalYear,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingStoreId(null);
    setFormData({
      name: '',
      address: '',
      contactPerson: '',
      contactPhone: '',
      fiscalYear: currentFiscalYear,
    });
    setValidationError(null);
    setSuccessMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSuccessMessage(null);

    if (!formData.name.trim()) {
      setValidationError('गोदामको नाम आवश्यक छ। (Store Name is required)');
      return;
    }
    if (!formData.address.trim()) {
      setValidationError('ठेगाना आवश्यक छ। (Address is required)');
      return;
    }
    if (!formData.contactPerson.trim() && !formData.contactPhone.trim()) {
        setValidationError('सम्पर्क व्यक्ति वा फोन नम्बर मध्ये कम्तिमा एउटा आवश्यक छ। (At least one of Contact Person or Phone is required)');
        return;
    }

    if (editingStoreId) {
      const updatedStore: Store = {
        id: editingStoreId,
        regNo: stores.find(s => s.id === editingStoreId)?.regNo || generateStoreRegNo(), 
        ...formData,
      };
      onUpdateStore(updatedStore);
      setSuccessMessage('गोदाम सफलतापूर्वक अपडेट भयो! (Store Updated Successfully!)');
    } else {
      const newStore: Store = {
        id: Date.now().toString(),
        regNo: generateStoreRegNo(),
        ...formData,
      };
      onAddStore(newStore);
      setSuccessMessage('गोदाम सफलतापूर्वक दर्ता भयो! (Store Registered Successfully!)');
    }

    setShowForm(false);
    resetForm();
  };

  const handleDeleteClick = (storeId: string) => {
    if (window.confirm('के तपाईं निश्चित हुनुहुन्छ कि तपाईं यो गोदाम डिलिट गर्न चाहनुहुन्छ? यसले यस गोदामसँग सम्बन्धित सबै मौज्दात वस्तुहरू पनि डिलिट गर्न सक्छ। (Are you sure you want to delete this store? This might also remove all inventory items associated with this store.)')) {
      onDeleteStore(storeId);
      setSuccessMessage('गोदाम सफलतापूर्वक डिलिट भयो। (Store Deleted Successfully.)');
    }
  };

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.regNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.contactPhone?.includes(searchTerm)
  ).sort((a, b) => a.name.localeCompare(b.name)); 

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
            <StoreIcon size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 font-nepali">स्टोर सेटअप (Store Setup)</h2>
            <p className="text-sm text-slate-500">नयाँ गोदामहरू दर्ता गर्नुहोस् र साझा स्टक लेभल (ASL/EOP) व्यवस्थापन गर्नुहोस्।</p>
          </div>
        </div>
        {!showForm && (
          <div className="flex gap-2">
             <button 
                onClick={() => setShowStockLevelModal(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
             >
                <SlidersHorizontal size={18} />
                <span className="font-nepali">स्टक लेभल (Stock Levels)</span>
             </button>
             <button 
                onClick={handleAddNew}
                className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
             >
                <Plus size={18} />
                <span className="font-nepali">नयाँ गोदाम (New Store)</span>
             </button>
          </div>
        )}
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl shadow-sm flex items-center gap-3 animate-in slide-in-from-top-2">
          <div className="text-green-500">
            <CheckCircle2 size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-green-800 font-bold text-lg font-nepali">सफल भयो (Success)</h3>
            <p className="text-green-700 text-sm">{successMessage}</p>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-green-400 hover:text-green-600 transition-colors">
            <X size={20} />
          </button>
        </div>
      )}
      {validationError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex items-start gap-3 animate-in slide-in-from-top-2">
          <div className="text-red-500 mt-0.5">
            <AlertCircle size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-red-800 font-bold text-sm">विवरण मिलेन (Validation Error)</h3>
            <p className="text-red-700 text-sm mt-1 whitespace-pre-line leading-relaxed">{validationError}</p>
          </div>
          <button onClick={() => setValidationError(null)} className="text-red-400 hover:text-red-600 transition-colors">
            <X size={20} />
          </button>
        </div>
      )}

      {/* Form Section */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-2">
            <h3 className="font-semibold text-slate-700">
                {editingStoreId ? 'गोदाम विवरण सच्याउनुहोस् (Edit Store)' : 'नयाँ गोदाम विवरण (New Store)'}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-x-6 gap-y-4">
            
            <div className="md:col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-100 grid md:grid-cols-2 gap-4">
                <Input
                    label="आर्थिक वर्ष (Fiscal Year)"
                    value={formData.fiscalYear}
                    readOnly
                    className="bg-slate-100 text-slate-600 font-medium cursor-not-allowed"
                    icon={<Calendar size={16} />}
                />
                <Input
                    label="गोदाम दर्ता नं. (Store Reg No)"
                    value={editingStoreId ? (stores.find(s => s.id === editingStoreId)?.regNo || '-') : generateStoreRegNo()}
                    readOnly
                    className="font-mono font-bold text-orange-600"
                    icon={<FileDigit size={16} />}
                />
            </div>

            <Input 
              label="गोदामको नाम (Store Name)"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              required
              placeholder="e.g. Main Store, Sub Store A"
              icon={<Building2 size={16} />}
            />
            
            <Input 
              label="ठेगाना (Address)"
              value={formData.address}
              onChange={e => setFormData({...formData, address: e.target.value})}
              required
              placeholder="e.g. Municipality-Ward, District"
              icon={<MapPin size={16} />}
            />

            <Input 
              label="सम्पर्क व्यक्ति (Contact Person)"
              value={formData.contactPerson}
              onChange={e => setFormData({...formData, contactPerson: e.target.value})}
              placeholder="e.g. Ram Prasad Sharma"
              icon={<User size={16} />}
            />

            <Input 
              label="सम्पर्क फोन नं. (Contact Phone)"
              type="tel"
              value={formData.contactPhone}
              onChange={e => setFormData({...formData, contactPhone: e.target.value})}
              placeholder="e.g. 98XXXXXXXX"
              icon={<Phone size={16} />}
            />

            <div className="md:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
              <button 
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
              >
                रद्द गर्नुहोस् (Cancel)
              </button>
              <button 
                type="submit"
                className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 text-sm font-medium shadow-sm"
              >
                <Save size={16} />
                {editingStoreId ? 'अपडेट गर्नुहोस् (Update)' : 'सुरक्षित गर्नुहोस् (Save)'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Store List Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <h3 className="font-semibold text-slate-700 font-nepali">दर्ता भएका गोदामहरू (Registered Stores)</h3>
             <span className="text-xs font-medium bg-slate-200 text-slate-600 px-2 py-1 rounded-full">{filteredStores.length}</span>
          </div>
          
          <div className="relative w-full sm:w-72">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Search size={16} />
            </div>
            <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="गोदामको नाम, ठेगाना वा सम्पर्क खोज्नुहोस्..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none text-sm transition-all"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-semibold text-slate-700">Reg No</th>
                <th className="px-6 py-3 font-semibold text-slate-700">Name</th>
                <th className="px-6 py-3 font-semibold text-slate-700">Address</th>
                <th className="px-6 py-3 font-semibold text-slate-700">Contact</th>
                <th className="px-6 py-3 font-semibold text-slate-700">Fiscal Year</th>
                <th className="px-6 py-3 font-semibold text-slate-700 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStores.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 italic">
                    {searchTerm ? 'कुनै नतिजा फेला परेन (No matching records)' : 'कुनै गोदाम दर्ता भएको छैन (No stores registered)'}
                  </td>
                </tr>
              ) : (
                filteredStores.map((store) => (
                  <tr key={store.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-orange-600 whitespace-nowrap">{store.regNo}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">{store.name}</td>
                    <td className="px-6 py-4 text-slate-600">{store.address}</td>
                    <td className="px-6 py-4 text-slate-600">
                        {store.contactPerson && <div>{store.contactPerson}</div>}
                        {store.contactPhone && <div className="text-xs font-mono">{store.contactPhone}</div>}
                        {!store.contactPerson && !store.contactPhone && '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-nepali">{store.fiscalYear}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                          <button 
                              onClick={() => handleEditClick(store)}
                              className="text-primary-400 hover:text-primary-600 p-1 rounded hover:bg-primary-50 transition-colors"
                              title="Edit Store"
                          >
                              <Pencil size={16} />
                          </button>
                          <button 
                              onClick={() => handleDeleteClick(store.id)}
                              className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                              title="Delete Store"
                          >
                              <Trash2 size={16} />
                          </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Global Stock Level Configuration Modal */}
      {showStockLevelModal && (
          <StockLevelConfigurationModal
              isOpen={showStockLevelModal}
              onClose={() => setShowStockLevelModal(false)}
              inventoryItems={inventoryItems}
              onUpdateInventoryItem={onUpdateInventoryItem}
          />
      )}
    </div>
  );
};

// Sub-component for configuring ASL and EOP (GLOBAL)
interface StockLevelConfigurationModalProps {
    isOpen: boolean;
    onClose: () => void;
    inventoryItems: InventoryItem[];
    onUpdateInventoryItem?: (item: InventoryItem) => void;
}

const StockLevelConfigurationModal: React.FC<StockLevelConfigurationModalProps> = ({
    isOpen,
    onClose,
    inventoryItems,
    onUpdateInventoryItem
}) => {
    // Map itemName -> { asl, eop }
    const [edits, setEdits] = useState<{ [itemName: string]: { asl: string, eop: string } }>({});
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Extract Unique Items from all stores to display as a master list
    const uniqueItems = useMemo(() => {
        const map = new Map<string, InventoryItem>();
        inventoryItems.forEach(item => {
            if (!map.has(item.itemName)) {
                map.set(item.itemName, item);
            }
        });
        const items = Array.from(map.values());
        // Sort by name
        return items.sort((a, b) => a.itemName.localeCompare(b.itemName));
    }, [inventoryItems]);

    // Initialize local state based on unique items
    useEffect(() => {
        const initialEdits: { [itemName: string]: { asl: string, eop: string } } = {};
        uniqueItems.forEach(item => {
            initialEdits[item.itemName] = {
                asl: item.approvedStockLevel !== undefined ? item.approvedStockLevel.toString() : '',
                eop: item.emergencyOrderPoint !== undefined ? item.emergencyOrderPoint.toString() : ''
            };
        });
        setEdits(initialEdits);
    }, [uniqueItems]);

    const handleInputChange = (itemName: string, field: 'asl' | 'eop', value: string) => {
        setEdits(prev => {
            const currentItemEdit = prev[itemName] || { asl: '', eop: '' };
            let newEop = currentItemEdit.eop;

            // Auto-calculate EOP if ASL changes
            if (field === 'asl') {
                const aslValue = parseFloat(value);
                if (!isNaN(aslValue)) {
                    // EOP = ASL / 5
                    const calculatedEop = Math.ceil(aslValue / 5); 
                    newEop = calculatedEop.toString();
                } else {
                    if (value === '') newEop = '';
                }
            } else if (field === 'eop') {
                newEop = value;
            }

            return {
                ...prev,
                [itemName]: {
                    ...currentItemEdit,
                    asl: field === 'asl' ? value : currentItemEdit.asl,
                    eop: newEop
                }
            };
        });
    };

    const handleSave = () => {
        if (!onUpdateInventoryItem) return;
        setIsSaving(true);

        // Update ALL items in inventory that match the modified names
        // Since onUpdateInventoryItem handles one by one, we iterate.
        // Optimized approach: 
        inventoryItems.forEach(invItem => {
            const edit = edits[invItem.itemName];
            if (!edit) return;

            const newAsl = edit.asl === '' ? undefined : parseFloat(edit.asl);
            const newEop = edit.eop === '' ? undefined : parseFloat(edit.eop);

            // Only update if changed
            if (invItem.approvedStockLevel !== newAsl || invItem.emergencyOrderPoint !== newEop) {
                onUpdateInventoryItem({
                    ...invItem,
                    approvedStockLevel: newAsl,
                    emergencyOrderPoint: newEop
                });
            }
        });

        setTimeout(() => {
            setIsSaving(false);
            onClose();
        }, 500); 
    };

    const displayedItems = uniqueItems.filter(item => 
        item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (item.sanketNo && item.sanketNo.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-blue-50/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                            <BarChart4 size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg font-nepali">स्टक लेभल व्यवस्थापन (Stock Level Configuration)</h3>
                            <p className="text-xs text-slate-500">
                                <strong>साझा सेटिङ (Common Setting):</strong> यहाँ सेट गरिएको ASL/EOP सबै गोदाममा लागू हुनेछ।
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/30">
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <Search size={16} />
                        </div>
                        <input 
                            type="text" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="सामानको नाम वा संकेत नं खोज्नुहोस्..."
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-0">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3 w-12">#</th>
                                <th className="px-6 py-3">सामानको नाम (Item Name)</th>
                                <th className="px-6 py-3">सङ्केत नं. (Code)</th>
                                <th className="px-6 py-3 w-40">ASL (Approved Stock Level)</th>
                                <th className="px-6 py-3 w-40">EOP (Emergency Order Point)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {displayedItems.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">
                                        कुनै सामान फेला परेन। (No items found.)
                                    </td>
                                </tr>
                            ) : (
                                displayedItems.map((item, index) => (
                                    <tr key={item.itemName} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-4 text-slate-500">{index + 1}</td>
                                        <td className="px-6 py-4 font-medium text-slate-800">
                                            {item.itemName}
                                            <span className="text-xs text-slate-400 block">{item.itemClassification}</span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-slate-600">{item.sanketNo || '-'}</td>
                                        <td className="px-6 py-4">
                                            <input 
                                                type="number" 
                                                min="0"
                                                value={edits[item.itemName]?.asl || ''}
                                                onChange={(e) => handleInputChange(item.itemName, 'asl', e.target.value)}
                                                className="w-full border border-slate-300 rounded px-2 py-1 text-right focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                                placeholder="0"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <input 
                                                type="number" 
                                                min="0"
                                                value={edits[item.itemName]?.eop || ''}
                                                onChange={(e) => handleInputChange(item.itemName, 'eop', e.target.value)}
                                                className="w-full border border-slate-300 rounded px-2 py-1 text-right focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none"
                                                placeholder="0"
                                                title="ASL/5"
                                            />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 shrink-0">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                    >
                        रद्द गर्नुहोस् (Cancel)
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving || displayedItems.length === 0}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
                    >
                        <Save size={16} />
                        {isSaving ? 'बचत हुँदैछ...' : 'बचत गर्नुहोस् (Save Changes)'}
                    </button>
                </div>
            </div>
        </div>
    );
};
