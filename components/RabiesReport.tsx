import React, { useState, useMemo } from 'react';
import { Printer, Calendar, Calculator, Filter, Package, Info } from 'lucide-react';
import { Select } from './Select';
import { Input } from './Input';
import { FISCAL_YEARS } from '../constants';
import { RabiesPatient } from '../types'; 

interface RabiesReportProps {
  currentFiscalYear: string;
  currentUser: { organizationName: string; fullName: string; };
  patients: RabiesPatient[];
  // Removed TB Patients props as they are not used in RabiesReport
  // tbPatients: TBPatient[];
  // onUpdateTbPatient: (patient: TBPatient) => void;
}

export const RabiesReport: React.FC<RabiesReportProps> = ({ currentFiscalYear, currentUser, patients }) => {
  const [selectedMonth, setSelectedMonth] = useState('08');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(currentFiscalYear);
  const [stockData, setStockData] = useState({ opening: 0, received: 0, expenditure: 0 });

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
    { id: '12', value: '12', label: 'चैत्र (Chaitra)' },
  ];

  const animals = [
    'Dog bite', 'Monkey bite', 'Cat bite', 'Cattle bite', 'Rodent bite', 
    'Jackal bite', 'Tiger bite', 'Bear bite', 'Saliva contact', 'Other specify'
  ];

  const rowLabels = [
    'Male (15+Yr)',
    'Female (15+Yr)',
    'Male Child (<15 Yr)',
    'Female Child (<15 Yr)'
  ];

  const generatedMatrix = useMemo(() => {
    const mat = Array(4).fill(0).map(() => Array(10).fill(0));
    const filteredData = patients.filter(p => 
        p.fiscalYear === selectedFiscalYear && p.regMonth === selectedMonth
    );

    filteredData.forEach(p => {
        let rowIndex = -1;
        const ageNum = parseInt(p.age) || 0;
        if (p.sex === 'Male') {
            rowIndex = ageNum < 15 ? 2 : 0;
        } else if (p.sex === 'Female') {
            rowIndex = ageNum < 15 ? 3 : 1;
        }

        let colIndex = -1;
        switch(p.animalType) {
            case 'Dog bite': colIndex = 0; break;
            case 'Monkey bite': colIndex = 1; break;
            case 'Cat bite': colIndex = 2; break;
            case 'Cattle bite': colIndex = 3; break;
            case 'Rodent bite': colIndex = 4; break;
            case 'Jackal bite': colIndex = 5; break;
            case 'Tiger bite': colIndex = 6; break;
            case 'Bear bite': colIndex = 7; break;
            case 'Saliva contact': colIndex = 8; break;
            default: colIndex = 9;
        }

        if (rowIndex !== -1 && colIndex !== -1) {
            mat[rowIndex][colIndex]++;
        }
    });
    return mat;
  }, [patients, selectedFiscalYear, selectedMonth]);

  const getRowTotal = (rowIndex: number) => generatedMatrix[rowIndex].reduce((a, b) => a + b, 0);
  const getColTotal = (colIndex: number) => generatedMatrix.reduce((sum, row) => sum + row[colIndex], 0);
  const grandTotalCases = generatedMatrix.flat().reduce((a, b) => a + b, 0);
  const balanceDose = stockData.opening + stockData.received - stockData.expenditure;

  const handleStockChange = (field: keyof typeof stockData, value: string) => {
      const num = parseInt(value) || 0;
      setStockData(prev => ({ ...prev, [field]: num }));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Landscape Print Helper CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: landscape; margin: 1cm; }
          .print-container { width: 100% !important; max-width: none !important; border: none !important; padding: 0 !important; }
          .no-print { display: none !important; }
        }
      ` }} />

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm no-print space-y-6">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="flex items-end gap-4 w-full md:w-auto">
                <div className="w-48">
                    <Select label="आर्थिक वर्ष" options={FISCAL_YEARS} value={selectedFiscalYear} onChange={(e) => setSelectedFiscalYear(e.target.value)} icon={<Calendar size={18} />} />
                </div>
                <div className="w-48">
                    <Select label="महिना" options={nepaliMonthOptions} value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} icon={<Filter size={18} />} />
                </div>
            </div>
            <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-bold shadow-md transition-all active:scale-95">
                <Printer size={18} /> रिपोर्ट प्रिन्ट गर्नुहोस्
            </button>
         </div>

         {/* Editable Stock Data Section */}
         <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-indigo-700 font-bold mb-2">
                <Package size={20} />
                <h3 className="font-nepali">खोप मौज्दात विवरण (Vaccine Stock Management)</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Input 
                    label="अघिल्लो बाँकी (Prev Balance)" 
                    type="number" 
                    value={stockData.opening || ''} 
                    onChange={(e) => handleStockChange('opening', e.target.value)}
                    placeholder="0"
                />
                <Input 
                    label="प्राप्त परिमाण (Received)" 
                    type="number" 
                    value={stockData.received || ''} 
                    onChange={(e) => handleStockChange('received', e.target.value)}
                    placeholder="0"
                />
                <Input 
                    label="खपत परिमाण (Doses Used)" 
                    type="number" 
                    value={stockData.expenditure || ''} 
                    onChange={(e) => handleStockChange('expenditure', e.target.value)}
                    placeholder="0"
                />
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">बाँकी मौज्दात (Remaining)</label>
                    <div className={`h-[42px] flex items-center px-4 rounded-lg border font-bold text-lg ${balanceDose < 0 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                        {balanceDose}
                    </div>
                </div>
            </div>
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <Info size={12} /> यो विवरण रिपोर्टको अन्तिम लहर (Total Row) मा देखिनेछ।
            </p>
         </div>
      </div>

      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-lg overflow-x-auto print-container">
        <div className="text-center space-y-1 mb-6 font-bold text-slate-900">
            <h4 className="text-xs uppercase">NG/MOH</h4>
            <h3 className="text-sm uppercase">EPIDEMIOLOGY AND DISEASE CONTROL DIVISION</h3>
            <h2 className="text-lg uppercase">MONTHLY RECORDS OF POST EXPOSURE TREATMENT OF RABIES IN HUMANS</h2>
            <div className="flex justify-between items-center mt-6 pt-4 px-4 text-xs font-bold uppercase tracking-wider">
                <span>Institution: <span className="underline">{currentUser.organizationName}</span></span>
                <span>Month: <span className="underline">{nepaliMonthOptions.find(m => m.value === selectedMonth)?.label}</span></span>
                <span>Year: <span className="underline">{selectedFiscalYear}</span></span>
            </div>
        </div>

        <table className="w-full text-[10px] border-collapse border border-slate-800 text-center">
            <thead>
                <tr className="bg-slate-100 font-bold">
                    <th className="border border-slate-800 p-2" rowSpan={2}>Description</th>
                    <th className="border border-slate-800 p-2" colSpan={10}>Source of Exposure</th>
                    <th className="border border-slate-800 p-2" rowSpan={2}>Total</th>
                    <th className="border border-slate-800 p-2" rowSpan={2}>Prev Balance</th>
                    <th className="border border-slate-800 p-2" rowSpan={2}>Received</th>
                    <th className="border border-slate-800 p-2" rowSpan={2}>Doses Used</th>
                    <th className="border border-slate-800 p-2" rowSpan={2}>Remaining</th>
                </tr>
                <tr className="bg-slate-50">
                    {animals.map((a, i) => <th key={i} className="border border-slate-800 p-1 text-[9px] font-bold">{a}</th>)}
                </tr>
            </thead>
            <tbody>
                {rowLabels.map((label, rIndex) => (
                    <tr key={rIndex} className="hover:bg-slate-50">
                        <td className="border border-slate-800 p-2 text-left font-bold bg-slate-50/30">{label}</td>
                        {generatedMatrix[rIndex].map((val, cIndex) => (
                            <td key={cIndex} className={`border border-slate-800 p-1 ${val > 0 ? 'font-bold text-slate-900' : 'text-slate-300'}`}>
                                {val || '-'}
                            </td>
                        ))}
                        <td className="border border-slate-800 font-black bg-slate-100/50">{getRowTotal(rIndex)}</td>
                        <td className="border border-slate-800 bg-slate-100/20"></td>
                        <td className="border border-slate-800 bg-slate-100/20"></td>
                        <td className="border border-slate-800 bg-slate-100/20"></td>
                        <td className="border border-slate-800 bg-slate-100/20"></td>
                    </tr>
                ))}
                <tr className="font-bold bg-slate-100">
                    <td className="border border-slate-800 p-2 text-left uppercase">TOTAL CASES</td>
                    {animals.map((_, i) => <td key={i} className="border border-slate-800 p-1">{getColTotal(i)}</td>)}
                    <td className="border border-slate-800 p-1 text-lg">{grandTotalCases}</td>
                    <td className="border border-slate-800 p-1 text-base">{stockData.opening || '-'}</td>
                    <td className="border border-slate-800 p-1 text-base">{stockData.received || '-'}</td>
                    <td className="border border-slate-800 p-1 text-base">{stockData.expenditure || '-'}</td>
                    <td className={`border border-slate-800 p-1 text-base ${balanceDose < 0 ? 'text-red-600' : 'text-indigo-700'}`}>{balanceDose}</td>
                </tr>
            </tbody>
        </table>

        <div className="mt-16 grid grid-cols-2 gap-40 px-10">
            <div className="text-center">
                <div className="border-t border-slate-800 pt-3 font-bold text-sm uppercase">Prepared By</div>
                <div className="text-xs mt-1">{currentUser.fullName}</div>
                <div className="text-[10px] text-slate-500 uppercase mt-0.5">Signature & Designation</div>
            </div>
            <div className="text-center">
                <div className="border-t border-slate-800 pt-3 font-bold text-sm uppercase">Approved By</div>
                <div className="text-xs mt-1">Medical Officer / In-Charge</div>
                <div className="text-[10px] text-slate-500 uppercase mt-0.5">Stamp & Signature</div>
            </div>
        </div>
      </div>
    </div>
  );
};