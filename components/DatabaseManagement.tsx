
import React, { useState } from 'react';
import { Database, Download, Upload, FileJson, FileSpreadsheet, ShieldCheck, HardDrive, FileText, Users, ShoppingCart, Archive, Syringe, FileUp, AlertCircle, CheckCircle2, FolderUp, Info, Trash2, AlertTriangle, Lock } from 'lucide-react';
import { User, InventoryItem, MagFormEntry, PurchaseOrderEntry, IssueReportEntry, RabiesPatient, FirmEntry, Store } from '../types';
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
  onClearData?: (sectionId: string) => void;
}

export const DatabaseManagement: React.FC<DatabaseManagementProps> = ({
  currentUser,
  users,
  inventoryItems,
  magForms,
  purchaseOrders,
  issueReports,
  rabiesPatients,
  firms,
  stores,
  onClearData
}) => {
  const [activeTab, setActiveTab] = useState<'download' | 'upload' | 'delete'>('download');
  const [uploadTarget, setUploadTarget] = useState('');
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

  const downloadJSON = (data: any[], filename: string) => {
    const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const link = document.createElement('a');
    link.href = jsonString;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const convertToCSV = (objArray: any[]) => {
    if (!objArray || objArray.length === 0) return '';
    const headers = Object.keys(objArray[0]);
    const csvRows = [headers.join(',')];
    for (const row of objArray) {
        const values = headers.map(header => {
            const val = row[header];
            const escaped = ('' + (typeof val === 'object' ? JSON.stringify(val) : val)).replace(/"/g, '\\"');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
  };

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) { alert("डाउनलोड गर्नको लागि कुनै डाटा छैन"); return; }
    const csvString = convertToCSV(data);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = () => {
      if (!uploadTarget || !selectedFile) return;
      setIsUploading(true);
      setTimeout(() => {
          setIsUploading(false);
          setUploadSuccess(`फाइल सफलतापूर्वक अपलोड भयो!`);
          setSelectedFile(null);
      }, 2000);
  };

  const handleDelete = (sectionId: string, title: string) => {
      if (window.confirm(`के तपाईं निश्चित हुनुहुन्छ कि तपाईं "${title}" को सम्पूर्ण डाटा मेटाउन चाहनुहुन्छ?`)) {
          if (onClearData) onClearData(sectionId);
      }
  };

  const dataSections = [
    { id: 'inventory', title: 'जिन्सी मौज्दात', data: inventoryItems, icon: <Database size={24} className="text-purple-600" />, desc: 'हालको जिन्सी सामानहरूको सूची', color: 'bg-purple-50 border-purple-200' },
    { id: 'mag_forms', title: 'माग फारमहरू', data: magForms, icon: <FileText size={24} className="text-orange-600" />, desc: 'सबै माग फारमहरूको विवरण', color: 'bg-orange-50 border-orange-200' },
    { id: 'purchase_orders', title: 'खरिद आदेश', data: purchaseOrders, icon: <ShoppingCart size={24} className="text-green-600" />, desc: 'जारी गरिएका खरिद आदेशहरू', color: 'bg-green-50 border-green-200' },
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
          <button onClick={() => setActiveTab('download')} className={`pb-3 px-1 text-sm font-medium transition-all relative ${activeTab === 'download' ? 'text-blue-600' : 'text-slate-500'}`}>
              <div className="flex items-center gap-2"><Download size={18} />डाटा डाउनलोड</div>
              {activeTab === 'download' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
          </button>
          <button onClick={() => setActiveTab('upload')} className={`pb-3 px-1 text-sm font-medium transition-all relative ${activeTab === 'upload' ? 'text-green-600' : 'text-slate-500'}`}>
              <div className="flex items-center gap-2"><Upload size={18} />डाटा अपलोड (Excel)</div>
              {activeTab === 'upload' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-green-600 rounded-t-full"></div>}
          </button>
          {isSuperAdmin && (
            <button onClick={() => setActiveTab('delete')} className={`pb-3 px-1 text-sm font-medium transition-all relative ${activeTab === 'delete' ? 'text-red-600' : 'text-slate-500'}`}>
                <div className="flex items-center gap-2"><Trash2 size={18} />डाटा मेटाउनुहोस्</div>
                {activeTab === 'delete' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 rounded-t-full"></div>}
            </button>
          )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm min-h-[400px]">
          {activeTab === 'download' && (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {dataSections.map((section) => (
                    <div key={section.id} className={`p-5 rounded-xl border ${section.color} shadow-sm`}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-white rounded-lg">{section.icon}</div>
                            <div><h4 className="font-bold text-slate-800 font-nepali text-sm">{section.title}</h4><span className="text-[10px] font-bold text-slate-500">{section.data.length} Rows</span></div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => downloadJSON(section.data, section.id)} className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 text-white py-2 rounded-lg text-xs font-medium">JSON</button>
                            <button onClick={() => downloadCSV(section.data, section.id)} className="flex-1 flex items-center justify-center gap-1.5 bg-white border text-slate-700 py-2 rounded-lg text-xs font-medium">CSV</button>
                        </div>
                    </div>
                ))}
              </div>
          )}

          {activeTab === 'upload' && (
              <div className="p-6 max-w-2xl mx-auto space-y-6">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                      <Select label="डाटाको प्रकार छान्नुहोस्" options={dataSections.map(s => ({id: s.id, value: s.id, label: s.title}))} value={uploadTarget} onChange={(e) => setUploadTarget(e.target.value)} />
                      <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50/50">
                          <input type="file" accept=".csv, .xlsx, .xls" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                          <div className="flex flex-col items-center gap-3"><div className="p-3 bg-white rounded-full border"><FileUp size={32} className="text-slate-400" /></div><p className="text-sm font-bold text-slate-700">{selectedFile ? selectedFile.name : 'Click to upload Excel File'}</p></div>
                      </div>
                      <button onClick={handleUpload} disabled={!selectedFile || !uploadTarget || isUploading} className={`w-full py-3 rounded-lg font-bold text-white transition-all ${(!selectedFile || !uploadTarget || isUploading) ? 'bg-slate-300' : 'bg-green-600 hover:bg-green-700'}`}>{isUploading ? 'uploading...' : 'अपलोड गर्नुहोस्'}</button>
                      {uploadSuccess && <div className="p-4 bg-green-50 border text-green-800 rounded-lg flex items-center gap-3"><CheckCircle2 size={20} className="text-green-600" /><span>{uploadSuccess}</span></div>}
                  </div>
              </div>
          )}

          {activeTab === 'delete' && isSuperAdmin && (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {dataSections.map((section) => (
                    <div key={section.id} className="p-5 rounded-xl border border-slate-200 hover:border-red-200 transition-all">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-slate-50 rounded-lg">{section.icon}</div>
                            <h4 className="font-bold text-slate-800 font-nepali text-sm">{section.title}</h4>
                        </div>
                        <button onClick={() => handleDelete(section.id, section.title)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold text-red-600 border border-red-200 hover:bg-red-50">मेटाउनुहोस् (Delete All)</button>
                    </div>
                ))}
              </div>
          )}
      </div>
    </div>
  );
};
