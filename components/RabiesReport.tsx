import React, { useState, useMemo } from 'react';
import { Printer, Calendar, Filter } from 'lucide-react';
import { Select } from './Select';
import { Input } from './Input'; // Import Input component for editable fields
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

// Added AnimalStats interface to strongly type the category objects
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
  const [selectedMonth, setSelectedMonth] = useState('01'); // Default to Baishakh
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(currentFiscalYear);

  // NEW: State for manual dose inputs in Table 2
  const [doseInputs, setDoseInputs] = useState({
    previousOpening: '0',
    receivedDose: '200',
    expenditureDose: '200',
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
    // Explicitly typed categories object using AnimalStats interface
    const categories: Record<string, AnimalStats> = {
      'Male (15+Yr)': { dog: 0, monkey: 0, cat: 0, cattle: 0, rodent: 0, jackal: 0, tiger: 0, bear: 0, saliva: 0, other: 0, total: 0 },
      'Female (15+Yr)': { dog: 0, monkey: 0, cat: 0, cattle: 0, rodent: 0, jackal: 0, tiger: 0, bear: 0, saliva: 0, other: 0, total: 0 },
      'Male Child (<15 Yr)': { dog: 0, monkey: 0, cat: 0, cattle: 0, rodent: 0, jackal: 0, tiger: 0, bear: 0, saliva: 0, other: 0, total: 0 },
      'Female Child (<15 Yr)': { dog: 0, monkey: 0, cat: 0, cattle: 0, rodent: 0, jackal: 0, tiger: 0, bear: 0, saliva: 0, other: 0, total: 0 },
      'TOTAL': { dog: 0, monkey: 0, cat: 0, cattle: 0, rodent: 0, jackal: 0, tiger: 0, bear: 0, saliva: 0, other: 0, total: 0 },
    };

    const hydrophobiaCases: any[] = []; // Placeholder for hydrophobia cases as this data is not in the model

    patients
      .filter(p => p.fiscalYear === selectedFiscalYear && p.regMonth === selectedMonth)
      .forEach(p => {
        let category: keyof typeof categories;
        const age = parseInt(p.age);

        if (p.sex === 'Male' && age >= 15) category = 'Male (15+Yr)';
        else if (p.sex === 'Female' && age >= 15) category = 'Female (15+Yr)';
        else if (p.sex === 'Male' && age < 15) category = 'Male Child (<15 Yr)';
        else if (p.sex === 'Female' && age < 15) category = 'Female Child (<15 Yr)';
        else return; // Skip if category not matched

        // Explicitly cast to ensure type safety when accessing properties
        let animalKey: keyof AnimalStats = 'other'; // Default to other

        if (p.animalType === 'Dog bite') animalKey = 'dog';
        else if (p.animalType === 'Monkey bite') animalKey = 'monkey';
        else if (p.animalType === 'Cat bite') animalKey = 'cat';
        else if (p.animalType === 'Cattle bite') animalKey = 'cattle';
        else if (p.animalType === 'Rodent bite') animalKey = 'rodent';
        else if (p.animalType === 'Jackal bite') animalKey = 'jackal';
        else if (p.animalType === 'Tiger bite') animalKey = 'tiger';
        else if (p.animalType === 'Bear bite') animalKey = 'bear';
        else if (p.exposureCategory === 'Saliva contact') animalKey = 'saliva';
        // 'Other specify' maps to 'other' by default.

        categories[category][animalKey]++;
        categories[category].total++;
        categories['TOTAL'][animalKey]++;
        categories['TOTAL'].total++;

        // Mock data for hydrophobia cases if needed, otherwise keep empty
        // if (p.hasHydrophobia) {
        //   hydrophobiaCases.push({
        //     name: p.name,
        //     address: p.address,
        //     age: p.age,
        //     sex: p.sex,
        //     bitingAnimal: p.animalType,
        //     dateOfBite: p.exposureDateBs,
        //     siteOfBite: p.bodyPart,
        //     dateOfDeath: 'N/A', // Placeholder
        //     remarks: 'Confirmed Rabies',
        //   });
        // }
      });

    return { categories, hydrophobiaCases };
  }, [patients, selectedFiscalYear, selectedMonth]);

  const currentNepaliMonthLabel = nepaliMonthOptions.find(m => m.value === selectedMonth)?.label;
  const currentPrintDate = useMemo(() => {
    try {
      return new NepaliDate().format('YYYY.MM.DD');
    } catch (e) {
      return '';
    }
  }, []);

  const totalExposurePatients = reportSummary.categories.TOTAL.total;

  // Calculate Balance Dose
  const balanceDose = useMemo(() => {
    const prev = parseFloat(doseInputs.previousOpening || '0');
    const received = parseFloat(doseInputs.receivedDose || '0');
    const expenditure = parseFloat(doseInputs.expenditureDose || '0');
    return (prev + received) - expenditure;
  }, [doseInputs]);

  const handleDoseInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof typeof doseInputs) => {
    setDoseInputs(prev => ({ ...prev, [field]: e.target.value }));
  };


  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Landscape Print Helper CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
            .rabies-report-print-container {
                width: 100% !important;
                max-width: none !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                box-shadow: none !important;
            }
            @page {
                size: A4 landscape; /* Set to landscape for wider tables */
                margin: 0.5cm; /* Reduced margin for tighter fit */
            }
            th, td {
                padding: 12px !important; /* Increased padding for print */
                font-size: 12px !important; /* Increased font for print readability */
                line-height: 1.2 !important; /* Tighter line height */
                border-color: black !important; /* Ensure black border for print */
            }
            /* Adjust header font sizes */
            .report-main-header-block .ng-moh {
                font-size: 14px !important; /* Adjusted for overall header size */
            }
            .report-main-header-block h3 {
                font-size: 16px !important; /* Adjusted for readability */
                margin-top: 5px !important;
                margin-bottom: 5px !important;
            }
            .main-header-info-row {
                font-size: 14px !important;
            }
            .main-header-info-row > div {
                font-size: 12px !important;
            }

            /* Adjust footer font sizes */
            .report-footer-section {
                font-size: 12px !important; /* Adjusted for readability */
                margin-top: 18px !important; /* Increased margin-top */
            }
            .report-footer-signature-line {
                margin-top: 10px !important; /* Increased margin-top */
            }
            
            .no-print {
                display: none !important;
            }
            .dose-input-cell input {
                border: none !important;
                background: none !important;
                padding: 0 !important;
                text-align: center !important;
                font-size: 12px !important; /* Adjusted for readability */
                font-weight: bold !important;
                color: inherit !important;
                width: 100% !important;
            }
            .report-main-header-block h3 {
                font-size: 16px !important; /* Adjusted for readability */
                margin-top: 0px !important;
                margin-bottom: 0px !important;
            }
            .hydrophobia-header {
                font-size: 14px !important; /* Adjusted for readability */
                margin-bottom: 5px !important;
            }
            .prepared-by-section {
                text-align: left !important; /* Left-align Prepared By section */
                padding-left: 12px !important; /* Align with table content start */
            }
            table {
              table-layout: auto !important; /* Use auto layout for better column distribution */
              width: 100% !important;
              height: auto !important; /* Allow table to grow vertically */
            }
        }
      ` }} />

      {/* Filter controls - No Print */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
        <div className="flex flex-wrap gap-4">
          <div className="w-40">
            <Select label="आर्थिक वर्ष" options={FISCAL_YEARS} value={selectedFiscalYear} onChange={(e) => setSelectedFiscalYear(e.target.value)} icon={<Calendar size={18} />} />
          </div>
          <div className="w-48">
            <Select label="महिना" options={nepaliMonthOptions} value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} icon={<Filter size={18} />} />
          </div>
        </div>
        <button onClick={() => window.print()} disabled={totalExposurePatients === 0} className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white rounded-lg font-medium disabled:opacity-50"><Printer size={18} /> प्रिन्ट</button>
      </div>

      {/* Main Report Container */}
      <div className="bg-white p-8 rounded-xl shadow-lg w-full overflow-x-auto print:shadow-none print:p-0 rabies-report-print-container">
        {/* Report Header Section */}
        <div className="text-center mb-8 print:mb-4 report-main-header-block print:mb-2"> {/* Added new class and reduced print margin-bottom */}
            {/* NG/MOH at the very top, centered */}
            <div className="ng-moh font-bold text-slate-800 text-sm print:text-[10px] text-center">NG/MOH</div>
            {/* NEW: Report specific title */}
            <h3 className="text-sm font-bold text-slate-800 mt-1 mb-3 print:text-[10px] print:mt-0 print:mb-1">
              रेबिज पोस्ट एक्सपोजर प्रोफिलेक्सिसको मासिक प्रतिवेदन<br/>(Monthly Report of Rabies Post Exposure Prophylaxis)
            </h3>
            {/* Institution, Month, Year on one line */}
            <div className="main-header-info-row"> {/* Renamed class */}
                <div className="text-left text-slate-800 text-sm font-bold print:text-[10px]">
                    Name of the Institution : Basic Municipal Hospital, Beltar
                </div>
                <div className="text-center text-slate-800 text-sm print:text-[10px]">
                    Month: {currentNepaliMonthLabel?.split(' ')[0]}
                </div>
                <div className="text-right text-slate-800 text-sm print:text-[10px]">
                    Year: {selectedFiscalYear.split('/')[0]}
                </div>
            </div>
            {/* The main report title is removed as per image - the table structure implies it */}
        </div>

        {/* Table 1: Source of Exposure to Rabies Animals */}
        <table className="w-full border-collapse border border-black text-xs mb-8 print:mb-4">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-black p-2 w-[15%]" rowSpan={2}>Description</th>
              <th className="border border-black p-2" colSpan={10}>Source of Exposure to Rabies Animals</th>
              <th className="border border-black p-2 w-[15%]" rowSpan={2}>Total cases</th>
            </tr>
            <tr className="bg-slate-100">
              <th className="border border-black p-2 w-[7%]">Dog bite</th>
              <th className="border border-black p-2 w-[7%]">Monkey bite</th>
              <th className="border border-black p-2 w-[7%]">Cat bite</th>
              <th className="border border-black p-2 w-[7%]">Cattle bite</th>
              <th className="border border-black p-2 w-[7%]">Rodent bite</th>
              <th className="border border-black p-2 w-[7%]">Jackal bite</th>
              <th className="border border-black p-2 w-[7%]">Tiger bite</th>
              <th className="border border-black p-2 w-[7%]">Bear bite</th>
              <th className="border border-black p-2 w-[7%]">Saliva contact</th>
              <th className="border border-black p-2 w-[7%]">Other specify</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(reportSummary.categories).map(([category, data]: [string, AnimalStats], index) => (
              <tr key={index}>
                <td className="border border-black p-2 font-bold">{category}</td>
                <td className="border border-black p-2 text-center">{data.dog}</td>
                <td className="border border-black p-2 text-center">{data.monkey}</td>
                <td className="border border-black p-2 text-center">{data.cat}</td>
                <td className="border border-black p-2 text-center">{data.cattle}</td>
                <td className="border border-black p-2 text-center">{data.rodent}</td>
                <td className="border border-black p-2 text-center">{data.jackal}</td>
                <td className="border border-black p-2 text-center">{data.tiger}</td>
                <td className="border border-black p-2 text-center">{data.bear}</td>
                <td className="border border-black p-2 text-center">{data.saliva}</td>
                <td className="border border-black p-2 text-center">{data.other}</td>
                <td className="border border-black p-2 text-center font-bold">{data.total}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Table 2: Vaccine Dose Statistics (Editable Inputs) */}
        <table className="w-full border-collapse border border-black text-xs mb-8 print:mb-4">
            <thead>
                <tr className="bg-slate-100">
                    <th className="border border-black p-2 w-1/4">Previous month opening</th>
                    <th className="border border-black p-2 w-1/4">Received dose</th>
                    <th className="border border-black p-2 w-1/4">Expenditure dose</th>
                    <th className="border border-black p-2 w-1/4">Balance dose</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td className="border border-black p-1 text-center dose-input-cell">
                        <Input 
                            type="number" 
                            value={doseInputs.previousOpening} 
                            onChange={(e) => handleDoseInputChange(e, 'previousOpening')} 
                            className="!p-1 !text-center !border-transparent hover:!border-slate-300 focus:!border-primary-500 !shadow-none !text-xs !font-bold"
                            label="" // Hide default label
                        />
                    </td>
                    <td className="border border-black p-1 text-center dose-input-cell">
                        <Input 
                            type="number" 
                            value={doseInputs.receivedDose} 
                            onChange={(e) => handleDoseInputChange(e, 'receivedDose')} 
                            className="!p-1 !text-center !border-transparent hover:!border-slate-300 focus:!border-primary-500 !shadow-none !text-xs !font-bold"
                            label="" // Hide default label
                        />
                    </td>
                    <td className="border border-black p-1 text-center dose-input-cell">
                        <Input 
                            type="number" 
                            value={doseInputs.expenditureDose} 
                            onChange={(e) => handleDoseInputChange(e, 'expenditureDose')} 
                            className="!p-1 !text-center !border-transparent hover:!border-slate-300 focus:!border-primary-500 !shadow-none !text-xs !font-bold"
                            label="" // Hide default label
                        />
                    </td>
                    <td className="border border-black p-2 text-center font-bold">
                        {balanceDose}
                    </td>
                </tr>
            </tbody>
        </table>

        {/* Table 3: IF Hydrophobia cases reported (Empty/Placeholder data) */}
        <div className="mb-8 print:mb-4">
            <h3 className="font-bold text-base mb-2 hydrophobia-header print:text-sm">IF Hydrophobia cases reported</h3>
            <table className="w-full border-collapse border border-black text-xs">
                <thead>
                    <tr className="bg-slate-100">
                        <th className="border border-black p-2 w-[15%]">Name</th>
                        <th className="border border-black p-2 w-[15%]">Address</th>
                        <th className="border border-black p-2 w-[5%]">Age</th>
                        <th className="border border-black p-2 w-[5%]">Sex</th>
                        <th className="border border-black p-2 w-[15%]">Biting Animal</th>
                        <th className="border border-black p-2 w-[10%]">Date of Bite</th>
                        <th className="border border-black p-2 w-[15%]">Site of Bite</th>
                        <th className="border border-black p-2 w-[10%]">Date of Death</th>
                        <th className="border border-black p-2 w-[10%]">Remarks</th>
                    </tr>
                </thead>
                <tbody>
                    {/* Placeholder for actual hydrophobia cases if available in data */}
                    {reportSummary.hydrophobiaCases.length > 0 ? (
                        reportSummary.hydrophobiaCases.map((caseItem, idx) => (
                            <tr key={idx}>
                                <td className="border border-black p-2">{caseItem.name}</td>
                                <td className="border border-black p-2">{caseItem.address}</td>
                                <td className="border border-black p-2 text-center">{caseItem.age}</td>
                                <td className="border border-black p-2 text-center">{caseItem.sex.charAt(0)}</td>
                                <td className="border border-black p-2">{caseItem.bitingAnimal}</td>
                                <td className="border border-black p-2">{caseItem.dateOfBite}</td>
                                <td className="border border-black p-2">{caseItem.siteOfBite}</td>
                                <td className="border border-black p-2">{caseItem.dateOfDeath}</td>
                                <td className="border border-black p-2">{caseItem.remarks}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={9} className="border border-black p-4 text-center text-slate-400 italic">कुनै हाइड्रोफोबिया केस रिपोर्ट गरिएको छैन।</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>

        {/* Footer Signatures */}
        <div className="grid grid-cols-2 gap-16 mt-20 text-sm report-footer-section print:gap-8 print:mt-10">
          <div className="text-center prepared-by-section"> {/* Added class for left align */}
            <p>Prepared By:</p>
            <p className="font-bold mt-4 report-footer-signature-line">{currentUser.fullName}</p>
            <p className="report-footer-signature-line">{currentUser.designation}</p>
            <p className="report-footer-signature-line">Date: {currentPrintDate}</p>
          </div>
          <div className="text-center">
            <p>Approved By:</p>
            <p className="font-bold mt-4 report-footer-signature-line"></p> {/* No name as requested */}
            <p className="report-footer-signature-line">Chief of Hospital</p> {/* Hardcoded as per image */}
            <p className="report-footer-signature-line">Date: {currentPrintDate}</p>
          </div>
        </div>
      </div>
    </div>
  );
};