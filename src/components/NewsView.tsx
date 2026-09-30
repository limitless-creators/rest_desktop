/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Newspaper, ChevronRight, MessageSquareCode, CheckSquare, Keyboard, Send, Github, HelpCircle } from 'lucide-react';
import { Language } from '../types';

interface NewsViewProps {
  language: Language;
  triggerToast: (title: string, titlePt: string, desc: string, descPt: string, type: 'success' | 'info') => void;
}

export default function NewsView({ language, triggerToast }: NewsViewProps) {
  const [feedback, setFeedback] = useState('');
  
  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    
    // Fire success toast
    triggerToast(
      'Feedback Registered',
      'Feedback Registado',
      'Thank you! Your feedback has been securely synced with the core dev team.',
      'Obrigado! O seu feedback foi enviado com sucesso para a equipa de engenharia.',
      'success'
    );
    setFeedback('');
  };

  const bugFixes = language === 'en' ? [
    { title: 'Null SKU Parsing', desc: 'Resolved an exception raised on empty invoice categories.' },
    { title: 'Portuguese UTF-8', desc: 'Corrected encoding on receipt labels and regional descriptions.' },
    { title: 'M-Pesa Webhooks', desc: 'Optimized callback listeners for near instant receipts rendering.' }
  ] : [
    { title: 'Tratamento de SKU Nulos', desc: 'Resolvida uma exceção gerada para categorias de facturas vazias.' },
    { title: 'Acentos UTF-8 PT', desc: 'Correcção de codificação de caracteres em recibos e descrições regionais.' },
    { title: 'Webhooks do M-Pesa', desc: 'Otimização de ouvintes de retorno para processamento de recibos em tempo real.' }
  ];

  return (
    <div className="space-y-6 animation-fade-in text-left font-playfair">
      
      {/* Title block */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-display">
          {language === 'en' ? 'News & System Releases' : 'Notícias & Notas de Versão'}
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {language === 'en'
            ? 'Stay informed with the latest releases, security upgrades, and functional optimizations.'
            : 'Fique informado sobre os últimos lançamentos, atualizações de segurança e melhorias funcionais.'
          }
        </p>
      </div>

      {/* Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Hero and Subarticles */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Hero Feature Card */}
          <div className="bg-[#0c1c48] text-slate-100 rounded overflow-hidden border border-[#24325e]/30 shadow-xs flex flex-col md:flex-row">
            
            {/* Visual content mockup from screenshot */}
            <div className="md:w-1/2 p-6 flex flex-col justify-between text-left space-y-4">
              <div>
                <span className="bg-[#fe4687]/5 bg-secondary-container/10 text-[#fec487] border border-[#794f1d]/40 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded">
                  {language === 'en' ? 'LATEST UPGRADE' : 'ÚLTIMA ACTUALIZAÇÃO'}
                </span>
                
                <h3 className="text-lg font-extrabold text-white mt-4 leading-tight font-display">
                  {language === 'en' 
                    ? 'Automatic Invoice Billing & Reconciliation is now live.' 
                    : 'A Cobrança Automática e Engenharia de Reconciliação Bancária está agora ativa.'
                  }
                </h3>
                <p className="text-xs text-slate-350 mt-2 leading-relaxed">
                  {language === 'en'
                    ? 'Connect financial sub-ledgers directly to prompt automated email delivery and M-Pesa client receipts monitoring.'
                    : 'Ligue registros auxiliares directamente para activar o envio automático de facturas e monitorizar recibos de clientes via celular.'
                  }
                </p>
              </div>

              <div className="pt-2">
                <button 
                  onClick={() => alert('Patch Notes v2.4.0 document has been opened.')}
                  className="px-4 py-2.5 bg-[#fbf8fd] text-primary hover:bg-[#efedf1] font-bold text-xs rounded flex items-center gap-1 transition-smooth cursor-pointer active:scale-98"
                >
                  <span>{language === 'en' ? 'Read Full Patchnotes' : 'Ler Notas da Versão'}</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Hotlinked Image container (Mockup on dashboard) */}
            <div className="md:w-1/2 bg-[#0c1c48]/30 p-4 flex items-center justify-center border-l border-[#24325e]/30 relative overflow-hidden group">
              <img 
                src={new URL("../assets/Logo.webp", import.meta.url).href} 
                alt="Cobrança Automática Mockup" 
                className="w-full h-48 object-cover rounded border border-[#24325e]/50 shadow-sm select-none pointer-events-none group-hover:scale-102 transition-transform duration-300"
              />
            </div>

          </div>

          {/* Secondary News articles grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Card 1 */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded border border-slate-205 dark:border-slate-800 shadow-xs text-left flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-bold text-slate-400 font-display">SECURITY AUDIT</span>
                <h4 className="font-bold text-xs text-primary dark:text-slate-200 mt-2 leading-relaxed font-display">
                  {language === 'en'
                    ? 'Sub-ledger communication channels hardened with TLS 1.3 encryption.'
                    : 'Canais de comunicação de registros auxiliares fortalecidos com encriptação TLS 1.3.'
                  }
                </h4>
                <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                  {language === 'en'
                    ? 'All programmatic data calls between NYC and Beira hubs are fully wrapped in certified secure streams.'
                    : 'Todas as chamadas de dados programáticos entre os hubs de Maputo e da Beira estão blindadas em fluxos seguros.'
                  }
                </p>
              </div>
              <button 
                onClick={() => alert('Launching cryptographic audit guidelines...')}
                className="text-secondary hover:text-[#794f1d] text-[10px] font-extrabold mt-4 hover:underline text-left block cursor-pointer"
              >
                {language === 'en' ? 'Learn More' : 'Saber Mais'}
              </button>
            </div>

            {/* Card 2 */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded border border-slate-205 dark:border-slate-800 shadow-xs text-left flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-bold text-slate-400 font-display">XML INTEGRATION</span>
                <h4 className="font-bold text-xs text-primary dark:text-slate-200 mt-2 leading-relaxed font-display">
                  {language === 'en'
                    ? 'XML purchase ingestion capability added for regional suppliers.'
                    : 'Adicionada capacidade de ingestão de facturas em XML para fornecedores.'
                  }
                </h4>
                <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                  {language === 'en'
                    ? 'Seamlessly parse multi-line items from invoice formats directly into local stock records instantly.'
                    : 'Analise e adicione itens multi-linha de formatos de facturas directamente nos registros de stock locais.'
                  }
                </p>
              </div>
              <button 
                onClick={() => alert('Launching supplier API docs...')}
                className="text-secondary hover:text-[#794f1d] text-[10px] font-extrabold mt-4 hover:underline text-left block cursor-pointer"
              >
                {language === 'en' ? 'Learn More' : 'Saber Mais'}
              </button>
            </div>

          </div>

        </div>

        {/* Right Columns: Bug fixes & Sticky tools */}
        <div className="space-y-6">
          
          {/* Bug Fix Box */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded border border-slate-205 dark:border-slate-800 shadow-xs text-left">
            <h4 className="font-bold text-xs text-primary dark:text-slate-200 mb-4 flex items-center gap-2 font-display">
              <CheckSquare size={14} className="text-emerald-600" />
              <span>{language === 'en' ? 'Resolved Bug Fixes' : 'Correções Concluídas'}</span>
            </h4>
            <div className="space-y-4">
              {bugFixes.map((fix, idx) => (
                <div key={idx} className="border-l-2 border-slate-205 dark:border-slate-800 pl-3">
                  <p className="font-bold text-[11px] text-slate-850 dark:text-slate-250 font-display">{fix.title}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{fix.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Keyboard Shortcuts list */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded border border-slate-205 dark:border-slate-800 shadow-xs text-left">
            <h4 className="font-bold text-xs text-primary dark:text-slate-200 mb-4 flex items-center gap-2 font-display">
              <Keyboard size={14} className="text-slate-500" />
              <span>{language === 'en' ? 'Keyboard Shortcut Index' : 'Atalhos do Teclado'}</span>
            </h4>
            <div className="space-y-3 font-mono text-[10px]">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-350">
                <span>{language === 'en' ? 'Global invoice' : 'Criar Factura'}</span>
                <span className="bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold border border-slate-250 dark:border-slate-700">Alt + N</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-350">
                <span>{language === 'en' ? 'Switch currency' : 'Mudar moeda'}</span>
                <span className="bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold border border-slate-250 dark:border-slate-700">Alt + C</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-350">
                <span>{language === 'en' ? 'Toggle language' : 'Mudar idioma'}</span>
                <span className="bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold border border-slate-250 dark:border-slate-700">Alt + L</span>
              </div>
            </div>
          </div>

          {/* Chat feedback card */}
          <div className="bg-[#fbf8fd] dark:bg-slate-950 p-5 rounded border border-slate-205 dark:border-slate-800 shadow-xs text-left">
            <h4 className="font-bold text-xs text-primary dark:text-slate-200 mb-2 flex items-center gap-2 font-display">
              <MessageSquareCode size={14} className="text-[#805522]" />
              <span>{language === 'en' ? 'Submit ERP Feedback' : 'Deixe o seu Feedback'}</span>
            </h4>
            <p className="text-[10px] text-slate-500 leading-normal mb-4">
              {language === 'en' 
                ? 'Help us fine-tune this enterprise system and report any regional formatting issues directly.' 
                : 'Ajude-nos a otimizar esta ferramenta corporativa e informe qualquer problema de formatação.'
              }
            </p>
            
            <form onSubmit={handleFeedbackSubmit} className="space-y-2">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                placeholder={language === 'en' ? 'Suggest feature modifications...' : 'Sugira melhorias...'}
                className="w-full p-2.5 text-[11px] placeholder:text-slate-400 bg-white dark:bg-slate-900 border border-slate-255 dark:border-slate-800 text-slate-805 dark:text-slate-202 rounded outline-none focus:ring-1 focus:ring-secondary/30 focus:border-secondary text-left leading-normal"
              />
              <button
                type="submit"
                className="py-2.5 px-4 w-full bg-primary hover:bg-[#111c3a] text-white font-bold text-xs rounded transition-smooth flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send size={11} />
                <span>{language === 'en' ? 'Send Feedback' : 'Enviar Sugestão'}</span>
              </button>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
}
