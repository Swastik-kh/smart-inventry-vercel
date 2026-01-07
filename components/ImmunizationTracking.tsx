
import React, { useState, useMemo, useCallback } from 'react';
import { Baby, Printer, AlertOctagon, Calendar, Clock, Info, User, Phone, MapPin, Search, CheckCircle2, ShieldCheck, Award, X, FileBadge, BadgeCheck, CalendarDays, CalendarClock } from 'lucide-react';
import { ChildImmunizationRecord, ChildImmunizationVaccine } from '../types/healthTypes';
import { Option, OrganizationSettings } from '../types/coreTypes';
import { Input } from './Input';
import { Select } from './Select';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface ImmunizationTrackingProps {
  currentFiscalYear: string;
  records: ChildImmunizationRecord[];
  generalSettings: OrganizationSettings;
}

const NEPALI_MONTHS_NAMES = [
    'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 
    'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फागुन', 'चैत्र'
];

const getTodayBs = () => {
  try {
    return new NepaliDate();
  } catch (e) {
    return new NepaliDate(2080, 0, 1); 
  }
};

const getTodayBsFormatted = () => getTodayBs().format('YYYY-MM-DD');

const calculateAge = (dobBs: string) => {
    if (!dobBs) return "N/A";
    try {
      const today = getTodayBs();
      const birth = new NepaliDate(dobBs);
      
      let years = today.getYear() - birth.getYear();
      let months = today.getMonth() - birth.getMonth();
      let days = today.getDate() - birth.getDate();

      if (days < 0) {
        months -= 1;
        days += 30; 
      }
      if (months < 0) {
        years -= 1;
        months += 12;
      }
      return `${years} वर्ष, ${months} महिना, ${days} दिन`;
    } catch (e) { 
        return "Invalid Date"; 
    } 
};

const getUpcomingSessionDate = (todayNepali: NepaliDate): { sessionDateBs: string; sessionLabel: string; } => {
    let targetYear = todayNepali.getYear();
    let targetMonth = todayNepali.getMonth(); 
    let targetDay = todayNepali.getDate();

    let upcomingSessionDay: number;
    let upcomingSessionMonth: number;
    let upcomingSessionYear: number;

    if (targetDay <= 6) {
        upcomingSessionDay = 6;
        upcomingSessionMonth = targetMonth;
        upcomingSessionYear = targetYear;
    } else if (targetDay <= 20) {
        upcomingSessionDay = 20;
        upcomingSessionMonth = targetMonth;
        upcomingSessionYear = targetYear;
    } else {
        upcomingSessionDay = 6;
        upcomingSessionMonth = targetMonth + 1;
        upcomingSessionYear = targetYear;

        if (upcomingSessionMonth > 11) {
            upcomingSessionMonth = 0;
            upcomingSessionYear++;
        }
    }

    let upcomingSessionNepaliDate;
    try {
        upcomingSessionNepaliDate = new NepaliDate(upcomingSessionYear, upcomingSessionMonth, upcomingSessionDay);
    } catch (error) {
        return { sessionDateBs: `${upcomingSessionYear}-${String(upcomingSessionMonth + 1).padStart(2, '0')}-${String(upcomingSessionDay).padStart(2, '0')}`, sessionLabel: 'निश्चित छैन' };
    }

    const sessionDateBs = upcomingSessionNepaliDate.format('YYYY-MM-DD');
    const monthLabel = NEPALI_MONTHS_NAMES[upcomingSessionMonth];
    const sessionLabel = `${monthLabel} ${upcomingSessionDay}, ${upcomingSessionYear}`;
    return { sessionDateBs, sessionLabel };
};


export const ImmunizationTracking: React.FC<ImmunizationTrackingProps> = ({
  currentFiscalYear,
  records,
  generalSettings
}) => {
  const [searchTermUpcoming, setSearchTermUpcoming] = useState('');
  const [searchTermDefaulter, setSearchTermDefaulter] = useState('');
  const [searchTermFIC, setSearchTermFIC] = useState('');
  const [selectedChildForCard, setSelectedChildForCard] = useState<ChildImmunizationRecord | null>(null);

  const todayBs = useMemo(() => getTodayBs(), []);
  const todayBsFormatted = useMemo(() => getTodayBsFormatted(), []);
  const upcomingSession = useMemo(() => getUpcomingSessionDate(todayBs), [todayBs]);

  interface ChildVaccineDue {
      child: ChildImmunizationRecord;
      vaccine: ChildImmunizationVaccine;
  }

  const upcomingSessionList = useMemo(() => {
    const list: ChildVaccineDue[] = [];
    records
      .filter(r => r.fiscalYear === currentFiscalYear)
      .forEach(child => {
        child.vaccines.forEach(vaccine => {
          if (
            vaccine.status === 'Pending' &&
            vaccine.scheduledDateBs === upcomingSession.sessionDateBs &&
            (child.childName.toLowerCase().includes(searchTermUpcoming.toLowerCase()) ||
             child.motherName.toLowerCase().includes(searchTermUpcoming.toLowerCase()) ||
             child.fatherName.toLowerCase().includes(searchTermUpcoming.toLowerCase()) ||
             child.regNo.toLowerCase().includes(searchTermUpcoming.toLowerCase()))
          ) {
            list.push({ child, vaccine });
          }
        });
      });
    return list.sort((a, b) => a.child.childName.localeCompare(b.child.childName));
  }, [records, currentFiscalYear, upcomingSession.sessionDateBs, searchTermUpcoming]);

  const defaulterList = useMemo(() => {
    const list: ChildVaccineDue[] = [];
    records
      .filter(r => r.fiscalYear === currentFiscalYear)
      .forEach(child => {
        child.vaccines.forEach(vaccine => {
          if (
            vaccine.status === 'Pending' &&
            vaccine.scheduledDateBs < todayBsFormatted &&
            (child.childName.toLowerCase().includes(searchTermDefaulter.toLowerCase()) ||
             child.motherName.toLowerCase().includes(searchTermDefaulter.toLowerCase()) ||
             child.fatherName.toLowerCase().includes(searchTermDefaulter.toLowerCase()) ||
             child.regNo.toLowerCase().includes(searchTermDefaulter.toLowerCase()))
          ) {
            list.push({ child, vaccine });
          }
        });
      });
    return list.sort((a, b) => a.vaccine.scheduledDateBs.localeCompare(b.vaccine.scheduledDateBs));
  }, [records, currentFiscalYear, todayBsFormatted, searchTermDefaulter]);

  const ficList = useMemo(() => {
    return records
      .filter(r => r.fiscalYear === currentFiscalYear)
      .filter(child => {
        const mr2 = child.vaccines.find(v => v.name.toLowerCase().includes('mr-2'));
        const typhoid = child.vaccines.find(v => v.name.toLowerCase().includes('typhoid'));
        const isFullyVax = (mr2?.status === 'Given') || (typhoid?.status === 'Given');
        
        const matchesSearch = child.childName.toLowerCase().includes(searchTermFIC.toLowerCase()) ||
                            child.motherName.toLowerCase().includes(searchTermFIC.toLowerCase()) ||
                            child.regNo.toLowerCase().includes(searchTermFIC.toLowerCase());

        return isFullyVax && matchesSearch;
      })
      .sort((a, b) => a.childName.localeCompare(b.childName));
  }, [records, currentFiscalYear, searchTermFIC]);

  const handlePrint = useCallback((listType: 'upcoming' | 'defaulter' | 'fic' | 'single-card') => {
    const printContentId = 
        listType === 'upcoming' ? 'upcoming-list-print' : 
        listType === 'defaulter' ? 'defaulter-list-print' : 
        listType === 'fic' ? 'fic-list-print' : 'single-card-print';
        
    const originalContents = document.body.innerHTML;
    const printContents = document.getElementById(printContentId)?.innerHTML;

    if (!printContents) {
      alert('प्रिन्ट गर्नको लागि कुनै डाटा छैन।');
      return;
    }

    document.body.innerHTML = printContents;
    window.print();
    document.body.innerHTML = originalContents; 
    window.location.reload(); 
  }, []);

  const getCompletionDate = (child: ChildImmunizationRecord) => {
    const lastVax = child.vaccines.find(v => v.name.toLowerCase().includes('mr-2')) || 
                  child.vaccines.find(v => v.name.toLowerCase().includes('typhoid'));
    return lastVax?.givenDateBs || '-';
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
        {/* Print Styles */}
        <style dangerouslySetInnerHTML={{ __html: `
            @media print {
                body { margin: 0; padding: 0; background: white !important; }
                .print-container { width: 100%; margin: 0; padding: 0; font-family: 'Mukta', sans-serif; font-size: 11px; }
                .print-header { text-align: center; margin-bottom: 20px; }
                .print-header h1 { font-size: 18px; font-weight: bold; margin: 5px 0; }
                .print-header h2 { font-size: 14px; margin: 3px 0; }
                .print-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                .print-table th, .print-table td { border: 1px solid #ccc; padding: 6px; text-align: left; }
                .print-table th { background-color: #f0f0f0; font-weight: bold; }
                
                #single-card-print { 
                    border: 10px double #115e59 !important; 
                    padding: 40px !important; 
                    text-align: center !important; 
                    max-width: 190mm !important; 
                    margin: 0 auto !important;
                    background: white !important;
                    box-shadow: none !important;
                    height: 277mm !important;
                }
                .no-print { display: none !important; }
            }
        `}} />

        {/* Upcoming Session */}
        <div className="bg-white p-6 rounded-2xl border border-blue-200 shadow-sm no-print">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3 text-blue-800">
                    <Calendar size={24} className="text-blue-600"/>
                    <div>
                        <h3 className="font-bold text-lg font-nepali">आगामी खोप सत्र: {upcomingSession.sessionLabel}</h3>
                        <p className="text-sm text-blue-700">मिति: {upcomingSession.sessionDateBs} (BS)</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="relative w-64">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="नाम, दर्ता नं खोज्नुहोस्..." className="w-full pl-9 pr-4 py-1.5 rounded-lg border text-xs focus:ring-2 focus:ring-blue-500/20" value={searchTermUpcoming} onChange={e => setSearchTermUpcoming(e.target.value)} />
                    </div>
                    <button onClick={() => handlePrint('upcoming')} disabled={upcomingSessionList.length === 0} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 disabled:opacity-50">
                        <Printer size={18}/> प्रिन्ट सूची
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-blue-50 text-blue-800 font-bold">
                        <tr>
                            <th className="px-6 py-3">बच्चाको नाम</th>
                            <th className="px-6 py-3">आमा/बुबाको नाम</th>
                            <th className="px-6 py-3">फोन</th>
                            <th className="px-6 py-3">खोपको नाम</th>
                            <th className="px-6 py-3">जन्म मिति (BS)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-100">
                        {upcomingSessionList.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic font-nepali">कुनै आगामी खोप भेटिएन।</td></tr>
                        ) : (
                            upcomingSessionList.map((item, idx) => (
                                <tr key={item.child.id + item.vaccine.name} className="hover:bg-blue-50/50 transition-colors">
                                    <td className="px-6 py-4 font-bold">{item.child.childName}</td>
                                    <td className="px-6 py-4">{item.child.motherName} / {item.child.fatherName}</td>
                                    <td className="px-6 py-4">{item.child.phone}</td>
                                    <td className="px-6 py-4 font-bold text-blue-700">{item.vaccine.name}</td>
                                    <td className="px-6 py-4">{item.child.dobBs} ({calculateAge(item.child.dobBs)})</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Defaulter List */}
        <div className="bg-white p-6 rounded-2xl border border-red-200 shadow-sm no-print">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3 text-red-800">
                    <AlertOctagon size={24} className="text-red-600"/>
                    <div>
                        <h3 className="font-bold text-lg font-nepali">खोप छुटेका बच्चाहरू (Defaulter List)</h3>
                        <p className="text-sm text-red-700">निर्धारित मिति नाघिसकेका खोपहरू</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="relative w-64">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="नाम, दर्ता नं खोज्नुहोस्..." className="w-full pl-9 pr-4 py-1.5 rounded-lg border text-xs focus:ring-2 focus:ring-red-500/20" value={searchTermDefaulter} onChange={e => setSearchTermDefaulter(e.target.value)} />
                    </div>
                    <button onClick={() => handlePrint('defaulter')} disabled={defaulterList.length === 0} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-red-700 disabled:opacity-50">
                        <Printer size={18}/> प्रिन्ट सूची
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-red-50 text-red-800 font-bold">
                        <tr>
                            <th className="px-6 py-3">बच्चाको नाम</th>
                            <th className="px-6 py-3">आमा/बुबाको नाम</th>
                            <th className="px-6 py-3">फोन</th>
                            <th className="px-6 py-3">खोपको नाम</th>
                            <th className="px-6 py-3">निर्धारित मिति (BS)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100">
                        {defaulterList.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic font-nepali">कुनै खोप छुटेका बच्चाहरू भेटिएनन्।</td></tr>
                        ) : (
                            defaulterList.map((item, idx) => (
                                <tr key={item.child.id + item.vaccine.name} className="hover:bg-red-50/50 transition-colors">
                                    <td className="px-6 py-4 font-bold">{item.child.childName}</td>
                                    <td className="px-6 py-4">{item.child.motherName} / {item.child.fatherName}</td>
                                    <td className="px-6 py-4">{item.child.phone}</td>
                                    <td className="px-6 py-4 font-bold text-red-700">{item.vaccine.name}</td>
                                    <td className="px-6 py-4">{item.vaccine.scheduledDateBs}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* FIC List */}
        <div className="bg-white p-6 rounded-2xl border border-teal-200 shadow-sm no-print">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3 text-teal-800">
                    <CheckCircle2 size={24} className="text-teal-600"/>
                    <div>
                        <h3 className="font-bold text-lg font-nepali">पूर्ण खोप पाएका बच्चाहरू (FIC - 15 Months)</h3>
                        <p className="text-sm text-teal-700">रेकर्डमा क्लिक गरी पूर्ण खोप कार्ड हेर्नुहोस्</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="relative w-64">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="खोज्नुहोस्..." className="w-full pl-9 pr-4 py-1.5 rounded-lg border text-xs" value={searchTermFIC} onChange={e => setSearchTermFIC(e.target.value)} />
                    </div>
                    <button onClick={() => handlePrint('fic')} disabled={ficList.length === 0} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-teal-700 disabled:opacity-50">
                        <Printer size={18}/> प्रिन्ट नामावली
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-teal-50 text-teal-800 font-bold">
                        <tr>
                            <th className="px-6 py-3">दर्ता नं</th>
                            <th className="px-6 py-3">बच्चाको नाम</th>
                            <th className="px-6 py-3">आमाको नाम</th>
                            <th className="px-6 py-3 text-center">स्थिति</th>
                            <th className="px-6 py-3 text-right">कार्य</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-teal-100">
                        {ficList.map((child) => (
                            <tr key={child.id} onClick={() => setSelectedChildForCard(child)} className="hover:bg-teal-50/50 cursor-pointer transition-colors">
                                <td className="px-6 py-4 font-mono text-xs font-bold text-teal-600">{child.regNo}</td>
                                <td className="px-6 py-4 font-bold">{child.childName}</td>
                                <td className="px-6 py-4">{child.motherName}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className="bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-teal-200">FIC</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="p-2 text-teal-600 hover:bg-teal-100 rounded-full"><FileBadge size={20}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Card Modal */}
        {selectedChildForCard && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedChildForCard(null)}></div>
                <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                    <div className="p-4 border-b flex justify-between items-center bg-teal-600 text-white">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={24}/>
                            <h3 className="font-bold font-nepali">पूर्ण खोप प्रमाणपत्र (Full Immunization Card)</h3>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handlePrint('single-card')} className="flex items-center gap-2 px-4 py-1.5 bg-white text-teal-700 rounded-full text-xs font-bold hover:bg-teal-50 shadow-sm transition-all">
                                <Printer size={16}/> प्रिन्ट कार्ड
                            </button>
                            <button onClick={() => setSelectedChildForCard(null)} className="p-2 hover:bg-teal-700 rounded-full"><X size={20}/></button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-teal-50/30">
                        {/* THE CERTIFICATE CARD */}
                        <div id="single-card-print" className="bg-white border-[10px] border-double border-teal-800 p-8 md:p-12 rounded-lg shadow-inner max-w-[210mm] mx-auto text-slate-900 font-nepali">
                            <div className="text-center mb-8">
                                <div className="flex justify-center mb-4">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png" alt="Emblem" className="h-20 w-20 object-contain" />
                                </div>
                                
                                <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{generalSettings.orgNameNepali}</h1>
                                <h2 className="text-lg font-bold text-slate-700 mt-1">{generalSettings.subTitleNepali}</h2>
                                {generalSettings.subTitleNepali2 && <h3 className="text-sm font-bold text-slate-600">{generalSettings.subTitleNepali2}</h3>}
                                {generalSettings.subTitleNepali3 && <h3 className="text-sm font-bold text-slate-600">{generalSettings.subTitleNepali3}</h3>}
                                
                                <div className="h-px bg-slate-300 w-1/2 mx-auto my-6"></div>
                                <h4 className="text-2xl font-black text-teal-700">पूर्ण खोप सुनिश्चितता कार्ड</h4>
                                
                                <div className="mt-6 flex justify-center">
                                    <BadgeCheck size={100} className="text-teal-600 fill-teal-50"/>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8 mb-10 border-t-2 border-b-2 border-teal-100 py-8 text-sm">
                                <div className="space-y-3">
                                    <p className="flex justify-between border-b border-slate-100 pb-1"><span className="text-slate-500">दर्ता नम्बर:</span> <span className="font-bold text-teal-800 font-mono">{selectedChildForCard.regNo}</span></p>
                                    <p className="flex justify-between border-b border-slate-100 pb-1"><span className="text-slate-500">बच्चाको नाम:</span> <span className="font-bold text-lg">{selectedChildForCard.childName}</span></p>
                                    <p className="flex justify-between border-b border-slate-100 pb-1"><span className="text-slate-500">जन्म मिति (BS):</span> <span className="font-bold">{selectedChildForCard.dobBs}</span></p>
                                    <p className="flex justify-between border-b border-slate-100 pb-1"><span className="text-slate-500">लिङ्ग:</span> <span className="font-bold">{selectedChildForCard.gender === 'Male' ? 'बालक' : 'बालिका'}</span></p>
                                </div>
                                <div className="space-y-3">
                                    <p className="flex justify-between border-b border-slate-100 pb-1"><span className="text-slate-500">आमाको नाम:</span> <span className="font-bold">{selectedChildForCard.motherName}</span></p>
                                    <p className="flex justify-between border-b border-slate-100 pb-1"><span className="text-slate-500">बुबाको नाम:</span> <span className="font-bold">{selectedChildForCard.fatherName}</span></p>
                                    <p className="flex justify-between border-b border-slate-100 pb-1"><span className="text-slate-500">ठेगाना:</span> <span className="font-bold">{selectedChildForCard.address}</span></p>
                                    <p className="flex justify-between border-b border-slate-100 pb-1"><span className="text-slate-500">फोन:</span> <span className="font-bold font-mono">{selectedChildForCard.phone}</span></p>
                                </div>
                            </div>

                            <div className="mb-8 p-5 bg-teal-50 rounded-2xl border border-teal-200 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CalendarDays className="text-teal-600" size={28}/>
                                    <span className="font-bold text-teal-900 text-lg">पूर्ण खोप प्राप्त गरेको मिति:</span>
                                </div>
                                <span className="text-2xl font-black text-teal-800 border-b-4 border-teal-800 px-6">{getCompletionDate(selectedChildForCard)}</span>
                            </div>

                            <h4 className="text-center font-black text-slate-800 mb-6 underline decoration-teal-500 underline-offset-4">लगाइएका खोपहरूको व्यक्तिगत विवरण (Vaccine History)</h4>
                            <div className="overflow-x-auto border border-teal-50 rounded-2xl bg-slate-50/30">
                                <table className="w-full text-[10px] text-left">
                                    <thead className="bg-teal-50 text-teal-800 font-bold">
                                        <tr>
                                            <th className="p-3 border-b border-teal-100">खोपको नाम</th>
                                            <th className="p-3 border-b border-teal-100">निर्धारित मिति (Scheduled)</th>
                                            <th className="p-3 border-b border-teal-100">लगाएको मिति (Administered)</th>
                                            <th className="p-3 border-b border-teal-100">अवस्था</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-teal-50">
                                        {selectedChildForCard.vaccines.map((v, i) => (
                                            <tr key={i} className="hover:bg-white/60 transition-colors">
                                                <td className="p-3 font-bold text-slate-700">{v.name}</td>
                                                <td className="p-3 font-mono text-slate-500">{v.scheduledDateBs}</td>
                                                <td className="p-3 font-mono font-black text-teal-700">{v.givenDateBs || '-'}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-0.5 rounded-full font-bold text-[8px] border ${v.status === 'Given' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                                        {v.status === 'Given' ? 'लगाएको' : (v.status === 'Missed' ? 'छुटेको' : 'बाँकी')}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-12 text-center">
                                <p className="text-lg font-bold text-teal-900 leading-relaxed italic px-10">
                                    "प्रमाणित गरिन्छ कि माथि उल्लेखित बच्चाले नेपाल सरकारको राष्ट्रिय खोप कार्यक्रम अन्तर्गत १५ महिना भित्र पाउनुपर्ने सबै खोपहरू पूर्ण रूपमा प्राप्त गरिसकेको छ।"
                                </p>
                            </div>

                            <div className="mt-20 grid grid-cols-2 gap-24 text-sm font-bold px-10">
                                <div className="text-center">
                                    <p className="border-t-2 border-slate-800 pt-3">खोप दिने स्वास्थ्यकर्मी</p>
                                </div>
                                <div className="text-center">
                                    <p className="border-t-2 border-slate-800 pt-3">स्वास्थ्य संस्था प्रमुख</p>
                                </div>
                            </div>
                            
                            <div className="mt-12 text-center text-[10px] text-slate-400 font-mono italic">
                                Printed on: {todayBsFormatted} | {generalSettings.orgNameEnglish} | Smart Inventory System
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* HIDDEN PRINT CONTAINERS */}
        <div id="upcoming-list-print" className="hidden print-container">
            <div className="print-header">
                <h1>{upcomingSession.sessionLabel} को लागि खोप सत्र सूची</h1>
                <h2>मिति: {upcomingSession.sessionDateBs} (BS)</h2>
            </div>
            <table className="print-table">
                <thead>
                    <tr><th>बच्चाको नाम</th><th>आमा/बुबाको नाम</th><th>खोपको नाम</th><th>जन्म मिति</th></tr>
                </thead>
                <tbody>
                    {upcomingSessionList.map((item, idx) => (
                        <tr key={idx}><td>{item.child.childName}</td><td>{item.child.motherName}</td><td>{item.vaccine.name}</td><td>{item.child.dobBs}</td></tr>
                    ))}
                </tbody>
            </table>
        </div>

        <div id="defaulter-list-print" className="hidden print-container">
            <div className="print-header"><h1>खोप छुटेका बच्चाहरूको सूची</h1></div>
            <table className="print-table">
                <thead><tr><th>बच्चाको नाम</th><th>खोपको नाम</th><th>निर्धारित मिति</th></tr></thead>
                <tbody>
                    {defaulterList.map((item, idx) => (
                        <tr key={idx}><td>{item.child.childName}</td><td>{item.vaccine.name}</td><td>{item.vaccine.scheduledDateBs}</td></tr>
                    ))}
                </tbody>
            </table>
        </div>

        <div id="fic-list-print" className="hidden print-container">
            <div className="print-header"><h1>पूर्ण खोप पुरा गरेका बच्चाहरूको नामावली (FIC)</h1></div>
            <table className="print-table">
                <thead><tr><th>क्रम</th><th>दर्ता नं</th><th>बच्चाको नाम</th><th>ठेगाना</th></tr></thead>
                <tbody>
                    {ficList.map((child, idx) => (
                        <tr key={idx}><td>{idx + 1}</td><td>{child.regNo}</td><td>{child.childName}</td><td>{child.address}</td></tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};
