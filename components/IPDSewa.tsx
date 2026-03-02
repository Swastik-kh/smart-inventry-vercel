import React, { useState, useMemo } from 'react';
import { Search, Save, Plus, Trash2, User, Calendar, Building2, Clock, FileText, History, X } from 'lucide-react';
import { ServiceSeekerRecord, IPDRecord } from '../types/coreTypes';
import { Input } from './Input';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface IPDSewaProps {
  serviceSeekerRecords?: ServiceSeekerRecord[];
  ipdRecords?: IPDRecord[];
  onSaveRecord: (record: IPDRecord) => void;
  onDeleteRecord: (recordId: string) => void;
  currentFiscalYear: string;
  currentUser: any;
}

export const IPDSewa: React.FC<IPDSewaProps> = ({ 
  serviceSeekerRecords = [], 
  ipdRecords = [], 
  onSaveRecord, 
  onDeleteRecord, 
  currentFiscalYear,
  currentUser
}) => {
  const [searchId, setSearchId] = useState('');
  const [currentPatient, setCurrentPatient] = useState<ServiceSeekerRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'admission' | 'history'>('admission');
  const [ipdData, setIpdData] = useState<Partial<IPDRecord>>({
    admissionDate: new NepaliDate().format('YYYY-MM-DD'),
    admissionTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    bedNumber: '',
    wardName: '',
    provisionalDiagnosis: '',
    chiefComplaints: '',
    historyOfPresentIllness: '',
    status: 'Admitted'
  });
  const [searchResults, setSearchResults] = useState<ServiceSeekerRecord[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchId.trim().toLowerCase();
    if (!query) return;

    const results = serviceSeekerRecords.filter(r => 
      r.uniquePatientId.toLowerCase().includes(query) || 
      r.name.toLowerCase().includes(query) ||
      r.phone?.includes(query)
    );
    setSearchResults(results);
    setShowSearchResults(true);
  };

  const selectPatient = (patient: ServiceSeekerRecord) => {
    setCurrentPatient(patient);
    setShowSearchResults(false);
    setSearchId(patient.uniquePatientId);
    
    // Check if patient is already admitted
    const activeAdmission = ipdRecords.find(r => r.serviceSeekerId === patient.id && r.status === 'Admitted');
    if (activeAdmission) {
      setIpdData(activeAdmission);
      setEditingRecordId(activeAdmission.id);
    } else {
      setIpdData({
        admissionDate: new NepaliDate().format('YYYY-MM-DD'),
        admissionTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        bedNumber: '',
        wardName: '',
        provisionalDiagnosis: '',
        chiefComplaints: '',
        historyOfPresentIllness: '',
        status: 'Admitted'
      });
      setEditingRecordId(null);
    }
  };

  const handleSave = () => {
    if (!currentPatient) {
      alert('कृपया पहिले बिरामी छान्नुहोस्');
      return;
    }

    const record: IPDRecord = {
      ...ipdData as IPDRecord,
      id: editingRecordId || Math.random().toString(36).substr(2, 9),
      fiscalYear: currentFiscalYear,
      serviceSeekerId: currentPatient.id,
      uniquePatientId: currentPatient.uniqueId,
      patientName: currentPatient.name,
      age: currentPatient.age,
      gender: currentPatient.gender,
      createdBy: currentUser?.uid
    };

    onSaveRecord(record);
    alert('IPD रेकर्ड सुरक्षित गरियो');
    if (record.status !== 'Admitted') {
        setCurrentPatient(null);
        setSearchId('');
        setIpdData({});
    }
  };

  const patientHistory = useMemo(() => {
    if (!currentPatient) return [];
    return ipdRecords.filter(r => r.serviceSeekerId === currentPatient.id).sort((a, b) => b.admissionDate.localeCompare(a.admissionDate));
  }, [currentPatient, ipdRecords]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Building2 className="text-primary-600" /> आई.पी.डी. सेवा (IPD Service)
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Search & Patient Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Search size={18} className="text-primary-600" /> बिरामी खोज्नुहोस्
            </h3>
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="ID, नाम वा फोन नम्बर..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
              <Search className="absolute left-3 top-3 text-slate-400" size={18} />
              <button type="submit" className="hidden">Search</button>
            </form>

            {showSearchResults && searchResults.length > 0 && (
              <div className="mt-4 border border-slate-100 rounded-xl overflow-hidden shadow-lg bg-white absolute z-10 w-64">
                {searchResults.map(patient => (
                  <button
                    key={patient.id}
                    onClick={() => selectPatient(patient)}
                    className="w-full p-3 text-left hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors"
                  >
                    <p className="font-bold text-slate-800">{patient.name}</p>
                    <p className="text-xs text-slate-500">{patient.uniqueId} • {patient.phone}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {currentPatient && (
            <div className="bg-primary-50 p-6 rounded-2xl border border-primary-100 animate-in slide-in-from-left">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  {currentPatient.name[0]}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{currentPatient.name}</h4>
                  <p className="text-xs text-primary-700 font-medium">{currentPatient.uniqueId}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">उमेर/लिङ्ग:</span>
                  <span className="font-medium">{currentPatient.age} / {currentPatient.gender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ठेगाना:</span>
                  <span className="font-medium">{currentPatient.address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">फोन:</span>
                  <span className="font-medium">{currentPatient.phone}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Admission Form & History */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-100 p-2 gap-2 bg-slate-50/50">
              <button 
                onClick={() => setActiveTab('admission')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'admission' ? 'bg-white text-primary-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:bg-white/50'}`}
              >
                <Plus size={16} /> भर्ना / उपचार (Admission)
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'history' ? 'bg-white text-primary-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:bg-white/50'}`}
              >
                <History size={16} /> बिरामीको इतिहास (History)
              </button>
            </div>

            <div className="p-6">
              {activeTab === 'admission' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                      label="भर्ना मिति (Admission Date)" 
                      type="text" 
                      value={ipdData.admissionDate}
                      onChange={(e) => setIpdData({...ipdData, admissionDate: e.target.value})}
                    />
                    <Input 
                      label="भर्ना समय (Time)" 
                      type="time" 
                      value={ipdData.admissionTime}
                      onChange={(e) => setIpdData({...ipdData, admissionTime: e.target.value})}
                    />
                    <Input 
                      label="वार्ड (Ward)" 
                      value={ipdData.wardName}
                      onChange={(e) => setIpdData({...ipdData, wardName: e.target.value})}
                      placeholder="Ex: General Ward"
                    />
                    <Input 
                      label="बेड नम्बर (Bed No.)" 
                      value={ipdData.bedNumber}
                      onChange={(e) => setIpdData({...ipdData, bedNumber: e.target.value})}
                      placeholder="Ex: 101"
                    />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">मुख्य समस्याहरू (Chief Complaints)</label>
                      <textarea
                        value={ipdData.chiefComplaints}
                        onChange={(e) => setIpdData({...ipdData, chiefComplaints: e.target.value})}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-h-[80px]"
                        placeholder="बिरामीको मुख्य समस्याहरू..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">प्रारम्भिक निदान (Provisional Diagnosis)</label>
                      <textarea
                        value={ipdData.provisionalDiagnosis}
                        onChange={(e) => setIpdData({...ipdData, provisionalDiagnosis: e.target.value})}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-h-[60px]"
                        placeholder="निदान..."
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">अवस्था (Status)</label>
                            <select 
                                value={ipdData.status}
                                onChange={(e) => setIpdData({...ipdData, status: e.target.value as any})}
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="Admitted">Admitted (भर्ना)</option>
                                <option value="Discharged">Discharged (डिस्चार्ज)</option>
                                <option value="Referred">Referred (रिफर)</option>
                                <option value="LAMA">LAMA</option>
                                <option value="Death">Death (मृत्यु)</option>
                            </select>
                        </div>
                        {ipdData.status !== 'Admitted' && (
                            <Input 
                                label="डिस्चार्ज मिति (Discharge Date)" 
                                type="text" 
                                value={ipdData.dischargeDate || new NepaliDate().format('YYYY-MM-DD')}
                                onChange={(e) => setIpdData({...ipdData, dischargeDate: e.target.value})}
                            />
                        )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-4 pt-4 border-t">
                    <button 
                      onClick={handleSave}
                      className="px-8 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 flex items-center gap-2 shadow-lg shadow-primary-200 transition-all font-bold"
                    >
                      <Save size={20} /> {editingRecordId ? 'अपडेट गर्नुहोस्' : 'भर्ना गर्नुहोस्'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-4">
                  {patientHistory.length > 0 ? (
                    <div className="space-y-4">
                      {patientHistory.map(record => (
                        <div key={record.id} className="border border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition-all group">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-bold text-slate-800 flex items-center gap-2">
                                <Calendar size={14} className="text-primary-600" /> {record.admissionDate}
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${record.status === 'Admitted' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                                  {record.status}
                                </span>
                              </p>
                              <p className="text-xs text-slate-500 mt-1">Ward: {record.wardName} • Bed: {record.bedNumber}</p>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setIpdData(record); setEditingRecordId(record.id); setActiveTab('admission'); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><FileText size={16} /></button>
                              <button onClick={() => onDeleteRecord(record.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                            </div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Diagnosis</p>
                            <p className="text-sm text-slate-700">{record.provisionalDiagnosis}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <History size={48} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-500">कुनै इतिहास भेटिएन</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
