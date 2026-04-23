import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { api } from '@/lib/api';
import { getAdminToken } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { ToothRecord } from '@/types/dental';
import { DENTAL_TEMPLATES } from '@/types/dental';

interface ToothModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  toothNumber: number;
  record?: ToothRecord;
  onSave: (payload: Partial<ToothRecord>) => Promise<void>;
  onUploadImage: (patientId: string, toothNumber: number, file: File) => Promise<void>;
}

export function ToothModal({
  isOpen,
  onClose,
  patientId,
  toothNumber,
  record,
  onSave,
  onUploadImage,
}: ToothModalProps) {
  const [templateId, setTemplateId] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<{ url: string; title: string } | null>(null);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTemplateId(record?.templateId ?? '');
    setDescription(record?.description ?? '');
    setNotes(record?.notes ?? '');
  }, [isOpen, record, toothNumber]);

  useEffect(() => {
    if (!isOpen) return;
    const filesWithData = (record?.files ?? []).filter((file) => file.data);
    if (filesWithData.length === 0) {
      setPreviewUrls({});
      return;
    }

    const token = getAdminToken();
    if (!token) return;

    let cancelled = false;
    const createdUrls: string[] = [];

    void (async () => {
      setIsLoadingFiles(true);
      try {
        const entries = await Promise.all(
          filesWithData.map(async (file) => {
            const blob = await api.getProtectedImageBlob(token, file.data);
            const url = URL.createObjectURL(blob);
            createdUrls.push(url);
            return [file.id, url] as const;
          }),
        );

        if (!cancelled) {
          setPreviewUrls(Object.fromEntries(entries));
        }
      } finally {
        if (!cancelled) setIsLoadingFiles(false);
      }
    })();

    return () => {
      cancelled = true;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
      setPreviewUrls({});
      setSelectedFile(null);
    };
  }, [isOpen, record?.files]);

  const handleTemplateChange = (value: string) => {
    if (value === '__clear__') {
      setTemplateId('');
      setDescription('');
      return;
    }

    setTemplateId(value);
    const template = DENTAL_TEMPLATES.find((item) => item.id === value);
    if (template) setDescription(template.description);
  };

  const handleSave = async () => {
    await onSave({
      toothNumber,
      templateId,
      description,
      notes,
      files: record?.files ?? [],
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  const handleUploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !patientId) return;

    setUploadError('');
    setIsUploadingImage(true);
    try {
      await onUploadImage(patientId, toothNumber, file);
      setIsUploadModalOpen(false);
      event.target.value = '';
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Не вдалося завантажити зображення');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const currentTemplate = DENTAL_TEMPLATES.find((item) => item.id === templateId);
  const xrayFiles = (record?.files ?? []).filter((file) => file.type === 'xray');
  const toothImageFiles = (record?.files ?? []).filter((file) => file.type === 'image');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {toothNumber}
            </span>
            Зуб №{toothNumber}
            {currentTemplate && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {currentTemplate.label}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Стан зуба</Label>
            <Select value={templateId} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Оберіть стан зуба" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__clear__">— Очистити —</SelectItem>
                {DENTAL_TEMPLATES.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Опис</Label>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              placeholder="Детальний опис стану зуба..."
            />
          </div>

          <div className="space-y-2">
            <Label>Додаткові примітки</Label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Примітки до лікування, рекомендації..."
            />
          </div>

          <div className="space-y-2">
            <Label>Зображення зуба</Label>
            <Button variant="outline" type="button" className="w-full" onClick={() => setIsUploadModalOpen(true)}>
              Додати зображення
            </Button>
          </div>

          {(xrayFiles.length > 0 || toothImageFiles.length > 0) && (
            <div className="space-y-2">
              <Label>Файли зуба</Label>
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="mb-2 flex flex-wrap gap-2">
                  {xrayFiles.length > 0 && <Badge variant="secondary">Знімки: {xrayFiles.length}</Badge>}
                  {toothImageFiles.length > 0 && <Badge variant="secondary">Фото: {toothImageFiles.length}</Badge>}
                </div>
                <div className="space-y-2">
                  {(record?.files ?? []).map((file) => (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() =>
                        previewUrls[file.id] &&
                        setSelectedFile({
                          url: previewUrls[file.id],
                          title:
                            file.type === 'xray' ? `Рентген-знімок зуба ${toothNumber}` : `Фото зуба ${toothNumber}`,
                        })
                      }
                      className="flex w-full items-center gap-3 rounded-md border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40"
                    >
                      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md bg-muted">
                        {previewUrls[file.id] ? (
                          <img src={previewUrls[file.id]} alt={file.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[11px] text-muted-foreground">{isLoadingFiles ? '...' : 'N/A'}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(file.uploadedAt).toLocaleString('uk-UA')}
                        </p>
                      </div>
                      <Badge variant="outline">{file.type === 'xray' ? 'Знімок' : 'Фото'}</Badge>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              setTemplateId('');
              setDescription('');
              setNotes('');
            }}
          >
            Очистити
          </Button>
          <Button variant="outline" type="button" onClick={onClose}>
            Скасувати
          </Button>
          <Button type="button" onClick={handleSave}>
            Зберегти
          </Button>
        </DialogFooter>
      </DialogContent>

      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Додати зображення до зуба {toothNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadImage}
              className="block w-full text-sm"
            />
            {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" type="button" onClick={() => setIsUploadModalOpen(false)}>
              Скасувати
            </Button>
            <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploadingImage}>
              {isUploadingImage ? 'Завантаження...' : 'Обрати файл'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedFile)} onOpenChange={(open) => !open && setSelectedFile(null)}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>{selectedFile?.title}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto rounded-2xl border border-border/70 bg-muted/20 p-4">
            {selectedFile?.url && (
              <img src={selectedFile.url} alt={`Tooth ${toothNumber}`} className="mx-auto rounded-xl" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
