
import React from 'react';
import { InventoryItem } from './inventoryTypes';

export interface FiscalYear {
  id: string;
  label: string; 
  value: string; 
}

export interface Option {
  id: string;
  label: string;
  value: string;
  itemData?: InventoryItem; 
}

export interface LoginFormData {
  fiscalYear: string;
  username: string;
  password: string;
}

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'STAFF' | 'STOREKEEPER' | 'ACCOUNT' | 'APPROVAL';

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  organizationName: string;
  fullName: string;
  designation: string;
  phoneNumber: string;
  allowedMenus?: string[]; 
}

export interface OrganizationSettings {
  orgNameNepali: string;
  orgNameEnglish: string;
  subTitleNepali: string;
  subTitleNepali2?: string;
  subTitleNepali3?: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  panNo: string;
  defaultVatRate: string;
  activeFiscalYear: string;
  enableEnglishDate: string;
  logoUrl: string;
  vaccinationSessions?: number[]; 
  vaccinationCenters?: string[]; // Added for managing centers
}

export interface Signature {
  name: string;
  designation?: string;
  date?: string;
  purpose?: string;
}

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

export interface LeaveApplication {
  id: string;
  userId: string;
  employeeName: string;
  designation: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  appliedDate: string;
  rejectionReason?: string;
  approvedBy?: string;
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: Option[] | FiscalYear[];
  error?: string;
  icon?: React.ReactNode;
  placeholder?: string;
}
