import React from 'react';
import { ServiceSeekerRecord, OrganizationSettings } from '../types/coreTypes';

interface PrescriptionPrintProps {
  record: ServiceSeekerRecord;
  generalSettings: OrganizationSettings;
}

export const PrescriptionPrint: React.FC<PrescriptionPrintProps> = ({ record, generalSettings }) => {
  return (
    <div className="prescription-print" style={{ 
      width: '210mm', 
      minHeight: '297mm', 
      padding: '20mm', 
      fontFamily: 'serif',
      fontSize: '12pt',
      boxSizing: 'border-box'
    }}>
      <div style={{ textAlign: 'center', borderBottom: '2px solid #000', marginBottom: '20px', paddingBottom: '10px' }}>
        <h1 style={{ margin: 0 }}>{generalSettings?.orgNameNepali || 'PHC Beltar'}</h1>
        <p style={{ margin: 0 }}>{generalSettings?.subTitleNepali || ''}</p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <p><strong>Name:</strong> {record.name}</p>
          <p><strong>Age/Gender:</strong> {record.age} / {record.gender}</p>
        </div>
        <div>
          <p><strong>Date:</strong> {record.date}</p>
          <p><strong>ID:</strong> {record.uniquePatientId}</p>
        </div>
      </div>
      <div style={{ minHeight: '200mm' }}>
        <h3>Prescription:</h3>
        <p>_________________________________________________________________</p>
        <p>_________________________________________________________________</p>
        <p>_________________________________________________________________</p>
      </div>
      <div style={{ marginTop: '20px', borderTop: '1px solid #000', paddingTop: '10px', textAlign: 'right' }}>
        <p>Doctor's Signature</p>
      </div>
    </div>
  );
};
