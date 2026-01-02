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
  users: User[];
  returnEntries: ReturnEntry[];
  generalSettings: OrganizationSettings;
}

interface PropertyUseRow {
    id: string;
    date: string;
    magFormNo: string;
    sanketNo: string;
    name: string;
    model: string;
    specification: string;
    idNo: string;
    estLife: string;
    makeCountry: string;
    source: string;
    unit: string;
    quantity: number;
    totalCost: number;
    receiverDate: string;
    returnedQuantity: number;
    returnDates: string[];
    returnReceivers: string[];
    isCleared: boolean;
}

export const SahayakJinshiKhata: React.FC<SahayakJinshiKhataProps> = ({
  currentFiscalYear,
  currentUser,
  inventoryItems,
  issueReports,
  dakhilaReports,
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

  const tableData = useMemo(() => {
    const rows: PropertyUseRow[] = [];
    if (!selectedPersonName) return [];

    const safeSelectedName = selectedPersonName.trim().toLowerCase();
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

    issueReports.forEach(report => {
        if (!report.status || report.status.trim() !== 'Issued') return;
        const reportDemandName = report.demandBy?.name?.trim().toLowerCase() || '';
        
        if (reportDemandName === safeSelectedName && report.itemType === 'Non-Expendable') {
            report.items.forEach(item => {
                const invItem = inventoryItems.find(i => 
                    i.itemName.trim().toLowerCase() === item.name.trim().toLowerCase()
                );
                
                const rate = item.rate || invItem?.rate || 0;
                const issuedQty = parseFloat(item.quantity.toString()) || 0;
                const total = rate * issuedQty;
                const itemCode = item.codeNo || invItem?.uniqueCode || invItem?.sanketNo || '';
                const returnKey = `${item.name.trim().toLowerCase()}-${itemCode.trim().toLowerCase()}`;
                const itemReturnData = returnedItemsMap.get(returnKey) || { qty: 0, dates: [], receivers: [] };
                
                rows.push({
                    id: `ISSUE-${report.id}-${item.id}`,
                    date: report.issueDate || report.requestDate || '',
                    magFormNo: report.magFormNo.toString(),
                    sanketNo: itemCode, 
                    name: item.name,
                    model: '',
                    specification: item.specification || invItem?.specification || '',
                    idNo: itemCode, 
                    estLife: '',
                    makeCountry: '',
                    source: invItem?.receiptSource || 'खरिद',
                    unit: item.unit,
                    quantity: issuedQty,
                    totalCost: total,
                    receiverDate: report.issueDate || report.requestDate || '', 
                    returnedQuantity: itemReturnData.qty,
                    returnDates: itemReturnData.dates.sort(),
                    returnReceivers: itemReturnData.receivers,
                    isCleared: issuedQty <= itemReturnData.qty
                });
            });
        }
    });

    return rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [selectedPersonName, issueReports, inventoryItems, returnEntries]);

  const isCompletelyCleared = useMemo(() => {
      if (!selectedPersonName) return false;
      return tableData.length === 0 || tableData.every(row => row.isCleared);
  }, [tableData, selectedPersonName]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
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
                        onSelect={(opt) => setSelectedPersonName(opt.value)}
                        placeholder="नाम खोज्नुहोस्..."
                    />
                </div>
            </div>
            <button 
                onClick={() => window.print()}
                disabled={!selectedPersonName}
                className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white hover:bg-slate-900 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50"
            >
                <Printer size={18} /> प्रिन्ट (Print)
            </button>
        </div>

        {selectedPersonName && (
            <div className={`p-4 rounded-xl border flex items-center gap-4 mb-6 shadow-sm ${
                isCompletelyCleared ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
                <div className={`w-3 h-3 rounded-full ${isCompletelyCleared ? 'bg-green-500' : 'bg-red-500'}`} />
                <div>
                    <h4 className={`font-bold font-nepali ${isCompletelyCleared ? 'text-green-800' : 'text-red-800'}`}>
                        {isCompletelyCleared ? 'जिन्सी क्लियरेन्स (Cleared)' : 'जिम्मामा सामान बाँकी (Pending)'}
                    </h4>
                    <p className="text-sm opacity-80">
                        {isCompletelyCleared ? 'यस कर्मचारीको जिम्मामा कुनै सामान बाँकी छैन।' : 'सबै सामान फिर्ता नभएसम्म क्लियरेन्स हुँदैन।'}
                    </p>
                </div>
            </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-bold font-nepali uppercase text-[10px]">
                    <tr>
                        <th className="p-3 border">मिति</th>
                        <th className="p-3 border">निकासा नं</th>
                        <th className="p-3 border">विवरण</th>
                        <th className="p-3 border">परिमाण</th>
                        <th className="p-3 border">फिर्ता परिमाण</th>
                        <th className="p-3 border">स्थिति</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                    {tableData.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50">
                            <td className="p-3 border font-nepali">{row.date}</td>
                            <td className="p-3 border font-mono">{row.magFormNo}</td>
                            <td className="p-3 border font-medium">{row.name}</td>
                            <td className="p-3 border font-bold text-primary-600">{row.quantity}</td>
                            <td className="p-3 border font-bold text-orange-600">{row.returnedQuantity}</td>
                            <td className="p-3 border">
                                {row.isCleared ? 
                                    <span className="text-green-600 flex items-center gap-1 font-bold"><CheckCircle2 size={14}/> फिर्ता</span> : 
                                    <span className="text-red-500 flex items-center gap-1 font-bold"><AlertCircle size={14}/> बाँकी</span>
                                }
                            </td>
                        </tr>
                    ))}
                    {selectedPersonName && tableData.length === 0 && (
                        <tr>
                            <td colSpan={6} className="p-10 text-center text-slate-400 font-nepali">कुनै पनि रेकर्ड फेला परेन।</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
  );
};