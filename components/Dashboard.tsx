
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { 
  LogOut, Menu, Calendar, Stethoscope, Package, FileText, Settings, LayoutDashboard, 
  ChevronDown, ChevronRight, Syringe, Activity, Info,
  ClipboardList, FileSpreadsheet, FilePlus, ShoppingCart, FileOutput, 
  BookOpen, Book, Archive, RotateCcw, Wrench, Scroll, BarChart3,
  Sliders, Store, ShieldCheck, Users, Database, KeyRound, UserCog, Lock, Warehouse, ClipboardCheck, Bell, X, CheckCircle2, AlertTriangle, Calculator, Trash2, TrendingUp, AlertOctagon, Timer, Printer, Baby, Flame, CalendarClock
} from 'lucide-react';
import { APP_NAME, FISCAL_YEARS } from '../constants';
import { DashboardProps } from '../types/dashboardTypes'; 
import { PurchaseOrderEntry, InventoryItem, MagFormEntry, StockEntryRequest } from '../types/inventoryTypes';
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
import { JinshiKhata } from './JinshiKhata'; 
import { JinshiFirtaFaram } from './JinshiFirtaFaram'; 
import { MarmatAdesh } from './MarmatAdesh';
import { DatabaseManagement } from './DatabaseManagement';
import { DhuliyaunaFaram } from './DhuliyaunaFaram';
import { LogBook } from './LogBook';
import { GeneralSetting } from './GeneralSetting';
import { VaccinationServiceTabs } from './VaccinationServiceTabs';
import { ImmunizationTracking } from './ImmunizationTracking';
import { ImmunizationReport } from './ImmunizationReport';
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

interface ExtendedDashboardProps extends DashboardProps {
  onUploadData: (sectionId: string, data: any[], extraMeta?: any) => Promise<void>;
}

interface AppNotification {
    id: string;
    title: string;
    description: string;
    time: string;
    targetMenu: string;
    type: 'info' | 'warning' | 'success' | 'error';
    isNew: boolean;
}

const LAST_SEEN_NOTIF_KEY = 'smart_inv_last_seen_notif_v2';

export const Dashboard: React.FC<ExtendedDashboardProps> = ({ 
  onLogout, currentUser, currentFiscalYear, users, onAddUser, onUpdateUser, onDeleteUser, onChangePassword,
  generalSettings, onUpdateGeneralSettings, magForms, onSaveMagForm, onDeleteMagForm,
  purchaseOrders, onUpdatePurchaseOrder, issueReports, onUpdateIssueReport, 
  rabiesPatients, onAddRabiesPatient, onUpdatePatient, onDeletePatient,
  tbPatients, onAddTbPatient, onUpdateTbPatient, onDeleteTbPatient, 
  garbhawatiPatients, onAddGarbhawatiPatient, onUpdateGarbhawatiPatient, onDeleteGarbhawatiPatient, 
  bachhaImmunizationRecords, onAddBachhaImmunizationRecord, onUpdateBachhaImmunizationRecord, onDeleteBachhaImmunizationRecord, 
  firms, onAddFirm, quotations, onAddQuotation, inventoryItems, onAddInventoryItem, onUpdateInventoryItem, onDeleteInventoryItem,
  stockEntryRequests, onRequestStockEntry, onApproveStockEntry, onRejectStockEntry, stores, onAddStore, onUpdateStore, onDeleteStore,
  dakhilaReports, onSaveDakhilaReport, returnEntries, onSaveReturnEntry, 
  marmatEntries, onSaveMarmatEntry, dhuliyaunaEntries, onSaveDhuliyaunaEntry,
  logBookEntries, onSaveLogBookEntry, onClearData, onUploadData
}) => {
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Initially hidden
  const [showNotifications, setShowNotifications] = useState(false);
  const [lastSeenNotifId, setLastSeenNotifId] = useState<string>(() => localStorage.getItem(LAST_SEEN_NOTIF_KEY) || '');
  const [pendingPoDakhila, setPendingPoDakhila] = useState<PurchaseOrderEntry | null>(null);
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [expiryModalType, setExpiryModalType] = useState<'expired' | 'near-expiry'>('expired');
  
  const mainContentRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mainContentRef.current) mainContentRef.current.scrollTo(0, 0);
  }, [activeItem]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notifications = useMemo(() => {
      if (!currentUser) return [];
      const list: AppNotification[] = [];

      // 1. Latest 5 Dakhila Reports
      const latestDakhilas = [...dakhilaReports]
          .filter(d => d.fiscalYear === currentFiscalYear)
          .sort((a, b) => b.id.localeCompare(a.id))
          .slice(0, 5);

      latestDakhilas.forEach(d => {
          list.push({
              id: `dakhila-${d.id}`,
              title: 'सम्पन्न दाखिला प्रतिवेदन',
              description: `दाखिला नम्बर ${d.dakhilaNo} सफलतापूर्वक सम्पन्न भयो।`,
              time: d.date,
              targetMenu: 'dakhila_pratibedan',
              type: 'success',
              isNew: d.id > lastSeenNotifId
          });
      });

      return list.sort((a, b) => b.id.localeCompare(a.id));
  }, [dakhilaReports, currentUser, lastSeenNotifId, currentFiscalYear]);

  const unreadCount = useMemo(() => notifications.filter(n => n.isNew).length, [notifications]);

  const handleNotifClick = (n: AppNotification) => {
      setActiveItem(n.targetMenu);
      setShowNotifications(false);
      const rawId = n.id.includes('-') ? n.id.split('-').pop() || n.id : n.id;
      if (rawId > lastSeenNotifId) {
          setLastSeenNotifId(rawId);
          localStorage.setItem(LAST_SEEN_NOTIF_KEY, rawId);
      }
  };

  const clearAllNotifs = () => {
      if (notifications.length > 0) {
          const newest = notifications[0].id.includes('-') ? notifications[0].id.split('-').pop() || '0' : notifications[0].id;
          setLastSeenNotifId(newest);
          localStorage.setItem(LAST_SEEN_NOTIF_KEY, newest);
      }
      setShowNotifications(false);
  };

  const fixDate = useCallback((d: string) => {
    if (!d) return '';
    const parts = d.split(/[-/]/).map(p => p.padStart(2, '0'));
    return parts.length === 3 ? `${parts[0]}-${parts[1]}-${parts[2]}` : d; 
  }, []);

  const expiredItems = useMemo(() => {
      const now = new Date();
      return inventoryItems.filter(item => item.expiryDateAd && item.currentQuantity > 0 && new Date(item.expiryDateAd) < now);
  }, [inventoryItems]);

  const nearExpiryItems = useMemo(() => {
      const now = new Date();
      const threeMonthsLater = new Date();
      threeMonthsLater.setDate(now.getDate() + 90);
      return inventoryItems.filter(item => item.expiryDateAd && item.currentQuantity > 0 && new Date(item.expiryDateAd) >= now && new Date(item.expiryDateAd) <= threeMonthsLater);
  }, [inventoryItems]);

  const rabiesDoseStats = useMemo(() => {
    const stats = { d0Total: 0, d0Received: 0, d0Progress: 0, d3Total: 0, d3Received: 0, d3Progress: 0, d7Total: 0, d7Received: 0, d7Progress: 0 };
    let todayBs = '';
    try { todayBs = new NepaliDate().format('YYYY-MM-DD'); } catch (e) { return stats; }
    const fixedTodayBs = fixDate(todayBs);
    rabiesPatients.forEach(p => (p.schedule || []).forEach(dose => {
        if (fixDate(dose.dateBs || '') === fixedTodayBs) {
            if (dose.day === 0) { stats.d0Total++; if (dose.status === 'Given') stats.d0Received++; }
            else if (dose.day === 3) { stats.d3Total++; if (dose.status === 'Given') stats.d3Received++; }
            else if (dose.day === 7) { stats.d7Total++; if (dose.status === 'Given') stats.d7Received++; }
        }
    }));
    stats.d0Progress = stats.d0Total > 0 ? Math.round((stats.d0Received / stats.d0Total) * 100) : 0;
    stats.d3Progress = stats.d3Total > 0 ? Math.round((stats.d3Received / stats.d3Total) * 100) : 0;
    stats.d7Progress = stats.d7Total > 0 ? Math.round((stats.d7Received / stats.d7Total) * 100) : 0;
    return stats;
  }, [rabiesPatients, fixDate]);

  const vaccineForecast = useMemo(() => {
      const mlPerDose = 0.2;
      let currentMonth = '';
      try { currentMonth = new NepaliDate().format('MM'); } catch (e) { currentMonth = '01'; }
      const monthPatients = rabiesPatients.filter(p => p.regMonth === currentMonth && p.fiscalYear === currentFiscalYear);
      const pendingDoses = monthPatients.reduce((acc, p) => acc + (p.schedule ? p.schedule.filter(d => d.status === 'Pending').length : 0), 0);
      const totalMl = pendingDoses * mlPerDose;
      return { monthPatients: monthPatients.length, pendingDoses, totalMl: totalMl.toFixed(1), vials05: Math.ceil(totalMl / 0.5), vials10: Math.ceil(totalMl / 1.0) };
  }, [rabiesPatients, currentFiscalYear]);

  const inventoryTotalCount = useMemo(() => inventoryItems.filter(i => i.currentQuantity > 0).length, [inventoryItems]);
  const magFormsPendingCount = useMemo(() => magForms.filter(f => f.status === 'Pending').length, [magForms]);

  // Wrapped hasAccess in useCallback for memoization
  const hasAccess = useCallback((menuId: string) => {
    if (!currentUser) return false;
    if (currentUser.role === 'SUPER_ADMIN') return true;
    return currentUser.allowedMenus?.includes(menuId) || menuId === 'dashboard' || menuId === 'change_password';
  }, [currentUser]);

  interface MenuItem { id: string; label: string; icon: React.ReactNode; subItems?: MenuItem[]; badgeCount?: number; }
  
  const allMenuItems: MenuItem[] = [
    { id: 'dashboard', label: 'ड्यासबोर्ड', icon: <LayoutDashboard size={20} /> },
    { 
      id: 'services', 
      label: 'सेवा (Services)', 
      icon: <Stethoscope size={20} />, 
      subItems: [ 
        { id: 'tb_leprosy', label: 'क्षयरोग/कुष्ठरोग', icon: <Activity size={16} /> }, 
        { id: 'khop_sewa', label: 'खोप सेवा', icon: <Baby size={16} /> }, 
        { id: 'rabies', label: 'रेबिज़ खोप क्लिनिक', icon: <Syringe size={16} /> }, 
        { id: 'immunization_tracking', label: 'खोप अनुगमन', icon: <Baby size={16} /> } 
      ] 
    },
    {
      id: 'inventory',
      label: 'जिन्सी व्यवस्थापन',
      icon: <Package size={20} />,
      subItems: [
        { id: 'jinshi_maujdat', label: 'जिन्सी मौज्दात', icon: <Warehouse size={16} /> },
        { id: 'stock_entry_approval', label: 'स्टक दाखिला अनुमति', icon: <ClipboardCheck size={16} /> },
        { id: 'mag_faram', label: 'माग फारम', icon: <FilePlus size={16} /> },
        { id: 'kharid_adesh', label: 'खरिद आदेश', icon: <ShoppingCart size={16} /> },
        { id: 'nikasha_pratibedan', label: 'निकासा प्रतिवेदन', icon: <FileOutput size={16} /> },
        { id: 'dakhila_pratibedan', label: 'दाखिला प्रतिवेदन', icon: <Archive size={16} /> },
        { id: 'jinshi_khata', label: 'जिन्सी खाता', icon: <Book size={16} /> },
        { id: 'sahayak_jinshi_khata', label: 'सहायक जिन्सी खाता', icon: <BookOpen size={16} /> },
        { id: 'jinshi_firta_khata', label: 'जिन्सी फिर्ता', icon: <RotateCcw size={16} /> },
        { id: 'marmat_adesh', label: 'मर्मत आवेदन', icon: <Wrench size={16} /> },
        { id: 'dhuliyauna_faram', label: 'लिलाम/धुल्याउने', icon: <Trash2 size={16} /> },
        { id: 'log_book', label: 'लग बुक', icon: <Scroll size={16} /> },
        { id: 'form_suchikaran', label: 'फर्म सुचीकरण', icon: <ClipboardList size={16} /> },
        { id: 'quotation', label: 'सामानको कोटेशन', icon: <FileSpreadsheet size={16} /> },
      ]
    },
    {
      id: 'reports',
      label: 'रिपोर्टहरू',
      icon: <BarChart3 size={20} />,
      subItems: [
        { id: 'report_khop', label: 'खोप रिपोर्ट', icon: <Baby size={16} /> },
        { id: 'report_rabies', label: 'रेबिज़ रिपोर्ट', icon: <Syringe size={16} /> },
        { id: 'report_inventory_monthly', label: 'जिन्सी मासिक रिपोर्ट', icon: <FileText size={16} /> },
      ]
    },
    {
      id: 'settings',
      label: 'सेटिङ',
      icon: <Settings size={20} />,
      subItems: [
        { id: 'general_setting', label: 'सामान्य सेटिङ', icon: <Sliders size={16} /> },
        { id: 'store_setup', label: 'स्टोर सेटअप', icon: <Store size={16} /> },
        { id: 'user_management', label: 'प्रयोगकर्ता व्यवस्थापन', icon: <Users size={16} /> },
        { id: 'change_password', label: 'पासवर्ड परिवर्तन', icon: <KeyRound size={16} /> },
        { id: 'database_management', label: 'डाटाबेस व्यवस्थापन', icon: <Database size={16} /> },
      ]
    }
  ];

  // Modified menuItems memoization logic
  const menuItems = useMemo(() => {
    return allMenuItems.map(item => {
        // First, filter subItems based on access
        const accessibleSubItems = item.subItems?.filter(si => hasAccess(si.id));

        // A top-level item is included if:
        // 1. The user has direct access to the top-level item itself OR
        // 2. It has accessible sub-items (even if the top-level item.id isn't explicitly in allowedMenus)
        const shouldIncludeTopLevel = hasAccess(item.id) || (accessibleSubItems && accessibleSubItems.length > 0);

        if (shouldIncludeTopLevel) {
            return {
                ...item,
                subItems: accessibleSubItems // Use the already filtered sub-items
            };
        }
        return null;
    }).filter(Boolean) as MenuItem[]; // Filter out nulls and assert type
}, [currentUser, hasAccess]);

  const renderContent = () => {
    if (!currentUser) return null;
    switch (activeItem) {
      case 'dashboard': return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3 border-b pb-4"><div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><Activity size={24} /></div><div><h2 className="text-xl font-bold text-slate-800 font-nepali">प्रणाली ड्यासबोर्ड (System Dashboard)</h2><p className="text-sm text-slate-500">प्रणालीको हालको अवस्था र तथ्याङ्क</p></div></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="relative z-10"><div className="flex items-center justify-between mb-4"><div><p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Clinic Progress</p><h3 className="text-sm font-bold text-slate-700 font-nepali">आजको खोप प्रगति</h3></div><div className="bg-red-100 p-2.5 rounded-xl text-red-600"><Syringe size={20} /></div></div><div className="space-y-3">{['D0', 'D3', 'D7'].map((d, idx) => { const stats = idx === 0 ? { p: rabiesDoseStats.d0Progress, r: rabiesDoseStats.d0Received, t: rabiesDoseStats.d0Total } : idx === 1 ? { p: rabiesDoseStats.d3Progress, r: rabiesDoseStats.d3Received, t: rabiesDoseStats.d3Total } : { p: rabiesDoseStats.d7Progress, r: rabiesDoseStats.d7Received, t: rabiesDoseStats.d7Total }; return ( <div key={d} className="space-y-1"> <div className="flex justify-between text-[10px] font-bold"> <span className="text-slate-500">{d} Dose:</span> <span className={stats.p === 100 ? 'text-green-600' : 'text-orange-600'}>{stats.r}/{stats.t}</span> </div> <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden"> <div className={`h-full transition-all duration-700 ${stats.p === 100 ? 'bg-green-500' : 'bg-orange-500'}`} style={{ width: `${stats.p}%` }}></div> </div> </div> ); })} </div></div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group hover:border-blue-300 transition-all cursor-pointer" onClick={() => setActiveItem('jinshi_maujdat')}><div className="flex items-center justify-between mb-6"><div><p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Inventory</p><h3 className="text-sm font-bold text-slate-700 font-nepali">जिन्सी मौज्दात</h3></div><div className="bg-blue-100 p-2.5 rounded-xl text-blue-600"><Warehouse size={20} /></div></div><div className="flex items-baseline gap-2"><span className="text-5xl font-black text-blue-600">{inventoryTotalCount}</span><span className="text-[10px] text-slate-400 font-bold uppercase">Items</span></div></div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><div className="flex items-center justify-between mb-4"><div><p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Forecast (Month)</p><h3 className="text-sm font-bold text-slate-700 font-nepali">खोप पूर्वानुमान</h3></div><div className="bg-cyan-100 p-2.5 rounded-xl text-cyan-600"><Calculator size={20} /></div></div><div className="space-y-3"><div className="flex justify-between items-center"><span className="text-[11px] font-bold text-slate-500">कुल मात्रा:</span><span className="text-xs font-black text-indigo-600">{vaccineForecast.totalMl} ml</span></div><div className="grid grid-cols-2 gap-2"><div className="bg-slate-50 p-1.5 rounded-lg border text-center"><p className="text-[8px] font-bold text-slate-400">1.0 ml Vials</p><p className="text-sm font-black text-indigo-700">{vaccineForecast.vials10}</p></div><div className="bg-slate-50 p-1.5 rounded-lg border text-center"><p className="text-[8px] font-bold text-slate-400">0.5 ml Vials</p><p className="text-sm font-black text-indigo-700">{vaccineForecast.vials05}</p></div></div></div></div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer" onClick={() => setActiveItem('mag_faram')}><div className="flex items-center justify-between mb-6"><div><p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Pending</p><h3 className="text-sm font-bold text-slate-700 font-nepali">बाँकी माग</h3></div><div className="bg-orange-100 p-2.5 rounded-xl text-orange-600"><FilePlus size={20} /></div></div><div className="flex items-baseline gap-2"><span className="text-5xl font-black text-orange-600">{magFormsPendingCount}</span><span className="text-[10px] text-slate-400 font-bold uppercase">Forms</span></div></div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-red-300 transition-all group" onClick={() => { setExpiryModalType('expired'); setShowExpiryModal(true); }}><div className="absolute -right-2 -bottom-2 text-red-50 opacity-10 group-hover:scale-110 transition-transform"><Flame size={80} /></div><div className="relative z-10"><div className="flex items-center justify-between mb-6"><div><p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Safety Alert</p><h3 className="text-sm font-bold text-slate-700 font-nepali">म्याद सकिएका</h3></div><div className="bg-red-100 p-2.5 rounded-xl text-red-600"><AlertOctagon size={20} /></div></div><div className="flex items-baseline gap-2"><span className="text-5xl font-black text-red-600">{expiredItems.length}</span><span className="text-[10px] text-slate-400 font-bold uppercase">Items</span></div></div></div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-amber-300 transition-all group" onClick={() => { setExpiryModalType('near-expiry'); setShowExpiryModal(true); }}><div className="absolute -right-2 -bottom-2 text-amber-50 opacity-10 group-hover:rotate-12 transition-transform"><CalendarClock size={80} /></div><div className="relative z-10"><div className="flex items-center justify-between mb-6"><div><p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Soon</p><h3 className="text-sm font-bold text-slate-700 font-nepali">सकिन लागेका</h3></div><div className="bg-amber-100 p-2.5 rounded-xl text-amber-600"><Timer size={20} /></div></div><div className="flex items-baseline gap-2"><span className="text-5xl font-black text-amber-600">{nearExpiryItems.length}</span><span className="text-[10px] text-slate-400 font-bold uppercase">90 Days</span></div></div></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="font-bold text-slate-800 font-nepali mb-4 flex items-center gap-2"><Syringe size={18} className="text-indigo-600"/> आजका खोप सेवाग्राहीहरू (D0, D3, D7)</h4>
                <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 font-bold"><tr><th className="p-2 border-b">बिरामीको नाम</th><th className="p-2 border-b text-center">डोज</th><th className="p-2 border-b text-right">सम्पर्क</th></tr></thead>
                    <tbody className="divide-y">
                        {rabiesPatients.filter(p => p.schedule.some(d => fixDate(d.dateBs || '') === fixDate(new NepaliDate().format('YYYY-MM-DD')))).map(p => (
                            <tr key={p.id} className="hover:bg-slate-50"><td className="p-2 font-bold">{p.name}</td><td className="p-2 text-center"><div className="flex justify-center gap-1">{p.schedule.filter(d => fixDate(d.dateBs || '') === fixDate(new NepaliDate().format('YYYY-MM-DD'))).map(d => ( <span key={d.day} className={`px-2 py-0.5 rounded-full font-black text-[10px] ${d.status === 'Given' ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'}`}>D{d.day}</span> ))}</div></td><td className="p-2 text-right font-mono">{p.phone}</td></tr>
                        ))}
                    </tbody>
                </table>
             </div>
             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><h4 className="font-bold text-slate-800 font-nepali mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-blue-600"/> मौज्दात सारांश</h4><div className="grid grid-cols-2 gap-4"><div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 text-center"><p className="text-xs font-bold text-slate-500 uppercase mb-1">खर्च हुने (Expendable)</p><p className="text-2xl font-black text-blue-700">{inventoryItems.filter(i => i.itemType === 'Expendable' && i.currentQuantity > 0).length}</p></div><div className="p-4 bg-teal-50/50 rounded-xl border border-teal-100 text-center"><p className="text-xs font-bold text-slate-500 uppercase mb-1">खर्च नहुने (Non-Exp)</p><p className="text-2xl font-black text-teal-700">{inventoryItems.filter(i => i.itemType === 'Non-Expendable' && i.currentQuantity > 0).length}</p></div></div></div>
          </div>
        </div>
      );
      case 'khop_sewa': return <VaccinationServiceTabs currentFiscalYear={currentFiscalYear} generalSettings={generalSettings} onUpdateGeneralSettings={onUpdateGeneralSettings} garbhawatiPatients={garbhawatiPatients} onAddGarbhawatiPatient={onAddGarbhawatiPatient} onUpdateGarbhawatiPatient={onUpdateGarbhawatiPatient} onDeleteGarbhawatiPatient={onDeleteGarbhawatiPatient} bachhaImmunizationRecords={bachhaImmunizationRecords} onAddBachhaImmunizationRecord={onAddBachhaImmunizationRecord} onUpdateBachhaImmunizationRecord={onUpdateBachhaImmunizationRecord} onDeleteBachhaImmunizationRecord={onDeleteBachhaImmunizationRecord} />;
      case 'immunization_tracking': return <ImmunizationTracking currentFiscalYear={currentFiscalYear} records={bachhaImmunizationRecords} generalSettings={generalSettings} />;
      case 'report_khop': return <ImmunizationReport currentFiscalYear={currentFiscalYear} bachhaRecords={bachhaImmunizationRecords} maternalRecords={garbhawatiPatients} generalSettings={generalSettings} />;
      case 'user_management': return <UserManagement currentUser={currentUser} users={users} onAddUser={onAddUser} onUpdateUser={onUpdateUser} onDeleteUser={onDeleteUser} />;
      case 'change_password': return <ChangePassword currentUser={currentUser} users={users} onChangePassword={onChangePassword} />;
      case 'store_setup': return <StoreSetup currentUser={currentUser} currentFiscalYear={currentFiscalYear} stores={stores} onAddStore={onAddStore} onUpdateStore={onUpdateStore} onDeleteStore={onDeleteStore} inventoryItems={inventoryItems} onUpdateInventoryItem={onUpdateInventoryItem} />;
      case 'tb_leprosy': return <TBPatientRegistration currentFiscalYear={currentFiscalYear} patients={tbPatients} onAddPatient={onAddTbPatient} onUpdatePatient={onUpdateTbPatient} onDeletePatient={onDeleteTbPatient} />;
      case 'rabies': return <RabiesRegistration currentFiscalYear={currentFiscalYear} patients={rabiesPatients} onAddPatient={onAddRabiesPatient} onUpdatePatient={onUpdatePatient} onDeletePatient={onDeletePatient} currentUser={currentUser} />;
      case 'report_rabies': return <RabiesReport currentFiscalYear={currentFiscalYear} currentUser={currentUser} patients={rabiesPatients} />;
      case 'mag_faram': return <MagFaram currentFiscalYear={currentFiscalYear} currentUser={currentUser} existingForms={magForms} onSave={onSaveMagForm} onDelete={onDeleteMagForm} inventoryItems={inventoryItems} stores={stores} generalSettings={generalSettings} />;
      case 'kharid_adesh': return <KharidAdesh orders={purchaseOrders} currentFiscalYear={currentFiscalYear} onSave={onUpdatePurchaseOrder} currentUser={currentUser} firms={firms} quotations={quotations} onDakhilaClick={(po) => { setActiveItem('jinshi_maujdat'); setPendingPoDakhila(po); }} generalSettings={generalSettings} inventoryItems={inventoryItems} />;
      case 'nikasha_pratibedan': return <NikashaPratibedan reports={issueReports} onSave={onUpdateIssueReport} currentUser={currentUser} currentFiscalYear={currentFiscalYear} generalSettings={generalSettings} />;
      case 'form_suchikaran': return <FirmListing currentFiscalYear={currentFiscalYear} firms={firms} onAddFirm={onAddFirm} />;
      case 'quotation': return <Quotation currentFiscalYear={currentFiscalYear} firms={firms} quotations={quotations} onAddQuotation={onAddQuotation} inventoryItems={inventoryItems} />;
      case 'jinshi_maujdat': return <JinshiMaujdat currentFiscalYear={currentFiscalYear} currentUser={currentUser} inventoryItems={inventoryItems} onAddInventoryItem={onAddInventoryItem} onUpdateInventoryItem={onUpdateInventoryItem} onDeleteInventoryItem={onDeleteInventoryItem} onRequestStockEntry={onRequestStockEntry} stores={stores} pendingPoDakhila={pendingPoDakhila} onClearPendingPoDakhila={() => setPendingPoDakhila(null)} />;
      case 'stock_entry_approval': return <StockEntryApproval requests={stockEntryRequests} currentUser={currentUser} onApprove={onApproveStockEntry} onReject={onRejectStockEntry} stores={stores} />;
      case 'dakhila_pratibedan': return <DakhilaPratibedan dakhilaReports={dakhilaReports} onSaveDakhilaReport={onSaveDakhilaReport} currentFiscalYear={currentFiscalYear} currentUser={currentUser} stockEntryRequests={stockEntryRequests} generalSettings={generalSettings} stores={stores} />;
      case 'sahayak_jinshi_khata': return <SahayakJinshiKhata currentFiscalYear={currentFiscalYear} currentUser={currentUser} inventoryItems={inventoryItems} issueReports={issueReports} dakhilaReports={dakhilaReports} users={users} returnEntries={returnEntries} generalSettings={generalSettings} />;
      case 'jinshi_khata': return <JinshiKhata currentFiscalYear={currentFiscalYear} inventoryItems={inventoryItems} issueReports={issueReports} dakhilaReports={dakhilaReports} stockEntryRequests={stockEntryRequests} returnEntries={returnEntries} generalSettings={generalSettings} stores={stores} />;
      case 'jinshi_firta_khata': return <JinshiFirtaFaram currentFiscalYear={currentFiscalYear} currentUser={currentUser} inventoryItems={inventoryItems} returnEntries={returnEntries} onSaveReturnEntry={onSaveReturnEntry} issueReports={issueReports} generalSettings={generalSettings} />;
      case 'marmat_adesh': return <MarmatAdesh currentFiscalYear={currentFiscalYear} currentUser={currentUser} marmatEntries={marmatEntries} onSaveMarmatEntry={onSaveMarmatEntry} inventoryItems={inventoryItems} generalSettings={generalSettings} />;
      case 'dhuliyauna_faram': return <DhuliyaunaFaram currentFiscalYear={currentFiscalYear} currentUser={currentUser} inventoryItems={inventoryItems} dhuliyaunaEntries={dhuliyaunaEntries} onSaveDhuliyaunaEntry={onSaveDhuliyaunaEntry} stores={stores} />;
      case 'log_book': return <LogBook currentUser={currentUser} currentFiscalYear={currentFiscalYear} inventoryItems={inventoryItems} logBookEntries={logBookEntries} onAddLogEntry={onSaveLogBookEntry} />;
      case 'report_inventory_monthly': return <InventoryMonthlyReport 
                                              currentFiscalYear={currentFiscalYear} 
                                              currentUser={currentUser} 
                                              inventoryItems={inventoryItems} 
                                              magForms={magForms} 
                                              onSaveMagForm={onSaveMagForm} 
                                              generalSettings={generalSettings}
                                              dakhilaReports={dakhilaReports} // Pass dakhilaReports
                                              issueReports={issueReports} // Pass issueReports
                                              stockEntryRequests={stockEntryRequests} // Pass stockEntryRequests
                                              stores={stores} // Pass stores
                                            />;
      case 'database_management': return <DatabaseManagement currentUser={currentUser} users={users} inventoryItems={inventoryItems} magForms={magForms} purchaseOrders={purchaseOrders} issueReports={issueReports} rabiesPatients={rabiesPatients} tbPatients={tbPatients} firms={firms} stores={stores} dakhilaReports={dakhilaReports} returnEntries={returnEntries} marmatEntries={marmatEntries} dhuliyaunaEntries={dhuliyaunaEntries} logBookEntries={logBookEntries} onClearData={onClearData} onUploadData={onUploadData} />;
      case 'general_setting': return <GeneralSetting currentUser={currentUser} settings={generalSettings} onUpdateSettings={onUpdateGeneralSettings} />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-nepali">
      {/* Sidebar Overlay (Now always relevant if isSidebarOpen is true) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Modified to be hidden by default on all screens */}
      <aside className={`
        fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-200 z-40 transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary-600 p-2 rounded-xl text-white shadow-lg shadow-primary-200">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h1 className="text-lg font-black text-slate-800 tracking-tight">{APP_NAME}</h1>
                <p className="text-[10px] text-primary-600 font-bold uppercase tracking-widest">Management System</p>
              </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg">
              <X size={20} />
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-hide">
            {menuItems.map((menu) => (
              <div key={menu.id}>
                {menu.subItems ? (
                  <div className="space-y-1">
                    <button
                      onClick={() => setExpandedMenu(expandedMenu === menu.id ? null : menu.id)}
                      className={`
                        w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200
                        ${expandedMenu === menu.id ? 'bg-primary-50 text-primary-700' : 'text-slate-700 hover:bg-slate-50'}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`${expandedMenu === menu.id ? 'text-primary-600' : 'text-slate-700'}`}>{menu.icon}</span>
                        <span className="font-bold text-sm">{menu.label}</span>
                      </div>
                      <span className="transition-transform duration-300">
                        {expandedMenu === menu.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </span>
                    </button>
                    
                    {expandedMenu === menu.id && (
                      <div className="pl-12 space-y-1 animate-in slide-in-from-top-2 duration-300">
                        {menu.subItems.map((sub) => (
                          <button
                            key={sub.id}
                            onClick={() => { setActiveItem(sub.id); setIsSidebarOpen(false); }}
                            className={`
                              w-full flex items-center gap-3 p-2.5 rounded-lg text-sm transition-all
                              ${activeItem === sub.id ? 'text-primary-700 font-black bg-white shadow-sm' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'}
                            `}
                          >
                            <span className={`${activeItem === sub.id ? 'text-primary-600' : 'text-slate-500'}`}>{sub.icon}</span>
                            <span>{sub.label}</span>
                            {sub.badgeCount !== undefined && sub.badgeCount > 0 && (
                              <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{sub.badgeCount}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => { setActiveItem(menu.id); setExpandedMenu(null); setIsSidebarOpen(false); }}
                    className={`
                      w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200
                      ${activeItem === menu.id ? 'bg-primary-600 text-white shadow-lg shadow-primary-200 font-bold' : 'text-slate-700 hover:bg-slate-50'}
                    `}
                  >
                    <span className={`${activeItem === menu.id ? 'text-white' : 'text-slate-700'}`}>{menu.icon}</span>
                    <span className="text-sm">{menu.label}</span>
                  </button>
                )}
              </div>
            ))}
          </nav>

          {/* User Profile Summary */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700">
                <UserCog size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-800 truncate">{currentUser?.fullName}</p>
                <p className="text-[10px] text-slate-500 truncate">{currentUser?.role}</p>
              </div>
              <button 
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Header - Always shows the Menu Button now */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-4">
            {/* Always visible Menu Button */}
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg">
              <Menu size={20} />
            </button>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-200">
              <Calendar size={14} className="text-slate-400" />
              <span className="text-[11px] font-bold text-slate-600 font-nepali">आ.व. {currentFiscalYear}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications Dropdown */}
            <div className="relative" ref={notifRef}>
                <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className={`p-2 rounded-xl border transition-all relative ${showNotifications ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                >
                    <Bell size={20} className="text-slate-600" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white animate-bounce">
                            {unreadCount}
                        </span>
                    )}
                </button>

                {showNotifications && (
                    <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
                            <button onClick={clearAllNotifs} className="text-[10px] font-bold text-primary-600 hover:underline">Mark all read</button>
                        </div>
                        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
                            {notifications.length > 0 ? (
                                notifications.map(n => (
                                    <button 
                                        key={n.id}
                                        onClick={() => handleNotifClick(n)}
                                        className={`w-full text-left p-3 rounded-xl transition-all border flex gap-3 group
                                            ${n.isNew ? 'bg-primary-50/50 border-primary-100 hover:bg-primary-50' : 'bg-white border-transparent hover:bg-slate-50'}
                                        `}
                                    >
                                        <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center
                                            ${n.type === 'success' ? 'bg-green-100 text-green-600' : 
                                              n.type === 'warning' ? 'bg-orange-100 text-orange-600' :
                                              n.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}
                                        `}>
                                            {n.type === 'success' ? <CheckCircle2 size={16}/> : n.type === 'error' ? <AlertTriangle size={16}/> : <Info size={16}/>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-800 leading-tight group-hover:text-primary-700">{n.title}</p>
                                            <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{n.description}</p>
                                            <p className="text-[9px] text-slate-400 mt-1 font-nepali">{n.time}</p>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="p-12 text-center text-slate-400">
                                    <Bell size={32} className="mx-auto mb-2 opacity-20" />
                                    <p className="text-xs italic font-nepali">कुनै सूचना छैन।</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="h-8 w-px bg-slate-200"></div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-800 leading-none">{currentUser?.fullName}</p>
                <p className="text-[10px] text-slate-400 mt-1">{currentUser?.designation}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                <UserCog size={20} />
              </div>
            </div>
          </div>
        </header>

        {/* Content Section */}
        <main ref={mainContentRef} className="flex-1 overflow-y-auto p-6 md:p-8 scroll-smooth no-print">
          <div className="max-w-7xl mx-auto min-h-full">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Expiry Alert Modal */}
      {showExpiryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowExpiryModal(false)}></div>
              <div className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
                  <div className={`px-8 py-6 border-b flex justify-between items-center ${expiryModalType === 'expired' ? 'bg-red-50' : 'bg-amber-50'}`}>
                      <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-2xl ${expiryModalType === 'expired' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                              {expiryModalType === 'expired' ? <AlertOctagon size={24} /> : <Timer size={24} />}
                          </div>
                          <div>
                              <h3 className={`text-xl font-black font-nepali ${expiryModalType === 'expired' ? 'text-red-900' : 'text-amber-900'}`}>
                                  {expiryModalType === 'expired' ? 'म्याद सकिएका सामानहरू (Expired Items)' : 'म्याद सकिन लागेका सामानहरू (Near Expiry)'}
                              </h3>
                              <p className={`text-xs font-bold uppercase tracking-widest ${expiryModalType === 'expired' ? 'text-red-600' : 'text-amber-600'}`}>
                                  Safety Monitoring Alert
                              </p>
                          </div>
                      </div>
                      <button onClick={() => setShowExpiryModal(false)} className="p-2 hover:bg-white/50 rounded-full transition-colors"><X size={24} /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 z-10">
                              <tr><th className="px-8 py-4 border-b">सामानको नाम</th><th className="px-6 py-4 border-b">ब्याच नं</th><th className="px-6 py-4 border-b text-center">मौज्दात</th><th className="px-6 py-4 border-b text-right">म्याद सकिने मिति</th></tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {(expiryModalType === 'expired' ? expiredItems : nearExpiryItems).map(item => (
                                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                      <td className="px-8 py-4 font-bold text-slate-800">{item.itemName}</td>
                                      <td className="px-6 py-4 font-mono text-slate-500">{item.batchNo || '-'}</td>
                                      <td className="px-6 py-4 text-center"><span className="px-2.5 py-1 rounded-lg bg-slate-100 font-black text-slate-700">{item.currentQuantity} {item.unit}</span></td>
                                      <td className="px-6 py-4 text-right"><span className={`font-black font-nepali ${expiryModalType === 'expired' ? 'text-red-600' : 'text-orange-600'}`}>{item.expiryDateBs}</span><br/><span className="text-[10px] text-slate-400 font-mono">({item.expiryDateAd})</span></td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
                  <div className="p-6 border-t bg-slate-50 flex justify-between items-center">
                      <div className="text-xs text-slate-400 italic">Total Items Found: {expiryModalType === 'expired' ? expiredItems.length : nearExpiryItems.length}</div>
                      <button onClick={() => setShowExpiryModal(false)} className="bg-slate-800 text-white px-8 py-2.5 rounded-2xl font-bold hover:bg-slate-900 shadow-lg shadow-slate-200 transition-all">Close Window</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
