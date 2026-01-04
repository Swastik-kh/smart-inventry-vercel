import React, { useState, useEffect } from 'react';
import { LoginForm } from './components/LoginForm';
import { Dashboard } from './components/Dashboard';
import { APP_NAME } from './constants';
import { Landmark, ShieldCheck } from 'lucide-react';
import { 
  User, OrganizationSettings, Signature
} from './types/coreTypes';
import { 
  MagFormEntry, PurchaseOrderEntry, IssueReportEntry, FirmEntry, QuotationEntry, 
  InventoryItem, Store, StockEntryRequest, DakhilaPratibedanEntry, ReturnEntry, 
  MarmatEntry, DhuliyaunaEntry, LogBookEntry, DakhilaItem 
} from './types/inventoryTypes';
import { 
  RabiesPatient, TBPatient, GarbhawatiPatient, ChildImmunizationRecord 
} from './types/healthTypes';

import { db } from './firebase';
import { ref, onValue, set, remove, update, get, Unsubscribe } from "firebase/database";
// @ts-ignore
import NepaliDate from 'nepali-date-converter';

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
    activeFiscalYear: '2082/083',
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
    allowedMenus: ['dashboard', 'inventory', 'settings', 'services', 'khop_sewa']
};

const App: React.FC = () => {
  const [allUsers, setAllUsers] = useState<User[]>([]); 
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentFiscalYear, setCurrentFiscalYear] = useState<string>('2082/083');
  const [generalSettings, setGeneralSettings] = useState<OrganizationSettings>(INITIAL_SETTINGS);
  const [isDbConnected, setIsDbConnected] = useState(false);
  
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
  const [tbPatients, setTbPatients] = useState<TBPatient[]>([]); 
  const [garbhawatiPatients, setGarbhawatiPatients] = useState<GarbhawatiPatient[]>([]);
  const [bachhaImmunizationRecords, setBachhaImmunizationRecords] = useState<ChildImmunizationRecord[]>([]);
  const [marmatEntries, setMarmatEntries] = useState<MarmatEntry[]>([]);
  const [dhuliyaunaEntries, setDhuliyaunaEntries] = useState<DhuliyaunaEntry[]>([]);
  const [logBookEntries, setLogBookEntries] = useState<LogBookEntry[]>([]);

  useEffect(() => {
    const connectedRef = ref(db, ".info/connected");
    onValue(connectedRef, (snap) => setIsDbConnected(snap.val() === true));

    const adminRef = ref(db, 'users/superadmin');
    get(adminRef).then((snapshot) => {
        if (!snapshot.exists()) {
            set(adminRef, DEFAULT_ADMIN);
        }
    });

    const usersRef = ref(db, 'users');
    const unsub = onValue(usersRef, (snap) => {
        const data = snap.val();
        const userList = data ? Object.keys(data).map(key => ({ ...data[key], id: key })) : [];
        setAllUsers(userList.length > 0 ? userList : [DEFAULT_ADMIN]);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentUser) {
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
        setTbPatients([]);
        setGarbhawatiPatients([]);
        setBachhaImmunizationRecords([]);
        setMarmatEntries([]);
        setDhuliyaunaEntries([]);
        setLogBookEntries([]);
        setGeneralSettings(INITIAL_SETTINGS);
        return;
    }

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

    onValue(ref(db, `${orgPath}/settings`), (snap) => {
        if (snap.exists()) setGeneralSettings(snap.val());
        else {
            const firstSettings = { ...INITIAL_SETTINGS, orgNameNepali: currentUser.organizationName, orgNameEnglish: currentUser.organizationName };
            set(ref(db, `${orgPath}/settings`), firstSettings);
            setGeneralSettings(firstSettings);
        }
    });

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
    setupOrgListener('tbPatients', setTbPatients);
    setupOrgListener('garbhawatiPatients', setGarbhawatiPatients);
    setupOrgListener('bachhaImmunizationRecords', setBachhaImmunizationRecords);
    setupOrgListener('marmatEntries', setMarmatEntries);
    setupOrgListener('disposalEntries', setDhuliyaunaEntries);
    setupOrgListener('logBook', setLogBookEntries);

    return () => unsubscribes.forEach(unsub => unsub());
  }, [currentUser]);

  const handleLoginSuccess = (user: User, fiscalYear: string) => {
    setCurrentUser(user);
    setCurrentFiscalYear(fiscalYear);
  };

  const getOrgRef = (subPath: string) => {
      const safeOrgName = currentUser?.organizationName.trim().replace(/[.#$[\]]/g, "_") || "unknown";
      return ref(db, `orgData/${safeOrgName}/${subPath}`);
  };

  const handleUploadDatabase = async (sectionId: string, data: any[], extraMeta?: any) => {
      if (!currentUser) return;
      try {
          const safeOrgName = currentUser.organizationName.trim().replace(/[.#$[\]]/g, "_");
          const orgPath = `orgData/${safeOrgName}`;
          const updates: Record<string, any> = {};

          if (sectionId === 'inventory') {
              data.forEach((row, idx) => {
                  const itemId = `ITEM-UPLOAD-${Date.now()}-${idx}`;
                  let expiryBs = '';
                  const expiryAd = row['Expiry (AD)'];
                  if (expiryAd && expiryAd !== '-') {
                      try {
                          const adDate = new Date(expiryAd);
                          if (!isNaN(adDate.getTime())) {
                              expiryBs = new NepaliDate(adDate).format('YYYY-MM-DD');
                          }
                      } catch(e) {}
                  }

                  const qty = Number(row['Qty']) || 0;
                  const rate = Number(row['Rate']) || 0;
                  const tax = Number(row['Tax %']) || 0;
                  const total = qty * rate * (1 + tax / 100);

                  const newItem: InventoryItem = {
                      id: itemId,
                      itemName: String(row['Item Name'] || 'Unnamed Item'),
                      itemClassification: String(row['Item Classification'] || 'Other'),
                      uniqueCode: String(row['Unique Code'] || ''),
                      sanketNo: String(row['Sanket No'] || ''),
                      ledgerPageNo: String(row['Ledger Page'] || ''),
                      unit: String(row['Unit'] || 'Nos'),
                      currentQuantity: qty,
                      rate: rate,
                      tax: tax,
                      totalAmount: total,
                      batchNo: String(row['Batch No'] || ''),
                      expiryDateAd: expiryAd || '',
                      expiryDateBs: expiryBs,
                      specification: String(row['Specification'] || ''),
                      remarks: String(row['Remarks'] || ''),
                      itemType: extraMeta?.itemType || 'Expendable',
                      storeId: extraMeta?.storeId || '',
                      fiscalYear: currentFiscalYear,
                      lastUpdateDateBs: new NepaliDate().format('YYYY-MM-DD'),
                      lastUpdateDateAd: new Date().toISOString().split('T')[0],
                      receiptSource: 'Database Bulk Import'
                  };
                  updates[`${orgPath}/inventory/${itemId}`] = newItem;
              });
          } else {
              data.forEach((row, idx) => {
                  const entryId = `${sectionId.toUpperCase()}-${Date.now()}-${idx}`;
                  updates[`${orgPath}/${sectionId}/${entryId}`] = row;
              });
          }

          await update(ref(db), updates);
      } catch (error) {
          console.error("Critical Upload Error:", error);
          throw error;
      }
  };

  const filteredUsersForDashboard = allUsers.filter(u => {
      if (currentUser?.role === 'SUPER_ADMIN') return true;
      return u.organizationName === currentUser?.organizationName;
  });

  const handleSaveMagForm = async (f: MagFormEntry) => {
      if (!currentUser) return;
      try {
          const safeOrgName = currentUser.organizationName.trim().replace(/[.#$[\]]/g, "_");
          const orgPath = `orgData/${safeOrgName}`;
          const updates: Record<string, any> = {};
          updates[`${orgPath}/magForms/${f.id}`] = f;
          
          if (f.status === 'Approved' && f.storeKeeper?.marketRequired) { 
              const poId = `PO-${f.id}`;
              const poSnap = await get(ref(db, `${orgPath}/purchaseOrders/${poId}`));
              if (!poSnap.exists()) {
                  updates[`${orgPath}/purchaseOrders/${poId}`] = {
                      id: poId, magFormId: f.id, magFormNo: f.formNo, requestDate: f.date, items: f.items,
                      status: 'Pending', fiscalYear: f.fiscalYear,
                      preparedBy: { name: '', designation: '', date: '' },
                      recommendedBy: { name: '', designation: '', date: '', purpose: '' }, 
                      financeBy: { name: '', designation: '', date: '', purpose: '' },       
                      approvedBy: { name: '', designation: '', date: '', purpose: '' }      
                  };
              }
          }

          if (f.status === 'Approved' && f.storeKeeper?.inStock) {
              const issueReportId = `ISSUE-${f.id}`;
              const issueReportSnap = await get(ref(db, `${orgPath}/issueReports/${issueReportId}`));

              if (!issueReportSnap.exists()) {
                  const newIssueReport: IssueReportEntry = {
                      id: issueReportId,
                      magFormId: f.id,
                      magFormNo: f.formNo,
                      requestDate: f.date,
                      items: f.items,
                      status: 'Pending',
                      fiscalYear: f.fiscalYear,
                      itemType: f.issueItemType,
                      selectedStoreId: f.selectedStoreId,
                      demandBy: f.demandBy,
                      preparedBy: { name: '', designation: '', date: '', purpose: '' }, 
                      recommendedBy: { name: '', designation: '', date: '', purpose: '' }, 
                      approvedBy: { name: '', designation: '', date: '', purpose: '' }, 
                  };
                  updates[`${orgPath}/issueReports/${issueReportId}`] = newIssueReport;
              }
          }
          await update(ref(db), updates);
      } catch (error) {
          alert("माग फारम सुरक्षित गर्दा समस्या आयो।");
      }
  };

  const handleDeleteMagForm = async (formId: string) => {
    if (!currentUser) return;
    try {
        await remove(ref(db, `orgData/${currentUser.organizationName.trim().replace(/[.#$[\]]/g, "_")}/magForms/${formId}`));
    } catch (error) {
        alert("माग फारम हटाउन सकिएन।");
    }
  };

  const handleUpdateIssueReport = async (report: IssueReportEntry) => {
      if (!currentUser) return;
      try {
          const safeOrgName = currentUser.organizationName.trim().replace(/[.#$[\]]/g, "_");
          const orgPath = `orgData/${safeOrgName}`;
          const updates: Record<string, any> = {};
          updates[`${orgPath}/issueReports/${report.id}`] = report;

          if (report.status === 'Issued' && !!report.selectedStoreId && !!report.itemType) {
              const currentInvSnap = await get(ref(db, `${orgPath}/inventory`));
              const currentInvData = currentInvSnap.val() || {};
              const currentInvList: InventoryItem[] = Object.keys(currentInvData).map(k => ({ ...currentInvData[k], id: k }));
              
              const nowBs = new NepaliDate().format('YYYY-MM-DD');
              const nowAd = new Date().toISOString().split('T')[0];

              for (const issueItem of report.items) {
                  let remainingIssuedQty = parseFloat(issueItem.quantity) || 0;
                  let potentialInventoryItems = currentInvList.filter(inv => {
                      const nameMatches = inv.itemName.trim().toLowerCase() === issueItem.name.trim().toLowerCase();
                      const storeMatches = inv.storeId === report.selectedStoreId;
                      const typeMatches = inv.itemType === report.itemType;
                      const codeMatches = issueItem.codeNo ? (inv.uniqueCode === issueItem.codeNo || inv.sanketNo === issueItem.codeNo) : true;
                      return nameMatches && storeMatches && typeMatches && codeMatches;
                  });

                  potentialInventoryItems.sort((a, b) => {
                      const dateA = a.expiryDateAd ? new Date(a.expiryDateAd).getTime() : Infinity;
                      const dateB = b.expiryDateAd ? new Date(b.expiryDateAd).getTime() : Infinity;
                      return dateA - dateB;
                  });

                  for (const invItem of potentialInventoryItems) {
                      if (remainingIssuedQty <= 0) break;
                      const availableQtyInInvItem = Number(invItem.currentQuantity) || 0;
                      const qtyToDeduct = Math.min(remainingIssuedQty, availableQtyInInvItem);

                      if (qtyToDeduct > 0) {
                          const newQuantity = availableQtyInInvItem - qtyToDeduct;
                          const newTotalAmount = (Number(invItem.totalAmount) || 0) - (qtyToDeduct * (Number(invItem.rate) || 0));
                          updates[`${orgPath}/inventory/${invItem.id}`] = {
                              ...invItem,
                              currentQuantity: Math.max(0, newQuantity),
                              totalAmount: Math.max(0, newTotalAmount),
                              lastUpdateDateBs: nowBs,
                              lastUpdateDateAd: nowAd,
                              receiptSource: 'Issued',
                          };
                          remainingIssuedQty -= qtyToDeduct;
                      }
                  }
              }
          }
          await update(ref(db), updates);
      } catch (error) {
          alert("निकासा प्रतिवेदन सुरक्षित गर्दा समस्या आयो।");
      }
  };

  const handleDeleteInventoryItem = async (itemId: string) => {
      if (!currentUser) return;
      try {
          await remove(getOrgRef(`inventory/${itemId}`));
      } catch (error) {
          alert("सामान हटाउन सकिएन।");
      }
  };

  const handleApproveStockEntry = async (requestId: string, approverName: string, approverDesignation: string) => {
      if (!currentUser) return;
      try {
          const safeOrgName = currentUser.organizationName.trim().replace(/[.#$[\]]/g, "_");
          const orgPath = `orgData/${safeOrgName}`;
          const requestSnap = await get(ref(db, `${orgPath}/stockRequests/${requestId}`));
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
                  i.storeId === request.storeId && i.itemType === item.itemType
              );
              const incomingQty = Number(item.currentQuantity) || 0;
              const incomingRate = Number(item.rate) || 0;
              const incomingTax = Number(item.tax) || 0;
              const incomingTotal = incomingQty * incomingRate * (1 + incomingTax / 100);
              dakhilaItems.push({
                  id: Date.now() + Math.random(), name: item.itemName, codeNo: item.sanketNo || item.uniqueCode || '',
                  specification: item.specification || '', source: request.receiptSource, unit: item.unit,
                  quantity: incomingQty, rate: incomingRate, totalAmount: incomingQty * incomingRate,
                  vatAmount: (incomingQty * incomingRate) * (incomingTax / 100), grandTotal: incomingTotal,
                  otherExpenses: 0, finalTotal: incomingTotal, remarks: item.remarks || '',
                  itemType: item.itemType 
              });
              if (existingItem) {
                  const newQty = (Number(existingItem.currentQuantity) || 0) + incomingQty;
                  updates[`${orgPath}/inventory/${existingItem.id}`] = { ...existingItem, currentQuantity: newQty, totalAmount: (Number(existingItem.totalAmount) || 0) + incomingTotal, lastUpdateDateBs: request.requestDateBs, lastUpdateDateAd: request.requestDateAd, dakhilaNo: request.dakhilaNo || item.dakhilaNo || existingItem.dakhilaNo };
              } else {
                  const newId = item.id.startsWith('TEMP') ? `ITEM-${Date.now()}-${Math.random().toString(36).substring(7)}` : item.id;
                  updates[`${orgPath}/inventory/${newId}`] = { ...item, id: newId, currentQuantity: incomingQty, totalAmount: incomingTotal, lastUpdateDateBs: request.requestDateBs, lastUpdateDateAd: request.requestDateAd, storeId: request.storeId, fiscalYear: request.fiscalYear, dakhilaNo: request.dakhilaNo || item.dakhilaNo };
              }
          }
          updates[`${orgPath}/stockRequests/${requestId}/status`] = 'Approved';
          updates[`${orgPath}/stockRequests/${requestId}/approvedBy`] = approverName;
          const formalDakhilaId = `DA-${Date.now()}`;
          updates[`${orgPath}/dakhilaReports/${formalDakhilaId}`] = {
              id: formalDakhilaId, fiscalYear: request.fiscalYear, dakhilaNo: request.dakhilaNo || formalDakhilaId,
              date: request.requestDateBs, orderNo: request.refNo || 'BULK-ENTRY', items: dakhilaItems, status: 'Final',
              preparedBy: { name: request.requesterName || request.requestedBy, designation: request.requesterDesignation || 'Staff', date: request.requestDateBs, purpose: '' },
              approvedBy: { name: approverName, designation: approverDesignation, date: request.requestDateBs, purpose: '' },
              storeId: request.storeId 
          };
          await update(ref(db), updates);
      } catch (error) {
          alert("सिस्टममा समस्या आयो।");
      }
  };

  const handleAddTbPatient = async (patient: TBPatient) => {
    if (!currentUser) return;
    try { await set(getOrgRef(`tbPatients/${patient.id}`), patient); } catch (e) {}
  };

  const handleUpdateTbPatient = async (patient: TBPatient) => {
    if (!currentUser) return;
    try { await set(getOrgRef(`tbPatients/${patient.id}`), patient); } catch (e) {}
  };

  const handleDeleteTbPatient = async (patientId: string) => {
    if (!currentUser) return;
    try { await remove(getOrgRef(`tbPatients/${patientId}`)); } catch (e) {}
  };

  const handleAddGarbhawatiPatient = async (patient: GarbhawatiPatient) => {
      if (!currentUser) return;
      try { await set(getOrgRef(`garbhawatiPatients/${patient.id}`), patient); } catch (e) {}
  };

  const handleUpdateGarbhawatiPatient = async (patient: GarbhawatiPatient) => {
      if (!currentUser) return;
      try { await set(getOrgRef(`garbhawatiPatients/${patient.id}`), patient); } catch (e) {}
  };

  const handleDeleteGarbhawatiPatient = async (patientId: string) => {
      if (!currentUser) return;
      try { await remove(getOrgRef(`garbhawatiPatients/${patientId}`)); } catch (e) {}
  };

  const handleAddBachhaImmunizationRecord = async (record: ChildImmunizationRecord) => {
      if (!currentUser) return;
      try { await set(getOrgRef(`bachhaImmunizationRecords/${record.id}`), record); } catch (e) {}
  };

  const handleUpdateBachhaImmunizationRecord = async (record: ChildImmunizationRecord) => {
      if (!currentUser) return;
      try { await set(getOrgRef(`bachhaImmunizationRecords/${record.id}`), record); } catch (e) {}
  };

  const handleDeleteBachhaImmunizationRecord = async (recordId: string) => {
      if (!currentUser) return;
      try { await remove(getOrgRef(`bachhaImmunizationRecords/${recordId}`)); } catch (e) {}
  };

  const handleSaveReturnEntry = async (entry: ReturnEntry) => {
      if (!currentUser) return;
      try {
          const safeOrgName = currentUser.organizationName.trim().replace(/[.#$[\]]/g, "_");
          const orgPath = `orgData/${safeOrgName}`;
          const updates: Record<string, any> = {};
          updates[`${orgPath}/returnEntries/${entry.id}`] = entry;

          if (entry.status === 'Approved') {
              const invAllSnap = await get(ref(db, `${orgPath}/inventory`));
              const currentInvData = invAllSnap.val() || {};
              const currentInvList: InventoryItem[] = Object.keys(currentInvData).map(k => ({ ...currentInvData[k], id: k }));

              for (const returnedItem of entry.items) {
                  if (returnedItem.itemType !== 'Non-Expendable') continue; 
                  const existingItem = currentInvList.find(i => 
                      i.id === returnedItem.inventoryId || 
                      (i.itemName.trim().toLowerCase() === returnedItem.name.trim().toLowerCase() && i.itemType === returnedItem.itemType)
                  );

                  if (existingItem) {
                      updates[`${orgPath}/inventory/${existingItem.id}`] = { 
                          ...existingItem, 
                          currentQuantity: (Number(existingItem.currentQuantity) || 0) + (Number(returnedItem.quantity) || 0), 
                          totalAmount: (Number(existingItem.totalAmount) || 0) + (Number(returnedItem.totalAmount) || 0), 
                          lastUpdateDateBs: entry.date, 
                          receiptSource: 'Returned'
                      };
                  }
              }
          }
          await update(ref(db), updates);
      } catch (error) {}
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
          onSaveMagForm={handleSaveMagForm}
          onDeleteMagForm={handleDeleteMagForm}
          purchaseOrders={purchaseOrders}
          onUpdatePurchaseOrder={(o) => set(getOrgRef(`purchaseOrders/${o.id}`), o)}
          issueReports={issueReports}
          onUpdateIssueReport={handleUpdateIssueReport}
          rabiesPatients={rabiesPatients}
          onAddRabiesPatient={(p) => set(getOrgRef(`rabiesPatients/${p.id}`), p)}
          onUpdatePatient={(p) => set(getOrgRef(`rabiesPatients/${p.id}`), p)}
          onDeletePatient={(id) => remove(getOrgRef(`rabiesPatients/${id}`))}
          tbPatients={tbPatients}
          onAddTbPatient={handleAddTbPatient}
          onUpdateTbPatient={handleUpdateTbPatient}
          onDeleteTbPatient={handleDeleteTbPatient}
          garbhawatiPatients={garbhawatiPatients}
          onAddGarbhawatiPatient={handleAddGarbhawatiPatient}
          onUpdateGarbhawatiPatient={handleUpdateGarbhawatiPatient}
          onDeleteGarbhawatiPatient={handleDeleteGarbhawatiPatient}
          bachhaImmunizationRecords={bachhaImmunizationRecords}
          onAddBachhaImmunizationRecord={handleAddBachhaImmunizationRecord}
          onUpdateBachhaImmunizationRecord={handleUpdateBachhaImmunizationRecord}
          onDeleteBachhaImmunizationRecord={handleDeleteBachhaImmunizationRecord}
          firms={firms}
          onAddFirm={(f) => set(getOrgRef(`firms/${f.id}`), f)}
          quotations={quotations}
          onAddQuotation={(q) => set(getOrgRef(`quotations/${q.id}`), q)}
          inventoryItems={inventoryItems}
          onAddInventoryItem={(i) => set(getOrgRef(`inventory/${i.id}`), i)}
          onUpdateInventoryItem={(i) => set(getOrgRef(`inventory/${i.id}`), i)}
          onDeleteInventoryItem={handleDeleteInventoryItem}
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
          onSaveReturnEntry={handleSaveReturnEntry}
          marmatEntries={marmatEntries}
          onSaveMarmatEntry={(e) => set(getOrgRef(`marmatEntries/${e.id}`), e)}
          dhuliyaunaEntries={dhuliyaunaEntries}
          onSaveDhuliyaunaEntry={(e) => set(getOrgRef(`disposalEntries/${e.id}`), e)}
          logBookEntries={logBookEntries}
          onSaveLogBookEntry={(e) => set(getOrgRef(`logBook/${e.id}`), e)}
          onClearData={(p) => remove(getOrgRef(p))}
          onUploadData={handleUploadDatabase}
        />
      ) : (
        <div className="min-h-screen w-full bg-[#f8fafc] flex items-center justify-center p-6">
          <div className="w-full max-w-[440px]">
            <div className="bg-white rounded-[32px] shadow-lg border border-slate-100 overflow-hidden">
              <div className="bg-primary-600 p-12 text-center text-white relative">
                <div className="bg-white/20 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md border border-white/30">
                    <Landmark className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-4xl font-extrabold font-nepali tracking-tight mb-2">{APP_NAME}</h1>
                <p className="text-primary-100 font-semibold tracking-wide uppercase text-xs">जिन्सी व्यवस्थापन पोर्टल</p>
              </div>
              <div className="p-10">
                <LoginForm users={allUsers} onLoginSuccess={handleLoginSuccess} initialFiscalYear={'2082/083'} />
              </div>
              <div className="bg-slate-50 p-5 text-center border-t flex items-center justify-center gap-3">
                 <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border">
                    <span className={`w-2 h-2 rounded-full ${isDbConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className="text-[11px] text-slate-600 font-bold uppercase">{isDbConnected ? 'Online' : 'Offline'}</span>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
