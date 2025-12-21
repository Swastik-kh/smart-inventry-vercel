
import React, { useState } from 'react';
import { CheckCircle2, X, Eye, ClipboardCheck, AlertCircle, Calendar, Store as StoreIcon, Package, Clock, HelpCircle, ShieldCheck } from 'lucide-react';
import { StockEntryRequest, User, Store } from '../types';

interface StockEntryApprovalProps {
  requests: StockEntryRequest[];
  currentUser: User;
  onApprove: (requestId: string, approverName: string) => void;
  onReject: (requestId: string, reason: string, approverName: string) => void;
  stores: Store[];
}

export const StockEntryApproval: React.FC<StockEntryApprovalProps> = ({ 
  requests, 
  currentUser, 
  onApprove, 
  onReject,
  stores
}) => {
  const [selectedRequest, setSelectedRequest] = useState<StockEntryRequest | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeTab, setActiveTab] = useState<'Pending' | 'History'>('Pending');

  // Filter requests based on tab
  const displayedRequests = requests.filter(req => {
      if (activeTab === 'Pending') return req.status === 'Pending';
      return req.status !== 'Pending'; // History shows Approved/Rejected
  }).sort((a, b) => parseInt(b.id) - parseInt(a.id)); // Sort by newest first

  const handleApproveClick = () => {
      if (!selectedRequest) return;
      setShowApproveConfirm(true);
  };

  const confirmApproval = () => {
      if (!selectedRequest) return;
      onApprove(selectedRequest.id, currentUser.fullName);
      setShowApproveConfirm(false);
      setSelectedRequest(null);
      alert("दाखिला स्वीकृत भयो र मौज्दातमा सामान थपियो। (Entry approved and items added to stock.)");
  };

  const handleRejectClick = (request: StockEntryRequest) => {
      setSelectedRequest(request);
      setShowRejectModal(true);
      setRejectionReason('');
  };

  const submitRejection = () => {
      if (!selectedRequest) return;
      if (!rejectionReason.trim()) {
          alert('Please provide a reason for rejection.');
          return;
      }
      onReject(selectedRequest.id, rejectionReason, currentUser.fullName);
      setShowRejectModal(false);
      setSelectedRequest(null);
  };

  const getStoreName = (storeId: string) => {
      return stores.find(s => s.id === storeId)?.name || 'Unknown Store';
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-teal-100 p-2 rounded-lg text-teal-600">
            <ClipboardCheck size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 font-nepali">स्टक प्रविष्टि अनुरोध (Stock Entry Requests)</h2>
            <p className="text-sm text-slate-500">नयाँ स्टक प्रविष्टिहरू स्वीकृत वा अस्वीकृत गर्नुहोस्</p>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
                onClick={() => setActiveTab('Pending')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'Pending' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
                लम्बित (Pending)
            </button>
            <button
                onClick={() => setActiveTab('History')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'History' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
                इतिहास (History)
            </button>
        </div>
      </div>

      {/* List View */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {displayedRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-500 italic">
                  कुनै {activeTab === 'Pending' ? 'लम्बित' : 'पुराना'} अनुरोध छैन। (No {activeTab.toLowerCase()} requests found.)
              </div>
          ) : (
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                      <tr>
                          <th className="px-6 py-3">Date</th>
                          <th className="px-6 py-3">Store</th>
                          <th className="px-6 py-3">Source / Supplier</th>
                          <th className="px-6 py-3">Items</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3 text-right">Action</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {displayedRequests.map(req => (
                          <tr key={req.id} className="hover:bg-slate-50">
                              <td className="px-6 py-4">
                                  <div className="font-nepali">{req.requestDateBs}</div>
                                  <div className="text-xs text-slate-400">{req.requestDateAd}</div>
                              </td>
                              <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                      <StoreIcon size={14} className="text-slate-400" />
                                      <span className="font-medium text-slate-700">{getStoreName(req.storeId)}</span>
                                  </div>
                              </td>
                              <td className="px-6 py-4">
                                  <div className="text-slate-800 font-medium">{req.receiptSource}</div>
                                  {req.supplier && <div className="text-xs text-slate-500">{req.supplier}</div>}
                              </td>
                              <td className="px-6 py-4">
                                  <div className="flex items-center gap-2 text-slate-600">
                                      <Package size={14} />
                                      <span>{req.items.length} items</span>
                                  </div>
                              </td>
                              <td className="px-6 py-4">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                      req.status === 'Pending' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                      req.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' :
                                      'bg-red-50 text-red-700 border-red-200'
                                  }`}>
                                      {req.status === 'Pending' && <Clock size={12} />}
                                      {req.status === 'Approved' && <CheckCircle2 size={12} />}
                                      {req.status === 'Rejected' && <X size={12} />}
                                      {req.status}
                                  </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                  <button 
                                      onClick={() => setSelectedRequest(req)}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-md text-xs font-bold transition-colors border border-slate-300"
                                  >
                                      <Eye size={14} /> View Details
                                  </button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          )}
      </div>

      {/* Details Modal */}
      {selectedRequest && !showRejectModal && !showApproveConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedRequest(null)}></div>
              
              <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-7xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div>
                          <h3 className="font-bold text-slate-800 text-lg font-nepali">अनुरोध विवरण (Request Details)</h3>
                          <p className="text-xs text-slate-500">ID: {selectedRequest.id} | Mode: <span className="uppercase">{selectedRequest.mode}</span></p>
                      </div>
                      <button onClick={() => setSelectedRequest(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                          <X size={20} />
                      </button>
                  </div>

                  <div className="p-6 overflow-y-auto">
                      {/* Meta Info */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm">
                          <div>
                              <label className="text-xs text-slate-500 font-bold uppercase">Store</label>
                              <p className="font-medium text-slate-800">{getStoreName(selectedRequest.storeId)}</p>
                          </div>
                          <div>
                              <label className="text-xs text-slate-500 font-bold uppercase">Date</label>
                              <p className="font-medium text-slate-800 font-nepali">{selectedRequest.requestDateBs}</p>
                              <p className="text-xs text-slate-400">{selectedRequest.requestDateAd}</p>
                          </div>
                          <div>
                              <label className="text-xs text-slate-500 font-bold uppercase">Source</label>
                              <p className="font-medium text-slate-800">{selectedRequest.receiptSource}</p>
                          </div>
                          <div>
                              <label className="text-xs text-slate-500 font-bold uppercase">Requester</label>
                              <p className="font-medium text-slate-800">{selectedRequest.requestedBy}</p>
                          </div>
                      </div>

                      {selectedRequest.status === 'Rejected' && (
                          <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6 text-red-800 text-sm">
                              <span className="font-bold">Rejected By:</span> {selectedRequest.approvedBy}<br/>
                              <span className="font-bold">Reason:</span> {selectedRequest.rejectionReason}
                          </div>
                      )}

                      {/* Items Table */}
                      <h4 className="font-bold text-slate-700 mb-3 text-sm border-b pb-2 flex justify-between">
                          <span>सामानहरू (Items)</span>
                          <span className="text-xs font-normal text-slate-500">Total Items: {selectedRequest.items.length}</span>
                      </h4>
                      
                      <div className="border border-slate-200 rounded-lg overflow-x-auto">
                          <table className="w-full text-sm text-left whitespace-nowrap">
                              <thead className="bg-slate-50 text-slate-600 font-medium">
                                  <tr>
                                      <th className="px-4 py-2 border-b min-w-[200px]">Item Name / Class</th>
                                      <th className="px-4 py-2 border-b">Codes</th>
                                      <th className="px-4 py-2 border-b">Type</th>
                                      <th className="px-4 py-2 border-b">Unit</th>
                                      <th className="px-4 py-2 border-b text-center">Qty</th>
                                      <th className="px-4 py-2 border-b text-right">Rate</th>
                                      <th className="px-4 py-2 border-b text-right">Total</th>
                                      <th className="px-4 py-2 border-b min-w-[200px]">Remarks</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                  {selectedRequest.items.map((item, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50">
                                          <td className="px-4 py-2 border-b align-top">
                                              <div className="font-medium text-slate-800 whitespace-normal">{item.itemName}</div>
                                              <div className="text-xs text-slate-500">{item.itemClassification || '-'}</div>
                                          </td>
                                          <td className="px-4 py-2 border-b text-xs text-slate-500 align-top">
                                              <div>U: {item.uniqueCode || '-'}</div>
                                              <div>S: {item.sanketNo || '-'}</div>
                                          </td>
                                          <td className="px-4 py-2 border-b text-xs align-top">
                                              <span className={`px-2 py-0.5 rounded border ${
                                                  item.itemType === 'Expendable' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                                              }`}>
                                                  {item.itemType === 'Expendable' ? 'Exp' : 'Non-Exp'}
                                              </span>
                                          </td>
                                          <td className="px-4 py-2 border-b align-top">{item.unit}</td>
                                          <td className="px-4 py-2 border-b text-center font-bold text-slate-800 align-top bg-slate-50/50">{item.currentQuantity}</td>
                                          <td className="px-4 py-2 border-b text-right align-top">{item.rate ? item.rate.toFixed(2) : '-'}</td>
                                          <td className="px-4 py-2 border-b text-right font-bold align-top">{item.totalAmount?.toFixed(2)}</td>
                                          <td className="px-4 py-2 border-b text-xs text-slate-600 align-top italic whitespace-normal">
                                              {item.remarks || '-'}
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>

                  <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                      <button 
                          onClick={() => setSelectedRequest(null)}
                          className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
                      >
                          Close
                      </button>
                      
                      {selectedRequest.status === 'Pending' && (
                          <>
                              <button 
                                  onClick={() => handleRejectClick(selectedRequest)}
                                  className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-medium transition-colors border border-red-200"
                              >
                                  <X size={16} /> Reject Request
                              </button>
                              <button 
                                  onClick={handleApproveClick}
                                  className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-lg text-sm font-medium shadow-sm transition-colors"
                              >
                                  <CheckCircle2 size={16} /> Approve & Add to Stock
                              </button>
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* APPROVE CONFIRMATION POPUP (Custom Modal) */}
      {showApproveConfirm && selectedRequest && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={() => setShowApproveConfirm(false)}></div>
              
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
                  <div className="p-8 text-center">
                      <div className="w-20 h-20 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-teal-50">
                          <HelpCircle size={40} />
                      </div>
                      
                      <h3 className="text-2xl font-bold text-slate-800 font-nepali mb-3">दाखिला स्वीकृत (Approve Entry)?</h3>
                      
                      <p className="text-slate-600 mb-2 font-medium">के तपाईं जिन्सी सामान दाखिला स्वीकृत गर्न चाहनुहुन्छ?</p>
                      <p className="text-xs text-slate-400 bg-slate-50 p-2 rounded border border-slate-100">
                          स्वीकृत गरेपछि, <strong>{selectedRequest.items.length}</strong> वटा सामानहरू <strong>{getStoreName(selectedRequest.storeId)}</strong> गोदाममा थपिनेछन्।
                      </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-px bg-slate-100 border-t border-slate-100">
                      <button 
                          onClick={() => setShowApproveConfirm(false)}
                          className="bg-white py-4 text-slate-500 font-bold hover:bg-slate-50 transition-colors text-sm uppercase tracking-wider"
                      >
                          हुँदैन (Cancel)
                      </button>
                      <button 
                          onClick={confirmApproval}
                          className="bg-white py-4 text-teal-600 font-bold hover:bg-teal-50 transition-colors text-sm border-l border-slate-100 flex items-center justify-center gap-2 uppercase tracking-wider"
                      >
                          <ShieldCheck size={18} />
                          हुन्छ (Confirm)
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowRejectModal(false)}></div>
              
              <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                  <div className="px-6 py-4 border-b border-slate-100 bg-red-50 text-red-800 flex justify-between items-center">
                      <h3 className="font-bold">Reject Request</h3>
                      <button onClick={() => setShowRejectModal(false)}><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <p className="text-sm text-slate-600">Please provide a reason for rejecting this stock entry request.</p>
                      <textarea 
                          className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                          rows={4}
                          placeholder="Rejection reason..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                      />
                      <div className="flex justify-end gap-3 pt-2">
                          <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
                          <button onClick={submitRejection} className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-medium shadow-sm">Confirm Rejection</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
