import React, { useState, useMemo, useEffect } from 'react';
import { Archive, Printer, ArrowLeft, Eye, X, FileText, ClipboardCheck, ShieldCheck, Warehouse, User as UserIcon, CheckCircle2, Search, Clock } from 'lucide-react';
import { DakhilaPratibedanEntry, User, StockEntryRequest, OrganizationSettings, Store } from '../types';

interface DakhilaPratibedanProps {
    dakhilaReports: DakhilaPratibedanEntry[];
    onSaveDakhilaReport: (report: DakhilaPratibedanEntry) => void;
    currentFiscalYear: string;
    currentUser: User;
    stockEntryRequests: StockEntryRequest[];
    // Removed onApproveStockEntry and onRejectStockEntry as they are handled in StockEntryApproval
    generalSettings: OrganizationSettings;
    stores?: Store[];
}

export const DakhilaPratibedan: React.FC<DakhilaPratibedanProps> = ({ 
    dakhilaReports, 
    onSaveDakhilaReport, 
    currentFiscalYear, 
    currentUser, 
    stockEntryRequests,
    // Removed onApproveStockEntry and onRejectStockEntry from destructuring
    generalSettings,
    stores = []
}) => {
    const [selectedReport, setSelectedReport] = useState<DakhilaPratibedanEntry | null>(null);
    const [selectedRequest, setSelectedRequest] = useState<StockEntryRequest | null>(null);
    
    // Default tab: Approvers see Requests, Storekeepers see History
    const isApproverRole = ['ADMIN', 'SUPER_ADMIN', 'APPROVAL'].includes(currentUser.role);
    const [activeTab, setActiveTab] = useState<'Requests' | 'History'>(isApproverRole ? 'Requests' : 'History');
    
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Filter Pending requests
    const pendingRequests = useMemo(() => 
        stockEntryRequests.filter(req => req.fiscalYear === currentFiscalYear && req.status === 'Pending')
            .sort((a, b) => b.id.localeCompare(a.id)),
    [stockEntryRequests, currentFiscalYear]);

    // Unified History: Formal Dakhila Reports
    const filteredReports = useMemo(() => 
        dakhilaReports.filter(r => 
            r.fiscalYear === currentFiscalYear && 
            (r.dakhilaNo.toLowerCase().includes(searchTerm.toLowerCase()) || 
             r.preparedBy?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
        ).sort((a, b) => b.id.localeCompare(a.id)),
    [dakhilaReports, currentFiscalYear, searchTerm]);

    const handleLoadReport = (report: DakhilaPratibedanEntry) => {
        setSelectedReport(report);
        setSelectedRequest(null);
    };

    const handleLoadRequest = (request: StockEntryRequest) => {
        setSelectedRequest(request);
        setSelectedReport(null);
    };

    const handleApprove = () => {
        if (!selectedRequest) return;
        // This component no longer directly calls onApproveStockEntry or onRejectStockEntry
        // The actions are now handled upstream by the StockEntryApproval component
        // This button now only indicates that approval is managed externally
        alert("यो दाखिला अनुरोध स्वीकृत गर्न कृपया 'स्टक प्रविष्टि अनुरोध' मेनुमा जानुहोस्।");
    };

    const handleRejectSubmit = () => {
        if (!selectedRequest || !rejectionReason.trim()) return;
        // This component no longer directly calls onRejectStockEntry
        // The actions are now handled upstream by the StockEntryApproval component
        alert("यो दाखिला अनुरोध अस्वीकृत गर्न कृपया 'स्टक प्रविष्टि अनुरोध' मेनुमा जानुहोस्।");
        setShowRejectModal(false); // Close modal anyway
    };

    const getStoreName = (id: string) => stores.find(s => s.id === id)?.name || 'Unknown Store';

    // Main List View
    if (!selectedReport && !selectedRequest) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                            <Archive size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 font-nepali">दाखिला प्रतिवेदन (Entry Report)</h2>
                            <p className="text-sm text-slate-500 font-nepali">दाखिला अनुरोध र स्वीकृत प्रतिवेदनहरू</p>
                        </div>
                    </div>

                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        {isApproverRole && (
                            <button 
                                onClick={() => setActiveTab('Requests')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'Requests' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <ClipboardCheck size={16} />
                                <span className="font-nepali">अनुरोधहरू</span> 
                                {pendingRequests.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingRequests.length}</span>}
                            </button>
                        )}
                        <button 
                            onClick={() => setActiveTab('History')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'History' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <FileText size={16} />
                            <span className="font-nepali">स्वीकृत दाखिला (History)</span>
                        </button>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    {activeTab === 'Requests' ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-600 font-medium">
                                    <tr>
                                        <th className="px-6 py-4">मिति (Date)</th>
                                        <th className="px-6 py-4">स्टोर (Store)</th>
                                        <th className="px-6 py-4">स्रोत (Source)</th>
                                        <th className="px-6 py-4">निवेदक (Requester)</th>
                                        <th className="px-6 py-4 text-right">कार्य (Action)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {pendingRequests.length === 0 ? (
                                        <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic font-nepali">कुनै नयाँ अनुरोध छैन</td></tr>
                                    ) : (
                                        pendingRequests.map(req => (
                                            <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 font-nepali">{req.requestDateBs}</td>
                                                <td className="px-6 py-4 font-medium flex items-center gap-2">
                                                    <Warehouse size={14} className="text-slate-400" />
                                                    {getStoreName(req.storeId)}
                                                </td>
                                                <td className="px-6 py-4">{req.receiptSource}</td>
                                                <td className="px-6 py-4">
                                                    <div className="text-slate-700 font-medium">{req.requesterName}</div>
                                                    <div className="text-[10px] text-slate-400 uppercase font-bold">{req.requesterDesignation}</div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button 
                                                        onClick={() => handleLoadRequest(req)}
                                                        className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm"
                                                    >
                                                        Review & Approve
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div>
                            <div className="p-4 border-b border-slate-100 bg-slate-50/30">
                                <div className="relative max-w-md">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="दाखिला नं. वा तयार गर्नेको नाम खोज्नुहोस्..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm transition-all"
                                    />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-600 font-medium">
                                        <tr>
                                            <th className="px-6 py-4">दाखिला मिति</th>
                                            <th className="px-6 py-4">दाखिला नं</th>
                                            <th className="px-6 py-4">तयार गर्ने (Storekeeper)</th>
                                            <th className="px-6 py-4">स्वीकृत गर्ने (Head)</th>
                                            <th className="px-6 py-4 text-right">Preview</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredReports.length === 0 ? (
                                            <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic font-nepali">डाटा फेला परेन</td></tr>
                                        ) : (
                                            filteredReports.map(r => (
                                                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-6 py-4 font-nepali">{r.date}</td>
                                                    <td className="px-6 py-4 font-mono font-bold text-green-600">#{r.dakhilaNo}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-slate-700 font-medium">{r.preparedBy?.name}</div>
                                                        <div className="text-[10px] text-slate-400 uppercase">{r.preparedBy?.designation}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-slate-700 font-medium">{r.approvedBy?.name}</div>
                                                        <div className="text-[10px] text-slate-400 uppercase">{r.approvedBy?.designation}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button 
                                                            onClick={() => handleLoadReport(r)} 
                                                            className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-full transition-all"
                                                            title="Preview Report"
                                                        >
                                                            <Eye size={20}/>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Report/Request Detail View
    const renderDetailView = () => {
        const data = selectedReport || selectedRequest;
        if (!data) return null;

        const isReq = !!selectedRequest;
        // Fix: Explicitly narrowing the data source to resolve Property 'dakhilaNo' does not exist on type 'InventoryItem | DakhilaItem'
        const dNo = isReq
            ? (selectedRequest.items[0]?.dakhilaNo || (selectedRequest.dakhilaNo ? selectedRequest.dakhilaNo : 'N/A'))
            : (selectedReport as DakhilaPratibedanEntry).dakhilaNo;
            
        const dDate = isReq ? (data as StockEntryRequest).requestDateBs : (data as DakhilaPratibedanEntry).date;
        const items = data.items || [];
        const storeName = isReq ? getStoreName((data as StockEntryRequest).storeId) : '-';

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                {/* Landscape Print Helper CSS */}
                <style dangerouslySetInnerHTML={{ __html: `
                    @media print {
                        .dakhila-report-print {
                            width: 100% !important;
                            max-width: none !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            border: none !important;
                            box-shadow: none !important;
                        }
                        @page {
                            size: A4 landscape;
                            margin: 1cm;
                        }
                    }
                ` }} />

                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
                    <div className="flex items-center gap-4">
                        <button onClick={() => { setSelectedRequest(null); setSelectedReport(null); }} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h2 className="font-bold text-slate-700 font-nepali text-lg">दाखिला प्रतिवेदन विवरण</h2>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase bg-indigo-50 text-indigo-700 border-indigo-200">
                                {isReq ? 'अनुरोध (Pending Request)' : 'स्वीकृत (Final Report)'}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                         {isApproverRole && isReq && (
                             <>
                                <button onClick={() => setShowRejectModal(true)} className="flex items-center gap-2 px-6 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg font-medium transition-colors">
                                    अस्वीकार (Reject)
                                </button>
                                <button onClick={handleApprove} className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg font-medium shadow-sm transition-all active:scale-95">
                                    <ShieldCheck size={18} /> स्वीकृत गर्नुहोस्
                                </button>
                             </>
                         )}
                         <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-lg font-medium shadow-sm">
                            <Printer size={18} /> प्रिन्ट (Print)
                        </button>
                    </div>
                </div>

                {/* FORM 403 LAYOUT */}
                <div className="bg-white p-10 rounded-xl shadow-lg max-w-[210mm] mx-auto min-h-[297mm] text-slate-900 font-nepali text-sm print:shadow-none print:p-0 print:max-w-none print-full-width dakhila-report-print">
                    <div className="text-right font-bold text-[10px] mb-4">म.ले.प.फारम नं: ४०३</div>

                    <div className="mb-10">
                        <div className="flex items-start justify-between">
                            <div className="w-24 pt-2">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png" alt="Emblem" className="h-24 w-24 object-contain"/>
                            </div>
                            <div className="flex-1 text-center space-y-1">
                                <h1 className="text-xl font-bold text-red-600">{generalSettings.orgNameNepali}</h1>
                                <h2 className="text-lg font-bold">{generalSettings.subTitleNepali}</h2>
                                {generalSettings.subTitleNepali2 && <h3 className="text-base font-bold">{generalSettings.subTitleNepali2}</h3>}
                                {generalSettings.subTitleNepali3 && <h3 className="text-lg font-bold">{generalSettings.subTitleNepali3}</h3>}
                            </div>
                            <div className="w-24"></div> 
                        </div>
                        <div className="text-center pt-8">
                            <h2 className="text-xl font-bold underline underline-offset-4 uppercase tracking-wider">दाखिला प्रतिवेदन फाराम</h2>
                        </div>
                    </div>

                    <div className="flex justify-between items-end mb-6 text-sm font-medium">
                        <div className="space-y-1">
                            <div>आर्थिक वर्ष: <span className="font-bold border-b border-dotted border-slate-800 px-2">{data.fiscalYear}</span></div>
                            <div>स्टोर/गोदाम: <span className="font-bold border-b border-dotted border-slate-800 px-2">{storeName}</span></div>
                        </div>
                        <div className="space-y-1 text-right">
                            <div>दाखिला नं.: <span className="font-bold text-red-600 border-b border-dotted border-slate-800 px-2">#{dNo}</span></div>
                            <div>मिति: <span className="font-bold border-b border-dotted border-slate-800 px-2">{dDate}</span></div>
                        </div>
                    </div>

                    <table className="w-full border-collapse border border-slate-900 text-center text-[11px]">
                        <thead>
                            <tr className="bg-slate-50">
                                <th className="border border-slate-900 p-2 w-10">क्र.सं.</th>
                                <th className="border border-slate-900 p-2">विवरण (सामानको नाम)</th>
                                <th className="border border-slate-900 p-2 w-24">सङ्केत नं.</th>
                                <th className="border border-slate-900 p-2 w-28">स्पेसिफिकेसन</th>
                                <th className="border border-slate-900 p-2 w-16">एकाई</th>
                                <th className="border border-slate-900 p-2 w-16">परिमाण</th>
                                <th className="border border-slate-900 p-2 w-24">दर (रु.)</th>
                                <th className="border border-slate-900 p-2 w-28">जम्मा मूल्य</th>
                                <th className="border border-slate-900 p-2 w-32">कैफियत</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item: any, idx: number) => {
                                const itemName = isReq ? item.itemName : item.name;
                                const codeNo = isReq ? (item.sanketNo || item.uniqueCode) : item.codeNo;
                                const rate = item.rate || 0;
                                const qty = isReq ? item.currentQuantity : item.quantity;
                                const total = isReq ? item.totalAmount : item.finalTotal;
                                
                                return (
                                    <tr key={idx}>
                                        <td className="border border-slate-900 p-2">{idx + 1}</td>
                                        <td className="border border-slate-900 p-1 text-left px-2 font-medium">{itemName}</td>
                                        <td className="border border-slate-900 p-1 font-mono">{codeNo || '-'}</td>
                                        <td className="border border-slate-900 p-1 text-left px-2">{item.specification || '-'}</td>
                                        <td className="border border-slate-900 p-1">{item.unit}</td>
                                        <td className="border border-slate-900 p-1 font-bold">{qty}</td>
                                        <td className="border border-slate-900 p-1 text-right px-2">{rate.toFixed(2)}</td>
                                        <td className="border border-slate-900 p-1 text-right px-2 font-bold">{total.toFixed(2)}</td>
                                        <td className="border border-slate-900 p-1 text-[10px] text-left px-1 italic">{item.remarks || '-'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-slate-50 font-bold">
                                <td colSpan={7} className="border border-slate-900 p-2 text-right px-4 uppercase">कुल जम्मा (Total)</td>
                                <td className="border border-slate-900 p-2 text-right px-2 font-black">
                                    {items.reduce((sum: number, i: any) => sum + (isReq ? i.totalAmount : i.finalTotal), 0).toFixed(2)}
                                </td>
                                <td className="border border-slate-900 p-2"></td>
                            </tr>
                        </tfoot>
                    </table>

                    {/* DYNAMIC FOOTER FOR STOREKEEPER AND APPROVAL */}
                    <div className="grid grid-cols-2 gap-20 mt-16 text-sm">
                        {/* Prepared By Footer */}
                        <div className="text-center">
                            <div className="border-t border-slate-800 pt-3">
                                <p className="font-bold">तयार गर्ने (जिन्सी शाखा)</p>
                                <div className="mt-4 space-y-0.5">
                                    <p className="font-bold text-slate-800">{isReq ? (data as StockEntryRequest).requesterName : (data as DakhilaPratibedanEntry).preparedBy?.name || '................................'}</p>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">{isReq ? (data as StockEntryRequest).requesterDesignation : (data as DakhilaPratibedanEntry).preparedBy?.designation || 'Storekeeper'}</p>
                                    <p className="text-[10px] mt-1 italic">मिति: {isReq ? (data as StockEntryRequest).requestDateBs : (data as DakhilaPratibedanEntry).preparedBy?.date || dDate}</p>
                                </div>
                            </div>
                        </div>

                        {/* Approved By Footer */}
                        <div className="text-center">
                            <div className="border-t border-slate-800 pt-3">
                                <p className="font-bold">स्वीकृत गर्ने (कार्यालय प्रमुख)</p>
                                <div className="mt-4 space-y-0.5">
                                    <p className="font-bold text-slate-800">{isReq ? '................................' : (data as DakhilaPratibedanEntry).approvedBy?.name || '................................'}</p>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">{isReq ? 'Head of Office' : (data as DakhilaPratibedanEntry).approvedBy?.designation || 'Admin'}</p>
                                    {!isReq && <p className="text-[10px] mt-1 italic">मिति: {(data as DakhilaPratibedanEntry).approvedBy?.date || dDate}</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reject Modal */}
                {showRejectModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowRejectModal(false)}></div>
                        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                            <div className="px-6 py-4 border-b bg-red-50 text-red-800 flex justify-between items-center">
                                <h3 className="font-bold">अनुरोध अस्वीकृत गर्नुहोस् (Reject Request)</h3>
                                <button onClick={() => setShowRejectModal(false)}><X size={20}/></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <textarea className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-4 focus:ring-red-500/10 outline-none" rows={4} placeholder="अस्वीकृतिको कारण लेख्नुहोस्..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
                                <div className="flex justify-end gap-3 pt-2">
                                    <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Cancel</button>
                                    <button onClick={handleRejectSubmit} className="px-6 py-2 bg-red-600 text-white rounded-lg text-sm font-bold shadow-sm">Confirm Reject</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return renderDetailView();
};