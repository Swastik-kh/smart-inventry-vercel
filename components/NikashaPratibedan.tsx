
import React, { useState, useMemo } from 'react';
import { FileOutput, ArrowLeft, Printer, CheckCircle2, X, Clock, Eye, Send, AlertCircle } from 'lucide-react';
import { IssueReportEntry, MagItem, User, OrganizationSettings } from '../types/index';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface NikashaPratibedanProps {
    reports: IssueReportEntry[];
    onSave: (report: IssueReportEntry) => void;
    currentUser: User;
    currentFiscalYear: string;
    generalSettings: OrganizationSettings;
}

export const NikashaPratibedan: React.FC<NikashaPratibedanProps> = ({ reports, onSave, currentUser, currentFiscalYear, generalSettings }) => {
    const [selectedReport, setSelectedReport] = useState<IssueReportEntry | null>(null);
    const [isViewOnlyMode, setIsViewOnlyMode] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const isStoreKeeper = currentUser.role === 'STOREKEEPER';
    const isApprover = ['ADMIN', 'SUPER_ADMIN', 'APPROVAL'].includes(currentUser.role);

    const handleLoadReport = (report: IssueReportEntry, viewOnly: boolean = false) => {
        setSelectedReport(report);
        setIsViewOnlyMode(viewOnly);
    };

    const handleBack = () => {
        setSelectedReport(null);
        setIsViewOnlyMode(false);
    };

    const handleAction = (status: 'Pending Approval' | 'Issued' | 'Rejected') => {
        if (!selectedReport) return;
        setIsProcessing(true);
        const updatedReport: IssueReportEntry = {
            ...selectedReport,
            status,
            issueDate: new NepaliDate().format('YYYY-MM-DD'),
            approvedBy: status === 'Issued' ? { name: currentUser.fullName, designation: currentUser.designation, date: new NepaliDate().format('YYYY-MM-DD') } : selectedReport.approvedBy,
            preparedBy: status === 'Pending Approval' ? { name: currentUser.fullName, designation: currentUser.designation, date: new NepaliDate().format('YYYY-MM-DD') } : selectedReport.preparedBy
        };
        onSave(updatedReport);
        setTimeout(() => {
            setIsProcessing(false);
            handleBack();
        }, 1000);
    };

    const actionableReports = reports.filter(r => {
        if (isStoreKeeper) return r.status === 'Pending';
        if (isApprover) return r.status === 'Pending Approval';
        return false;
    });

    if (selectedReport) {
        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border no-print">
                    <div className="flex items-center gap-4">
                        <button onClick={handleBack} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft size={20} /></button>
                        <h2 className="font-bold text-slate-700">निकासा प्रतिवेदन #{selectedReport.magFormNo}</h2>
                    </div>
                    <div className="flex gap-2">
                        {!isViewOnlyMode && (
                            <>
                                {isStoreKeeper && selectedReport.status === 'Pending' && (
                                    <button onClick={() => handleAction('Pending Approval')} disabled={isProcessing} className="bg-primary-600 text-white px-6 py-2 rounded-lg flex items-center gap-2">
                                        <Send size={18} /> पेश गर्नुहोस्
                                    </button>
                                )}
                                {isApprover && selectedReport.status === 'Pending Approval' && (
                                    <button onClick={() => handleAction('Issued')} disabled={isProcessing} className="bg-green-600 text-white px-6 py-2 rounded-lg flex items-center gap-2">
                                        <CheckCircle2 size={18} /> स्वीकृत गर्नुहोस्
                                    </button>
                                )}
                            </>
                        )}
                        <button onClick={() => window.print()} className="bg-slate-800 text-white px-6 py-2 rounded-lg flex items-center gap-2">
                            <Printer size={18} /> प्रिन्ट
                        </button>
                    </div>
                </div>

                <div className="bg-white p-10 rounded-xl shadow-lg max-w-[210mm] mx-auto min-h-[297mm]">
                    <div className="text-center mb-8">
                        <h1 className="text-xl font-bold">{generalSettings.orgNameNepali}</h1>
                        <h2 className="text-lg font-bold underline">निकासा प्रतिवेदन (निकासी फारम)</h2>
                    </div>

                    <table className="w-full border-collapse border border-slate-900 text-xs">
                        <thead>
                            <tr className="bg-slate-50">
                                <th className="border border-slate-900 p-2">क्र.सं.</th>
                                <th className="border border-slate-900 p-2">सामानको नाम</th>
                                <th className="border border-slate-900 p-2">एकाई</th>
                                <th className="border border-slate-900 p-2">माग परिमाण</th>
                                <th className="border border-slate-900 p-2">निकासा परिमाण</th>
                                <th className="border border-slate-900 p-2">कैफियत</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedReport.items.map((item, idx) => (
                                <tr key={idx}>
                                    <td className="border border-slate-900 p-2 text-center">{idx + 1}</td>
                                    <td className="border border-slate-900 p-2">{item.name}</td>
                                    <td className="border border-slate-900 p-2 text-center">{item.unit}</td>
                                    <td className="border border-slate-900 p-2 text-center">{item.quantity}</td>
                                    <td className="border border-slate-900 p-2 text-center font-bold">{item.quantity}</td>
                                    <td className="border border-slate-900 p-2">{item.remarks}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="grid grid-cols-2 gap-12 mt-20 text-sm">
                        <div className="border-t border-slate-800 pt-2 text-center">
                            <p className="font-bold">तयार गर्ने (Storekeeper)</p>
                            <p>{selectedReport.preparedBy?.name || '...................'}</p>
                        </div>
                        <div className="border-t border-slate-800 pt-2 text-center">
                            <p className="font-bold">स्वीकृत गर्ने (Approver)</p>
                            <p>{selectedReport.approvedBy?.name || '...................'}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Clock size={20} className="text-orange-600"/> विचाराधीन निकासा अनुरोधहरू</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b">
                            <tr><th className="px-4 py-3">माग नं</th><th className="px-4 py-3">मिति</th><th className="px-4 py-3">स्थिति</th><th className="px-4 py-3 text-right">कार्य</th></tr>
                        </thead>
                        <tbody className="divide-y">
                            {actionableReports.map(r => (
                                <tr key={r.id}>
                                    <td className="px-4 py-3 font-bold">#{r.magFormNo}</td>
                                    <td className="px-4 py-3 font-nepali">{r.requestDate}</td>
                                    <td className="px-4 py-3"><span className="px-2 py-1 rounded-full text-[10px] bg-orange-100 text-orange-700">{r.status}</span></td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => handleLoadReport(r)} className="text-primary-600 font-bold hover:underline">Review & Process</button>
                                    </td>
                                </tr>
                            ))}
                            {actionableReports.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400">कुनै नयाँ अनुरोध छैन।</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
