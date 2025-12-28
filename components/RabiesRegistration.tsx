
import React, { useState, useEffect, useMemo } from 'react';
/* Added Info to the import list below */
import { Save, RotateCcw, Syringe, Calendar, FileDigit, User, Phone, MapPin, CalendarRange, Clock, CheckCircle2, Search, X, AlertTriangle, Trash2, Pencil, Check, Info } from 'lucide-react';
import { Input } from './Input';
import { Select } from './Select';
import { NepaliDatePicker } from './NepaliDatePicker';
import { RabiesPatient, VaccinationDose, Option, User as UserType } from '../types';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface RabiesRegistrationProps {
  currentFiscalYear: string;
  patients: RabiesPatient[];
  onAddPatient: (patient: RabiesPatient) => void;
  onUpdatePatient: (patient: RabiesPatient) => void;
  onDeletePatient?: (patientId: string) => void; 
  currentUser: UserType; 
}

const nepaliMonthOptions = [
  { id: '01', value: '01', label: 'बैशाख (01)' },
  { id: '02', value: '02', label: 'जेठ (02)' },
  { id: '03', value: '03', label: 'असार (03)' },
  { id: '04', value: '04', label: 'साउन (04)' },
  { id: '05', value: '05', label: 'भदौ (05)' },
  { id: '06', value: '06', label: 'असोज (06)' },
  { id: '07', value: '07', label: 'कार्तिक (07)' },
  { id: '08', value: '08', label: 'मंसिर (08)' },
  { id: '09', value: '09', label: 'पुष (09)' },
  { id: '10', value: '10', label: 'माघ (10)' },
  { id: '11', value: '11', label: 'फागुन (11)' },
  { id: '12', value: '12', label: 'चैत्र (12)' },
];

const animalTypeOptions: Option[] = [
    { id: 'dog', value: 'Dog bite', label: 'कुकुरले टोकेको (Dog bite)' },
    { id: 'monkey', value: 'Monkey bite', label: 'बाँदरले टोकेको (Monkey bite)' },
    { id: 'cat', value: 'Cat bite', label: 'बिरालोले टोकेको (Cat bite)' },
    { id: 'cattle', value: 'Cattle bite', label: 'चौपायाले टोकेको (Cattle bite)' },
    { id: 'rodent', value: 'Rodent bite', label: 'मुसा/लोखर्के (Rodent bite)' },
    { id: 'jackal', value: 'Jackal bite', label: 'स्यालले टोकेको (Jackal bite)' },
    { id: 'tiger', value: 'Tiger bite', label: 'बाघले टोकेको (Tiger bite)' },
    { id: 'bear', value: 'Bear bite', label: 'भालुले टोकेको (Bear bite)' },
    { id: 'saliva', value: 'Saliva contact', label: 'र्‍याल लसपस (Saliva contact)' },
    { id: 'other', value: 'Other specify', label: 'अन्य (Other specify)' },
];

const whoCategoryOptions: Option[] = [
    { id: 'cat1', value: 'Category I', label: 'Category I (No skin break, licking on intact skin)' },
    { id: 'cat2', value: 'Category II', label: 'Category II (Minor scratches, nibbling without bleeding)' },
    { id: 'cat3', value: 'Category III', label: 'Category III (Transdermal bites, scratches, saliva on broken skin)' },
];

const formatDateLocal = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const convertAdToBsFull = (adDateStr: string) => {
    if (!adDateStr) return '';
    try {
        const ad = new Date(adDateStr);
        const nd = new NepaliDate(ad);
        return nd.format('YYYY-MM-DD');
    } catch (e) {
        return '';
    }
};

const formatAdDateToBsDisplay = (adDateStr: string) => {
    if (!adDateStr) return '';
    try {
        const ad = new Date(adDateStr);
        const nd = new NepaliDate(ad);
        return nd.format('MM-DD');
    } catch (e) {
        return adDateStr.split('-').slice(1).join('-');
    }
};

export const RabiesRegistration: React.FC<RabiesRegistrationProps> = ({ 
  currentFiscalYear, 
  patients, 
  onAddPatient, 
  onUpdatePatient,
  onDeletePatient,
  currentUser
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [modalDateBs, setModalDateBs] = useState('');
  const [doseUpdateError, setDoseUpdateError] = useState<string | null>(null);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  
  const [selectedDoseInfo, setSelectedDoseInfo] = useState<{
      patient: RabiesPatient;
      doseIndex: number;
      dose: VaccinationDose;
  } | null>(null);

  const isAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN';
  const getTodayDateAd = () => formatDateLocal(new Date());

  const generateRegNo = () => {
    const fyClean = currentFiscalYear.replace('/', '');
    const maxNum = patients
      .filter(p => p.fiscalYear === currentFiscalYear && p.regNo.startsWith(`R-${fyClean}-`))
      .map(p => {
          const parts = p.regNo.split('-');
          return parts.length > 2 ? parseInt(parts[2]) : 0;
      })
      .reduce((max, num) => Math.max(max, num), 0);
    return `R-${fyClean}-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const [formData, setFormData] = useState<RabiesPatient>({
    id: '',
    fiscalYear: currentFiscalYear,
    regNo: '',
    regMonth: '',
    regDateBs: '',
    regDateAd: '',
    name: '',
    age: '',
    sex: '',
    address: '',
    phone: '',
    animalType: '',
    exposureCategory: '', 
    bodyPart: '',
    exposureDateBs: '',
    regimen: 'Intradermal',
    schedule: []
  });

  useEffect(() => {
    if (!editingPatientId) {
        const today = new NepaliDate();
        const todayBs = today.format('YYYY-MM-DD');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        
        setFormData(prev => ({
          ...prev,
          regNo: generateRegNo(),
          regDateBs: todayBs,
          regMonth: month,
          regDateAd: formatDateLocal(new Date()),
          exposureDateBs: todayBs
        }));
    }
  }, [currentFiscalYear, patients.length, editingPatientId]);

  const handleRegDateBsChange = (val: string) => {
    let month = formData.regMonth;
    let adDateStr = formData.regDateAd;
    if (val) {
        try {
            const parts = val.split(/[-/]/);
            if (parts.length === 3) {
                const [y, m, d] = parts.map(Number);
                month = String(m).padStart(2, '0');
                const nd = new NepaliDate(y, m - 1, d);
                adDateStr = formatDateLocal(nd.toJsDate());
            }
        } catch (e) {
            console.error("Date conversion error", e);
        }
    }
    setFormData(prev => {
        const updated = {
            ...prev,
            regDateBs: val,
            regMonth: month,
            regDateAd: adDateStr
        };
        // Only auto-recalculate schedule if NOT editing an existing patient
        if (!editingPatientId) {
            updated.schedule = calculateSchedule(adDateStr, prev.regimen);
        }
        return updated;
    });
  };

  const calculateSchedule = (startDateAd: string, regimen: string): VaccinationDose[] => {
      if (!startDateAd) return [];
      const start = new Date(startDateAd);
      const schedule: VaccinationDose[] = [];
      const days = regimen === 'Intradermal' ? [0, 3, 7] : [0, 3, 7, 14, 28];
      days.forEach(dayOffset => {
          const doseDate = new Date(start);
          doseDate.setDate(start.getDate() + dayOffset);
          schedule.push({
              day: dayOffset,
              date: formatDateLocal(doseDate),
              status: 'Pending'
          });
      });
      return schedule;
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name || !formData.regDateBs || !formData.exposureCategory) {
          alert("कृपया आवश्यक विवरणहरू भर्नुहोस् (नाम, मिति र WHO Category अनिवार्य छन्)");
          return;
      }

      if (editingPatientId) {
          onUpdatePatient({
              ...formData,
              id: editingPatientId
          });
          alert('बिरामीको विवरण सफलतापूर्वक अपडेट भयो');
          handleReset();
      } else {
          const newPatient = {
              ...formData,
              id: Date.now().toString(),
              schedule: calculateSchedule(formData.regDateAd, formData.regimen)
          };
          onAddPatient(newPatient);
          handleReset();
          alert('बिरामी सफलतापूर्वक दर्ता भयो');
      }
  };

  const handleEditPatient = (p: RabiesPatient) => {
      setEditingPatientId(p.id);
      setFormData({ ...p });
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    const today = new NepaliDate();
    setEditingPatientId(null);
    setFormData({
        id: '',
        fiscalYear: currentFiscalYear,
        regNo: generateRegNo(),
        regMonth: String(today.getMonth() + 1).padStart(2, '0'),
        regDateBs: today.format('YYYY-MM-DD'),
        regDateAd: formatDateLocal(new Date()),
        name: '', age: '', sex: '', address: '', phone: '',
        animalType: '', exposureCategory: '', bodyPart: '',
        exposureDateBs: today.format('YYYY-MM-DD'),
        regimen: 'Intradermal',
        schedule: []
    });
  };

  const handleDeleteClick = (pId: string, pName: string) => {
      if (!pId) return;
      if (window.confirm(`के तपाईं निश्चित हुनुहुन्छ कि तपाईं "${pName}" को विवरण हटाउन चाहनुहुन्छ? यो कार्य पूर्ववत गर्न सकिँदैन।`)) {
          if (onDeletePatient) onDeletePatient(pId);
      }
  };

  const confirmDoseUpdate = () => {
      if (!selectedDoseInfo) return;
      setDoseUpdateError(null);
      
      if (!modalDateBs) {
          setDoseUpdateError("कृपया खोप लगाएको मिति छान्नुहोस्");
          return;
      }

      const { patient, doseIndex, dose } = selectedDoseInfo;
      let givenDateAd = '';
      try {
          const parts = modalDateBs.split(/[-/]/);
          const [y, m, d] = parts.map(Number);
          const nd = new NepaliDate(y, m - 1, d);
          givenDateAd = formatDateLocal(nd.toJsDate());
      } catch (e) {
          setDoseUpdateError("मिति ढाँचा मिलेन");
          return;
      }
      
      if (givenDateAd < dose.date) {
          const scheduledBs = convertAdToBsFull(dose.date);
          setDoseUpdateError(`यो खोपको निर्धारित मिति ${scheduledBs} हो। तोकिएको मिति भन्दा अगाडि खोप लगाएको विवरण राख्न मिल्दैन।`);
          return;
      }

      const todayAd = formatDateLocal(new Date());
      if (givenDateAd > todayAd) {
          setDoseUpdateError("आजको मिति भन्दा पछिको विवरण राख्न मिल्दैन।");
          return;
      }

      const updatedSchedule = [...patient.schedule];
      updatedSchedule[doseIndex] = {
          ...updatedSchedule[doseIndex],
          status: 'Given',
          givenDate: modalDateBs 
      };
      onUpdatePatient({ ...patient, schedule: updatedSchedule });
      setSelectedDoseInfo(null);
  };

  const handleDoseClick = (p: RabiesPatient, idx: number, dose: VaccinationDose) => {
      setSelectedDoseInfo({ patient: p, doseIndex: idx, dose });
      setDoseUpdateError(null);
      
      if (dose.status === 'Given' && dose.givenDate) {
          setModalDateBs(dose.givenDate);
      } else {
          try {
              const today = new NepaliDate();
              const todayAdStr = formatDateLocal(new Date());
              
              if (todayAdStr < dose.date) {
                  setModalDateBs(convertAdToBsFull(dose.date));
              } else {
                  setModalDateBs(today.format('YYYY-MM-DD'));
              }
          } catch (e) {
              setModalDateBs('');
          }
      }
  };

  const filteredPatients = patients.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.regNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const todayAd = getTodayDateAd();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                <Syringe size={24} />
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-800 font-nepali">
                    {editingPatientId ? 'विवरण सच्याउनुहोस् (Edit Details)' : 'रेबिज खोप दर्ता (Rabies Registration)'}
                </h2>
                <p className="text-sm text-slate-500 font-nepali">नयाँ बिरामी दर्ता र खोप तालिका व्यवस्थापन</p>
            </div>
        </div>
      </div>

      {/* Registration Form */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          {editingPatientId && (
              <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600"></div>
          )}
          <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-3 bg-indigo-50 p-4 rounded-lg border border-indigo-100 flex items-center gap-4">
                  <div className="bg-white p-2 rounded border border-indigo-200">
                      <FileDigit size={20} className="text-indigo-600" />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-indigo-500 uppercase tracking-wide">दर्ता नम्बर (Reg No)</label>
                      <input value={formData.regNo} readOnly className="bg-transparent font-mono text-lg font-bold text-slate-800 outline-none w-full" />
                  </div>
                  <div className="ml-auto text-right">
                      <label className="text-xs font-bold text-indigo-500 uppercase tracking-wide">आर्थिक वर्ष</label>
                      <div className="font-nepali font-medium text-slate-700">{currentFiscalYear}</div>
                  </div>
              </div>

              <div className="md:col-span-1">
                 <NepaliDatePicker label="दर्ता मिति (BS)" value={formData.regDateBs} onChange={handleRegDateBsChange} required disabled={!!editingPatientId && !isAdmin} />
              </div>

              <Select label="दर्ता महिना" value={formData.regMonth} onChange={e => setFormData({...formData, regMonth: e.target.value})} options={nepaliMonthOptions} icon={<CalendarRange size={16} />} />
              <Input label="अंग्रेजी मिति (AD)" value={formData.regDateAd} readOnly className="bg-slate-50 text-slate-500" icon={<Calendar size={16} />} />

              <Input label="बिरामीको नाम" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Full Name" icon={<User size={16} />} />

              <div className="grid grid-cols-2 gap-4">
                  <Input label="उमेर" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} required placeholder="Yr" type="number" />
                  <Select label="लिङ्ग" value={formData.sex} onChange={e => setFormData({...formData, sex: e.target.value})} options={[{id: 'm', value: 'Male', label: 'पुरुष'}, {id: 'f', value: 'Female', label: 'महिला'}, {id: 'o', value: 'Other', label: 'अन्य'}]} required />
              </div>

              <Input label="सम्पर्क नं" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required placeholder="98XXXXXXXX" icon={<Phone size={16} />} />

              <div className="md:col-span-1">
                  <Input label="ठेगाना" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required placeholder="Municipality-Ward" icon={<MapPin size={16} />} />
              </div>

              <Select label="टोक्ने जनावर" value={formData.animalType} onChange={e => setFormData({...formData, animalType: e.target.value})} options={animalTypeOptions} required />
              <Select label="WHO Category (Exposure)" value={formData.exposureCategory} onChange={e => setFormData({...formData, exposureCategory: e.target.value})} options={whoCategoryOptions} required icon={<AlertTriangle size={16} />} />

              <div className="md:col-span-3 pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button type="button" className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-2" onClick={handleReset}><RotateCcw size={18} /> {editingPatientId ? 'रद्द गर्नुहोस्' : 'रिसेट'}</button>
                  <button type="submit" className="px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-sm flex items-center gap-2 font-medium font-nepali">
                      <Save size={18} /> {editingPatientId ? 'अपडेट गर्नुहोस्' : 'दर्ता गर्नुहोस्'}
                  </button>
              </div>
          </form>
      </div>

      {/* Patient List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-slate-700 font-nepali">बिरामी फलोअप सूची (Follow-up List)</h3>
                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">{filteredPatients.length} Patients</span>
              </div>
              <div className="relative w-full sm:w-64">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="नाम वा दर्ता नं खोज्नुहोस्..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-600 font-medium">
                  <tr>
                      <th className="px-6 py-3">दर्ता नं</th>
                      <th className="px-6 py-3">बिरामी / जनावर / Category</th>
                      <th className="px-6 py-3">खोप तालिका (Follow-up) [BS Month-Day]</th>
                      <th className="px-6 py-3 text-right">कार्य (Action)</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                  {filteredPatients.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic font-nepali">डाटा फेला परेन</td></tr>
                  ) : (
                      filteredPatients.map(p => (
                          <tr key={p.id} className={`hover:bg-slate-50 ${editingPatientId === p.id ? 'bg-indigo-50/30' : ''}`}>
                              <td className="px-6 py-4 font-mono font-medium text-indigo-600">{p.regNo}</td>
                              <td className="px-6 py-4">
                                  <div className="font-medium text-slate-800">{p.name}</div>
                                  <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                                    <span className="bg-slate-100 px-1 rounded">{p.animalType}</span>
                                    <span className={`px-1 rounded font-bold border ${
                                        p.exposureCategory === 'Category III' ? 'bg-red-50 text-red-700 border-red-200' :
                                        p.exposureCategory === 'Category II' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                        'bg-blue-50 text-blue-700 border-blue-100'
                                    }`}>{p.exposureCategory}</span>
                                  </div>
                              </td>
                              <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                      {p.schedule.map((dose, idx) => {
                                          const isOverdue = dose.status === 'Pending' && dose.date < todayAd;
                                          const isToday = dose.date === todayAd;
                                          
                                          return (
                                              <button key={idx} type="button" onClick={() => handleDoseClick(p, idx, dose)} className={`flex flex-col items-center justify-center w-12 h-14 rounded-lg border transition-all ${
                                                      dose.status === 'Given' ? 'bg-green-100 border-green-300 text-green-800 shadow-sm' :
                                                      isToday ? 'bg-orange-50 border-orange-300 text-orange-700 animate-pulse ring-2 ring-orange-100' :
                                                      isOverdue ? 'bg-red-100 border-red-400 text-red-800 shadow-inner font-bold ring-1 ring-red-200' :
                                                      'bg-slate-50 border-slate-200 text-slate-400'
                                                  }`}
                                              >
                                                  <span className="text-[10px] font-bold uppercase">D{dose.day}</span>
                                                  {dose.status === 'Given' ? <CheckCircle2 size={16} /> : (isOverdue ? <AlertTriangle size={16} className="animate-bounce text-red-600" /> : <Clock size={16} />)}
                                                  <span className="text-[9px] mt-0.5 font-nepali">{formatAdDateToBsDisplay(dose.date)}</span>
                                              </button>
                                          );
                                      })}
                                  </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                  <div className="flex justify-end gap-1">
                                      {isAdmin && (
                                          <button onClick={() => handleEditPatient(p)} className="text-indigo-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-full transition-all" title="बिरामी विवरण सच्याउनुहोस्">
                                              <Pencil size={18} />
                                          </button>
                                      )}
                                      {isAdmin && (
                                          <button onClick={() => handleDeleteClick(p.id, p.name)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-all" title="बिरामी विवरण हटाउनुहोस्">
                                              <Trash2 size={18} />
                                          </button>
                                      )}
                                  </div>
                              </td>
                          </tr>
                      ))
                  )}
              </tbody>
            </table>
          </div>
      </div>

      {/* Dose Update Modal */}
      {selectedDoseInfo && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 sm:pt-24">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedDoseInfo(null)}></div>
              <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
                      <div className="flex items-center gap-2">
                          <Syringe size={20} className="text-indigo-600"/>
                          <h3 className="font-bold text-slate-800 font-nepali text-sm">खोप विवरण (Update Status)</h3>
                      </div>
                      <button type="button" onClick={() => setSelectedDoseInfo(null)} className="p-2 hover:bg-white/50 rounded-full transition-colors"><X size={20} className="text-slate-400"/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div className="text-center">
                          <h4 className="text-lg font-bold text-slate-800">{selectedDoseInfo.patient.name}</h4>
                          <div className="flex flex-col items-center gap-1 mt-2">
                            <span className="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded-full uppercase">{selectedDoseInfo.patient.exposureCategory}</span>
                            <span className={`text-xs font-bold px-3 py-1 rounded-lg border ${
                                (selectedDoseInfo.dose.status === 'Pending' && selectedDoseInfo.dose.date < todayAd) 
                                ? 'bg-red-50 text-red-700 border-red-100' 
                                : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                            }`}>
                                तालिका (Scheduled): {convertAdToBsFull(selectedDoseInfo.dose.date)}
                            </span>
                          </div>
                      </div>
                      
                      <div className="space-y-3">
                          <NepaliDatePicker 
                            label="खोप लगाएको मिति (Given Date - BS)" 
                            value={modalDateBs} 
                            onChange={setModalDateBs} 
                            minDate={convertAdToBsFull(selectedDoseInfo.dose.date)}
                            popupAlign="right"
                            disabled={selectedDoseInfo.dose.status === 'Given' && !isAdmin}
                          />
                          
                          {selectedDoseInfo.dose.status === 'Given' && isAdmin && (
                              <div className="bg-indigo-50 text-indigo-600 p-2 rounded text-[10px] font-bold flex items-center gap-2">
                                  <Info size={14} /> तपाईंले लगाएको मिति सच्याउन सक्नुहुन्छ।
                              </div>
                          )}

                          {selectedDoseInfo.dose.status === 'Given' && !isAdmin && (
                              <div className="bg-green-50 border border-green-100 p-3 rounded-lg text-center font-nepali text-green-700">
                                  <CheckCircle2 size={20} className="mx-auto mb-1" />
                                  <span className="font-bold">खोप लगाइसकियो</span>
                              </div>
                          )}

                          {selectedDoseInfo.dose.status !== 'Given' && selectedDoseInfo.dose.date < todayAd && (
                              <div className="flex items-start gap-2 text-[11px] text-red-600 font-bold bg-red-50 p-2 rounded border border-red-100">
                                  <AlertTriangle size={14} className="shrink-0" />
                                  <span>यो खोप लगाउन ढिला भइसकेको छ (Overdue)!</span>
                              </div>
                          )}

                          {doseUpdateError && (
                            <div className="flex items-start gap-2 text-[11px] text-red-600 font-bold bg-red-50 p-3 rounded-lg border border-red-100 animate-pulse">
                              <AlertTriangle size={18} className="shrink-0" />
                              <span className="font-nepali leading-snug">{doseUpdateError}</span>
                            </div>
                          )}
                      </div>
                  </div>
                  <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50">
                      <button type="button" onClick={() => setSelectedDoseInfo(null)} className="flex-1 py-2 text-slate-600 font-medium font-nepali hover:bg-slate-200 rounded-lg transition-colors text-sm">बन्द (Close)</button>
                      {(selectedDoseInfo.dose.status !== 'Given' || isAdmin) && (
                          <button type="button" onClick={confirmDoseUpdate} className="flex-1 py-2 bg-green-600 text-white rounded-lg font-medium shadow-sm font-nepali hover:bg-green-700 transition-all active:scale-95 text-sm flex items-center justify-center gap-2">
                              {selectedDoseInfo.dose.status === 'Given' ? <Save size={16} /> : <Check size={16} />}
                              {selectedDoseInfo.dose.status === 'Given' ? 'अपडेट गर्नुहोस्' : 'सुरक्षित गर्नुहोस्'}
                          </button>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
