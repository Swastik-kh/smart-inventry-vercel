

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Trash2, Printer, Save, Calendar, CheckCircle2, Send, Clock, FileText, Eye, Search, X, AlertCircle, ChevronRight, ArrowLeft, Check, Square, Warehouse, Layers, ShieldCheck, Info } from 'lucide-react';
import { User, Option, OrganizationSettings, Signature } from '../types/coreTypes';
import { MagItem, MagFormEntry, InventoryItem, Store, StoreKeeperSignature } from '../types/inventoryTypes';
import { SearchableSelect } from './SearchableSelect';
import { Select } from './Select';
import { NepaliDatePicker } from './NepaliDatePicker';
import { InsufficientStockModal } from './InsufficientStockModal'; // Import the new modal
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null); // NEW: State for success message
  const [isSaved, setIsSaved] = useState(false); // NEW: State to control button for saving process

  // Rejection States
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Verification Popup States
  const [showVerifyPopup, setShowVerifyPopup] = useState(false);
  const [verificationData, setVerificationData] = useState({
      storeId: '',
      itemType: '' as 'Expendable' | 'Non-Expendable' | ''
  });

  // Insufficient Stock Modal States
  const [showInsufficientStockModal, setShowInsufficientStockModal] = useState(false);
  const [insufficientStockItems, setInsufficientStockItems] = useState<Array<{ demandedItem: LocalMagItem; availableQuantity: number; }>>([]);


  const generateMagFormNo = (forms: MagFormEntry[], fy: string) => {
    const fyClean = currentFiscalYear.replace('/', '');
    const prefix = 'MF'; // For Mag Form
    
    // Filter forms only for the current fiscal year and get numeric part for sequential numbering
    const formsInCurrentFY = forms.filter(f => f.fiscalYear === fy && f.formNo.startsWith(`${fyClean}-`));

    const maxNum = formsInCurrentFY.reduce((max, f) => {
        const parts = f.formNo.split('-');
        const numPart = parts.length > 1 ? parseInt(parts[1]) : 0; // Assuming format is 'FY-NNN'
        return isNaN(numPart) ? max : Math.max(max, numPart);
    }, 0);
    
    // Format: YYYY-NNN where YYYY is from fiscal year (e.g., 2082)
    return `${fyClean}-${String(maxNum + 1).padStart(3, '0')}`;
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
    storeKeeper: { name: '', date: '', verified: false, marketRequired: false, inStock: false }, // Updated for checkboxes
    receiver: { name: '', designation: '', date: '' }, 
    ledgerEntry: { name: '', designation: '', date: '' }, // Initialized with designation for consistency
    approvedBy: { name: '', designation: '', date: '' },
    selectedStoreId: '', // Initialized
    issueItemType: 'Expendable', // Initialized with a default value
    isViewedByRequester: true,
    // Add decisionNo and decisionDate to MagFormEntry state for collection
    decisionNo: '', 
    decisionDate: '', 
  });

  useEffect(() => {
    if (!editingId && !formDetails.id) {
        setFormDetails(prev => ({
            ...prev,
            formNo: generateMagFormNo(existingForms, currentFiscalYear)
        }));
    }
  }, [editingId, existingForms, currentFiscalYear, formDetails.id]); // Added formDetails.id to dependency array

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
    if (isViewOnly) return; // Prevent adding if in view-only mode
    if (items.length < 14) {
      // Fix: Ensured the id property is explicitly handled in the object literal
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
            // Fix: Ensured the id property is explicitly handled in the object literal
            return [{ id: Date.now() + Math.random(), name: '', specification: '', unit: '', quantity: '', remarks: '', isFromInventory: false }];
        }
        return filtered;
    });
  };
  
  const updateItem = useCallback((id: number, field: keyof MagItem | 'isFromInventory', value: any) => {
    setItems(prevItems => prevItems.map(item => {
        if (item.id === id) {
            // Fix: Cast `field` to `keyof MagItem` if it's not 'isFromInventory'
            const updated = { ...item, [field]: value };
            return updated;
        }
        return item;
    }));
  }, []);

  const handleItemNameChange = useCallback((id: number, newName: string) => {
    setItems(prevItems => prevItems.map(item => {
        if (item.id === id) {
            let updatedItem: LocalMagItem = { ...item, name: newName }; // Explicitly type updatedItem
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

  const handleStorekeeperCheckboxChange = (field: 'marketRequired' | 'inStock', value: boolean) => {
    if (isViewOnly || !isVerifying) return; // Only editable if verifying and not in view-only
    setFormDetails(prev => ({
        ...prev,
        storeKeeper: {
            ...prev.storeKeeper,
            [field]: value,
            verified: true, // Mark as verified if any checkbox is changed
            name: prev.storeKeeper?.name || currentUser.fullName, // Auto-fill name if not already set
            date: prev.storeKeeper?.date || todayBS // Auto-fill date if not already set
        } as StoreKeeperSignature // Explicitly cast to StoreKeeperSignature
    }));
  };

  const handleLoadForm = (form: MagFormEntry, viewOnly: boolean = false) => {
      setEditingId(form.id);
      setIsViewOnly(viewOnly);
      setSuccessMessage(null); // Clear messages on load
      setValidationError(null); // Clear messages on load
      setIsSaved(false); // Reset saved status

      // When loading, ensure items have a random ID for key stability if they came from DB without one
      setItems(form.items.map((item, idx) => {
          const matched = inventoryItems.some(i => i.itemName === item.name);
          // Fix: Ensure the object literal explicitly matches LocalMagItem
          return { ...item, id: item.id || (Date.now() + idx + Math.random()), isFromInventory: matched } as LocalMagItem;
      }));
      
      if (viewOnly && form.isViewedByRequester === false && form.demandBy?.name === currentUser.fullName) {
          const updatedForm = { ...form, isViewedByRequester: true };
          onSave(updatedForm);
          setFormDetails(updatedForm);
      } else {
          // Ensure all signature fields are properly initialized from loaded form data,
          // providing defaults for new fields if not present in old data.
          setFormDetails({
            ...form,
            storeKeeper: {
                name: form.storeKeeper?.name || '',
                date: form.storeKeeper?.date || '',
                verified: form.storeKeeper?.verified || false,
                marketRequired: form.storeKeeper?.marketRequired || false,
                inStock: form.storeKeeper?.inStock || false,
            } as StoreKeeperSignature, // Explicitly cast
            demandBy: { ...form.demandBy || { name: '', designation: '', date: '', purpose: '' } },
            recommendedBy: { ...form.recommendedBy || { name: '', designation: '', date: '' } },
            approvedBy: { ...form.approvedBy || { name: '', designation: '', date: '' } },
            receiver: { ...form.receiver || { name: '', designation: '', date: '' } },
            ledgerEntry: { ...form.ledgerEntry || { name: '', designation: '', date: '' } }, // Ensure designation is handled
            // Load decisionNo and decisionDate from the form being loaded
            decisionNo: form.decisionNo || '',
            decisionDate: form.decisionDate || '',
          });
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

  const handleSave = (extraData?: { storeId: string, itemType: 'Expendable' | 'Non-Expendable' }) => {
    setValidationError(null);
    if (!formDetails.date) { setValidationError("कृपया मिति भर्नुहोस्।"); return; }
    if (!formDetails.demandBy?.purpose) { setValidationError("कृपया प्रयोजन भर्नुहोस्।"); return; }

    const validItems = items.filter(item => item.name && item.name.trim() !== '');
    if (validItems.length === 0) { setValidationError("कृपया कम्तिमा एउटा सामानको नाम भर्नुहोस्।"); return; }

    // If Storekeeper is verifying and claims 'in stock'
    if (isVerifying && formDetails.storeKeeper?.inStock) {
        // Step 1: If we don't have storeId/itemType yet, show the popup to collect them.
        if (!extraData?.storeId || !extraData?.itemType) {
            setShowVerifyPopup(true); // Trigger the modal to get storeId and itemType
            return; // Exit here; handleSave will be called from the modal's internal button
        }

        // Step 2: Now we have storeId and itemType from extraData. Perform stock validation.
        const insufficient: { demandedItem: LocalMagItem; availableQuantity: number; }[] = [];
        
        validItems.forEach(demandedItem => {
            const matchingInventory = inventoryItems.find(inv =>
                inv.itemName.toLowerCase() === demandedItem.name.toLowerCase() &&
                inv.storeId === extraData.storeId &&
                inv.itemType === extraData.itemType
            );

            const requestedQty = parseFloat(demandedItem.quantity) || 0;
            const availableQty = matchingInventory?.currentQuantity || 0;

            if (requestedQty > availableQty) {
                insufficient.push({
                    demandedItem: demandedItem,
                    availableQuantity: availableQty
                });
            }
        });

        if (insufficient.length > 0) {
            setInsufficientStockItems(insufficient);
            setShowInsufficientStockModal(true); // Show the new modal for insufficient stock
            return; // Stop processing
        }
    }
    
    // If stock is sufficient (or not checking stock, e.g. marketRequired), proceed with save
    setIsSaved(true); 
    finalizeSave(extraData);
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
      setSuccessMessage("माग फारम अस्वीकृत गरियो! (Demand Form Rejected!)");
      setShowRejectModal(false);
      
      // Delay reset for success message visibility
      setTimeout(() => {
          handleReset();
      }, 2000);
  };

  const finalizeSave = (extraData?: { storeId: string, itemType: 'Expendable' | 'Non-Expendable' }) => {
    let nextStatus = formDetails.status || 'Pending';
    let nextIsViewed = true;
    let successMessageText = "माग फारम सुरक्षित भयो! (Demand Form Saved!)";

    // Track original signature objects
    let updatedDemandBy = { ...formDetails.demandBy };
    let updatedRecommendedBy = { ...formDetails.recommendedBy };
    let updatedStoreKeeper = { ...formDetails.storeKeeper } as StoreKeeperSignature; // Explicitly cast
    let updatedReceiver = { ...formDetails.receiver };
    let updatedLedgerEntry = { ...formDetails.ledgerEntry };
    let updatedApprovedBy = { ...formDetails.approvedBy };


    if (editingId && editingId !== 'new') {
        if (isVerifying) {
            nextStatus = 'Verified';
            nextIsViewed = false;
            successMessageText = "माग फारम प्रमाणित भयो र स्वीकृतिको लागि पठाइयो! (Demand Form Verified & Sent for Approval!)";
            // Record who verified
            updatedStoreKeeper.name = currentUser.fullName;
            updatedStoreKeeper.date = todayBS; // Set date for storekeeper verification
            updatedStoreKeeper.verified = true; // Mark explicitly verified
            
            // If marketRequired is checked, clear inStock and set itemType for purchase
            if (updatedStoreKeeper.marketRequired) {
                updatedStoreKeeper.inStock = false;
                extraData = { storeId: '', itemType: 'Expendable' }; // Default to Expendable for market purchase
            }
        }
        else if (isApproving) {
            nextStatus = 'Approved';
            nextIsViewed = false;
            successMessageText = "माग फारम सफलतापूर्वक स्वीकृत भयो! (Demand Form Successfully Approved!)";
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
        demandBy: updatedDemandBy,
        recommendedBy: updatedRecommendedBy,
        storeKeeper: updatedStoreKeeper,
        receiver: updatedReceiver,
        ledgerEntry: updatedLedgerEntry,
        approvedBy: updatedApprovedBy,
        rejectionReason: "", 
        selectedStoreId: extraData?.storeId || formDetails.selectedStoreId || '', // Use the correct property
        issueItemType: extraData?.itemType || formDetails.issueItemType || 'Expendable', // Use the correct property
        // Save decisionNo and decisionDate from formDetails
        decisionNo: formDetails.decisionNo, 
        decisionDate: formDetails.decisionDate,
    };

    onSave(newForm);
    setSuccessMessage(successMessageText);
    setShowVerifyPopup(false);
    
    // Always reset form after a short delay for any save action
    setTimeout(() => {
        handleReset();
    }, 2000);
  };

  const handleReset = () => {
    setEditingId(null);
    setIsViewOnly(false);
    setValidationError(null);
    setSuccessMessage(null); // Clear success message on reset
    setIsSaved(false); // Reset saved status
    setShowVerifyPopup(false);
    setShowRejectModal(false);
    setRejectReason('');
    setVerificationData({ storeId: '', itemType: '' });
    // Fix: Ensure id property is explicitly handled in the object literal
    setItems([{ id: Date.now() + Math.random(), name: '', specification: '', unit: '', quantity: '', remarks: '', isFromInventory: false }]);
    setFormDetails(prev => ({
        ...prev,
        id: '', items: [], fiscalYear: currentFiscalYear, 
        formNo: generateMagFormNo(existingForms, currentFiscalYear),
        date: todayBS, status: 'Pending',
        demandBy: { name: currentUser.fullName, designation: currentUser.designation, date: todayBS, purpose: '' },
        recommendedBy: { name: '', designation: '', date: '' },
        storeKeeper: { name: '', date: '', verified: false, marketRequired: false, inStock: false } as StoreKeeperSignature, // Reset for checkboxes and explicitly cast
        receiver: { name: '', designation: '', date: '' }, 
        ledgerEntry: { name: '', designation: '', date: '' }, // Reset to handle designation
        approvedBy: { name: '', designation: '', date: '' },
        isViewedByRequester: true,
        selectedStoreId: '', // Reset new property
        issueItemType: 'Expendable', // Reset new property
        // Reset decisionNo and decisionDate
        decisionNo: '', 
        decisionDate: '',
    }));
  };

  const inputReadOnlyClass = "border-b border-dotted border-black flex-1 outline-none bg-slate-50 text-slate-500 cursor-not-allowed px-1 rounded-sm"; // Changed to border-black
  const inputEditableClass = "border-b border-dotted border-black flex-1 outline-none bg-white focus:bg-primary-50 px-1 rounded-sm"; // Changed to border-black

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
       {/* Inject print-specific styles */}
       <style>{`
            @media print {
                /* General A4 portrait settings */
                @page { 
                    size: A4 portrait; 
                    margin: 1cm; 
                }

                /* Container overrides */
                #mag-form-print {
                    font-family: 'Mukta', sans-serif !important;
                    background: white !important;
                    box-shadow: none !important;
                    padding: 0 !important; /* Remove padding from main container */
                    width: 100% !important;
                    max-width: none !important;
                    min-height: auto !important;
                }

                /* Header adjustments */
                #mag-form-print h1 { font-size: 16px !important; color: black !important; } /* Org Name */
                #mag-form-print h2 { font-size: 14px !important; } /* Subtitle 1 */
                #mag-form-print h3 { font-size: 12px !important; } /* Subtitle 2/3 */
                #mag-form-print .text-[10px] { font-size: 9px !important; } /* Smaller text in header */
                #mag-form-print .text-sm { font-size: 11px !important; } /* Normal text size */

                /* Input fields to look like text */
                #mag-form-print input,
                #mag-form-print select,
                #mag-form-print textarea {
                    border: none !important;
                    background: none !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    color: inherit !important;
                    outline: none !important;
                    width: 100% !important; /* Ensure it fills its container */
                    height: auto !important;
                    line-height: normal !important;
                    text-align: inherit !important; /* Inherit alignment from parent td/div */
                    font-size: inherit !important; /* Inherit font size */
                    pointer-events: none !important; /* Not interactive */
                    -webkit-print-color-adjust: exact !important; /* For background colors */
                    print-color-adjust: exact !important;
                }
                /* Specific adjustments for NepaliDatePicker within print */
                #mag-form-print .nepali-date-picker-input-for-print input {
                    border-bottom: 1px dotted black !important; /* Retain minimal line for date */
                    font-weight: bold !important;
                    color: black !important;
                    text-align: center !important;
                }
                /* Remove placeholder text in print */
                #mag-form-print input::placeholder {
                    color: transparent !important;
                }

                /* Table styling */
                #mag-form-print table {
                    table-layout: fixed; /* Ensures columns respect defined widths */
                    width: 100%;
                    border-collapse: collapse;
                }
                #mag-form-print th, #mag-form-print td {
                    border: 1px solid black !important; /* Solid black borders */
                    padding: 4px !important; /* Reduced padding for more content per page */
                    vertical-align: top;
                }
                #mag-form-print thead {
                    display: table-header-group; /* Ensures header repeats on new pages */
                }
                #mag-form-print tr {
                    page-break-inside: avoid; /* Avoid breaking rows across pages */
                    break-inside: avoid; /* Standard for CSS Paged Media Module 3 */
                }
                #mag-form-print .bg-slate-50 { background-color: #f8fafc !important; } /* Keep light background */
                #mag-form-print .bg-slate-100 { background-color: #f1f5f9 !important; } /* Keep light background */

                /* Signature sections - ensure dotted lines are visible and text is clean */
                #mag-form-print .border-b.border-dotted.border-black {
                    border-bottom: 1px dotted black !important;
                }
                #mag-form-print .border-b.border-dotted.border-slate-600 {
                    border-bottom: 1px dotted black !important;
                }

                /* Remove colors/shadows on emblem text */
                #mag-form-print .text-red-600 { color: black !important; }

                /* Specific width adjustments for table columns if necessary for print */
                #mag-form-print table th.w-10 { width: 30px !important; }
                #mag-form-print table th.w-\[30\%\] { width: 25% !important; } /* Name */
                #mag-form-print table th.w-\[20\%\] { width: 20% !important; } /* Specification */
                #mag-form-print table th.w-\[10\%\] { width: 10% !important; } /* Unit & Quantity */
                #mag-form-print table th.w-\[8\%\] { width: 12% !important; } /* Remarks */
            }
       `}</style>
       
       <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
          <div className="flex items-center gap-4">
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
                    <button onClick={() => handleSave()} disabled={isSaved} className={`flex items-center gap-2 px-6 py-2 text-white rounded-lg font-medium shadow-sm ${isSaved ? 'bg-green-600 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'} transition-colors`}>
                        {isSaved ? <CheckCircle2 size={18} /> : <Save size={18} />}
                        {isSaved ? 'प्रक्रियामा...' : (isVerifying ? 'प्रमाणित गर्नुहोस्' : isApproving ? 'स्वीकृत गर्नुहोस्' : 'सुरक्षित गर्नुहोस्')}
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

       {successMessage && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl shadow-sm flex items-center gap-3 animate-in slide-in-from-top-2 no-print mx-auto max-w-[210mm]">
                <div className="text-green-500"><CheckCircle2 size={24} /></div>
                <div className="flex-1">
                   <h3 className="text-green-800 font-bold text-lg font-nepali">सफल भयो (Success)</h3>
                   <p className="text-green-700 text-sm">{successMessage}</p>
                </div>
                <button onClick={() => setSuccessMessage(null)} className="text-green-400 hover:text-green-600"><X size={20} /></button>
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
                  <div className="flex-1 text-center space-y-1">
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

          <div className="flex justify-between text-sm mb-4">
              {/* REMOVED: Shree, Name, Address, Purpose from here as per request */}
              {/* Invisible placeholder to maintain layout - should take up the same vertical space as the meta-info on the right. */}
              <div className="space-y-1 w-1/2 opacity-0 select-none">
                <div className="flex items-center gap-2">
                    <span className="shrink-0">श्री:</span>
                    <input className="border-b border-dotted border-black flex-1 outline-none bg-transparent px-1 rounded-sm"/>
                </div>
                <div className="flex items-center gap-2">
                    <span className="shrink-0">ठेगाना:</span>
                    <input className="border-b border-dotted border-black flex-1 outline-none bg-transparent px-1 rounded-sm"/>
                </div>
                <div className="flex items-center gap-2">
                    <span className="shrink-0">प्रयोजन <span className="text-red-500">*</span>:</span>
                    <input className="border-b border-dotted border-black flex-1 outline-none bg-transparent px-1 rounded-sm"/>
                </div>
              </div>
              <div className="space-y-1 w-1/3 text-right">
                <div className="flex items-center justify-end gap-2">
                    <span className="shrink-0">आ.व. :</span>
                    <input 
                        value={formDetails.fiscalYear} 
                        readOnly 
                        className="border-b border-dotted border-black flex-1 outline-none w-24 text-center bg-transparent text-slate-500 cursor-not-allowed px-1 rounded-sm"
                    />
                </div>
                <div className="flex items-center justify-end gap-2">
                    <span className="shrink-0">माग फारम नं :</span> {/* Changed label */}
                    <input 
                        value={formDetails.formNo} 
                        readOnly 
                        className="border-b border-dotted border-black flex-1 outline-none w-24 text-center bg-transparent text-red-600 font-bold cursor-not-allowed px-1 rounded-sm"
                    />
                </div>
                <div className="flex items-center justify-end gap-2">
                    <span className="shrink-0">मिति <span className="text-red-500">*</span> :</span>
                    <NepaliDatePicker 
                        value={formDetails.date}
                        onChange={val => setFormDetails(prev => ({...prev, date: val}))}
                        format="YYYY/MM/DD"
                        label=""
                        hideIcon={true}
                        inputClassName={`nepali-date-picker-input-for-print border-b border-dotted border-black flex-1 outline-none w-32 text-center bg-white font-bold placeholder:text-slate-400 placeholder:font-normal rounded-none px-0 py-0 h-auto focus:ring-0 focus:border-black ${validationError ? 'text-red-600' : ''}`}
                        wrapperClassName="w-32"
                        disabled={isViewOnly}
                        popupAlign="right"
                        minDate={todayBS}
                        maxDate={todayBS}
                        required
                    />
                </div>
              </div>
          </div>

          <div className="mb-6">
              <table className="w-full border-collapse border border-black text-center text-xs"> {/* Added text-xs, changed border-slate-900 to border-black */}
                  <thead>
                      <tr className="bg-slate-50">
                          <th className="border border-black p-2 w-10" rowSpan={2}>क्र.सं.</th> {/* Changed border-slate-900 to border-black */}
                          <th className="border border-black p-2" colSpan={2}>जिन्सी मालसामानको</th> {/* Changed border-slate-900 to border-black */}
                          <th className="border border-black p-2" colSpan={2}>माग गरिएको</th> {/* Added colspan 2 for "माग गरिएको" */}
                          <th className="border border-black p-2" rowSpan={2}>कैफियत</th> {/* Changed border-slate-900 to border-black */}
                          <th className="border border-black p-2 w-8 no-print" rowSpan={2}></th> {/* Changed border-slate-900 to border-black */}
                      </tr>
                      <tr className="bg-slate-50">
                          <th className="border border-black p-1 w-[30%]">नाम <span className="text-red-500">*</span></th> {/* Changed border-slate-900 to border-black, ADDED ASTERISK, ADJUSTED WIDTH */}
                          <th className="border border-black p-1 w-[20%]">स्पेसिफिकेसन</th> {/* Changed border-slate-900 to border-black, ADJUSTED WIDTH */}
                          <th className="border border-black p-1 w-[10%]">एकाई</th> {/* New header for unit, ADJUSTED WIDTH */}
                          <th className="border border-black p-1 w-[10%]">परिमाण</th> {/* New header for quantity, ADJUSTED WIDTH */}
                      </tr>
                      <tr className="bg-slate-100 text-[10px]">
                          <th className="border border-black p-1">१</th> {/* Changed border-slate-900 to border-black */}
                          <th className="border border-black p-1">२</th> {/* Changed border-slate-900 to border-black */}
                          <th className="border border-black p-1">३</th> {/* Changed border-slate-900 to border-black */}
                          <th className="border border-black p-1">४</th> {/* New index */}
                          <th className="border border-black p-1">५</th> {/* New index */}
                          <th className="border border-black p-1">६</th> {/* Changed from 4 to 6 */}
                          <th className="border border-black p-1 no-print"></th> {/* Changed border-slate-900 to border-black */}
                      </tr>
                  </thead>
                  <tbody>
                      {items.map((item, index) => (
                          <tr key={item.id}>
                              <td className="border border-black p-1">{index + 1}</td> {/* Changed border-slate-900 to border-black */}
                              <td className="border border-black p-1 text-left px-2"> {/* Changed border-slate-900 to border-black */}
                                  {!isViewOnly ? (
                                      <SearchableSelect
                                          options={itemOptions}
                                          value={item.name}
                                          onChange={newName => handleItemNameChange(item.id, newName)} // Pass ID and new name
                                          onSelect={(option) => handleItemSelect(item.id, option)}
                                          placeholder="सामानको नाम खोज्नुहोस्"
                                          className="!border-none !bg-transparent !p-0 !text-xs" // Added text-xs
                                          label=""
                                      />
                                  ) : (
                                      <span className="text-left block px-2">{item.name} {item.codeNo && `(${item.codeNo})`}</span>
                                  )}
                              </td>
                              <td className="border border-black p-1"> {/* Changed border-slate-900 to border-black */}
                                  <input 
                                      value={item.specification} 
                                      onChange={e => updateItem(item.id, 'specification', e.target.value)} 
                                      className={isViewOnly ? inputReadOnlyClass : inputEditableClass + ' text-xs'} // Added text-xs
                                      disabled={isViewOnly}
                                      placeholder="Model/Brand/Details"
                                  />
                              </td>
                              {/* Consolidated 'एकाई' and 'परिमाण' under "माग गरिएको" */}
                              <td className="border border-black p-1"> {/* Changed border-slate-900 to border-black */}
                                  <input 
                                      value={item.unit} 
                                      onChange={e => updateItem(item.id, 'unit', e.target.value)} 
                                      className={isViewOnly ? inputReadOnlyClass : inputEditableClass + ' text-xs'} // Added text-xs
                                      disabled={isViewOnly}
                                      placeholder="एकाई"
                                  />
                              </td>
                              <td className="border border-black p-1 font-bold"> {/* Changed border-slate-900 to border-black */}
                                  <input 
                                      type="number" 
                                      value={item.quantity} 
                                      onChange={e => updateItem(item.id, 'quantity', e.target.value)} 
                                      className={isViewOnly ? `w-full text-center ${inputReadOnlyClass}` : `w-full text-center ${inputEditableClass} text-xs`} // Added text-xs
                                      disabled={isViewOnly}
                                      placeholder="परिमाण"
                                  />
                              </td>
                              <td className="border border-black p-1"> {/* Changed border-slate-900 to border-black */}
                                  <input 
                                      value={item.remarks} 
                                      onChange={e => updateItem(item.id, 'remarks', e.target.value)} 
                                      className={isViewOnly ? inputReadOnlyClass : inputEditableClass + ' text-xs'} // Added text-xs
                                      disabled={isViewOnly}
                                      placeholder="कैफियत"
                                  />
                              </td>
                              <td className="border border-black p-1 no-print"> {/* Changed border-slate-900 to border-black */}
                                  {!isViewOnly && (
                                      <button type="button" onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700">
                                          <Trash2 size={14}/>
                                      </button>
                                  )}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
              {!isViewOnly && (
                  <div className="mt-2 no-print">
                      <button type="button" onClick={handleAddItem} className="flex items-center gap-1 text-primary-600 hover:text-primary-700 text-xs font-bold px-2 py-1 bg-primary-50 rounded">
                          <Plus size={14} /> लहर थप्नुहोस् (Add Row)
                      </button>
                  </div>
              )}
          </div>

          <div className="grid grid-cols-3 gap-8 mt-12 text-[11px]"> {/* Changed text-sm to text-[11px] */}
            {/* माग गर्नेको (Demander) */}
            <div>
                <div className="font-bold mb-4">माग गर्नेको:</div>
                <div className="space-y-1">
                    <div className="flex gap-2 items-center">
                        <span className="w-10">नाम:</span>
                        <input value={formDetails.demandBy?.name || ''} className={isViewOnly ? inputReadOnlyClass : inputEditableClass} disabled={isViewOnly} onChange={e => setFormDetails(prev => ({...prev, demandBy: {...prev.demandBy, name: e.target.value}}))}/>
                    </div>
                    <div className="flex gap-2 items-center">
                        <span className="w-10">पद:</span>
                        <input value={formDetails.demandBy?.designation || ''} className={isViewOnly ? inputReadOnlyClass : inputEditableClass} disabled={isViewOnly} onChange={e => setFormDetails(prev => ({...prev, demandBy: {...prev.demandBy, designation: e.target.value}}))}/>
                    </div>
                    <div className="flex gap-2 items-center">
                        <span className="w-10">मिति:</span>
                        <input value={formDetails.demandBy?.date || ''} className={isViewOnly ? inputReadOnlyClass : inputEditableClass} disabled={isViewOnly} onChange={e => setFormDetails(prev => ({...prev, demandBy: {...prev.demandBy, date: e.target.value}}))}/>
                    </div>
                    <div className="flex gap-2 items-center">
                        <span className="w-10">प्रयोजन:</span>
                        <input value={formDetails.demandBy?.purpose || ''} className={isViewOnly ? inputReadOnlyClass : inputEditableClass} disabled={isViewOnly} onChange={e => setFormDetails(prev => ({...prev, demandBy: {...prev.demandBy, purpose: e.target.value}}))}/>
                    </div>
                </div>
            </div>

            {/* सिफारिस गर्ने (Recommender) */}
            <div>
                <div className="font-bold mb-4">सिफारिस गर्ने:</div>
                <div className="space-y-1">
                    <div className="flex gap-2 items-center">
                        <span className="w-10">नाम:</span>
                        <input value={formDetails.recommendedBy?.name || ''} className={isViewOnly ? inputReadOnlyClass : inputEditableClass} disabled={isViewOnly} onChange={e => setFormDetails(prev => ({...prev, recommendedBy: {...prev.recommendedBy, name: e.target.value}}))}/>
                    </div>
                    <div className="flex gap-2 items-center">
                        <span className="w-10">पद:</span>
                        <input value={formDetails.recommendedBy?.designation || ''} className={isViewOnly ? inputReadOnlyClass : inputEditableClass} disabled={isViewOnly} onChange={e => setFormDetails(prev => ({...prev, recommendedBy: {...prev.recommendedBy, designation: e.target.value}}))}/>
                    </div>
                    <div className="flex gap-2 items-center">
                        <span className="w-10">मिति:</span>
                        <input value={formDetails.recommendedBy?.date || ''} className={isViewOnly ? inputReadOnlyClass : inputEditableClass} disabled={isViewOnly} onChange={e => setFormDetails(prev => ({...prev, recommendedBy: {...prev.recommendedBy, date: e.target.value}}))}/>
                    </div>
                </div>
            </div>

            {/* स्टोरकिपरले भर्ने (Storekeeper Section with Checkboxes) */}
            <div>
                <div className="font-bold mb-4">स्टोरकिपरले भर्ने:</div>
                <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={formDetails.storeKeeper?.marketRequired || false}
                            onChange={() => handleStorekeeperCheckboxChange('marketRequired', !formDetails.storeKeeper?.marketRequired)}
                            disabled={isViewOnly || !isVerifying}
                            className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-slate-700">क) बजारबाट खरिद गर्नुपर्ने</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={formDetails.storeKeeper?.inStock || false}
                            onChange={() => handleStorekeeperCheckboxChange('inStock', !formDetails.storeKeeper?.inStock)}
                            disabled={isViewOnly || !isVerifying}
                            className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-slate-700">ख) मौज्दातमा रहेको</span>
                    </label>
                    <div className="flex flex-col gap-1 items-start mt-2"> {/* Changed to flex-col */}
                        {/* The label for the signature itself, with dotted line */}
                        <span className="w-full">स्टोरकिपरकाे दस्तखत:</span> 
                        <input value={formDetails.storeKeeper?.name || ''} className={`w-full ${inputReadOnlyClass}`} disabled={true} />
                        <input value={formDetails.storeKeeper?.date || ''} className={`w-full ${inputReadOnlyClass}`} disabled={true} />
                    </div>
                </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-8 mt-12 text-[11px]"> {/* Changed text-sm to text-[11px] */}
            {/* मालसामान बुझिलिनेको (Receiver) */}
            <div>
                <div className="font-bold mb-4">मालसामान बुझिलिनेको:</div>
                <div className="space-y-1">
                    <div className="flex gap-2 items-center">
                        <span className="w-10">नाम:</span>
                        <input value={formDetails.receiver?.name || ''} className={isViewOnly ? inputReadOnlyClass : inputEditableClass} disabled={isViewOnly} onChange={e => setFormDetails(prev => ({...prev, receiver: {...prev.receiver, name: e.target.value}}))}/>
                    </div>
                    <div className="flex gap-2 items-center">
                        <span className="w-10">पद:</span>
                        <input value={formDetails.receiver?.designation || ''} className={isViewOnly ? inputReadOnlyClass : inputEditableClass} disabled={isViewOnly} onChange={e => setFormDetails(prev => ({...prev, receiver: {...prev.receiver, designation: e.target.value}}))}/>
                    </div>
                    <div className="flex gap-2 items-center">
                        <span className="w-10">मिति:</span>
                        <input value={formDetails.receiver?.date || ''} className={isViewOnly ? inputReadOnlyClass : inputEditableClass} disabled={isViewOnly} onChange={e => setFormDetails(prev => ({...prev, receiver: {...prev.receiver, date: e.target.value}}))}/>
                    </div>
                </div>
            </div>

            {/* खर्च निकासा खातामा चढाउने (Ledger Entry) */}
            <div>
                <div className="font-bold mb-4">खर्च निकासा खातामा चढाउने:</div>
                <div className="space-y-1">
                    <div className="flex gap-2 items-center">
                        <span className="w-10">नाम:</span>
                        <input value={formDetails.ledgerEntry?.name || ''} className={isViewOnly ? inputReadOnlyClass : inputEditableClass} disabled={isViewOnly} onChange={e => setFormDetails(prev => ({...prev, ledgerEntry: {...prev.ledgerEntry, name: e.target.value}}))}/>
                    </div>
                    <div className="flex gap-2 items-center">
                        <span className="w-10">पद:</span>
                        <input value={formDetails.ledgerEntry?.designation || ''} className={isViewOnly ? inputReadOnlyClass : inputEditableClass} disabled={isViewOnly} onChange={e => setFormDetails(prev => ({...prev, ledgerEntry: {...prev.ledgerEntry, designation: e.target.value}}))}/>
                    </div>
                    <div className="flex gap-2 items-center">
                        <span className="w-10">मिति:</span>
                        <input value={formDetails.ledgerEntry?.date || ''} className={isViewOnly ? inputReadOnlyClass : inputEditableClass} disabled={isViewOnly} onChange={e => setFormDetails(prev => ({...prev, ledgerEntry: {...prev.ledgerEntry, date: e.target.value}}))}/>
                    </div>
                </div>
            </div>

            {/* स्वीकृत गर्ने (Approver) */}
            <div>
                <div className="font-bold mb-4">स्वीकृत गर्ने:</div>
                <div className="space-y-1">
                    <div className="flex gap-2 items-center">
                        <span className="w-10">नाम:</span>
                        <input value={formDetails.approvedBy?.name || ''} className={isViewOnly || !canApprove ? inputReadOnlyClass : inputEditableClass} disabled={isViewOnly || !canApprove} onChange={e => setFormDetails(prev => ({...prev, approvedBy: {...prev.approvedBy, name: e.target.value}}))}/>
                    </div>
                    <div className="flex gap-2 items-center">
                        <span className="w-10">पद:</span>
                        <input value={formDetails.approvedBy?.designation || ''} className={isViewOnly || !canApprove ? inputReadOnlyClass : inputEditableClass} disabled={isViewOnly || !canApprove} onChange={e => setFormDetails(prev => ({...prev, approvedBy: {...prev.approvedBy, designation: e.target.value}}))}/>
                    </div>
                    <div className="flex gap-2 items-center">
                        <span className="w-10">मिति:</span>
                        <input value={formDetails.approvedBy?.date || ''} className={isViewOnly || !canApprove ? inputReadOnlyClass : inputEditableClass} disabled={isViewOnly || !canApprove} onChange={e => setFormDetails(prev => ({...prev, approvedBy: {...prev.approvedBy, date: e.target.value}}))}/>
                    </div>
                </div>
            </div>
          </div>
       </div>

        {/* Reject Confirmation Modal */}
        {showRejectModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowRejectModal(false)}></div>
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-red-50/50">
                        <h3 className="font-bold text-slate-800 text-lg font-nepali">अस्वीकृत गर्नुहोस् (Reject)</h3>
                        <button onClick={() => setShowRejectModal(false)}><X size={20} /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <label className="block text-sm font-medium text-slate-700">कारण (Reason)</label>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            rows={4}
                            className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-red-500 outline-none"
                            required
                        ></textarea>
                    </div>
                    <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                        <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Cancel</button>
                        <button onClick={handleReject} className="px-6 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm shadow-sm">Confirm Reject</button>
                    </div>
                </div>
            </div>
        )}

        {/* Verification Modal (Storekeeper) */}
        {showVerifyPopup && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowVerifyPopup(false)}></div>
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-primary-50/50">
                        <div className="flex items-center gap-3">
                            <ShieldCheck size={20} className="text-primary-600"/>
                            <h3 className="font-bold text-slate-800 text-lg font-nepali">माग प्रमाणित गर्नुहोस्</h3>
                        </div>
                        <button onClick={() => setShowVerifyPopup(false)}><X size={20} /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <p className="text-sm text-slate-600">यो माग कुन गोदामको लागि हो र कस्तो प्रकारको सामान माग गरिएको हो, छान्नुहोस्।</p>
                        <Select
                            label="गोदाम/स्टोर छान्नुहोस् *"
                            options={storeOptions}
                            value={verificationData.storeId}
                            onChange={e => setVerificationData(prev => ({...prev, storeId: e.target.value}))}
                            required
                            icon={<Warehouse size={16} />}
                        />
                        <Select
                            label="सामानको प्रकार छान्नुहोस् *"
                            options={[
                                {id: 'exp', value: 'Expendable', label: 'खर्च हुने (Expendable)'},
                                {id: 'nonexp', value: 'Non-Expendable', label: 'खर्च नहुने (Non-Expendable)'}
                            ]}
                            value={verificationData.itemType}
                            onChange={e => setVerificationData(prev => ({...prev, itemType: e.target.value as any}))}
                            required
                            icon={<Layers size={16} />}
                        />
                    </div>
                    <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                        <button onClick={() => setShowVerifyPopup(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">रद्द</button>
                        {/* Fix: Added type assertion to `verificationData` to satisfy `handleSave`'s parameter type. */}
                        <button 
                          onClick={() => handleSave(verificationData as { storeId: string, itemType: 'Expendable' | 'Non-Expendable' })} 
                          disabled={!verificationData.storeId || !verificationData.itemType} // Added validation for itemType
                          className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg text-sm shadow-sm"
                        >
                            <Check size={16} /> प्रमाणित गर्नुहोस्
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Insufficient Stock Modal */}
        {showInsufficientStockModal && (
            <InsufficientStockModal
                isOpen={showInsufficientStockModal}
                onClose={() => setShowInsufficientStockModal(false)}
                insufficientItems={insufficientStockItems}
            />
        )}
    </div>
  );
};