import React, { useState } from 'react';
import { User, UserManagementProps, UserRole, Option } from '../types';
import { Plus, Trash2, Shield, User as UserIcon, Building2, Save, X, Phone, Briefcase, IdCard, Users, Pencil, CheckSquare, Square, ChevronDown, ChevronRight, CornerDownRight, Store } from 'lucide-react';
import { Input } from './Input';
import { Select } from './Select';

// Define the structure for permissions matching Dashboard's menu
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
            { id: 'form_suchikaran', label: 'फर्म सुचीकरण (Firm Listing)' },
            { id: 'quotation', label: 'सामानको कोटेशन (Quotation)' },
            { id: 'mag_faram', label: 'माग फारम (Demand Form)' },
            { id: 'kharid_adesh', label: 'खरिद आदेश (Purchase Order)' },
            { id: 'nikasha_pratibedan', label: 'निकासा प्रतिवेदन (Issue Report)' },
            { id: 'jinshi_maujdat', label: 'जिन्सी मौज्दात (Inventory Stock)' }, 
            { id: 'sahayak_jinshi_khata', label: 'सहायक जिन्सी खाता (Sub. Ledger)' },
            { id: 'jinshi_khata', label: 'जिन्सी खाता (Inventory Ledger)' },
            { id: 'dakhila_pratibedan', label: 'दाखिला प्रतिवेदन (Entry Report)' },
            { id: 'jinshi_firta_khata', label: 'जिन्सी फिर्ता खाता (Return Ledger)' },
            { id: 'marmat_adesh', label: 'मर्मत आवेदन/आदेश (Maintenance)' },
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
    // Settings children need to be handled specially in Dashboard.tsx, but listed here for context
    { 
        id: 'settings', 
        label: 'सेटिङ (Settings)',
        children: [
            { id: 'general_setting', label: 'सामान्य सेटिङ (General Setting)' },
            { id: 'store_setup', label: 'स्टोर सेटअप (Store Setup)' }, // New: Store setup
            { id: 'user_management', label: 'प्रयोगकर्ता सेटअप (User Setup)' },
            { id: 'change_password', label: 'पासवर्ड परिवर्तन (Change Password)' },
            { id: 'database_management', label: 'डाटाबेस व्यवस्थापन (Database Management)' },
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
  
  // Track which sections are expanded in the permission tree (UI only)
  const [expandedPermissions, setExpandedPermissions] = useState<string[]>(['services', 'inventory', 'report']);

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
    organizationName: '',
    role: 'STAFF',
    allowedMenus: ['dashboard']
  });

  // Roles available for ADMIN to create
  const availableRoles: Option[] = [
    { id: 'staff', value: 'STAFF', label: 'कर्मचारी (Staff)' },
    { id: 'storekeeper', value: 'STOREKEEPER', label: 'जिन्सी शाखा (Storekeeper)' },
    { id: 'account', value: 'ACCOUNT', label: 'लेखा शाखा (Account)' },
    { id: 'approval', value: 'APPROVAL', label: 'स्वीकृत गर्ने (Approval/Head)' },
  ];

  // Determine what role the current user can create
  const canManageUsers = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN';

  // Filter users that this user can manage
  const managedUsers = users.filter(u => {
    if (currentUser.role === 'SUPER_ADMIN') {
      return u.role === 'ADMIN'; // Super Admin manages Admins
    }
    if (currentUser.role === 'ADMIN') {
      // Admin manages Staff of their own organization
      return ['STAFF', 'STOREKEEPER', 'ACCOUNT', 'APPROVAL'].includes(u.role) && u.organizationName === currentUser.organizationName;
    }
    return false;
  });

  const getDefaultMenusForRole = (role: UserRole): string[] => {
      let menus = ['dashboard'];
      // Define broad defaults, but allow editing
      if (role === 'STOREKEEPER') {
         // Add inventory and report parents + all their children
         const inv = PERMISSION_STRUCTURE.find(p => p.id === 'inventory');
         const rep = PERMISSION_STRUCTURE.find(p => p.id === 'report');
         if (inv) menus.push(inv.id, ...inv.children.map(c => c.id));
         if (rep) menus.push(rep.id, ...rep.children.map(c => c.id));
         // Also add store_setup for storekeeper if needed, but per current rules, only Admin manages stores
      } else if (role === 'ACCOUNT' || role === 'APPROVAL') {
         const inv = PERMISSION_STRUCTURE.find(p => p.id === 'inventory');
         if (inv) menus.push(inv.id, ...inv.children.map(c => c.id));
      }
      return menus;
  };

  const resetForm = () => {
      setFormData({ 
        username: '', 
        password: '', 
        fullName: '', 
        designation: '', 
        phoneNumber: '',
        organizationName: currentUser.role === 'ADMIN' ? currentUser.organizationName : '',
        role: 'STAFF',
        allowedMenus: ['dashboard']
      });
      setEditingId(null);
  };

  const handleAddNew = () => {
      resetForm();
      setShowForm(true);
  };

  const handleEditClick = (user: User) => {
      setEditingId(user.id);
      setFormData({
          username: user.username,
          password: user.password,
          fullName: user.fullName,
          designation: user.designation,
          phoneNumber: user.phoneNumber,
          organizationName: user.organizationName,
          role: user.role,
          allowedMenus: user.allowedMenus || ['dashboard']
      });
      setShowForm(true);
  };

  const handleRoleChange = (newRole: UserRole) => {
      const newPermissions = editingId ? formData.allowedMenus : getDefaultMenusForRole(newRole);
      setFormData(prev => ({
          ...prev,
          role: newRole,
          allowedMenus: newPermissions
      }));
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

  // When clicking a parent checkbox, toggle all children
  const toggleParentPermission = (parentId: string, childrenIds: string[]) => {
      const isParentChecked = formData.allowedMenus.includes(parentId);
      
      setFormData(prev => {
          let newMenus = [...prev.allowedMenus];
          
          if (isParentChecked) {
              // Uncheck parent and all children
              newMenus = newMenus.filter(id => id !== parentId && !childrenIds.includes(id));
          } else {
              // Check parent and all children
              // First, remove existing to avoid duplicates, then add all
              newMenus = newMenus.filter(id => id !== parentId && !childrenIds.includes(id));
              newMenus.push(parentId, ...childrenIds);
          }
          return { ...prev, allowedMenus: newMenus };
      });
  };

  const toggleExpanded = (id: string) => {
      setExpandedPermissions(prev => 
          prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageUsers) return;

    let roleToAssign: UserRole = 'STAFF';
    if (currentUser.role === 'SUPER_ADMIN') {
      roleToAssign = 'ADMIN';
    } else {
      roleToAssign = formData.role;
    }
    
    // Ensure dashboard is always there
    const finalMenus = Array.from(new Set([...formData.allowedMenus, 'dashboard']));

    if (editingId) {
        // Update existing
        const updatedUser: User = {
            id: editingId,
            username: formData.username,
            password: formData.password,
            role: roleToAssign,
            fullName: formData.fullName,
            designation: formData.designation,
            phoneNumber: formData.phoneNumber,
            organizationName: formData.organizationName,
            allowedMenus: finalMenus
        };
        onUpdateUser(updatedUser);
    } else {
        // Create new
        const userToAdd: User = {
            id: Date.now().toString(),
            username: formData.username,
            password: formData.password,
            role: roleToAssign,
            fullName: formData.fullName,
            designation: formData.designation,
            phoneNumber: formData.phoneNumber,
            organizationName: formData.organizationName,
            allowedMenus: finalMenus
        };
        onAddUser(userToAdd);
    }

    setShowForm(false);
    resetForm();
  };

  if (!canManageUsers) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <Shield size={48} className="mb-4 text-slate-300" />
        <h3 className="text-lg font-medium">पहुँच अस्वीकृत (Access Denied)</h3>
        <p className="text-sm">तपाईंलाई प्रयोगकर्ता व्यवस्थापन गर्ने अनुमति छैन।</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-nepali">प्रयोगकर्ता व्यवस्थापन (User Management)</h2>
          <p className="text-sm text-slate-500">
            {currentUser.role === 'SUPER_ADMIN' 
              ? 'नयाँ संस्थाको एडमिन सिर्जना गर्नुहोस्' 
              : 'तपाईंको संस्थाको कर्मचारी तथा शाखा प्रमुखहरु सिर्जना गर्नुहोस्'}
          </p>
        </div>
        {!showForm && (
          <button 
            onClick={handleAddNew}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            <span className="font-nepali">
              {currentUser.role === 'SUPER_ADMIN' ? 'नयाँ एडमिन (New Admin)' : 'नयाँ प्रयोगकर्ता (New User)'}
            </span>
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-2">
            <h3 className="font-semibold text-slate-700">
                {editingId ? 'प्रयोगकर्ता विवरण सच्याउनुहोस् (Edit User)' : 'नयाँ प्रयोगकर्ता विवरण (New User)'}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-x-6 gap-y-4">
            
            <div className="md:col-span-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">व्यक्तिगत विवरण (Personal Details)</h4>
            </div>

            <Input 
              label="पूरा नाम (Full Name)"
              value={formData.fullName}
              onChange={e => setFormData({...formData, fullName: e.target.value})}
              required
              placeholder="e.g. Ram Bahadur Thapa"
              icon={<IdCard size={16} />}
            />
            
            <Input 
              label="पद (Designation)"
              value={formData.designation}
              onChange={e => setFormData({...formData, designation: e.target.value})}
              required
              placeholder="e.g. Store Keeper"
              icon={<Briefcase size={16} />}
            />

            <Input 
              label="फोन नं. (Phone Number)"
              value={formData.phoneNumber}
              onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
              required
              placeholder="e.g. 9841XXXXXX"
              icon={<Phone size={16} />}
            />

            <Input 
              label="संस्थाको नाम (Organization Name)"
              value={formData.organizationName}
              onChange={e => setFormData({...formData, organizationName: e.target.value})}
              required
              readOnly={currentUser.role === 'ADMIN'}
              className={currentUser.role === 'ADMIN' ? 'bg-slate-50 text-slate-500' : ''}
              placeholder="e.g. City Hospital"
              icon={<Building2 size={16} />}
            />

            <div className="md:col-span-2 mt-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">खाता विवरण (Account Details)</h4>
            </div>

             {/* Role Selection - Only for Admin */}
             {currentUser.role === 'ADMIN' && (
               <Select
                  label="भूमिका (Role)"
                  value={formData.role}
                  onChange={e => handleRoleChange(e.target.value as UserRole)}
                  options={availableRoles}
                  icon={<Users size={16} />}
               />
             )}

            <Input 
              label="प्रयोगकर्ताको नाम (Username)"
              value={formData.username}
              onChange={e => setFormData({...formData, username: e.target.value})}
              required
              placeholder="e.g. store1"
              icon={<UserIcon size={16} />}
            />
            <Input 
              label="पासवर्ड (Password)"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
              required
              type="password"
              placeholder="••••••"
            />
            
            {/* Permissions Section */}
            {(formData.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') && (
                <div className="md:col-span-2 mt-2 bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <Shield size={16} className="text-primary-600"/>
                        अनुमतिहरू (Access Permissions)
                    </h4>
                    
                    <div className="space-y-3">
                        {PERMISSION_STRUCTURE.map((group) => {
                            const isGroupChecked = formData.allowedMenus.includes(group.id);
                            const isExpanded = expandedPermissions.includes(group.id);
                            const childrenIds = group.children.map(c => c.id);
                            
                            // Check if all children are checked
                            const allChildrenChecked = childrenIds.every(id => formData.allowedMenus.includes(id));
                            // Check if some but not all children are checked
                            const someChildrenChecked = childrenIds.some(id => formData.allowedMenus.includes(id)) && !allChildrenChecked;

                            return (
                                <div key={group.id} className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                                    {/* Parent Header */}
                                    <div className="flex items-center justify-between p-3 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <button 
                                                type="button" 
                                                onClick={() => toggleExpanded(group.id)}
                                                className="text-slate-400 hover:text-slate-600 focus:outline-none"
                                            >
                                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                            </button>
                                            
                                            <div 
                                                onClick={() => toggleParentPermission(group.id, childrenIds)}
                                                className="flex items-center gap-2 cursor-pointer"
                                            >
                                                <div className={`
                                                    ${isGroupChecked || allChildrenChecked ? 'text-primary-600' : 'text-slate-300'}
                                                `}>
                                                    {allChildrenChecked ? <CheckSquare size={18} /> : (
                                                        someChildrenChecked ? <div className="w-[18px] h-[18px] bg-primary-100 border-2 border-primary-600 rounded flex items-center justify-center"><div className="w-2 h-2 bg-primary-600 rounded-sm"></div></div> :
                                                        <Square size={18} />
                                                    )}
                                                </div>
                                                <span className="font-medium text-slate-700 text-sm">{group.label}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Children */}
                                    {isExpanded && (
                                        <div className="border-t border-slate-100 p-2 pl-4 bg-white grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {group.children.map(child => {
                                                const isChildChecked = formData.allowedMenus.includes(child.id);
                                                // Handle special case for store_setup which might not be under inventory in menu structure
                                                if (child.id === 'store_setup') {
                                                    const isSuperOrAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN';
                                                    if (!isSuperOrAdmin) return null; // Only show to super/admin
                                                }
                                                return (
                                                    <div 
                                                        key={child.id}
                                                        onClick={() => togglePermission(child.id)}
                                                        className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer ml-4"
                                                    >
                                                        <div className="text-slate-300">
                                                            <CornerDownRight size={14} />
                                                        </div>
                                                        <div className={isChildChecked ? 'text-primary-600' : 'text-slate-300'}>
                                                            {isChildChecked ? <CheckSquare size={16} /> : <Square size={16} />}
                                                        </div>
                                                        <span className={`text-sm ${isChildChecked ? 'text-slate-800' : 'text-slate-500'}`}>
                                                            {child.label}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    
                    <p className="text-xs text-slate-400 mt-3">
                        * ड्यासबोर्ड (Dashboard) र सुरक्षा (Security) सबै प्रयोगकर्ताहरूको लागि उपलब्ध छ।
                    </p>
                </div>
            )}

            <div className="md:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
              <button 
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
              >
                रद्द गर्नुहोस् (Cancel)
              </button>
              <button 
                type="submit"
                className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 text-sm font-medium shadow-sm"
              >
                <Save size={16} />
                {editingId ? 'अपडेट गर्नुहोस् (Update)' : 'सुरक्षित गर्नुहोस् (Save)'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* User List Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-700">प्रयोगकर्ता (User)</th>
              <th className="px-6 py-4 font-semibold text-slate-700">पद (Designation)</th>
              <th className="px-6 py-4 font-semibold text-slate-700">सम्पर्क (Contact)</th>
              <th className="px-6 py-4 font-semibold text-slate-700">भूमिका (Role)</th>
              <th className="px-6 py-4 font-semibold text-slate-700">संस्था (Organization)</th>
              <th className="px-6 py-4 font-semibold text-slate-700 text-right">कार्य (Action)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {managedUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500 italic">
                  कुनै डाटा छैन (No users found)
                </td>
              </tr>
            ) : (
              managedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold uppercase text-xs">
                        {user.username.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">{user.fullName}</div>
                        <div className="text-xs text-slate-500">@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{user.designation}</td>
                  <td className="px-6 py-4 text-slate-600 font-mono text-xs">{user.phoneNumber}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                      ${user.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-100' : 
                        user.role === 'STOREKEEPER' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                        user.role === 'ACCOUNT' ? 'bg-green-50 text-green-700 border-green-100' :
                        'bg-blue-50 text-blue-700 border-blue-100'}
                    `}>
                      {user.role === 'STOREKEEPER' ? 'STORE KEEPER' : user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{user.organizationName}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                        <button 
                            onClick={() => handleEditClick(user)}
                            className="text-primary-400 hover:text-primary-600 p-1 rounded hover:bg-primary-50 transition-colors"
                            title="Edit User"
                        >
                            <Pencil size={16} />
                        </button>
                        <button 
                            onClick={() => onDeleteUser(user.id)}
                            className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                            title="Delete User"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};