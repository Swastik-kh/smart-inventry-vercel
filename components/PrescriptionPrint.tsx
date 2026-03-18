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
      padding: '5mm', 
      fontFamily: 'serif',
      fontSize: '10pt',
      boxSizing: 'border-box',
      border: '1px solid #000'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #000', paddingBottom: '5px' }}>
        <img src={generalSettings?.logoUrl || 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Emblem_of_Nepal.svg/1200px-Emblem_of_Nepal.svg.png'} style={{ width: '80px', height: '80px' }} alt="Logo" />
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '16pt' }}>{generalSettings?.orgNameNepali || 'आधारभूत नगर अस्पताल बेल्टार'}</h1>
          <p style={{ margin: 0 }}>{generalSettings?.subTitleNepali || 'उदयपुर, कोशी प्रदेश'}</p>
          <p style={{ margin: 0 }}>{generalSettings?.subTitleNepali2 || ''}</p>
          <p style={{ margin: 0 }}>{generalSettings?.subTitleNepali3 || ''}</p>
          <div style={{ fontWeight: 'bold', border: '1px solid #000', display: 'inline-block', padding: '2px 10px', borderRadius: '15px', marginTop: '5px' }}>स्वास्थ्य सेवा कार्ड</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>PAN No.: {generalSettings?.panNo || 'N/A'}</div>
          <div>HMIS1.2:</div>
          <div>Health Service Card</div>
        </div>
      </div>
      <div style={{ textAlign: 'right', marginTop: '5px' }}>मिति : ...........................</div>

      {/* Patient Details & Diagnosis */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #000' }}>
        <div style={{ borderRight: '1px solid #000', padding: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div><strong>Name:</strong> {record.name}</div>
            <div><strong>Age/Gender:</strong> {record.age} / {record.gender}</div>
            <div><strong>ID:</strong> {record.uniquePatientId}</div>
            <div><strong>Address:</strong> {record.address || 'N/A'}</div>
          </div>
          <div style={{ width: '60px', height: '60px' }}>
            <QRCodeSVG value={stickerData} size={60} />
          </div>
        </div>
        <div style={{ padding: '5px' }}>
          <div>Provisional/Final Diagnosis :-</div>
          <div style={{ height: '60px' }}></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <div>Wt.:</div><div>BP:</div>
            <div>Pulse:</div><div>Temp:</div>
            <div>RR:</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', minHeight: '600px' }}>
        {/* Left Column: Investigations */}
        <div style={{ borderRight: '1px solid #000', padding: '5px' }}>
          <div><strong>Blood :-</strong></div>
          {['BS (R/F/PP)', 'GCT/HbA1C', 'CBC/HB/Blood Grouping', 'RFT', 'LFT', 'Lipd Profile', 'TFT Serology', 'ECG', 'ANC Package'].map(item => (
            <div key={item}><input type="checkbox" /> {item}</div>
          ))}
          <div>Others. ...</div>
          <br/>
          <div><strong>Urine and Stool :-</strong></div>
          <div><input type="checkbox" /> Urine RE</div>
          <div><input type="checkbox" /> Stool RE</div>
          <br/>
          <div><strong>Radiology :-</strong></div>
          <div><input type="checkbox" /> X-ray</div>
          <div><input type="checkbox" /> USG</div>
          <br/>
          <div><strong>Other Investigtion :-</strong></div>
        </div>
        {/* Right Column: C/O and Rx */}
        <div style={{ padding: '5px' }}>
          <div style={{ borderBottom: '1px solid #000', minHeight: '100px' }}><strong>C/O</strong></div>
          <div style={{ minHeight: '400px' }}><strong>Rx</strong></div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #000', fontSize: '9pt' }}>
        <div>कार्यालय सम्पर्क : {generalSettings?.phone || 'N/A'} | एम्बुलेन्स सेवा : {generalSettings?.email || 'N/A'}</div>
        <div style={{ textAlign: 'center', fontWeight: 'bold', background: '#000', color: '#fff', padding: '2px' }}>उपलब्ध सेवाहरु</div>
        <div>रेविज विरुद्धको भ्याक्सिन सेवा | हरेक दिन ओ.पि.डि. सेवा | २४ सै घण्टा ईमेरजेन्सी सेवा | फार्मेसी, ल्याव, डिजिटल एक्स-रे, इ.सि.जि., नेबुलाईजेसन सेवा | डेसिड सेवा | सुरक्षित मातृत्व सेवा | पोषण सेवा | खोप सेवा | परिवार नियोजन सेवा | सुरक्षित गर्भपतन सेवा | क्षयरोग, कुष्ठरोग, कालाजार, मलेरिया उपचार सेवा | सर्प दंश उपचार सेवा | फार्मेसी सेवा सेवा</div>
        <div style={{ textAlign: 'center', fontWeight: 'bold', background: '#000', color: '#fff', padding: '2px' }}>हरेक पटक आउँदा यो पुर्जा अनिवार्य रुपमा लिई आउनु होला |</div>
      </div>
    </div>
  );
};
