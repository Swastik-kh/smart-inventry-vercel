import React, { useState, useRef } from 'react';
import { Search, Save, Printer, Plus, Trash2, User, Stethoscope, Pill, History, Baby } from 'lucide-react';
import { ServiceSeekerRecord, CBIMNCIRecord, PrescriptionItem, ServiceItem } from '../types/coreTypes';
import { Input } from './Input';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';
import { useReactToPrint } from 'react-to-print';

interface CBIMNCISewaProps {
  serviceSeekerRecords: ServiceSeekerRecord[];
  cbimnciRecords: CBIMNCIRecord[];
  onSaveRecord: (record: CBIMNCIRecord) => void;
  onDeleteRecord: (recordId: string) => void;
  currentFiscalYear: string;
  currentUser: any;
  serviceItems: ServiceItem[];
}

const initialPrescriptionItem: PrescriptionItem = {
  id: '',
  medicineName: '',
  dosage: '',
  frequency: '',
  duration: '',
  instructions: ''
};

export const CBIMNCISewa: React.FC<CBIMNCISewaProps> = ({ 
  serviceSeekerRecords, 
  cbimnciRecords, 
  onSaveRecord, 
  onDeleteRecord, 
  currentFiscalYear,
  currentUser,
  serviceItems
}) => {
  const [searchId, setSearchId] = useState('');
  const [currentPatient, setCurrentPatient] = useState<ServiceSeekerRecord | null>(null);
  const [moduleType, setModuleType] = useState<'Infant' | 'Child'>('Child');
  const [assessmentData, setAssessmentData] = useState<any>({
    dangerSigns: [],
    localInfection: [],
    jaundiceSigns: [],
    dehydrationSigns: [],
    feedingProblems: [],
    generalDangerSigns: [],
    respiratorySigns: [],
    feverSigns: [],
    nutritionSigns: [],
    immunization: [],
    breathingRate: '',
    temperature: '',
    diarrheaDays: '',
    weight: '',
    muac: '',
    coughDays: '',
    feverDays: '',
    earDischargeDays: '',
    malariaRisk: 'None',
    pallor: '',
    attachment: '',
    suckling: '',
    earPain: false,
    earDischarge: false,
    mastoidSwelling: false,
    bloodInStool: false
  });
  const [cbimnciData, setCbimnciData] = useState<Partial<CBIMNCIRecord>>({
    chiefComplaints: '',
    diagnosis: '',
    investigation: '',
    prescriptions: [],
    advice: '',
    nextVisitDate: ''
  });
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([]);
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [currentPrescription, setCurrentPrescription] = useState<PrescriptionItem>(initialPrescriptionItem);
  const [searchResults, setSearchResults] = useState<ServiceSeekerRecord[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  
  const [investigationSearch, setInvestigationSearch] = useState('');
  const [showInvestigationResults, setShowInvestigationResults] = useState(false);
  
  const printRef = useRef<HTMLDivElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchId.trim().toLowerCase();
    if (!query) return;

    const results = serviceSeekerRecords.filter(r => {
      const idMatch = r.uniquePatientId.toLowerCase().includes(query) || 
                      r.uniquePatientId.replace(/[^0-9]/g, '').includes(query);
      const nameMatch = r.name.toLowerCase().includes(query);
      const regMatch = r.registrationNumber.includes(query);
      return idMatch || nameMatch || regMatch;
    });

    if (results.length === 1) {
      selectPatient(results[0]);
    } else if (results.length > 1) {
      setSearchResults(results);
      setShowSearchResults(true);
    } else {
      alert('बिरामी भेटिएन (Patient not found)');
      setCurrentPatient(null);
    }
  };

  const selectPatient = (patient: ServiceSeekerRecord) => {
    setCurrentPatient(patient);
    setSearchResults([]);
    setShowSearchResults(false);
    setSearchId('');
    
    // Auto-select module based on age
    const ageInMonths = (patient.ageYears || 0) * 12 + (patient.ageMonths || 0);
    const module = ageInMonths <= 2 ? 'Infant' : 'Child';
    setModuleType(module);
    setAssessmentData({
      dangerSigns: [],
      localInfection: [],
      jaundiceSigns: [],
      dehydrationSigns: [],
      feedingProblems: [],
      generalDangerSigns: [],
      respiratorySigns: [],
      feverSigns: [],
      nutritionSigns: [],
      immunization: [],
      breathingRate: '',
      temperature: '',
      diarrheaDays: '',
      weight: '',
      muac: '',
      coughDays: '',
      feverDays: '',
      earDischargeDays: '',
      malariaRisk: 'None',
      pallor: '',
      attachment: '',
      suckling: '',
      earPain: false,
      earDischarge: false,
      mastoidSwelling: false,
      bloodInStool: false
    });

    setCbimnciData({
      chiefComplaints: '',
      diagnosis: '',
      investigation: '',
      prescriptions: [],
      advice: '',
      nextVisitDate: ''
    });
    setPrescriptionItems([]);
    setEditingRecordId(null);
  };

  const handleRestore = () => {
    if (!currentPatient) return;
    const patientRecords = cbimnciRecords.filter(r => r.uniquePatientId === currentPatient.uniquePatientId);
    if (patientRecords.length === 0) {
      alert('यो बिरामीको कुनै पुरानो रेकर्ड भेटिएन।');
      return;
    }
    const sortedRecords = [...patientRecords].sort((a, b) => b.id.localeCompare(a.id));
    const latestRecord = sortedRecords[0];

    setModuleType(latestRecord.moduleType || 'Child');
    setAssessmentData({
      dangerSigns: [],
      localInfection: [],
      jaundiceSigns: [],
      dehydrationSigns: [],
      feedingProblems: [],
      generalDangerSigns: [],
      respiratorySigns: [],
      feverSigns: [],
      nutritionSigns: [],
      immunization: [],
      breathingRate: '',
      temperature: '',
      diarrheaDays: '',
      weight: '',
      muac: '',
      coughDays: '',
      feverDays: '',
      earDischargeDays: '',
      malariaRisk: 'None',
      pallor: '',
      attachment: '',
      suckling: '',
      earPain: false,
      earDischarge: false,
      mastoidSwelling: false,
      bloodInStool: false,
      ...(latestRecord.assessmentData || {})
    });
    setCbimnciData({
      chiefComplaints: latestRecord.chiefComplaints,
      diagnosis: latestRecord.diagnosis,
      investigation: latestRecord.investigation,
      prescriptions: latestRecord.prescriptions || [],
      advice: latestRecord.advice,
      nextVisitDate: latestRecord.nextVisitDate
    });
    setPrescriptionItems(latestRecord.prescriptions || []);
    setEditingRecordId(latestRecord.id);
    alert(`पुरानो रेकर्ड (मिति: ${latestRecord.visitDate}) रिस्टोर गरियो।`);
  };

  const handleAddPrescription = () => {
    if (!currentPrescription.medicineName) return;
    const newItem = { ...currentPrescription, id: Date.now().toString() };
    setPrescriptionItems([...prescriptionItems, newItem]);
    setCurrentPrescription(initialPrescriptionItem);
    setShowPrescriptionForm(false);
  };

  const handleRemovePrescription = (id: string) => {
    setPrescriptionItems(prescriptionItems.filter(item => item.id !== id));
  };

  const handleAddInvestigation = (serviceName: string) => {
    const currentInv = cbimnciData.investigation || '';
    const separator = currentInv ? '\n' : '';
    setCbimnciData({
      ...cbimnciData,
      investigation: `${currentInv}${separator}${serviceName}`
    });
    setInvestigationSearch('');
    setShowInvestigationResults(false);
  };

  const handleSave = () => {
    if (!currentPatient) return;
    const recordId = editingRecordId || Date.now().toString();
    const visitDate = editingRecordId 
      ? (cbimnciRecords.find(r => r.id === editingRecordId)?.visitDate || new NepaliDate().format('YYYY-MM-DD'))
      : new NepaliDate().format('YYYY-MM-DD');

    const newRecord: CBIMNCIRecord = {
      id: recordId,
      fiscalYear: currentFiscalYear,
      serviceSeekerId: currentPatient.id,
      uniquePatientId: currentPatient.uniquePatientId,
      visitDate: visitDate,
      moduleType: moduleType,
      assessmentData: assessmentData,
      chiefComplaints: cbimnciData.chiefComplaints || '',
      diagnosis: cbimnciData.diagnosis || '',
      investigation: cbimnciData.investigation || '',
      prescriptions: prescriptionItems,
      advice: cbimnciData.advice,
      nextVisitDate: cbimnciData.nextVisitDate
    };

    onSaveRecord(newRecord);
    alert(editingRecordId ? 'CBIMNCI रेकर्ड अपडेट गरियो।' : 'CBIMNCI रेकर्ड सुरक्षित गरियो।');
    
    setCbimnciData({
      chiefComplaints: '',
      diagnosis: '',
      investigation: '',
      prescriptions: [],
      advice: '',
      nextVisitDate: ''
    });
    setAssessmentData({
      dangerSigns: [],
      localInfection: [],
      jaundiceSigns: [],
      dehydrationSigns: [],
      feedingProblems: [],
      generalDangerSigns: [],
      respiratorySigns: [],
      feverSigns: [],
      nutritionSigns: [],
      immunization: [],
      breathingRate: '',
      temperature: '',
      diarrheaDays: '',
      weight: '',
      muac: '',
      coughDays: '',
      feverDays: '',
      earDischargeDays: '',
      malariaRisk: 'None',
      pallor: '',
      attachment: '',
      suckling: '',
      earPain: false,
      earDischarge: false,
      mastoidSwelling: false,
      bloodInStool: false
    });
    setPrescriptionItems([]);
    setEditingRecordId(null);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `CBIMNCI-${currentPatient?.uniquePatientId}`,
  });

  const filteredServices = serviceItems?.filter(item => 
    item.serviceName.toLowerCase().includes(investigationSearch.toLowerCase())
  ) || [];

  const renderAssessmentForm = () => {
    if (moduleType === 'Infant') {
      return (
        <div className="space-y-6">
          {/* PSBI / Danger Signs */}
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <h4 className="font-bold text-blue-800 border-b border-blue-200 pb-2 mb-4 flex justify-between items-center">
              <span>१. खतराका संकेतहरू (Danger Signs / PSBI)</span>
              <span className="text-xs font-normal text-blue-600">Booklet Page 14</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                {['काँप्ने (Convulsions)', 'दूध चुस्न/निल्न नसक्ने (Unable to feed)', 'सुस्त वा बेहोस (Lethargic/Unconscious)', 'कोखा हान्ने (Severe chest in-drawing)', 'नाक फुलाउने (Nasal flaring)', 'कन्कने (Grunting)', 'तालु फुलेको (Bulging fontanelle)'].map(sign => (
                  <label key={sign} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={assessmentData.dangerSigns?.includes(sign)}
                      onChange={(e) => {
                        const current = assessmentData.dangerSigns || [];
                        const next = e.target.checked ? [...current, sign] : current.filter((s: string) => s !== sign);
                        setAssessmentData({...assessmentData, dangerSigns: next});
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    {sign}
                  </label>
                ))}
              </div>
              <div className="space-y-3">
                <Input 
                  label="सासको दर (प्रति मिनेट)" 
                  type="number"
                  value={assessmentData.breathingRate || ''} 
                  onChange={(e) => setAssessmentData({...assessmentData, breathingRate: e.target.value})} 
                  placeholder="६० वा सोभन्दा बढी भए खतरा"
                />
                <Input 
                  label="तापक्रम (Celsius)" 
                  type="number"
                  step="0.1"
                  value={assessmentData.temperature || ''} 
                  onChange={(e) => setAssessmentData({...assessmentData, temperature: e.target.value})} 
                  placeholder="37.5+ (ज्वरो), <35.5 (चिसो)"
                />
                <div className="space-y-2 pt-2">
                  <label className="text-sm font-medium text-slate-700">स्थानीय संक्रमण (Local Infection)</label>
                  {['नाइँटो रातो भएको (Red umbilicus)', 'नाइँटोबाट पीप बगेको (Umbilical pus)', 'छालामा धेरै फोकाहरू (Skin pustules)'].map(sign => (
                    <label key={sign} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={assessmentData.localInfection?.includes(sign)}
                        onChange={(e) => {
                          const current = assessmentData.localInfection || [];
                          const next = e.target.checked ? [...current, sign] : current.filter((s: string) => s !== sign);
                          setAssessmentData({...assessmentData, localInfection: next});
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      {sign}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Jaundice */}
          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
            <h4 className="font-bold text-amber-800 border-b border-amber-200 pb-2 mb-4 flex justify-between items-center">
              <span>२. कमलपित्त (Jaundice)</span>
              <span className="text-xs font-normal text-amber-600">Booklet Page 14</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">कमलपित्तको अवस्था</label>
                {['हत्केला र पैताला पहेंलो (Yellow palms/soles)', '२४ घण्टा भन्दा कमको शिशुमा कमलपित्त', 'कमलपित्त देखिएको (Jaundice present)'].map(sign => (
                  <label key={sign} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={assessmentData.jaundiceSigns?.includes(sign)}
                      onChange={(e) => {
                        const current = assessmentData.jaundiceSigns || [];
                        const next = e.target.checked ? [...current, sign] : current.filter((s: string) => s !== sign);
                        setAssessmentData({...assessmentData, jaundiceSigns: next});
                      }}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    {sign}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Diarrhea */}
          <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
            <h4 className="font-bold text-emerald-800 border-b border-emerald-200 pb-2 mb-4 flex justify-between items-center">
              <span>३. पखाला (Diarrhea)</span>
              <span className="text-xs font-normal text-emerald-600">Booklet Page 15</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">जलवियोजनका संकेतहरू (Dehydration Signs)</label>
                {['सुस्त वा बेहोस (Lethargic/Unconscious)', 'आँखा गडेको (Sunken eyes)', 'छाला तान्दा धेरै ढिलो फर्कने (Skin pinch very slow)', 'छाला तान्दा ढिलो फर्कने (Skin pinch slow)'].map(sign => (
                  <label key={sign} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={assessmentData.dehydrationSigns?.includes(sign)}
                      onChange={(e) => {
                        const current = assessmentData.dehydrationSigns || [];
                        const next = e.target.checked ? [...current, sign] : current.filter((s: string) => s !== sign);
                        setAssessmentData({...assessmentData, dehydrationSigns: next});
                      }}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    {sign}
                  </label>
                ))}
              </div>
              <div className="space-y-3">
                <Input label="पखाला लागेको दिन" type="number" value={assessmentData.diarrheaDays || ''} onChange={(e) => setAssessmentData({...assessmentData, diarrheaDays: e.target.value})} />
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={assessmentData.bloodInStool}
                    onChange={(e) => setAssessmentData({...assessmentData, bloodInStool: e.target.checked})}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  दिसामा रगत देखिएको (Blood in stool)
                </label>
              </div>
            </div>
          </div>

          {/* Feeding / Weight */}
          <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
            <h4 className="font-bold text-purple-800 border-b border-purple-200 pb-2 mb-4 flex justify-between items-center">
              <span>४. स्तनपान र तौल (Feeding & Weight)</span>
              <span className="text-xs font-normal text-purple-600">Booklet Page 16</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Input label="तौल (kg)" type="number" step="0.01" value={assessmentData.weight || ''} onChange={(e) => setAssessmentData({...assessmentData, weight: e.target.value})} />
                {zScore && (
                  <div className="p-2 bg-purple-100 rounded-lg border border-purple-200">
                    <p className="text-xs font-bold text-purple-800">WAZ Score: {zScore}</p>
                    <p className="text-[10px] text-purple-600">
                      {parseFloat(zScore) < -3 ? 'Severe Underweight' : parseFloat(zScore) < -2 ? 'Underweight' : 'Normal Weight'}
                    </p>
                  </div>
                )}
                <label className="text-sm font-medium text-slate-700 block">स्तनपानको अवस्था</label>
                <div className="space-y-1">
                  {['२४ घण्टामा १० पटक भन्दा कम स्तनपान', 'थप खाना वा झोल दिने गरेको', 'स्तनपान गराउन गाह्रो भएको'].map(sign => (
                    <label key={sign} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={assessmentData.feedingProblems?.includes(sign)}
                        onChange={(e) => {
                          const current = assessmentData.feedingProblems || [];
                          const next = e.target.checked ? [...current, sign] : current.filter((s: string) => s !== sign);
                          setAssessmentData({...assessmentData, feedingProblems: next});
                        }}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      {sign}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700 block">स्तनपान मूल्यांकन (Assessment of Breastfeeding)</label>
                <div className="space-y-2">
                  <select 
                    value={assessmentData.attachment || ''} 
                    onChange={(e) => setAssessmentData({...assessmentData, attachment: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="">स्तन समातेको (Attachment)</option>
                    <option value="Good">राम्रो (Good)</option>
                    <option value="Not Well">राम्रो नभएको (Not well)</option>
                    <option value="Not at all">कत्ति पनि नभएको (Not at all)</option>
                  </select>
                  <select 
                    value={assessmentData.suckling || ''} 
                    onChange={(e) => setAssessmentData({...assessmentData, suckling: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="">दूध चुसेको (Suckling)</option>
                    <option value="Effective">प्रभावकारी (Effective)</option>
                    <option value="Not Effective">प्रभावकारी नभएको (Not effective)</option>
                    <option value="Not at all">कत्ति पनि नभएको (Not at all)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          {/* Immunization */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-800 border-b border-slate-300 mb-2 pb-1 flex justify-between items-center">
              <span>५. खोप (Immunization)</span>
              <span className="text-xs font-normal text-slate-600">Booklet Page 16</span>
            </h4>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">खोपको अवस्था</label>
              <div className="grid grid-cols-2 gap-2">
                {['BCG', 'OPD-0', 'fIPV-1', 'PCV-1', 'Rotavirus-1', 'DPT-HepB-Hib-1'].map(vax => (
                  <label key={vax} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={assessmentData.immunization?.includes(vax)}
                      onChange={(e) => {
                        const current = assessmentData.immunization || [];
                        const next = e.target.checked ? [...current, vax] : current.filter((s: string) => s !== vax);
                        setAssessmentData({...assessmentData, immunization: next});
                      }}
                      className="rounded text-slate-600 focus:ring-slate-500"
                    />
                    {vax}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="space-y-6">
          {/* General Danger Signs */}
          <div className="bg-red-50/50 p-4 rounded-xl border border-red-100">
            <h4 className="font-bold text-red-800 border-b border-red-200 pb-2 mb-4 flex justify-between items-center">
              <span>१. सामान्य खतराका संकेतहरू (General Danger Signs)</span>
              <span className="text-xs font-normal text-red-600">Booklet Page 25</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                {['पिउन/स्तनपान गर्न नसक्ने', 'सबै कुरा वान्ता गर्ने', 'काँप्ने (Convulsions)', 'सुस्त वा वेहोस (Lethargic/Unconscious)'].map(sign => (
                  <label key={sign} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={assessmentData.generalDangerSigns?.includes(sign)}
                      onChange={(e) => {
                        const current = assessmentData.generalDangerSigns || [];
                        const next = e.target.checked ? [...current, sign] : current.filter((s: string) => s !== sign);
                        setAssessmentData({...assessmentData, generalDangerSigns: next});
                      }}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    {sign}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Cough / Breathing */}
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <h4 className="font-bold text-blue-800 border-b border-blue-200 pb-2 mb-4 flex justify-between items-center">
              <span>२. खोकी वा सास फेर्न गाह्रो (Cough / Breathing)</span>
              <span className="text-xs font-normal text-blue-600">Booklet Page 25</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input label="खोकी लागेको दिन" type="number" value={assessmentData.coughDays || ''} onChange={(e) => setAssessmentData({...assessmentData, coughDays: e.target.value})} />
                  <Input label="सासको दर (प्रति मिनेट)" type="number" value={assessmentData.breathingRate || ''} onChange={(e) => setAssessmentData({...assessmentData, breathingRate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  {['कोखा हान्ने (Chest in-drawing)', 'शान्त रहेको बच्चामा स्ट्राइडर (Stridor in calm child)', 'Wheezing'].map(sign => (
                    <label key={sign} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={assessmentData.respiratorySigns?.includes(sign)}
                        onChange={(e) => {
                          const current = assessmentData.respiratorySigns || [];
                          const next = e.target.checked ? [...current, sign] : current.filter((s: string) => s !== sign);
                          setAssessmentData({...assessmentData, respiratorySigns: next});
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      {sign}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Diarrhea */}
          <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
            <h4 className="font-bold text-emerald-800 border-b border-emerald-200 pb-2 mb-4 flex justify-between items-center">
              <span>३. पखाला (Diarrhea)</span>
              <span className="text-xs font-normal text-emerald-600">Booklet Page 26</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">जलवियोजनका संकेतहरू</label>
                {["सुस्त वा बेहोस (Lethargic/Unconscious)", "छटपटीने वा झर्किने (Restless/Irritable)", "आँखा गडेको (Sunken eyes)", "खूब तिर्खाए झैं गरी पिउँछ (Drinks eagerly)", "पिउन नसक्ने वा ढिलो पिउने (Unable to drink)", "छाला तान्दा धेरै ढिलो फर्कने", "छाला तान्दा ढिलो फर्कने"].map(sign => (
                  <label key={sign} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={assessmentData.dehydrationSigns?.includes(sign)}
                      onChange={(e) => {
                        const current = assessmentData.dehydrationSigns || [];
                        const next = e.target.checked ? [...current, sign] : current.filter((s: string) => s !== sign);
                        setAssessmentData({...assessmentData, dehydrationSigns: next});
                      }}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    {sign}
                  </label>
                ))}
              </div>
              <div className="space-y-3">
                <Input label="पखाला लागेको दिन" type="number" value={assessmentData.diarrheaDays || ''} onChange={(e) => setAssessmentData({...assessmentData, diarrheaDays: e.target.value})} />
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={assessmentData.bloodInStool}
                    onChange={(e) => setAssessmentData({...assessmentData, bloodInStool: e.target.checked})}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  दिसामा रगत देखिएको (Blood in stool)
                </label>
              </div>
            </div>
          </div>

          {/* Fever */}
          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
            <h4 className="font-bold text-amber-800 border-b border-amber-200 pb-2 mb-4 flex justify-between items-center">
              <span>४. ज्वरो (Fever)</span>
              <span className="text-xs font-normal text-amber-600">Booklet Page 27</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Input label="तापक्रम (Celsius)" type="number" step="0.1" value={assessmentData.temperature || ''} onChange={(e) => setAssessmentData({...assessmentData, temperature: e.target.value})} />
                <Input label="ज्वरो आएको दिन" type="number" value={assessmentData.feverDays || ''} onChange={(e) => setAssessmentData({...assessmentData, feverDays: e.target.value})} />
                <label className="text-sm font-medium text-slate-700 block">मलेरियाको जोखिम</label>
                <select 
                  value={assessmentData.malariaRisk || ''} 
                  onChange={(e) => setAssessmentData({...assessmentData, malariaRisk: e.target.value})}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="Low">न्यून (Low)</option>
                  <option value="High">उच्च (High)</option>
                  <option value="None">नभएको (None)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">ज्वरोका थप संकेतहरू</label>
                {["गर्दन अररो (Stiff neck)", "RDT Positive", "RDT Negative", "दादुरा (Measles)", "आँखा रातो (Red eyes)", "मुखभित्र घाउ (Mouth ulcers)", "कर्निया धमिलो (Cornea clouding)"].map(sign => (
                  <label key={sign} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={assessmentData.feverSigns?.includes(sign)}
                      onChange={(e) => {
                        const current = assessmentData.feverSigns || [];
                        const next = e.target.checked ? [...current, sign] : current.filter((s: string) => s !== sign);
                        setAssessmentData({...assessmentData, feverSigns: next});
                      }}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    {sign}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Ear Infection */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-800 border-b border-slate-300 pb-2 mb-4 flex justify-between items-center">
              <span>५. कानको समस्या (Ear Problem)</span>
              <span className="text-xs font-normal text-slate-600">Booklet Page 28</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={assessmentData.earPain}
                    onChange={(e) => setAssessmentData({...assessmentData, earPain: e.target.checked})}
                    className="rounded text-slate-600 focus:ring-slate-500"
                  />
                  कान दुख्ने (Ear pain)
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={assessmentData.earDischarge}
                    onChange={(e) => setAssessmentData({...assessmentData, earDischarge: e.target.checked})}
                    className="rounded text-slate-600 focus:ring-slate-500"
                  />
                  कानबाट पिप बग्ने (Ear discharge)
                </label>
                {assessmentData.earDischarge && (
                  <Input label="लगातार कति दिन देखि?" type="number" value={assessmentData.earDischargeDays || ''} onChange={(e) => setAssessmentData({...assessmentData, earDischargeDays: e.target.value})} />
                )}
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={assessmentData.mastoidSwelling}
                    onChange={(e) => setAssessmentData({...assessmentData, mastoidSwelling: e.target.checked})}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  कानको पछाडि दुख्ने गरी सुन्निएको (Mastoid swelling)
                </label>
              </div>
            </div>
          </div>

          {/* Malnutrition / Anemia */}
          <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
            <h4 className="font-bold text-purple-800 border-b border-purple-200 pb-2 mb-4 flex justify-between items-center">
              <span>६. पोषण र रक्तअल्पता (Nutrition & Anemia)</span>
              <span className="text-xs font-normal text-purple-600">Booklet Page 28-29</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Input label="तौल (kg)" type="number" step="0.1" value={assessmentData.weight || ''} onChange={(e) => setAssessmentData({...assessmentData, weight: e.target.value})} />
                {zScore && (
                  <div className="p-2 bg-purple-100 rounded-lg border border-purple-200">
                    <p className="text-xs font-bold text-purple-800">Weight-for-Age Z-Score: {zScore}</p>
                    <p className="text-[10px] text-purple-600">
                      {parseFloat(zScore) < -3 ? 'Severe Underweight' : parseFloat(zScore) < -2 ? 'Underweight' : 'Normal Weight'}
                    </p>
                  </div>
                )}
                <Input label="MUAC (mm)" type="number" value={assessmentData.muac || ''} onChange={(e) => setAssessmentData({...assessmentData, muac: e.target.value})} />
                <label className="text-sm font-medium text-slate-700 block">रक्तअल्पता (Anemia)</label>
                <select 
                  value={assessmentData.pallor || ''} 
                  onChange={(e) => setAssessmentData({...assessmentData, pallor: e.target.value})}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="">हत्केलाको अवस्था</option>
                  <option value="Severe">{"धेरै सेतो (Severe pallor)"}</option>
                  <option value="Some">{"केही सेतो (Some pallor)"}</option>
                  <option value="None">{"सामान्य (No pallor)"}</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">पोषणका संकेतहरू</label>
                {["दुवै खुट्टा सुन्निएको (Oedema both feet)", "धेरै दुब्लो (Visible severe wasting)"].map(sign => (
                  <label key={sign} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={assessmentData.nutritionSigns?.includes(sign)}
                      onChange={(e) => {
                        const current = assessmentData.nutritionSigns || [];
                        const next = e.target.checked ? [...current, sign] : current.filter((s: string) => s !== sign);
                        setAssessmentData({...assessmentData, nutritionSigns: next});
                      }}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    {sign}
                  </label>
                ))}
              </div>
            </div>
          </div>
          {/* Immunization */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-800 border-b border-slate-300 mb-2 pb-1 flex justify-between items-center">
              <span>७. खोप (Immunization)</span>
              <span className="text-xs font-normal text-slate-600">Booklet Page 29</span>
            </h4>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">खोपको अवस्था</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {['BCG', 'OPV-1,2,3', 'DPT-HepB-Hib-1,2,3', 'PCV-1,2,3', 'fIPV-1,2', 'Rotavirus-1,2', 'Measles-Rubella-1,2', 'JE', 'TD'].map(vax => (
                  <label key={vax} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={assessmentData.immunization?.includes(vax)}
                      onChange={(e) => {
                        const current = assessmentData.immunization || [];
                        const next = e.target.checked ? [...current, vax] : current.filter((s: string) => s !== vax);
                        setAssessmentData({...assessmentData, immunization: next});
                      }}
                      className="rounded text-slate-600 focus:ring-slate-500"
                    />
                    {vax}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  const getClassification = () => {
    const classifications: string[] = [];
    
    if (moduleType === 'Infant') {
      // PSBI
      const hasDangerSign = (assessmentData.dangerSigns?.length > 0) || 
                            (parseFloat(assessmentData.breathingRate) >= 60) ||
                            (parseFloat(assessmentData.temperature) >= 37.5) ||
                            (parseFloat(assessmentData.temperature) <= 35.5);
      if (hasDangerSign) classifications.push('Possible Serious Bacterial Infection (PSBI) or Very Severe Disease');
      
      // Local Infection
      if (assessmentData.localInfection?.length > 0) classifications.push('Local Bacterial Infection');
      
      // Jaundice
      if (assessmentData.jaundiceSigns?.includes('हत्केला र पैताला पहेंलो (Yellow palms/soles)') || 
          assessmentData.jaundiceSigns?.includes('२४ घण्टा भन्दा कमको शिशुमा कमलपित्त')) {
        classifications.push('Severe Jaundice');
      } else if (assessmentData.jaundiceSigns?.includes('कमलपित्त देखिएको (Jaundice present)')) {
        classifications.push('Jaundice');
      }

      // Dehydration
      const dehydSigns = assessmentData.dehydrationSigns || [];
      const severeCount = dehydSigns.filter((s: string) => s.includes('Lethargic') || s.includes('Sunken') || s.includes('very slow')).length;
      const someCount = dehydSigns.length;
      
      if (severeCount >= 2) {
        classifications.push('Severe Dehydration');
      } else if (someCount >= 2) {
        classifications.push('Some Dehydration');
      } else if (assessmentData.diarrheaDays) {
        classifications.push('No Dehydration');
      }
    } else {
      // Child
      // General Danger Signs
      if (assessmentData.generalDangerSigns?.length > 0 || assessmentData.respiratorySigns?.includes('शान्त रहेको बच्चामा स्ट्राइडर (Stridor in calm child)')) {
        classifications.push('Very Severe Disease');
      }

      // Pneumonia
      const rate = parseInt(assessmentData.breathingRate);
      const ageInMonths = (currentPatient?.ageYears || 0) * 12 + (currentPatient?.ageMonths || 0);
      const isFast = (ageInMonths < 12 && rate >= 50) || (ageInMonths >= 12 && rate >= 40);
      if (isFast || assessmentData.respiratorySigns?.includes('कोखा हान्ने (Chest in-drawing)')) {
        classifications.push('Pneumonia');
      } else if (assessmentData.coughDays) {
        classifications.push('No Pneumonia: Cough or Cold');
      }

      // Dehydration
      const dehydSigns = assessmentData.dehydrationSigns || [];
      const severeCount = dehydSigns.filter((s: string) => s.includes('Lethargic') || s.includes('Sunken') || s.includes('Unable') || s.includes('very slow')).length;
      const someCount = dehydSigns.length;
      
      let dehydrationType = '';
      if (severeCount >= 2) {
        dehydrationType = 'Severe Dehydration';
      } else if (someCount >= 2) {
        dehydrationType = 'Some Dehydration';
      } else if (assessmentData.diarrheaDays) {
        dehydrationType = 'No Dehydration';
      }
      if (dehydrationType) classifications.push(dehydrationType);

      // Persistent Diarrhea
      const diarrheaDays = parseInt(assessmentData.diarrheaDays);
      if (diarrheaDays >= 14) {
        if (dehydrationType === 'Severe Dehydration' || dehydrationType === 'Some Dehydration') {
          classifications.push('Severe Persistent Diarrhea');
        } else {
          classifications.push('Persistent Diarrhea');
        }
      }

      // Dysentery
      if (assessmentData.bloodInStool) {
        classifications.push('Dysentery');
      }

      // Fever
      const hasFever = parseFloat(assessmentData.temperature) >= 37.5 || assessmentData.feverDays > 0;
      if (hasFever) {
        if (assessmentData.feverSigns?.includes('गर्दन अररो (Stiff neck)') || assessmentData.generalDangerSigns?.length > 0) {
          classifications.push('Very Severe Febrile Disease');
        }
        
        if (assessmentData.malariaRisk === 'High' && assessmentData.feverSigns?.includes('RDT Positive')) {
          classifications.push('Malaria');
        } else if (assessmentData.feverSigns?.includes('RDT Negative') || assessmentData.malariaRisk === 'Low') {
          classifications.push('Fever: Malaria Unlikely');
        }
      }

      // Measles
      if (assessmentData.feverSigns?.includes('दादुरा (Measles)')) {
        if (assessmentData.generalDangerSigns?.length > 0 || 
            assessmentData.feverSigns?.includes('कर्निया धमिलो (Cornea clouding)') || 
            assessmentData.feverSigns?.includes('मुखभित्र घाउ (Mouth ulcers)')) {
          classifications.push('Severe Complicated Measles');
        } else if (assessmentData.feverSigns?.includes('आँखा रातो (Red eyes)')) {
          classifications.push('Measles with Eye/Mouth Complications');
        } else {
          classifications.push('Measles');
        }
      }

      // Malnutrition
      const muacVal = parseInt(assessmentData.muac);
      if (assessmentData.nutritionSigns?.includes("दुवै खुट्टा सुन्निएको (Oedema both feet)") || (muacVal > 0 && muacVal < 115)) {
        classifications.push('Severe Acute Malnutrition');
      } else if (muacVal >= 115 && muacVal < 125) {
        classifications.push('Moderate Acute Malnutrition');
      } else if (muacVal >= 125) {
        classifications.push('No Malnutrition');
      }

      // Anemia
      if (assessmentData.pallor === 'Severe') {
        classifications.push('Severe Anemia');
      } else if (assessmentData.pallor === 'Some') {
        classifications.push('Anemia');
      }

      // Ear Infection
      if (assessmentData.mastoidSwelling) {
        classifications.push('Mastoiditis');
      } else if (assessmentData.earPain || (assessmentData.earDischarge && parseInt(assessmentData.earDischargeDays) < 14)) {
        classifications.push('Acute Ear Infection');
      } else if (assessmentData.earDischarge && parseInt(assessmentData.earDischargeDays) >= 14) {
        classifications.push('Chronic Ear Infection');
      } else if (assessmentData.earPain === false && assessmentData.earDischarge === false) {
        classifications.push('No Ear Infection');
      }
    }

    return classifications;
  };

  const getSuggestedNextVisit = (classifications: string[]) => {
    if (classifications.length === 0) return null;
    
    if (moduleType === 'Infant') {
      if (classifications.includes('Possible Serious Bacterial Infection (PSBI) or Very Severe Disease')) return 'Immediate';
      if (classifications.includes('Local Bacterial Infection')) return '3 days';
      if (classifications.includes('Jaundice') || classifications.includes('Severe Jaundice')) return '3 days';
      if (classifications.includes('Some Dehydration') || classifications.includes('Severe Dehydration')) return '2 days';
    } else {
      if (classifications.includes('Very Severe Disease') || classifications.includes('Very Severe Febrile Disease') || classifications.includes('Severe Complicated Measles') || classifications.includes('Severe Persistent Diarrhea')) return 'Immediate';
      if (classifications.includes('Pneumonia') || classifications.includes('Malaria') || classifications.includes('Measles with Eye/Mouth Complications') || classifications.includes('Dysentery')) return '3 days';
      if (classifications.includes('Some Dehydration') || classifications.includes('Severe Dehydration')) return '2 days';
      if (classifications.includes('Acute Ear Infection') || classifications.includes('Persistent Diarrhea')) return '5 days';
      if (classifications.includes('Severe Acute Malnutrition')) return '30 days';
    }
    return null;
  };

  const getSuggestedTreatment = (classifications: string[]) => {
    const treatments: string[] = [];
    if (classifications.length === 0) return [];

    if (moduleType === 'Infant') {
      if (classifications.includes('Possible Serious Bacterial Infection (PSBI) or Very Severe Disease')) {
        treatments.push('Give first dose of IM Gentamicin and IM Ampicillin');
        treatments.push('Refer URGENTLY to hospital');
        treatments.push('Prevent low blood sugar (breastfeed or sugar water)');
        treatments.push('Keep infant warm');
      }
      if (classifications.includes('Local Bacterial Infection')) {
        treatments.push('Give Amoxicillin for 5 days');
        treatments.push('Teach mother to treat local infections at home');
        treatments.push('Follow-up in 3 days');
      }
      if (classifications.includes('Severe Jaundice')) {
        treatments.push('Refer URGENTLY to hospital');
        treatments.push('Prevent low blood sugar');
        treatments.push('Keep infant warm');
      }
      if (classifications.includes('Severe Dehydration')) {
        treatments.push('Give fluid for severe dehydration (Plan C)');
        treatments.push('Refer URGENTLY to hospital');
        treatments.push('If child can drink, give ORS by mouth while drip is being set up');
        treatments.push('Give 100 ml/kg Ringer\'s Lactate (or Normal Saline)');
      }
      if (classifications.includes('Some Dehydration')) {
        treatments.push('Give fluid and food for some dehydration (Plan B)');
        treatments.push('Give 75 ml/kg of ORS in the clinic over 4 hours');
        treatments.push('Show mother how to give ORS solution');
        treatments.push('After 4 hours, reassess child and classify for dehydration');
      }
      if (classifications.includes('No Dehydration')) {
        treatments.push('Treat diarrhea at home (Plan A)');
        treatments.push('Give extra fluid (as much as child will take)');
        treatments.push('Give Zinc Supplement for 10 days (2-6m: 10mg, >6m: 20mg)');
        treatments.push('Continue feeding');
        treatments.push('Advise mother when to return immediately');
      }
    } else {
      if (classifications.includes('Very Severe Disease')) {
        treatments.push('Give first dose of appropriate antibiotic');
        treatments.push('Refer URGENTLY to hospital');
        treatments.push('Prevent low blood sugar');
        treatments.push('Keep child warm');
      }
      if (classifications.includes('Pneumonia')) {
        const weight = parseFloat(assessmentData.weight) || 0;
        let amoxDose = '';
        if (weight >= 4 && weight < 7) amoxDose = '250mg (1 tab or 5ml syrup) twice daily';
        else if (weight >= 7 && weight < 10) amoxDose = '375mg (1.5 tab or 7.5ml syrup) twice daily';
        else if (weight >= 10 && weight < 14) amoxDose = '500mg (2 tab or 10ml syrup) twice daily';
        else if (weight >= 14 && weight < 19) amoxDose = '750mg (3 tab or 15ml syrup) twice daily';
        
        treatments.push(`Give Amoxicillin for 5 days: ${amoxDose}`);
        treatments.push('Soothe the throat and relieve cough with safe remedy');
        treatments.push('Advise mother when to return immediately');
        treatments.push('Follow-up in 3 days');
      }
      if (classifications.includes('Severe Dehydration')) {
        treatments.push('Give fluid for severe dehydration (Plan C)');
        treatments.push('Refer URGENTLY to hospital');
        treatments.push('If child can drink, give ORS by mouth while drip is being set up');
        treatments.push('Give 100 ml/kg Ringer\'s Lactate (or Normal Saline)');
      }
      if (classifications.includes('Some Dehydration')) {
        treatments.push('Give fluid and food for some dehydration (Plan B)');
        treatments.push('Give 75 ml/kg of ORS in the clinic over 4 hours');
        treatments.push('Show mother how to give ORS solution');
        treatments.push('After 4 hours, reassess child and classify for dehydration');
      }
      if (classifications.includes('No Dehydration')) {
        treatments.push('Treat diarrhea at home (Plan A)');
        treatments.push('Give extra fluid (as much as child will take)');
        treatments.push('Give Zinc Supplement for 10 days (2-6m: 10mg, >6m: 20mg)');
        treatments.push('Continue feeding');
        treatments.push('Advise mother when to return immediately');
      }
      if (classifications.includes('Severe Persistent Diarrhea')) {
        treatments.push('Treat dehydration before referral');
        treatments.push('Refer URGENTLY to hospital');
      }
      if (classifications.includes('Persistent Diarrhea')) {
        treatments.push('Advise on feeding for persistent diarrhea');
        treatments.push('Give Vitamin A');
        treatments.push('Follow-up in 5 days');
      }
      if (classifications.includes('Dysentery')) {
        treatments.push('Give Ciprofloxacin for 3 days');
        treatments.push('Follow-up in 3 days');
      }
      if (classifications.includes('Malaria')) {
        const weight = parseFloat(assessmentData.weight) || 0;
        let actDose = '';
        if (weight >= 5 && weight < 15) actDose = '1 tablet (20/120) once daily for 3 days';
        else if (weight >= 15 && weight < 25) actDose = '2 tablets (20/120) once daily for 3 days';
        
        treatments.push(`Give ACT for 3 days: ${actDose}`);
        treatments.push('Give Paracetamol for high fever (>= 38.5C)');
        treatments.push('Follow-up in 3 days if fever persists');
      }
      if (classifications.includes('Acute Ear Infection')) {
        const weight = parseFloat(assessmentData.weight) || 0;
        let amoxDose = '';
        if (weight >= 4 && weight < 7) amoxDose = '250mg twice daily';
        else if (weight >= 7 && weight < 10) amoxDose = '375mg twice daily';
        else if (weight >= 10 && weight < 14) amoxDose = '500mg twice daily';
        
        treatments.push(`Give Amoxicillin for 5 days: ${amoxDose}`);
        treatments.push('Give Paracetamol for pain');
        treatments.push('Dry the ear by wicking if there is discharge');
        treatments.push('Follow-up in 5 days');
      }
      if (classifications.includes('Severe Acute Malnutrition')) {
        treatments.push('Give first dose of appropriate antibiotic');
        treatments.push('Refer to outpatient therapeutic care (OTC) or nutrition center');
        treatments.push('Follow-up in 30 days');
      }
      if (classifications.includes('Severe Complicated Measles')) {
        treatments.push('Give Vitamin A');
        treatments.push('Give first dose of appropriate antibiotic');
        treatments.push('Refer URGENTLY to hospital');
      }
      if (classifications.includes('Measles with Eye/Mouth Complications')) {
        treatments.push('Give Vitamin A');
        treatments.push('Apply Tetracycline eye ointment if eye complications');
        treatments.push('Treat mouth ulcers with Gentian Violet');
        treatments.push('Follow-up in 3 days');
      }
      if (classifications.includes('Severe Anemia')) {
        treatments.push('Refer URGENTLY to hospital');
      }
      if (classifications.includes('Anemia')) {
        treatments.push('Give Iron/Folate');
        treatments.push('Give Mebendazole if child is 1 year or older');
        treatments.push('Advise mother on feeding');
        treatments.push('Follow-up in 14 days');
      }
    }
    return treatments;
  };

  const calculateZScore = () => {
    if (!assessmentData.weight || !currentPatient) return null;
    const weight = parseFloat(assessmentData.weight);
    
    // Calculate precise age in months
    const today = new Date();
    const birthDate = currentPatient.dobAd ? new Date(currentPatient.dobAd) : null;
    let ageMonths = (currentPatient.ageYears || 0) * 12 + (currentPatient.ageMonths || 0);
    
    if (birthDate) {
      const diffTime = Math.abs(today.getTime() - birthDate.getTime());
      ageMonths = diffTime / (1000 * 60 * 60 * 24 * 30.44);
    }

    // More granular WHO Weight-for-Age Z-score (WAZ) logic (Approximate Median and SD)
    const wazData: any = {
      0: { m: 3.3, s: 0.4 },
      1: { m: 4.5, s: 0.5 },
      2: { m: 5.6, s: 0.6 },
      3: { m: 6.4, s: 0.7 },
      4: { m: 7.0, s: 0.8 },
      5: { m: 7.5, s: 0.8 },
      6: { m: 7.9, s: 0.8 },
      9: { m: 8.9, s: 0.9 },
      12: { m: 9.6, s: 1.0 },
      15: { m: 10.3, s: 1.1 },
      18: { m: 10.9, s: 1.1 },
      21: { m: 11.5, s: 1.2 },
      24: { m: 12.2, s: 1.3 },
      30: { m: 13.3, s: 1.4 },
      36: { m: 14.3, s: 1.6 },
      42: { m: 15.3, s: 1.7 },
      48: { m: 16.3, s: 1.9 },
      54: { m: 17.3, s: 2.0 },
      60: { m: 18.3, s: 2.2 }
    };

    const ages = Object.keys(wazData).map(Number).sort((a, b) => a - b);
    
    // Linear interpolation for more accuracy
    let m, s;
    if (ageMonths <= 0) {
      m = wazData[0].m;
      s = wazData[0].s;
    } else if (ageMonths >= 60) {
      m = wazData[60].m;
      s = wazData[60].s;
    } else {
      const lowerAge = ages.filter(a => a <= ageMonths).pop() || 0;
      const upperAge = ages.find(a => a > ageMonths) || 60;
      const factor = (ageMonths - lowerAge) / (upperAge - lowerAge);
      
      m = wazData[lowerAge].m + factor * (wazData[upperAge].m - wazData[lowerAge].m);
      s = wazData[lowerAge].s + factor * (wazData[upperAge].s - wazData[lowerAge].s);
    }
    
    const zScore = (weight - m) / s;
    return zScore.toFixed(2);
  };

  const zScore = calculateZScore();
  const suggestedClassifications = getClassification();
  const suggestedNextVisit = getSuggestedNextVisit(suggestedClassifications);
  const suggestedTreatments = getSuggestedTreatment(suggestedClassifications);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 font-nepali mb-4 flex items-center gap-2">
          <Baby className="text-primary-600" />
          CBIMNCI सेवा (CBIMNCI Service)
        </h2>
        <form onSubmit={handleSearch} className="flex gap-4 relative">
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="बिरामी ID, नाम वा दर्ता नं. राख्नुहोस्"
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
          </div>
          <button type="submit" className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium shadow-sm">
            खोज्नुहोस्
          </button>

          {showSearchResults && (
            <div className="absolute top-full left-0 mt-2 w-full max-w-2xl bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <span className="font-medium text-slate-700">Search Results ({searchResults.length})</span>
                <button onClick={() => setShowSearchResults(false)} className="text-slate-400 hover:text-slate-600"><Trash2 size={16} /></button>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {searchResults.map(patient => (
                  <div 
                    key={patient.id} 
                    onClick={() => selectPatient(patient)}
                    className="p-4 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-800">{patient.name}</p>
                        <p className="text-xs text-slate-500">{patient.age} / {patient.gender} | {patient.address}</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-mono mb-1">
                          {patient.uniquePatientId}
                        </span>
                        <p className="text-xs text-slate-500">Reg: {patient.registrationNumber}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      </div>

      {currentPatient && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2">
                <User size={18} /> बिरामीको विवरण
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">नाम:</span> <span className="font-medium">{currentPatient.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">ID:</span> <span className="font-mono bg-slate-100 px-2 rounded">{currentPatient.uniquePatientId}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">उमेर/लिङ्ग:</span> <span>{currentPatient.age} / {currentPatient.gender}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">ठेगाना:</span> <span>{currentPatient.address}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">फोन:</span> <span>{currentPatient.phone}</span></div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h3 className="font-bold text-slate-800 text-lg">CBIMNCI परीक्षण फारम</h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setModuleType('Infant')}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${moduleType === 'Infant' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    Infant (up to 2m)
                  </button>
                  <button 
                    onClick={() => setModuleType('Child')}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${moduleType === 'Child' ? 'bg-green-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    Child (2m - 5y)
                  </button>
                  <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full ml-2">
                    {new NepaliDate().format('YYYY-MM-DD')}
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                {renderAssessmentForm()}

                {suggestedClassifications.length > 0 && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Suggested Classifications (Booklet Based)</h4>
                    <div className="flex flex-wrap gap-2">
                      {suggestedClassifications.map((cls, idx) => (
                        <span key={idx} className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          cls.includes('Severe') || cls.includes('PSBI') || cls.includes('Disease') 
                            ? 'bg-red-100 text-red-700 border-red-200' 
                            : cls.includes('Some') || cls.includes('Pneumonia') || cls.includes('Jaundice')
                              ? 'bg-amber-100 text-amber-700 border-amber-200'
                              : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        }`}>
                          {cls}
                        </span>
                      ))}
                    </div>
                    {suggestedNextVisit && (
                      <p className="mt-2 text-xs text-slate-600">
                        <span className="font-bold">Suggested Follow-up:</span> {suggestedNextVisit}
                      </p>
                    )}
                    {suggestedTreatments.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Suggested Treatment:</p>
                        {suggestedTreatments.map((t, idx) => (
                          <p key={idx} className="text-xs text-slate-700 flex items-start gap-1">
                            <span className="text-primary-500">•</span> {t}
                          </p>
                        ))}
                      </div>
                    )}
                    <button 
                      onClick={() => setCbimnciData({...cbimnciData, diagnosis: suggestedClassifications.join(', ')})}
                      className="mt-3 text-xs bg-white border border-slate-300 text-slate-700 px-2 py-1 rounded hover:bg-slate-50 transition-colors"
                    >
                      Apply to Classification
                    </button>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">मुख्य समस्याहरू (Chief Complaints)</label>
                  <textarea
                    value={cbimnciData.chiefComplaints}
                    onChange={(e) => setCbimnciData({...cbimnciData, chiefComplaints: e.target.value})}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-h-[80px]"
                    placeholder="बिरामीको मुख्य समस्याहरू लेख्नुहोस्..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">वर्गीकरण (Classification)</label>
                    <textarea
                      value={cbimnciData.diagnosis}
                      onChange={(e) => setCbimnciData({...cbimnciData, diagnosis: e.target.value})}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-h-[80px]"
                      placeholder="वर्गीकरण लेख्नुहोस्..."
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-medium text-slate-700 mb-2">जाँच (Investigation)</label>
                    <div className="relative mb-2">
                       <input
                         type="text"
                         value={investigationSearch}
                         onChange={(e) => {
                           setInvestigationSearch(e.target.value);
                           setShowInvestigationResults(true);
                         }}
                         placeholder="Search Service..."
                         className="w-full p-2 pl-8 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-primary-500"
                       />
                       <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                       {showInvestigationResults && investigationSearch && (
                         <div className="absolute top-full left-0 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto mt-1">
                           {filteredServices.map(service => (
                             <div 
                               key={service.id}
                               onClick={() => handleAddInvestigation(service.serviceName)}
                               className="p-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-slate-50 last:border-0"
                             >
                               {service.serviceName}
                             </div>
                           ))}
                         </div>
                       )}
                    </div>
                    <textarea
                      value={cbimnciData.investigation}
                      onChange={(e) => setCbimnciData({...cbimnciData, investigation: e.target.value})}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-h-[80px]"
                    />
                  </div>
                </div>

                <div className="border rounded-xl p-4 bg-slate-50">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-slate-700 flex items-center gap-2">
                      <Pill size={18} className="text-primary-600" /> औषधि सिफारिस (Prescription)
                    </h4>
                    <button 
                      onClick={() => setShowPrescriptionForm(true)}
                      className="text-sm bg-white border border-primary-200 text-primary-700 px-3 py-1.5 rounded-lg hover:bg-primary-50 flex items-center gap-1 shadow-sm"
                    >
                      <Plus size={16} /> औषधि थप्नुहोस्
                    </button>
                  </div>

                  {showPrescriptionForm && (
                    <div className="bg-white p-4 rounded-lg border border-primary-100 mb-4 shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <Input label="औषधिको नाम" value={currentPrescription.medicineName} onChange={e => setCurrentPrescription({...currentPrescription, medicineName: e.target.value})} />
                        <Input label="मात्रा (Dosage)" value={currentPrescription.dosage} onChange={e => setCurrentPrescription({...currentPrescription, dosage: e.target.value})} />
                        <Input label="पटक (Frequency)" value={currentPrescription.frequency} onChange={e => setCurrentPrescription({...currentPrescription, frequency: e.target.value})} />
                        <Input label="अवधि (Duration)" value={currentPrescription.duration} onChange={e => setCurrentPrescription({...currentPrescription, duration: e.target.value})} />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setShowPrescriptionForm(false)} className="px-4 py-2 text-slate-500 rounded-lg text-sm">रद्द</button>
                        <button onClick={handleAddPrescription} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">थप्नुहोस्</button>
                      </div>
                    </div>
                  )}

                  {prescriptionItems.length > 0 && (
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="p-3">औषधि</th>
                            <th className="p-3">मात्रा</th>
                            <th className="p-3">पटक</th>
                            <th className="p-3">अवधि</th>
                            <th className="p-3 w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {prescriptionItems.map((item) => (
                            <tr key={item.id}>
                              <td className="p-3 font-medium">{item.medicineName}</td>
                              <td className="p-3">{item.dosage}</td>
                              <td className="p-3">{item.frequency}</td>
                              <td className="p-3">{item.duration}</td>
                              <td className="p-3">
                                <button onClick={() => handleRemovePrescription(item.id)} className="text-red-400 hover:text-red-600">
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">सल्लाह / सुझाव (Advice)</label>
                  <textarea
                    value={cbimnciData.advice}
                    onChange={(e) => setCbimnciData({...cbimnciData, advice: e.target.value})}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-h-[60px]"
                  />
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t">
                  <button onClick={handleRestore} className="px-6 py-2.5 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 flex items-center gap-2 shadow-sm font-medium border border-amber-200">
                    <History size={18} /> Restore Previous
                  </button>
                  <button onClick={handlePrint} className="px-6 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 flex items-center gap-2 shadow-sm">
                    <Printer size={18} /> प्रिन्ट (Print)
                  </button>
                  <button onClick={handleSave} className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 shadow-sm font-medium">
                    <Save size={18} /> {editingRecordId ? 'अपडेट गर्नुहोस्' : 'सुरक्षित गर्नुहोस्'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "none" }}>
        <div ref={printRef} className="p-8 bg-white text-slate-900 print:block">
          <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center border border-slate-300">
                <Baby size={32} className="text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{currentUser?.organizationName || 'स्वास्थ्य संस्थाको नाम'}</h1>
                <p className="text-sm text-slate-600">CBIMNCI Department</p>
              </div>
            </div>
            <div className="text-right text-sm">
              <p><strong>Date:</strong> {new NepaliDate().format('YYYY-MM-DD')}</p>
            </div>
          </div>

          {currentPatient && (
            <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm">
              <div><span className="font-bold text-slate-600">Name:</span> {currentPatient.name}</div>
              <div><span className="font-bold text-slate-600">Age/Sex:</span> {currentPatient.age} / {currentPatient.gender}</div>
              <div><span className="font-bold text-slate-600">PID:</span> {currentPatient.uniquePatientId}</div>
            </div>
          )}

          <div className="space-y-6 mb-8">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h4 className="font-bold text-slate-800 border-b border-slate-300 mb-2 pb-1">
                Assessment ({moduleType === 'Infant' ? 'Infant up to 2m' : 'Child 2m-5y'})
              </h4>
              <div className="grid grid-cols-1 gap-y-4 text-sm">
                {suggestedClassifications.length > 0 && (
                  <div className="mb-4">
                    <div className="mb-2">
                      <span className="font-bold">Classifications:</span> {suggestedClassifications.join(', ')}
                    </div>
                    {suggestedTreatments.length > 0 && (
                      <div className="text-xs text-slate-600 italic">
                        <span className="font-bold not-italic">Recommended Actions:</span> {suggestedTreatments.join('; ')}
                      </div>
                    )}
                    {suggestedNextVisit && (
                      <div className="mt-2 text-xs font-bold text-primary-700">
                        Follow-up suggested in: {suggestedNextVisit}
                      </div>
                    )}
                  </div>
                )}
                {moduleType === 'Infant' ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div><span className="font-bold">Danger Signs:</span> {assessmentData.dangerSigns?.join(', ') || 'None'}</div>
                      <div><span className="font-bold">Breathing Rate:</span> {assessmentData.breathingRate || '-'} bpm</div>
                      <div><span className="font-bold">Temperature:</span> {assessmentData.temperature || '-'} °C</div>
                      <div><span className="font-bold">Local Infection:</span> {assessmentData.localInfection?.join(', ') || 'None'}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t pt-2">
                      <div><span className="font-bold">Jaundice:</span> {assessmentData.jaundiceSigns?.join(', ') || 'None'}</div>
                      <div><span className="font-bold">Diarrhea:</span> {assessmentData.diarrheaDays ? `${assessmentData.diarrheaDays} days` : '-'} {assessmentData.bloodInStool ? '(Blood)' : ''}</div>
                      <div><span className="font-bold">Dehydration:</span> {assessmentData.dehydrationSigns?.join(', ') || 'None'}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t pt-2">
                      <div><span className="font-bold">Weight:</span> {assessmentData.weight || '-'} kg</div>
                      <div><span className="font-bold">Feeding:</span> {assessmentData.feedingProblems?.join(', ') || 'Normal'}</div>
                      <div><span className="font-bold">Attachment/Suckling:</span> {assessmentData.attachment || '-'}/{assessmentData.suckling || '-'}</div>
                      <div><span className="font-bold">Immunization:</span> {assessmentData.immunization?.join(', ') || 'None'}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div><span className="font-bold">General Danger Signs:</span> {assessmentData.generalDangerSigns?.join(', ') || 'None'}</div>
                      <div><span className="font-bold">Cough/Breathing:</span> {assessmentData.coughDays ? `${assessmentData.coughDays} days` : '-'} {assessmentData.breathingRate ? `(${assessmentData.breathingRate} bpm)` : ''}</div>
                      <div><span className="font-bold">Respiratory Signs:</span> {assessmentData.respiratorySigns?.join(', ') || 'None'}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t pt-2">
                      <div><span className="font-bold">Diarrhea:</span> {assessmentData.diarrheaDays ? `${assessmentData.diarrheaDays} days` : '-'} {assessmentData.bloodInStool ? '(Blood)' : ''}</div>
                      <div><span className="font-bold">Dehydration:</span> {assessmentData.dehydrationSigns?.join(', ') || 'None'}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t pt-2">
                      <div><span className="font-bold">Fever:</span> {assessmentData.temperature || '-'} °C ({assessmentData.feverDays || '0'} days)</div>
                      <div><span className="font-bold">Malaria Risk:</span> {assessmentData.malariaRisk || '-'}</div>
                      <div><span className="font-bold">Fever Signs:</span> {assessmentData.feverSigns?.join(', ') || 'None'}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t pt-2">
                      <div><span className="font-bold">Ear Problem:</span> {assessmentData.earPain ? 'Pain' : ''} {assessmentData.earDischarge ? `Discharge (${assessmentData.earDischargeDays}d)` : ''} {assessmentData.mastoidSwelling ? 'Mastoid Swelling' : ''}</div>
                      <div><span className="font-bold">Nutrition:</span> {assessmentData.weight || '-'}kg, MUAC: {assessmentData.muac || '-'}mm, Pallor: {assessmentData.pallor || '-'}</div>
                      <div><span className="font-bold">Immunization:</span> {assessmentData.immunization?.join(', ') || 'None'}</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {cbimnciData.chiefComplaints && (
              <div>
                <h4 className="font-bold text-slate-800 border-b border-slate-200 mb-2 pb-1">Chief Complaints</h4>
                <p className="text-sm whitespace-pre-wrap">{cbimnciData.chiefComplaints}</p>
              </div>
            )}
            {cbimnciData.diagnosis && (
              <div>
                <h4 className="font-bold text-slate-800 border-b border-slate-200 mb-2 pb-1">Classification</h4>
                <p className="text-sm whitespace-pre-wrap">{cbimnciData.diagnosis}</p>
              </div>
            )}
          </div>

          {prescriptionItems.length > 0 && (
            <div className="mb-8">
              <h4 className="font-bold text-slate-800 border-b-2 border-slate-800 mb-4 pb-1">Prescription</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-300 text-left">
                    <th className="py-2 font-bold">Medicine</th>
                    <th className="py-2 font-bold">Dosage</th>
                    <th className="py-2 font-bold">Freq.</th>
                    <th className="py-2 font-bold">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {prescriptionItems.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="py-3">{item.medicineName}</td>
                      <td className="py-3">{item.dosage}</td>
                      <td className="py-3">{item.frequency}</td>
                      <td className="py-3">{item.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-auto pt-8">
            <div className="flex justify-between items-end mt-12 pt-4 border-t border-slate-200">
              <div className="text-xs text-slate-400">Printed on: {new Date().toLocaleString()}</div>
              <div className="text-center">
                <div className="h-12 border-b border-slate-300 w-48 mb-2"></div>
                <p className="text-sm font-bold text-slate-700">Medical Officer Signature</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
