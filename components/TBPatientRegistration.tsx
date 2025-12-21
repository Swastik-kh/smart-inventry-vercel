
import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, Activity, UserPlus, List, Phone, MapPin, Calendar, FileDigit, User, Stethoscope, Users, TrendingUp, FlaskConical, AlertCircle, X, ChevronRight, Microscope, CheckCircle2, Eye, Search } from 'lucide-react';
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
  labResultMonth2Positive?: boolean; 
  completedSchedule: number[]; // Array of months where test is already done [0, 2, 5 etc]
  newReportAvailable?: boolean; // Flag to track if a new report has been generated but not viewed from the dashboard
  latestResult?: string; // Store the latest result text for display
  latestReportMonth?: number; // Store which month this result belongs to
  reports: TBReport[]; // History of reports
}

export const TBPatientRegistration: React.FC<TBPatientRegistrationProps> = ({ currentFiscalYear }) => {
  const [showSputumModal, setShowSputumModal] = useState(false);
  const [showReportListModal, setShowReportListModal] = useState(false);
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
        registrationDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // ~2 months ago
        completedSchedule: [0], // Baseline done
        newReportAvailable: false,
        latestResult: 'Negative',
        latestReportMonth: 0,
        reports: [
            { month: 0, result: 'Negative', labNo: '101', date: '2024-08-15', dateNepali: '२०८१/०५/३०' }
        ]
    },
    { 
        id: '102', 
        patientId: 'TB-081082-1002', 
        name: 'Sita Devi', 
        age: '32', 
        address: 'Lalitpur-05', 
        phone: '9842000000', 
        regType: 'New', 
        classification: 'PCD', 
        registrationDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // ~2 months ago
        completedSchedule: [0],
        newReportAvailable: false,
        latestResult: 'Negative',
        latestReportMonth: 0,
        reports: [
            { month: 0, result: 'Negative', labNo: '105', date: '2024-08-16', dateNepali: '२०८१/०५/३१' }
        ]
    },
    { 
        id: '103', 
        patientId: 'TB-081082-1003', 
        name: 'Hari Krishna', 
        age: '50', 
        address: 'Bhaktapur-02', 
        phone: '9843000000', 
        regType: 'Relapse', 
        classification: 'PBC', 
        registrationDate: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // ~5 months ago
        completedSchedule: [0, 2], // 0 and 2 done, 5 pending
        newReportAvailable: false,
        latestResult: 'Negative',
        latestReportMonth: 2,
        reports: [
            { month: 2, result: 'Negative', labNo: '450', date: '2024-10-15', dateNepali: '२०८१/०७/०१' },
            { month: 0, result: 'Pos (3+)', labNo: '050', date: '2024-05-15', dateNepali: '२०८१/०२/०२' }
        ]
    },
    { 
        id: '104', 
        patientId: 'TB-081082-1004', 
        name: 'Gita Sharma', 
        age: '28', 
        address: 'Kirtipur-03', 
        phone: '9844000000', 
        regType: 'New', 
        classification: 'EP', 
        registrationDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // ~2 months ago
        completedSchedule: [0],
        newReportAvailable: false,
        latestResult: 'Negative',
        latestReportMonth: 0,
        reports: [
            { month: 0, result: 'Negative', labNo: '110', date: '2024-08-20', dateNepali: '२०८१/०५/०४' }
        ]
    },
    { 
        id: '105', 
        patientId: 'TB-081082-1005', 
        name: 'Suresh Magar', 
        age: '40', 
        address: 'Tokha-01', 
        phone: '9845000000', 
        regType: 'New', 
        classification: 'PBC', 
        registrationDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // ~3 months ago
        labResultMonth2Positive: true,
        completedSchedule: [0, 2], // 2 was done (positive), now 3 is pending
        newReportAvailable: false,
        latestResult: 'Pos (1+)',
        latestReportMonth: 2,
        reports: [
            { month: 2, result: 'Pos (1+)', labNo: '602', date: '2024-11-01', dateNepali: '२०८१/०७/१६' },
            { month: 0, result: 'Pos (2+)', labNo: '205', date: '2024-08-01', dateNepali: '२०८१/०४/१६' }
        ]
    },
    { 
        id: '106', 
        patientId: 'TB-081082-1006', 
        name: 'Nabin KC', 
        age: '22', 
        address: 'Banepa-04', 
        phone: '9846000000', 
        regType: 'New', 
        classification: 'PBC', 
        registrationDate: new Date().toISOString().split('T')[0], // Just registered
        completedSchedule: [], // Baseline pending
        newReportAvailable: false,
        reports: []
    },
    { 
        id: '107', 
        patientId: 'TB-081082-1007', 
        name: 'Bimal Shrestha', 
        age: '55', 
        address: 'Patan-09', 
        phone: '9847000000', 
        regType: 'New', 
        classification: 'PBC', 
        registrationDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // ~6 months ago
        completedSchedule: [0, 2, 5], // 6 pending
        newReportAvailable: false,
        latestResult: 'Negative',
        latestReportMonth: 5,
        reports: [
            { month: 5, result: 'Negative', labNo: '890', date: '2024-11-10', dateNepali: '२०८१/०७/२५' },
            { month: 2, result: 'Negative', labNo: '560', date: '2024-08-10', dateNepali: '२०८१/०४/२६' },
            { month: 0, result: 'Pos (1+)', labNo: '090', date: '2024-05-10', dateNepali: '२०८१/०१/२८' }
        ]
    }
  ]);
  
  const generateId = () => {
    const fyClean = currentFiscalYear.replace('/', '');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `TB-${fyClean}-${random}`;
  };

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    patientId: '',
    name: '',
    age: '',
    address: '',
    phone: '',
    regType: '',
    classification: '',
    registrationDate: getTodayDate()
  });

  // Set initial ID
  useEffect(() => {
    setFormData(prev => ({ ...prev, patientId: generateId() }));
  }, [currentFiscalYear]);

  const regTypes: Option[] = [
    { id: 'new', label: 'नयाँ (New)', value: 'New' },
    { id: 'relapse', label: 'दोहोरिएको (Relapse)', value: 'Relapse' },
    { id: 'transfer_in', label: 'सरुवा भई आएको (Transferred In)', value: 'Transferred In' },
    { id: 'failure', label: 'उपचार असफल (Treatment After Failure)', value: 'Treatment After Failure' },
    { id: 'lost', label: 'हराएको बिरामी (Lost to Follow-up)', value: 'Lost to Follow-up' },
    { id: 'other', label: 'अन्य (Other)', value: 'Other' },
  ];

  const classificationOptions: Option[] = [
    { id: 'pbc', label: 'PBC (Pulmonary Bacteriologically Confirmed)', value: 'PBC' },
    { id: 'pcd', label: 'PCD (Pulmonary Clinically Diagnosed)', value: 'PCD' },
    { id: 'ep', label: 'EP (Extrapulmonary)', value: 'EP' },
  ];

  // Logic based on Nepal Govt TB Guidelines
  const getSputumTestStatus = (p: TBPatient) => {
    const regDate = new Date(p.registrationDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - regDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Check if test is already completed for the specific month
    const isDone = (month: number) => p.completedSchedule.includes(month);

    // 1. Darta hune bittikai (Immediate/Baseline): Month 0 (0-30 days)
    if (diffDays <= 30 && !isDone(0)) return { required: true, reason: 'सुरुवाती निदान (Baseline/Month 0)', scheduleMonth: 0 };

    // 2. Month 2 Follow-up
    if (diffDays >= 55 && diffDays <= 65 && !isDone(2)) {
        if (['PBC', 'PCD', 'EP'].includes(p.classification)) return { required: true, reason: 'दोस्रो महिना फलोअप (Month 2 Follow-up)', scheduleMonth: 2 };
    }

    // 3. Month 3 Follow-up (Conditional)
    if (diffDays >= 85 && diffDays <= 95 && !isDone(3)) {
        if (p.classification === 'PBC' && p.labResultMonth2Positive) return { required: true, reason: 'तेस्रो महिना फलोअप (Month 3 - M2 Pos)', scheduleMonth: 3 };
    }

    // 4. Month 5 Follow-up
    if (diffDays >= 145 && diffDays <= 155 && !isDone(5)) {
        if (p.classification === 'PBC') return { required: true, reason: 'पाँचौं महिना फलोअप (Month 5 Follow-up)', scheduleMonth: 5 };
    }

    // 5. Month 6 Follow-up (End of Treatment)
    if (diffDays >= 175 && diffDays <= 185 && !isDone(6)) {
        if (p.classification === 'PBC') return { required: true, reason: 'छैठौं महिना फलोअप (Month 6 End Tx)', scheduleMonth: 6 };
    }

    return { required: false, reason: '', scheduleMonth: -1 };
  };

  // Calculate stats and list
  const patientsNeedingSputum = patients
    .map(p => ({ ...p, ...getSputumTestStatus(p) }))
    .filter(p => p.required);

  const patientsWithNewReports = patients.filter(p => p.newReportAvailable);
    
  const sputumRequestCount = patientsNeedingSputum.length;
  const newReportCount = patientsWithNewReports.length;
  const totalPatients = patients.length;
  const newCasesCount = patients.filter(p => p.regType === 'New').length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newPatient: TBPatient = {
      id: Date.now().toString(),
      ...formData,
      completedSchedule: [], // Initialize empty schedule
      newReportAvailable: false,
      reports: []
    };

    setPatients([newPatient, ...patients]);
    handleReset();
    alert('बिरामी सफलतापूर्वक दर्ता भयो (Patient Registered Successfully)');
  };

  const handleReset = () => {
    setFormData({
      patientId: generateId(),
      name: '',
      age: '',
      address: '',
      phone: '',
      regType: '',
      classification: '',
      registrationDate: getTodayDate()
    });
  };

  // Filter Patients based on search
  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone.includes(searchTerm) ||
    p.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Prepare Lab Entry
  const handlePatientClick = (p: typeof patientsNeedingSputum[0]) => {
    setSelectedPatient({
        patient: p,
        reason: p.reason,
        scheduleMonth: p.scheduleMonth
    });
    setLabFormData({
        testDate: getTodayDate(),
        testDateNepali: '',
        labNo: '',
        result: '',
        grading: ''
    });
  };

  // Submit Lab Result
  const handleLabSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(!selectedPatient) return;

      // VALIDATION: Check if lab no is entered
      if (!labFormData.labNo.trim()) {
          alert('कृपया ल्याब नं. भर्नुहोस्। (Please enter Lab Number)');
          return;
      }

      // VALIDATION: Check if result is selected
      if (!labFormData.result) {
          alert('कृपया नतिजा (Positive/Negative) छान्नुहोस्। (Please select a result)');
          return;
      }

      // VALIDATION: Check if grading is selected when Positive
      if (labFormData.result === 'Positive' && !labFormData.grading) {
          alert('कृपया ग्रेडिङ (Grading) छान्नुहोस्। (Please select grading)');
          return;
      }

      const { patient, scheduleMonth } = selectedPatient;

      // Update the patient list
      setPatients(prev => prev.map(p => {
          if(p.id === patient.id) {
              const updated = { ...p };
              
              // 1. Mark this schedule as done
              updated.completedSchedule = [...p.completedSchedule, scheduleMonth];

              // 2. Logic: If Month 2 is Positive, flag it
              if (scheduleMonth === 2 && labFormData.result === 'Positive') {
                  updated.labResultMonth2Positive = true;
              }

              // 3. Mark as New Report Available (for the dashboard counter)
              updated.newReportAvailable = true;
              updated.latestResult = labFormData.result === 'Positive' 
                ? `Pos (${labFormData.grading})` 
                : 'Negative';
              updated.latestReportMonth = scheduleMonth;

              // 4. Add to Report History
              const newReport: TBReport = {
                  month: scheduleMonth,
                  result: labFormData.result === 'Positive' ? `Pos (${labFormData.grading})` : 'Negative',
                  labNo: labFormData.labNo,
                  date: labFormData.testDate,
                  dateNepali: labFormData.testDateNepali
              };
              
              updated.reports = [newReport, ...(updated.reports || [])];

              return updated;
          }
          return p;
      }));

      // Close Lab Modal
      setSelectedPatient(null);
  };

  // Handle Viewing a New Report from the List
  const handleViewReport = (patientId: string) => {
      // 1. Mark report as viewed (remove from count)
      setPatients(prev => prev.map(p => {
          if (p.id === patientId) {
              return { ...p, newReportAvailable: false };
          }
          return p;
      }));

      // 2. Close the modal
      setShowReportListModal(false);

      // 3. Scroll to the patients table
      const tableElement = document.getElementById('recent-patients-table');
      if (tableElement) {
          tableElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Optional: You could add a temporary highlight effect here using a ref or state
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 relative">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                <Activity size={24} />
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-800 font-nepali">क्षयरोग बिरामी दर्ता (TB Patient Registration)</h2>
                <p className="text-sm text-slate-500">नयाँ क्षयरोग बिरामीको विवरण प्रविष्ट गर्नुहोस्</p>
            </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Total New Cases */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl text-white shadow-lg shadow-green-200 flex items-center justify-between">
            <div>
                <p className="text-green-100 text-sm font-medium font-nepali mb-1">नयाँ बिरामी संख्या (New Cases)</p>
                <h3 className="text-3xl font-bold">{newCasesCount}</h3>
            </div>
            <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                <UserPlus size={24} className="text-white" />
            </div>
        </div>

        {/* Total Registered */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-slate-500 text-sm font-medium font-nepali mb-1">कुल दर्ता (Total Registered)</p>
                <h3 className="text-3xl font-bold text-slate-800">{totalPatients}</h3>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
                <Users size={24} className="text-blue-600" />
            </div>
        </div>

        {/* Today's Stats */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-slate-500 text-sm font-medium font-nepali mb-1">आजको दर्ता (Today's Entry)</p>
                <h3 className="text-3xl font-bold text-slate-800">{patients.filter(p => p.registrationDate === getTodayDate()).length}</h3>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
                <TrendingUp size={24} className="text-purple-600" />
            </div>
        </div>

        {/* Sputum Test Request (Khakar Parikshan) - CLICKABLE */}
        <div 
            onClick={() => setShowSputumModal(true)}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between ring-2 ring-orange-100 cursor-pointer hover:bg-orange-50/50 hover:shadow-md transition-all active:scale-95 group"
        >
            <div>
                <p className="text-slate-500 text-sm font-medium font-nepali mb-1 flex items-center gap-1">
                    खकार परीक्षण अनुरोध <ChevronRight size={14} className="text-orange-400 group-hover:translate-x-1 transition-transform"/>
                </p>
                <h3 className="text-3xl font-bold text-orange-600">{sputumRequestCount}</h3>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg relative group-hover:bg-orange-100 transition-colors">
                <FlaskConical size={24} className="text-orange-600" />
                {sputumRequestCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                )}
            </div>
        </div>

        {/* New Lab Reports Notification Card */}
        <div 
            onClick={() => setShowReportListModal(true)}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between ring-2 ring-teal-100 cursor-pointer hover:bg-teal-50/50 hover:shadow-md transition-all active:scale-95 group"
        >
            <div>
                <p className="text-slate-500 text-sm font-medium font-nepali mb-1 flex items-center gap-1">
                    खकार रिपोर्ट (New Reports) <ChevronRight size={14} className="text-teal-400 group-hover:translate-x-1 transition-transform"/>
                </p>
                <h3 className="text-3xl font-bold text-teal-600">{newReportCount}</h3>
            </div>
            <div className="bg-teal-50 p-3 rounded-lg relative group-hover:bg-teal-100 transition-colors">
                <Microscope size={24} className="text-teal-600" />
                {newReportCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
                    </span>
                )}
            </div>
        </div>
      </div>
      
      {/* Guideline Info Alert */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-3 text-sm text-blue-700">
        <AlertCircle size={18} className="shrink-0 mt-0.5" />
        <p className="font-nepali">
            <strong>खकार परीक्षण तालिका (Sputum Schedule):</strong><br/>
            • <strong>PBC:</strong> ०, २, ५ र ६ महिनामा। (२ मा पोजिटिभ आए ३ मा पनि)<br/>
            • <strong>PCD र EP:</strong> ० र २ महिनामा।
        </p>
      </div>

      {/* Form Section */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSubmit}>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            
            <div className="md:col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-center gap-3">
              <FileDigit className="text-blue-600" />
              <div className="flex-1">
                <label className="text-xs font-bold text-blue-600 uppercase tracking-wide block mb-1">
                  बिरामी परिचय नं. (Unique Patient ID)
                </label>
                <input 
                  type="text" 
                  value={formData.patientId}
                  readOnly
                  className="bg-transparent border-none text-xl font-bold text-slate-800 focus:ring-0 p-0 w-full font-mono"
                />
              </div>
              <span className="text-xs text-blue-400 font-medium px-2 py-1 bg-white rounded border border-blue-200">
                Auto Generated
              </span>
            </div>

            <Input 
              label="बिरामीको नाम (Patient Name)" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              required
              placeholder="Full Name"
              icon={<User size={18} />}
            />

            <div className="grid grid-cols-2 gap-4">
               <Input 
                label="उमेर (Age)" 
                type="number"
                value={formData.age}
                onChange={e => setFormData({...formData, age: e.target.value})}
                required
                placeholder="Age"
                icon={<Calendar size={18} />}
              />
               <Input 
                label="फोन नं. (Phone No)" 
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                required
                placeholder="98XXXXXXXX"
                icon={<Phone size={18} />}
              />
            </div>

            <Input 
              label="ठेगाना (Address)" 
              value={formData.address}
              onChange={e => setFormData({...formData, address: e.target.value})}
              required
              placeholder="Municipality-Ward, District"
              icon={<MapPin size={18} />}
            />

            <Input 
              label="दर्ता मिति (Registration Date)" 
              type="date"
              value={formData.registrationDate}
              readOnly
              required
              className="bg-slate-50"
              icon={<Calendar size={18} />}
            />

            <Select 
              label="दर्ता प्रकार (Registration Type)"
              options={regTypes}
              value={formData.regType}
              onChange={e => setFormData({...formData, regType: e.target.value})}
              required
              icon={<List size={18} />}
            />

            <Select 
              label="वर्गीकरण (Disease Classification)"
              options={classificationOptions}
              value={formData.classification}
              onChange={e => setFormData({...formData, classification: e.target.value})}
              required
              icon={<Stethoscope size={18} />}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium"
            >
              <RotateCcw size={18} />
              <span>रिसेट (Reset)</span>
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg shadow-sm transition-all active:scale-95 font-medium"
            >
              <Save size={18} />
              <span>दर्ता गर्नुहोस् (Register)</span>
            </button>
          </div>
        </form>
      </div>

      {/* Recent Registrations Table */}
      <div id="recent-patients-table" className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <h3 className="font-semibold text-slate-700 font-nepali">हालै दर्ता भएका बिरामीहरू (Recent Patients)</h3>
             <span className="text-xs font-medium bg-slate-200 text-slate-600 px-2 py-1 rounded-full">{filteredPatients.length}</span>
          </div>
          
          <div className="relative w-full sm:w-72">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Search size={16} />
            </div>
            <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="नाम, ID, फोन वा ठेगाना खोज्नुहोस्..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none text-sm transition-all"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Address</th>
                <th className="px-6 py-3">Class</th>
                <th className="px-6 py-3">Status / Result</th>
                <th className="px-6 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic">
                    {searchTerm ? 'कुनै नतिजा फेला परेन (No matching records)' : 'कुनै रेकर्ड फेला परेन (No records found)'}
                  </td>
                </tr>
              ) : (
                filteredPatients.map((p) => {
                    const daysPassed = Math.ceil(Math.abs(new Date().getTime() - new Date(p.registrationDate).getTime()) / (1000 * 60 * 60 * 24));
                    return (
                        <tr key={p.id} className="hover:bg-slate-50/50 align-top">
                            <td className="px-6 py-4 font-mono font-medium text-primary-600 whitespace-nowrap">{p.patientId}</td>
                            <td className="px-6 py-4">
                                <div className="font-medium text-slate-800">{p.name}</div>
                                <div className="text-xs text-slate-500">{p.age} Yrs | {p.phone}</div>
                            </td>
                            <td className="px-6 py-4 text-slate-600">{p.address}</td>
                            <td className="px-6 py-4">
                                <span className="inline-flex px-2 py-1 rounded bg-purple-50 text-purple-700 text-xs font-bold border border-purple-100">
                                    {p.classification}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                {p.reports && p.reports.length > 0 ? (
                                    <div className="flex flex-col gap-2">
                                        {/* Sort by month descending to show latest first */}
                                        {p.reports.sort((a, b) => b.month - a.month).map((report, idx) => (
                                             <div key={idx} className="flex flex-col gap-0.5 border-b border-slate-100 last:border-0 pb-1 last:pb-0">
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="font-bold text-slate-500 min-w-[60px] uppercase tracking-wide text-[10px]">
                                                        {report.month === 0 ? 'Month 0' : `Month ${report.month}`}
                                                    </span>
                                                    <span className={`px-1.5 py-0.5 rounded font-bold border ${
                                                        report.result.includes('Pos') 
                                                        ? 'bg-red-50 text-red-700 border-red-200' 
                                                        : 'bg-green-50 text-green-700 border-green-200'
                                                    }`}>
                                                        {report.result}
                                                    </span>
                                                </div>
                                                <div className="text-[10px] text-slate-500 pl-[68px] flex items-center gap-2">
                                                     <span title="Lab Number" className="bg-slate-100 px-1 rounded text-slate-600 font-mono">Lab: {report.labNo}</span>
                                                     <span title="Nepali Date" className="text-slate-400 font-nepali">{report.dateNepali || '-'}</span>
                                                </div>
                                             </div>
                                        ))}
                                    </div>
                                ) : (
                                     <div className="flex flex-col gap-1">
                                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                            Initial
                                        </span>
                                        <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded text-xs font-medium border ${
                                            p.regType === 'New' 
                                            ? 'bg-blue-50 text-blue-700 border-blue-100' 
                                            : 'bg-slate-50 text-slate-700 border-slate-100'
                                        }`}>
                                            {p.regType}
                                        </span>
                                    </div>
                                )}
                            </td>
                            <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                {p.registrationDate}
                                <span className="block text-[10px] text-slate-400">{daysPassed} days ago</span>
                            </td>
                        </tr>
                    );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sputum Request LIST Modal (PENDING) */}
      {showSputumModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowSputumModal(false)}></div>
            
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-orange-50/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                            <FlaskConical size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg font-nepali">खकार परीक्षण आवश्यक सूची (Pending Tests)</h3>
                            <p className="text-xs text-slate-500">तलका बिरामीहरूको खकार परीक्षण गर्ने समय भएको छ। रिपोर्ट राख्न क्लिक गर्नुहोस्।</p>
                        </div>
                    </div>
                    <button onClick={() => setShowSputumModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-auto p-0">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200 sticky top-0">
                            <tr>
                                <th className="px-6 py-3">ID</th>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3">Class</th>
                                <th className="px-6 py-3">Reason for Test</th>
                                <th className="px-6 py-3 text-right">Reg. Date (Nep)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {patientsNeedingSputum.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic flex flex-col items-center justify-center gap-2">
                                        <CheckCircle2 size={32} className="text-green-500 opacity-50" />
                                        <span>हाल कुनै पनि बिरामीको परीक्षण आवश्यक छैन (No pending tests)</span>
                                    </td>
                                </tr>
                            ) : (
                                patientsNeedingSputum.map((p) => {
                                    // Conversion logic
                                    let nepaliDateStr = p.registrationDate;
                                    try {
                                        const adDate = new Date(p.registrationDate);
                                        const nd = new NepaliDate(adDate);
                                        nepaliDateStr = nd.format('YYYY-MM-DD');
                                    } catch (e) {}

                                    return (
                                        <tr 
                                            key={p.id} 
                                            onClick={() => handlePatientClick(p)}
                                            className="hover:bg-orange-50 cursor-pointer transition-colors border-l-4 border-l-transparent hover:border-l-orange-400 group"
                                        >
                                            <td className="px-6 py-4 font-mono font-medium text-primary-600 whitespace-nowrap group-hover:underline">{p.patientId}</td>
                                            <td className="px-6 py-4 font-medium text-slate-800">{p.name}</td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">{p.classification}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                                                    <AlertCircle size={12} />
                                                    {p.reason}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-500 text-xs whitespace-nowrap font-nepali">
                                                {nepaliDateStr}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* NEW REPORT LIST Modal (COMPLETED) */}
      {showReportListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowReportListModal(false)}></div>
            
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-teal-50/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-teal-100 p-2 rounded-lg text-teal-600">
                            <Microscope size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg font-nepali">भर्खरै प्राप्त रिपोर्टहरू (Recent Lab Reports)</h3>
                            <p className="text-xs text-slate-500">विवरण हेर्नको लागि बिरामीमा क्लिक गर्नुहोस्। (Click to view details)</p>
                        </div>
                    </div>
                    <button onClick={() => setShowReportListModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-auto p-0">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200 sticky top-0">
                            <tr>
                                <th className="px-6 py-3">ID</th>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3">Schedule</th>
                                <th className="px-6 py-3">Lab No</th>
                                <th className="px-6 py-3">Latest Result</th>
                                <th className="px-6 py-3">Date (Nep)</th>
                                <th className="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {patientsWithNewReports.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic flex flex-col items-center justify-center gap-2">
                                        <CheckCircle2 size={32} className="text-teal-500 opacity-50" />
                                        <span>नयाँ रिपोर्ट छैन (No new reports)</span>
                                    </td>
                                </tr>
                            ) : (
                                patientsWithNewReports.map((p) => {
                                    const latestReport = p.reports.find(r => r.month === p.latestReportMonth);
                                    return (
                                        <tr 
                                            key={p.id} 
                                            onClick={() => handleViewReport(p.id)}
                                            className="hover:bg-teal-50 cursor-pointer transition-colors border-l-4 border-l-transparent hover:border-l-teal-400 group"
                                        >
                                            <td className="px-6 py-4 font-mono font-medium text-primary-600 whitespace-nowrap group-hover:underline">{p.patientId}</td>
                                            <td className="px-6 py-4 font-medium text-slate-800">{p.name}</td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                    {p.latestReportMonth === 0 ? 'Baseline (Month 0)' : `Month ${p.latestReportMonth} Follow-up`}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-slate-600">
                                                {latestReport?.labNo || '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                {p.latestResult && (
                                                    <span className={`inline-flex px-2 py-1 rounded text-xs font-bold border ${
                                                        p.latestResult.includes('Pos') 
                                                        ? 'bg-red-50 text-red-700 border-red-200' 
                                                        : 'bg-green-50 text-green-700 border-green-200'
                                                    }`}>
                                                        {p.latestResult}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 font-nepali text-slate-600">
                                                {latestReport?.dateNepali || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="inline-flex items-center gap-1 text-xs text-teal-600 font-medium bg-teal-50 px-2 py-1 rounded-full border border-teal-100">
                                                    <Eye size={12} /> View
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* DATA ENTRY FORM MODAL (Overlay on top) */}
      {selectedPatient && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedPatient(null)}></div>
            
            <div className="bg-white w-full max-w-md rounded-xl shadow-2xl relative animate-in zoom-in-95">
                <div className="p-6 border-b border-slate-100 flex items-start gap-4">
                     <div className="bg-primary-100 p-3 rounded-full text-primary-600">
                        <Microscope size={24} />
                     </div>
                     <div>
                         <h3 className="font-bold text-slate-800 text-lg font-nepali">प्रयोगशाला नतिजा (Lab Result)</h3>
                         <p className="text-sm text-slate-600 mt-1">
                             <span className="font-bold">{selectedPatient.patient.name}</span>
                             <span className="mx-2 text-slate-300">|</span>
                             <span className="text-xs text-orange-600 font-medium bg-orange-50 px-2 py-0.5 rounded">{selectedPatient.reason}</span>
                         </p>
                     </div>
                     <button onClick={() => setSelectedPatient(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                         <X size={20} />
                     </button>
                </div>

                <form onSubmit={handleLabSubmit} className="p-6 space-y-4" noValidate>
                    <Input 
                        label="ल्याब नं. (Lab No)"
                        value={labFormData.labNo}
                        onChange={e => setLabFormData({...labFormData, labNo: e.target.value})}
                        required
                        placeholder="Enter Lab Number"
                        icon={<FileDigit size={16} />}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="मिति (अंग्रेजी)"
                            type="date"
                            value={labFormData.testDate}
                            // Fixed: spread labFormData instead of formData
                            onChange={e => setLabFormData({...labFormData, testDate: e.target.value})}
                            required
                        />
                        <NepaliDatePicker
                            label="मिति (नेपाली)"
                            value={labFormData.testDateNepali}
                            onChange={(val) => setLabFormData({...labFormData, testDateNepali: val})}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">नतिजा (Result) <span className="text-red-500">*</span></label>
                        <div className="grid grid-cols-2 gap-3">
                            <label className={`
                                border rounded-lg p-3 flex flex-col items-center gap-2 cursor-pointer transition-all
                                ${labFormData.result === 'Negative' ? 'border-green-500 bg-green-50 text-green-700 ring-1 ring-green-500' : 'border-slate-200 hover:bg-slate-50'}
                            `}>
                                <input 
                                    type="radio" 
                                    name="result" 
                                    value="Negative" 
                                    checked={labFormData.result === 'Negative'} 
                                    onChange={e => setLabFormData({...labFormData, result: e.target.value})}
                                    className="sr-only"
                                />
                                <CheckCircle2 size={24} className={labFormData.result === 'Negative' ? 'text-green-600' : 'text-slate-300'} />
                                <span className="font-medium text-sm">Negative (कीटाणु देखिएन)</span>
                            </label>

                            <label className={`
                                border rounded-lg p-3 flex flex-col items-center gap-2 cursor-pointer transition-all
                                ${labFormData.result === 'Positive' ? 'border-red-500 bg-red-50 text-red-700 ring-1 ring-red-500' : 'border-slate-200 hover:bg-slate-50'}
                            `}>
                                <input 
                                    type="radio" 
                                    name="result" 
                                    value="Positive" 
                                    checked={labFormData.result === 'Positive'} 
                                    onChange={e => setLabFormData({...labFormData, result: e.target.value})}
                                    className="sr-only"
                                />
                                <FlaskConical size={24} className={labFormData.result === 'Positive' ? 'text-red-600' : 'text-slate-300'} />
                                <span className="font-medium text-sm">Positive (कीटाणु देखियो)</span>
                            </label>
                        </div>
                    </div>

                    {labFormData.result === 'Positive' && (
                        <Select 
                            label="ग्रेडिङ (Grading)"
                            value={labFormData.grading}
                            onChange={e => setLabFormData({...labFormData, grading: e.target.value})}
                            required
                            options={[
                                {id: 'scanty', value: 'Scanty', label: 'Scanty'},
                                {id: '1+', value: '1+', label: '1+'},
                                {id: '2+', value: '2+', label: '2+'},
                                {id: '3+', value: '3+', label: '3+'},
                            ]}
                        />
                    )}

                    <div className="pt-4 flex justify-end gap-3">
                        <button 
                            type="button" 
                            onClick={() => setSelectedPatient(null)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm"
                        >
                            रद्द (Cancel)
                        </button>
                        <button 
                            type="submit" 
                            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium text-sm shadow-sm flex items-center gap-2"
                        >
                            <Save size={16} />
                            Save Report
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};
