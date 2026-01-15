
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Trash2, Printer, Save, Calendar, CheckCircle2, Send, Clock, FileText, Eye, Search, X, AlertCircle, ChevronRight, ArrowLeft, Check, Square, Warehouse, Layers, ShieldCheck, Info, ListFilter, ClipboardList, History } from 'lucide-react';
import { User, Option, OrganizationSettings } from '../types/coreTypes';
import { MagItem, MagFormEntry, InventoryItem, Store, StoreKeeperSignature } from '../types/inventoryTypes';
import { SearchableSelect } from './SearchableSelect';
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
  const [activeTab, setActiveTab] = useState<'requests' | 'history'>('requests');
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for Stock Tooltip
  const [hoveredStock, setHoveredStock] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null);

  const isStoreKeeper = currentUser.role === 'STOREKEEPER';
  const isAccount = currentUser.role === 'ACCOUNT';
  const isApprover = ['ADMIN', 'SUPER_ADMIN', 'APPROVAL'].includes(currentUser.role);
  const isPrivileged = isStoreKeeper || isAccount || isApprover;

  const todayBS = useMemo(() => {
    try { return new NepaliDate().format('YYYY-MM-DD'); } catch (e) { return ''; }
  }, []);

  const [items, setItems] = useState<LocalMagItem[]>([{ id: Date.now() + Math.random(), name: '', specification: '', unit: '', quantity: '', remarks: '', isFromInventory: false }]);
  
  const [formDetails, setFormDetails] = useState<MagFormEntry>({
    id: '', items: [], fiscalYear: currentFiscalYear, formNo: '', date: todayBS, status: 'Pending',
    demandBy: { name: currentUser.fullName, designation: currentUser.designation, date: todayBS, purpose: '' },
    recommendedBy: { name: '', designation: '', date: '' },
    storeKeeper: { name: '', date: '', verified: false, marketRequired: false, inStock: false },
    approvedBy: { name: '', designation: '', date: '' },
    receiver: { name: '', designation: '', date: '' },
    issueItemType: 'Expendable',
    selectedStoreId: ''
  });

  const filteredForms = useMemo(() => {
    return existingForms.filter(f => {
        const matchesSearch = f.formNo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             f.demandBy?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;
        if (!isPrivileged && f.demandBy?.name !== currentUser.fullName) return false;
        if (activeTab === 'requests') {
            if (isStoreKeeper) return f.status === 'Pending';
            if (isApprover || isAccount) return f.status === 'Verified';
            return f.status === 'Pending' || f.status === 'Verified';
        } else {
            if (isStoreKeeper) return f.status !== 'Pending';
            if (isApprover || isAccount) return f.status === 'Approved' || f.status === 'Rejected';
            return f.status === 'Approved' || f.status === 'Rejected';
        }
    }).sort((a, b) => b.formNo.localeCompare(a.formNo));
  }, [existingForms, activeTab, isStoreKeeper, isApprover, isAccount, isPrivileged, currentUser.fullName, searchTerm]);

  const pendingBadgeCount = useMemo(() => {
      return existingForms.filter(f => {
          if (!isPrivileged) return f.demandBy?.name === currentUser.fullName && (f.status === 'Pending' || f.status === 'Verified');
          if (isStoreKeeper) return f.status === 'Pending';
          if (isApprover || isAccount) return f.status === 'Verified';
          return false;
      }).length;
  }, [existingForms, isStoreKeeper, isApprover, isAccount, isPrivileged, currentUser.fullName]);

  const itemOptions = useMemo(() => {
    const itemMap = new Map<string, { totalQty: number, type: string, unit: string }>();
    inventoryItems.forEach(item => {
        const key = item.itemName.trim();
        const existing = itemMap.get(key);
        if (existing) existing.totalQty += (item.currentQuantity || 0);
        else itemMap.set(key, { totalQty: item.currentQuantity || 0, type: item.itemType === 'Expendable' ? 'खर्च हुने' : 'खर्च नहुने', unit: item.unit });
    });
    return Array.from(itemMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([name, data]) => ({ id: name, value: name, label: `${name} (${data.totalQty} ${data.unit}) [${data.type}]` }));
  }, [inventoryItems]);

  useEffect(() => {
    if (!editingId && !formDetails.id) {
        // Filter forms strictly for the current fiscal year
        const formsInCurrentFY = existingForms.filter(f => f.fiscalYear === currentFiscalYear);
        
        // Calculate the next number
        const maxNum = formsInCurrentFY.reduce((max, f) => {
            // Check for new format: NNNN-MF (e.g., 0001-MF)
            const matchNew = f.formNo.match(/^(\d+)-MF$/);
            if (matchNew) return Math.max(max, parseInt(matchNew[1], 10));

            // Check for legacy format: FY-NNN (e.g., 2081082-001)
            // This ensures continuity if switching mid-year, though 0001-MF style is preferred
            const parts = f.formNo.split('-');
            const numPart = parts.length > 1 ? parseInt(parts[parts.length - 1]) : 0;
            if (!isNaN(numPart) && numPart > 0 && numPart < 10000) return Math.max(max, numPart); // Constraint to avoid confusing FY part with ID
            
            return max;
        }, 0);

        // Generate new Form No in "0001-MF" format
        const nextNum = maxNum + 1;
        setFormDetails(prev => ({ ...prev, formNo: `${String(nextNum).padStart(4, '0')}-MF` }));
    }
  }, [editingId, existingForms, currentFiscalYear, formDetails.id]);

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
            return { ...item, name: newName, isFromInventory: false, codeNo: '', unit: '', specification: '' };
        }
        return item;
    }));
  }, [inventoryItems]);

  const updateItemField = useCallback((id: number, field: keyof LocalMagItem, value: any) => {
    setItems(prev => prev.map(item => (item.id === id ? { ...item, [field]: value } : item)));
  }, []);

  const handleLoadForm = (form: MagFormEntry, viewOnly: boolean = false) => {
      setEditingId(form.id);
      setIsViewOnly(viewOnly);
      setItems(form.items.map((item, idx) => {
          const existing = inventoryItems.find(inv => inv.itemName.trim().toLowerCase() === item.name.trim().toLowerCase());
          return { ...item, id: item.id || (Date.now() + idx + Math.random()), isFromInventory: !!existing };
      }));
      setFormDetails({ ...form });
  };

  const handleReset = () => {
    setEditingId(null); setIsViewOnly(false); setValidationError(null); setSuccessMessage(null); setIsSaved(false);
    setItems([{ id: Date.now() + Math.random(), name: '', specification: '', unit: '', quantity: '', remarks: '', isFromInventory: false }]);
    setFormDetails(prev => ({ 
        ...prev, id: '', items: [], status: 'Pending', 
        demandBy: { name: currentUser.fullName, designation: currentUser.designation, date: todayBS, purpose: '' },
        receiver: { name: '', designation: '', date: '' },
        recommendedBy: { name: '', designation: '', date: '' },
        storeKeeper: { name: '', date: '', verified: false, marketRequired: false, inStock: false },
        approvedBy: { name: '', designation: '', date: '' }
    }));
  };

  const handleSave = () => {
    if (!formDetails.date?.trim()) { setValidationError("मिति भर्नुहोस्।"); return; }
    if (!formDetails.demandBy?.purpose?.trim()) { setValidationError("मागको प्रयोजन भर्नुहोस्।"); return; }
    const validItems = items.filter(item => item.name.trim() !== '' || item.quantity.trim() !== '');
    if (validItems.length === 0) { setValidationError("कम्तिमा एउटा सामानको विवरण भर्नुहोस्।"); return; }

    let finalStatus = formDetails.status || 'Pending';
    let finalRecommendedBy = { ...formDetails.recommendedBy };
    let finalApprovedBy = { ...formDetails.approvedBy };

    if (isStoreKeeper && (formDetails.storeKeeper?.marketRequired || formDetails.storeKeeper?.inStock)) {
        finalStatus = 'Verified';
        finalRecommendedBy = { name: currentUser.fullName, designation: currentUser.designation, date: todayBS };
    } else if (isApprover && formDetails.status === 'Verified') {
        finalStatus = 'Approved';
        finalApprovedBy = { name: currentUser.fullName, designation: currentUser.designation, date: todayBS };
    }

    onSave({
        ...formDetails,
        id: editingId === 'new' || !editingId ? Date.now().toString() : editingId,
        items: validItems.map(({ isFromInventory, ...rest }) => rest),
        status: finalStatus,
        recommendedBy: finalRecommendedBy,
        approvedBy: finalApprovedBy
    });
    
    setSuccessMessage(finalStatus === 'Approved' ? "माग फारम सफलतापूर्वक स्वीकृत भयो।" : (finalStatus === 'Verified' ? "माग फारम प्रमाणित गरी पठाइयो।" : "माग फारम सुरक्षित गरियो।"));
    setIsSaved(true);
    setTimeout(handleReset, 1500);
  };

  const printOfficialForm = () => {
      const printWindow = window.open('', '_blank', 'width=900,height=1000');
      if (!printWindow) return;
      const rowsHtml = items.map((item, idx) => `
        <tr>
          <td style="border: 1px solid black; padding: 6px; text-align: center;">${idx + 1}</td>
          <td style="border: 1px solid black; padding: 6px; text-align: left; font-weight: bold;">${item.name}</td>
          <td style="border: 1px solid black; padding: 6px;">${item.specification || ''}</td>
          <td style="border: 1px solid black; padding: 6px; text-align: center;">${item.unit}</td>
          <td style="border: 1px solid black; padding: 6px; text-align: center; font-weight: bold;">${item.quantity}</td>
          <td style="border: 1px solid black; padding: 6px;">${item.remarks || ''}</td>
        </tr>
      `).join('');

      const contactInfo = [
        generalSettings.address, 
        generalSettings.phone ? `फोन: ${generalSettings.phone}` : null, 
        generalSettings.email ? `ईमेल: ${generalSettings.email}` : null, 
        generalSettings.panNo ? `पान नं: ${generalSettings.panNo}` : null
      ].filter(Boolean).join(' | ');

      const content = `
        <html>
          <head>
            <title>माग फारम - ४०१</title>
            <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@400;700;800&display=swap" rel="stylesheet">
            <style>
              body { font-family: 'Mukta', sans-serif; padding: 30px; line-height: 1.4; color: black; background: white; }
              .header { text-align: center; margin-bottom: 20px; position: relative; }
              .logo { position: absolute; left: 0; top: 0; width: 70px; }
              .org-name { font-size: 20px; font-weight: 800; color: #ff0000; margin: 0; text-transform: uppercase; }
              .org-sub { font-size: 14px; font-weight: bold; margin: 2px 0; }
              .title { font-size: 22px; font-weight: 800; text-decoration: underline; margin-top: 15px; }
              table { width: 100%; border-collapse: collapse; border: 1.5px solid black; margin-bottom: 30px; }
              th { border: 1px solid black; padding: 8px; font-size: 12px; background: #f2f2f2; }
              td { border: 1px solid black; padding: 4px; font-size: 12px; }
              .footer { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 50px; }
              .sig-block { border-top: 1px solid black; padding-top: 10px; min-height: 120px; }
              .sig-label { font-weight: bold; font-size: 13px; margin-bottom: 10px; display: block; }
            </style>
          </head>
          <body>
            <div class="header">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png" class="logo" />
              <h1 class="org-name">${generalSettings.orgNameNepali}</h1>
              <h2 class="org-sub">${generalSettings.subTitleNepali}</h2>
              ${generalSettings.subTitleNepali2 ? `<h3 class="org-sub" style="font-size: 13px;">${generalSettings.subTitleNepali2}</h3>` : ''}
              ${generalSettings.subTitleNepali3 ? `<h4 class="org-sub" style="font-size: 12px;">${generalSettings.subTitleNepali3}</h4>` : ''}
              <div style="font-size: 10px; margin-top: 5px;">${contactInfo}</div>
              <div class="title">माग फारम</div>
            </div>
            <div style="text-align: right; margin-bottom: 10px;">
              आर्थिक वर्ष: ${formDetails.fiscalYear} | माग नं: ${formDetails.formNo} | मिति: ${formDetails.date}
            </div>
            <table>
              <thead>
                <tr><th rowspan="2">क्र.सं.</th><th colspan="2">जिन्सी मालसामानको विवरण</th><th rowspan="2">एकाई</th><th rowspan="2">माग गरिएको परिमाण</th><th rowspan="2">कैफियत</th></tr>
                <tr><th>नाम</th><th>स्पेसिफिकेसन</th></tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
            <div class="footer">
              <div class="sig-block">
                <span class="sig-label">माग गर्नेको दस्तखत</span>
                नाम: ${formDetails.demandBy?.name}<br/> पद: ${formDetails.demandBy?.designation}<br/> मिति: ${formDetails.demandBy?.date}<br/> प्रयोजन: ${formDetails.demandBy?.purpose || '................'}
              </div>
              <div class="sig-block">
                <span class="sig-label">सिफारिस गर्नेको दस्तखत</span>
                नाम: ${formDetails.recommendedBy?.name || '................'}<br/> पद: ${formDetails.recommendedBy?.designation || '................'}<br/> मिति: ${formDetails.recommendedBy?.date || '................'}
              </div>
              <div class="sig-block">
                <span class="sig-label">मालसामान बुझिलिनेको दस्तखत</span>
                नाम: ${formDetails.receiver?.name || '................'}<br/> पद: ${formDetails.receiver?.designation || '................'}<br/> मिति: ${formDetails.receiver?.date || '................'}
              </div>
              <div class="sig-block">
                <span class="sig-label">स्वीकृत गर्नेको दस्तखत</span>
                नाम: ${formDetails.approvedBy?.name || '................'}<br/> पद: ${formDetails.approvedBy?.designation || '................'}<br/> मिति: ${formDetails.approvedBy?.date || '................'}
              </div>
            </div>
            <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }</script>
          </body>
        </html>
      `;
      printWindow.document.write(content);
      printWindow.document.close();
  };

  const handleSnMouseEnter = (e: React.MouseEvent, itemName: string) => {
    if (!itemName) return;
    
    // Calculate stock for the item name across all stores/batches
    const matchingItems = inventoryItems.filter(i => i.itemName.trim().toLowerCase() === itemName.trim().toLowerCase());
    
    if (matchingItems.length === 0) {
         setHoveredStock({
            x: e.clientX + 15,
            y: e.clientY + 15,
            content: (
                <div className="text-xs">
                    <div className="font-bold text-slate-200 border-b border-slate-600 mb-1 pb-1">{itemName}</div>
                    <div className="text-red-400 font-bold">स्टक रेकर्ड छैन (No Stock Record)</div>
                </div>
            )
        });
        return;
    }

    const totalQty = matchingItems.reduce((acc, i) => acc + (i.currentQuantity || 0), 0);
    const unit = matchingItems[0]?.unit || '';

    setHoveredStock({
        x: e.clientX + 15, // Offset to not overlap cursor
        y: e.clientY + 15,
        content: (
            <div className="text-xs">
                <div className="font-bold text-slate-200 border-b border-slate-600 mb-1 pb-1">{itemName}</div>
                <div className="flex justify-between gap-3 items-center">
                    <span className="text-slate-400">मौज्दात (Stock):</span>
                    <span className="font-bold text-green-400 text-sm">{totalQty} {unit}</span>
                </div>
                {matchingItems.length > 1 && (
                    <div className="mt-1 text-[9px] text-slate-500 italic">Total from {matchingItems.length} batches</div>
                )}
            </div>
        )
    });
  };

  const handleSnMouseLeave = () => {
      setHoveredStock(null);
  };

  if (!editingId) {
    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-primary-100 p-2 rounded-lg text-primary-600"><ClipboardList size={24}/></div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 font-nepali">माग फारम व्यवस्थापन (Mag Faram)</h2>
                        <p className="text-sm text-slate-500 font-nepali">{isPrivileged ? 'प्राप्त मागहरू र कार्यवाही विवरण' : 'तपाईंले भर्नुभएका माग फारमहरूको सूची'}</p>
                    </div>
                </div>
                <button onClick={() => setEditingId('new')} className="bg-primary-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg font-bold font-nepali transition-all active:scale-95"><Plus size={20} /> नयाँ माग फारम</button>
            </div>
            <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
                    <button onClick={() => setActiveTab('requests')} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'requests' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}><Clock size={18}/> {isPrivileged ? 'नयाँ अनुरोधहरू' : 'प्रक्रियामा रहेका'} {pendingBadgeCount > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1 animate-pulse">{pendingBadgeCount}</span>}</button>
                    <button onClick={() => setActiveTab('history')} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}><History size={18}/> {isPrivileged ? 'कार्यवाही सूची (History)' : 'पुरानो विवरण (History)'}</button>
                </div>
                <div className="relative w-full md:w-80"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="माग नं वा नामबाट खोज्नुहोस्..." className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-4 focus:ring-primary-500/10 outline-none text-sm transition-all" /></div>
            </div>
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b">
                            <tr><th className="px-6 py-4">माग नं</th><th className="px-6 py-4">मिति</th><th className="px-6 py-4">माग गर्ने</th><th className="px-6 py-4">अवस्था (Status)</th><th className="px-6 py-4 text-right">कार्य</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredForms.map(f => (
                                <tr key={f.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4 font-mono font-bold text-indigo-600">#{f.formNo}</td>
                                    <td className="px-6 py-4 font-nepali text-slate-600">{f.date}</td>
                                    <td className="px-6 py-4"><div><p className="font-bold text-slate-800">{f.demandBy?.name}</p><p className="text-[10px] text-slate-400 uppercase font-black">{f.demandBy?.designation}</p></div></td>
                                    <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-[10px] font-black border flex items-center gap-1 w-fit ${f.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' : f.status === 'Pending' ? 'bg-orange-50 text-orange-700 border-orange-200' : f.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{f.status === 'Approved' ? <CheckCircle2 size={12}/> : f.status === 'Pending' ? <Clock size={12}/> : <Send size={12}/>} {f.status}</span></td>
                                    <td className="px-6 py-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => handleLoadForm(f, activeTab === 'history' || (!isPrivileged && f.status === 'Approved'))} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-full"><Eye size={20} /></button><button onClick={() => { handleLoadForm(f, true); setTimeout(printOfficialForm, 300); }} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full"><Printer size={20} /></button></div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
  }

  const getButtonLabel = () => {
    if (isSaved) return 'सुरक्षित भयो';
    if (isStoreKeeper && formDetails.status === 'Pending') return 'प्रमाणित गरी पठाउनुहोस्';
    if (isApprover && formDetails.status === 'Verified') return 'स्वीकृत गर्नुहोस्';
    return 'सुरक्षित गर्नुहोस्';
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm no-print">
          <button onClick={handleReset} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><ArrowLeft size={24} /></button>
          <div className="flex gap-2">
            {!isViewOnly && <button onClick={handleSave} disabled={isSaved} className={`px-6 py-2 text-white rounded-lg font-bold shadow-md transition-all active:scale-95 ${isSaved ? 'bg-green-600' : 'bg-primary-600 hover:bg-primary-700'}`}>{getButtonLabel()}</button>}
            <button onClick={printOfficialForm} className="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold shadow-md flex items-center gap-2 hover:bg-slate-900"><Printer size={18} /> प्रिन्ट गर्नुहोस्</button>
          </div>
       </div>

       {successMessage && <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl shadow-sm flex items-center gap-3 animate-in slide-in-from-top-2 no-print"><CheckCircle2 size={24} className="text-green-500" /><div className="flex-1 font-bold text-green-800">{successMessage}</div><button onClick={() => setSuccessMessage(null)}><X size={20}/></button></div>}
       {validationError && <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex items-center gap-3 animate-in slide-in-from-top-2 no-print"><AlertCircle size={24} className="text-red-500" /><div className="flex-1 font-bold text-red-800">{validationError}</div><button onClick={() => setValidationError(null)}><X size={20}/></button></div>}

       <div className="bg-white p-10 md:p-14 max-w-[210mm] mx-auto min-h-[297mm] font-nepali text-slate-900 shadow-2xl rounded-xl relative">
          {/* Tooltip Portal / Floating Div */}
          {hoveredStock && (
              <div 
                  className="fixed z-[9999] bg-slate-800 text-white p-2.5 rounded-lg shadow-xl pointer-events-none animate-in fade-in zoom-in-95 duration-150 no-print border border-slate-700/50 backdrop-blur-sm"
                  style={{ top: hoveredStock.y, left: hoveredStock.x }}
              >
                  {hoveredStock.content}
              </div>
          )}

          <div className="flex justify-between items-start mb-6">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png" className="w-20 h-20 object-contain" />
              <div className="text-center flex-1">
                  <h1 className="text-xl font-black text-red-600 uppercase">{generalSettings.orgNameNepali}</h1>
                  <h2 className="text-base font-bold">{generalSettings.subTitleNepali}</h2>
                  {generalSettings.subTitleNepali2 && <h3 className="text-sm font-bold">{generalSettings.subTitleNepali2}</h3>}
                  {generalSettings.subTitleNepali3 && <h4 className="text-xs font-bold">{generalSettings.subTitleNepali3}</h4>}
                  <div className="text-[10px] font-bold text-slate-500 mt-2">
                    {[
                        generalSettings.address, 
                        generalSettings.phone ? `फोन: ${generalSettings.phone}` : '', 
                        generalSettings.email ? `ईमेल: ${generalSettings.email}` : '',
                        generalSettings.panNo ? `पान नं: ${generalSettings.panNo}` : ''
                    ].filter(Boolean).join(' | ')}
                  </div>
                  <h2 className="text-2xl font-black underline underline-offset-8 mt-6">माग फारम</h2>
              </div>
              <p className="font-bold text-[10px] border border-black px-1 h-fit">म.ले.प.फा.नं. ४०१</p>
          </div>
          <div className="flex justify-end mb-6 text-sm">
              <div className="text-right space-y-1">
                  <p>आर्थिक वर्ष: <span className="font-bold border-b border-dotted border-black px-4">{formDetails.fiscalYear}</span></p>
                  <p>माग नं: <span className="font-bold text-red-600 border-b border-dotted border-black px-4">#{formDetails.formNo}</span></p>
                  <p>मिति: <input value={formDetails.date} onChange={e => setFormDetails({...formDetails, date: e.target.value})} disabled={isViewOnly} className="font-bold border-b border-dotted border-black px-1 outline-none w-32 text-right bg-transparent" /></p>
              </div>
          </div>
          <table className="w-full border-collapse border border-black text-center text-xs">
              <thead>
                  <tr className="bg-slate-100">
                      <th rowSpan={2} className="border border-black p-2 w-10">क्र.सं.</th><th colSpan={2} className="border border-black p-2">जिन्सी मालसामानको विवरण</th><th rowSpan={2} className="border border-black p-2 w-16">एकाई</th><th rowSpan={2} className="border border-black p-2 w-20">माग गरिएको परिमाण</th><th rowSpan={2} className="border border-black p-2">कैफियत</th><th rowSpan={2} className="border border-black p-2 w-8 no-print"></th>
                  </tr>
                  <tr><th className="border border-black p-1">नाम</th><th className="border border-black p-1">स्पेसिफिकेसन</th></tr>
              </thead>
              <tbody>
                  {items.map((item, index) => (
                      <tr key={item.id}>
                          <td 
                            className="border border-black p-2 cursor-help hover:bg-yellow-50 transition-colors"
                            onMouseEnter={(e) => handleSnMouseEnter(e, item.name)}
                            onMouseLeave={handleSnMouseLeave}
                          >
                            {index + 1}
                          </td>
                          <td className="border border-black p-1 text-left font-bold">{!isViewOnly ? <SearchableSelect options={itemOptions} value={item.name} onChange={val => handleItemNameChange(item.id, val)} onSelect={opt => handleItemNameChange(item.id, opt.value)} placeholder="..." className="!border-none" /> : item.name}</td>
                          <td className="border border-black p-1"><input value={item.specification} onChange={e => updateItemField(item.id, 'specification', e.target.value)} disabled={isViewOnly || item.isFromInventory} className="w-full bg-transparent outline-none text-center" /></td>
                          <td className="border border-black p-1"><input value={item.unit} onChange={e => updateItemField(item.id, 'unit', e.target.value)} disabled={isViewOnly || item.isFromInventory} className="w-full bg-transparent outline-none text-center" /></td>
                          <td className="border border-black p-1 font-black"><input value={item.quantity} onChange={e => updateItemField(item.id, 'quantity', e.target.value)} disabled={isViewOnly} className="w-full bg-transparent outline-none text-center" /></td>
                          <td className="border border-black p-1"><input value={item.remarks} onChange={e => updateItemField(item.id, 'remarks', e.target.value)} disabled={isViewOnly} className="w-full bg-transparent outline-none" /></td>
                          <td className="border border-black p-1 text-center no-print"><button onClick={() => handleRemoveItem(item.id)} className="text-red-400"><Trash2 size={14}/></button></td>
                      </tr>
                  ))}
              </tbody>
          </table>
          {!isViewOnly && <button onClick={handleAddItem} disabled={items.length >= 14} className="no-print font-bold text-xs mt-3 text-primary-600 flex items-center gap-1"><Plus size={14}/> थप थप्नुहोस्</button>}
          <div className="grid grid-cols-2 gap-x-12 gap-y-16 mt-16 text-[11px] font-bold">
              <div className="space-y-4">
                  <div className="border-t border-black pt-2">
                      <p className="mb-6">माग गर्नेको दस्तखत</p>
                      <p>नाम: {formDetails.demandBy?.name}</p>
                      <p>पद: {formDetails.demandBy?.designation}</p>
                      <p>मिति: {formDetails.demandBy?.date}</p>
                      <div className="flex items-center gap-2 mt-2">प्रयोजन *: <input value={formDetails.demandBy?.purpose} onChange={e => setFormDetails({...formDetails, demandBy: {...formDetails.demandBy!, purpose: e.target.value}})} disabled={isViewOnly} className="border-b border-dotted border-black flex-1 outline-none bg-transparent" /></div>
                  </div>
                  <div className="border-t border-black pt-2">
                      <p className="mb-6">मालसामान बुझिलिनेको दस्तखत</p>
                      <p>नाम: <input value={formDetails.receiver?.name} onChange={e => setFormDetails({...formDetails, receiver: {...formDetails.receiver!, name: e.target.value}})} disabled={isViewOnly} className="outline-none bg-transparent" /></p>
                      <p>पद: <input value={formDetails.receiver?.designation} onChange={e => setFormDetails({...formDetails, receiver: {...formDetails.receiver!, designation: e.target.value}})} disabled={isViewOnly} className="outline-none bg-transparent" /></p>
                  </div>
              </div>
              <div className="space-y-4">
                  <div className="border-t border-black pt-2">
                      <div className="flex flex-col gap-1 mb-2 no-print">
                           <label className={`flex items-center gap-2 ${isViewOnly || !isStoreKeeper ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}><input type="checkbox" checked={formDetails.storeKeeper?.marketRequired} onChange={e => setFormDetails({...formDetails, storeKeeper: {...formDetails.storeKeeper!, marketRequired: e.target.checked}})} disabled={isViewOnly || !isStoreKeeper} className="w-3 h-3" /> बजारबाट खरिद गर्नु पर्ने</label>
                           <label className={`flex items-center gap-2 ${isViewOnly || !isStoreKeeper ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}><input type="checkbox" checked={formDetails.storeKeeper?.inStock} onChange={e => setFormDetails({...formDetails, storeKeeper: {...formDetails.storeKeeper!, inStock: e.target.checked}})} disabled={isViewOnly || !isStoreKeeper} className="w-3 h-3" /> मौज्दातमा रहेको</label>
                      </div>
                      <p className="mb-6">सिफारिस गर्नेको दस्तखत</p>
                      <p>नाम: <span className="font-bold border-b border-dotted border-black px-2 min-w-[100px] inline-block">{formDetails.recommendedBy?.name || '................'}</span></p>
                      <p>पद: <span className="font-bold border-b border-dotted border-black px-2 min-w-[100px] inline-block">{formDetails.recommendedBy?.designation || '................'}</span></p>
                      <p>मिति: <span className="font-bold border-b border-dotted border-black px-2 min-w-[100px] inline-block">{formDetails.recommendedBy?.date || '................'}</span></p>
                  </div>
                  <div className="border-t border-black pt-2">
                      <p className="mb-6">स्वीकृत गर्नेको दस्तखत</p>
                      <p>नाम: <span className="font-bold border-b border-dotted border-black px-2 min-w-[100px] inline-block">{formDetails.approvedBy?.name || '................'}</span></p>
                      <p>पद: <span className="font-bold border-b border-dotted border-black px-2 min-w-[100px] inline-block">{formDetails.approvedBy?.designation || '................'}</span></p>
                      <p>मिति: <span className="font-bold border-b border-dotted border-black px-2 min-w-[100px] inline-block">{formDetails.approvedBy?.date || '................'}</span></p>
                  </div>
              </div>
          </div>
       </div>
    </div>
  );
};
