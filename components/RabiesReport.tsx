
import React, { useState, useMemo } from 'react';
import { Printer, Calendar, Filter, FileText, Info, CheckSquare } from 'lucide-react';
import { Select } from './Select';
import { Input } from './Input';
import { FISCAL_YEARS } from '../constants';
import { RabiesPatient } from '../types/healthTypes';
import { User } from '../types/coreTypes';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface RabiesReportProps {
  currentFiscalYear: string;
  currentUser: User;
  patients: RabiesPatient[];
}

interface AnimalStats {
  dog: number;
  monkey: number;
  cat: number;
  cattle: number;
  rodent: number;
  jackal: number;
  tiger: number;
  bear: number;
  saliva: number;
  other: number;
  total: number;
}

export const RabiesReport: React.FC<RabiesReportProps> = ({ currentFiscalYear, currentUser, patients }) => {
  const [selectedMonth, setSelectedMonth] = useState(new NepaliDate().format('MM'));
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(currentFiscalYear);

  // Vaccine stock inputs for the report
  const [stockData, setStockData] = useState({
    opening: '0',
    received: '0',
    expenditure: '0'
  });

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

  const reportSummary = useMemo(() => {
    const categories: Record<string, AnimalStats> = {
      'Male (15+Yr)': { dog: 0, monkey: 0, cat: 0, cattle: 0, rodent: 0, jackal: 0, tiger: 0, bear: 0, saliva: 0, other: 0, total: 0 },
      'Female (15+Yr)': { dog: 0, monkey: 0, cat: 0, cattle: 0, rodent: 0, jackal: 0, tiger: 0, bear: 0, saliva: 0, other: 0, total: 0 },
      'Male Child (<15 Yr)': { dog: 0, monkey: 0, cat: 0, cattle: 0, rodent: 0, jackal: 0, tiger: 0, bear: 0, saliva: 0, other: 0, total: 0 },
      'Female Child (<15 Yr)': { dog: 0, monkey: 0, cat: 0, cattle: 0, rodent: 0, jackal: 0, tiger: 0, bear: 0, saliva: 0, other: 0, total: 0 },
      'TOTAL': { dog: 0, monkey: 0, cat: 0, cattle: 0, rodent: 0, jackal: 0, tiger: 0, bear: 0, saliva: 0, other: 0, total: 0 },
    };

    patients
      .filter(p => p.fiscalYear === selectedFiscalYear && p.regMonth === selectedMonth)
      .forEach(p => {
        let category: string;
        const age = parseInt(p.age) || 0;

        if (p.sex === 'Male' && age >= 15) category = 'Male (15+Yr)';
        else if (p.sex === 'Female' && age >= 15) category = 'Female (15+Yr)';
        else if (p.sex === 'Male' && age < 15) category = 'Male Child (<15 Yr)';
        else if (p.sex === 'Female' && age < 15) category = 'Female Child (<15 Yr)';
        else return;

        let animalKey: keyof AnimalStats = 'other';
        if (p.animalType === 'Dog bite') animalKey = 'dog';
        else if (p.animalType === 'Monkey bite') animalKey = 'monkey';
        else if (p.animalType === 'Cat bite') animalKey = 'cat';
        else if (p.animalType === 'Cattle bite') animalKey = 'cattle';
        else if (p.animalType === 'Rodent bite') animalKey = 'rodent';
        else if (p.animalType === 'Jackal bite') animalKey = 'jackal';
        else if (p.animalType === 'Tiger bite') animalKey = 'tiger';
        else if (p.animalType === 'Bear bite') animalKey = 'bear';
        else if (p.exposureCategory === 'Saliva contact') animalKey = 'saliva';

        categories[category][animalKey]++;
        categories[category].total++;
        categories['TOTAL'][animalKey]++;
        categories['TOTAL'].total++;
      });

    return categories;
  }, [patients, selectedFiscalYear, selectedMonth]);

  const balance = (parseFloat(stockData.opening) + parseFloat(stockData.received)) - parseFloat(stockData.expenditure);

  const currentMonthLabel = nepaliMonthOptions.find(m => m.value === selectedMonth)?.label || '';

  const handlePrint = () => {
    const printContent = document.getElementById('rabies-report-content');
    if (!printContent) return;

    // Create a hidden iframe for printing to avoid destroying React state/DOM
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rabies Report</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          body { 
            font-family: 'Mukta', sans-serif; 
            padding: 0; 
            margin: 0;
            background: white;
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
          }
          .report-container {
             box-shadow: none !important;
             border: none !important;
             padding: 20px !important;
             margin: 0 !important;
             width: 100% !important;
          }
          table { width: 100%; border-collapse: collapse; border: 1.5px solid black; margin-bottom: 20px; }
          th, td { border: 1px solid black; padding: 6px; font-size: 11px; color: black; }
          .no-print { display: none !important; }
          .bg-slate-50 { background-color: #f8fafc !important; }
          .bg-slate-100 { background-color: #f1f5f9 !important; }
          .text-slate-800 { color: #1e293b !important; }
          .font-black { font-weight: 900 !important; }
          .font-bold { font-weight: 700 !important; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <script>
           // Print automatically once loaded
           window.onload = function() {
              setTimeout(function() {
                 window.print();
              }, 800);
           };
        </script>
      </body>
      </html>
    `);
    doc.close();

    // Clean up iframe after a delay to ensure print dialog has opened
    setTimeout(() => {
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
    }, 5000); 
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Control Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-end gap-5 no-print">
        <div className="w-40">
            <Select label="आर्थिक वर्ष" options={FISCAL_YEARS} value={selectedFiscalYear} onChange={(e) => setSelectedFiscalYear(e.target.value)} icon={<Calendar size={18} />} />
        </div>
        <div className="w-48">
            <Select label="महिना" options={nepaliMonthOptions} value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} icon={<Filter size={18} />} />
        </div>
        
        <div className="flex-1 grid grid-cols-3 gap-4 px-4 border-l border-slate-100">
            <Input label="Previous Month Opening" type="number" value={stockData.opening} onChange={e => setStockData({...stockData, opening: e.target.value})} />
            <Input label="Received Dose" type="number" value={stockData.received} onChange={e => setStockData({...stockData, received: e.target.value})} />
            <Input label="Expenditure Dose" type="number" value={stockData.expenditure} onChange={e => setStockData({...stockData, expenditure: e.target.value})} />
        </div>

        <button onClick={handlePrint} className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white rounded-xl font-bold shadow-lg hover:bg-slate-900 transition-all">
            <Printer size={18} /> प्रिन्ट रिपोर्ट
        </button>
      </div>

      {/* Report View */}
      <div id="rabies-report-content">
        <div className="bg-white p-12 rounded-3xl shadow-xl border border-slate-100 report-container font-nepali">
            {/* HMIS Header */}
            <div className="text-center mb-8">
                <p className="text-sm font-bold mb-1">NG/MOH</p>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">रेबिज पोस्ट एक्सपोजर प्रोफिलेक्सिसको मासिक प्रतिवेदन</h1>
                <p className="text-sm font-bold text-slate-500 uppercase mt-1">(Monthly Report of Rabies Post Exposure Prophylaxis)</p>
                
                <div className="grid grid-cols-3 mt-8 text-sm font-bold border-b-2 border-slate-800 pb-2">
                    <div className="text-left">Institution: <span className="font-black text-primary-700">{currentUser.organizationName}</span></div>
                    <div className="text-center">Month: <span className="font-black text-primary-700">{currentMonthLabel}</span></div>
                    <div className="text-right">Fiscal Year: <span className="font-black text-primary-700">{selectedFiscalYear}</span></div>
                </div>
            </div>

            {/* Table 1 */}
            <div className="mb-8">
                <h3 className="font-black text-slate-700 mb-3 flex items-center gap-2 text-sm">
                    <Info size={16} className="text-primary-600 no-print"/> १. स्रोत र विवरण (Source of Exposure)
                </h3>
                <table className="w-full text-center border-collapse">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="p-3" rowSpan={2}>Description</th>
                            <th className="p-3" colSpan={10}>Source of Exposure to Rabies Animals</th>
                            <th className="p-3" rowSpan={2}>Total cases</th>
                        </tr>
                        <tr>
                            <th className="p-1 text-[10px]">Dog bite</th>
                            <th className="p-1 text-[10px]">Monkey bite</th>
                            <th className="p-1 text-[10px]">Cat bite</th>
                            <th className="p-1 text-[10px]">Cattle bite</th>
                            <th className="p-1 text-[10px]">Rodent bite</th>
                            <th className="p-1 text-[10px]">Jackal bite</th>
                            <th className="p-1 text-[10px]">Tiger bite</th>
                            <th className="p-1 text-[10px]">Bear bite</th>
                            <th className="p-1 text-[10px]">Saliva contact</th>
                            <th className="p-1 text-[10px]">Other</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {(Object.entries(reportSummary) as [string, AnimalStats][]).map(([cat, stats]) => (
                            <tr key={cat} className={cat === 'TOTAL' ? 'font-black bg-slate-50' : ''}>
                                <td className="p-2 text-left font-bold">{cat}</td>
                                <td className="p-2">{stats.dog || '-'}</td>
                                <td className="p-2">{stats.monkey || '-'}</td>
                                <td className="p-2">{stats.cat || '-'}</td>
                                <td className="p-2">{stats.cattle || '-'}</td>
                                <td className="p-2">{stats.rodent || '-'}</td>
                                <td className="p-2">{stats.jackal || '-'}</td>
                                <td className="p-2">{stats.tiger || '-'}</td>
                                <td className="p-2">{stats.bear || '-'}</td>
                                <td className="p-2">{stats.saliva || '-'}</td>
                                <td className="p-2">{stats.other || '-'}</td>
                                <td className="p-2 bg-slate-100/50">{stats.total || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Table 2 */}
            <div className="mb-8">
                <h3 className="font-black text-slate-700 mb-3 flex items-center gap-2 text-sm">
                    <CheckSquare size={16} className="text-primary-600 no-print"/> २. खोप मौज्दात विवरण (Vaccine Dose Statistics)
                </h3>
                <table className="w-full text-center border-collapse">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="p-3">Previous month opening</th>
                            <th className="p-3">Received dose</th>
                            <th className="p-3">Expenditure dose</th>
                            <th className="p-3">Balance dose</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="p-4 text-lg font-bold">{stockData.opening}</td>
                            <td className="p-4 text-lg font-bold">{stockData.received}</td>
                            <td className="p-4 text-lg font-bold">{stockData.expenditure}</td>
                            <td className="p-4 text-lg font-black text-primary-700 bg-primary-50">{balance}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Table 3 */}
            <div className="mb-8">
                <h3 className="font-black text-slate-700 mb-3 flex items-center gap-2 text-sm">
                    <FileText size={16} className="text-primary-600 no-print"/> ३. हाइड्रोफोबिया केस विवरण (If Hydrophobia cases reported)
                </h3>
                <table className="w-full text-center border-collapse">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="p-2 text-[10px]">Name</th>
                            <th className="p-2 text-[10px]">Address</th>
                            <th className="p-2 text-[10px]">Age</th>
                            <th className="p-2 text-[10px]">Sex</th>
                            <th className="p-2 text-[10px]">Biting Animal</th>
                            <th className="p-2 text-[10px]">Date of Bite</th>
                            <th className="p-2 text-[10px]">Site of Bite</th>
                            <th className="p-2 text-[10px]">Date of Death</th>
                            <th className="p-2 text-[10px]">Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="p-4 text-slate-300 italic" colSpan={9}>No cases reported in this month</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="grid grid-cols-2 gap-20 mt-16 text-center">
                <div className="border-t-2 border-slate-800 pt-3">
                    <p className="font-black text-slate-800">{currentUser.fullName}</p>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{currentUser.designation}</p>
                    <p className="text-xs mt-2 italic">Prepared By</p>
                    <p className="text-[10px] mt-1">Date: {new NepaliDate().format('YYYY-MM-DD')}</p>
                </div>
                <div className="border-t-2 border-slate-800 pt-3">
                    <div className="h-6"></div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Medical Officer / Chief</p>
                    <p className="text-xs mt-2 italic">Approved By</p>
                    <p className="text-[10px] mt-1">Date: {new NepaliDate().format('YYYY-MM-DD')}</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
