/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  LayoutDashboard,
  FileCode,
  FileText,
  Receipt,
  Settings,
  UserRound,
  BarChart2,
  ShoppingCart,
} from 'lucide-react';
import { Language } from '../types';

interface SidebarRightProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  language: Language;
  companyName?: string;
}

const mainItems = [
  { id: 'dashboard', label: 'Dashboard', labelPt: 'Painel', icon: LayoutDashboard },
  { id: 'quotes', label: 'Quotes', labelPt: 'Cotações', icon: FileCode },
  { id: 'invoices', label: 'Invoices', labelPt: 'Facturas', icon: FileText },
  { id: 'receipts', label: 'Receipts', labelPt: 'Recibos', icon: Receipt },
  { id: 'vendas', label: 'Sales', labelPt: 'Vendas', icon: ShoppingCart },
  { id: 'clientes', label: 'Clients', labelPt: 'Clientes', icon: UserRound },
  { id: 'reports', label: 'Reports', labelPt: 'Relatórios', icon: BarChart2 },
];

export default function SidebarRight({
  activeTab,
  setActiveTab,
  language,
}: SidebarRightProps) {
  return (
    <aside className="fixed bottom-4 right-4 z-40 rounded-2xl border border-slate-700/60 bg-slate-900/95 p-2 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
      <nav className="flex items-center gap-1.5">
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
          onClick={() => setActiveTab('settings')}
          title={language === 'en' ? 'Settings' : 'Definições'}
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all ${
            activeTab === 'settings'
              ? 'bg-secondary/20 text-white shadow-inner'
              : 'text-slate-300 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Settings size={16} className={activeTab === 'settings' ? 'text-secondary' : 'text-slate-400'} />
          <span className="font-medium tracking-wide">{language === 'en' ? 'Settings' : 'Definições'}</span>
        </button>
      </nav>
    </aside>
  );
}
