import React, { useState, useEffect, useMemo } from 'react';
import { RotateCcw, Plus, Trash2, Printer, Save, ArrowLeft, Search, CheckCircle2, Send, Clock, AlertCircle, Eye, X } from 'lucide-react';
import { InventoryItem, User, ReturnEntry, ReturnItem, IssueReportEntry, OrganizationSettings, Signature } from '../types'; // Added Signature import
import { SearchableSelect } from './SearchableSelect';
import { NepaliDatePicker } from './NepaliDatePicker';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface JinshiFirtaFaramProps {
  currentFiscalYear: string;
  currentUser: User;
  inventoryItems: InventoryItem[];
  returnEntries: ReturnEntry[];
  onSaveReturnEntry: (entry: ReturnEntry) => void;
  issueReports: IssueReportEntry[];
  generalSettings: OrganizationSettings;
}

export const JinshiFirtaFaram: React.FC<JinshiFirtaFaramProps> = ({
  currentFiscalYear,
  currentUser,
  inventoryItems,
  returnEntries,
  onSaveReturnEntry,
  issueReports,
  generalSettings
}) => {
  const [items, setItems] = useState<ReturnItem[]>([
    { id: Date.now(), kharchaNikasaNo: '', codeNo: '', name: '', specification: '', unit: '', quantity: 0, rate: 0, totalAmount: 0, vatAmount: 0, grandTotal: 0, condition: '', remarks: '' }
  ]);

  const [formDetails, setFormDetails] = useState({
    id: '',
    fiscalYear: currentFiscalYear,
    formNo: '1',
    date: '',
    status: 'Pending' as 'Pending' | 'Verified' | 'Approved' | 'Rejected',
    // Fix: Explicitly cast to Signature type to handle optional properties correctly
    returnedBy: { name: currentUser.fullName, designation: currentUser.designation, date: '' } as Signature,
    preparedBy: { name: '', designation: '', date: '' } as Signature,
    recommendedBy: { name: '', designation: '', date: '' } as Signature,
    approvedBy: { name: '', designation: '', date: '' } as Signature,
  });

  const [isViewOnly, setIsViewOnly] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const isStoreKeeper = currentUser.role === 'STOREKEEPER' || currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN';

  const pendingRequests = useMemo(() => 
    returnEntries.filter(e => e.status === 'Pending').sort((a, b) => parseInt(b.formNo) - parseInt(a.formNo)),
  [returnEntries]);

  useEffect(() => {
    if (!formDetails.id) {
        const entriesInFY = returnEntries.filter(e => e.fiscalYear === currentFiscalYear);
        const maxNo = entriesInFY.reduce((max, e) => Math.max(max, parseInt(e.formNo || '0')), 0);
        setFormDetails(prev => ({ ...prev, formNo: (maxNo + 1).toString() }));
    }
  }, [currentFiscalYear, returnEntries, formDetails.id]);

  const returnableItemOptions = useMemo(() => {
    const distinctItems = new Map();
    issueReports.forEach(report => {
        if (report.status === 'Issued' && report.demandBy?.name.trim().toLowerCase() === formDetails.returnedBy.name.trim().toLowerCase()) {
            if (report.itemType === 'Non-Expendable') {
                report.items.forEach(rptItem => {
                    if (!distinctItems.has(rptItem.name)) {
                        const invItem = inventoryItems.find(i => i.itemName.trim().toLowerCase() === rptItem.name.trim().toLowerCase());
                        distinctItems.set(rptItem.name, {
                            id: invItem?.id || rptItem.id.toString(), 
                            value: rptItem.name,
                            label: `${rptItem.name} ${invItem?.uniqueCode ? `(${invItem.uniqueCode})` : ''}`,
                            itemData: invItem || { ...rptItem, itemName: rptItem.name } 
                        });
                    }
                });
            }
        }
    });
    return Array.from(distinctItems.values());
  }, [issueReports, formDetails.returnedBy.name, inventoryItems]);

  const handleAddItem = () => {
    setItems([...items, { id: Date.now(), kharchaNikasaNo: '', codeNo: '', name: '', specification: '', unit: '', quantity: 0, rate: 0, totalAmount: 0, vatAmount: 0, grandTotal: 0, condition: '', remarks: '' }]);
  };

  const handleRemoveItem = (id: number) => {
    if (items.length > 1) setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: number, field: keyof ReturnItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleInventorySelect = (id: number, option: any) => {
    const invItem = option.itemData as InventoryItem;
    setItems(items.map(item => item.id === id ? {
        ...item,
        name: invItem.itemName,
        codeNo: invItem.sanketNo || invItem.uniqueCode || '',
        specification: invItem.specification || '',
        unit: invItem.unit,
        rate: invItem.rate || 0,
    } : item));
  };

  const handleLoadEntry = (entry: ReturnEntry, viewOnly: boolean = false) => {
      setFormDetails({
          id: entry.id,
          fiscalYear: entry.fiscalYear,
          formNo: entry.formNo,
          date: entry.date,
          status: entry.status || 'Pending',
          returnedBy: entry.returnedBy,
          preparedBy: entry.preparedBy,
          recommendedBy: entry.recommendedBy,
          approvedBy: entry.approvedBy
      });
      setItems(entry.items);
      setIsViewOnly(viewOnly);
      setIsSaved(false);
  };

  const handleReset = () => {
      setFormDetails({
        id: '', fiscalYear: currentFiscalYear, formNo: '1', date: '', status: 'Pending',
        returnedBy: { name: currentUser.fullName, designation: currentUser.designation, date: '' } as Signature,
        preparedBy: { name: '', designation: '', date: '' } as Signature,
        recommendedBy: { name: '', designation: '', date: '' } as Signature,
        approvedBy: { name: '', designation: '', date: '' } as Signature,
      });
      setItems([{ id: Date.now(), kharchaNikasaNo: '', codeNo: '', name: '', specification: '', unit: '', quantity: 0, rate: 0, totalAmount: 0, vatAmount: 0, grandTotal: 0, condition: '', remarks: '' }]);
      setIsViewOnly(false);
      setIsSaved(false);
  };

  const handleSave = (statusToSet: 'Pending' | 'Approved' = 'Pending') => {
    if (!formDetails.date) return alert('मिति आवश्यक छ');
    const entry: ReturnEntry = {
        ...formDetails,
        id: formDetails.id || Date.now().toString(),
        items,
        status: statusToSet,
        approvedBy: statusToSet === 'Approved' ? { ...formDetails.approvedBy, name: currentUser.fullName, date: formDetails.date } : formDetails.approvedBy
    };
    onSaveReturnEntry(entry);
    setIsSaved(true);
    setTimeout(() => { setIsSaved(false); handleReset(); }, 1500);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {isStoreKeeper && pendingRequests.length > 0 && (
          <div className="bg-white rounded-xl border border-orange-200 shadow-sm overflow-hidden mb-6">
              <div className="bg-orange-50 px-6 py-3 border-b border-orange-100 flex justify-between items-center text-orange-800">
                  <h3 className="font-bold font-nepali">प्रमाणिकरण अनुरोधहरू</h3>
                  <span className="bg-orange-200 px-2 py-0.5 rounded-full text-xs">{pendingRequests.length}</span>
              </div>
              <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                      {pendingRequests.map(req => (
                          <tr key={req.id} className="hover:bg-slate-50">
                              <td className="px-6 py-3 font-bold">Form {req.formNo}</td>
                              <td className="px-6 py-3">{req.returnedBy.name}</td>
                              <td className="px-6 py-3 text-right">
                                  <button onClick={() => handleLoadEntry(req, false)} className="text-primary-600 bg-primary-50 px-3 py-1.5 rounded-md hover:bg-primary-100 flex items-center gap-1 ml-auto">
                                      <Eye size={14} /> View & Approve
                                  </button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}

      <div id="firta-form-container" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-8 py-4 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-xl font-bold font-nepali">जिन्सी फिर्ता फाराम</h2>
              <button onClick={handleReset} className="p-2 text-slate-400 hover:text-slate-600"><RotateCcw size={20} /></button>
          </div>
          <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <input type="text" placeholder="फिर्ता गर्नेको नाम" value={formDetails.returnedBy.name} onChange={(e) => setFormDetails({...formDetails, returnedBy: {...formDetails.returnedBy, name: e.target.value}})} disabled={isViewOnly} className="border p-2 rounded-lg" />
                  <NepaliDatePicker value={formDetails.date} onChange={(date) => setFormDetails({...formDetails, date})} disabled={isViewOnly} />
                  <input type="text" value={`फाराम नं: ${formDetails.formNo}`} disabled className="border p-2 rounded-lg bg-slate-50" />
              </div>
              <table className="w-full border mb-6">
                  <thead className="bg-slate-50">
                      <tr>
                          <th className="border p-2">विवरण</th>
                          <th className="border p-2 w-24">एकाइ</th>
                          <th className="border p-2 w-24">परिमाण</th>
                          <th className="border p-2">अवस्था</th>
                          {!isViewOnly && <th className="border p-2 w-10"></th>}
                      </tr>
                  </thead>
                  <tbody>
                      {items.map((item) => (
                          <tr key={item.id}>
                              <td className="border p-2">
                                  {isViewOnly ? item.name : 
                                  // Fix: Added the required 'onChange' prop
                                  <SearchableSelect options={returnableItemOptions} value={item.name} onChange={(val) => updateItem(item.id, 'name', val)} onSelect={(opt) => handleInventorySelect(item.id, opt)} />}
                              </td>
                              <td className="border p-2 text-center">{item.unit}</td>
                              <td className="border p-2">
                                  <input type="number" value={item.quantity || ''} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} disabled={isViewOnly} className="w-full text-center" />
                              </td>
                              <td className="border p-2">
                                  <select value={item.condition} onChange={(e) => updateItem(item.id, 'condition', e.target.value)} disabled={isViewOnly} className="w-full">
                                      <option value="">छान्नुहोस्</option>
                                      <option value="Good">राम्रो</option>
                                      <option value="Damaged">बिग्रिएको</option>
                                  </select>
                              </td>
                              {!isViewOnly && <td className="border p-2 text-red-500 cursor-pointer" onClick={() => handleRemoveItem(item.id)}><Trash2 size={16} /></td>}
                          </tr>
                      ))}
                  </tbody>
              </table>
              {!isViewOnly && <button onClick={handleAddItem} className="flex items-center gap-2 text-primary-600 font-bold mb-6"><Plus size={18} /> थप्नुहोस्</button>}
              <div className="flex justify-between border-t pt-6">
                  <button onClick={handleReset} className="border px-6 py-2 rounded-xl">रद्द</button>
                  <div className="flex gap-3">
                      {isStoreKeeper && !isViewOnly && formDetails.status === 'Pending' && (
                          <button onClick={() => handleSave('Approved')} className="bg-green-600 text-white px-8 py-2 rounded-xl font-bold">Approve</button>
                      )}
                      {!isViewOnly && (
                          <button onClick={() => handleSave('Pending')} disabled={isSaved} className="bg-primary-600 text-white px-8 py-2 rounded-xl font-bold">
                              {isSaved ? 'Safe...' : 'Submit'}
                          </button>
                      )}
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};