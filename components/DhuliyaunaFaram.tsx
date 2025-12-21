
import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, Plus, Printer, Save, ArrowLeft, Clock, CheckCircle2, Send, AlertTriangle, Search, X } from 'lucide-react';
import { User, DhuliyaunaEntry, DhuliyaunaItem, InventoryItem, Store } from '../types';
import { SearchableSelect } from './SearchableSelect';
import { Select } from './Select';
import { NepaliDatePicker } from './NepaliDatePicker';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface DhuliyaunaFaramProps {
  currentFiscalYear: string;
  currentUser: User;
  inventoryItems: InventoryItem[];
  dhuliyaunaEntries: DhuliyaunaEntry[];
  onSaveDhuliyaunaEntry: (entry: DhuliyaunaEntry) => void;
  stores?: Store[];
}

export const DhuliyaunaFaram: React.FC<DhuliyaunaFaramProps> = ({
  currentFiscalYear,
  currentUser,
  inventoryItems,
  dhuliyaunaEntries,
  onSaveDhuliyaunaEntry,
  stores = []
}) => {
  const [items, setItems] = useState<DhuliyaunaItem[]>([
    { id: Date.now(), codeNo: '', name: '', specification: '', unit: '', quantity: 0, rate: 0, totalAmount: 0, reason: '', remarks: '' }
  ]);

  const [formDetails, setFormDetails] = useState({
    id: '',
    fiscalYear: currentFiscalYear,
    formNo: '1',
    date: '',
    status: 'Pending' as 'Pending' | 'Approved',
    disposalType: 'Dhuliyauna' as 'Dhuliyauna' | 'Lilaam' | 'Minaha',
    preparedBy: { name: currentUser.fullName, designation: currentUser.designation, date: '' },
    approvedBy: { name: '', designation: '', date: '' },
  });

  const [isViewOnly, setIsViewOnly] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');

  // Calculate Today in Nepali for Restrictions
  const todayBS = useMemo(() => {
      try {
          return new NepaliDate().format('YYYY-MM-DD');
      } catch (e) {
          return '';
      }
  }, []);

  // Determine Roles
  const canApprove = currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'APPROVAL';

  // Filter Lists
  const pendingRequests = useMemo(() => 
    dhuliyaunaEntries.filter(e => e.status === 'Pending').sort((a, b) => parseInt(b.formNo) - parseInt(a.formNo)),
  [dhuliyaunaEntries]);

  const approvedHistory = useMemo(() =>
    dhuliyaunaEntries.filter(e => e.status === 'Approved').sort((a, b) => parseInt(b.formNo) - parseInt(a.formNo)),
  [dhuliyaunaEntries]);

  // Inventory Options
  const inventoryOptions = useMemo(() => {
      let filtered = inventoryItems;
      if (selectedStoreId) {
          filtered = filtered.filter(i => i.storeId === selectedStoreId);
      }
      return filtered.map(item => ({
          id: item.id,
          value: item.itemName,
          label: `${item.itemName} (${item.unit}) - Qty: ${item.currentQuantity}`,
          itemData: item
      }));
  }, [inventoryItems, selectedStoreId]);

  const storeOptions = useMemo(() => stores.map(s => ({ id: s.id, value: s.id, label: s.name })), [stores]);

  // Auto-increment form number logic
  useEffect(() => {
    if (!formDetails.id) {
        const entriesInFY = dhuliyaunaEntries.filter(e => e.fiscalYear === currentFiscalYear);
        const maxNo = entriesInFY.reduce((max, e) => Math.max(max, parseInt(e.formNo || '0')), 0);
        setFormDetails(prev => ({ ...prev, formNo: (maxNo + 1).toString() }));
    }
  }, [currentFiscalYear, dhuliyaunaEntries, formDetails.id]);

  const handleAddItem = () => {
    setItems([...items, { id: Date.now(), codeNo: '', name: '', specification: '', unit: '', quantity: 0, rate: 0, totalAmount: 0, reason: '', remarks: '' }]);
  };

  const handleRemoveItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: number, field: keyof DhuliyaunaItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Auto calculate total
        if (field === 'quantity' || field === 'rate') {
            const qty = field === 'quantity' ? parseFloat(value) || 0 : item.quantity;
            const rate = field === 'rate' ? parseFloat(value) || 0 : item.rate;
            updated.totalAmount = qty * rate;
        }
        return updated;
      }
      return item;
    }));
  };

  // Helper to load expired items
  const handleLoadExpiredItems = () => {
      const today = new Date();
      const expiredItems = inventoryItems.filter(item => {
          if (selectedStoreId && item.storeId !== selectedStoreId) return false;
          if (!item.expiryDateAd) return false;
          return new Date(item.expiryDateAd) < today && item.currentQuantity > 0;
      });

      if (expiredItems.length === 0) {
          alert("म्याद सकिएको कुनै सामान भेटिएन (No expired items found)");
          return;
      }

      const newItems: DhuliyaunaItem[] = expiredItems.map((invItem, index) => ({
          id: Date.now() + index,
          inventoryId: invItem.id,
          codeNo: invItem.uniqueCode || invItem.sanketNo || '',
          name: invItem.itemName,
          specification: invItem.specification || '',
          unit: invItem.unit,
          quantity: invItem.currentQuantity,
          rate: invItem.rate || 0,
          totalAmount: (invItem.currentQuantity) * (invItem.rate || 0),
          reason: 'Expired (म्याद सकिएको)',
          remarks: `Batch: ${invItem.batchNo || '-'}, Exp: ${invItem.expiryDateBs || '-'}`
      }));

      setItems(newItems);
  };

  const handleLoadEntry = (entry: DhuliyaunaEntry, viewOnly: boolean = false) => {
      setFormDetails({
          id: entry.id,
          fiscalYear: entry.fiscalYear,
          formNo: entry.formNo,
          date: entry.date,
          status: entry.status,
          disposalType: entry.disposalType,
          // Fixed: mapped optional properties with empty string fallbacks
          preparedBy: {
              name: entry.preparedBy.name,
              designation: entry.preparedBy.designation || '',
              date: entry.preparedBy.date || ''
          },
          approvedBy: {
              name: entry.approvedBy.name,
              designation: entry.approvedBy.designation || '',
              date: entry.approvedBy.date || ''
          }
      });
      setItems(entry.items);
      setIsViewOnly(viewOnly);
      const formElement = document.getElementById('dhuliyauna-form-container');
      if (formElement) formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleReset = () => {
      setFormDetails({
        id: '',
        fiscalYear: currentFiscalYear,
        formNo: '1', 
        date: '',
        status: 'Pending',
        disposalType: 'Dhuliyauna',
        preparedBy: { name: currentUser.fullName, designation: currentUser.designation, date: '' },
        approvedBy: { name: '', designation: '', date: '' },
      });
      setItems([{ id: Date.now(), codeNo: '', name: '', specification: '', unit: '', quantity: 0, rate: 0, totalAmount: 0, reason: '', remarks: '' }]);
      setIsViewOnly(false);
      setIsSaved(false);
  };

  const handleSave = (statusToSet: 'Pending' | 'Approved') => {
    if (!formDetails.date) {
        alert('मिति आवश्यक छ (Date is required)');
        return;
    }

    const entry: DhuliyaunaEntry = {
        id: formDetails.id || Date.now().toString(),
        fiscalYear: formDetails.fiscalYear,
        formNo: formDetails.formNo,
        date: formDetails.date,
        items: items,
        status: statusToSet,
        disposalType: formDetails.disposalType,
        preparedBy: formDetails.preparedBy,
        approvedBy: statusToSet === 'Approved' ? { ...formDetails.approvedBy, name: currentUser.fullName, date: formDetails.date } : formDetails.approvedBy
    };

    onSaveDhuliyaunaEntry(entry);
    setIsSaved(true);
    setTimeout(() => {
        setIsSaved(false);
        handleReset();
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      
      {/* 1. TOP LIST (PENDING REQUESTS - ADMIN VIEW) */}
      {canApprove && pendingRequests.length > 0 && (
          <div className="bg-white rounded-xl border border-orange-200 shadow-sm overflow-hidden no-print mb-6">
              <div className="bg-orange-50 px-6 py-3 border-b border-orange-100 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-orange-800">
                      <Clock size={18} />
                      <h3 className="font-bold font-nepali">स्वीकृति अनुरोधहरू (Pending Disposal Requests)</h3>
                  </div>
                  <span className="bg-orange-200 text-orange-800 text-xs font-bold px-2 py-0.5 rounded-full">{pendingRequests.length}</span>
              </div>
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 font-medium">
                      <tr>
                          <th className="px-6 py-3">Form No</th>
                          <th className="px-6 py-3">Date</th>
                          <th className="px-6 py-3">Type</th>
                          <th className="px-6 py-3">Items</th>
                          <th className="px-6 py-3 text-right">Action</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {pendingRequests.map(req => (
                          <tr key={req.id} className="hover:bg-slate-50">
                              <td className="px-6 py-3 font-mono font-medium">{req.formNo}</td>
                              <td className="px-6 py-3 font-nepali">{req.date}</td>
                              <td className="px-6 py-3">{req.disposalType}</td>
                              <td className="px-6 py-3 text-slate-600">{req.items.length} items</td>
                              <td className="px-6 py-3 text-right">
                                  <button 
                                    onClick={() => handleLoadEntry(req, false)}
                                    className="text-primary-600 hover:text-primary-800 font-medium text-xs flex items-center justify-end gap-1"
                                  >
                                      <Send size={14} /> Review & Approve
                                  </button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}

      {/* 2. HEADER ACTIONS */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
        <div className="flex items-center gap-4">
            <div className="bg-red-100 p-2 rounded-lg text-red-600">
                <Trash2 size={24} />
            </div>
            <div>
                <h2 className="font-bold text-slate-700 font-nepali text-lg">लिलाम / धुल्याउने (Disposal Form)</h2>
                <div className="flex items-center gap-2">
                    <p className="text-sm text-slate-500">फारम नं: ४०७ / ४०८</p>
                    {formDetails.status === 'Pending' && <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded-full border border-orange-200 font-bold">Pending</span>}
                    {formDetails.status === 'Approved' && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full border border-green-200 font-bold">Approved</span>}
                </div>
            </div>
        </div>
        <div className="flex gap-2">
            {!isViewOnly && (
                <>
                    <button onClick={handleLoadExpiredItems} className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-lg font-medium transition-colors text-xs">
                        <AlertTriangle size={16} /> Load Expired
                    </button>
                    {(canApprove && formDetails.status === 'Pending' && formDetails.id) ? (
                        <button 
                            onClick={() => handleSave('Approved')} 
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg font-medium shadow-sm transition-colors"
                        >
                            <CheckCircle2 size={18} /> Approve
                        </button>
                    ) : (
                        <button 
                            onClick={() => handleSave('Pending')} 
                            disabled={isSaved || formDetails.status === 'Approved'}
                            className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium shadow-sm transition-colors ${
                                isSaved ? 'bg-green-600' : 'bg-primary-600 hover:bg-primary-700'
                            }`}
                        >
                            {isSaved ? <CheckCircle2 size={18} /> : <Send size={18} />}
                            {isSaved ? 'Sent!' : 'Submit Request'}
                        </button>
                    )}
                </>
            )}
            {isViewOnly && (
                <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors">
                    <Plus size={18} /> New
                </button>
            )}
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-lg font-medium shadow-sm transition-colors">
                <Printer size={18} /> Print
            </button>
        </div>
      </div>

      {/* 3. MAIN FORM CONTENT */}
      <div id="dhuliyauna-form-container" className="bg-white p-8 md:p-12 rounded-xl shadow-lg max-w-[210mm] mx-auto min-h-[297mm] text-slate-900 font-nepali text-sm print:shadow-none print:p-0 print:max-w-none">
        
        <div className="text-right text-[10px] font-bold mb-2">
            म.ले.प.फारम नं: ४०७ / ४०८
        </div>

        {/* Header */}
        <div className="mb-8">
             <div className="flex items-start justify-between">
                 <div className="w-24 flex justify-start pt-2">
                     <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png" alt="Emblem" className="h-24 w-24 object-contain"/>
                 </div>
                 <div className="flex-1 text-center space-y-1">
                     <h1 className="text-xl font-bold text-red-600">चौदण्डीगढी नगरपालिका</h1>
                     <h2 className="text-lg font-bold">नगरकार्यपालिकाको कार्यालय</h2>
                     <h3 className="text-base font-bold">स्वास्थ्य शाखा</h3>
                     <h3 className="text-lg font-bold">आधारभूत नगर अस्पताल बेल्टार</h3>
                 </div>
                 <div className="w-24"></div> 
             </div>
             
             <div className="text-center pt-6 pb-2">
                 <h2 className="text-xl font-bold underline underline-offset-4">लिलाम / धुल्याउने (Disposal) फारम</h2>
             </div>
        </div>

        {/* Controls (Internal Use) */}
        {!isViewOnly && (
            <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-3 rounded border border-slate-200 no-print">
                <Select
                    label="प्रकार छान्नुहोस् (Type)"
                    value={formDetails.disposalType}
                    onChange={e => setFormDetails({...formDetails, disposalType: e.target.value as any})}
                    options={[
                        {id: 'd', value: 'Dhuliyauna', label: 'धुल्याउने (Dispose/Destroy)'},
                        {id: 'l', value: 'Lilaam', label: 'लिलाम (Auction)'},
                        {id: 'm', value: 'Minaha', label: 'मिनाहा (Write-off)'}
                    ]}
                />
                <Select
                    label="स्टोर छान्नुहोस् (Store Filter)"
                    value={selectedStoreId}
                    onChange={e => setSelectedStoreId(e.target.value)}
                    options={[{id: 'all', value: '', label: 'All Stores'}, ...storeOptions]}
                />
            </div>
        )}

        {/* Meta Info */}
        <div className="flex justify-between items-end mb-4">
            <div className="w-1/3">
                <div className="font-bold text-lg border-b-2 border-slate-800 inline-block">
                    {formDetails.disposalType === 'Dhuliyauna' ? 'धुल्याउने' : formDetails.disposalType === 'Lilaam' ? 'लिलाम बिक्री' : 'मिनाहा'}
                </div>
            </div>
            <div className="w-1/3 text-right space-y-1">
                <div className="flex items-center justify-end gap-2">
                    <span>फारम नं:</span>
                    <input value={formDetails.formNo} readOnly className="border-b border-dotted border-slate-600 w-24 text-center outline-none bg-transparent font-bold text-red-600"/>
                </div>
                <div className="flex items-center justify-end gap-2">
                    <span>मिति:</span>
                    <NepaliDatePicker 
                        value={formDetails.date}
                        onChange={(val) => setFormDetails({...formDetails, date: val})}
                        format="YYYY/MM/DD"
                        label=""
                        hideIcon={true}
                        inputClassName="border-b border-dotted border-slate-600 w-32 text-center outline-none bg-transparent font-bold placeholder:text-slate-400 placeholder:font-normal rounded-none px-0 py-0 h-auto focus:ring-0 focus:border-slate-600"
                        wrapperClassName="w-32"
                        disabled={isViewOnly || formDetails.status === 'Approved'}
                        popupAlign="right"
                        minDate={todayBS}
                        maxDate={todayBS}
                    />
                </div>
            </div>
        </div>

        {/* Table */}
        <table className="w-full border-collapse border border-slate-900 text-center align-middle">
            <thead>
                <tr className="bg-slate-50 text-xs">
                    <th className="border border-slate-900 p-2 w-10">क्र.सं.</th>
                    <th className="border border-slate-900 p-2 w-24">सङ्केत/कोड नं.</th>
                    <th className="border border-slate-900 p-2 w-64">सामानको नाम</th>
                    <th className="border border-slate-900 p-2 w-16">एकाई</th>
                    <th className="border border-slate-900 p-2 w-16">परिमाण</th>
                    <th className="border border-slate-900 p-2 w-20">दर</th>
                    <th className="border border-slate-900 p-2 w-24">जम्मा रकम</th>
                    <th className="border border-slate-900 p-2">कारण (Reason)</th>
                    <th className="border border-slate-900 p-2 w-32">कैफियत</th>
                    <th className="border border-slate-900 p-2 w-8 no-print"></th>
                </tr>
            </thead>
            <tbody>
                {items.map((item, index) => (
                    <tr key={item.id}>
                        <td className="border border-slate-900 p-1">{index + 1}</td>
                        <td className="border border-slate-900 p-1">
                            <input value={item.codeNo} disabled={isViewOnly} onChange={(e) => updateItem(item.id, 'codeNo', e.target.value)} className="w-full bg-transparent text-center outline-none" />
                        </td>
                        <td className="border border-slate-900 p-1">
                            {!isViewOnly ? (
                                <SearchableSelect
                                    options={inventoryOptions}
                                    value={item.name}
                                    onChange={(val) => updateItem(item.id, 'name', val)}
                                    onSelect={(opt) => {
                                        const invItem = opt.itemData as InventoryItem;
                                        if (invItem) {
                                            setItems(prev => prev.map(row => row.id === item.id ? {
                                                ...row,
                                                inventoryId: invItem.id,
                                                codeNo: invItem.uniqueCode || invItem.sanketNo || '',
                                                unit: invItem.unit,
                                                rate: invItem.rate || 0,
                                                specification: invItem.specification || ''
                                            } : row));
                                        }
                                    }}
                                    className="!border-none !bg-transparent !p-0 !text-sm"
                                    placeholder="Select Item"
                                />
                            ) : (
                                <span className="text-left block px-2">{item.name}</span>
                            )}
                        </td>
                        <td className="border border-slate-900 p-1">
                            <input value={item.unit} disabled={isViewOnly} onChange={(e) => updateItem(item.id, 'unit', e.target.value)} className="w-full bg-transparent text-center outline-none" />
                        </td>
                        <td className="border border-slate-900 p-1">
                            <input type="number" value={item.quantity || ''} disabled={isViewOnly} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} className="w-full bg-transparent text-center outline-none font-bold" />
                        </td>
                        <td className="border border-slate-900 p-1">
                            <input type="number" value={item.rate || ''} disabled={isViewOnly} onChange={(e) => updateItem(item.id, 'rate', e.target.value)} className="w-full bg-transparent text-right outline-none" />
                        </td>
                        <td className="border border-slate-900 p-1 text-right px-2">
                            {item.totalAmount.toFixed(2)}
                        </td>
                        <td className="border border-slate-900 p-1">
                            <input value={item.reason} disabled={isViewOnly} onChange={(e) => updateItem(item.id, 'reason', e.target.value)} className="w-full bg-transparent text-left px-2 outline-none" placeholder="e.g. Expired" />
                        </td>
                        <td className="border border-slate-900 p-1">
                            <input value={item.remarks} disabled={isViewOnly} onChange={(e) => updateItem(item.id, 'remarks', e.target.value)} className="w-full bg-transparent text-left px-2 outline-none" />
                        </td>
                        <td className="border border-slate-900 p-1 no-print">
                            {!isViewOnly && <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button>}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>

        {!isViewOnly && (
            <div className="mt-2 no-print">
                <button onClick={handleAddItem} className="flex items-center gap-1 text-primary-600 hover:text-primary-700 text-xs font-bold px-2 py-1 bg-primary-50 rounded">
                    <Plus size={14} /> Add Row
                </button>
            </div>
        )}

        {/* Footer */}
        <div className="grid grid-cols-2 gap-8 mt-12 text-sm">
            <div>
                <div className="font-bold mb-4">फाँटवालाको दस्तखत:</div>
                <div className="space-y-1">
                    <div className="flex gap-2"><span>नाम:</span><input value={formDetails.preparedBy.name} className="border-b border-dotted border-slate-600 flex-1 outline-none bg-transparent" disabled/></div>
                    <div className="flex gap-2"><span>पद:</span><input value={formDetails.preparedBy.designation} className="border-b border-dotted border-slate-600 flex-1 outline-none bg-transparent" disabled/></div>
                    <div className="flex gap-2"><span>मिति:</span><input value={formDetails.preparedBy.date || formDetails.date} className="border-b border-dotted border-slate-600 flex-1 outline-none bg-transparent" disabled/></div>
                </div>
            </div>
            <div>
                <div className="font-bold mb-4">कार्यालय प्रमुखको दस्तखत:</div>
                <div className="space-y-1">
                    <div className="flex gap-2"><span>नाम:</span><input value={formDetails.approvedBy.name} className="border-b border-dotted border-slate-600 flex-1 outline-none bg-transparent" disabled/></div>
                    <div className="flex gap-2"><span>पद:</span><input value={formDetails.approvedBy.designation} className="border-b border-dotted border-slate-600 flex-1 outline-none bg-transparent" disabled/></div>
                    <div className="flex gap-2"><span>मिति:</span><input value={formDetails.approvedBy.date} className="border-b border-dotted border-slate-600 flex-1 outline-none bg-transparent" disabled/></div>
                </div>
            </div>
        </div>
      </div>

      {/* 4. HISTORY VIEW */}
      {approvedHistory.length > 0 && (
          <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden no-print mt-6">
              <div className="bg-blue-50 px-6 py-3 border-b border-blue-100 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-blue-800">
                      <Clock size={18} />
                      <h3 className="font-bold font-nepali">इतिहास (Approved History)</h3>
                  </div>
                  <span className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">{approvedHistory.length}</span>
              </div>
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 font-medium">
                      <tr>
                          <th className="px-6 py-3">Form No</th>
                          <th className="px-6 py-3">Date</th>
                          <th className="px-6 py-3">Type</th>
                          <th className="px-6 py-3">Items</th>
                          <th className="px-6 py-3 text-right">Action</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {approvedHistory.map(req => (
                          <tr key={req.id} className="hover:bg-slate-50">
                              <td className="px-6 py-3 font-mono font-medium">{req.formNo}</td>
                              <td className="px-6 py-3 font-nepali">{req.date}</td>
                              <td className="px-6 py-3">{req.disposalType}</td>
                              <td className="px-6 py-3">{req.items.length} items</td>
                              <td className="px-6 py-3 text-right">
                                  <button 
                                    onClick={() => handleLoadEntry(req, true)}
                                    className="text-primary-600 hover:text-primary-800 font-medium text-xs flex items-center justify-end gap-1"
                                  >
                                      <ArrowLeft size={14} /> View
                                  </button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}
    </div>
  );
};
