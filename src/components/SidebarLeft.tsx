/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Package,
  CreditCard,
  Users,
  Megaphone,
  LogOut,
  Languages,
} from 'lucide-react';
import { Language } from '../types';

interface SidebarLeftProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  onLogout: () => void;
  userName?: string;
  hasNewUfsa?: boolean;
}

const mainItems = [
  { id: 'stock', label: 'Stock', labelPt: 'Inventário', icon: Package },
  { id: 'expenses', label: 'Expenses', labelPt: 'Despesas', icon: CreditCard },
  { id: 'contacts', label: 'Contacts', labelPt: 'Contactos', icon: Users },
];

function getInitials(name?: string): string {
  if (!name) return 'U';
  return name
    .split(' ')
    .map(p => p[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

export default function SidebarLeft({
  activeTab,
  setActiveTab,
  language,
  setLanguage,
  onLogout,
  userName,
  hasNewUfsa = false,
}: SidebarLeftProps) {
  const initials = getInitials(userName);

  return (
    <aside className="fixed bottom-4 left-4 z-40 rounded-2xl border border-slate-700/60 bg-slate-900/95 p-2 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
      <nav className="flex items-center gap-1.5">
        <div className="mr-1 flex items-center gap-2 rounded-xl bg-slate-800/90 px-3 self-stretch">
          <div
            className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center font-black text-white text-xs shadow-sm"
            title={userName || 'User'}
          >
            {initials}
          </div>
          <span className="hidden text-[11px] font-semibold text-slate-200 sm:block">{userName || 'User'}</span>
        </div>

        {mainItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const label = language === 'en' ? item.label : item.labelPt;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={label}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all ${
                isActive
                  ? 'bg-secondary/20 text-white shadow-inner'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-secondary' : 'text-slate-400'} />
              <span className="font-medium tracking-wide">{label}</span>
            </button>
          );
        })}

        <button
          onClick={() => setLanguage(language === 'en' ? 'pt' : 'en')}
          title={language === 'en' ? 'Toggle Language' : 'Alterar Idioma'}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-all"
        >
          <Languages size={16} className="text-slate-400" />
          <span className="font-medium tracking-wide">{language === 'en' ? 'PT / EN' : 'EN / PT'}</span>
        </button>

        <button
          onClick={() => setActiveTab('ufsa')}
          title={language === 'en' ? 'UFSA Public Tenders' : 'Concursos UFSA'}
          className={`relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all ${
            activeTab === 'ufsa'
              ? 'bg-secondary/20 text-white shadow-inner'
              : 'text-slate-300 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Megaphone size={16} className={activeTab === 'ufsa' ? 'text-secondary' : 'text-slate-400'} />
          <span className="font-medium tracking-wide">UFSA</span>
          {hasNewUfsa && activeTab !== 'ufsa' && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-slate-900" />
          )}
        </button>

        <button
          onClick={onLogout}
          title={language === 'en' ? 'Sign Out' : 'Sair'}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-300 hover:bg-red-950/20 hover:text-red-200 transition-all"
        >
          <LogOut size={16} className="text-red-400" />
          <span className="font-medium tracking-wide">{language === 'en' ? 'Sign Out' : 'Sair'}</span>
        </button>
      </nav>
    </aside>
  );
}
