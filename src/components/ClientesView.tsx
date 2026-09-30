/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { DebtClient, Language } from '../types';
import {
  UserRound, Plus, MapPin, Phone, Mail, MessageSquare,
  CheckCircle2, Clock, Trash2, Send, ChevronRight, X,
} from 'lucide-react';

interface ClientesViewProps {
  clients: DebtClient[];
  setClients: (clients: DebtClient[]) => void;
  language: Language;
  onNewClient: () => void;
  onMarkLiquidado: (id: string) => void;
  onDeleteClient: (id: string) => void;
  searchQuery: string;
}

interface SmsChatState {
  client: DebtClient;
  selectedNumber: string;
  message: string;
}

const RECENT_KEY = 'debt_recent_chats';

export default function ClientesView({
  clients,
  language,
  onNewClient,
  onMarkLiquidado,
  onDeleteClient,
  searchQuery,
}: ClientesViewProps) {
  const [smsChat, setSmsChat] = useState<SmsChatState | null>(null);
  const [recentPanel, setRecentPanel] = useState(false);
  const [recentIds, setRecentIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
    catch { return []; }
  });

  const chatSidebarRef = useRef<HTMLDivElement>(null);
  const floatingRef = useRef<HTMLDivElement>(null);

  // ESC fecha o chat; click fora do sidebar também fecha
  useEffect(() => {
    if (!smsChat) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSmsChat(null);
    }
    function onMouseDown(e: MouseEvent) {
      if (chatSidebarRef.current && !chatSidebarRef.current.contains(e.target as Node)) {
        setSmsChat(null);
      }
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [smsChat]);

  // Click fora do painel flutuante fecha-o
  useEffect(() => {
    if (!recentPanel) return;
    function onMouseDown(e: MouseEvent) {
      if (floatingRef.current && !floatingRef.current.contains(e.target as Node)) {
        setRecentPanel(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [recentPanel]);

  const recentClients = recentIds
    .map(id => clients.find(c => c.id === id))
    .filter(Boolean) as DebtClient[];

  const filtered = clients.filter(c =>
    c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.movitelNumber.includes(searchQuery) ||
    c.vodacomNumber.includes(searchQuery) ||
    (c.email ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendentes = filtered.filter(c => c.status === 'Pendente');
  const liquidados = filtered.filter(c => c.status === 'Liquidado');

  function openSms(client: DebtClient) {
    const defaultNumber = client.movitelNumber || client.vodacomNumber;
    setSmsChat({
      client,
      selectedNumber: defaultNumber,
      message: language === 'en'
        ? `Dear ${client.fullName}, we remind you that you have a pending balance with our company. Please contact us to regularize your situation.`
        : `Caro(a) ${client.fullName}, lembramos que tem um saldo pendente na nossa empresa. Por favor entre em contacto para regularizar a sua situação.`,
    });
    // Guardar em recentes
    const updated = [client.id, ...recentIds.filter(id => id !== client.id)].slice(0, 5);
    setRecentIds(updated);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    setRecentPanel(false);
  }

  function sendSms() {
    if (!smsChat) return;
    const num = smsChat.selectedNumber.replace(/\s/g, '');
    const body = encodeURIComponent(smsChat.message);
    window.open(`sms:${num}?body=${body}`, '_blank');
    setSmsChat(null);
  }

  function sendWhatsApp() {
    if (!smsChat) return;
    const num = smsChat.selectedNumber.replace(/[\s+]/g, '');
    const body = encodeURIComponent(smsChat.message);
    window.open(`https://wa.me/${num}?text=${body}`, '_blank');
    setSmsChat(null);
  }

  return (
    <div className="space-y-6 animation-fade-in text-left">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-display">
            {language === 'en' ? 'Pending Clients' : 'Clientes com Contas Pendentes'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'en'
              ? 'Manage clients with outstanding balances and send payment reminders via SMS.'
              : 'Gestão de clientes com saldos em dívida e envio de lembretes de pagamento via SMS.'}
          </p>
        </div>
        <button
          onClick={onNewClient}
          className="px-5 py-2.5 bg-primary hover:bg-primary-container text-white font-semibold text-xs rounded flex items-center gap-2 transition-smooth cursor-pointer shadow-sm active:scale-98"
        >
          <Plus size={15} />
          <span>{language === 'en' ? 'Add Client' : 'Adicionar Cliente'}</span>
        </button>
      </div>

      {/* Stats row */}
      <div className="flex gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-10 py-5 text-center">
          <p className="text-3xl font-black text-amber-700">{pendentes.length}</p>
          <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mt-1">
            {language === 'en' ? 'Pending' : 'Pendentes'}
          </p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-10 py-5 text-center">
          <p className="text-3xl font-black text-emerald-700">{liquidados.length}</p>
          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mt-1">
            {language === 'en' ? 'Settled' : 'Liquidados'}
          </p>
        </div>
      </div>

      {/* Client cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-14 bg-white border border-slate-200 rounded-xl shadow-xs">
          <UserRound size={36} className="mx-auto text-slate-300 mb-3" />
          <p className="text-xs font-bold text-slate-400">
            {language === 'en' ? 'No clients found' : 'Nenhum cliente encontrado'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(client => (
            <div
              key={client.id}
              className={`bg-white border rounded-xl p-5 shadow-xs flex flex-col gap-4 transition-all hover:shadow-sm ${
                client.status === 'Pendente'
                  ? 'border-amber-200'
                  : 'border-emerald-200 opacity-75'
              }`}
            >
              {/* Card header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-extrabold text-sm uppercase ${
                    client.status === 'Pendente'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {client.fullName.split(' ').map(p => p[0]).join('').substring(0, 2)}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide leading-tight">
                      {client.fullName}
                    </h4>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold mt-0.5 ${
                      client.status === 'Pendente' ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      {client.status === 'Pendente'
                        ? <><Clock size={10} />{language === 'en' ? 'Pending' : 'Pendente'}</>
                        : <><CheckCircle2 size={10} />{language === 'en' ? 'Settled' : 'Liquidado'}</>
                      }
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onDeleteClient(client.id)}
                  className="text-slate-300 hover:text-red-400 p-1 rounded transition-colors cursor-pointer flex-shrink-0"
                  title={language === 'en' ? 'Delete' : 'Eliminar'}
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Contact numbers */}
              <div className="space-y-1.5 text-[11px] text-slate-600">
                {client.movitelNumber && (
                  <div className="flex items-center gap-2">
                    <span className="w-14 font-bold text-[9px] uppercase tracking-wider text-slate-400">Movitel</span>
                    <Phone size={11} className="text-blue-400" />
                    <span className="font-mono">{client.movitelNumber}</span>
                  </div>
                )}
                {client.vodacomNumber && (
                  <div className="flex items-center gap-2">
                    <span className="w-14 font-bold text-[9px] uppercase tracking-wider text-slate-400">Vodacom</span>
                    <Phone size={11} className="text-red-400" />
                    <span className="font-mono">{client.vodacomNumber}</span>
                  </div>
                )}
                {client.email && (
                  <div className="flex items-center gap-2">
                    <span className="w-14 font-bold text-[9px] uppercase tracking-wider text-slate-400">Email</span>
                    <Mail size={11} className="text-slate-400" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-start gap-2 mt-2">
                    <MapPin size={11} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-500">{client.address}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => openSms(client)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold rounded transition-colors cursor-pointer ${
                    smsChat?.client.id === client.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                  }`}
                >
                  <MessageSquare size={11} />
                  SMS
                </button>
                {client.status === 'Pendente' && (
                  <button
                    onClick={() => onMarkLiquidado(client.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded transition-colors cursor-pointer"
                  >
                    <CheckCircle2 size={11} />
                    {language === 'en' ? 'Settle' : 'Liquidar'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Botão flutuante de chat + painel de recentes */}
      {!smsChat && (
        <div ref={floatingRef} className="fixed bottom-20 right-5 z-40 flex flex-col items-end gap-2">

          {/* Painel de conversas recentes */}
          {recentPanel && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-64 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {language === 'en' ? 'Recent chats' : 'Conversas recentes'}
                </span>
                <button
                  onClick={() => setRecentPanel(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>

              {recentClients.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <MessageSquare size={22} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-[11px] text-slate-400">
                    {language === 'en'
                      ? 'No recent chats yet.\nClick SMS on a client card to start.'
                      : 'Nenhuma conversa ainda.\nClique em SMS num cartão de cliente.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
                  {recentClients.map(client => (
                    <button
                      key={client.id}
                      onClick={() => openSms(client)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-extrabold flex-shrink-0 uppercase ${
                        client.status === 'Pendente'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {client.fullName.split(' ').map(p => p[0]).join('').substring(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">{client.fullName}</p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">
                          {client.movitelNumber || client.vodacomNumber}
                        </p>
                      </div>
                      <span className={`text-[9px] font-bold flex-shrink-0 ${
                        client.status === 'Pendente' ? 'text-amber-500' : 'text-emerald-500'
                      }`}>
                        {client.status === 'Pendente'
                          ? (language === 'en' ? 'Pending' : 'Pendente')
                          : (language === 'en' ? 'Settled' : 'Liquidado')}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Botão flutuante */}
          <button
            onClick={() => setRecentPanel(prev => !prev)}
            title={language === 'en' ? 'Recent chats' : 'Conversas recentes'}
            className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all cursor-pointer ${
              recentPanel
                ? 'bg-slate-800 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {recentPanel ? <X size={18} /> : <MessageSquare size={20} />}
          </button>
        </div>
      )}

      {/* SMS Chat Sidebar */}
      <div
        ref={chatSidebarRef}
        className={`fixed top-0 right-0 h-full z-50 flex flex-col bg-white border-l border-slate-200 shadow-2xl transition-all duration-300 ease-in-out ${
          smsChat ? 'w-80 translate-x-0' : 'w-80 translate-x-full'
        }`}
      >
        {smsChat && (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-900 text-white flex-shrink-0">
              <button
                onClick={() => setSmsChat(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer flex-shrink-0"
              >
                <ChevronRight size={18} />
              </button>
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-extrabold text-xs uppercase flex-shrink-0">
                {smsChat.client.fullName.split(' ').map(p => p[0]).join('').substring(0, 2)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold leading-tight truncate">{smsChat.client.fullName}</p>
                <p className="text-[10px] text-slate-400 font-mono truncate">{smsChat.selectedNumber}</p>
              </div>
            </div>

            {/* Number selector */}
            {(smsChat.client.movitelNumber && smsChat.client.vodacomNumber) && (
              <div className="flex border-b border-slate-100 flex-shrink-0">
                <button
                  onClick={() => setSmsChat(prev => prev ? { ...prev, selectedNumber: prev.client.movitelNumber } : prev)}
                  className={`flex-1 py-2 text-[10px] font-bold transition-colors cursor-pointer ${
                    smsChat.selectedNumber === smsChat.client.movitelNumber
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Phone size={10} className="inline mr-1" />
                  Movitel
                </button>
                <button
                  onClick={() => setSmsChat(prev => prev ? { ...prev, selectedNumber: prev.client.vodacomNumber } : prev)}
                  className={`flex-1 py-2 text-[10px] font-bold transition-colors cursor-pointer ${
                    smsChat.selectedNumber === smsChat.client.vodacomNumber
                      ? 'text-red-600 border-b-2 border-red-600 bg-red-50'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Phone size={10} className="inline mr-1" />
                  Vodacom
                </button>
              </div>
            )}

            {/* Chat bubble area */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 flex flex-col justify-end gap-3">
              <div className="flex flex-col items-end gap-1">
                <div className="max-w-[85%] bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-xs leading-relaxed shadow-sm">
                  {smsChat.message || (
                    <span className="opacity-50 italic">
                      {language === 'en' ? 'Type your message below…' : 'Escreva a mensagem abaixo…'}
                    </span>
                  )}
                </div>
                <p className="text-[9px] text-slate-400 pr-1">
                  {language === 'en' ? 'You · now' : 'Você · agora'} · {smsChat.message.length} chars
                </p>
              </div>
            </div>

            {/* Input area */}
            <div className="flex-shrink-0 border-t border-slate-200 bg-white px-3 pt-3 pb-24 space-y-2">
              <textarea
                rows={3}
                value={smsChat.message}
                onChange={e => setSmsChat(prev => prev ? { ...prev, message: e.target.value } : prev)}
                placeholder={language === 'en' ? 'Write your message…' : 'Escreva a sua mensagem…'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-400 resize-none leading-relaxed"
              />
              <div className="flex gap-2">
                <button
                  onClick={sendSms}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-xl transition-colors cursor-pointer"
                >
                  <Send size={12} />
                  SMS
                </button>
                <button
                  onClick={sendWhatsApp}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-xl transition-colors cursor-pointer"
                >
                  <MessageSquare size={12} />
                  WhatsApp
                </button>
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
