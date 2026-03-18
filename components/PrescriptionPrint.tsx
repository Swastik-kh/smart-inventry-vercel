import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ServiceSeekerRecord, OrganizationSettings } from '../types/coreTypes';

interface PrescriptionPrintProps {
  record: ServiceSeekerRecord;
  generalSettings: OrganizationSettings;
}

export const PrescriptionPrint: React.FC<PrescriptionPrintProps> = ({ record, generalSettings }) => {
  const stickerData = `ID: ${record.uniquePatientId}\nName: ${record.name}\nReg: ${record.registrationNumber}`;

  return (
    <div className="prescription-print" style={{ 
      width: '210mm', 
      minHeight: '297mm', 
      padding: '10mm', 
      fontFamily: 'serif',
      fontSize: '11pt',
      boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #000', marginBottom: '15px', paddingBottom: '10px' }}>
        <img src={generalSettings?.logoUrl || 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png'} style={{ width: '80px', height: '80px' }} alt="Logo" />
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '20pt' }}>{generalSettings?.orgNameNepali || 'PHC Beltar'}</h1>
          <p style={{ margin: 0 }}>{generalSettings?.subTitleNepali || ''}</p>
          <p style={{ margin: 0 }}>{generalSettings?.subTitleNepali2 || ''}</p>
          <p style={{ margin: 0 }}>{generalSettings?.subTitleNepali3 || ''}</p>
        </div>
        <div style={{ width: '80px', height: '80px' }}>
          <QRCodeSVG value={stickerData} size={80} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
        <p style={{ margin: 0 }}><strong>Name:</strong> {record.name}</p>
        <p style={{ margin: 0 }}><strong>Date:</strong> {record.date}</p>
        <p style={{ margin: 0 }}><strong>Age/Gender:</strong> {record.age} / {record.gender}</p>
        <p style={{ margin: 0 }}><strong>ID:</strong> {record.uniquePatientId}</p>
        <p style={{ margin: 0 }}><strong>Address:</strong> {record.address || 'N/A'}</p>
        <p style={{ margin: 0 }}><strong>Reg No:</strong> {record.registrationNumber}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h3 style={{ borderBottom: '1px solid #000', marginBottom: '5px' }}>Chief Complaints</h3>
          <div style={{ minHeight: '50px' }}></div>
          <h3 style={{ borderBottom: '1px solid #000', marginBottom: '5px' }}>Patient History</h3>
          <div style={{ minHeight: '50px' }}></div>
          <h3 style={{ borderBottom: '1px solid #000', marginBottom: '5px' }}>Investigation</h3>
          <div style={{ minHeight: '50px' }}></div>
        </div>
        <div>
          <h3 style={{ borderBottom: '1px solid #000', marginBottom: '5px' }}>Provisional Diagnosis</h3>
          <div style={{ minHeight: '50px' }}></div>
          <h3 style={{ borderBottom: '1px solid #000', marginBottom: '5px' }}>Final Diagnosis</h3>
          <div style={{ minHeight: '50px' }}></div>
          <h3 style={{ borderBottom: '1px solid #000', marginBottom: '5px' }}>Treatment</h3>
          <div style={{ minHeight: '150px' }}></div>
        </div>
      </div>

      <div style={{ marginTop: '20px', borderTop: '1px solid #000', paddingTop: '10px', textAlign: 'right' }}>
        <p>Doctor's Signature</p>
      </div>
    </div>
  );
};
