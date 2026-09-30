/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  LayoutDashboard,
  FileCode,
  FileText,
  Receipt,
  Package,
  CreditCard,
  Users,
  Megaphone,
  HelpCircle,
  LogOut,
  Languages
} from 'lucide-react';
import { Language } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  onLogout: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  language,
  setLanguage,
  onLogout
}: SidebarProps) {
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', labelPt: 'Painel', icon: LayoutDashboard },
    { id: 'quotes', label: 'Quotes', labelPt: 'Cotações', icon: FileCode },
    { id: 'invoices', label: 'Invoices', labelPt: 'Facturas', icon: FileText },
    { id: 'receipts', label: 'Receipts', labelPt: 'Recibos', icon: Receipt },
    { id: 'stock', label: 'Stock', labelPt: 'Inventário', icon: Package },
    { id: 'expenses', label: 'Expenses', labelPt: 'Despesas', icon: CreditCard },
    { id: 'contacts', label: 'Contacts', labelPt: 'Contactos', icon: Users },
    { id: 'ufsa', label: 'UFSA', labelPt: 'UFSA', icon: Megaphone },
  ];

  const handleLanguageToggle = () => {
    setLanguage(language === 'en' ? 'pt' : 'en');
  };

  return (
    <aside className="fixed right-0 top-0 h-screen w-64 bg-primary text-slate-100 border-l border-primary/20 flex flex-col py-6 z-40 transition-colors">
      
      {/* Brand Header */}
      <div className="px-6 mb-8">
        <h1 className="text-2xl font-black tracking-tight text-white hanken">
          InvStock
        </h1>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">
          {language === 'en' ? 'Enterprise Resource Planning' : 'Planeamento de Recursos'}
        </p>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-thin">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              id={`nav-item-${item.id}`}
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded text-xs transition-all text-left ${
                isActive
                  ? 'text-white font-bold border-r-4 border-secondary bg-primary-container shadow-sm'
                  : 'text-slate-350 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-secondary' : 'text-slate-400'} />
              <span className="font-medium tracking-wide">
                {language === 'en' ? item.label : item.labelPt}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions Container */}
      <div className="px-3 pt-4 border-t border-primary-container space-y-1">
        
        {/* Localization Switcher */}
        <button
          onClick={handleLanguageToggle}
          className="w-full flex items-center justify-between px-4 py-2 rounded text-xs text-slate-300 hover:bg-white/5 transition-all text-left"
          title="Toggle Language"
        >
          <div className="flex items-center gap-3">
            <Languages size={15} className="text-slate-400" />
            <span className="font-medium">
              {language === 'en' ? 'Language' : 'Idioma'}
            </span>
          </div>
          <span className="font-bold bg-secondary text-white px-2 py-0.5 rounded text-[9px] uppercase">
            {language === 'en' ? 'EN' : 'PT'}
          </span>
        </button>

        <hr className="my-2 border-primary-container" />

        {/* Support Link */}
        <button
          onClick={() => setActiveTab('support')}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded text-xs transition-all text-left ${
            activeTab === 'support'
              ? 'text-white font-bold border-r-4 border-secondary bg-primary-container'
              : 'text-slate-300 hover:bg-white/5'
          }`}
        >
          <HelpCircle size={16} className={activeTab === 'support' ? 'text-secondary' : 'text-slate-400'} />
          <span className="font-medium tracking-wide">
            {language === 'en' ? 'Support' : 'Suporte'}
          </span>
        </button>

        {/* Sign Out Trigger */}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded text-xs text-red-450 hover:bg-red-950/20 transition-all text-left"
        >
          <LogOut size={16} className="text-red-405" />
          <span className="font-semibold tracking-wide">
            {language === 'en' ? 'Sign Out' : 'Sair'}
          </span>
        </button>
      </div>
    </aside>
  );
}
