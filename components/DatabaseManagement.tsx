
import React, { useState } from 'react';
import { Database, Download, Upload, FileJson, FileSpreadsheet, ShieldCheck, HardDrive, FileText, Users, ShoppingCart, Archive, Syringe, FileUp, AlertCircle, CheckCircle2, FolderUp, Info, Trash2, AlertTriangle, Lock } from 'lucide-react';
import { User, InventoryItem, MagFormEntry, PurchaseOrderEntry, IssueReportEntry, RabiesPatient, FirmEntry, Store } from '../types';
import { Select } from './Select';

interface DatabaseManagementProps {
  currentUser: User; // Added currentUser prop
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
  // State for Tabs
  const [activeTab, setActiveTab] = useState<'download' | 'upload' | 'delete'>('download');
  
  // State for Upload
  const [uploadTarget, setUploadTarget] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // --- ACCESS CONTROL CHECK ---
  if (currentUser.role !== 'SUPER_ADMIN') {
      return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 animate-in fade-in zoom-in-95">
              <div className="bg-red-50 p-6 rounded-full mb-4">
                  <Lock size={48} className="text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 font-nepali mb-2">पहुँच अस्वीकृत (Access Denied)</h3>
              <p className="text-sm text-slate-500 max-w-md text-center">
                  माफ गर्नुहोला, डाटाबेस व्यवस्थापन (डाउनलोड, अपलोड र डिलिट) को सुविधा केवल <strong>Super Admin</strong> को लागि मात्र उपलब्ध छ।
                  <br/>
                  (Sorry, Database Management features are restricted to Super Admin only.)
              </p>
          </div>
      );
  }

  // Helper function to download JSON
  const downloadJSON = (data: any[], filename: string) => {
    const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const link = document.createElement('a');
    link.href = jsonString;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  // Helper function to convert array of objects to CSV string
  const convertToCSV = (objArray: any[]) => {
    if (!objArray || objArray.length === 0) return '';
    
    // Flatten logic is complex for nested objects, taking a simplified approach for main fields
    // Get headers from first object keys
    const headers = Object.keys(objArray[0]);
    const csvRows = [];
    
    csvRows.push(headers.join(','));

    for (const row of objArray) {
        const values = headers.map(header => {
            const val = row[header];
            // Handle objects (like signatures) or arrays inside items
            const escaped = ('' + (typeof val === 'object' ? JSON.stringify(val) : val)).replace(/"/g, '\\"');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
  };

  // Helper function to download CSV
  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
        alert("डाउनलोड गर्नको लागि कुनै डाटा छैन (No data to download)");
        return;
    }
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setSelectedFile(e.target.files[0]);
        setUploadSuccess(null);
    }
  };

  const handleUpload = () => {
      if (!uploadTarget || !selectedFile) return;
      setIsUploading(true);
      
      // Simulate processing time
      setTimeout(() => {
          setIsUploading(false);
          const targetLabel = dataSections.find(s => s.id === uploadTarget)?.title || uploadTarget;
          setUploadSuccess(`फाइल "${selectedFile.name}" सफलतापूर्वक "${targetLabel}" मा अपलोड भयो! (File uploaded successfully)`);
          setSelectedFile(null);
          // In a real app, here we would parse the Excel file and update the state/database
      }, 2000);
  };

  const handleDelete = (sectionId: string, title: string) => {
      if (window.confirm(`के तपाईं निश्चित हुनुहुन्छ कि तपाईं "${title}" को सम्पूर्ण डाटा मेटाउन चाहनुहुन्छ? यो कार्य पूर्ववत गर्न सकिँदैन।\n(Are you sure you want to delete all data for "${title}"? This action cannot be undone.)`)) {
          if (onClearData) {
              onClearData(sectionId);
          }
      }
  };

  const dataSections = [
    { 
        id: 'users', 
        title: 'प्रयोगकर्ताहरू (Users)', 
        data: users, 
        icon: <Users size={24} className="text-blue-600" />,
        desc: 'प्रणाली प्रयोगकर्ता र लगइन विवरण',
        color: 'bg-blue-50 border-blue-200'
    },
    { 
        id: 'inventory', 
        title: 'जिन्सी मौज्दात (Inventory)', 
        data: inventoryItems, 
        icon: <Database size={24} className="text-purple-600" />,
        desc: 'हालको जिन्सी सामानहरूको सूची',
        color: 'bg-purple-50 border-purple-200'
    },
    { 
        id: 'mag_forms', 
        title: 'माग फारमहरू (Mag Forms)', 
        data: magForms, 
        icon: <FileText size={24} className="text-orange-600" />,
        desc: 'सबै माग फारमहरूको विवरण',
        color: 'bg-orange-50 border-orange-200'
    },
    { 
        id: 'purchase_orders', 
        title: 'खरिद आदेश (Purchase Orders)', 
        data: purchaseOrders, 
        icon: <ShoppingCart size={24} className="text-green-600" />,
        desc: 'जारी गरिएका खरिद आदेशहरू',
        color: 'bg-green-50 border-green-200'
    },
    { 
        id: 'issue_reports', 
        title: 'निकासा प्रतिवेदन (Issue Reports)', 
        data: issueReports, 
        icon: <Archive size={24} className="text-teal-600" />,
        desc: 'सामान निकासा र खर्च विवरण',
        color: 'bg-teal-50 border-teal-200'
    },
    { 
        id: 'rabies', 
        title: 'रेबिज बिरामी (Rabies Patients)', 
        data: rabiesPatients, 
        icon: <Syringe size={24} className="text-red-600" />,
        desc: 'रेबिज खोप र बिरामीको रेकर्ड',
        color: 'bg-red-50 border-red-200'
    },
    { 
        id: 'firms', 
        title: 'दर्ता फर्महरू (Firms)', 
        data: firms, 
        icon: <ShieldCheck size={24} className="text-indigo-600" />,
        desc: 'सुचीकृत फर्म/सप्लायर्स',
        color: 'bg-indigo-50 border-indigo-200'
    },
    { 
        id: 'stores', 
        title: 'स्टोरहरू (Stores)', 
        data: stores, 
        icon: <HardDrive size={24} className="text-slate-600" />,
        desc: 'विभिन्न स्टोरहरूको विवरण',
        color: 'bg-slate-100 border-slate-200'
    }
  ];

  // File Format Specifications
  const fileFormatSpecs: Record<string, string> = {
    users: "username, password, role, fullName, designation, phoneNumber, organizationName",
    inventory: "itemName, uniqueCode, sanketNo, itemType (Expendable/Non-Expendable), itemClassification, unit, currentQuantity, rate, storeId",
    mag_forms: "fiscalYear, formNo, date (YYYY/MM/DD), status",
    purchase_orders: "magFormNo, requestDate, status, vendorName",
    issue_reports: "magFormNo, issueDate, status, demandBy",
    rabies: "regNo, name, age, sex, address, phone, regimen",
    firms: "firmName, vatPan, address, contactNo",
    stores: "name, address, contactPerson, contactPhone"
  };

  const uploadOptions = dataSections.map(section => ({
      id: section.id,
      value: section.id,
      label: section.title
  }));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <div className="bg-slate-100 p-2 rounded-lg text-slate-700">
          <Database size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-nepali">डाटाबेस व्यवस्थापन (Database Management)</h2>
          <p className="text-sm text-slate-500">प्रणालीको डाटा ब्याकअप र आयात/निर्यात</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 overflow-x-auto">
          <button
              onClick={() => setActiveTab('download')}
              className={`pb-3 px-1 text-sm font-medium transition-all relative whitespace-nowrap ${
                  activeTab === 'download' 
                  ? 'text-blue-600' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
          >
              <div className="flex items-center gap-2">
                  <Download size={18} />
                  डाटा डाउनलोड (Download)
              </div>
              {activeTab === 'download' && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>
              )}
          </button>
          <button
              onClick={() => setActiveTab('upload')}
              className={`pb-3 px-1 text-sm font-medium transition-all relative whitespace-nowrap ${
                  activeTab === 'upload' 
                  ? 'text-green-600' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
          >
              <div className="flex items-center gap-2">
                  <Upload size={18} />
                  डाटा अपलोड (Upload Excel)
              </div>
              {activeTab === 'upload' && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-green-600 rounded-t-full"></div>
              )}
          </button>
          <button
              onClick={() => setActiveTab('delete')}
              className={`pb-3 px-1 text-sm font-medium transition-all relative whitespace-nowrap ${
                  activeTab === 'delete' 
                  ? 'text-red-600' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
          >
              <div className="flex items-center gap-2">
                  <Trash2 size={18} />
                  डाटा मेटाउनुहोस् (Delete Data)
              </div>
              {activeTab === 'delete' && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 rounded-t-full"></div>
              )}
          </button>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
          
          {/* DOWNLOAD SECTION */}
          {activeTab === 'download' && (
              <div className="p-6 animate-in fade-in slide-in-from-left-2 duration-200">
                  <div className="mb-6 bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3">
                      <Download className="text-blue-600 mt-1" size={20} />
                      <div>
                          <h4 className="font-bold text-blue-800 font-nepali text-sm">ब्याकअप डाउनलोड गर्नुहोस्</h4>
                          <p className="text-sm text-blue-700 mt-1">
                              यहाँबाट तपाईंले प्रणालीमा रहेका सम्पूर्ण डाटाहरू JSON (ब्याकअपको लागि) वा CSV (Excel मा हेर्नको लागि) फर्म्याटमा डाउनलोड गर्न सक्नुहुन्छ।
                          </p>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {dataSections.map((section) => (
                        <div key={section.id} className={`p-5 rounded-xl border ${section.color} shadow-sm hover:shadow-md transition-all`}>
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                                        {section.icon}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 font-nepali text-sm">{section.title}</h4>
                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-white rounded-full border border-slate-200 text-slate-500">
                                            {section.data.length} Rows
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <p className="text-xs text-slate-500 mb-4 line-clamp-2 min-h-[2.5em]">{section.desc}</p>

                            <div className="flex gap-2">
                                <button 
                                    onClick={() => downloadJSON(section.data, section.id)}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 text-white py-2 rounded-lg text-xs font-medium hover:bg-slate-900 transition-colors shadow-sm"
                                    title="Download JSON Backup"
                                >
                                    <FileJson size={14} /> JSON
                                </button>
                                <button 
                                    onClick={() => downloadCSV(section.data, section.id)}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-slate-300 text-slate-700 py-2 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors shadow-sm"
                                    title="Download Excel/CSV"
                                >
                                    <FileSpreadsheet size={14} /> CSV
                                </button>
                            </div>
                        </div>
                    ))}
                  </div>
              </div>
          )}

          {/* UPLOAD SECTION */}
          {activeTab === 'upload' && (
              <div className="p-6 animate-in fade-in slide-in-from-right-2 duration-200">
                  <div className="max-w-2xl mx-auto space-y-6">
                      
                      <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex items-start gap-3">
                          <Upload className="text-green-600 mt-1" size={20} />
                          <div>
                              <h4 className="font-bold text-green-800 font-nepali text-sm">डाटा अपलोड गर्नुहोस् (Upload Data)</h4>
                              <p className="text-sm text-green-700 mt-1">
                                  Excel वा CSV फाइल मार्फत ठूलो मात्रामा डाटा एकैपटक सिस्टममा अपलोड गर्न सकिन्छ।
                              </p>
                          </div>
                      </div>

                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                          
                          <div className="space-y-4">
                              <Select 
                                  label="डाटाको प्रकार छान्नुहोस् (Select Data Type)"
                                  options={uploadOptions}
                                  value={uploadTarget}
                                  onChange={(e) => setUploadTarget(e.target.value)}
                                  placeholder="-- छान्नुहोस् --"
                              />

                              {uploadTarget && fileFormatSpecs[uploadTarget] && (
                                  <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                                      <Info size={16} className="mt-0.5 shrink-0" />
                                      <div className="flex-1">
                                          <span className="font-bold block mb-1">आवश्यक फाइल ढाँचा (Required Columns):</span>
                                          <div className="font-mono bg-blue-100 p-2 rounded border border-blue-200 break-all leading-tight">
                                              {fileFormatSpecs[uploadTarget]}
                                          </div>
                                          <p className="mt-1.5 text-blue-600 font-medium">
                                              * पहिलो लहर (Row 1) मा माथि उल्लेखित शीर्षकहरू हुनुपर्छ।
                                          </p>
                                      </div>
                                  </div>
                              )}

                              <div className="space-y-2">
                                  <label className="text-sm font-medium text-slate-700">फाइल छान्नुहोस् (Select File)</label>
                                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors relative group cursor-pointer bg-slate-50/50">
                                      <input 
                                          type="file" 
                                          accept=".csv, .xlsx, .xls" 
                                          onChange={handleFileChange}
                                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                      />
                                      <div className="flex flex-col items-center gap-3 pointer-events-none group-hover:scale-105 transition-transform duration-200">
                                          <div className="p-3 bg-white rounded-full shadow-sm border border-slate-200">
                                              <FileUp size={32} className="text-slate-400 group-hover:text-green-600 transition-colors" />
                                          </div>
                                          <div>
                                              <p className="text-sm font-bold text-slate-700">
                                                  {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                                              </p>
                                              <p className="text-xs text-slate-400 mt-1">
                                                  {selectedFile ? `${(selectedFile.size / 1024).toFixed(2)} KB` : 'Excel (.xlsx) or CSV (.csv)'}
                                              </p>
                                          </div>
                                      </div>
                                  </div>
                              </div>

                              <button 
                                  onClick={handleUpload}
                                  disabled={!selectedFile || !uploadTarget || isUploading}
                                  className={`w-full py-3 rounded-lg font-bold shadow-sm transition-all flex items-center justify-center gap-2 text-sm
                                      ${(!selectedFile || !uploadTarget || isUploading) 
                                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                          : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-md active:scale-95'
                                      }
                                  `}
                              >
                                  {isUploading ? (
                                      <>uploading...</>
                                  ) : (
                                      <><FolderUp size={18}/> डाटाबेसमा अपलोड गर्नुहोस् (Upload to Database)</>
                                  )}
                              </button>
                          </div>

                          {uploadSuccess && (
                              <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                  <CheckCircle2 size={20} className="text-green-600" />
                                  <span className="font-medium text-sm">{uploadSuccess}</span>
                              </div>
                          )}

                          <div className="pt-4 border-t border-slate-100">
                              <div className="flex items-start gap-2 text-xs text-slate-500">
                                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                  <p>
                                      कृपया ध्यान दिनुहोस्: यो सुविधा प्रयोग गर्दा डाटाको ढाँचा (Format) सही हुनु अनिवार्य छ। गलत डाटाले सिस्टममा समस्या ल्याउन सक्छ।
                                      <br/>(Please verify columns before uploading.)
                                  </p>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {/* DELETE SECTION */}
          {activeTab === 'delete' && (
              <div className="p-6 animate-in fade-in slide-in-from-right-2 duration-200">
                  <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="text-red-600 mt-1" size={20} />
                      <div>
                          <h4 className="font-bold text-red-800 font-nepali text-sm">डाटा मेटाउनुहोस् (Delete Data)</h4>
                          <p className="text-sm text-red-700 mt-1">
                              सावधानी: यहाँबाट डाटा मेटाउँदा त्यो सधैंको लागि हराउनेछ। कृपया मेटाउनु अघि ब्याकअप (JSON) डाउनलोड गर्नुहोस्।
                              <br/>(Warning: Deleting data here is permanent. Please backup before proceeding.)
                          </p>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {dataSections.map((section) => (
                        <div key={section.id} className={`p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group`}>
                            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Trash2 size={80} className="text-red-600" />
                            </div>
                            <div className="flex justify-between items-start mb-3 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-slate-600">
                                        {section.icon}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 font-nepali text-sm">{section.title}</h4>
                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 rounded-full border border-slate-200 text-slate-500">
                                            {section.data.length} Rows
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <p className="text-xs text-slate-500 mb-4 line-clamp-2 min-h-[2.5em] relative z-10">{section.desc}</p>

                            <button 
                                onClick={() => handleDelete(section.id, section.title)}
                                disabled={section.data.length === 0}
                                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all relative z-10
                                    ${section.data.length === 0 
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                        : 'bg-white text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300'
                                    }
                                `}
                            >
                                <Trash2 size={14} /> मेटाउनुहोस् (Delete All)
                            </button>
                        </div>
                    ))}
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};
