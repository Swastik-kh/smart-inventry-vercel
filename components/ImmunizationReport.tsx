import React, { useState, useMemo } from 'react';
import { Printer, Calendar, Filter, BarChart, Download, Baby, Droplets, Users, UsersRound, MapPinned } from 'lucide-react';
import { Select } from './Select';
import { FISCAL_YEARS } from '../constants';
import { ChildImmunizationRecord, GarbhawatiPatient } from '../types/healthTypes';
import { Option, OrganizationSettings } from '../types/coreTypes';
import { NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE } from './ChildImmunizationRegistration'; // Import the template
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface ImmunizationReportProps {
  currentFiscalYear: string;
  bachhaRecords: ChildImmunizationRecord[];
  maternalRecords: GarbhawatiPatient[];
  generalSettings: OrganizationSettings;
}

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

const jatLabels: Record<string, string> = {
  '01': 'दलित (Dalit)',
  '02': 'जनजाति (Janajati)',
  '03': 'मधेशी (Madhesi)',
  '04': 'मुस्लिम (Muslim)',
  '05': 'ब्राह्मण/क्षेत्री (B/C)',
  '06': 'अन्य (Others)',
};

export const ImmunizationReport: React.FC<ImmunizationReportProps> = ({ 
  currentFiscalYear, 
  bachhaRecords, 
  maternalRecords,
  generalSettings 
}) => {
  const [selectedMonth, setSelectedMonth] = useState('01');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(currentFiscalYear);
  const [filterCenter, setFilterCenter] = useState(''); // New state for filter by vaccination center

  const centerOptions: Option[] = useMemo(() => 
    (generalSettings.vaccinationCenters || ['मुख्य अस्पताल']).map(c => ({ id: c, value: c, label: c })),
    [generalSettings.vaccinationCenters]
  );

  const reportStats = useMemo(() => {
    // Initialize child vaccine counts dynamically for all vaccines in the template
    const initialChildVaccineCounts: Record<string, number> = {};
    NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE.forEach(vax => {
        // Sanitize name to be a valid object key
        const key = vax.name.replace(/[^a-zA-Z0-9]/g, '');
        initialChildVaccineCounts[key] = 0;
    });

    const stats = {
      child: {
        ...initialChildVaccineCounts, // All vaccines from template
        total: 0
      },
      maternal: {
        td1: 0, td2: 0, tdBooster: 0, total: 0
      },
      uniqueChildrenVax: { male: 0, female: 0, other: 0, total: 0 },
      ethnicFIC: Object.keys(jatLabels).reduce((acc, code) => {
        acc[code] = { male: 0, female: 0, total: 0 };
        return acc;
      }, {} as Record<string, { male: number, female: number, total: number }>)
    };

    bachhaRecords
      .filter(r => r.fiscalYear === selectedFiscalYear)
      .filter(r => filterCenter ? r.vaccinationCenter === filterCenter : true) // Filter by center
      .forEach(record => {
        let isFullyImmunized = false;
        let lastVaccineMonth = '';
        let receivedDoseThisMonth = false;

        record.vaccines.forEach(v => {
          if (v.status === 'Given' && v.givenDateBs) {
            const m = v.givenDateBs.split('-')[1];
            
            if (m === selectedMonth) {
              receivedDoseThisMonth = true;
              const nameKey = v.name.replace(/[^a-zA-Z0-9]/g, ''); // Use sanitized key
              if (stats.child[nameKey] !== undefined) {
                stats.child[nameKey]++;
              }
              stats.child.total++;
            }

            if (v.name.toLowerCase().includes('mr-2') || v.name.toLowerCase().includes('typhoid')) {
                isFullyImmunized = true;
                lastVaccineMonth = v.givenDateBs.split('-')[1];
            }
          }
        });

        if (receivedDoseThisMonth) {
            const gender = record.gender.toLowerCase();
            if (gender === 'male') stats.uniqueChildrenVax.male++;
            else if (gender === 'female') stats.uniqueChildrenVax.female++;
            else stats.uniqueChildrenVax.other++;
            stats.uniqueChildrenVax.total++;
        }

        if (isFullyImmunized && lastVaccineMonth === selectedMonth) {
            const code = record.jatCode || '06'; 
            const gender = record.gender === 'Female' ? 'female' : 'male';
            if (stats.ethnicFIC[code]) {
                stats.ethnicFIC[code][gender]++;
                stats.ethnicFIC[code].total++;
            }
        }
      });

    maternalRecords
      .filter(r => r.fiscalYear === selectedFiscalYear)
      .filter(r => filterCenter ? (r.remarks?.includes(filterCenter) || r.address?.includes(filterCenter)) : true) // Basic filter for maternal records
      .forEach(p => {
        if (p.td1DateBs?.split('-')[1] === selectedMonth) stats.maternal.td1++;
        if (p.td2DateBs?.split('-')[1] === selectedMonth) stats.maternal.td2++;
        if (p.tdBoosterDateBs?.split('-')[1] === selectedMonth) stats.maternal.tdBooster++;
      });
    stats.maternal.total = stats.maternal.td1 + stats.maternal.td2 + stats.maternal.tdBooster;

    return stats;
  }, [bachhaRecords, maternalRecords, selectedFiscalYear, selectedMonth, filterCenter]);

  const currentMonthLabel = nepaliMonthOptions.find(m => m.value === selectedMonth)?.label || '';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Print Styling */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { margin: 10mm; size: A4 portrait; }
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-full { width: 100% !important; max-width: none !important; box-shadow: none !important; border: none !important; }
          table { width: 100% !important; border-collapse: collapse !important; font-size: 12px !important; }
          th, td { border: 1px solid black !important; padding: 4px 8px !important; }
          thead th { background-color: #f0f0f0 !important; -webkit-print-color-adjust: exact; }
        }
      `}} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
        <div className="flex flex-wrap gap-4">
          <div className="w-40"><Select label="आर्थिक वर्ष" options={FISCAL_YEARS} value={selectedFiscalYear} onChange={(e) => setSelectedFiscalYear(e.target.value)} icon={<Calendar size={18} />} /></div>
          <div className="w-48"><Select label="महिना" options={nepaliMonthOptions} value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} icon={<Filter size={18} />} /></div>
          <div className="w-48">
            <Select 
                label="खोप केन्द्र" 
                options={[{id: '', value: '', label: '-- सबै केन्द्रहरू --'}, ...centerOptions]} 
                value={filterCenter} 
                onChange={(e) => setFilterCenter(e.target.value)} 
                icon={<MapPinned size={18} />} 
            />
          </div>
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white rounded-lg font-medium shadow-sm"><Printer size={18} /> प्रिन्ट</button>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 max-w-[210mm] mx-auto print-full print:p-0">
        {/* Header */}
        <div className="text-center mb-6 border-b-2 border-slate-900 pb-4">
            <h1 className="text-xl font-bold text-slate-900">{generalSettings.orgNameNepali}</h1>
            <h3 className="text-lg font-black mt-2 underline font-nepali">खोप कार्यक्रमको मासिक प्रतिवेदन</h3>
            <div className="flex justify-between mt-4 text-xs font-bold text-slate-600">
                <span>आ.व.: {selectedFiscalYear}</span>
                <span>महिना: {currentMonthLabel}</span>
                <span>केन्द्र: {filterCenter || 'सबै'}</span>
            </div>
        </div>

        {/* Section 1: Child Vaccines Table */}
        <div className="mb-8">
            <h4 className="text-base font-bold text-indigo-800 mb-2 font-nepali border-b border-indigo-100 pb-1">१. खोप मात्रा अनुसारको तथ्याङ्क (Child Immunization)</h4>
            <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-700 font-bold">
                        <tr>
                            <th className="border-b border-r border-slate-200 p-3">खोपको नाम (Vaccine)</th>
                            <th className="border-b border-slate-200 p-3 text-center w-32">संख्या (Count)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE.map((vax, i) => {
                            const nameKey = vax.name.replace(/[^a-zA-Z0-9]/g, '');
                            const count = reportStats.child[nameKey] !== undefined ? reportStats.child[nameKey] : 0;
                            return (
                                <tr key={i} className="hover:bg-slate-50">
                                    <td className="border-r border-slate-200 p-2 pl-3">{vax.name}</td>
                                    <td className="p-2 text-center font-mono font-bold text-slate-700">{count}</td>
                                </tr>
                            );
                        })}
                        <tr className="bg-indigo-50 font-bold text-indigo-900">
                            <td className="border-r border-indigo-200 p-2 pl-3 text-right">कुल बालबालिका (जसले यो महिना कुनै खोप लगाए):</td>
                            <td className="p-2 text-center">{reportStats.uniqueChildrenVax.total}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        {/* Section 2: Maternal Table */}
        <div className="mb-8">
            <h4 className="text-base font-bold text-purple-800 mb-2 font-nepali border-b border-purple-100 pb-1">२. गर्भवती महिला TD खोपको तथ्याङ्क (Maternal TD)</h4>
            <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-700 font-bold">
                        <tr>
                            <th className="border-b border-r border-slate-200 p-3">खोपको नाम (Vaccine)</th>
                            <th className="border-b border-slate-200 p-3 text-center w-32">संख्या (Count)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        <tr className="hover:bg-slate-50">
                            <td className="border-r border-slate-200 p-2 pl-3">TD1</td>
                            <td className="p-2 text-center font-mono font-bold text-slate-700">{reportStats.maternal.td1}</td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                            <td className="border-r border-slate-200 p-2 pl-3">TD2</td>
                            <td className="p-2 text-center font-mono font-bold text-slate-700">{reportStats.maternal.td2}</td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                            <td className="border-r border-slate-200 p-2 pl-3">TD Booster</td>
                            <td className="p-2 text-center font-mono font-bold text-slate-700">{reportStats.maternal.tdBooster}</td>
                        </tr>
                        <tr className="bg-purple-50 font-bold text-purple-900">
                            <td className="border-r border-purple-200 p-2 pl-3 text-right">कुल खोप लगाउने गर्भवती महिलाहरू:</td>
                            <td className="p-2 text-center">{reportStats.maternal.total}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        {/* Section 3: Ethnicity Table */}
        <div className="mb-8">
            <h4 className="text-base font-bold text-teal-800 mb-2 font-nepali border-b border-teal-100 pb-1">३. पूर्ण खोप पुरा गरेका बच्चाहरू (Fully Immunized Children)</h4>
            <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-700 font-bold">
                        <tr>
                            <th className="border-b border-r border-slate-200 p-3">जातीय कोड (Ethnicity)</th>
                            <th className="border-b border-r border-slate-200 p-3 text-center w-24">बालक (Male)</th>
                            <th className="border-b border-r border-slate-200 p-3 text-center w-24">बालिका (Female)</th>
                            <th className="border-b border-slate-200 p-3 text-center w-24">जम्मा (Total)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {Object.entries(jatLabels).map(([code, label]) => {
                            const d = reportStats.ethnicFIC[code] || { male: 0, female: 0, total: 0 };
                            return (
                                <tr key={code} className="hover:bg-slate-50">
                                    <td className="border-r border-slate-200 p-2 pl-3"><span className="font-mono font-bold text-slate-500 mr-2">{code}</span> {label}</td>
                                    <td className="border-r border-slate-200 p-2 text-center text-slate-700">{d.male}</td>
                                    <td className="border-r border-slate-200 p-2 text-center text-slate-700">{d.female}</td>
                                    <td className="p-2 text-center font-bold text-teal-700">{d.total}</td>
                                </tr>
                            );
                        })}
                        <tr className="bg-teal-50 font-bold text-teal-900">
                            <td className="border-r border-teal-200 p-2 pl-3 text-right">कुल पूर्ण खोप (FIC):</td>
                            <td className="border-r border-teal-200 p-2 text-center">{Object.values(reportStats.ethnicFIC).reduce((a, b: any) => a + b.male, 0)}</td>
                            <td className="border-r border-teal-200 p-2 text-center">{Object.values(reportStats.ethnicFIC).reduce((a, b: any) => a + b.female, 0)}</td>
                            <td className="p-2 text-center">{Object.values(reportStats.ethnicFIC).reduce((a, b: any) => a + b.total, 0)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        {/* Footer */}
        <div className="grid grid-cols-2 gap-10 mt-12 text-center text-xs font-bold font-nepali">
            <div className="border-t border-slate-900 pt-2">तयार गर्ने</div>
            <div className="border-t border-slate-900 pt-2">स्वीकृत गर्ने</div>
        </div>
      </div>
    </div>
  );
};