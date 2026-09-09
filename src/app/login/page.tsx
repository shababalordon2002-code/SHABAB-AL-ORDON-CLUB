'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, LogIn, AlertCircle, Sparkles, UserPlus, User, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes('failed to fetch') || msg.includes('fetch failed')) {
            setError('No se pudo conectar con Supabase. Revisa que hayas añadido tu URL y Anon Key reales en el archivo .env.local.');
          } else if (msg.includes('email not confirmed')) {
            setError('Tu correo aún no está confirmado en Supabase. Para solucionarlo sin confirmación por correo: ve a tu panel de Supabase -> Authentication -> Providers -> Email -> Desactiva "Confirm email".');
          } else if (msg.includes('invalid login credentials')) {
            setError('Correo electrónico o contraseña incorrectos. Si aún no has registrado esta cuenta en tu proyecto Supabase, utiliza la pestaña "Crear Cuenta".');
          } else {
            setError(error.message);
          }
          setLoading(false);
          return;
        }

        if (data.session) {
          window.location.href = '/';
        }
      } else {
        // Sign Up with auto-confirmation via admin endpoint if service role key is present
        let signupSuccess = false;

        try {
          const apiRes = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, full_name: fullName }),
          });

          const apiData = await apiRes.json();

          if (apiRes.ok) {
            signupSuccess = true;
          } else {
            // Fallback to client signup if API route didn't work
            const { error: clientError } = await supabase.auth.signUp({
              email,
              password,
              options: {
                data: {
                  full_name: fullName || email.split('@')[0],
                  role: 'user',
                },
              },
            });
            if (clientError) {
              setError(clientError.message);
              setLoading(false);
              return;
            }
            signupSuccess = true;
          }
        } catch {
          // Fallback to client signup
          const { error: clientError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName || email.split('@')[0],
                role: 'user',
              },
            },
          });

          if (clientError) {
            setError(clientError.message);
            setLoading(false);
            return;
          }
          signupSuccess = true;
        }

        if (signupSuccess) {
          // Attempt immediate login
          const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (loginError) {
            if (loginError.message.toLowerCase().includes('email not confirmed')) {
              setMessage('¡Cuenta creada! Para acceder de inmediato sin confirmar correo, ve a Supabase -> Authentication -> Providers -> Email y desactiva "Confirm email".');
              setMode('login');
            } else {
              setMessage('¡Cuenta registrada exitosamente! Inicia sesión a continuación.');
              setMode('login');
            }
          } else if (loginData.session) {
            setMessage('¡Cuenta creada y sesión iniciada!');
            setTimeout(() => {
              router.push('/');
              router.refresh();
            }, 1000);
          }
        }
      }
    } catch (err: any) {
      if (err?.message?.toLowerCase().includes('failed to fetch')) {
        setError('No se pudo conectar con Supabase. Revisa las claves en el archivo .env.local.');
      } else {
        setError('Ocurrió un error inesperado al procesar la solicitud.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-center items-center p-4 relative overflow-hidden"
      style={{ background: '#0b0f17', minHeight: '100vh' }}
    >
      {/* Moving Background Image */}
      <div 
        className="absolute -inset-[10%] bg-cover bg-center bg-no-repeat animate-slow-pan z-0"
        style={{ backgroundImage: "url('/login-bg.png')" }}
      ></div>

      {/* Background Overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: 'rgba(11,15,23,0.55)' }}></div>
      
      {/* Dynamic Background Effects */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-red-600/30 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-amber-500/30 rounded-full blur-[100px] pointer-events-none z-0" />

      <div className="w-full max-w-md z-10 relative">
        {/* Header Branding with Official Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-28 h-28 sm:w-40 sm:h-40 rounded-3xl bg-gradient-to-tr from-red-600 to-amber-500 p-1 mb-4 shadow-2xl shadow-red-950/40">
            <div className="w-full h-full bg-slate-950/80 backdrop-blur-sm rounded-[22px] flex items-center justify-center p-4">
              <img
                src="/logo.png"
                alt="Shabab Al Ordon Club Logo"
                className="w-full h-full object-contain drop-shadow-xl"
              />
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-100 tracking-tight">
            Shabab Al Ordon Club
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">
            Plataforma de Análisis e Inteligencia Deportiva
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/40 border border-slate-800/50 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/50">
          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); setMessage(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'login'
                  ? 'bg-slate-800 text-amber-400 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Iniciar Sesión</span>
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); setMessage(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'signup'
                  ? 'bg-slate-800 text-amber-400 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Crear Cuenta</span>
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-100">
              {mode === 'login' ? 'Iniciar Sesión' : 'Crear Nueva Cuenta'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {mode === 'login'
                ? 'Introduce tus credenciales para acceder a la plataforma'
                : 'Crea tu cuenta introduciendo tu correo y la contraseña que deseas asignar'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 bg-red-950/60 border border-red-800/80 rounded-xl flex items-start gap-3 text-red-200 text-xs leading-relaxed">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="mb-6 p-3.5 bg-emerald-950/60 border border-emerald-800/80 rounded-xl flex items-start gap-3 text-emerald-200 text-xs leading-relaxed">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Nombre Completo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ej. Administrador"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Shababalordon2002@gmail.com"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                {mode === 'login' ? 'Contraseña' : 'Nueva Contraseña (mínimo 6 caracteres)'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-red-950/40 focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-6 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : mode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Acceder a la Plataforma</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Registrar Cuenta</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                router.push('/');
                router.refresh();
              }}
              className="w-full py-2.5 px-4 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 font-semibold rounded-xl text-sm border border-slate-700/60 transition-all flex items-center justify-center gap-2 mt-3 cursor-pointer"
            >
              <span>Acceder en Modo Local / Demo (Sin Supabase)</span>
            </button>
          </form>

          {/* Info Badge */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-950/50 px-3 py-1.5 rounded-full border border-slate-800">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Autenticación con Supabase Auth / Modo Demo Local</span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          © {new Date().getFullYear()} Shabab Al Ordon Club. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
