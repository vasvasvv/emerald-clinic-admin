import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Doctor } from '@/types/dental';

export interface VisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctors: Doctor[];
  selectedDoctorId: string;
  onSubmit: (payload: { date: string; type: 'past' | 'future'; notes: string; doctorId: string }) => Promise<void>;
}

export function VisitModal({ isOpen, onClose, doctors, selectedDoctorId, onSubmit }: VisitModalProps) {
  const [date, setDate] = useState('');
  const [type, setType] = useState<'past' | 'future'>('future');
  const [notes, setNotes] = useState('');
  const [doctorId, setDoctorId] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setDate('');
    setType('future');
    setNotes('');
    setDoctorId(selectedDoctorId === 'all' ? (doctors[0]?.id ?? '') : selectedDoctorId || doctors[0]?.id || '');
  }, [isOpen, doctors, selectedDoctorId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!doctorId || !date) return;
    await onSubmit({ date, type, notes, doctorId });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Додати візит</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="visit-date">Дата</Label>
            <Input
              id="visit-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Тип візиту</Label>
            <RadioGroup value={type} onValueChange={(value) => setType(value as 'past' | 'future')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="future" id="future-visit" />
                <Label htmlFor="future-visit" className="cursor-pointer font-normal">
                  Запланований
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="past" id="past-visit" />
                <Label htmlFor="past-visit" className="cursor-pointer font-normal">
                  Завершений
                </Label>
              </div>
            </RadioGroup>
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

          <div className="space-y-2">
            <Label htmlFor="visit-notes">Примітки</Label>
            <Textarea
              id="visit-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Додайте примітки до візиту..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Скасувати
            </Button>
            <Button type="submit" disabled={!doctorId || !date}>
              Додати візит
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
