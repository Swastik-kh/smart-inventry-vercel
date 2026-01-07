
import { Signature } from './coreTypes';

export interface VaccinationDose {
  day: number;
  date: string; 
  dateBs?: string;
  status: 'Pending' | 'Given' | 'Missed';
  givenDate?: string;
}

export interface RabiesPatient {
  id: string;
  fiscalYear: string; 
  regNo: string;
  regNo_numeric?: number; 
  regMonth: string; 
  regDateBs: string; 
  regDateAd: string; 
  vaccineStartDateBs?: string;
  vaccineStartDateAd?: string;
  name: string;
  age: string; 
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

export interface TBReport {
  month: number;
  result: string;
  labNo: string;
  date: string;
  dateNepali?: string;
}

export interface TBPatient {
  id: string;
  patientId: string;
  name: string;
  age: string;
  address: string;
  phone: string;
  regType: string;
  classification: string;
  registrationDate: string;
  serviceType: 'TB' | 'Leprosy';
  leprosyType?: 'MB' | 'PB'; 
  labResultMonth2Positive?: boolean; 
  completedSchedule: number[];
  newReportAvailable?: boolean;
  latestResult?: string;
  latestReportMonth?: number;
  reports: TBReport[];
  fiscalYear: string;
}

export interface GarbhawatiPatient {
  id: string;
  fiscalYear: string;
  regNo: string;
  name: string;
  age: string;
  address: string;
  phone: string;
  gravida: number;
  lmpBs: string;
  lmpAd: string;
  eddBs: string;
  eddAd: string;
  td1DateBs?: string | null;
  td1DateAd?: string | null;
  td2DateBs?: string | null;
  td2DateAd?: string | null;
  tdBoosterDateBs?: string | null;
  tdBoosterDateAd?: string | null;
  remarks?: string | null;
}

export interface ChildImmunizationVaccine {
  name: string;
  scheduledDateBs: string;
  scheduledDateAd: string;
  givenDateBs?: string | null;
  givenDateAd?: string | null;
  status: 'Pending' | 'Given' | 'Missed';
}

export interface ChildImmunizationRecord {
  id: string;
  fiscalYear: string;
  regNo: string;
  childName: string;
  gender: 'Male' | 'Female' | 'Other';
  dobBs: string;
  dobAd: string;
  jatCode?: string; // NEW: Added for ethnic code
  motherName: string;
  fatherName: string;
  address: string;
  phone: string;
  birthWeightKg?: number;
  vaccines: ChildImmunizationVaccine[];
  remarks?: string;
}
