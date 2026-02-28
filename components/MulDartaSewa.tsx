import React, { useState } from 'react';
import { ClipboardList, Plus, X, Pencil, Trash2, Search } from 'lucide-react';
import { ServiceSeekerRecord, User } from '../types/coreTypes';
import { Input } from './Input';
import { NepaliDatePicker } from './NepaliDatePicker';

// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface MulDartaSewaProps {
  records: ServiceSeekerRecord[];
  onSaveRecord: (record: ServiceSeekerRecord) => void;
  onDeleteRecord: (recordId: string) => void;
  currentFiscalYear: string;
  currentUser: User;
}

const initialFormData: Omit<ServiceSeekerRecord, 'id' | 'fiscalYear'> = {
  uniquePatientId: '',
  registrationNumber: '',
  date: '',
  name: '',
  age: '',
  ageYears: 0,
  ageMonths: 0,
  gender: 'Male',
  casteCode: '',
  address: '',
  phone: '',
  serviceType: 'OPD',
  visitType: 'New',
  remarks: '',
};

export const MulDartaSewa: React.FC<MulDartaSewaProps> = ({ records, onSaveRecord, onDeleteRecord, currentFiscalYear, currentUser }) => {
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [searchQuery, setSearchQuery] = useState('');

  const handleAddNew = () => {
    setIsEditing(null);
    const newUniqueId = `PID-${Date.now().toString().slice(-6)}`;
    
    // Calculate next registration number
    const currentYearRecords = records.filter(r => r.fiscalYear === currentFiscalYear);
    const maxRegNum = currentYearRecords.reduce((max, r) => {
      const num = parseInt(r.registrationNumber, 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    const nextRegNum = (maxRegNum + 1).toString().padStart(4, '0');
    
    // Auto-populate today's date
    const today = new NepaliDate().format('YYYY-MM-DD');

    setFormData({ 
      ...initialFormData, 
      uniquePatientId: newUniqueId,
      registrationNumber: nextRegNum,
      date: today
    });
    setShowForm(true);
  };

  const handleEdit = (record: ServiceSeekerRecord) => {
    setIsEditing(record.id);
    setFormData(record);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setIsEditing(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Auto-detect follow-up logic
    if (name === 'name' || name === 'phone') {
      const checkName = name === 'name' ? value : formData.name;
      const checkPhone = name === 'phone' ? value : formData.phone;
      
      if (checkName && checkName.length > 2) {
        const existingPatient = records.find(r => 
          r.fiscalYear === currentFiscalYear && 
          r.name.toLowerCase() === checkName.toLowerCase() &&
          (!checkPhone || r.phone === checkPhone)
        );
        
        if (existingPatient) {
          setFormData(prev => ({ 
            ...prev, 
            [name]: value,
            visitType: 'Follow-up',
            uniquePatientId: existingPatient.uniquePatientId,
            casteCode: existingPatient.casteCode || prev.casteCode,
            age: existingPatient.age || prev.age,
            ageYears: existingPatient.ageYears || prev.ageYears,
            ageMonths: existingPatient.ageMonths || prev.ageMonths,
            gender: existingPatient.gender || prev.gender,
            address: existingPatient.address || prev.address,
            phone: existingPatient.phone || prev.phone
          }));
          return;
        }
      }
    }

    const finalValue = (name === 'ageYears' || name === 'ageMonths') ? parseInt(value) || 0 : value;
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleDateChange = (value: string) => {
    setFormData(prev => ({ ...prev, date: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ageString = `${formData.ageYears}Y ${formData.ageMonths}M`;
    const recordToSave: ServiceSeekerRecord = {
      ...formData,
      age: ageString,
      id: isEditing || Date.now().toString(),
      fiscalYear: currentFiscalYear,
    };
    onSaveRecord(recordToSave);
    handleCloseForm();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('के तपाईं यो रेकर्ड हटाउन निश्चित हुनुहुन्छ?')) {
      onDeleteRecord(id);
    }
  };

  const filteredRecords = (records || []).filter(r => 
    r.fiscalYear === currentFiscalYear &&
    (r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
     r.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
     r.phone.includes(searchQuery))
  );

  const canEditDelete = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
            <ClipboardList size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 font-nepali">मूल दर्ता सेवा</h2>
            <p className="text-sm text-slate-500">Main Registration Service</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="खोज्नुहोस्..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm w-full sm:w-64"
            />
          </div>
          <button onClick={handleAddNew} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold shadow-sm hover:bg-primary-700 whitespace-nowrap">
            <Plus size={18} /> नयाँ दर्ता
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium">
              <tr>
                <th className="p-4">दर्ता नं.</th>
                <th className="p-4">बिरामी ID</th>
                <th className="p-4">मिति</th>
                <th className="p-4">नाम</th>
                <th className="p-4">उमेर/लिङ्ग</th>
                <th className="p-4">जातिगत कोड</th>
                <th className="p-4">ठेगाना</th>
                <th className="p-4">फोन</th>
                <th className="p-4">सेवाको प्रकार</th>
                <th className="p-4">किसिम</th>
                <th className="p-4 text-right">कार्य</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map(record => (
                <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-bold text-primary-700">{record.registrationNumber}</td>
                  <td className="p-4 font-mono text-xs text-slate-500">{record.uniquePatientId}</td>
                  <td className="p-4">{record.date}</td>
                  <td className="p-4 font-medium">{record.name}</td>
                  <td className="p-4">{record.age} / {record.gender}</td>
                  <td className="p-4 text-center">{record.casteCode || '-'}</td>
                  <td className="p-4">{record.address}</td>
                  <td className="p-4 font-mono">{record.phone}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold uppercase">
                      {record.serviceType}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${record.visitType === 'New' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                      {record.visitType}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {canEditDelete && (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEdit(record)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleDelete(record.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center p-12 text-slate-500 italic">कुनै रेकर्ड भेटिएन।</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 flex items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-none sm:rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl h-full sm:h-auto max-h-screen flex flex-col relative animate-in zoom-in-95 slide-in-from-bottom-4">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 sm:rounded-t-2xl">
              <h3 className="text-2xl font-bold text-slate-800 font-nepali">
                {isEditing ? 'दर्ता विवरण सम्पादन गर्नुहोस्' : 'नयाँ सेवाग्राही दर्ता'}
              </h3>
              <button onClick={handleCloseForm} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Input 
                  label="दर्ता नम्बर *" 
                  name="registrationNumber" 
                  value={formData.registrationNumber} 
                  onChange={handleChange} 
                  required 
                  readOnly
                  className="bg-slate-50 text-slate-500 cursor-not-allowed"
                />
                <Input 
                  label="बिरामी ID (Unique)" 
                  name="uniquePatientId" 
                  value={formData.uniquePatientId} 
                  onChange={handleChange} 
                  readOnly
                  className="bg-slate-50 text-slate-500 cursor-not-allowed"
                />
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-600 mb-1 block">दर्ता मिति *</label>
                  <input 
                    type="text" 
                    value={formData.date} 
                    readOnly 
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none bg-slate-50 text-slate-500 cursor-not-allowed text-sm"
                  />
                </div>
                <Input 
                  label="सेवाग्राहीको नाम *" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  required 
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input 
                    label="उमेर (वर्ष) *" 
                    name="ageYears" 
                    type="number"
                    value={formData.ageYears} 
                    onChange={handleChange} 
                    required 
                  />
                  <Input 
                    label="उमेर (महिना) *" 
                    name="ageMonths" 
                    type="number"
                    value={formData.ageMonths} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-600 mb-1 block">जातिगत कोड (Caste Code)</label>
                  <select 
                    name="casteCode" 
                    value={formData.casteCode} 
                    onChange={handleChange} 
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  >
                    <option value="">छान्नुहोस्</option>
                    <option value="1">1 - दलित (Dalit)</option>
                    <option value="2">2 - जनजाति (Janajati)</option>
                    <option value="3">3 - मधेशी (Madhesi)</option>
                    <option value="4">4 - मुस्लिम (Muslim)</option>
                    <option value="5">5 - ब्राह्मण/क्षेत्री (Brahmin/Chhetri)</option>
                    <option value="6">6 - अन्य (Other)</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-600 mb-1 block">लिङ्ग *</label>
                  <select 
                    name="gender" 
                    value={formData.gender} 
                    onChange={handleChange} 
                    required 
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  >
                    <option value="Male">पुरुष (Male)</option>
                    <option value="Female">महिला (Female)</option>
                    <option value="Other">अन्य (Other)</option>
                  </select>
                </div>
                <Input 
                  label="ठेगाना *" 
                  name="address" 
                  value={formData.address} 
                  onChange={handleChange} 
                  required 
                />
                <Input 
                  label="फोन नम्बर" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange} 
                />
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-600 mb-1 block">बिरामीको किसिम (Visit Type) *</label>
                  <select 
                    name="visitType" 
                    value={formData.visitType} 
                    onChange={handleChange} 
                    required 
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  >
                    <option value="New">नयाँ (New)</option>
                    <option value="Follow-up">पुनः (Follow-up)</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-600 mb-1 block">सेवाको प्रकार *</label>
                  <select 
                    name="serviceType" 
                    value={formData.serviceType} 
                    onChange={handleChange} 
                    required 
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  >
                    <option value="OPD">OPD</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Vaccination">Vaccination (खोप)</option>
                    <option value="Safe Motherhood">Safe Motherhood (सुरक्षित मातृत्व)</option>
                    <option value="Lab">Lab (प्रयोगशाला)</option>
                    <option value="Other">Other (अन्य)</option>
                  </select>
                </div>
                <div className="md:col-span-3">
                  <Input 
                    label="कैफियत" 
                    name="remarks" 
                    value={formData.remarks} 
                    onChange={handleChange} 
                  />
                </div>
                
                <div className="md:col-span-3 flex justify-end gap-4 pt-6 border-t border-slate-200 sticky bottom-0 bg-white pb-2">
                  <button type="button" onClick={handleCloseForm} className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">रद्द</button>
                  <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium shadow-sm hover:bg-primary-700 transition-colors">सुरक्षित गर्नुहोस्</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
