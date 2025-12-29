
import React, { useState } from 'react';
import { User, UserManagementProps, UserRole, Option } from '../types';
import { Plus, Trash2, Shield, User as UserIcon, Building2, Save, X, Phone, Briefcase, IdCard, Users, Pencil, CheckSquare, Square, ChevronDown, ChevronRight, CornerDownRight, Store } from 'lucide-react';
import { Input } from './Input';
import { Select } from './Select';

const PERMISSION_STRUCTURE = [
    { 
        id: 'services', 
        label: 'सेवा (Services)',
        children: [
            { id: 'tb_leprosy', label: 'क्षयरोग/कुष्ठरोग (TB/Leprosy)' },
            { id: 'rabies', label: 'रेबिज खोप क्लिनिक (Rabies Vaccine)' }
        ]
    },
    { 
        id: 'inventory', 
        label: 'जिन्सी व्यवस्थापन (Inventory)',
        children: [
            { id: 'stock_entry_approval', label: 'स्टक प्रविष्टि अनुरोध (Stock Requests)' },
            { id: 'jinshi_maujdat', label: 'जिन्सी मौज्दात (Inventory Stock)' }, 
            { id: 'form_suchikaran', label: 'फर्म सुचीकरण (Firm Listing)' },
            { id: 'quotation', label: 'सामानको कोटेशन (Quotation)' },
            { id: 'mag_faram', label: 'माग फारम (Demand Form)' },
            { id: 'kharid_adesh', label: 'खरिद आदेश (Purchase Order)' },
            { id: 'nikasha_pratibedan', label: 'निकासा प्रतिवेदन (Issue Report)' },
            { id: 'sahayak_jinshi_khata', label: 'सहायक जिन्सी खाता (Sub. Ledger)' },
            { id: 'jinshi_khata', label: 'जिन्सी खाता (Inventory Ledger)' },
            { id: 'dakhila_pratibedan', label: 'दाखिला प्रतिवेदन (Entry Report)' },
            { id: 'jinshi_firta_khata', label: 'जिन्सी फिर्ता खाता (Return Ledger)' },
            { id: 'marmat_adesh', label: 'मर्मत आवेदन/आदेश (Maintenance)' },
            { id: 'dhuliyauna_faram', label: 'लिलाम / धुल्याउने (Disposal)' },
            { id: 'log_book', label: 'लग बुक (Log Book)' },
        ]
    },
    { 
        id: 'report', 
        label: 'रिपोर्ट (Report)',
        children: [
            { id: 'report_tb_leprosy', label: 'क्षयरोग/कुष्ठरोग रिपोर्ट (TB/Leprosy)' },
            { id: 'report_rabies', label: 'रेबिज रिपोर्ट (Rabies Report)' },
            { id: 'report_inventory_monthly', label: 'जिन्सी मासिक प्रतिवेदन (Monthly Report)' }
        ]
    },
    { 
        id: 'settings', 
        label: 'सेटिङ (Settings)',
        children: [
            { id: 'general_setting', label: 'सामान्य सेटिङ (General Setting)' },
            { id: 'store_setup', label: 'स्टोर सेटअप (Store Setup)' },
            { id: 'database_management', label: 'डाटाबेस व्यवस्थापन (Database)' },
            { id: 'user_management', label: 'प्रयोगकर्ता सेटअप (User Setup)' },
            { id: 'change_password', label: 'पासवर्ड परिवर्तन (Change Password)' },
        ]
    }
];

export const UserManagement: React.FC<UserManagementProps> = ({ 
  currentUser, 
  users, 
  onAddUser,
  onUpdateUser,
  onDeleteUser 
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedPermissions, setExpandedPermissions] = useState<string[]>(['services', 'inventory', 'report', 'settings']);

  const [formData, setFormData] = useState<{
    username: string;
    password: string;
    fullName: string;
    designation: string;
    phoneNumber: string;
    organizationName: string;
    role: UserRole;
    allowedMenus: string[];
  }>({
    username: '',
    password: '',
    fullName: '',
    designation: '',
    phoneNumber: '',
    // Modified: Automatically set organizationName for ADMIN when creating new user
    organizationName: currentUser.role === 'ADMIN' ? currentUser.organizationName : '',
    role: 'STAFF',
    allowedMenus: ['dashboard']
  });

  const availableRoles: Option[] = [
    { id: 'staff', value: 'STAFF', label: 'कर्मचारी (Staff)' },
    { id: 'storekeeper', value: 'STOREKEEPER', label: 'जिन्सी शाखा (Storekeeper)' },
    { id: 'account', value: 'ACCOUNT', label: 'लेखा शाखा (Account)' },
    { id: 'approval', value: 'APPROVAL', label: 'स्वीकृत गर्ने (Approval/Head)' },
  ];

  const canManageUsers = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN';

  const managedUsers = users.filter(u => {
    if (currentUser.role === 'SUPER_ADMIN') return u.role === 'ADMIN';
    if (currentUser.role === 'ADMIN') return ['STAFF', 'STOREKEEPER', 'ACCOUNT', 'APPROVAL'].includes(u.role) && u.organizationName === currentUser.organizationName;
    return false;
  });

  const resetForm = () => {
      setFormData({ 
        username: '', password: '', fullName: '', designation: '', phoneNumber: '',
        organizationName: currentUser.role === 'ADMIN' ? currentUser.organizationName : '', // This ensures correct default on reset
        role: 'STAFF', allowedMenus: ['dashboard']
      });
      setEditingId(null);
  };

  const handleEditClick = (user: User) => {
      setEditingId(user.id);
      setFormData({
          username: user.username, password: user.password, fullName: user.fullName,
          designation: user.designation, phoneNumber: user.phoneNumber,
          organizationName: user.organizationName,
          role: user.role,
          allowedMenus: user.allowedMenus || ['dashboard']
      });
      setShowForm(true);
  };

  const togglePermission = (menuId: string) => {
      setFormData(prev => {
          const current = prev.allowedMenus;
          if (current.includes(menuId)) {
              return { ...prev, allowedMenus: current.filter(id => id !== menuId) };
          } else {
              return { ...prev, allowedMenus: [...current, menuId] };
          }
      });
  };

  const toggleParentPermission = (parentId: string, childrenIds: string[]) => {
      const isParentChecked = formData.allowedMenus.includes(parentId);
      setFormData(prev => {
          let newMenus = [...prev.allowedMenus];
          if (isParentChecked) {
              newMenus = newMenus.filter(id => id !== parentId && !childrenIds.includes(id));
          } else {
              newMenus = Array.from(new Set([...newMenus, parentId, ...childrenIds]));
          }
          return { ...prev, allowedMenus: newMenus };
      });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageUsers) return;
    const finalMenus = Array.from(new Set([...formData.allowedMenus, 'dashboard']));
    const userToSave: User = {
        id: editingId || Date.now().toString(),
        username: formData.username, password: formData.password,
        role: currentUser.role === 'SUPER_ADMIN' ? 'ADMIN' : formData.role, // SUPER_ADMIN can only create ADMINs
        fullName: formData.fullName, designation: formData.designation,
        phoneNumber: formData.phoneNumber, organizationName: formData.organizationName,
        allowedMenus: finalMenus
    };
    if (editingId) onUpdateUser(userToSave);
    else onAddUser(userToSave);
    setShowForm(false);
    resetForm();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-nepali">प्रयोगकर्ता व्यवस्थापन (User Management)</h2>
          <p className="text-sm text-slate-500">पहुँच अधिकार र प्रयोगकर्ता सेटअप</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 shadow-sm flex items-center gap-2"><Plus size={18} />नयाँ प्रयोगकर्ता</button>
        )}
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4">
          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-x-6 gap-y-4">
            <Input label="पूरा नाम" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} required icon={<IdCard size={16} />} />
            <Input label="पद" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} required icon={<Briefcase size={16} />} />
            <Input label="फोन नं." value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} required icon={<Phone size={16} />} />
            <Input 
                label="संस्था" 
                value={formData.organizationName} 
                onChange={e => setFormData({...formData, organizationName: e.target.value})} 
                required 
                readOnly={currentUser.role === 'ADMIN'} // ADMIN can't change their org when creating
                className={currentUser.role === 'ADMIN' ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''} 
                icon={<Building2 size={16} />} 
            />
            {currentUser.role === 'ADMIN' && <Select label="भूमिका" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})} options={availableRoles} icon={<Users size={16} />} />}
            <Input label="प्रयोगकर्ता नाम" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required icon={<UserIcon size={16} />} />
            <Input label="पासवर्ड" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required type="password" />

            <div className="md:col-span-2 mt-2 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><Shield size={16} className="text-primary-600"/>मेनु र सब-मेनु पहुँच अधिकार (Permissions)</h4>
                <div className="space-y-3">
                    {PERMISSION_STRUCTURE.map((group) => {
                        const childrenIds = group.children.map(c => c.id);
                        const allChildrenChecked = childrenIds.every(id => formData.allowedMenus.includes(id));
                        const someChildrenChecked = childrenIds.some(id => formData.allowedMenus.includes(id)) && !allChildrenChecked;
                        return (
                            <div key={group.id} className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                                <div className="flex items-center justify-between p-3 bg-slate-50/50">
                                    <div className="flex items-center gap-3">
                                        <button type="button" onClick={() => setExpandedPermissions(prev => prev.includes(group.id) ? prev.filter(x => x !== group.id) : [...prev, group.id])} className="text-slate-400"><ChevronDown size={16} /></button>
                                        <div onClick={() => toggleParentPermission(group.id, childrenIds)} className="flex items-center gap-2 cursor-pointer">
                                            <div className={allChildrenChecked ? 'text-primary-600' : 'text-slate-300'}>{allChildrenChecked ? <CheckSquare size={18} /> : (someChildrenChecked ? <div className="w-[18px] h-[18px] bg-primary-100 border-2 border-primary-600 rounded flex items-center justify-center"><div className="w-2 h-2 bg-primary-600 rounded-sm"></div></div> : <Square size={18} />)}</div>
                                            <span className="font-medium text-slate-700 text-sm">{group.label}</span>
                                        </div>
                                    </div>
                                </div>
                                {expandedPermissions.includes(group.id) && (
                                    <div className="border-t border-slate-100 p-2 pl-4 bg-white grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {group.children.map(child => (
                                            <div key={child.id} onClick={() => togglePermission(child.id)} className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer ml-4">
                                                <div className="text-slate-300"><CornerDownRight size={14} /></div>
                                                <div className={formData.allowedMenus.includes(child.id) ? 'text-primary-600' : 'text-slate-300'}>{formData.allowedMenus.includes(child.id) ? <CheckSquare size={16} /> : <Square size={16} />}</div>
                                                <span className={`text-sm ${formData.allowedMenus.includes(child.id) ? 'text-slate-800' : 'text-slate-500'}`}>{child.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">रद्द</button>
              <button type="submit" className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 text-sm shadow-sm flex items-center gap-2"><Save size={16} />{editingId ? 'अपडेट' : 'सुरक्षित'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b">
            <tr><th className="px-6 py-4">प्रयोगकर्ता</th><th className="px-6 py-4">भूमिका</th><th className="px-6 py-4">संस्था</th><th className="px-6 py-4 text-right">कार्य</th></tr>
          </thead>
          <tbody className="divide-y">
            {managedUsers.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-6 py-4"><div><p className="font-bold text-slate-800">{user.fullName}</p><p className="text-xs text-slate-400">@{user.username}</p></div></td>
                <td className="px-6 py-4"><span className="px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700 border border-indigo-100">{user.role}</span></td>
                <td className="px-6 py-4">{user.organizationName}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleEditClick(user)} className="text-primary-400 hover:text-primary-600"><Pencil size={18}/></button>
                    <button onClick={() => onDeleteUser(user.id)} className="text-red-400 hover:text-red-600"><Trash2 size={18}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
