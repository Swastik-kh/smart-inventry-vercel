
import React, { useState, useMemo } from 'react';
import { 
  LogOut, Menu, Calendar, Stethoscope, Package, FileText, Settings, LayoutDashboard, 
  ChevronDown, ChevronRight, Syringe, Activity, 
  ClipboardList, FileSpreadsheet, FilePlus, ShoppingCart, FileOutput, 
  BookOpen, Book, Archive, RotateCcw, Wrench, Scroll, BarChart3,
  Sliders, Store, ShieldCheck, Users, Database, KeyRound, UserCog, Lock, Warehouse, ClipboardCheck, Bell, X, CheckCircle2, ArrowRightCircle, AlertTriangle, Pill, Scissors, Clock, Calculator, Trash2, UsersRound, CalendarCheck, UserPlus, Droplets, Info, TrendingUp
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

  // Statistics Calculations for Main Dashboard
  const todayAd = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  // 1. New Registrations Today
  const rabiesTodayNew = useMemo(() => {
    return rabiesPatients.filter(p => p.regDateAd === todayAd).length;
  }, [rabiesPatients, todayAd]);

  // 2. Total Scheduled for Today (All status)
  const rabiesTotalScheduledToday = useMemo(() => {
    return rabiesPatients.filter(p => 
      p.schedule.some(dose => dose.date === todayAd)
    ).length;
  }, [rabiesPatients, todayAd]);

  // 3. Actually Received among those scheduled for today
  const rabiesReceivedToday = useMemo(() => {
    return rabiesPatients.filter(p => 
      p.schedule.some(dose => dose.date === todayAd && dose.status === 'Given')
    ).length;
  }, [rabiesPatients, todayAd]);

  // 4. Remaining (Pending) Patients for today
  const rabiesRemainingToday = useMemo(() => {
      return rabiesPatients.filter(p => 
          p.schedule.some(dose => dose.date === todayAd && dose.status === 'Pending')
      ).length;
  }, [rabiesPatients, todayAd]);

  // 5. IMPROVED: Vaccine Forecasting Logic for TODAY and TOTAL Pending
  const vaccineForecast = useMemo(() => {
      const mlPerDose = 0.2;

      // Today's Load
      const todayCount = rabiesRemainingToday;
      const todayMl = todayCount * mlPerDose;

      // Total Load (All pending doses in system for all dates)
      const totalPendingDosesCount = rabiesPatients.reduce((acc, p) => 
          acc + p.schedule.filter(d => d.status === 'Pending').length, 0);
      const totalMl = totalPendingDosesCount * mlPerDose;
      
      return {
          today: {
            patients: todayCount,
            ml: todayMl.toFixed(1),
            vials05: Math.ceil(todayMl / 0.5),
            vials10: Math.ceil(todayMl / 1.0)
          },
          overall: {
            patients: totalPendingDosesCount,
            ml: totalMl.toFixed(1),
            vials05: Math.ceil(totalMl / 0.5),
            vials10: Math.ceil(totalMl / 1.0)
          }
      };
  }, [rabiesRemainingToday, rabiesPatients]);

  const inventoryTotalCount = useMemo(() => inventoryItems.length, [inventoryItems]);
  const magFormsPendingCount = useMemo(() => magForms.filter(f => f.status === 'Pending').length, [magForms]);

  const latestApprovedDakhila = useMemo(() => {
      const approved = stockEntryRequests.filter(req => req.status === 'Approved');
      return approved.length > 0 ? approved.sort((a, b) => parseInt(b.id) - parseInt(a.id))[0] : null;
  }, [stockEntryRequests]);

  // Helper to check permission for a specific menu
  const hasAccess = (menuId: string) => {
      if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN') return true;
      return currentUser.allowedMenus?.includes(menuId);
  };

  const handleNotificationClick = () => {
      if (latestApprovedDakhila) {
          setLastSeenNotificationId(latestApprovedDakhila.id);
          setShowNotificationModal(true);
      }
  };

  const handleDashboardAction = (menuId: string) => {
      if (hasAccess(menuId)) {
          setActiveItem(menuId);
      } else {
          alert("तपाईंलाई यो विवरण हेर्न अनुमति छैन। (Access Denied)");
      }
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

  const allMenuItems: MenuItem[] = [
    { id: 'dashboard', label: 'ड्यासबोर्ड (Dashboard)', icon: <LayoutDashboard size={20} /> },
    { 
      id: 'services', label: 'सेवा (Services)', icon: <Stethoscope size={20} />,
      subItems: [
        { id: 'tb_leprosy', label: 'क्षयरोग/कुष्ठरोग (TB/Leprosy)', icon: <Activity size={16} /> },
        { id: 'rabies', label: 'रेबिज़ खोप क्लिनिक (Rabies Vaccine)', icon: <Syringe size={16} /> }
      ]
    },
    { 
      id: 'inventory', label: 'जिन्सी व्यवस्थापन (Inventory)', icon: <Package size={20} />,
      subItems: [
        { id: 'stock_entry_approval', label: 'स्टक प्रविष्टि अनुरोध', icon: <ClipboardCheck size={16} />, badgeCount: pendingStockRequestsCount }, 
        { id: 'jinshi_maujdat', label: 'जिन्सी मौज्दात (Stock)', icon: <Warehouse size={16} /> }, 
        { id: 'form_suchikaran', label: 'फर्म सुचीकरण (Firms)', icon: <ClipboardList size={16} /> },
        { id: 'quotation', label: 'कोटेशन (Quotation)', icon: <FileSpreadsheet size={16} /> },
        { id: 'mag_faram', label: 'माग फारम (Demand)', icon: <FilePlus size={16} />, badgeCount: magFaramBadgeCount },
        { id: 'kharid_adesh', label: 'खरिद आदेश (PO)', icon: <ShoppingCart size={16} /> },
        { id: 'nikasha_pratibedan', label: 'निकासा प्रतिवेदन (Issue)', icon: <FileOutput size={16} /> },
        { id: 'sahayak_jinshi_khata', label: 'सहायक जिन्सी खाता', icon: <BookOpen size={16} /> },
        { id: 'jinshi_khata', label: 'जिन्सी खाता (Ledger)', icon: <Book size={16} /> },
        { id: 'dakhila_pratibedan', label: 'दाखिला प्रतिवेदन', icon: <Archive size={16} /> },
        { id: 'jinshi_firta_khata', label: 'जिन्सी फिर्ता खाता', icon: <RotateCcw size={16} /> },
        { id: 'marmat_adesh', label: 'मर्मत आवेदन/आदेश', icon: <Wrench size={16} /> },
        { id: 'dhuliyauna_faram', label: 'लिलाम / धुल्याउने', icon: <Trash2 size={16} /> },
        { id: 'log_book', label: 'लग बुक (Log Book)', icon: <Scroll size={16} /> },
      ]
    },
    { 
      id: 'report', label: 'रिपोर्ट (Report)', icon: <FileText size={20} />,
      subItems: [
        { id: 'report_tb_leprosy', label: 'क्षयरोग/कुष्ठरोग रिपोर्ट', icon: <Activity size={16} /> },
        { id: 'report_rabies', label: 'रेबिज़ रिपोर्ट', icon: <Syringe size={16} /> },
        { id: 'report_inventory_monthly', label: 'जिन्सी मासिक प्रतिवेदन', icon: <BarChart3 size={16} /> }
      ]
    },
    { 
      id: 'settings', label: 'सेटिङ (Settings)', icon: <Settings size={20} />,
      subItems: [
        { id: 'general_setting', label: 'सामान्य सेटिङ', icon: <Sliders size={16} /> },
        { id: 'store_setup', label: 'स्टोर सेटअप', icon: <Store size={16} /> }, 
        { id: 'user_management', label: 'प्रयोगकर्ता सेटअप', icon: <Users size={16} /> },
        { id: 'change_password', label: 'पासवर्ड परिवर्तन', icon: <KeyRound size={16} /> },
        { id: 'database_management', label: 'डाटाबेस व्यवस्थापन', icon: <Database size={16} /> },
      ]
    },
  ];

  const menuItems = useMemo(() => {
    const isSuperOrAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN';
    
    return allMenuItems.reduce<MenuItem[]>((acc, item) => {
        if (item.id === 'dashboard') { acc.push(item); return acc; }
        
        if (item.id === 'settings') {
            const filteredSubs = item.subItems?.filter(sub => {
                if (sub.id === 'change_password') return true;
                return isSuperOrAdmin;
            }) || [];

            if (filteredSubs.length > 0) {
                acc.push({ ...item, subItems: filteredSubs });
            }
            return acc;
        }

        if (isSuperOrAdmin) {
            acc.push(item);
            return acc;
        }

        const allowedMenus = currentUser.allowedMenus || [];
        const filteredSubs = item.subItems?.filter(sub => allowedMenus.includes(sub.id)) || [];
        
        if (allowedMenus.includes(item.id) || filteredSubs.length > 0) {
            acc.push({ ...item, subItems: filteredSubs.length > 0 ? filteredSubs : item.subItems });
        }
        return acc;
    }, []);
  }, [currentUser, allMenuItems]);

  const handleMenuClick = (item: MenuItem) => {
    if (item.subItems) setExpandedMenu(expandedMenu === item.id ? null : item.id);
    else { setActiveItem(item.id); setIsSidebarOpen(false); }
  };

  const handleSubItemClick = (subItemId: string) => {
    setActiveItem(subItemId);
    setIsSidebarOpen(false); 
  };

  const renderContent = () => {
    switch (activeItem) {
      case 'general_setting': return <GeneralSetting currentUser={currentUser} settings={generalSettings} onUpdateSettings={onUpdateGeneralSettings} />;
      case 'dashboard': return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3 border-b pb-4">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
              <Activity size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 font-nepali">प्रणाली ड्यासबोर्ड (System Dashboard)</h2>
              <p className="text-sm text-slate-500">प्रणालीको हालको अवस्था र तथ्याङ्क</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Rabies Clinic Summary Card */}
            <div className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative ${!hasAccess('rabies') ? 'opacity-75 grayscale-[0.5]' : ''}`}>
              <div className="absolute -right-4 -top-4 bg-red-50 w-24 h-24 rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
              {!hasAccess('rabies') && <div className="absolute top-3 right-3 text-slate-300 z-20"><Lock size={16} /></div>}
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Rabies Vaccine Clinic</p>
                        <h3 className="text-sm font-bold text-slate-700 font-nepali">आजको क्लिनिक सारांश</h3>
                    </div>
                    <div className="bg-red-100 p-3 rounded-xl text-red-600 shadow-inner">
                        <Syringe size={24} />
                    </div>
                </div>

                <div className="space-y-4 flex-1">
                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-white rounded-lg text-indigo-600 shadow-sm border border-indigo-50"><UserPlus size={16}/></div>
                            <span className="text-xs font-bold text-slate-600 font-nepali">आजको नयाँ दर्ता</span>
                        </div>
                        <span className="text-xl font-black text-slate-800">{rabiesTodayNew} <span className="text-[10px] font-medium text-slate-400">जना</span></span>
                    </div>

                    <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                        <div className="flex items-center justify-between mb-2">
                             <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-white rounded-lg text-orange-600 shadow-sm border border-orange-50"><CalendarCheck size={16}/></div>
                                <span className="text-xs font-bold text-orange-800 font-nepali">आजको खोप विवरण</span>
                            </div>
                            <div className="text-right">
                                <span className="text-xl font-black text-orange-600">{rabiesReceivedToday} / {rabiesTotalScheduledToday}</span>
                                <p className="text-[9px] font-bold text-orange-400 uppercase leading-none">Done / Total</p>
                            </div>
                        </div>
                        <div className="w-full bg-orange-200 h-1.5 rounded-full overflow-hidden">
                             <div 
                                className="bg-orange-600 h-full transition-all duration-1000 ease-out" 
                                style={{ width: `${rabiesTotalScheduledToday > 0 ? (rabiesReceivedToday / rabiesTotalScheduledToday) * 100 : 0}%` }}
                             />
                        </div>
                    </div>
                </div>

                <button 
                    onClick={() => handleDashboardAction('rabies')} 
                    className={`mt-6 w-full py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                        hasAccess('rabies') 
                        ? 'bg-slate-800 text-white hover:bg-red-600 shadow-lg shadow-slate-200' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                >
                    {hasAccess('rabies') ? 'Manage Patients' : 'Access Locked'} <ArrowRightCircle size={14} />
                </button>
              </div>
            </div>

            {/* ENHANCED: Vaccine Forecasting Card with TODAY and TOTAL data */}
            <div className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative ${!hasAccess('rabies') ? 'opacity-75 grayscale-[0.5]' : ''}`}>
              <div className="absolute -right-4 -top-4 bg-cyan-50 w-24 h-24 rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
              {!hasAccess('rabies') && <div className="absolute top-3 right-3 text-slate-300 z-20"><Lock size={16} /></div>}
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Vaccine Logistics</p>
                        <h3 className="text-sm font-bold text-slate-700 font-nepali">खोप पूर्वानुमान (Forecast)</h3>
                    </div>
                    <div className="bg-cyan-100 p-3 rounded-xl text-cyan-600 shadow-inner">
                        <Calculator size={24} />
                    </div>
                </div>

                <div className="space-y-4 flex-1">
                    {/* Today's Section */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-end border-b border-slate-100 pb-1">
                            <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1"><Clock size={10}/> आजको लागि (Today)</span>
                            <span className="text-[10px] font-bold text-cyan-600 bg-cyan-50 px-1.5 rounded">{vaccineForecast.today.ml} ml</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-center">
                                <p className="text-[8px] font-bold text-slate-400 uppercase">0.5 ml</p>
                                <p className="text-base font-black text-slate-700">{vaccineForecast.today.vials05}</p>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-center">
                                <p className="text-[8px] font-bold text-slate-400 uppercase">1.0 ml</p>
                                <p className="text-base font-black text-slate-700">{vaccineForecast.today.vials10}</p>
                            </div>
                        </div>
                    </div>

                    {/* Overall/Total Section */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-end border-b border-slate-100 pb-1">
                            <span className="text-[10px] font-black text-indigo-500 uppercase flex items-center gap-1"><TrendingUp size={10}/> कुल बाँकी (Total Pending)</span>
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 rounded">{vaccineForecast.overall.ml} ml</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-indigo-50/50 p-2 rounded-lg border border-indigo-100 text-center">
                                <p className="text-[8px] font-bold text-indigo-400 uppercase">0.5 ml</p>
                                <p className="text-base font-black text-indigo-700">{vaccineForecast.overall.vials05}</p>
                            </div>
                            <div className="bg-blue-50/50 p-2 rounded-lg border border-blue-100 text-center">
                                <p className="text-[8px] font-bold text-blue-400 uppercase">1.0 ml</p>
                                <p className="text-base font-black text-blue-700">{vaccineForecast.overall.vials10}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start gap-2 bg-amber-50 p-2 rounded-lg text-[9px] text-amber-700 leading-tight border border-amber-100">
                        <Clock size={12} className="shrink-0 mt-0.5" />
                        <p className="font-medium italic font-nepali">खोलिएको ६ घण्टाभित्र प्रयोग गरिसक्नुपर्छ।</p>
                    </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-50 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Doses: {vaccineForecast.overall.patients}</span>
                </div>
              </div>
            </div>

            {/* Total Inventory Items Card */}
            <div className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative ${!hasAccess('jinshi_maujdat') ? 'opacity-75 grayscale-[0.5]' : ''}`}>
              <div className="absolute -right-4 -top-4 bg-blue-50 w-24 h-24 rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
              {!hasAccess('jinshi_maujdat') && <div className="absolute top-3 right-3 text-slate-300 z-20"><Lock size={16} /></div>}
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Inventory Management</p>
                        <h3 className="text-sm font-bold text-slate-700 font-nepali">कुल जिन्सी सामानहरू</h3>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-xl text-blue-600 shadow-inner">
                        <Warehouse size={24} />
                    </div>
                </div>
                
                <div className="flex items-baseline gap-2 flex-1">
                    <span className="text-5xl font-black text-blue-600 leading-none">{inventoryTotalCount}</span>
                    <span className="text-xs text-slate-400 font-bold font-nepali uppercase tracking-wider">Items in Stock</span>
                </div>

                <button 
                    onClick={() => handleDashboardAction('jinshi_maujdat')} 
                    className={`mt-6 w-full py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                        hasAccess('jinshi_maujdat') 
                        ? 'bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-700 border border-slate-100' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                >
                    {hasAccess('jinshi_maujdat') ? 'Stock Details' : 'Access Locked'} <ArrowRightCircle size={14} />
                </button>
              </div>
            </div>

            {/* Pending Demand Forms Card */}
            <div className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative ${!hasAccess('mag_faram') ? 'opacity-75 grayscale-[0.5]' : ''}`}>
              <div className="absolute -right-4 -top-4 bg-orange-50 w-24 h-24 rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
              {!hasAccess('mag_faram') && <div className="absolute top-3 right-3 text-slate-300 z-20"><Lock size={16} /></div>}
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Demands & Requests</p>
                        <h3 className="text-sm font-bold text-slate-700 font-nepali">बाँकी माग फारमहरू</h3>
                    </div>
                    <div className="bg-orange-100 p-3 rounded-xl text-orange-600 shadow-inner">
                        <FilePlus size={24} />
                    </div>
                </div>

                <div className="flex items-baseline gap-2 flex-1">
                    <span className="text-5xl font-black text-orange-600 leading-none">{magFormsPendingCount}</span>
                    <span className="text-xs text-slate-400 font-bold font-nepali uppercase tracking-wider">Awaiting Review</span>
                </div>

                <button 
                    onClick={() => handleDashboardAction('mag_faram')} 
                    className={`mt-6 w-full py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                        hasAccess('mag_faram') 
                        ? 'bg-slate-50 text-slate-600 hover:bg-orange-50 hover:text-orange-700 border border-slate-100' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                >
                    {hasAccess('mag_faram') ? 'Review Demands' : 'Access Locked'} <ArrowRightCircle size={14} />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                  <div className="bg-indigo-600 p-3 rounded-xl text-white shadow-lg shadow-indigo-200">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-indigo-900 font-nepali text-lg">प्रणाली सुचारु छ (System Active)</h4>
                    <p className="text-indigo-700 text-sm">सबै मोड्युलहरू सही रूपमा चलिरहेका छन्। कृपया थप कार्यको लागि बायाँ मेनु प्रयोग गर्नुहोस्।</p>
                  </div>
              </div>
              <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest bg-white/50 px-4 py-2 rounded-full border border-indigo-200">
                  Last Login: {new Date().toLocaleTimeString()}
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
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden no-print" onClick={() => setIsSidebarOpen(false)} />}
      
      {/* Improved Sidebar with Full Hide Logic */}
      <aside 
        className={`fixed md:relative z-50 h-full bg-slate-900 text-white flex flex-col transition-all duration-300 ease-in-out no-print overflow-hidden
          ${isSidebarOpen 
            ? 'w-64 translate-x-0 opacity-100' 
            : 'w-0 -translate-x-full md:translate-x-0 opacity-0 md:opacity-0'
          }`}
      >
        <div className="p-6 border-b border-slate-800 flex items-center gap-3 bg-slate-950 shrink-0 overflow-hidden">
            <div className="bg-primary-600 p-2 rounded-lg shrink-0"><Activity size={20} className="text-white" /></div>
            <div className="whitespace-nowrap"><h2 className="font-nepali font-bold text-lg">{APP_NAME}</h2><p className="text-xs text-slate-400 font-nepali truncate">{currentUser.organizationName || ORG_NAME}</p></div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden">
             {menuItems.map((item) => (
               <div key={item.id} className="w-full">
                  <button onClick={() => handleMenuClick(item)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl group transition-all duration-200 ${activeItem === item.id ? 'bg-primary-600 text-white shadow-lg' : (expandedMenu === item.id ? 'bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800')}`}>
                    <div className="flex items-center gap-3 min-w-0"><div className="shrink-0">{item.icon}</div><span className="font-medium font-nepali text-left truncate">{item.label}</span></div>
                    {item.subItems && <div className="text-slate-500 shrink-0">{expandedMenu === item.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</div>}
                  </button>
                  {item.subItems && expandedMenu === item.id && (
                    <div className="mt-1 ml-4 pl-3 border-l border-slate-700 space-y-1">
                      {item.subItems.map((subItem) => (
                        <button key={subItem.id} onClick={() => handleSubItemClick(subItem.id)} className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm transition-colors ${activeItem === subItem.id ? 'bg-slate-800 text-primary-300 font-bold' : 'text-slate-400 hover:text-slate-200'}`}>
                            <div className="flex items-center gap-2 min-w-0"><div className="shrink-0">{subItem.icon}</div><span className="font-nepali text-left truncate">{subItem.label}</span></div>
                            {subItem.badgeCount !== undefined && subItem.badgeCount > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full shrink-0">{subItem.badgeCount}</span>}
                        </button>
                      ))}
                    </div>
                  )}
               </div>
             ))}
        </nav>
        
        <div className="p-4 border-t border-slate-800 bg-slate-950 shrink-0">
            <button onClick={onLogout} className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 w-full rounded-xl transition-all whitespace-nowrap"><LogOut size={18} /><span>लगआउट</span></button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        <header className="bg-white border-b p-4 flex md:hidden items-center justify-between z-10 no-print">
            <div className="flex items-center gap-3"><button onClick={() => setIsSidebarOpen(true)} className="bg-primary-600 p-1.5 rounded-md shadow-md active:scale-95 transition-transform"><Menu size={18} className="text-white" /></button><span className="font-bold text-slate-700 font-nepali truncate">{APP_NAME}</span></div>
            <div className="flex items-center gap-4">{latestApprovedDakhila && <button onClick={handleNotificationClick} className="relative p-1 text-slate-600"><Bell size={20} />{latestApprovedDakhila.id !== lastSeenNotificationId && <span className="absolute top-0 right-0 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}</button>}<button onClick={onLogout} className="text-slate-500"><LogOut size={20} /></button></div>
        </header>

        {/* Desktop Header */}
        <div className="hidden md:flex bg-white border-b px-8 py-4 justify-between items-center z-10 no-print">
            <div className="flex items-center gap-4">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors shadow-sm bg-white border border-slate-200"><Menu size={24} /></button>
                <h2 className="text-lg font-semibold text-slate-700 font-nepali">ड्यासबोर्ड</h2>
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-100"><Calendar size={14} /><span className="font-nepali">आ.व. {fiscalYearLabel}</span></div>
            </div>
            <div className="flex items-center gap-6">
                <button onClick={handleNotificationClick} className="p-2 text-slate-600 relative hover:bg-slate-50 rounded-full transition-colors" disabled={!latestApprovedDakhila}><Bell size={22} />{latestApprovedDakhila && latestApprovedDakhila.id !== lastSeenNotificationId && <span className="absolute top-1.5 right-2 h-3 w-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}</button>
                <div className="flex items-center gap-3 bg-slate-50 px-4 py-1.5 rounded-2xl border border-slate-200">
                    <div className="text-right"><p className="text-sm font-bold truncate max-w-[150px]">{currentUser.fullName}</p><p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{currentUser.role}</p></div>
                    <div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-xl flex items-center justify-center font-bold uppercase shadow-sm border border-primary-200">{currentUser.username.charAt(0)}</div>
                </div>
            </div>
        </div>

        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-6 relative">
            {renderContent()}
        </main>
      </div>
    </div>
  );
};
