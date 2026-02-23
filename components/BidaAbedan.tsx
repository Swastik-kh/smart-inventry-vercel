import React, { useState, useRef } from 'react';
import { Calendar, Save, FileText, CheckCircle2, X, BookOpen, User as UserIcon, Check, XCircle, Eye, List, Printer, ShieldCheck, Trash2 } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { Input } from './Input';
import { NepaliDatePicker } from './NepaliDatePicker';
import { Select } from './Select';
import { User, LeaveApplication, LeaveStatus, LeaveBalance, ServiceType } from '../types/coreTypes';
import { BidaMaagFaram } from './BidaMaagFaram';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface BidaAbedanProps {
  currentUser: User | null;
  users: User[];
  leaveApplications: LeaveApplication[];
  onAddLeaveApplication: (application: LeaveApplication) => void;
  onUpdateLeaveStatus: (id: string, status: LeaveStatus, rejectionReason?: string) => void;
  onDeleteLeaveApplication: (id: string) => void;
  leaveBalances: LeaveBalance[];
  onSaveLeaveBalance: (balance: LeaveBalance) => Promise<void>;
}

export const BidaAbedan: React.FC<BidaAbedanProps> = ({
  currentUser,
  users,
  leaveApplications,
  onAddLeaveApplication,
  onUpdateLeaveStatus,
  onDeleteLeaveApplication,
  leaveBalances,
  onSaveLeaveBalance
}) => {
  const [activeTab, setActiveTab] = useState<'apply' | 'applications'>('apply');
  const [formData, setFormData] = useState({
    employeeName: currentUser?.fullName || '',
    designation: currentUser?.designation || '',
    leaveType: 'Casual & Festival',
    startDate: '',
    endDate: '',
    reason: '',
    status: 'Pending'
  });

  const [showAccumulatedModal, setShowAccumulatedModal] = useState(false);
  const [selectedUserForAccumulated, setSelectedUserForAccumulated] = useState<string>('');
  const [accumulatedData, setAccumulatedData] = useState<Partial<LeaveBalance>>({
    casual: 0,
    sick: 0,
    festival: 0,
    home: 0,
    other: 0,
    maternity: 0,
    kiriya: 0,
    study: 0,
    extraordinary: 0,
    serviceType: 'Permanent'
  });

  const [isSaving, setIsSaving] = useState(false);

  const [viewApplication, setViewApplication] = useState<LeaveApplication | null>(null);

  React.useEffect(() => {
    if (selectedUserForAccumulated) {
      const balance = leaveBalances.find(b => b.userId === selectedUserForAccumulated);
      if (balance) {
        setAccumulatedData(balance);
      } else {
        // Reset if manually entered ID has no existing record
        setAccumulatedData({
          casual: 0, sick: 0, festival: 0, home: 0, other: 0, maternity: 0, kiriya: 0, study: 0, extraordinary: 0, serviceType: 'Permanent'
        });
      }
    } else {
      // Reset when selection is cleared
      setAccumulatedData({
          casual: 0, sick: 0, festival: 0, home: 0, other: 0, maternity: 0, kiriya: 0, study: 0, extraordinary: 0, serviceType: 'Permanent'
        });
    }
  }, [selectedUserForAccumulated, leaveBalances]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const newApplication: LeaveApplication = {
      id: Date.now().toString(),
      userId: currentUser.id,
      employeeName: currentUser.fullName,
      designation: currentUser.designation,
      leaveType: formData.leaveType,
      startDate: formData.startDate,
      endDate: formData.endDate,
      reason: formData.reason,
      status: 'Pending',
      appliedDate: new NepaliDate().format('YYYY-MM-DD')
    };

    onAddLeaveApplication(newApplication);
    alert('बिदा आवेदन पेश गरियो (Leave application submitted)');
    
    setFormData({
      ...formData,
      startDate: '',
      endDate: '',
      reason: ''
    });
  };

  const handleSaveAccumulated = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForAccumulated) {
      alert('Please enter or select an Employee ID.');
      return;
    }

    const user = users.find(u => u.id === selectedUserForAccumulated);
    const employeeName = user ? user.fullName : 'Manual Entry';

    setIsSaving(true);
    try {
        const existingBalance = leaveBalances.find(b => b.userId === selectedUserForAccumulated);
        
        const newBalance: LeaveBalance = {
          id: existingBalance?.id || Date.now().toString(),
          userId: selectedUserForAccumulated,
          employeeName: employeeName,
          serviceType: accumulatedData.serviceType ?? 'Permanent',
          casual: accumulatedData.casual ?? 0,
          sick: accumulatedData.sick ?? 0,
          festival: accumulatedData.festival ?? 0,
          home: accumulatedData.home ?? 0,
          other: accumulatedData.other ?? 0,
          maternity: accumulatedData.maternity ?? 0,
          kiriya: accumulatedData.kiriya ?? 0,
          study: accumulatedData.study ?? 0,
          extraordinary: accumulatedData.extraordinary ?? 0,
        };

        await onSaveLeaveBalance(newBalance);
        alert('सञ्चित बिदा विवरण सुरक्षित गरियो (Accumulated leave record saved)');
        setShowAccumulatedModal(false);
    } catch (error) {
        alert('Error saving accumulated leave.');
    } finally {
        setIsSaving(false);
    }
  };

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'APPROVAL';

  const myBalance = leaveBalances.find(b => b.userId === currentUser?.id) || {
    casual: 0, sick: 0, festival: 0, home: 0, other: 0, maternity: 0, kiriya: 0, study: 0, extraordinary: 0
  };

  const userOptions = users.map(u => ({ id: u.id, value: u.id, label: `${u.fullName} (${u.designation})` }));

  const pendingApplications = leaveApplications.filter(app => app.status === 'Pending');

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Leave_Application',
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 relative">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
            <Calendar size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 font-nepali">बिदा आवेदन (Leave Application)</h2>
            <p className="text-sm text-slate-500">बिदाको लागि आवेदन फारम</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <button 
                onClick={() => setActiveTab(activeTab === 'apply' ? 'applications' : 'apply')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm transition-all text-sm font-medium ${
                  activeTab === 'applications' 
                  ? 'bg-primary-600 text-white hover:bg-primary-700' 
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <List size={16} />
                <span>बिदा माग आवेदन (Leave Requests)</span>
              </button>
              <button 
                onClick={() => setShowAccumulatedModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 shadow-sm transition-all text-sm font-medium"
              >
                <BookOpen size={16} />
                <span>सञ्चित बिदा अभिलेख (Accumulated Leave Record)</span>
              </button>
            </>
          )}
        </div>
      </div>

      {showAccumulatedModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full h-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-none">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <BookOpen size={18} className="text-primary-600"/>
                सञ्चित बिदा व्यवस्थापन
              </h3>
              <button onClick={() => setShowAccumulatedModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveAccumulated} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <Select
                  label="कर्मचारी छान्नुहोस् (Select Employee)"
                  value={selectedUserForAccumulated}
                  onChange={e => setSelectedUserForAccumulated(e.target.value)}
                  options={userOptions}
                  icon={<UserIcon size={16} />}
                  placeholder="Select an employee or enter ID below"
                />

                <Input
                  label="कर्मचारी संकेत नम्बर (Employee ID)"
                  value={selectedUserForAccumulated}
                  onChange={e => setSelectedUserForAccumulated(e.target.value)}
                  icon={<UserIcon size={16} />}
                  placeholder="Enter Employee ID"
                  required
                />

                <Select
                  label="सेवाको प्रकार (Service Type)"
                  value={accumulatedData.serviceType ?? 'Permanent'}
                  onChange={e => setAccumulatedData({...accumulatedData, serviceType: e.target.value as ServiceType})}
                  options={[
                    { id: 'Permanent', value: 'Permanent', label: 'स्थायी (Permanent)' },
                    { id: 'Temporary', value: 'Temporary', label: 'अस्थायी/करार (Temporary/Contract)' }
                  ]}
                  required
                  icon={<ShieldCheck size={16} />}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="भैपरी आउने र पर्व बिदा"
                    type="number"
                    value={accumulatedData.casual ?? 0}
                    onChange={e => setAccumulatedData({ ...accumulatedData, casual: Number(e.target.value) })}
                    min={0}
                  />
                  <Input
                    label="बिरामी बिदा (Sick)"
                    type="number"
                    value={accumulatedData.sick ?? 0}
                    onChange={e => setAccumulatedData({...accumulatedData, sick: Number(e.target.value)})}
                    min={0}
                  />
                  <Input
                    label="घर बिदा (Home)"
                    type="number"
                    value={accumulatedData.home ?? 0}
                    onChange={e => setAccumulatedData({...accumulatedData, home: Number(e.target.value)})}
                    min={0}
                  />
                   <Input
                    label="प्रसुति बिदा (Maternity)"
                    type="number"
                    value={accumulatedData.maternity ?? 0}
                    onChange={e => setAccumulatedData({...accumulatedData, maternity: Number(e.target.value)})}
                    min={0}
                  />
                  <Input
                    label="किरिया बिदा (Kiriya)"
                    type="number"
                    value={accumulatedData.kiriya ?? 0}
                    onChange={e => setAccumulatedData({...accumulatedData, kiriya: Number(e.target.value)})}
                    min={0}
                  />
                  <Input
                    label="अध्ययन बिदा (Study)"
                    type="number"
                    value={accumulatedData.study ?? 0}
                    onChange={e => setAccumulatedData({...accumulatedData, study: Number(e.target.value)})}
                    min={0}
                  />
                  <Input
                    label="असाधारण बिदा (Extraordinary)"
                    type="number"
                    value={accumulatedData.extraordinary ?? 0}
                    onChange={e => setAccumulatedData({...accumulatedData, extraordinary: Number(e.target.value)})}
                    min={0}
                  />
                   <Input
                    label="अन्य (Other)"
                    type="number"
                    value={accumulatedData.other ?? 0}
                    onChange={e => setAccumulatedData({...accumulatedData, other: Number(e.target.value)})}
                    min={0}
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 flex-none">
                <button 
                  type="button" 
                  onClick={() => setShowAccumulatedModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                >
                  रद्द
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className={`px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium shadow-sm flex items-center gap-2 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <Save size={16} />
                  {isSaving ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* The rest of your component UI... */}
    </div>
  );
};