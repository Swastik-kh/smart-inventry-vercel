
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

  // Filtering Logic for Lists based on Role and Tab
  const filteredForms = useMemo(() => {
    return existingForms.filter(f => {
        const matchesSearch = f.formNo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             f.demandBy?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (!matchesSearch) return false;

        // Level 1: Visibility Constraint
        if (!isPrivileged && f.demandBy?.name !== currentUser.fullName) {
            return false;
        }

        // Level 2: Tab Logic
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
          if (!isPrivileged) {
              return f.demandBy?.name === currentUser.fullName && (f.status === 'Pending' || f.status === 'Verified');
          }
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
        if (existing) {
            existing.totalQty += (item.currentQuantity || 0);
        } else {
            itemMap.set(key, {
                totalQty: item.currentQuantity || 0,
                type: item.itemType === 'Expendable' ? 'खर्च हुने' : 'खर्च नहुने',
                unit: item.unit
            });
        }
    });

    return Array.from(itemMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, data]) => ({
        id: name,
        value: name, 
        label: `${name} (${data.totalQty} ${data.unit}) [${data.type}]`
      }));
  }, [inventoryItems]);

  useEffect(() => {
    if (!editingId && !formDetails.id) {
        const fyClean = currentFiscalYear.replace('/', '');
        const formsInCurrentFY = existingForms.filter(f => f.fiscalYear === currentFiscalYear);
        const maxNum = formsInCurrentFY.reduce((max, f) => {
            const parts = f.formNo.split('-');
            const numPart = parts.length > 1 ? parseInt(parts[1]) : 0;
            return isNaN(numPart) ? max : Math.max(max, numPart);
        }, 0);
        setFormDetails(prev => ({ ...prev, formNo: `${fyClean}-${String(maxNum + 1).padStart(3, '0')}` }));
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
          return { 
              ...item, 
              id: item.id || (Date.now() + idx + Math.random()),
              isFromInventory: !!existing
          };
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
        storeKeeper: { name: '', date: '', verified: false, marketRequired: false, inStock: false }
    }));
  };

  const handleSave = () => {
    setValidationError(null);

    if (!formDetails.date?.trim()) {
        setValidationError("मिति भर्नुहोस् (Date is required)।");
        return;
    }

    if (!formDetails.demandBy?.purpose?.trim()) {
        setValidationError("मागको प्रयोजन भर्नुहोस् (Purpose is required)।");
        return;
    }

    const validItems = items.filter(item => item.name.trim() !== '' || item.quantity.trim() !== '');
    
    if (validItems.length === 0) {
        setValidationError("कम्तिमा एउटा सामानको विवरण भर्नुहोस्।");
        return;
    }

    let finalStatus = formDetails.status || 'Pending';
    let finalRecommendedBy = { ...formDetails.recommendedBy };

    if (isStoreKeeper && (formDetails.storeKeeper?.marketRequired || formDetails.storeKeeper?.inStock)) {
        finalStatus = 'Verified';
        finalRecommendedBy = {
            name: currentUser.fullName,
            designation: currentUser.designation,
            date: todayBS
        };
    }

    onSave({
        ...formDetails,
        id: editingId === 'new' || !editingId ? Date.now().toString() : editingId,
        items: validItems.map(({ isFromInventory, ...rest }) => rest),
        status: finalStatus,
        recommendedBy: finalRecommendedBy
    });
    
    setSuccessMessage(finalStatus === 'Verified' ? "माग फारम प्रमाणित गरी पठाइयो।" : "माग फारम सुरक्षित गरियो।");
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
          <td style="border: 1px solid black; padding: 6px; text-align: center;">${item.codeNo || ''}</td>
          <td style="border: 1px solid black; padding: 6px;">${item.remarks || ''}</td>
        </tr>
      `).join('');

      const contactInfo = [
          generalSettings.address,
          generalSettings.phone ? `फोन: ${generalSettings.phone}` : null,
          generalSettings.email ? `ईमेल: ${generalSettings.email}` : null,
          generalSettings.website ? `वेबसाइट: ${generalSettings.website}` : null,
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
              .contact-info { font-size: 10px; font-weight: bold; margin-top: 5px; color: #444; }
              .form-no-label { position: absolute; right: 0; top: 0; border: 1px solid black; padding: 2px 5px; font-size: 10px; font-weight: bold; }
              .title { font-size: 22px; font-weight: 800; text-decoration: underline; margin-top: 15px; }
              .meta { display: flex; justify-content: flex-end; margin: 20px 0; font-size: 13px; }
              .meta-line { border-bottom: 1px dotted black; padding: 0 10px; font-weight: bold; }
              table { width: 100%; border-collapse: collapse; border: 1.5px solid black; margin-bottom: 30px; }
              th { border: 1px solid black; padding: 8px; font-size: 12px; background: #f2f2f2; }
              td { border: 1px solid black; padding: 4px; font-size: 12px; }
              .footer { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 50px; }
              .sig-block { border-top: 1px solid black; padding-top: 10px; min-height: 120px; }
              .sig-label { font-weight: bold; font-size: 13px; margin-bottom: 10px; display: block; }
              .check-box-list { margin-bottom: 10px; display: flex; flex-direction: column; gap: 4px; }
              .check-item { display: flex; items-center gap: 8px; font-size: 11px; }
              .box { width: 12px; height: 12px; border: 1px solid black; display: inline-block; vertical-align: middle; text-align: center; line-height: 10px; font-size: 10px; font-weight: bold; }
              @media print { @page { size: A4; margin: 15mm; } .no-print { display: none; } }
            </style>
          </head>
          <body>
            <div class="header">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png" class="logo" />
              <div class="form-no-label">म.ले.प.फा.नं. ४०१</div>
              <h1 class="org-name">${generalSettings.orgNameNepali}</h1>
              <h2 class="org-sub">${generalSettings.subTitleNepali}</h2>
              ${generalSettings.subTitleNepali2 ? `<h2 class="org-sub">${generalSettings.subTitleNepali2}</h2>` : ''}
              ${generalSettings.subTitleNepali3 ? `<h2 class="org-sub">${generalSettings.subTitleNepali3}</h2>` : ''}
              <div class="contact-info">${contactInfo}</div>
              <div class="title">माग फारम</div>
            </div>

            <div class="meta">
              <div style="text-align: right;">
                <div>आर्थिक वर्ष: <span class="meta-line">${formDetails.fiscalYear}</span></div>
                <div>माग नं: <span class="meta-line" style="color: red;">#${formDetails.formNo}</span></div>
                <div>मिति: <span class="meta-line">${formDetails.date}</span></div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th rowspan="2">क्र.सं.</th>
                  <th colspan="2">जिन्सी मालसामानको विवरण</th>
                  <th rowspan="2">एकाई</th>
                  <th rowspan="2">माग गरिएको परिमाण</th>
                  <th rowspan="2">जिन्सी खाता पाना नं.</th>
                  <th rowspan="2">कैफियत</th>
                </tr>
                <tr>
                  <th>नाम</th>
                  <th>स्पेसिफिकेसन</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <div class="footer">
              <div class="sig-block">
                <span class="sig-label">माग गर्नेको दस्तखत</span>
                <div style="font-size: 12px;">
                  नाम: ${formDetails.demandBy?.name}<br/>
                  पद: ${formDetails.demandBy?.designation}<br/>
                  मिति: ${formDetails.demandBy?.date}<br/>
                  प्रयोजन: ${formDetails.demandBy?.purpose || '....................................'}
                </div>
              </div>
              <div class="sig-block">
                <div class="check-box-list">
                  <div class="check-item"><div class="box">${formDetails.storeKeeper?.marketRequired ? '✓' : ''}</div> बजारबाट खरिद गर्नु पर्ने</div>
                  <div class="check-item"><div class="box">${formDetails.storeKeeper?.inStock ? '✓' : ''}</div> मौज्दातमा रहेको</div>
                </div>
                <span class="sig-label">सिफारिस गर्नेको दस्तखत</span>
                <div style="font-size: 11px;">
                  नाम: ${formDetails.recommendedBy?.name || '..............................'}<br/>
                  पद: ${formDetails.recommendedBy?.designation || '..............................'}<br/>
                  मिति: ${formDetails.recommendedBy?.date || '..............................'}
                </div>
              </div>
              <div class="sig-block">
                <span class="sig-label">मालसामान बुझिलिनेको दस्तखत</span>
                <div style="font-size: 12px;">
                  नाम: ${formDetails.receiver?.name || '..............................'}<br/>
                  पद: ${formDetails.receiver?.designation || '..............................'}<br/>
                  मिति: ${formDetails.receiver?.date || '..............................'}
                </div>
              </div>
              <div class="sig-block">
                <span class="sig-label">स्वीकृत गर्नेको दस्तखत</span>
                <div style="font-size: 12px;">
                  नाम: ${formDetails.approvedBy?.name || '..............................'}<br/>
                  पद: ${formDetails.approvedBy?.designation || '..............................'}<br/>
                  मिति: ${formDetails.approvedBy?.date || '..............................'}
                </div>
              </div>
            </div>
            <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }</script>
          </body>
        </html>
      `;
      printWindow.document.write(content);
      printWindow.document.close();
  };

  if (!editingId) {
    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-primary-100 p-2 rounded-lg text-primary-600"><ClipboardList size={24}/></div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 font-nepali">माग फारम व्यवस्थापन (Mag Faram)</h2>
                        <p className="text-sm text-slate-500 font-nepali">
                            {isPrivileged ? 'प्राप्त मागहरू र कार्यवाही विवरण' : 'तपाईंले भर्नुभएका माग फारमहरूको सूची'}
                        </p>
                    </div>
                </div>
                <button onClick={() => setEditingId('new')} className="bg-primary-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg font-bold font-nepali transition-all active:scale-95"><Plus size={20} /> नयाँ माग फारम</button>
            </div>

            {/* List Controls & Tabs */}
            <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
                    <button 
                        onClick={() => setActiveTab('requests')}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'requests' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                    >
                        <Clock size={18}/> {isPrivileged ? 'नयाँ अनुरोधहरू' : 'प्रक्रियामा रहेका'}
                        {pendingBadgeCount > 0 && 
                            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1 animate-pulse">
                                {pendingBadgeCount}
                            </span>
                        }
                    </button>
                    <button 
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                    >
                        <History size={18}/> {isPrivileged ? 'कार्यवाही सूची (History)' : 'पुरानो विवरण (History)'}
                    </button>
                </div>

                <div className="relative w-full md:w-80">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="माग नं वा नामबाट खोज्नुहोस्..." 
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-4 focus:ring-primary-500/10 outline-none text-sm transition-all"
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b">
                            <tr>
                                <th className="px-6 py-4">माग नं</th>
                                <th className="px-6 py-4">मिति</th>
                                <th className="px-6 py-4">माग गर्ने</th>
                                <th className="px-6 py-4">अवस्था (Status)</th>
                                <th className="px-6 py-4 text-right">कार्य</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredForms.map(f => (
                                <tr key={f.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4 font-mono font-bold text-indigo-600 group-hover:text-primary-600">#{f.formNo}</td>
                                    <td className="px-6 py-4 font-nepali text-slate-600">{f.date}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800">{f.demandBy?.name}</div>
                                        <div className="text-[10px] text-slate-400 uppercase font-black tracking-wider">{f.demandBy?.designation}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border flex items-center gap-1 w-fit ${
                                            f.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' :
                                            f.status === 'Pending' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                            f.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                            'bg-blue-50 text-blue-700 border-blue-200'
                                        }`}>
                                            {f.status === 'Approved' ? <CheckCircle2 size={12}/> : f.status === 'Pending' ? <Clock size={12}/> : <Send size={12}/>}
                                            {f.status === 'Verified' ? 'Sent for Approval' : f.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => handleLoadForm(f, activeTab === 'history' || !isPrivileged)} 
                                                className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-all"
                                                title="Preview Details"
                                            >
                                                <Eye size={20} />
                                            </button>
                                            <button 
                                                onClick={() => { handleLoadForm(f, true); setTimeout(printOfficialForm, 300); }} 
                                                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all"
                                                title="Print Official Form"
                                            >
                                                <Printer size={20} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredForms.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic font-nepali text-base">
                                        कुनै पनि माग फारम फेला परेन।
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm no-print">
          <button onClick={handleReset} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-all"><ArrowLeft size={24} /></button>
          <div className="flex gap-2">
            {!isViewOnly && (
                <button onClick={handleSave} disabled={isSaved} className={`px-6 py-2 text-white rounded-lg font-bold shadow-md transition-all active:scale-95 ${isSaved ? 'bg-green-600' : 'bg-primary-600 hover:bg-primary-700'}`}>
                    {isSaved ? 'सुरक्षित भयो' : (isStoreKeeper ? 'प्रमाणित गरी पठाउनुहोस्' : 'सुरक्षित गर्नुहोस्')}
                </button>
            )}
            <button onClick={printOfficialForm} className="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold shadow-md flex items-center gap-2 hover:bg-slate-900 transition-all"><Printer size={18} /> प्रिन्ट गर्नुहोस्</button>
          </div>
       </div>

       {validationError && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex items-start gap-3 animate-in slide-in-from-top-2 no-print">
              <AlertCircle size={24} className="text-red-500 mt-0.5" />
              <div className="flex-1">
                  <h3 className="text-red-800 font-bold text-sm font-nepali">अपूर्ण विवरण (Incomplete Details)</h3>
                  <p className="text-red-700 text-sm mt-1">{validationError}</p>
              </div>
              <button onClick={() => setValidationError(null)} className="text-red-400 hover:text-red-600"><X size={20} /></button>
          </div>
       )}

       {successMessage && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl shadow-sm flex items-center gap-3 animate-in slide-in-from-top-2 no-print">
              <CheckCircle2 size={24} className="text-green-500" />
              <div className="flex-1">
                  <h3 className="text-green-800 font-bold text-lg font-nepali">सफल भयो</h3>
                  <p className="text-green-700 text-sm">{successMessage}</p>
              </div>
              <button onClick={() => setSuccessMessage(null)} className="text-green-400 hover:text-green-600"><X size={20} /></button>
          </div>
       )}

       <div className="bg-white p-10 md:p-14 max-w-[210mm] mx-auto min-h-[297mm] font-nepali text-slate-900 shadow-2xl rounded-xl">
          <div className="flex justify-between items-start mb-6">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png" className="w-20 h-20 object-contain" />
              <div className="text-center flex-1">
                  <h1 className="text-xl font-black text-red-600 uppercase leading-tight">{generalSettings.orgNameNepali}</h1>
                  <h2 className="text-base font-bold">{generalSettings.subTitleNepali}</h2>
                  {generalSettings.subTitleNepali2 && <h2 className="text-base font-bold">{generalSettings.subTitleNepali2}</h2>}
                  {generalSettings.subTitleNepali3 && <h2 className="text-base font-bold">{generalSettings.subTitleNepali3}</h2>}
                  
                  <div className="text-[10px] font-bold text-slate-500 mt-2 space-x-2">
                    <span>{generalSettings.address}</span>
                    {generalSettings.phone && <span>| फोन: {generalSettings.phone}</span>}
                    {generalSettings.email && <span>| ईमेल: {generalSettings.email}</span>}
                    {generalSettings.website && <span>| वेबसाइट: {generalSettings.website}</span>}
                    {generalSettings.panNo && <span>| पान नं: {generalSettings.panNo}</span>}
                  </div>

                  <h2 className="text-2xl font-black underline underline-offset-8 mt-6">माग फारम</h2>
              </div>
              <p className="font-bold text-[10px] border border-black px-1 h-fit">म.ले.प.फा.नं. ४०१</p>
          </div>

          <div className="flex justify-end mb-6 text-sm">
              <div className="text-right space-y-1">
                  <p>आर्थिक वर्ष: <span className="font-bold border-b border-dotted border-black px-4">{formDetails.fiscalYear}</span></p>
                  <p>माग नं: <span className="font-bold text-red-600 border-b border-dotted border-black px-4">#{formDetails.formNo}</span></p>
                  <p>मिति <span className="text-red-500">*</span>: <input value={formDetails.date} onChange={e => setFormDetails({...formDetails, date: e.target.value})} disabled={isViewOnly} className="font-bold border-b border-dotted border-black px-1 outline-none w-32 text-right bg-transparent focus:border-slate-800" placeholder="YYYY-MM-DD" /></p>
              </div>
          </div>

          <table className="w-full border-collapse border border-black text-center text-xs">
              <thead>
                  <tr className="bg-slate-100">
                      <th rowSpan={2} className="border border-black p-2 w-10">क्र.सं.</th>
                      <th colSpan={2} className="border border-black p-2">जिन्सी मालसामानको विवरण</th>
                      <th rowSpan={2} className="border border-black p-2 w-16">एकाई</th>
                      <th rowSpan={2} className="border border-black p-2 w-20">माग गरिएको परिमाण</th>
                      <th rowSpan={2} className="border border-black p-2 w-20">जिन्सी खाता पाना नं.</th>
                      <th rowSpan={2} className="border border-black p-2">कैफियत</th>
                      <th rowSpan={2} className="border border-black p-2 w-8 no-print"></th>
                  </tr>
                  <tr><th className="border border-black p-1">नाम</th><th className="border border-black p-1">स्पेसिफिकेसन</th></tr>
              </thead>
              <tbody>
                  {items.map((item, index) => {
                      const stockEntries = inventoryItems.filter(inv => inv.itemName.trim().toLowerCase() === item.name.trim().toLowerCase());
                      const totalStock = stockEntries.reduce((acc, curr) => acc + (curr.currentQuantity || 0), 0);
                      
                      return (
                      <tr key={item.id}>
                          <td className="border border-black p-2 relative group cursor-help">
                             {index + 1}
                             {item.name && (
                               <div className="absolute left-full top-0 ml-2 hidden group-hover:block z-[100] w-56 bg-slate-900 text-white text-[10px] p-3 rounded-xl shadow-2xl pointer-events-none text-left border border-slate-700 animate-in fade-in zoom-in-95 no-print">
                                 <div className="flex items-center gap-2 border-b border-slate-700 mb-2 pb-1.5 text-blue-400">
                                     <Warehouse size={12}/>
                                     <p className="font-black uppercase tracking-wider">मौज्दात विवरण (Stock Status)</p>
                                 </div>
                                 {stockEntries.length > 0 ? (
                                   <div className="space-y-1.5">
                                      {stockEntries.map((si, sIdx) => {
                                          const store = stores.find(s => s.id === si.storeId);
                                          return (
                                            <div key={sIdx} className="flex justify-between items-center bg-slate-800/50 p-1 px-1.5 rounded">
                                                <span className="text-slate-300">{store?.name || 'Unknown Store'}:</span>
                                                <span className="font-black text-white">{si.currentQuantity} {si.unit}</span>
                                            </div>
                                          )
                                      })}
                                      <div className="border-t border-slate-700 pt-1.5 mt-1.5 font-black flex justify-between text-green-400 text-xs">
                                          <span>कुल मौज्दात:</span>
                                          <span>{totalStock} {item.unit}</span>
                                      </div>
                                   </div>
                                 ) : (
                                   <p className="text-red-400 font-bold flex items-center gap-1"><AlertCircle size={10}/> गोदाममा मौज्दात छैन (Out of Stock)</p>
                                 )}
                               </div>
                             )}
                          </td>
                          <td className="border border-black p-1 text-left font-bold">
                             {!isViewOnly ? (
                                <SearchableSelect options={itemOptions} value={item.name} onChange={val => handleItemNameChange(item.id, val)} onSelect={opt => handleItemNameChange(item.id, opt.value)} placeholder="..." className="!border-none !p-0" />
                             ) : item.name}
                          </td>
                          <td className="border border-black p-1">
                            <input 
                              value={item.specification} 
                              onChange={e => updateItemField(item.id, 'specification', e.target.value)} 
                              disabled={isViewOnly || item.isFromInventory} 
                              className={`w-full bg-transparent outline-none text-center ${item.isFromInventory ? 'bg-slate-50 cursor-not-allowed text-slate-500' : ''}`} 
                            />
                          </td>
                          <td className="border border-black p-1">
                            <input 
                              value={item.unit} 
                              onChange={e => updateItemField(item.id, 'unit', e.target.value)} 
                              disabled={isViewOnly || item.isFromInventory} 
                              className={`w-full bg-transparent outline-none text-center ${item.isFromInventory ? 'bg-slate-50 cursor-not-allowed text-slate-500' : ''}`} 
                            />
                          </td>
                          <td className="border border-black p-1 font-black"><input value={item.quantity} onChange={e => updateItemField(item.id, 'quantity', e.target.value)} disabled={isViewOnly} className="w-full bg-transparent outline-none text-center" placeholder="०" /></td>
                          <td className="border border-black p-1"><input value={item.codeNo} onChange={e => updateItemField(item.id, 'codeNo', e.target.value)} disabled={isViewOnly} className="w-full bg-transparent outline-none text-center" /></td>
                          <td className="border border-black p-1"><input value={item.remarks} onChange={e => updateItemField(item.id, 'remarks', e.target.value)} disabled={isViewOnly} className="w-full bg-transparent outline-none" /></td>
                          <td className="border border-black p-1 text-center no-print"><button onClick={() => handleRemoveItem(item.id)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={14}/></button></td>
                      </tr>
                  )})}
              </tbody>
          </table>
          
          {!isViewOnly && (
            <button 
                onClick={handleAddItem} 
                disabled={items.length >= 14}
                className={`no-print font-bold text-xs mt-3 flex items-center gap-1 ${items.length >= 14 ? 'text-slate-400 cursor-not-allowed' : 'text-primary-600 hover:text-primary-700'}`}
            >
                <Plus size={14} /> थप थप्नुहोस् (अधिकतम १४)
            </button>
          )}

          <div className="grid grid-cols-2 gap-x-12 gap-y-16 mt-16 text-[11px] font-bold">
              <div className="space-y-4">
                  <div className="border-t border-black pt-2">
                      <p className="mb-6">माग गर्नेको दस्तखत</p>
                      <p>नाम: {formDetails.demandBy?.name}</p>
                      <p>पद: <input value={formDetails.demandBy?.designation} onChange={e => setFormDetails({...formDetails, demandBy: {...formDetails.demandBy!, designation: e.target.value}})} disabled={isViewOnly} className="border-none bg-transparent outline-none font-bold" placeholder="...................." /></p>
                      <p>मिति: {formDetails.demandBy?.date}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span>प्रयोजन <span className="text-red-500">*</span>:</span>
                        <input value={formDetails.demandBy?.purpose} onChange={e => setFormDetails({...formDetails, demandBy: {...formDetails.demandBy!, purpose: e.target.value}})} disabled={isViewOnly} className="border-b border-dotted border-black flex-1 outline-none bg-transparent font-bold px-1" placeholder="मागको प्रयोजन लेख्नुहोस्..." />
                      </div>
                  </div>
                  <div className="border-t border-black pt-2">
                      <p className="mb-6">मालसामान बुझिलिनेको दस्तखत</p>
                      <p>नाम: <input value={formDetails.receiver?.name} onChange={e => setFormDetails({...formDetails, receiver: {...formDetails.receiver!, name: e.target.value}})} disabled={isViewOnly} className="border-none bg-transparent outline-none font-bold" placeholder="...................." /></p>
                      <p>पद: <input value={formDetails.receiver?.designation} onChange={e => setFormDetails({...formDetails, receiver: {...formDetails.receiver!, designation: e.target.value}})} disabled={isViewOnly} className="border-none bg-transparent outline-none font-bold" placeholder="...................." /></p>
                      <p>मिति: <input value={formDetails.receiver?.date} onChange={e => setFormDetails({...formDetails, receiver: {...formDetails.receiver!, date: e.target.value}})} disabled={isViewOnly} className="border-none bg-transparent outline-none" placeholder="...................." /></p>
                  </div>
              </div>
              <div className="space-y-4">
                  <div className="border-t border-black pt-2 relative">
                      <div className="flex flex-col gap-1 mb-2 no-print">
                           <label className={`flex items-center gap-2 transition-colors ${isViewOnly || !isStoreKeeper ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:text-primary-600'}`}>
                               <input type="checkbox" checked={formDetails.storeKeeper?.marketRequired} onChange={e => setFormDetails({...formDetails, storeKeeper: {...formDetails.storeKeeper!, marketRequired: e.target.checked}})} disabled={isViewOnly || !isStoreKeeper} className="w-3 h-3" /> बजारबाट खरिद गर्नु पर्ने
                           </label>
                           <label className={`flex items-center gap-2 transition-colors ${isViewOnly || !isStoreKeeper ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:text-primary-600'}`}>
                               <input type="checkbox" checked={formDetails.storeKeeper?.inStock} onChange={e => setFormDetails({...formDetails, storeKeeper: {...formDetails.storeKeeper!, inStock: e.target.checked}})} disabled={isViewOnly || !isStoreKeeper} className="w-3 h-3" /> मौज्दातमा रहेको
                           </label>
                      </div>
                      <p className="mb-6">सिफारिस गर्नेको दस्तखत</p>
                      <p>नाम: <span className="font-bold border-b border-dotted border-black px-2 min-w-[100px] inline-block">{formDetails.recommendedBy?.name || '....................................'}</span></p>
                      <p>पद: <span className="font-bold border-b border-dotted border-black px-2 min-w-[100px] inline-block">{formDetails.recommendedBy?.designation || '....................................'}</span></p>
                      <p>मिति: <span className="font-bold border-b border-dotted border-black px-2 min-w-[100px] inline-block">{formDetails.recommendedBy?.date || '....................................'}</span></p>
                  </div>
                  <div className="border-t border-black pt-2">
                      <p className="mb-6">स्वीकृत गर्नेको दस्तखत</p>
                      <p>नाम: <input value={formDetails.approvedBy?.name} onChange={e => setFormDetails({...formDetails, approvedBy: {...formDetails.approvedBy!, name: e.target.value}})} disabled={isViewOnly} className="border-none bg-transparent outline-none font-bold" placeholder="...................." /></p>
                      <p>पद: <input value={formDetails.approvedBy?.designation} onChange={e => setFormDetails({...formDetails, approvedBy: {...formDetails.approvedBy!, designation: e.target.value}})} disabled={isViewOnly} className="border-none bg-transparent outline-none font-bold" placeholder="...................." /></p>
                      <p>मिति: <input value={formDetails.approvedBy?.date} onChange={e => setFormDetails({...formDetails, approvedBy: {...formDetails.approvedBy!, date: e.target.value}})} disabled={isViewOnly} className="border-none bg-transparent outline-none" placeholder="...................." /></p>
                  </div>
              </div>
          </div>
       </div>
    </div>
  );
};
