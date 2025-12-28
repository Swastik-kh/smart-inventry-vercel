
import React, { useState, useMemo } from 'react';
import { 
  LogOut, Menu, Calendar, Stethoscope, Package, FileText, Settings, LayoutDashboard, 
  ChevronDown, ChevronRight, Syringe, Activity, 
  ClipboardList, FileSpreadsheet, FilePlus, ShoppingCart, FileOutput, 
  BookOpen, Book, Archive, RotateCcw, Wrench, Scroll, BarChart3,
  Sliders, Store, ShieldCheck, Users, Database, KeyRound, UserCog, Lock, Warehouse, ClipboardCheck, Bell, X, CheckCircle2, ArrowRightCircle, AlertTriangle, Pill, Scissors, Clock, Calculator, Trash2 
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

export const Dashboard: React.FC<DashboardProps> = ({ 
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
  onClearData
}) => {
  const fiscalYearLabel = FISCAL_YEARS.find(fy => fy.value === currentFiscalYear)?.label || currentFiscalYear;

  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [pendingPoDakhila, setPendingPoDakhila] = useState<PurchaseOrderEntry | null>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [lastSeenNotificationId, setLastSeenNotificationId] = useState<string | null>(null);

  const latestApprovedDakhila = useMemo(() => {
      const approved = stockEntryRequests.filter(req => req.status === 'Approved');
      return approved.length > 0 ? approved.sort((a, b) => parseInt(b.id) - parseInt(a.id))[0] : null;
  }, [stockEntryRequests]);

  const handleNotificationClick = () => {
      if (latestApprovedDakhila) {
          setLastSeenNotificationId(latestApprovedDakhila.id);
          setShowNotificationModal(true);
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
      case 'dashboard': return <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4"><div className="flex items-center gap-3 border-b pb-4"><div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><Activity size={24} /></div><div><h2 className="text-xl font-bold text-slate-800 font-nepali">मुख्य जानकारी</h2><p className="text-sm text-slate-500">प्रणालीको हालको अवस्था</p></div></div><p className="text-slate-500 italic">कृपया मेनुबाट विकल्प छान्नुहोस्।</p></div>;
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
      case 'jinshi_maujdat': return <JinshiMaujdat currentFiscalYear={currentFiscalYear} currentUser={currentUser} inventoryItems={inventoryItems} onAddInventoryItem={onAddInventoryItem} onUpdateInventoryItem={onUpdateInventoryItem} stores={stores} onRequestStockEntry={onRequestStockEntry} pendingPoDakhila={pendingPoDakhila} onClearPendingPoDakhila={() => setPendingPoDakhila(null)} />;
      case 'stock_entry_approval': return <StockEntryApproval requests={stockEntryRequests} currentUser={currentUser} onApprove={onApproveStockEntry} onReject={onRejectStockEntry} stores={stores} />;
      case 'dakhila_pratibedan': return <DakhilaPratibedan dakhilaReports={dakhilaReports} onSaveDakhilaReport={onSaveDakhilaReport} currentFiscalYear={currentFiscalYear} currentUser={currentUser} stockEntryRequests={stockEntryRequests} onApproveStockEntry={onApproveStockEntry} onRejectStockEntry={onRejectStockEntry} generalSettings={generalSettings} stores={stores} />;
      case 'sahayak_jinshi_khata': return <SahayakJinshiKhata currentFiscalYear={currentFiscalYear} currentUser={currentUser} inventoryItems={inventoryItems} issueReports={issueReports} dakhilaReports={dakhilaReports} stockEntryRequests={stockEntryRequests} users={users} returnEntries={returnEntries} generalSettings={generalSettings} />;
      case 'jinshi_khata': return <JinshiKhata currentFiscalYear={currentFiscalYear} inventoryItems={inventoryItems} issueReports={issueReports} dakhilaReports={dakhilaReports} stockEntryRequests={stockEntryRequests} returnEntries={returnEntries} generalSettings={generalSettings} />;
      case 'jinshi_firta_khata': return <JinshiFirtaFaram currentFiscalYear={currentFiscalYear} currentUser={currentUser} inventoryItems={inventoryItems} returnEntries={returnEntries} onSaveReturnEntry={onSaveReturnEntry} issueReports={issueReports} generalSettings={generalSettings} />;
      case 'marmat_adesh': return <MarmatAdesh currentFiscalYear={currentFiscalYear} currentUser={currentUser} marmatEntries={marmatEntries} onSaveMarmatEntry={onSaveMarmatEntry} inventoryItems={inventoryItems} generalSettings={generalSettings} />;
      case 'dhuliyauna_faram': return <DhuliyaunaFaram currentFiscalYear={currentFiscalYear} currentUser={currentUser} inventoryItems={inventoryItems} dhuliyaunaEntries={dhuliyaunaEntries} onSaveDhuliyaunaEntry={onSaveDhuliyaunaEntry} stores={stores} />;
      case 'log_book': return <LogBook currentUser={currentUser} currentFiscalYear={currentFiscalYear} inventoryItems={inventoryItems} logBookEntries={logBookEntries} onAddLogEntry={onSaveLogBookEntry} />;
      case 'report_inventory_monthly': return <InventoryMonthlyReport currentFiscalYear={currentFiscalYear} currentUser={currentUser} inventoryItems={inventoryItems} stores={stores} magForms={magForms} onSaveMagForm={onSaveMagForm} generalSettings={generalSettings} />;
      case 'database_management': return <DatabaseManagement currentUser={currentUser} users={users} inventoryItems={inventoryItems} magForms={magForms} purchaseOrders={purchaseOrders} issueReports={issueReports} rabiesPatients={rabiesPatients} firms={firms} stores={stores} onClearData={onClearData} />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden no-print" onClick={() => setIsSidebarOpen(false)} />}
      <aside className={`fixed md:relative z-50 h-full bg-slate-900 text-white flex flex-col transition-all duration-300 ease-in-out no-print ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-0 md:w-0 md:translate-x-0'}`}>
        <div className="p-6 border-b border-slate-800 flex items-center gap-3 bg-slate-950 shrink-0 overflow-hidden">
            <div className="bg-primary-600 p-2 rounded-lg shrink-0"><Activity size={20} className="text-white" /></div>
            <div className="whitespace-nowrap"><h2 className="font-nepali font-bold text-lg">{APP_NAME}</h2><p className="text-xs text-slate-400 font-nepali truncate">{currentUser.organizationName || ORG_NAME}</p></div>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden">
             {menuItems.map((item) => (
               <div key={item.id} className="w-full">
                  <button onClick={() => handleMenuClick(item)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl group transition-all duration-200 ${activeItem === item.id ? 'bg-primary-600 text-white' : (expandedMenu === item.id ? 'bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800')}`}>
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
        <div className="p-4 border-t border-slate-800 bg-slate-950 shrink-0"><button onClick={onLogout} className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 w-full rounded-xl transition-all whitespace-nowrap"><LogOut size={18} /><span>लगआउट</span></button></div>
      </aside>
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        <header className="bg-white border-b p-4 flex md:hidden items-center justify-between z-10 no-print">
            <div className="flex items-center gap-3"><button onClick={() => setIsSidebarOpen(true)} className="bg-primary-600 p-1.5 rounded-md"><Menu size={18} className="text-white" /></button><span className="font-bold text-slate-700 font-nepali truncate">{APP_NAME}</span></div>
            <div className="flex items-center gap-4">{latestApprovedDakhila && <button onClick={handleNotificationClick} className="relative p-1 text-slate-600"><Bell size={20} />{latestApprovedDakhila.id !== lastSeenNotificationId && <span className="absolute top-0 right-0 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}</button>}<button onClick={onLogout} className="text-slate-500"><LogOut size={20} /></button></div>
        </header>
        <div className="hidden md:flex bg-white border-b px-8 py-4 justify-between items-center z-10 no-print">
            <div className="flex items-center gap-4">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors"><Menu size={24} /></button>
                <h2 className="text-lg font-semibold text-slate-700 font-nepali">ड्यासबोर्ड</h2>
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"><Calendar size={14} /><span className="font-nepali">आ.व. {fiscalYearLabel}</span></div>
            </div>
            <div className="flex items-center gap-6">
                <button onClick={handleNotificationClick} className="p-2 text-slate-600 relative" disabled={!latestApprovedDakhila}><Bell size={22} />{latestApprovedDakhila && latestApprovedDakhila.id !== lastSeenNotificationId && <span className="absolute top-1.5 right-2 h-3 w-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}</button>
                <div className="flex items-center gap-3">
                    <div className="text-right"><p className="text-sm font-bold truncate max-w-[150px]">{currentUser.fullName}</p><p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{currentUser.role}</p></div>
                    <div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-xl flex items-center justify-center font-bold uppercase shadow-sm">{currentUser.username.charAt(0)}</div>
                </div>
            </div>
        </div>
        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-6 relative">{renderContent()}</main>
      </div>
    </div>
  );
};
