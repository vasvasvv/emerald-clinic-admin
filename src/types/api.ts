export interface ApiLoginResponse {
  token: string;
  user: { id: number; email: string; fullName: string; role: string };
}

export type ApiAppointmentStatus = 'scheduled' | 'completed' | 'cancelled';

export interface ApiAppointment {
  id: number;
  patient_name: string;
  phone: string;
  appointment_at: string;
  doctor_name: string | null;
  doctor_user_id: number | null;
  notes: string | null;
  status: ApiAppointmentStatus;
}

export interface ApiAppointmentPayload {
  patient_name: string;
  phone: string;
  appointment_at: string;
  doctor_user_id: number | null;
  notes: string;
  status: ApiAppointmentStatus;
}

export interface ApiDoctor {
  id: number;
  name: string;
  fullName?: string;
  specialty?: string;
}

export interface ApiUser {
  id: number;
  email: string;
  fullName: string;
  role: string;
}

export interface ApiSiteDoctor {
  id: number;
  name: string;
  position: string;
  specialization: string;
  experience: number;
  description: string;
  photo_url: string | null;
}

export interface ApiNewsItem {
  is_hot: boolean;
  expires_on: string | null;
  kind: string;
  id: number;
  title: string;
  description: string;
  type: 'news' | 'promo';
  label: string;
  expiry_date: string | null;
  hot: boolean;
  created_at: string;
}

export interface ApiNotificationLog {
  id: number;
  channel: 'push' | 'telegram';
  body: string;
  target_type: 'all' | 'phone' | 'chat';
  target_value: string | null;
  created_at: string;
  sent_count: number;
  failed_count: number;
}

export interface ApiPushCounts {
  pushSubscriptions: number;
  telegramContacts: number;
}

export interface ApiPatient {
  id: number;
  first_name: string;
  last_name: string;
  middle_name?: string;
  phone: string;
  date_of_birth?: string;
  primary_doctor_user_id?: number;
  primary_doctor_name?: string;
}

export interface ApiPatientPayload {
  firstName: string;
  lastName: string;
  middleName?: string | null;
  phone: string;
  dateOfBirth: string;
  doctorId: string;
  gender?: 'male' | 'female' | null;
}

export interface ApiTelegramAppointment {
  id: number;
  patient_name: string;
  phone: string;
  appointment_at: string;
  doctor_name: string | null;
  status: ApiAppointmentStatus;
  telegram_chat_id: string | null;
}

export interface ApiTelegramPending {
  id: number;
  chat_id: string;
  first_name: string | null;
  created_at: string;
}

export interface ApiTelegramDebugAppointment {
  id: number;
  patient_name: string;
  appointment_at: string;
}

export interface ApiTelegramDebugResult {
  log: string[];
  offsetHours: number;
  windows: { from24: string; to24: string; from1: string; to1: string };
  remind24: number;
  remind1: number;
  appointments24: ApiTelegramDebugAppointment[];
  appointments1: ApiTelegramDebugAppointment[];
  dryRun: boolean;
}

export interface ApiXrayAsset {
  id: number;
  previewUrl: string;
  originalUrl: string;
  previewContentType: string;
  originalContentType: string;
}

export interface ApiXraySession {
  id: number;
  patientId: number;
  patientName: string;
  toothId: number;
  captureType: 'twin' | 'scanner';
  status: 'waiting' | 'completed';
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  xray: ApiXrayAsset | null;
}

export interface DoctorOption {
  id: number;
  name: string;
}
