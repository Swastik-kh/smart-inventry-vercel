
import React, { useState, useCallback, useMemo } from 'react';
import { FileOutput, ChevronRight, ArrowLeft, Printer, CheckCircle2, ShieldCheck, X, Clock, Eye, Send, FileText, AlertCircle } from 'lucide-react';
import { IssueReportEntry, MagItem, User, OrganizationSettings } from '../types';
import { NepaliDatePicker } from './NepaliDatePicker';
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
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);

    // State for Rejection Modal
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReasonInput, setRejectionReasonInput] = useState('');
    const [reportToRejectId, setReportToRejectId] = useState<string | null>(null);

    // Form State for display/editing
    const [reportDetails, setReportDetails] = useState({
        fiscalYear: '',
        // Fix: magFormNo must be string to match IssueReportEntry and for correct type inference
        magFormNo: '',
        requestDate: '', 
        issueNo: '',     
        issueDate: '',   
        preparedBy: { name: '', designation: '', date: '' },
        recommendedBy: { name: '', designation: '', date: '' },
        approvedBy: { name: '', designation: '', date: '' },
        rejectionReason: '' 
    });
    const [irItems, setIrItems] = useState<MagItem[]>([]);

    // Role helpers
    const isStoreKeeper = currentUser.role === 'STOREKEEPER';
    const isApprover = ['ADMIN', 'SUPER_ADMIN', 'APPROVAL'].includes(currentUser.role);

    // Calculate Today in Nepali for Restrictions
    const todayBS = useMemo(() => {
        try {
            return new NepaliDate().format('YYYY-MM-DD');
        } catch (e) {
            return '';
        }
    }, []);

    // Helper to get today's date in YYYY/MM/DD
    const getTodayNepaliDate = () => {
        try {
            return new NepaliDate().format('YYYY/MM/DD');
        } catch (e) {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            return `${year}/${month}/${day}`;
        }
    };

    const handleLoadReport = (report: IssueReportEntry, viewOnly: boolean = false) => {
        setSelectedReport(report);
        setIsViewOnlyMode(viewOnly);
        setIsProcessing(false);
        setSuccessMessage(null);
        setValidationError(null);
        
        // Auto-generate issueNo if not present, ensuring uniqueness per Fiscal Year
        const targetFiscalYear = report.fiscalYear || currentFiscalYear;
        
        // Filter reports belonging to the target Fiscal Year to find the max number
        const reportsInCurrentFY = reports.filter(r => r.fiscalYear === targetFiscalYear);
        
        const maxIssueNo = reportsInCurrentFY.reduce((max, r) => {
            const num = parseInt(r.issueNo || '0');
            return isNaN(num) ? max : Math.max(max, num);
        }, 0);

        // If the report already has a number, use it. Otherwise, generate next.
        // Logic: If maxIssueNo is 0 (first report of FY), next is 1.
        const nextIssueNo = report.issueNo ? report.issueNo : (maxIssueNo + 1).toString();
        
        // Change: Default to empty string instead of today's date if not already set
        const defaultIssueDate = report.issueDate || '';
        
        setIrItems(report.items);

        // Pre-fill form details based on status and role
        setReportDetails({
            fiscalYear: targetFiscalYear,
            magFormNo: report.magFormNo,
            requestDate: report.requestDate,
            issueNo: nextIssueNo,
            issueDate: defaultIssueDate,

            // Prepared By: Auto-fill if Storekeeper is viewing a Pending report
            preparedBy: report.preparedBy?.name ? {
                name: report.preparedBy.name,
                designation: report.preparedBy.designation || '',
                date: report.preparedBy.date || ''
            } : (
                (report.status === 'Pending' && isStoreKeeper && !viewOnly) 
                ? { name: currentUser.fullName, designation: currentUser.designation, date: defaultIssueDate }
                : { name: '', designation: '', date: '' }
            ),
            
            recommendedBy: report.recommendedBy ? {
                name: report.recommendedBy.name,
                designation: report.recommendedBy.designation || '',
                date: report.recommendedBy.date || ''
            } : { name: '', designation: '', date: '' },
            
            // Approved By: Auto-fill if Approver is viewing a Pending Approval report
            approvedBy: report.approvedBy?.name ? {
                name: report.approvedBy.name,
                designation: report.approvedBy.designation || '',
                date: report.approvedBy.date || ''
            } : (
                (report.status === 'Pending Approval' && isApprover && !viewOnly) 
                ? { name: currentUser.fullName, designation: currentUser.designation, date: defaultIssueDate }
                : { name: '', designation: '', date: '' }
            ),
            rejectionReason: report.rejectionReason || ''
        });
    };

    const handleBack = () => {
        setSelectedReport(null);
        setIsViewOnlyMode(false);
        setIsProcessing(false);
        setSuccessMessage(null);
        setValidationError(null);
    };

    // Handler to sync Issue Date with Prepared By Date
    const handleIssueDateChange = (val: string) => {
        setReportDetails(prev => ({
            ...prev,
            issueDate: val,
            preparedBy: { ...prev.preparedBy, date: val } // Sync logic
        }));
    };

    const handleSaveReport = () => {
        if (!selectedReport || isViewOnlyMode) return;
        setValidationError(null);

        // --- Date Validation Logic ---
        const date = reportDetails.issueDate.trim();
        
        // 1. Check Empty
        if (!date) {
            setValidationError('निकासा मिति अनिवार्य छ (Issue Date is required)।');
            return;
        }

        // 2. Check Format (YYYY/MM/DD) strictly
        const dateRegex = /^\d{4}\/\d{2}\/\d{2}$/;
        if (!dateRegex.test(date)) {
            setValidationError('मिति ढाँचा मिलेन (Invalid Date Format)।\nकृपया YYYY/MM/DD ढाँचा प्रयोग गर्नुहोस् (उदाहरण: 2081/04/01)');
            return;
        }

        const [fyStart] = currentFiscalYear.split('/'); // e.g. 2081
        if (fyStart) {
            const startYearNum = parseInt(fyStart);
            const endYearNum = startYearNum + 1;

            // Ensure consistent separators for comparison
            const formattedDate = date.replace(/[-.]/g, '/');
            
            // Define Valid Range: Shrawan 1 of Start Year to Ashad 32 of End Year
            const minDate = `${startYearNum}/04/01`;
            const maxDate = `${endYearNum}/03/32`;

            if (formattedDate < minDate || formattedDate > maxDate) {
                setValidationError(`मिति आर्थिक वर्ष ${currentFiscalYear} भित्रको हुनुपर्छ।\n(${minDate} देखि ${maxDate} सम्म मात्र मान्य छ)`);
                return;
            }
        }

        // --- New Validation: Chronological Order Check ---
        const currentIssueNoInt = parseInt(reportDetails.issueNo);
        if (!isNaN(currentIssueNoInt) && currentIssueNoInt > 1) {
            const prevIssueNo = currentIssueNoInt - 1;
            
            // Find the previous report in the existing reports list
            const previousReport = reports.find(r => 
                r.fiscalYear === currentFiscalYear && 
                r.issueNo === prevIssueNo.toString()
            );

            if (previousReport && previousReport.issueDate) {
                // Check if current date is earlier than previous report date
                if (date < previousReport.issueDate) {
                    setValidationError(`मिति क्रम मिलेन (Invalid Date Order): \nनिकासा नं ${prevIssueNo} को मिति (${previousReport.issueDate}) भन्दा \nनिकासा नं ${reportDetails.issueNo} को मिति (${date}) अगाडि हुन सक्दैन।`);
                    return;
                }
            }
        }
        // -----------------------------

        // Validation for signatures
        if (selectedReport.status === 'Pending' && isStoreKeeper) {
            if (!reportDetails.preparedBy.name) {
                setValidationError('कृपया तयार गर्नेको नाम भर्नुहोस्।');
                return;
            }
        }
        if (selectedReport.status === 'Pending Approval' && isApprover) {
             if (!reportDetails.approvedBy.name) {
                setValidationError('कृपया स्वीकृत गर्नेको नाम भर्नुहोस्।');
                return;
            }
        }

        setIsProcessing(true);

        let nextStatus = selectedReport.status;
        let successMsg = "विवरण सुरक्षित भयो!";

        // Logic to update state based on workflow
        let updatedPreparedBy = reportDetails.preparedBy;
        let updatedApprovedBy = reportDetails.approvedBy;

        if (isStoreKeeper && selectedReport.status === 'Pending') {
            nextStatus = 'Pending Approval';
            successMsg = "निकासा प्रतिवेदन तयार भयो र स्वीकृतिको लागि पठाइयो (Prepared & Sent for Approval)";
        } else if (isApprover && selectedReport.status === 'Pending Approval') {
            nextStatus = 'Issued';
            successMsg = "निकासा प्रतिवेदन स्वीकृत र जारी गरियो (Approved & Issued)";
        }

        const updatedReport: IssueReportEntry = {
            ...selectedReport,
            status: nextStatus,
            issueNo: reportDetails.issueNo,
            issueDate: reportDetails.issueDate,
            preparedBy: updatedPreparedBy,
            recommendedBy: reportDetails.recommendedBy,
            approvedBy: updatedApprovedBy,
            // Re-set to null instead of undefined as Firebase fails with undefined
            rejectionReason: "" 
        };

        onSave(updatedReport);
        setSuccessMessage(successMsg);
        
        setTimeout(() => {
            handleBack();
        }, 1500);
    };

    const handleRejectModalOpen = (reportId: string) => {
        setReportToRejectId(reportId);
        setRejectionReasonInput('');
        setValidationError(null);
        setShowRejectModal(true);
    };

    const handleRejectSubmit = () => {
        if (!reportToRejectId || !rejectionReasonInput.trim()) {
            setValidationError('अस्वीकृतिको कारण लेख्नुहोस्।');
            return;
        }

        const existingReport = reports.find(r => r.id === reportToRejectId);
        if (!existingReport) return;

        setIsProcessing(true);

        const rejectedReport: IssueReportEntry = {
            ...existingReport,
            status: 'Rejected',
            rejectionReason: rejectionReasonInput.trim(),
            approvedBy: { name: '', designation: '', date: '' }, 
        };

        onSave(rejectedReport);
        setSuccessMessage("अनुरोध अस्वीकृत गरियो (Request Rejected)!");

        setTimeout(() => {
            setShowRejectModal(false);
            handleBack(); 
        }, 1500);
    };

    const totalAmount = irItems.reduce((sum, item) => sum + (item.totalAmount || 0), 0);

    // --- FILTER LOGIC ---
    // 1. Actionable Reports (Pending your action)
    const actionableReports = reports.filter(report => {
        if (isStoreKeeper) return report.status === 'Pending'; // Storekeeper needs to prepare
        if (isApprover) return report.status === 'Pending Approval'; // Admin needs to approve
        return false;
        // Fix: Changed arithmetic operation to use parseInt for string magFormNo
    }).sort((a, b) => parseInt(b.magFormNo) - parseInt(a.magFormNo));

    // 2. History (Completed/Rejected)
    const historyReports = reports.filter(report => {
        if (isStoreKeeper) {
            // Storekeeper sees what they sent (Pending Approval) + Final (Issued) + Rejected
            return ['Pending Approval', 'Issued', 'Rejected'].includes(report.status);
        }
        // Others see Final + Rejected
        return ['Issued', 'Rejected'].includes(report.status);
        // Fix: Changed arithmetic operation to use parseInt for string magFormNo
    }).sort((a, b) => parseInt(b.magFormNo) - parseInt(a.magFormNo));


    // Render Form
    if (selectedReport) {
        // Determine Header Text based on Item Type
        const isNonExpendable = selectedReport.itemType === 'Non-Expendable';
        const headerText = isNonExpendable 
            ? 'खर्च नहुने जिन्सी मालसामानको निकासा गरिएको' 
            : 'खर्च भएर जाने जिन्सी मालसामानको निकासा गरिएको';
        
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                {/* Actions Bar */}
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
                    <div className="flex items-center gap-4">
                        <button onClick={handleBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h2 className="font-bold text-slate-700 font-nepali text-lg">
                                खर्च निकासा फाराम (Issue Report Form)
                            </h2>
                            <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-0.5 rounded border ${
                                    selectedReport.status === 'Pending' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                    selectedReport.status === 'Pending Approval' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    selectedReport.status === 'Issued' ? 'bg-green-50 text-green-700 border-green-200' :
                                    'bg-red-50 text-red-700 border-red-200'
                                }`}>
                                    Status: {selectedReport.status}
                                </span>
                                {isViewOnlyMode && <span className="text-xs font-bold text-slate-500">PREVIEW MODE</span>}
                                {isNonExpendable && <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">Non-Expendable</span>}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                         <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-lg font-medium shadow-sm transition-colors">
                            <Printer size={18} /> Print
                        </button>
                        {!isViewOnlyMode && (
                            <>
                                {isApprover && selectedReport.status === 'Pending Approval' && (
                                    <button onClick={() => handleRejectModalOpen(selectedReport.id)} className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg font-medium transition-colors">
                                        <X size={18} /> Reject
                                    </button>
                                )}
                                <button onClick={handleSaveReport} disabled={isProcessing} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50">
                                    {isProcessing ? 'Processing...' : (
                                        <>
                                            {isStoreKeeper ? <Send size={18} /> : <CheckCircle2 size={18} />}
                                            {isStoreKeeper ? 'Prepare & Forward' : 'Approve & Issue'}
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {successMessage && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl shadow-sm flex items-center gap-3">
                        <CheckCircle2 className="text-green-500" size={24}/>
                        <div className="flex-1 text-green-700 font-medium">{successMessage}</div>
                    </div>
                )}
                {validationError && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex items-start gap-3">
                        <div className="text-red-500 mt-0.5">
                           <AlertCircle size={24} />
                        </div>
                        <div className="flex-1">
                           <h3 className="text-red-800 font-bold text-sm">मिति मिलेन (Date Error)</h3>
                           <p className="text-red-700 text-sm mt-1 whitespace-pre-line leading-relaxed">{validationError}</p>
                        </div>
                        <button onClick={() => setValidationError(null)} className="text-red-400 hover:text-red-600 transition-colors">
                           <X size={20} />
                        </button>
                    </div>
                )}

                {/* FORM 404 LAYOUT */}
                <div id="nikasha-form-container" className="bg-white p-8 md:p-12 rounded-xl shadow-lg max-w-[210mm] mx-auto min-h-[297mm] text-slate-900 font-nepali text-sm print:shadow-none print:p-0 print:max-w-none">
                    
                    <div className="text-right text-xs font-bold mb-4">म.ले.प.फारम नं: ४०४</div>

                    <div className="mb-8">
                        <div className="flex items-start justify-between">
                            <div className="w-24 pt-2"><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png" alt="Emblem" className="h-24 w-24 object-contain"/></div>
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
                            <h2 className="text-xl font-bold underline underline-offset-4">खर्च निकासा फाराम</h2>
                        </div>
                    </div>

                    <div className="flex justify-between items-end mb-6 text-sm font-medium">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span>आ.व. :</span>
                                <input value={reportDetails.fiscalYear} readOnly className="border-b border-dotted border-slate-800 w-24 text-center bg-transparent font-bold cursor-default"/>
                            </div>
                            <div className="flex items-center gap-2">
                                <span>माग फारम नं.:</span>
                                <input value={reportDetails.magFormNo} readOnly className="border-b border-dotted border-slate-800 w-20 text-center bg-transparent font-bold cursor-default"/>
                            </div>
                        </div>
                        <div className="space-y-1 text-right">
                            <div className="flex items-center gap-2 justify-end">
                                <span>निकासा नं. :</span>
                                <input value={reportDetails.issueNo} readOnly className="border-b border-dotted border-slate-800 w-20 text-center bg-transparent font-bold text-red-600 cursor-default"/>
                            </div>
                            <div className="flex items-center gap-2 justify-end">
                                <span>मिति <span className="text-red-500">*</span>:</span>
                                <NepaliDatePicker 
                                    value={reportDetails.issueDate} 
                                    onChange={handleIssueDateChange}
                                    format="YYYY/MM/DD"
                                    label=""
                                    hideIcon={true}
                                    inputClassName={`border-b border-dotted border-slate-800 w-32 text-center bg-transparent font-bold placeholder:text-slate-400 placeholder:font-normal rounded-none px-0 py-0 h-auto outline-none focus:ring-0 focus:border-slate-800 ${validationError ? 'text-red-600' : ''}`}
                                    wrapperClassName="w-32"
                                    disabled={isViewOnlyMode}
                                    popupAlign="right"
                                    minDate={todayBS}
                                    maxDate={todayBS}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mb-8">
                        <table className="w-full border-collapse border border-slate-900 text-sm text-center">
                            <thead>
                                <tr className="bg-slate-50">
                                    <th className="border border-slate-900 p-2 w-12" rowSpan={2}>क्र.सं.</th>
                                    {/* DYNAMIC HEADER TEXT HERE */}
                                    <th className="border border-slate-900 p-2" colSpan={3}>
                                        {headerText}
                                    </th>
                                    <th className="border border-slate-900 p-2 w-16" rowSpan={2}>एकाई</th>
                                    <th className="border border-slate-900 p-2 w-16" rowSpan={2}>परिमाण</th>
                                    <th className="border border-slate-900 p-2 w-20" rowSpan={2}>दर</th>
                                    <th className="border border-slate-900 p-2 w-24" rowSpan={2}>जम्मा रकम</th>
                                    <th className="border border-slate-900 p-2 w-24" rowSpan={2}>कैफियत</th>
                                </tr>
                                <tr className="bg-slate-50">
                                    <th className="border border-slate-900 p-1">नाम</th>
                                    <th className="border border-slate-900 p-1 w-20">सङ्केत नं.</th>
                                    <th className="border border-slate-900 p-1">स्पेसिफिकेसन</th>
                                </tr>
                                <tr className="bg-slate-100 text-[10px]">
                                    <th className="border border-slate-900">१</th>
                                    <th className="border border-slate-900">२</th>
                                    <th className="border border-slate-900">३</th>
                                    <th className="border border-slate-900">४</th>
                                    <th className="border border-slate-900">५</th>
                                    <th className="border border-slate-900">६</th>
                                    <th className="border border-slate-900">७</th>
                                    <th className="border border-slate-900">८=६x७</th>
                                    <th className="border border-slate-900">९</th>
                                </tr>
                            </thead>
                            <tbody>
                                {irItems.map((item, index) => (
                                    <tr key={item.id}>
                                        <td className="border border-slate-900 p-2">{index + 1}</td>
                                        <td className="border border-slate-900 p-1 text-left px-2">{item.name}</td>
                                        <td className="border border-slate-900 p-1">{item.codeNo || '-'}</td>
                                        <td className="border border-slate-900 p-1 text-left px-2">{item.specification}</td>
                                        <td className="border border-slate-900 p-1">{item.unit}</td>
                                        <td className="border border-slate-900 p-1 font-bold">{item.quantity}</td>
                                        <td className="border border-slate-900 p-1 text-right">{item.rate || '-'}</td>
                                        <td className="border border-slate-900 p-1 text-right font-bold">{item.totalAmount ? item.totalAmount.toFixed(2) : '-'}</td>
                                        <td className="border border-slate-900 p-1 text-left px-1 italic">{item.remarks}</td>
                                    </tr>
                                ))}
                                <tr className="font-bold">
                                    <td className="border border-slate-900 p-1 text-right pr-4" colSpan={7}>कुल जम्मा (Total)</td>
                                    <td className="border border-slate-900 p-1 text-right">{totalAmount.toFixed(2)}</td>
                                    <td className="border border-slate-900 p-1"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="grid grid-cols-3 gap-8 text-sm pt-8">
                        {/* Prepared By (Storekeeper) */}
                        <div>
                            <h4 className="font-bold mb-4">तयार गर्ने:.......</h4>
                            <div className="space-y-1">
                                <div className="flex gap-2">
                                    <span className="w-12">नाम :</span>
                                    <input 
                                        value={reportDetails.preparedBy.name}
                                        onChange={e => setReportDetails({...reportDetails, preparedBy: {...reportDetails.preparedBy, name: e.target.value}})}
                                        readOnly={isViewOnlyMode || !isStoreKeeper || selectedReport.status !== 'Pending'}
                                        className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <span className="w-12">पद :</span>
                                    <input 
                                        value={reportDetails.preparedBy.designation}
                                        onChange={e => setReportDetails({...reportDetails, preparedBy: {...reportDetails.preparedBy, designation: e.target.value}})}
                                        readOnly={isViewOnlyMode || !isStoreKeeper || selectedReport.status !== 'Pending'}
                                        className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <span className="w-12">मिति :</span>
                                    <input 
                                        value={reportDetails.preparedBy.date}
                                        readOnly
                                        className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent text-xs cursor-default"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Recommended By */}
                        <div>
                            <h4 className="font-bold mb-4">सिफारिस गर्ने:.......</h4>
                            <div className="space-y-1">
                                <div className="flex gap-2">
                                    <span className="w-12">नाम :</span>
                                    <input 
                                        value={reportDetails.recommendedBy.name}
                                        onChange={e => setReportDetails({...reportDetails, recommendedBy: {...reportDetails.recommendedBy, name: e.target.value}})}
                                        readOnly={isViewOnlyMode || isApprover} // Editable by storekeeper only? Or pre-filled
                                        className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <span className="w-12">पद :</span>
                                    <input 
                                        value={reportDetails.recommendedBy.designation}
                                        onChange={e => setReportDetails({...reportDetails, recommendedBy: {...reportDetails.recommendedBy, designation: e.target.value}})}
                                        readOnly={isViewOnlyMode || isApprover}
                                        className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <span className="w-12">मिति :</span>
                                    <input 
                                        value={reportDetails.recommendedBy.date}
                                        onChange={e => setReportDetails({...reportDetails, recommendedBy: {...reportDetails.recommendedBy, date: e.target.value}})}
                                        readOnly={isViewOnlyMode || isApprover}
                                        className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent text-xs"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Approved By (Admin) */}
                        <div>
                            <h4 className="font-bold mb-4">स्वीकृत गर्ने:.......</h4>
                            <div className="space-y-1">
                                <div className="flex gap-2">
                                    <span className="w-12">नाम :</span>
                                    <input 
                                        value={reportDetails.approvedBy.name}
                                        onChange={e => setReportDetails({...reportDetails, approvedBy: {...reportDetails.approvedBy, name: e.target.value}})}
                                        readOnly={isViewOnlyMode || !isApprover || selectedReport.status !== 'Pending Approval'}
                                        className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <span className="w-12">पद :</span>
                                    <input 
                                        value={reportDetails.approvedBy.designation}
                                        onChange={e => setReportDetails({...reportDetails, approvedBy: {...reportDetails.approvedBy, designation: e.target.value}})}
                                        readOnly={isViewOnlyMode || !isApprover || selectedReport.status !== 'Pending Approval'}
                                        className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <span className="w-12">मिति :</span>
                                    <input 
                                        value={reportDetails.approvedBy.date}
                                        onChange={e => setReportDetails({...reportDetails, approvedBy: {...reportDetails.approvedBy, date: e.target.value}})}
                                        readOnly={isViewOnlyMode || !isApprover || selectedReport.status !== 'Pending Approval'}
                                        className="border-b border-dotted border-slate-400 outline-none flex-1 bg-transparent text-xs"
                                    />
                                </div>
                            </div>
                            {selectedReport.status === 'Rejected' && reportDetails.rejectionReason && (
                                <div className="mt-4 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                                    <strong>कारण:</strong> {reportDetails.rejectionReason}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Filter Logic for List View
    const relevantReports = reports.filter(report => {
        // If Admin, Super Admin, Approval, or Storekeeper -> See All
        if (['ADMIN', 'SUPER_ADMIN', 'APPROVAL', 'STOREKEEPER'].includes(currentUser.role)) {
            return true;
        }
        // If Staff/Other -> See only their own (Matching Full Name or Username)
        // This checks if the user Prepared (Requested) the entry
        return (report.preparedBy?.name === currentUser.fullName || report.preparedBy?.name === currentUser.username);
    }).sort((a, b) => parseInt(b.issueNo || '0') - parseInt(a.issueNo || '0'));

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-green-100 p-2 rounded-lg text-green-600">
                        <FileOutput size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 font-nepali">निकासा प्रतिवेदन (Issue Report)</h2>
                        <p className="text-sm text-slate-500">खर्च भएर जाने जिन्सी मालसामानको निकासा सूची</p>
                    </div>
                </div>
            </div>

            {/* ACTIONABLE LIST */}
            {actionableReports.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                    <div className="px-6 py-4 border-b border-slate-100 bg-orange-50 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Clock size={18} className="text-orange-600"/>
                            <h3 className="font-semibold text-orange-800 font-nepali">
                                {isStoreKeeper ? 'तयारीको लागि अनुरोधहरू (Pending Preparation)' : 'स्वीकृतिको लागि अनुरोधहरू (Pending Approval)'}
                            </h3>
                        </div>
                        <span className="bg-orange-200 text-orange-800 text-xs font-bold px-2 py-1 rounded-full">{actionableReports.length}</span>
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
                            {actionableReports.map(report => (
                                <tr key={report.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-mono font-medium text-slate-700">#{report.magFormNo}</td>
                                    <td className="px-6 py-4 font-nepali">{report.requestDate}</td>
                                    <td className="px-6 py-4 text-slate-600">{report.items.length} items</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                                            <Clock size={12}/> {report.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => handleLoadReport(report, false)}
                                            className="text-primary-600 hover:text-primary-800 font-medium text-xs flex items-center justify-end gap-1 bg-primary-50 px-3 py-1.5 rounded-md hover:bg-primary-100 transition-colors"
                                        >
                                            {isStoreKeeper ? 'Prepare' : 'Approve'} <ChevronRight size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* HISTORY / ISSUED LIST */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <FileText size={18} className="text-slate-500"/>
                        <h3 className="font-semibold text-slate-700 font-nepali">निकासा इतिहास / सूची (Report History)</h3>
                    </div>
                    {/* Only show Storekeeper's Pending Approval items here if they exist, to differentiate from Actionable */}
                    {isStoreKeeper && reports.some(r => r.status === 'Pending Approval') && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                            Waiting for Approval: {reports.filter(r => r.status === 'Pending Approval').length}
                        </span>
                    )}
                </div>
                {historyReports.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 italic">कुनै रिपोर्ट फेला परेन (No reports found)</div>
                ) : (
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-medium">
                            <tr>
                                <th className="px-6 py-3">Issue No</th>
                                <th className="px-6 py-3">Mag Form No</th>
                                <th className="px-6 py-3">Issue Date</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {historyReports.map(report => (
                                <tr key={report.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-mono font-medium text-slate-700">#{report.issueNo}</td>
                                    <td className="px-6 py-4 font-mono text-slate-600">#{report.magFormNo}</td>
                                    <td className="px-6 py-4 font-nepali">{report.issueDate}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
                                            report.status === 'Issued' ? 'bg-green-100 text-green-700 border-green-200' :
                                            report.status === 'Rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                                            'bg-blue-100 text-blue-700 border-blue-200'
                                        }`}>
                                            {report.status === 'Issued' ? <CheckCircle2 size={12}/> : 
                                             report.status === 'Rejected' ? <X size={12}/> : <Clock size={12}/>}
                                            {report.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => handleLoadReport(report, true)}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-md text-xs font-bold transition-colors border border-slate-300"
                                        >
                                            <Eye size={14} /> Preview
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
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
                                value={rejectionReasonInput}
                                onChange={(e) => setRejectionReasonInput(e.target.value)}
                                rows={4}
                                className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-red-500 outline-none"
                                required
                            ></textarea>
                        </div>
                        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                            <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Cancel</button>
                            <button onClick={handleRejectSubmit} className="px-6 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm shadow-sm">Confirm Reject</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
