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

      {activeTab === 'apply' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">बिदाको विवरण (Leave Details)</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="कर्मचारीको नाम (Employee Name)"
                    value={formData.employeeName}
                    readOnly
                    className="bg-slate-50"
                    icon={<UserIcon size={16} />}
                  />
                  <Input
                    label="पद (Designation)"
                    value={formData.designation}
                    readOnly
                    className="bg-slate-50"
                    icon={<ShieldCheck size={16} />}
                  />
                </div>

                <Select
                  label="बिदाको प्रकार (Leave Type)"
                  value={formData.leaveType}
                  onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                  options={[
                    { id: 'Casual & Festival', value: 'Casual & Festival', label: 'भैपरी आउने र पर्व बिदा (Casual & Festival)' },
                    { id: 'Sick', value: 'Sick', label: 'बिरामी बिदा (Sick)' },
                    { id: 'Home', value: 'Home', label: 'घर बिदा (Home)' },
                    { id: 'Maternity', value: 'Maternity', label: 'प्रसुति बिदा (Maternity)' },
                    { id: 'Kiriya', value: 'Kiriya', label: 'किरिया बिदा (Kiriya)' },
                    { id: 'Study', value: 'Study', label: 'अध्ययन बिदा (Study)' },
                    { id: 'Extraordinary', value: 'Extraordinary', label: 'असाधारण बिदा (Extraordinary)' },
                    { id: 'Other', value: 'Other', label: 'अन्य (Other)' }
                  ]}
                  required
                  icon={<List size={16} />}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <NepaliDatePicker
                    label="देखि (Start Date)"
                    value={formData.startDate}
                    onChange={(date) => setFormData({ ...formData, startDate: date })}
                    required
                  />
                  <NepaliDatePicker
                    label="सम्म (End Date)"
                    value={formData.endDate}
                    onChange={(date) => setFormData({ ...formData, endDate: date })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">कारण (Reason)</label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[100px] text-sm"
                    placeholder="बिदा बस्नुको कारण उल्लेख गर्नुहोस्..."
                    required
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 flex items-center justify-center gap-2"
                  >
                    <Save size={18} />
                    बिदा आवेदन पेश गर्नुहोस् (Submit Application)
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="space-y-6">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
                  <BookOpen size={18} className="text-blue-600"/>
                  मेरो बिदा मौज्दात (My Balance)
                </h3>
                <div className="space-y-3">
                   <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">भैपरी र पर्व</span>
                      <span className="font-bold text-slate-800">{(myBalance.casual || 0) + (myBalance.festival || 0)} दिन</span>
                   </div>
                   <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">बिरामी</span>
                      <span className="font-bold text-slate-800">{myBalance.sick || 0} दिन</span>
                   </div>
                   <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">घर बिदा</span>
                      <span className="font-bold text-slate-800">{myBalance.home || 0} दिन</span>
                   </div>
                   <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">अन्य</span>
                      <span className="font-bold text-slate-800">{myBalance.other || 0} दिन</span>
                   </div>
                </div>
             </div>

             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">हालैका आवेदनहरू</h3>
                <div className="space-y-3">
                  {leaveApplications.filter(app => app.userId === currentUser?.id).slice(0, 5).map(app => (
                    <div key={app.id} className="p-3 border border-slate-100 rounded-xl bg-slate-50">
                       <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-slate-700">{app.leaveType}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            app.status === 'Approved' ? 'bg-green-100 text-green-700' :
                            app.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>{app.status}</span>
                       </div>
                       <p className="text-[10px] text-slate-500">{app.startDate} देखि {app.endDate}</p>
                    </div>
                  ))}
                  {leaveApplications.filter(app => app.userId === currentUser?.id).length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-4">कुनै आवेदन छैन</p>
                  )}
                </div>
             </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
           <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-700">बिदा माग आवेदनहरू (Leave Requests)</h3>
              <span className="bg-primary-100 text-primary-700 px-2 py-1 rounded-lg text-xs font-bold">
                {pendingApplications.length} Pending
              </span>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                 <thead className="bg-slate-50 text-slate-600 font-bold border-b">
                    <tr>
                       <th className="p-4">कर्मचारी</th>
                       <th className="p-4">बिदाको प्रकार</th>
                       <th className="p-4">अवधि</th>
                       <th className="p-4">कारण</th>
                       <th className="p-4">अवस्था</th>
                       <th className="p-4 text-right">कार्य</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {leaveApplications.map(app => (
                       <tr key={app.id} className="hover:bg-slate-50">
                          <td className="p-4">
                             <p className="font-bold text-slate-800">{app.employeeName}</p>
                             <p className="text-xs text-slate-500">{app.designation}</p>
                          </td>
                          <td className="p-4">{app.leaveType}</td>
                          <td className="p-4">
                             <p className="text-xs font-bold">{app.startDate} - {app.endDate}</p>
                             <p className="text-[10px] text-slate-400">Applied: {app.appliedDate}</p>
                          </td>
                          <td className="p-4 max-w-xs truncate" title={app.reason}>{app.reason}</td>
                          <td className="p-4">
                             <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                app.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                app.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                'bg-amber-100 text-amber-700'
                             }`}>
                                {app.status}
                             </span>
                          </td>
                          <td className="p-4 text-right">
                             {app.status === 'Pending' && (
                                <div className="flex justify-end gap-2">
                                   <button 
                                      onClick={() => onUpdateLeaveStatus(app.id, 'Approved')}
                                      className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                                      title="Approve"
                                   >
                                      <CheckCircle2 size={16} />
                                   </button>
                                   <button 
                                      onClick={() => {
                                         const reason = prompt('Rejection Reason:');
                                         if (reason) onUpdateLeaveStatus(app.id, 'Rejected', reason);
                                      }}
                                      className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                      title="Reject"
                                   >
                                      <XCircle size={16} />
                                   </button>
                                </div>
                             )}
                             {isAdmin && (
                                <button 
                                  onClick={() => onDeleteLeaveApplication(app.id)}
                                  className="ml-2 p-2 text-slate-400 hover:text-red-500"
                                >
                                  <Trash2 size={16} />
                                </button>
                             )}
                          </td>
                       </tr>
                    ))}
                    {leaveApplications.length === 0 && (
                       <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">कुनै आवेदन छैन।</td></tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      )}
    </div>
  );
};