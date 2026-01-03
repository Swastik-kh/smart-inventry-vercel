
import React, { useState, useEffect, useMemo } from 'react';
import { RotateCcw, Plus, Trash2, Printer, Save, ArrowLeft, Search, CheckCircle2, Send, Clock, AlertCircle, Eye, X } from 'lucide-react';
import { InventoryItem, User, ReturnEntry, ReturnItem, IssueReportEntry, OrganizationSettings, Signature } from '../types'; // Added Signature import
import { SearchableSelect } from './SearchableSelect';
import { NepaliDatePicker } from './NepaliDatePicker';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface JinshiFirtaFaramProps {
  currentFiscalYear: string;
  currentUser: User;
  inventoryItems: InventoryItem[];
  returnEntries: ReturnEntry[];
  onSaveReturnEntry: (entry: ReturnEntry) => void;
  issueReports: IssueReportEntry[];
  generalSettings: OrganizationSettings;
}

export const JinshiFirtaFaram: React.FC<JinshiFirtaFaramProps> = ({
  currentFiscalYear,
  currentUser,
  inventoryItems,
  returnEntries,
  onSaveReturnEntry,
  issueReports,
  generalSettings
}) => {
  const [items, setItems] = useState<ReturnItem[]>([
    { id: Date.now(), kharchaNikasaNo: '', codeNo: '', name: '', specification: '', unit: '', quantity: 0, rate: 0, totalAmount: 0, vatAmount: 0, grandTotal: 0, reasonAndCondition: '', remarks: '', itemType: undefined }
  ]);

  const [formDetails, setFormDetails] = useState({
    id: '',
    fiscalYear: currentFiscalYear,
    formNo: '1',
    date: '',
    status: 'Pending' as 'Pending' | 'Verified' | 'Approved' | 'Rejected',
    returnedBy: { name: currentUser.fullName, designation: currentUser.designation, date: '', purpose: '' } as Signature, // This is the person initiating the return
    preparedBy: { name: '', designation: '', date: '' } as Signature, // This is the Storekeeper who "received" and verified the return
    recommendedBy: { name: '', designation: '', date: '' } as Signature, // Typically filled by Storekeeper/Supervisor
    approvedBy: { name: '', designation: '', date: '' } as Signature, // This is the final approver
    rejectionReason: '' // To store rejection reason
  });

  const [isViewOnly, setIsViewOnly] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Rejection States
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReasonInput, setRejectReasonInput] = useState('');

  // Calculate Today in Nepali for Restrictions
  const todayBS = useMemo(() => {
      try {
          return new NepaliDate().format('YYYY-MM-DD');
      } catch (e) {
          return '';
      }
  }, []);

  // Define roles for granular access control
  const isStaffUser = currentUser.role === 'STAFF';
  const isStorekeeperRole = currentUser.role === 'STOREKEEPER';
  const isApprovalRole = ['ADMIN', 'SUPER_ADMIN', 'APPROVAL'].includes(currentUser.role);

  // Determine current form's workflow state
  const isNewForm = !formDetails.id;
  const isFormPending = formDetails.status === 'Pending';
  const isFormVerified = formDetails.status === 'Verified';
  const isFormApproved = formDetails.status === 'Approved';
  const isFormRejected = formDetails.status === 'Rejected';

  // Determine who can perform which action
  // A user can edit the form if it's new OR if it's pending AND they are the one who returned/submitted it
  const canEditForm = isNewForm || (isFormPending && formDetails.returnedBy.name === currentUser.fullName);

  // Storekeeper can verify pending forms
  const canVerify = isStorekeeperRole && isFormPending; 
  // Approver can approve verified forms
  const canApprove = isApprovalRole && isFormVerified; 

  // Filter requests based on current user's role and form status
  const actionableRequests = useMemo(() => {
    // Staff user does not see requests to action (they submit/return)
    if (isStaffUser) return [];
    // Storekeeper sees forms pending for verification
    if (isStorekeeperRole) {
        return returnEntries.filter(e => e.fiscalYear === currentFiscalYear && e.status === 'Pending').sort((a, b) => b.id.localeCompare(a.id));
    }
    // Approval role sees forms that are verified and need approval
    if (isApprovalRole) {
        return returnEntries.filter(e => e.fiscalYear === currentFiscalYear && e.status === 'Verified').sort((a, b) => b.id.localeCompare(a.id));
    }
    return [];
  }, [returnEntries, currentFiscalYear, isStorekeeperRole, isApprovalRole, isStaffUser]);

  const historyForms = useMemo(() => {
      // Staff see their own forms (any status)
      const staffForms = returnEntries.filter(e => 
          e.returnedBy.name === currentUser.fullName
      );
      // Storekeepers and Approvers see all verified, approved, or rejected forms
      const adminAndStorekeeperHistory = returnEntries.filter(e => 
          (isStorekeeperRole || isApprovalRole) && (e.status === 'Verified' || e.status === 'Approved' || e.status === 'Rejected')
      );

      const combined = [...new Map([...staffForms, ...adminAndStorekeeperHistory].map(item => [item.id, item])).values()];
      return combined.sort((a, b) => b.id.localeCompare(a.id));
  }, [returnEntries, currentUser, isStorekeeperRole, isApprovalRole]);

  // Generate unique form number
  useEffect(() => {
    if (!formDetails.id) { // Only generate if it's a new form
        const entriesInFY = returnEntries.filter(e => e.fiscalYear === currentFiscalYear);
        const maxNo = entriesInFY.reduce((max, e) => Math.max(max, parseInt(e.formNo || '0')), 0);
        setFormDetails(prev => ({ ...prev, formNo: (maxNo + 1).toString(), date: todayBS }));
    }
  }, [currentFiscalYear, returnEntries, formDetails.id, todayBS]);

  // Filter returnable items from issueReports based on the currently selected returnedBy person
  const returnableItemOptions = useMemo(() => {
    const distinctItems = new Map();
    const safeReturnedByName = formDetails.returnedBy.name.trim().toLowerCase();

    // Only allow selecting items previously issued to this person for return
    issueReports.forEach(report => {
        if (report.status === 'Issued' && report.demandBy?.name?.trim().toLowerCase() === safeReturnedByName) {
            report.items.forEach(rptItem => {
                const invItem = inventoryItems.find(i => 
                    i.itemName.trim().toLowerCase() === rptItem.name.trim().toLowerCase() && 
                    (rptItem.codeNo ? (i.uniqueCode === rptItem.codeNo || i.sanketNo === rptItem.codeNo) : true)
                );
                
                // Only allow non-expendable items to be returned to stock
                if (invItem && invItem.itemType === 'Non-Expendable') {
                    if (!distinctItems.has(invItem.id)) {
                        distinctItems.set(invItem.id, {
                            id: invItem.id,
                            value: invItem.itemName,
                            label: `${invItem.itemName} (${invItem.unit}) - ${invItem.uniqueCode || invItem.sanketNo || ''}`,
                            itemData: invItem
                        });
                    }
                }
            });
        }
    });
    return Array.from(distinctItems.values());
  }, [issueReports, formDetails.returnedBy.name, inventoryItems]);

  const handleAddItem = () => {
    if (!canEditForm) return; 
    if (items.length < 14) { // Limit for readability on a print form
        setItems([...items, { id: Date.now(), kharchaNikasaNo: '', codeNo: '', name: '', specification: '', unit: '', quantity: 0, rate: 0, totalAmount: 0, vatAmount: 0, grandTotal: 0, reasonAndCondition: '', remarks: '', itemType: undefined }]);
    } else {
        alert("अधिकतम १४ वटा सामान मात्र फिर्ता गर्न सकिन्छ।");
    }
  };

  const handleRemoveItem = (id: number) => {
    if (!canEditForm) return;
    setItems(prevItems => {
        const filtered = prevItems.filter(item => item.id !== id);
        // Ensure at least one empty row remains
        if (filtered.length === 0) {
            return [{ id: Date.now(), kharchaNikasaNo: '', codeNo: '', name: '', specification: '', unit: '', quantity: 0, rate: 0, totalAmount: 0, vatAmount: 0, grandTotal: 0, reasonAndCondition: '', remarks: '', itemType: undefined }];
        }
        return filtered;
    });
  };

  const updateItem = (id: number, field: keyof ReturnItem, value: any) => {
    if (!canEditForm) return;
    setItems(items.map(item => {
        if (item.id === id) {
            const updated = { ...item, [field]: value };
            if (field === 'quantity' || field === 'rate') {
                const qty = field === 'quantity' ? parseFloat(value) || 0 : updated.quantity;
                const rate = field === 'rate' ? parseFloat(value) || 0 : updated.rate;
                updated.totalAmount = qty * rate;
            }
            return updated;
        }
        return item;
    }));
  };

  const handleInventorySelect = (id: number, option: any) => {
    if (!canEditForm) return;
    const invItem = option.itemData as InventoryItem;
    if (invItem) {
      setItems(items.map(item => item.id === id ? {
          ...item,
          inventoryId: invItem.id,
          name: invItem.itemName,
          codeNo: invItem.sanketNo || invItem.uniqueCode || '',
          specification: invItem.specification || '',
          unit: invItem.unit,
          rate: invItem.rate || 0,
          itemType: invItem.itemType, // Preserve itemType
          kharchaNikasaNo: '',
          quantity: 0,
          totalAmount: 0,
          vatAmount: 0,
          grandTotal: 0,
          reasonAndCondition: '', // Reset on new selection
          remarks: ''
      } : item));
    }
  };

  const handleLoadEntry = (entry: ReturnEntry, viewOnly: boolean = false) => {
      // Ensure all signature fields are properly initialized from loaded form data,
      // providing defaults for new fields if not present in old data.
      setFormDetails({
          id: entry.id,
          fiscalYear: entry.fiscalYear,
          formNo: entry.formNo,
          date: entry.date,
          status: entry.status || 'Pending',
          returnedBy: { ...entry.returnedBy || { name: '', designation: '', date: '', purpose: '' } },
          preparedBy: { ...entry.preparedBy || { name: '', designation: '', date: '' } },
          recommendedBy: { ...entry.recommendedBy || { name: '', designation: '', date: '' } },
          approvedBy: { ...entry.approvedBy || { name: '', designation: '', date: '' } },
          rejectionReason: entry.rejectionReason || '', // Ensure rejectionReason is initialized
      });
      setItems(entry.items);
      setIsViewOnly(viewOnly);
      setIsSaved(false);
      setValidationError(null);
      setSuccessMessage(null);
      // Scroll to form view
      const formElement = document.getElementById('firta-form-container');
      if (formElement) formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleReset = () => {
      setFormDetails({
        id: '', fiscalYear: currentFiscalYear, formNo: '1', date: todayBS, status: 'Pending',
        returnedBy: { name: currentUser.fullName, designation: currentUser.designation, date: todayBS, purpose: '' } as Signature, // Prefill for whoever is creating the form
        preparedBy: { name: '', designation: '', date: '' } as Signature,
        ownerName: '', // This property doesn't exist in Signature, needs to be handled
        recommendedBy: { name: '', designation: '', date: '' } as Signature,
        approvedBy: { name: '', designation: '', date: '' } as Signature,
        rejectionReason: '', // Reset rejectionReason
      });
      setItems([{ id: Date.now(), kharchaNikasaNo: '', codeNo: '', name: '', specification: '', unit: '', quantity: 0, rate: 0, totalAmount: 0, vatAmount: 0, grandTotal: 0, reasonAndCondition: '', remarks: '', itemType: undefined }]);
      setIsViewOnly(false);
      setIsSaved(false);
      setValidationError(null);
      setSuccessMessage(null);
      setShowRejectModal(false);
      setRejectReasonInput('');
  };

  const handleSave = (actionType: 'submit' | 'verify' | 'approve' | 'reject') => {
    setValidationError(null); // Clear previous errors

    // Universal validation for all actions
    if (!formDetails.date || !formDetails.date.trim()) {
        setValidationError('मिति आवश्यक छ (Date is required)');
        return;
    }
    if (!formDetails.returnedBy.purpose || !formDetails.returnedBy.purpose.trim()) {
        setValidationError('कृपया फिर्ता गर्नुको प्रयोजन भर्नुहोस्।');
        return;
    }
    const validItems = items.filter(item => item.name && item.name.trim() !== '');
    if (validItems.length === 0) {
        setValidationError('कृपया कम्तिमा एउटा सामानको विवरण भर्नुहोस्।');
        return;
    }

    let nextStatus: 'Pending' | 'Verified' | 'Approved' | 'Rejected' = formDetails.status;
    let updatedReturnedBy = { ...formDetails.returnedBy }; // Keep original returnedBy, it's the initiator
    let updatedPreparedBy = { ...formDetails.preparedBy };
    let updatedRecommendedBy = { ...formDetails.recommendedBy };
    let updatedApprovedBy = { ...formDetails.approvedBy };
    let rejectionReasonToSave = '';
    let message = '';

    switch (actionType) {
        case 'submit':
            if (!canEditForm) { // Allow Staff, Storekeeper, Approval to submit/edit if `canEditForm` is true
                setValidationError('तपाईंलाई यो फारम पेश गर्ने अनुमति छैन।');
                return;
            }
            nextStatus = 'Pending';
            // When anyone submits, they are the one who "returnedBy" (initiated the form)
            updatedReturnedBy = { name: currentUser.fullName, designation: currentUser.designation, date: formDetails.date, purpose: formDetails.returnedBy.purpose };
            // Clear preparedBy, recommendedBy, approvedBy for a fresh workflow
            updatedPreparedBy = { name: '', designation: '', date: '' };
            updatedRecommendedBy = { name: '', designation: '', date: '' };
            updatedApprovedBy = { name: '', designation: '', date: '' };

            message = "फिर्ता फारम सफलतापूर्वक पेश भयो।";
            break;

        case 'verify':
            if (!canVerify) {
                setValidationError('तपाईंलाई यो फारम प्रमाणित गर्ने अनुमति छैन वा फारम सही स्थितिमा छैन।');
                return;
            }
            nextStatus = 'Verified';
            updatedPreparedBy = { name: currentUser.fullName, designation: currentUser.designation, date: formDetails.date };
            updatedRecommendedBy = { name: currentUser.fullName, designation: currentUser.designation, date: formDetails.date }; // Storekeeper also recommends after verifying
            message = "फिर्ता फारम सफलतापूर्वक प्रमाणित भयो र स्वीकृतिको लागि पठाइयो।";
            break;

        case 'approve':
            if (!canApprove) {
                setValidationError('तपाईंलाई यो फारम स्वीकृत गर्ने अनुमति छैन वा फारम सही स्थितिमा छैन।');
                return;
            }
            nextStatus = 'Approved';
            updatedApprovedBy = { name: currentUser.fullName, designation: currentUser.designation, date: formDetails.date };
            message = "फिर्ता फारम सफलतापूर्वक स्वीकृत भयो र मौज्दातमा थपियो।";
            break;

        case 'reject':
            // Check rejection permission
            if (!((isStorekeeperRole && isFormPending) || (isApprovalRole && isFormVerified))) {
                setValidationError('तपाईंलाई यो फारम अस्वीकार गर्ने अनुमति छैन वा फारम सही स्थितिमा छैन।');
                return;
            }
            if (!rejectReasonInput.trim()) {
                setValidationError('कृपया अस्वीकार गर्नुको कारण भर्नुहोस्।');
                setShowRejectModal(true); // Re-open modal if reason is missing
                return;
            }
            nextStatus = 'Rejected';
            rejectionReasonToSave = rejectReasonInput.trim();
            // Record who rejected it based on current role
            if (isStorekeeperRole && isFormPending) {
                updatedPreparedBy = { name: currentUser.fullName, designation: currentUser.designation, date: formDetails.date };
            } else if (isApprovalRole && isFormVerified) {
                updatedApprovedBy = { name: currentUser.fullName, designation: currentUser.designation, date: formDetails.date };
            }
            message = "फिर्ता फारम अस्वीकृत गरियो।";
            break;
    }
    
    // Final object to save
    const entryToSave: ReturnEntry = {
        ...formDetails,
        id: formDetails.id || Date.now().toString(),
        items: validItems,
        status: nextStatus,
        returnedBy: updatedReturnedBy,
        preparedBy: updatedPreparedBy,
        recommendedBy: updatedRecommendedBy,
        approvedBy: updatedApprovedBy,
        rejectionReason: rejectionReasonToSave,
    };

    onSaveReturnEntry(entryToSave);
    setSuccessMessage(message);
    setIsSaved(true);
    setShowRejectModal(false); // Close reject modal if it was open
    setRejectReasonInput(''); // Clear rejection reason
    
    setTimeout(() => {
        setIsSaved(false);
        handleReset();
    }, 1500);
  };

  const inputReadOnlyClass = "border-b border-dotted border-black flex-1 outline-none bg-slate-50 text-slate-500 cursor-not-allowed px-1 rounded-sm";
  const inputEditableClass = "border-b border-dotted border-black flex-1 outline-none bg-white focus:bg-primary-50 px-1 rounded-sm";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
        {/* Landscape Print Helper CSS */}
        <style dangerouslySetInnerHTML={{ __html: `
            @media print {
                .firta-form-print-container {
                    width: 100% !important;
                    max-width: none !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    border: none !important;
                    box-shadow: none !important;
                    min-height: 210mm !important; /* A4 landscape height */
                    font-size: 8px !important;
                }
                @page {
                    size: A4 landscape;
                    margin: 1cm;
                }
                .firta-form-print-container table,
                .firta-form-print-container th,
                .firta-form-print-container td {
                    border-color: black !important;
                }
            }
        ` }} />

      {/* Actionable Requests List */}
      {actionableRequests.length > 0 && (
          <div className="bg-white rounded-xl border border-orange-200 shadow-sm overflow-hidden mb-6 no-print">
              <div className="bg-orange-50 px-6 py-3 border-b border-orange-100 flex justify-between items-center text-orange-800">
                  <h3 className="font-bold font-nepali">
                    {isStorekeeperRole ? 'प्रमाणीकरण अनुरोधहरू (Pending Verification)' : 
                     isApprovalRole ? 'स्वीकृति अनुरोधहरू (Pending Approval)' : 'अनुर अनुरोधहरू'}
                  </h3>
                  <span className="bg-orange-200 px-2 py-0.5 rounded-full text-xs">{actionableRequests.length}</span>
              </div>
              <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                      {actionableRequests.map(req => (
                          <tr key={req.id} className="hover:bg-slate-50">
                              <td className="px-6 py-3 font-bold">Form {req.formNo}</td>
                              <td className="px-6 py-3">{req.returnedBy.name}</td>
                              <td className="px-6 py-3 text-right">
                                  <button onClick={() => handleLoadEntry(req, false)} className="text-primary-600 bg-primary-50 px-3 py-1.5 rounded-md hover:bg-primary-100 flex items-center gap-1 ml-auto">
                                      <Eye size={14} /> View & {isStorekeeperRole ? 'Verify' : 'Approve'}
                                  </button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}

      {/* Main Form Area */}
      <div id="firta-form-container" className="bg-white p-4 md:p-8 rounded-xl shadow-lg w-full overflow-x-auto font-nepali text-slate-900 firta-form-print-container">
          {/* Print Header */}
          <div className="text-right text-[10px] font-bold mb-2">म.ले.प.फारम नं: ४०३</div>
          <div className="flex items-start justify-between">
              <div className="w-24 flex justify-start pt-1">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png" alt="Nepal Emblem" className="h-20 w-20 object-contain" />
              </div>
              <div className="flex-1 text-center space-y-1 text-xs">
                  <h1 className="text-base font-bold text-red-600">{generalSettings.orgNameNepali}</h1>
                  <h2 className="font-bold">{generalSettings.subTitleNepali}</h2>
                  {generalSettings.subTitleNepali2 && <h3 className="font-bold">{generalSettings.subTitleNepali2}</h3>}
                  {generalSettings.subTitleNepali3 && <h3 className="font-bold">{generalSettings.subTitleNepali3}</h3>}
                  <div className="text-[10px] mt-2 space-x-3 font-medium text-slate-600">
                      {generalSettings.address && <span>{generalSettings.address}</span>}
                      {generalSettings.phone && <span>| फोन: {generalSettings.phone}</span>}
                      {generalSettings.email && <span>| ईमेल: {generalSettings.email}</span>}
                      {generalSettings.panNo && <span>| पान नं: {generalSettings.panNo}</span>}
                  </div>
              </div>
              <div className="w-24"></div> 
          </div>
          <div className="text-center mt-4">
              <h2 className="text-lg font-bold underline underline-offset-4">जिन्सी फिर्ता फाराम</h2>
          </div>

          {/* Meta Info */}
          <div className="flex justify-between items-end mt-4 mb-6 text-xs print:text-[8px]">
              <div className="space-y-1 w-1/2">
                  <div className="flex items-center gap-2">
                      <span className="shrink-0 font-bold">आर्थिक वर्ष:</span>
                      <input value={formDetails.fiscalYear} readOnly className="border-b border-dotted border-black flex-1 outline-none bg-transparent px-1 rounded-sm"/>
                  </div>
                  <div className="flex items-center gap-2">
                      <span className="shrink-0 font-bold">फिर्ता गर्नेको नाम:</span>
                      <input 
                          value={formDetails.returnedBy.name} 
                          onChange={(e) => setFormDetails({...formDetails, returnedBy: {...formDetails.returnedBy, name: e.target.value}})} 
                          disabled={isViewOnly || isFormApproved || !canEditForm} 
                          className={isViewOnly || isFormApproved || !canEditForm ? inputReadOnlyClass : inputEditableClass} 
                      />
                  </div>
                  <div className="flex items-center gap-2">
                      <span className="shrink-0 font-bold">प्रयोजन <span className="text-red-500">*</span>:</span>
                      <input 
                          value={formDetails.returnedBy.purpose || ''} 
                          onChange={(e) => setFormDetails({...formDetails, returnedBy: {...formDetails.returnedBy, purpose: e.target.value}})} 
                          disabled={isViewOnly || isFormApproved || !canEditForm} 
                          className={isViewOnly || isFormApproved || !canEditForm ? inputReadOnlyClass : inputEditableClass} 
                          placeholder="फिर्ता गर्नुको कारण..."
                      />
                  </div>
              </div>
              <div className="space-y-1 w-1/3 text-right">
                  <div className="flex items-center justify-end gap-2">
                      <span className="shrink-0 font-bold">फाराम नं:</span>
                      <input value={formDetails.formNo} disabled className="border-b border-dotted border-black flex-1 outline-none w-24 text-center bg-transparent text-red-600 font-bold px-1 rounded-sm" />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                      <span className="shrink-0 font-bold">मिति <span className="text-red-500">*</span>:</span>
                      <NepaliDatePicker 
                          value={formDetails.date} 
                          onChange={(date) => setFormDetails({...formDetails, date})} 
                          disabled={isViewOnly || isFormApproved || !canEditForm}
                          label=""
                          hideIcon={true}
                          inputClassName="border-b border-dotted border-black flex-1 outline-none w-32 text-center bg-white font-bold placeholder:text-slate-400 placeholder:font-normal rounded-none px-0 py-0 h-auto focus:ring-0 focus:border-black"
                          wrapperClassName="w-32"
                          popupAlign="right"
                          minDate={todayBS}
                          maxDate={todayBS}
                      />
                  </div>
              </div>
          </div>

          {/* Validation/Success Messages (no-print) */}
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

          {/* Form Status Banner */}
          {(isFormPending || isFormVerified || isFormApproved || isFormRejected) && (
              <div className={`p-3 rounded-xl border flex items-center gap-3 mb-6 font-bold text-sm no-print ${
                  isFormApproved ? 'bg-green-50 border-green-200 text-green-800' :
                  isFormVerified ? 'bg-blue-50 border-blue-200 text-blue-800' :
                  isFormRejected ? 'bg-red-50 border-red-200 text-red-800' :
                  'bg-orange-50 border-orange-200 text-orange-800'
              }`}>
                  {isFormApproved ? <CheckCircle2 size={20}/> : isFormRejected ? <X size={20}/> : <Clock size={20}/>}
                  <span>स्थिति: {formDetails.status}</span>
                  {isFormRejected && formDetails.rejectionReason && (
                      <span className="text-xs ml-auto">कारण: {formDetails.rejectionReason}</span>
                  )}
              </div>
          )}

          {/* Table */}
          <table className="w-full border-collapse border border-black text-center text-xs print:text-[7px] mb-6">
              <thead>
                  <tr className="bg-slate-50 print:bg-slate-100">
                      <th className="border border-black p-1 w-8" rowSpan={2}>क्र.सं.</th>
                      <th className="border border-black p-1" colSpan={3}>जिन्सी मालसामानको विवरण</th>
                      <th className="border border-black p-1 w-16" rowSpan={2}>एकाई</th>
                      <th className="border border-black p-1 w-16" rowSpan={2}>परिमाण</th>
                      <th className="border border-black p-1 w-16" rowSpan={2}>दर</th>
                      <th className="border border-black p-1 w-20" rowSpan={2}>जम्मा रकम</th>
                      <th className="border border-black p-1 w-32" rowSpan={2}>कारण / अवस्था</th>
                      <th className="border border-black p-1 w-32" rowSpan={2}>कैफियत</th>
                      {(!isViewOnly && canEditForm) && <th className="border border-black p-1 w-8 no-print" rowSpan={2}></th>}
                  </tr>
                  <tr className="bg-slate-50 print:bg-slate-100">
                      <th className="border border-black p-1">नाम</th>
                      <th className="border border-black p-1 w-24">सङ्केत नं.</th>
                      <th className="border border-black p-1">स्पेसिफिकेसन</th>
                  </tr>
                  <tr className="bg-slate-100 text-[10px] print:text-[6px]">
                      <th className="border border-black p-1">१</th>
                      <th className="border border-black p-1">२</th>
                      <th className="border border-black p-1">३</th>
                      <th className="border border-black p-1">४</th>
                      <th className="border border-black p-1">५</th>
                      <th className="border border-black p-1">६</th>
                      <th className="border border-black p-1">७</th>
                      <th className="border border-black p-1">८=६x७</th>
                      <th className="border border-black p-1">९</th>
                      <th className="border border-black p-1">१०</th>
                      {(!isViewOnly && canEditForm) && <th className="border border-black p-1 no-print"></th>}
                  </tr>
              </thead>
              <tbody>
                  {items.map((item, index) => (
                      <tr key={item.id}>
                          <td className="border border-black p-1">{index + 1}</td>
                          <td className="border border-black p-1 text-left px-2">
                              {(isViewOnly || !canEditForm) ? `${item.name}` : 
                              <SearchableSelect 
                                options={returnableItemOptions} 
                                value={item.name} 
                                onChange={(val) => updateItem(item.id, 'name', val)} 
                                onSelect={(opt) => handleInventorySelect(item.id, opt)} 
                                placeholder="सामान छान्नुहोस्" 
                                className="!border-none !bg-transparent !p-0 !text-[8px]" 
                              />}
                          </td>
                          <td className="border border-black p-1">
                            <input type="text" value={item.codeNo} disabled={true} className="w-full text-center bg-transparent border-none outline-none text-[8px]" />
                          </td>
                          <td className="border border-black p-1">
                            <input type="text" value={item.specification} disabled={true} className="w-full text-center bg-transparent border-none outline-none text-[8px]" />
                          </td>
                          <td className="border border-black p-1">
                              <input type="text" value={item.unit} disabled={true} className="w-full text-center bg-transparent border-none outline-none text-[8px]" />
                          </td>
                          <td className="border border-black p-1">
                              <input 
                                type="number" 
                                value={item.quantity || ''} 
                                onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} 
                                disabled={isViewOnly || !canEditForm} 
                                className="w-full text-center outline-none text-[8px]" 
                              />
                          </td>
                          <td className="border border-black p-1 text-right">
                              <input 
                                type="number" 
                                value={item.rate || ''} 
                                onChange={(e) => updateItem(item.id, 'rate', e.target.value)} 
                                disabled={isViewOnly || !canEditForm} 
                                className="w-full text-right outline-none text-[8px]" 
                              />
                          </td>
                          <td className="border border-black p-1 text-right font-bold bg-slate-50 print:bg-slate-100">
                              {item.totalAmount ? item.totalAmount.toFixed(2) : '0.00'}
                          </td>
                          <td className="border border-black p-1">
                            <select 
                                value={item.reasonAndCondition} 
                                onChange={(e) => updateItem(item.id, 'reasonAndCondition', e.target.value)} 
                                disabled={isViewOnly || !canEditForm} 
                                className="w-full text-center bg-transparent outline-none text-[8px]"
                            >
                                <option value="">छान्नुहोस्</option>
                                <option value="Good">राम्रो (Good)</option>
                                <option value="Damaged">बिग्रिएको (Damaged)</option>
                                <option value="Expired">म्याद सकिएको (Expired)</option>
                                <option value="Unusable">प्रयोग गर्न नमिल्ने (Unusable)</option>
                            </select>
                          </td>
                          <td className="border border-black p-1">
                              <input 
                                type="text" 
                                value={item.remarks} 
                                onChange={(e) => updateItem(item.id, 'remarks', e.target.value)} 
                                disabled={isViewOnly || !canEditForm} 
                                className="w-full text-left px-1 outline-none text-[8px]" 
                              />
                          </td>
                          {(!isViewOnly && canEditForm) && <td className="border border-black p-1 text-red-500 cursor-pointer no-print" onClick={() => handleRemoveItem(item.id)}><Trash2 size={14} /></td>}
                      </tr>
                  ))}
                  {/* Total Row */}
                  <tr className="font-bold bg-slate-100 print:bg-slate-200 text-xs print:text-[7px]">
                      <td className="border border-black p-1 text-right pr-4" colSpan={7}>कुल जम्मा (Total)</td>
                      <td className="border border-black p-1 text-right">{items.reduce((sum, item) => sum + (item.totalAmount || 0), 0).toFixed(2)}</td>
                      <td className="border border-black p-1" colSpan={isViewOnly || !canEditForm ? 2 : 3}></td> {/* Adjust colspan based on actionability */}
                  </tr>
              </tbody>
          </table>
          {(!isViewOnly && canEditForm) && <button onClick={handleAddItem} className="flex items-center gap-2 text-primary-600 font-bold mb-6 no-print"><Plus size={18} /> थप्नुहोस्</button>}

          {/* Footer Signatures */}
          <div className="grid grid-cols-3 gap-8 mt-12 text-xs print:text-[8px] print:grid-cols-3 print:gap-10">
              {/* फिर्ता गर्नेको (Returned By - Staff) */}
              <div>
                  <div className="font-bold mb-4">फिर्ता गर्नेको (पेश गर्ने):</div>
                  <div className="space-y-1">
                      <div className="flex gap-2 items-center">
                          <span className="w-10">नाम:</span>
                          <input value={formDetails.returnedBy.name || ''} className={isViewOnly || !canEditForm ? inputReadOnlyClass : inputEditableClass} disabled={isViewOnly || !canEditForm} onChange={e => setFormDetails(prev => ({...prev, returnedBy: {...prev.returnedBy, name: e.target.value}}))}/>
                      </div>
                      <div className="flex gap-2 items-center">
                          <span className="w-10">पद:</span>
                          <input value={formDetails.returnedBy.designation || ''} className={isViewOnly || !canEditForm ? inputReadOnlyClass : inputEditableClass} disabled={isViewOnly || !canEditForm} onChange={e => setFormDetails(prev => ({...prev, returnedBy: {...prev.returnedBy, designation: e.target.value}}))}/>
                      </div>
                      <div className="flex gap-2 items-center">
                          <span className="w-10">मिति:</span>
                          <input value={formDetails.returnedBy.date || ''} className={isViewOnly || !canEditForm ? inputReadOnlyClass : inputEditableClass} disabled={isViewOnly || !canEditForm} onChange={e => setFormDetails(prev => ({...prev, returnedBy: {...prev.returnedBy, date: e.target.value}}))}/>
                      </div>
                  </div>
              </div>

              {/* बुझिलिनेको (Storekeeper - PreparedBy) */}
              <div>
                  <div className="font-bold mb-4">बुझिलिनेको (स्टोरकिपर):</div>
                  <div className="space-y-1">
                      <div className="flex gap-2 items-center">
                          <span className="w-10">नाम:</span>
                          <input 
                            value={formDetails.preparedBy.name || ''} 
                            className={isViewOnly || isFormApproved || (isFormPending && !isStorekeeperRole) ? inputReadOnlyClass : inputEditableClass} 
                            disabled={isViewOnly || isFormApproved || (isFormPending && !isStorekeeperRole)} 
                            onChange={e => setFormDetails(prev => ({...prev, preparedBy: {...prev.preparedBy, name: e.target.value}}))}
                          />
                      </div>
                      <div className="flex gap-2 items-center">
                          <span className="w-10">पद:</span>
                          <input 
                            value={formDetails.preparedBy.designation || ''} 
                            className={isViewOnly || isFormApproved || (isFormPending && !isStorekeeperRole) ? inputReadOnlyClass : inputEditableClass} 
                            disabled={isViewOnly || isFormApproved || (isFormPending && !isStorekeeperRole)} 
                            onChange={e => setFormDetails(prev => ({...prev, preparedBy: {...prev.preparedBy, designation: e.target.value}}))}
                          />
                      </div>
                      <div className="flex gap-2 items-center">
                          <span className="w-10">मिति:</span>
                          <input 
                            value={formDetails.preparedBy.date || ''} 
                            className={isViewOnly || isFormApproved || (isFormPending && !isStorekeeperRole) ? inputReadOnlyClass : inputEditableClass} 
                            disabled={isViewOnly || isFormApproved || (isFormPending && !isStorekeeperRole)} 
                            onChange={e => setFormDetails(prev => ({...prev, preparedBy: {...prev.preparedBy, date: e.target.value}}))}
                          />
                      </div>
                  </div>
              </div>

              {/* स्वीकृत गर्ने (Approved By - Approval Role) */}
              <div>
                  <div className="font-bold mb-4">स्वीकृत गर्ने:</div>
                  <div className="space-y-1">
                      <div className="flex gap-2 items-center">
                          <span className="w-10">नाम:</span>
                          <input 
                            value={formDetails.approvedBy.name || ''} 
                            className={isViewOnly || isFormApproved || (isFormVerified && !isApprovalRole) ? inputReadOnlyClass : inputEditableClass} 
                            disabled={isViewOnly || isFormApproved || (isFormVerified && !isApprovalRole)} 
                            onChange={e => setFormDetails(prev => ({...prev, approvedBy: {...prev.approvedBy, name: e.target.value}}))}
                          />
                      </div>
                      <div className="flex gap-2 items-center">
                          <span className="w-10">पद:</span>
                          <input 
                            value={formDetails.approvedBy.designation || ''} 
                            className={isViewOnly || isFormApproved || (isFormVerified && !isApprovalRole) ? inputReadOnlyClass : inputEditableClass} 
                            disabled={isViewOnly || isFormApproved || (isFormVerified && !isApprovalRole)} 
                            onChange={e => setFormDetails(prev => ({...prev, approvedBy: {...prev.approvedBy, designation: e.target.value}}))}
                          />
                      </div>
                      <div className="flex gap-2 items-center">
                          <span className="w-10">मिति:</span>
                          <input 
                            value={formDetails.approvedBy.date || ''} 
                            className={isViewOnly || isFormApproved || (isFormVerified && !isApprovalRole) ? inputReadOnlyClass : inputEditableClass} 
                            disabled={isViewOnly || isFormApproved || (isFormVerified && !isApprovalRole)} 
                            onChange={e => setFormDetails(prev => ({...prev, approvedBy: {...prev.approvedBy, date: e.target.value}}))}
                          />
                      </div>
                  </div>
              </div>
          </div>
          
          <div className="flex justify-between border-t pt-6 mt-12 no-print">
              <button onClick={handleReset} className="border px-6 py-2 rounded-xl text-slate-600 hover:bg-slate-100">नयाँ फारम / रद्द</button>
              <div className="flex gap-3">
                  {/* Reject button for Storekeeper (Pending) or Approver (Verified) */}
                  {((isStorekeeperRole && isFormPending) || (isApprovalRole && isFormVerified)) && !isViewOnly && (
                      <button onClick={() => setShowRejectModal(true)} className="bg-red-50 text-red-600 px-6 py-2 rounded-xl font-bold hover:bg-red-100">
                           <X size={18} className="inline-block mr-2" /> अस्वीकार (Reject)
                      </button>
                  )}
                  {/* Action buttons based on role and status */}
                  {!isViewOnly && (
                      <>
                          {/* Staff/Storekeeper/Approval: Submit button (if they can edit the form) */}
                          {canEditForm && (isNewForm || isFormPending) && (
                              <button onClick={() => handleSave('submit')} disabled={isSaved} className="bg-primary-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-primary-700">
                                  {isSaved ? 'प्रक्रियामा...' : 'पेश गर्नुहोस् (Submit)'}
                              </button>
                          )}
                          {/* Storekeeper: Verify button */}
                          {(canVerify && isFormPending) && (
                              <button onClick={() => handleSave('verify')} disabled={isSaved} className="bg-green-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-green-700">
                                  {isSaved ? 'प्रक्रियामा...' : 'प्रमाणित गर्नुहोस् (Verify)'}
                              </button>
                          )}
                          {/* Approval Role: Approve button */}
                          {(canApprove && isFormVerified) && (
                              <button onClick={() => handleSave('approve')} disabled={isSaved} className="bg-green-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-green-700">
                                  {isSaved ? 'प्रक्रियामा...' : 'स्वीकृत गर्नुहोस् (Approve)'}
                              </button>
                          )}
                      </>
                  )}
              </div>
          </div>
      </div>
      
      {/* History List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden no-print mt-6">
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex justify-between items-center text-slate-800">
                  <h3 className="font-bold font-nepali">फिर्ता फारम इतिहास (Return Form History)</h3>
                  <span className="bg-slate-200 px-2 py-0.5 rounded-full text-xs">{historyForms.length}</span>
              </div>
              <table className="w-full text-sm text-left">
                  <tbody className="divide-y divide-slate-100">
                      {historyForms.map(entry => (
                          <tr key={entry.id} className="hover:bg-slate-50">
                              <td className="px-6 py-3 font-bold">Form {entry.formNo}</td>
                              <td className="px-6 py-3">{entry.returnedBy.name}</td>
                              <td className="px-6 py-3 font-nepali">{entry.date}</td>
                              <td className="px-6 py-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                      entry.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' :
                                      entry.status === 'Verified' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                      entry.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                      'bg-orange-50 text-orange-700 border-orange-200'
                                  }`}>
                                      {entry.status}
                                  </span>
                              </td>
                              <td className="px-6 py-3 text-right">
                                  <button onClick={() => handleLoadEntry(entry, true)} className="text-primary-600 bg-primary-50 px-3 py-1.5 rounded-md hover:bg-primary-100 flex items-center gap-1 ml-auto">
                                      <Eye size={14} /> View
                                  </button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
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
                            value={rejectReasonInput}
                            onChange={(e) => setRejectReasonInput(e.target.value)}
                            rows={4}
                            className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-red-500 outline-none"
                            required
                        ></textarea>
                    </div>
                    <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                        <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Cancel</button>
                        <button onClick={() => handleSave('reject')} className="px-6 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm shadow-sm">Confirm Reject</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};