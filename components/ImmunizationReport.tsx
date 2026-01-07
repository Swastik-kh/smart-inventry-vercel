
import React, { useState, useMemo } from 'react';
import { Printer, Calendar, Filter, BarChart, Download, Baby, Droplets, Users, UsersRound } from 'lucide-react';
import { Select } from './Select';
import { FISCAL_YEARS } from '../constants';
import { ChildImmunizationRecord, GarbhawatiPatient } from '../types/healthTypes';
import { OrganizationSettings } from '../types/coreTypes';
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

  const reportStats = useMemo(() => {
    const stats = {
      child: {
        bcg: 0, dpt1: 0, dpt2: 0, dpt3: 0, opv1: 0, opv2: 0, opv3: 0,
        pcv1: 0, pcv2: 0, pcv3: 0, rota1: 0, rota2: 0, mr1: 0, mr2: 0, je: 0, fipv: 0, typhoid: 0, total: 0
      },
      maternal: {
        td1: 0, td2: 0, tdBooster: 0, total: 0
      },
      // Total unique children who received at least one dose this month
      uniqueChildrenVax: { male: 0, female: 0, other: 0, total: 0 },
      // Ethnic & Gender wise fully immunized stats
      ethnicFIC: Object.keys(jatLabels).reduce((acc, code) => {
        acc[code] = { male: 0, female: 0, total: 0 };
        return acc;
      }, {} as Record<string, { male: number, female: number, total: number }>)
    };

    // Aggregate Child Vaccines & FIC
    bachhaRecords
      .filter(r => r.fiscalYear === selectedFiscalYear)
      .forEach(record => {
        let isFullyImmunized = false;
        let lastVaccineMonth = '';
        let receivedDoseThisMonth = false;

        record.vaccines.forEach(v => {
          if (v.status === 'Given' && v.givenDateBs) {
            const m = v.givenDateBs.split('-')[1];
            
            // Core vaccine counts for the selected month
            if (m === selectedMonth) {
              receivedDoseThisMonth = true;
              const name = v.name.toLowerCase();
              if (name.includes('bcg')) stats.child.bcg++;
              else if (name.includes('dpt-hepb-hib-1')) stats.child.dpt1++;
              else if (name.includes('dpt-hepb-hib-2')) stats.child.dpt2++;
              else if (name.includes('dpt-hepb-hib-3')) stats.child.dpt3++;
              else if (name.includes('opv-1')) stats.child.opv1++;
              else if (name.includes('opv-2')) stats.child.opv2++;
              else if (name.includes('opv-3')) stats.child.opv3++;
              else if (name.includes('pcv-1')) stats.child.pcv1++;
              else if (name.includes('pcv-2')) stats.child.pcv2++;
              else if (name.includes('pcv-3')) stats.child.pcv3++;
              else if (name.includes('rota-1')) stats.child.rota1++;
              else if (name.includes('rota-2')) stats.child.rota2++;
              else if (name.includes('fipv')) stats.child.fipv++;
              else if (name.includes('mr-1')) stats.child.mr1++;
              else if (name.includes('mr-2')) stats.child.mr2++;
              else if (name.includes('je')) stats.child.je++;
              else if (name.includes('typhoid')) stats.child.typhoid++;
              stats.child.total++;
            }

            // Check if fully immunized (MR2 or Typhoid milestone at 15 months)
            if (v.name.toLowerCase().includes('mr-2') || v.name.toLowerCase().includes('typhoid')) {
                isFullyImmunized = true;
                lastVaccineMonth = v.givenDateBs.split('-')[1];
            }
          }
        });

        // Count unique children vaccinated in the selected month
        if (receivedDoseThisMonth) {
            const gender = record.gender.toLowerCase();
            if (gender === 'male') stats.uniqueChildrenVax.male++;
            else if (gender === 'female') stats.uniqueChildrenVax.female++;
            else stats.uniqueChildrenVax.other++;
            stats.uniqueChildrenVax.total++;
        }

        // If the child became FIC in the selected month, add to ethnic stats
        if (isFullyImmunized && lastVaccineMonth === selectedMonth) {
            const code = record.jatCode || '06'; 
            const gender = record.gender === 'Female' ? 'female' : 'male';
            if (stats.ethnicFIC[code]) {
                stats.ethnicFIC[code][gender]++;
                stats.ethnicFIC[code].total++;
            }
        }
      });

    // Aggregate Maternal Vaccines
    maternalRecords
      .filter(r => r.fiscalYear === selectedFiscalYear)
      .forEach(p => {
        if (p.td1DateBs?.split('-')[1] === selectedMonth) stats.maternal.td1++;
        if (p.td2DateBs?.split('-')[1] === selectedMonth) stats.maternal.td2++;
        if (p.tdBoosterDateBs?.split('-')[1] === selectedMonth) stats.maternal.tdBooster++;
      });
    stats.maternal.total = stats.maternal.td1 + stats.maternal.td2 + stats.maternal.tdBooster;

    return stats;
  }, [bachhaRecords, maternalRecords, selectedFiscalYear, selectedMonth]);

  const currentMonthLabel = nepaliMonthOptions.find(m => m.value === selectedMonth)?.label || '';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
        <div className="flex flex-wrap gap-4">
          <div className="w-40">
            <Select label="आर्थिक वर्ष" options={FISCAL_YEARS} value={selectedFiscalYear} onChange={(e) => setSelectedFiscalYear(e.target.value)} icon={<Calendar size={18} />} />
          </div>
          <div className="w-48">
            <Select label="महिना" options={nepaliMonthOptions} value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} icon={<Filter size={18} />} />
          </div>
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white rounded-lg font-medium shadow-sm"><Printer size={18} /> प्रिन्ट गर्नुहोस्</button>
      </div>

      {/* Report Area */}
      <div className="bg-white p-10 rounded-2xl shadow-xl border border-slate-100 max-w-[210mm] mx-auto print:shadow-none print:border-none print:p-0">
        <div className="text-center mb-8 border-b-2 border-slate-900 pb-6">
            <div className="flex items-center justify-center gap-4 mb-4">
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png" alt="Emblem" className="h-16 w-16 object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 uppercase">{generalSettings.orgNameNepali}</h1>
            <h2 className="text-lg font-bold text-slate-700">{generalSettings.subTitleNepali}</h2>
            <h3 className="text-xl font-black mt-4 underline underline-offset-8 decoration-2 font-nepali">खोप कार्यक्रमको मासिक प्रतिवेदन</h3>
            <div className="flex justify-between mt-6 text-sm font-bold text-slate-600">
                <span>आ.व.: {selectedFiscalYear}</span>
                <span>महिना: {currentMonthLabel}</span>
                <span>प्रिन्ट मिति: {new NepaliDate().format('YYYY-MM-DD')}</span>
            </div>
        </div>

        {/* 1. Vaccinated Children Summary (Unique Count) */}
        <div className="mb-10">
            <h4 className="text-lg font-bold text-green-800 mb-4 flex items-center gap-2 bg-green-50 p-2 rounded-lg border-l-4 border-green-600 font-nepali">
                <UsersRound size={20}/> १. खोप सेवा पाएका जम्मा बच्चाहरूको विवरण (Unique Children)
            </h4>
            <div className="grid grid-cols-3 gap-4">
                <div className="p-3 border rounded-xl bg-white shadow-sm text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">बालक (Male)</p>
                    <p className="text-2xl font-black text-blue-600">{reportStats.uniqueChildrenVax.male}</p>
                </div>
                <div className="p-3 border rounded-xl bg-white shadow-sm text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">बालिका (Female)</p>
                    <p className="text-2xl font-black text-pink-600">{reportStats.uniqueChildrenVax.female}</p>
                </div>
                <div className="p-3 border rounded-xl bg-green-600 text-white shadow-md text-center">
                    <p className="text-[10px] font-bold text-green-100 uppercase">जम्मा (Total)</p>
                    <p className="text-2xl font-black">{reportStats.uniqueChildrenVax.total}</p>
                </div>
            </div>
        </div>

        {/* 2. Child Immunization Section (Dose-wise) */}
        <div className="mb-10">
            <h4 className="text-lg font-bold text-indigo-800 mb-4 flex items-center gap-2 bg-indigo-50 p-2 rounded-lg border-l-4 border-indigo-600 font-nepali">
                <Baby size={20}/> २. खोप मात्रा अनुसारको तथ्याङ्क (Child Dose Stats)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                    { label: 'BCG', val: reportStats.child.bcg },
                    { label: 'DPT-HepB-Hib 1', val: reportStats.child.dpt1 },
                    { label: 'DPT-HepB-Hib 2', val: reportStats.child.dpt2 },
                    { label: 'DPT-HepB-Hib 3', val: reportStats.child.dpt3 },
                    { label: 'OPV 1', val: reportStats.child.opv1 },
                    { label: 'OPV 2', val: reportStats.child.opv2 },
                    { label: 'OPV 3', val: reportStats.child.opv3 },
                    { label: 'PCV 1', val: reportStats.child.pcv1 },
                    { label: 'PCV 2', val: reportStats.child.pcv2 },
                    { label: 'PCV 3', val: reportStats.child.pcv3 },
                    { label: 'Rota 1', val: reportStats.child.rota1 },
                    { label: 'Rota 2', val: reportStats.child.rota2 },
                    { label: 'fIPV', val: reportStats.child.fipv },
                    { label: 'MR 1', val: reportStats.child.mr1 },
                    { label: 'JE', val: reportStats.child.je },
                    { label: 'MR 2', val: reportStats.child.mr2 },
                    { label: 'Typhoid', val: reportStats.child.typhoid }
                ].map((item, i) => (
                    <div key={i} className="flex justify-between p-2 border rounded-lg hover:bg-slate-50 transition-colors">
                        <span className="font-medium text-slate-700">{item.label}:</span>
                        <span className="font-bold text-slate-900">{item.val}</span>
                    </div>
                ))}
            </div>
            <div className="mt-4 p-3 bg-indigo-600 text-white rounded-xl flex justify-between items-center shadow-lg shadow-indigo-100">
                <span className="font-bold font-nepali">जम्मा दिइएको खोपको मात्रा (Total Doses):</span>
                <span className="text-xl font-black">{reportStats.child.total}</span>
            </div>
        </div>

        {/* 3. Maternal Section */}
        <div className="mb-10">
            <h4 className="text-lg font-bold text-purple-800 mb-4 flex items-center gap-2 bg-purple-50 p-2 rounded-lg border-l-4 border-purple-600 font-nepali">
                <Droplets size={20}/> ३. आमाको खोप तथ्याङ्क (Maternal TD Stats)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-xl bg-white shadow-sm flex flex-col items-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">TD 1</p>
                    <p className="text-3xl font-black text-purple-700">{reportStats.maternal.td1}</p>
                </div>
                <div className="p-4 border rounded-xl bg-white shadow-sm flex flex-col items-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">TD 2</p>
                    <p className="text-3xl font-black text-purple-700">{reportStats.maternal.td2}</p>
                </div>
                <div className="p-4 border rounded-xl bg-white shadow-sm flex flex-col items-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">TD Booster</p>
                    <p className="text-3xl font-black text-purple-700">{reportStats.maternal.tdBooster}</p>
                </div>
            </div>
        </div>

        {/* 4. Fully Immunized Section */}
        <div className="mb-12">
            <h4 className="text-lg font-bold text-teal-800 mb-4 flex items-center gap-2 bg-teal-50 p-2 rounded-lg border-l-4 border-teal-600 font-nepali">
                <Users size={20}/> ४. पूर्ण खोप पुरा गरेका बच्चाहरूको जातीय तथा लैङ्गिक विवरण
            </h4>
            <div className="overflow-hidden border border-slate-200 rounded-xl">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b">
                        <tr>
                            <th className="px-4 py-3 font-nepali">जातीय कोड (Ethnic Code)</th>
                            <th className="px-4 py-3 text-center font-nepali">बालक (Male)</th>
                            <th className="px-4 py-3 text-center font-nepali">बालिका (Female)</th>
                            <th className="px-4 py-3 text-center font-nepali bg-teal-50">जम्मा (Total)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {Object.entries(jatLabels).map(([code, label]) => {
                            const data = reportStats.ethnicFIC[code] || { male: 0, female: 0, total: 0 };
                            return (
                                <tr key={code} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3 font-medium text-slate-800 font-nepali">{code}: {label}</td>
                                    <td className="px-4 py-3 text-center font-bold text-blue-600">{data.male}</td>
                                    <td className="px-4 py-3 text-center font-bold text-pink-600">{data.female}</td>
                                    <td className="px-4 py-3 text-center font-black text-slate-900 bg-teal-50/30">{data.total}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="bg-slate-50 font-black border-t-2">
                        <tr>
                            <td className="px-4 py-3 font-nepali">कुल जम्मा (FIC Total)</td>
                            <td className="px-4 py-3 text-center">
                                {Object.values(reportStats.ethnicFIC).reduce((sum, d) => sum + d.male, 0)}
                            </td>
                            <td className="px-4 py-3 text-center">
                                {Object.values(reportStats.ethnicFIC).reduce((sum, d) => sum + d.female, 0)}
                            </td>
                            <td className="px-4 py-3 text-center bg-teal-600 text-white">
                                {Object.values(reportStats.ethnicFIC).reduce((sum, d) => sum + d.total, 0)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 italic font-nepali">
                * १५ महिनाको खोप (MR-2/Typhoid) लगाइसकिएका बच्चाहरूलाई पूर्ण खोप पुरा गरेको मानिएको छ।
            </p>
        </div>

        {/* Report Footer */}
        <div className="grid grid-cols-3 gap-10 mt-20 text-center text-sm font-bold font-nepali">
            <div className="border-t-2 border-slate-900 pt-3">तयार गर्ने</div>
            <div className="border-t-2 border-slate-900 pt-3">रुजु गर्ने</div>
            <div className="border-t-2 border-slate-900 pt-3">स्वीकृत गर्ने</div>
        </div>
      </div>
    </div>
  );
};
