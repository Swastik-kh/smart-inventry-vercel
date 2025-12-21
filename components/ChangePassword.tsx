import React, { useState, useMemo } from 'react';
import { User } from '../types';
import { Input } from './Input';
import { Select } from './Select';
import { KeyRound, Save, AlertCircle, CheckCircle2, Lock, UserCog, ShieldAlert } from 'lucide-react';

interface ChangePasswordProps {
  currentUser: User;
  users: User[];
  onChangePassword: (userId: string, newPassword: string) => void;
}

export const ChangePassword: React.FC<ChangePasswordProps> = ({ currentUser, users, onChangePassword }) => {
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

  // State for Super Admin Mode
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  
  // Shared State
  const [formData, setFormData] = useState({
    currentPassword: '', // Only for self-change
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Prepare User Options for Super Admin
  const userOptions = useMemo(() => {
    return users.map(u => ({
      id: u.id,
      value: u.id,
      label: `${u.fullName} (${u.username}) - ${u.role}`
    }));
  }, [users]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // 1. Validation
    if (isSuperAdmin) {
       if (!selectedUserId) {
         setError('कृपया प्रयोगकर्ता छान्नुहोस् (Please select a user)');
         return;
       }
    } else {
       if (!formData.currentPassword) {
         setError('हालको पासवर्ड आवश्यक छ (Current password is required)');
         return;
       }
       // Verify old password for non-super-admins
       if (formData.currentPassword !== currentUser.password) {
         setError('हालको पासवर्ड मिलेन (Current password incorrect)');
         return;
       }
    }

    if (!formData.newPassword || !formData.confirmPassword) {
      setError('कृपया नयाँ पासवर्ड भर्नुहोस् (Please fill new password fields)');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('नयाँ पासवर्ड मेल खाएन (New passwords do not match)');
      return;
    }

    // 2. Perform Action
    const targetUserId = isSuperAdmin ? selectedUserId : currentUser.id;
    const targetUser = users.find(u => u.id === targetUserId);

    if (!targetUser) {
        setError('प्रयोगकर्ता फेला परेन (User not found)');
        return;
    }

    onChangePassword(targetUserId, formData.newPassword);
    
    setSuccess(
      isSuperAdmin 
        ? `${targetUser.username} को पासवर्ड रिसेट भयो (Password reset successfully for ${targetUser.username})`
        : 'तपाईंको पासवर्ड सफलतापूर्वक परिवर्तन भयो (Your password changed successfully)'
    );

    // Reset Form
    setFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    // Keep selected user for Super Admin to possibly reset another, or clear it? Let's keep it.
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800 font-nepali flex items-center gap-2">
          {isSuperAdmin ? <UserCog className="text-primary-600" /> : <KeyRound className="text-primary-600" />}
          {isSuperAdmin ? 'पासवर्ड रिसेट (Password Reset)' : 'सुरक्षा सेटअप (Security Setup)'}
        </h2>
        <p className="text-sm text-slate-500 mt-1 ml-8">
          {isSuperAdmin 
            ? 'प्रयोगकर्ताको पासवर्ड रिसेट गर्नुहोस् (Reset User Password)' 
            : 'आफ्नो खाताको पासवर्ड परिवर्तन गर्नुहोस् (Change your account password)'}
        </p>
      </div>

      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
        {error && (
          <div className="mb-6 bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200 flex items-center gap-2 animate-pulse">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 text-green-600 text-sm p-3 rounded-lg border border-green-200 flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {isSuperAdmin && (
             <div className="bg-slate-50 p-6 rounded-lg border border-slate-100 space-y-4">
                <div className="flex items-start gap-3">
                   <ShieldAlert className="text-primary-600 shrink-0 mt-1" size={20} />
                   <div>
                      <h3 className="font-semibold text-slate-800 text-sm">Super Admin Authority</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        You can reset password for any user without knowing their current password.
                      </p>
                   </div>
                </div>
                
                <Select
                  label="प्रयोगकर्ता छान्नुहोस् (Select User)"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  options={userOptions}
                  placeholder="-- प्रयोगकर्ता छान्नुहोस् --"
                  icon={<UserCog size={16} />}
                />
             </div>
          )}

          {!isSuperAdmin && (
             <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-6">
                  <p className="text-sm text-slate-600 mb-1">प्रयोगकर्ता (Username)</p>
                  <p className="font-semibold text-slate-800 text-lg">{currentUser.username}</p>
                </div>

                <Input
                  label="हालको पासवर्ड (Current Password)"
                  type="password"
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
                  placeholder="••••••"
                  icon={<Lock size={16} />}
                />
                
                <div className="border-t border-slate-100 my-4"></div>
             </div>
          )}

          <div className="space-y-4">
            <Input
              label="नयाँ पासवर्ड (New Password)"
              type="password"
              value={formData.newPassword}
              onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
              placeholder="••••••"
              icon={<KeyRound size={16} />}
            />

            <Input
              label="नयाँ पासवर्ड पुनः पुष्टि गर्नुहोस् (Confirm New Password)"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              placeholder="••••••"
              icon={<KeyRound size={16} />}
            />
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className={`flex items-center gap-2 text-white px-6 py-2.5 rounded-lg transition-colors shadow-sm font-medium ${
                isSuperAdmin ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700'
              }`}
            >
              <Save size={18} />
              {isSuperAdmin ? 'पासवर्ड रिसेट गर्नुहोस् (Reset Password)' : 'पासवर्ड परिवर्तन गर्नुहोस् (Change Password)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};