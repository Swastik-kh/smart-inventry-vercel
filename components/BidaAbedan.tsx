import React, { useState } from 'react';
import { Calendar, Save, FileText, CheckCircle2, X, BookOpen, User as UserIcon, Check, XCircle, Eye, List, Printer, ShieldCheck } from 'lucide-react';
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
  leaveBalances: LeaveBalance[];
  onSaveLeaveBalance: (balance: LeaveBalance) => Promise<void>;
}

export const BidaAbedan: React.FC<BidaAbedanProps> = ({ 
  currentUser, 
  users, 
  leaveApplications, 
  onAddLeaveApplication, 
  onUpdateLeaveStatus,
  leaveBalances,
  onSaveLeaveBalance
}) => {
  const [activeTab, setActiveTab] = useState<'apply' | 'applications'>('apply');
  const [formData, setFormData] = useState({
    employeeName: currentUser?.fullName || '',
    designation: currentUser?.designation || '',
    leaveType: 'Casual',
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
    serviceType: 'Permanent'
  });

  const [isSaving, setIsSaving] = useState(false);

  const [viewApplication, setViewApplication] = useState<LeaveApplication | null>(null);

  React.useEffect(() => {
    if (selectedUserForAccumulated) {
      const balance = leaveBalances.find(b => b.userId === selectedUserForAccumulated);
      if (balance) {
        setAccumulatedData({
          casual: balance.casual,
          sick: balance.sick,
          festival: balance.festival,
          home: balance.home,
          other: balance.other,
          serviceType: balance.serviceType
        });
      } else {
        setAccumulatedData({
          casual: 0,
          sick: 0,
          festival: 0,
          home: 0,
          other: 0,
          serviceType: 'Permanent'
        });
      }
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
    
    // Reset form
    setFormData({
      ...formData,
      startDate: '',
      endDate: '',
      reason: ''
    });
  };

  const handleSaveAccumulated = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForAccumulated) return;

    const user = users.find(u => u.id === selectedUserForAccumulated);
    if (!user) return;

    setIsSaving(true);
    try {
        const existingBalance = leaveBalances.find(b => b.userId === selectedUserForAccumulated);
        
        const newBalance: LeaveBalance = {
          id: existingBalance?.id || Date.now().toString(),
          userId: selectedUserForAccumulated,
          employeeName: user.fullName,
          serviceType: accumulatedData.serviceType as ServiceType,
          casual: accumulatedData.casual || 0,
          sick: accumulatedData.sick || 0,
          festival: accumulatedData.festival || 0,
          home: accumulatedData.home || 0,
          other: accumulatedData.other || 0,
          lastAccrualMonth: existingBalance?.lastAccrualMonth,
          lastFiscalYearReset: existingBalance?.lastFiscalYearReset
        };

        await onSaveLeaveBalance(newBalance);
        alert('सञ्चित बिदा विवरण सुरक्षित गरियो (Accumulated leave record saved)');
        setShowAccumulatedModal(false);
    } catch (error) {
        alert('सुरक्षित गर्न सकिएन।');
    } finally {
        setIsSaving(false);
    }
  };

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'APPROVAL';

  const myBalance = leaveBalances.find(b => b.userId === currentUser?.id) || {
    casual: 0, sick: 0, festival: 0, home: 0, other: 0
  };

  const userOptions = users.map(u => ({ id: u.id, value: u.id, label: `${u.fullName} (${u.designation})` }));

  const pendingApplications = leaveApplications.filter(app => app.status === 'Pending');

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

      {/* Accumulated Leave Modal */}
      {showAccumulatedModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <BookOpen size={18} className="text-primary-600"/>
                सञ्चित बिदा व्यवस्थापन
              </h3>
              <button onClick={() => setShowAccumulatedModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveAccumulated} className="p-6 space-y-4">
              <Select
                label="कर्मचारी छान्नुहोस्"
                value={selectedUserForAccumulated}
                onChange={e => setSelectedUserForAccumulated(e.target.value)}
                options={userOptions}
                required
                icon={<UserIcon size={16} />}
                placeholder="कर्मचारी चयन गर्नुहोस्"
              />

              <Select
                label="सेवाको प्रकार (Service Type)"
                value={accumulatedData.serviceType}
                onChange={e => setAccumulatedData({...accumulatedData, serviceType: e.target.value as ServiceType})}
                options={[
                  { id: 'Permanent', value: 'Permanent', label: 'स्थायी (Permanent)' },
                  { id: 'Temporary', value: 'Temporary', label: 'अस्थायी/करार (Temporary/Contract)' }
                ]}
                required
                icon={<ShieldCheck size={16} />}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="भैपरी आउने बिदा (Casual)"
                  type="number"
                  value={accumulatedData.casual}
                  onChange={e => setAccumulatedData({...accumulatedData, casual: Number(e.target.value)})}
                  min={0}
                />
                <Input
                  label="बिरामी बिदा (Sick)"
                  type="number"
                  value={accumulatedData.sick}
                  onChange={e => setAccumulatedData({...accumulatedData, sick: Number(e.target.value)})}
                  min={0}
                />
                <Input
                  label="पर्व बिदा (Festival)"
                  type="number"
                  value={accumulatedData.festival}
                  onChange={e => setAccumulatedData({...accumulatedData, festival: Number(e.target.value)})}
                  min={0}
                />
                <Input
                  label="घर बिदा (Home)"
                  type="number"
                  value={accumulatedData.home}
                  onChange={e => setAccumulatedData({...accumulatedData, home: Number(e.target.value)})}
                  min={0}
                />
                <Input
                  label="अन्य (Other)"
                  type="number"
                  value={accumulatedData.other}
                  onChange={e => setAccumulatedData({...accumulatedData, other: Number(e.target.value)})}
                  min={0}
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-2">
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
                  {isSaving ? 'सुरक्षित हुँदैछ...' : 'सुरक्षित गर्नुहोस्'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Application Modal */}
      {viewApplication && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto print:bg-white print:p-0 print:static print:block">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 my-8 print:my-0 print:shadow-none print:rounded-none print:max-w-none">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10 print:hidden">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <FileText size={18} className="text-primary-600"/>
                बिदाको माग फारम (Leave Request Form)
              </h3>
              <button onClick={() => setViewApplication(null)} className="text-slate-400 hover:text-red-500 transition-colors print:hidden">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[80vh] print:max-h-none print:overflow-visible print:p-0">
              <div className="print:block">
                <BidaMaagFaram 
                  application={viewApplication} 
                  currentUser={currentUser}
                  accumulatedLeave={leaveBalances.find(b => b.userId === viewApplication.userId) || {
                    casual: 0, sick: 0, festival: 0, home: 0, other: 0
                  }}
                  organizationName={currentUser?.organizationName}
                />
              </div>
              
              <div className="mt-6 flex justify-end gap-3 border-t pt-4 print:hidden">
                  <button 
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2"
                  >
                    <Printer size={18} />
                    प्रिन्ट (Print)
                  </button>
                  {isAdmin && viewApplication.status === 'Pending' && (
                    <>
                      <button 
                        onClick={() => {
                          const reason = prompt('अस्वीकृत गर्नुको कारण (Rejection Reason):');
                          if (reason) {
                              onUpdateLeaveStatus(viewApplication.id, 'Rejected', reason);
                              setViewApplication(null);
                          }
                        }}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2"
                      >
                        <XCircle size={18} />
                        अस्वीकृत गर्नुहोस्
                      </button>
                      <button 
                        onClick={() => {
                          onUpdateLeaveStatus(viewApplication.id, 'Approved');
                          setViewApplication(null);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <Check size={18} />
                        स्वीकृत गर्नुहोस्
                      </button>
                    </>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Approval Section - Show pending ones on Apply tab, or all on Applications tab */}
      {isAdmin && (activeTab === 'applications' || pendingApplications.length > 0) && (
        <div className={`bg-white p-6 rounded-xl border shadow-sm mb-6 ${activeTab === 'apply' ? 'border-orange-200' : 'border-slate-200'}`}>
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            {activeTab === 'apply' ? (
              <>
                <CheckCircle2 size={20} className="text-orange-500"/>
                स्वीकृतिको लागि प्राप्त बिदा आवेदनहरू (Pending Approvals)
              </>
            ) : (
              <>
                <List size={20} className="text-primary-600"/>
                सबै बिदा आवेदनहरू (All Leave Applications)
              </>
            )}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="p-3">मिति</th>
                  <th className="p-3">कर्मचारी</th>
                  <th className="p-3">बिदाको प्रकार</th>
                  <th className="p-3">अवधि</th>
                  <th className="p-3">{activeTab === 'apply' ? 'कारण' : 'अवस्था'}</th>
                  <th className="p-3 text-right">कार्य</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(activeTab === 'apply' ? pendingApplications : leaveApplications).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 italic">कुनै आवेदन फेला परेन।</td>
                  </tr>
                ) : (
                  (activeTab === 'apply' ? pendingApplications : leaveApplications).map(app => (
                    <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3">{app.appliedDate}</td>
                      <td className="p-3">
                        <div className="font-medium text-slate-800">{app.employeeName}</div>
                        <div className="text-xs text-slate-500">{app.designation}</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium border border-blue-100">
                          {app.leaveType}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="text-slate-700">{app.startDate} देखि</div>
                        <div className="text-slate-700">{app.endDate} सम्म</div>
                      </td>
                      <td className="p-3">
                        {activeTab === 'apply' ? (
                           <div className="max-w-xs truncate text-slate-600" title={app.reason}>{app.reason}</div>
                        ) : (
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            app.status === 'Approved' ? 'bg-green-100 text-green-700' :
                            app.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            {app.status === 'Approved' ? 'स्वीकृत' : app.status === 'Rejected' ? 'अस्वीकृत' : 'पेन्डिङ'}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setViewApplication(app)}
                            className="p-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                            title="हेर्नुहोस् (View)"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            onClick={() => { setViewApplication(app); setTimeout(() => window.print(), 300); }}
                            className="p-1.5 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors"
                            title="प्रिन्ट गर्नुहोस् (Print)"
                          >
                            <Printer size={16} />
                          </button>
                          {app.status === 'Pending' && (
                            <>
                              <button 
                                onClick={() => onUpdateLeaveStatus(app.id, 'Approved')}
                                className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                                title="स्वीकृत गर्नुहोस् (Approve)"
                              >
                                <Check size={16} />
                              </button>
                              <button 
                                onClick={() => {
                                  const reason = prompt('अस्वीकृत गर्नुको कारण (Rejection Reason):');
                                  if (reason) onUpdateLeaveStatus(app.id, 'Rejected', reason);
                                }}
                                className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                                title="अस्वीकृत गर्नुहोस् (Reject)"
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'apply' && (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
              <Input 
                label="कर्मचारीको नाम" 
                value={formData.employeeName} 
                onChange={e => setFormData({...formData, employeeName: e.target.value})} 
                required 
                readOnly
                className="bg-slate-50"
              />
              <Input 
                label="पद" 
                value={formData.designation} 
                onChange={e => setFormData({...formData, designation: e.target.value})} 
                required 
                readOnly
                className="bg-slate-50"
              />
              
              <Select
                label="बिदाको प्रकार"
                value={formData.leaveType}
                onChange={e => setFormData({...formData, leaveType: e.target.value})}
                options={[
                  { id: 'casual', value: 'Casual', label: 'भैपरी आउने बिदा (Casual Leave)' },
                  { id: 'sick', value: 'Sick', label: 'बिरामी बिदा (Sick Leave)' },
                  { id: 'festival', value: 'Festival', label: 'पर्व बिदा (Festival Leave)' },
                  { id: 'home', value: 'Home', label: 'घर बिदा (Home Leave)' },
                  { id: 'other', value: 'Other', label: 'अन्य (Other)' },
                ]}
              />

              <div className="grid grid-cols-2 gap-4">
                <NepaliDatePicker
                  label="देखि (From Date)"
                  value={formData.startDate}
                  onChange={val => setFormData({...formData, startDate: val})}
                  required
                />
                <NepaliDatePicker
                  label="सम्म (To Date)"
                  value={formData.endDate}
                  onChange={val => setFormData({...formData, endDate: val})}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-1">कारण (Reason)</label>
                <textarea
                  value={formData.reason}
                  onChange={e => setFormData({...formData, reason: e.target.value})}
                  className="w-full p-3 rounded-lg border border-slate-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all"
                  rows={4}
                  required
                  placeholder="बिदा बस्नु पर्ने कारण उल्लेख गर्नुहोस्..."
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg shadow-sm transition-all active:scale-95 font-medium"
                >
                  <Save size={18} />
                  <span>पेश गर्नुहोस् (Submit)</span>
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
             <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b pb-2">
               <FileText size={18} className="text-primary-600"/>
               बिदाको सञ्चित अवस्था
             </h3>
             <div className="space-y-3">
               <div className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100">
                 <span className="text-sm text-slate-600">भैपरी आउने बिदा</span>
                 <span className="font-bold text-slate-800">{myBalance.casual} दिन</span>
               </div>
               <div className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100">
                 <span className="text-sm text-slate-600">बिरामी बिदा</span>
                 <span className="font-bold text-slate-800">{myBalance.sick} दिन</span>
               </div>
               <div className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100">
                 <span className="text-sm text-slate-600">पर्व बिदा</span>
                 <span className="font-bold text-slate-800">{myBalance.festival} दिन</span>
               </div>
               <div className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100">
                 <span className="text-sm text-slate-600">घर बिदा</span>
                 <span className="font-bold text-slate-800">{myBalance.home} दिन</span>
               </div>
               <div className="mt-4 pt-3 border-t border-slate-100">
                 <p className="text-xs text-slate-500 italic text-center">
                   * यो विवरण अन्तिम अपडेट अनुसार हो।
                 </p>
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
