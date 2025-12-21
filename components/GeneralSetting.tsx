
import React, { useState, useEffect } from 'react';
import { Save, Building2, Globe, Phone, Mail, FileText, Percent, Calendar, RotateCcw, Image, CheckCircle2 } from 'lucide-react';
import { Input } from './Input';
import { Select } from './Select';
import { FISCAL_YEARS } from '../constants';
import { OrganizationSettings } from '../types';

interface GeneralSettingProps {
    settings: OrganizationSettings;
    onUpdateSettings: (settings: OrganizationSettings) => void;
}

export const GeneralSetting: React.FC<GeneralSettingProps> = ({ settings, onUpdateSettings }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
      setLocalSettings(settings);
  }, [settings]);

  const handleChange = (field: string, value: string) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
    setIsSaved(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(localSettings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleReset = () => {
    if(window.confirm('के तपाइँ सेटिङहरू रिसेट गर्न चाहनुहुन्छ?')) {
        // Here we could reset to default constant if available, 
        // or just revert to passed props 'settings'
        setLocalSettings(settings);
        setIsSaved(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <div className="bg-slate-800 p-2 rounded-lg text-white">
          <Building2 size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-nepali">सामान्य सेटिङ (General Settings)</h2>
          <p className="text-sm text-slate-500">संस्थाको विवरण र प्रणाली कन्फिगरेसन व्यवस्थापन गर्नुहोस्</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column: Organization Profile */}
        <div className="xl:col-span-2 space-y-6">
            
            {/* Organization Details Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Building2 size={18} className="text-primary-600"/> 
                    संस्थाको विवरण (Organization Profile)
                    <span className="text-xs font-normal text-slate-400 ml-auto bg-slate-50 px-2 py-1 rounded">
                        * यो विवरण रिपोर्टको हेडरमा प्रयोग हुन्छ
                    </span>
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                    <Input 
                        label="१. मुख्य नाम / हेडिङ (Heading 1)" 
                        value={localSettings.orgNameNepali} 
                        onChange={(e) => handleChange('orgNameNepali', e.target.value)}
                        placeholder="उदा: नेपाल सरकार / चौदण्डीगढी नगरपालिका"
                        required
                        className="font-bold text-slate-800"
                    />
                    <Input 
                        label="२. उप-शीर्षक १ (Heading 2)" 
                        value={localSettings.subTitleNepali} 
                        onChange={(e) => handleChange('subTitleNepali', e.target.value)}
                        placeholder="उदा: स्वास्थ्य मन्त्रालय / नगरकार्यपालिकाको कार्यालय"
                    />
                    <Input 
                        label="३. उप-शीर्षक २ (Heading 3)" 
                        value={localSettings.subTitleNepali2 || ''} 
                        onChange={(e) => handleChange('subTitleNepali2', e.target.value)}
                        placeholder="उदा: स्वास्थ्य सेवा विभाग / स्वास्थ्य शाखा"
                    />
                    <Input 
                        label="४. उप-शीर्षक ३ (Heading 4 - Office Name)" 
                        value={localSettings.subTitleNepali3 || ''} 
                        onChange={(e) => handleChange('subTitleNepali3', e.target.value)}
                        placeholder="उदा: व्यवस्थापन महाशाखा / आधारभूत नगर अस्पताल"
                    />
                </div>

                <hr className="my-4 border-slate-100" />
                
                <div className="grid md:grid-cols-2 gap-4">
                    <Input 
                        label="संस्थाको नाम (अंग्रेजीमा)" 
                        value={localSettings.orgNameEnglish} 
                        onChange={(e) => handleChange('orgNameEnglish', e.target.value)}
                        placeholder="e.g. Chaudandigadhi Municipality"
                    />
                    <Input 
                        label="ठेगाना (Address)" 
                        value={localSettings.address} 
                        onChange={(e) => handleChange('address', e.target.value)}
                        placeholder="उदा: बेल्टार, उदयपुर"
                        required
                    />
                </div>
                
                <div className="grid md:grid-cols-3 gap-4 mt-4">
                    <Input 
                        label="फोन नं." 
                        value={localSettings.phone} 
                        onChange={(e) => handleChange('phone', e.target.value)}
                        icon={<Phone size={16} />}
                    />
                    <Input 
                        label="ईमेल (Email)" 
                        value={localSettings.email} 
                        onChange={(e) => handleChange('email', e.target.value)}
                        icon={<Mail size={16} />}
                    />
                    <Input 
                        label="वेबसाइट (Website)" 
                        value={localSettings.website} 
                        onChange={(e) => handleChange('website', e.target.value)}
                        icon={<Globe size={16} />}
                    />
                </div>
                
                <div className="mt-4">
                    <Input 
                        label="स्थायी लेखा नं (PAN/VAT No)" 
                        value={localSettings.panNo} 
                        onChange={(e) => handleChange('panNo', e.target.value)}
                        placeholder="XXXXXXXXX"
                        className="font-mono tracking-wider"
                        icon={<FileText size={16} />}
                    />
                </div>
            </div>

            {/* System Configuration Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Globe size={18} className="text-primary-600"/> 
                    प्रणाली कन्फिगरेसन (System Configuration)
                </h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <Select 
                            label="सक्रिय आर्थिक वर्ष (Active Fiscal Year)"
                            options={FISCAL_YEARS}
                            value={localSettings.activeFiscalYear}
                            onChange={(e) => handleChange('activeFiscalYear', e.target.value)}
                            icon={<Calendar size={16} />}
                        />
                        <p className="text-xs text-slate-500">
                            * लगइन गर्दा देखिने डिफल्ट आर्थिक वर्ष।
                        </p>
                    </div>

                    <div className="space-y-4">
                        <Input 
                            label="डिफल्ट VAT दर (%)" 
                            type="number"
                            value={localSettings.defaultVatRate} 
                            onChange={(e) => handleChange('defaultVatRate', e.target.value)}
                            icon={<Percent size={16} />}
                        />
                        <p className="text-xs text-slate-500">
                            * खरिद आदेश र बिलहरूमा प्रयोग हुने डिफल्ट कर प्रतिशत।
                        </p>
                    </div>
                </div>
            </div>
        </div>

        {/* Right Column: Visual & Actions */}
        <div className="space-y-6">
            
            {/* Logo Settings */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Image size={18} className="text-primary-600"/> 
                    लोगो सेटिङ (Logo)
                </h3>
                
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-6 hover:bg-slate-50 transition-colors cursor-pointer group">
                    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                        <img 
                            src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png" 
                            alt="Nepal Emblem" 
                            className="w-16 h-16 object-contain opacity-80"
                        />
                    </div>
                    <span className="text-sm font-medium text-primary-600">नयाँ लोगो अपलोड गर्नुहोस्</span>
                    <span className="text-xs text-slate-400 mt-1">Recommended: 500x500px PNG</span>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-inner">
                <div className="flex flex-col gap-3">
                    <button 
                        type="submit"
                        className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white py-3 rounded-lg font-medium hover:bg-slate-900 transition-colors shadow-sm"
                    >
                        {isSaved ? <CheckCircle2 size={18} /> : <Save size={18} />}
                        {isSaved ? 'सुरक्षित भयो (Saved)' : 'सेटिङ सुरक्षित गर्नुहोस्'}
                    </button>
                    
                    <button 
                        type="button"
                        onClick={handleReset}
                        className="w-full flex items-center justify-center gap-2 bg-white text-red-600 border border-red-200 py-3 rounded-lg font-medium hover:bg-red-50 transition-colors"
                    >
                        <RotateCcw size={18} />
                        पूर्वावस्थामा फर्काउनुहोस् (Reset)
                    </button>
                </div>
                <p className="text-xs text-center text-slate-400 mt-4">
                    Last updated: {new Date().toLocaleDateString()}
                </p>
            </div>
        </div>

      </form>
    </div>
  );
};
