
import React, { useState, useMemo } from 'react';
import { Printer, Calendar, FileText, Filter, Package, FilePlus, Save, CheckCircle2 } from 'lucide-react';
import { Select } from './Select';
import { FISCAL_YEARS } from '../constants';
import { InventoryItem, User, MagFormEntry, OrganizationSettings, Store } from '../types';

// Removed missing stores property to fix type mismatch error in Dashboard.tsx
interface InventoryMonthlyReportProps {
  currentFiscalYear: string;
  currentUser: User;
  inventoryItems: InventoryItem[];
  magForms: MagFormEntry[];
  onSaveMagForm: (form: MagFormEntry) => void;
  generalSettings: OrganizationSettings;
}

export const InventoryMonthlyReport: React.FC<InventoryMonthlyReportProps> = ({ 
  currentFiscalYear, inventoryItems, generalSettings, currentUser 
}) => {
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(currentFiscalYear);

  const reportData = useMemo(() => {
    return inventoryItems.filter(i => i.fiscalYear === selectedFiscalYear && i.itemType === 'Expendable')
      .map(item => ({
        ...item,
        quantityToOrder: Math.max(0, (item.approvedStockLevel || 0) - item.currentQuantity)
      }));
  }, [inventoryItems, selectedFiscalYear]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border no-print">
        <Select label="Fiscal Year" options={FISCAL_YEARS} value={selectedFiscalYear} onChange={(e) => setSelectedFiscalYear(e.target.value)} icon={<Calendar size={18} />} />
        <button onClick={() => window.print()} className="px-6 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2"><Printer size={18} /> Print Report</button>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-lg max-w-[297mm] mx-auto min-h-[210mm] font-nepali text-sm">
        <div className="text-center mb-8">
            <h1 className="text-xl font-bold text-red-600">{generalSettings.orgNameNepali}</h1>
            <h2 className="text-lg font-bold underline">जिन्सी मौज्दात तथा निकासा प्रतिवेदन</h2>
        </div>

        <table className="w-full border-collapse border border-slate-900 text-xs">
            <thead>
                <tr className="bg-slate-50">
                    <th className="border border-slate-900 p-1">क्र.सं.</th>
                    <th className="border border-slate-900 p-1">सामानको नाम</th>
                    <th className="border border-slate-900 p-1">जि.खा.पा.नं.</th>
                    <th className="border border-slate-900 p-1">एकाई</th>
                    <th className="border border-slate-900 p-1">हालको मौज्दात</th>
                    <th className="border border-slate-900 p-1">स्वीकृत मौज्दात (ASL)</th>
                    <th className="border border-slate-900 p-1">माग गर्नुपर्ने परिमाण</th>
                </tr>
            </thead>
            <tbody>
                {reportData.map((d, i) => (
                    <tr key={d.id}>
                        <td className="border border-slate-900 p-1 text-center">{i + 1}</td>
                        <td className="border border-slate-900 p-1 px-2">{d.itemName}</td>
                        <td className="border border-slate-900 p-1 text-center">{d.ledgerPageNo || '-'}</td>
                        <td className="border border-slate-900 p-1 text-center">{d.unit}</td>
                        <td className="border border-slate-900 p-1 text-center font-bold">{d.currentQuantity}</td>
                        <td className="border border-slate-900 p-1 text-center">{d.approvedStockLevel || '-'}</td>
                        <td className="border border-slate-900 p-1 text-center font-bold text-blue-700">{d.quantityToOrder || '-'}</td>
                    </tr>
                ))}
            </tbody>
        </table>

        <div className="grid grid-cols-3 gap-8 mt-12">
            <div className="text-center border-t border-slate-800 pt-1">तयार गर्ने</div>
            <div className="text-center border-t border-slate-800 pt-1">शाखा प्रमुख</div>
            <div className="text-center border-t border-slate-800 pt-1">स्वीकृत गर्ने</div>
        </div>
      </div>
    </div>
  );
};