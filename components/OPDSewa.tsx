import React, { useState, useRef } from 'react';
import { Search, Save, Printer, Plus, Trash2, FileText, User, Calendar, Stethoscope, Activity, Pill, FlaskConical } from 'lucide-react';
import { ServiceSeekerRecord, OPDRecord, PrescriptionItem } from '../types/coreTypes';
import { Input } from './Input';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';
import { useReactToPrint } from 'react-to-print';

interface OPDSewaProps {
  serviceSeekerRecords: ServiceSeekerRecord[];
  opdRecords: OPDRecord[];
  onSaveRecord: (record: OPDRecord) => void;
  onDeleteRecord: (recordId: string) => void;
  currentFiscalYear: string;
  currentUser: any;
}

const initialPrescriptionItem: PrescriptionItem = {
  id: '',
  medicineName: '',
  dosage: '',
  frequency: '',
  duration: '',
  instructions: ''
};

export const OPDSewa: React.FC<OPDSewaProps> = ({ 
  serviceSeekerRecords, 
  opdRecords, 
  onSaveRecord, 
  onDeleteRecord, 
  currentFiscalYear,
  currentUser
}) => {
  const [searchId, setSearchId] = useState('');
  const [currentPatient, setCurrentPatient] = useState<ServiceSeekerRecord | null>(null);
  const [opdData, setOpdData] = useState<Partial<OPDRecord>>({
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
    // Reset form for new visit
    setOpdData({
      chiefComplaints: '',
      diagnosis: '',
      investigation: '',
      prescriptions: [],
      advice: '',
      nextVisitDate: ''
    });
    setPrescriptionItems([]);
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

  const handleSave = () => {
    if (!currentPatient) return;

    const newRecord: OPDRecord = {
      id: Date.now().toString(),
      fiscalYear: currentFiscalYear,
      serviceSeekerId: currentPatient.id,
      uniquePatientId: currentPatient.uniquePatientId,
      visitDate: new NepaliDate().format('YYYY-MM-DD'),
      chiefComplaints: opdData.chiefComplaints || '',
      diagnosis: opdData.diagnosis || '',
      investigation: opdData.investigation || '',
      prescriptions: prescriptionItems,
      advice: opdData.advice,
      nextVisitDate: opdData.nextVisitDate
    };

    onSaveRecord(newRecord);
    alert('OPD रेकर्ड सुरक्षित गरियो।');
    // Optional: Clear form or keep it for printing? Usually keep for printing.
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Prescription-${currentPatient?.uniquePatientId}`,
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Search Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 font-nepali mb-4 flex items-center gap-2">
          <Stethoscope className="text-primary-600" />
          ओ.पी.डी. सेवा (OPD Service)
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
          {/* Left Column: Patient Info & History */}
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
            
            {/* Previous Visits could go here */}
          </div>

          {/* Right Column: OPD Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h3 className="font-bold text-slate-800 text-lg">OPD परीक्षण फारम</h3>
                <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  {new NepaliDate().format('YYYY-MM-DD')}
                </span>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">मुख्य समस्याहरू (Chief Complaints)</label>
                  <textarea
                    value={opdData.chiefComplaints}
                    onChange={(e) => setOpdData({...opdData, chiefComplaints: e.target.value})}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[80px]"
                    placeholder="बिरामीको मुख्य समस्याहरू लेख्नुहोस्..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">निदान (Diagnosis)</label>
                    <textarea
                      value={opdData.diagnosis}
                      onChange={(e) => setOpdData({...opdData, diagnosis: e.target.value})}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[80px]"
                      placeholder="सम्भावित रोगको पहिचान..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">जाँच (Investigation)</label>
                    <textarea
                      value={opdData.investigation}
                      onChange={(e) => setOpdData({...opdData, investigation: e.target.value})}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[80px]"
                      placeholder="Lab Test, X-Ray, USG आदि..."
                    />
                  </div>
                </div>

                {/* Prescription Section */}
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
                    <div className="bg-white p-4 rounded-lg border border-primary-100 mb-4 shadow-sm animate-in zoom-in-95">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <Input 
                          label="औषधिको नाम" 
                          value={currentPrescription.medicineName} 
                          onChange={e => setCurrentPrescription({...currentPrescription, medicineName: e.target.value})}
                          placeholder="Ex: Paracetamol"
                          autoFocus
                        />
                        <Input 
                          label="मात्रा (Dosage)" 
                          value={currentPrescription.dosage} 
                          onChange={e => setCurrentPrescription({...currentPrescription, dosage: e.target.value})}
                          placeholder="Ex: 500mg"
                        />
                        <Input 
                          label="पटक (Frequency)" 
                          value={currentPrescription.frequency} 
                          onChange={e => setCurrentPrescription({...currentPrescription, frequency: e.target.value})}
                          placeholder="Ex: 1-0-1 (बिहान-दिउँसो-बेलुका)"
                        />
                        <Input 
                          label="अवधि (Duration)" 
                          value={currentPrescription.duration} 
                          onChange={e => setCurrentPrescription({...currentPrescription, duration: e.target.value})}
                          placeholder="Ex: 5 days"
                        />
                        <div className="md:col-span-2">
                          <Input 
                            label="निर्देशन (Instructions)" 
                            value={currentPrescription.instructions} 
                            onChange={e => setCurrentPrescription({...currentPrescription, instructions: e.target.value})}
                            placeholder="Ex: खाना पछि"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setShowPrescriptionForm(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg text-sm">रद्द</button>
                        <button onClick={handleAddPrescription} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">थप्नुहोस्</button>
                      </div>
                    </div>
                  )}

                  {prescriptionItems.length > 0 ? (
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="p-3">औषधि</th>
                            <th className="p-3">मात्रा</th>
                            <th className="p-3">पटक</th>
                            <th className="p-3">अवधि</th>
                            <th className="p-3">निर्देशन</th>
                            <th className="p-3 w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {prescriptionItems.map((item, idx) => (
                            <tr key={item.id || idx}>
                              <td className="p-3 font-medium">{item.medicineName}</td>
                              <td className="p-3">{item.dosage}</td>
                              <td className="p-3">{item.frequency}</td>
                              <td className="p-3">{item.duration}</td>
                              <td className="p-3 text-slate-500">{item.instructions}</td>
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
                  ) : (
                    <div className="text-center py-8 text-slate-400 bg-white rounded-lg border border-dashed border-slate-300">
                      कुनै औषधि थपिएको छैन
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">सल्लाह / सुझाव (Advice)</label>
                  <textarea
                    value={opdData.advice}
                    onChange={(e) => setOpdData({...opdData, advice: e.target.value})}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[60px]"
                    placeholder="बिरामीलाई दिइने सल्लाह..."
                  />
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t">
                  <button 
                    onClick={handlePrint}
                    className="px-6 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 flex items-center gap-2 shadow-sm"
                  >
                    <Printer size={18} /> प्रिन्ट (Print)
                  </button>
                  <button 
                    onClick={handleSave}
                    className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 shadow-sm font-medium"
                  >
                    <Save size={18} /> सुरक्षित गर्नुहोस्
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Template */}
      <div style={{ display: "none" }}>
        <div ref={printRef} className="p-8 bg-white text-slate-900 print:block">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-6">
            <div className="flex items-center gap-4">
              {/* Logo placeholder */}
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center border border-slate-300">
                <Stethoscope size={32} className="text-slate-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{currentUser?.organizationName || 'स्वास्थ्य संस्थाको नाम'}</h1>
                <p className="text-sm text-slate-600">ठेगाना, फोन नम्बर</p>
                <p className="text-xs text-slate-500 mt-1">OPD Prescription Ticket</p>
              </div>
            </div>
            <div className="text-right text-sm">
              <p><strong>Date:</strong> {new NepaliDate().format('YYYY-MM-DD')}</p>
              <p><strong>OPD No:</strong> {currentPatient?.registrationNumber}</p>
            </div>
          </div>

          {/* Patient Info */}
          {currentPatient && (
            <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm">
              <div><span className="font-bold text-slate-600">Name:</span> {currentPatient.name}</div>
              <div><span className="font-bold text-slate-600">Age/Sex:</span> {currentPatient.age} / {currentPatient.gender}</div>
              <div><span className="font-bold text-slate-600">Address:</span> {currentPatient.address}</div>
              <div><span className="font-bold text-slate-600">PID:</span> {currentPatient.uniquePatientId}</div>
            </div>
          )}

          {/* Clinical Notes */}
          <div className="grid grid-cols-1 gap-6 mb-6">
            {opdData.chiefComplaints && (
              <div>
                <h4 className="font-bold text-slate-800 border-b border-slate-200 mb-2 pb-1">Chief Complaints</h4>
                <p className="text-sm whitespace-pre-wrap">{opdData.chiefComplaints}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-6">
              {opdData.diagnosis && (
                <div>
                  <h4 className="font-bold text-slate-800 border-b border-slate-200 mb-2 pb-1">Diagnosis</h4>
                  <p className="text-sm whitespace-pre-wrap">{opdData.diagnosis}</p>
                </div>
              )}
              {opdData.investigation && (
                <div>
                  <h4 className="font-bold text-slate-800 border-b border-slate-200 mb-2 pb-1">Investigation</h4>
                  <p className="text-sm whitespace-pre-wrap">{opdData.investigation}</p>
                </div>
              )}
            </div>
          </div>

          {/* Prescription Table */}
          {prescriptionItems.length > 0 && (
            <div className="mb-8">
              <h4 className="font-bold text-slate-800 border-b-2 border-slate-800 mb-4 pb-1 flex items-center gap-2">
                <span className="text-2xl">Rx</span> Prescription
              </h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-300 text-left">
                    <th className="py-2 font-bold w-[40%]">Medicine</th>
                    <th className="py-2 font-bold">Dosage</th>
                    <th className="py-2 font-bold">Freq.</th>
                    <th className="py-2 font-bold">Duration</th>
                    <th className="py-2 font-bold">Instruction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prescriptionItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-3 font-medium">{idx + 1}. {item.medicineName}</td>
                      <td className="py-3">{item.dosage}</td>
                      <td className="py-3">{item.frequency}</td>
                      <td className="py-3">{item.duration}</td>
                      <td className="py-3 text-slate-600">{item.instructions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Advice & Footer */}
          <div className="mt-auto pt-8">
            {opdData.advice && (
              <div className="mb-8 p-4 bg-slate-50 rounded border border-slate-200">
                <h4 className="font-bold text-slate-800 mb-2 text-sm">Advice / सल्लाह:</h4>
                <p className="text-sm">{opdData.advice}</p>
              </div>
            )}
            
            <div className="flex justify-between items-end mt-12 pt-4 border-t border-slate-200">
              <div className="text-xs text-slate-400">
                Printed on: {new Date().toLocaleString()}
              </div>
              <div className="text-center">
                <div className="h-12 border-b border-slate-300 w-48 mb-2"></div>
                <p className="text-sm font-bold text-slate-700">Doctor's Signature</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
