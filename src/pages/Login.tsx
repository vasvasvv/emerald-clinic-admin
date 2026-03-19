import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

export default function Login() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === 'admin@dental.com' && password === 'admin') {
      localStorage.setItem('dental_admin_auth', 'true');
      navigate('/');
    } else {
      setError('Invalid credentials. Use admin@dental.com / admin');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel w-full max-w-sm p-8 space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-heading font-bold">{t('welcomeBack')}</h1>
          <p className="text-sm text-muted-foreground">{t('loginSubtitle')}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">{t('email')}</label>
            <input
              type="email"
              className="input-glass w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@dental.com"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">{t('password')}</label>
            <input
              type="password"
              className="input-glass w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <button type="submit" className="btn-accent w-full">
            {t('login')}
          </button>
        </form>

        <p className="text-xs text-muted-foreground text-center">
          Demo: admin@dental.com / admin
        </p>
      </motion.div>
    </div>
  );
}
