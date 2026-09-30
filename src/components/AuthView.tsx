import RecoveryDialog from './RecoveryDialog';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Mail, Lock, User, Check, AlertCircle, Languages } from 'lucide-react';
import { Language } from '../types';
import { localClient } from '../lib/localClient';

interface AuthViewProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  onLoginSuccess: (email: string) => void;
}

export default function AuthView({
  language,
  setLanguage,
  onLoginSuccess
}: AuthViewProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isLogin) {
        // LOGIN FLOW
        const { data, error: signInError } = await localClient.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError || !data.user) {
          setError(
            language === 'en'
              ? 'Invalid email or password.'
              : 'E-mail ou senha inválidos.'
          );
        } else {
          onLoginSuccess(data.user.email ?? email);
        }
      } else {
        // SIGNUP FLOW
        if (!name.trim()) {
          setError(language === 'en' ? 'Name is required.' : 'O nome é obrigatório.');
          setLoading(false);
          return;
        }
        if (!email.trim()) {
          setError(language === 'en' ? 'Email is required.' : 'O e-mail é obrigatório.');
          setLoading(false);
          return;
        }
        if (password.length < 8) {
          setError(
            language === 'en'
              ? 'Password must be at least 8 characters.'
              : 'A senha deve conter pelo menos 8 caracteres.'
          );
          setLoading(false);
          return;
        }

        const { data: signUpData, error: signUpError } = await localClient.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() } },
        });

        if (signUpError) {
          setError(signUpError.message);
        } else {
          window.alert((language === 'en' ? 'Keep this recovery code in a safe place: ' : 'Guarde este código de recuperação num local seguro: ') + signUpData.recoveryCode);
          setSuccessMsg(
            language === 'en'
              ? 'Registration successful! You can now log in.'
              : 'Cadastro realizado com sucesso! Pode iniciar sessão agora.'
          );
          setName('');
          setIsLogin(true);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unexpected error.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'pt' : 'en');
  };

  return (
    <div id="auth-screen-container" className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex flex-col justify-between p-6 md:p-12 transition-colors">

      {/* Top bar with language selection */}
      <div className="w-full max-w-7xl mx-auto flex justify-end items-center">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all font-semibold"
          title="Mudar Idioma / Switch Language"
        >
          <Languages size={14} className="text-slate-500" />
          <span>{language === 'en' ? 'Português' : 'English'}</span>
        </button>
      </div>

      {/* Main Container Card */}
      <div className="w-full max-w-[28rem] mx-auto my-auto animation-scale-up">

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">

          <div className="mb-8 text-center">
            <h2 className="text-xl font-extrabold text-[#111] dark:text-white tracking-tight">
              {isLogin
                ? (language === 'en' ? 'Sign In' : 'Iniciar Sessão')
                : (language === 'en' ? 'Create Account' : 'Registar Conta')
              }
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {isLogin
                ? (language === 'en' ? 'Enter credentials below' : 'Introduza os dados de acesso')
                : (language === 'en' ? 'Fill form below to register' : 'Preencha os campos de registo')
              }
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4 text-left">
            {error && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-400 text-xs flex gap-2 items-start">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-xl text-emerald-800 dark:text-emerald-400 text-xs flex gap-2 items-start animate-fade-in">
                <Check size={15} className="flex-shrink-0 mt-0.5 text-emerald-600" />
                <span className="font-semibold">{successMsg}</span>
              </div>
            )}

            {!isLogin && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  {language === 'en' ? 'Full Name' : 'Nome Completo'}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <User size={15} />
                  </span>
                  <input
                    id="auth-register-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={language === 'en' ? 'Your Name' : 'Seu Nome Completo'}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-secondary transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                E-mail
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail size={15} />
                </span>
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@empresa.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-secondary transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                {language === 'en' ? 'Password' : 'Senha / Palavra-passe'}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock size={15} />
                </span>
                <input
                  id="auth-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={language === 'en' ? 'Password' : 'Sua senha'}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-secondary transition-all"
                />
              </div>
            </div>

            <button
              id="auth-btn-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary hover:bg-indigo-900 text-white font-bold text-xs rounded-xl shadow-md transition-all uppercase tracking-wider cursor-pointer active:scale-98 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading
                ? (language === 'en' ? 'Please wait...' : 'Aguarde...')
                : isLogin
                  ? (language === 'en' ? 'Access System' : 'Aceder ao Sistema')
                  : (language === 'en' ? 'Finish Register' : 'Finalizar Registo')
              }
            </button>
          </form>

          {/* Tab Switcher / Toggle */}
          <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-5 text-center">
            <button
              id="auth-btn-toggle"
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setSuccessMsg(null);
              }}
              className="text-xs font-semibold text-secondary hover:underline cursor-pointer"
            >
              {isLogin
                ? (language === 'en' ? "Create a local account" : "Não tem conta? Crie uma conta local")
                : (language === 'en' ? 'Already have an account? Sign In' : 'Já tem conta? Inicie Sessão')
              }
            </button>
          </div>

        </div>

      </div>

      <RecoveryDialog language={language} />
      {/* Footer copyright and credit information */}
      <div className="w-full text-center text-[10px] text-slate-400">
        <div>© 2026 Limitless, Lda. {language === 'en' ? 'All rights reserved.' : 'Todos os direitos reservados.'}</div>
        <div className="mt-1 text-slate-300 dark:text-slate-800 font-mono">Processado por Computador • Gestão Comercial ERP Código AT/MZ</div>
      </div>

    </div>
  );
}
