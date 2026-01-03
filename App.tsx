
import React, { useState, useEffect } from 'react';
import { LoginForm } from './components/LoginForm';
import { Dashboard } from './components/Dashboard';
import { APP_NAME, ORG_NAME } from './constants';
import { Landmark, ShieldCheck } from 'lucide-react';
import { 
  User, OrganizationSettings, MagFormEntry, RabiesPatient, PurchaseOrderEntry, 
  IssueReportEntry, FirmEntry, QuotationEntry, InventoryItem, Store, StockEntryRequest, 
  DakhilaPratibedanEntry, ReturnEntry, MarmatEntry, DhuliyaunaEntry, LogBookEntry, 
  DakhilaItem, TBPatient, GarbhawatiPatient, ChildImmunizationRecord 
} from './types';
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
    // UPDATED: Allowed menus include khop_sewa to access the new tabbed view
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
  // Added state for TB Patients
  const [tbPatients, setTbPatients] = useState<TBPatient[]>([]); 
  // NEW: State for Garbhawati Patients
  const [garbhawatiPatients, setGarbhawatiPatients] = useState<GarbhawatiPatient[]>([]);
  // NEW: State for Child Immunization Records
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
        setTbPatients([]); // Clear TB patients on logout
        // NEW: Clear Garbhawati & Child Immunization on logout
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
    setupOrgListener('tbPatients', setTbPatients); // Setup listener for TB Patients
    // NEW: Setup listeners for Garbhawati and Child Immunization
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
              // PRECISE MAPPING: From Excel Headers to InventoryItem fields
              data.forEach((row, idx) => {
                  const itemId = `ITEM-UPLOAD-${Date.now()}-${idx}`;
                  
                  // Helper: Convert AD Expiry to BS Expiry for consistency
                  let expiryBs = '';
                  const expiryAd = row['Expiry (AD)'];
                  if (expiryAd && expiryAd !== '-') {
                      try {
                          const adDate = new Date(expiryAd);
                          if (!isNaN(adDate.getTime())) {
                              expiryBs = new NepaliDate(adDate).format('YYYY-MM-DD');
                          }
                      } catch(e) {
                          console.warn("Expiry date conversion failed for row", idx);
                      }
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
              // Generic save for other sections (Firms, Users, etc)
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
                      recommendedBy: { name: '', designation: '', date: '' },
                      financeBy: { name: '', designation: '', date: '' },
                      approvedBy: { name: '', designation: '', date: '' }
                  };
              }
          }

              // NEW: If inStock was checked, create an Issue Report
              if (f.status === 'Approved' && f.storeKeeper?.inStock) {
                  const issueReportId = `ISSUE-${f.id}`; // Link issue report to mag form ID
                  const issueReportSnap = await get(ref(db, `${orgPath}/issueReports/${issueReportId}`));

                  // Only create if it doesn't already exist to prevent duplicates on re-save
                  if (!issueReportSnap.exists()) {
                      const newIssueReport: IssueReportEntry = {
                          id: issueReportId,
                          magFormId: f.id,
                          magFormNo: f.formNo,
                          requestDate: f.date, // Use Mag Form's date
                          items: f.items,
                          status: 'Pending', // Initial status for Storekeeper to prepare
                          fiscalYear: f.fiscalYear,
                          itemType: f.issueItemType, // Crucial: use the type determined during verification
                          selectedStoreId: f.selectedStoreId, // Crucial: store the selected store ID
                          demandBy: f.demandBy,
                          preparedBy: { name: '', designation: '', date: '' }, // To be filled by Storekeeper
                          recommendedBy: { name: '', designation: '', date: '' }, // To be filled by Storekeeper/Approver
                          approvedBy: { name: '', designation: '', date: '' }, // To be filled by Approver
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
      if (!currentUser) {
          console.error("[handleUpdateIssueReport] Error: No current user for report ID:", report.id);
          return;
      }
      
      console.log(`[handleUpdateIssueReport] START for Report ID: ${report.id}, Status: ${report.status}`);
      console.log(`[handleUpdateIssueReport] Report Data (Full Object):`, JSON.parse(JSON.stringify(report))); // Deep copy for inspection

      try {
          const safeOrgName = currentUser.organizationName.trim().replace(/[.#$[\]]/g, "_");
          const orgPath = `orgData/${safeOrgName}`;
          const updates: Record<string, any> = {};
          
          // Always update the report status first
          updates[`${orgPath}/issueReports/${report.id}`] = report;

          // NEW LOGIC: Reduce stock when issue report is 'Issued', prioritizing earliest expiry
          const isIssuedAndHasStoreInfo = report.status === 'Issued' && !!report.selectedStoreId && !!report.itemType;
          console.log(`[handleUpdateIssueReport] Checking stock reduction condition:`);
          console.log(`  - Status is 'Issued': ${report.status === 'Issued'}`);
          console.log(`  - selectedStoreId is present: ${!!report.selectedStoreId} (Value: ${report.selectedStoreId})`);
          console.log(`  - itemType is present: ${!!report.itemType} (Value: ${report.itemType})`);

          if (isIssuedAndHasStoreInfo) {
              console.log(`[handleUpdateIssueReport] Condition met: Proceeding with stock reduction.`);

              const currentInvSnap = await get(ref(db, `${orgPath}/inventory`));
              const currentInvData = currentInvSnap.val() || {};
              const currentInvList: InventoryItem[] = Object.keys(currentInvData).map(k => ({ ...currentInvData[k], id: k }));
              
              const nowBs = new NepaliDate().format('YYYY-MM-DD');
              const nowAd = new Date().toISOString().split('T')[0];

              for (const issueItem of report.items) {
                  let remainingIssuedQty = parseFloat(issueItem.quantity) || 0;
                  console.log(`\n[handleUpdateIssueReport] Processing demand for item: "${issueItem.name}" (Code: ${issueItem.codeNo || 'N/A'}), Demanded Qty: ${issueItem.quantity}`);

                  // Filter all potential inventory items that match the criteria
                  let potentialInventoryItems = currentInvList.filter(inv => {
                      const nameMatches = inv.itemName.trim().toLowerCase() === issueItem.name.trim().toLowerCase();
                      const storeMatches = inv.storeId === report.selectedStoreId;
                      const typeMatches = inv.itemType === report.itemType;
                      const codeMatches = issueItem.codeNo ? (inv.uniqueCode === issueItem.codeNo || inv.sanketNo === issueItem.codeNo) : true;
                      
                      // Log individual match criteria for better debugging
                      console.log(`  - Candidate Inv Item: ID=${inv.id}, Name="${inv.itemName}", Store="${inv.storeId}", Type="${inv.itemType}", Code="${inv.uniqueCode || inv.sanketNo}", Expiry="${inv.expiryDateAd || 'N/A'}"`);
                      console.log(`    - Name Match (Demanded: "${issueItem.name}", Inventory: "${inv.itemName}"): ${nameMatches}`);
                      console.log(`    - Store Match (Report: "${report.selectedStoreId}", Inventory: "${inv.storeId}"): ${storeMatches}`);
                      console.log(`    - Type Match (Report: "${report.itemType}", Inventory: "${inv.itemType}"): ${typeMatches}`);
                      console.log(`    - Code Match (Demanded: "${issueItem.codeNo}", Inventory: "${inv.uniqueCode || inv.sanketNo}"): ${codeMatches}`);
                      return nameMatches && storeMatches && typeMatches && codeMatches;
                  });
                  console.log(`[handleUpdateIssueReport] Found ${potentialInventoryItems.length} matching inventory items for "${issueItem.name}" before sorting.`);

                  if (potentialInventoryItems.length === 0) {
                      console.warn(`[handleUpdateIssueReport] WARNING: No matching inventory items found in store "${report.selectedStoreId}" for demanded item "${issueItem.name}" with type "${report.itemType}". Stock cannot be reduced.`);
                      continue; // Skip to next issue item
                  }

                  // Sort by expiryDateAd ascending. Items without expiryDateAd come last.
                  potentialInventoryItems.sort((a, b) => {
                      const dateA = a.expiryDateAd ? new Date(a.expiryDateAd).getTime() : Infinity;
                      const dateB = b.expiryDateAd ? new Date(b.expiryDateAd).getTime() : Infinity;
                      return dateA - dateB;
                  });
                  console.log(`[handleUpdateIssueReport] Sorted potential inventory items by expiry (earliest first):`, potentialInventoryItems.map(i => ({id: i.id, name: i.itemName, qty: i.currentQuantity, expiry: i.expiryDateAd})));

                  for (const invItem of potentialInventoryItems) {
                      if (remainingIssuedQty <= 0) {
                          console.log(`[handleUpdateIssueReport] Demand for "${issueItem.name}" fully fulfilled. Breaking from inventory item loop.`);
                          break; // All demand fulfilled
                      }

                      const availableQtyInInvItem = Number(invItem.currentQuantity) || 0;
                      const qtyToDeduct = Math.min(remainingIssuedQty, availableQtyInInvItem);

                      console.log(`  - Processing inventory item ID: ${invItem.id} (Name: "${invItem.itemName}", Expiry: ${invItem.expiryDateAd || 'N/A'})`);
                      console.log(`    - Available Qty in Inv Item: ${availableQtyInInvItem}, Remaining Demanded Qty: ${remainingIssuedQty}`);
                      console.log(`    - Quantity to Deduct from this Inv Item: ${qtyToDeduct}`);

                      if (qtyToDeduct > 0) {
                          const newQuantity = availableQtyInInvItem - qtyToDeduct;
                          const newTotalAmount = (Number(invItem.totalAmount) || 0) - (qtyToDeduct * (Number(invItem.rate) || 0)); // Ensure rate is a number

                          const updatedInvItem = {
                              ...invItem,
                              currentQuantity: Math.max(0, newQuantity), // Ensure quantity doesn't go below zero
                              totalAmount: Math.max(0, newTotalAmount), // Ensure total doesn't go below zero
                              lastUpdateDateBs: nowBs,
                              lastUpdateDateAd: nowAd,
                              receiptSource: 'Issued',
                          };
                          updates[`${orgPath}/inventory/${invItem.id}`] = updatedInvItem;
                          console.log(`[handleUpdateIssueReport] Staging update for Inventory Item ID: ${invItem.id}, Old Qty: ${availableQtyInInvItem}, Deducted Qty: ${qtyToDeduct}, New Qty: ${updatedInvItem.currentQuantity}`);
                          remainingIssuedQty -= qtyToDeduct;
                      } else {
                          console.log(`  - No quantity to deduct from item ID: ${invItem.id}. Available Qty (${availableQtyInInvItem}) is 0 or already insufficient.`);
                      }
                  }

                  if (remainingIssuedQty > 0) {
                      console.warn(`[handleUpdateIssueReport] WARNING: Insufficient total stock for item "${issueItem.name}" (remaining demanded: ${remainingIssuedQty}) after checking all matching batches and considering expiry dates in store "${report.selectedStoreId}".`);
                      // Optionally, add a user-facing alert here
                  }
              }
          } else {
              console.log(`[handleUpdateIssueReport] Stock reduction condition NOT met. Status: ${report.status}, Store ID: ${report.selectedStoreId}, Item Type: ${report.itemType}. No inventory update performed.`);
          }

          console.log("[handleUpdateIssueReport] Final updates object to be sent to Firebase:", JSON.parse(JSON.stringify(updates))); // Deep copy for inspection
          await update(ref(db), updates);
          console.log(`[handleUpdateIssueReport] Successfully updated report ${report.id} and inventory (if applicable).`);

      } catch (error) {
          alert("निकासा प्रतिवेदन सुरक्षित गर्दा वा स्टक घटाउँदा समस्या आयो।");
          console.error("[handleUpdateIssueReport] CRITICAL ERROR saving issue report or reducing stock:", error);
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
              preparedBy: { name: request.requesterName || request.requestedBy, designation: request.requesterDesignation || 'Staff', date: request.requestDateBs },
              approvedBy: { name: approverName, designation: approverDesignation, date: request.requestDateBs },
              storeId: request.storeId 
          };
          await update(ref(db), updates);
      } catch (error) {
          alert("सिस्टममा समस्या आयो।");
      }
  };

  // TB Patient CRUD operations
  const handleAddTbPatient = async (patient: TBPatient) => {
    if (!currentUser) return;
    try {
        await set(getOrgRef(`tbPatients/${patient.id}`), patient);
    } catch (error) {
        alert("TB बिरामी दर्ता गर्दा समस्या आयो।");
        console.error("Error adding TB patient:", error);
    }
  };

  const handleUpdateTbPatient = async (patient: TBPatient) => {
    if (!currentUser) return;
    try {
        await set(getOrgRef(`tbPatients/${patient.id}`), patient); // set replaces the entire object
    } catch (error) {
        alert("TB बिरामी अपडेट गर्दा समस्या आयो।");
        console.error("Error updating TB patient:", error);
    }
  };

  const handleDeleteTbPatient = async (patientId: string) => {
    if (!currentUser) return;
    try {
        await remove(getOrgRef(`tbPatients/${patientId}`));
    } catch (error) {
        alert("TB बिरामी हटाउन सकिएन।");
        console.error("Error deleting TB patient:", error);
    }
  };

  // NEW: Garbhawati Patient CRUD operations
  const handleAddGarbhawatiPatient = async (patient: GarbhawatiPatient) => {
      if (!currentUser) return;
      try {
          await set(getOrgRef(`garbhawatiPatients/${patient.id}`), patient);
      } catch (error) {
          alert("गर्भवती बिरामी दर्ता गर्दा समस्या आयो।");
          console.error("Error adding Garbhawati patient:", error);
      }
  };

  const handleUpdateGarbhawatiPatient = async (patient: GarbhawatiPatient) => {
      if (!currentUser) return;
      try {
          await set(getOrgRef(`garbhawatiPatients/${patient.id}`), patient);
      } catch (error) {
          alert("गर्भवती बिरामी अपडेट गर्दा समस्या आयो।");
          console.error("Error updating Garbhawati patient:", error);
      }
  };

  const handleDeleteGarbhawatiPatient = async (patientId: string) => {
      if (!currentUser) return;
      try {
          await remove(getOrgRef(`garbhawatiPatients/${patientId}`));
      } catch (error) {
          alert("गर्भवती बिरामी हटाउन सकिएन।");
          console.error("Error deleting Garbhawati patient:", error);
      }
  };

  // NEW: Child Immunization Record CRUD operations
  const handleAddBachhaImmunizationRecord = async (record: ChildImmunizationRecord) => {
      if (!currentUser) return;
      try {
          await set(getOrgRef(`bachhaImmunizationRecords/${record.id}`), record);
      } catch (error) {
          alert("बच्चाको खोप रेकर्ड दर्ता गर्दा समस्या आयो।");
          console.error("Error adding Child Immunization record:", error);
      }
  };

  const handleUpdateBachhaImmunizationRecord = async (record: ChildImmunizationRecord) => {
      if (!currentUser) return;
      try {
          await set(getOrgRef(`bachhaImmunizationRecords/${record.id}`), record);
      } catch (error) {
          alert("बच्चाको खोप रेकर्ड अपडेट गर्दा समस्या आयो।");
          console.error("Error updating Child Immunization record:", error);
      }
  };

  const handleDeleteBachhaImmunizationRecord = async (recordId: string) => {
      if (!currentUser) return;
      try {
          await remove(getOrgRef(`bachhaImmunizationRecords/${recordId}`));
      } catch (error) {
          alert("बच्चाको खोप रेकर्ड हटाउन सकिएन।");
          console.error("Error deleting Child Immunization record:", error);
      }
  };

  // Return Entry CRUD operations
  const handleSaveReturnEntry = async (entry: ReturnEntry) => {
      if (!currentUser) return;
      try {
          const safeOrgName = currentUser.organizationName.trim().replace(/[.#$[\]]/g, "_");
          const orgPath = `orgData/${safeOrgName}`;
          const updates: Record<string, any> = {};
          
          updates[`${orgPath}/returnEntries/${entry.id}`] = entry;

          // If the return is approved, update inventory quantities
          if (entry.status === 'Approved') {
              const invAllSnap = await get(ref(db, `${orgPath}/inventory`));
              const currentInvData = invAllSnap.val() || {};
              const currentInvList: InventoryItem[] = Object.keys(currentInvData).map(k => ({ ...currentInvData[k], id: k }));

              for (const returnedItem of entry.items) {
                  const existingItem = currentInvList.find(i => 
                      i.id === returnedItem.inventoryId || // Prefer matching by original inventory ID if available
                      (i.itemName.trim().toLowerCase() === returnedItem.name.trim().toLowerCase() && 
                       (i.uniqueCode?.trim().toLowerCase() === returnedItem.codeNo?.trim().toLowerCase() ||
                        i.sanketNo?.trim().toLowerCase() === returnedItem.codeNo?.trim().toLowerCase()))
                  );

                  if (existingItem) {
                      const newQty = (Number(existingItem.currentQuantity) || 0) + (Number(returnedItem.quantity) || 0);
                      const newTotalAmount = (Number(existingItem.totalAmount) || 0) + (Number(returnedItem.totalAmount) || 0);

                      updates[`${orgPath}/inventory/${existingItem.id}`] = { 
                          ...existingItem, 
                          currentQuantity: newQty, 
                          totalAmount: newTotalAmount, 
                          lastUpdateDateBs: entry.date, 
                          lastUpdateDateAd: new Date().toISOString().split('T')[0],
                          receiptSource: 'Returned'
                      };
                  } else {
                      // If the item doesn't exist, create it as a new inventory item
                      const newInventoryId = returnedItem.inventoryId || `ITEM-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                      updates[`${orgPath}/inventory/${newInventoryId}`] = {
                          id: newInventoryId,
                          itemName: returnedItem.name,
                          uniqueCode: returnedItem.codeNo,
                          sanketNo: returnedItem.codeNo,
                          ledgerPageNo: "", // Can be filled later
                          itemType: "Non-Expendable", // Assumed non-expendable for returns
                          itemClassification: "", // Can be filled later
                          specification: returnedItem.specification,
                          unit: returnedItem.unit,
                          currentQuantity: returnedItem.quantity,
                          rate: returnedItem.rate,
                          tax: 0, // Assuming 0 for returned items unless specified
                          totalAmount: returnedItem.totalAmount,
                          batchNo: "",
                          expiryDateAd: "",
                          expiryDateBs: "",
                          lastUpdateDateAd: new Date().toISOString().split('T')[0],
                          lastUpdateDateBs: entry.date,
                          fiscalYear: entry.fiscalYear,
                          receiptSource: 'Returned',
                          remarks: `Returned via form ${entry.formNo}. Original remarks: ${returnedItem.remarks}`,
                          storeId: "" // Store ID for returned item not explicitly captured in form, needs to be from config or input
                      };
                  }
              }
          }
          await update(ref(db), updates);
      } catch (error) {
          alert("जिन्सी फिर्ता सुरक्षित गर्दा समस्या आयो।");
          console.error("Error saving return entry:", error);
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
          onSaveMagForm={handleSaveMagForm}
          onDeleteMagForm={handleDeleteMagForm}
          purchaseOrders={purchaseOrders}
          onUpdatePurchaseOrder={(o) => set(getOrgRef(`purchaseOrders/${o.id}`), o)}
          issueReports={issueReports}
          onUpdateIssueReport={handleUpdateIssueReport}
          rabiesPatients={rabiesPatients}
          onAddRabiesPatient={(p) => set(getOrgRef(`rabiesPatients/${p.id}`), p)}
          onUpdateRabiesPatient={(p) => set(getOrgRef(`rabiesPatients/${p.id}`), p)}
          onDeletePatient={(id) => remove(getOrgRef(`rabiesPatients/${id}`))}
          tbPatients={tbPatients} // Pass TB patients
          onAddTbPatient={handleAddTbPatient} // Pass TB add handler
          onUpdateTbPatient={handleUpdateTbPatient} // Pass TB update handler
          onDeleteTbPatient={handleDeleteTbPatient} // Pass TB delete handler
          garbhawatiPatients={garbhawatiPatients} // Pass Garbhawati patients
          onAddGarbhawatiPatient={handleAddGarbhawatiPatient} // Pass Garbhawati add handler
          onUpdateGarbhawatiPatient={handleUpdateGarbhawatiPatient} // Pass Garbhawati update handler
          onDeleteGarbhawatiPatient={handleDeleteGarbhawatiPatient} // Pass Garbhawati delete handler
          bachhaImmunizationRecords={bachhaImmunizationRecords} // Pass Child immunization records
          onAddBachhaImmunizationRecord={handleAddBachhaImmunizationRecord} // Pass Child immunization add handler
          onUpdateBachhaImmunizationRecord={handleUpdateBachhaImmunizationRecord} // Pass Child immunization update handler
          onDeleteBachhaImmunizationRecord={handleDeleteBachhaImmunizationRecord} // Pass Child immunization delete handler
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
          onSaveReturnEntry={handleSaveReturnEntry} // Pass return entry handler
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
                    initialFiscalYear={'2082/083'} 
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
