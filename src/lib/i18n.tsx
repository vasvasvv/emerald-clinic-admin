import React, { createContext, useContext, useState, useCallback } from 'react';

type Lang = 'uk' | 'en';

const translations = {
  uk: {
    // Sidebar
    dashboard: 'Панель керування',
    appointments: 'Прийоми',
    records: 'Записи',
    doctors: 'Лікарі',
    news: 'Новини',
    notifications: 'Сповіщення',
    settings: 'Налаштування',
    logout: 'Вийти',
    
    // Dashboard
    todayAppointments: 'Прийоми сьогодні',
    tomorrowAppointments: 'Прийоми на завтра',
    addRecord: 'Додати запис',
    sendNotification: 'Надіслати сповіщення',
    
    // Appointments
    newAppointment: 'Новий прийом',
    clientName: "Ім'я клієнта",
    phone: 'Телефон',
    dateTime: 'Дата і час',
    doctor: 'Лікар',
    comment: 'Коментар',
    date: 'Дата',
    time: 'Час',
    status: 'Статус',
    actions: 'Дії',
    edit: 'Редагувати',
    delete: 'Видалити',
    save: 'Зберегти',
    cancel: 'Скасувати',
    noAppointments: 'Немає прийомів на вибрану дату',
    filterByDate: 'Фільтр за датою',
    all: 'Усі',
    scheduled: 'Заплановано',
    completed: 'Завершено',
    cancelled: 'Скасовано',

    // Records
    allDoctors: 'Усі лікарі',
    week: 'Тиждень',
    month: 'Місяць',
    today: 'Сьогодні',
    noRecords: 'Немає записів',
    newRecord: 'Новий запис',
    selectTimeSlot: 'Оберіть дату та час',
    available: 'вільно',
    patientName: "Ім'я та прізвище",
    backToRecords: 'Назад до записів',
    
    // Doctors
    newDoctor: 'Новий лікар',
    fullName: 'ПІБ',
    position: 'Посада',
    specialization: 'Спеціалізація',
    experience: 'Досвід',
    description: 'Опис',
    photo: 'Фото',
    years: 'років',
    
    // News
    newArticle: 'Нова стаття',
    title: 'Заголовок',
    type: 'Тип',
    label: 'Мітка',
    expiryDate: 'Дата закінчення',
    hotOffer: 'Гаряча пропозиція',
    newsType: 'Новина',
    promoType: 'Акція',
    infoLabel: 'Інформація',
    newsLabel: 'Новини',
    updateLabel: 'Оновлення',
    
    // Notifications
    sendToAll: 'Надіслати всім',
    sendTargeted: 'Цільове сповіщення',
    notificationHistory: 'Історія сповіщень',
    message: 'Повідомлення',
    send: 'Надіслати',
    sent: 'Надіслано',
    
    // Auth
    login: 'Увійти',
    email: 'Електронна пошта',
    password: 'Пароль',
    welcomeBack: 'Ласкаво просимо',
    loginSubtitle: 'Увійдіть до панелі адміністратора',
    
    // Common
    search: 'Пошук...',
    loading: 'Завантаження...',
    confirm: 'Підтвердити',
    confirmDelete: 'Ви впевнені, що хочете видалити?',
    yes: 'Так',
    no: 'Ні',
  },
  en: {
    dashboard: 'Dashboard',
    appointments: 'Appointments',
    records: 'Records',
    doctors: 'Doctors',
    news: 'News',
    notifications: 'Notifications',
    settings: 'Settings',
    logout: 'Log out',
    
    todayAppointments: "Today's Appointments",
    tomorrowAppointments: "Tomorrow's Appointments",
    addRecord: 'Add Record',
    sendNotification: 'Send Notification',
    
    newAppointment: 'New Appointment',
    clientName: 'Client Name',
    phone: 'Phone',
    dateTime: 'Date & Time',
    doctor: 'Doctor',
    comment: 'Comment',
    date: 'Date',
    time: 'Time',
    status: 'Status',
    actions: 'Actions',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    noAppointments: 'No appointments for selected date',
    filterByDate: 'Filter by date',
    all: 'All',
    scheduled: 'Scheduled',
    completed: 'Completed',
    cancelled: 'Cancelled',

    allDoctors: 'All Doctors',
    week: 'Week',
    month: 'Month',
    today: 'Today',
    noRecords: 'No records',
    newRecord: 'New Record',
    selectTimeSlot: 'Select date & time',
    available: 'available',
    patientName: 'Full name',
    backToRecords: 'Back to records',
    
    newDoctor: 'New Doctor',
    fullName: 'Full Name',
    position: 'Position',
    specialization: 'Specialization',
    experience: 'Experience',
    description: 'Description',
    photo: 'Photo',
    years: 'years',
    
    newArticle: 'New Article',
    title: 'Title',
    type: 'Type',
    label: 'Label',
    expiryDate: 'Expiry Date',
    hotOffer: 'Hot Offer',
    newsType: 'News',
    promoType: 'Promotion',
    infoLabel: 'Info',
    newsLabel: 'News',
    updateLabel: 'Update',
    
    sendToAll: 'Send to All',
    sendTargeted: 'Targeted Notification',
    notificationHistory: 'Notification History',
    message: 'Message',
    send: 'Send',
    sent: 'Sent',
    
    login: 'Log In',
    email: 'Email',
    password: 'Password',
    welcomeBack: 'Welcome Back',
    loginSubtitle: 'Sign in to admin panel',
    
    search: 'Search...',
    loading: 'Loading...',
    confirm: 'Confirm',
    confirmDelete: 'Are you sure you want to delete?',
    yes: 'Yes',
    no: 'No',
  },
} as const;

type TranslationKey = keyof typeof translations.uk;

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('uk');

  const t = useCallback(
    (key: TranslationKey) => translations[lang][key] || key,
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
}
