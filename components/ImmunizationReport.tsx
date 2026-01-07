
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

      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 max-w-[210mm] mx-auto print:shadow-none print:p-0">
        <div className="text-center mb-6 border-b-2 border-slate-900 pb-4">
            <h1 className="text-xl font-bold text-slate-900">{generalSettings.orgNameNepali}</h1>
            <h3 className="text-lg font-black mt-2 underline font-nepali">खोप कार्यक्रमको मासिक प्रतिवेदन</h3>
            <div className="flex justify-between mt-4 text-xs font-bold text-slate-600">
                <span>आ.व.: {selectedFiscalYear}</span>
                <span>महिना: {currentMonthLabel}</span>
                <span>केन्द्र: {filterCenter || 'सबै'}</span>
            </div>
        </div>

        <div className="mb-6">
            <h4 className="text-base font-bold text-indigo-800 mb-2 font-nepali">१. खोप मात्रा अनुसारको तथ्याङ्क</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE.map((vax, i) => {
                    const nameKey = vax.name.replace(/[^a-zA-Z0-9]/g, '');
                    return (
                        <div key={i} className="flex justify-between p-1.5 border rounded text-xs">
                            <span className="text-slate-600">{vax.name}:</span>
                            <span className="font-bold">{reportStats.child[nameKey] !== undefined ? reportStats.child[nameKey] : 0}</span>
                        </div>
                    );
                })}
            </div>
            <div className="mt-4 p-2 border-t border-slate-200 text-sm flex justify-between font-bold">
              <span>कुल बालबालिका जसले यो महिना खोप लगाए:</span>
              <span>{reportStats.uniqueChildrenVax.total}</span>
            </div>
        </div>

        <div className="mb-6">
            <h4 className="text-base font-bold text-purple-800 mb-2 font-nepali">२. गर्भवती महिला TD खोपको तथ्याङ्क</h4>
            <div className="grid grid-cols-2 gap-2">
                <div className="flex justify-between p-1.5 border rounded text-xs">
                    <span className="text-slate-600">TD1:</span>
                    <span className="font-bold">{reportStats.maternal.td1}</span>
                </div>
                <div className="flex justify-between p-1.5 border rounded text-xs">
                    <span className="text-slate-600">TD2:</span>
                    <span className="font-bold">{reportStats.maternal.td2}</span>
                </div>
                <div className="flex justify-between p-1.5 border rounded text-xs">
                    <span className="text-slate-600">TD Booster:</span>
                    <span className="font-bold">{reportStats.maternal.tdBooster}</span>
                </div>
                 <div className="flex justify-between p-1.5 border rounded text-xs font-bold">
                    <span className="text-slate-600">कुल गर्भवती महिलाहरू:</span>
                    <span>{reportStats.maternal.total}</span>
                </div>
            </div>
        </div>

        <div>
            <h4 className="text-base font-bold text-teal-800 mb-2 font-nepali">३. पूर्ण खोप पुरा गरेका बच्चाहरू (जातीयता अनुसार)</h4>
            <table className="w-full text-xs text-left border-collapse border border-slate-200">
                <thead className="bg-slate-50 font-bold">
                    <tr><th className="border p-2">जातीय कोड</th><th className="border p-2 text-center">बालक</th><th className="border p-2 text-center">बालिका</th><th className="border p-2 text-center">जम्मा</th></tr>
                </thead>
                <tbody>
                    {Object.entries(jatLabels).map(([code, label]) => {
                        const d = reportStats.ethnicFIC[code] || { male: 0, female: 0, total: 0 };
                        return (
                            <tr key={code}>
                                <td className="border p-2">{code}: {label}</td>
                                <td className="border p-2 text-center">{d.male}</td>
                                <td className="border p-2 text-center">{d.female}</td>
                                <td className="border p-2 text-center font-bold">{d.total}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>

        <div className="grid grid-cols-2 gap-10 mt-12 text-center text-xs font-bold font-nepali">
            <div className="border-t border-slate-900 pt-2">तयार गर्ने</div>
            <div className="border-t border-slate-900 pt-2">स्वीकृत गर्ने</div>
        </div>
      </div>
    </div>
  );
};