
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Save, RotateCcw, Baby, Calendar, FileDigit, User, Phone, MapPin, Plus, Edit, Trash2, Search, X, UsersRound, Weight, Droplets, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { Input } from './Input';
import { Select } from './Select';
import { NepaliDatePicker } from './NepaliDatePicker';
import { EnglishDatePicker } from './EnglishDatePicker';
import { Option, ChildImmunizationRecord, ChildImmunizationVaccine } from '../types';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface ChildImmunizationRegistrationProps {
  currentFiscalYear: string;
  records: ChildImmunizationRecord[];
  onAddRecord: (record: ChildImmunizationRecord) => void;
  onUpdateRecord: (record: ChildImmunizationRecord) => void;
  onDeleteRecord: (recordId: string) => void;
}

const genderOptions: Option[] = [
  { id: 'male', value: 'Male', label: 'पुरुष (Male)' },
  { id: 'female', value: 'Female', label: 'महिला (Female)' },
  { id: 'other', value: 'Other', label: 'अन्य (Other)' },
];

// Standard National Immunization Schedule
// Dates are relative to DOB (days)
const NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE = [
    { name: 'BCG (जन्ममा)', relativeDays: 0 },
    { name: 'DPT-HepB-Hib-1 (६ हप्ता)', relativeDays: 42 },
    { name: 'OPV-1 (६ हप्ता)', relativeDays: 42 },
    { name: 'PCV-1 (६ हप्ता)', relativeDays: 42 },
    { name: 'Rota-1 (६ हप्ता)', relativeDays: 42 },
    { name: 'DPT-HepB-Hib-2 (१० हप्ता)', relativeDays: 70 },
    { name: 'OPV-2 (१० हप्ता)', relativeDays: 70 },
    { name: 'Rota-2 (१० हप्ता)', relativeDays: 70 },
    { name: 'DPT-HepB-Hib-3 (१४ हप्ता)', relativeDays: 98 },
    { name: 'OPV-3 (१४ हप्ता)', relativeDays: 98 },
    // Fix: Corrected PCV-2 relative days as per national schedule (10 weeks)
    { name: 'PCV-2 (१० हप्ता)', relativeDays: 70 }, 
    { name: 'FIPV (१४ हप्ता)', relativeDays: 98 },
    { name: 'MR-1 (९ महिना)', relativeDays: 270 },
    { name: 'JE (९ महिना)', relativeDays: 270 }, // Japanese Encephalitis
    { name: 'PCV-3 (९ महिना)', relativeDays: 270 }, // Assuming 3rd PCV dose is at 9 months from the image's structure
    { name: 'MR-2 (१५ महिना)', relativeDays: 450 },
    { name: 'Typhoid (१५ महिना)', relativeDays: 450 }, // ADDED: Typhoid as per image
    { name: 'HPV (१० वर्ष - किशोरी)', relativeDays: 3650 }, // ADDED: HPV for 10-year-old girls, placeholder date for auto-scheduling
];

// Define constants for date range handling outside the component for clarity.
const DOB_BS_YEAR_UPPER_BOUND = 2090; // NepaliDate library's effective upper limit for BS year
// AD year where we switch to an approximate BS calculation because the library might fail or be at its limit.
// 2035 AD is approx 2091-2092 BS, which is beyond the 2090 BS limit.
const AD_YEAR_FOR_APPROX_BS_CALC = 2035; 

// Helper function to safely calculate scheduled dates, handling NepaliDate range limitations.
const calculateImmunizationDate = (
    dobBs: string,
    relativeDays: number
): { bs: string; ad: string; } => {
    // Variable to hold the scheduled AD date string, for consistent return in catch blocks
    let scheduledAdDateString = "Error Calculating AD Date";

    try {
        // 1. Validate dobBs format and convert to AD date
        let dobNepaliDate: NepaliDate;
        try {
            dobNepaliDate = new NepaliDate(dobBs);
            // Additional check for DOB itself if it's already beyond the reasonable limit
            if (dobNepaliDate.getYear() > DOB_BS_YEAR_UPPER_BOUND || isNaN(dobNepaliDate.toJsDate().getTime())) {
                return { bs: `Invalid DOB (BS > ${DOB_BS_YEAR_UPPER_BOUND})`, ad: "Invalid DOB" };
            }
        } catch (e) {
            console.error(`Invalid DOB BS string: ${dobBs}`, e);
            return { bs: "Invalid DOB Format", ad: "Invalid DOB" };
        }
        
        const dobAdDate = dobNepaliDate.toJsDate(); // Convert valid Nepali DOB to AD Date object

        // 2. Calculate scheduled AD date by adding relativeDays
        const scheduledAdDate = new Date(dobAdDate);
        scheduledAdDate.setDate(dobAdDate.getDate() + relativeDays);
        scheduledAdDateString = scheduledAdDate.toISOString().split('T')[0]; // Update for consistent return

        // 3. NEW LOGIC: If calculated AD year is beyond the known safe conversion limit for NepaliDate (e.g., 2035 AD ~ 2091/92 BS),
        // perform a manual, approximate BS year calculation for display to avoid library crashes.
        if (scheduledAdDate.getFullYear() >= AD_YEAR_FOR_APPROX_BS_CALC) {
            // Approximate BS year: AD Year + 56 years. This is a common approximation.
            // (1943 AD is approx 2000 BS, so difference is 57. Using 56 for simplicity as it aligns with user's context of 2092+ from 2035 AD)
            const approxBsYear = scheduledAdDate.getFullYear() + 56; 
            // The user requested "2092-XX-XX". We provide year and placeholder for month/day.
            return { 
                bs: `${approxBsYear}-XX-XX (Approx. Limit+)`, // Manual approximation string
                ad: scheduledAdDateString 
            };
        }

        // 4. Attempt to convert the scheduled AD date back to NepaliDate (only if within safe AD range for library)
        let scheduledNepaliDate: NepaliDate;
        try {
            scheduledNepaliDate = new NepaliDate(scheduledAdDate);
        } catch (e) {
            // This catches errors where `scheduledAdDate` might be technically within the AD_YEAR_FOR_APPROX_BS_CALC
            // but still causes `nepali-date-converter` to fail due to its internal exact date range.
            console.warn(`Error converting AD date ${scheduledAdDateString} to BS date:`, e);
            return { bs: "Error Calculating BS Date", ad: scheduledAdDateString };
        }

        // 5. Final check on the calculated Nepali Year (if conversion was successful but resulted in a BS year beyond desired range)
        if (scheduledNepaliDate.getYear() > DOB_BS_YEAR_UPPER_BOUND) {
            const year = scheduledNepaliDate.getYear();
            const month = String(scheduledNepaliDate.getMonth() + 1).padStart(2, '0'); // getMonth() is 0-indexed
            const day = String(scheduledNepaliDate.getDate()).padStart(2, '0');
            return { 
                bs: `${year}-${month}-${day} (Limit+)`, // Manually constructed string using safe getters
                ad: scheduledAdDateString 
            };
        }
        
        // 6. If all checks pass and within range, format normally using the library
        return {
            bs: scheduledNepaliDate.format('YYYY-MM-DD'),
            ad: scheduledAdDateString,
        };

    } catch (e) {
        // Catch any unexpected errors during the process
        console.error(`Unexpected error in calculateImmunizationDate for DOB ${dobBs} + ${relativeDays} days:`, e);
        // Ensure scheduledAdDateString is defined for this catch block
        return { bs: "Error Calculating", ad: scheduledAdDateString };
    }
};

export const ChildImmunizationRegistration: React.FC<ChildImmunizationRegistrationProps> = ({
  currentFiscalYear,
  records,
  onAddRecord,
  onUpdateRecord,
  onDeleteRecord
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedVaccineForUpdate, setSelectedVaccineForUpdate] = useState<{ record: ChildImmunizationRecord; vaccineIndex: number; } | null>(null);
  const [modalGivenDateBs, setModalGivenDateBs] = useState('');

  const getTodayAd = () => new Date().toISOString().split('T')[0];
  const getTodayBs = () => {
    try {
      return new NepaliDate().format('YYYY-MM-DD');
    } catch (e) {
      return '';
    }
  };

  const generateRegNo = (fy: string, recordsList: ChildImmunizationRecord[]) => {
    const fyClean = fy.replace('/', '');
    const maxNum = recordsList
      .filter(p => p.fiscalYear === fy && p.regNo.startsWith(`CIP-${fyClean}-`))
      .map(p => parseInt(p.regNo.split('-')[2]))
      .reduce((max, num) => Math.max(max, num), 0);
    return `CIP-${fyClean}-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const [formData, setFormData] = useState<ChildImmunizationRecord>({
    id: '',
    fiscalYear: currentFiscalYear,
    regNo: generateRegNo(currentFiscalYear, records),
    childName: '',
    gender: 'Male',
    dobBs: getTodayBs(),
    dobAd: getTodayAd(),
    motherName: '',
    fatherName: '',
    address: '',
    phone: '',
    birthWeightKg: undefined,
    vaccines: [],
    remarks: '',
  });

  useEffect(() => {
    if (!editingRecordId) {
        setFormData(prev => ({
            ...prev,
            fiscalYear: currentFiscalYear,
            regNo: generateRegNo(currentFiscalYear, records),
            dobBs: getTodayBs(),
            dobAd: getTodayAd(),
            vaccines: [], // Reset vaccines for new entry
        }));
    }
  }, [currentFiscalYear, records, editingRecordId]);

  // Recalculate vaccine schedule when DOB changes or when a new record is created
  useEffect(() => {
    if (formData.dobBs && !editingRecordId) {
        try {
            // Validate formData.dobBs itself before proceeding.
            try {
                new NepaliDate(formData.dobBs);
            } catch (e) {
                console.error("Invalid formData.dobBs:", formData.dobBs, e);
                setFormData(prev => ({ ...prev, vaccines: [] }));
                setValidationError("Invalid Date of Birth. Please enter a valid Nepali date.");
                return;
            }

            const newSchedule: ChildImmunizationVaccine[] = NATIONAL_IMMUNIZATION_SCHEDULE_TEMPLATE.map(vaccine => {
                const { bs: scheduledDateBs, ad: scheduledDateAdString } = calculateImmunizationDate( // USING THE RENAMED HELPER
                    formData.dobBs,
                    vaccine.relativeDays
                );

                return {
                    name: vaccine.name,
                    scheduledDateAd: scheduledDateAdString,
                    scheduledDateBs: scheduledDateBs,
                    givenDateAd: null, // Initialize as null to prevent undefined
                    givenDateBs: null, // Initialize as null to prevent undefined
                    status: 'Pending',
                } as ChildImmunizationVaccine;
            });
            setFormData(prev => ({ ...prev, vaccines: newSchedule }));
        } catch (e) {
            // This outer catch now primarily handles unexpected issues in the map function itself,
            // or if `formData.dobBs` causes a problem before `calculateImmunizationDate` is called (e.g. if `formData.dobBs` is malformed and not caught by the inner `try-catch`).
            console.error("Error generating immunization schedule for DOB:", formData.dobBs, e);
            setFormData(prev => ({ ...prev, vaccines: [] }));
            setValidationError("Error calculating schedule for this DOB. Please check the date or contact support.");
        }
    }
  }, [formData.dobBs, editingRecordId]);

  const handleDOBBsChange = (dateBs: string) => {
    let dateAd = '';
    if (dateBs) {
      try {
        const nd = new NepaliDate(dateBs);
        dateAd = nd.toJsDate().toISOString().split('T')[0];
      } catch (e) {
        console.error("Invalid BS date for DOB conversion:", e);
      }
    }
    setFormData(prev => ({ ...prev, dobBs: dateBs, dobAd: dateAd }));
  };

  const validateForm = () => {
    setValidationError(null);
    if (!formData.childName.trim()) return "बच्चाको नाम आवश्यक छ।";
    if (!formData.dobBs.trim()) return "जन्म मिति आवश्यक छ।";
    if (!formData.motherName.trim()) return "आमाको नाम आवश्यक छ।";
    if (!formData.fatherName.trim()) return "बुबाको नाम आवश्यक छ।";
    if (!formData.address.trim()) return "ठेगाना आवश्यक छ।";
    if (!formData.phone.trim()) return "फोन नम्बर आवश्यक छ।";
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateForm();
    if (error) {
      setValidationError(error);
      return;
    }

    setValidationError(null);

    // Sanitize vaccine data before saving
    const sanitizedVaccines = formData.vaccines.map(v => ({
      ...v,
      givenDateAd: v.givenDateAd || null, // Convert undefined to null
      givenDateBs: v.givenDateBs || null, // Convert undefined to null
      status: v.status || 'Pending' // Ensure status is never undefined
    }));

    const recordToSave: ChildImmunizationRecord = {
      ...formData,
      id: editingRecordId || Date.now().toString(),
      fiscalYear: currentFiscalYear,
      vaccines: sanitizedVaccines, // Use sanitized vaccines
    };

    if (editingRecordId) {
      onUpdateRecord(recordToSave);
      setSuccessMessage('बच्चाको खोप रेकर्ड सफलतापूर्वक अपडेट भयो!');
    } else {
      onAddRecord(recordToSave);
      setSuccessMessage('बच्चाको खोप रेकर्ड सफलतापूर्वक दर्ता भयो!');
    }
    handleReset();
  };

  const handleEditRecord = (record: ChildImmunizationRecord) => {
    setEditingRecordId(record.id);
    setFormData({ ...record });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteRecord = (recordId: string, childName: string) => {
    if (window.confirm(`के तपाईं निश्चित हुनुहुन्छ कि तपाईं ${childName} को खोप रेकर्ड हटाउन चाहनुहुन्छ? यो कार्य पूर्ववत गर्न सकिँदैन।`)) {
      onDeleteRecord(recordId);
      setSuccessMessage(`${childName} को खोप रेकर्ड सफलतापूर्वक हटाइयो।`);
    }
  };

  const handleReset = () => {
    setEditingRecordId(null);
    setFormData(prev => ({
      ...prev,
      id: '',
      regNo: generateRegNo(currentFiscalYear, records),
      childName: '',
      gender: 'Male',
      dobBs: getTodayBs(),
      dobAd: getTodayAd(),
      motherName: '',
      fatherName: '',
      address: '',
      phone: '',
      birthWeightKg: undefined,
      vaccines: [],
      remarks: '',
    }));
    setValidationError(null);
    setSuccessMessage(null);
  };

  // Fix: Defined handleUpdateDoseStatus function
  const handleUpdateDoseStatus = () => {
    if (!selectedVaccineForUpdate) return;
    const { record, vaccineIndex } = selectedVaccineForUpdate;
    const currentVaccine = record.vaccines[vaccineIndex];

    if (!modalGivenDateBs.trim()) {
        alert("कृपया खोप दिएको मिति भर्नुहोस्।");
        return;
    }
    
    let givenDateAd = '';
    try {
        const nd = new NepaliDate(modalGivenDateBs);
        givenDateAd = nd.toJsDate().toISOString().split('T')[0];
    } catch (e) {
        alert("अमान्य मिति ढाँचा।");
        return;
    }

    const updatedVaccines = [...record.vaccines];
    updatedVaccines[vaccineIndex] = {
      ...currentVaccine,
      givenDateBs: modalGivenDateBs,
      givenDateAd: givenDateAd,
      status: 'Given',
    };

    onUpdateRecord({ ...record, vaccines: updatedVaccines });
    setSuccessMessage(`${currentVaccine.name} खोपको स्थिति सफलतापूर्वक अपडेट भयो!`);
    setSelectedVaccineForUpdate(null);
  };

  const filteredRecords = useMemo(() => {
    return records
      .filter(r => r.fiscalYear === currentFiscalYear)
      .filter(r => 
        r.childName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.regNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.motherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.fatherName.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => b.id.localeCompare(a.id));
  }, [records, currentFiscalYear, searchTerm]);

  // Helper to calculate age from DOB - REPLACED WITH USER PROVIDED CODE
  const calculateAge = useCallback((dobBs: string) => {
    if (!dobBs) return "N/A";
    try {
      const today = new NepaliDate();
      const birth = new NepaliDate(dobBs);
      
      let years = today.getYear() - birth.getYear();
      let months = today.getMonth() - birth.getMonth();
      let days = today.getDate() - birth.getDate();
      // Simple borrowing logic (no library function needed)
      if (days < 0) {
        months -= 1;
        days += 30; // Standard 30 days borrow
      }
      if (months < 0) {
        years -= 1;
        months += 12;
      }
      return `${years} वर्ष, ${months} महिना, ${days} दिन`;
    } catch (e) { 
        return "Invalid Date"; 
    } 
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 p-2 rounded-lg text-green-600">
            <Baby size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 font-nepali">बच्चा राष्ट्रिय खोप कार्यक्रम दर्ता</h2>
            <p className="text-sm text-slate-500">बच्चाहरूको खोप तालिकाको विवरण दर्ता र ट्र्याकिङ</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {validationError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex items-start gap-3 animate-in slide-in-from-top-2">
          <AlertTriangle size={24} className="text-red-500 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-red-800 font-bold text-sm">त्रुटि (Validation Error)</h3>
            <p className="text-red-700 text-sm mt-1">{validationError}</p>
          </div>
          <button onClick={() => setValidationError(null)} className="text-red-400 hover:text-red-600"><X size={20} /></button>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl shadow-sm flex items-center gap-3 animate-in slide-in-from-top-2">
          <CheckCircle2 size={24} className="text-green-500" />
          <div className="flex-1">
            <h3 className="text-green-800 font-bold text-lg font-nepali">सफल भयो (Success)</h3>
            <p className="text-green-700 text-sm">{successMessage}</p>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-green-400 hover:text-green-600"><X size={20} /></button>
        </div>
      )}

      {/* Registration Form */}
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <div className="flex items-center gap-2 mb-6 text-green-800 bg-green-50 p-3 rounded-lg border border-green-100">
            <Baby size={20} />
            <span className="font-semibold font-nepali">बच्चाको विवरण (Child Details)</span>
        </div>
        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3 grid md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
            <Input label="आर्थिक वर्ष" value={formData.fiscalYear} readOnly className="bg-slate-100 text-slate-600 font-medium cursor-not-allowed" icon={<Calendar size={16} />} />
            <Input label="दर्ता नम्बर (Reg No)" value={formData.regNo} readOnly className="font-mono font-bold text-green-600" icon={<FileDigit size={16} />} />
            <NepaliDatePicker label="जन्म मिति (DOB - BS) *" value={formData.dobBs} onChange={handleDOBBsChange} required />
          </div>

          <Input label="बच्चाको नाम (Child Name) *" value={formData.childName} onChange={e => setFormData({...formData, childName: e.target.value})} required icon={<UsersRound size={16} />} />
          <Select label="लिङ्ग (Gender) *" options={genderOptions} value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as 'Male' | 'Female' | 'Other'})} required />
          <Input label="जन्म मिति (DOB - AD)" value={formData.dobAd} readOnly className="bg-slate-100 text-slate-500 text-xs cursor-not-allowed" icon={<Calendar size={16} />} />

          <Input label="आमाको नाम (Mother's Name) *" value={formData.motherName} onChange={e => setFormData({...formData, motherName: e.target.value})} required icon={<User size={16} />} />
          <Input label="बुबाको नाम (Father's Name) *" value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} required icon={<User size={16} />} />
          <Input label="ठेगाना (Address) *" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required icon={<MapPin size={16} />} />
          <Input label="फोन नं (Phone) *" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required icon={<Phone size={16} />} />
          <Input label="जन्म तौल (Birth Weight - Kg)" type="number" step="0.1" value={formData.birthWeightKg || ''} onChange={e => setFormData({...formData, birthWeightKg: parseFloat(e.target.value) || undefined})} icon={<Weight size={16} />} />

          <Input label="कैफियत (Remarks)" value={formData.remarks || ''} onChange={e => setFormData({...formData, remarks: e.target.value})} className="lg:col-span-3" />

          <div className="lg:col-span-3 pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" onClick={handleReset} className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium">
              <RotateCcw size={18} /><span>रिसेट (Reset)</span>
            </button>
            <button type="submit" className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg shadow-sm transition-all active:scale-95 font-medium">
              <Save size={18} /><span>{editingRecordId ? 'अपडेट गर्नुहोस्' : 'दर्ता गर्नुहोस्'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Immunization Schedule & List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-slate-700 font-nepali">दर्ता भएका बच्चाहरूको खोप तालिका ({filteredRecords.length})</h3>
          </div>
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="बच्चाको नाम, आमाको नाम खोज्नुहोस्..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none text-sm transition-all" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Reg No</th>
                <th className="px-6 py-3">Child / Parents</th>
                <th className="px-6 py-3">DOB (BS) / Age</th>
                <th className="px-6 py-3">खोप तालिका (Immunization Schedule)</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">
                    {searchTerm ? 'कुनै नतिजा फेला परेन (No matching records)' : 'कुनै बच्चा दर्ता भएको छैन (No children registered)'}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-mono font-medium text-green-600 whitespace-nowrap">{record.regNo}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{record.childName} ({record.gender})</div>
                      <div className="text-xs text-slate-500">आमा: {record.motherName}</div>
                      <div className="text-xs text-slate-500">बुबा: {record.fatherName}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-nepali">
                        {record.dobBs}
                        <div className="text-xs text-slate-500">({calculateAge(record.dobBs)})</div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                            {record.vaccines.map((vaccine, idx) => {
                                const isOverdue = vaccine.status === 'Pending' && new Date(vaccine.scheduledDateAd) < new Date(getTodayAd());
                                return (
                                    <button 
                                        key={idx} 
                                        type="button" 
                                        onClick={() => setSelectedVaccineForUpdate({ record, vaccineIndex: idx })}
                                        className={`px-2 py-1 rounded text-[10px] font-bold border 
                                            ${vaccine.status === 'Given' ? 'bg-green-100 text-green-700 border-green-200' :
                                            isOverdue ? 'bg-red-100 text-red-700 border-red-200 animate-pulse' :
                                            'bg-blue-50 text-blue-700 border-blue-200'
                                            }`}
                                    >
                                        {vaccine.name} ({vaccine.scheduledDateBs.slice(5)})
                                    </button>
                                );
                            })}
                        </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEditRecord(record)} className="text-primary-400 hover:text-primary-600 p-1"><Edit size={18} /></button>
                        <button onClick={() => handleDeleteRecord(record.id, record.childName)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vaccine Update Modal */}
      {selectedVaccineForUpdate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 sm:pt-24">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedVaccineForUpdate(null)}></div>
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-blue-50/50">
                    <div className="flex items-center gap-2">
                        <Droplets size={20} className="text-blue-600"/>
                        <h3 className="font-bold text-slate-800 font-nepali text-sm">खोप स्थिति अपडेट (Update Vaccine Status)</h3>
                    </div>
                    <button type="button" onClick={() => setSelectedVaccineForUpdate(null)} className="p-2 hover:bg-white/50 rounded-full transition-colors"><X size={20} className="text-slate-400"/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="text-center">
                        <h4 className="text-lg font-bold text-slate-800">{selectedVaccineForUpdate.record.childName}</h4>
                        <p className="text-sm text-slate-600">खोप: <span className="font-bold text-blue-700">{selectedVaccineForUpdate.record.vaccines[selectedVaccineForUpdate.vaccineIndex].name}</span></p>
                        <p className="text-xs text-slate-500">Scheduled (BS): {selectedVaccineForUpdate.record.vaccines[selectedVaccineForUpdate.vaccineIndex].scheduledDateBs}</p>
                    </div>
                    
                    <NepaliDatePicker 
                        label="खोप दिएको मिति (Given Date - BS)" 
                        value={modalGivenDateBs} 
                        onChange={setModalGivenDateBs} 
                        required
                        disabled={selectedVaccineForUpdate.record.vaccines[selectedVaccineForUpdate.vaccineIndex].status === 'Given'}
                    />
                    
                    {selectedVaccineForUpdate.record.vaccines[selectedVaccineForUpdate.vaccineIndex].status === 'Given' && (
                        <div className="bg-green-50 border border-green-100 p-3 rounded-lg text-center font-nepali text-green-700">
                            <CheckCircle2 size={20} className="mx-auto mb-1" />
                            <span className="font-bold">खोप लगाइसकियो (Locked)</span>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50">
                    <button type="button" onClick={() => setSelectedVaccineForUpdate(null)} className="flex-1 py-2 text-slate-600 font-medium font-nepali hover:bg-slate-200 rounded-lg transition-colors text-sm">बन्द (Close)</button>
                    {selectedVaccineForUpdate.record.vaccines[selectedVaccineForUpdate.vaccineIndex].status !== 'Given' && (
                        <button type="button" onClick={handleUpdateDoseStatus} className="flex-1 py-2 bg-green-600 text-white rounded-lg font-medium shadow-sm font-nepali hover:bg-green-700 transition-all active:scale-95 text-sm flex items-center justify-center gap-2">
                            <CheckCircle2 size={16} />
                            सुरक्षित गर्नुहोस्
                        </button>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
