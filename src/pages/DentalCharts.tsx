import { ExternalLink, Stethoscope } from 'lucide-react';
import { motion } from 'framer-motion';
import { AdminLayout } from '@/components/AdminLayout';
import { useI18n } from '@/lib/i18n';

export default function DentalCharts() {
  const { t } = useI18n();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">{t('dentalCharts')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Перехід до робочого застосунку із зубними картами пацієнтів.</p>
        </div>

        <motion.a
          href="https://dentis-clinic.pp.ua/"
          target="_blank"
          rel="noreferrer"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel flex min-h-[220px] w-full items-center justify-center gap-4 rounded-[2rem] px-8 py-12 text-center transition-all duration-300 hover:border-primary/35 hover:bg-card/75 hover:shadow-[0_18px_44px_rgba(0,0,0,0.28)]"
        >
          <div className="flex flex-col items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-primary/15 text-primary">
              <Stethoscope className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <p className="font-heading text-2xl font-bold text-foreground">{t('dentalChartsPatients')}</p>
              <p className="text-sm text-muted-foreground">Відкрити окремий застосунок dentis_charts у новій вкладці.</p>
            </div>
            <span className="btn-accent inline-flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              {t('openDentalChart')}
            </span>
          </div>
        </motion.a>
      </div>
    </AdminLayout>
  );
}
