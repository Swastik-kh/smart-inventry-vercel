
import React, { useState } from 'react';
import { Database, Download, Upload, HardDrive, FileText, ShoppingCart, Archive, FileUp, CheckCircle2, Info, Trash2, Lock, FileOutput, RotateCcw, Wrench, Scroll, ClipboardList, Send, Warehouse, Layers, ShieldCheck, Table as TableIcon, AlertTriangle, Loader2 } from 'lucide-react';
import { User, InventoryItem, MagFormEntry, PurchaseOrderEntry, IssueReportEntry, RabiesPatient, FirmEntry, Store, DakhilaPratibedanEntry, ReturnEntry, MarmatEntry, DhuliyaunaEntry, LogBookEntry } from '../types';
import { Select } from './Select';

interface DatabaseManagementProps {
  currentUser: User;
  users: User[];
  inventoryItems: InventoryItem[];
  magForms: MagFormEntry[];
  purchaseOrders: PurchaseOrderEntry[];
  issueReports: IssueReportEntry[];
  rabiesPatients: RabiesPatient[];
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
            'B-101', 
            '2026-12-31', 
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
    { id: 'stores', title: 'स्टोरहरू', data: stores, icon: <HardDrive size={24} className="text-slate-600" />, desc: 'विभिन्न स्टोरहरूको विवरण', color: 'bg-slate-100 border-slate-200' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <div className="bg-slate-100 p-2 rounded-lg text-slate-700"><Database size={24} /></div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-nepali">डाटाबेस व्यवस्थापन</h2>
          <p className="text-sm text-slate-500">प्रणालीको डाटा ब्याकअप र आयात/निर्यात</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200 overflow-x-auto no-print">
          <button onClick={() => setActiveTab('download')} className={`pb-3 px-1 text-sm font-medium transition-all relative whitespace-nowrap ${activeTab === 'download' ? 'text-blue-600' : 'text-slate-500'}`}>
              <div className="flex items-center gap-2"><Download size={18} />डाटा डाउनलोड</div>
              {activeTab === 'download' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
          </button>
          <button onClick={() => setActiveTab('upload')} className={`pb-3 px-1 text-sm font-medium transition-all relative whitespace-nowrap ${activeTab === 'upload' ? 'text-green-600' : 'text-slate-500'}`}>
              <div className="flex items-center gap-2"><Upload size={18} />डाटा अपलोड (Excel/CSV)</div>
              {activeTab === 'upload' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-green-600 rounded-t-full"></div>}
          </button>
          {isSuperAdmin && (
            <button onClick={() => setActiveTab('delete')} className={`pb-3 px-1 text-sm font-medium transition-all relative whitespace-nowrap ${activeTab === 'delete' ? 'text-red-600' : 'text-slate-500'}`}>
                <div className="flex items-center gap-2"><Trash2 size={18} />डाटा मेटाउनुहोस्</div>
                {activeTab === 'delete' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 rounded-t-full"></div>}
            </button>
          )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm min-h-[400px]">
          {activeTab === 'download' && (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dataSections.map((section) => (
                    <div key={section.id} className={`p-5 rounded-xl border ${section.color} shadow-sm flex flex-col`}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm">{section.icon}</div>
                            <div>
                                <h4 className="font-bold text-slate-800 font-nepali text-sm">{section.title}</h4>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{section.data.length} Rows</span>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mb-4 font-nepali flex-1">{section.desc}</p>
                        <button onClick={() => downloadCSV(section.data, section.id)} className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-900 transition-colors">
                            <Download size={14} /> CSV डाउनलोड गर्नुहोस्
                        </button>
                    </div>
                ))}
              </div>
          )}

          {activeTab === 'upload' && (
              <div className="p-6 max-w-5xl mx-auto space-y-6">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                      <div className="grid md:grid-cols-1 gap-6">
                          <Select 
                            label="डाटाको प्रकार छान्नुहोस् (Select Data Type)" 
                            options={dataSections.map(s => ({id: s.id, value: s.id, label: s.title}))} 
                            value={uploadTarget} 
                            onChange={(e) => {
                                setUploadTarget(e.target.value);
                                setUploadSuccess(null);
                            }} 
                            icon={<Database size={18} className="text-primary-600"/>}
                            placeholder="अपलोड गर्ने डाटाको प्रकार छान्नुहोस्"
                          />

                          {uploadTarget === 'inventory' && (
                              <div className="grid md:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                                  <Select 
                                    label="कुन स्टोरको लागि अपलोड गर्ने? (Select Store)"
                                    options={stores.map(s => ({id: s.id, value: s.id, label: s.name}))}
                                    value={uploadStoreId}
                                    onChange={(e) => setUploadStoreId(e.target.value)}
                                    icon={<Warehouse size={16} className="text-primary-600" />}
                                    required
                                  />
                                  <Select 
                                    label="सामानको प्रकार (Expendable/Non-Expendable)"
                                    options={[
                                        {id: 'exp', value: 'Expendable', label: 'खर्च भएर जाने (Expendable)'},
                                        {id: 'nonexp', value: 'Non-Expendable', label: 'खर्च भएर नजाने (Non-Expendable)'}
                                    ]}
                                    value={uploadItemType}
                                    onChange={(e) => setUploadItemType(e.target.value as any)}
                                    icon={<Layers size={16} className="text-primary-600" />}
                                    required
                                  />
                              </div>
                          )}
                      </div>

                      {uploadTarget && UPLOAD_FORMATS[uploadTarget] && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm font-nepali bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                                <TableIcon size={18} />
                                आवश्यक फाइल ढाँचा (Required File Format - Use these exact Headers)
                            </div>
                            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-inner bg-slate-50/30">
                                <table className="w-full text-[10px] text-left border-collapse">
                                    <thead className="bg-slate-100 text-slate-700 font-bold">
                                        <tr>
                                            {UPLOAD_FORMATS[uploadTarget].headers.map((h, i) => (
                                                <th key={i} className="px-3 py-2.5 border-b border-slate-300 whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="bg-white">
                                            {UPLOAD_FORMATS[uploadTarget].example.map((ex, i) => (
                                                <td key={i} className="px-3 py-2.5 text-slate-500 italic border-b border-slate-100 whitespace-nowrap">{ex}</td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                      )}

                      <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center bg-slate-50/50 hover:border-primary-400 transition-all relative group">
                          <input type="file" accept=".csv" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                          <div className="flex flex-col items-center gap-3">
                              <div className="p-4 bg-white rounded-full border shadow-sm group-hover:scale-110 transition-transform">
                                <FileUp size={32} className="text-primary-500" />
                              </div>
                              <p className="text-sm font-bold text-slate-700">{selectedFile ? selectedFile.name : 'CSV फाइल छान्नुहोस्'}</p>
                              <p className="text-xs text-slate-400">केवल .csv फाइल सपोर्ट गर्दछ (Excel मा Save As CSV गर्नुहोस्)</p>
                          </div>
                      </div>

                      <button 
                        onClick={handleUpload} 
                        disabled={!selectedFile || !uploadTarget || isUploading || (uploadTarget === 'inventory' && (!uploadStoreId || !uploadItemType))} 
                        className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${(!selectedFile || !uploadTarget || isUploading || (uploadTarget === 'inventory' && (!uploadStoreId || !uploadItemType))) ? 'bg-slate-300 shadow-none cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-green-100'}`}
                      >
                        {isUploading ? <><Loader2 size={20} className="animate-spin"/> डाटा प्रोसेसिङ्ग हुँदै...</> : <><Send size={20}/> डाटा अपलोड गर्नुहोस्</>}
                      </button>

                      {uploadSuccess && (
                        <div className="p-4 bg-green-50 border border-green-100 text-green-800 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                            <CheckCircle2 size={24} className="text-green-600" />
                            <span className="font-bold font-nepali">{uploadSuccess}</span>
                        </div>
                      )}
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                      <Info size={20} className="text-blue-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-blue-700 leading-relaxed font-nepali">
                          <strong>महत्त्वपूर्ण जानकारी:</strong> जिन्सी मौज्दातको ७००+ डाटा अपलोड गर्दा एक्सेलबाट .csv मा कन्भर्ट गर्दा कोलमका हेडरहरू माथिको टेबलमा दिइएको क्रममा हुनुपर्छ। ठूलो संख्यामा डाटा हुँदा अपलोड हुन केही सेकेन्ड समय लाग्न सक्छ।
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'delete' && isSuperAdmin && (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dataSections.map((section) => (
                    <div key={section.id} className="p-5 rounded-xl border border-slate-200 hover:border-red-200 transition-all flex flex-col justify-between group">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-red-50 transition-colors">{section.icon}</div>
                            <h4 className="font-bold text-slate-800 font-nepali text-sm">{section.title}</h4>
                        </div>
                        <button onClick={() => handleDelete(section.id, section.title)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold text-red-600 border border-red-100 hover:bg-red-600 hover:text-white transition-all">
                            <Trash2 size={16} /> डाटा मेटाउनुहोस् (Delete)
                        </button>
                    </div>
                ))}
              </div>
          )}
      </div>
    </div>
  );
};
