
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
                        <h3 className="font-bold text-slate-800 text-lg font-nepali">प्रिन्ट विकल्पहरू</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full"><X size={20} className="text-slate-400"/></button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-slate-600 font-nepali text-center">कृपया प्रिन्ट ओरिएन्टेशन छान्नुहोस्:</p>
                    <div className="grid grid-cols-1 gap-3">
                        <button onClick={() => onPrint('portrait')} className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary-600 text-white rounded-xl font-bold shadow-lg shadow-primary-200 hover:bg-primary-700 transition-all font-nepali active:scale-95">
                            <Minimize2 size={20} /> पोर्ट्रेट (Portrait)
                        </button>
                        <button onClick={() => onPrint('landscape')} className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-slate-800 text-white rounded-xl font-bold shadow-lg shadow-slate-200 hover:bg-slate-900 transition-all font-nepali active:scale-95">
                            <Maximize2 size={20} /> ल्यान्डस्केप (Landscape)
                        </button>
                    </div>
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
        return (firms || []).map(f => ({
            id: f.id,
            value: f.firmName,
            label: `${f.firmName} (PAN: ${f.vatPan})`
        }));
    }, [firms]);

    const itemOptions: Option[] = useMemo(() => {
        return (inventoryItems || []).map(item => ({
            id: item.id,
            value: item.itemName,
            label: `${item.itemName} (${item.unit}) - ${item.uniqueCode || item.sanketNo || ''}`,
            itemData: item 
        }));
    }, [inventoryItems]);

    const getFiscalYearLabel = (val: string) => {
        return FISCAL_YEARS.find(fy => fy.value === val)?.label || val;
    }

    const handleLoadOrder = (order: PurchaseOrderEntry, viewOnly: boolean = false) => {
        if (!order) return;
        
        setSelectedOrder(order);
        setIsSaved(false);
        setIsViewOnlyMode(viewOnly);
        setSuccessMessage(null);
        setValidationError(null);

        const fyToUse = order.fiscalYear || currentFiscalYear;
        const fyLabel = getFiscalYearLabel(fyToUse);

        const existingNumbers = (orders || [])
            .filter(o => o.status === 'Generated' && o.fiscalYear === fyToUse)
            .map(o => {
                const orderNo = String(o.orderNo);
                const match = orderNo.match(/^(?:PO-)?(\d+)$/);
                return match ? parseInt(match[1]) : 0;
            })
            .filter(num => !isNaN(num)); 
        
        const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
        const nextOrderNo = order.orderNo ? order.orderNo : (maxNum + 1).toString();

        setPoItems((order.items || []).map((item, idx) => ({
            id: item.id || Date.now() + idx,
            name: item.name || '',
            specification: item.specification || '',
            unit: item.unit || '',
            quantity: item.quantity?.toString() || '0', 
            remarks: item.remarks || '',
            codeNo: item.codeNo || '', 
            model: '', 
            rate: item.rate ? item.rate.toString() : '', 
            total: item.totalAmount ? item.totalAmount.toString() : '' 
        })));
        
        let defaultOrderDate = order.requestDate || todayBS;

        setPoDetails({
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
                : (order.preparedBy ? { name: order.preparedBy.name || '', designation: order.preparedBy.designation || '', date: order.preparedBy.date || '' } : { name: '', designation: '', date: '' }),

            recommendedBy: order.recommendedBy ? { name: order.recommendedBy.name || '', designation: order.recommendedBy.designation || '', date: order.recommendedBy.date || '' } : { name: '', designation: '', date: '' },

            financeBy: (order.status === 'Pending Account' && isAccount && !viewOnly)
                ? { name: currentUser.fullName, designation: currentUser.designation, date: todayBS }
                : (order.financeBy ? { name: order.financeBy.name || '', designation: order.financeBy.designation || '', date: order.financeBy.date || '' } : { name: '', designation: '', date: '' }),

            approvedBy: (order.status === 'Account Verified' && isAdmin && !viewOnly)
                ? { name: currentUser.fullName, designation: currentUser.designation, date: todayBS }
                : (order.approvedBy ? { name: order.approvedBy.name || '', designation: order.approvedBy.designation || '', date: order.approvedBy.date || '' } : { name: '', designation: '', date: '' })
        });
    };

    const handleBack = () => {
        setSelectedOrder(null);
        setIsViewOnlyMode(false);
        setSuccessMessage(null);
        setValidationError(null);
        setPoItems([]); 
    };

    const handleSavePO = () => {
        if (!selectedOrder || isViewOnlyMode) return;
        setValidationError(null);

        if (!poDetails.orderDate.trim()) {
            setValidationError('खरिद आदेश मिति अनिवार्य छ।');
            return;
        }
        
        let nextStatus = selectedOrder.status;
        let successMessageText = "विवरण सुरक्षित गरियो।";

        if (isStoreKeeper && selectedOrder.status === 'Pending') {
            nextStatus = 'Pending Account';
            successMessageText = "आदेश लेखा शाखामा पठाइयो।";
        } else if (isAccount && selectedOrder.status === 'Pending Account') {
            nextStatus = 'Account Verified';
            successMessageText = "आदेश प्रमाणित गरी स्वीकृतिको लागि पठाइयो।";
        } else if (isAdmin && selectedOrder.status === 'Account Verified') {
            nextStatus = 'Generated';
            successMessageText = "खरिद आदेश स्वीकृत र जारी गरियो।";
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
        
        setTimeout(() => {
            setSelectedOrder(null);
            setSuccessMessage(null);
        }, 1500);
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

    const grandTotal = poItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);

    const actionableOrders = (orders || []).filter(order => {
        if (isStoreKeeper) return order.status === 'Pending';
        if (isAccount) return order.status === 'Pending Account';
        if (isAdmin) return order.status === 'Account Verified';
        return false;
    }).sort((a, b) => b.id.localeCompare(a.id));

    const trackedOrders = (orders || []).filter(order => {
        if (isStoreKeeper) return order.status !== 'Pending';
        if (isAccount) return ['Account Verified', 'Generated', 'Stock Entry Requested', 'Completed'].includes(order.status);
        if (isAdmin) return ['Generated', 'Stock Entry Requested', 'Completed'].includes(order.status);
        return false;
    }).sort((a, b) => b.id.localeCompare(a.id));

    const canEditVendor = isStoreKeeper && !isViewOnlyMode && selectedOrder?.status === 'Pending';
    
    const printDocument = useCallback((orientation: 'portrait' | 'landscape') => {
        const style = document.createElement('style');
        style.id = 'print-orientation-style';
        style.innerHTML = `
            @media print {
                /* standard browser controls hidden */
                .no-print, header, aside, .header-actions { display: none !important; }
                
                body { background: white !important; margin: 0 !important; padding: 0 !important; }
                #root { padding: 0 !important; margin: 0 !important; height: auto !important; overflow: visible !important; }
                
                /* Target only the PO area */
                #po-print-area { 
                    display: block !important;
                    visibility: visible !important;
                    position: static !important;
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 20px !important;
                    box-shadow: none !important;
                    border: none !important;
                    min-height: auto !important;
                }

                /* Ensure table borders are visible */
                table { border-collapse: collapse !important; width: 100% !important; border: 1px solid black !important; }
                th, td { border: 1px solid black !important; padding: 4px !important; color: black !important; }

                /* Text replacements for inputs */
                input, select, textarea { 
                    border: none !important; 
                    background: transparent !important; 
                    padding: 0 !important; 
                    font-weight: bold !important;
                    color: black !important;
                    appearance: none !important;
                    -webkit-appearance: none;
                    box-shadow: none !important;
                    width: 100% !important;
                }
                
                .nepali-date-picker-input-for-print input { border-bottom: 1px dotted black !important; text-align: center !important; }
                
                @page { size: A4 ${orientation}; margin: 1cm; }
            }
        `;
        document.head.appendChild(style);

        window.print();

        setTimeout(() => {
            const el = document.getElementById('print-orientation-style');
            if (el) document.head.removeChild(el);
            setShowPrintOptionsModal(false); 
        }, 1000); 
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
                            <h2 className="font-bold text-slate-700 font-nepali text-lg">खरिद आदेश प्रिभ्यु</h2>
                            <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-0.5 rounded border bg-slate-100 text-slate-600 border-slate-200 font-bold uppercase tracking-wider">
                                    {selectedOrder.status}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 header-actions">
                         <button onClick={() => setShowPrintOptionsModal(true)} className="flex items-center gap-2 px-6 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-xl font-bold shadow-lg transition-all active:scale-95">
                            <Printer size={18} /> प्रिन्ट गर्नुहोस्
                        </button>
                        {!isViewOnlyMode && (
                            <button onClick={handleSavePO} disabled={isSaved} className={`flex items-center gap-2 px-6 py-2 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 ${isSaved ? 'bg-green-600' : 'bg-primary-600 hover:bg-primary-700'}`}>
                                {isSaved ? <CheckCircle2 size={18} /> : <Save size={18} />}
                                {isSaved ? 'सुरक्षित भयो' : (isAdmin ? 'स्वीकृत गर्नुहोस्' : 'प्रक्रिया अगाडि बढाउनुहोस्')}
                            </button>
                        )}
                    </div>
                </div>

                {successMessage && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl shadow-sm flex items-center gap-3 animate-in slide-in-from-top-2 no-print mx-auto max-w-[210mm]">
                        <CheckCircle2 size={24} className="text-green-500" />
                        <p className="text-green-800 font-bold font-nepali">{successMessage}</p>
                    </div>
                )}

                <div id="po-print-area" className="bg-white p-10 md:p-14 rounded-xl shadow-2xl max-w-[210mm] mx-auto min-h-[297mm] text-slate-900 font-nepali text-sm print:shadow-none print:p-0 print:border-none">
                    <div className="mb-10">
                        <div className="flex items-start justify-between">
                            <div className="w-24 pt-2">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png" alt="Nepal Emblem" className="h-20 w-20 object-contain" />
                            </div>
                            <div className="flex-1 text-center space-y-1">
                                <h1 className="text-xl font-black text-red-600 print:text-black">{generalSettings.orgNameNepali}</h1>
                                {generalSettings.subTitleNepali && <h2 className="text-lg font-bold">{generalSettings.subTitleNepali}</h2>}
                                <div className="text-xs mt-3 space-x-3 font-bold text-slate-600 print:text-black">
                                    {generalSettings.address && <span>{generalSettings.address}</span>}
                                    {generalSettings.phone && <span>| फोन: {generalSettings.phone}</span>}
                                    {generalSettings.panNo && <span>| पान नं: {generalSettings.panNo}</span>}
                                </div>
                            </div>
                            <div className="w-24"></div> 
                        </div>
                        <div className="text-center pt-8 pb-4">
                            <h1 className="text-2xl font-black underline underline-offset-8">खरिद आदेश</h1>
                            <p className="text-[10px] font-bold mt-2 text-slate-400 print:text-black">म.ले.प. फारम नं ४०२</p>
                        </div>
                    </div>

                    <div className="flex justify-between items-start mb-8 gap-8">
                        <div className="flex-1 space-y-3">
                             <div className="flex flex-col gap-1">
                                <label className="font-bold text-slate-500 print:text-black">श्री (फर्म/निकायको नाम):</label>
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
                                        placeholder="फर्म छान्नुहोस्..."
                                        className="!border-b !border-dotted !border-slate-400 !rounded-none !bg-transparent !px-0 !py-1 !text-lg !font-black"
                                    />
                                ) : (
                                    <input value={poDetails.vendorName} readOnly className="border-b border-dotted border-slate-400 outline-none w-full bg-transparent font-black text-lg" />
                                )}
                             </div>
                             <div className="flex items-center gap-2">
                                <label className="font-bold w-16 text-slate-500 print:text-black">ठेगाना :</label>
                                <input value={poDetails.vendorAddress} onChange={e => setPoDetails({...poDetails, vendorAddress: e.target.value})} className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent font-bold" disabled={!canEditVendor} />
                             </div>
                             <div className="flex items-center gap-2">
                                <label className="font-bold text-slate-500 print:text-black">PAN/VAT नं:</label>
                                <input value={poDetails.vendorPan} onChange={e => setPoDetails({...poDetails, vendorPan: e.target.value})} className="border-b border-dotted border-slate-400 outline-none w-32 bg-transparent font-bold" disabled={!canEditVendor} />
                             </div>
                        </div>

                        <div className="w-64 space-y-3">
                            <div className="flex items-center gap-2">
                                <label className="font-bold w-28 text-slate-500 print:text-black">आर्थिक वर्ष :</label>
                                <input value={poDetails.fiscalYear} readOnly className="border-b border-dotted border-slate-400 outline-none flex-1 text-right bg-transparent font-bold" />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="font-bold w-28 text-slate-500 print:text-black">खरिद आदेश नं :</label>
                                <input value={poDetails.orderNo} readOnly className="border-b border-dotted border-slate-400 outline-none flex-1 text-right bg-transparent font-black text-red-600 print:text-black" />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="font-bold w-28 text-slate-500 print:text-black">आदेश मिति :</label>
                                <NepaliDatePicker 
                                    value={poDetails.orderDate}
                                    onChange={val => setPoDetails(prev => ({...prev, orderDate: val}))}
                                    format="YYYY/MM/DD"
                                    label=""
                                    hideIcon={true}
                                    inputClassName="nepali-date-picker-input-for-print border-b border-dotted border-slate-400 outline-none flex-1 w-full text-right bg-transparent font-bold rounded-none px-0 py-0 h-auto focus:ring-0"
                                    wrapperClassName="w-full flex-1"
                                    disabled={isViewOnlyMode || (isStoreKeeper && selectedOrder?.status !== 'Pending')} 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mb-10 overflow-hidden border border-black rounded-sm">
                        <table className="w-full border-collapse text-center text-xs">
                            <thead>
                                <tr className="bg-slate-100 font-bold">
                                    <th className="border border-black p-2 w-10" rowSpan={2}>क्र.सं.</th>
                                    <th className="border border-black p-2" colSpan={3}>जिन्सी मालसामानको</th>
                                    <th className="border border-black p-2" rowSpan={2}>मोडल</th>
                                    <th className="border border-black p-2" rowSpan={2}>एकाई</th>
                                    <th className="border border-black p-2" rowSpan={2}>परिमाण</th>
                                    <th className="border border-black p-2" colSpan={2}>मूल्य (रु.)</th>
                                    <th className="border border-black p-2" rowSpan={2}>कैफियत</th>
                                </tr>
                                <tr className="bg-slate-100 font-bold">
                                    <th className="border border-black p-1">सङ्केत नं</th>
                                    <th className="border border-black p-1">नाम</th>
                                    <th className="border border-black p-1">स्पेसिफिकेसन</th>
                                    <th className="border border-black p-1">दर</th>
                                    <th className="border border-black p-1">जम्मा</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black">
                                {poItems.map((item, index) => (
                                    <tr key={item.id}>
                                        <td className="border border-black p-2">{index + 1}</td>
                                        <td className="border border-black p-1">
                                            <input value={item.codeNo} onChange={e => handleItemChange(index, 'codeNo', e.target.value)} className="w-full text-center outline-none bg-transparent" disabled={!canEditVendor} />
                                        </td>
                                        <td className="border border-black p-1 text-left px-2">
                                            {!isViewOnlyMode && canEditVendor ? (
                                                <SearchableSelect
                                                    options={itemOptions}
                                                    value={item.name}
                                                    onChange={newName => handleItemChange(index, 'name', newName)}
                                                    onSelect={(option) => handlePoItemSelect(index, option)} 
                                                    placeholder="नाम..."
                                                    className="!border-none !bg-transparent !p-0 !font-bold"
                                                    label=""
                                                />
                                            ) : <span className="font-bold">{item.name}</span>}
                                        </td>
                                        <td className="border border-black p-1">
                                            <input value={item.specification} onChange={e => handleItemChange(index, 'specification', e.target.value)} className="w-full text-center outline-none bg-transparent" disabled={!canEditVendor} />
                                        </td>
                                        <td className="border border-black p-1">
                                            <input value={item.model} onChange={e => handleItemChange(index, 'model', e.target.value)} className="w-full text-center outline-none bg-transparent" disabled={!canEditVendor} />
                                        </td>
                                        <td className="border border-black p-1">
                                            <input value={item.unit} onChange={e => handleItemChange(index, 'unit', e.target.value)} className="w-full text-center outline-none bg-transparent" disabled={!canEditVendor} />
                                        </td>
                                        <td className="border border-black p-1 font-black">
                                            <input type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="w-full text-center outline-none bg-transparent" disabled={!canEditVendor} />
                                        </td>
                                        <td className="border border-black p-1">
                                            <input value={item.rate} onChange={e => handleItemChange(index, 'rate', e.target.value)} className="w-full text-right outline-none bg-transparent font-bold pr-1" placeholder="0.00" disabled={!canEditVendor} />
                                        </td>
                                        <td className="border border-black p-1 text-right font-black px-2">{item.total || '-'}</td>
                                        <td className="border border-black p-1">
                                            <input value={item.remarks} onChange={e => handleItemChange(index, 'remarks', e.target.value)} className="w-full text-center outline-none bg-transparent text-[10px]" disabled={!canEditVendor} />
                                        </td>
                                    </tr>
                                ))}
                                <tr className="font-black bg-slate-50">
                                    <td className="border border-black p-2 text-right pr-4" colSpan={8}>कुल जम्मा (Total)</td>
                                    <td className="border border-black p-2 text-right px-2">{grandTotal.toFixed(2)}</td>
                                    <td className="border border-black p-2"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="grid grid-cols-2 gap-x-20 gap-y-24 mt-20 text-center text-xs font-bold">
                        <div className="space-y-16">
                            <div className="border-t border-black pt-2">
                                <p>तयार गर्ने (Storekeeper)</p>
                                <p className="mt-4 font-black">{poDetails.preparedBy.name || '...................'}</p>
                                <p className="text-[10px] text-slate-500 font-normal">{poDetails.preparedBy.designation}</p>
                            </div>
                            <div className="border-t border-black pt-2">
                                <p>लेखा शाखा (Account)</p>
                                <p className="mt-4 font-black">{poDetails.financeBy.name || '...................'}</p>
                                <p className="text-[10px] text-slate-500 font-normal">{poDetails.financeBy.designation}</p>
                            </div>
                        </div>
                        <div className="space-y-16">
                            <div className="border-t border-black pt-2">
                                <p>सिफारिस गर्ने</p>
                                <p className="mt-4 font-black">{poDetails.recommendedBy.name || '...................'}</p>
                                <p className="text-[10px] text-slate-500 font-normal">{poDetails.recommendedBy.designation}</p>
                            </div>
                            <div className="border-t border-black pt-2">
                                <p>स्वीकृत गर्ने (Approver)</p>
                                <p className="mt-4 font-black">{poDetails.approvedBy.name || '...................'}</p>
                                <p className="text-[10px] text-slate-500 font-normal">{poDetails.approvedBy.designation}</p>
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
                        <p className="text-sm text-slate-500">खरिद आदेश तयार र स्वीकृत गर्नुहोस्</p>
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
                        <span className="bg-orange-200 text-orange-800 text-xs font-bold px-2 py-1 rounded-full">{actionableOrders.length} वटा</span>
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
                                    <td className="px-6 py-4 text-slate-600">{order.items?.length || 0} वटा</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleLoadOrder(order, false)} className="text-primary-600 hover:text-primary-800 font-bold text-xs bg-primary-50 px-4 py-2 rounded-lg transition-all active:scale-95">
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
                        <FileText size={18} className="text-slate-500"/> खरिद आदेश इतिहास
                    </h3>
                </div>
                {trackedOrders.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 italic font-nepali">कुनै आदेश फेला परेन</div>
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
                                        <button onClick={() => handleLoadOrder(order, true)} className="p-2 text-indigo-400 hover:text-indigo-600 transition-all hover:bg-indigo-50 rounded-full">
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
