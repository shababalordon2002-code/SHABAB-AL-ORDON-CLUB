'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  Mail,
  Lock,
  User,
  ShieldCheck,
  Eye,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  UserPlus,
} from 'lucide-react';
import { UserRole } from '@/types/auth';

function RegistroFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRole = searchParams.get('role');
  
  const assignedRole: UserRole = rawRole === 'analyst' ? 'analyst' : 'viewer';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    // Force clear inputs on mount to prevent aggressive browser autofill of saved admin credentials
    setEmail('');
    setPassword('');
    setFullName('');
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // 1. Try server signup API with assigned role
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          full_name: fullName.trim(),
          role: assignedRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Fallback to client signup if API server role key isn't configured
        const { error: clientErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim() || email.split('@')[0],
              role: assignedRole,
            },
          },
        });

        if (clientErr) {
          throw new Error(clientErr.message);
        }
      }

      // 2. Sign in immediately
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInErr) {
        setSuccessMsg(
          `¡Registro de ${assignedRole === 'analyst' ? 'Analista' : 'Visor'} completado! Ya puedes iniciar sesión con tus credenciales.`
        );
        setTimeout(() => router.push('/login'), 2500);
      } else {
        setSuccessMsg(`¡Bienvenido! Sesión iniciada correctamente como ${assignedRole === 'analyst' ? 'Analista' : 'Visor'}.`);
        setTimeout(() => {
          window.location.href = '/';
        }, 1200);
      }
    } catch (err: any) {
      setError(err.message || 'Error al completar el registro.');
    } finally {
      setLoading(false);
    }
  };

  const isAnalyst = assignedRole === 'analyst';

  return (
    <div className="w-full max-w-md z-10 relative">
      {/* Back Link */}
      <div className="mb-4">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al inicio de sesión</span>
        </Link>
      </div>

      {/* Branding Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 p-0.5 mb-3 shadow-xl shadow-red-950/40">
          <div className="w-full h-full bg-slate-950/90 backdrop-blur-sm rounded-[14px] flex items-center justify-center p-3">
            <img src="/logo.png" alt="Shabab Al Ordon Logo" className="w-16 h-16 object-contain drop-shadow" />
          </div>
        </div>
        <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Shabab Al Ordon Club</h1>
        <p className="text-xs text-slate-400 mt-0.5">Plataforma de Inteligencia Deportiva</p>
      </div>

      {/* Main Card */}
      <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-2xl p-6 sm:p-7 shadow-2xl shadow-black/50 space-y-5">
        {/* Role Badge Banner */}
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 text-xs leading-relaxed ${
            isAnalyst
              ? 'bg-blue-950/40 border-blue-800/60 text-blue-200'
              : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
          }`}
        >
          {isAnalyst ? (
            <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          ) : (
            <Eye className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div>
            <span className="font-extrabold text-sm block mb-0.5">
              {isAnalyst ? 'Registro de Analista Deportivo' : 'Registro de Visor (Solo Lectura)'}
            </span>
            <p className="text-[11px] text-slate-300">
              {isAnalyst
                ? 'Con esta invitación registrarás una cuenta con permisos para crear análisis, utilizar la Botonera Live y configurar pizarras.'
                : 'Con esta invitación registrarás una cuenta de visor. Podrás consultar los Dashboards, la plantilla de Jugadores y la información de los Partidos.'}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-red-950/60 border border-red-800/80 rounded-xl flex items-start gap-2.5 text-red-200 text-xs">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-950/60 border border-emerald-800/80 rounded-xl flex items-start gap-2.5 text-emerald-200 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleRegister} autoComplete="off" className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Nombre Completo</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                required
                autoComplete="off"
                name="new_full_name"
                placeholder="Ej. Carlos Pérez"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Correo Electrónico</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                required
                autoComplete="off"
                name="new_user_email"
                placeholder="analista@shababalordon.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Contraseña (Mínimo 6 caracteres)</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                name="new_user_password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 text-slate-950 font-black rounded-xl text-sm shadow-lg transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer ${
              isAnalyst
                ? 'bg-gradient-to-r from-blue-500 to-indigo-400 hover:from-blue-400 hover:to-indigo-300 shadow-blue-950/40'
                : 'bg-gradient-to-r from-emerald-500 to-amber-400 hover:from-emerald-400 hover:to-amber-300 shadow-emerald-950/40'
            }`}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <UserPlus className="w-4 h-4 stroke-[3]" />
                <span>Completar Registro de {isAnalyst ? 'Analista' : 'Visor'}</span>
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-400">
            ¿Ya tienes una cuenta registradada?{' '}
            <Link href="/login" className="text-amber-400 font-bold hover:underline">
              Iniciar Sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegistroPage() {
  return (
    <div
      className="min-h-screen flex flex-col justify-center items-center p-4 relative overflow-hidden"
      style={{ background: '#0b0f17', minHeight: '100vh' }}
    >
      <div
        className="absolute -inset-[10%] bg-cover bg-center bg-no-repeat animate-slow-pan z-0 opacity-40 pointer-events-none"
        style={{ backgroundImage: "url('/login-bg.png')" }}
      ></div>

      <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: 'rgba(11,15,23,0.65)' }}></div>

      <Suspense
        fallback={
          <div className="text-center text-slate-400 text-xs z-10 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span>Cargando formulario de registro…</span>
          </div>
        }
      >
        <RegistroFormContent />
      </Suspense>
    </div>
  );
}
