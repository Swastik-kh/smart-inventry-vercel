
import React, { useState, useRef } from 'react';
import { Calendar, User, Lock, LogIn, Eye, EyeOff, Loader2, AlertCircle, Info, Code } from 'lucide-react';
import { Input } from './Input';
import { Select } from './Select';
import { FISCAL_YEARS } from '../constants';
import { LoginFormData, LoginFormProps } from '../types';

export const LoginForm: React.FC<LoginFormProps> = ({ users, onLoginSuccess, initialFiscalYear }) => {
  const [formData, setFormData] = useState<LoginFormData>({
    fiscalYear: initialFiscalYear || '2081/082',
    username: '',
    password: '',
  });

  const [errors, setErrors] = useState<Partial<LoginFormData & { form: string }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPasswordMsg, setShowForgotPasswordMsg] = useState(false);

  const passwordInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof LoginFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
    if (errors.form) {
      setErrors(prev => ({ ...prev, form: undefined }));
    }
  };

  const handleUsernameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      passwordInputRef.current?.focus();
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<LoginFormData> = {};
    if (!formData.fiscalYear) newErrors.fiscalYear = 'आर्थिक वर्ष छान्नुहोस् (Select Fiscal Year)';
    if (!formData.username.trim()) newErrors.username = 'प्रयोगकर्ता नाम आवश्यक छ (Username Required)';
    if (!formData.password) newErrors.password = 'पासवर्ड आवश्यक छ (Password Required)';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const foundUser = users.find(
        u => u.username.toLowerCase() === formData.username.trim().toLowerCase() && u.password === formData.password
      );

      if (foundUser) {
          onLoginSuccess(foundUser, formData.fiscalYear);
      } else {
          setErrors(prev => ({ 
              ...prev, 
              form: 'प्रयोगकर्ता नाम वा पासवर्ड मिलेन (Invalid Username or Password)' 
          }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, form: 'सिस्टममा समस्या आयो, पुनः प्रयास गर्नुहोस्' }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.form && (
        <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100 flex items-center gap-3 animate-pulse">
            <AlertCircle size={18} className="shrink-0" />
            <span className="font-medium">{errors.form}</span>
        </div>
      )}

      {showForgotPasswordMsg && (
        <div className="bg-blue-50 text-blue-700 text-sm p-4 rounded-xl border border-blue-100 flex items-start gap-3">
            <Info size={18} className="shrink-0 mt-0.5" />
            <span className="font-medium">कृपया सिस्टम एडमिनसँग सम्पर्क गरी पासवर्ड रिसेट गराउनुहोस्। (Contact Admin to reset)</span>
        </div>
      )}

      <div className="space-y-4">
        <Select
          label="आर्थिक वर्ष (Fiscal Year)"
          name="fiscalYear"
          value={formData.fiscalYear}
          onChange={handleChange}
          options={FISCAL_YEARS}
          error={errors.fiscalYear}
          icon={<Calendar size={18} />}
          className="font-nepali font-bold text-slate-700" 
        />

        <Input
          label="प्रयोगकर्ताको नाम (Username)"
          name="username"
          type="text"
          placeholder="Enter username"
          value={formData.username}
          onChange={handleChange}
          onKeyDown={handleUsernameKeyDown} 
          error={errors.username}
          icon={<User size={18} />}
        />

        <div className="relative">
          <Input
            ref={passwordInputRef} 
            label="पासवर्ड (Password)"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            icon={<Lock size={18} />}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-[38px] text-slate-400 hover:text-primary-600 p-1 rounded-full transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 cursor-pointer group select-none">
          <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
          <span className="text-slate-500 group-hover:text-slate-700 font-medium">सम्झिराख्नुहोस्</span>
        </label>
        <button 
          type="button" 
          onClick={() => setShowForgotPasswordMsg(!showForgotPasswordMsg)}
          className="text-primary-600 hover:text-primary-700 font-semibold transition-colors"
        >
          पासवर्ड भुल्नुभयो?
        </button>
      </div>

      <div className="space-y-4">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-primary-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-lg"
        >
          {isLoading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              <span>प्रक्रियामा छ...</span>
            </>
          ) : (
            <>
              <LogIn size={20} />
              <span>लगइन गर्नुहोस्</span>
            </>
          )}
        </button>

        <div className="text-center pt-2 space-y-2">
            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">
                Smart Inventory Management System
            </p>
            <div className="flex items-center justify-center gap-1.5 text-slate-400">
                <Code size={12} />
                <p className="text-[11px] font-medium italic">
                    Developed by: swastik khatiwada
                </p>
            </div>
        </div>
      </div>
    </form>
  );
};
