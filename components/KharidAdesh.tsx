

import React, { useState, useMemo, useCallback } from 'react';
import { ShoppingCart, FilePlus, ChevronRight, ArrowLeft, Printer, Save, Calculator, CheckCircle2, Send, ShieldCheck, CheckCheck, Eye, FileText, Clock, Archive, AlertCircle, X, Maximize2, Minimize2 } from 'lucide-react';
import { User, Option, OrganizationSettings } from '../types/coreTypes';
import { PurchaseOrderEntry, MagItem, FirmEntry, QuotationEntry, InventoryItem } from '../types/inventoryTypes';
import { FISCAL_YEARS } from '../constants';
import { SearchableSelect } from './SearchableSelect';
import { NepaliDatePicker } from './NepaliDatePicker';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface KharidAdeshProps {
    orders: PurchaseOrderEntry[];
    currentFiscalYear: string;
    onSave: (order: PurchaseOrderEntry) => void;
    currentUser: User;
    firms: FirmEntry[];
    quotations: QuotationEntry[];
    onDakhilaClick?: (order: PurchaseOrderEntry) => void;
    generalSettings: OrganizationSettings;
    inventoryItems: InventoryItem[]; // Added to access inventory details
}

// Local interface for form items to handle string inputs
interface FormPOItem {
    id: number; // Unique ID for React keys, from MagItem.id
    name: string; // From MagItem
    specification: string; // From MagItem
    unit: string; // From MagItem
    quantity: string; // String for input field
    remarks: string; // From MagItem
    codeNo: string; // From MagItem.codeNo, treated as always string in form
    model: string; // New field for PO
    rate: string; // String for input field
    total: string; // Calculated total as a string for display
}

// Print Options Modal Component
const PrintOptionsModal: React.FC<{ onClose: () => void; onPrint: (orientation: 'portrait' | 'landscape') => void }> = ({ onClose, onPrint }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-primary-50/50">
                    <div className="flex items-center gap-3">
                        <Printer size={20} className="text-primary-600"/>
                        <h3 className="font-bold text-slate-800 text-lg font-nepali">प्रिन्ट विकल्पहरू (Print Options)</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full"><X size={20} className="text-slate-400"/></button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-slate-600">कृपया प्रिन्ट ओरिएन्टेशन छान्नुहोस् (Please select print orientation):</p>
                    <button onClick={() => onPrint('portrait')} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-bold shadow-md hover:bg-primary-700 transition-colors">
                        <Minimize2 size={18} /> प्रिन्ट पोर्ट्रेट (Print Portrait)
                    </button>
                    <button onClick={() => onPrint('landscape')} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-lg font-bold shadow-md hover:bg-slate-900 transition-colors">
                        <Maximize2 size={18} /> प्रिन्ट ल्यान्डस्केप (Print Landscape)
                    </button>
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-slate-900 transition-all">बन्द गर्नुहोस्</button>
                </div>
            </div>
        </div>
    );
};


export const KharidAdesh: React.FC<KharidAdeshProps> = ({ orders, currentFiscalYear, onSave, currentUser, firms, quotations, onDakhilaClick, generalSettings, inventoryItems }) => {
    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderEntry | null>(null);
    const [isSaved, setIsSaved] = useState(false);
    const [isViewOnlyMode, setIsViewOnlyMode] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [showPrintOptionsModal, setShowPrintOptionsModal] = useState(false); // New state for print modal

    // Calculate Today in Nepali for Restrictions
    const todayBS = useMemo(() => {
        try {
            return new NepaliDate().format('YYYY-MM-DD');
        } catch (e) {
            return '';
        }
    }, []);

    const [poDetails, setPoDetails] = useState({
        fiscalYear: '',
        orderNo: '',
        orderDate: todayBS, // Auto-fill with today's date
        decisionNo: '',
        decisionDate: '',
        vendorName: '',
        vendorAddress: '',
        vendorPan: '',
        vendorPhone: '',
        budgetSubHeadNo: '',
        expHeadNo: '',
        activityNo: '',
        preparedBy: { name: '', designation: '', date: '' },
        recommendedBy: { name: '', designation: '', date: '' },
        financeBy: { name: '', designation: '', date: '' },
        approvedBy: { name: '', designation: '', date: '' }
    });

    const [poItems, setPoItems] = useState<FormPOItem[]>([]);

    const isStoreKeeper = currentUser.role === 'STOREKEEPER';
    const isAccount = currentUser.role === 'ACCOUNT';
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'APPROVAL'].includes(currentUser.role);

    const vendorOptions: Option[] = useMemo(() => {
        return firms.map(f => ({
            id: f.id,
            value: f.firmName,
            label: `${f.firmName} (PAN: ${f.vatPan})`
        }));
    }, [firms]);

    // Item options for SearchableSelect, including full item data
    const itemOptions: Option[] = useMemo(() => {
        return inventoryItems.map(item => ({
            id: item.id,
            value: item.itemName,
            label: `${item.itemName} (${item.unit}) - ${item.uniqueCode || item.sanketNo || ''}`,
            itemData: item // Pass the full item object
        }));
    }, [inventoryItems]);

    const getFiscalYearLabel = (val: string) => {
        return FISCAL_YEARS.find(fy => fy.value === val)?.label || val;
    }

    const getLowestQuoteTooltip = (itemName: string) => {
        if (!itemName) return undefined;
        const relevantQuotes = quotations.filter(q => 
            q.fiscalYear === currentFiscalYear &&
            q.itemName.toLowerCase().trim() === itemName.toLowerCase().trim()
        );

        if (relevantQuotes.length === 0) return "कुनै कोटेशन भेटिएन (No Quotations)";

        const lowest = relevantQuotes.reduce((min, curr) => 
            parseFloat(curr.rate) < parseFloat(min.rate) ? curr : min
        );

        return `न्यूनतम कबुल गर्ने (Lowest Quote):\nफर्म: ${lowest.firmName}\nदर: रु. ${lowest.rate}`;
    };

    const handleLoadOrder = (order: PurchaseOrderEntry, viewOnly: boolean = false) => {
        setSelectedOrder(order);
        setIsSaved(false);
        setIsViewOnlyMode(viewOnly);
        setSuccessMessage(null);
        setValidationError(null);

        const fyToUse = order.fiscalYear || currentFiscalYear;
        const fyLabel = getFiscalYearLabel(fyToUse);

        const existingNumbers = orders
            .filter(o => o.status === 'Generated' && o.fiscalYear === fyToUse)
            .map(o => {
                const orderNo = String(o.orderNo); // Ensure it's a string
                // Extract number part if it has a prefix like 'PO-'
                const match = orderNo.match(/^(?:PO-)?(\d+)$/);
                return match ? parseInt(match[1]) : 0;
            })
            .filter(num => !isNaN(num)); // Filter out NaN values
        
        const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
        // If order.orderNo is already defined, use it directly, otherwise generate the next sequential number.
        const nextOrderNo = order.orderNo ? order.orderNo : (maxNum + 1).toString();

        // Map MagItem[] to FormPOItem[] for internal form state
        setPoItems(order.items.map(item => ({
            id: item.id,
            name: item.name,
            specification: item.specification,
            unit: item.unit,
            quantity: item.quantity.toString(), // Convert number to string
            remarks: item.remarks,
            codeNo: item.codeNo || '', // MagItem.codeNo is optional
            model: '', // Not in MagItem, initialize empty
            rate: item.rate ? item.rate.toString() : '', // Convert number to string
            total: item.totalAmount ? item.totalAmount.toString() : '' // Convert number to string
        })));
        
        let defaultOrderDate = order.requestDate || '';
        if (!defaultOrderDate) {
            defaultOrderDate = todayBS;
        }

        setPoDetails(prev => ({
            ...prev,
            fiscalYear: fyLabel,
            orderNo: nextOrderNo, 
            orderDate: defaultOrderDate, 
            decisionNo: order.decisionNo || '',
            decisionDate: order.decisionDate || '',
            vendorName: order.vendorDetails?.name || '',
            vendorAddress: order.vendorDetails?.address || '',
            vendorPan: order.vendorDetails?.pan || '',
            vendorPhone: order.vendorDetails?.phone || '',
            budgetSubHeadNo: order.budgetDetails?.budgetSubHeadNo || '',
            expHeadNo: order.budgetDetails?.expHeadNo || '',
            activityNo: order.budgetDetails?.activityNo || '',
            
            // Auto-fill PreparedBy for Storekeeper
            preparedBy: (order.status === 'Pending' && isStoreKeeper && !viewOnly)
                ? { name: currentUser.fullName, designation: currentUser.designation, date: defaultOrderDate }
                : (order.preparedBy ? {
                    name: order.preparedBy.name,
                    designation: order.preparedBy.designation || '',
                    date: order.preparedBy.date || ''
                } : { name: '', designation: '', date: '' }),

            recommendedBy: order.recommendedBy ? {
                name: order.recommendedBy.name,
                designation: order.recommendedBy.designation || '',
                date: order.recommendedBy.date || ''
            } : { name: '', designation: '', date: '' },

            // Auto-fill FinanceBy for Account
            financeBy: (order.status === 'Pending Account' && isAccount && !viewOnly)
                ? { name: currentUser.fullName, designation: currentUser.designation, date: todayBS }
                : (order.financeBy ? {
                    name: order.financeBy.name,
                    designation: order.financeBy.designation || '',
                    date: order.financeBy.date || ''
                } : { name: '', designation: '', date: '' }),

            // Auto-fill ApprovedBy for Admin/Approval
            approvedBy: (order.status === 'Account Verified' && isAdmin && !viewOnly)
                ? { name: currentUser.fullName, designation: currentUser.designation, date: todayBS }
                : (order.approvedBy ? {
                    name: order.approvedBy.name,
                    designation: order.approvedBy.designation || '',
                    date: order.approvedBy.date || ''
                } : { name: '', designation: '', date: '' })
        }));
    };

    const handleBack = () => {
        setSelectedOrder(null);
        setIsViewOnlyMode(false);
        setSuccessMessage(null);
        setValidationError(null);
        setPoItems([]); // Clear items on back
        setPoDetails(prev => ({ // Reset poDetails
            ...prev,
            orderNo: '',
            orderDate: todayBS,
            decisionNo: '',
            decisionDate: '',
            vendorName: '',
            vendorAddress: '',
            vendorPan: '',
            vendorPhone: '',
            budgetSubHeadNo: '',
            expHeadNo: '',
            activityNo: '',
            preparedBy: { name: '', designation: '', date: '' },
            recommendedBy: { name: '', designation: '', date: '' },
            financeBy: { name: '', designation: '', date: '' },
            approvedBy: { name: '', designation: '', date: '' }
        }));
    };

    const handleSavePO = () => {
        if (!selectedOrder || isViewOnlyMode) return;
        setValidationError(null);

        const date = poDetails.orderDate.trim();
        if (!date) {
            setValidationError('खरिद आदेश मिति अनिवार्य छ (Order Date is required)।');
            return;
        }
        
        let nextStatus = selectedOrder.status;
        let successMessageText = "Saved successfully!";

        if (isStoreKeeper && selectedOrder.status === 'Pending') {
            nextStatus = 'Pending Account';
            successMessageText = "अर्डर लेखा शाखामा पठाइयो (Sent to Account Branch)";
        } else if (isAccount && selectedOrder.status === 'Pending Account') {
            nextStatus = 'Account Verified';
            successMessageText = "अर्डर प्रमाणिकरण गरियो र स्वीकृतिको लागि पठाइयो (Verified and Forwarded for Approval)";
        } else if (isAdmin && selectedOrder.status === 'Account Verified') {
            nextStatus = 'Generated';
            successMessageText = "खरिद आदेश स्वीकृत र जारी गरियो (PO Approved and Generated)";
        }

        // Map FormPOItem[] back to MagItem[] for saving
        const mappedItems: MagItem[] = poItems.map(i => ({
            id: i.id,
            name: i.name,
            specification: i.specification,
            unit: i.unit,
            quantity: i.quantity, // Correct: maps string to string
            remarks: i.remarks,
            codeNo: i.codeNo,
            rate: parseFloat(i.rate) || 0, // Correct: converts string to number
            totalAmount: parseFloat(i.total) || 0 // Correct: converts string to number
        }));

        const updatedOrder: PurchaseOrderEntry = {
            ...selectedOrder,
            status: nextStatus,
            orderNo: poDetails.orderNo,
            requestDate: poDetails.orderDate,
            fiscalYear: currentFiscalYear, 
            items: mappedItems, // Use mapped items
            decisionNo: poDetails.decisionNo,
            decisionDate: poDetails.decisionDate,
            vendorDetails: {
                name: poDetails.vendorName,
                address: poDetails.vendorAddress,
                pan: poDetails.vendorPan,
                phone: poDetails.vendorPhone
            },
            budgetDetails: {
                budgetSubHeadNo: poDetails.budgetSubHeadNo,
                expHeadNo: poDetails.expHeadNo,
                activityNo: poDetails.activityNo
            },
            preparedBy: poDetails.preparedBy,
            recommendedBy: poDetails.recommendedBy,
            financeBy: poDetails.financeBy,
            approvedBy: poDetails.approvedBy
        };

        onSave(updatedOrder);
        setIsSaved(true);
        setSuccessMessage(successMessageText);
        
        if (nextStatus === 'Generated' || nextStatus !== selectedOrder.status) {
             setTimeout(() => {
                 setSelectedOrder(null);
                 setSuccessMessage(null);
             }, 2000);
        }
    };

    const handleItemChange = useCallback((index: number, field: keyof FormPOItem, value: string) => {
        setPoItems(prevItems => {
            const newItems = [...prevItems];
            newItems[index] = { ...newItems[index], [field]: value };

            if (field === 'rate' || field === 'quantity') {
                const qty = parseFloat(newItems[index].quantity) || 0;
                const rate = parseFloat(newItems[index].rate) || 0;
                newItems[index].total = (qty * rate).toFixed(2);
            }
            return newItems;
        });
    }, []);

    const handlePoItemSelect = useCallback((index: number, option: Option) => {
        const invItem = option.itemData as InventoryItem;
        if (invItem) {
            setPoItems(prevItems => {
                const newItems = [...prevItems];
                newItems[index] = {
                    ...newItems[index],
                    name: invItem.itemName, // Auto-fill name
                    codeNo: invItem.uniqueCode || invItem.sanketNo || '', // Auto-fill codeNo
                    unit: invItem.unit, // Auto-fill unit
                    specification: invItem.specification || '', // Auto-fill specification
                    rate: invItem.rate ? invItem.rate.toString() : newItems[index].rate, // Use inventory rate if available, else keep existing
                };
                // Recalculate total if rate was updated
                const qty = parseFloat(newItems[index].quantity) || 0;
                const rate = parseFloat(newItems[index].rate) || 0;
                newItems[index].total = (qty * rate).toFixed(2);
                return newItems;
            });
        }
    }, []);


    const handleOrderDateChange = (val: string) => {
        setPoDetails(prev => ({
            ...prev, 
            orderDate: val,
            // Sync preparedBy date if it's the current user making the change
            preparedBy: (currentUser.role === 'STOREKEEPER' && selectedOrder?.status === 'Pending' && !isViewOnlyMode)
                ? { ...prev.preparedBy, date: val }
                : prev.preparedBy
        }));
    };

    const grandTotal = poItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);

    const actionableOrders = orders.filter(order => {
        if (isStoreKeeper) return order.status === 'Pending';
        if (isAccount) return order.status === 'Pending Account';
        if (isAdmin) return order.status === 'Account Verified';
        return false;
    }).sort((a, b) => parseInt(String(b.magFormNo)) - parseInt(String(a.magFormNo))); // Explicitly cast to string

    const trackedOrders = orders.filter(order => {
        // Storekeeper sees all statuses except 'Pending' (which is in actionable)
        if (isStoreKeeper) return order.status !== 'Pending';
        // Account sees 'Account Verified', 'Generated', 'Stock Entry Requested', 'Completed'
        if (isAccount) return ['Account Verified', 'Generated', 'Stock Entry Requested', 'Completed'].includes(order.status);
        // Admin sees 'Generated', 'Stock Entry Requested', 'Completed'
        if (isAdmin) return ['Generated', 'Stock Entry Requested', 'Completed'].includes(order.status);
        return false;
    }).sort((a, b) => parseInt(String(b.magFormNo)) - parseInt(String(a.magFormNo))); // Explicitly cast to string

    const canEditVendor = isStoreKeeper && !isViewOnlyMode && selectedOrder?.status === 'Pending';
    const canEditBudget = isStoreKeeper && !isViewOnlyMode && selectedOrder?.status === 'Pending';
    
    let actionLabel = 'Save';
    let ActionIcon = Save;
    if (isStoreKeeper) { actionLabel = 'Save & Send to Account'; ActionIcon = Send; }
    if (isAccount) { actionLabel = 'Verify & Forward'; ActionIcon = ShieldCheck; }
    if (isAdmin) { actionLabel = 'Approve & Generate'; ActionIcon = CheckCheck; }
    // If in view only mode, the button will simply indicate it
    if (isViewOnlyMode) { actionLabel = 'View Only'; ActionIcon = Eye; }

    const printDocument = useCallback((orientation: 'portrait' | 'landscape') => {
        const style = document.createElement('style');
        style.id = 'print-orientation-style';
        style.innerHTML = `@page { size: A4 ${orientation}; margin: 1cm; }`;
        document.head.appendChild(style);

        window.print();

        // Delay removal of style to ensure print dialog closes
        setTimeout(() => {
            document.head.removeChild(style);
            setShowPrintOptionsModal(false); // Close the modal after print command
        }, 500); 
    }, []);

    if (selectedOrder) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
                    <div className="flex items-center gap-4">
                        <button onClick={handleBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h2 className="font-bold text-slate-700 font-nepali text-lg">खरिद आदेश तयार गर्नुहोस् (Generate Purchase Order)</h2>
                            <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-0.5 rounded border bg-slate-100 text-slate-600 border-slate-200">
                                    Status: {selectedOrder.status}
                                </span>
                                {isViewOnlyMode && <span className="text-xs font-bold text-slate-500">PREVIEW MODE</span>}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                         <button onClick={() => setShowPrintOptionsModal(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-lg font-medium shadow-sm transition-colors">
                            <Printer size={18} /> Print
                        </button>
                        {isStoreKeeper && selectedOrder.status === 'Generated' && onDakhilaClick && (
                            <button onClick={() => {
                                    const orderWithRates = {
                                        ...selectedOrder,
                                        items: selectedOrder.items.map((item, idx) => ({
                                            ...item,
                                            rate: parseFloat(poItems[idx]?.rate) || 0,
                                        }))
                                    }
                                    onDakhilaClick(orderWithRates);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-medium shadow-sm transition-colors"
                            >
                                <Archive size={18} /> दाखिला गर्नुहोस् (Entry to Stock)
                            </button>
                        )}
                        {!isViewOnlyMode && (
                            <button onClick={handleSavePO} disabled={isSaved} className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium shadow-sm transition-colors ${isSaved ? 'bg-green-600 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'}`}>
                                {isSaved ? <CheckCircle2 size={18} /> : <ActionIcon size={18} />}
                                {isSaved ? 'प्रक्रियामा...' : actionLabel}
                            </button>
                        )}
                    </div>
                </div>

                {validationError && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex items-start gap-3 animate-in slide-in-from-top-2 mx-4">
                        <div className="text-red-500 mt-0.5"><AlertCircle size={24} /></div>
                        <div className="flex-1">
                           <h3 className="text-red-800 font-bold text-sm">मिति मिलेन (Date Error)</h3>
                           <p className="text-red-700 text-sm mt-1 whitespace-pre-line leading-relaxed">{validationError}</p>
                        </div>
                        <button onClick={() => setValidationError(null)} className="text-red-400 hover:text-red-600 transition-colors"><X size={20} /></button>
                    </div>
                )}

                {successMessage && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4 rounded-r-xl shadow-sm flex items-center gap-3 animate-in slide-in-from-top-2 mx-4 mt-4">
                        <div className="text-green-500"><CheckCircle2 size={24} /></div>
                        <div className="flex-1">
                           <h3 className="text-green-800 font-bold text-lg font-nepali">सफल भयो (Success)</h3>
                           <p className="text-green-700 text-sm">{successMessage}</p>
                        </div>
                    </div>
                )}

                <div className="bg-white p-8 md:p-12 rounded-xl shadow-lg max-w-[210mm] mx-auto min-h-[297mm] text-slate-900 font-nepali text-sm print:shadow-none print:p-0 print:max-w-none">
                    <div className="mb-8">
                        <div className="flex items-start justify-between">
                            <div className="w-24 flex justify-start pt-2 print:h-24 print:w-24 print:shrink-0">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png" alt="Nepal Emblem" className="h-24 w-24 object-contain" />
                            </div>
                            <div className="flex-1 text-center space-y-1">
                                <h1 className="text-xl font-bold text-red-600 print:text-base print:text-slate-900">{generalSettings.orgNameNepali}</h1>
                                {generalSettings.subTitleNepali && <h2 className="text-lg font-bold print:text-sm">{generalSettings.subTitleNepali}</h2>}
                                {generalSettings.subTitleNepali2 && <h3 className="text-base font-bold print:text-xs">{generalSettings.subTitleNepali2}</h3>}
                                {generalSettings.subTitleNepali3 && <h3 className="text-lg font-bold print:text-xs">{generalSettings.subTitleNepali3}</h3>}
                                {/* ADDED: Contact Details Row */}
                                <div className="text-xs mt-2 space-x-3 font-medium text-slate-600 print:text-[8px] print:text-slate-700">
                                    {generalSettings.address && <span>{generalSettings.address}</span>}
                                    {generalSettings.phone && <span>| फोन: {generalSettings.phone}</span>}
                                    {generalSettings.email && <span>| ईमेल: {generalSettings.email}</span>}
                                    {generalSettings.panNo && <span>| पान नं: {generalSettings.panNo}</span>}
                                </div>
                            </div>
                            <div className="w-24 print:h-24 print:w-24 print:shrink-0"></div> 
                        </div>
                        <div className="text-center pt-6 pb-2 print:pt-4">
                            <h1 className="text-xl font-bold underline underline-offset-4 print:text-base">खरिद आदेश</h1>
                        </div>
                    </div>

                    <div className="flex justify-between items-start mb-6 print:text-[10px] print:mb-4">
                        <div className="w-1/2 space-y-2">
                             <div className="flex flex-col gap-1">
                                <label className="font-bold print:font-semibold">श्री (आदेश गरिएको व्यक्ति/फर्म/निकाय नाम):</label>
                                {canEditVendor ? (
                                    <SearchableSelect
                                        options={vendorOptions}
                                        value={poDetails.vendorName}
                                        onChange={(val) => setPoDetails({...poDetails, vendorName: val})}
                                        onSelect={(option) => {
                                            const selectedFirm = firms.find(f => f.id === option.id);
                                            if (selectedFirm) {
                                                setPoDetails(prev => ({ ...prev, vendorName: selectedFirm.firmName, vendorAddress: selectedFirm.address, vendorPan: selectedFirm.vatPan, vendorPhone: selectedFirm.contactNo }));
                                            }
                                        }}
                                        placeholder="Vendor Name"
                                        className="!border-b !border-dotted !border-slate-400 !rounded-none !bg-transparent !px-0 !py-1 print:border-none print:bg-none print:text-slate-900 print:text-[10px] print:font-bold print:px-0"
                                    />
                                ) : (
                                    <input value={poDetails.vendorName} onChange={e => setPoDetails({...poDetails, vendorName: e.target.value})} className="border-b border-dotted border-slate-400 outline-none w-full bg-transparent focus:border-slate-800 disabled:cursor-not-allowed print:border-none print:bg-none print:text-slate-900 print:text-[10px] print:font-bold print:px-0" disabled={true} />
                                )}
                             </div>
                             <div className="flex items-center gap-2">
                                <label className="font-bold w-16 print:font-semibold">ठेगाना :</label>
                                <input value={poDetails.vendorAddress} onChange={e => setPoDetails({...poDetails, vendorAddress: e.target.value})} className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent disabled:cursor-not-allowed print:border-none print:bg-none print:text-slate-900 print:text-[10px] print:font-bold print:px-0" disabled={!canEditVendor} />
                             </div>
                             <div className="flex items-center gap-2">
                                <label className="font-bold print:font-semibold">स्थायी लेखा (PAN/VAT) नम्बर:</label>
                                <input value={poDetails.vendorPan} onChange={e => setPoDetails({...poDetails, vendorPan: e.target.value})} className="border-b border-dotted border-slate-400 outline-none w-32 bg-transparent disabled:cursor-not-allowed print:border-none print:bg-none print:text-slate-900 print:text-[10px] print:font-bold print:px-0" disabled={!canEditVendor} />
                             </div>
                             <div className="flex items-center gap-2">
                                <label className="font-bold w-16 print:font-semibold">फोन नं :</label>
                                <input value={poDetails.vendorPhone} onChange={e => setPoDetails({...poDetails, vendorPhone: e.target.value})} className="border-b border-dotted border-slate-400 outline-none w-32 bg-transparent disabled:cursor-not-allowed print:border-none print:bg-none print:text-slate-900 print:text-[10px] print:font-bold print:px-0" disabled={!canEditVendor} />
                             </div>
                        </div>

                        {/* Updated alignment for labels and inputs */}
                        <div className="w-1/3 space-y-2">
                            <div className="flex items-center gap-2">
                                <label className="font-bold w-28 text-left print:font-semibold">आर्थिक वर्ष :</label>
                                <input value={poDetails.fiscalYear} readOnly className="border-b border-dotted border-slate-400 outline-none flex-1 w-24 text-right bg-transparent print:border-none print:bg-none print:text-slate-900 print:font-bold print:px-0" />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="font-bold w-28 text-left print:font-semibold">खरिद आदेश नं :</label>
                                <input value={poDetails.orderNo} readOnly className="border-b border-dotted border-slate-400 outline-none flex-1 w-24 text-right bg-transparent font-bold text-red-600 print:border-none print:bg-none print:text-slate-900 print:font-bold print:px-0" />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="font-bold w-28 text-left print:font-semibold">खरिद आदेश मिति <span className="text-red-500 print:text-slate-900">*</span> :</label>
                                <NepaliDatePicker 
                                    value={poDetails.orderDate}
                                    onChange={handleOrderDateChange}
                                    format="YYYY/MM/DD"
                                    label=""
                                    hideIcon={true}
                                    inputClassName={`border-b border-dotted border-slate-400 outline-none flex-1 w-32 text-right bg-transparent font-bold placeholder:text-slate-400 placeholder:font-normal rounded-none px-0 py-0 h-auto focus:ring-0 focus:border-slate-400 ${validationError ? 'text-red-600' : ''} print:border-none print:bg-none print:text-slate-900 print:font-bold print:px-0`}
                                    wrapperClassName="w-32 flex-1"
                                    disabled={true} 
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="font-bold w-28 text-left print:font-semibold">खरिद सम्बन्धी निर्णय नं :</label>
                                <input value={poDetails.decisionNo} onChange={e => setPoDetails({...poDetails, decisionNo: e.target.value})} className="border-b border-dotted border-slate-400 outline-none flex-1 w-24 text-right bg-transparent disabled:cursor-not-allowed print:border-none print:bg-none print:text-slate-900 print:font-bold print:px-0" disabled={!canEditVendor} />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="font-bold w-28 text-left print:font-semibold">निर्णय मिति :</label>
                                <input value={poDetails.decisionDate} onChange={e => setPoDetails({...poDetails, decisionDate: e.target.value})} className="border-b border-dotted border-slate-400 outline-none flex-1 w-24 text-right bg-transparent disabled:cursor-not-allowed print:border-none print:bg-none print:text-slate-900 print:font-bold print:px-0" disabled={!canEditVendor} />
                            </div>
                        </div>
                    </div>

                    <div className="mb-6 print:mb-4">
                        <div className="flex items-center gap-2 text-slate-700 font-bold mb-3 border-b pb-2 print:text-[11px] print:border-slate-900 print:pb-1">बजेट विवरण:</div>
                        <div className="grid grid-cols-3 gap-4 print:text-[10px] print:gap-2">
                            <div>
                                <label className="font-bold block mb-1 print:font-semibold">बजेट उपशीर्षक नं:</label>
                                <input value={poDetails.budgetSubHeadNo} onChange={e => setPoDetails({...poDetails, budgetSubHeadNo: e.target.value})} className="border-b border-dotted border-slate-400 outline-none w-full bg-transparent disabled:cursor-not-allowed print:border-none print:bg-none print:text-slate-900 print:px-0" disabled={!canEditBudget} />
                            </div>
                            <div>
                                <label className="font-bold block mb-1 print:font-semibold">खर्च शीर्षक नं:</label>
                                <input value={poDetails.expHeadNo} onChange={e => setPoDetails({...poDetails, expHeadNo: e.target.value})} className="border-b border-dotted border-slate-400 outline-none w-full bg-transparent disabled:cursor-not-allowed print:border-none print:bg-none print:text-slate-900 print:px-0" disabled={!canEditBudget} />
                            </div>
                            <div>
                                <label className="font-bold block mb-1 print:font-semibold">कार्यक्रम क्रियाकलाप कोड नं:</label>
                                <input value={poDetails.activityNo} onChange={e => setPoDetails({...poDetails, activityNo: e.target.value})} className="border-b border-dotted border-slate-400 outline-none w-full bg-transparent disabled:cursor-not-allowed print:border-none print:bg-none print:text-slate-900 print:px-0" disabled={!canEditBudget} />
                            </div>
                        </div>
                    </div>

                    <div className="mb-6 print:mb-4">
                        <table className="w-full border-collapse border border-slate-900 text-center print:text-[8px] print:break-inside-avoid">
                            <thead>
                                <tr className="bg-slate-50 print:bg-slate-100 print:table-header-group">
                                    <th className="border border-slate-900 p-2 w-10 print:text-[7px]" rowSpan={2}>क्र.सं.</th>
                                    <th className="border border-slate-900 p-2 print:text-[7px]" colSpan={3}>सम्पत्ति तथा जिन्सी मालसामानको</th>
                                    <th className="border border-slate-900 p-2 print:text-[7px]" rowSpan={2}>मोडल</th>
                                    <th className="border border-slate-900 p-2 print:text-[7px]" rowSpan={2}>एकाई</th>
                                    <th className="border border-slate-900 p-2 print:text-[7px]" rowSpan={2}>परिमाण</th>
                                    <th className="border border-slate-900 p-2 print:text-[7px]" colSpan={2}>मूल्य(मू.अ.क. बाहेक)</th>
                                    <th className="border border-slate-900 p-2 print:text-[7px]" rowSpan={2}>कैफियत</th>
                                </tr>
                                <tr className="bg-slate-50 print:bg-slate-100">
                                    <th className="border border-slate-900 p-1 print:text-[7px]">सङ्केत नं</th>
                                    <th className="border border-slate-900 p-1 print:text-[7px]">नाम</th> {/* Increased width */}
                                    <th className="border border-slate-900 p-1 print:text-[7px]">स्पेसिफिकेसन</th> {/* Increased width */}
                                    <th className="border border-slate-900 p-1 print:text-[7px]">दर</th>
                                    <th className="border border-slate-900 p-1 print:text-[7px]">जम्मा</th>
                                </tr>
                            </thead>
                            <tbody>
                                {poItems.map((item, index) => (
                                    <tr key={item.id} className="print:page-break-inside-avoid">
                                        <td className="border border-slate-900 p-1 print:px-1 print:py-0.5">{index + 1}</td>
                                        <td className="border border-slate-900 p-1 print:px-1 print:py-0.5">
                                            <input value={item.codeNo} onChange={e => handleItemChange(index, 'codeNo', e.target.value)} className="w-full text-center outline-none bg-transparent disabled:cursor-not-allowed print:border-none print:bg-none print:text-slate-900 print:px-0" placeholder="Code" disabled={!canEditVendor} />
                                        </td>
                                        <td className="border border-slate-900 p-1 text-left px-2 cursor-help whitespace-normal print:px-1 print:py-0.5" title={getLowestQuoteTooltip(item.name)}>
                                            <SearchableSelect
                                                options={itemOptions}
                                                value={item.name}
                                                onChange={newName => handleItemChange(index, 'name', newName)}
                                                onSelect={(option) => handlePoItemSelect(index, option)} 
                                                placeholder="सामानको नाम खोज्नुहोस्"
                                                className="!border-none !bg-transparent !p-0 !whitespace-normal print:!border-none print:!bg-none print:!text-slate-900 print:!font-bold print:!px-0 !text-[8px]" // Changed !text-xs to !text-[8px] for print
                                                label=""
                                                disabled={!canEditVendor}
                                            />
                                        </td>
                                        <td className="border border-slate-900 p-1 print:px-1 print:py-0.5">
                                            <input value={item.specification} onChange={e => handleItemChange(index, 'specification', e.target.value)} className="w-full text-center outline-none bg-transparent disabled:cursor-not-allowed print:border-none print:bg-none print:text-slate-900 print:px-0" placeholder="Specification" disabled={!canEditVendor} />
                                        </td>
                                        <td className="border border-slate-900 p-1 print:px-1 print:py-0.5">
                                            <input value={item.model} onChange={e => handleItemChange(index, 'model', e.target.value)} className="w-full text-center outline-none bg-transparent disabled:cursor-not-allowed print:border-none print:bg-none print:text-slate-900 print:px-0" placeholder="Model" disabled={!canEditVendor} />
                                        </td>
                                        <td className="border border-slate-900 p-1 print:px-1 print:py-0.5">
                                            <input value={item.unit} onChange={e => handleItemChange(index, 'unit', e.target.value)} className="w-full text-center outline-none bg-transparent disabled:cursor-not-allowed print:border-none print:bg-none print:text-slate-900 print:px-0" placeholder="Unit" disabled={!canEditVendor} />
                                        </td>
                                        <td className="border border-slate-900 p-1 font-bold print:px-1 print:py-0.5">
                                            <input type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="w-full text-center outline-none bg-transparent disabled:cursor-not-allowed print:border-none print:bg-none print:text-slate-900 print:px-0" placeholder="Quantity" disabled={!canEditVendor} />
                                        </td>
                                        <td className="border border-slate-900 p-1 print:px-1 print:py-0.5">
                                            <input value={item.rate} onChange={e => handleItemChange(index, 'rate', e.target.value)} className="w-full text-right outline-none bg-transparent disabled:cursor-not-allowed print:border-none print:bg-none print:text-slate-900 print:px-0" placeholder="0.00" disabled={!canEditVendor} />
                                        </td>
                                        <td className="border border-slate-900 p-1 text-right font-bold bg-slate-50 print:bg-slate-100 print:px-1 print:py-0.5">{item.total || '-'}</td>
                                        <td className="border border-slate-900 p-1 print:px-1 print:py-0.5">
                                            <input value={item.remarks} onChange={e => handleItemChange(index, 'remarks', e.target.value)} className="w-full text-center outline-none bg-transparent disabled:cursor-not-allowed print:border-none print:bg-none print:text-slate-900 print:px-0" disabled={!canEditVendor} />
                                        </td>
                                    </tr>
                                ))}
                                <tr className="font-bold print:text-[9px]">
                                    <td className="border border-slate-900 p-1 text-right pr-4 print:px-1 print:py-0.5" colSpan={8}>कुल जम्मा (Total)</td>
                                    <td className="border border-slate-900 p-1 text-right print:px-1 print:py-0.5">{grandTotal.toFixed(2)}</td>
                                    <td className="border border-slate-900 p-1 print:px-1 print:py-0.5"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-8 mt-8 print:mt-12 print:text-[10px]">
                        <div className="grid grid-cols-2 gap-12 print:gap-8">
                            <div className="print:flex print:flex-col print:gap-2">
                                <label className="block font-bold mb-4 print:font-bold print:mb-2 print:text-sm print:border-b print:border-slate-900 print:pb-1">तयार गर्ने (Storekeeper):</label>
                                <div className="space-y-2 print:space-y-1">
                                    <div className="flex gap-2 print:block">
                                        <span className="w-16 print:w-auto print:font-semibold print:block print:mb-0.5">नाम :</span>
                                        <input 
                                            value={poDetails.preparedBy.name} 
                                            onChange={e => setPoDetails({...poDetails, preparedBy: {...poDetails.preparedBy, name: e.target.value}})} 
                                            className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent print:border-b print:border-slate-900 print:bg-none print:text-slate-900 print:px-0" 
                                            disabled={isViewOnlyMode || !(isStoreKeeper && selectedOrder?.status === 'Pending')}
                                        />
                                    </div>
                                    <div className="flex gap-2 print:block">
                                        <span className="w-16 print:w-auto print:font-semibold print:block print:mb-0.5">पद :</span>
                                        <input 
                                            value={poDetails.preparedBy.designation} 
                                            onChange={e => setPoDetails({...poDetails, preparedBy: {...poDetails.preparedBy, designation: e.target.value}})} 
                                            className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent print:border-b print:border-slate-900 print:bg-none print:text-slate-900 print:px-0" 
                                            disabled={isViewOnlyMode || !(isStoreKeeper && selectedOrder?.status === 'Pending')}
                                        />
                                    </div>
                                    <div className="flex gap-2 print:block">
                                        <span className="w-16 print:w-auto print:font-semibold print:block print:mb-0.5">मिति :</span>
                                        <input 
                                            value={poDetails.preparedBy.date} 
                                            onChange={e => setPoDetails({...poDetails, preparedBy: {...poDetails.preparedBy, date: e.target.value}})} 
                                            className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent text-xs print:border-b print:border-slate-900 print:bg-none print:text-slate-900 print:px-0" 
                                            disabled={isViewOnlyMode || !(isStoreKeeper && selectedOrder?.status === 'Pending')}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="print:flex print:flex-col print:gap-2">
                                <label className="block font-bold mb-4 print:font-bold print:mb-2 print:text-sm print:border-b print:border-slate-900 print:pb-1">सिफारिस गर्ने:</label>
                                <div className="space-y-2 print:space-y-1">
                                    <div className="flex gap-2 print:block">
                                        <span className="w-16 print:w-auto print:font-semibold print:block print:mb-0.5">नाम :</span>
                                        <input value={poDetails.recommendedBy.name} onChange={e => setPoDetails({...poDetails, recommendedBy: {...poDetails.recommendedBy, name: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent print:border-b print:border-slate-900 print:bg-none print:text-slate-900 print:px-0" disabled={isViewOnlyMode}/>
                                    </div>
                                    <div className="flex gap-2 print:block">
                                        <span className="w-16 print:w-auto print:font-semibold print:block print:mb-0.5">पद :</span>
                                        <input value={poDetails.recommendedBy.designation} onChange={e => setPoDetails({...poDetails, recommendedBy: {...poDetails.recommendedBy, designation: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent print:border-b print:border-slate-900 print:bg-none print:text-slate-900 print:px-0" disabled={isViewOnlyMode}/>
                                    </div>
                                    <div className="flex gap-2 print:block">
                                        <span className="w-16 print:w-auto print:font-semibold print:block print:mb-0.5">मिति :</span>
                                        <input value={poDetails.recommendedBy.date} onChange={e => setPoDetails({...poDetails, recommendedBy: {...poDetails.recommendedBy, date: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent text-xs print:border-b print:border-slate-900 print:bg-none print:text-slate-900 print:px-0" disabled={isViewOnlyMode}/>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-12 print:gap-8">
                            <div className="print:flex print:flex-col print:gap-2">
                                <label className="block font-bold mb-4 print:font-bold print:mb-2 print:text-sm print:border-b print:border-slate-900 print:pb-1">आर्थिक प्रशासन शाखा (Account):</label>
                                <div className="space-y-2 print:space-y-1">
                                    <div className="flex gap-2 print:block">
                                        <span className="w-16 print:w-auto print:font-semibold print:block print:mb-0.5">नाम :</span>
                                        <input 
                                            value={poDetails.financeBy.name} 
                                            onChange={e => setPoDetails({...poDetails, financeBy: {...poDetails.financeBy, name: e.target.value}})} 
                                            className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent print:border-b print:border-slate-900 print:bg-none print:text-slate-900 print:px-0" 
                                            disabled={isViewOnlyMode || !(isAccount && selectedOrder?.status === 'Pending Account')}
                                        />
                                    </div>
                                    <div className="flex gap-2 print:block">
                                        <span className="w-16 print:w-auto print:font-semibold print:block print:mb-0.5">पद :</span>
                                        <input 
                                            value={poDetails.financeBy.designation} 
                                            onChange={e => setPoDetails({...poDetails, financeBy: {...poDetails.financeBy, designation: e.target.value}})} 
                                            className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent print:border-b print:border-slate-900 print:bg-none print:text-slate-900 print:px-0" 
                                            disabled={isViewOnlyMode || !(isAccount && selectedOrder?.status === 'Pending Account')}
                                        />
                                    </div>
                                    <div className="flex gap-2 print:block">
                                        <span className="w-16 print:w-auto print:font-semibold print:block print:mb-0.5">मिति :</span>
                                        <input 
                                            value={poDetails.financeBy.date} 
                                            onChange={e => setPoDetails({...poDetails, financeBy: {...poDetails.financeBy, date: e.target.value}})} 
                                            className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent text-xs print:border-b print:border-slate-900 print:bg-none print:text-slate-900 print:px-0" 
                                            disabled={isViewOnlyMode || !(isAccount && selectedOrder?.status === 'Pending Account')}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="print:flex print:flex-col print:gap-2">
                                <label className="block font-bold mb-4 print:font-bold print:mb-2 print:text-sm print:border-b print:border-slate-900 print:pb-1">आदेश दिने (स्वीकृत गर्ने):</label>
                                <div className="space-y-2 print:space-y-1">
                                    <div className="flex gap-2 print:block">
                                        <span className="w-16 print:w-auto print:font-semibold print:block print:mb-0.5">नाम :</span>
                                        <input 
                                            value={poDetails.approvedBy.name} 
                                            onChange={e => setPoDetails({...poDetails, approvedBy: {...poDetails.approvedBy, name: e.target.value}})} 
                                            className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent print:border-b print:border-slate-900 print:bg-none print:text-slate-900 print:px-0" 
                                            disabled={isViewOnlyMode || !(isAdmin && selectedOrder?.status === 'Account Verified')}
                                        />
                                    </div>
                                    <div className="flex gap-2 print:block">
                                        <span className="w-16 print:w-auto print:font-semibold print:block print:mb-0.5">पद :</span>
                                        <input 
                                            value={poDetails.approvedBy.designation} 
                                            onChange={e => setPoDetails({...poDetails, approvedBy: {...poDetails.approvedBy, designation: e.target.value}})} 
                                            className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent print:border-b print:border-slate-900 print:bg-none print:text-slate-900 print:px-0" 
                                            disabled={isViewOnlyMode || !(isAdmin && selectedOrder?.status === 'Account Verified')}
                                        />
                                    </div>
                                    <div className="flex gap-2 print:block">
                                        <span className="w-16 print:w-auto print:font-semibold print:block print:mb-0.5">मिति :</span>
                                        <input 
                                            value={poDetails.approvedBy.date} 
                                            onChange={e => setPoDetails({...poDetails, approvedBy: {...poDetails.approvedBy, date: e.target.value}})} 
                                            className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent text-xs print:border-b print:border-slate-900 print:bg-none print:text-slate-900 print:px-0" 
                                            disabled={isViewOnlyMode || !(isAdmin && selectedOrder?.status === 'Account Verified')}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {showPrintOptionsModal && <PrintOptionsModal onClose={() => setShowPrintOptionsModal(false)} onPrint={printDocument} />}
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                        <ShoppingCart size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 font-nepali">खरिद आदेश (Purchase Order)</h2>
                        <p className="text-sm text-slate-500">खरिद आदेश तयार, सिफारिस र स्वीकृत गर्नुहोस्</p>
                    </div>
                </div>
            </div>

            {actionableOrders.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                    <div className="px-6 py-4 border-b border-slate-100 bg-orange-50 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Clock size={18} className="text-orange-600"/>
                            <h3 className="font-semibold text-orange-800 font-nepali">
                                {isStoreKeeper ? 'तयारीको लागि (Pending Preparation)' : 
                                 isAccount ? 'प्रमाणिकरणको लागि (Pending Verification)' : 
                                 'स्वीकृतिको लागि (Pending Approval)'}
                            </h3>
                        </div>
                        <span className="bg-orange-200 text-orange-800 text-xs font-bold px-2 py-1 rounded-full">{actionableOrders.length}</span>
                    </div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-medium">
                            <tr>
                                <th className="px-6 py-3">Mag Form No</th>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Items</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {actionableOrders.map(order => (
                                <tr key={order.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-mono font-medium text-slate-700">#{order.magFormNo}</td>
                                    <td className="px-6 py-4 font-nepali">{order.requestDate}</td>
                                    <td className="px-6 py-4 text-slate-600">{order.items.length} items</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
                                            order.status === 'Pending' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                            order.status === 'Pending Account' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                            'bg-purple-100 text-purple-700 border-purple-200'
                                        }`}>
                                            <Clock size={12}/> {order.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => handleLoadOrder(order, false)}
                                            className="text-primary-600 hover:text-primary-800 font-medium text-xs flex items-center justify-end gap-1 bg-primary-50 px-3 py-1.5 rounded-md hover:bg-primary-100 transition-colors"
                                        >
                                            <FilePlus size={14} /> Process
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <FileText size={18} className="text-slate-500"/>
                        <h3 className="font-semibold text-slate-700 font-nepali">खरिद आदेश इतिहास (Order History)</h3>
                    </div>
                </div>
                {trackedOrders.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 italic">कुनै आदेश फेला परेन (No orders found)</div>
                ) : (
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-medium">
                            <tr>
                                <th className="px-6 py-3">PO No</th>
                                <th className="px-6 py-3">Mag Form No</th>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {trackedOrders.map(order => (
                                <tr key={order.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-mono font-medium text-slate-700">{order.orderNo ? `#${order.orderNo}` : '-'}</td>
                                    <td className="px-6 py-4 font-mono text-slate-600">#{order.magFormNo}</td>
                                    <td className="px-6 py-4 font-nepali">{order.requestDate}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
                                            order.status === 'Completed' ? 'bg-teal-100 text-teal-700 border-teal-200' :
                                            order.status === 'Generated' ? 'bg-green-100 text-green-700 border-green-200' :
                                            'bg-blue-100 text-blue-700 border-blue-200'
                                        }`}>
                                            <CheckCircle2 size={12}/> {order.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => handleLoadOrder(order, true)}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-md text-xs font-bold transition-colors border border-slate-300"
                                        >
                                            <Eye size={14} /> View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            {showPrintOptionsModal && <PrintOptionsModal onClose={() => setShowPrintOptionsModal(false)} onPrint={printDocument} />}
        </div>
    );
};