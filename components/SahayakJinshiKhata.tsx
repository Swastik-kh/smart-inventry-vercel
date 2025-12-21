
import React, { useState, useMemo } from 'react';
import { User, InventoryItem, IssueReportEntry, ReturnEntry, OrganizationSettings, DakhilaPratibedanEntry, StockEntryRequest } from '../types';
import { SearchableSelect } from './SearchableSelect';
import { Printer, BookOpen, User as UserIcon, CheckCircle2, AlertCircle } from 'lucide-react';

interface SahayakJinshiKhataProps {
  currentFiscalYear: string;
  currentUser: User;
  inventoryItems: InventoryItem[];
  issueReports: IssueReportEntry[];
  dakhilaReports: DakhilaPratibedanEntry[];
  stockEntryRequests: StockEntryRequest[]; // Added missing prop
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
    returnQuantity?: number;
    returnDate?: string;
    returnReceiver?: string;
}

export const SahayakJinshiKhata: React.FC<SahayakJinshiKhataProps> = ({
  currentFiscalYear,
  currentUser,
  inventoryItems,
  issueReports,
  dakhilaReports,
  stockEntryRequests = [],
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

    // 1. Get all APPROVED returns for this user
    const userReturns = returnEntries.filter(r => 
        r.returnedBy?.name?.trim().toLowerCase() === safeSelectedName &&
        r.status === 'Approved'
    );

    let availableReturnPool = userReturns.flatMap(r => r.items.map(i => ({
        ...i,
        quantity: parseFloat(i.quantity.toString()) || 0,
        originalQuantity: parseFloat(i.quantity.toString()) || 0,
        returnDate: r.date,
        receiver: r.approvedBy?.name || 'Store',
        entryFormNo: r.formNo
    })));

    // 2. Issue Reports
    const sortedReports = [...issueReports].sort((a, b) => 
        new Date(a.requestDate).getTime() - new Date(b.requestDate).getTime()
    );

    sortedReports.forEach(report => {
        if (!report.status || report.status.trim() !== 'Issued') return;
        const reportDemandName = report.demandBy?.name?.trim().toLowerCase() || '';
        
        if (reportDemandName === safeSelectedName) {
            report.items.forEach(item => {
                const invItem = inventoryItems.find(i => 
                    i.itemName.trim().toLowerCase() === item.name.trim().toLowerCase()
                );
                
                const isReportNonExpendable = report.itemType === 'Non-Expendable';
                const isInventoryNonExpendable = invItem && invItem.itemType === 'Non-Expendable';

                if (isReportNonExpendable || isInventoryNonExpendable) {
                    const rate = item.rate || invItem?.rate || 0;
                    const issuedQty = parseFloat(item.quantity) || 0;
                    const total = rate * issuedQty;

                    const newRow: PropertyUseRow = {
                        id: `ISSUE-${report.id}-${item.id}`,
                        date: report.issueDate || report.requestDate,
                        magFormNo: report.magFormNo.toString(),
                        sanketNo: item.codeNo || invItem?.sanketNo || '', 
                        name: item.name,
                        model: '', 
                        specification: item.specification || invItem?.specification || '',
                        idNo: item.codeNo || invItem?.uniqueCode || '', 
                        estLife: '', 
                        makeCountry: '', 
                        source: invItem?.receiptSource || 'खरिद',
                        unit: item.unit,
                        quantity: issuedQty,
                        totalCost: total,
                        receiverDate: report.issueDate || report.requestDate, 
                        returnQuantity: undefined,
                        returnDate: undefined,
                        returnReceiver: undefined
                    };

                    let matchedReturnQty = 0;
                    let lastReturnDate = '';
                    let receiverName = '';

                    if (newRow.idNo) {
                        for (let i = 0; i < availableReturnPool.length; i++) {
                            const retItem = availableReturnPool[i];
                            if (retItem.quantity > 0 && 
                                retItem.codeNo === newRow.idNo && 
                                retItem.name.trim().toLowerCase() === newRow.name.trim().toLowerCase()) {
                                
                                const take = Math.min(retItem.quantity, issuedQty - matchedReturnQty);
                                matchedReturnQty += take;
                                retItem.quantity -= take;
                                lastReturnDate = retItem.returnDate;
                                receiverName = retItem.receiver;
                                if (matchedReturnQty >= issuedQty) break;
                            }
                        }
                    } 
                    
                    if (matchedReturnQty < issuedQty) {
                        for (let i = 0; i < availableReturnPool.length; i++) {
                            const retItem = availableReturnPool[i];
                            if (retItem.quantity > 0 && 
                                retItem.name.trim().toLowerCase() === newRow.name.trim().toLowerCase()) {
                                const take = Math.min(retItem.quantity, issuedQty - matchedReturnQty);
                                matchedReturnQty += take;
                                retItem.quantity -= take;
                                lastReturnDate = retItem.returnDate;
                                receiverName = retItem.receiver;
                                if (matchedReturnQty >= issuedQty) break;
                            }
                        }
                    }

                    if (matchedReturnQty > 0) {
                        newRow.returnQuantity = matchedReturnQty;
                        newRow.returnDate = lastReturnDate;
                        newRow.returnReceiver = receiverName;
                    }
                    rows.push(newRow);
                }
            });
        }
    });

    return rows;
  }, [selectedPersonName, issueReports, inventoryItems, returnEntries]);

  const isCompletelyCleared = useMemo(() => {
      if (!selectedPersonName) return false;
      if (tableData.length === 0) return true;
      return tableData.every(row => row.quantity === (row.returnQuantity || 0));
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
                    </p>
                </div>
                <div className="ml-auto">
                    {isCompletelyCleared ? <CheckCircle2 size={32} className="text-green-600 opacity-50" /> : <AlertCircle size={32} className="text-red-600 opacity-50" />}
                </div>
            </div>
        )}

        {/* Report Container */}
        <div className="bg-white p-4 md:p-8 rounded-xl shadow-lg w-full overflow-x-auto print:shadow-none print:p-0 print:max-w-none">
            {/* Header Section */}
            <div className="mb-4">
                <div className="text-right text-xs font-bold mb-2">म.ले.प.फारम नं: ४१२</div>
                
                <div className="flex items-start justify-between">
                    <div className="w-24 pt-2 hidden md:block">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png" alt="Emblem" className="h-20 w-20 object-contain"/>
                    </div>
                    <div className="flex-1 text-center space-y-1">
                        <h1 className="text-xl font-bold text-red-600">{generalSettings.orgNameNepali}</h1>
                        {generalSettings.subTitleNepali && <h2 className="text-lg font-bold">{generalSettings.subTitleNepali}</h2>}
                    </div>
                    <div className="w-24 hidden md:block"></div> 
                </div>
                
                <div className="text-center mt-4">
                    <h2 className="text-xl font-bold underline underline-offset-4">सहायक जिन्सी खाता</h2>
                    <p className="text-sm font-medium mt-1">(खर्च भएर नजाने सामानको लागि)</p>
                </div>
            </div>

            {/* Person Details */}
            <div className="mb-6 flex justify-between items-end border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">जिम्मेवारी लिने व्यक्तिको नाम:</span>
                    <span className="text-lg text-primary-700 font-bold px-2 border-b-2 border-primary-600">{selectedPersonName || '................................'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">आर्थिक वर्ष:</span>
                    <span className="font-bold">{currentFiscalYear}</span>
                </div>
            </div>

            {/* Table */}
            <table className="w-full border-collapse border border-slate-900 text-center text-[11px]">
                <thead>
                    <tr className="bg-slate-50">
                        <th className="border border-slate-900 p-1" rowSpan={2} style={{width:'80px'}}>निकासा मिति</th>
                        <th className="border border-slate-900 p-1" rowSpan={2} style={{width:'60px'}}>निकासा आदेश नं</th>
                        <th className="border border-slate-900 p-1" colSpan={6}>सामानको विवरण</th>
                        <th className="border border-slate-900 p-1" rowSpan={2} style={{width:'40px'}}>एकाई</th>
                        <th className="border border-slate-900 p-1" rowSpan={2} style={{width:'60px'}}>परिमाण</th>
                        <th className="border border-slate-900 p-1" rowSpan={2} style={{width:'80px'}}>जम्मा परल मूल्य</th>
                        <th className="border border-slate-900 p-1" rowSpan={2} style={{width:'80px'}}>प्राप्त गर्नेको दस्तखत/मिति</th>
                        <th className="border border-slate-900 p-1" colSpan={3}>सामान फिर्ता/मिनाहा विवरण</th>
                        <th className="border border-slate-900 p-1" rowSpan={2}>कैफियत</th>
                    </tr>
                    <tr className="bg-slate-50">
                        <th className="border border-slate-900 p-1">सङ्केत नं</th>
                        <th className="border border-slate-900 p-1">सामानको नाम</th>
                        <th className="border border-slate-900 p-1">स्पेसिफिकेसन</th>
                        <th className="border border-slate-900 p-1">पहिचान नं</th>
                        <th className="border border-slate-900 p-1">मोडल</th>
                        <th className="border border-slate-900 p-1">प्राप्ति स्रोत</th>
                        <th className="border border-slate-900 p-1">परिमाण</th>
                        <th className="border border-slate-900 p-1">मिति</th>
                        <th className="border border-slate-900 p-1">बुझ्नेको नाम</th>
                    </tr>
                </thead>
                <tbody>
                    {tableData.length === 0 ? (
                        <tr><td colSpan={16} className="border border-slate-900 p-8 text-slate-400 italic">No records found for this person</td></tr>
                    ) : (
                        tableData.map(row => (
                            <tr key={row.id}>
                                <td className="border border-slate-900 p-1 font-nepali whitespace-nowrap">{row.date}</td>
                                <td className="border border-slate-900 p-1">{row.magFormNo}</td>
                                <td className="border border-slate-900 p-1 font-mono">{row.sanketNo || '-'}</td>
                                <td className="border border-slate-900 p-1 text-left px-1 font-bold">{row.name}</td>
                                <td className="border border-slate-900 p-1 text-left px-1">{row.specification}</td>
                                <td className="border border-slate-900 p-1 font-mono">{row.idNo || '-'}</td>
                                <td className="border border-slate-900 p-1">{row.model || '-'}</td>
                                <td className="border border-slate-900 p-1">{row.source}</td>
                                <td className="border border-slate-900 p-1">{row.unit}</td>
                                <td className="border border-slate-900 p-1 font-bold">{row.quantity}</td>
                                <td className="border border-slate-900 p-1 text-right px-1 font-bold">{row.totalCost.toFixed(2)}</td>
                                <td className="border border-slate-900 p-1 text-[10px]">{row.receiverDate}</td>
                                <td className="border border-slate-900 p-1 font-bold">{row.returnQuantity || ''}</td>
                                <td className="border border-slate-900 p-1 font-nepali">{row.returnDate || ''}</td>
                                <td className="border border-slate-900 p-1 text-[10px]">{row.returnReceiver || ''}</td>
                                <td className="border border-slate-900 p-1"></td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    </div>
  );
};
