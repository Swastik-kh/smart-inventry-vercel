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
                <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  {new NepaliDate().format('YYYY-MM-DD')}
                </span>
              </div>

              <div className="space-y-6">
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
                    <label className="block text-sm font-medium text-slate-700 mb-2">निदान (Diagnosis)</label>
                    <textarea
                      value={cbimnciData.diagnosis}
                      onChange={(e) => setCbimnciData({...cbimnciData, diagnosis: e.target.value})}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-h-[80px]"
                      placeholder="सम्भावित रोगको पहिचान..."
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
            {cbimnciData.chiefComplaints && (
              <div>
                <h4 className="font-bold text-slate-800 border-b border-slate-200 mb-2 pb-1">Chief Complaints</h4>
                <p className="text-sm whitespace-pre-wrap">{cbimnciData.chiefComplaints}</p>
              </div>
            )}
            {cbimnciData.diagnosis && (
              <div>
                <h4 className="font-bold text-slate-800 border-b border-slate-200 mb-2 pb-1">Diagnosis</h4>
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
