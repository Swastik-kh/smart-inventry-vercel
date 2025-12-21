
import React from 'react';

export interface FiscalYear {
  id: string;
  label: string; // The display value (e.g., २०८१/०८२)
  value: string; // The internal value
}

export interface Option {
  id: string;
  label: string;
  value: string;
  itemData?: any; // Allow carrying extra data
}

export interface LoginFormData {
  fiscalYear: string;
  username: string;
  password: string;
}

// Added missing LoginFormProps interface to resolve error in components/LoginForm.tsx
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
  allowedMenus?: string[]; // IDs of menu items this user can access
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
  date: string; // YYYY-MM-DD (English)
  status: 'Pending' | 'Given' | 'Missed';
  givenDate?: string;
}

export interface RabiesPatient {
  id: string;
  fiscalYear: string; 
  regNo: string;
  regNo_numeric?: number; // helper for generation
  regMonth: string; 
  regDateBs: string; 
  regDateAd: string; 
  name: string;
  age: string; // Kept as string to match input, will parse for logic
  sex: string;
  address: string;
  phone: string;
  animalType: string;
  exposureCategory: string; 
  bodyPart: string;
  exposureDateBs: string; 
  regimen: 'Intradermal' | 'Intramuscular';
  schedule: VaccinationDose[];
}

export interface MagItem {
  id: number;
  name: string;
  specification: string;
  unit: string;
  quantity: string;
  remarks: string;
  // Optional fields for Issue Report (Nikasha) context populated from Inventory
  codeNo?: string;
  rate?: number;
  totalAmount?: number;
}

export interface Signature {
  name: string;
  designation?: string;
  date?: string;
  purpose?: string;
}

export interface StoreKeeperSignature {
  status: string; // 'market', 'stock', or 'market,stock'
  name: string;
}

export interface MagFormEntry {
  id: string;
  fiscalYear: string;
  formNo: string; // Changed from number to string for format like 001-DA
  date: string;
  items: MagItem[];
  status?: 'Pending' | 'Verified' | 'Approved' | 'Rejected';
  demandBy?: Signature;
  recommendedBy?: Signature;
  storeKeeper?: StoreKeeperSignature;
  receiver?: Signature;
  ledgerEntry?: Signature;
  approvedBy?: Signature;
  rejectionReason?: string; // Added for rejection logic
  // New fields for Storekeeper Verification Details
  selectedStoreId?: string; 
  issueItemType?: 'Expendable' | 'Non-Expendable';
  isViewedByRequester?: boolean; // New: Tracks if the requester has seen the status update
}

// Purchase Order (Kharid Adesh) Structure
export interface PurchaseOrderEntry {
  id: string;
  magFormId: string; // Reference to the original demand form
  magFormNo: string; // Changed from number to string
  requestDate: string;
  items: MagItem[]; // Items to be purchased
  status: 'Pending' | 'Pending Account' | 'Account Verified' | 'Generated' | 'Stock Entry Requested' | 'Completed';
  orderNo?: string; // The generated serial number
  fiscalYear?: string; // Fiscal year of generation
  // Fields to persist draft data
  vendorDetails?: {
    name: string;
    address: string;
    pan: string;
    phone: string;
  };
  budgetDetails?: {
    budgetSubHeadNo: string;
    expHeadNo: string;
    activityNo: string;
  };
  // Signature History
  preparedBy?: Signature;      // Storekeeper
  recommendedBy?: Signature;   // Recommendation
  financeBy?: Signature;       // Account/Lekha
  approvedBy?: Signature;      // Admin/Head
}

// Issue Report (Nikasha Pratibedan) Structure
export interface IssueReportEntry {
  id: string;
  magFormId: string; // Reference to the original demand form
  magFormNo: string; // Changed from number to string
  requestDate: string; // Date of the original demand form (original demand date)
  issueNo?: string; // New: Unique ID for this Issue Report
  issueDate?: string; // New: Date this report was generated/issued (today's date)
  items: MagItem[]; // Items to be issued
  status: 'Pending' | 'Pending Approval' | 'Issued' | 'Rejected'; // Updated status types
  fiscalYear?: string; // Added fiscalYear to IssueReportEntry
  itemType?: 'Expendable' | 'Non-Expendable'; // New: To categorize the report
  demandBy?: Signature; // New: To track who demanded the items
  preparedBy?: Signature;      // Who prepared this issue report (e.g., Storekeeper/Account)
  recommendedBy?: Signature;   // Recommendation signature
  approvedBy?: Signature;      // Final approval signature
  rejectionReason?: string;    // New: Reason for rejection
}

// Firm Listing Structure
export interface FirmEntry {
  id: string;
  firmRegNo: string; // Auto-generated registration number
  firmName: string;
  vatPan: string;
  address: string;
  contactNo: string;
  registrationDateAd: string; // English date for internal logic
  registrationDateBs: string; // Nepali date for display
  fiscalYear: string;
}

// Quotation Entry Structure
export interface QuotationEntry {
  id: string;
  fiscalYear: string;
  firmId: string;
  firmName: string;
  itemName: string;
  unit: string;
  rate: string; // Stored as string to allow decimal input, convert to number for calculations
  quotationDateAd: string; // English date for internal logic
  quotationDateBs: string; // Nepali date for display
}

// Store Structure
export interface Store {
  id: string;
  regNo: string; // e.g., S-081-001
  name: string;
  address: string;
  contactPerson?: string;
  contactPhone?: string;
  fiscalYear: string; // When the store was registered/active for this FY
}

// Inventory Stock Item Structure
export interface InventoryItem {
  id: string; // Unique ID for the inventory item (e.g., 'ITEM-001')
  itemName: string; // Name of the item
  uniqueCode?: string; // Unique code for the specific item
  sanketNo?: string; // Sanket number
  ledgerPageNo?: string; // Jinshi Khata Pana No
  dakhilaNo?: string; // New: दाखिल नम्बर
  itemType: 'Expendable' | 'Non-Expendable'; // खर्च हुने / खर्च नहुने (Required)
  itemClassification?: string; // सामानको वर्गीकरण (Medicine, Equipment, etc.)
  specification?: string; // New: Specification field for Dakhila mapping
  unit: string; // Unit of measurement (e.g., 'Pcs', 'Kg')
  currentQuantity: number; // The total available quantity of this item
  rate?: number; // Rate of the item
  tax?: number; // Tax percentage
  totalAmount?: number; // Calculated total amount (quantity * rate + tax)
  batchNo?: string; // Batch number
  expiryDateAd?: string; // English expiry date
  expiryDateBs?: string; // Nepali expiry date
  lastUpdateDateAd: string; // English date of the last stock change
  lastUpdateDateBs: string; // Nepali date of the last stock change
  fiscalYear: string; // Fiscal year of the last update
  receiptSource?: string; // 'Opening', 'Purchase', 'Donation', 'Return'
  remarks?: string; // Optional remarks for the item itself
  storeId: string; // New: ID of the store where this item is located
  approvedStockLevel?: number; // ASL: Authorized Stock Level
  emergencyOrderPoint?: number; // EOP: Emergency Order Point
}

// New: Stock Entry Request Structure for Approval Workflow
export interface StockEntryRequest {
  id: string;
  requestDateBs: string;
  requestDateAd: string;
  fiscalYear: string;
  storeId: string;
  receiptSource: string;
  supplier?: string;
  refNo?: string;
  items: InventoryItem[]; // Items proposed to be added
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedBy: string; // Username of requester
  requesterName?: string; // Full name of requester for reports
  requesterDesignation?: string; // Designation of requester for reports
  approvedBy?: string; // Username of approver
  rejectionReason?: string;
  mode: 'opening' | 'add';
}

// Dakhila Pratibedan (Entry Report) Structure
export interface DakhilaItem {
  id: number;
  name: string;
  codeNo: string; // Sanket No
  specification: string;
  source: string; // Receipt Source
  unit: string;
  quantity: number;
  rate: number;
  totalAmount: number; // rate * qty (Excl VAT)
  vatAmount: number; // VAT Amount
  grandTotal: number; // total + vat
  otherExpenses: number; // Other expenses
  finalTotal: number; // grandTotal + otherExpenses
  remarks: string;
}

export interface DakhilaPratibedanEntry {
  id: string;
  fiscalYear: string;
  dakhilaNo: string; // Report Number
  date: string;
  orderNo: string; // Purchase Order/Transfer Form No
  items: DakhilaItem[];
  status: 'Draft' | 'Final';
  // Signatures
  preparedBy?: Signature;
  recommendedBy?: Signature;
  approvedBy?: Signature;
}

// Jinshi Firta (Return) Structure
export interface ReturnItem {
  id: number;
  kharchaNikasaNo: string; // खर्च निकासा नं.
  codeNo: string; // सङ्केत नं.
  name: string;
  specification: string;
  unit: string;
  quantity: number;
  rate: number;
  totalAmount: number; // Excl VAT
  vatAmount: number; // VAT Amount
  grandTotal: number; // Incl VAT
  condition: string; // New: सामानको हालको अवस्था
  remarks: string;
}

export interface ReturnEntry {
  id: string;
  fiscalYear: string;
  formNo: string; // जिन्सी फिर्ता फारम नं.
  date: string;
  items: ReturnItem[];
  status?: 'Pending' | 'Verified' | 'Approved' | 'Rejected'; // Added workflow status
  rejectionReason?: string;
  // Signatures
  returnedBy: Signature; // फिर्ता गर्ने
  preparedBy: Signature; // तयार गर्ने
  recommendedBy: Signature; // सिफारिस गर्ने
  approvedBy: Signature; // स्वीकृत गर्ने
}

// Marmat Adesh (Maintenance Order) Structure - Form 402
export interface MarmatItem {
  id: number;
  name: string;
  codeNo: string;
  details: string; // विवरण (Condition/Issue)
  quantity: number;
  unit: string;
  remarks: string;
}

export interface MarmatEntry {
  id: string;
  fiscalYear: string;
  formNo: string; // Anurodh No
  date: string;
  status: 'Pending' | 'Approved' | 'Completed';
  items: MarmatItem[];
  // Signatures
  requestedBy: Signature;   // अनुरोध गर्ने
  recommendedBy: Signature; // सिफारिस गर्ने
  approvedBy: Signature;    // आदेश दिने (स्वीकृत गर्ने)
  maintainedBy?: Signature;  // मर्मत गर्ने (Optional/Later)
}

// Dhuliyauna / Lilaam (Disposal) Structure
export interface DhuliyaunaItem {
  id: number;
  inventoryId?: string; // Link to inventory
  codeNo: string;
  name: string;
  specification: string;
  unit: string;
  quantity: number;
  rate: number;
  totalAmount: number;
  reason: string; // e.g. Expired, Damaged
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

// Log Book (Vehicle/Machine) Structure - Form 413 usually
export interface LogBookEntry {
  id: string;
  fiscalYear: string;
  date: string; // Miti
  inventoryId: string; // Which asset (Vehicle/Generator)
  assetName: string; // Display Name
  codeNo: string; // Number Plate or Code
  details: string; // Details of work/place
  startTime: string; // Start Time or Meter Reading
  endTime: string; // End Time or Meter Reading
  total: number; // Total km or hours
  fuelConsumed: number; // Liters
  oilConsumed: number; // Liters (Mobil)
  operatorName: string; // Driver/Operator
  remarks: string;
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
  currentUser: User;
  currentFiscalYear: string;
  users: User[];
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onChangePassword: (userId: string, newPassword: string) => void;
  
  // General Settings
  generalSettings: OrganizationSettings;
  onUpdateGeneralSettings: (settings: OrganizationSettings) => void;

  // Lifted States
  magForms: MagFormEntry[];
  onSaveMagForm: (form: MagFormEntry) => void;
  
  purchaseOrders: PurchaseOrderEntry[];
  onUpdatePurchaseOrder: (order: PurchaseOrderEntry) => void; 

  issueReports: IssueReportEntry[];
  onUpdateIssueReport: (report: IssueReportEntry) => void; 

  rabiesPatients: RabiesPatient[];
  onAddRabiesPatient: (patient: RabiesPatient) => void;
  onUpdateRabiesPatient: (patient: RabiesPatient) => void;
  // Renamed from onDeleteRabiesPatient to onDeletePatient to fix destructuring error in Dashboard.tsx
  onDeletePatient: (patientId: string) => void; 

  firms: FirmEntry[];
  onAddFirm: (firm: FirmEntry) => void;

  quotations: QuotationEntry[];
  onAddQuotation: (quotation: QuotationEntry) => void;

  // Inventory Stock Props
  inventoryItems: InventoryItem[];
  onAddInventoryItem: (item: InventoryItem) => void;
  onUpdateInventoryItem: (item: InventoryItem) => void;

  // Stock Entry Request Props
  stockEntryRequests: StockEntryRequest[];
  onRequestStockEntry: (request: StockEntryRequest) => void;
  onApproveStockEntry: (requestId: string, approverName: string) => void;
  onRejectStockEntry: (requestId: string, reason: string, approverName: string) => void;

  // Store Management Props
  stores: Store[];
  onAddStore: (store: Store) => void;
  onUpdateStore: (store: Store) => void;
  onDeleteStore: (storeId: string) => void;

  // Dakhila Reports
  dakhilaReports: DakhilaPratibedanEntry[];
  onSaveDakhilaReport: (report: DakhilaPratibedanEntry) => void;

  // Return Entries
  returnEntries: ReturnEntry[];
  onSaveReturnEntry: (entry: ReturnEntry) => void;

  // Marmat Entries
  marmatEntries: MarmatEntry[];
  onSaveMarmatEntry: (entry: MarmatEntry) => void;

  // Dhuliyauna Entries (New)
  dhuliyaunaEntries: DhuliyaunaEntry[];
  onSaveDhuliyaunaEntry: (entry: DhuliyaunaEntry) => void;

  // Log Book Entries (New)
  logBookEntries: LogBookEntry[];
  onSaveLogBookEntry: (entry: LogBookEntry) => void;

  // Database Management
  onClearData: (sectionId: string) => void; 
}

export interface UserManagementProps {
  currentUser: User;
  users: User[];
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
}
