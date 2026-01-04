import React, { useState, useMemo } from 'react';
import { Calendar, Printer, Search, BookOpen, Layers, ShieldCheck } from 'lucide-react';
import { Select } from './Select';
import { SearchableSelect } from './SearchableSelect';
import { InventoryItem, IssueReportEntry, DakhilaPratibedanEntry, ReturnEntry, StockEntryRequest } from '../types/inventoryTypes';
import { OrganizationSettings } from '../types/coreTypes';
import { FISCAL_YEARS } from '../constants';

interface JinshiKhataProps {
  currentFiscalYear: string;
  inventoryItems: InventoryItem[];
  issueReports: IssueReportEntry[];
  dakhilaReports: DakhilaPratibedanEntry[];
  returnEntries: ReturnEntry[];
  stockEntryRequests: StockEntryRequest[];
  generalSettings: OrganizationSettings;
}

interface LedgerRow {
  id: string;
  date: string;
  refNo: string;
  type: 'Opening' | 'Income' | 'Expense';
  specification?: string;
  model?: string;
  serialNo?: string;
  country?: string;
  life?: string;
  source?: string;
  qty: number;
  rate: number;
  total: number;
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

  const itemOptions = useMemo(() => {
    const uniqueNamesMap = new Map<string, { label: string, unit: string, code: string }>();
    
    inventoryItems
        .filter(item => item.itemType === ledgerType)
        .forEach(item => {
            if (!uniqueNamesMap.has(item.itemName.trim())) {
                uniqueNamesMap.set(item.itemName.trim(), {
                    label: `${item.itemName} (${item.unit})`,
                    unit: item.unit,
                    code: item.uniqueCode || item.sanketNo || ''
                });
            }
        });

    return Array.from(uniqueNamesMap.entries()).map(([name, detail]) => ({
        id: name,
        value: name, 
        label: detail.label
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [inventoryItems, ledgerType]);

  const selectedItemDetail = useMemo(() => {
    if (!selectedItemName) return null;
    return inventoryItems.find(i => i.itemName.trim() === selectedItemName.trim() && i.itemType === ledgerType);
  }, [inventoryItems, selectedItemName, ledgerType]);

  const handleTypeToggle = (type: 'Expendable' | 'Non-Expendable') => {
      setLedgerType(type);
      setSelectedItemName('');
  };

  const tableData = useMemo(() => {
    if (!selectedItemName) return [];

    let transactions: any[] = [];
    const safeName = selectedItemName.trim().toLowerCase();

    dakhilaReports.forEach(report => {
        if (report.fiscalYear !== selectedFiscalYear) return;
        report.items.forEach(item => {
            if (item.name.trim().toLowerCase() === safeName) {
                transactions.push({
                    id: `DA-${report.id}-${item.id}`,
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

    stockEntryRequests.forEach(req => {
        if (req.status === 'Approved' && req.fiscalYear === selectedFiscalYear) {
            req.items.forEach(item => {
                if (item.itemName.trim().toLowerCase() === safeName) {
                    transactions.push({
                        id: `SR-${req.id}-${item.id}`,
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

    returnEntries.forEach(entry => {
        if (entry.fiscalYear !== selectedFiscalYear || entry.status !== 'Approved') return;
        entry.items.forEach(item => {
            if (item.name.trim().toLowerCase() === safeName) {
                transactions.push({
                    id: `RET-${entry.id}-${item.id}`,
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
    });

    issueReports.forEach(report => {
        if (report.fiscalYear !== selectedFiscalYear || report.status !== 'Issued') return;
        report.items.forEach(item => {
            if (item.name.trim().toLowerCase() === safeName) {
                transactions.push({
                    id: `ISS-${report.id}-${item.id}`,
                    date: report.issueDate || report.requestDate,
                    refNo: report.issueNo || report.magFormNo, 
                    type: 'Expense',
                    qty: parseFloat(item.quantity as any) || 0,
                    rate: item.rate || 0,
                    remarks: report.demandBy?.name || '',
                    specification: item.specification
                });
            }
        });
    });

    if (transactions.length === 0) {
        const matchingItems = inventoryItems.filter(i => i.itemName.trim().toLowerCase() === safeName && i.itemType === ledgerType);
        if (matchingItems.length > 0) {
            let totalInitQty = 0;
            let weightedVal = 0;
            let latestDate = '';
            let repItem = matchingItems[0];
            matchingItems.forEach(i => {
                totalInitQty += (i.currentQuantity || 0);
                weightedVal += (i.currentQuantity || 0) * (i.rate || 0);
                if (i.lastUpdateDateBs > latestDate) latestDate = i.lastUpdateDateBs;
            });
            if (totalInitQty > 0) {
                transactions.push({
                    id: `STOCK-${safeName}`,
                    date: latestDate || '',
                    refNo: repItem.dakhilaNo || 'Stock',
                    type: 'Opening',
                    qty: totalInitQty,
                    rate: totalInitQty > 0 ? weightedVal / totalInitQty : 0,
                    remarks: 'मौज्दात सूचीबाट',
                    specification: repItem.specification,
                    source: 'System'
                });
            }
        }
    }

    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningQty = 0;
    let runningVal = 0; 
    
    return transactions.map(txn => {
        const txnTotal = txn.qty * txn.rate;
        if (txn.type === 'Income' || txn.type === 'Opening') {
            runningQty += txn.qty;
            runningVal += txnTotal;
        } else {
            runningQty -= txn.qty;
            runningVal -= txnTotal;
        }
        return {
            id: txn.id,
            date: txn.date,
            refNo: txn.refNo,
            type: txn.type,
            qty: txn.qty,
            rate: txn.rate,
            total: txnTotal,
            balQty: runningQty < 0 ? 0 : runningQty,
            balRate: runningQty > 0 ? runningVal / runningQty : 0,
            balTotal: runningVal < 0 ? 0 : runningVal,
            remarks: txn.remarks,
            specification: txn.specification,
            source: txn.source || selectedItemDetail?.receiptSource || ''
        } as LedgerRow;
    });
  }, [selectedItemName, selectedFiscalYear, dakhilaReports, stockEntryRequests, issueReports, returnEntries, selectedItemDetail, ledgerType, inventoryItems]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
        <div className="flex flex-col gap-4 w-full xl:w-auto">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-2 text-slate-700 font-bold font-nepali text-lg">
                    <BookOpen size={24} className="text-primary-600"/>
                    जिन्सी खाता व्यवस्थापन
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button onClick={() => handleTypeToggle('Expendable')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${ledgerType === 'Expendable' ? 'bg-white text-orange-700 shadow-sm ring-1 ring-orange-200' : 'text-slate-500'}`}><Layers size={16} />खर्च हुने</button>
                    <button onClick={() => handleTypeToggle('Non-Expendable')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${ledgerType === 'Non-Expendable' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-200' : 'text-slate-500'}`}><ShieldCheck size={16} />खर्च नहुने</button>
                </div>
            </div>
            <div className="flex flex-wrap items-end gap-4">
                <div className="w-48"><Select label="आर्थिक वर्ष" options={FISCAL_YEARS} value={selectedFiscalYear} onChange={(e) => setSelectedFiscalYear(e.target.value)} icon={<Calendar size={18} />} /></div>
                <div className="w-80">
                    <SearchableSelect 
                        label="सामानको नाम" 
                        options={itemOptions} 
                        value={selectedItemName} 
                        onChange={setSelectedItemName} 
                        icon={<Search size={18} />} 
                    />
                </div>
            </div>
        </div>
        <button onClick={() => window.print()} disabled={!selectedItemName} className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white rounded-lg font-medium disabled:opacity-50"><Printer size={18} /> प्रिन्ट</button>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-lg w-full overflow-x-auto print:shadow-none">
        <div className="text-center mb-8">
            <h1 className="text-xl font-bold text-red-600">{generalSettings.orgNameNepali}</h1>
            <h2 className="text-lg font-bold underline mt-4">{ledgerType === 'Expendable' ? 'जिन्सी मालसामान खाता' : 'सम्पत्ति खाता'}</h2>
        </div>

        <table className="w-full border-collapse border border-slate-800 text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="border border-slate-800 p-2">मिति</th>
              <th className="border border-slate-800 p-2">सन्दर्भ नं</th>
              <th className="border border-slate-800 p-2">विवरण</th>
              <th className="border border-slate-800 p-2">आम्दानी</th>
              <th className="border border-slate-800 p-2">खर्च</th>
              <th className="border border-slate-800 p-2">बाँकी मौज्दात</th>
              <th className="border border-slate-800 p-2">कैफियत</th>
            </tr>
          </thead>
          <tbody>
            {tableData.length > 0 ? (
              tableData.map((row) => (
                <tr key={row.id}>
                  <td className="border border-slate-800 p-2 text-center">{row.date}</td>
                  <td className="border border-slate-800 p-2 text-center">{row.refNo}</td>
                  <td className="border border-slate-800 p-2">{row.type}</td>
                  <td className="border border-slate-800 p-2 text-right">{(row.type === 'Income' || row.type === 'Opening') ? row.qty : '-'}</td>
                  <td className="border border-slate-800 p-2 text-right">{row.type === 'Expense' ? row.qty : '-'}</td>
                  <td className="border border-slate-800 p-2 text-right font-bold">{row.balQty}</td>
                  <td className="border border-slate-800 p-2">{row.remarks}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="border border-slate-800 p-8 text-center text-slate-400">सामान छान्नुहोस्...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
