import React, { useState, useMemo } from 'react';
import { Printer, Calendar, Filter, FileText } from 'lucide-react';
import { Select } from './Select';
import { FISCAL_YEARS } from '../constants';
import { RabiesPatient } from '../types/healthTypes';
import { User } from '../types/coreTypes';

interface RabiesReportProps {
  currentFiscalYear: string;
  currentUser: User;
  patients: RabiesPatient[];
}

export const RabiesReport: React.FC<RabiesReportProps> = ({ currentFiscalYear, currentUser, patients }) => {
  const [selectedMonth, setSelectedMonth] = useState('08');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(currentFiscalYear);

  const nepaliMonthOptions = [
    { id: '01', value: '01', label: 'बैशाख (Baishakh)' },
    { id: '02', value: '02', label: 'जेठ (Jestha)' },
    { id: '03', value: '03', label: 'असार (Ashad)' },
    { id: '04', value: '04', label: 'साउन (Shrawan)' },
    { id: '05', value: '05', label: 'भदौ (Bhadra)' },
    { id: '06', value: '06', label: 'असोज (Ashwin)' },
    { id: '07', value: '07', label: 'कार्तिक (Kartik)' },
    { id: '08', value: '08', label: 'मंसिर (Mangsir)' },
    { id: '09', value: '09', label: 'पुष (Poush)' },
    { id: '10', value: '10', label: 'माघ (Magh)' },
    { id: '11', value: '11', label: 'फागुन (Falgun)' },
    { id: '12', value: '12', label: 'चैत्र (Caitra)' },
  ];

  const reportData = useMemo(() => {
    return patients
      .filter(p => p.fiscalYear === selectedFiscalYear && p.regMonth === selectedMonth)
      .sort((a, b) => a.regNo.localeCompare(b.regNo));
  }, [patients, selectedFiscalYear, selectedMonth]);

  const totalPatients = reportData.length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
        <div className="flex flex-wrap gap-4">
          <div className="w-40">
            <Select label="आर्थिक वर्ष" options={FISCAL_YEARS} value={selectedFiscalYear} onChange={(e) => setSelectedFiscalYear(e.target.value)} icon={<Calendar size={18} />} />
          </div>
          <div className="w-48">
            <Select label="महिना" options={nepaliMonthOptions} value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} icon={<Filter size={18} />} />
          </div>
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white rounded-lg font-medium"><Printer size={18} /> प्रिन्ट</button>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-lg w-full overflow-x-auto print:shadow-none print:p-0">
        <div className="hidden print:block text-center mb-8">
          <h1 className="text-xl font-bold text-red-600">{currentUser.organizationName}</h1>
          <h2 className="text-lg font-bold">रेबिज खोप मासिक प्रतिवेदन</h2>
          <p className="text-sm">आर्थिक वर्ष: {selectedFiscalYear}, महिना: {nepaliMonthOptions.find(m => m.value === selectedMonth)?.label}</p>
        </div>

        <table className="w-full border-collapse border border-slate-900 text-xs">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-900 p-2">क्र.सं.</th>
              <th className="border border-slate-900 p-2">दर्ता नं</th>
              <th className="border border-slate-900 p-2">बिरामीको नाम</th>
              <th className="border border-slate-900 p-2">उमेर/लिङ्ग</th>
              <th className="border border-slate-900 p-2">ठेगाना</th>
              <th className="border border-slate-900 p-2">जनावर</th>
              <th className="border border-slate-900 p-2">स्थिति (D0, D3, D7)</th>
              <th className="border border-slate-900 p-2">कैफियत</th>
            </tr>
          </thead>
          <tbody>
            {reportData.map((p, idx) => (
              <tr key={p.id}>
                <td className="border border-slate-900 p-2 text-center">{idx + 1}</td>
                <td className="border border-slate-900 p-2 font-mono">{p.regNo}</td>
                <td className="border border-slate-900 p-2">{p.name}</td>
                <td className="border border-slate-900 p-2 text-center">{p.age}/{p.sex.charAt(0)}</td>
                <td className="border border-slate-900 p-2">{p.address}</td>
                <td className="border border-slate-900 p-2">{p.animalType}</td>
                <td className="border border-slate-900 p-2 text-center">
                    {p.schedule.map(d => `${d.day}:${d.status === 'Given' ? 'Y' : 'N'}`).join(', ')}
                </td>
                <td className="border border-slate-900 p-2">{p.bodyPart}</td>
              </tr>
            ))}
            {totalPatients === 0 && (
              <tr><td colSpan={8} className="p-8 text-center text-slate-400">डाटा फेला परेन।</td></tr>
            )}
          </tbody>
        </table>

        <div className="hidden print:grid grid-cols-3 gap-8 mt-16 text-center text-sm">
            <div className="border-t border-slate-800 pt-2">तयार गर्ने</div>
            <div className="border-t border-slate-800 pt-2">प्रमाणित गर्ने</div>
            <div className="border-t border-slate-800 pt-2">स्वीकृत गर्ने</div>
        </div>
      </div>
    </div>
  );
};