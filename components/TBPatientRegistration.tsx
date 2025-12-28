import React, { useState, useEffect, useMemo } from 'react';
import { 
  Save, RotateCcw, Activity, UserPlus, List, Phone, MapPin, 
  Calendar, FileDigit, User, Stethoscope, Users, TrendingUp, 
  FlaskConical, AlertCircle, X, ChevronRight, Microscope, 
  CheckCircle2, Eye, Search, ClipboardList, History, Clock
} from 'lucide-react';
import { Input } from './Input';
import { Select } from './Select';
import { NepaliDatePicker } from './NepaliDatePicker';
import { Option } from '../types';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface TBPatientRegistrationProps {
  currentFiscalYear: string;
}

interface TBReport {
  month: number;
  result: string;
  labNo: string;
  date: string;
  dateNepali?: string;
}

interface TBPatient {
  id: string;
  patientId: string;
  name: string;
  age: string;
  address: string;
  phone: string;
  regType: string;
  classification: string;
  registrationDate: string;
  serviceType: 'TB' | 'Leprosy';
  leprosyType?: 'MB' | 'PB';
  labResultMonth2Positive?: boolean; 
  completedSchedule: number[];
  newReportAvailable?: boolean;
  latestResult?: string;
  latestReportMonth?: number;
  reports: TBReport[];
}

export const TBPatientRegistration: React.FC<TBPatientRegistrationProps> = ({ currentFiscalYear }) => {
  const [activeTab, setActiveTab] = useState<'TB' | 'Leprosy'>('TB');
  const [showSputumModal, setShowSputumModal] = useState(false);
  const [showReportCenter, setShowReportCenter] = useState(false);
  const [reportCenterTab, setReportCenterTab] = useState<'Recent' | 'History'>('Recent');
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for Lab Report Entry
  const [selectedPatient, setSelectedPatient] = useState<{patient: TBPatient, reason: string, scheduleMonth: number} | null>(null);
  const [labFormData, setLabFormData] = useState({
    testDate: new Date().toISOString().split('T')[0],
    testDateNepali: '',
    labNo: '',
    result: '',
    grading: ''
  });

  // Mock list of registered patients
  const [patients, setPatients] = useState<TBPatient[]>([
    { 
        id: '101', 
        patientId: 'TB-081082-1001', 
        name: 'Ram Bahadur', 
        age: '45', 
        address: 'Kathmandu-10', 
        phone: '9841000000', 
        regType: 'New', 
        classification: 'PBC', 
        registrationDate: '2024-08-15',
        serviceType: 'TB',
        completedSchedule: [0],
        newReportAvailable: false,
        latestResult: 'Negative',
        latestReportMonth: 0,
        reports: [
            { month: 0, result: 'Negative', labNo: '101', date: '2024-08-15', dateNepali: '२०८१/०५/३०' }
        ]
    },
    { 
        id: 'L01', 
        patientId: 'LP-081082-2001', 
        name: 'Hari Maya', 
        age: '52', 
        address: 'Dhulikhel-02', 
        phone: '9860112233', 
        regType: 'New', 
        classification: 'MB', 
        leprosyType: 'MB',
        registrationDate: '2024-09-10',
        serviceType: 'Leprosy',
        completedSchedule: [],
        newReportAvailable: false,
        reports: []
    }
  ]);
  
  const generateId = (type: 'TB' | 'Leprosy') => {
    const fyClean = currentFiscalYear.replace('/', '');
    const prefix = type === 'TB' ? 'TB' : 'LP';
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${fyClean}-${random}`;
  };

  const [formData, setFormData] = useState({
    patientId: generateId('TB'),
    name: '',
    age: '',
    address: '',
    phone: '',
    regType: '',
    classification: '',
    leprosyType: 'PB',
    registrationDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    setFormData(prev => ({ ...prev, patientId: generateId(activeTab) }));
  }, [currentFiscalYear, activeTab]);

  const regTypes: Option[] = [
    { id: 'new', label: 'नयाँ (New)', value: 'New' },
    { id: 'relapse', label: 'दोहोरिएको (Relapse)', value: 'Relapse' },
    { id: 'transfer_in', label: 'सरुवा भई आएको (Transferred In)', value: 'Transferred In' },
  ];

  const tbClassification: Option[] = [
    { id: 'pbc', label: 'PBC (Bacteriologically Confirmed)', value: 'PBC' },
    { id: 'pcd', label: 'PCD (Clinically Diagnosed)', value: 'PCD' },
    { id: 'ep', label: 'EP (Extrapulmonary)', value: 'EP' },
  ];

  const leprosyTypes: Option[] = [
    { id: 'pb', label: 'PB (Paucibacillary)', value: 'PB' },
    { id: 'mb', label: 'MB (Multibacillary)', value: 'MB' },
  ];

  const getSputumTestStatus = (p: TBPatient) => {
    if (p.serviceType !== 'TB') return { required: false, reason: '', scheduleMonth: -1 };
    const regDate = new NepaliDate(new Date(p.registrationDate));
    const today = new NepaliDate();
    const diffDays = Math.ceil(Math.abs(today.toJsDate().getTime() - regDate.toJsDate().getTime()) / (1000 * 60 * 60 * 24));
    
    const isDone = (month: number) => p.completedSchedule.includes(month);

    if (diffDays <= 30 && !isDone(0)) return { required: true, reason: 'सुरुवाती निदान (Month 0)', scheduleMonth: 0 };
    if (diffDays >= 55 && diffDays <= 75 && !isDone(2)) return { required: true, reason: 'दोस्रो महिना (Month 2)', scheduleMonth: 2 };
    if (diffDays >= 145 && diffDays <= 165 && !isDone(5)) return { required: true, reason: 'पाँचौं महिना (Month 5)', scheduleMonth: 5 };

    return { required: false, reason: '', scheduleMonth: -1 };
  };

  const patientsNeedingSputum = patients
    .map(p => ({ ...p, ...getSputumTestStatus(p) }))
    .filter(p => p.required);

  const patientsWithNewReports = patients.filter(p => p.newReportAvailable);
  // Fix: Define newReportCount based on the length of patients with new reports
  const newReportCount = patientsWithNewReports.length;
  const allReportsHistory = useMemo(() => {
      const history: {patient: TBPatient, report: TBReport}[] = [];
      patients.forEach(p => {
          p.reports.forEach(r => {
              history.push({ patient: p, report: r });
          });
      });
      return history.sort((a, b) => new Date(b.report.date).getTime() - new Date(a.report.date).getTime());
  }, [patients]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newPatient: TBPatient = {
      id: Date.now().toString(),
      ...formData,
      serviceType: activeTab,
      completedSchedule: [],
      newReportAvailable: false,
      reports: []
    };

    setPatients([newPatient, ...patients]);
    setFormData({ ...formData, patientId: generateId(activeTab), name: '', age: '', phone: '', address: '' });
    alert('बिरामी सफलतापूर्वक दर्ता भयो');
  };

  const handleLabSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(!selectedPatient) return;
      const { patient, scheduleMonth } = selectedPatient;

      setPatients(prev => prev.map(p => {
          if(p.id === patient.id) {
              const updated = { ...p };
              updated.completedSchedule = [...p.completedSchedule, scheduleMonth];
              updated.newReportAvailable = true;
              updated.latestResult = labFormData.result === 'Positive' ? `Pos (${labFormData.grading})` : 'Negative';
              updated.latestReportMonth = scheduleMonth;
              updated.reports = [{
                  month: scheduleMonth,
                  result: updated.latestResult,
                  labNo: labFormData.labNo,
                  date: labFormData.testDate,
                  dateNepali: labFormData.testDateNepali
              }, ...p.reports];
              return updated;
          }
          return p;
      }));
      setSelectedPatient(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-4">
        <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Activity size={24} /></div>
            <div>
                <h2 className="text-xl font-bold text-slate-800 font-nepali">क्षयरोग / कुष्ठरोग व्यवस्थापन</h2>
                <p className="text-sm text-slate-500">बिरामी दर्ता र ल्याब रिपोर्ट ट्र्याकिङ</p>
            </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
            <button onClick={() => setActiveTab('TB')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'TB' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>क्षयरोग (TB)</button>
            <button onClick={() => setActiveTab('Leprosy')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'Leprosy' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>कुष्ठरोग (Leprosy)</button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center justify-between">
            <div><p className="text-slate-500 text-xs font-bold font-nepali mb-1">कुल दर्ता ({activeTab})</p><h3 className="text-2xl font-black text-slate-800">{patients.filter(p => p.serviceType === activeTab).length}</h3></div>
            <div className="bg-blue-50 p-3 rounded-lg text-blue-600"><Users size={20} /></div>
        </div>

        <div onClick={() => setShowSputumModal(true)} className="bg-white p-4 rounded-xl border border-orange-200 shadow-sm flex items-center justify-between cursor-pointer hover:bg-orange-50 transition-all group">
            <div><p className="text-slate-500 text-xs font-bold font-nepali mb-1">खकार परीक्षण अनुरोध</p><h3 className="text-2xl font-black text-orange-600">{patientsNeedingSputum.length}</h3></div>
            <div className="bg-orange-100 p-3 rounded-lg text-orange-600 group-hover:scale-110 transition-transform"><FlaskConical size={20} /></div>
        </div>

        <div onClick={() => { setShowReportCenter(true); setReportCenterTab('Recent'); }} className="bg-white p-4 rounded-xl border border-teal-200 shadow-sm flex items-center justify-between cursor-pointer hover:bg-teal-50 transition-all group">
            <div><p className="text-slate-500 text-xs font-bold font-nepali mb-1">नयाँ प्राप्त रिपोर्ट</p><h3 className="text-2xl font-black text-teal-600">{newReportCount}</h3></div>
            <div className="bg-teal-100 p-3 rounded-lg text-teal-600 group-hover:scale-110 transition-transform"><Microscope size={20} /></div>
        </div>

        <div onClick={() => { setShowReportCenter(true); setReportCenterTab('History'); }} className="bg-white p-4 rounded-xl border border-indigo-200 shadow-sm flex items-center justify-between cursor-pointer hover:bg-indigo-50 transition-all group">
            <div><p className="text-slate-500 text-xs font-bold font-nepali mb-1">रिपोर्ट इतिहास</p><h3 className="text-2xl font-black text-indigo-600">{allReportsHistory.length}</h3></div>
            <div className="bg-indigo-100 p-3 rounded-lg text-indigo-600 group-hover:scale-110 transition-transform"><History size={20} /></div>
        </div>
      </div>

      {/* Registration Form */}
      <div className="bg-white p-6 rounded-2xl border shadow-sm">
        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
          <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl border flex items-center gap-4">
              <div className="bg-white p-2 rounded-lg text-indigo-600 shadow-sm"><FileDigit size={20}/></div>
              <div className="flex-1">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">बिरामी परिचय नं. (ID)</label>
                  <input value={formData.patientId} readOnly className="bg-transparent border-none text-xl font-black text-slate-800 p-0 focus:ring-0 w-full" />
              </div>
          </div>

          <Input label="बिरामीको नाम" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required icon={<User size={18}/>} />
          
          <div className="grid grid-cols-2 gap-4">
              <Input label="उमेर" type="number" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} required icon={<Calendar size={18}/>} />
              <Input label="फोन नं." value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} icon={<Phone size={18}/>} />
          </div>

          <Input label="ठेगाना" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required icon={<MapPin size={18}/>} />

          <Select label="दर्ता प्रकार" options={regTypes} value={formData.regType} onChange={e => setFormData({...formData, regType: e.target.value})} required icon={<List size={18}/>} />

          {activeTab === 'TB' ? (
              <Select label="TB वर्गीकरण" options={tbClassification} value={formData.classification} onChange={e => setFormData({...formData, classification: e.target.value})} required icon={<Stethoscope size={18}/>} />
          ) : (
              <Select label="कुष्ठरोग प्रकार (MB/PB)" options={leprosyTypes} value={formData.leprosyType} onChange={e => setFormData({...formData, leprosyType: e.target.value})} required icon={<ClipboardList size={18}/>} />
          )}

          <div className="md:col-span-2 pt-4 border-t flex justify-end gap-3">
              <button type="button" onClick={() => setFormData({...formData, name: '', age: '', phone: '', address: ''})} className="flex items-center gap-2 px-6 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all font-bold text-sm"><RotateCcw size={16}/> रिसेट</button>
              <button type="submit" className="flex items-center gap-2 px-8 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-100 transition-all font-bold text-sm"><Save size={16}/> दर्ता गर्नुहोस्</button>
          </div>
        </form>
      </div>

      {/* Patient List */}
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
              <h3 className="font-bold text-slate-700 font-nepali">हालै दर्ता भएका बिरामीहरू ({activeTab})</h3>
              <div className="relative w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="नाम वा ठेगाना..." className="w-full pl-9 pr-4 py-1.5 rounded-lg border text-xs focus:ring-2 focus:ring-indigo-500/20" />
              </div>
          </div>
          <table className="w-full text-sm text-left">
              <thead className="bg-white text-slate-500 font-bold border-b">
                  <tr>
                      <th className="px-6 py-3">ID</th>
                      <th className="px-6 py-3">बिरामी विवरण</th>
                      <th className="px-6 py-3">वर्गीकरण</th>
                      <th className="px-6 py-3">अन्तिम रिपोर्ट</th>
                      <th className="px-6 py-3">मिति</th>
                  </tr>
              </thead>
              <tbody className="divide-y">
                  {patients.filter(p => p.serviceType === activeTab && (p.name.includes(searchTerm) || p.address.includes(searchTerm))).map(p => (
                      <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-mono font-bold text-indigo-600 text-xs">{p.patientId}</td>
                          <td className="px-6 py-4">
                              <div className="font-bold text-slate-800">{p.name}</div>
                              <div className="text-[10px] text-slate-400">{p.age} Yrs | {p.address}</div>
                          </td>
                          <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${activeTab === 'TB' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
                                  {activeTab === 'TB' ? p.classification : p.leprosyType}
                              </span>
                          </td>
                          <td className="px-6 py-4">
                              {p.latestResult ? (
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${p.latestResult.includes('Pos') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{p.latestResult}</span>
                              ) : '-'}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500 font-nepali">{p.registrationDate}</td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>

      {/* Report Center Modal (Combined Recent & History) */}
      {showReportCenter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowReportCenter(false)}></div>
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95">
                  <div className="px-6 py-4 border-b bg-teal-50 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                          <div className="bg-teal-100 p-2 rounded-lg text-teal-600"><Microscope size={20}/></div>
                          <h3 className="font-bold text-slate-800 text-lg font-nepali">खकार रिपोर्ट केन्द्र (Sputum Report Center)</h3>
                      </div>
                      <button onClick={() => setShowReportCenter(false)} className="p-2 hover:bg-white/50 rounded-full"><X size={20}/></button>
                  </div>

                  <div className="flex border-b">
                      <button onClick={() => setReportCenterTab('Recent')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all ${reportCenterTab === 'Recent' ? 'bg-white text-teal-600 border-b-2 border-teal-600' : 'bg-slate-50 text-slate-400'}`}>
                          <Clock size={16}/> हालसालैका रिपोर्टहरू ({patientsWithNewReports.length})
                      </button>
                      <button onClick={() => setReportCenterTab('History')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all ${reportCenterTab === 'History' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                          <History size={16}/> रिपोर्ट इतिहास ({allReportsHistory.length})
                      </button>
                  </div>

                  <div className="flex-1 overflow-auto">
                      {reportCenterTab === 'Recent' ? (
                          <table className="w-full text-sm text-left">
                              <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0">
                                  <tr><th className="px-6 py-3">ID</th><th className="px-6 py-3">नाम</th><th className="px-6 py-3">महिना</th><th className="px-6 py-3">नतिजा</th><th className="px-6 py-3">कार्य</th></tr>
                              </thead>
                              <tbody className="divide-y">
                                  {patientsWithNewReports.map(p => (
                                      <tr key={p.id} className="hover:bg-slate-50">
                                          <td className="px-6 py-4 font-mono text-indigo-600 font-bold">{p.patientId}</td>
                                          <td className="px-6 py-4 font-bold">{p.name}</td>
                                          <td className="px-6 py-4 text-xs">Month {p.latestReportMonth}</td>
                                          <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded text-[10px] font-black ${p.latestResult?.includes('Pos') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{p.latestResult}</span></td>
                                          <td className="px-6 py-4">
                                              <button onClick={() => {
                                                  setPatients(prev => prev.map(pt => pt.id === p.id ? {...pt, newReportAvailable: false} : pt));
                                                  alert("विवरण सुरक्षित गरियो");
                                              }} className="text-teal-600 hover:underline font-bold text-xs">Mark as Viewed</button>
                                          </td>
                                      </tr>
                                  ))}
                                  {patientsWithNewReports.length === 0 && <tr><td colSpan={5} className="p-12 text-center text-slate-400 italic">कुनै नयाँ रिपोर्ट छैन।</td></tr>}
                              </tbody>
                          </table>
                      ) : (
                          <table className="w-full text-sm text-left">
                              <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0">
                                  <tr><th className="px-6 py-3">मिति</th><th className="px-6 py-3">बिरामी</th><th className="px-6 py-3">ल्याब नं</th><th className="px-6 py-3">नतिजा</th></tr>
                              </thead>
                              <tbody className="divide-y">
                                  {allReportsHistory.map((item, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50">
                                          <td className="px-6 py-4 text-xs font-nepali">{item.report.dateNepali}</td>
                                          <td className="px-6 py-4">
                                              <div className="font-bold">{item.patient.name}</div>
                                              <div className="text-[10px] text-slate-400">{item.patient.patientId}</div>
                                          </td>
                                          <td className="px-6 py-4 font-mono">{item.report.labNo}</td>
                                          <td className="px-6 py-4 font-bold">{item.report.result}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Sputum Request Modal (Required Tests) */}
      {showSputumModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowSputumModal(false)}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col animate-in zoom-in-95">
                <div className="px-6 py-4 border-b bg-orange-50 flex justify-between items-center text-orange-800">
                    <h3 className="font-bold text-lg font-nepali">खकार परीक्षण आवश्यक बिरामीहरू</h3>
                    <button onClick={() => setShowSputumModal(false)} className="p-2 hover:bg-white/50 rounded-full"><X size={20}/></button>
                </div>
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 font-bold">
                            <tr><th className="px-6 py-3">बिरामी</th><th className="px-6 py-3">कारण</th><th className="px-6 py-3 text-right">कार्य</th></tr>
                        </thead>
                        <tbody className="divide-y">
                            {patientsNeedingSputum.map(p => (
                                <tr key={p.id} className="hover:bg-orange-50/50">
                                    <td className="px-6 py-4">
                                        <div className="font-bold">{p.name}</div>
                                        <div className="text-[10px] text-slate-400">{p.patientId}</div>
                                    </td>
                                    <td className="px-6 py-4"><span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">{p.reason}</span></td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => {
                                            setSelectedPatient({patient: p, reason: p.reason, scheduleMonth: p.scheduleMonth});
                                            setLabFormData({testDate: new Date().toISOString().split('T')[0], testDateNepali: '', labNo: '', result: '', grading: ''});
                                        }} className="bg-indigo-600 text-white px-4 py-1 rounded-lg text-xs font-bold">रिपोर्ट प्रविष्ट</button>
                                    </td>
                                </tr>
                            ))}
                            {patientsNeedingSputum.length === 0 && <tr><td colSpan={3} className="p-12 text-center text-slate-400 italic">हाल कुनै परीक्षण आवश्यक छैन।</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* Lab Result Entry Form (Modal on top) */}
      {selectedPatient && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setSelectedPatient(null)}></div>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95">
                  <div className="p-6 border-b bg-indigo-50 text-indigo-800 flex justify-between items-center">
                      <h3 className="font-bold font-nepali">ल्याब रिपोर्ट प्रविष्टि ({selectedPatient.patient.name})</h3>
                      <button onClick={() => setSelectedPatient(null)}><X size={20}/></button>
                  </div>
                  <form onSubmit={handleLabSubmit} className="p-6 space-y-4">
                      <Input label="ल्याब नं." value={labFormData.labNo} onChange={e => setLabFormData({...labFormData, labNo: e.target.value})} required icon={<FileDigit size={16}/>} />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <Input label="मिति (AD)" type="date" value={labFormData.testDate} onChange={e => setLabFormData({...labFormData, testDate: e.target.value})} required />
                        <NepaliDatePicker label="मिति (BS)" value={labFormData.testDateNepali} onChange={val => setLabFormData({...labFormData, testDateNepali: val})} required />
                      </div>

                      <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700">नतिजा</label>
                          <div className="grid grid-cols-2 gap-2">
                              <button type="button" onClick={() => setLabFormData({...labFormData, result: 'Negative'})} className={`py-3 rounded-xl border-2 font-bold transition-all ${labFormData.result === 'Negative' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-slate-100 text-slate-400'}`}>Negative</button>
                              <button type="button" onClick={() => setLabFormData({...labFormData, result: 'Positive'})} className={`py-3 rounded-xl border-2 font-bold transition-all ${labFormData.result === 'Positive' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-slate-100 text-slate-400'}`}>Positive</button>
                          </div>
                      </div>

                      {labFormData.result === 'Positive' && (
                          <Select label="ग्रेडिङ" options={[{id:'s',value:'Scanty',label:'Scanty'}, {id:'1',value:'1+',label:'1+'}, {id:'2',value:'2+',label:'2+'}, {id:'3',value:'3+',label:'3+'}]} value={labFormData.grading} onChange={e => setLabFormData({...labFormData, grading: e.target.value})} required />
                      )}

                      <div className="pt-4 border-t flex justify-end gap-3">
                          <button type="button" onClick={() => setSelectedPatient(null)} className="px-6 py-2 text-slate-500 font-bold">रद्द</button>
                          <button type="submit" className="bg-indigo-600 text-white px-8 py-2 rounded-xl font-bold shadow-lg">सुरक्षित गर्नुहोस्</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};