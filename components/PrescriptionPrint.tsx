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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '10px' }}>
        {/* Left Column: Complaints, History, Investigation */}
        <div>
          <div style={{ border: '1px solid #ccc', padding: '5px', marginBottom: '10px' }}>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '10pt', borderBottom: '1px solid #ccc' }}>Chief Complaints</h3>
            <div style={{ minHeight: '50px' }}></div>
          </div>
          <div style={{ border: '1px solid #ccc', padding: '5px', marginBottom: '10px' }}>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '10pt', borderBottom: '1px solid #ccc' }}>Patient History</h3>
            <div style={{ minHeight: '50px' }}></div>
          </div>
          <div style={{ border: '1px solid #ccc', padding: '5px', marginBottom: '10px' }}>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '10pt', borderBottom: '1px solid #ccc' }}>Investigation</h3>
            <div style={{ minHeight: '50px' }}>
              <label style={{ display: 'block', fontSize: '9pt' }}><input type="checkbox" /> Blood Test</label>
              <label style={{ display: 'block', fontSize: '9pt' }}><input type="checkbox" /> Urine Test</label>
              <label style={{ display: 'block', fontSize: '9pt' }}><input type="checkbox" /> X-Ray</label>
              <label style={{ display: 'block', fontSize: '9pt' }}><input type="checkbox" /> USG</label>
            </div>
          </div>
        </div>

        {/* Middle Column: Diagnosis */}
        <div>
          <div style={{ border: '1px solid #ccc', padding: '5px', marginBottom: '10px' }}>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '10pt', borderBottom: '1px solid #ccc' }}>Provisional Diagnosis</h3>
            <div style={{ minHeight: '100px' }}></div>
          </div>
          <div style={{ border: '1px solid #ccc', padding: '5px', marginBottom: '10px' }}>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '10pt', borderBottom: '1px solid #ccc' }}>Final Diagnosis</h3>
            <div style={{ minHeight: '100px' }}></div>
          </div>
        </div>

        {/* Right Column: Treatment (Tallest) */}
        <div>
          <div style={{ border: '1px solid #ccc', padding: '5px', height: '100%' }}>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '10pt', borderBottom: '1px solid #ccc' }}>Treatment</h3>
            <div style={{ minHeight: '300px' }}></div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '20px', borderTop: '1px solid #000', paddingTop: '10px', textAlign: 'right' }}>
        <p>Doctor's Signature</p>
      </div>
    </div>
  );
};
