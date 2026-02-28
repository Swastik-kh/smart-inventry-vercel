
import React, { useState, useMemo } from 'react';
import { 
  Search, Pill, User, Calendar, Clock, CheckCircle2, 
  AlertCircle, Printer, Save, Trash2, Warehouse,
  ChevronRight, ClipboardList, Info
} from 'lucide-react';
import { 
  ServiceSeekerRecord, OPDRecord, EmergencyRecord, CBIMNCIRecord, 
  DispensaryRecord, User as AppUser, OrganizationSettings 
} from '../types/coreTypes';
import { InventoryItem, Store } from '../types/inventoryTypes';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface DispensarySewaProps {
  currentFiscalYear: string;
  currentUser: AppUser;
  generalSettings: OrganizationSettings;
  serviceSeekerRecords: ServiceSeekerRecord[];
  opdRecords: OPDRecord[];
  emergencyRecords: EmergencyRecord[];
  cbimnciRecords: CBIMNCIRecord[];
  dispensaryRecords: DispensaryRecord[];
  onSaveDispensaryRecord: (record: DispensaryRecord) => void;
  onDeleteDispensaryRecord: (id: string) => void;
  inventoryItems: InventoryItem[];
  stores: Store[];
  onUpdateInventoryItem: (item: InventoryItem) => void;
}

export const DispensarySewa: React.FC<DispensarySewaProps> = ({
  currentFiscalYear,
  currentUser,
  generalSettings,
  serviceSeekerRecords = [],
  opdRecords = [],
  emergencyRecords = [],
  cbimnciRecords = [],
  dispensaryRecords = [],
  onSaveDispensaryRecord,
  onDeleteDispensaryRecord,
  inventoryItems = [],
  stores = [],
  onUpdateInventoryItem
}) => {
  const [searchId, setSearchId] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<ServiceSeekerRecord | null>(null);
  const [selectedPrescriptions, setSelectedPrescriptions] = useState<any[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [dispenseItems, setDispenseItems] = useState<any[]>([]);

  const handleSearch = () => {
    const patient = serviceSeekerRecords.find(r => r.uniquePatientId === searchId);
    if (patient) {
      setSelectedPatient(patient);
      
      // Collect prescriptions from all sources
      const opdPres = opdRecords
        .filter(r => r.serviceSeekerId === patient.id)
        .flatMap(r => r.prescriptions.map(p => ({ ...p, source: 'OPD', date: r.visitDate })));
      
      const emergencyPres = emergencyRecords
        .filter(r => r.serviceSeekerId === patient.id)
        .flatMap(r => r.prescriptions.map(p => ({ ...p, source: 'Emergency', date: r.visitDate })));
      
      const cbimnciPres = cbimnciRecords
        .filter(r => r.serviceSeekerId === patient.id)
        .flatMap(r => r.prescriptions.map(p => ({ ...p, source: 'CBIMNCI', date: r.visitDate })));
      
      const allPres = [...opdPres, ...emergencyPres, ...cbimnciPres].sort((a, b) => b.date.localeCompare(a.date));
      setSelectedPrescriptions(allPres);
      
      // Initialize dispense items from prescriptions
      setDispenseItems(allPres.map(p => ({
        medicineName: p.medicineName,
        quantity: p.quantity,
        dosage: p.dosage,
        instructions: p.instructions || '',
        dispensed: false
      })));
    } else {
      alert('बिरामी फेला परेन।');
      setSelectedPatient(null);
      setSelectedPrescriptions([]);
      setDispenseItems([]);
    }
  };

  const handleDispense = async () => {
    if (!selectedPatient || !selectedStoreId) {
      alert('कृपया बिरामी र गोदाम छान्नुहोस्।');
      return;
    }

    const itemsToDispense = dispenseItems.filter(item => item.dispensed);
    if (itemsToDispense.length === 0) {
      alert('कृपया डिस्पेंस गर्नको लागि कम्तिमा एउटा औषधि छान्नुहोस्।');
      return;
    }

    // Check stock for each item
    for (const item of itemsToDispense) {
      const stock = inventoryItems
        .filter(i => i.itemName.toLowerCase() === item.medicineName.toLowerCase() && i.storeId === selectedStoreId)
        .reduce((acc, i) => acc + i.currentQuantity, 0);
      
      if (stock < item.quantity) {
        alert(`${item.medicineName} को पर्याप्त मौज्दात छैन। (मौज्दात: ${stock})`);
        return;
      }
    }

    const newRecord: DispensaryRecord = {
      id: `DISP-${Date.now()}`,
      fiscalYear: currentFiscalYear,
      serviceSeekerId: selectedPatient.id,
      uniquePatientId: selectedPatient.uniquePatientId,
      patientName: selectedPatient.fullName,
      dispenseDate: new NepaliDate().format('YYYY-MM-DD'),
      storeId: selectedStoreId,
      items: itemsToDispense.map(i => ({
        medicineName: i.medicineName,
        quantity: i.quantity,
        dosage: i.dosage,
        instructions: i.instructions
      })),
      remarks,
      createdBy: currentUser.fullName
    };

    // Update Inventory
    itemsToDispense.forEach(dispItem => {
      let remainingToDeduct = dispItem.quantity;
      const relevantStock = inventoryItems
        .filter(i => i.itemName.toLowerCase() === dispItem.medicineName.toLowerCase() && i.storeId === selectedStoreId)
        .sort((a, b) => {
          if (!a.expiryDateAd) return 1;
          if (!b.expiryDateAd) return -1;
          return a.expiryDateAd.localeCompare(b.expiryDateAd);
        });

      for (const stockItem of relevantStock) {
        if (remainingToDeduct <= 0) break;
        const deduct = Math.min(stockItem.currentQuantity, remainingToDeduct);
        onUpdateInventoryItem({
          ...stockItem,
          currentQuantity: stockItem.currentQuantity - deduct,
          lastUpdateDateBs: new NepaliDate().format('YYYY-MM-DD'),
          lastUpdateDateAd: new Date().toISOString().split('T')[0]
        });
        remainingToDeduct -= deduct;
      }
    });

    onSaveDispensaryRecord(newRecord);
    alert('औषधि सफलतापूर्वक डिस्पेंस गरियो।');
    
    // Reset
    setSearchId('');
    setSelectedPatient(null);
    setSelectedPrescriptions([]);
    setDispenseItems([]);
    setRemarks('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-primary-100 p-3 rounded-xl text-primary-600">
            <Pill size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 font-nepali">डिस्पेन्सरी सेवा (Dispensary Service)</h2>
            <p className="text-sm text-slate-500">औषधि वितरण र रेकर्ड व्यवस्थापन</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Search & Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Search size={18} className="text-primary-600" /> बिरामी खोज्नुहोस्
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Patient ID (e.g. P-123)"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
              >
                खोज्नुहोस्
              </button>
            </div>
          </div>

          {selectedPatient && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-in slide-in-from-left-4">
              <h3 className="font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
                <User size={18} className="text-primary-600" /> बिरामीको विवरण
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">नाम:</span>
                  <span className="font-bold">{selectedPatient.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ID:</span>
                  <span className="font-mono">{selectedPatient.uniquePatientId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">उमेर/लिङ्ग:</span>
                  <span>{selectedPatient.ageYears}Y {selectedPatient.ageMonths}M / {selectedPatient.gender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ठेगाना:</span>
                  <span>{selectedPatient.address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">सम्पर्क:</span>
                  <span>{selectedPatient.phoneNumber}</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Warehouse size={18} className="text-primary-600" /> गोदाम छान्नुहोस्
            </h3>
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            >
              <option value="">गोदाम छान्नुहोस्</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Prescription & Dispensing */}
        <div className="lg:col-span-2 space-y-6">
          {selectedPatient ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <ClipboardList size={18} className="text-primary-600" /> प्रेस्क्रिप्शन विवरण (Prescriptions)
                </h3>
                <span className="text-xs bg-slate-100 px-3 py-1 rounded-full text-slate-500 font-bold">
                  कुल: {selectedPrescriptions.length}
                </span>
              </div>

              {selectedPrescriptions.length > 0 ? (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-600 font-bold">
                        <tr>
                          <th className="p-3">औषधि</th>
                          <th className="p-3">मात्रा</th>
                          <th className="p-3">डोज</th>
                          <th className="p-3">स्रोत/मिति</th>
                          <th className="p-3 text-center">डिस्पेंस?</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {dispenseItems.map((item, idx) => {
                          const stock = selectedStoreId ? inventoryItems
                            .filter(i => i.itemName.toLowerCase() === item.medicineName.toLowerCase() && i.storeId === selectedStoreId)
                            .reduce((acc, i) => acc + i.currentQuantity, 0) : 0;
                          
                          return (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-3">
                                <div className="font-bold">{item.medicineName}</div>
                                {selectedStoreId && (
                                  <div className={`text-[10px] font-bold ${stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    मौज्दात: {stock}
                                  </div>
                                )}
                              </td>
                              <td className="p-3">{item.quantity}</td>
                              <td className="p-3">{item.dosage}</td>
                              <td className="p-3">
                                <div className="text-xs font-bold text-primary-600">{selectedPrescriptions[idx].source}</div>
                                <div className="text-[10px] text-slate-400">{selectedPrescriptions[idx].date}</div>
                              </td>
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={item.dispensed}
                                  onChange={(e) => {
                                    const newItems = [...dispenseItems];
                                    newItems[idx].dispensed = e.target.checked;
                                    setDispenseItems(newItems);
                                  }}
                                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">कैफियत (Remarks)</label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm h-20"
                      placeholder="केहि थप जानकारी भए यहाँ लेख्नुहोस्..."
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleDispense}
                      className="flex items-center gap-2 px-8 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all active:scale-95"
                    >
                      <Save size={20} /> औषधि डिस्पेंस गर्नुहोस्
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <Info size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 italic">यो बिरामीको लागि कुनै प्रेस्क्रिप्शन फेला परेन।</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
              <div className="bg-slate-100 p-6 rounded-full text-slate-300">
                <Search size={48} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">बिरामी खोज्नुहोस्</h3>
                <p className="text-slate-500 max-w-xs">औषधि वितरण सुरु गर्नको लागि बायाँ तर्फ बिरामीको ID राखेर खोज्नुहोस्।</p>
              </div>
            </div>
          )}

          {/* Recent Dispensing History */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Clock size={18} className="text-primary-600" /> हालसालै वितरण गरिएको रेकर्ड
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold">
                  <tr>
                    <th className="p-3">मिति</th>
                    <th className="p-3">बिरामी</th>
                    <th className="p-3">औषधिहरू</th>
                    <th className="p-3">वितरण गर्ने</th>
                    <th className="p-3 text-right">कार्य</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {dispensaryRecords
                    .filter(r => r.fiscalYear === currentFiscalYear)
                    .sort((a, b) => b.dispenseDate.localeCompare(a.dispenseDate))
                    .slice(0, 5)
                    .map(r => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="p-3">{r.dispenseDate}</td>
                        <td className="p-3">
                          <div className="font-bold">{r.patientName}</div>
                          <div className="text-[10px] text-slate-400">{r.uniquePatientId}</div>
                        </td>
                        <td className="p-3">
                          {r.items.map((i, idx) => (
                            <div key={idx} className="bg-slate-100 px-2 py-0.5 rounded inline-block mr-1 mb-1">
                              {i.medicineName} ({i.quantity})
                            </div>
                          ))}
                        </td>
                        <td className="p-3">{r.createdBy}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => onDeleteDispensaryRecord(r.id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  {dispensaryRecords.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 italic">कुनै रेकर्ड फेला परेन।</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
