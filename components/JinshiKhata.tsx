
import React, { useState, useMemo } from 'react';
import { Calendar, Printer, Search, BookOpen, Layers, ShieldCheck } from 'lucide-react';
import { Select } from './Select';
import { SearchableSelect } from './SearchableSelect';
import { InventoryItem, IssueReportEntry, DakhilaPratibedanEntry, ReturnEntry, OrganizationSettings, StockEntryRequest } from '../types';
import { FISCAL_YEARS } from '../constants';

interface JinshiKhataProps {
  currentFiscalYear: string;
  inventoryItems: InventoryItem[];
  issueReports: IssueReportEntry[];
  dakhilaReports: DakhilaPratibedanEntry[];
  returnEntries: ReturnEntry[];
  stockEntryRequests: StockEntryRequest[]; // Added missing prop
  generalSettings: OrganizationSettings;
}

// Transaction Row Structure
interface LedgerRow {
  id: string;
  date: string;
  refNo: string; // Dakhila No or Nikasha No
  type: 'Opening' | 'Income' | 'Expense';
  
  // Item Details (Mostly for Non-Expendable)
  specification?: string;
  model?: string;
  serialNo?: string;
  country?: string;
  life?: string;
  source?: string;

  // Amounts
  qty: number;
  rate: number;
  total: number;

  // Running Balances
  balQty: number;
  balRate: number;
  balTotal: number;

  remarks: string;
}

export const JinshiKhata: React.FC<JinshiKhataProps> = ({
  currentFiscalYear,
  inventoryItems,
  issueReports,
  dakhilaReports,
  returnEntries,
  stockEntryRequests = [],
  generalSettings
}) => {
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(currentFiscalYear);
  const [selectedItemName, setSelectedItemName] = useState<string>('');
  const [ledgerType, setLedgerType] = useState<'Expendable' | 'Non-Expendable'>('Expendable');

  // 1. Get Item Options based on Active Ledger Type
  const itemOptions = useMemo(() => {
    return inventoryItems
        .filter(item => item.itemType === ledgerType)
        .map(item => ({
            id: item.id,
            value: item.itemName, 
            label: `${item.itemName} (${item.unit})`
        })).sort((a, b) => a.label.localeCompare(b.label));
  }, [inventoryItems, ledgerType]);

  // 2. Find selected item details
  const selectedItemDetail = useMemo(() => {
    if (!selectedItemName) return null;
    return inventoryItems.find(i => i.itemName === selectedItemName && i.itemType === ledgerType);
  }, [inventoryItems, selectedItemName, ledgerType]);

  // Reset selection when toggling type
  const handleTypeToggle = (type: 'Expendable' | 'Non-Expendable') => {
      setLedgerType(type);
      setSelectedItemName('');
  };

  // 3. GENERATE LEDGER DATA
  const tableData = useMemo(() => {
    if (!selectedItemName) return [];

    let transactions: any[] = [];
    const safeName = selectedItemName.trim().toLowerCase();

    // A. Add Entries from Dakhila Pratibedan (INCOME)
    dakhilaReports.forEach(report => {
        if (report.fiscalYear !== selectedFiscalYear) return;
        report.items.forEach(item => {
            if (item.name.trim().toLowerCase() === safeName) {
                transactions.push({
                    id: `DAKHILA-${report.id}-${item.id}`,
                    date: report.date,
                    refNo: report.dakhilaNo, 
                    type: item.source === 'Opening' ? 'Opening' : 'Income',
                    qty: item.quantity,
                    rate: item.rate,
                    remarks: item.remarks || report.orderNo || '',
                    specification: item.specification,
                    source: item.source
                });
            }
        });
    });

    // NEW: B. Add Entries from Approved Stock Requests (INCOME)
    stockEntryRequests.forEach(req => {
        if (req.status === 'Approved' && req.fiscalYear === selectedFiscalYear) {
            req.items.forEach(item => {
                if (item.itemName.trim().toLowerCase() === safeName) {
                    transactions.push({
                        id: `STKREQ-${req.id}-${item.id}`,
                        date: req.requestDateBs,
                        refNo: item.dakhilaNo || 'REQ-' + req.id.slice(-4),
                        type: req.mode === 'opening' ? 'Opening' : 'Income',
                        qty: item.currentQuantity,
                        rate: item.rate || 0,
                        remarks: item.remarks || req.receiptSource || '',
                        specification: item.specification,
                        source: req.receiptSource
                    });
                }
            });
        }
    });

    // C. Add Returns (INCOME)
    returnEntries.forEach(entry => {
        if (entry.fiscalYear !== selectedFiscalYear) return;
        if (entry.status === 'Approved') {
            entry.items.forEach(item => {
                if (item.name.trim().toLowerCase() === safeName) {
                    transactions.push({
                        id: `RETURN-${entry.id}-${item.id}`,
                        date: entry.date,
                        refNo: entry.formNo,
                        type: 'Income',
                        qty: item.quantity,
                        rate: item.rate,
                        remarks: `Returned by ${entry.returnedBy.name}`,
                        specification: item.specification,
                        source: 'Return'
                    });
                }
            });
        }
    });

    // D. Add Issues (EXPENSE)
    issueReports.forEach(report => {
        if (report.fiscalYear !== selectedFiscalYear) return;
        if (report.status === 'Issued') {
            report.items.forEach(item => {
                if (item.name.trim().toLowerCase() === safeName) {
                    transactions.push({
                        id: `ISSUE-${report.id}-${item.id}`,
                        date: report.issueDate || report.requestDate,
                        refNo: report.issueNo || report.magFormNo, 
                        type: 'Expense',
                        qty: parseFloat(item.quantity) || 0,
                        rate: item.rate || 0,
                        remarks: report.demandBy?.name || '',
                        specification: item.specification
                    });
                }
            });
        }
    });

    // E. Sort by Date
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // F. Calculate Running Balance
    let runningQty = 0;
    let runningVal = 0; 
    
    const rows: LedgerRow[] = transactions.map(txn => {
        const txnTotal = txn.qty * txn.rate;

        if (txn.type === 'Income' || txn.type === 'Opening') {
            runningQty += txn.qty;
            runningVal += txnTotal;
        } else {
            runningQty -= txn.qty;
            runningVal -= txnTotal;
        }

        if (runningQty < 0) runningQty = 0;
        if (runningVal < 0) runningVal = 0;

        const balRate = runningQty > 0 ? runningVal / runningQty : 0;

        return {
            id: txn.id,
            date: txn.date,
            refNo: txn.refNo,
            type: txn.type,
            qty: txn.qty,
            rate: txn.rate,
            total: txnTotal,
            balQty: runningQty,
            balRate: balRate,
            balTotal: runningVal,
            remarks: txn.remarks,
            specification: txn.specification,
            model: selectedItemDetail?.uniqueCode || '', 
            serialNo: selectedItemDetail?.sanketNo || '',
            source: txn.source || selectedItemDetail?.receiptSource || '',
            country: '',
            life: ''
        };
    });

    return rows;

  }, [selectedItemName, selectedFiscalYear, dakhilaReports, stockEntryRequests, issueReports, returnEntries, selectedItemDetail, ledgerType]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
        <div className="flex flex-col gap-4 w-full xl:w-auto">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-2 text-slate-700 font-bold font-nepali text-lg">
                    <BookOpen size={24} className="text-primary-600"/>
                    जिन्सी खाता
                </div>
                
                {/* Toggle Switch */}
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => handleTypeToggle('Expendable')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                            ledgerType === 'Expendable' 
                            ? 'bg-white text-orange-700 shadow-sm ring-1 ring-orange-200' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Layers size={16} />
                        खर्च भएर जाने
                    </button>
                    <button
                        onClick={() => handleTypeToggle('Non-Expendable')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                            ledgerType === 'Non-Expendable' 
                            ? 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-200' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <ShieldCheck size={16} />
                        खर्च भएर नजाने
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap items-end gap-4">
                <div className="w-48">
                    <Select 
                        label="आर्थिक वर्ष"
                        options={FISCAL_YEARS}
                        value={selectedFiscalYear}
                        onChange={(e) => setSelectedFiscalYear(e.target.value)}
                        icon={<Calendar size={18} />}
                    />
                </div>
                <div className="w-80">
                    <SearchableSelect 
                        label="सामान छान्नुहोस्"
                        options={itemOptions}
                        value={selectedItemName}
                        onChange={(val) => setSelectedItemName(val)}
                        placeholder={itemOptions.length === 0 ? "No items in this category" : "Search item..."}
                        icon={<Search size={18} />}
                    />
                </div>
            </div>
        </div>

        <div>
            <button 
                onClick={() => window.print()}
                disabled={!selectedItemName}
                className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white hover:bg-slate-900 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Printer size={18} /> प्रिन्ट (Print)
            </button>
        </div>
      </div>

      {/* Report Container */}
      <div className="bg-white p-4 md:p-8 rounded-xl shadow-lg w-full overflow-x-auto print:shadow-none print:p-0 print:max-w-none">
        
        {/* Header Section */}
        <div className="mb-4">
            <div className="text-right text-xs font-bold mb-2">
                {ledgerType === 'Expendable' ? 'म.ले.प.फारम नं: ४०७' : 'म.ले.प.फारम नं: ४०८'}
            </div>
            
            <div className="flex items-start justify-between">
                <div className="w-24 pt-2 hidden md:block">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png" alt="Emblem" className="h-20 w-20 object-contain"/>
                </div>
                <div className="flex-1 text-center space-y-1">
                    <h1 className="text-xl font-bold text-red-600">{generalSettings.orgNameNepali}</h1>
                    {generalSettings.subTitleNepali && <h2 className="text-lg font-bold">{generalSettings.subTitleNepali}</h2>}
                    {generalSettings.subTitleNepali2 && <h3 className="text-base font-bold">{generalSettings.subTitleNepali2}</h3>}
                    {generalSettings.subTitleNepali3 && <h3 className="text-lg font-bold">{generalSettings.subTitleNepali3}</h3>}
                </div>
                <div className="w-24 hidden md:block"></div> 
            </div>
            
            <div className="text-center mt-4">
                <h2 className="text-xl font-bold underline underline-offset-4">
                    {ledgerType === 'Expendable' 
                        ? 'जिन्सी मालसामान खाता (खर्च भएर जाने)' 
                        : 'सम्पत्ति खाता (खर्च भएर नजाने)'}
                </h2>
            </div>
        </div>

        {/* Item Details Header */}
        <div className="mb-4 flex flex-wrap justify-between items-end gap-4 text-sm font-medium">
            <div className="space-y-1">
                <div className="flex gap-2">
                    <span>जिन्सी मालसामानको नाम:</span>
                    <span className="font-bold border-b border-dotted border-slate-800 min-w-[200px] px-2">{selectedItemDetail?.itemName}</span>
                </div>
                {ledgerType === 'Expendable' && (
                    <div className="flex gap-2">
                        <span>स्पेसिफिकेसन:</span>
                        <span className="border-b border-dotted border-slate-800 min-w-[200px] px-2">{selectedItemDetail?.specification || '-'}</span>
                    </div>
                )}
                <div className="flex gap-2">
                    <span>एकाई:</span>
                    <span className="border-b border-dotted border-slate-800 min-w-[100px] px-2">{selectedItemDetail?.unit}</span>
                </div>
            </div>
            <div className="space-y-1 text-right">
                <div className="flex justify-end gap-2">
                    <span>आर्थिक वर्ष:</span>
                    <span className="font-bold border-b border-dotted border-slate-800 min-w-[100px] text-center">{selectedFiscalYear}</span>
                </div>
                <div className="flex justify-end gap-2">
                    <span>सङ्केत नं:</span>
                    <span className="border-b border-dotted border-slate-800 min-w-[100px] text-center">{selectedItemDetail?.sanketNo || '-'}</span>
                </div>
            </div>
        </div>

        {/* --- EXPENDABLE TABLE (Form 407) --- */}
        {ledgerType === 'Expendable' && (
            <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-900 text-center text-[11px]">
                    <thead>
                        <tr className="bg-slate-50">
                            <th className="border border-slate-900 p-1" rowSpan={2} style={{width: '80px'}}>मिति</th>
                            <th className="border border-slate-900 p-1" rowSpan={2} style={{width: '100px'}}>दाखिला/निकासा<br/>फारम नं.</th>
                            
                            <th className="border border-slate-900 p-1" colSpan={3}>गत आ.व.को बाँकी (अ.ल्या.)</th>
                            <th className="border border-slate-900 p-1" colSpan={3}>स्टोर दाखिला (आम्दानी)</th>
                            <th className="border border-slate-900 p-1" colSpan={3}>निकासा (खर्च)</th>
                            <th className="border border-slate-900 p-1" colSpan={3}>बाँकी</th>
                            
                            <th className="border border-slate-900 p-1" rowSpan={2}>कैफियत</th>
                        </tr>
                        <tr className="bg-slate-50">
                            {/* Opening */}
                            <th className="border border-slate-900 p-1">परिमाण</th>
                            <th className="border border-slate-900 p-1">दर</th>
                            <th className="border border-slate-900 p-1">रकम</th>
                            {/* Income */}
                            <th className="border border-slate-900 p-1">परिमाण</th>
                            <th className="border border-slate-900 p-1">दर</th>
                            <th className="border border-slate-900 p-1">रकम</th>
                            {/* Expense */}
                            <th className="border border-slate-900 p-1">परिमाण</th>
                            <th className="border border-slate-900 p-1">दर</th>
                            <th className="border border-slate-900 p-1">रकम</th>
                            {/* Balance */}
                            <th className="border border-slate-900 p-1">परिमाण</th>
                            <th className="border border-slate-900 p-1">दर</th>
                            <th className="border border-slate-900 p-1">रकम</th>
                        </tr>
                        <tr className="bg-slate-100 text-[10px]">
                            {[...Array(14)].map((_, i) => <th key={i} className="border border-slate-900">{i+1}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.length === 0 ? (
                            <tr><td colSpan={14} className="border border-slate-900 p-8 text-slate-400 italic">No transactions found</td></tr>
                        ) : (
                            tableData.map((row) => (
                                <tr key={row.id}>
                                    <td className="border border-slate-900 p-1 font-nepali whitespace-nowrap">{row.date}</td>
                                    <td className="border border-slate-900 p-1">{row.refNo}</td>
                                    
                                    <td className="border border-slate-900 p-1">{row.type === 'Opening' ? row.qty : ''}</td>
                                    <td className="border border-slate-900 p-1">{row.type === 'Opening' ? row.rate : ''}</td>
                                    <td className="border border-slate-900 p-1">{row.type === 'Opening' ? row.total.toFixed(2) : ''}</td>

                                    <td className="border border-slate-900 p-1">{row.type === 'Income' ? row.qty : ''}</td>
                                    <td className="border border-slate-900 p-1">{row.type === 'Income' ? row.rate : ''}</td>
                                    <td className="border border-slate-900 p-1">{row.type === 'Income' ? row.total.toFixed(2) : ''}</td>

                                    <td className="border border-slate-900 p-1 text-red-600">{row.type === 'Expense' ? row.qty : ''}</td>
                                    <td className="border border-slate-900 p-1">{row.type === 'Expense' ? row.rate : ''}</td>
                                    <td className="border border-slate-900 p-1">{row.type === 'Expense' ? row.total.toFixed(2) : ''}</td>

                                    <td className="border border-slate-900 p-1 font-bold bg-slate-50">{row.balQty}</td>
                                    <td className="border border-slate-900 p-1 bg-slate-50">{row.balRate ? row.balRate.toFixed(2) : ''}</td>
                                    <td className="border border-slate-900 p-1 bg-slate-50">{row.balTotal.toFixed(2)}</td>

                                    <td className="border border-slate-900 p-1 text-left px-1 text-[10px]">{row.remarks}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        )}

        {/* --- NON-EXPENDABLE TABLE (Form 408) --- */}
        {ledgerType === 'Non-Expendable' && (
            <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-900 text-center text-[11px]">
                    <thead>
                        <tr className="bg-slate-50">
                            <th className="border border-slate-900 p-1" rowSpan={2} style={{width: '70px'}}>मिति</th>
                            <th className="border border-slate-900 p-1" rowSpan={2}>दाखिला/<br/>हस्तान्तरण नं.</th>
                            
                            <th className="border border-slate-900 p-1" colSpan={6}>सम्पत्तिको विवरण</th>
                            <th className="border border-slate-900 p-1" colSpan={3}>आम्दानी</th>
                            <th className="border border-slate-900 p-1" colSpan={3}>हस्तान्तरण/निसर्ग (खर्च)</th>
                            <th className="border border-slate-900 p-1" colSpan={3}>बाँकी</th>
                            
                            <th className="border border-slate-900 p-1" rowSpan={2}>कैफियत</th>
                        </tr>
                        <tr className="bg-slate-50">
                            <th className="border border-slate-900 p-1">स्पेसिफिकेसन</th>
                            <th className="border border-slate-900 p-1">मोडल</th>
                            <th className="border border-slate-900 p-1">पहिचान नं</th>
                            <th className="border border-slate-900 p-1">देश/कम्पनी</th>
                            <th className="border border-slate-900 p-1">आयु</th>
                            <th className="border border-slate-900 p-1">स्रोत</th>
                            
                            <th className="border border-slate-900 p-1">परिमाण</th>
                            <th className="border border-slate-900 p-1">दर</th>
                            <th className="border border-slate-900 p-1">मूल्य</th>
                            
                            <th className="border border-slate-900 p-1">परिमाण</th>
                            <th className="border border-slate-900 p-1">दर</th>
                            <th className="border border-slate-900 p-1">मूल्य</th>
                            
                            <th className="border border-slate-900 p-1">परिमाण</th>
                            <th className="border border-slate-900 p-1">दर</th>
                            <th className="border border-slate-900 p-1">मूल्य</th>
                        </tr>
                        <tr className="bg-slate-100 text-[10px]">
                            {[...Array(18)].map((_, i) => <th key={i} className="border border-slate-900">{i+1}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.length === 0 ? (
                            <tr><td colSpan={18} className="border border-slate-900 p-8 text-slate-400 italic">No transactions found</td></tr>
                        ) : (
                            tableData.map((row) => (
                                <tr key={row.id}>
                                    <td className="border border-slate-900 p-1 font-nepali whitespace-nowrap">{row.date}</td>
                                    <td className="border border-slate-900 p-1">{row.refNo}</td>
                                    
                                    <td className="border border-slate-900 p-1 text-left px-1">{row.specification || '-'}</td>
                                    <td className="border border-slate-900 p-1">{row.model || '-'}</td>
                                    <td className="border border-slate-900 p-1">{row.serialNo || '-'}</td>
                                    <td className="border border-slate-900 p-1">{row.country || '-'}</td>
                                    <td className="border border-slate-900 p-1">{row.life || '-'}</td>
                                    <td className="border border-slate-900 p-1">{row.source || '-'}</td>

                                    <td className="border border-slate-900 p-1">{(row.type === 'Income' || row.type === 'Opening') ? row.qty : ''}</td>
                                    <td className="border border-slate-900 p-1">{(row.type === 'Income' || row.type === 'Opening') ? row.rate : ''}</td>
                                    <td className="border border-slate-900 p-1">{(row.type === 'Income' || row.type === 'Opening') ? row.total.toFixed(2) : ''}</td>

                                    <td className="border border-slate-900 p-1 text-red-600">{row.type === 'Expense' ? row.qty : ''}</td>
                                    <td className="border border-slate-900 p-1">{row.type === 'Expense' ? row.rate : ''}</td>
                                    <td className="border border-slate-900 p-1">{row.type === 'Expense' ? row.total.toFixed(2) : ''}</td>

                                    <td className="border border-slate-900 p-1 font-bold bg-slate-50">{row.balQty}</td>
                                    <td className="border border-slate-900 p-1 bg-slate-50">{row.balRate ? row.balRate.toFixed(2) : ''}</td>
                                    <td className="border border-slate-900 p-1 bg-slate-50">{row.balTotal.toFixed(2)}</td>

                                    <td className="border border-slate-900 p-1 text-left px-1 text-[10px]">{row.remarks}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        )}

        {/* Footer */}
        <div className="flex justify-between mt-12 text-sm font-medium">
            <div className="text-center pt-8 border-t border-slate-400 w-48">तयार गर्ने</div>
            <div className="text-center pt-8 border-t border-slate-400 w-48">प्रमाणित गर्ने</div>
        </div>

      </div>
    </div>
  );
};
