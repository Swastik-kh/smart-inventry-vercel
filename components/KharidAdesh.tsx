
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

    const todayBS = useMemo(() => {
        try { return new NepaliDate().format('YYYY-MM-DD'); } catch (e) { return ''; }
    }, []);

    const [poDetails, setPoDetails] = useState({
        fiscalYear: '', orderNo: '', orderDate: todayBS, decisionNo: '', decisionDate: '',
        vendorName: '', vendorAddress: '', vendorPan: '', vendorPhone: '',
        budgetSubHeadNo: '', expHeadNo: '', activityNo: '',
        preparedBy: { name: '', designation: '', date: '' },
        recommendedBy: { name: '', designation: '', date: '' },
        financeBy: { name: '', designation: '', date: '' },
        approvedBy: { name: '', designation: '', date: '' }
    });

    const [poItems, setPoItems] = useState<FormPOItem[]>([]);

    const isStoreKeeper = currentUser.role === 'STOREKEEPER';
    const isAccount = currentUser.role === 'ACCOUNT';
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'APPROVAL'].includes(currentUser.role);

    const vendorOptions: Option[] = useMemo(() => (firms || []).map(f => ({ id: f.id, value: f.firmName, label: `${f.firmName} (PAN: ${f.vatPan})` })), [firms]);
    const itemOptions: Option[] = useMemo(() => (inventoryItems || []).map(item => ({ id: item.id, value: item.itemName, label: `${item.itemName} (${item.unit}) - ${item.uniqueCode || item.sanketNo || ''}`, itemData: item })), [inventoryItems]);

    const handleLoadOrder = (order: PurchaseOrderEntry, viewOnly: boolean = false) => {
        if (!order) return;
        setSelectedOrder(order);
        setIsSaved(false);
        setIsViewOnlyMode(viewOnly);
        setSuccessMessage(null);
        setValidationError(null);

        const fyLabel = FISCAL_YEARS.find(fy => fy.value === (order.fiscalYear || currentFiscalYear))?.label || order.fiscalYear;

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
            fiscalYear: fyLabel, orderNo: order.orderNo || '', orderDate: defaultOrderDate, 
            decisionNo: order.decisionNo || '', decisionDate: order.decisionDate || '',
            vendorName: order.vendorDetails?.name || '', vendorAddress: order.vendorDetails?.address || '',
            vendorPan: order.vendorDetails?.pan || '', vendorPhone: order.vendorDetails?.phone || '',
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

    const handleBack = () => { setSelectedOrder(null); setIsViewOnlyMode(false); setSuccessMessage(null); setValidationError(null); setPoItems([]); };

    const handleSavePO = () => {
        if (!selectedOrder || isViewOnlyMode) return;
        setValidationError(null);
        if (!poDetails.orderDate.trim()) { setValidationError('खरिद आदेश मिति अनिवार्य छ।'); return; }
        
        let nextStatus = selectedOrder.status;
        if (isStoreKeeper && selectedOrder.status === 'Pending') nextStatus = 'Pending Account';
        else if (isAccount && selectedOrder.status === 'Pending Account') nextStatus = 'Account Verified';
        else if (isAdmin && selectedOrder.status === 'Account Verified') nextStatus = 'Generated';

        onSave({
            ...selectedOrder,
            status: nextStatus,
            orderNo: poDetails.orderNo,
            requestDate: poDetails.orderDate,
            items: poItems.map(i => ({ id: i.id, name: i.name, specification: i.specification, unit: i.unit, quantity: i.quantity, remarks: i.remarks, codeNo: i.codeNo, rate: parseFloat(i.rate) || 0, totalAmount: parseFloat(i.total) || 0 })),
            vendorDetails: { name: poDetails.vendorName, address: poDetails.vendorAddress, pan: poDetails.vendorPan, phone: poDetails.vendorPhone },
            preparedBy: poDetails.preparedBy,
            financeBy: poDetails.financeBy,
            approvedBy: poDetails.approvedBy
        });
        setIsSaved(true);
        setSuccessMessage("सुरक्षित गरियो।");
        setTimeout(() => { setSelectedOrder(null); setSuccessMessage(null); }, 1500);
    };

    const handleItemChange = useCallback((index: number, field: keyof FormPOItem, value: string) => {
        setPoItems(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            if (field === 'rate' || field === 'quantity') {
                next[index].total = ((parseFloat(next[index].quantity) || 0) * (parseFloat(next[index].rate) || 0)).toFixed(2);
            }
            return next;
        });
    }, []);

    const grandTotal = poItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);

    const printDocument = useCallback((orientation: 'portrait' | 'landscape') => {
        const style = document.createElement('style');
        style.id = 'print-fix-styles';
        style.innerHTML = `
            @media print {
                /* Force hide EVERYTHING */
                body * { display: none !important; }
                
                /* Show ONLY the print area and its contents */
                #po-print-area, #po-print-area * { display: block !important; }
                
                /* Reset body/html for clean print */
                html, body { height: auto !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; background: white !important; }
                
                /* Position the print area to top-left */
                #po-print-area { 
                    display: block !important;
                    position: absolute !important; 
                    left: 0 !important; 
                    top: 0 !important; 
                    width: 100% !important; 
                    margin: 0 !important; 
                    padding: 40px !important; 
                    border: none !important;
                    box-shadow: none !important;
                }

                /* Standardize table for print */
                table { border-collapse: collapse !important; width: 100% !important; border: 1px solid black !important; }
                th, td { border: 1px solid black !important; padding: 5px !important; text-align: center !important; font-size: 12px !important; }
                
                /* Convert all inputs/textareas to plain text appearance */
                input, select, textarea {
                    border: none !important;
                    background: transparent !important;
                    font-weight: bold !important;
                    color: black !important;
                    padding: 0 !important;
                    width: auto !important;
                    text-align: inherit !important;
                    box-shadow: none !important;
                    -webkit-appearance: none;
                    appearance: none;
                }

                .border-b.border-dotted { border-bottom: 1px dotted black !important; }
                
                @page { size: A4 ${orientation}; margin: 1cm; }
            }
        `;
        document.head.appendChild(style);

        // Actual print command
        window.print();

        // Cleanup styles after small delay
        setTimeout(() => {
            const el = document.getElementById('print-fix-styles');
            if (el) document.head.removeChild(el);
            setShowPrintOptionsModal(false);
        }, 1000);
    }, []);

    if (selectedOrder) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
                    <div className="flex items-center gap-4">
                        <button onClick={handleBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ArrowLeft size={20} /></button>
                        <div>
                            <h2 className="font-bold text-slate-700 font-nepali text-lg">खरिद आदेश प्रिभ्यु</h2>
                            <span className="text-[10px] px-2 py-0.5 rounded border bg-slate-100 text-slate-600 font-bold uppercase">{selectedOrder.status}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                         <button onClick={() => setShowPrintOptionsModal(true)} className="flex items-center gap-2 px-6 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-xl font-bold shadow-lg transition-all active:scale-95"><Printer size={18} /> प्रिन्ट गर्नुहोस्</button>
                        {!isViewOnlyMode && (
                            <button onClick={handleSavePO} disabled={isSaved} className={`flex items-center gap-2 px-6 py-2 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 ${isSaved ? 'bg-green-600' : 'bg-primary-600 hover:bg-primary-700'}`}>
                                {isSaved ? <CheckCircle2 size={18} /> : <Save size={18} />}{isSaved ? 'सुरक्षित भयो' : (isAdmin ? 'स्वीकृत गर्नुहोस्' : 'प्रक्रिया अगाडि बढाउनुहोस्')}
                            </button>
                        )}
                    </div>
                </div>

                <div id="po-print-area" className="bg-white p-10 md:p-14 rounded-xl shadow-2xl max-w-[210mm] mx-auto min-h-[297mm] text-slate-900 font-nepali text-sm print:shadow-none print:p-0 print:border-none">
                    <div className="mb-10">
                        <div className="flex items-start justify-between">
                            <div className="w-24 pt-2"><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png" alt="Emblem" className="h-20 w-20" /></div>
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
                                <input value={poDetails.vendorName} readOnly className="border-b border-dotted border-slate-400 outline-none w-full bg-transparent font-black text-lg" />
                             </div>
                             <div className="flex items-center gap-2">
                                <label className="font-bold w-16 text-slate-500 print:text-black">ठेगाना :</label>
                                <input value={poDetails.vendorAddress} readOnly className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent font-bold" />
                             </div>
                             <div className="flex items-center gap-2">
                                <label className="font-bold text-slate-500 print:text-black">PAN/VAT नं:</label>
                                <input value={poDetails.vendorPan} readOnly className="border-b border-dotted border-slate-400 outline-none w-32 bg-transparent font-bold" />
                             </div>
                        </div>

                        <div className="w-64 space-y-3">
                            <div className="flex items-center gap-2"><label className="font-bold w-28 text-slate-500 print:text-black">आर्थिक वर्ष :</label><input value={poDetails.fiscalYear} readOnly className="border-b border-dotted border-slate-400 outline-none flex-1 text-right bg-transparent font-bold" /></div>
                            <div className="flex items-center gap-2"><label className="font-bold w-28 text-slate-500 print:text-black">खरिद आदेश नं :</label><input value={poDetails.orderNo} readOnly className="border-b border-dotted border-slate-400 outline-none flex-1 text-right bg-transparent font-black text-red-600 print:text-black" /></div>
                            <div className="flex items-center gap-2"><label className="font-bold w-28 text-slate-500 print:text-black">आदेश मिति :</label><input value={poDetails.orderDate} readOnly className="border-b border-dotted border-slate-400 outline-none flex-1 text-right bg-transparent font-bold" /></div>
                        </div>
                    </div>

                    <div className="mb-10 overflow-hidden border border-black rounded-sm">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-100 font-bold">
                                    <th rowSpan={2}>क्र.सं.</th><th colSpan={3}>जिन्सी मालसामानको</th><th rowSpan={2}>मोडल</th><th rowSpan={2}>एकाई</th><th rowSpan={2}>परिमाण</th><th colSpan={2}>मूल्य (रु.)</th><th rowSpan={2}>कैफियत</th>
                                </tr>
                                <tr className="bg-slate-100 font-bold">
                                    <th>सङ्केत नं</th><th>नाम</th><th>स्पेसिफिकेसन</th><th>दर</th><th>जम्मा</th>
                                </tr>
                            </thead>
                            <tbody>
                                {poItems.map((item, index) => (
                                    <tr key={item.id}>
                                        <td>{index + 1}</td><td>{item.codeNo}</td><td className="text-left font-bold">{item.name}</td><td>{item.specification}</td><td>{item.model}</td><td>{item.unit}</td><td className="font-black">{item.quantity}</td><td className="text-right font-bold">{item.rate}</td><td className="text-right font-black">{item.total}</td><td>{item.remarks}</td>
                                    </tr>
                                ))}
                                <tr className="font-black bg-slate-50">
                                    <td className="text-right" colSpan={8}>कुल जम्मा (Total)</td><td className="text-right">{grandTotal.toFixed(2)}</td><td></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="grid grid-cols-2 gap-x-20 gap-y-24 mt-20 text-center text-xs font-bold">
                        <div className="space-y-16">
                            <div className="border-t border-black pt-2"><p>तयार गर्ने (Storekeeper)</p><p className="mt-4 font-black">{poDetails.preparedBy.name || '...................'}</p></div>
                            <div className="border-t border-black pt-2"><p>लेखा शाखा (Account)</p><p className="mt-4 font-black">{poDetails.financeBy.name || '...................'}</p></div>
                        </div>
                        <div className="space-y-16">
                            <div className="border-t border-black pt-2"><p>सिफारिस गर्ने</p><p className="mt-4 font-black">{poDetails.recommendedBy.name || '...................'}</p></div>
                            <div className="border-t border-black pt-2"><p>स्वीकृत गर्ने (Approver)</p><p className="mt-4 font-black">{poDetails.approvedBy.name || '...................'}</p></div>
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
                    <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><ShoppingCart size={24} /></div>
                    <div><h2 className="text-xl font-bold text-slate-800 font-nepali">खरिद आदेश (Purchase Order)</h2><p className="text-sm text-slate-500">खरिद आदेश तयार र स्वीकृत गर्नुहोस्</p></div>
                </div>
            </div>

            {/* List components (actionableOrders and trackedOrders) remain as provided... */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-slate-100 bg-orange-50 flex justify-between items-center text-orange-800">
                    <div className="flex items-center gap-2"><Clock size={18}/><h3 className="font-semibold font-nepali">{isStoreKeeper ? 'तयारीको लागि बाँकी' : isAccount ? 'लेखा प्रमाणिकरणको लागि' : 'स्वीकृतिको लागि बाँकी'}</h3></div>
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600"><tr><th className="px-6 py-3">माग फारम नं</th><th className="px-6 py-3">मिति</th><th className="px-6 py-3 text-right">कार्य</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {orders.filter(o => o.status !== 'Generated').map(o => (<tr key={o.id} className="hover:bg-slate-50"><td className="px-6 py-4 font-mono font-bold text-indigo-600">#{o.magFormNo}</td><td className="px-6 py-4">{o.requestDate}</td><td className="px-6 py-4 text-right"><button onClick={() => handleLoadOrder(o, false)} className="text-primary-600 font-bold text-xs bg-primary-50 px-4 py-2 rounded-lg hover:bg-primary-100">प्रक्रिया सुरु गर्नुहोस्</button></td></tr>))}
                    </tbody>
                </table>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b bg-slate-50 text-slate-700 font-bold font-nepali">खरिद आदेश इतिहास</div>
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600"><tr><th className="px-6 py-3">PO No</th><th className="px-6 py-3">मिति</th><th className="px-6 py-3 text-right">Preview</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {orders.filter(o => o.status === 'Generated').map(o => (<tr key={o.id} className="hover:bg-slate-50"><td className="px-6 py-4 font-mono font-bold">{o.orderNo ? `#${o.orderNo}` : '-'}</td><td className="px-6 py-4">{o.requestDate}</td><td className="px-6 py-4 text-right"><button onClick={() => handleLoadOrder(o, true)} className="text-indigo-400 hover:text-indigo-600"><Eye size={20} /></button></td></tr>))}
                    </tbody>
                </table>
            </div>

            {showPrintOptionsModal && <PrintOptionsModal onClose={() => setShowPrintOptionsModal(false)} onPrint={printDocument} />}
        </div>
    );
};
