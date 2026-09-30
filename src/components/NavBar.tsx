import { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard, FileText, FileCode, Receipt, ShoppingCart,
  UserRound, BarChart2, Package, CreditCard, Users, Megaphone,
  Settings, Languages, LogOut, Menu, X,
} from 'lucide-react';
import { Language } from '../types';

interface NavBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  onLogout: () => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', labelPt: 'Painel',     icon: LayoutDashboard },
  { id: 'invoices',  label: 'Invoices',  labelPt: 'Facturas',   icon: FileText        },
  { id: 'quotes',    label: 'Quotes',    labelPt: 'Cotações',   icon: FileCode        },
  { id: 'receipts',  label: 'Receipts',  labelPt: 'Recibos',    icon: Receipt         },
  { id: 'vendas',    label: 'Sales',     labelPt: 'Vendas',     icon: ShoppingCart    },
  { id: 'clientes',  label: 'Clients',   labelPt: 'Clientes',   icon: UserRound       },
  { id: 'reports',   label: 'Reports',   labelPt: 'Relatórios', icon: BarChart2       },
  { id: 'stock',     label: 'Inventory', labelPt: 'Inventário', icon: Package         },
  { id: 'expenses',  label: 'Expenses',  labelPt: 'Despesas',   icon: CreditCard      },
  { id: 'contacts',  label: 'Contacts',  labelPt: 'Contactos',  icon: Users           },
];

const allMenuItems = [
  ...navItems,
  { id: 'ufsa',     label: 'UFSA',     labelPt: 'UFSA',       icon: Megaphone },
  { id: 'settings', label: 'Settings', labelPt: 'Definições', icon: Settings  },
];

const baseBtn = [
  'flex items-center gap-1.5 px-2.5 xl:px-3 py-3.5 text-xs whitespace-nowrap',
  'transition-all duration-150 border-b-2 -mb-px flex-shrink-0',
].join(' ');

const activeClass   = 'text-primary border-primary font-semibold';
const inactiveClass = 'text-primary/55 dark:text-slate-400 border-transparent hover:text-secondary hover:font-bold hover:border-secondary/40';

export default function NavBar({
  activeTab, setActiveTab, language, setLanguage, onLogout,
}: NavBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const navigate = (id: string) => { setActiveTab(id); setMenuOpen(false); };
  const pt = language === 'pt';

  return (
    <nav className="sticky top-16 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-stretch px-3 sm:px-5">

        {/* ── Hamburger dropdown — visible only on < md ──────────────── */}
        <div className="md:hidden flex items-center relative" ref={dropdownRef}>
          <button
            onClick={() => setMenuOpen(prev => !prev)}
            className="flex items-center gap-1.5 px-2.5 py-2 my-1.5 rounded-lg text-primary/70 hover:text-secondary hover:bg-secondary/5 transition-all text-xs font-medium"
          >
            {menuOpen ? <X size={17} /> : <Menu size={17} />}
            <span>{pt ? 'Menu' : 'Menu'}</span>
          </button>

          {menuOpen && (
            <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl z-50 overflow-hidden">
              <div className="grid grid-cols-3 gap-0.5 p-2">
                {allMenuItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const lbl = pt ? item.labelPt : item.label;
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.id)}
                      className={[
                        'relative flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl text-[11px] font-medium transition-all',
                        isActive
                          ? 'bg-primary/8 text-primary'
                          : 'text-primary/60 dark:text-slate-400 hover:bg-secondary/8 hover:text-secondary',
                      ].join(' ')}
                    >
                      <Icon size={17} />
                      <span className="text-center leading-tight">{lbl}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1 px-3 py-2.5 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => { setLanguage(language === 'en' ? 'pt' : 'en'); setMenuOpen(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-primary/60 dark:text-slate-400 hover:text-secondary font-medium transition-all"
                >
                  <Languages size={13} />
                  <span>{pt ? 'EN / PT' : 'PT / EN'}</span>
                </button>
                <button
                  onClick={() => { onLogout(); setMenuOpen(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-400 hover:text-red-500 font-medium transition-all ml-auto"
                >
                  <LogOut size={13} />
                  <span>{pt ? 'Sair' : 'Sign Out'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Full horizontal nav — visible on md+ ───────────────────── */}
        <div className="hidden md:flex items-stretch flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

          {/* Main nav items */}
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const label = pt ? item.labelPt : item.label;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={label}
                className={[baseBtn, isActive ? activeClass : inactiveClass].join(' ')}
              >
                <Icon size={14} />
                {/* Label: visible only on xl+ to prevent overflow on tablets */}
                <span className="hidden xl:inline">{label}</span>
              </button>
            );
          })}

          {/* UFSA */}
          <button
            onClick={() => setActiveTab('ufsa')}
            title={pt ? 'Concursos UFSA' : 'UFSA Public Tenders'}
            className={[baseBtn, activeTab === 'ufsa' ? activeClass : inactiveClass].join(' ')}
          >
            <Megaphone size={14} />
            <span className="hidden xl:inline">UFSA</span>
          </button>

          {/* Spacer */}
          <div className="flex-1 min-w-2" />
          <div className="my-3 w-px bg-slate-200 dark:bg-slate-700 flex-shrink-0 mx-1" />

          {/* Language */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'pt' : 'en')}
            title={pt ? 'Alterar Idioma' : 'Toggle Language'}
            className={[baseBtn, inactiveClass].join(' ')}
          >
            <Languages size={14} />
            <span className="hidden xl:inline">{pt ? 'EN / PT' : 'PT / EN'}</span>
          </button>

          {/* Settings */}
          <button
            onClick={() => setActiveTab('settings')}
            title={pt ? 'Definições' : 'Settings'}
            className={[baseBtn, activeTab === 'settings' ? activeClass : inactiveClass].join(' ')}
          >
            <Settings size={14} />
            <span className="hidden xl:inline">{pt ? 'Definições' : 'Settings'}</span>
          </button>

          {/* Sign Out */}
          <button
            onClick={onLogout}
            title={pt ? 'Sair' : 'Sign Out'}
            className={[baseBtn, 'text-red-400 hover:text-red-500 hover:font-bold'].join(' ')}
          >
            <LogOut size={14} />
            <span className="hidden xl:inline">{pt ? 'Sair' : 'Sign Out'}</span>
          </button>

        </div>

      </div>
    </nav>
  );
}
