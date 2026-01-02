
import React, { useState, useMemo } from 'react';
import { ShoppingCart, FilePlus, ChevronRight, ArrowLeft, Printer, Save, Calculator, CheckCircle2, Send, ShieldCheck, CheckCheck, Eye, FileText, Clock, Archive, AlertCircle, X } from 'lucide-react';
import { PurchaseOrderEntry, MagItem, User, FirmEntry, Option, QuotationEntry, OrganizationSettings } from '../types';
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
}

interface POItem extends Omit<MagItem, 'rate'> {
    codeNo: string;
    model: string;
    rate: string;
    total: string;
}

export const KharidAdesh: React.FC<KharidAdeshProps> = ({ orders, currentFiscalYear, onSave, currentUser, firms, quotations, onDakhilaClick, generalSettings }) => {
    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderEntry | null>(null);
    const [isSaved, setIsSaved] = useState(false);
    const [isViewOnlyMode, setIsViewOnlyMode] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);

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
        orderDate: '',
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

    const [poItems, setPoItems] = useState<POItem[]>([]);

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

    const getFiscalYearLabel = (val: string) => {
        return FISCAL_YEARS.find(f => f.value === val)?.label || val;
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
            .map(o => parseInt(String(o.orderNo) || '0')); // Explicitly cast to string
        
        const maxNo = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
        const nextOrderNo = order.orderNo ? order.orderNo : (maxNo + 1).toString();

        setPoItems(order.items.map(item => ({
            ...item,
            codeNo: '',
            model: '',
            rate: item.rate ? item.rate.toString() : '',
            total: item.totalAmount ? item.totalAmount.toString() : ''
        })));
        
        const defaultDate = order.requestDate || '';

        setPoDetails(prev => ({
            ...prev,
            fiscalYear: fyLabel,
            orderNo: nextOrderNo, 
            orderDate: defaultDate, 
            decisionNo: '',
            decisionDate: '',
            vendorName: order.vendorDetails?.name || '',
            vendorAddress: order.vendorDetails?.address || '',
            vendorPan: order.vendorDetails?.pan || '',
            vendorPhone: order.vendorDetails?.phone || '',
            budgetSubHeadNo: order.budgetDetails?.budgetSubHeadNo || '',
            expHeadNo: order.budgetDetails?.expHeadNo || '',
            activityNo: order.budgetDetails?.activityNo || '',
            
            preparedBy: order.preparedBy ? {
                name: order.preparedBy.name,
                designation: order.preparedBy.designation || '',
                date: order.preparedBy.date || ''
            } : (
                (order.status === 'Pending' && isStoreKeeper) 
                ? { name: currentUser.fullName, designation: currentUser.designation, date: defaultDate }
                : { name: '', designation: '', date: '' }
            ),

            recommendedBy: order.recommendedBy ? {
                name: order.recommendedBy.name,
                designation: order.recommendedBy.designation || '',
                date: order.recommendedBy.date || ''
            } : { name: '', designation: '', date: '' },

            financeBy: order.financeBy ? {
                name: order.financeBy.name,
                designation: order.financeBy.designation || '',
                date: order.financeBy.date || ''
            } : (
                (order.status === 'Pending Account' && isAccount)
                ? { name: currentUser.fullName, designation: currentUser.designation, date: defaultDate }
                : { name: '', designation: '', date: '' }
            ),

            approvedBy: order.approvedBy ? {
                name: order.approvedBy.name,
                designation: order.approvedBy.designation || '',
                date: order.approvedBy.date || ''
            } : (
                (order.status === 'Account Verified' && isAdmin)
                ? { name: currentUser.fullName, designation: currentUser.designation, date: defaultDate }
                : { name: '', designation: '', date: '' }
            )
        }));
    };

    const handleBack = () => {
        setSelectedOrder(null);
        setIsViewOnlyMode(false);
        setSuccessMessage(null);
        setValidationError(null);
    };

    const handleSavePO = () => {
        if (!selectedOrder || isViewOnlyMode) return;
        setValidationError(null);

        const date = poDetails.orderDate.trim();
        if (!date) {
            setValidationError('खरिद आदेश मिति अनिवार्य छ (Order Date is required)।');
            return;
        }

        const dateRegex = /^\d{4}\/\d{2}\/\d{2}$/;
        if (!dateRegex.test(date)) {
            setValidationError('मिति ढाँचा मिलेन (Invalid Date Format)।\nकृपया YYYY/MM/DD ढाँचा प्रयोग गर्नुहोस् (उदाहरण: 2081/04/01)');
            return;
        }

        const [fyStart] = currentFiscalYear.split('/');
        if (fyStart) {
            const startYearNum = parseInt(fyStart);
            const endYearNum = startYearNum + 1;
            const formattedDate = date.replace(/[-.]/g, '/');
            const minDate = `${startYearNum}/04/01`;
            const maxDate = `${endYearNum}/03/32`;

            if (formattedDate < minDate || formattedDate > maxDate) {
                setValidationError(`मिति आर्थिक वर्ष ${currentFiscalYear} भित्रको हुनुपर्छ।\n(${minDate} देखि ${maxDate} सम्म मात्र मान्य छ)`);
                return;
            }
        }

        const currentOrderNoInt = parseInt(poDetails.orderNo);
        if (!isNaN(currentOrderNoInt) && currentOrderNoInt > 1) {
            const prevOrderNo = currentOrderNoInt - 1;
            const previousOrder = orders.find(o => 
                o.fiscalYear === currentFiscalYear && 
                o.orderNo === prevOrderNo.toString()
            );

            if (previousOrder) {
                if (date < previousOrder.requestDate) {
                    setValidationError(`मिति क्रम मिलेन (Invalid Date Order): \nखरिद आदेश नं ${prevOrderNo} को मिति (${previousOrder.requestDate}) भन्दा \nखरिद आदेश नं ${poDetails.orderNo} को मिति (${date}) अगाडि हुन सक्दैन।`);
                    return;
                }
            }
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

        const updatedOrder: PurchaseOrderEntry = {
            ...selectedOrder,
            status: nextStatus,
            orderNo: poDetails.orderNo,
            requestDate: poDetails.orderDate,
            fiscalYear: currentFiscalYear, 
            items: poItems.map(i => ({
                id: i.id,
                name: i.name,
                specification: i.specification,
                unit: i.unit,
                quantity: i.quantity,
                remarks: i.remarks,
                rate: parseFloat(i.rate) || 0,
                codeNo: i.codeNo,
                totalAmount: parseFloat(i.total) || 0
            })),
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

    const handleItemChange = (index: number, field: keyof POItem, value: string) => {
        const newItems = [...poItems];
        newItems[index] = { ...newItems[index], [field]: value };

        if (field === 'rate' || field === 'quantity') {
            const qty = parseFloat(newItems[index].quantity) || 0;
            const rate = parseFloat(newItems[index].rate) || 0;
            newItems[index].total = (qty * rate).toFixed(2);
        }

        setPoItems(newItems);
    };

    const handleOrderDateChange = (val: string) => {
        setPoDetails(prev => ({
            ...prev, 
            orderDate: val,
            preparedBy: { ...prev.preparedBy, date: val }
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
        if (isStoreKeeper) return order.status !== 'Pending';
        if (isAccount) return order.status === 'Account Verified' || order.status === 'Generated' || order.status === 'Stock Entry Requested' || order.status === 'Completed';
        if (isAdmin) return order.status === 'Generated' || order.status === 'Stock Entry Requested' || order.status === 'Completed';
        return false;
    }).sort((a, b) => parseInt(String(b.magFormNo)) - parseInt(String(a.magFormNo))); // Explicitly cast to string

    const canEditVendor = isStoreKeeper && !isViewOnlyMode && selectedOrder?.status === 'Pending';
    
    let actionLabel = 'Save';
    let ActionIcon = Save;
    if (isStoreKeeper) { actionLabel = 'Save & Send to Account'; ActionIcon = Send; }
    if (isAccount) { actionLabel = 'Verify & Forward'; ActionIcon = ShieldCheck; }
    if (isAdmin) { actionLabel = 'Approve & Generate'; ActionIcon = CheckCheck; }
    if (isViewOnlyMode) { actionLabel = 'View Only'; ActionIcon = Eye; }

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
                                {isViewOnlyMode && <span className="text-xs px-2 py-0.5 rounded border bg-slate-100 text-slate-600 border-slate-200 font-bold">PREVIEW MODE</span>}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                         <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-lg font-medium shadow-sm transition-colors">
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
                                {isSaved ? 'Processing...' : actionLabel}
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

                <div className="bg-white p-8 md:p-12 rounded-xl shadow-lg max-w-[210mm] mx-auto min-h-[297mm] text-slate-900 font-nepali text-sm print:shadow-none print:p-0 print:max-w-none mt-4">
                    <div className="mb-8">
                        <div className="flex items-start justify-between">
                            <div className="w-24 flex justify-start pt-2">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png" alt="Nepal Emblem" className="h-24 w-24 object-contain" />
                            </div>
                            <div className="flex-1 text-center space-y-1">
                                <h1 className="text-xl font-bold text-red-600">{generalSettings.orgNameNepali}</h1>
                                {generalSettings.subTitleNepali && <h2 className="text-lg font-bold">{generalSettings.subTitleNepali}</h2>}
                                {generalSettings.subTitleNepali2 && <h3 className="text-base font-bold">{generalSettings.subTitleNepali2}</h3>}
                                {generalSettings.subTitleNepali3 && <h3 className="text-lg font-bold">{generalSettings.subTitleNepali3}</h3>}
                                {/* ADDED: Contact Details Row */}
                                <div className="text-xs mt-2 space-x-3 font-medium text-slate-600">
                                    {generalSettings.address && <span>{generalSettings.address}</span>}
                                    {generalSettings.phone && <span>| फोन: {generalSettings.phone}</span>}
                                    {generalSettings.email && <span>| ईमेल: {generalSettings.email}</span>}
                                    {generalSettings.panNo && <span>| पान नं: {generalSettings.panNo}</span>}
                                </div>
                            </div>
                            <div className="w-24"></div> 
                        </div>
                        <div className="text-center pt-6 pb-2">
                            <h1 className="text-xl font-bold underline underline-offset-4">खरिद आदेश</h1>
                        </div>
                    </div>

                    <div className="flex justify-between items-start mb-6">
                        <div className="w-1/2 space-y-2">
                             <div className="flex flex-col gap-1">
                                <label className="font-bold">श्री (आदेश गरिएको व्यक्ति/फर्म/निकाय नाम):</label>
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
                                        className="!border-b !border-dotted !border-slate-400 !rounded-none !bg-transparent !px-0 !py-1"
                                    />
                                ) : (
                                    <input value={poDetails.vendorName} onChange={e => setPoDetails({...poDetails, vendorName: e.target.value})} className="border-b border-dotted border-slate-400 outline-none w-full bg-transparent focus:border-slate-800 disabled:cursor-not-allowed" disabled={true} />
                                )}
                             </div>
                             <div className="flex items-center gap-2">
                                <label className="font-bold w-16">ठेगाना :</label>
                                <input value={poDetails.vendorAddress} onChange={e => setPoDetails({...poDetails, vendorAddress: e.target.value})} className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent disabled:cursor-not-allowed" disabled={!canEditVendor} />
                             </div>
                             <div className="flex items-center gap-2">
                                <label className="font-bold">स्थायी लेखा (PAN/VAT) नम्बर:</label>
                                <input value={poDetails.vendorPan} onChange={e => setPoDetails({...poDetails, vendorPan: e.target.value})} className="border-b border-dotted border-slate-400 outline-none w-32 bg-transparent disabled:cursor-not-allowed" disabled={!canEditVendor} />
                             </div>
                             <div className="flex items-center gap-2">
                                <label className="font-bold w-16">फोन नं :</label>
                                <input value={poDetails.vendorPhone} onChange={e => setPoDetails({...poDetails, vendorPhone: e.target.value})} className="border-b border-dotted border-slate-400 outline-none w-32 bg-transparent disabled:cursor-not-allowed" disabled={!canEditVendor} />
                             </div>
                        </div>

                        <div className="w-1/3 space-y-2 text-right">
                            <div className="flex justify-end items-center gap-2">
                                <label className="font-bold">आर्थिक वर्ष :</label>
                                <input value={poDetails.fiscalYear} readOnly className="border-b border-dotted border-slate-400 outline-none w-24 text-center bg-transparent" />
                            </div>
                            <div className="flex justify-end items-center gap-2">
                                <label className="font-bold">खरिद आदेश नं :</label>
                                <input value={poDetails.orderNo} readOnly className="border-b border-dotted border-slate-400 outline-none w-24 text-center bg-transparent font-bold text-red-600" />
                            </div>
                            <div className="flex justify-end items-center gap-2">
                                <label className="font-bold">खरिद आदेश मिति <span className="text-red-500">*</span> :</label>
                                <NepaliDatePicker 
                                    value={poDetails.orderDate}
                                    onChange={handleOrderDateChange}
                                    format="YYYY/MM/DD"
                                    label=""
                                    hideIcon={true}
                                    inputClassName={`border-b border-dotted border-slate-400 outline-none w-32 text-center bg-transparent font-bold placeholder:text-slate-400 placeholder:font-normal rounded-none px-0 py-0 h-auto focus:ring-0 focus:border-slate-400 ${validationError ? 'text-red-600' : ''}`}
                                    wrapperClassName="w-32"
                                    disabled={!canEditVendor}
                                    // minDate={todayBS} // Removed hardcoded min/max date
                                    // maxDate={todayBS} // Removed hardcoded min/max date
                                />
                            </div>
                            <div className="flex justify-end items-center gap-2">
                                <label className="font-bold">खरिद सम्बन्धी निर्णय नं :</label>
                                <input value={poDetails.decisionNo} onChange={e => setPoDetails({...poDetails, decisionNo: e.target.value})} className="border-b border-dotted border-slate-400 outline-none w-24 text-center bg-transparent disabled:cursor-not-allowed" disabled={!canEditVendor} />
                            </div>
                            <div className="flex justify-end items-center gap-2">
                                <label className="font-bold">निर्णय मिति :</label>
                                <input value={poDetails.decisionDate} onChange={e => setPoDetails({...poDetails, decisionDate: e.target.value})} className="border-b border-dotted border-slate-400 outline-none w-24 text-center bg-transparent disabled:cursor-not-allowed" disabled={!canEditVendor} />
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <table className="w-full border-collapse border border-slate-900 text-center">
                            <thead>
                                <tr className="bg-slate-50">
                                    <th className="border border-slate-900 p-2 w-10" rowSpan={2}>क्र.सं.</th>
                                    <th className="border border-slate-900 p-2" colSpan={3}>सम्पत्ति तथा जिन्सी मालसामानको</th>
                                    <th className="border border-slate-900 p-2 w-20" rowSpan={2}>मोडल</th>
                                    <th className="border border-slate-900 p-2 w-16" rowSpan={2}>एकाई</th>
                                    <th className="border border-slate-900 p-2 w-16" rowSpan={2}>परिमाण</th>
                                    <th className="border border-slate-900 p-2" colSpan={2}>मूल्य(मू.अ.क. बाहेक)</th>
                                    <th className="border border-slate-900 p-2 w-24" rowSpan={2}>कैफियत</th>
                                </tr>
                                <tr className="bg-slate-50">
                                    <th className="border border-slate-900 p-1 w-20">सङ्केत नं</th>
                                    <th className="border border-slate-900 p-1">नाम</th>
                                    <th className="border border-slate-900 p-1">स्पेसिफिकेसन</th>
                                    <th className="border border-slate-900 p-1 w-24">दर</th>
                                    <th className="border border-slate-900 p-1 w-24">जम्मा</th>
                                </tr>
                            </thead>
                            <tbody>
                                {poItems.map((item, index) => (
                                    <tr key={index}>
                                        <td className="border border-slate-900 p-1">{index + 1}</td>
                                        <td className="border border-slate-900 p-1">
                                            <input value={item.codeNo} onChange={e => handleItemChange(index, 'codeNo', e.target.value)} className="w-full text-center outline-none bg-transparent disabled:cursor-not-allowed" placeholder="Code" disabled={!canEditVendor} />
                                        </td>
                                        <td className="border border-slate-900 p-1 text-left px-2 cursor-help" title={getLowestQuoteTooltip(item.name)}>
                                            {item.name}
                                        </td>
                                        <td className="border border-slate-900 p-1 text-left px-2">{item.specification}</td>
                                        <td className="border border-slate-900 p-1">
                                            <input value={item.model} onChange={e => handleItemChange(index, 'model', e.target.value)} className="w-full text-center outline-none bg-transparent disabled:cursor-not-allowed" placeholder="Model" disabled={!canEditVendor} />
                                        </td>
                                        <td className="border border-slate-900 p-1">{item.unit}</td>
                                        <td className="border border-slate-900 p-1 font-bold">{item.quantity}</td>
                                        <td className="border border-slate-900 p-1">
                                            <input value={item.rate} onChange={e => handleItemChange(index, 'rate', e.target.value)} className="w-full text-right outline-none bg-transparent disabled:cursor-not-allowed" placeholder="0.00" disabled={!canEditVendor} />
                                        </td>
                                        <td className="border border-slate-900 p-1 text-right font-bold bg-slate-50">{item.total || '-'}</td>
                                        <td className="border border-slate-900 p-1">
                                            <input value={item.remarks} onChange={e => handleItemChange(index, 'remarks', e.target.value)} className="w-full text-center outline-none bg-transparent disabled:cursor-not-allowed" disabled={!canEditVendor} />
                                        </td>
                                    </tr>
                                ))}
                                <tr className="font-bold">
                                    <td className="border border-slate-900 p-1 text-right pr-4" colSpan={8}>कुल जम्मा (Total)</td>
                                    <td className="border border-slate-900 p-1 text-right">{grandTotal.toFixed(2)}</td>
                                    <td className="border border-slate-900 p-1"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-8 mt-8">
                        <div className="grid grid-cols-2 gap-12">
                            <div>
                                <label className="block font-bold mb-4">तयार गर्ने (Storekeeper):</label>
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <span className="w-16">नाम :</span>
                                        <input value={poDetails.preparedBy.name} onChange={e => setPoDetails({...poDetails, preparedBy: {...poDetails.preparedBy, name: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent" disabled={!isStoreKeeper || isViewOnlyMode}/>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="w-16">पद :</span>
                                        <input value={poDetails.preparedBy.designation} onChange={e => setPoDetails({...poDetails, preparedBy: {...poDetails.preparedBy, designation: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent" disabled={!isStoreKeeper || isViewOnlyMode}/>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="w-16">मिति :</span>
                                        <input value={poDetails.preparedBy.date} onChange={e => setPoDetails({...poDetails, preparedBy: {...poDetails.preparedBy, date: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent text-xs" disabled={!isStoreKeeper || isViewOnlyMode}/>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block font-bold mb-4">सिफारिस गर्ने:</label>
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <span className="w-16">नाम :</span>
                                        <input value={poDetails.recommendedBy.name} onChange={e => setPoDetails({...poDetails, recommendedBy: {...poDetails.recommendedBy, name: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent" />
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="w-16">पद :</span>
                                        <input value={poDetails.recommendedBy.designation} onChange={e => setPoDetails({...poDetails, recommendedBy: {...poDetails.recommendedBy, designation: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent" />
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="w-16">मिति :</span>
                                        <input value={poDetails.recommendedBy.date} onChange={e => setPoDetails({...poDetails, recommendedBy: {...poDetails.recommendedBy, date: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent text-xs" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-12">
                            <div>
                                <label className="block font-bold mb-4">आर्थिक प्रशासन शाखा (Account):</label>
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <span className="w-16">नाम :</span>
                                        <input value={poDetails.financeBy.name} onChange={e => setPoDetails({...poDetails, financeBy: {...poDetails.financeBy, name: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent" disabled={!isAccount || isViewOnlyMode}/>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="w-16">पद :</span>
                                        <input value={poDetails.financeBy.designation} onChange={e => setPoDetails({...poDetails, financeBy: {...poDetails.financeBy, designation: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent" disabled={!isAccount || isViewOnlyMode}/>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="w-16">मिति :</span>
                                        <input value={poDetails.financeBy.date} onChange={e => setPoDetails({...poDetails, financeBy: {...poDetails.financeBy, date: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent text-xs" disabled={!isAccount || isViewOnlyMode}/>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block font-bold mb-4">आदेश दिने (स्वीकृत गर्ने):</label>
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <span className="w-16">नाम :</span>
                                        <input value={poDetails.approvedBy.name} onChange={e => setPoDetails({...poDetails, approvedBy: {...poDetails.approvedBy, name: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent" disabled={!isAdmin || isViewOnlyMode}/>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="w-16">पद :</span>
                                        <input value={poDetails.approvedBy.designation} onChange={e => setPoDetails({...poDetails, approvedBy: {...poDetails.approvedBy, designation: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent" disabled={!isAdmin || isViewOnlyMode}/>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="w-16">मिति :</span>
                                        <input value={poDetails.approvedBy.date} onChange={e => setPoDetails({...poDetails, approvedBy: {...poDetails.approvedBy, date: e.target.value}})} className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent text-xs" disabled={!isAdmin || isViewOnlyMode}/>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
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
                                 isAccount ? 'प्र प्रमाणिकरणको लागि (Pending Verification)' : 
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
        </div>
    );
};
