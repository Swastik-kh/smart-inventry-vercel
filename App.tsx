
import React, { useState, useEffect } from 'react';
import { LoginForm } from './components/LoginForm';
import { Dashboard } from './components/Dashboard';
import { APP_NAME, ORG_NAME } from './constants';
import { Landmark, ShieldCheck } from 'lucide-react';
import { User, OrganizationSettings, MagFormEntry, RabiesPatient, PurchaseOrderEntry, IssueReportEntry, FirmEntry, QuotationEntry, InventoryItem, Store, StockEntryRequest, DakhilaPratibedanEntry, ReturnEntry, MarmatEntry, DhuliyaunaEntry, LogBookEntry, DakhilaItem } from './types';
import { db } from './firebase';
import { ref, onValue, set, remove, update, get, Unsubscribe } from "firebase/database";

const INITIAL_SETTINGS: OrganizationSettings = {
    orgNameNepali: 'Smart Inventory System',
    orgNameEnglish: 'Smart Inventory System',
    subTitleNepali: 'जिन्सी व्यवस्थापन प्रणाली',
    address: 'City, Nepal',
    phone: '01-XXXXXXX',
    email: 'info@smartinventory.com',
    website: 'www.smartinventory.com',
    panNo: 'XXXXXXXXX',
    defaultVatRate: '13',
    activeFiscalYear: '2081/082',
    enableEnglishDate: 'no',
    logoUrl: ''
};

const DEFAULT_ADMIN: User = {
    id: 'superadmin',
    username: 'admin',
    password: 'admin',
    role: 'SUPER_ADMIN',
    organizationName: 'Smart Inventory HQ',
    fullName: 'Administrator',
    designation: 'System Manager',
    phoneNumber: '98XXXXXXXX',
    allowedMenus: ['dashboard', 'inventory', 'settings']
};

const App: React.FC = () => {
  const [allUsers, setAllUsers] = useState<User[]>([]); // All users for login check
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentFiscalYear, setCurrentFiscalYear] = useState<string>('2081/082');
  const [generalSettings, setGeneralSettings] = useState<OrganizationSettings>(INITIAL_SETTINGS);
  const [isDbConnected, setIsDbConnected] = useState(false);
  
  // Organization-specific data states
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [magForms, setMagForms] = useState<MagFormEntry[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderEntry[]>([]);
  const [issueReports, setIssueReports] = useState<IssueReportEntry[]>([]);
  const [stockEntryRequests, setStockEntryRequests] = useState<StockEntryRequest[]>([]);
  const [dakhilaReports, setDakhilaReports] = useState<DakhilaPratibedanEntry[]>([]);
  const [returnEntries, setReturnEntries] = useState<ReturnEntry[]>([]);
  const [firms, setFirms] = useState<FirmEntry[]>([]);
  const [quotations, setQuotations] = useState<QuotationEntry[]>([]);
  const [rabiesPatients, setRabiesPatients] = useState<RabiesPatient[]>([]);
  const [marmatEntries, setMarmatEntries] = useState<MarmatEntry[]>([]);
  const [dhuliyaunaEntries, setDhuliyaunaEntries] = useState<DhuliyaunaEntry[]>([]);
  const [logBookEntries, setLogBookEntries] = useState<LogBookEntry[]>([]);

  // 1. Global Listeners (Connection & Login Validation)
  useEffect(() => {
    const connectedRef = ref(db, ".info/connected");
    onValue(connectedRef, (snap) => setIsDbConnected(snap.val() === true));

    // Ensure Super Admin exists for the portal
    const adminRef = ref(db, 'users/superadmin');
    get(adminRef).then((snapshot) => {
        if (!snapshot.exists()) {
            set(adminRef, DEFAULT_ADMIN);
        }
    });

    // Listen to users globally for authentication
    const usersRef = ref(db, 'users');
    const unsub = onValue(usersRef, (snap) => {
        const data = snap.val();
        const userList = data ? Object.keys(data).map(key => ({ ...data[key], id: key })) : [];
        setAllUsers(userList.length > 0 ? userList : [DEFAULT_ADMIN]);
    });

    return () => unsub();
  }, []);

  // 2. Organization-Specific Data Isolation logic
  useEffect(() => {
    if (!currentUser) {
        // Full reset when logged out
        setInventoryItems([]);
        setStores([]);
        setMagForms([]);
        setPurchaseOrders([]);
        setIssueReports([]);
        setStockEntryRequests([]);
        setDakhilaReports([]);
        setReturnEntries([]);
        setFirms([]);
        setQuotations([]);
        setRabiesPatients([]);
        setMarmatEntries([]);
        setDhuliyaunaEntries([]);
        setLogBookEntries([]);
        setGeneralSettings(INITIAL_SETTINGS);
        return;
    }

    // CREATE SECURE PATH FOR THIS ORGANIZATION
    const safeOrgName = currentUser.organizationName.trim().replace(/[.#$[\]]/g, "_");
    const orgPath = `orgData/${safeOrgName}`;
    const unsubscribes: Unsubscribe[] = [];

    const setupOrgListener = (subPath: string, setter: Function) => {
        const unsub = onValue(ref(db, `${orgPath}/${subPath}`), (snap) => {
            const data = snap.val();
            setter(data ? Object.keys(data).map(key => ({ ...data[key], id: key })) : []);
        });
        unsubscribes.push(unsub);
    };

    // Load org-specific settings (or initialize if new org)
    onValue(ref(db, `${orgPath}/settings`), (snap) => {
        if (snap.exists()) {
            setGeneralSettings(snap.val());
        } else {
            // First time org setup: create default settings
            const firstSettings = { ...INITIAL_SETTINGS, orgNameNepali: currentUser.organizationName, orgNameEnglish: currentUser.organizationName };
            set(ref(db, `${orgPath}/settings`), firstSettings);
            setGeneralSettings(firstSettings);
        }
    });

    // Subscriptions: Only listening to the folder of current organization
    setupOrgListener('inventory', setInventoryItems);
    setupOrgListener('stores', setStores);
    setupOrgListener('magForms', setMagForms);
    setupOrgListener('purchaseOrders', setPurchaseOrders);
    setupOrgListener('issueReports', setIssueReports);
    setupOrgListener('stockRequests', setStockEntryRequests);
    setupOrgListener('dakhilaReports', setDakhilaReports);
    setupOrgListener('returnEntries', setReturnEntries);
    setupOrgListener('firms', setFirms);
    setupOrgListener('quotations', setQuotations);
    setupOrgListener('rabiesPatients', setRabiesPatients);
    setupOrgListener('marmatEntries', setMarmatEntries);
    setupOrgListener('disposalEntries', setDhuliyaunaEntries);
    setupOrgListener('logBook', setLogBookEntries);

    return () => {
        unsubscribes.forEach(unsub => unsub());
    };
  }, [currentUser]);

  const handleLoginSuccess = (user: User, fiscalYear: string) => {
    setCurrentUser(user);
    setCurrentFiscalYear(fiscalYear);
  };

  // Safe reference for organization data writing
  const getOrgRef = (subPath: string) => {
      const safeOrgName = currentUser?.organizationName.trim().replace(/[.#$[\]]/g, "_") || "unknown";
      return ref(db, `orgData/${safeOrgName}/${subPath}`);
  };

  // Filter users list to pass ONLY same-org users to the Dashboard
  const filteredUsersForDashboard = allUsers.filter(u => {
      if (currentUser?.role === 'SUPER_ADMIN') return true; // Super admin sees everyone
      return u.organizationName === currentUser?.organizationName; // Others see only their own
  });

  const handleApproveStockEntry = async (requestId: string, approverName: string) => {
      if (!currentUser) return;
      try {
          const safeOrgName = currentUser.organizationName.trim().replace(/[.#$[\]]/g, "_");
          const orgPath = `orgData/${safeOrgName}`;
          
          const requestRef = ref(db, `${orgPath}/stockRequests/${requestId}`);
          const requestSnap = await get(requestRef);
          
          if (!requestSnap.exists()) return;
          const request: StockEntryRequest = requestSnap.val();
          
          const invAllSnap = await get(ref(db, `${orgPath}/inventory`));
          const currentInvData = invAllSnap.val() || {};
          const currentInvList: InventoryItem[] = Object.keys(currentInvData).map(k => ({ ...currentInvData[k], id: k }));

          const updates: Record<string, any> = {};
          const dakhilaItems: DakhilaItem[] = [];

          for (const item of request.items) {
              const existingItem = currentInvList.find(i => 
                  i.itemName.trim().toLowerCase() === item.itemName.trim().toLowerCase() && 
                  i.storeId === request.storeId &&
                  i.itemType === item.itemType
              );

              const incomingQty = Number(item.currentQuantity) || 0;
              const incomingRate = Number(item.rate) || 0;
              const incomingTax = Number(item.tax) || 0;
              const incomingExclVat = incomingQty * incomingRate;
              const incomingVatAmount = incomingExclVat * (incomingTax / 100);
              const incomingTotal = incomingExclVat + incomingVatAmount;

              dakhilaItems.push({
                  id: Date.now() + Math.random(),
                  name: item.itemName,
                  codeNo: item.sanketNo || item.uniqueCode || '',
                  specification: item.specification || '',
                  source: request.receiptSource,
                  unit: item.unit,
                  quantity: incomingQty,
                  rate: incomingRate,
                  totalAmount: incomingExclVat,
                  vatAmount: incomingVatAmount,
                  grandTotal: incomingTotal,
                  otherExpenses: 0,
                  finalTotal: incomingTotal,
                  remarks: item.remarks || ''
              });

              if (existingItem) {
                  const newQty = (Number(existingItem.currentQuantity) || 0) + incomingQty;
                  const newVal = (Number(existingItem.totalAmount) || 0) + incomingTotal;
                  
                  updates[`${orgPath}/inventory/${existingItem.id}`] = {
                      ...existingItem,
                      ...item,
                      id: existingItem.id, 
                      currentQuantity: newQty,
                      totalAmount: newVal,
                      lastUpdateDateBs: request.requestDateBs,
                      lastUpdateDateAd: request.requestDateAd,
                      receiptSource: request.receiptSource,
                      fiscalYear: request.fiscalYear,
                      storeId: request.storeId,
                      dakhilaNo: request.items[0]?.dakhilaNo || existingItem.dakhilaNo
                  };
              } else {
                  const newId = `ITEM-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                  updates[`${orgPath}/inventory/${newId}`] = {
                      ...item,
                      id: newId,
                      totalAmount: incomingTotal,
                      lastUpdateDateBs: request.requestDateBs,
                      lastUpdateDateAd: request.requestDateAd,
                      receiptSource: request.receiptSource,
                      fiscalYear: request.fiscalYear,
                      storeId: request.storeId,
                      dakhilaNo: request.items[0]?.dakhilaNo || item.dakhilaNo
                  };
              }
          }

          updates[`${orgPath}/stockRequests/${requestId}/status`] = 'Approved';
          updates[`${orgPath}/stockRequests/${requestId}/approvedBy`] = approverName;

          const formalDakhilaId = `DA-${Date.now()}`;
          const formalReport: DakhilaPratibedanEntry = {
              id: formalDakhilaId,
              fiscalYear: request.fiscalYear,
              dakhilaNo: request.items[0]?.dakhilaNo || formalDakhilaId,
              date: request.requestDateBs,
              orderNo: request.refNo || 'BULK-ENTRY',
              items: dakhilaItems,
              status: 'Final',
              preparedBy: { name: request.requesterName || request.requestedBy, designation: request.requesterDesignation || 'Staff' },
              approvedBy: { name: approverName, designation: 'Approver' }
          };
          updates[`${orgPath}/dakhilaReports/${formalDakhilaId}`] = formalReport;

          await update(ref(db), updates);
      } catch (error) {
          console.error("Critical Error during stock approval:", error);
          alert("सिस्टममा समस्या आयो। विवरणहरू सुरक्षित हुन सकेनन्।");
      }
  };

  return (
    <>
      {currentUser ? (
        <Dashboard 
          onLogout={() => setCurrentUser(null)} 
          currentUser={currentUser}
          currentFiscalYear={currentFiscalYear} 
          users={filteredUsersForDashboard}
          onAddUser={(u) => set(ref(db, `users/${u.id}`), u)}
          onUpdateUser={(u) => set(ref(db, `users/${u.id}`), u)}
          onDeleteUser={(id) => remove(ref(db, `users/${id}`))}
          onChangePassword={(id, pass) => update(ref(db, `users/${id}`), { password: pass })}
          generalSettings={generalSettings}
          onUpdateGeneralSettings={(s) => set(getOrgRef('settings'), s)}
          magForms={magForms}
          onSaveMagForm={(f) => set(getOrgRef(`magForms/${f.id}`), f)}
          purchaseOrders={purchaseOrders}
          onUpdatePurchaseOrder={(o) => set(getOrgRef(`purchaseOrders/${o.id}`), o)}
          issueReports={issueReports}
          onUpdateIssueReport={(r) => set(getOrgRef(`issueReports/${r.id}`), r)}
          rabiesPatients={rabiesPatients}
          onAddRabiesPatient={(p) => set(getOrgRef(`rabiesPatients/${p.id}`), p)}
          onUpdateRabiesPatient={(p) => set(getOrgRef(`rabiesPatients/${p.id}`), p)}
          onDeletePatient={(id) => remove(getOrgRef(`rabiesPatients/${id}`))}
          firms={firms}
          onAddFirm={(f) => set(getOrgRef(`firms/${f.id}`), f)}
          quotations={quotations}
          onAddQuotation={(q) => set(getOrgRef(`quotations/${q.id}`), q)}
          inventoryItems={inventoryItems}
          onAddInventoryItem={(i) => set(getOrgRef(`inventory/${i.id}`), i)}
          onUpdateInventoryItem={(i) => set(getOrgRef(`inventory/${i.id}`), i)}
          stockEntryRequests={stockEntryRequests}
          onRequestStockEntry={(r) => set(getOrgRef(`stockRequests/${r.id}`), r)}
          onApproveStockEntry={handleApproveStockEntry}
          onRejectStockEntry={(id, res, app) => update(getOrgRef(`stockRequests/${id}`), { status: 'Rejected', rejectionReason: res, approvedBy: app })}
          stores={stores}
          onAddStore={(s) => set(getOrgRef(`stores/${s.id}`), s)}
          onUpdateStore={(s) => set(getOrgRef(`stores/${s.id}`), s)}
          onDeleteStore={(id) => remove(getOrgRef(`stores/${id}`))}
          dakhilaReports={dakhilaReports}
          onSaveDakhilaReport={(r) => set(getOrgRef(`dakhilaReports/${r.id}`), r)}
          returnEntries={returnEntries}
          onSaveReturnEntry={(e) => set(getOrgRef(`returnEntries/${e.id}`), e)}
          marmatEntries={marmatEntries}
          onSaveMarmatEntry={(e) => set(getOrgRef(`marmatEntries/${e.id}`), e)}
          dhuliyaunaEntries={dhuliyaunaEntries}
          onSaveDhuliyaunaEntry={(e) => set(getOrgRef(`disposalEntries/${e.id}`), e)}
          logBookEntries={logBookEntries}
          onSaveLogBookEntry={(e) => set(getOrgRef(`logBook/${e.id}`), e)}
          onClearData={(p) => remove(getOrgRef(p))}
        />
      ) : (
        <div className="min-h-screen w-full bg-[#f8fafc] flex items-center justify-center p-6 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px]">
          <div className="w-full max-w-[440px] animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.08)] overflow-hidden border border-slate-100">
              <div className="bg-primary-600 p-12 text-center text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M0 100 C 20 0 50 0 100 100 Z" fill="currentColor"></path>
                    </svg>
                </div>
                <div className="relative z-10">
                    <div className="bg-white/20 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md shadow-inner border border-white/30">
                        <Landmark className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-extrabold font-nepali tracking-tight mb-2">{APP_NAME}</h1>
                    <p className="text-primary-100 font-semibold tracking-wide uppercase text-xs">जिन्सी व्यवस्थापन पोर्टल</p>
                </div>
              </div>
              <div className="p-10">
                <LoginForm 
                    users={allUsers} 
                    onLoginSuccess={handleLoginSuccess} 
                    initialFiscalYear={'2081/082'} 
                />
              </div>
              <div className="bg-slate-50 p-5 text-center border-t border-slate-100 flex items-center justify-center gap-3">
                 <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-200">
                    <span className={`w-2 h-2 rounded-full ${isDbConnected ? 'bg-green-50 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-50 animate-pulse'}`}></span>
                    <span className="text-[11px] text-slate-600 font-bold uppercase tracking-wider">{isDbConnected ? 'System Online' : 'System Offline'}</span>
                 </div>
                 <div className="flex items-center gap-1.5 text-slate-400">
                    <ShieldCheck size={14} />
                    <span className="text-[11px] font-medium">Secure Access</span>
                 </div>
              </div>
            </div>
            <p className="text-center mt-8 text-slate-400 text-xs font-medium uppercase tracking-widest">
                &copy; {new Date().getFullYear()} Smart Inventory Solutions
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
