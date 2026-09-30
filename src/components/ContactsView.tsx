/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Contact, Language } from '../types';
import { Users, Plus, Mail, Phone, Building, Search, UserCheck, Trash2 } from 'lucide-react';
import * as db from '../lib/db';
import DeleteConfirmModal from './DeleteConfirmModal';

interface ContactsViewProps {
  contacts: Contact[];
  setContacts: (contacts: Contact[]) => void;
  language: Language;
  onNewContact: () => void;
  searchQuery: string;
}

export default function ContactsView({
  contacts,
  setContacts,
  language,
  onNewContact,
  searchQuery
}: ContactsViewProps) {

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  const handleDeleteContact = async () => {
    if (!deleteTarget) return;
    await db.deleteContact(deleteTarget.id);
    setContacts(contacts.filter(c => c.id !== deleteTarget.id));
  };

  const filteredContacts = contacts.filter(c => {
    return c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
           c.email.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <>
    <DeleteConfirmModal
      isOpen={!!deleteTarget}
      onClose={() => setDeleteTarget(null)}
      onConfirm={handleDeleteContact}
      language={language}
      documentLabel={deleteTarget?.label ?? ''}
    />
    <div className="space-y-6 animation-fade-in text-left">

      {/* Directory Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-display">
            {language === 'en' ? 'Enterprise Directory' : 'Contactos da Empresa'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'en'
              ? 'Synchronized listing of primary partners, trade credit clients, and regional procurement agents.'
              : 'Directório unificado de parceiros, clientes comerciais e agentes de procurement regional.'
            }
          </p>
        </div>
        
        <button
          onClick={onNewContact}
          className="px-5 py-2.5 bg-primary hover:bg-primary-container text-white font-semibold text-xs rounded flex items-center gap-2 transition-smooth cursor-pointer shadow-sm active:scale-98"
        >
          <Plus size={15} />
          <span>{language === 'en' ? 'New Contact' : 'Adicionar Contacto'}</span>
        </button>
      </div>



      {/* Contact Grid panel layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredContacts.length > 0 ? (
          filteredContacts.map((c) => (
            <div 
              key={c.id} 
              className="bg-white dark:bg-slate-900 p-5 rounded border border-slate-205 dark:border-slate-800 shadow-xs hover:shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-smooth flex flex-col justify-between"
            >
              <div>
                {/* Person Header */}
                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                  <div className={`w-10 h-10 rounded ${c.avatarColor} text-white font-extrabold text-sm flex items-center justify-center uppercase shadow-sm`}>
                    {c.name.split(' ').map(part => part[0]).join('')}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-primary dark:text-white uppercase tracking-wide font-display">
                      {c.name}
                    </h4>
                    <span className="text-[10px] text-slate-550 font-semibold block mt-0.5">
                      {language === 'en' ? c.role : c.rolePt}
                    </span>
                  </div>
                </div>

                {/* Details list */}
                <div className="space-y-2.5 text-[11px] text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <Building size={12} className="text-slate-400" />
                    <span className="font-bold text-slate-700 dark:text-slate-300">{c.company}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={12} className="text-slate-400" />
                    <span className="truncate" title={c.email}>{c.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={12} className="text-slate-400" />
                    <span>{c.phone}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons inside card */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`mailto:${c.email}`}
                    className="py-1.5 px-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-center rounded text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-smooth"
                  >
                    {language === 'en' ? 'Email Client' : 'Enviar E-mail'}
                  </a>
                  <button
                    onClick={() => alert(`Reviewing trade logs of ${c.name} associated with ${c.company}...`)}
                    className="py-1.5 px-3 bg-secondary/10 text-secondary hover:bg-secondary/20 text-center rounded text-[10px] font-bold transition-smooth cursor-pointer"
                  >
                    {language === 'en' ? 'History Logs' : 'Ver Histórico'}
                  </button>
                </div>
                <button
                  onClick={() => setDeleteTarget({ id: c.id, label: c.name })}
                  className="w-full py-1.5 px-3 bg-slate-50 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded text-[10px] font-bold transition-smooth cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={11} />
                  {language === 'en' ? 'Delete Contact' : 'Eliminar Contacto'}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-slate-400 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded shadow-xs">
            <Users size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-bold">{language === 'en' ? 'No Contacts Found' : 'Nenhum Contacto Localizado'}</p>
          </div>
        )}
      </div>

    </div>
    </>
  );
}
