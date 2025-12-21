
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Trash2, Printer, Save, Calendar, CheckCircle2, Send, Clock, FileText, Eye, Search, X, AlertCircle, ChevronRight, ArrowLeft, Check, Square, Warehouse, Layers, ShieldCheck } from 'lucide-react';
import { User, MagItem, MagFormEntry, InventoryItem, Option, Store, OrganizationSettings } from '../types';
import { SearchableSelect } from './SearchableSelect';
import { Select } from './Select';
import { NepaliDatePicker } from './NepaliDatePicker';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

// Extended local interface to track if item was picked from inventory
interface LocalMagItem extends MagItem {
  isFromInventory?: boolean;
}

interface MagFaramProps {
  currentFiscalYear: string;
  currentUser: User;
  existingForms: MagFormEntry[];
  onSave: (form: MagFormEntry) => void;
  inventoryItems: InventoryItem[];
  stores?: Store[];
  generalSettings: OrganizationSettings;
}

export const MagFaram: React.FC<MagFaramProps> = ({ currentFiscalYear, currentUser, existingForms, onSave, inventoryItems, generalSettings, stores = [] }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Rejection States
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Verification Popup States
  const [showVerifyPopup, setShowVerifyPopup] = useState(false);
  const [verificationData, setVerificationData] = useState({
      storeId: '',
      itemType: '' as 'Expendable' | 'Non-Expendable' | ''
  });

  const generateMagFormNo = (forms: MagFormEntry[], fy: string) => {
    const fyForms = forms.filter(f => f.fiscalYear === fy);
    if (fyForms.length === 0) return "0001-MF";
    
    const maxNo = fyForms.reduce((max, f) => {
        let val = 0;
        if (typeof f.formNo === 'string') {
            const parts = f.formNo.split('-');
            val = parseInt(parts[0]);
        } else if (typeof f.formNo === 'number') {
            val = f.formNo;
        }
        return isNaN(val) ? max : Math.max(max, val);
    }, 0);
    
    return `${String(maxNo + 1).padStart(4, '0')}-MF`;
  };

  const todayBS = useMemo(() => {
    try {
      return new NepaliDate().format('YYYY-MM-DD');
    } catch (e) {
      return '';
    }
  }, []);

  const [items, setItems] = useState<LocalMagItem[]>([{ id: Date.now(), name: '', specification: '', unit: '', quantity: '', remarks: '', isFromInventory: false }]);
  
  const [formDetails, setFormDetails] = useState<MagFormEntry>({
    id: '',
    items: [],
    fiscalYear: currentFiscalYear,
    formNo: '',
    date: todayBS,
    status: 'Pending',
    demandBy: { name: currentUser.fullName, designation: currentUser.designation, date: todayBS, purpose: '' },
    recommendedBy: { name: '', designation: '', date: '' },
    storeKeeper: { status: 'stock', name: '' },
    receiver: { name: '', designation: '', date: '' }, 
    ledgerEntry: { name: '', date: '' },
    approvedBy: { name: '', designation: '', date: '' },
    isViewedByRequester: true
  });

  useEffect(() => {
    if (!editingId && !formDetails.id) {
        setFormDetails(prev => ({
            ...prev,
            formNo: generateMagFormNo(existingForms, currentFiscalYear)
        }));
    }
  }, [editingId, existingForms, currentFiscalYear]);

  // STRICTOR ROLE DEFINITIONS for action filtering
  const isStrictStoreKeeper = currentUser.role === 'STOREKEEPER';
  const isAdminOrApproval = ['ADMIN', 'SUPER_ADMIN', 'APPROVAL'].includes(currentUser.role);
  
  // For permission to actually perform the action in the form
  const canVerify = isStrictStoreKeeper || ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
  const canApprove = isAdminOrApproval;

  // Workflow context helpers
  const isNewForm = !editingId || editingId === 'new';
  const isVerifying = !isViewOnly && !isNewForm && canVerify && formDetails.status === 'Pending';
  const isApproving = !isViewOnly && !isNewForm && canApprove && formDetails.status === 'Verified';

  // Actionable: ONLY Storekeeper sees Pending. Admins see Verified.
  const actionableForms = useMemo(() => {
      // 1. Storekeeper strictly sees forms waiting for verification
      if (currentUser.role === 'STOREKEEPER') {
          return existingForms.filter(f => f.status === 'Pending').sort((a, b) => b.id.localeCompare(a.id));
      }
      // 2. Admin/Approver strictly sees forms that are already verified and waiting for final approval
      if (['ADMIN', 'SUPER_ADMIN', 'APPROVAL'].includes(currentUser.role)) {
          return existingForms.filter(f => f.status === 'Verified').sort((a, b) => b.id.localeCompare(a.id));
      }
      return [];
  }, [existingForms, currentUser.role]);

  const historyForms = useMemo(() => {
      const myForms = existingForms.filter(f => f.demandBy?.name === currentUser.fullName);
      // History shows official records (Approved/Rejected) for all administrative roles
      const officialHistory = (isAdminOrApproval || isStrictStoreKeeper)
          ? existingForms.filter(f => f.status === 'Approved' || f.status === 'Rejected')
          : [];
      const combined = [...new Map([...myForms, ...officialHistory].map(item => [item.id, item])).values()];
      return combined.sort((a, b) => b.id.localeCompare(a.id));
  }, [existingForms, isAdminOrApproval, isStrictStoreKeeper, currentUser.fullName]);

  const itemOptions = useMemo(() => inventoryItems.map(item => {
    const typeLabel = item.itemType === 'Expendable' ? 'खर्च हुने' : 'खर्च नहुने';
    return {
      id: item.id,
      value: item.itemName,
      label: `${item.itemName} (${item.unit}) - मौज्दात: ${item.currentQuantity} [${typeLabel}]`,
      itemData: item
    };
  }), [inventoryItems]);

  const storeOptions: Option[] = useMemo(() => stores.map(s => ({ id: s.id, value: s.id, label: s.name })), [stores]);

  const handleAddItem = () => {
    if (items.length < 14) {
      setItems([...items, { id: Date.now(), name: '', specification: '', unit: '', quantity: '', remarks: '', isFromInventory: false }]);
    } else {
      alert("अधिकतम १४ वटा सामान मात्र माग गर्न सकिन्छ।");
    }
  };

  const handleRemoveItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(i => i.id !== id));
    } else {
      setItems([{ id: Date.now(), name: '', specification: '', unit: '', quantity: '', remarks: '', isFromInventory: false }]);
    }
  };
  
  const updateItem = useCallback((id: number, field: keyof LocalMagItem, value: any) => {
    setItems(prevItems => prevItems.map(item => {
        if (item.id === id) {
            const updated = { ...item, [field]: value };
            if (field === 'name') updated.isFromInventory = false;
            return updated;
        }
        return item;
    }));
  }, []);

  const handleItemSelect = (id: number, option: Option) => {
    const invItem = option.itemData as InventoryItem;
    if (invItem) {
        setItems(prevItems => prevItems.map(item => {
            if (item.id === id) {
                return {
                    ...item,
                    name: invItem.itemName,
                    unit: invItem.unit,
                    specification: invItem.specification || item.specification,
                    isFromInventory: true
                };
            }
            return item;
        }));
    }
  };

  const updateStoreKeeperStatus = (status: string) => {
      if (isViewOnly || !isVerifying) return;
      setFormDetails(prev => ({
          ...prev,
          storeKeeper: { ...prev.storeKeeper, status, name: prev.storeKeeper?.name || currentUser.fullName }
      }));
  };

  const handleLoadForm = (form: MagFormEntry, viewOnly: boolean = false) => {
      setEditingId(form.id);
      setIsViewOnly(viewOnly);
      setItems(form.items.map(item => {
          const matched = inventoryItems.some(i => i.itemName === item.name);
          return { ...item, isFromInventory: matched };
      }));
      
      if (viewOnly && form.isViewedByRequester === false && form.demandBy?.name === currentUser.fullName) {
          const updatedForm = { ...form, isViewedByRequester: true };
          onSave(updatedForm);
          setFormDetails(updatedForm);
      } else {
          setFormDetails({ ...form });
      }
      
      setValidationError(null);
  };

  const handleSave = () => {
    setValidationError(null);
    if (!formDetails.date) { setValidationError("कृपया मिति भर्नुहोस्।"); return; }
    if (!formDetails.demandBy?.purpose) { setValidationError("कृपया प्रयोजन भर्नुहोस्।"); return; }

    const validItems = items.filter(item => item.name && item.name.trim() !== '');
    if (validItems.length === 0) { setValidationError("कृपया कम्तिमा एउटा सामानको नाम भर्नुहोस्।"); return; }

    // If Storekeeper is verifying
    if (isVerifying) {
        if (formDetails.storeKeeper?.status === 'stock') {
            setShowVerifyPopup(true);
            return;
        }
    }

    finalizeSave();
  };

  const handleReject = () => {
      if (!rejectReason.trim()) {
          alert("कृपया अस्वीकार गर्नुको कारण खुलाउनुहोस्।");
          return;
      }
      
      const newForm: MagFormEntry = {
          ...formDetails,
          status: 'Rejected',
          rejectionReason: rejectReason,
          isViewedByRequester: false, // Notify requester
          approvedBy: { name: currentUser.fullName, designation: currentUser.designation, date: todayBS }
      };
      
      onSave(newForm);
      alert("माग फारम अस्वीकृत गरियो।");
      setShowRejectModal(false);
      handleReset();
  };

  const finalizeSave = (extraData?: { storeId: string, itemType: 'Expendable' | 'Non-Expendable' }) => {
    let nextStatus = formDetails.status || 'Pending';
    let nextIsViewed = true;

    // Track original signature objects
    let updatedStoreKeeper = { ...formDetails.storeKeeper };
    let updatedApprovedBy = { ...formDetails.approvedBy };

    if (editingId && editingId !== 'new') {
        if (isVerifying) {
            nextStatus = 'Verified';
            nextIsViewed = false;
            // Record who verified
            updatedStoreKeeper.name = currentUser.fullName;
        }
        else if (isApproving) {
            nextStatus = 'Approved';
            nextIsViewed = false;
            // Record who approved
            updatedApprovedBy = {
                name: currentUser.fullName,
                designation: currentUser.designation,
                date: todayBS
            };
        }
    }

    const itemsToSave = items.map(({ isFromInventory, ...rest }) => rest);
    
    const newForm: MagFormEntry = {
        ...formDetails,
        id: editingId === 'new' || !editingId ? Date.now().toString() : editingId,
        items: itemsToSave,
        status: nextStatus,
        isViewedByRequester: nextIsViewed,
        storeKeeper: updatedStoreKeeper,
        approvedBy: updatedApprovedBy,
        rejectionReason: "" 
    };

    const finalStoreId = extraData?.storeId || formDetails.selectedStoreId || '';
    const finalItemType = extraData?.itemType || formDetails.issueItemType || '';

    if (finalStoreId) newForm.selectedStoreId = finalStoreId;
    if (finalItemType) newForm.issueItemType = finalItemType as any;

    onSave(newForm);
    alert("माग फारम सुरक्षित भयो।");
    setShowVerifyPopup(false);
    handleReset();
  };

  const handleReset = () => {
    setEditingId(null);
    setIsViewOnly(false);
    setValidationError(null);
    setShowVerifyPopup(false);
    setShowRejectModal(false);
    setRejectReason('');
    setVerificationData({ storeId: '', itemType: '' });
    setItems([{ id: Date.now(), name: '', specification: '', unit: '', quantity: '', remarks: '', isFromInventory: false }]);
    setFormDetails({
        id: '', items: [], fiscalYear: currentFiscalYear, 
        formNo: generateMagFormNo(existingForms, currentFiscalYear),
        date: todayBS, status: 'Pending',
        demandBy: { name: currentUser.fullName, designation: currentUser.designation, date: todayBS, purpose: '' },
        recommendedBy: { name: '', designation: '', date: '' },
        storeKeeper: { status: 'stock', name: '' },
        receiver: { name: '', designation: '', date: '' }, 
        ledgerEntry: { name: '', date: '' },
        approvedBy: { name: '', designation: '', date: '' },
        isViewedByRequester: true
    });
  };

  const inputReadOnlyClass = "border-b border-dotted border-slate-800 flex-1 outline-none bg-slate-50 text-slate-500 cursor-not-allowed px-1 rounded-sm";
  const inputEditableClass = "border-b border-dotted border-slate-800 flex-1 outline-none bg-white focus:bg-primary-50 px-1 rounded-sm";

  if (!editingId) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 font-nepali">माग फारम व्यवस्थापन (Mag Faram)</h2>
                    <p className="text-sm text-slate-500 font-nepali">म.ले.प. फारम नं ४०१ अनुसारको माग फारम</p>
                </div>
                <button onClick={() => setEditingId('new')} className="bg-primary-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg hover:bg-primary-700 transition-all font-bold font-nepali">
                    <Plus size={20} /> नयाँ माग फारम थप्नुहोस्
                </button>
            </div>

            {actionableForms.length > 0 && (
                <div className="bg-white rounded-xl border border-orange-200 shadow-sm overflow-hidden mb-6">
                    <div className="bg-orange-50 px-6 py-3 border-b border-orange-100 flex justify-between items-center text-orange-800">
                        <div className="flex items-center gap-2"><Clock size={18} /><h3 className="font-bold font-nepali">
                            {isStrictStoreKeeper ? 'प्रमाणिकरणको लागि बाँकी' : 'स्वीकृतिको लागि बाँकी'}
                        </h3></div>
                        <span className="bg-orange-200 text-xs font-bold px-2 py-0.5 rounded-full">{actionableForms.length} Forms</span>
                    </div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-medium">
                            <tr><th className="px-6 py-3">Form No</th><th className="px-6 py-3">Requested By</th><th className="px-6 py-3">Date</th><th className="px-6 py-3 text-right">Action</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {actionableForms.map(f => (
                                <tr key={f.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-mono font-bold text-slate-700">#{f.formNo}</td>
                                    <td className="px-6 py-4">{f.demandBy?.name}</td>
                                    <td className="px-6 py-4 font-nepali">{f.date}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleLoadForm(f)} className="text-primary-600 font-bold hover:underline bg-primary-50 px-3 py-1.5 rounded-lg">
                                            {isStrictStoreKeeper ? 'Verify Now' : 'Review & Approve'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 text-slate-700 font-bold font-nepali flex items-center gap-2"><FileText size={18} /> फारम इतिहास (History)</div>
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr><th className="px-6 py-3">Form No</th><th className="px-6 py-3">Date</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-right">Action</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {historyForms.map(f => {
                            const isNewUpdate = f.isViewedByRequester === false && f.demandBy?.name === currentUser.fullName;
                            return (
                                <tr key={f.id} className={`hover:bg-slate-50 ${isNewUpdate ? 'bg-primary-50/30' : ''}`}>
                                    <td className="px-6 py-3 font-mono font-bold">#{f.formNo}</td>
                                    <td className="px-6 py-3 font-nepali">{f.date}</td>
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                                f.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' : 
                                                f.status === 'Verified' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                f.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                                'bg-orange-50 text-orange-700 border-orange-200'
                                            }`}>
                                                {f.status}
                                            </span>
                                            {isNewUpdate && (
                                                <span className="flex h-5 items-center gap-1 animate-pulse">
                                                    <span className="h-2 w-2 rounded-full bg-red-500"></span>
                                                    <span className="text-[10px] font-bold text-red-600 uppercase">NEW</span>
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <button onClick={() => handleLoadForm(f, true)} className={`p-2 rounded-full transition-colors ${isNewUpdate ? 'text-primary-600 bg-primary-100 hover:bg-primary-200' : 'text-slate-400 hover:text-primary-600'}`} title="Preview">
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {historyForms.length === 0 && (
                            <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">कुनै माग फारम भेटिएन।</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
          <div className="flex items-center gap-3">
              <button onClick={handleReset} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={20} /></button>
              <h2 className="font-bold text-slate-700 font-nepali text-lg">{isViewOnly ? 'माग फारम प्रिभ्यु' : 'माग फारम भर्नुहोस्'}</h2>
          </div>
          <div className="flex gap-2">
            {!isViewOnly && (
                <>
                    {(isVerifying || isApproving) && (
                        <button onClick={() => setShowRejectModal(true)} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium border border-red-200">
                           <X size={18} /> अस्वीकार (Reject)
                        </button>
                    )}
                    <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium shadow-sm">
                        <Save size={18} /> {isVerifying ? 'प्रमाणित गर्नुहोस्' : isApproving ? 'स्वीकृत गर्नुहोस्' : 'सुरक्षित गर्नुहोस्'}
                    </button>
                </>
            )}
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-lg font-medium shadow-sm transition-colors">
                <Printer size={18} /> प्रिन्ट गर्नुहोस्
            </button>
          </div>
       </div>

       {validationError && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex items-start gap-3 animate-in slide-in-from-top-2 no-print mx-auto max-w-[210mm]">
                <div className="text-red-500 mt-0.5"><AlertCircle size={24} /></div>
                <div className="flex-1">
                    <h3 className="text-red-800 font-bold text-sm">त्रुटि (Validation Error)</h3>
                    <p className="text-red-700 text-sm mt-1 font-nepali">{validationError}</p>
                </div>
                <button onClick={() => setValidationError(null)} className="text-red-400 hover:text-red-600"><X size={20} /></button>
            </div>
       )}

       {formDetails.status === 'Rejected' && formDetails.rejectionReason && (
           <div className="bg-red-600 text-white p-4 rounded-xl shadow-lg max-w-[210mm] mx-auto flex items-start gap-4 mb-4 no-print border-2 border-red-700">
               <div className="bg-white/20 p-2 rounded-lg"><AlertCircle size={24}/></div>
               <div>
                   <h3 className="font-bold text-lg font-nepali uppercase tracking-wider">अस्वीकृत गरिएको माग (Rejected Demand)</h3>
                   <p className="font-nepali text-sm mt-1 bg-black/10 p-2 rounded border border-white/10 italic">
                       कारण: {formDetails.rejectionReason}
                   </p>
               </div>
           </div>
       )}

       <div id="mag-form-print" className="bg-white p-6 md:p-10 max-w-[210mm] mx-auto min-h-[297mm] font-nepali text-slate-900 print:p-0 print:shadow-none print:w-full border shadow-lg rounded-xl">
          <div className="text-right font-bold text-[10px] mb-2">म.ले.प.फारम नं: ४०१</div>
          
          <div className="mb-6">
              <div className="flex items-start justify-between">
                  <div className="w-24 flex justify-start pt-1">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png" alt="Nepal Emblem" className="h-20 w-20 object-contain" />
                  </div>
                  <div className="flex-1 text-center">
                      <h1 className="text-lg font-bold">{generalSettings.orgNameNepali}</h1>
                      <h2 className="text-base font-bold">{generalSettings.subTitleNepali}</h2>
                      {generalSettings.subTitleNepali2 && <h3 className="text-sm font-bold">{generalSettings.subTitleNepali2}</h3>}
                      {generalSettings.subTitleNepali3 && <h3 className="text-base font-bold">{generalSettings.subTitleNepali3}</h3>}
                  </div>
                  <div className="w-24"></div> 
              </div>
              <div className="text-center mt-6">
                  <h2 className="text-lg font-bold underline underline-offset-4">माग फारम</h2>
              </div>
          </div>

          <div className="flex justify-end text-sm mb-4">
              <div className="space-y-1 w-44">
                  <div className="flex justify-between items-center">
                      <span className="font-bold">आर्थिक वर्ष :</span>
                      <span className="font-bold border-b border-dotted border-slate-800 px-1">{currentFiscalYear}</span>
                  </div>
                  <div className="flex justify-between items-center">
                      <span className="font-bold">माग फारम नं :</span>
                      <span className="font-bold border-b border-dotted border-slate-800 px-1 text-red-600">{formDetails.formNo}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                      <span className="font-bold">मिति :</span>
                      <div className="flex-1">
                        <NepaliDatePicker 
                            value={formDetails.date} 
                            onChange={val => setFormDetails({...formDetails, date: val})}
                            format="YYYY-MM-DD"
                            label=""
                            hideIcon={true}
                            inputClassName="!border-none !bg-transparent !p-0 !text-right !font-bold !h-auto !shadow-none !ring-0 border-b border-dotted border-slate-800 rounded-none w-full"
                            disabled={isViewOnly || !isNewForm}
                            popupAlign="right"
                        />
                      </div>
                  </div>
              </div>
          </div>

          <table className="w-full border-collapse border border-slate-800 text-center text-xs">
              <thead className="bg-slate-50 font-bold">
                  <tr>
                      <th className="border border-slate-800 p-2 w-10">क्र.सं.</th>
                      <th className="border border-slate-800 p-2">सामानको नाम</th>
                      <th className="border border-slate-800 p-2 w-32">स्पेसिफिकेशन</th>
                      <th className="border border-slate-800 p-1 w-32" colSpan={2}>माग गरिएको</th>
                      <th className="border border-slate-800 p-2 w-24">कैफियत</th>
                      <th className="border border-slate-800 p-2 w-10 no-print"></th>
                  </tr>
                  <tr>
                      <th className="border border-slate-800 p-1"></th>
                      <th className="border border-slate-800 p-1"></th>
                      <th className="border border-slate-800 p-1"></th>
                      <th className="border border-slate-800 p-1">एकाई</th>
                      <th className="border border-slate-800 p-1">परिमाण</th>
                      <th className="border border-slate-800 p-1"></th>
                      <th className="border border-slate-800 p-1 no-print"></th>
                  </tr>
                  <tr className="bg-slate-100 text-[10px]">
                      <th className="border border-slate-800 p-0.5">१</th>
                      <th className="border border-slate-800 p-0.5">२</th>
                      <th className="border border-slate-800 p-0.5">३</th>
                      <th className="border border-slate-800 p-0.5">४</th>
                      <th className="border border-slate-800 p-0.5">५</th>
                      <th className="border border-slate-800 p-0.5">६</th>
                      <th className="border border-slate-800 p-0.5 no-print"></th>
                  </tr>
              </thead>
              <tbody>
                  {items.map((item, idx) => (
                      <tr key={item.id} className="min-h-[30px]">
                          <td className="border border-slate-800 p-1">{idx + 1}</td>
                          <td className="border border-slate-800 p-0 text-left">
                              {!isViewOnly && isNewForm ? (
                                <SearchableSelect 
                                    options={itemOptions} value={item.name} 
                                    onChange={val => updateItem(item.id, 'name', val)} 
                                    onSelect={opt => handleItemSelect(item.id, opt)} 
                                    className="!border-none !bg-transparent !p-1 !text-xs" placeholder="सामान छान्नुहोस्..."
                                />
                              ) : <span className="px-2 font-medium">{item.name}</span>}
                          </td>
                          <td className="border border-slate-800 p-1">
                              <input 
                                disabled={isViewOnly || !isNewForm || item.isFromInventory} 
                                value={item.specification} 
                                onChange={e => updateItem(item.id, 'specification', e.target.value)} 
                                className={`w-full text-left outline-none bg-transparent px-1 ${item.isFromInventory ? 'text-slate-400 italic cursor-not-allowed' : ''}`} 
                              />
                          </td>
                          <td className="border border-slate-800 p-1">
                              <input 
                                disabled={isViewOnly || !isNewForm || item.isFromInventory} 
                                value={item.unit} 
                                onChange={e => updateItem(item.id, 'unit', e.target.value)} 
                                className={`w-full text-center outline-none bg-transparent ${item.isFromInventory ? 'text-slate-400 font-bold cursor-not-allowed italic' : ''}`} 
                              />
                          </td>
                          <td className="border border-slate-800 p-1 font-bold">
                              <input disabled={isViewOnly || !isNewForm} value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value)} className="w-full text-center outline-none bg-transparent" />
                          </td>
                          <td className="border border-slate-800 p-1">
                              <input disabled={isViewOnly || !isNewForm} value={item.remarks} onChange={e => updateItem(item.id, 'remarks', e.target.value)} className="w-full text-left outline-none bg-transparent px-1" />
                          </td>
                          <td className="border border-slate-800 p-1 no-print">
                              {!isViewOnly && isNewForm && (
                                <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700 p-1 flex items-center justify-center w-full transition-all">
                                    <Trash2 size={14} />
                                </button>
                              )}
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>

          {isNewForm && items.length < 14 && (
            <button onClick={handleAddItem} className="mt-2 no-print flex items-center gap-1 text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded border border-dashed border-primary-200 hover:bg-primary-100 transition-all">
                <Plus size={12} /> थप्नुहोस् (Add Row)
            </button>
          )}

          {formDetails.status === 'Rejected' && formDetails.rejectionReason && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs italic">
                  <strong>अस्वीकृतिको कारण:</strong> {formDetails.rejectionReason}
              </div>
          )}

          <div className="mt-8 text-[11px] grid grid-cols-12 gap-y-10">
              <div className="col-span-4 pr-4">
                  <div className="font-bold mb-4">माग गर्नेको:</div>
                  <div className="space-y-1">
                      <div className="flex gap-1"><span>नाम:</span><input value={formDetails.demandBy?.name} className={inputReadOnlyClass} disabled/></div>
                      <div className="flex gap-1"><span>पद:</span><input value={formDetails.demandBy?.designation} className={inputReadOnlyClass} disabled/></div>
                      <div className="flex gap-1"><span>मिति:</span><input value={formDetails.demandBy?.date} className={inputReadOnlyClass} disabled/></div>
                      <div className="flex gap-1"><span>प्रयोजन:</span><input value={formDetails.demandBy?.purpose} onChange={e => setFormDetails({...formDetails, demandBy: {...formDetails.demandBy!, purpose: e.target.value}})} className={isViewOnly || !isNewForm ? inputReadOnlyClass : inputEditableClass} disabled={isViewOnly || !isNewForm}/></div>
                  </div>
              </div>

              <div className="col-span-4 px-4">
                  <div className="font-bold mb-4">सिफारिस गर्ने:.......</div>
                  <div className="space-y-1">
                      <div className="flex gap-1"><span>नाम:</span><input value={formDetails.recommendedBy?.name} onChange={e => setFormDetails({...formDetails, recommendedBy: {...formDetails.recommendedBy!, name: e.target.value}})} className={isViewOnly || isNewForm || !isAdminOrApproval ? inputReadOnlyClass : inputEditableClass} disabled={isViewOnly || isNewForm || !isAdminOrApproval}/></div>
                      <div className="flex gap-1"><span>पद:</span><input value={formDetails.recommendedBy?.designation} onChange={e => setFormDetails({...formDetails, recommendedBy: {...formDetails.recommendedBy!, designation: e.target.value}})} className={isViewOnly || isNewForm || !isAdminOrApproval ? inputReadOnlyClass : inputEditableClass} disabled={isViewOnly || isNewForm || !isAdminOrApproval}/></div>
                      <div className="flex gap-1"><span>मिति:</span><input value={formDetails.recommendedBy?.date} onChange={e => setFormDetails({...formDetails, recommendedBy: {...formDetails.recommendedBy!, date: e.target.value}})} className={isViewOnly || isNewForm || !isAdminOrApproval ? inputReadOnlyClass : inputEditableClass} disabled={isViewOnly || isNewForm || !isAdminOrApproval}/></div>
                  </div>
              </div>

              <div className="col-span-4 pl-4">
                  <div className="font-bold mb-2">स्टोरकिपरले भर्ने:</div>
                  <div className="space-y-1 mb-4">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => updateStoreKeeperStatus('market')} className={`${!isVerifying ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} text-slate-800`}>{formDetails.storeKeeper?.status === 'market' ? <CheckCircle2 size={14} className="text-primary-600"/> : <Square size={14}/>}</button>
                        <span className={!isVerifying ? 'text-slate-400' : ''}>क) बजारबाट खरिद गर्नु पर्ने</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => updateStoreKeeperStatus('stock')} className={`${!isVerifying ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} text-slate-800`}>{formDetails.storeKeeper?.status === 'stock' ? <CheckCircle2 size={14} className="text-primary-600"/> : <Square size={14}/>}</button>
                        <span className={!isVerifying ? 'text-slate-400' : ''}>ख) मौज्दातमा रहेको</span>
                      </div>
                  </div>
                  <div className="space-y-1">
                      <div className="mb-2">स्टोरकिपरको दस्तखत:.......</div>
                      <div className="flex gap-1"><span>नाम:</span><input value={formDetails.storeKeeper?.name} onChange={e => setFormDetails({...formDetails, storeKeeper: {...formDetails.storeKeeper!, name: e.target.value}})} className={isViewOnly || !isVerifying ? inputReadOnlyClass : inputEditableClass} disabled={isViewOnly || !isVerifying}/></div>
                  </div>
              </div>

              <div className="col-span-4 pr-4">
                  <div className="font-bold mb-4">मालसामान बुझिलिनेको:</div>
                  <div className="space-y-1">
                      <div className="flex gap-2"><span>नाम:</span><input value={formDetails.receiver?.name} onChange={e => setFormDetails({...formDetails, receiver: {...formDetails.receiver!, name: e.target.value}})} className={isViewOnly || !isVerifying ? inputReadOnlyClass : inputEditableClass} disabled={isViewOnly || !isVerifying}/></div>
                      <div className="flex gap-1"><span>पद:</span><input value={formDetails.receiver?.designation} onChange={e => setFormDetails({...formDetails, receiver: {...formDetails.receiver!, designation: e.target.value}})} className={isViewOnly || !isVerifying ? inputReadOnlyClass : inputEditableClass} disabled={isViewOnly || !isVerifying}/></div>
                      <div className="flex gap-1"><span>मिति:</span><input value={formDetails.receiver?.date} onChange={e => setFormDetails({...formDetails, receiver: {...formDetails.receiver!, date: e.target.value}})} className={isViewOnly || !isVerifying ? inputReadOnlyClass : inputEditableClass} disabled={isViewOnly || !isVerifying}/></div>
                  </div>
              </div>

              <div className="col-span-4 px-4">
                  <div className="font-bold mb-4">खर्च निकासा खातामा चढाउने:.......</div>
                  <div className="space-y-1">
                      <div className="flex gap-1"><span>नाम:</span><input value={formDetails.ledgerEntry?.name} onChange={e => setFormDetails({...formDetails, ledgerEntry: {...formDetails.ledgerEntry!, name: e.target.value}})} className={isViewOnly || !isVerifying ? inputReadOnlyClass : inputEditableClass} disabled={isViewOnly || !isVerifying}/></div>
                      <div className="flex gap-1"><span>पद:</span><input value={formDetails.ledgerEntry?.designation} onChange={e => setFormDetails({...formDetails, ledgerEntry: {...formDetails.ledgerEntry!, designation: e.target.value}})} className={isViewOnly || !isVerifying ? inputReadOnlyClass : inputEditableClass} disabled={isViewOnly || !isVerifying}/></div>
                      <div className="flex gap-1"><span>मिति:</span><input value={formDetails.ledgerEntry?.date} onChange={e => setFormDetails({...formDetails, ledgerEntry: {...formDetails.ledgerEntry!, date: e.target.value}})} className={isViewOnly || !isVerifying ? inputReadOnlyClass : inputEditableClass} disabled={isViewOnly || !isVerifying}/></div>
                  </div>
              </div>

              <div className="col-span-4 pl-4">
                  <div className="font-bold mb-4">स्वीकृत गर्ने:.......</div>
                  <div className="space-y-1">
                      <div className="flex gap-1"><span>नाम:</span><input value={formDetails.approvedBy?.name} onChange={e => setFormDetails({...formDetails, approvedBy: {...formDetails.approvedBy!, name: e.target.value}})} className={isViewOnly || !isApproving ? inputReadOnlyClass : inputEditableClass} disabled={isViewOnly || !isApproving}/></div>
                      <div className="flex gap-1"><span>पद:</span><input value={formDetails.approvedBy?.designation} onChange={e => setFormDetails({...formDetails, approvedBy: {...formDetails.approvedBy!, designation: e.target.value}})} className={isViewOnly || !isApproving ? inputReadOnlyClass : inputEditableClass} disabled={isViewOnly || !isApproving}/></div>
                      <div className="flex gap-1"><span>मिति:</span><input value={formDetails.approvedBy?.date} onChange={e => setFormDetails({...formDetails, approvedBy: {...formDetails.approvedBy!, date: e.target.value}})} className={isViewOnly || !isApproving ? inputReadOnlyClass : inputEditableClass} disabled={isViewOnly || !isApproving}/></div>
                  </div>
              </div>
          </div>
       </div>

       {/* REJECTION REASON MODAL */}
       {showRejectModal && (
           <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={() => setShowRejectModal(false)}></div>
               <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
                    <div className="px-6 py-4 border-b bg-red-600 text-white flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <AlertCircle size={20} />
                            <h3 className="font-bold font-nepali">माग फारम अस्वीकार गर्नुहोस् (Reject Form)</h3>
                        </div>
                        <button onClick={() => setShowRejectModal(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={20}/></button>
                    </div>
                    
                    <div className="p-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 block">
                                अस्वीकार गर्नुको कारण (Reason for Rejection) *
                            </label>
                            <textarea 
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="यहाँ कारण लेख्नुहोस्..."
                                className="w-full rounded-xl border border-slate-300 p-4 text-sm outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 min-h-[120px] transition-all"
                            />
                        </div>
                        <p className="text-[10px] text-slate-500 italic">
                            * यो कारण माग गर्ने व्यक्तिले आफ्नो ड्यासबोर्डमा देख्न सक्नेछन्।
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 border-t flex gap-3">
                        <button 
                            type="button"
                            onClick={() => setShowRejectModal(false)}
                            className="flex-1 py-2.5 bg-white border border-slate-300 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors"
                        >
                            रद्द गर्नुहोस्
                        </button>
                        <button 
                            type="button"
                            onClick={handleReject}
                            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-200 hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                        >
                            <Check size={18} />
                            अस्वीकार गर्नुहोस्
                        </button>
                    </div>
               </div>
           </div>
       )}

       {/* VERIFICATION METADATA POPUP */}
       {showVerifyPopup && (
           <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowVerifyPopup(false)}></div>
               <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
                    <div className="px-6 py-4 border-b bg-indigo-600 text-white flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={20} />
                            <h3 className="font-bold font-nepali">दाखिला/निकासा विवरण (Verification)</h3>
                        </div>
                        <button onClick={() => setShowVerifyPopup(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={20}/></button>
                    </div>
                    
                    <div className="p-6 space-y-6">
                        <div className="space-y-4">
                            <Select 
                                label="गोदाम/स्टोर छान्नुहोस् (Select Store)"
                                options={storeOptions}
                                value={verificationData.storeId}
                                onChange={(e) => setVerificationData({...verificationData, storeId: e.target.value})}
                                icon={<Warehouse size={18} className="text-indigo-600"/>}
                                required
                            />
                            
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <Layers size={18} className="text-indigo-600" />
                                    सामानको प्रकार (Item Category) *
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => setVerificationData({...verificationData, itemType: 'Expendable'})}
                                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2 ${
                                            verificationData.itemType === 'Expendable' 
                                            ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-md' 
                                            : 'bg-white border-slate-100 text-slate-500 hover:border-orange-200'
                                        }`}
                                    >
                                        <Layers size={24} />
                                        <span className="text-xs font-bold font-nepali">खर्च भएर जाने</span>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setVerificationData({...verificationData, itemType: 'Non-Expendable'})}
                                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all gap-2 ${
                                            verificationData.itemType === 'Non-Expendable' 
                                            ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-md' 
                                            : 'bg-white border-slate-100 text-slate-500 hover:border-blue-200'
                                        }`}
                                    >
                                        <ShieldCheck size={24} />
                                        <span className="text-xs font-bold font-nepali">खर्च नहुने</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100 flex items-start gap-2">
                            <AlertCircle size={16} className="text-indigo-600 mt-0.5 shrink-0" />
                            <p className="text-[10px] text-indigo-700 font-medium leading-relaxed">
                                यहाँ छानिएको विवरण अनुसार सामान स्टकबाट काटिने वा नयाँ 'निकासा प्रतिवेदन' मा सूचीकृत हुनेछ। कृपया सही गोदाम र प्रकार छान्नुहोस्।
                            </p>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50 border-t flex gap-3">
                        <button 
                            type="button"
                            onClick={() => setShowVerifyPopup(false)}
                            className="flex-1 py-2.5 bg-white border border-slate-300 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors"
                        >
                            रद्द गर्नुहोस्
                        </button>
                        <button 
                            type="button"
                            onClick={() => {
                                if (!verificationData.storeId || !verificationData.itemType) {
                                    alert("कृपया स्टोर र सामानको प्रकार दुवै छान्नुहोस्।");
                                    return;
                                }
                                finalizeSave(verificationData as any);
                            }}
                            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                        >
                            <CheckCircle2 size={18} />
                            प्रमाणित गर्नुहोस्
                        </button>
                    </div>
               </div>
           </div>
       )}
    </div>
  );
};
