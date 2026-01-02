import React, { useState, useMemo } from 'react';
import { User, InventoryItem, IssueReportEntry, ReturnEntry, OrganizationSettings, DakhilaPratibedanEntry } from '../types';
import { SearchableSelect } from './SearchableSelect';
import { Printer, BookOpen, User as UserIcon, CheckCircle2, AlertCircle } from 'lucide-react';

interface SahayakJinshiKhataProps {
  currentFiscalYear: string;
  currentUser: User;
  inventoryItems: InventoryItem[];
  issueReports: IssueReportEntry[];
  dakhilaReports: DakhilaPratibedanEntry[];
  // Removed stockEntryRequests as it's not directly used in this report's logic
  // stockEntryRequests: StockEntryRequest[]; 
  users: User[];
  returnEntries: ReturnEntry[];
  generalSettings: OrganizationSettings;
}

interface PropertyUseRow {
    id: string;
    date: string;
    magFormNo: string; // This is actually the issue report form no
    sanketNo: string;
    name: string;
    model: string;
    specification: string;
    idNo: string; // Unique/Sanket code
    estLife: string; // Not directly available in current data, but kept for form consistency
    makeCountry: string; // Not directly available
    source: string; // Acquisition source
    unit: string;
    quantity: number; // Issued quantity
    totalCost: number;
    receiverDate: string; // Date received by person
    returnedQuantity: number; // Sum of returned quantity for this item by this person
    returnDates: string[]; // Dates of return
    returnReceivers: string[]; // Names of receivers for return
    isCleared: boolean;
}

export const SahayakJinshiKhata: React.FC<SahayakJinshiKhataProps> = ({
  currentFiscalYear,
  currentUser,
  inventoryItems,
  issueReports,
  dakhilaReports,
  // Removed stockEntryRequests from destructuring
  users,
  returnEntries,
  generalSettings
}) => {
  const [selectedPersonName, setSelectedPersonName] = useState<string>('');

  const personOptions = useMemo(() => {
      const names = new Set<string>();
      users.forEach(u => names.add(u.fullName));
      issueReports.forEach(r => {
          if (r.demandBy?.name) names.add(r.demandBy.name);
      });
      return Array.from(names).sort().map(name => ({
          id: name,
          value: name,
          label: name
      }));
  }, [users, issueReports]);

  // Derive Table Data based on Selected Person
  const tableData = useMemo(() => {
    const rows: PropertyUseRow[] = [];
    
    if (!selectedPersonName) return [];

    const safeSelectedName = selectedPersonName.trim().toLowerCase();

    // Group returns by the original issued item (name + codeNo)
    const returnedItemsMap = new Map<string, { qty: number; dates: string[]; receivers: string[]; }>();
    returnEntries.forEach(r => {
        if (r.status === 'Approved' && r.returnedBy?.name?.trim().toLowerCase() === safeSelectedName) {
            r.items.forEach(retItem => {
                const key = `${retItem.name.trim().toLowerCase()}-${(retItem.codeNo || '').trim().toLowerCase()}`;
                const current = returnedItemsMap.get(key) || { qty: 0, dates: [], receivers: [] };
                current.qty += retItem.quantity;
                current.dates.push(r.date);
                current.receivers.push(r.approvedBy?.name || 'Store');
                returnedItemsMap.set(key, current);
            });
        }
    });

    // Process Issue Reports for Non-Expendable items
    issueReports.forEach(report => {
        if (!report.status || report.status.trim() !== 'Issued') return;
        const reportDemandName = report.demandBy?.name?.trim().toLowerCase() || '';
        
        if (reportDemandName === safeSelectedName && report.itemType === 'Non-Expendable') {
            report.items.forEach(item => {
                const invItem = inventoryItems.find(i => 
                    i.itemName.trim().toLowerCase() === item.name.trim().toLowerCase()
                );
                
                const rate = item.rate || invItem?.rate || 0;
                const issuedQty = parseFloat(item.quantity) || 0;
                const total = rate * issuedQty;
                const itemCode = item.codeNo || invItem?.uniqueCode || invItem?.sanketNo || '';

                const returnKey = `${item.name.trim().toLowerCase()}-${itemCode.trim().toLowerCase()}`;
                const itemReturnData = returnedItemsMap.get(returnKey) || { qty: 0, dates: [], receivers: [] };
                
                const row: PropertyUseRow = {
                    id: `ISSUE-${report.id}-${item.id}`,
                    date: report.issueDate || report.requestDate || '',
                    magFormNo: report.magFormNo.toString(),
                    sanketNo: itemCode, 
                    name: item.name,
                    model: '', // Not directly in issue report, use from invItem if available
                    specification: item.specification || invItem?.specification || '',
                    idNo: itemCode, 
                    estLife: '', // Not available
                    makeCountry: '', // Not available
                    source: invItem?.receiptSource || 'खरिद',
                    unit: item.unit,
                    quantity: issuedQty,
                    totalCost: total,
                    receiverDate: report.issueDate || report.requestDate || '', 
                    returnedQuantity: itemReturnData.qty,
                    returnDates: itemReturnData.dates.sort(),
                    returnReceivers: itemReturnData.receivers,
                    isCleared: issuedQty <= itemReturnData.qty
                };
                rows.push(row);
            });
        }
    });

    // Sort by date then by name
    return rows.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return a.name.localeCompare(b.name);
    });
  }, [selectedPersonName, issueReports, inventoryItems, returnEntries]);

  const isCompletelyCleared = useMemo(() => {
      if (!selectedPersonName) return false;
      if (tableData.length === 0) return true; // No assets were issued, so effectively cleared
      return tableData.every(row => row.isCleared);
  }, [tableData, selectedPersonName]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
        {/* Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
            <div className="flex flex-col gap-4 w-full md:w-auto">
                <div className="flex items-center gap-2 text-slate-700 font-bold font-nepali text-lg">
                    <BookOpen size={24} className="text-primary-600"/>
                    सहायक जिन्सी खाता (व्यक्तिगत जिम्मेवारी)
                </div>
                
                <div className="w-full md:w-80">
                    <SearchableSelect 
                        label="कर्मचारी/व्यक्ति छान्नुहोस्"
                        options={personOptions}
                        value={selectedPersonName}
                        onChange={setSelectedPersonName}
                        placeholder="नाम खोज्नुहोस्..."
                        icon={<UserIcon size={18} />}
                    />
                </div>
            </div>

            <button 
                onClick={() => window.print()}
                disabled={!selectedPersonName}
                className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white hover:bg-slate-900 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Printer size={18} /> प्रिन्ट (Print)
            </button>
        </div>

        {/* Clearance Status Messages */}
        {selectedPersonName && (
            <div className={`p-4 rounded-xl border flex items-center gap-4 mb-6 shadow-sm animate-in fade-in slide-in-from-top-2 ${
                isCompletelyCleared ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
                <div className="relative shrink-0">
                    <div className={`w-4 h-4 rounded-full shadow-lg animate-pulse ${
                        isCompletelyCleared ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500 shadow-red-500/50'
                    }`}></div>
                </div>
                <div>
                    <h4 className={`font-bold font-nepali text-lg ${isCompletelyCleared ? 'text-green-800' : 'text-red-800'}`}>
                        {isCompletelyCleared ? 'जिन्सी क्लियरेन्स (Jinshi Clearance)' : 'जिन्सी क्लियरेन्स गर्न सकिदैन (Clearance Pending)'}
                    </h4>
                    <p className={`text-sm font-medium ${isCompletelyCleared ? 'text-green-700' : 'text-red-700'}`}>
                        {isCompletelyCleared 
                            ? 'यस कर्मचारी/व्यक्तिको जिम्मामा कुनै पनि बाँकी सामान देखिएन।' 
                            : 'जिम्मामा बाँकी सामान देखियो। तपाईंले जिन्सी क्लियरेन्स गर्न सक्नुहुन्न।'}