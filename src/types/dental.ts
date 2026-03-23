export type UserRole = 'super-admin' | 'doctor' | 'admin';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  data: string;
  uploadedAt: string;
}

export interface ToothRecord {
  toothNumber: number;
  description: string;
  templateId: string;
  files: FileAttachment[];
  notes: string;
  updatedAt: string;
}

export interface Visit {
  id: string;
  date: string;
  type: 'past' | 'future';
  notes: string;
  doctorId: string;
  doctorName?: string;
}

export interface ChangeHistoryEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: 'create' | 'edit' | 'delete';
  target: 'patient' | 'tooth' | 'visit';
  details: string;
}

export type Gender = 'male' | 'female';

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  gender?: Gender;
  phone: string;
  dateOfBirth: string;
  doctorId: string;
  doctorName?: string;
  dentalChart: ToothRecord[];
  visits: Visit[];
  changeHistory: ChangeHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
}

export const DENTAL_TEMPLATES = [
  { id: 'cavity', label: 'Карієс', description: 'Карієс, що потребує лікування' },
  { id: 'filling', label: 'Пломба', description: 'Наявна або необхідна пломба' },
  { id: 'crown', label: 'Коронка', description: 'Встановлена або необхідна коронка' },
  { id: 'root-canal', label: 'Ендодонтія', description: 'Ендодонтичне лікування' },
  { id: 'extraction', label: 'Видалення', description: 'Видалення зуба виконано або заплановано' },
  { id: 'implant', label: 'Імплант', description: 'Дентальний імплант' },
  { id: 'bridge', label: 'Міст', description: 'Зубний міст' },
  { id: 'periodontal', label: 'Пародонт', description: 'Захворювання ясен або лікування' },
  { id: 'sensitivity', label: 'Чутливість', description: 'Підвищена чутливість зуба' },
  { id: 'fracture', label: 'Тріщина', description: 'Тріщина або скол зуба' },
  { id: 'missing', label: 'Відсутній', description: 'Відсутній зуб' },
  { id: 'healthy', label: 'Здоровий', description: 'Проблем не виявлено' },
];

export const UPPER_TEETH = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
export const LOWER_TEETH = [32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17];
