import DesktopSettings from './DesktopSettings';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Plus, Trash2, ChevronLeft, ChevronRight, Check, Building2, Phone,
  CreditCard, Smartphone, ImageIcon, FileDown, Moon, Sun, MessageCircle,
  AlertCircle, Mail, Wifi, Network, Shield, Edit3, X,
} from 'lucide-react';
import { Language, CompanySettings, BankAccount, MobileContact, SecondaryCompany } from '../types';

interface SettingsViewProps {
  language: Language;
  settings: CompanySettings;
  onSave: (updates: Partial<CompanySettings>) => Promise<void>;
  onComplete: () => void;
  isFirstSetup: boolean;
  onGenerateModel: () => void;
  userId?: string;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  onDeleteSecondaryCompany?: () => Promise<void>;
}

const STEPS = [
  { id: 1, label: 'Empresa',       labelEn: 'Company',  icon: Building2  },
  { id: 2, label: 'Contactos',     labelEn: 'Contacts', icon: Phone      },
  { id: 3, label: 'Bancos',        labelEn: 'Banks',    icon: CreditCard },
  { id: 4, label: 'Pag. Móveis',   labelEn: 'Mobile',   icon: Smartphone },
  { id: 5, label: 'Marca',         labelEn: 'Brand',    icon: ImageIcon  },
];


const inputCls = 'w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-slate-900 transition-all';
const labelCls = 'block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5';

export default function SettingsView({
  language,
  settings,
  onSave,
  onComplete,
  isFirstSetup,
  onGenerateModel,
  userId,
  darkMode = false,
  onToggleDarkMode,
  onDeleteSecondaryCompany,
}: SettingsViewProps) {

  // ─── Wizard state ──────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection]     = useState(1);
  const [saving, setSaving]           = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const [companyName, setCompanyName] = useState(settings.companyName || '');
  const [nuit,        setNuit]        = useState(settings.nuit        || '');
  const [address,     setAddress]     = useState(settings.address     || '');
  const [city,        setCity]        = useState(settings.city        || '');
  const [email,       setEmail]       = useState(settings.email       || '');
  const [phone,       setPhone]       = useState(settings.phone       || '');
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(
    settings.bankAccounts?.length ? settings.bankAccounts : [{ bank: '', iban: '' }]
  );
  const [mobileContacts, setMobileContacts] = useState<MobileContact[]>(
    settings.mobileContacts?.length ? settings.mobileContacts : [{ provider: 'M-Pesa', number: '' }]
  );
  const [logoBase64,  setLogoBase64]  = useState<string | undefined>(settings.logoBase64);
  const [stampBase64, setStampBase64] = useState<string | undefined>(settings.stampBase64);
  const logoInputRef  = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);

  // ─── Settings-page state ───────────────────────────────────────────────────
  const [showEditModal, setShowEditModal] = useState(false);


  // ─── Secondary company state ───────────────────────────────────────────────
  const [showSecondaryModal, setShowSecondaryModal] = useState(false);
  const [savingSecondary, setSavingSecondary] = useState(false);
  const [sec2Name, setSec2Name] = useState(settings.secondaryCompany?.companyName || '');
  const [sec2Nuit, setSec2Nuit] = useState(settings.secondaryCompany?.nuit || '');
  const [sec2Address, setSec2Address] = useState(settings.secondaryCompany?.address || '');
  const [sec2City, setSec2City] = useState(settings.secondaryCompany?.city || '');
  const [sec2Phone, setSec2Phone] = useState(settings.secondaryCompany?.phone || '');
  const [sec2Email, setSec2Email] = useState(settings.secondaryCompany?.email || '');
  const [sec2Logo, setSec2Logo] = useState<string | undefined>(settings.secondaryCompany?.logoBase64);
  const [sec2Stamp, setSec2Stamp] = useState<string | undefined>(settings.secondaryCompany?.stampBase64);
  const [sec2Banks, setSec2Banks] = useState<BankAccount[]>(
    settings.secondaryCompany?.bankAccounts?.length ? settings.secondaryCompany.bankAccounts : [{ bank: '', iban: '' }]
  );
  const [sec2Mobile, setSec2Mobile] = useState<MobileContact[]>(
    settings.secondaryCompany?.mobileContacts?.length ? settings.secondaryCompany.mobileContacts : [{ provider: 'M-Pesa', number: '' }]
  );
  const sec2LogoRef  = useRef<HTMLInputElement>(null);
  const sec2StampRef = useRef<HTMLInputElement>(null);

  const openSecondaryModal = () => {
    setSec2Name(settings.secondaryCompany?.companyName || '');
    setSec2Nuit(settings.secondaryCompany?.nuit || '');
    setSec2Address(settings.secondaryCompany?.address || '');
    setSec2City(settings.secondaryCompany?.city || '');
    setSec2Phone(settings.secondaryCompany?.phone || '');
    setSec2Email(settings.secondaryCompany?.email || '');
    setSec2Logo(settings.secondaryCompany?.logoBase64);
    setSec2Stamp(settings.secondaryCompany?.stampBase64);
    setSec2Banks(settings.secondaryCompany?.bankAccounts?.length ? settings.secondaryCompany.bankAccounts : [{ bank: '', iban: '' }]);
    setSec2Mobile(settings.secondaryCompany?.mobileContacts?.length ? settings.secondaryCompany.mobileContacts : [{ provider: 'M-Pesa', number: '' }]);
    setShowSecondaryModal(true);
  };

  const handleSaveSecondary = async () => {
    if (!sec2Name.trim()) return;
    setSavingSecondary(true);
    try {
      const sec: SecondaryCompany = {
        companyName: sec2Name.trim(),
        nuit: sec2Nuit.trim(),
        address: sec2Address.trim(),
        city: sec2City.trim(),
        phone: sec2Phone.trim(),
        email: sec2Email.trim(),
        logoBase64: sec2Logo,
        stampBase64: sec2Stamp,
        bankAccounts: sec2Banks.filter(b => b.bank.trim() || b.iban.trim()),
        mobileContacts: sec2Mobile.filter(m => m.number.trim()),
      };
      await onSave({ secondaryCompany: sec });
      setShowSecondaryModal(false);
    } finally {
      setSavingSecondary(false);
    }
  };

  const handleDeleteSecondary = async () => {
    if (onDeleteSecondaryCompany) await onDeleteSecondaryCompany();
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const handleFileRead = (file: File, setter: (v: string) => void) => {
    const reader = new FileReader();
    reader.onload = e => { if (e.target?.result) setter(e.target.result as string); };
    reader.readAsDataURL(file);
  };

  const getStepData = (step: number): Partial<CompanySettings> => {
    switch (step) {
      case 1: return { companyName, nuit, address, city };
      case 2: return { email, phone };
      case 3: return { bankAccounts: bankAccounts.filter(b => b.bank.trim() || b.iban.trim()) };
      case 4: return { mobileContacts: mobileContacts.filter(m => m.number.trim()) };
      case 5: return { logoBase64, stampBase64 };
      default: return {};
    }
  };

  const handleNext = async () => {
    setSaving(true);
    try {
      await onSave(getStepData(currentStep));
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      if (currentStep < STEPS.length) { setDirection(1); setCurrentStep(s => s + 1); }
    } finally { setSaving(false); }
  };

  const handleBack = () => {
    if (currentStep > 1) { setDirection(-1); setCurrentStep(s => s - 1); }
  };

  // First-setup final save
  const handleComplete = async () => {
    setSaving(true);
    try {
      await onSave({ ...getStepData(currentStep), setupComplete: true });
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      onComplete();
    } finally { setSaving(false); }
  };

  // Edit-modal final save — counts as one update
  const handleEditComplete = async () => {
    setSaving(true);
    try {
      await onSave({ ...getStepData(currentStep), setupComplete: true });
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setShowEditModal(false);
      setCurrentStep(1);
    } finally { setSaving(false); }
  };

  const handleEditProfileClick = () => { setCurrentStep(1); setCompletedSteps(new Set()); setShowEditModal(true); };

  const onFinalComplete = isFirstSetup ? handleComplete : handleEditComplete;

  const variants = {
    enter:  (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  const progressPercent = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  // ─── Step panels ───────────────────────────────────────────────────────────
  const step1 = (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        {language === 'en'
          ? 'This information will appear on all your invoices, quotes and receipts.'
          : 'Esta informação aparecerá em todas as suas facturas, cotações e recibos.'}
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={labelCls}>{language === 'en' ? 'Company Name *' : 'Nome da Empresa *'}</label>
          <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
            placeholder="Minha Empresa Lda." className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>NUIT *</label>
          <input type="text" value={nuit} onChange={e => setNuit(e.target.value)}
            placeholder="400261845" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{language === 'en' ? 'City' : 'Cidade'}</label>
          <input type="text" value={city} onChange={e => setCity(e.target.value)}
            placeholder="Maputo" className={inputCls} />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>{language === 'en' ? 'Address' : 'Endereço'}</label>
          <input type="text" value={address} onChange={e => setAddress(e.target.value)}
            placeholder="Av. Julius Nyerere, 123" className={inputCls} />
        </div>
      </div>
    </div>
  );

  const step2 = (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        {language === 'en'
          ? 'Your business contact details for documents and client communication.'
          : 'Os dados de contacto da empresa para documentos e comunicações com clientes.'}
      </p>
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="geral@empresa.co.mz" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{language === 'en' ? 'Phone / Fax' : 'Telefone / Fax'}</label>
          <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="+258 21 000 000" className={inputCls} />
        </div>
      </div>
    </div>
  );

  const step3 = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {language === 'en' ? 'Bank account details shown on invoices.' : 'Dados bancários apresentados nas facturas.'}
        </p>
        <button type="button" onClick={() => setBankAccounts(p => [...p, { bank: '', iban: '' }])}
          className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors shrink-0 ml-4">
          <Plus size={13} />{language === 'en' ? 'Add' : 'Adicionar'}
        </button>
      </div>
      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {bankAccounts.map((ba, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <input type="text" value={ba.bank}
              onChange={e => { const u = [...bankAccounts]; u[idx] = { ...u[idx], bank: e.target.value }; setBankAccounts(u); }}
              placeholder={language === 'en' ? 'Bank name' : 'Nome do Banco'}
              className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary text-slate-900" />
            <input type="text" value={ba.iban}
              onChange={e => { const u = [...bankAccounts]; u[idx] = { ...u[idx], iban: e.target.value }; setBankAccounts(u); }}
              placeholder="IBAN / NIB"
              className="flex-[2] p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary text-slate-900" />
            <button type="button" onClick={() => setBankAccounts(p => p.filter((_, i) => i !== idx))}
              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const step4 = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {language === 'en' ? 'Mobile wallet numbers for payment.' : 'Números de carteira móvel para pagamento.'}
        </p>
        <button type="button" onClick={() => setMobileContacts(p => [...p, { provider: 'M-Pesa', number: '' }])}
          className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors shrink-0 ml-4">
          <Plus size={13} />{language === 'en' ? 'Add' : 'Adicionar'}
        </button>
      </div>
      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {mobileContacts.map((mc, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <select value={mc.provider}
              onChange={e => { const u = [...mobileContacts]; u[idx] = { ...u[idx], provider: e.target.value }; setMobileContacts(u); }}
              className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary text-slate-900 font-semibold shrink-0">
              <option>M-Pesa</option><option>E-Mola</option><option>Movitel</option><option>Vodacom</option>
            </select>
            <input type="text" value={mc.number}
              onChange={e => { const u = [...mobileContacts]; u[idx] = { ...u[idx], number: e.target.value }; setMobileContacts(u); }}
              placeholder="+258 84 000 0000"
              className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary text-slate-900" />
            <button type="button" onClick={() => setMobileContacts(p => p.filter((_, i) => i !== idx))}
              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const step5 = (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        {language === 'en'
          ? 'Upload your logo and stamp — they will be placed on all generated documents.'
          : 'Carregue o seu logotipo e carimbo — serão colocados em todos os documentos gerados.'}
      </p>
      <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
        {logoBase64
          ? <img src={logoBase64} alt="Logo" className="w-20 h-20 object-contain rounded-lg border border-slate-200 bg-white p-1 shrink-0" />
          : <div className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-white shrink-0">
              <ImageIcon size={24} className="text-slate-300" />
            </div>}
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-700 mb-0.5">{language === 'en' ? 'Company Logo' : 'Logotipo da Empresa'}</p>
          <p className="text-xs text-slate-400 mb-2">PNG, JPG — {language === 'en' ? 'recommended 300×150 px' : 'recomendado 300×150 px'}</p>
          <button type="button" onClick={() => logoInputRef.current?.click()}
            className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors">
            {logoBase64 ? (language === 'en' ? 'Change' : 'Alterar') : (language === 'en' ? 'Upload' : 'Carregar')}
          </button>
          <input ref={logoInputRef} type="file" accept="image/png,image/jpeg" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileRead(f, setLogoBase64); }} />
        </div>
      </div>
      <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
        {stampBase64
          ? <img src={stampBase64} alt="Carimbo" className="w-20 h-20 object-contain rounded-lg border border-slate-200 bg-white p-1 shrink-0" />
          : <div className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-white shrink-0">
              <ImageIcon size={24} className="text-slate-300" />
            </div>}
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-700 mb-0.5">{language === 'en' ? 'Company Stamp' : 'Carimbo da Empresa'}</p>
          <p className="text-xs text-slate-400 mb-2">PNG {language === 'en' ? 'with transparent background' : 'com fundo transparente'}</p>
          <button type="button" onClick={() => stampInputRef.current?.click()}
            className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors">
            {stampBase64 ? (language === 'en' ? 'Change' : 'Alterar') : (language === 'en' ? 'Upload' : 'Carregar')}
          </button>
          <input ref={stampInputRef} type="file" accept="image/png,image/jpeg" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileRead(f, setStampBase64); }} />
        </div>
      </div>
    </div>
  );

  const stepContent = [step1, step2, step3, step4, step5][currentStep - 1];

  // ─── Wizard card (reutilizado no first-setup e no edit modal) ─────────────
  const wizardCard = (
    <div className="bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-primary via-secondary to-primary" />
      <div className="px-4 pt-5 pb-4 sm:px-8 sm:pt-7 sm:pb-5">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {isFirstSetup
                ? (language === 'en' ? 'Company Setup' : 'Configuração da Empresa')
                : (language === 'en' ? 'Edit Company Profile' : 'Editar Perfil da Empresa')}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isFirstSetup
                ? (language === 'en' ? 'Complete your profile before using the system' : 'Complete o seu perfil antes de usar o sistema')
                : (language === 'en' ? 'Update local profile' : 'Actualizar perfil local')}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {!isFirstSetup && (
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            )}
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full shrink-0">
              {currentStep} / {STEPS.length}
            </span>
          </div>
        </div>
        <div className="mt-5 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <motion.div className="bg-gradient-to-r from-primary to-secondary h-full rounded-full"
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.45, ease: 'easeInOut' }} />
        </div>
        <div className="mt-4 flex items-center justify-between">
          {STEPS.map(step => {
            const done = completedSteps.has(step.id);
            const current = currentStep === step.id;
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex flex-col items-center gap-1.5 flex-1">
                <motion.div
                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                    done ? 'bg-primary border-primary text-white shadow-md shadow-primary/25'
                    : current ? 'bg-white border-primary text-primary shadow-md shadow-primary/15'
                    : 'bg-slate-100 border-slate-200 text-slate-400'
                  }`}
                  animate={current ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                  transition={current ? { repeat: Infinity, duration: 2.5, ease: 'easeInOut' } : {}}>
                  {done ? <Check size={15} /> : <Icon size={15} />}
                </motion.div>
                <span className={`text-[10px] font-semibold hidden sm:block text-center leading-tight ${
                  current ? 'text-primary' : done ? 'text-slate-500' : 'text-slate-300'
                }`}>
                  {language === 'en' ? step.labelEn : step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="h-px bg-slate-100 mx-4 sm:mx-8" />
      <div className="px-4 py-5 sm:px-8 sm:py-6" style={{ minHeight: 340 }}>
        <AnimatePresence custom={direction} mode="wait">
          <motion.div key={currentStep} custom={direction} variants={variants}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.22, ease: 'easeInOut' }}>
            {stepContent}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="px-4 pb-5 pt-3 border-t border-slate-100 flex flex-col gap-3 sm:px-8 sm:pb-7 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={handleBack} disabled={currentStep === 1}
          className="order-2 flex items-center justify-center gap-1.5 px-5 py-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 font-semibold text-sm rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed sm:order-1">
          <ChevronLeft size={15} />
          {language === 'en' ? 'Back' : 'Anterior'}
        </button>
        <div className="order-1 flex w-full flex-wrap items-center justify-between gap-2 sm:order-2 sm:w-auto sm:justify-end">
          <div className="flex gap-1.5 mr-0 sm:mr-3">
            {STEPS.map(s => (
              <div key={s.id} className={`h-1.5 rounded-full transition-all duration-300 ${
                s.id === currentStep ? 'w-5 bg-primary' : completedSteps.has(s.id) ? 'w-1.5 bg-primary/40' : 'w-1.5 bg-slate-200'
              }`} />
            ))}
          </div>
          {currentStep < STEPS.length ? (
            <button type="button" onClick={handleNext} disabled={saving}
              className="flex w-full items-center justify-center gap-1.5 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-60 shadow-sm active:scale-98 sm:w-auto">
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <>{language === 'en' ? 'Next' : 'Próximo'} <ChevronRight size={15} /></>}
            </button>
          ) : (
            <button type="button" onClick={onFinalComplete} disabled={saving}
              className="flex w-full items-center justify-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-60 shadow-sm active:scale-98 sm:w-auto">
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Check size={15} /> {language === 'en' ? 'Complete' : 'Concluir'}</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // ─── First setup → modal fullscreen ───────────────────────────────────────
  if (isFirstSetup) {
    return (
      <div className="fixed inset-0 z-[200] overflow-y-auto bg-slate-950/80 backdrop-blur-sm">
        <div className="min-h-screen flex items-center justify-center px-3 py-6 sm:px-4 sm:py-12">
          <div className="w-full max-w-[min(100vw-1rem,36rem)] modal-content">
            {wizardCard}
          </div>
        </div>
      </div>
    );
  }

  // ─── Settings page (after setup complete) ─────────────────────────────────

  const services = [
{
icon: Network,
name: language === 'en' ? 'Computer Networks' : 'Redes de Computadores',
desc: language === 'en'
? 'Corporate network setup, printers and connectivity.'
: 'Instalação de redes empresariais, impressoras e conectividade.',
badge: language === 'en' ? 'Available' : 'Disponível',
badgeColor: 'emerald',
},
{
icon: Shield,
name: 'M-Drive',
desc: language === 'en'
? 'Ultra-private corporate social network.'
: 'Rede social corporativa ultra privada.',
badge: language === 'en' ? 'Available' : 'Disponível',
badgeColor: 'emerald',
},
{
icon: Wifi,
name: 'Wall Break Network',
desc: language === 'en'
? 'Long-range office internet sharing solution.'
: 'Partilha de internet corporativa sem limites de distância.',
badge: language === 'en' ? 'Available' : 'Disponível',
badgeColor: 'emerald',
},
];


  return (
    <div className="space-y-6 animation-fade-in text-left pb-10">

      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-display">
          {language === 'en' ? 'Settings' : 'Configurações'}
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {language === 'en'
            ? 'Manage company profile, system preferences and services.'
            : 'Gerencie o perfil da empresa, preferências do sistema e serviços.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Company Profile Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="h-1 bg-gradient-to-r from-primary via-secondary to-primary" />
            <div className="p-6">

              {/* Header row */}
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  {settings.logoBase64 ? (
                    <img src={settings.logoBase64} alt="Logo" className="w-14 h-14 object-contain border border-slate-200 rounded-xl p-1 bg-white shrink-0" />
                  ) : (
                    <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <Building2 size={24} className="text-primary" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-black text-base text-slate-900 dark:text-white leading-tight">
                      {settings.companyName || '—'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      NUIT: <span className="font-mono">{settings.nuit || '—'}</span>
                      {settings.city ? ` · ${settings.city}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleEditProfileClick}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <Edit3 size={12} />
                  {language === 'en' ? 'Edit' : 'Editar'}
                </button>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700 dark:text-slate-300">
                {settings.address && (
                  <div className="flex items-start gap-2">
                    <span className="text-slate-400 shrink-0 mt-0.5">📍</span>
                    <span>{settings.address}</span>
                  </div>
                )}
                {settings.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={12} className="text-slate-400 shrink-0" />
                    <span className="truncate">{settings.email}</span>
                  </div>
                )}
                {settings.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={12} className="text-slate-400 shrink-0" />
                    <span>{settings.phone}</span>
                  </div>
                )}
              </div>

              {/* Bank accounts */}
              {settings.bankAccounts && settings.bankAccounts.length > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                    {language === 'en' ? 'Bank Accounts' : 'Contas Bancárias'}
                  </p>
                  <div className="space-y-1.5">
                    {settings.bankAccounts.map((b, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <CreditCard size={11} className="text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{b.bank}</span>
                        <span className="font-mono text-slate-500">{b.iban}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mobile contacts */}
              {settings.mobileContacts && settings.mobileContacts.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                    {language === 'en' ? 'Mobile Wallets' : 'Carteiras Móveis'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {settings.mobileContacts.map((m, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs">
                        <Smartphone size={11} className="text-slate-400" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{m.provider}</span>
                        <span className="font-mono text-slate-500">{m.number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                {language === 'en' ? 'Local edition · unlimited profile updates' : 'Edição local · alterações de perfil ilimitadas'}
              </div>
            </div>
          </div>

          {/* ── Secondary Company Card ── */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="h-1 bg-gradient-to-r from-secondary to-amber-400" />
            <div className="p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    {language === 'en' ? 'Second Company Profile' : 'Segundo Perfil de Empresa'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {language === 'en'
                      ? 'Alternate issuer for document generation (max. 1)'
                      : 'Emissor alternativo para geração de documentos (máx. 1)'}
                  </p>
                </div>
                {!settings.secondaryCompany && (
                  <button
                    onClick={openSecondaryModal}
                    className="flex items-center gap-1.5 px-4 py-2 bg-secondary hover:bg-secondary/90 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    <Plus size={12} />
                    {language === 'en' ? 'Add' : 'Adicionar'}
                  </button>
                )}
              </div>

              {settings.secondaryCompany ? (
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {settings.secondaryCompany.logoBase64 ? (
                        <img src={settings.secondaryCompany.logoBase64} alt="Logo 2" className="w-11 h-11 object-contain border border-slate-200 rounded-lg p-1 bg-white shrink-0" />
                      ) : (
                        <div className="w-11 h-11 bg-secondary/10 rounded-lg flex items-center justify-center shrink-0">
                          <Building2 size={20} className="text-secondary" />
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                          {settings.secondaryCompany.companyName || '—'}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          NUIT: <span className="font-mono">{settings.secondaryCompany.nuit || '—'}</span>
                          {settings.secondaryCompany.city ? ` · ${settings.secondaryCompany.city}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={openSecondaryModal}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit3 size={11} />
                        {language === 'en' ? 'Edit' : 'Editar'}
                      </button>
                      <button
                        onClick={handleDeleteSecondary}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 size={11} />
                        {language === 'en' ? 'Remove' : 'Remover'}
                      </button>
                    </div>
                  </div>
                  {(settings.secondaryCompany.email || settings.secondaryCompany.phone) && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                      {settings.secondaryCompany.email && (
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Mail size={11} className="shrink-0 text-slate-400" />
                          <span className="truncate">{settings.secondaryCompany.email}</span>
                        </div>
                      )}
                      {settings.secondaryCompany.phone && (
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Phone size={11} className="shrink-0 text-slate-400" />
                          <span>{settings.secondaryCompany.phone}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Building2 size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-xs font-medium">
                    {language === 'en' ? 'No second company added yet.' : 'Nenhuma segunda empresa adicionada.'}
                  </p>
                  <p className="text-[11px] mt-1 text-slate-300">
                    {language === 'en'
                      ? 'Add one to issue documents under a different company name.'
                      : 'Adicione uma para emitir documentos com outro nome de empresa.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Preferences Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">
              {language === 'en' ? 'Preferences' : 'Preferências'}
            </h4>
            <p className="text-xs text-slate-400 mb-5">
              {language === 'en' ? 'Visual and system preferences.' : 'Preferências visuais e do sistema.'}
            </p>

            {/* Dark mode */}
            <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                {darkMode
                  ? <Moon size={16} className="text-indigo-400" />
                  : <Sun size={16} className="text-amber-400" />}
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {language === 'en' ? 'Dark Mode' : 'Modo Escuro'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {language === 'en' ? 'Switch between light and dark theme' : 'Alternar entre tema claro e escuro'}
                  </p>
                </div>
              </div>
              <button
                onClick={onToggleDarkMode}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer shrink-0 ${darkMode ? 'bg-primary' : 'bg-slate-200'}`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${darkMode ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Generate PDF */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <FileDown size={16} className="text-slate-400" />
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {language === 'en' ? 'Invoice PDF Template' : 'Modelo de Factura PDF'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {language === 'en' ? 'Download a sample with current settings' : 'Descarrega um exemplo com as configurações actuais'}
                  </p>
                </div>
              </div>
              <button
                onClick={onGenerateModel}
                className="px-4 py-1.5 bg-secondary hover:bg-secondary/90 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
              >
                {language === 'en' ? 'Generate' : 'Gerar'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-6">
          <DesktopSettings language={language} />

          {/* Support Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">
              {language === 'en' ? 'Support' : 'Suporte'}
            </h4>
            <p className="text-xs text-slate-400 mb-5">
              {language === 'en' ? 'Get help from our team.' : 'Obtenha ajuda da nossa equipa.'}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.open('https://wa.me/258863503126?text=' + encodeURIComponent(language === 'en' ? 'Hello, I need support with my REST Desktop system.' : 'Olá, preciso de suporte com o meu sistema REST Desktop.'), '_blank')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer"
              >
                <MessageCircle size={18} />
                <div className="text-left">
                  <p className="text-sm font-bold leading-tight">WhatsApp Support</p>
                  <p className="text-[10px] opacity-80 font-normal">+258 86 350 3126</p>
                </div>
              </button>
              <button
                onClick={() => window.open('mailto:gaudioricardomatimbe@gmail.com')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              >
                <Mail size={16} className="text-slate-400 shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-semibold leading-tight">Email Support</p>
                  <p className="text-[10px] text-slate-400 font-normal">gaudioricardomatimbe@gmail.com</p>
                </div>
              </button>
            </div>
          </div>

          {/* Services Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">
              {language === 'en' ? 'Company Services' : 'Serviços da Empresa'}
            </h4>
            <p className="text-xs text-slate-400 mb-5">
              {language === 'en' ? 'Integrations and add-on services.' : 'Integrações e serviços adicionais.'}
            </p>
            <div className="grid grid-cols-1 gap-3">
              {services.map((svc, i) => {
                const Icon = svc.icon;
                const badgeColors: Record<string, string> = {
                  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  amber: 'bg-amber-50 text-amber-700 border-amber-200',
                  blue: 'bg-blue-50 text-blue-700 border-blue-200',
                };
                return (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                      <Icon size={15} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{svc.name}</p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${badgeColors[svc.badgeColor]}`}>
                          {svc.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{svc.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* ── Edit Modal ── */}
      {showEditModal && (
        <div className="fixed inset-0 z-[300] bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
            <div className="min-h-screen flex items-center justify-center px-3 py-6 sm:px-4 sm:py-12">
              <div className="w-full max-w-[min(100vw-1rem,36rem)] modal-content">
                {wizardCard}
              </div>
            </div>
        </div>
      )}

      {/* ── Secondary Company Modal ── */}
      {showSecondaryModal && (
        <div className="fixed inset-0 z-[300] bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-screen flex items-center justify-center px-3 py-6 sm:px-4 sm:py-12">
            <div className="w-full max-w-[min(100vw-1rem,42rem)] modal-content bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-secondary to-amber-400" />

              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    {settings.secondaryCompany
                      ? (language === 'en' ? 'Edit Second Company' : 'Editar Segunda Empresa')
                      : (language === 'en' ? 'Add Second Company' : 'Adicionar Segunda Empresa')}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {language === 'en'
                      ? 'This profile will be selectable when creating invoices, quotes and receipts.'
                      : 'Este perfil ficará disponível ao criar facturas, cotações e recibos.'}
                  </p>
                </div>
                <button onClick={() => setShowSecondaryModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer mt-0.5">
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="px-6 py-5 overflow-y-auto max-h-[65vh] space-y-6">

                {/* Company Info */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Building2 size={11} /> {language === 'en' ? 'Company Information' : 'Informação da Empresa'}
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className={labelCls}>{language === 'en' ? 'Company Name *' : 'Nome da Empresa *'}</label>
                      <input type="text" value={sec2Name} onChange={e => setSec2Name(e.target.value)}
                        className={inputCls} placeholder="Segunda Empresa Lda." />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>NUIT</label>
                        <input type="text" value={sec2Nuit} onChange={e => setSec2Nuit(e.target.value)}
                          className={inputCls} placeholder="400261845" />
                      </div>
                      <div>
                        <label className={labelCls}>{language === 'en' ? 'City' : 'Cidade'}</label>
                        <input type="text" value={sec2City} onChange={e => setSec2City(e.target.value)}
                          className={inputCls} placeholder="Beira" />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>{language === 'en' ? 'Address' : 'Endereço'}</label>
                      <input type="text" value={sec2Address} onChange={e => setSec2Address(e.target.value)}
                        className={inputCls} placeholder="Av. Principal, 45" />
                    </div>
                  </div>
                </div>

                {/* Contacts */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Phone size={11} /> {language === 'en' ? 'Contact Details' : 'Contactos'}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Email</label>
                      <input type="email" value={sec2Email} onChange={e => setSec2Email(e.target.value)}
                        className={inputCls} placeholder="geral@empresa2.co.mz" />
                    </div>
                    <div>
                      <label className={labelCls}>{language === 'en' ? 'Phone' : 'Telefone'}</label>
                      <input type="text" value={sec2Phone} onChange={e => setSec2Phone(e.target.value)}
                        className={inputCls} placeholder="+258 23 000 000" />
                    </div>
                  </div>
                </div>

                {/* Bank Accounts */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <CreditCard size={11} /> {language === 'en' ? 'Bank Accounts' : 'Contas Bancárias'}
                    </p>
                    <button type="button" onClick={() => setSec2Banks(p => [...p, { bank: '', iban: '' }])}
                      className="flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary/80 transition-colors">
                      <Plus size={11} />{language === 'en' ? 'Add' : 'Adicionar'}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {sec2Banks.map((ba, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input type="text" value={ba.bank}
                          onChange={e => { const u = [...sec2Banks]; u[idx] = { ...u[idx], bank: e.target.value }; setSec2Banks(u); }}
                          placeholder={language === 'en' ? 'Bank name' : 'Nome do Banco'}
                          className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary text-slate-900" />
                        <input type="text" value={ba.iban}
                          onChange={e => { const u = [...sec2Banks]; u[idx] = { ...u[idx], iban: e.target.value }; setSec2Banks(u); }}
                          placeholder="IBAN / NIB"
                          className="flex-[2] p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary text-slate-900" />
                        <button type="button" onClick={() => setSec2Banks(p => p.filter((_, i) => i !== idx))}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mobile Wallets */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Smartphone size={11} /> {language === 'en' ? 'Mobile Wallets' : 'Carteiras Móveis'}
                    </p>
                    <button type="button" onClick={() => setSec2Mobile(p => [...p, { provider: 'M-Pesa', number: '' }])}
                      className="flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary/80 transition-colors">
                      <Plus size={11} />{language === 'en' ? 'Add' : 'Adicionar'}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {sec2Mobile.map((mc, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <select value={mc.provider}
                          onChange={e => { const u = [...sec2Mobile]; u[idx] = { ...u[idx], provider: e.target.value }; setSec2Mobile(u); }}
                          className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary text-slate-900 font-semibold shrink-0">
                          <option>M-Pesa</option><option>E-Mola</option><option>Movitel</option><option>Vodacom</option>
                        </select>
                        <input type="text" value={mc.number}
                          onChange={e => { const u = [...sec2Mobile]; u[idx] = { ...u[idx], number: e.target.value }; setSec2Mobile(u); }}
                          placeholder="+258 84 000 0000"
                          className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary text-slate-900" />
                        <button type="button" onClick={() => setSec2Mobile(p => p.filter((_, i) => i !== idx))}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Brand Assets */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <ImageIcon size={11} /> {language === 'en' ? 'Brand Assets' : 'Activos de Marca'}
                  </p>
                  <div className="space-y-3">
                    {/* Logo */}
                    <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      {sec2Logo
                        ? <img src={sec2Logo} alt="Logo 2" className="w-16 h-16 object-contain rounded-lg border border-slate-200 bg-white p-1 shrink-0" />
                        : <div className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-white shrink-0">
                            <ImageIcon size={20} className="text-slate-300" />
                          </div>}
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-700 mb-0.5">{language === 'en' ? 'Company Logo' : 'Logotipo'}</p>
                        <p className="text-xs text-slate-400 mb-2">PNG, JPG — {language === 'en' ? 'recommended 300×150 px' : 'recomendado 300×150 px'}</p>
                        <button type="button" onClick={() => sec2LogoRef.current?.click()}
                          className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors">
                          {sec2Logo ? (language === 'en' ? 'Change' : 'Alterar') : (language === 'en' ? 'Upload' : 'Carregar')}
                        </button>
                        {sec2Logo && (
                          <button type="button" onClick={() => setSec2Logo(undefined)}
                            className="ml-2 px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 transition-colors">
                            {language === 'en' ? 'Remove' : 'Remover'}
                          </button>
                        )}
                        <input ref={sec2LogoRef} type="file" accept="image/png,image/jpeg" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleFileRead(f, setSec2Logo); }} />
                      </div>
                    </div>
                    {/* Stamp */}
                    <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      {sec2Stamp
                        ? <img src={sec2Stamp} alt="Carimbo 2" className="w-16 h-16 object-contain rounded-lg border border-slate-200 bg-white p-1 shrink-0" />
                        : <div className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-white shrink-0">
                            <ImageIcon size={20} className="text-slate-300" />
                          </div>}
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-700 mb-0.5">{language === 'en' ? 'Company Stamp' : 'Carimbo'}</p>
                        <p className="text-xs text-slate-400 mb-2">PNG {language === 'en' ? 'with transparent background' : 'com fundo transparente'}</p>
                        <button type="button" onClick={() => sec2StampRef.current?.click()}
                          className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors">
                          {sec2Stamp ? (language === 'en' ? 'Change' : 'Alterar') : (language === 'en' ? 'Upload' : 'Carregar')}
                        </button>
                        {sec2Stamp && (
                          <button type="button" onClick={() => setSec2Stamp(undefined)}
                            className="ml-2 px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 transition-colors">
                            {language === 'en' ? 'Remove' : 'Remover'}
                          </button>
                        )}
                        <input ref={sec2StampRef} type="file" accept="image/png,image/jpeg" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleFileRead(f, setSec2Stamp); }} />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button onClick={() => setShowSecondaryModal(false)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 font-semibold text-sm rounded-xl transition-all cursor-pointer">
                  {language === 'en' ? 'Cancel' : 'Cancelar'}
                </button>
                <button onClick={handleSaveSecondary} disabled={savingSecondary || !sec2Name.trim()}
                  className="flex items-center gap-1.5 px-6 py-2 bg-secondary hover:bg-secondary/90 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-60 cursor-pointer">
                  {savingSecondary
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Check size={14} />}
                  {language === 'en' ? 'Save Company' : 'Guardar Empresa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
