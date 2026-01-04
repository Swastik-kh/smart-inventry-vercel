
import React, { useState } from 'react';
import { Database, Download, Upload, HardDrive, FileText, ShoppingCart, Archive, FileUp, CheckCircle2, Info, Trash2, Lock, FileOutput, RotateCcw, Wrench, Scroll, ClipboardList, Send, Warehouse, Layers, ShieldCheck, Table as TableIcon, AlertTriangle, Loader2 } from 'lucide-react';
import { User } from '../types/coreTypes'; // Changed import
import { InventoryItem, MagFormEntry, PurchaseOrderEntry, IssueReportEntry, FirmEntry, Store, DakhilaPratibedanEntry, ReturnEntry, MarmatEntry, DhuliyaunaEntry, LogBookEntry } from '../types/inventoryTypes'; // Changed import
import { RabiesPatient, TBPatient } from '../types/healthTypes'; // Changed import
import { Select } from './Select';

interface DatabaseManagementProps {
  currentUser: User;
  users: User[];
  inventoryItems: InventoryItem[];
  magForms: MagFormEntry[];
  purchaseOrders: PurchaseOrderEntry[];
  issueReports: IssueReportEntry[];
  rabiesPatients: RabiesPatient[];
  tbPatients: TBPatient[]; // Added TB Patients prop
  firms: FirmEntry[];
  stores: Store[];
  dakhilaReports: DakhilaPratibedanEntry[];
  returnEntries: ReturnEntry[];
  marmatEntries: MarmatEntry[];
  dhuliyaunaEntries: DhuliyaunaEntry[];
  logBookEntries: LogBookEntry[];
  onClearData?: (sectionId: string) => void;
  onUploadData: (sectionId: string, data: any[], extraMeta?: any) => Promise<void>;
}

const UPLOAD_FORMATS: Record<string, { headers: string[], example: string[] }> = {
    inventory: {
        headers: [
            'Item Name', 
            'Item Classification', 
            'Unique Code', 
            'Sanket No', 
            'Ledger Page', 
            'Unit', 
            'Qty', 
            'Rate', 
            'Tax %', 
            'Batch No', 
            'Expiry (AD)', 
            'Specification', 
            'Remarks'
        ],
        example: [
            'Paracetamol 500mg', 
            'Medicine', 
            'UC-2082-001', 
            'SN-505', 
            '12', 
            'Pkt', 
            '100', 
            '85.50', 
            '0', 
            '2026-12-31', 
            'B-101', 
            'USP Standard', 
            'Essential drug supply'
        ]
    }
};

export const DatabaseManagement: React.FC<DatabaseManagementProps> = ({
  currentUser,
  inventoryItems,
  magForms,
  purchaseOrders,
  issueReports,
  rabiesPatients,
  tbPatients, // Destructure TB Patients
  firms,
  stores,
  dakhilaReports,
  returnEntries,
  marmatEntries,
  dhuliyaunaEntries,
  logBookEntries,
  onClearData,
  onUploadData
}) => {
  const [activeTab, setActiveTab] = useState<'download' | 'upload' | 'delete'>('download');
  const [uploadTarget, setUploadTarget] = useState('');
  const [uploadStoreId, setUploadStoreId] = useState('');
  const [uploadItemType, setUploadItemType] = useState<'Expendable' | 'Non-Expendable' | ''>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';
  const isAdmin = currentUser.role === 'ADMIN';

  if (!isSuperAdmin && !isAdmin) {
      return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 animate-in fade-in zoom-in-95">
              <div className="bg-red-50 p-6 rounded-full mb-4"><Lock size={48} className="text-red-400" /></div>
              <h3 className="text-xl font-bold text-slate-700 font-nepali mb-2">पहुँच अस्वीकृत (Access Denied)</h3>
              <p className="text-sm text-slate-500 max-w-md text-center">यो मेनु प्रयोग गर्न तपाईंलाई अनुमति छैन।</p>
          </div>
      );
  }

  const handleUpload = async () => {
      if (!uploadTarget || !selectedFile) return;
      if (uploadTarget === 'inventory' && (!uploadStoreId || !uploadItemType)) {
          alert('कृपया स्टोर र सामानको प्रकार छान्नुहोस्।');
          return;
      }

      setIsUploading(true);
      setUploadSuccess(null);

      const reader = new FileReader();
      reader.onload = async (e) => {
          try {
              const text = e.target?.result as string;
              if (!text) throw new Error("File is empty");

              // SIMPLE CSV PARSER
              const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
              const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
              
              const rows = lines.slice(1).map(line => {
                  // Handle commas inside quotes
                  const values: string[] = [];
                  let current = "";
                  let inQuotes = false;
                  for (let char of line) {
                      if (char === '"') inQuotes = !inQuotes;
                      else if (char === ',' && !inQuotes) {
                          values.push(current.trim());
                          current = "";
                      } else current += char;
                  }
                  values.push(current.trim());
                  
                  const obj: any = {};
                  headers.forEach((h, i) => {
                      obj[h] = values[i]?.replace(/^"|"$/g, '') || "";
                  });
                  return obj;
              });

              if (rows.length === 0) throw new Error("No data rows found");

              await onUploadData(uploadTarget, rows, { 
                  storeId: uploadStoreId, 
                  itemType: uploadItemType 
              });
              
              setUploadSuccess(`${rows.length} वटा सामानहरू सफलतापूर्वक प्रोसेस गरियो र मौज्दात सूचीमा थपियो।`);
              setSelectedFile(null);
          } catch (error) {
              console.error(error);
              alert('फाइल पढ्दा वा डाटा म्यापिङ गर्दा समस्या आयो। कृपया कोलमका हेडरहरू र फाइल ढाँचा जाँच गर्नुहोस्।');
          } finally {
              setIsUploading(false);
          }
      };

      reader.onerror = () => {
          alert("फाइल लोड गर्न सकिएन।");
          setIsUploading(false);
      };

      reader.readAsText(selectedFile);
  };

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) { alert("डाउनलोड गर्नको लागि कुनै डाटा छैन"); return; }
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    for (const row of data) {
        const values = headers.map(header => {
            const val = row[header];
            const escaped = ('' + (typeof val === 'object' ? JSON.stringify(val) : val)).replace(/"/g, '\\"');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = (sectionId: string, title: string) => {
      if (window.confirm(`के तपाईं निश्चित हुनुहुन्छ कि तपाईं "${title}" को सम्पूर्ण डाटा मेटाउन चाहनुहुन्छ? यो कार्य पूर्ववत गर्न सकिँदैन।`)) {
          if (onClearData) onClearData(sectionId);
      }
  };

  const dataSections = [
    { id: 'inventory', title: 'जिन्सी मौज्दात', data: inventoryItems, icon: <Database size={24} className="text-purple-600" />, desc: 'हालको जिन्सी सामानहरूको सूची', color: 'bg-purple-50 border-purple-200' },
    { id: 'magForms', title: 'माग फारमहरू', data: magForms, icon: <FileText size={24} className="text-orange-600" />, desc: 'सबै माग फारमहरूको विवरण', color: 'bg-orange-50 border-orange-200' },
    { id: 'firms', title: 'फर्महरू', data: firms, icon: <ClipboardList size={24} className="text-slate-600" />, desc: 'सूचीकृत फर्महरूको विवरण', color: 'bg-slate-100 border-slate-200' },
    { id: 'stores', title: 'स्टोरहरू', data: stores, icon: <HardDrive size={24} className="text-slate-600" />, desc: 'विभिन्न स्टोरहरूको विवरण', color: 'bg-slate-100 border-slate-200' },
    { id: 'rabiesPatients', title: 'रेबिज बिरामीहरू', data: rabiesPatients, icon: <ClipboardList size={24} className="text-red-600" />, desc: 'रेबिज खोप बिरामीहरूको विवरण', color: 'bg-red-50 border-red-200' },
    { id: 'tbPatients', title: 'क्षयरोग बिरामीहरू', data: tbPatients, icon: <ClipboardList size={24} className="text-blue-600" />, desc: 'क्षयरोग / कुष्ठरोग बिरामीहरूको विवरण', color: 'bg-blue-50 border-blue-200' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 border