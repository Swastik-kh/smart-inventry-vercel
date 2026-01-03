
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Trash2, Printer, Save, Calendar, CheckCircle2, Send, Clock, FileText, Eye, Search, X, AlertCircle, ChevronRight, ArrowLeft, Check, Square, Warehouse, Layers, ShieldCheck, Info } from 'lucide-react';
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
  onDelete?: (formId: string) => void; // Prop for deletion
  inventoryItems: InventoryItem[];
  stores?: Store[];
  generalSettings: OrganizationSettings;
}

export const MagFaram: React.FC<MagFaramProps> = ({ currentFiscalYear, currentUser, existingForms, onSave, onDelete, inventoryItems, generalSettings, stores = [] }) => {
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

  const [items, setItems] = useState<LocalMagItem[]>([{ id: Date.now() + Math.random(), name: '', specification: '', unit: '', quantity: '', remarks: '', isFromInventory: false }]);
  
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
    ledgerEntry: { name: '', date: '', },
    approvedBy: { name: '', designation: '', date: '', },
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

  const itemOptions = useMemo(() => {
    return inventoryItems.map(item => {
      const typeLabel = item.itemType === 'Expendable' ? 'खर्च हुने' : 'खर्च नहुने';
      return {
        id: item.id,
        value: item.itemName,
        label: `${item.itemName} (${item.unit}) - मौज्दात: ${item.currentQuantity} [${typeLabel}]`,
        itemData: item
      };
    }).sort((a, b) => {
        // Priority 1: Stock > 0
        const aHasStock = a.itemData.currentQuantity > 0;
        const bHasStock = b.itemData.currentQuantity > 0;
        
        if (aHasStock && !bHasStock) return -1;
        if (!aHasStock && bHasStock) return 1;
        
        // Priority 2: Alphabetical Name
        return a.value.localeCompare(b.value);
    });
  }, [inventoryItems]);

  const storeOptions: Option[] = useMemo(() => stores.map(s => ({ id: s.id, value: s.id, label: s.name })), [stores]);

  const handleAddItem = () => {
    if (items.length < 14) {
      setItems([...items, { id: Date.now() + Math.random(), name: '', specification: '', unit: '', quantity: '', remarks: '', isFromInventory: false }]);
    } else {
      alert("अधिकतम १४ वटा सामान मात्र माग गर्न सकिन्छ।");
    }
  };

  const handleRemoveItem = (id: number) => {
    if (isViewOnly) return;

    setItems(prevItems => {
        const filtered = prevItems.filter(i => i.id !== id);
        // Ensure at least one empty row remains if everything is deleted
        if (filtered.length === 0) {
            return [{ id: Date.now() + Math.random(), name: '', specification: '', unit: '', quantity: '', remarks: '', isFromInventory: false }];
        }
        return filtered;
    });
  };
  
  const updateItem = useCallback((id: number, field: keyof LocalMagItem, value: any) => {
    setItems(prevItems => prevItems.map(item => {
        if (item.id === id) {
            const updated = { ...item, [field]: value };
            // if (field === 'name') updated.isFromInventory = false; // Moved to handleItemNameChange
            return updated;
        }
        return item;
    }));
  }, []);

  const handleItemNameChange = useCallback((id: number, newName: string) => {
    setItems(prevItems => prevItems.map(item => {
        if (item.id === id) {
            let updatedItem = { ...item, name: newName };
            const otherDraftItems = prevItems.filter(i => i.id !== id);

            // Find an existing inventory item matching the new name, in any store
            let existing = inventoryItems.find(i => 
                i.itemName.trim().toLowerCase() === newName.trim().toLowerCase()
            );

            if (existing) {
                // If a matching item is found, pre-fill from it
                updatedItem.isFromInventory = true;
                updatedItem.codeNo = existing.uniqueCode || existing.sanketNo || '';
                updatedItem.unit = existing.unit;
                updatedItem.specification = existing.specification || '';
                // Do NOT auto-fill quantity or rate here, as this is for demand
            } else if (newName.trim() !== '') {
                // If no match found and name is not empty, it's a custom item
                updatedItem.isFromInventory = false;
                updatedItem.codeNo = ''; // Clear codeNo if no match
                // Keep existing unit/specification if they were manually set, otherwise clear
                updatedItem.unit = item.unit || ''; 
                updatedItem.specification = item.specification || '';
            } else {
                // Name is empty, reset to initial empty state
                updatedItem = { 
                    id: item.id, // Keep the original temporary ID
                    name: '', specification: '', unit: '', quantity: '', remarks: '', isFromInventory: false 
                };
            }
            return updatedItem;
        }
        return item;
    }));
  }, [inventoryItems]);

  const handleItemSelect = useCallback((id: number, option: Option) => {
    const invItem = option.itemData as InventoryItem;
    if (invItem) {
        setItems(prevItems => prevItems.map(item => {
            if (item.id === id) {
                return {
                    ...item,
                    name: invItem.itemName,
                    unit: invItem.unit,
                    specification: invItem.specification || '', // Use from inventory, or keep empty if not present
                    codeNo: invItem.uniqueCode || invItem.sanketNo || '',
                    isFromInventory: true
                };
            }
            return item;
        }));
    }
  }, []);

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
      // When loading, ensure items have a random ID for key stability if they came from DB without one
      setItems(form.items.map((item, idx) => {
          const matched = inventoryItems.some(i => i.itemName === item.name);
          return { ...item, id: item.id || (Date.now() + idx + Math.random()), isFromInventory: matched };
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

  const handleDeleteClick = (id: string, formNo: string) => {
      if (!onDelete) return;
      if (window.confirm(`के तपाईं निश्चित हुनुहुन्छ कि तपाईं माग फारम नं. ${formNo} इतिहासबाट हटाउन चाहनुहुन्छ? यो कार्य पूर्ववत गर्न सकिँदैन।`)) {
          onDelete(id);
          alert(`माग फारम नं. ${formNo} सफलतापूर्वक हटाइयो।`);
      }
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
          alert(" कृपया अस्वीकार गर्नुको कारण खुलाउनुहोस्।");
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
    setItems([{ id: Date.now() + Math.random(), name: '', specification: '', unit: '', quantity: '', remarks: '', isFromInventory: false }]);
    setFormDetails({
        id: '', items: [], fiscalYear: currentFiscalYear, 
        formNo: generateMagFormNo(existingForms, currentFiscalYear),
        date: todayBS, status: 'Pending',
        demandBy: { name: currentUser.fullName, designation: currentUser.designation, date: todayBS, purpose: '' },
        recommendedBy: { name: '', designation: '', date: '', },
        storeKeeper: { status: 'stock', name: '', },
        receiver: { name: '', designation: '', date: '', }, 
        ledgerEntry: { name: '', date: '', },
        approvedBy: { name: '', designation: '', date: '', },
        isViewedByRequester: true
    });
  };

  const inputReadOnlyClass = "border-b border-dotted border-slate-800 flex-1 outline-none bg-slate-50 text-slate-500 cursor-not-allowed px-1 rounded-sm";
  const inputEditableClass = "border-b border-dotted border-slate-800 flex-1 outline-none bg-white focus:bg-primary-50 px-1 rounded-sm";

  if (!editingId) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 no-print">
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
                        <span className="bg-orange-200 text-orange-800 text-xs font-bold px-2 py-0.5 rounded-full">{actionableForms.length} Forms</span>
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
                                        <div className="flex justify-end gap-1">
                                            <button onClick={() => handleLoadForm(f, true)} className={`p-2 rounded-full transition-colors ${isNewUpdate ? 'text-primary-600 bg-primary-100 hover:bg-primary-200' : 'text-slate-400 hover:text-primary-600'}`} title="Preview">
                                                <Eye size={18} />
                                            </button>
                                            {isAdminOrApproval && (
                                                <button onClick={() => handleDeleteClick(f.id, f.formNo)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Delete History">
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
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

       <div id="mag-form-print" className="bg-white p-6 md:p-10 max-w-[210mm] mx-auto min-h-[297mm] font-nepali text-slate-900 print:p-0 print:shadow-none print:w-full print-full-width border shadow-lg rounded-xl">
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
                      
                      {/* Contact and Identity Info Row */}
                      <div className="text-[10px] mt-2 space-x-3 font-medium text-slate-600">
                          {generalSettings.address && <span>{generalSettings.address}</span>}
                          {generalSettings.phone && <span>| फोन: {generalSettings.phone}</span>}
                          {generalSettings.email && <span>| ईमेल: {generalSettings.email}</span>}
                          {generalSettings.website && <span>| वेबसाइट: {generalSettings.website}</span>}
                          {generalSettings.panNo && <span>| पान/भ्याट नं: {generalSettings.panNo}</span>}
                      </div>
                  </div>
                  <div className="w-24"></div> 
              </div>
              <div className="text-center mt-6">
                  <h2 className="text-lg font-bold underline underline-offset-4">माग फारम</h2>
              </div>
          </div>

          <div className="flex justify-end text-sm mb-4">
              <div className="space