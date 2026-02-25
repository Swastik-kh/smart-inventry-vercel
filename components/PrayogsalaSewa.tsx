import React, { useState, useRef, useMemo } from 'react';
import { Search, FileText, User, Activity, Save, Printer, History, FlaskConical, Trash2 } from 'lucide-react';
import { ServiceSeekerRecord, BillingRecord, ServiceItem, LabReport, LabTestResult } from '../types/coreTypes';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';
import { useReactToPrint } from 'react-to-print';

interface PrayogsalaSewaProps {
  serviceSeekerRecords: ServiceSeekerRecord[];
  billingRecords: BillingRecord[];
  serviceItems: ServiceItem[];
  labReports: LabReport[];
  onSaveRecord: (record: LabReport) => void;
  onDeleteRecord: (id: string) => void;
  currentFiscalYear: string;
  currentUser: any;
}

export const PrayogsalaSewa: React.FC<PrayogsalaSewaProps> = ({
  serviceSeekerRecords,
  billingRecords,
  serviceItems,
  labReports,
  onSaveRecord,
  onDeleteRecord,
  currentFiscalYear,
  currentUser
}) => {
  const [searchId, setSearchId] = useState('');
  const [currentPatient, setCurrentPatient] = useState<ServiceSeekerRecord | null>(null);
  const [pendingTests, setPendingTests] = useState<LabTestResult[]>([]);
  const [currentReport, setCurrentReport] = useState<LabReport | null>(null);
  
  const printRef = useRef<HTMLDivElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchId.trim().toLowerCase();
    if (!query) return;

    let patient = serviceSeekerRecords.find(r => r.uniquePatientId.toLowerCase() === query);
    
    if (!patient) {
       patient = serviceSeekerRecords.find(r => r.uniquePatientId.replace(/[^0-9]/g, '') === query);
    }

    if (!patient) {
        patient = serviceSeekerRecords.find(r => r.registrationNumber === query && r.fiscalYear === currentFiscalYear);
    }

    if (patient) {
      setCurrentPatient(patient);
      loadPendingTests(patient.id);
      setCurrentReport(null);
    } else {
      alert('बिरामी भेटिएन (Patient not found)');
      setCurrentPatient(null);
      setPendingTests([]);
    }
  };

  const loadPendingTests = (patientId: string) => {
    // 1. Get all bills for this patient
    const patientBills = billingRecords.filter(b => b.serviceSeekerId === patientId);
    
    // 2. Extract all items from bills
    const allBilledItems = patientBills.flatMap(b => b.items);

    // 3. Filter items that are Lab Investigations
    // We match by serviceName against serviceItems where category is 'Lab Investigation'
    const labServiceNames = new Set(
      serviceItems
        .filter(s => s.category === 'Lab Investigation')
        .map(s => s.serviceName)
    );

    const labItems = allBilledItems.filter(item => 
      labServiceNames.has(item.serviceName) || 
      // Fallback: check if serviceName contains 'test' or 'lab' if not found in settings (optional, maybe risky)
      // For now, strictly rely on Service Settings or if user manually added something that matches.
      // Actually, let's also include items if we can find them in serviceItems and they are Lab.
      serviceItems.some(s => s.serviceName === item.serviceName && s.category === 'Lab Investigation')
    );

    // 4. Prepare initial result objects
    // We might want to filter out tests that are already reported? 
    // For simplicity, let's list them all, and user can choose which to report.
    // Or better: Show them as "Available for Reporting".
    
    const tests: LabTestResult[] = labItems.map((item, index) => {
      const serviceDef = serviceItems.find(s => s.serviceName === item.serviceName);
      return {
        id: `TEST-${Date.now()}-${index}`,
        testName: item.serviceName,
        result: '',
        normalRange: serviceDef?.valueRange || '',
        unit: '', // We don't have unit in ServiceItem yet, maybe add later?
        remarks: ''
      };
    });

    // Remove duplicates if multiple bills have same test? 
    // Maybe user wants to report multiple times? 
    // Let's keep them unique by name for now to avoid clutter, or just list distinct tests.
    // If a patient did CBC twice, they might want two reports. 
    // But usually we report on the latest or specific bill.
    // For now, let's just show unique test names found in bills.
    
    const uniqueTests = Array.from(new Map(tests.map(t => [t.testName, t])).values());
    setPendingTests(uniqueTests);
  };

  const handleResultChange = (id: string, field: keyof LabTestResult, value: string) => {
    setPendingTests(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleSaveReport = () => {
    if (!currentPatient) return;

    // Filter out tests with empty results (optional, or allow saving partial)
    const testsToSave = pendingTests.filter(t => t.result.trim() !== '');

    if (testsToSave.length === 0) {
      alert("कृपया कम्तिमा एउटा टेस्टको नतिजा भर्नुहोस् (Please enter at least one result)");
      return;
    }

    const newReport: LabReport = {
      id: Date.now().toString(),
      fiscalYear: currentFiscalYear,
      reportDate: new NepaliDate().format('YYYY-MM-DD'),
      serviceSeekerId: currentPatient.id,
      patientName: currentPatient.name,
      age: currentPatient.age,
      gender: currentPatient.gender,
      tests: testsToSave,
      status: 'Completed',
      createdBy: currentUser?.username || 'Unknown'
    };

    onSaveRecord(newReport);
    setCurrentReport(newReport);
    alert('रिपोर्ट सुरक्षित गरियो।');
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `LabReport-${currentReport?.id || 'New'}`,
  });

  const patientReports = useMemo(() => {
    if (!currentPatient) return [];
    return labReports.filter(r => r.serviceSeekerId === currentPatient.id).sort((a, b) => b.id.localeCompare(a.id));
  }, [labReports, currentPatient]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Search Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 font-nepali mb-4 flex items-center gap-2">
          <FlaskConical className="text-primary-600" />
          प्रयोगशाला सेवा (Lab Service)
        </h2>
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="बिरामी ID (PID-XXXXXX) वा दर्ता नं. राख्नुहोस्"
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
          </div>
          <button type="submit" className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium shadow-sm">
            खोज्नुहोस्
          </button>
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

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm mb-4 border-b pb-2 flex items-center gap-2">
                <History size={16} className="text-green-600" />
                पुराना रिपोर्टहरू (History)
              </h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {patientReports.length > 0 ? (
                  patientReports.map(report => (
                    <div key={report.id} className="flex justify-between items-center p-2 hover:bg-slate-50 border-b border-slate-100 text-sm">
                      <div>
                         <p className="font-medium">{report.reportDate}</p>
                         <p className="text-xs text-slate-500">{report.tests.length} Tests</p>
                      </div>
                      <div className="text-right space-x-2">
                        <button 
                          onClick={() => { setCurrentReport(report); setTimeout(handlePrint, 100); }}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Print
                        </button>
                        <button 
                          onClick={() => {
                             if(confirm('Are you sure you want to delete this report?')) {
                               onDeleteRecord(report.id);
                             }
                          }}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                   <p className="text-slate-400 text-sm italic text-center">कुनै रिपोर्ट भेटिएन</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Lab Report Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 text-lg mb-6 border-b pb-4 flex items-center gap-2">
                <Activity size={20} className="text-blue-600" />
                नयाँ रिपोर्ट (New Report)
              </h3>

              {pendingTests.length > 0 ? (
                <div className="space-y-6">
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-100 text-slate-700 font-bold">
                        <tr>
                          <th className="p-3 w-1/4">Test Name</th>
                          <th className="p-3 w-1/4">Result</th>
                          <th className="p-3 w-1/6">Unit</th>
                          <th className="p-3 w-1/6">Normal Range</th>
                          <th className="p-3 w-1/6">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pendingTests.map((test) => (
                          <tr key={test.id} className="hover:bg-slate-50">
                            <td className="p-3 font-medium">{test.testName}</td>
                            <td className="p-3">
                              <input 
                                type="text" 
                                value={test.result}
                                onChange={(e) => handleResultChange(test.id, 'result', e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Result"
                              />
                            </td>
                            <td className="p-3">
                              <input 
                                type="text" 
                                value={test.unit}
                                onChange={(e) => handleResultChange(test.id, 'unit', e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Unit"
                              />
                            </td>
                            <td className="p-3 text-slate-500 text-xs">
                              {test.normalRange}
                            </td>
                            <td className="p-3">
                              <input 
                                type="text" 
                                value={test.remarks}
                                onChange={(e) => handleResultChange(test.id, 'remarks', e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Remarks"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end">
                    <button 
                      onClick={handleSaveReport}
                      className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-bold shadow-sm flex items-center gap-2"
                    >
                      <Save size={20} /> Save Report
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                  <Activity className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                  <p className="text-slate-500">यो बिरामीको लागि कुनै ल्याब बिल भेटिएन।</p>
                  <p className="text-xs text-slate-400 mt-1">कृपया पहिला सेवा बिलिङ (Service Billing) मा ल्याब टेस्टको बिल काट्नुहोस्।</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Template */}
      <div style={{ display: "none" }}>
        <div ref={printRef} className="p-8 bg-white text-slate-900 print:block font-sans">
          {/* Header */}
          <div className="text-center mb-6 border-b-2 border-slate-800 pb-4">
            <h1 className="text-2xl font-bold uppercase">{currentUser?.organizationName || 'Health Institution'}</h1>
            <p className="text-sm text-slate-600">{currentUser?.address || 'Address'}</p>
            <h2 className="text-lg font-bold mt-2 border-2 border-slate-800 inline-block px-4 py-1 rounded">LABORATORY REPORT</h2>
          </div>

          {/* Patient Info */}
          <div className="flex justify-between mb-6 text-sm border-b border-slate-200 pb-4">
            <div className="space-y-1">
              <p><strong>Patient Name:</strong> {currentReport?.patientName}</p>
              <p><strong>Age/Gender:</strong> {currentReport?.age} / {currentReport?.gender}</p>
              <p><strong>Patient ID:</strong> {currentPatient?.uniquePatientId}</p>
            </div>
            <div className="space-y-1 text-right">
              <p><strong>Report Date:</strong> {currentReport?.reportDate}</p>
              <p><strong>Report ID:</strong> {currentReport?.id}</p>
            </div>
          </div>

          {/* Results Table */}
          <table className="w-full mb-6 text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-800 bg-slate-50">
                <th className="py-2 px-4 text-left">Test Name</th>
                <th className="py-2 px-4 text-left">Result</th>
                <th className="py-2 px-4 text-left">Unit</th>
                <th className="py-2 px-4 text-left">Reference Range</th>
                <th className="py-2 px-4 text-left">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {currentReport?.tests.map((test, idx) => (
                <tr key={idx} className="border-b border-slate-200">
                  <td className="py-2 px-4 font-medium">{test.testName}</td>
                  <td className="py-2 px-4 font-bold">{test.result}</td>
                  <td className="py-2 px-4 text-slate-600">{test.unit}</td>
                  <td className="py-2 px-4 text-slate-600">{test.normalRange}</td>
                  <td className="py-2 px-4 text-slate-600 italic">{test.remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div className="mt-12 pt-4 border-t border-slate-300 flex justify-between text-xs text-slate-500">
            <div>
              <p>Prepared By: {currentReport?.createdBy}</p>
              <p>Printed On: {new Date().toLocaleString()}</p>
            </div>
            <div className="text-right">
              <div className="h-8 border-b border-slate-300 w-32 mb-1"></div>
              <p>Lab Technician / Pathologist</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
