
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Trash2, Printer, Save, Calendar, CheckCircle2, Send, Clock, FileText, Eye, Search, X, AlertCircle, ChevronRight, ArrowLeft, Check, Square, Warehouse, Layers, ShieldCheck, Info } from 'lucide-react';
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
    if (isViewOnly || items.length >= 15) return;
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
      setItems(form.items.map((item, idx) => ({ ...item, id: item.id || (Date.now() + idx + Math.random()) })));
      setFormDetails({ ...form });
  };

  const handleReset = () => {
    setEditingId(null); setIsViewOnly(false); setValidationError(null); setSuccessMessage(null); setIsSaved(false);
    setItems([{ id: Date.now() + Math.random(), name: '', specification: '', unit: '', quantity: '', remarks: '', isFromInventory: false }]);
    setFormDetails(prev => ({ 
        ...prev, id: '', items: [], status: 'Pending', 
        demandBy: { name: currentUser.fullName, designation: currentUser.designation, date: todayBS, purpose: '' },
        receiver: { name: '', designation: '', date: '' },
        storeKeeper: { name: '', date: '', verified: false, marketRequired: false, inStock: false }
    }));
  };

  const handleSave = () => {
    if (!formDetails.demandBy?.purpose) { setValidationError("प्रयोजन भर्नुहोस्।"); return; }
    onSave({
        ...formDetails,
        id: editingId === 'new' || !editingId ? Date.now().toString() : editingId,
        items: items.map(({ isFromInventory, ...rest }) => rest),
        status: 'Pending'
    });
    setSuccessMessage("माग फारम सुरक्षित गरियो।");
    setTimeout(handleReset, 1500);
  };

  // HIGH-FIDELITY OFFICIAL MA.LE.PA 401 PRINTING (Independent of main UI icons)
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

      // Fill empty rows to maintain government style
      const emptyRows = items.length < 10 ? Array.from({length: 10 - items.length}).map(() => `
        <tr style="height: 25px;">
          <td style="border: 1px solid black;"></td><td style="border: 1px solid black;"></td><td style="border: 1px solid black;"></td>
          <td style="border: 1px solid black;"></td><td style="border: 1px solid black;"></td><td style="border: 1px solid black;"></td>
          <td style="border: 1px solid black;"></td>
        </tr>
      `).join('') : '';

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
              .form-no-label { position: absolute; right: 0; top: 0; border: 1px solid black; padding: 2px 5px; font-size: 10px; font-weight: bold; }
              .title { font-size: 22px; font-weight: 800; text-decoration: underline; margin-top: 15px; }
              .meta { display: flex; justify-content: space-between; margin: 20px 0; font-size: 13px; }
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
              <div class="title">माग फारम</div>
            </div>

            <div class="meta">
              <div>प्रयोजन: <span class="meta-line">${formDetails.demandBy?.purpose || '....................................'}</span></div>
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
                ${emptyRows}
              </tbody>
            </table>

            <div class="footer">
              <div class="sig-block">
                <span class="sig-label">माग गर्नेको दस्तखत</span>
                <div style="font-size: 12px;">
                  नाम: ${formDetails.demandBy?.name}<br/>
                  पद: ${formDetails.demandBy?.designation}<br/>
                  मिति: ${formDetails.demandBy?.date}
                </div>
              </div>
              <div class="sig-block">
                <div class="check-box-list">
                  <div class="check-item"><div class="box">${formDetails.storeKeeper?.marketRequired ? '✓' : ''}</div> बजारबाट खरिद गर्नु पर्ने</div>
                  <div class="check-item"><div class="box">${formDetails.storeKeeper?.inStock ? '✓' : ''}</div> मौज्दातमा रहेको</div>
                </div>
                <span class="sig-label">सिफारिस गर्नेको दस्तखत</span>
                <div style="font-size: 11px;">
                  नाम: ..............................<br/>
                  पद: ..............................<br/>
                  मिति: ..............................
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
            <div className="flex justify-between items-center border-b pb-4">
                <h2 className="text-xl font-bold text-slate-800 font-nepali">माग फारम (Mag Faram)</h2>
                <button onClick={() => setEditingId('new')} className="bg-primary-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg font-bold font-nepali"><Plus size={20} /> नयाँ माग फारम</button>
            </div>
            {existingForms.length > 0 && (
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50"><tr><th className="px-6 py-3">माग नं</th><th className="px-6 py-3">मिति</th><th className="px-6 py-3">अवस्था</th><th className="px-6 py-3 text-right">कार्य</th></tr></thead>
                        <tbody className="divide-y">
                            {existingForms.map(f => (
                                <tr key={f.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-3 font-mono font-bold text-indigo-600">#{f.formNo}</td>
                                    <td className="px-6 py-3 font-nepali">{f.date}</td>
                                    <td className="px-6 py-3"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold border">{f.status}</span></td>
                                    <td className="px-6 py-3 text-right">
                                        <button onClick={() => handleLoadForm(f, true)} className="text-slate-400 hover:text-primary-600 p-2"><Eye size={18} /></button>
                                        <button onClick={() => { handleLoadForm(f, true); setTimeout(printOfficialForm, 300); }} className="text-slate-400 hover:text-slate-900 p-2"><Printer size={18} /></button>
                                    </td>
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
                <button onClick={handleSave} disabled={isSaved} className={`px-6 py-2 text-white rounded-lg font-bold shadow-md ${isSaved ? 'bg-green-600' : 'bg-primary-600 hover:bg-primary-700'}`}>
                    {isSaved ? 'सुरक्षित भयो' : 'सुरक्षित गर्नुहोस्'}
                </button>
            )}
            <button onClick={printOfficialForm} className="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold shadow-md flex items-center gap-2"><Printer size={18} /> प्रिन्ट गर्नुहोस्</button>
          </div>
       </div>

       <div className="bg-white p-10 md:p-14 max-w-[210mm] mx-auto min-h-[297mm] font-nepali text-slate-900 shadow-2xl rounded-xl">
          <div className="flex justify-between items-start mb-6">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png" className="w-20 h-20 object-contain" />
              <div className="text-center flex-1">
                  <h1 className="text-xl font-black text-red-600 uppercase leading-tight">{generalSettings.orgNameNepali}</h1>
                  <h2 className="text-base font-bold">{generalSettings.subTitleNepali}</h2>
                  <h2 className="text-2xl font-black underline underline-offset-8 mt-6">माग फारम</h2>
              </div>
              <p className="font-bold text-[10px] border border-black px-1 h-fit">म.ले.प.फा.नं. ४०१</p>
          </div>

          <div className="flex justify-between items-end mb-6 text-sm">
              <div className="flex-1 flex items-center gap-2">
                <span>प्रयोजन:</span>
                <input value={formDetails.demandBy?.purpose} onChange={e => setFormDetails({...formDetails, demandBy: {...formDetails.demandBy, purpose: e.target.value}})} disabled={isViewOnly} className="border-b border-dotted border-black flex-1 outline-none bg-transparent font-bold px-1" />
              </div>
              <div className="text-right space-y-1 ml-10">
                  <p>आर्थिक वर्ष: <span className="font-bold border-b border-dotted border-black px-4">{formDetails.fiscalYear}</span></p>
                  <p>माग नं: <span className="font-bold text-red-600 border-b border-dotted border-black px-4">#{formDetails.formNo}</span></p>
                  <p>मिति: <span className="font-bold border-b border-dotted border-black px-4">{formDetails.date}</span></p>
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
                  {items.map((item, index) => (
                      <tr key={item.id}>
                          <td className="border border-black p-2">{index + 1}</td>
                          <td className="border border-black p-1 text-left font-bold">
                             {!isViewOnly ? (
                                <SearchableSelect options={[]} value={item.name} onChange={val => handleItemNameChange(item.id, val)} placeholder="..." className="!border-none !p-0" />
                             ) : item.name}
                          </td>
                          <td className="border border-black p-1"><input value={item.specification} onChange={e => updateItemField(item.id, 'specification', e.target.value)} disabled={isViewOnly} className="w-full bg-transparent outline-none text-center" /></td>
                          <td className="border border-black p-1"><input value={item.unit} onChange={e => updateItemField(item.id, 'unit', e.target.value)} disabled={isViewOnly} className="w-full bg-transparent outline-none text-center" /></td>
                          <td className="border border-black p-1 font-black"><input value={item.quantity} onChange={e => updateItemField(item.id, 'quantity', e.target.value)} disabled={isViewOnly} className="w-full bg-transparent outline-none text-center" /></td>
                          <td className="border border-black p-1"><input value={item.codeNo} onChange={e => updateItemField(item.id, 'codeNo', e.target.value)} disabled={isViewOnly} className="w-full bg-transparent outline-none text-center" /></td>
                          <td className="border border-black p-1"><input value={item.remarks} onChange={e => updateItemField(item.id, 'remarks', e.target.value)} disabled={isViewOnly} className="w-full bg-transparent outline-none" /></td>
                          <td className="border border-black p-1 text-center no-print"><button onClick={() => handleRemoveItem(item.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button></td>
                      </tr>
                  ))}
                  {items.length < 8 && Array.from({length: 8 - items.length}).map((_, i) => (
                      <tr key={`empty-${i}`} className="h-8"><td className="border border-black" colSpan={7}></td><td className="border border-black no-print"></td></tr>
                  ))}
              </tbody>
          </table>
          
          {!isViewOnly && <button onClick={handleAddItem} className="no-print text-primary-600 font-bold text-xs mt-3 flex items-center gap-1"><Plus size={14} /> थप थप्नुहोस्</button>}

          <div className="grid grid-cols-2 gap-x-12 gap-y-16 mt-16 text-[11px] font-bold">
              <div className="space-y-4">
                  <div className="border-t border-black pt-2">
                      <p className="mb-6">माग गर्नेको दस्तखत</p>
                      <p>नाम: {formDetails.demandBy?.name}</p>
                      <p>मिति: {formDetails.demandBy?.date}</p>
                  </div>
                  <div className="border-t border-black pt-2">
                      <p className="mb-6">मालसामान बुझिलिनेको दस्तखत</p>
                      <p>नाम: <input value={formDetails.receiver?.name} onChange={e => setFormDetails({...formDetails, receiver: {...formDetails.receiver, name: e.target.value}})} disabled={isViewOnly} className="border-none bg-transparent outline-none font-bold" placeholder="...................." /></p>
                      <p>मिति: <input value={formDetails.receiver?.date} onChange={e => setFormDetails({...formDetails, receiver: {...formDetails.receiver, date: e.target.value}})} disabled={isViewOnly} className="border-none bg-transparent outline-none" placeholder="...................." /></p>
                  </div>
              </div>
              <div className="space-y-4">
                  <div className="border-t border-black pt-2 relative">
                      <div className="flex flex-col gap-1 mb-2 no-print">
                           <label className="flex items-center gap-2"><input type="checkbox" checked={formDetails.storeKeeper?.marketRequired} onChange={e => setFormDetails({...formDetails, storeKeeper: {...formDetails.storeKeeper!, marketRequired: e.target.checked}})} disabled={isViewOnly} className="w-3 h-3" /> बजारबाट खरिद गर्नु पर्ने</label>
                           <label className="flex items-center gap-2"><input type="checkbox" checked={formDetails.storeKeeper?.inStock} onChange={e => setFormDetails({...formDetails, storeKeeper: {...formDetails.storeKeeper!, inStock: e.target.checked}})} disabled={isViewOnly} className="w-3 h-3" /> मौज्दातमा रहेको</label>
                      </div>
                      <p className="mb-6">सिफारिस गर्नेको दस्तखत</p>
                      <p>नाम: ....................................</p>
                  </div>
                  <div className="border-t border-black pt-2">
                      <p className="mb-6">स्वीकृत गर्नेको दस्तखत</p>
                      <p>नाम: {formDetails.approvedBy?.name || '....................................'}</p>
                      <p>मिति: {formDetails.approvedBy?.date || '....................................'}</p>
                  </div>
              </div>
          </div>
       </div>
    </div>
  );
};
