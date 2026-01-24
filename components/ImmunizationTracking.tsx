
import React, { useState, useMemo, useCallback } from 'react';
/* Added RotateCcw to the imports from lucide-react to fix the error on line 272 */
import { Baby, Printer, AlertOctagon, Calendar, Clock, Info, User, Phone, MapPin, Search, CheckCircle2, ShieldCheck, Award, X, FileBadge, BadgeCheck, CalendarDays, CalendarClock, ListFilter, Users, MapPinned, Hash, RotateCcw } from 'lucide-react';
import { ChildImmunizationRecord, ChildImmunizationVaccine } from '../types/healthTypes';
import { Option, OrganizationSettings } from '../types/coreTypes';
import { Input } from './Input';
import { Select } from './Select';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';
// Add missing import for NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE
import { NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE } from './ChildImmunizationRegistration';

interface ImmunizationTrackingProps {
  currentFiscalYear: string;
  records: ChildImmunizationRecord[];
  generalSettings: OrganizationSettings;
}

const NEPALI_MONTHS_NAMES = [
    'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 
    'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फागुन', 'चैत्र'
];

const getTodayBsFormatted = () => {
  try {
    return new NepaliDate().format('YYYY-MM-DD');
  } catch (e) {
    return '2081-01-01'; 
  }
};

const calculateAge = (dobBs: string) => {
    if (!dobBs) return "N/A";
    try {
      const today = new NepaliDate();
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
      return `${years} व, ${months} म, ${days} दि`;
    } catch (e) { 
        return "Invalid"; 
    } 
};

export const ImmunizationTracking: React.FC<ImmunizationTrackingProps> = ({
  currentFiscalYear,
  records,
  generalSettings
}) => {
  const [activeView, setActiveView] = useState<'upcoming' | 'defaulter' | 'fic'>('upcoming');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCenter, setFilterCenter] = useState('');
  const [filterDay, setFilterDay] = useState('');
  const [filterVaccine, setFilterVaccine] = useState(''); // NEW: State for vaccine filter
  const [selectedChildForCard, setSelectedChildForCard] = useState<ChildImmunizationRecord | null>(null);

  const todayBs = useMemo(() => new NepaliDate(), []);
  const todayBsFormatted = useMemo(() => getTodayBsFormatted(), []);

  // Options for filters
  const centerOptions: Option[] = useMemo(() => 
    (generalSettings.vaccinationCenters || ['मुख्य अस्पताल']).map(c => ({ id: c, value: c, label: c })),
    [generalSettings.vaccinationCenters]
  );

  const sessionDayOptions: Option[] = useMemo(() => 
    (generalSettings.vaccinationSessions || [6, 20]).map(d => ({ id: d.toString(), value: d.toString(), label: `${d} गते` })),
    [generalSettings.vaccinationSessions]
  );

  // NEW: Vaccine Name Options
  const vaccineNameOptions: Option[] = useMemo(() => {
    // Assuming NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE is accessible
    if (typeof NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE === 'undefined') return [];
    
    const uniqueVaccineNames = new Set<string>();
    NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE.forEach(vax => uniqueVaccineNames.add(vax.name));
    
    return Array.from(uniqueVaccineNames).sort().map(name => ({ id: name, value: name, label: name }));
  }, []);

  // Updated Interface to support grouping
  interface GroupedChildVaccineDue {
      child: ChildImmunizationRecord;
      vaccines: ChildImmunizationVaccine[];
      scheduledDateBs: string;
  }

  // Filter records based on Center, Day, and Search
  const filteredBaseRecords = useMemo(() => {
    return records
      .filter(r => r.fiscalYear === currentFiscalYear)
      .filter(r => {
        const matchesSearch = r.childName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             r.regNo.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCenter = filterCenter ? r.vaccinationCenter === filterCenter : true;
        
        return matchesSearch && matchesCenter;
      });
  }, [records, currentFiscalYear, searchTerm, filterCenter]);

  // Grouped Upcoming List (Now strictly "Due List" - Date <= Today)
  const upcomingSessionList = useMemo(() => {
    const groupedMap = new Map<string, GroupedChildVaccineDue>();

    filteredBaseRecords.forEach(child => {
        child.vaccines.forEach(vaccine => {
          // If a specific day is filtered, only show vaccines scheduled for that day of any month
          const vaccineDay = vaccine.scheduledDateBs.split('-')[2];
          const matchesDay = filterDay ? vaccineDay === filterDay.padStart(2, '0') : true;
          // NEW: Filter by vaccine name
          const matchesVaccine = filterVaccine ? vaccine.name === filterVaccine : true;

          if (
            vaccine.status === 'Pending' &&
            vaccine.scheduledDateBs <= todayBsFormatted && // Logic Change: Only show if date has reached (<= Today)
            matchesDay &&
            matchesVaccine 
          ) {
            // Create a unique key based on child ID and scheduled date to group
            const key = `${child.id}-${vaccine.scheduledDateBs}`;
            
            if (!groupedMap.has(key)) {
                groupedMap.set(key, {
                    child,
                    vaccines: [],
                    scheduledDateBs: vaccine.scheduledDateBs
                });
            }
            groupedMap.get(key)?.vaccines.push(vaccine);
          }
        });
      });
    
    // Sort by scheduled date ascending (oldest due first)
    return Array.from(groupedMap.values()).sort((a, b) => a.scheduledDateBs.localeCompare(b.scheduledDateBs));
  }, [filteredBaseRecords, todayBsFormatted, filterDay, filterVaccine]); 

  // Grouped Defaulter List
  const defaulterList = useMemo(() => {
    const groupedMap = new Map<string, GroupedChildVaccineDue>();

    filteredBaseRecords.forEach(child => {
        child.vaccines.forEach(vaccine => {
          const vaccineDay = vaccine.scheduledDateBs.split('-')[2];
          const matchesDay = filterDay ? vaccineDay === filterDay.padStart(2, '0') : true;
          // NEW: Filter by vaccine name
          const matchesVaccine = filterVaccine ? vaccine.name === filterVaccine : true;

          if (
            vaccine.status === 'Pending' &&
            vaccine.scheduledDateBs < todayBsFormatted && // Past date
            matchesDay &&
            matchesVaccine 
          ) {
             // Create a unique key based on child ID and scheduled date to group
             const key = `${child.id}-${vaccine.scheduledDateBs}`;
            
             if (!groupedMap.has(key)) {
                 groupedMap.set(key, {
                     child,
                     vaccines: [],
                     scheduledDateBs: vaccine.scheduledDateBs
                 });
             }
             groupedMap.get(key)?.vaccines.push(vaccine);
          }
        });
      });
    
    return Array.from(groupedMap.values()).sort((a, b) => a.scheduledDateBs.localeCompare(b.scheduledDateBs));
  }, [filteredBaseRecords, todayBsFormatted, filterDay, filterVaccine]); 

  const ficList = useMemo(() => {
    return filteredBaseRecords
      .filter(child => {
        const mr2 = child.vaccines.find(v => v.name.toLowerCase().includes('mr-2'));
        const typhoid = child.vaccines.find(v => v.name.toLowerCase().includes('typhoid'));
        const isFullyVax = (mr2?.status === 'Given') || (typhoid?.status === 'Given');
        
        // Day filter on FIC might be less relevant but we apply it to the completion date day if present
        if (filterDay) {
            const lastVax = child.vaccines.find(v => v.name.toLowerCase().includes('mr-2')) || 
                           child.vaccines.find(v => v.name.toLowerCase().includes('typhoid'));
            const completionDay = lastVax?.givenDateBs?.split('-')[2];
            if (completionDay !== filterDay.padStart(2, '0')) return false;
        }

        // Vaccine filter on FIC - only if the completed vaccine is the one being filtered
        if (filterVaccine) {
            const completedVaccineMatchesFilter = child.vaccines.some(v => 
                v.status === 'Given' && v.name === filterVaccine
            );
            if (!completedVaccineMatchesFilter) return false;
        }

        return isFullyVax;
      })
      .sort((a, b) => a.childName.localeCompare(b.childName));
  }, [filteredBaseRecords, filterDay, filterVaccine]); // NEW: Add filterVaccine to deps

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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
        {/* Custom Print Helper Styles */}
        <style dangerouslySetInnerHTML={{ __html: `
            @media print {
                body { margin: 0; padding: 0; background: white !important; -webkit-print-color-adjust: exact; }
                .no-print { display: none !important; }
                .print-container { display: block !important; padding: 20px; font-family: 'Mukta', sans-serif !important; }
                .print-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                .print-header h1 { font-size: 20px; }
                .print-header h2 { font-size: 16px; }
                .print-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                .print-table th, .print-table td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 12px; }
                .print-table th { background-color: #f2f2f2 !important; }
                
                #single-card-print { 
                    border: 5px double #115e59 !important; 
                    padding: 15px !important; 
                    text-align: center !important; 
                    width: 210mm !important;
                    height: 297mm !important;
                    margin: 0 auto !important;
                    background: white !important;
                    box-shadow: none !important;
                    page-break-after: always;
                    display: flex;
                    flex-direction: column;
                }
                @page { size: A4; margin: 0; }
            }
        `}} />

        {/* View Selection Tabs & Search */}
        <div className="flex flex-col gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm no-print">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner w-full md:w-auto">
                    <button 
                        onClick={() => { setActiveView('upcoming'); setSearchTerm(''); }}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeView === 'upcoming' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                    >
                        <CalendarClock size={18}/> आगामी खोप (Due List)
                    </button>
                    <button 
                        onClick={() => { setActiveView('defaulter'); setSearchTerm(''); }}
                        className={`flex-1 md::flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeView === 'defaulter' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}
                    >
                        <AlertOctagon size={18}/> छुटेका (Defaulters)
                    </button>
                    <button 
                        onClick={() => { setActiveView('fic'); setSearchTerm(''); }}
                        className={`flex-1 md::flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeView === 'fic' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500'}`}
                    >
                        <BadgeCheck size={18}/> पूर्ण खोप (FIC)
                    </button>
                </div>

                <div className="relative w-full md:w-80">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="बच्चाको नाम वा दर्ता नं खोज्नुहोस्..." 
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-4 focus:ring-primary-500/10 outline-none text-sm"
                    />
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-end gap-4 pt-4 border-t border-slate-100">
                <div className="w-full md:w-64">
                    <Select 
                        label="खोप केन्द्र फिल्टर" 
                        options={[{id: 'all', value: '', label: '-- सबै केन्द्रहरू --'}, ...centerOptions]} 
                        value={filterCenter}
                        onChange={e => setFilterCenter(e.target.value)}
                        icon={<MapPinned size={16}/>}
                    />
                </div>
                <div className="w-full md:w-48">
                    <Select 
                        label="सत्रको गते फिल्टर" 
                        options={[{id: 'all', value: '', label: '-- सबै गतेहरू --'}, ...sessionDayOptions]} 
                        value={filterDay}
                        onChange={e => setFilterDay(e.target.value)}
                        icon={<Hash size={16}/>}
                    />
                </div>
                {/* NEW: Vaccine Name Filter */}
                <div className="w-full md:w-64">
                    <Select 
                        label="खोपको नाम फिल्टर" 
                        options={[{id: 'all', value: '', label: '-- सबै खोपहरू --'}, ...vaccineNameOptions]} 
                        value={filterVaccine}
                        onChange={e => setFilterVaccine(e.target.value)}
                        icon={<Baby size={16}/>}
                    />
                </div>
                <button 
                    onClick={() => { setFilterCenter(''); setFilterDay(''); setFilterVaccine(''); setSearchTerm(''); }} // NEW: Reset filterVaccine
                    className="flex items-center gap-2 px-4 py-2.5 text-slate-500 hover:text-slate-700 font-bold text-xs"
                >
                    <RotateCcw size={14}/> रिसेट फिल्टर
                </button>
                <div className="ml-auto">
                    <button 
                        onClick={() => handlePrint(activeView)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-slate-900"
                    >
                        <Printer size={18}/> सूची प्रिन्ट गर्नुहोस्
                    </button>
                </div>
            </div>
        </div>

        {/* List View Container */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden no-print">
            {activeView === 'upcoming' && (
                <div className="animate-in fade-in duration-300">
                    <div className="p-4 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-blue-800">
                            <CalendarDays className="text-blue-600" />
                            <span className="font-bold font-nepali">
                                खोप लगाउन योग्य (Due List - Scheduled Date Reached)
                                {filterCenter && ` - केन्द्र: ${filterCenter}`}
                                {filterDay && ` - गते: ${filterDay}`}
                                {filterVaccine && ` - खोप: ${filterVaccine}`} {/* NEW: Display vaccine filter */}
                            </span>
                        </div>
                        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">{upcomingSessionList.length} रेकर्डहरू</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold border-b">
                                <tr>
                                    <th className="px-6 py-3">बच्चाको विवरण / केन्द्र</th>
                                    <th className="px-6 py-3">अभिभावक / ठेगाना</th>
                                    <th className="px-6 py-3 text-center">लगाउनुपर्ने खोप (Vaccines Due)</th>
                                    <th className="px-6 py-3 text-center">निर्धारित मिति</th>
                                    <th className="px-6 py-3 text-right">सम्पर्क</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {upcomingSessionList.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">{item.child.childName}</div>
                                            <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                                <MapPinned size={10} className="text-blue-500"/> {item.child.vaccinationCenter}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-slate-600 font-medium">{item.child.motherName}</div>
                                            <div className="text-[10px] text-slate-400">{item.child.address}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-wrap gap-1 justify-center">
                                                {item.vaccines.map((vax, vIdx) => (
                                                    <span key={vIdx} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg font-black text-[11px] border border-blue-200">
                                                        {vax.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-slate-600 font-nepali">
                                            {item.scheduledDateBs}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-600">{item.child.phone}</td>
                                    </tr>
                                ))}
                                {upcomingSessionList.length === 0 && <tr><td colSpan={5} className="p-12 text-center text-slate-400 italic font-nepali text-lg">छानिएको फिल्टरमा कुनै विवरण फेला परेन।</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeView === 'defaulter' && (
                <div className="animate-in fade-in duration-300">
                    <div className="p-4 bg-red-50 border-b border-red-100 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-red-800">
                            <AlertOctagon className="text-red-600" />
                            <span className="font-bold font-nepali">
                                छुटेका बालबालिकाहरू (Defaulter List)
                                {filterCenter && ` - केन्द्र: ${filterCenter}`}
                                {filterDay && ` - गते: ${filterDay}`}
                                {filterVaccine && ` - खोप: ${filterVaccine}`} {/* NEW: Display vaccine filter */}
                            </span>
                        </div>
                        <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">{defaulterList.length} जना बाँकी</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold border-b">
                                <tr>
                                    <th className="px-6 py-3">बच्चाको विवरण / केन्द्र</th>
                                    <th className="px-6 py-3">नछुटेको खोप (Missed Vaccines) / मिति</th>
                                    <th className="px-6 py-3 text-center">सम्पर्क</th>
                                    <th className="px-6 py-3 text-right">स्थिति</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {defaulterList.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-red-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">{item.child.childName}</div>
                                            <div className="text-[10px] text-slate-500 flex items-center gap-1"><MapPinned size={10}/> {item.child.vaccinationCenter}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1 mb-1">
                                                {item.vaccines.map((vax, vIdx) => (
                                                    <span key={vIdx} className="font-black text-red-600 text-xs bg-red-50 px-1.5 rounded border border-red-100">
                                                        {vax.name}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="text-[10px] text-slate-500">निर्धारित मिति: {item.scheduledDateBs}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center font-mono font-bold text-slate-600">{item.child.phone}</td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded-full text-[10px] font-bold border border-red-100 animate-pulse">
                                                <Clock size={10}/> Overdue
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {defaulterList.length === 0 && <tr><td colSpan={4} className="p-12 text-center text-slate-400 italic font-nepali">हाल खोप छुटेका कोही छैनन्।</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeView === 'fic' && (
                <div className="animate-in fade-in duration-300">
                    <div className="p-4 bg-teal-50 border-b border-teal-100 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-teal-800">
                            <BadgeCheck className="text-teal-600" />
                            <span className="font-bold font-nepali">पूर्ण खोप पुरा गरेका बालबालिकाहरू (FIC)</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold border-b">
                                <tr>
                                    <th className="px-6 py-3">बच्चाको नाम / केन्द्र</th>
                                    <th className="px-6 py-3">आमाको नाम</th>
                                    <th className="px-6 py-3">ठेगाना</th>
                                    <th className="px-6 py-3 text-right">सम्पन्न मिति</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {ficList.map((child) => (
                                    <tr 
                                        key={child.id} 
                                        onClick={() => setSelectedChildForCard(child)}
                                        className="hover:bg-teal-50/50 cursor-pointer transition-colors group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">{child.childName}</div>
                                            <div className="text-[10px] text-slate-500 flex items-center gap-1"><MapPinned size={10}/> {child.vaccinationCenter}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{child.motherName}</td>
                                        <td className="px-6 py-4 text-slate-600">{child.address}</td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-teal-700 font-bold font-nepali">{getCompletionDate(child)}</span>
                                        </td>
                                    </tr>
                                ))}
                                {ficList.length === 0 && <tr><td colSpan={4} className="p-12 text-center text-slate-400 italic font-nepali">कुनै रेकर्ड छैन।</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>

        {/* FIC Card Modal and Hidden Print Containers remain the same but will respect filters */}
        {selectedChildForCard && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedChildForCard(null)}></div>
                <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                    <div className="p-4 border-b flex justify-between items-center bg-teal-600 text-white">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={24}/>
                            <h3 className="font-bold font-nepali">पूर्ण खोप सुनिश्चितता कार्ड</h3>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handlePrint('single-card')} className="flex items-center gap-2 px-4 py-1.5 bg-white text-teal-700 rounded-full text-xs font-bold hover:bg-teal-50 shadow-sm transition-all">
                                <Printer size={16}/> प्रिन्ट कार्ड
                            </button>
                            <button onClick={() => setSelectedChildForCard(null)} className="p-2 hover:bg-teal-700 rounded-full"><X size={20}/></button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 bg-teal-50/30">
                        {/* Certificate Card Content */}
                        <div id="single-card-print" className="bg-white border-[6px] border-double border-teal-800 p-4 rounded-lg shadow-inner text-slate-900 font-nepali overflow-hidden flex flex-col">
                            <div className="text-center mb-2">
                                <div className="flex justify-center mb-1">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png" alt="Emblem" className="h-10 w-10 object-contain" />
                                </div>
                                <h1 className="text-lg font-black text-slate-800 uppercase leading-tight">{generalSettings.orgNameNepali}</h1>
                                <h2 className="text-xs font-bold text-slate-700">{generalSettings.subTitleNepali}</h2>
                                <div className="h-0.5 bg-slate-300 w-1/4 mx-auto my-1"></div>
                                <h4 className="text-lg font-black text-teal-700">पूर्ण खोप सुनिश्चितता कार्ड</h4>
                            </div>

                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2 border-t border-b border-teal-100 py-2 text-[11px]">
                                <div className="space-y-0.5">
                                    <p className="flex justify-between border-b border-slate-50 pb-0.5"><span className="text-slate-500">दर्ता नम्बर:</span> <span className="font-bold text-teal-800 font-mono">{selectedChildForCard.regNo}</span></p>
                                    <p className="flex justify-between border-b border-slate-50 pb-0.5"><span className="text-slate-500">बच्चाको नाम:</span> <span className="font-bold text-sm">{selectedChildForCard.childName}</span></p>
                                    <p className="flex justify-between border-b border-slate-50 pb-0.5"><span className="text-slate-500">जन्म मिति (BS):</span> <span className="font-bold">{selectedChildForCard.dobBs}</span></p>
                                    <p className="flex justify-between border-b border-slate-50 pb-0.5"><span className="text-slate-500">लिङ्ग:</span> <span className="font-bold">{selectedChildForCard.gender === 'Male' ? 'बालक' : 'बालिका'}</span></p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="flex justify-between border-b border-slate-50 pb-0.5"><span className="text-slate-500">आमाको नाम:</span> <span className="font-bold">{selectedChildForCard.motherName}</span></p>
                                    <p className="flex justify-between border-b border-slate-50 pb-0.5"><span className="text-slate-500">बुबाको नाम:</span> <span className="font-bold">{selectedChildForCard.fatherName}</span></p>
                                    <p className="flex justify-between border-b border-slate-50 pb-0.5"><span className="text-slate-500">ठेगाना:</span> <span className="font-bold truncate max-w-[150px] text-right">{selectedChildForCard.address}</span></p>
                                    <p className="flex justify-between border-b border-slate-50 pb-0.5"><span className="text-slate-500">फोन:</span> <span className="font-bold font-mono">{selectedChildForCard.phone}</span></p>
                                </div>
                            </div>

                            <div className="mb-2 p-1.5 bg-teal-50 rounded-lg border border-teal-100 flex items-center justify-center gap-6">
                                <span className="font-bold text-teal-900 text-xs">पूर्ण खोप प्राप्त गरेको मिति:</span>
                                <span className="text-lg font-black text-teal-800 border-b border-teal-800 px-4">{getCompletionDate(selectedChildForCard)}</span>
                            </div>

                            <h4 className="text-center font-black text-slate-800 mb-1 text-xs underline decoration-teal-500 underline-offset-2">लगाइएका खोपहरूको विवरण (Vaccine History)</h4>
                            <div className="border border-teal-50 rounded-lg overflow-hidden bg-slate-50/20 flex-1">
                                <table className="w-full text-[10px] text-left border-collapse">
                                    <thead className="bg-teal-50 text-teal-800 font-bold">
                                        <tr>
                                            <th className="px-2 py-1 border-b border-teal-100">खोपको नाम</th>
                                            <th className="px-2 py-1 border-b border-teal-100">निर्धारित (BS)</th>
                                            <th className="px-2 py-1 border-b border-teal-100">लगाएको (BS)</th>
                                            <th className="px-2 py-1 border-b border-teal-100">स्थिति</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-teal-50">
                                        {selectedChildForCard.vaccines.map((v, i) => (
                                            <tr key={i}>
                                                <td className="px-2 py-0.5 font-bold text-slate-700">{v.name}</td>
                                                <td className="px-2 py-0.5 font-mono text-slate-500">{v.scheduledDateBs}</td>
                                                <td className="px-2 py-0.5 font-mono font-black text-teal-700">{v.givenDateBs || '-'}</td>
                                                <td className="px-2 py-0.5">
                                                    <span className={`font-bold text-[8px] ${v.status === 'Given' ? 'text-green-700' : 'text-red-500'}`}>
                                                        {v.status === 'Given' ? 'लगाएको' : 'बाँकी'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-2 text-center">
                                <p className="text-[11px] font-bold text-teal-900 leading-tight italic px-1">
                                    "प्रमाणित गरिन्छ कि माथि उल्लेखित बच्चाले १५ महिना भित्र पाउनुपर्ने सबै खोपहरू पूर्ण रूपमा प्राप्त गरिसकेको छ।"
                                </p>
                            </div>

                            <div className="mt-auto grid grid-cols-2 gap-x-12 text-[11px] font-bold px-4 py-4">
                                <div className="text-center">
                                    <div className="h-8 flex items-end justify-center mb-1">
                                        <div className="w-full border-b border-slate-800"></div>
                                    </div>
                                    <p>स्वास्थ्यकर्मी</p>
                                </div>
                                <div className="text-center">
                                    <div className="h-8 flex items-end justify-center mb-1">
                                        <div className="w-full border-b border-slate-800"></div>
                                    </div>
                                    <p>संस्था प्रमुख</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* PRINT SECTIONS */}
        <div id="upcoming-list-print" className="hidden print-container">
            <div className="print-header">
                <h1>{generalSettings.orgNameNepali}</h1>
                <h2>खोप तालिका विवरण (Vaccination Schedule)</h2>
                {filterCenter && <p>केन्द्र: {filterCenter}</p>}
                {filterDay && <p>सत्र गते: {filterDay}</p>}
                {filterVaccine && <p>खोपको नाम: {filterVaccine}</p>}
            </div>
            <table className="print-table">
                <thead>
                    <tr>
                        <th>बच्चाको नाम / दर्ता नं</th>
                        <th>केन्द्र</th>
                        <th>लगाउनुपर्ने खोपहरू (Vaccines Due)</th>
                        <th>निर्धारित मिति</th>
                        <th>फोन नं</th>
                    </tr>
                </thead>
                <tbody>
                    {upcomingSessionList.map((item, idx) => (
                        <tr key={idx}>
                            <td>{item.child.childName} <br/> <small>{item.child.regNo}</small></td>
                            <td>{item.child.vaccinationCenter}</td>
                            <td style={{fontWeight: 'bold'}}>
                                {item.vaccines.map(v => v.name).join(', ')}
                            </td>
                            <td>{item.scheduledDateBs}</td>
                            <td style={{fontFamily: 'monospace'}}>{item.child.phone}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        <div id="defaulter-list-print" className="hidden print-container">
            <div className="print-header">
                <h1 style={{color: 'red'}}>{generalSettings.orgNameNepali}</h1>
                <h2 style={{color: 'red'}}>खोप छुटेका बालबालिकाहरूको सूची (Defaulter List)</h2>
                {filterCenter && <p>केन्द्र: {filterCenter}</p>}
                {filterDay && <p>सत्र गते: {filterDay}</p>}
                {filterVaccine && <p>खोपको नाम: {filterVaccine}</p>}
            </div>
            <table className="print-table">
                <thead>
                    <tr>
                        <th>बच्चाको नाम</th>
                        <th>केन्द्र</th>
                        <th>छुटेका खोपहरू</th>
                        <th>निर्धारित मिति</th>
                        <th>फोन नं</th>
                    </tr>
                </thead>
                <tbody>
                    {defaulterList.map((item, idx) => (
                        <tr key={idx}>
                            <td>{item.child.childName}</td>
                            <td>{item.child.vaccinationCenter}</td>
                            <td style={{color: 'red', fontWeight: 'bold'}}>
                                {item.vaccines.map(v => v.name).join(', ')}
                            </td>
                            <td>{item.scheduledDateBs}</td>
                            <td style={{fontFamily: 'monospace'}}>{item.child.phone}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};
