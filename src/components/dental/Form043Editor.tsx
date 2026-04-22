import { useCallback, useEffect, useRef, useState } from 'react';
import htmlTemplate from '@/assets/f043.html?raw';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useBase64Images } from '@/hooks/useBase64Images';
import { useIsMobile } from '@/hooks/use-mobile';
import { useI18n } from '@/lib/i18n';
import type { Doctor, Patient } from '@/types/dental';
import { ChevronLeft, ChevronRight, Eye, Printer, X } from 'lucide-react';

interface ToothEntry {
  numerator: string;
  denominator: string;
}

interface FormData {
  cardNumber: string;
  year: string;
  fullName: string;
  gender: string;
  dobD1: string;
  dobD2: string;
  dobM1: string;
  dobM2: string;
  dobY1: string;
  dobY2: string;
  phone: string;
  diagnoz: string;
  skargy: string;
  pereneseni: string;
  rozvytok: string;
  daniOglyadu: string;
  teeth: Record<number, ToothEntry>;
  toothNotes: string;
  prykus: string;
  stanGigieny: string;
  daniRentgen: string;
  kolirvita: string;
  navchannya: string;
  kontrolGigieny: string;
  journal: Array<{ date: string; note: string }>;
  planObstezhenny: string[];
  planLikuvannya: string[];
  likar: string;
  zavViddil: string;
}

const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const TOOTH_LEFTS_UPPER = [128, 274, 331, 388, 445, 503, 560, 617, 674, 731, 789, 846, 903, 960, 1018, 1075];
const TOOTH_LEFTS_LOWER = [128, 293, 351, 408, 465, 523, 580, 637, 694, 751, 808, 866, 923, 980, 1037, 1095];

function formatPhoneForDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('380')) {
    return `+38 (0${digits.slice(3, 5)})-${digits.slice(5, 8)}-${digits.slice(8, 10)}-${digits.slice(10, 12)}`;
  }
  return phone;
}

function statusToCode(value: string): string {
  if (!value) return '';
  const status = value.toLowerCase().trim();
  if (status.includes('карієс') || status === 'c') return 'C';
  if (status.includes('пульпіт') || status === 'p') return 'P';
  if (status.includes('періодонтит') || status === 'pt') return 'Pt';
  if (status.includes('відсутн') || status === 'a') return 'A';
  if (status.includes('корінь') || status === 'r') return 'R';
  if (status.includes('коронка') || status === 'cd') return 'Cd';
  if (status.includes('пломба') || status === 'pl') return 'Pl';
  if (status.includes('фасетка') || status === 'f') return 'F';
  if (status.includes('штучний') || status === 'ar') return 'ar';
  if (status.includes('реставрація')) return 'r';
  if (status.includes('штифт') || status === 'pin') return 'pin';
  if (status.includes('імплант') || status === 'i') return 'I';
  if (status.includes('камінь') || status === 'dc') return 'Dc';
  return value;
}

function buildHTML(form: FormData, images: string[]) {
  let html = htmlTemplate;

  images.forEach((base64, index) => {
    html = html.replace(new RegExp(`src="target00${index + 1}\\.png"`, 'g'), `src="${base64}"`);
  });

  const fillCell = (top: number, left: number, value: string) => {
    if (!value) return;
    html = html.replace(
      new RegExp(`(<p style="position:absolute;top:${top}px;left:${left}px[^>]*>)\\s*&#160;\\s*(<\\/p>)`),
      `$1${value}$2`,
    );
  };

  html = html.replace(/№_____/, `№${form.cardNumber}`);
  html = html.replace(/_{4}р\./, `${form.year}р.`);
  fillCell(311, 772, form.fullName);
  fillCell(372, 378, form.gender);

  const dobLefts = [732, 771, 810, 849, 888, 927];
  const dobValues = [form.dobD1, `${form.dobD2}.`, form.dobM1, `${form.dobM2}.`, form.dobY1, `${form.dobY2}.`];
  dobLefts.forEach((left, index) => fillCell(372, left, dobValues[index]));

  if (form.phone) {
    html = html.replace(
      '<p style="position:absolute;top:416px;left:138px;white-space:nowrap"',
      `<p style="position:absolute;top:422px;left:380px;white-space:nowrap" class="ft17">${form.phone}</p>\n<p style="position:absolute;top:416px;left:138px;white-space:nowrap"`,
    );
  }

  fillCell(485, 129, form.diagnoz);
  fillCell(546, 129, form.skargy);
  fillCell(607, 424, form.pereneseni);
  fillCell(710, 434, form.rozvytok);
  fillCell(140, 128, form.daniOglyadu);

  UPPER_TEETH.forEach((number, index) => {
    const tooth = form.teeth[number];
    if (tooth?.numerator) fillCell(268, TOOTH_LEFTS_UPPER[index], tooth.numerator);
    if (tooth?.denominator) fillCell(307, TOOTH_LEFTS_UPPER[index], tooth.denominator);
  });

  LOWER_TEETH.forEach((number, index) => {
    const tooth = form.teeth[number];
    if (tooth?.numerator) fillCell(577, TOOTH_LEFTS_LOWER[index], tooth.numerator);
    if (tooth?.denominator) fillCell(617, TOOTH_LEFTS_LOWER[index], tooth.denominator);
  });

  fillCell(382, 128, form.toothNotes);
  fillCell(153, 129, form.prykus);
  fillCell(214, 129, form.stanGigieny);
  fillCell(515, 129, form.daniRentgen);
  fillCell(607, 286, form.kolirvita);
  fillCell(649, 520, form.navchannya);
  fillCell(706, 809, form.kontrolGigieny);

  const tops4 = [209, 240, 270, 301, 331, 362, 392, 422, 453, 484, 514, 544, 575, 605, 636, 666, 697];
  const tops5 = [188, 219, 249, 279, 310, 340, 371, 401, 432, 462, 493, 523, 553, 584, 614, 645, 675, 706];

  form.journal.slice(0, tops4.length).forEach((item, index) => {
    fillCell(tops4[index], 128, item.date);
    fillCell(tops4[index], 306, item.note);
  });

  form.journal.slice(tops4.length, tops4.length + tops5.length).forEach((item, index) => {
    fillCell(tops5[index], 128, item.date);
    fillCell(tops5[index], 306, item.note);
  });

  html = html.replace(/Лікар&#160;_{10,}/g, `Лікар&#160;${form.likar}`);

  const planTops = [
    141, 171, 201, 230, 260, 289, 319, 348, 378, 408, 437, 467, 496, 526, 556, 585, 615, 644, 674, 704, 733,
  ];
  form.planObstezhenny.slice(0, planTops.length).forEach((value, index) => fillCell(planTops[index], 129, value));
  form.planLikuvannya.slice(0, planTops.length).forEach((value, index) => fillCell(planTops[index], 662, value));

  return html;
}

function initFromPatient(patient: Patient, doctors: Doctor[]): FormData {
  const doctor = doctors.find((item) => item.id === patient.doctorId);
  const rawPhone = formatPhoneForDisplay(patient.phone ?? '');
  const phone = rawPhone.startsWith('+38') ? rawPhone : rawPhone ? `+38${rawPhone.replace(/^\+?38/, '')}` : '';

  let dobD1 = '';
  let dobD2 = '';
  let dobM1 = '';
  let dobM2 = '';
  let dobY1 = '';
  let dobY2 = '';

  if (patient.dateOfBirth) {
    const dateOfBirth = new Date(patient.dateOfBirth);
    const day = String(dateOfBirth.getDate()).padStart(2, '0');
    const month = String(dateOfBirth.getMonth() + 1).padStart(2, '0');
    const year = String(dateOfBirth.getFullYear()).slice(-2);
    [dobD1, dobD2, dobM1, dobM2, dobY1, dobY2] = [day[0], day[1], month[0], month[1], year[0], year[1]];
  }

  const teeth: Record<number, ToothEntry> = {};
  patient.dentalChart.forEach((item) => {
    if (item.toothNumber) {
      teeth[item.toothNumber] = {
        numerator: statusToCode(item.description),
        denominator: '',
      };
    }
  });

  return {
    cardNumber: String(Math.floor(Math.random() * (8790 - 4560 + 1)) + 4560),
    year: String(new Date().getFullYear()),
    fullName: `${patient.lastName} ${patient.firstName} ${patient.middleName ?? ''}`.trim(),
    gender: patient.gender === 'male' ? '1' : patient.gender === 'female' ? '2' : '',
    dobD1,
    dobD2,
    dobM1,
    dobM2,
    dobY1,
    dobY2,
    phone,
    diagnoz: '',
    skargy: '',
    pereneseni: '',
    rozvytok: '',
    daniOglyadu: '',
    teeth,
    toothNotes: '',
    prykus: '',
    stanGigieny: '',
    daniRentgen: '',
    kolirvita: '',
    navchannya: '',
    kontrolGigieny: '',
    journal: Array(35)
      .fill(null)
      .map(() => ({ date: '', note: '' })),
    planObstezhenny: Array(21).fill(''),
    planLikuvannya: Array(21).fill(''),
    likar: doctor?.name ?? '',
    zavViddil: '',
  };
}

interface Form043EditorProps {
  patient: Patient;
  doctors: Doctor[];
  onClose: () => void;
}

export function Form043Editor({ patient, doctors, onClose }: Form043EditorProps) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [formData, setFormData] = useState<FormData>(() => initFromPatient(patient, doctors));
  const [previewPage, setPreviewPage] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const images = useBase64Images();

  const iframeCallbackRef = useCallback(
    (node: HTMLIFrameElement | null) => {
      iframeRef.current = node;
      if (node && blobUrlRef.current) {
        node.src = `${blobUrlRef.current}#page${previewPage}-div`;
      }
    },
    [previewPage],
  );

  useEffect(() => {
    const body = document.body;
    body.style.overflow = 'hidden';

    return () => {
      body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setShowPreview(false);
    }
  }, [isMobile]);

  const updatePreview = useCallback(() => {
    if (!images) return;
    const html = buildHTML(formData, images);
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    const blob = new Blob([html], { type: 'text/html' });
    blobUrlRef.current = URL.createObjectURL(blob);
    if (iframeRef.current) {
      iframeRef.current.src = `${blobUrlRef.current}#page${previewPage}-div`;
    }
  }, [formData, images, previewPage]);

  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  useEffect(
    () => () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    },
    [],
  );

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setFormData((current) => ({ ...current, [key]: value }));

  const setTooth = (number: number, field: 'numerator' | 'denominator', value: string) =>
    setFormData((current) => ({
      ...current,
      teeth: {
        ...current.teeth,
        [number]: { ...current.teeth[number], [field]: value },
      },
    }));

  const setJournal = (index: number, field: 'date' | 'note', value: string) =>
    setFormData((current) => {
      const journal = [...current.journal];
      journal[index] = { ...journal[index], [field]: value };
      return { ...current, journal };
    });

  const setPlan = (field: 'planObstezhenny' | 'planLikuvannya', index: number, value: string) =>
    setFormData((current) => {
      const values = [...current[field]];
      values[index] = value;
      return { ...current, [field]: values };
    });

  const handlePrint = () => {
    if (!images) {
      window.alert(t('form043ImagesLoading'));
      return;
    }

    const html = buildHTML(formData, images);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.alert(t('allowPopups'));
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      setTimeout(() => printWindow.print(), 300);
    };
  };

  const inputClass = 'h-8 text-sm border-slate-200 focus-visible:ring-1 focus-visible:ring-teal-500 rounded-md';
  const labelClass = 'mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500';
  const textAreaClass = 'min-h-[56px] text-sm border-slate-200 focus-visible:ring-1 focus-visible:ring-teal-500';
  const tabContentClass = 'mt-0 min-h-0 flex-1 overflow-y-auto p-4';
  const scale = 0.62;
  const iframeWidth = 1262;
  const iframeHeight = 892;

  const PreviewPanel = () => (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-slate-200">
      <div className="flex shrink-0 items-center justify-between gap-2 bg-slate-800 px-3 py-2 text-white">
        <span className="whitespace-nowrap text-xs font-medium">
          {t('formPage')} {previewPage}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setPreviewPage((current) => Math.max(1, current - 1))}
            disabled={previewPage === 1}
            className="rounded p-1 transition-colors hover:bg-slate-700 disabled:opacity-30"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          {[1, 2, 3, 4, 5, 6].map((page) => (
            <button
              key={page}
              onClick={() => setPreviewPage(page)}
              className={`h-6 w-6 rounded text-[11px] font-semibold transition-colors ${
                previewPage === page ? 'bg-teal-500 text-white' : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => setPreviewPage((current) => Math.min(6, current + 1))}
            disabled={previewPage === 6}
            className="rounded p-1 transition-colors hover:bg-slate-700 disabled:opacity-30"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <button
          onClick={() => setShowPreview(false)}
          className="ml-1 rounded p-1 transition-colors hover:bg-slate-700 md:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-1 items-start justify-start overflow-auto p-3">
        <div
          style={{
            width: Math.round(iframeWidth * scale),
            height: Math.round(iframeHeight * scale),
            position: 'relative',
            flexShrink: 0,
          }}
        >
          <iframe
            ref={iframeCallbackRef}
            title={t('form043Title')}
            style={{
              width: iframeWidth,
              height: iframeHeight,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              border: 'none',
              borderRadius: 2,
              boxShadow: '0 4px 32px rgba(0,0,0,0.25)',
            }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex bg-slate-900/80 backdrop-blur-sm">
      <div
        className={`flex min-h-0 h-full w-full shrink-0 flex-col overflow-hidden border-r border-slate-100 bg-white shadow-2xl md:w-[440px] ${
          showPreview ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="flex shrink-0 items-center justify-between bg-teal-600 px-4 py-3 text-white">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{t('form043Title')}</p>
            <p className="mt-0.5 max-w-[200px] truncate text-[11px] text-teal-200 sm:max-w-[270px]">
              {formData.fullName || t('patientFallback')}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              size="sm"
              onClick={handlePrint}
              className="h-7 gap-1 bg-white px-2 text-xs text-teal-700 hover:bg-teal-50"
            >
              <Printer className="h-3 w-3" />
              <span className="hidden xs:inline">{t('print')}</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setShowPreview(true)}
              className="h-7 gap-1 bg-white px-2 text-xs text-teal-700 hover:bg-teal-50 md:hidden"
            >
              <Eye className="h-3 w-3" />
            </Button>
            <button onClick={onClose} className="ml-1 rounded-lg p-2 transition-colors hover:bg-teal-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <Tabs defaultValue="p1" className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 overflow-x-auto border-b border-slate-100 bg-slate-50">
            <TabsList className="h-9 min-w-full w-max justify-start gap-0.5 rounded-none bg-transparent px-2">
              {[
                ['p1', t('formTabPage1')],
                ['p2', t('formTabTeeth')],
                ['p3', t('formTabExam')],
                ['p4', t('formTabJournal')],
                ['p6', t('formTabPlan')],
              ].map(([value, label]) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="h-7 whitespace-nowrap rounded px-2.5 text-[11px] data-[state=active]:bg-white data-[state=active]:text-teal-700 data-[state=active]:shadow-sm"
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="p1" className={`${tabContentClass} space-y-3`}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className={labelClass}>{t('formCardNumber')}</Label>
                <Input
                  className={inputClass}
                  value={formData.cardNumber}
                  onChange={(event) => set('cardNumber', event.target.value)}
                />
              </div>
              <div>
                <Label className={labelClass}>{t('formYear')}</Label>
                <Input
                  className={inputClass}
                  value={formData.year}
                  onChange={(event) => set('year', event.target.value)}
                />
              </div>
            </div>
            <div>
              <Label className={labelClass}>{t('formPatientFullName')}</Label>
              <Input
                className={inputClass}
                value={formData.fullName}
                onChange={(event) => set('fullName', event.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className={labelClass}>{t('gender')}</Label>
                <Select value={formData.gender} onValueChange={(value) => set('gender', value)}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 — {t('male')}</SelectItem>
                    <SelectItem value="2">2 — {t('female')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className={labelClass}>{t('phone')}</Label>
              <Input
                className={inputClass}
                value={formData.phone}
                onChange={(event) => set('phone', event.target.value)}
                placeholder="+380..."
                inputMode="tel"
              />
            </div>
            <div>
              <Label className={labelClass}>{t('dateOfBirth')}</Label>
              <div className="flex flex-wrap items-center gap-1">
                {(['dobD1', 'dobD2', 'dobM1', 'dobM2', 'dobY1', 'dobY2'] as const).map((key, index) => (
                  <div key={key} className="contents">
                    <Input
                      className="h-8 w-9 border-slate-200 p-0 text-center text-sm"
                      maxLength={1}
                      value={formData[key]}
                      onChange={(event) => set(key, event.target.value)}
                      inputMode="numeric"
                    />
                    {(index === 1 || index === 3) && <span className="font-bold text-slate-400">.</span>}
                  </div>
                ))}
                <span className="text-[10px] text-slate-400">{t('formDateShort')}</span>
              </div>
            </div>
            <div>
              <Label className={labelClass}>{t('diagnosis')}</Label>
              <Textarea
                className={textAreaClass}
                value={formData.diagnoz}
                onChange={(event) => set('diagnoz', event.target.value)}
              />
            </div>
            <div>
              <Label className={labelClass}>{t('complaints')}</Label>
              <Textarea
                className={textAreaClass}
                value={formData.skargy}
                onChange={(event) => set('skargy', event.target.value)}
              />
            </div>
            <div>
              <Label className={labelClass}>{t('concomitantDiseases')}</Label>
              <Textarea
                className={textAreaClass}
                value={formData.pereneseni}
                onChange={(event) => set('pereneseni', event.target.value)}
              />
            </div>
            <div>
              <Label className={labelClass}>{t('currentDiseaseDevelopment')}</Label>
              <Textarea
                className={textAreaClass}
                value={formData.rozvytok}
                onChange={(event) => set('rozvytok', event.target.value)}
              />
            </div>
          </TabsContent>

          <TabsContent value="p2" className={`${tabContentClass} space-y-3`}>
            <div>
              <Label className={labelClass}>{t('objectiveExamData')}</Label>
              <Textarea
                className={textAreaClass}
                value={formData.daniOglyadu}
                onChange={(event) => set('daniOglyadu', event.target.value)}
              />
            </div>
            <div className="rounded-lg border border-teal-100 bg-teal-50 p-2 text-[10px] leading-relaxed text-teal-800">
              <b>{t('toothCodes')}:</b> C-карієс · P-пульпіт · Pt-періодонтит · A-відсутній · R-корінь · Cd-коронка ·
              Pl-пломба · F-фасетка · ar-штучний · r-реставрація · pin-штифт · I-імплантат · Dc-камінь
            </div>
            {[
              { label: t('upperJaw'), list: UPPER_TEETH },
              { label: t('lowerJaw'), list: LOWER_TEETH },
            ].map(({ label, list }) => (
              <div key={label}>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">{label}</div>
                <div className="-mx-4 overflow-x-auto px-4">
                  <table className="border-collapse text-[10px]" style={{ minWidth: 'max-content' }}>
                    <thead>
                      <tr className="bg-slate-50">
                        <td className="sticky left-0 z-10 w-12 border border-slate-200 bg-slate-50 px-1 py-0.5 text-center text-slate-400">
                          {t('tooth')}
                        </td>
                        {list.map((number) => (
                          <td
                            key={number}
                            className="w-8 border border-slate-200 py-0.5 text-center font-mono font-bold text-slate-700"
                          >
                            {number}
                          </td>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(['numerator', 'denominator'] as const).map((field, rowIndex) => (
                        <tr key={field}>
                          <td className="sticky left-0 z-10 whitespace-nowrap border border-slate-200 bg-white px-1 py-0.5 text-center text-[9px] text-slate-400">
                            {rowIndex === 0 ? t('examination') : t('treatment')}
                          </td>
                          {list.map((number) => (
                            <td key={number} className="border border-slate-200 p-0">
                              <input
                                className={`h-7 w-8 border-0 p-0.5 text-center text-[11px] outline-none focus:bg-teal-50 ${rowIndex === 0 ? 'bg-white' : 'bg-slate-50'}`}
                                maxLength={4}
                                value={formData.teeth[number]?.[field] ?? ''}
                                onChange={(event) => setTooth(number, field, event.target.value)}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            <div>
              <Label className={labelClass}>{t('additionalToothData')}</Label>
              <Textarea
                className={textAreaClass}
                value={formData.toothNotes}
                onChange={(event) => set('toothNotes', event.target.value)}
              />
            </div>
          </TabsContent>

          <TabsContent value="p3" className={`${tabContentClass} space-y-3`}>
            <div>
              <Label className={labelClass}>{t('bite')}</Label>
              <Input
                className={inputClass}
                value={formData.prykus}
                onChange={(event) => set('prykus', event.target.value)}
              />
            </div>
            <div>
              <Label className={labelClass}>{t('hygieneState')}</Label>
              <Textarea
                className={`${textAreaClass} min-h-[80px]`}
                value={formData.stanGigieny}
                onChange={(event) => set('stanGigieny', event.target.value)}
              />
            </div>
            <div>
              <Label className={labelClass}>{t('xrayAndLabData')}</Label>
              <Textarea
                className={`${textAreaClass} min-h-[80px]`}
                value={formData.daniRentgen}
                onChange={(event) => set('daniRentgen', event.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
              <div>
                <Label className={labelClass}>{t('vitaColor')}</Label>
                <Input
                  className={inputClass}
                  value={formData.kolirvita}
                  onChange={(event) => set('kolirvita', event.target.value)}
                />
              </div>
              <div>
                <Label className={labelClass}>{t('hygieneTraining')}</Label>
                <Input
                  className={inputClass}
                  value={formData.navchannya}
                  onChange={(event) => set('navchannya', event.target.value)}
                />
              </div>
            </div>
            <div>
              <Label className={labelClass}>{t('hygieneControlDate')}</Label>
              <Input
                className={inputClass}
                value={formData.kontrolGigieny}
                onChange={(event) => set('kontrolGigieny', event.target.value)}
              />
            </div>
          </TabsContent>

          <TabsContent value="p4" className={tabContentClass}>
            <div className="mb-3 grid grid-cols-1 gap-3 border-b border-slate-100 pb-3 xs:grid-cols-2">
              <div>
                <Label className={labelClass}>{t('doctor')}</Label>
                <Input
                  className={inputClass}
                  value={formData.likar}
                  onChange={(event) => set('likar', event.target.value)}
                />
              </div>
              <div>
                <Label className={labelClass}>{t('headOfDepartment')}</Label>
                <Input
                  className={inputClass}
                  value={formData.zavViddil}
                  onChange={(event) => set('zavViddil', event.target.value)}
                />
              </div>
            </div>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {t('doctorJournalTitle')}
            </p>
            <div className="space-y-1.5">
              {formData.journal.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-4 shrink-0 text-right text-[10px] text-slate-300">{index + 1}</span>
                  <Input
                    className="h-7 w-24 shrink-0 border-slate-200 px-1.5 text-xs"
                    placeholder={t('formDateShort')}
                    inputMode="numeric"
                    value={item.date}
                    onChange={(event) => setJournal(index, 'date', event.target.value)}
                  />
                  <Input
                    className="h-7 min-w-0 flex-1 border-slate-200 px-1.5 text-xs"
                    placeholder={`${t('entry')} ${index + 1}`}
                    value={item.note}
                    onChange={(event) => setJournal(index, 'note', event.target.value)}
                  />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="p6" className={tabContentClass}>
            <div className="grid grid-cols-1 gap-4 xs:grid-cols-2">
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-teal-700">
                  {t('examinationPlan')}
                </p>
                <div className="space-y-1">
                  {formData.planObstezhenny.map((value, index) => (
                    <Input
                      key={index}
                      className="h-7 border-slate-200 px-2 text-xs"
                      value={value}
                      onChange={(event) => setPlan('planObstezhenny', index, event.target.value)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-teal-700">
                  {t('treatmentPlan')}
                </p>
                <div className="space-y-1">
                  {formData.planLikuvannya.map((value, index) => (
                    <Input
                      key={index}
                      className="h-7 border-slate-200 px-2 text-xs"
                      value={value}
                      onChange={(event) => setPlan('planLikuvannya', index, event.target.value)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div
        className={`min-w-0 flex-1 md:flex ${showPreview ? 'fixed inset-0 z-[60] flex bg-slate-900/80 md:static md:bg-transparent' : 'hidden'}`}
      >
        <PreviewPanel />
      </div>
    </div>
  );
}
