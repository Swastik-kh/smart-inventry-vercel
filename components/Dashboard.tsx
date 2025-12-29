
import React, { useState, useMemo } from 'react';
import { 
  LogOut, Menu, Calendar, Stethoscope, Package, FileText, Settings, LayoutDashboard, 
  ChevronDown, ChevronRight, Syringe, Activity, 
  ClipboardList, FileSpreadsheet, FilePlus, ShoppingCart, FileOutput, 
  BookOpen, Book, Archive, RotateCcw, Wrench, Scroll, BarChart3,
  Sliders, Store, ShieldCheck, Users, Database, KeyRound, UserCog, Lock, Warehouse, ClipboardCheck, Bell, X, CheckCircle2, ArrowRightCircle, AlertTriangle, Pill, Scissors, Clock, Calculator, Trash2, UsersRound, CalendarCheck, UserPlus, Droplets, Info, TrendingUp, AlertOctagon, Timer, Printer
} from 'lucide-react';
import { APP_NAME, ORG_NAME, FISCAL_YEARS } from '../constants';
import { DashboardProps, PurchaseOrderEntry, InventoryItem } from '../types'; 
import { UserManagement } from './UserManagement';
import { ChangePassword } from './ChangePassword';
import { TBPatientRegistration } from './TBPatientRegistration';
import { RabiesRegistration } from './RabiesRegistration';
import { RabiesReport } from './RabiesReport';
import { MagFaram } from './MagFaram';
import { KharidAdesh } from './KharidAdesh';
import { NikashaPratibedan } from './NikashaPratibedan';
import { FirmListing } from './FirmListing'; 
import { Quotation } from './Quotation'; 
import { JinshiMaujdat } from './JinshiMaujdat'; 
import { StoreSetup } from './StoreSetup'; 
import { InventoryMonthlyReport } from './InventoryMonthlyReport'; 
import { StockEntryApproval } from './StockEntryApproval'; 
import { DakhilaPratibedan } from './DakhilaPratibedan'; 
import { SahayakJinshiKhata } from './SahayakJinshiKhata'; 
import { JinshiFirtaFaram } from './JinshiFirtaFaram'; 
import { MarmatAdesh } from './MarmatAdesh';
import { JinshiKhata } from './JinshiKhata'; 
import { DatabaseManagement } from './DatabaseManagement';
import { DhuliyaunaFaram } from './DhuliyaunaFaram';
import { LogBook } from './LogBook';
import { GeneralSetting } from './GeneralSetting';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface ExtendedDashboardProps extends DashboardProps {
  onUploadData: (sectionId: string, data: any[], extraMeta?: any) => Promise<void>;
}

export const Dashboard: React.FC<ExtendedDashboardProps> = ({ 
  onLogout, 
  currentUser, 
  currentFiscalYear,
  users,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onChangePassword,
  generalSettings,
  onUpdateGeneralSettings,
  magForms,
  onSaveMagForm,
  onDeleteMagForm,
  purchaseOrders,
  onUpdatePurchaseOrder,
  issueReports,
  onUpdateIssueReport, 
  rabiesPatients,
  onAddRabiesPatient,
  onUpdateRabiesPatient,
  onDeletePatient,
  firms,
  onAddFirm,
  quotations,
  onAddQuotation,
  inventoryItems,
  onAddInventoryItem,
  onUpdateInventoryItem,
  onDeleteInventoryItem,
  stockEntryRequests,
  onRequestStockEntry,
  onApproveStockEntry,
  onRejectStockEntry,
  stores,
  onAddStore,
  onUpdateStore,
  onDeleteStore,
  dakhilaReports,
  onSaveDakhilaReport,
  returnEntries,
  onSaveReturnEntry,
  marmatEntries,
  onSaveMarmatEntry,
  dhuliyaunaEntries,
  onSaveDhuliyaunaEntry,
  logBookEntries,
  onSaveLogBookEntry,
  onClearData,
  onUploadData
}) => {
  const fiscalYearLabel = FISCAL_YEARS.find(fy => fy.value === currentFiscalYear)?.label || currentFiscalYear;

  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [pendingPoDakhila, setPendingPoDakhila] = useState<PurchaseOrderEntry | null>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [lastSeenNotificationId, setLastSeenNotificationId] = useState<string | null>(null);

  // Expiry List States
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [expiryModalType, setExpiryModalType] = useState<'expired' | 'near-expiry'>('expired');

  // Statistics Calculations
  const todayAd = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const expiredItems = useMemo(() => {
      const now = new Date();
      return inventoryItems.filter(item => 
          item.expiryDateAd && item.currentQuantity > 0 && new Date(item.expiryDateAd) < now
      );
  }, [inventoryItems]);

  const nearExpiryItems = useMemo(() => {
      const now = new Date();
      const threeMonthsLater = new Date();
      threeMonthsLater.setDate(now.getDate() + 90);
      return inventoryItems.filter(item => {
          if (!item.expiryDateAd || item.currentQuantity <= 0) return false;
          const expiryDate = new Date(item.expiryDateAd);
          return expiryDate >= now && expiryDate <= threeMonthsLater;
      });
  }, [inventoryItems]);

  const rabiesTodayNew = useMemo(() => rabiesPatients.filter(p => p.regDateAd === todayAd).length, [rabiesPatients, todayAd]);
  const rabiesTotalScheduledToday = useMemo(() => rabiesPatients.filter(p => p.schedule.some(dose => dose.date === todayAd)).length, [rabiesPatients, todayAd]);
  const rabiesReceivedToday = useMemo(() => rabiesPatients.filter(p => p.schedule.some(dose => dose.date === todayAd && dose.status === 'Given')).length, [rabiesPatients, todayAd]);
  const rabiesRemainingToday = useMemo(() => rabiesPatients.filter(p => p.schedule.some(dose => dose.date === todayAd && dose.status === 'Pending')).length, [rabiesPatients, todayAd]);

  const vaccineForecast = useMemo(() => {
      const mlPerDose = 0.2;
      const todayCount = rabiesRemainingToday;
      const todayMl = todayCount * mlPerDose;
      const totalPendingDosesCount = rabiesPatients.reduce((acc, p) => acc + p.schedule.filter(d => d.status === 'Pending').length, 0);
      const totalMl = totalPendingDosesCount * mlPerDose;
      return {
          today: { ml: todayMl.toFixed(1), vials05: Math.ceil(todayMl / 0.5), vials10: Math.ceil(todayMl / 1.0) },
          overall: { patients: totalPendingDosesCount, ml: totalMl.toFixed(1), vials05: Math.ceil(totalMl / 0.5), vials10: Math.ceil(totalMl / 1.0) }
      };
  }, [rabiesRemainingToday, rabiesPatients]);

  const inventoryTotalCount = useMemo(() => inventoryItems.filter(i => i.currentQuantity > 0).length, [inventoryItems]);
  const magFormsPendingCount = useMemo(() => magForms.filter(f => f.status === 'Pending').length, [magForms]);
  const latestApprovedDakhila = useMemo(() => {
      const approved = stockEntryRequests.filter(req => req.status === 'Approved');
      return approved.length > 0 ? approved.sort((a, b) => parseInt(b.id) - parseInt(a.id))[0] : null;
  }, [stockEntryRequests]);

  const hasAccess = (menuId: string) => {
      // SUPER_ADMIN always has access to everything
      if (currentUser.role === 'SUPER_ADMIN') return true;
      // All other roles (including ADMIN) are governed by allowedMenus
      return currentUser.allowedMenus?.includes(menuId);
  };

  const handleNotificationClick = () => {
      if (latestApprovedDakhila) {
          setLastSeenNotificationId(latestApprovedDakhila.id);
          setShowNotificationModal(true);
      }
  };

  const handleDashboardAction = (menuId: string) => {
      if (hasAccess(menuId)) setActiveItem(menuId);
      else alert("तपाईंलाई यो विवरण हेर्न अनुमति छैन।");
  };

  const openExpiryDetail = (type: 'expired' | 'near-expiry') => {
      setExpiryModalType(type);
      setShowExpiryModal(true);
  };

  interface MenuItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    subItems?: MenuItem[];
    badgeCount?: number; 
  }

  const pendingStockRequestsCount = stockEntryRequests.filter(r => r.status === 'Pending').length;
  const magFaramBadgeCount = useMemo(() => {
      if (currentUser.role === 'STOREKEEPER') return magForms.filter(f => f.status === 'Pending').length;
      if (['ADMIN', 'SUPER_ADMIN', 'APPROVAL'].includes(currentUser.role)) return magForms.filter(f => f.status === 'Verified').length;
      return 0;
  }, [magForms, currentUser.role]);

  // Calculate badge count for Purchase Orders
  const kharidAdeshBadgeCount = useMemo(() => {
      if (!purchaseOrders) return 0;
      const isStoreKeeper = currentUser.role === 'STOREKEEPER';
      const isAccount = currentUser.role === 'ACCOUNT';
      const isAdminOrApproval = ['ADMIN', 'SUPER_ADMIN', 'APPROVAL'].includes(currentUser.role);

      return purchaseOrders.filter(order => {
          if (isStoreKeeper) return order.status === 'Pending';
          if (isAccount) return order.status === 'Pending Account';
          if (isAdminOrApproval) return order.status === 'Account Verified';
          return false;
      }).length;
  }, [purchaseOrders, currentUser.role]);

  // Calculate badge count for Nikasha Pratibedan (Issue Reports)
  const nikashaPratibedanBadgeCount = useMemo(() => {
    if (!issueReports) return 0;
    // Storekeeper prepares, sends to approval. Admin/Approval approves.
    const isStoreKeeper = currentUser.role === 'STOREKEEPER';
    const isAdminOrApproval = ['ADMIN', 'SUPER_ADMIN', 'APPROVAL'].includes(currentUser.role);

    return issueReports.filter(report => {
        if (isStoreKeeper) return report.status === 'Pending'; // Storekeeper needs to prepare
        if (isAdminOrApproval) return report.status === 'Pending Approval'; // Admin/Approver needs to approve
        return false;
    }).length;
  }, [issueReports, currentUser.role]);

  // Calculate badge count for Dakhila Pratibedan (Stock Entry Requests pending approval)
  const dakhilaPratibedanBadgeCount = useMemo(() => {
    if (!stockEntryRequests) return 0;
    // Only approvers care about pending stock entry requests from this menu
    const isApproverRole = ['ADMIN', 'SUPER_ADMIN', 'APPROVAL'].includes(currentUser.role);
    if (isApproverRole) {
        return stockEntryRequests.filter(req => req.status === 'Pending').length;
    }
    return 0;
  }, [stockEntryRequests, currentUser.role]);

  // NEW: Calculate badge count for Jinshi Firta Khata (Return Entries)
  const jinshiFirtaBadgeCount = useMemo(() => {
      if (!returnEntries) return 0;
      // Storekeeper, Admin, Super Admin, Approval can all verify/approve return entries
      const isApproverRole = ['STOREKEEPER', 'ADMIN', 'SUPER_ADMIN', 'APPROVAL'].includes(currentUser.role);
      if (isApproverRole) {
          return returnEntries.filter(entry => entry.status === 'Pending').length;
      }
      return 0;
  }, [returnEntries, currentUser.role]);

  // NEW: Calculate badge count for Marmat Adesh (Maintenance Entries)
  const marmatAdeshBadgeCount = useMemo(() => {
      if (!marmatEntries) return 0;
      // Admin, Super Admin, Approval can approve maintenance requests
      const isApproverRole = ['ADMIN', 'SUPER_ADMIN', 'APPROVAL'].includes(currentUser.role);
      if (isApproverRole) {
          return marmatEntries.filter(entry => entry.status === 'Pending').length;
      }
      return 0;
  }, [marmatEntries, currentUser.role]);

  // NEW: Calculate badge count for Dhuliyauna Faram (Disposal Entries)
  const dhuliyaunaFaramBadgeCount = useMemo(() => {
      if (!dhuliyaunaEntries) return 0;
      // Admin, Super Admin, Approval can approve disposal requests
      const isApproverRole = ['ADMIN', 'SUPER_ADMIN', 'APPROVAL'].includes(currentUser.role);
      if (isApproverRole) {
          return dhuliyaunaEntries.filter(entry => entry.status === 'Pending').length;
      }
      return 0;
  }, [dhuliyaunaEntries, currentUser.role]);


  const allMenuItems: MenuItem[] = [
    { id: 'dashboard', label: 'ड्यासबोर्ड (Dashboard)', icon: <LayoutDashboard size={20} /> },
    { id: 'services', label: 'सेवा (Services)', icon: <Stethoscope size={20} />, subItems: [{ id: 'tb_leprosy', label: 'क्षयरोग/कुष्ठरोग (TB/Leprosy)', icon: <Activity size={16} /> }, { id: 'rabies', label: 'रेबिज़ खोप क्लिनिक (Rabies Vaccine)', icon: <Syringe size={16} /> }] },
    { id: 'inventory', label: 'जिन्सी व्यवस्थापन (Inventory)', icon: <Package size={20} />, subItems: [{ id: 'stock_entry_approval', label: 'स्टक प्रविष्टि अनुरोध', icon: <ClipboardCheck size={16} />, badgeCount: pendingStockRequestsCount }, { id: 'jinshi_maujdat', label: 'जिन्सी मौज्दात (Stock)', icon: <Warehouse size={16} /> }, { id: 'form_suchikaran', label: 'फर्म सुचीकरण (Firms)', icon: <ClipboardList size={16} /> }, { id: 'quotation', label: 'कोटेशन (Quotation)', icon: <FileSpreadsheet size={16} /> }, { id: 'mag_faram', label: 'माग फारम (Demand)', icon: <FilePlus size={16} />, badgeCount: magFaramBadgeCount }, { id: 'kharid_adesh', label: 'खरिद आदेश (PO)', icon: <ShoppingCart size={16} />, badgeCount: kharidAdeshBadgeCount }, { id: 'nikasha_pratibedan', label: 'निकासा प्रतिवेदन (Issue)', icon: <FileOutput size={16} />, badgeCount: nikashaPratibedanBadgeCount }, { id: 'sahayak_jinshi_khata', label: 'सहायक जिन्सी खाता', icon: <BookOpen size={16} /> }, { id: 'jinshi_khata', label: 'जिन्सी खाता (Ledger)', icon: <Book size={16} /> }, { id: 'dakhila_pratibedan', label: 'दाखिला प्रतिवेदन', icon: <Archive size={16} />, badgeCount: dakhilaPratibedanBadgeCount }, { id: 'jinshi_firta_khata', label: 'जिन्सी फिर्ता खाता', icon: <RotateCcw size={16} />, badgeCount: jinshiFirtaBadgeCount }, { id: 'marmat_adesh', label: 'मर्मत आवेदन/आदेश', icon: <Wrench size={16} />, badgeCount: marmatAdeshBadgeCount }, { id: 'dhuliyauna_faram', label: 'लिलाम / धुल्याउने', icon: <Trash2 size={16} />, badgeCount: dhuliyaunaFaramBadgeCount }, { id: 'log_book', label: 'लग बुक (Log Book)', icon: <Scroll size={16} /> }] },
    { id: 'report', label: 'रिपोर्ट (Report)', icon: <FileText size={20} />, subItems: [{ id: 'report_tb_leprosy', label: 'क्षयरोग/कुष्ठरोग रिपोर्ट (TB/Leprosy)', icon: <Activity size={16} /> }, { id: 'report_rabies', label: 'रेबिज़ रिपोर्ट', icon: <Syringe size={16} /> }, { id: 'report_inventory_monthly', label: 'जिन्सी मासिक प्रतिवेदन (Monthly Report)', icon: <BarChart3 size={16} /> }] },
    { id: 'settings', label: 'सेटिङ (Settings)', icon: <Settings size={20} />, subItems: [{ id: 'general_setting', label: 'सामान्य सेटिङ', icon: <Sliders size={16} /> }, { id: 'store_setup', label: 'स्टोर सेटअप', icon: <Store size={16} /> }, { id: 'user_management', label: 'प्रयोगकर्ता सेटअप', icon: <Users size={16} /> }, { id: 'change_password', label: 'पासवर्ड परिवर्तन', icon: <KeyRound size={16} /> }, { id: 'database_management', label: 'डाटाबेस व्यवस्थापन', icon: <Database size={16} /> }] },
  ];

  const menuItems = useMemo(() => {
    const isCurrentUserSuperAdmin = currentUser.role === 'SUPER_ADMIN';
    const allowedMenus = new Set(currentUser.allowedMenus || []); // Use a Set for O(1) lookup

    return allMenuItems.reduce<MenuItem[]>((acc, item) => {
        // SUPER_ADMIN always gets all menus and sub-menus
        if (isCurrentUserSuperAdmin) {
            acc.push(item);
            return acc;
        }

        // For all other roles (including ADMINs):

        // 1. Always include Dashboard
        if (item.id === 'dashboard') {
            acc.push(item);
            return acc;
        }

        // 2. Filter sub-items first.
        // Special rule: 'change_password' is always allowed for any user if 'settings' is visible/accessible.
        const filteredSubItems = item.subItems?.filter(subItem => {
            return subItem.id === 'change_password' || allowedMenus.has(subItem.id);
        }) || [];

        // 3. Decide if the parent menu item should be included
        // A parent is included if:
        //    a) its ID is explicitly in allowedMenus, OR
        //    b) it has any filtered (allowed) sub-items.
        const shouldIncludeParent = allowedMenus.has(item.id) || filteredSubItems.length > 0;

        if (shouldIncludeParent) {
            // Push the parent item with only its allowed sub-items
            acc.push({ ...item, subItems: filteredSubItems });
        }
        
        return acc;
    }, []);
  }, [currentUser, allMenuItems]);

  const handleMenuClick = (item: MenuItem) => {
    if (item.subItems) setExpandedMenu(expandedMenu === item.id ? null : item.id);
    else { setActiveItem(item.id); setIsSidebarOpen(false); }
  };

  const handleSubItemClick = (subItemId: string) => { setActiveItem(subItemId); setIsSidebarOpen(false); };

  const renderContent = () => {
    switch (activeItem) {
      case 'general_setting': return <GeneralSetting currentUser={currentUser} settings={generalSettings} onUpdateSettings={onUpdateGeneralSettings} />;
      case 'dashboard': return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 no-print">
          <div className="flex items-center gap-3 border-b pb-4">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><Activity size={24} /></div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 font-nepali">प्रणाली ड्यासबोर्ड (System Dashboard)</h2>
              <p className="text-sm text-slate-500">प्रणालीको हालको अवस्था र तथ्याङ्क</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Rabies Clinic */}
            <div className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative ${!hasAccess('rabies') ? 'opacity-75 grayscale-[0.5]' : ''}`}>
              <div className="absolute -right-4 -top-4 bg-red-50 w-24 h-24 rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Rabies Clinic</p><h3 className="text-sm font-bold text-slate-700 font-nepali">आजको क्लिनिक सारांश</h3></div>
                    <div className="bg-red-100 p-3 rounded-xl text-red-600 shadow-inner"><Syringe size={24} /></div>
                </div>
                <div className="space-y-4 flex-1">
                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-600 font-nepali">आजको नयाँ दर्ता</span>
                        <span className="text-xl font-black text-slate-800">{rabiesTodayNew}</span>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                        <div className="flex items-center justify-between mb-2"><span className="text-xs font-bold text-orange-800 font-nepali">आजको खोप</span><span className="text-xl font-black text-orange-600">{rabiesReceivedToday} / {rabiesTotalScheduledToday}</span></div>
                        <div className="w-full bg-orange-200 h-1.5 rounded-full overflow-hidden"><div className="bg-orange-600 h-full transition-all" style={{ width: `${rabiesTotalScheduledToday > 0 ? (rabiesReceivedToday / rabiesTotalScheduledToday) * 100 : 0}%` }} /></div>
                    </div>
                </div>
                <button onClick={() => handleDashboardAction('rabies')} className="mt-6 w-full py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-colors">Manage Patients</button>
              </div>
            </div>
            
            {/* Inventory */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8"><div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Inventory</p><h3 className="text-sm font-bold text-slate-700 font-nepali">कुल जिन्सी सामानहरू</h3></div><div className="bg-blue-100 p-3 rounded-xl text-blue-600 shadow-inner"><Warehouse size={24} /></div></div>
                <div className="flex items-baseline gap-2 flex-1"><span className="text-5xl font-black text-blue-600 leading-none">{inventoryTotalCount}</span><span className="text-xs text-slate-400 font-bold font-nepali uppercase tracking-wider">In Stock</span></div>
                <button onClick={() => handleDashboardAction('jinshi_maujdat')} className="mt-6 w-full py-2 bg-slate-50 text-slate-600 hover:bg-blue-50 border border-slate-100 rounded-xl text-xs font-bold transition-all">Stock Details</button>
              </div>
            </div>

            {/* Khop Purbanuman (Vaccine Forecast) - UPDATED WITH VIAL COUNT */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Vaccine Logistics</p><h3 className="text-sm font-bold text-slate-700 font-nepali">खोप पूर्वानुमान</h3></div>
                    <div className="bg-cyan-100 p-3 rounded-xl text-cyan-600 shadow-inner"><Calculator size={24} /></div>
                </div>
                <div className="space-y-4">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex justify-between items-center mb-2">
                             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Today's Load</span>
                             <span className="text-xs font-black text-cyan-600">{vaccineForecast.today.ml} ml</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-center">
                            <div className="bg-white p-1 rounded-lg border border-slate-200">
                                <p className="text-[9px] text-slate-400 font-bold">0.5ml Vials</p>
                                <p className="text-sm font-black text-slate-700">{vaccineForecast.today.vials05}</p>
                            </div>
                            <div className="bg-white p-1 rounded-lg border border-slate-200">
                                <p className="text-[9px] text-slate-400 font-bold">1.0ml Vials</p>
                                <p className="text-sm font-black text-slate-700">{vaccineForecast.today.vials10}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                        <div className="flex justify-between items-center mb-2">
                             <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Total Pending</span>
                             <span className="text-xs font-black text-indigo-600">{vaccineForecast.overall.ml} ml</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-center">
                            <div className="bg-white p-1 rounded-lg border border-indigo-100">
                                <p className="text-[9px] text-indigo-400 font-bold">0.5ml Vials</p>
                                <p className="text-sm font-black text-indigo-700">{vaccineForecast.overall.vials05}</p>
                            </div>
                            <div className="bg-white p-1 rounded-lg border border-indigo-100">
                                <p className="text-[9px] text-indigo-400 font-bold">1.0ml Vials</p>
                                <p className="text-sm font-black text-indigo-700">{vaccineForecast.overall.vials10}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Demands */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-8"><div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Requests</p><h3 className="text-sm font-bold text-slate-700 font-nepali">बाँकी माग फारम</h3></div><div className="bg-orange-100 p-3 rounded-xl text-orange-600 shadow-inner"><FilePlus size={24} /></div></div>
                <div className="flex items-baseline gap-2 flex-1"><span className="text-5xl font-black text-orange-600 leading-none">{magFormsPendingCount}</span><span className="text-xs text-slate-400 font-bold font-nepali">Pending</span></div>
                <button onClick={() => handleDashboardAction('mag_faram')} className="mt-6 w-full py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold border">Review Demands</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div onClick={() => openExpiryDetail('expired')} className="bg-white p-6 rounded-2xl border border-red-200 shadow-sm hover:shadow-lg transition-all cursor-pointer group active:scale-[0.98]">
                <div className="flex items-center justify-between mb-4"><div className="bg-red-100 p-3 rounded-xl text-red-600 shadow-inner"><AlertOctagon size={24} /></div><div className="text-right"><p className="text-[10px] font-bold text-slate-400 uppercase">Stock Health</p><h3 className="text-sm font-bold text-red-600 font-nepali">म्याद नाघेका सामानहरू</h3></div></div>
                <div className="flex items-baseline gap-3"><span className="text-4xl font-black text-red-600">{expiredItems.length}</span><span className="text-xs font-bold text-slate-400 font-nepali uppercase flex items-center gap-1">Items Expired <ChevronRight size={14}/></span></div>
                <p className="text-[11px] text-slate-500 mt-2 font-nepali italic">यी सामानहरू तुरुन्त हटाउनुहोस्। (Click to view)</p>
             </div>

             <div onClick={() => openExpiryDetail('near-expiry')} className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm hover:shadow-lg transition-all cursor-pointer group active:scale-[0.98]">
                <div className="flex items-center justify-between mb-4"><div className="bg-amber-100 p-3 rounded-xl text-amber-600 shadow-inner"><Timer size={24} /></div><div className="text-right"><p className="text-[10px] font-bold text-slate-400 uppercase">Near Expiry</p><h3 className="text-sm font-bold text-amber-600 font-nepali">३ महिनाभित्र सकिने</h3></div></div>
                <div className="flex items-baseline gap-3"><span className="text-4xl font-black text-amber-600">{nearExpiryItems.length}</span><span className="text-xs font-bold text-slate-400 font-nepali uppercase flex items-center gap-1">Items Near Expiry <ChevronRight size={14}/></span></div>
                <p className="text-[11px] text-slate-500 mt-2 font-nepali italic">आगामी ९० दिनमा सकिने सामान। (Click to view)</p>
             </div>
          </div>
        </div>
      );
      case 'user_management': return <UserManagement currentUser={currentUser} users={users} onAddUser={onAddUser} onUpdateUser={onUpdateUser} onDeleteUser={onDeleteUser} />;
      case 'change_password': return <ChangePassword currentUser={currentUser} users={users} onChangePassword={onChangePassword} />;
      case 'store_setup': return <StoreSetup currentUser={currentUser} currentFiscalYear={currentFiscalYear} stores={stores} onAddStore={onAddStore} onUpdateStore={onUpdateStore} onDeleteStore={onDeleteStore} inventoryItems={inventoryItems} onUpdateInventoryItem={onUpdateInventoryItem} />;
      case 'tb_leprosy': return <TBPatientRegistration currentFiscalYear={currentFiscalYear} />;
      case 'rabies': return <RabiesRegistration currentFiscalYear={currentFiscalYear} patients={rabiesPatients} onAddPatient={onAddRabiesPatient} onUpdatePatient={onUpdateRabiesPatient} onDeletePatient={onDeletePatient} currentUser={currentUser} />;
      case 'report_rabies': return <RabiesReport currentFiscalYear={currentFiscalYear} currentUser={currentUser} patients={rabiesPatients} />;
      case 'mag_faram': return <MagFaram currentFiscalYear={currentFiscalYear} currentUser={currentUser} existingForms={magForms} onSave={onSaveMagForm} onDelete={onDeleteMagForm} inventoryItems={inventoryItems} stores={stores} generalSettings={generalSettings} />;
      case 'kharid_adesh': return <KharidAdesh orders={purchaseOrders} currentFiscalYear={currentFiscalYear} onSave={onUpdatePurchaseOrder} currentUser={currentUser} firms={firms} quotations={quotations} onDakhilaClick={(po) => { setActiveItem('jinshi_maujdat'); setPendingPoDakhila(po); }} generalSettings={generalSettings} />;
      case 'nikasha_pratibedan': return <NikashaPratibedan reports={issueReports} onSave={onUpdateIssueReport} currentUser={currentUser} currentFiscalYear={currentFiscalYear} generalSettings={generalSettings} />;
      case 'form_suchikaran': return <FirmListing currentFiscalYear={currentFiscalYear} firms={firms} onAddFirm={onAddFirm} />;
      case 'quotation': return <Quotation currentFiscalYear={currentFiscalYear} firms={firms} quotations={quotations} onAddQuotation={onAddQuotation} inventoryItems={inventoryItems} />;
      case 'jinshi_maujdat': return <JinshiMaujdat currentFiscalYear={currentFiscalYear} currentUser={currentUser} inventoryItems={inventoryItems} onAddInventoryItem={onAddInventoryItem} onUpdateInventoryItem={onUpdateInventoryItem} onDeleteInventoryItem={onDeleteInventoryItem} stores={stores} onRequestStockEntry={onRequestStockEntry} pendingPoDakhila={pendingPoDakhila} onClearPendingPoDakhila={() => setPendingPoDakhila(null)} />;
      case 'stock_entry_approval': return <StockEntryApproval requests={stockEntryRequests} currentUser={currentUser} onApprove={onApproveStockEntry} onReject={onRejectStockEntry} stores={stores} />;
      case 'dakhila_pratibedan': return <DakhilaPratibedan dakhilaReports={dakhilaReports} onSaveDakhilaReport={onSaveDakhilaReport} currentFiscalYear={currentFiscalYear} currentUser={currentUser} stockEntryRequests={stockEntryRequests} onApproveStockEntry={onApproveStockEntry} onRejectStockEntry={onRejectStockEntry} generalSettings={generalSettings} stores={stores} />;
      case 'sahayak_jinshi_khata': return <SahayakJinshiKhata currentFiscalYear={currentFiscalYear} currentUser={currentUser} inventoryItems={inventoryItems} issueReports={issueReports} dakhilaReports={dakhilaReports} stockEntryRequests={stockEntryRequests} users={users} returnEntries={returnEntries} generalSettings={generalSettings} />;
      case 'jinshi_khata': return <JinshiKhata currentFiscalYear={currentFiscalYear} inventoryItems={inventoryItems} issueReports={issueReports} dakhilaReports={dakhilaReports} stockEntryRequests={stockEntryRequests} returnEntries={returnEntries} generalSettings={generalSettings} />;
      case 'jinshi_firta_khata': return <JinshiFirtaFaram currentFiscalYear={currentFiscalYear} currentUser={currentUser} inventoryItems={inventoryItems} returnEntries={returnEntries} onSaveReturnEntry={onSaveReturnEntry} issueReports={issueReports} generalSettings={generalSettings} />;
      case 'marmat_adesh': return <MarmatAdesh currentFiscalYear={currentFiscalYear} currentUser={currentUser} marmatEntries={marmatEntries} onSaveMarmatEntry={onSaveMarmatEntry} inventoryItems={inventoryItems} generalSettings={generalSettings} />;
      case 'dhuliyauna_faram': return <DhuliyaunaFaram currentFiscalYear={currentFiscalYear} currentUser={currentUser} inventoryItems={inventoryItems} dhuliyaunaEntries={dhuliyaunaEntries} onSaveDhuliyaunaEntry={onSaveDhuliyaunaEntry} stores={stores} />;
      case 'log_book': return <LogBook currentUser={currentUser} currentFiscalYear={currentFiscalYear} inventoryItems={inventoryItems} logBookEntries={logBookEntries} onAddLogEntry={onSaveLogBookEntry} />;
      case 'report_inventory_monthly': return <InventoryMonthlyReport currentFiscalYear={currentFiscalYear} currentUser={currentUser} inventoryItems={inventoryItems} stores={stores} magForms={magForms} onSaveMagForm={onSaveMagForm} generalSettings={generalSettings} />;
      case 'database_management': return <DatabaseManagement currentUser={currentUser} users={users} inventoryItems={inventoryItems} magForms={magForms} purchaseOrders={purchaseOrders} issueReports={issueReports} rabiesPatients={rabiesPatients} firms={firms} stores={stores} dakhilaReports={dakhilaReports} returnEntries={returnEntries} marmatEntries={marmatEntries} dhuliyaunaEntries={dhuliyaunaEntries} logBookEntries={logBookEntries} onClearData={onClearData} onUploadData={onUploadData} />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden no-print" onClick={() => setIsSidebarOpen(false)} />}
      <aside className={`fixed md:relative z-50 h-full bg-slate-900 text-white flex flex-col transition-all duration-300 no-print overflow-hidden ${isSidebarOpen ? 'w-64' : 'w-0 md:w-0'}`}><div className="p-6 border-b border-slate-800 flex items-center gap-3 bg-slate-950 shrink-0"><div className="bg-primary-600 p-2 rounded-lg"><Activity size={20} className="text-white" /></div><div className="whitespace-nowrap"><h2 className="font-nepali font-bold text-lg">{APP_NAME}</h2><p className="text-xs text-slate-400 font-nepali truncate">{currentUser.organizationName || ORG_NAME}</p></div></div><nav className="flex-1 p-4 space-y-2 overflow-y-auto">{menuItems.map((item) => (<div key={item.id} className="w-full"><button onClick={() => handleMenuClick(item)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeItem === item.id ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><div className="flex items-center gap-3"><div className="shrink-0">{item.icon}</div><span className="font-medium font-nepali text-left truncate">{item.label}</span></div>{item.subItems && <div className="text-slate-500 shrink-0">{expandedMenu === item.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</div>}</button>{item.subItems && expandedMenu === item.id && (<div className="mt-1 ml-4 pl-3 border-l border-slate-700 space-y-1">{item.subItems.map((subItem) => (<button key={subItem.id} onClick={() => handleSubItemClick(subItem.id)} className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm transition-colors ${activeItem === subItem.id ? 'bg-slate-800 text-primary-300 font-bold' : 'text-slate-400 hover:text-slate-200'}`}><div className="flex items-center gap-2"><div className="shrink-0">{subItem.icon}</div><span className="font-nepali text-left truncate">{subItem.label}</span></div>{subItem.badgeCount !== undefined && subItem.badgeCount > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full shrink-0">{subItem.badgeCount}</span>}</button>))}</div>)}</div>))}</nav><div className="p-4 border-t border-slate-800 bg-slate-950 shrink-0"><button onClick={onLogout} className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 w-full rounded-xl transition-all whitespace-nowrap"><LogOut size={18} /><span>लगआउट</span></button></div></aside>

      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        <header className="bg-white border-b p-4 flex md:hidden items-center justify-between z-10 no-print"><div className="flex items-center gap-3"><button onClick={() => setIsSidebarOpen(true)} className="bg-primary-600 p-1.5 rounded-md shadow-md active:scale-95 transition-transform"><Menu size={18} className="text-white" /></button><span className="font-bold text-slate-700 font-nepali truncate">{APP_NAME}</span></div><div className="flex items-center gap-4">{latestApprovedDakhila && <button onClick={handleNotificationClick} className="relative p-1 text-slate-600"><Bell size={20} />{latestApprovedDakhila.id !== lastSeenNotificationId && <span className="absolute top-0 right-0 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}</button>}<button onClick={onLogout} className="text-slate-500"><LogOut size={20} /></button></div></header>
        <div className="hidden md:flex bg-white border-b px-8 py-4 justify-between items-center z-10 no-print"><div className="flex items-center gap-4"><button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors shadow-sm bg-white border border-slate-200"><Menu size={24} /></button><h2 className="text-lg font-semibold text-slate-700 font-nepali">ड्यासबोर्ड</h2><div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-100"><Calendar size={14} /><span className="font-nepali">आ.व. {fiscalYearLabel}</span></div></div><div className="flex items-center gap-6"><button onClick={handleNotificationClick} className="p-2 text-slate-600 relative hover:bg-slate-50 rounded-full transition-colors" disabled={!latestApprovedDakhila}><Bell size={22} />{latestApprovedDakhila && latestApprovedDakhila.id !== lastSeenNotificationId && <span className="absolute top-1.5 right-2 h-3 w-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}</button><div className="flex items-center gap-3 bg-slate-50 px-4 py-1.5 rounded-2xl border border-slate-200"><div className="text-right"><p className="text-sm font-bold truncate max-w-[150px]">{currentUser.fullName}</p><p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{currentUser.role}</p></div><div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-xl flex items-center justify-center font-bold uppercase shadow-sm border border-primary-200">{currentUser.username.charAt(0)}</div></div></div></div>

        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-6 relative print:p-0 print:bg-white print:overflow-visible">
            {renderContent()}
        </main>

        {showExpiryModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 print:static print:p-0">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm no-print" onClick={() => setShowExpiryModal(false)}></div>
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-full md:h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 print:shadow-none print:border-none print:h-auto print:static">
                    
                    {/* Modal UI Header: Hidden on Print */}
                    <div className={`px-6 py-4 border-b flex justify-between items-center no-print ${expiryModalType === 'expired' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${expiryModalType === 'expired' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                                {expiryModalType === 'expired' ? <AlertOctagon size={24} /> : <Timer size={24} />}
                            </div>
                            <h3 className="font-bold text-lg font-nepali">
                                {expiryModalType === 'expired' ? 'म्याद नाघेका सामानहरूको सूची' : 'म्याद सकिन लागेका सामानहरूको सूची'}
                            </h3>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900 transition-colors shadow-md">
                                <Printer size={16} /> रिपोर्ट प्रिन्ट गर्नुहोस्
                            </button>
                            <button onClick={() => setShowExpiryModal(false)} className="p-1.5 hover:bg-black/10 rounded-full transition-colors"><X size={24} /></button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 md:p-10 bg-white print:p-0 print:overflow-visible" id="expiry-print-area">
                        {/* 1. PROFESSIONAL HEADER (Style matched with Mag Faram) */}
                        <div className="hidden print:block mb-8">
                             <div className="flex items-start justify-between">
                                 <div className="w-24 flex justify-start pt-1">
                                     <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png" alt="Nepal Emblem" className="h-20 w-20 object-contain" />
                                 </div>
                                 <div className="flex-1 text-center">
                                     <h1 className="text-xl font-bold text-red-600">{generalSettings.orgNameNepali}</h1>
                                     <h2 className="text-base font-bold">{generalSettings.subTitleNepali}</h2>
                                     {generalSettings.subTitleNepali2 && <h3 className="text-sm font-bold">{generalSettings.subTitleNepali2}</h3>}
                                     {generalSettings.subTitleNepali3 && <h3 className="text-base font-bold">{generalSettings.subTitleNepali3}</h3>}
                                     <div className="text-[10px] mt-2 space-x-3 font-medium text-slate-600">
                                         {generalSettings.address && <span>{generalSettings.address}</span>}
                                         {generalSettings.phone && <span>| फोन: {generalSettings.phone}</span>}
                                         {generalSettings.email && <span>| ईमेल: {generalSettings.email}</span>}
                                         {generalSettings.panNo && <span>| पान नं: {generalSettings.panNo}</span>}
                                     </div>
                                 </div>
                                 <div className="w-24"></div> 
                             </div>
                             
                             <div className="text-center mt-6 border-b-2 border-slate-900 pb-2">
                                 <h2 className="text-xl font-bold underline underline-offset-4 uppercase tracking-wide">
                                     {expiryModalType === 'expired' ? 'म्याद नाघेका सामानहरूको प्रतिवेदन (Expired Stock Report)' : 'म्याद सकिन लागेका सामानहरूको प्रतिवेदन (Near Expiry Report)'}
                                 </h2>
                                 <div className="flex justify-between mt-3 text-[10px] font-bold px-1 uppercase tracking-widest">
                                     <span>आर्थिक वर्ष: {currentFiscalYear}</span>
                                     <span>प्रिन्ट मिति: {new NepaliDate().format('YYYY-MM-DD')}</span>
                                 </div>
                             </div>
                        </div>

                        {/* 2. DATA TABLE */}
                        <div className="border border-slate-300 rounded-xl overflow-hidden print:border-slate-800 print:rounded-none">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-300 print:bg-slate-100 print:text-black print:border-slate-800">
                                    <tr>
                                        <th className="px-3 py-3 w-10 text-center border-r print:border-slate-800">क्र.सं.</th>
                                        <th className="px-3 py-3 border-r print:border-slate-800">सामानको नाम (Item Name)</th>
                                        <th className="px-3 py-3 border-r print:border-slate-800">गोदाम (Store)</th>
                                        <th className="px-3 py-3 border-r print:border-slate-800">ब्याच नं</th>
                                        <th className="px-3 py-3 border-r print:border-slate-800">म्याद मिति (AD)</th>
                                        <th className="px-3 py-3 text-center border-r print:border-slate-800">परिमाण</th>
                                        <th className="px-3 py-3 text-right">दर (Rate)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 print:divide-slate-800">
                                    {(expiryModalType === 'expired' ? expiredItems : nearExpiryItems).map((item, idx) => (
                                        <tr key={item.id} className="hover:bg-slate-50/50 print:page-break-inside-avoid">
                                            <td className="px-3 py-3 text-center text-slate-400 border-r print:border-slate-800 print:text-black">{idx + 1}</td>
                                            <td className="px-3 py-3 border-r print:border-slate-800">
                                                <div className="font-bold text-slate-800 print:text-black">{item.itemName}</div>
                                                <div className="text-[9px] text-slate-400 print:text-slate-600 font-mono">{item.uniqueCode || item.sanketNo}</div>
                                            </td>
                                            <td className="px-3 py-3 border-r print:border-slate-800 print:text-black">{stores.find(s => s.id === item.storeId)?.name || 'Unknown'}</td>
                                            <td className="px-3 py-3 font-mono border-r print:border-slate-800 print:text-black">{item.batchNo || '-'}</td>
                                            <td className={`px-3 py-3 font-bold border-r print:border-slate-800 ${expiryModalType === 'expired' ? 'text-red-600 print:text-black' : 'text-amber-600 print:text-black'}`}>
                                                {item.expiryDateAd}
                                                <div className="text-[9px] font-normal text-slate-400 print:text-slate-600">{item.expiryDateBs} (BS)</div>
                                            </td>
                                            <td className="px-3 py-3 text-center font-black border-r print:border-slate-800 print:text-black bg-slate-50/30 print:bg-transparent">
                                                {item.currentQuantity} <span className="text-[9px] font-normal">{item.unit}</span>
                                            </td>
                                            <td className="px-3 py-3 text-right font-medium print:text-black">{item.rate?.toFixed(2) || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* 3. SIGNATURE SECTION (Only visible on Print) */}
                        <div className="hidden print:grid grid-cols-3 gap-10 mt-20 text-center text-xs print:page-break-inside-avoid">
                            <div className="border-t border-slate-800 pt-3 font-bold">तयार गर्ने (Prepared By)</div>
                            <div className="border-t border-slate-800 pt-3 font-bold">जिन्सी शाखा (Store Section)</div>
                            <div className="border-t border-slate-800 pt-3 font-bold">स्वीकृत गर्ने (Approved By)</div>
                        </div>
                    </div>

                    {/* Modal Bottom UI: Hidden on Print */}
                    <div className="p-4 bg-slate-50 border-t no-print flex justify-between items-center">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            Total: {(expiryModalType === 'expired' ? expiredItems : nearExpiryItems).length} Items with Stock
                        </div>
                        <button onClick={() => setShowExpiryModal(false)} className="px-8 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-200 hover:bg-slate-900 transition-all">बन्द गर्नुहोस्</button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
