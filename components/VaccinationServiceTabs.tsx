
import React, { useState } from 'react';
import { Baby, Droplets, Stethoscope } from 'lucide-react';
import { GarbhawatiPatient, ChildImmunizationRecord } from '../types';
import { GarbhawatiTDRegistration } from './GarbhawatiTDRegistration'; // NEW IMPORT
import { ChildImmunizationRegistration } from './ChildImmunizationRegistration';

interface VaccinationServiceTabsProps {
  currentFiscalYear: string;

  garbhawatiPatients: GarbhawatiPatient[];
  onAddGarbhawatiPatient: (patient: GarbhawatiPatient) => void;
  onUpdateGarbhawatiPatient: (patient: GarbhawatiPatient) => void;
  onDeleteGarbhawatiPatient: (patientId: string) => void;

  bachhaImmunizationRecords: ChildImmunizationRecord[];
  onAddBachhaImmunizationRecord: (record: ChildImmunizationRecord) => void;
  onUpdateBachhaImmunizationRecord: (record: ChildImmunizationRecord) => void;
  onDeleteBachhaImmunizationRecord: (recordId: string) => void;
}

export const VaccinationServiceTabs: React.FC<VaccinationServiceTabsProps> = ({
  currentFiscalYear,
  garbhawatiPatients,
  onAddGarbhawatiPatient,
  onUpdateGarbhawatiPatient,
  onDeleteGarbhawatiPatient,
  bachhaImmunizationRecords,
  onAddBachhaImmunizationRecord,
  onUpdateBachhaImmunizationRecord,
  onDeleteBachhaImmunizationRecord,
}) => {
  const [activeTab, setActiveTab] = useState<'child' | 'maternal'>('child');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Header and Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary-100 p-2 rounded-lg text-primary-600">
            <Stethoscope size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 font-nepali">खोप सेवा (Vaccination Service)</h2>
            <p className="text-sm text-slate-500">गर्भवती महिला र बच्चाहरूको खोप कार्यक्रम ट्र्याकिङ</p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
          <button
            onClick={() => setActiveTab('child')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'child' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Baby size={18} />
            बच्चाको खोप (Child)
          </button>
          <button
            onClick={() => setActiveTab('maternal')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'maternal' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Droplets size={18} />
            आमाको खोप (Maternal)
          </button>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'child' ? (
        <ChildImmunizationRegistration
          currentFiscalYear={currentFiscalYear}
          records={bachhaImmunizationRecords}
          onAddRecord={onAddBachhaImmunizationRecord}
          onUpdateRecord={onUpdateBachhaImmunizationRecord}
          onDeleteRecord={onDeleteBachhaImmunizationRecord}
        />
      ) : (
        <GarbhawatiTDRegistration
          currentFiscalYear={currentFiscalYear}
          patients={garbhawatiPatients}
          onAddPatient={onAddGarbhawatiPatient}
          onUpdatePatient={onUpdateGarbhawatiPatient}
          onDeletePatient={onDeleteGarbhawatiPatient}
        />
      )}
    </div>
  );
};