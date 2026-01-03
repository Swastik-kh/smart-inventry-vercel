
import React from 'react';

export interface FiscalYear {
  id: string;
  label: string; 
  value: string; 
}

export interface Option {
  id: string;
  label: string;
  value: string;
  itemData?: any; 
}

export interface LoginFormData {
  fiscalYear: string;
  username: string;
  password: string;
}

export interface LoginFormProps {
  users: User[];
  onLoginSuccess: (user: User, fiscalYear: string) => void;
  initialFiscalYear: string;
}

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'STAFF' | 'STOREKEEPER' | 'ACCOUNT' | 'APPROVAL';

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  organizationName: string;
  fullName: string;
  designation: string;
  phoneNumber: string;
  allowedMenus?: string[]; 
}

export interface OrganizationSettings {
  orgNameNepali: string;
  orgNameEnglish: string;
  subTitleNepali: string;
  subTitleNepali2?: string;
  subTitleNepali3?: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  panNo: string;
  defaultVatRate: string;
  activeFiscalYear: string;
  enableEnglishDate: string;
  logoUrl: string;
}

export interface VaccinationDose {
  day: number;
  date: string; 
  dateBs?: string; // Added: Scheduled date in BS format
  status: 'Pending' | 'Given' | 'Missed';
  givenDate?: string;
}

export interface RabiesPatient {
  id: string;
  fiscalYear: string; 
  regNo: string;
  regNo_numeric?: number; 
  regMonth: string; 
  regDateBs: string; 
  regDateAd: string; 
  vaccineStartDateBs?: string; // New: Anchor for schedule
  vaccineStartDateAd?: string; // New: Anchor for schedule
  name: string;
  age: string; 
  sex: string;
  address: string;
  phone: string;
  animalType: string;
  exposureCategory: string; 
  bodyPart: string; // New: Added bodyPart field
  exposureDateBs: string; 
  regimen: 'Intradermal' | 'Intramuscular';
  schedule: VaccinationDose[];
}

// Moved TB related interfaces from TBPatientRegistration.tsx
export interface TBReport {
  month: number;
  result: string;
  labNo: string;
  date: string;
  dateNepali?: string;
}

export interface TBPatient {
  id: string;
  patientId: string;
  name: string;
  age: string;
  address: string;
  phone: string;
  regType: string;
  classification: string;
  registrationDate: string;
  serviceType: 'TB' | 'Leprosy';
  leprosyType?: 'MB' | 'PB'; 
  labResultMonth2Positive?: boolean; 
  completedSchedule: number[];
  newReportAvailable?: boolean;
  latestResult?: string;
  latestReportMonth?: number;
  reports: TBReport[];
  fiscalYear: string;
}

// NEW: Garbhawati Patient Interface
export interface GarbhawatiPatient {
  id: string;
  fiscalYear: string;
  regNo: string; // GTD-FY-NNN
  name: string;
  age: string;
  address: string;
  phone: string;
  gravida: number; // Number of pregnancies
  lmpBs: string; // Last Menstrual Period in BS
  lmpAd: string; // Last Menstrual Period in AD
  eddBs: string; // Estimated Due Date in BS
  eddAd: string; // Estimated Due Date in AD
  td1DateBs?: string | null; // TD1 vaccine date in BS
  td1DateAd?: string | null; // TD1 vaccine date in AD
  td2DateBs?: string | null; // TD2 vaccine date in BS
  td2DateAd?: string | null; // TD2 vaccine date in AD
  tdBoosterDateBs?: string | null; // TD Booster vaccine date in BS
  tdBoosterDateAd?: string | null; // TD Booster vaccine date in AD
  remarks?: string | null;
}

// NEW: Child Immunization Record Interface
export interface ChildImmunizationVaccine {
  name: string; // e.g., BCG, DPT-HepB-Hib-1, MR-1
  scheduledDateBs: string;
  scheduledDateAd: string;
  givenDateBs?: string | null;
  givenDateAd?: string | null;
  status: 'Pending' | 'Given' | 'Missed';
}

export interface ChildImmunizationRecord {
  id: string;
  fiscalYear: string;
  regNo: string; // CIP-FY-NNN
  childName: string;
  gender: 'Male' | 'Female' | 'Other'; // Added gender for child
  dobBs: string; // Date of Birth in BS
  dobAd: string; // Date of Birth in AD
  motherName: string;
  fatherName: string;
  address: string;
  phone: string;
  birthWeightKg?: number; // Birth weight in kg
  vaccines: ChildImmunizationVaccine[];
  remarks?: string;
}


export interface MagItem {
  id: number;
  name: string;
  specification: string;
  unit: string;
  quantity: string;
  remarks: string;
  codeNo?: string;
  rate?: number;
  totalAmount?: number;
}

export interface Signature {
  name: string;
  designation?: string;
  date?: string;
  purpose?: string; // Added purpose to signature
}

export interface StoreKeeperSignature {
  name: string;
  date?: string;
  verified?: boolean; // True if verified by storekeeper
  marketRequired?: boolean; // If checked "बजारबाट खरिद गर्नुपर्ने"
  inStock?: boolean;      // If checked "मौज्दातमा रहेको"
}

export interface MagFormEntry {
  id: string;
  fiscalYear: string;
  formNo: string; 
  date: string;
  items: MagItem[];
  status?: 'Pending' | 'Verified' | 'Approved' | 'Rejected';
  demandBy?: Signature;
  recommendedBy?: Signature;
  storeKeeper?: StoreKeeperSignature;
  receiver?: Signature;
  ledgerEntry?: Signature;
  approvedBy?: Signature;
  rejectionReason?: string; 
  selectedStoreId?: string; // Added for storekeeper verification
  issueItemType?: 'Expendable' | 'Non-Expendable'; // Added for storekeeper verification
  isViewedByRequester?: boolean; 
  decisionNo?: string; // NEW: Added decisionNo to MagFormEntry
  decisionDate?: string; // NEW: Added decisionDate to MagFormEntry
}

export interface PurchaseOrderEntry {
  id: string;
  magFormId: string; 
  magFormNo: string; 
  requestDate: string;
  items: MagItem[]; 
  status: 'Pending' | 'Pending Account' | 'Account Verified' | 'Generated' | 'Stock Entry Requested' | 'Completed';
  orderNo?: string; 
  fiscalYear?: string; 
  vendorDetails?: {
    name: string;
    address: string;
    pan: string;
    phone: string;
  };
  decisionNo?: string; // Added decisionNo
  decisionDate?: string; // Added decisionDate
  budgetDetails?: {
    budgetSubHeadNo: string;
    expHeadNo: string;
    activityNo: string;
  };
  preparedBy?: Signature;      
  recommendedBy?: Signature;   
  financeBy?: Signature;       
  approvedBy?: Signature;      
}

export interface IssueReportEntry {
  id: string;
  magFormId: string; 
  magFormNo: string; 
  requestDate: string; 
  issueNo?: string; 
  issueDate?: string; 
  items: MagItem[]; 
  status: 'Pending' | 'Pending Approval' | 'Issued' | 'Rejected'; 
  fiscalYear?: string; 
  // Add selectedStoreId and itemType to IssueReportEntry
  selectedStoreId?: string;
  itemType?: 'Expendable' | 'Non-Expendable';
  demandBy?: Signature; 
  preparedBy?: Signature;      
  recommendedBy?: Signature;   
  approvedBy?: Signature;      
  rejectionReason?: string;    
}

export interface FirmEntry {
  id: string;
  firmRegNo: string; 
  firmName: string;
  vatPan: string;
  address: string;
  contactNo: string;
  registrationDateAd: string; 
  registrationDateBs: string; 
  fiscalYear: string;
}

export interface QuotationEntry {
  id: string;
  fiscalYear: string;
  firmId: string;
  firmName: string;
  itemName: string;
  unit: string;
  rate: string; 
  quotationDateAd: string; 
  quotationDateBs: string; 
}

export interface Store {
  id: string;
  regNo: string; 
  name: string;
  address: string;
  contactPerson?: string;
  contactPhone?: string;
  fiscalYear: string; 
}

export interface InventoryItem {
  id: string; 
  itemName: string; 
  uniqueCode?: string; 
  sanketNo?: string; 
  ledgerPageNo?: string; 
  dakhilaNo?: string; 
  itemType: 'Expendable' | 'Non-Expendable'; 
  itemClassification?: string; 
  specification?: string; 
  unit: string; 
  currentQuantity: number; 
  rate?: number; 
  tax?: number; 
  totalAmount?: number; 
  batchNo?: string; 
  expiryDateAd?: string; 
  expiryDateBs?: string; 
  lastUpdateDateAd: string; 
  lastUpdateDateBs: string; 
  fiscalYear: string; 
  receiptSource?: string; 
  remarks?: string; 
  storeId: string; 
  approvedStockLevel?: number; 
  emergencyOrderPoint?: number; 
}

export interface StockEntryRequest {
  id: string;
  requestDateBs: string;
  requestDateAd: string;
  fiscalYear: string;
  storeId: string;
  receiptSource: string;
  supplier?: string;
  refNo?: string;
  dakhilaNo?: string; 
  items: InventoryItem[]; 
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedBy: string; 
  requesterName?: string; 
  requesterDesignation?: string; 
  approvedBy?: string; 
  rejectionReason?: string;
  mode: 'opening' | 'add';
}

export interface DakhilaItem {
  id: number;
  name: string;
  codeNo: string; 
  specification: string;
  source: string; 
  unit: string;
  quantity: number;
  rate: number;
  totalAmount: number; 
  vatAmount: number; 
  grandTotal: number; 
  otherExpenses: number; 
  finalTotal: number; 
  remarks: string;
  itemType?: 'Expendable' | 'Non-Expendable'; 
}

export interface DakhilaPratibedanEntry {
  id: string;
  fiscalYear: string;
  dakhilaNo: string; 
  date: string;
  orderNo: string; 
  items: DakhilaItem[];
  status: 'Draft' | 'Final';
  preparedBy?: Signature;
  recommendedBy?: Signature;
  approvedBy?: Signature;
  storeId?: string; 
}

export interface ReturnItem {
  id: number;
  inventoryId?: string; 
  kharchaNikasaNo: string; 
  codeNo: string; 
  name: string;
  specification: string;
  unit: string;
  quantity: number;
  rate: number;
  totalAmount: number; 
  vatAmount: number; 
  grandTotal: number; 
  reasonAndCondition: string; // Renamed from 'condition'
  remarks: string;
  itemType?: 'Expendable' | 'Non-Expendable'; // ADDED: itemType for classification
}

export interface ReturnEntry {
  id: string;
  fiscalYear: string;
  formNo: string; 
  date: string;
  items: ReturnItem[];
  status?: 'Pending' | 'Verified' | 'Approved' | 'Rejected'; // Added 'Verified'
  rejectionReason?: string;
  returnedBy: Signature; // This is the person initiating the return
  preparedBy: Signature; // This is the Storekeeper who "received" and verified the return
  recommendedBy: Signature; 
  approvedBy: Signature; // This is the final approver
}

export interface MarmatItem {
  id: number;
  name: string;
  codeNo: string;
  details: string; 
  quantity: number;
  unit: string;
  remarks: string;
}

export interface MarmatEntry {
  id: string;
  fiscalYear: string;
  formNo: string; 
  date: string;
  status: 'Pending' | 'Approved' | 'Completed';
  items: MarmatItem[];
  requestedBy: Signature;   
  recommendedBy: Signature; 
  approvedBy: Signature;    
  maintainedBy?: Signature;  
}

export interface DhuliyaunaItem {
  id: number;
  inventoryId?: string; 
  codeNo: string;
  name: string;
  specification: string;
  unit: string;
  quantity: number;
  rate: number;
  totalAmount: number;
  reason: string; 
  remarks: string;
}

export interface DhuliyaunaEntry {
  id: string;
  fiscalYear: string;
  formNo: string;
  date: string;
  status: 'Pending' | 'Approved';
  disposalType: 'Dhuliyauna' | 'Lilaam' | 'Minaha';
  items: DhuliyaunaItem[];
  preparedBy: Signature;
  approvedBy: Signature;
}

export interface LogBookEntry {
  id: string;
  fiscalYear: string;
  date: string; 
  inventoryId: string; 
  assetName: string; 
  codeNo: string; 
  details: string; 
  startTime: string; 
  endTime: string; 
  total: number; 
  fuelConsumed: number; 
  oilConsumed: number; 
  operatorName: string; 
  remarks: string;
}

// Updated interface to match the image's detailed columns
export interface PropertyUseRow {
  id: string;
  date: string; // मिति (Col 1)
  magFormNo: string; // माग फारम नं (Col 2)
  sanketNo: string; // सङ्केत नं. (Col 3)
  name: string; // नाम (Col 4)
  model: string; // मोडल (Col 5) - Placeholder for now
  specification: string; // स्पेसिफिकेसन (Col 6)
  idNo: string; // पहिचान नं. (Col 7) - Using uniqueCode/sanketNo/codeNo
  estLife: string; // अनुमानित आयु (Col 8) - Placeholder for now
  makeCountry: string; // निर्माण भएको देश/कम्पनी (Col 9) - Placeholder for now
  source: string; // प्राप्तिको स्रोत (Col 10)
  unit: string; // एकाई (Col 11)
  quantity: number; // परिमाण (Col 12) - Issued quantity
  totalCost: number; // जम्मा परल मूल्य (Col 13)

  // फिर्ताको विवरण (Col 14, 15, 16)
  returnedQuantity: number; // परिमाण
  returnDates: string[]; // मिति
  returnReceivers: string[]; // दस्तखत (ApprovedBy Name from ReturnEntry)

  // बुझिलिनेको नाम र दस्तखत (Col 17) - This represents the final signature column, combining details
  receiverName: string; // माग गर्नेको नाम
  receiverDesignation: string; // माग गर्नेको पद
  receiverSignatureDate: string; // माग गर्नेको मिति

  isCleared: boolean; // Custom field to indicate if fully returned
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: Option[] | FiscalYear[];
  error?: string;
  icon?: React.ReactNode;
  placeholder?: string;
}

export interface DashboardProps {
  onLogout: () => void;
  currentUser: User | null; 
  currentFiscalYear: string;
  users: User[];
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onChangePassword: (userId: string, newPassword: string) => void;
  
  generalSettings: OrganizationSettings;
  onUpdateGeneralSettings: (settings: OrganizationSettings) => void;

  magForms: MagFormEntry[];
  onSaveMagForm: (form: MagFormEntry) => void;
  onDeleteMagForm: (formId: string) => void; 
  
  purchaseOrders: PurchaseOrderEntry[];
  onUpdatePurchaseOrder: (order: PurchaseOrderEntry) => void; 

  issueReports: IssueReportEntry[];
  onUpdateIssueReport: (report: IssueReportEntry) => void; 

  rabiesPatients: RabiesPatient[];
  onAddRabiesPatient: (patient: RabiesPatient) => void;
  onUpdateRabiesPatient: (patient: RabiesPatient) => void;
  onDeletePatient: (patientId: string) => void; 

  // Added TB related props
  tbPatients: TBPatient[];
  onAddTbPatient: (patient: TBPatient) => void;
  onUpdateTbPatient: (patient: TBPatient) => void;
  onDeleteTbPatient: (patientId: string) => void;

  // NEW: Garbhawati Patients props
  garbhawatiPatients: GarbhawatiPatient[];
  onAddGarbhawatiPatient: (patient: GarbhawatiPatient) => void;
  onUpdateGarbhawatiPatient: (patient: GarbhawatiPatient) => void;
  onDeleteGarbhawatiPatient: (patientId: string) => void;

  // NEW: Child Immunization Records props
  bachhaImmunizationRecords: ChildImmunizationRecord[];
  onAddBachhaImmunizationRecord: (record: ChildImmunizationRecord) => void;
  onUpdateBachhaImmunizationRecord: (record: ChildImmunizationRecord) => void;
  onDeleteBachhaImmunizationRecord: (recordId: string) => void;

  firms: FirmEntry[];
  onAddFirm: (firm: FirmEntry) => void;

  quotations: QuotationEntry[];
  onAddQuotation: (quotation: QuotationEntry) => void;

  inventoryItems: InventoryItem[];
  onAddInventoryItem: (item: InventoryItem) => void;
  onUpdateInventoryItem: (item: InventoryItem) => void;
  onDeleteInventoryItem: (itemId: string) => void; 

  stockEntryRequests: StockEntryRequest[];
  onRequestStockEntry: (request: StockEntryRequest) => void;
  onApproveStockEntry: (requestId: string, approverName: string, approverDesignation: string) => void;
  onRejectStockEntry: (requestId: string, reason: string, approverName: string) => void;

  stores: Store[];
  onAddStore: (store: Store) => void;
  onUpdateStore: (store: Store) => void;
  onDeleteStore: (storeId: string) => void;

  dakhilaReports: DakhilaPratibedanEntry[];
  onSaveDakhilaReport: (report: DakhilaPratibedanEntry) => void;

  returnEntries: ReturnEntry[];
  onSaveReturnEntry: (entry: ReturnEntry) => void;

  marmatEntries: MarmatEntry[];
  onSaveMarmatEntry: (entry: MarmatEntry) => void;

  dhuliyaunaEntries: DhuliyaunaEntry[];
  onSaveDhuliyaunaEntry: (entry: DhuliyaunaEntry) => void;

  logBookEntries: LogBookEntry[];
  onSaveLogBookEntry: (entry: LogBookEntry) => void;

  onClearData: (sectionId: string) => void; 
}

export interface UserManagementProps {
  currentUser: User;
  users: User[];
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
}
