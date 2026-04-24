import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WheelDateTimeField } from '@/components/ui/wheel-date-time-field';
import { formatPhoneForSave } from '@/lib/dental-charts-utils';
import type { Doctor, Patient } from '@/types/dental';

export interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctors: Doctor[];
  selectedDoctorId: string;
  patient?: Patient | null;
  onSubmit: (payload: {
    firstName: string;
    lastName: string;
    middleName?: string;
    gender?: 'male' | 'female';
    phone: string;
    dateOfBirth: string;
    doctorId: string;
    historyDetails?: string;
  }) => Promise<void>;
}

export function PatientModal({ isOpen, onClose, doctors, selectedDoctorId, patient, onSubmit }: PatientModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const isEditing = Boolean(patient);

  useEffect(() => {
    if (!isOpen) return;
    if (patient) {
      setFirstName(patient.firstName);
      setLastName(patient.lastName);
      setMiddleName(patient.middleName ?? '');
      setGender(patient.gender ?? '');
      setPhone(patient.phone);
      setDateOfBirth(patient.dateOfBirth);
      setDoctorId(patient.doctorId);
      return;
    }

    setFirstName('');
    setLastName('');
    setMiddleName('');
    setGender('');
    setPhone('');
    setDateOfBirth('');
    setDoctorId(selectedDoctorId === 'all' ? '' : selectedDoctorId);
  }, [isOpen, patient, selectedDoctorId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!doctorId) return;

    const formattedPhone = formatPhoneForSave(phone);
    let historyDetails: string | undefined;

    if (patient) {
      const changes: string[] = [];
      if (patient.firstName !== firstName) changes.push(`Ім'я: ${patient.firstName} → ${firstName}`);
      if (patient.lastName !== lastName) changes.push(`Прізвище: ${patient.lastName} → ${lastName}`);
      if ((patient.middleName ?? '') !== middleName)
        changes.push(`По-батькові: ${patient.middleName ?? '—'} → ${middleName || '—'}`);
      if (patient.phone !== formattedPhone) changes.push(`Телефон: ${patient.phone} → ${formattedPhone}`);
      if (patient.dateOfBirth !== dateOfBirth) changes.push('Дата народження змінена');
      if (patient.doctorId !== doctorId) changes.push('Лікар змінений');
      if ((patient.gender ?? '') !== gender) changes.push(`Стать: ${patient.gender ?? '—'} → ${gender || '—'}`);
      historyDetails = changes.length > 0 ? changes.join('; ') : undefined;
    }

    await onSubmit({
      firstName,
      lastName,
      middleName: middleName || undefined,
      gender: (gender || undefined) as 'male' | 'female' | undefined,
      phone: formattedPhone,
      dateOfBirth,
      doctorId,
      historyDetails,
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {isEditing ? 'Редагувати пацієнта' : 'Додати нового пацієнта'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patient-last-name">Прізвище</Label>
              <Input
                id="patient-last-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patient-first-name">Ім'я</Label>
              <Input
                id="patient-first-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-4">
            <div className="space-y-2">
              <Label htmlFor="patient-middle-name">По-батькові</Label>
              <Input
                id="patient-middle-name"
                value={middleName}
                onChange={(event) => setMiddleName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Стать</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="w-[80px]">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Ч</SelectItem>
                  <SelectItem value="female">Ж</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="patient-phone">Номер телефону</Label>
            <Input
              id="patient-phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+380 або 0XX..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="patient-dob">Дата народження</Label>
            <WheelDateTimeField
              mode="date"
              value={dateOfBirth}
              onChange={setDateOfBirth}
              placeholder="Дата народження"
            />
          </div>

          <div className="space-y-2">
            <Label>Лікар</Label>
            <Select value={doctorId} onValueChange={setDoctorId}>
              <SelectTrigger>
                <SelectValue placeholder="Оберіть лікаря" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={onClose} className="order-2 w-full sm:order-1 sm:w-auto">
              Скасувати
            </Button>
            <Button type="submit" className="order-1 w-full sm:order-2 sm:w-auto" disabled={!doctorId}>
              {isEditing ? 'Зберегти зміни' : 'Додати пацієнта'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
