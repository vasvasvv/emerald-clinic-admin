import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatPatientName } from '@/lib/dental-charts-utils';
import type { Patient } from '@/types/dental';
import { Edit2, Plus, Trash2 } from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
}

export function HistoryModal({ isOpen, onClose, patient }: HistoryModalProps) {
  const history = [...(patient?.changeHistory ?? [])].sort(
    (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
  );
  const actionIcons = {
    create: <Plus className="h-4 w-4" />,
    edit: <Edit2 className="h-4 w-4" />,
    delete: <Trash2 className="h-4 w-4" />,
  };
  const actionLabels = {
    create: 'Створення',
    edit: 'Редагування',
    delete: 'Видалення',
  };
  const targetLabels = {
    patient: 'Пацієнт',
    tooth: 'Зубна карта',
    visit: 'Візит',
  };
  const actionColors: Record<string, string> = {
    create: 'bg-green-100 text-green-800',
    edit: 'bg-blue-100 text-blue-800',
    delete: 'bg-red-100 text-red-800',
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Історія змін — {patient ? formatPatientName(patient) : ''}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          {history.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Історія змін порожня</div>
          ) : (
            <div className="space-y-3 pr-2">
              {history.map((entry) => (
                <div key={entry.id} className="flex gap-3 rounded-lg border bg-card p-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${actionColors[entry.action]}`}
                  >
                    {actionIcons[entry.action]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {actionLabels[entry.action]}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {targetLabels[entry.target]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-foreground">{entry.details}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{entry.userName}</span>
                      <span>{new Date(entry.timestamp).toLocaleString('uk-UA')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
