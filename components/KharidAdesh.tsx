
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
    inventoryItems: InventoryItem[]; 
}

// Local interface for form items to handle string inputs
interface FormPOItem {
    id: number; 
    name: string; 
    specification: string; 
    unit: string; 
    quantity: string; 
    remarks: string; 
    codeNo: string; 
    model: string; 
    rate: string; 
    total: string; 
}

// Print Options Modal Component
const PrintOptionsModal: React.FC<{ onClose: () => void; onPrint: (orientation: 'portrait' | 'landscape') => void }> = ({ onClose, onPrint }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 no-print">
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
                    <p className="text-sm text-slate-600 font-nepali">कृपया प्रिन्ट ओरिएन्टेशन छान्नुहोस् (Please select print orientation):</p>
                    <button onClick={() => onPrint('portrait')} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-bold shadow-md hover:bg-primary-700 transition-colors font-nepali">
                        <Minimize2 size={18} /> प्रिन्ट पोर्ट्रेट (Portrait)
                    </button>
                    <button onClick={() => onPrint('landscape')} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-lg font-bold shadow-md hover:bg-slate-900 transition-colors font-nepali">
                        <Maximize2 size={18} /> प्रिन्ट ल्यान्डस्केप (Landscape)
                    </button>
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-slate-900 transition-all font-nepali">बन्द गर्नुहोस्</button>
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
    const [showPrintOptionsModal, setShowPrintOptionsModal] = useState(false);

    // Calculate Today in Nepali
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

    const itemOptions: Option[] = useMemo(() => {
        return inventoryItems.map(item => ({
            id: item.id,
            value: item.itemName,
            label: `${item.itemName} (${item.unit}) - ${item.uniqueCode || item.sanketNo || ''}`,
            itemData: item 
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
                const orderNo = String(o.orderNo);
                const match = orderNo.match(/^(?:PO-)?(\d+)$/);
                return match ? parseInt(match[1]) : 0;
            })
            .filter(num => !isNaN(num)); 
        
        const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
        const nextOrderNo = order.orderNo ? order.orderNo : (maxNum + 1).toString();

        setPoItems(order.items.map(item => ({
            id: item.id,
            name: item.name,
            specification: item.specification,
            unit: item.unit,
            quantity: item.quantity.toString(), 
            remarks: item.remarks,
            codeNo: item.codeNo || '', 
            model: '', 
            rate: item.rate ? item.rate.toString() : '', 
            total: item.totalAmount ? item.totalAmount.toString() : '' 
        })));
        
        let defaultOrderDate = order.requestDate || todayBS;

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
            
            preparedBy: (order.status === 'Pending' && isStoreKeeper && !viewOnly)
                ? { name: currentUser.fullName, designation: currentUser.designation, date: defaultOrderDate }
                : (order.preparedBy ? { name: order.preparedBy.name, designation: order.preparedBy.designation || '', date: order.preparedBy.date || '' } : { name: '', designation: '', date: '' }),

            recommendedBy: order.recommendedBy ? { name: order.recommendedBy.name, designation: order.recommendedBy.designation || '', date: order.recommendedBy.date || '' } : { name: '', designation: '', date: '' },

            financeBy: (order.status === 'Pending Account' && isAccount && !viewOnly)
                ? { name: currentUser.fullName, designation: currentUser.designation, date: todayBS }
                : (order.financeBy ? { name: order.financeBy.name, designation: order.financeBy.designation || '', date: order.financeBy.date || '' } : { name: '', designation: '', date: '' }),

            approvedBy: (order.status === 'Account Verified' && isAdmin && !viewOnly)
                ? { name: currentUser.fullName, designation: currentUser.designation, date: todayBS }
                : (order.approvedBy ? { name: order.approvedBy.name, designation: order.approvedBy.designation || '', date: order.approvedBy.date || '' } : { name: '', designation: '', date: '' })
        }));
    };

    const handleBack = () => {
        setSelectedOrder(null);
        setIsViewOnlyMode(false);
        setSuccessMessage(null);
        setValidationError(null);
        setPoItems([]); 
        setPoDetails(prev => ({ 
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

        if (!poDetails.orderDate.trim()) {
            setValidationError('खरिद आदेश मिति अनिवार्य छ (Order Date is required)।');
            return;
        }
        
        let nextStatus = selectedOrder.status;
        let successMessageText = "बचत भयो (Saved successfully!)";

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

        const mappedItems: MagItem[] = poItems.map(i => ({
            id: i.id,
            name: i.name,
            specification: i.specification,
            unit: i.unit,
            quantity: i.quantity, 
            remarks: i.remarks,
            codeNo: i.codeNo,
            rate: parseFloat(i.rate) || 0,
            totalAmount: parseFloat(i.total) || 0
        }));

        const updatedOrder: PurchaseOrderEntry = {
            ...selectedOrder,
            status: nextStatus,
            orderNo: poDetails.orderNo,
            requestDate: poDetails.orderDate,
            fiscalYear: currentFiscalYear, 
            items: mappedItems,
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
                    name: invItem.itemName,
                    codeNo: invItem.uniqueCode || invItem.sanketNo || '',
                    unit: invItem.unit,
                    specification: invItem.specification || '',
                    rate: invItem.rate ? invItem.rate.toString() : newItems[index].rate,
                };
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
            preparedBy: (currentUser.role === 'STOREKEEPER' && selectedOrder?.status === 'Pending' && !isViewOnlyMode)
                ? { ...prev.preparedBy, date: val } : prev.preparedBy
        }));
    };

    const grandTotal = poItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);

    const actionableOrders = orders.filter(order => {
        if (isStoreKeeper) return order.status === 'Pending';
        if (isAccount) return order.status === 'Pending Account';
        if (isAdmin) return order.status === 'Account Verified';
        return false;
    }).sort((a, b) => b.id.localeCompare(a.id));

    const trackedOrders = orders.filter(order => {
        if (isStoreKeeper) return order.status !== 'Pending';
        if (isAccount) return ['Account Verified', 'Generated', 'Stock Entry Requested', 'Completed'].includes(order.status);
        if (isAdmin) return ['Generated', 'Stock Entry Requested', 'Completed'].includes(order.status);
        return false;
    }).sort((a, b) => b.id.localeCompare(a.id));

    const canEditVendor = isStoreKeeper && !isViewOnlyMode && selectedOrder?.status === 'Pending';
    const canEditBudget = isStoreKeeper && !isViewOnlyMode && selectedOrder?.status === 'Pending';
    
    let actionLabel = 'Save';
    let ActionIcon = Save;
    if (isStoreKeeper) { actionLabel = 'Save & Send to Account'; ActionIcon = Send; }
    if (isAccount) { actionLabel = 'Verify & Forward'; ActionIcon = ShieldCheck; }
    if (isAdmin) { actionLabel = 'Approve & Generate'; ActionIcon = CheckCheck; }
    if (isViewOnlyMode) { actionLabel = 'View Only'; ActionIcon = Eye; }

    const printDocument = useCallback((orientation: 'portrait' | 'landscape') => {
        const style = document.createElement('style');
        style.id = 'print-orientation-style';
        style.innerHTML = `
            @media print {
                /* Hide everything by default */
                body * { visibility: hidden !important; }
                /* Show ONLY the specific form and its contents */
                #po-print-area, #po-print-area * { visibility: visible !important; }
                /* Force the form to top-left with no extra space */
                #po-print-area { 
                    position: absolute !important; 
                    left: 0 !important; 
                    top: 0 !important; 
                    width: 100% !important; 
                    margin: 0 !important; 
                    padding: 0 !important; 
                    box-shadow: none !important;
                    background: white !important;
                }
                /* Convert input field appearance to normal text */
                input, textarea, select { 
                    border: none !important; 
                    background: transparent !important; 
                    box-shadow: none !important; 
                    padding: 0 !important; 
                    font-weight: bold !important;
                    color: black !important;
                    -webkit-appearance: none;
                    appearance: none;
                }
                .nepali-date-picker-input-for-print input { border-bottom: 1px dotted #000 !important; }
                @page { size: A4 ${orientation}; margin: 1.5cm; }
            }
        `;
        document.head.appendChild(style);

        window.print();

        setTimeout(() => {
            const el = document.getElementById('print-orientation-style');
            if (el) document.head.removeChild(el);
            setShowPrintOptionsModal(false); 
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
                            <h2 className="font-bold text-slate-700 font-nepali text-lg">खरिद आदेश (Purchase Order)</h2>
                            <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-0.5 rounded border bg-slate-100 text-slate-600 border-slate-200">
                                    स्थिति: {selectedOrder.status}
                                </span>
                                {isViewOnlyMode && <span className="text-xs font-bold text-slate-500 font-nepali">केवल हेर्नको लागि (Preview Mode)</span>}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                         <button onClick={() => setShowPrintOptionsModal(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-lg font-medium shadow-sm transition-colors font-nepali">
                            <Printer size={18} /> प्रिन्ट (Print)
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
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-medium shadow-sm transition-colors font-nepali"
                            >
                                <Archive size={18} /> दाखिला गर्नुहोस् (Stock Entry)
                            </button>
                        )}
                        {!isViewOnlyMode && (
                            <button onClick={handleSavePO} disabled={isSaved} className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium shadow-sm transition-colors font-nepali ${isSaved ? 'bg-green-600 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'}`}>
                                {isSaved ? <CheckCircle2 size={18} /> : <ActionIcon size={18} />}
                                {isSaved ? 'प्रक्रियामा...' : actionLabel}
                            </button>
                        )}
                    </div>
                </div>

                {validationError && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex items-start gap-3 animate-in slide-in-from-top-2 mx-4 no-print">
                        <div className="text-red-500 mt-0.5"><AlertCircle size={24} /></div>
                        <div className="flex-1">
                           <h3 className="text-red-800 font-bold text-sm">विवरण मिलेन (Validation Error)</h3>
                           <p className="text-red-700 text-sm mt-1 whitespace-pre-line leading-relaxed font-nepali">{validationError}</p>
                        </div>
                        <button onClick={() => setValidationError(null)} className="text-red-400 hover:text-red-600 transition-colors"><X size={20} /></button>
                    </div>
                )}

                {successMessage && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4 rounded-r-xl shadow-sm flex items-center gap-3 animate-in slide-in-from-top-2 mx-4 mt-4 no-print">
                        <div className="text-green-500"><CheckCircle2 size={24} /></div>
                        <div className="flex-1">
                           <h3 className="text-green-800 font-bold text-lg font-nepali">सफल भयो (Success)</h3>
                           <p className="text-green-700 text-sm font-nepali">{successMessage}</p>
                        </div>
                    </div>
                )}

                <div id="po-print-area" className="bg-white p-8 md:p-12 rounded-xl shadow-lg max-w-[210mm] mx-auto min-h-[297mm] text-slate-900 font-nepali text-sm print:shadow-none print:p-0 print:max-w-none">
                    <div className="mb-8">
                        <div className="flex items-start justify-between">
                            <div className="w-24 flex justify-start pt-2 print:shrink-0">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png" alt="Nepal Emblem" className="h-20 w-20 object-contain" />
                            </div>
                            <div className="flex-1 text-center space-y-1">
                                <h1 className="text-xl font-bold text-red-600 print:text-black">{generalSettings.orgNameNepali}</h1>
                                {generalSettings.subTitleNepali && <h2 className="text-lg font-bold">{generalSettings.subTitleNepali}</h2>}
                                {generalSettings.subTitleNepali2 && <h3 className="text-base font-bold">{generalSettings.subTitleNepali2}</h3>}
                                <div className="text-xs mt-2 space-x-3 font-medium text-slate-600 print:text-black">
                                    {generalSettings.address && <span>{generalSettings.address}</span>}
                                    {generalSettings.phone && <span>| फोन: {generalSettings.phone}</span>}
                                    {generalSettings.panNo && <span>| पान नं: {generalSettings.panNo}</span>}
                                </div>
                            </div>
                            <div className="w-24"></div> 
                        </div>
                        <div className="text-center pt-6 pb-2">
                            <h1 className="text-xl font-bold underline underline-offset-4">खरिद आदेश</h1>
                            <p className="text-[10px] font-bold mt-1">म.ले.प. फारम नं ४०२</p>
                        </div>
                    </div>

                    <div className="flex justify-between items-start mb-6">
                        <div className="w-1/2 space-y-2">
                             <div className="flex flex-col gap-1">
                                <label className="font-bold">श्री (फर्म/निकायको नाम):</label>
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
                                        placeholder="छान्नुहोस्..."
                                        className="!border-b !border-dotted !border-slate-400 !rounded-none !bg-transparent !px-0 !py-1"
                                    />
                                ) : (
                                    <input value={poDetails.vendorName} readOnly className="border-b border-dotted border-slate-400 outline-none w-full bg-transparent font-bold" />
                                )}
                             </div>
                             <div className="flex items-center gap-2">
                                <label className="font-bold w-16">ठेगाना :</label>
                                <input value={poDetails.vendorAddress} onChange={e => setPoDetails({...poDetails, vendorAddress: e.target.value})} className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent" disabled={!canEditVendor} />
                             </div>
                             <div className="flex items-center gap-2">
                                <label className="font-bold">PAN/VAT नं:</label>
                                <input value={poDetails.vendorPan} onChange={e => setPoDetails({...poDetails, vendorPan: e.target.value})} className="border-b border-dotted border-slate-400 outline-none w-32 bg-transparent" disabled={!canEditVendor} />
                             </div>
                        </div>

                        <div className="w-1/3 space-y-2">
                            <div className="flex items-center gap-2">
                                <label className="font-bold w-28 text-left">आर्थिक वर्ष :</label>
                                <input value={poDetails.fiscalYear} readOnly className="border-b border-dotted border-slate-400 outline-none flex-1 text-right bg-transparent font-bold" />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="font-bold w-28 text-left">खरिद आदेश नं :</label>
                                <input value={poDetails.orderNo} readOnly className="border-b border-dotted border-slate-400 outline-none flex-1 text-right bg-transparent font-bold text-red-600" />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="font-bold w-28 text-left">आदेश मिति :</label>
                                <NepaliDatePicker 
                                    value={poDetails.orderDate}
                                    onChange={handleOrderDateChange}
                                    format="YYYY/MM/DD"
                                    label=""
                                    hideIcon={true}
                                    inputClassName="border-b border-dotted border-slate-400 outline-none flex-1 w-32 text-right bg-transparent font-bold placeholder:text-slate-400 placeholder:font-normal rounded-none px-0 py-0 h-auto focus:ring-0"
                                    wrapperClassName="w-32 flex-1"
                                    disabled={isViewOnlyMode || (isStoreKeeper && selectedOrder?.status !== 'Pending')} 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <table className="w-full border-collapse border border-slate-900 text-center text-xs">
                            <thead>
                                <tr className="bg-slate-50">
                                    <th className="border border-slate-900 p-2 w-10" rowSpan={2}>क्र.सं.</th>
                                    <th className="border border-slate-900 p-2" colSpan={3}>जिन्सी मालसामानको</th>
                                    <th className="border border-slate-900 p-2" rowSpan={2}>मोडल</th>
                                    <th className="border border-slate-900 p-2" rowSpan={2}>एकाई</th>
                                    <th className="border border-slate-900 p-2" rowSpan={2}>परिमाण</th>
                                    <th className="border border-slate-900 p-2" colSpan={2}>मूल्य (रु.)</th>
                                    <th className="border border-slate-900 p-2" rowSpan={2}>कैफियत</th>
                                </tr>
                                <tr className="bg-slate-50">
                                    <th className="border border-slate-900 p-1">सङ्केत नं</th>
                                    <th className="border border-slate-900 p-1">नाम</th>
                                    <th className="border border-slate-900 p-1">स्पेसिफिकेसन</th>
                                    <th className="border border-slate-900 p-1">दर</th>
                                    <th className="border border-slate-900 p-1">जम्मा</th>
                                </tr>
                            </thead>
                            <tbody>
                                {poItems.map((item, index) => (
                                    <tr key={item.id}>
                                        <td className="border border-slate-900 p-1">{index + 1}</td>
                                        <td className="border border-slate-900 p-1">
                                            <input value={item.codeNo} onChange={e => handleItemChange(index, 'codeNo', e.target.value)} className="w-full text-center outline-none bg-transparent" disabled={!canEditVendor} />
                                        </td>
                                        <td className="border border-slate-900 p-1 text-left px-2">
                                            {!isViewOnlyMode && canEditVendor ? (
                                                <SearchableSelect
                                                    options={itemOptions}
                                                    value={item.name}
                                                    onChange={newName => handleItemChange(index, 'name', newName)}
                                                    onSelect={(option) => handlePoItemSelect(index, option)} 
                                                    placeholder="सामान छान्नुहोस्"
                                                    className="!border-none !bg-transparent !p-0"
                                                    label=""
                                                />
                                            ) : <span className="font-bold">{item.name}</span>}
                                        </td>
                                        <td className="border border-slate-900 p-1">
                                            <input value={item.specification} onChange={e => handleItemChange(index, 'specification', e.target.value)} className="w-full text-center outline-none bg-transparent" disabled={!canEditVendor} />
                                        </td>
                                        <td className="border border-slate-900 p-1">
                                            <input value={item.model} onChange={e => handleItemChange(index, 'model', e.target.value)} className="w-full text-center outline-none bg-transparent" disabled={!canEditVendor} />
                                        </td>
                                        <td className="border border-slate-900 p-1">
                                            <input value={item.unit} onChange={e => handleItemChange(index, 'unit', e.target.value)} className="w-full text-center outline-none bg-transparent" disabled={!canEditVendor} />
                                        </td>
                                        <td className="border border-slate-900 p-1 font-bold">
                                            <input type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="w-full text-center outline-none bg-transparent" disabled={!canEditVendor} />
                                        </td>
                                        <td className="border border-slate-900 p-1">
                                            <input value={item.rate} onChange={e => handleItemChange(index, 'rate', e.target.value)} className="w-full text-right outline-none bg-transparent font-bold" placeholder="0.00" disabled={!canEditVendor} />
                                        </td>
                                        <td className="border border-slate-900 p-1 text-right font-bold px-2">{item.total || '-'}</td>
                                        <td className="border border-slate-900 p-1">
                                            <input value={item.remarks} onChange={e => handleItemChange(index, 'remarks', e.target.value)} className="w-full text-center outline-none bg-transparent" disabled={!canEditVendor} />
                                        </td>
                                    </tr>
                                ))}
                                <tr className="font-bold bg-slate-50">
                                    <td className="border border-slate-900 p-1 text-right pr-4" colSpan={8}>कुल जम्मा (Total)</td>
                                    <td className="border border-slate-900 p-1 text-right px-2">{grandTotal.toFixed(2)}</td>
                                    <td className="border border-slate-900 p-1"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="grid grid-cols-2 gap-16 mt-16 text-center text-xs font-bold">
                        <div className="space-y-12">
                            <div className="border-t border-slate-900 pt-2">
                                <p>तयार गर्ने (Storekeeper)</p>
                                <p className="mt-4">{poDetails.preparedBy.name || '...................'}</p>
                            </div>
                            <div className="border-t border-slate-900 pt-2">
                                <p>लेखा शाखा (Account)</p>
                                <p className="mt-4">{poDetails.financeBy.name || '...................'}</p>
                            </div>
                        </div>
                        <div className="space-y-12">
                            <div className="border-t border-slate-900 pt-2">
                                <p>सिफारिस गर्ने</p>
                                <p className="mt-4">{poDetails.recommendedBy.name || '...................'}</p>
                            </div>
                            <div className="border-t border-slate-900 pt-2">
                                <p>स्वीकृत गर्ने (Approver)</p>
                                <p className="mt-4">{poDetails.approvedBy.name || '...................'}</p>
                            </div>
                        </div>
                    </div>
                </div>
                {showPrintOptionsModal && <PrintOptionsModal onClose={() => setShowPrintOptionsModal(false)} onPrint={printDocument} />}
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 no-print">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                        <ShoppingCart size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 font-nepali">खरिद आदेश (Purchase Order)</h2>
                        <p className="text-sm text-slate-500 font-nepali">खरिद आदेश तयार, सिफारिस र स्वीकृत गर्नुहोस्</p>
                    </div>
                </div>
            </div>

            {actionableOrders.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                    <div className="px-6 py-4 border-b border-slate-100 bg-orange-50 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Clock size={18} className="text-orange-600"/>
                            <h3 className="font-semibold text-orange-800 font-nepali">
                                {isStoreKeeper ? 'तयारीको लागि बाँकी' : isAccount ? 'लेखा प्रमाणिकरणको लागि' : 'स्वीकृतिको लागि बाँकी'}
                            </h3>
                        </div>
                        <span className="bg-orange-200 text-orange-800 text-xs font-bold px-2 py-1 rounded-full font-nepali">{actionableOrders.length} वटा</span>
                    </div>
                    <table className="w-full text-sm text-left font-nepali">
                        <thead className="bg-slate-50 text-slate-600 font-medium">
                            <tr>
                                <th className="px-6 py-3">माग फारम नं</th>
                                <th className="px-6 py-3">मिति</th>
                                <th className="px-6 py-3">सामानहरू</th>
                                <th className="px-6 py-3">अवस्था</th>
                                <th className="px-6 py-3 text-right">कार्य</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {actionableOrders.map(order => (
                                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-mono font-bold text-indigo-600">#{order.magFormNo}</td>
                                    <td className="px-6 py-4">{order.requestDate}</td>
                                    <td className="px-6 py-4 text-slate-600">{order.items.length} वटा</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleLoadOrder(order, false)} className="text-primary-600 hover:text-primary-800 font-bold text-xs bg-primary-50 px-3 py-1.5 rounded-md transition-all">
                                            प्रक्रिया सुरु गर्नुहोस्
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
                    <h3 className="font-semibold text-slate-700 font-nepali flex items-center gap-2">
                        <FileText size={18} className="text-slate-500"/> खरिद आदेश इतिहास (Order History)
                    </h3>
                </div>
                {trackedOrders.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 italic font-nepali">कुनै आदेश फेला परेन</div>
                ) : (
                    <table className="w-full text-sm text-left font-nepali">
                        <thead className="bg-slate-50 text-slate-600 font-medium">
                            <tr>
                                <th className="px-6 py-3">PO No</th>
                                <th className="px-6 py-3">माग नं</th>
                                <th className="px-6 py-3">मिति</th>
                                <th className="px-6 py-3">स्थिति</th>
                                <th className="px-6 py-3 text-right">Preview</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {trackedOrders.map(order => (
                                <tr key={order.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-mono font-bold text-slate-700">{order.orderNo ? `#${order.orderNo}` : '-'}</td>
                                    <td className="px-6 py-4 font-mono text-slate-500">#{order.magFormNo}</td>
                                    <td className="px-6 py-4">{order.requestDate}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                            order.status === 'Completed' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                                            'bg-blue-50 text-blue-700 border-blue-200'
                                        }`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleLoadOrder(order, true)} className="p-2 text-indigo-400 hover:text-indigo-600 transition-all">
                                            <Eye size={20} />
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
