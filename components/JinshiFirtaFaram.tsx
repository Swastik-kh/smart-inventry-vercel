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

  const [isViewOnly, setIsViewOnly] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

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
                                    className="text-primary-600 hover:text-primary-800 font-medium text-xs flex items-center justify-end gap-1 bg-primary-50 px-3 py-1.5 rounded-md hover:bg-primary