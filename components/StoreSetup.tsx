
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Pencil, Save, X, Building2, User, Phone, MapPin, Search, Calendar, CheckCircle2, Store as StoreIcon, AlertCircle, RefreshCcw, FileDigit, SlidersHorizontal, BarChart4, Lock } from 'lucide-react';
import { Input } from './Input';
import { Store, InventoryItem, User as UserType } from '../types';
import { NepaliDatePicker } from './NepaliDatePicker';

interface StoreSetupProps {
  currentUser: UserType;
  currentFiscalYear: string;
  stores: Store[];
  onAddStore: (store: Store) => void;
  onUpdateStore: (store: Store) => void;
  onDeleteStore: (storeId: string) => void;
  inventoryItems?: InventoryItem[]; 
  onUpdateInventoryItem?: (item: InventoryItem) => void; 
}

export const StoreSetup: React.FC<StoreSetupProps> = ({ 
  currentUser,
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

  // Security Guard: Admin and Super Admin only
  const isAuthorized = currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN';

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

  if (!isAuthorized) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 animate-in fade-in zoom-in-95">
            <div className="bg-red-50 p-6 rounded-full mb-4"><Lock size={48} className="text-red-400" /></div>
            <h3 className="text-xl font-bold text-slate-700 font-nepali mb-2">पहुँच अस्वीकृत (Access Denied)</h3>
            <p className="text-sm text-slate-500 max-w-md text-center">स्टोर सेटअप व्यवस्थापन गर्न तपाईंलाई अनुमति छैन। कृपया एडमिनसँग सम्पर्क गर्नुहोस्।</p>
        </div>
    );
  }

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

    if (editingStoreId) {
      const updatedStore: Store = {
        id: editingStoreId,
        regNo: stores.find(s => s.id === editingStoreId)?.regNo || generateStoreRegNo(), 
        ...formData,
      };
      onUpdateStore(updatedStore);
      setSuccessMessage('गोदाम सफलतापूर्वक अपडेट भयो!');
    } else {
      const newStore: Store = {
        id: Date.now().toString(),
        regNo: generateStoreRegNo(),
        ...formData,
      };
      onAddStore(newStore);
      setSuccessMessage('गोदाम सफलतापूर्वक दर्ता भयो!');
    }

    setShowForm(false);
    resetForm();
  };

  const handleDeleteClick = (storeId: string) => {
    if (window.confirm('के तपाईं निश्चित हुनुहुन्छ?')) {
      onDeleteStore(storeId);
      setSuccessMessage('गोदाम सफलतापूर्वक डिलिट भयो।');
    }
  };

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.regNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.address.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => a.name.localeCompare(b.name)); 

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-orange-100 p-2 rounded-lg text-orange-600"><StoreIcon size={24} /></div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 font-nepali">स्टोर सेटअप (Store Setup)</h2>
            <p className="text-sm text-slate-500">गोदामहरू र स्टक लेभल व्यवस्थापन गर्नुहोस्।</p>
          </div>
        </div>
        {!showForm && (
          <div className="flex gap-2">
             <button onClick={() => setShowStockLevelModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"><SlidersHorizontal size={18} /><span className="font-nepali">स्टक लेभल</span></button>
             <button onClick={handleAddNew} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors shadow-sm"><Plus size={18} /><span className="font-nepali">नयाँ गोदाम</span></button>
          </div>
        )}
      </div>

      {successMessage && <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl shadow-sm flex items-center gap-3"><CheckCircle2 size={24} className="text-green-500" /><div className="flex-1 text-green-800 font-medium">{successMessage}</div><button onClick={() => setSuccessMessage(null)}><X size={20} className="text-green-400" /></button></div>}

      {showForm && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-6 border-b pb-2"><h3 className="font-semibold text-slate-700">{editingStoreId ? 'गोदाम विवरण सच्याउनुहोस्' : 'नयाँ गोदाम विवरण'}</h3><button onClick={() => setShowForm(false)}><X size={20} className="text-slate-400" /></button></div>
          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-x-6 gap-y-4">
            <div className="md:col-span-2 bg-slate-50 p-4 rounded-lg border grid md:grid-cols-2 gap-4">
                <Input label="आर्थिक वर्ष" value={formData.fiscalYear} readOnly className="bg-slate-100" icon={<Calendar size={16} />} />
                <Input label="गोदाम दर्ता नं." value={editingStoreId ? (stores.find(s => s.id === editingStoreId)?.regNo || '-') : generateStoreRegNo()} readOnly className="font-mono text-orange-600" icon={<FileDigit size={16} />} />
            </div>
            <Input label="गोदामको नाम" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required icon={<Building2 size={16} />} />
            <Input label="ठेगाना" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required icon={<MapPin size={16} />} />
            <Input label="सम्पर्क व्यक्ति" value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} icon={<User size={16} />} />
            <Input label="सम्पर्क फोन नं." type="tel" value={formData.contactPhone} onChange={e => setFormData({...formData, contactPhone: e.target.value})} icon={<Phone size={16} />} />
            <div className="md:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">रद्द</button><button type="submit" className="bg-primary-600 text-white px-6 py-2 rounded-lg text-sm">सुरक्षित गर्नुहोस्</button></div>
          </form>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="font-semibold text-slate-700 font-nepali">दर्ता भएका गोदामहरू ({filteredStores.length})</h3>
          <div className="relative w-full sm:w-72"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="खोज्नुहोस्..." className="w-full pl-9 pr-4 py-2 rounded-lg border outline-none text-sm" /></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b"><tr><th className="px-6 py-3">Reg No</th><th className="px-6 py-3">Name</th><th className="px-6 py-3">Address</th><th className="px-6 py-3">Contact</th><th className="px-6 py-3 text-right">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStores.map((store) => (
                <tr key={store.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-orange-600">{store.regNo}</td>
                  <td className="px-6 py-4 font-medium">{store.name}</td>
                  <td className="px-6 py-4 text-slate-600">{store.address}</td>
                  <td className="px-6 py-4 text-slate-600">{store.contactPerson || '-'}<br/><span className="text-xs">{store.contactPhone}</span></td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                        <button onClick={() => handleEditClick(store)} className="text-primary-400 hover:text-primary-600 p-1"><Pencil size={16} /></button>
                        <button onClick={() => handleDeleteClick(store.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
