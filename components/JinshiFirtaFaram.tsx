
import React, { useState, useEffect, useMemo } from 'react';
import { RotateCcw, Plus, Trash2, Printer, Save, ArrowLeft, Search, CheckCircle2, Send, Clock, AlertCircle, Eye, X } from 'lucide-react';
import { InventoryItem, User, ReturnEntry, ReturnItem, IssueReportEntry, OrganizationSettings } from '../types';
import { SearchableSelect } from './SearchableSelect';
import { Select } from './Select';
import { NepaliDatePicker } from './NepaliDatePicker';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface JinshiFirtaFaramProps {
  currentFiscalYear: string;
  currentUser: User;
  inventoryItems: InventoryItem[];
  returnEntries: ReturnEntry[];
  onSaveReturnEntry: (entry: ReturnEntry) => void;
  issueReports: IssueReportEntry[]; // Prop to access issue history
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
    { id: Date.now(), kharchaNikasaNo: '', codeNo: '', name: '', specification: '', unit: '', quantity: 0, rate: 0, totalAmount: 0, vatAmount: 0, grandTotal: 0, condition: '', remarks: '' }
  ]);

  const [formDetails, setFormDetails] = useState({
    id: '',
    fiscalYear: currentFiscalYear,
    formNo: '1',
    date: '',
    status: 'Pending' as 'Pending' | 'Verified' | 'Approved' | 'Rejected',
    returnedBy: { name: currentUser.fullName, designation: currentUser.designation, date: '' },
    preparedBy: { name: '', designation: '', date: '' },
    recommendedBy: { name: '', designation: '', date: '' },
    approvedBy: { name: '', designation: '', date: '' },
  });

  const [isSaved, setIsSaved] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);

  // Determine Roles
  const isStoreKeeper = currentUser.role === 'STOREKEEPER' || currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN';

  // Calculate Today in Nepali for Restrictions
  const todayBS = useMemo(() => {
      try {
          return new NepaliDate().format('YYYY-MM-DD');
      } catch (e) {
          return '';
      }
  }, []);

  // Filter Lists
  const pendingRequests = useMemo(() => 
    returnEntries.filter(e => e.status === 'Pending').sort((a, b) => parseInt(b.formNo) - parseInt(a.formNo)),
  [returnEntries]);

  const myRequests = useMemo(() => 
    returnEntries.filter(e => e.returnedBy.name.trim() === currentUser.fullName.trim()).sort((a, b) => parseInt(b.formNo) - parseInt(a.formNo)),
  [returnEntries, currentUser]);

  const approvedHistory = useMemo(() =>
    returnEntries.filter(e => e.status === 'Approved').sort((a, b) => parseInt(b.formNo) - parseInt(a.formNo)),
  [returnEntries]);


  // Auto-increment form number logic (Only for new forms)
  useEffect(() => {
    if (!formDetails.id) {
        const entriesInFY = returnEntries.filter(e => e.fiscalYear === currentFiscalYear);
        const maxNo = entriesInFY.reduce((max, e) => Math.max(max, parseInt(e.formNo || '0')), 0);
        setFormDetails(prev => ({ ...prev, formNo: (maxNo + 1).toString() }));
    }
  }, [currentFiscalYear, returnEntries, formDetails.id]);

  // Inventory Options for Search - FILTERED BY USER & NON-EXPENDABLE
  const returnableItemOptions = useMemo(() => {
    const distinctItems = new Map();

    issueReports.forEach(report => {
        // 1. Check if the report is 'Issued' and belongs to the person returning
        // Note: We match against the 'Returned By' name field in the form, allowing dynamic updates if user changes the name manually.
        if (report.status === 'Issued' && report.demandBy?.name.trim().toLowerCase() === formDetails.returnedBy.name.trim().toLowerCase()) {
            
            // 2. Check if report is for Non-Expendable items
            // (Only Non-Expendable items are usually returned to stock)
            if (report.itemType === 'Non-Expendable') {
                
                report.items.forEach(rptItem => {
                    // Avoid duplicates in the dropdown
                    if (!distinctItems.has(rptItem.name)) {
                        
                        // Try to find the original inventory item to get extra details like unique code
                        const invItem = inventoryItems.find(i => i.itemName.trim().toLowerCase() === rptItem.name.trim().toLowerCase());
                        
                        distinctItems.set(rptItem.name, {
                            id: invItem?.id || rptItem.id.toString(), 
                            value: rptItem.name,
                            // Show name + code for clarity
                            label: `${rptItem.name} ${invItem?.uniqueCode ? `(${invItem.uniqueCode})` : (invItem?.sanketNo ? `(${invItem.sanketNo})` : '')}`,
                            // Store data for onSelect
                            itemData: invItem || { ...rptItem, itemName: rptItem.name } 
                        });
                    }
                });
            }
        }
    });

    return Array.from(distinctItems.values());
  }, [issueReports, formDetails.returnedBy.name, inventoryItems]);


  const handleAddItem = () => {
    setItems([...items, { id: Date.now(), kharchaNikasaNo: '', codeNo: '', name: '', specification: '', unit: '', quantity: 0, rate: 0, totalAmount: 0, vatAmount: 0, grandTotal: 0, condition: '', remarks: '' }]);
  };

  const handleRemoveItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: number, field: keyof ReturnItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Calculations
        if (['quantity', 'rate', 'vatAmount'].includes(field)) {
          const qty = field === 'quantity' ? parseFloat(value) || 0 : item.quantity;
          const rate = field === 'rate' ? parseFloat(value) || 0 : item.rate;
          const vat = field === 'vatAmount' ? parseFloat(value) || 0 : item.vatAmount;
          
          updated.totalAmount = qty * rate; // Excl VAT
          updated.grandTotal = updated.totalAmount + vat; // Incl VAT
        }
        return updated;
      }
      return item;
    }));
  };

  const handleInventorySelect = (id: number, option: any) => {
    const invItem = option.itemData as InventoryItem;
    setItems(items.map(item => {
        if (item.id === id) {
            return {
                ...item,
                name: invItem.itemName,
                codeNo: invItem.sanketNo || invItem.uniqueCode || '',
                specification: invItem.specification || '',
                unit: invItem.unit,
                rate: invItem.rate || 0,
                // Do not auto-set quantity as it's return quantity
            };
        }
        return item;
    }));
  };

  const handleLoadEntry = (entry: ReturnEntry, viewOnly: boolean = false) => {
      setFormDetails({
          id: entry.id,
          fiscalYear: entry.fiscalYear,
          formNo: entry.formNo,
          date: entry.date,
          status: entry.status || 'Pending',
          returnedBy: {
              name: entry.returnedBy.name,
              designation: entry.returnedBy.designation || '',
              date: entry.returnedBy.date || ''
          },
          preparedBy: {
              name: entry.preparedBy.name,
              designation: entry.preparedBy.designation || '',
              date: entry.preparedBy.date || ''
          },
          recommendedBy: {
              name: entry.recommendedBy.name,
              designation: entry.recommendedBy.designation || '',
              date: entry.recommendedBy.date || ''
          },
          approvedBy: {
              name: entry.approvedBy.name,
              designation: entry.approvedBy.designation || '',
              date: entry.approvedBy.date || ''
          }
      });
      setItems(entry.items);
      setIsViewOnly(viewOnly);
      setIsSaved(false); // Reset saved status so buttons re-appear if applicable
      
      // Scroll to form
      const formElement = document.getElementById('firta-form-container');
      if (formElement) formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleReset = () => {
      setFormDetails({
        id: '',
        fiscalYear: currentFiscalYear,
        formNo: '1', // Will update via useEffect
        date: '',
        status: 'Pending',
        returnedBy: { name: currentUser.fullName, designation: currentUser.designation, date: '' },
        preparedBy: { name: '', designation: '', date: '' },
        recommendedBy: { name: '', designation: '', date: '' },
        approvedBy: { name: '', designation: '', date: '' },
      });
      setItems([{ id: Date.now(), kharchaNikasaNo: '', codeNo: '', name: '', specification: '', unit: '', quantity: 0, rate: 0, totalAmount: 0, vatAmount: 0, grandTotal: 0, condition: '', remarks: '' }]);
      setIsViewOnly(false);
      setIsSaved(false);
  }

  const handleSave = (statusToSet: 'Pending' | 'Approved' = 'Pending') => {
    if (!formDetails.date) {
        alert('मिति आवश्यक छ (Date is required)');
        return;
    }

    const entry: ReturnEntry = {
        id: formDetails.id || Date.now().toString(),
        fiscalYear: formDetails.fiscalYear,
        formNo: formDetails.formNo,
        date: formDetails.date,
        items: items,
        status: statusToSet,
        returnedBy: formDetails.returnedBy,
        preparedBy: statusToSet === 'Approved' ? { ...formDetails.preparedBy, name: currentUser.fullName } : formDetails.preparedBy,
        recommendedBy: formDetails.recommendedBy,
        approvedBy: statusToSet === 'Approved' ? { ...formDetails.approvedBy, name: currentUser.fullName, date: formDetails.date } : formDetails.approvedBy,
    };

    onSaveReturnEntry(entry);
    setIsSaved(true);
    setTimeout(() => {
        setIsSaved(false);
        handleReset();
    }, 2000);
  };

  // Calculations for Footer
  const totalAmountSum = items.reduce((acc, i) => acc + i.totalAmount, 0);
  const totalVatSum = items.reduce((acc, i) => acc + i.vatAmount, 0);
  const grandTotalSum = items.reduce((acc, i) => acc + i.grandTotal, 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      
      {/* 1. STOREKEEPER VIEW: VERIFICATION REQUESTS (TOP LIST) */}
      {isStoreKeeper && pendingRequests.length > 0 && (
          <div className="bg-white rounded-xl border border-orange-200 shadow-sm overflow-hidden no-print mb-6">
              <div className="bg-orange-50 px-6 py-3 border-b border-orange-100 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-orange-800">
                      <AlertCircle size={18} />
                      <h3 className="font-bold font-nepali">प्रमाणिकरण अनुरोधहरू (Verification Requests)</h3>
                  </div>
                  <span className="bg-orange-200 text-orange-800 text-xs font-bold px-2 py-0.5 rounded-full">{pendingRequests.length}</span>
              </div>
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 font-medium">
                      <tr>
                          <th className="px-6 py-3">Form No</th>
                          <th className="px-6 py-3">Date</th>
                          <th className="px-6 py-3">Returned By</th>
                          <th className="px-6 py-3">Items</th>
                          <th className="px-6 py-3 text-right">Action</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {pendingRequests.map(req => (
                          <tr key={req.id} className="hover:bg-slate-50">
                              <td className="px-6 py-3 font-mono font-medium">{req.formNo}</td>
                              <td className="px-6 py-3 font-nepali">{req.date}</td>
                              <td className="px-6 py-3">{req.returnedBy.name}</td>
                              <td className="px-6 py-3">{req.items.length} items</td>
                              <td className="px-6 py-3 text-right">
                                  <button 
                                    onClick={() => handleLoadEntry(req, false)} // Load as editable for approval
                                    className="text-primary-600 hover:text-primary-800 font-medium text-xs flex items-center justify-end gap-1 bg-primary-50 px-3 py-1.5 rounded-md hover:bg-primary-100 transition-colors border border-primary-200"
                                  >
                                      <Eye size={14} /> Preview & Approve
                                  </button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}

      {/* 2. HEADER ACTIONS */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
        <div className="flex items-center gap-4">
            <div className="bg-red-100 p-2 rounded-lg text-red-600">
                <RotateCcw size={24} />
            </div>
            <div>
                <h2 className="font-bold text-slate-700 font-nepali text-lg">जिन्सी फिर्ता फारम (Return Form)</h2>
                <div className="flex items-center gap-2">
                    <p className="text-sm text-slate-500">फारम नं: ४०५</p>
                    {formDetails.status === 'Pending' && <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded-full border border-orange-200 font-bold">Pending Verification</span>}
                    {formDetails.status === 'Approved' && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full border border-green-200 font-bold">Approved</span>}
                </div>
            </div>
        </div>
        <div className="flex gap-2">
            {isViewOnly && (
                <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors">
                    <Plus size={18} /> New Form
                </button>
            )}
            
            {!isViewOnly && (
                <>
                    {/* If Storekeeper/Admin viewing a pending request -> Approve Button */}
                    {(isStoreKeeper && formDetails.status === 'Pending' && formDetails.id) ? (
                        <button 
                            onClick={() => handleSave('Approved')} 
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg font-medium shadow-sm transition-colors"
                        >
                            <CheckCircle2 size={18} /> Approve & Verify
                        </button>
                    ) : (
                        /* Normal User submitting new request */
                        <button 
                            onClick={() => handleSave('Pending')} 
                            disabled={isSaved || formDetails.status === 'Approved'}
                            className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium shadow-sm transition-colors ${
                                isSaved ? 'bg-green-600' : 'bg-primary-600 hover:bg-primary-700'
                            }`}
                        >
                            {isSaved ? <CheckCircle2 size={18} /> : <Send size={18} />}
                            {isSaved ? 'Sent!' : 'Request for Verification'}
                        </button>
                    )}
                </>
            )}

            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-lg font-medium shadow-sm transition-colors">
                <Printer size={18} /> Print
            </button>
        </div>
      </div>

      {/* 3. MAIN FORM CONTENT (A4 Layout) */}
      <div id="firta-form-container" className="bg-white p-8 md:p-12 rounded-xl shadow-lg max-w-[297mm] mx-auto min-h-[210mm] text-slate-900 font-nepali text-xs print:shadow-none print:p-0 print:max-w-none landscape:w-full overflow-x-auto">
        
        {/* Top Right */}
        <div className="text-right text-[10px] font-bold mb-2">
            म.ले.प.फारम नं: ४०५
        </div>

        {/* Header */}
        <div className="mb-8">
             <div className="flex items-start justify-between">
                 {/* Left: Logo */}
                 <div className="w-24 flex justify-start pt-2">
                     <img 
                       src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png" 
                       alt="Nepal Emblem" 
                       className="h-24 w-24 object-contain"
                     />
                 </div>
                 
                 {/* Center: Text */}
                 <div className="flex-1 text-center space-y-1">
                     <h1 className="text-xl font-bold text-red-600">{generalSettings.orgNameNepali}</h1>
                     {generalSettings.subTitleNepali && <h2 className="text-lg font-bold">{generalSettings.subTitleNepali}</h2>}
                     {generalSettings.subTitleNepali2 && <h3 className="text-base font-bold">{generalSettings.subTitleNepali2}</h3>}
                     {generalSettings.subTitleNepali3 && <h3 className="text-lg font-bold">{generalSettings.subTitleNepali3}</h3>}
                 </div>

                 {/* Right: Spacer for balance */}
                 <div className="w-24"></div> 
             </div>
             
             <div className="text-center pt-6 pb-2">
                 <h2 className="text-xl font-bold underline underline-offset-4">जिन्सी मालसामान फिर्ता फारम</h2>
             </div>
        </div>

        {/* Date and Form No */}
        <div className="flex justify-end mb-4">
            <div className="text-right space-y-2">
                <div className="flex items-center justify-end gap-2">
                    <span>मिति:</span>
                    <NepaliDatePicker 
                        value={formDetails.date}
                        onChange={(val) => setFormDetails({...formDetails, date: val})}
                        format="YYYY/MM/DD"
                        label=""
                        hideIcon={true}
                        inputClassName="border-b border-dotted border-slate-600 w-32 text-center outline-none bg-transparent font-bold placeholder:text-slate-400 placeholder:font-normal rounded-none px-0 py-0 h-auto focus:ring-0 focus:border-slate-600"
                        wrapperClassName="w-32"
                        disabled={isViewOnly || formDetails.status === 'Approved'}
                        popupAlign="right"
                        minDate={todayBS}
                        maxDate={todayBS}
                    />
                </div>
                <div className="flex items-center justify-end gap-2">
                    <span>जिन्सी फिर्ता फारम नं.:</span>
                    <input 
                        value={formDetails.formNo}
                        readOnly
                        className="border-b border-dotted border-slate-600 w-20 text-center outline-none bg-transparent text-red-600 font-bold"
                    />
                </div>
            </div>
        </div>

        {/* Table */}
        <table className="w-full border-collapse border border-slate-900 text-center align-middle">
            <thead>
                <tr className="bg-slate-50 text-[11px]">
                    <th className="border border-slate-900 p-1 w-8" rowSpan={2}>क्र.सं.</th>
                    <th className="border border-slate-900 p-1 w-20" rowSpan={2}>खर्च निकासा नं.</th>
                    <th className="border border-slate-900 p-1" colSpan={3}>फिर्ता भएको जिन्सी मालसामानको</th>
                    <th className="border border-slate-900 p-1 w-12" rowSpan={2}>एकाई</th>
                    <th className="border border-slate-900 p-1 w-16" rowSpan={2}>परिमाण</th>
                    <th className="border border-slate-900 p-1 w-16" rowSpan={2}>दर</th>
                    <th className="border border-slate-900 p-1" colSpan={3}>मूल्य (विल विजक अनुसार)</th>
                    <th className="border border-slate-900 p-1 w-24" rowSpan={2}>सामानको हालको अवस्था</th>
                    <th className="border border-slate-900 p-1 w-24" rowSpan={2}>कैफियत</th>
                    <th className="border border-slate-900 p-1 w-6 no-print" rowSpan={2}></th>
                </tr>
                <tr className="bg-slate-50 text-[11px]">
                    <th className="border border-slate-900 p-1 w-16">सङ्केत नं.</th>
                    <th className="border border-slate-900 p-1 w-64">नाम</th>
                    <th className="border border-slate-900 p-1 w-24">स्पेसिफिकेसन</th>
                    {/* Price Columns Breakdown */}
                    <th className="border border-slate-900 p-1 w-20">जम्मा मूल्य (मू.अ.कर बाहेक)</th>
                    <th className="border border-slate-900 p-1 w-16">मू.अ.कर</th>
                    <th className="border border-slate-900 p-1 w-20">जम्मा मूल्य</th>
                </tr>
                <tr className="bg-slate-100 text-[10px]">
                    <th className="border border-slate-900">१</th>
                    <th className="border border-slate-900">२</th>
                    <th className="border border-slate-900">३</th>
                    <th className="border border-slate-900">४</th>
                    <th className="border border-slate-900">५</th>
                    <th className="border border-slate-900">६</th>
                    <th className="border border-slate-900">७</th>
                    <th className="border border-slate-900">८</th>
                    <th className="border border-slate-900">९=७*८</th>
                    <th className="border border-slate-900">१०</th>
                    <th className="border border-slate-900">११=९+१०</th>
                    <th className="border border-slate-900">१२</th>
                    <th className="border border-slate-900">१३</th>
                    <th className="border border-slate-900 no-print"></th>
                </tr>
            </thead>
            <tbody>
                {items.map((item, index) => (
                    <tr key={item.id} className="text-[11px]">
                        <td className="border border-slate-900 p-1">{index + 1}</td>
                        <td className="border border-slate-900 p-1">
                            <input disabled={isViewOnly} value={item.kharchaNikasaNo} onChange={(e) => updateItem(item.id, 'kharchaNikasaNo', e.target.value)} className="w-full bg-transparent text-center outline-none disabled:cursor-not-allowed" />
                        </td>
                        <td className="border border-slate-900 p-1">
                            <input disabled={isViewOnly} value={item.codeNo} onChange={(e) => updateItem(item.id, 'codeNo', e.target.value)} className="w-full bg-transparent text-center outline-none disabled:cursor-not-allowed" />
                        </td>
                        <td className="border border-slate-900 p-1 no-print">
                            {!isViewOnly ? (
                                <SearchableSelect 
                                    options={returnableItemOptions} 
                                    value={item.name} 
                                    onChange={(val) => updateItem(item.id, 'name', val)}
                                    onSelect={(opt) => handleInventorySelect(item.id, opt)}
                                    className="!border-none !bg-transparent !text-[11px] !p-0"
                                    placeholder={returnableItemOptions.length > 0 ? "Select from Issued Items" : "No items to return"}
                                />
                            ) : (
                                <span className="text-gray-400 italic">Locked</span>
                            )}
                        </td>
                        <td className="border border-slate-900 p-1 print:table-cell hidden text-left px-1">
                            {item.name}
                        </td>
                        <td className="border border-slate-900 p-1">
                            <input disabled={isViewOnly} value={item.specification} onChange={(e) => updateItem(item.id, 'specification', e.target.value)} className="w-full bg-transparent text-left px-1 outline-none disabled:cursor-not-allowed" />
                        </td>
                        <td className="border border-slate-900 p-1">
                            <input disabled={isViewOnly} value={item.unit} onChange={(e) => updateItem(item.id, 'unit', e.target.value)} className="w-full bg-transparent text-center outline-none disabled:cursor-not-allowed" />
                        </td>
                        <td className="border border-slate-900 p-1">
                            <input disabled={isViewOnly} type="number" value={item.quantity || ''} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} className="w-full bg-transparent text-center outline-none font-bold disabled:cursor-not-allowed" />
                        </td>
                        <td className="border border-slate-900 p-1">
                            <input disabled={isViewOnly} type="number" value={item.rate || ''} onChange={(e) => updateItem(item.id, 'rate', e.target.value)} className="w-full bg-transparent text-right outline-none disabled:cursor-not-allowed" />
                        </td>
                        <td className="border border-slate-900 p-1 text-right px-1">
                            {item.totalAmount.toFixed(2)}
                        </td>
                        <td className="border border-slate-900 p-1">
                            <input disabled={isViewOnly} type="number" value={item.vatAmount || ''} onChange={(e) => updateItem(item.id, 'vatAmount', e.target.value)} className="w-full bg-transparent text-right outline-none disabled:cursor-not-allowed" />
                        </td>
                        <td className="border border-slate-900 p-1 text-right px-1 font-bold">
                            {item.grandTotal.toFixed(2)}
                        </td>
                        <td className="border border-slate-900 p-1">
                            <select 
                                disabled={isViewOnly} 
                                value={item.condition} 
                                onChange={(e) => updateItem(item.id, 'condition', e.target.value)} 
                                className="w-full bg-transparent text-left px-1 outline-none disabled:cursor-not-allowed appearance-none"
                            >
                                <option value="">-- छान्नुहोस् --</option>
                                <option value="चालु">चालु</option>
                                <option value="मर्मत गर्नु पर्ने">मर्मत गर्नु पर्ने</option>
                                <option value="लिलाम गर्नु पर्ने">लिलाम गर्नु पर्ने</option>
                            </select>
                        </td>
                        <td className="border border-slate-900 p-1">
                            <input disabled={isViewOnly} value={item.remarks} onChange={(e) => updateItem(item.id, 'remarks', e.target.value)} className="w-full bg-transparent text-left px-1 outline-none disabled:cursor-not-allowed" />
                        </td>
                        <td className="border border-slate-900 p-1 no-print">
                            {!isViewOnly && (
                                <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700"><Trash2 size={12}/></button>
                            )}
                        </td>
                    </tr>
                ))}
                
                {/* Totals */}
                <tr className="font-bold bg-slate-50">
                    <td colSpan={9} className="border border-slate-900 p-1 text-right pr-2">जम्मा रकम</td>
                    <td className="border border-slate-900 p-1 text-right px-1">{totalAmountSum.toFixed(2)}</td>
                    <td className="border border-slate-900 p-1 text-right px-1">{totalVatSum.toFixed(2)}</td>
                    <td className="border border-slate-900 p-1 text-right px-1">{grandTotalSum.toFixed(2)}</td>
                    <td colSpan={3} className="border border-slate-900"></td>
                </tr>
            </tbody>
        </table>

        {!isViewOnly && (
            <div className="mt-2 no-print">
                <button onClick={handleAddItem} className="flex items-center gap-1 text-primary-600 hover:text-primary-700 text-xs font-bold px-2 py-1 bg-primary-50 rounded">
                    <Plus size={14} /> Add Row
                </button>
            </div>
        )}

        {/* Footer */}
        <div className="grid grid-cols-2 gap-8 mt-12 text-sm">
            <div>
                <div className="font-bold mb-4">फाँटवालाको दस्तखत:</div>
                <div className="space-y-1">
                    <div className="flex gap-2"><span>नाम:</span><input value={formDetails.preparedBy.name} className="border-b border-dotted border-slate-600 flex-1 outline-none bg-transparent" disabled/></div>
                    <div className="flex gap-2"><span>पद:</span><input value={formDetails.preparedBy.designation} className="border-b border-dotted border-slate-600 flex-1 outline-none bg-transparent" disabled/></div>
                    <div className="flex gap-2"><span>मिति:</span><input value={formDetails.preparedBy.date || formDetails.date} className="border-b border-dotted border-slate-600 flex-1 outline-none bg-transparent" disabled/></div>
                </div>
            </div>
            <div>
                <div className="font-bold mb-4">कार्यालय प्रमुखको दस्तखत:</div>
                <div className="space-y-1">
                    <div className="flex gap-2"><span>नाम:</span><input value={formDetails.approvedBy.name} className="border-b border-dotted border-slate-600 flex-1 outline-none bg-transparent" disabled/></div>
                    <div className="flex gap-2"><span>पद:</span><input value={formDetails.approvedBy.designation} className="border-b border-dotted border-slate-600 flex-1 outline-none bg-transparent" disabled/></div>
                    <div className="flex gap-2"><span>मिति:</span><input value={formDetails.approvedBy.date} className="border-b border-dotted border-slate-600 flex-1 outline-none bg-transparent" disabled/></div>
                </div>
            </div>
        </div>
      </div>

      {/* 4. HISTORY VIEW */}
      {approvedHistory.length > 0 && (
          <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden no-print mt-6">
              <div className="bg-blue-50 px-6 py-3 border-b border-blue-100 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-blue-800">
                      <Clock size={18} />
                      <h3 className="font-bold font-nepali">इतिहास (Approved History)</h3>
                  </div>
                  <span className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">{approvedHistory.length}</span>
              </div>
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 font-medium">
                      <tr>
                          <th className="px-6 py-3">Form No</th>
                          <th className="px-6 py-3">Date</th>
                          <th className="px-6 py-3">Returned By</th>
                          <th className="px-6 py-3">Items</th>
                          <th className="px-6 py-3 text-right">Action</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {approvedHistory.map(req => (
                          <tr key={req.id} className="hover:bg-slate-50">
                              <td className="px-6 py-3 font-mono font-medium">{req.formNo}</td>
                              <td className="px-6 py-3 font-nepali">{req.date}</td>
                              <td className="px-6 py-3">{req.returnedBy.name}</td>
                              <td className="px-6 py-3">{req.items.length} items</td>
                              <td className="px-6 py-3 text-right">
                                  <button 
                                    onClick={() => handleLoadEntry(req, true)}
                                    className="text-primary-600 hover:text-primary-800 font-medium text-xs flex items-center justify-end gap-1"
                                  >
                                      <ArrowLeft size={14} /> View
                                  </button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}
    </div>
  );
};
