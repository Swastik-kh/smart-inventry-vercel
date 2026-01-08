
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Trash2, Printer, Save, Calendar, CheckCircle2, Send, Clock, FileText, Eye, Search, X, AlertCircle, ChevronRight, ArrowLeft, Check, Square, Warehouse, Layers, ShieldCheck, Info } from 'lucide-react';
import { User, Option, OrganizationSettings, Signature } from '../types/coreTypes';
import { MagItem, MagFormEntry, InventoryItem, Store, StoreKeeperSignature } from '../types/inventoryTypes';
import { SearchableSelect } from './SearchableSelect';
import { Select } from './Select';
import { NepaliDatePicker } from './NepaliDatePicker';
import { InsufficientStockModal } from './InsufficientStockModal';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface LocalMagItem extends MagItem {
  isFromInventory?: boolean;
}

interface MagFaramProps {
  currentFiscalYear: string;
  currentUser: User;
  existingForms: MagFormEntry[];
  onSave: (form: MagFormEntry) => void;
  onDelete?: (formId: string) => void;
  inventoryItems: InventoryItem[];
  stores?: Store[];
  generalSettings: OrganizationSettings;
}

export const MagFaram: React.FC<MagFaramProps> = ({ currentFiscalYear, currentUser, existingForms, onSave, onDelete, inventoryItems, generalSettings, stores = [] }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showVerifyPopup, setShowVerifyPopup] = useState(false);
  const [verificationData, setVerificationData] = useState({ storeId: '', itemType: '' as 'Expendable' | 'Non-Expendable' | '' });
  const [showInsufficientStockModal, setShowInsufficientStockModal] = useState(false);
  const [insufficientStockItems, setInsufficientStockItems] = useState<Array<{ demandedItem: LocalMagItem; availableQuantity: number; }>>([]);

  const todayBS = useMemo(() => {
    try { return new NepaliDate().format('YYYY-MM-DD'); } catch (e) { return ''; }
  }, []);

  const [items, setItems] = useState<LocalMagItem[]>([{ id: Date.now() + Math.random(), name: '', specification: '', unit: '', quantity: '', remarks: '', isFromInventory: false }]);
  
  const [formDetails, setFormDetails] = useState<MagFormEntry>({
    id: '', items: [], fiscalYear: currentFiscalYear, formNo: '', date: todayBS, status: 'Pending',
    demandBy: { name: currentUser.fullName, designation: currentUser.designation, date: todayBS, purpose: '' },
    recommendedBy: { name: '', designation: '', date: '' },
    storeKeeper: { name: '', date: '', verified: false, marketRequired: false, inStock: false },
    receiver: { name: '', designation: '', date: '' }, 
    ledgerEntry: { name: '', designation: '', date: '' },
    approvedBy: { name: '', designation: '', date: '' },
    selectedStoreId: '', issueItemType: 'Expendable', isViewedByRequester: true, decisionNo: '', decisionDate: '', 
  });

  useEffect(() => {
    if (!editingId && !formDetails.id) {
        const fyClean = currentFiscalYear.replace('/', '');
        const formsInCurrentFY = existingForms.filter(f => f.fiscalYear === currentFiscalYear && f.formNo.startsWith(`${fyClean}-`));
        const maxNum = formsInCurrentFY.reduce((max, f) => {
            const parts = f.formNo.split('-');
            const numPart = parts.length > 1 ? parseInt(parts[1]) : 0;
            return isNaN(numPart) ? max : Math.max(max, numPart);
        }, 0);
        setFormDetails(prev => ({ ...prev, formNo: `${fyClean}-${String(maxNum + 1).padStart(3, '0')}` }));
    }
  }, [editingId, existingForms, currentFiscalYear, formDetails.id]);

  const isStrictStoreKeeper = currentUser.role === 'STOREKEEPER';
  const isAdminOrApproval = ['ADMIN', 'SUPER_ADMIN', 'APPROVAL'].includes(currentUser.role);
  const canVerify = isStrictStoreKeeper || ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
  const canApprove = isAdminOrApproval;
  const isVerifying = !isViewOnly && editingId && editingId !== 'new' && canVerify && formDetails.status === 'Pending';
  const isApproving = !isViewOnly && editingId && editingId !== 'new' && canApprove && formDetails.status === 'Verified';

  const historyForms = useMemo(() => {
      const myForms = existingForms.filter(f => f.demandBy?.name === currentUser.fullName);
      const officialHistory = (isAdminOrApproval || isStrictStoreKeeper) ? existingForms.filter(f => f.status === 'Approved' || f.status === 'Rejected') : [];
      return [...new Map([...myForms, ...officialHistory].map(item => [item.id, item])).values()].sort((a, b) => b.id.localeCompare(a.id));
  }, [existingForms, isAdminOrApproval, isStrictStoreKeeper, currentUser.fullName]);

  const handleAddItem = () => {
    if (isViewOnly || items.length >= 14) return;
    setItems([...items, { id: Date.now() + Math.random(), name: '', specification: '', unit: '', quantity: '', remarks: '', isFromInventory: false }]);
  };

  const handleRemoveItem = (id: number) => {
    if (isViewOnly) return;
    setItems(prev => prev.length > 1 ? prev.filter(i => i.id !== id) : [{ id: Date.now() + Math.random(), name: '', specification: '', unit: '', quantity: '', remarks: '', isFromInventory: false }]);
  };

  const handleItemNameChange = useCallback((id: number, newName: string) => {
    setItems(prev => prev.map(item => {
        if (item.id === id) {
            let existing = inventoryItems.find(i => i.itemName.trim().toLowerCase() === newName.trim().toLowerCase());
            if (existing) return { ...item, name: newName, isFromInventory: true, codeNo: existing.uniqueCode || existing.sanketNo || '', unit: existing.unit, specification: existing.specification || '' };
            return { ...item, name: newName, isFromInventory: false, codeNo: '', unit: newName.trim() === '' ? '' : item.unit, specification: newName.trim() === '' ? '' : item.specification };
        }
        return item;
    }));
  }, [inventoryItems]);

  const handleLoadForm = (form: MagFormEntry, viewOnly: boolean = false) => {
      setEditingId(form.id);
      setIsViewOnly(viewOnly);
      setItems(form.items.map((item, idx) => ({ ...item, id: item.id || (Date.now() + idx + Math.random()), isFromInventory: inventoryItems.some(i => i.itemName === item.name) })));
      setFormDetails({ ...form });
  };

  const handleReset = () => {
    setEditingId(null); setIsViewOnly(false); setValidationError(null); setSuccessMessage(null); setIsSaved(false);
    setItems([{ id: Date.now() + Math.random(), name: '', specification: '', unit: '', quantity: '', remarks: '', isFromInventory: false }]);
    setFormDetails(prev => ({ ...prev, id: '', items: [], status: 'Pending', demandBy: { name: currentUser.fullName, designation: currentUser.designation, date: todayBS, purpose: '' } }));
  };

  const finalizeSave = (extraData?: { storeId: string, itemType: 'Expendable' | 'Non-Expendable' }) => {
    let nextStatus = formDetails.status || 'Pending';
    if (isVerifying) nextStatus = 'Verified';
    else if (isApproving) nextStatus = 'Approved';

    onSave({
        ...formDetails,
        id: editingId === 'new' || !editingId ? Date.now().toString() : editingId,
        items: items.map(({ isFromInventory, ...rest }) => rest),
        status: nextStatus,
        selectedStoreId: extraData?.storeId || formDetails.selectedStoreId || '',
        issueItemType: extraData?.itemType || formDetails.issueItemType || 'Expendable',
        storeKeeper: isVerifying ? { ...formDetails.storeKeeper, name: currentUser.fullName, date: todayBS, verified: true } as StoreKeeperSignature : formDetails.storeKeeper,
        approvedBy: isApproving ? { name: currentUser.fullName, designation: currentUser.designation, date: todayBS } : formDetails.approvedBy
    });
    setSuccessMessage("विवरण सुरक्षित गरियो।");
    setTimeout(handleReset, 1500);
  };

  const handleSave = (extraData?: { storeId: string, itemType: 'Expendable' | 'Non-Expendable' }) => {
    if (!formDetails.date || !formDetails.demandBy?.purpose) { setValidationError("मिति र प्रयोजन अनिवार्य छ।"); return; }
    if (items.filter(i => i.name.trim()).length === 0) { setValidationError("सामानको नाम भर्नुहोस्।"); return; }
    if (isVerifying && formDetails.storeKeeper?.inStock && (!extraData?.storeId || !extraData?.itemType)) { setShowVerifyPopup(true); return; }
    setIsSaved(true); finalizeSave(extraData);
  };

  // --- ROBUST STANDALONE PRINTING METHOD ---
  const printMagForm = () => {
      const printWindow = window.open('', '_blank', 'width=1000,height=1200');
      if (!printWindow) { alert('Print window blocked. Please allow popups.'); return; }

      const printArea = document.getElementById('mag-form-print')?.cloneNode(true) as HTMLElement;
      // Convert all inputs to text
      printArea.querySelectorAll('input, select, textarea').forEach((el: any) => {
          const val = el.value || '';
          const span = document.createElement('span');
          span.innerText = val;
          span.className = el.className + ' print-text-fallback';
          el.parentNode.replaceChild(span, el);
      });
      // Remove no-print elements
      printArea.querySelectorAll('.no-print').forEach(el => el.remove());

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>माग फारम प्रिन्ट</title>
          <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@400;700;800&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Mukta', sans-serif; margin: 0; padding: 20px; color: black; line-height: 1.4; }
            .print-container { width: 100%; max-width: 210mm; margin: 0 auto; }
            h1, h2, h3 { margin: 2px 0; text-align: center; }
            .header { position: relative; margin-bottom: 20px; }
            .logo { position: absolute; left: 0; top: 0; width: 80px; }
            .form-title { font-size: 20px; font-weight: bold; text-decoration: underline; margin: 15px 0; }
            .meta-info { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; border: 1.5px solid black; margin: 10px 0; }
            th, td { border: 1px solid black; padding: 6px; text-align: center; font-size: 12px; }
            th { background-color: #f2f2f2 !important; font-weight: bold; }
            .text-left { text-align: left !important; }
            .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 30px; font-size: 12px; }
            .signature-box { border-top: 1px dotted black; padding-top: 5px; margin-top: 40px; }
            .text-red-600 { color: black !important; }
            @page { size: A4 portrait; margin: 1cm; }
            .print-text-fallback { border-bottom: 1px dotted #ccc; display: inline-block; min-width: 20px; }
          </style>
        </head>
        <body>
          <div class="print-container">${printArea.innerHTML}</div>
          <script>
            window.onload = () => {
                window.print();
                setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
  };

  if (!editingId) {
    return (
        <div className="space-y-6 animate-in fade-in no-print">
            <div className="flex justify-between items-center border-b pb-4">
                <h2 className="text-xl font-bold text-slate-800 font-nepali">माग फारम व्यवस्थापन (Mag Faram)</h2>
                <button onClick={() => setEditingId('new')} className="bg-primary-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg font-bold font-nepali"><Plus size={20} /> नयाँ माग फारम</button>
            </div>
            {historyForms.length > 0 && (
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <div className="bg-slate-50 px-6 py-3 border-b text-slate-700 font-bold font-nepali">फारम इतिहास (History)</div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50"><tr><th className="px-6 py-3">Form No</th><th className="px-6 py-3">Date</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-right">Action</th></tr></thead>
                        <tbody className="divide-y">
                            {historyForms.map(f => (
                                <tr key={f.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-3 font-mono font-bold">#{f.formNo}</td>
                                    <td className="px-6 py-3 font-nepali">{f.date}</td>
                                    <td className="px-6 py-3"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold border">{f.status}</span></td>
                                    <td className="px-6 py-3 text-right"><button onClick={() => handleLoadForm(f, true)} className="text-slate-400 hover:text-primary-600 p-2"><Eye size={18} /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm no-print">
          <button onClick={handleReset} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><ArrowLeft size={20} /></button>
          <div className="flex gap-2">
            {!isViewOnly && (
                <button onClick={() => handleSave()} disabled={isSaved} className={`px-6 py-2 text-white rounded-lg font-medium ${isSaved ? 'bg-green-600' : 'bg-primary-600 hover:bg-primary-700'}`}>
                    {isSaved ? 'प्रक्रियामा...' : 'सुरक्षित गर्नुहोस्'}
                </button>
            )}
            <button onClick={printMagForm} className="px-4 py-2 bg-slate-800 text-white rounded-lg font-medium"><Printer size={18} /> प्रिन्ट गर्नुहोस्</button>
          </div>
       </div>

       <div id="mag-form-print" className="bg-white p-10 max-w-[210mm] mx-auto min-h-[297mm] font-nepali text-slate-900 shadow-lg rounded-xl print:shadow-none">
          <div className="text-right font-bold text-[10px] mb-2">म.ले.प.फारम नं: ४०१</div>
          <div className="header">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png" className="logo" />
              <h1>{generalSettings.orgNameNepali}</h1>
              <h2>{generalSettings.subTitleNepali}</h2>
              <div className="text-center mt-6"><h2 className="form-title">माग फारम</h2></div>
          </div>

          <div className="meta-info">
              <div className="space-y-1">
                  <p>प्रयोजन: <input value={formDetails.demandBy?.purpose} onChange={e => setFormDetails({...formDetails, demandBy: {...formDetails.demandBy, purpose: e.target.value}})} disabled={isViewOnly} className="border-b border-dotted border-black w-48 outline-none bg-transparent px-1" /></p>
              </div>
              <div className="space-y-1 text-right">
                  <p>आ.व.: <span className="font-bold">{formDetails.fiscalYear}</span></p>
                  <p>माग नं: <span className="font-bold text-red-600">{formDetails.formNo}</span></p>
                  <p>मिति: <span className="font-bold">{formDetails.date}</span></p>
              </div>
          </div>

          <table>
              <thead>
                  <tr><th rowSpan={2}>क्र.सं.</th><th colSpan={2}>विवरण</th><th colSpan={2}>माग गरिएको</th><th rowSpan={2}>कैफियत</th></tr>
                  <tr><th>नाम</th><th>स्पेसिफिकेसन</th><th>एकाई</th><th>परिमाण</th></tr>
              </thead>
              <tbody>
                  {items.map((item, index) => (
                      <tr key={item.id}>
                          <td>{index + 1}</td>
                          <td className="text-left px-2">
                             {!isViewOnly ? (
                                <SearchableSelect options={[]} value={item.name} onChange={val => handleItemNameChange(item.id, val)} placeholder="..." className="!border-none !p-0" />
                             ) : <span>{item.name}</span>}
                          </td>
                          <td><input value={item.specification} onChange={e => setItems(items.map(i => i.id === item.id ? {...i, specification: e.target.value} : i))} disabled={isViewOnly} className="w-full bg-transparent outline-none" /></td>
                          <td><input value={item.unit} onChange={e => setItems(items.map(i => i.id === item.id ? {...i, unit: e.target.value} : i))} disabled={isViewOnly} className="w-full bg-transparent outline-none" /></td>
                          <td className="font-bold"><input value={item.quantity} onChange={e => setItems(items.map(i => i.id === item.id ? {...i, quantity: e.target.value} : i))} disabled={isViewOnly} className="w-full bg-transparent outline-none text-center" /></td>
                          <td><input value={item.remarks} onChange={e => setItems(items.map(i => i.id === item.id ? {...i, remarks: e.target.value} : i))} disabled={isViewOnly} className="w-full bg-transparent outline-none" /></td>
                      </tr>
                  ))}
              </tbody>
          </table>
          {!isViewOnly && <button onClick={handleAddItem} className="no-print text-primary-600 font-bold text-xs mt-2">+ थप्नुहोस्</button>}

          <div className="grid-3">
              <div className="signature-box">
                  <p>माग गर्ने:</p>
                  <p>नाम: {formDetails.demandBy?.name}</p>
                  <p>पद: {formDetails.demandBy?.designation}</p>
              </div>
              <div className="signature-box">
                  <p>प्रमाणित गर्ने:</p>
                  <p>नाम: {formDetails.storeKeeper?.name || '................'}</p>
              </div>
              <div className="signature-box">
                  <p>स्वीकृत गर्ने:</p>
                  <p>नाम: {formDetails.approvedBy?.name || '................'}</p>
              </div>
          </div>
       </div>
    </div>
  );
};
