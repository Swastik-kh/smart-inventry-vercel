
import React, { useState, useMemo, useCallback } from 'react';
import { Baby, Printer, AlertOctagon, Calendar, Clock, Info, User, Phone, MapPin, Search } from 'lucide-react';
import { ChildImmunizationRecord, ChildImmunizationVaccine } from '../types/healthTypes';
import { Option } from '../types/coreTypes';
import { Input } from './Input';
import { Select } from './Select';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface ImmunizationTrackingProps {
  currentFiscalYear: string;
  records: ChildImmunizationRecord[];
}

const NEPALI_MONTHS_NAMES = [
    'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 
    'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फागुन', 'चैत्र'
];

const getTodayBs = () => {
  try {
    return new NepaliDate();
  } catch (e) {
    return new NepaliDate(2080, 0, 1); // Fallback to a safe date
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
        // NepaliDate doesn't have a direct method for days in prev month from its API, 
        // so a fixed 30 is a common approximation for age calculation context.
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

// Logic to determine the next upcoming 6th or 20th
const getUpcomingSessionDate = (todayNepali: NepaliDate): { sessionDateBs: string; sessionLabel: string; } => {
    let targetYear = todayNepali.getYear();
    let targetMonth = todayNepali.getMonth(); // 0-indexed
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
        // Today is after 20th, next session is 6th of next month
        upcomingSessionDay = 6;
        upcomingSessionMonth = targetMonth + 1;
        upcomingSessionYear = targetYear;

        if (upcomingSessionMonth > 11) { // Month rolls over to next year
            upcomingSessionMonth = 0;
            upcomingSessionYear++;
        }
    }

    let upcomingSessionNepaliDate;
    try {
        upcomingSessionNepaliDate = new NepaliDate(upcomingSessionYear, upcomingSessionMonth, upcomingSessionDay);
    } catch (error) {
        // Fallback for edge cases where NepaliDate might not handle future dates very far, or invalid day
        console.error("Error creating upcoming session NepaliDate, falling back to approximation:", error);
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
}) => {
  const [searchTermUpcoming, setSearchTermUpcoming] = useState('');
  const [searchTermDefaulter, setSearchTermDefaulter] = useState('');

  const todayBs = useMemo(() => getTodayBs(), []);
  const todayBsFormatted = useMemo(() => getTodayBsFormatted(), []);
  const upcomingSession = useMemo(() => getUpcomingSessionDate(todayBs), [todayBs]);

  // Combined type for a child with a specific pending vaccine
  interface ChildVaccineDue {
      child: ChildImmunizationRecord;
      vaccine: ChildImmunizationVaccine;
  }

  // Logic for Upcoming Session List
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

  // Logic for Defaulter List
  const defaulterList = useMemo(() => {
    const list: ChildVaccineDue[] = [];
    records
      .filter(r => r.fiscalYear === currentFiscalYear)
      .forEach(child => {
        child.vaccines.forEach(vaccine => {
          // Check if scheduled date has passed and status is still pending
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
    // Sort defaulters by scheduled date (earliest first)
    return list.sort((a, b) => a.vaccine.scheduledDateBs.localeCompare(b.vaccine.scheduledDateBs));
  }, [records, currentFiscalYear, todayBsFormatted, searchTermDefaulter]);

  const handlePrint = useCallback((listType: 'upcoming' | 'defaulter') => {
    const printContentId = listType === 'upcoming' ? 'upcoming-list-print' : 'defaulter-list-print';
    const originalContents = document.body.innerHTML;
    const printContents = document.getElementById(printContentId)?.innerHTML;

    if (!printContents) {
      alert('प्रिन्ट गर्नको लागि कुनै डाटा छैन।');
      return;
    }

    document.body.innerHTML = printContents;
    window.print();
    document.body.innerHTML = originalContents; // Restore original content after print
    window.location.reload(); // Reload to re-mount React app if necessary

  }, []);


  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
        {/* Print Styles */}
        <style dangerouslySetInnerHTML={{ __html: `
            @media print {
                body { margin: 0; padding: 0; }
                .print-container { width: 100%; margin: 0; padding: 0; font-family: 'Mukta', sans-serif; font-size: 11px; }
                .print-header { text-align: center; margin-bottom: 20px; }
                .print-header h1 { font-size: 18px; font-weight: bold; margin: 5px 0; }
                .print-header h2 { font-size: 14px; margin: 3px 0; }
                .print-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                .print-table th, .print-table td { border: 1px solid #ccc; padding: 6px; text-align: left; }
                .print-table th { background-color: #f0f0f0; font-weight: bold; }
                .print-meta { font-size: 10px; text-align: right; margin-top: 10px; }
                .print-page-break { page-break-after: always; }
            }
        `}} />

        {/* Upcoming Session */}
        <div className="bg-white p-6 rounded-2xl border border-blue-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3 text-blue-800">
                    <Calendar size={24} className="text-blue-600"/>
                    <div>
                        <h3 className="font-bold text-lg font-nepali">आगामी खोप सत्र: {upcomingSession.sessionLabel}</h3>
                        <p className="text-sm text-blue-700">मिति: {upcomingSession.sessionDateBs} (BS)</p>
                    </div>
                </div>
                <div className="relative w-64">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="नाम, दर्ता नं खोज्नुहोस्..." className="w-full pl-9 pr-4 py-1.5 rounded-lg border text-xs focus:ring-2 focus:ring-blue-500/20" value={searchTermUpcoming} onChange={e => setSearchTermUpcoming(e.target.value)} />
                </div>
                <button onClick={() => handlePrint('upcoming')} disabled={upcomingSessionList.length === 0} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 disabled:opacity-50">
                    <Printer size={18}/> प्रिन्ट सूची
                </button>
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
                                <tr key={item.child.id + item.vaccine.name} className="hover:bg-blue-50/50">
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
        <div className="bg-white p-6 rounded-2xl border border-red-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3 text-red-800">
                    <AlertOctagon size={24} className="text-red-600"/>
                    <div>
                        <h3 className="font-bold text-lg font-nepali">खोप छुटेका बच्चाहरू (Defaulter List)</h3>
                        <p className="text-sm text-red-700">निर्धारित मिति नाघिसकेका खोपहरू</p>
                    </div>
                </div>
                <div className="relative w-64">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="नाम, दर्ता नं खोज्नुहोस्..." className="w-full pl-9 pr-4 py-1.5 rounded-lg border text-xs focus:ring-2 focus:ring-red-500/20" value={searchTermDefaulter} onChange={e => setSearchTermDefaulter(e.target.value)} />
                </div>
                <button onClick={() => handlePrint('defaulter')} disabled={defaulterList.length === 0} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-red-700 disabled:opacity-50">
                    <Printer size={18}/> प्रिन्ट सूची
                </button>
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
                                <tr key={item.child.id + item.vaccine.name} className="hover:bg-red-50/50">
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

        {/* Print Only Containers (Hidden by default, shown by print CSS) */}
        <div id="upcoming-list-print" className="hidden print-container">
            <div className="print-header">
                <h1>{upcomingSession.sessionLabel} को लागि खोप सत्र सूची</h1>
                <h2>मिति: {upcomingSession.sessionDateBs} (BS)</h2>
                <p>प्रिन्ट मिति: {todayBsFormatted} (BS)</p>
            </div>
            <table className="print-table">
                <thead>
                    <tr>
                        <th>बच्चाको नाम</th>
                        <th>आमा/बुबाको नाम</th>
                        <th>फोन</th>
                        <th>खोपको नाम</th>
                        <th>जन्म मिति (BS)</th>
                    </tr>
                </thead>
                <tbody>
                    {upcomingSessionList.map((item, idx) => (
                        <tr key={item.child.id + item.vaccine.name}>
                            <td>{item.child.childName}</td>
                            <td>{item.child.motherName} / {item.child.fatherName}</td>
                            <td>{item.child.phone}</td>
                            <td>{item.vaccine.name}</td>
                            <td>{item.child.dobBs} ({calculateAge(item.child.dobBs)})</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        <div id="defaulter-list-print" className="hidden print-container print-page-break">
            <div className="print-header">
                <h1>खोप छुटेका बच्चाहरूको सूची</h1>
                <h2>मिति: {todayBsFormatted} (BS)</h2>
            </div>
            <table className="print-table">
                <thead>
                    <tr>
                        <th>बच्चाको नाम</th>
                        <th>आमा/बुबाको नाम</th>
                        <th>फोन</th>
                        <th>खोपको नाम</th>
                        <th>निर्धारित मिति (BS)</th>
                    </tr>
                </thead>
                <tbody>
                    {defaulterList.map((item, idx) => (
                        <tr key={item.child.id + item.vaccine.name}>
                            <td>{item.child.childName}</td>
                            <td>{item.child.motherName} / {item.child.fatherName}</td>
                            <td>{item.child.phone}</td>
                            <td>{item.vaccine.name}</td>
                            <td>{item.vaccine.scheduledDateBs}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};
