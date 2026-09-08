'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Shield,
  User as UserIcon,
  Search,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Lock,
  Mail,
  UserCheck,
  Link as LinkIcon,
  Copy,
  Check,
  Eye,
  ExternalLink,
  Share2
} from 'lucide-react';
import { UserWithProfile, UserRole } from '@/types/auth';
import { useAuth } from '@/components/providers/AuthProvider';

export default function AdminUsuariosPage() {
  const { user: currentUser, profile: currentProfile, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  
  // Modal state for creating new user
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('viewer');
  const [creatingUser, setCreatingUser] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Deleting user state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [origin, setOrigin] = useState('');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al obtener la lista de usuarios');
      }

      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/');
    }
  }, [authLoading, isAdmin, router]);

  useEffect(() => {
    if (!authLoading && isAdmin) {
      fetchUsers();
    }
  }, [authLoading, isAdmin]);

  const handleCopyLink = (role: 'analyst' | 'viewer') => {
    const link = `${origin || 'https://shababalordon.com'}/registro?role=${role}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(role);
    setSuccess(`¡Enlace de registro para ${role === 'analyst' ? 'Analistas' : 'Visores'} copiado al portapapeles!`);
    setTimeout(() => {
      setCopiedLink(null);
      setSuccess(null);
    }, 3000);
  };

  const handleRoleChange = async (userId: string, targetRole: UserRole, email: string) => {
    if (!confirm(`¿Cambiar el rol de ${email} a "${targetRole}"?`)) {
      return;
    }
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: targetRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo actualizar el rol');
      }

      setSuccess(`Rol actualizado correctamente a ${targetRole}`);
      setTimeout(() => setSuccess(null), 4000);

      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: targetRole } : u))
      );
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);
    setModalError(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          full_name: newFullName,
          role: newRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al crear el usuario');
      }

      setSuccess(`Usuario ${newEmail} creado con éxito como ${newRole}`);
      setTimeout(() => setSuccess(null), 4000);
      setIsModalOpen(false);
      setNewEmail('');
      setNewPassword('');
      setNewFullName('');
      setNewRole('viewer');

      fetchUsers();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente al usuario ${email}?`)) {
      return;
    }

    setDeletingId(userId);
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al eliminar el usuario');
      }

      setSuccess(`Usuario ${email} eliminado correctamente`);
      setTimeout(() => setSuccess(null), 4000);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(null), 4000);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const analystCount = users.filter((u) => u.role === 'analyst').length;
  const viewerCount = users.filter((u) => u.role === 'viewer' || u.role === 'user').length;

  const analystInviteLink = `${origin || 'https://shababalordon.com'}/registro?role=analyst`;
  const viewerInviteLink = `${origin || 'https://shababalordon.com'}/registro?role=viewer`;

  if (authLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400 text-sm">
        {authLoading ? 'Comprobando sesión…' : 'Acceso restringido a administradores. Redirigiendo…'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Panel de Control Administrador</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Gestión de Usuarios y Roles</h1>
          <p className="text-sm text-slate-400 mt-1">
            Administra accesos, invita a nuevos analistas y visores mediante enlace directo.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-slate-950 font-semibold rounded-xl text-sm shadow-lg shadow-red-950/30 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nuevo Usuario Directo</span>
        </button>
      </div>

      {/* Alert Notifications */}
      {error && (
        <div className="p-4 bg-red-950/60 border border-red-800/80 rounded-xl flex items-center justify-between text-red-200 text-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-800/80 rounded-xl flex items-center justify-between text-emerald-200 text-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-slate-800 rounded-lg text-slate-300">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100">{totalUsers}</div>
            <div className="text-xs text-slate-400">Total Usuarios</div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-amber-950/60 border border-amber-800/50 rounded-lg text-amber-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-400">{adminCount}</div>
            <div className="text-xs text-slate-400">Administradores</div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-950/60 border border-blue-800/50 rounded-lg text-blue-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-400">{analystCount}</div>
            <div className="text-xs text-slate-400">Analistas</div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-950/60 border border-emerald-800/50 rounded-lg text-emerald-400">
            <Eye className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400">{viewerCount}</div>
            <div className="text-xs text-slate-400">Visores (Solo Lectura)</div>
          </div>
        </div>
      </div>

      {/* SECTION: Invite & Registration Links */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <LinkIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Enlaces de Invitación y Registro Directo</span>
            </h2>
            <p className="text-xs text-slate-400">
              Copia y envía estos enlaces a los nuevos miembros. El usuario se registrará directamente con el rol seleccionado.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* 1. Invite Link for Analysts */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-sm text-blue-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Enlace para ANALISTAS DEPORTIVOS</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-bold">
                  Edición + Botonera + Dashboards
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Los analistas pueden registrar eventos con la Botonera Live, subir XMLs y crear/editar pizarras tácticas.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-2 font-mono text-xs text-slate-300">
                <input
                  readOnly
                  value={analystInviteLink}
                  className="bg-transparent w-full focus:outline-none text-slate-300 select-all"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyLink('analyst')}
                  className="flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow"
                >
                  {copiedLink === 'analyst' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink === 'analyst' ? '¡Enlace Copiado!' : 'Copiar Enlace para Analista'}</span>
                </button>

                <a
                  href={`mailto:?subject=Invitación%20Shabab%20Al%20Ordon%20-%20Analista%20Deportivo&body=Hola,%20regístrate%20como%20Analista%20Deportivo%20en%20el%20siguiente%20enlace:%20${encodeURIComponent(analystInviteLink)}`}
                  className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1 border border-slate-700 transition"
                  title="Enviar por Email"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email</span>
                </a>
              </div>
            </div>
          </div>

          {/* 2. Invite Link for Viewers */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-sm text-emerald-400">
                  <Eye className="w-4 h-4" />
                  <span>Enlace para VISORES (Solo Lectura)</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                  Dashboards + Jugadores + Partidos
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Los visores solo pueden consultar los dashboards, la plantilla de jugadores y la información de los partidos sin permisos de edición.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-2 font-mono text-xs text-slate-300">
                <input
                  readOnly
                  value={viewerInviteLink}
                  className="bg-transparent w-full focus:outline-none text-slate-300 select-all"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyLink('viewer')}
                  className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow"
                >
                  {copiedLink === 'viewer' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink === 'viewer' ? '¡Enlace Copiado!' : 'Copiar Enlace para Visor'}</span>
                </button>

                <a
                  href={`mailto:?subject=Invitación%20Shabab%20Al%20Ordon%20-%20Visor&body=Hola,%20regístrate%20como%20Visor%20para%20consultar%20los%20dashboards%20en%20el%20siguiente%20enlace:%20${encodeURIComponent(viewerInviteLink)}`}
                  className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1 border border-slate-700 transition"
                  title="Enviar por Email"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Table Control */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por email o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            onClick={fetchUsers}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refrescar</span>
          </button>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Usuario</th>
                <th className="py-3.5 px-4 font-semibold">Email</th>
                <th className="py-3.5 px-4 font-semibold">Rol</th>
                <th className="py-3.5 px-4 font-semibold">Último Acceso</th>
                <th className="py-3.5 px-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                      <span>Cargando usuarios de Supabase...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No se encontraron usuarios registrados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 uppercase">
                            {(u.full_name || u.email)?.[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                              <span>{u.full_name || 'Sin Nombre'}</span>
                              {isSelf && (
                                <span className="text-[10px] bg-slate-800 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
                                  Tú
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              ID: {u.id.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-300 font-mono text-xs">
                        {u.email}
                      </td>

                      <td className="py-3.5 px-4">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole, u.email)}
                          disabled={isSelf}
                          className={`text-xs font-medium rounded-lg px-2.5 py-1 bg-slate-950 border focus:outline-none cursor-pointer transition-colors ${
                            u.role === 'admin'
                              ? 'border-amber-500/50 text-amber-400'
                              : u.role === 'analyst'
                              ? 'border-blue-500/50 text-blue-400'
                              : u.role === 'viewer'
                              ? 'border-emerald-500/50 text-emerald-400'
                              : 'border-slate-700 text-slate-400'
                          } ${isSelf ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                          <option value="admin" className="bg-slate-900 text-amber-400">
                            Administrador
                          </option>
                          <option value="analyst" className="bg-slate-900 text-blue-400">
                            Analista Deportivo
                          </option>
                          <option value="viewer" className="bg-slate-900 text-emerald-400">
                            Visor (Solo Lectura)
                          </option>
                          <option value="user" className="bg-slate-900 text-slate-300">
                            Usuario Estándar
                          </option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        {u.last_sign_in_at
                          ? new Date(u.last_sign_in_at).toLocaleString('es-ES', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : 'Nunca'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {!isSelf && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            disabled={deletingId === u.id}
                            className="p-1.5 hover:bg-red-950/60 text-slate-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create User */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-400" />
                <h2 className="font-bold text-slate-100">Crear Nuevo Usuario</h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  placeholder="Ej. Carlos Pérez"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Correo Electrónico *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="usuario@shababalordon.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Contraseña Temporal *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Rol Asignado *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="viewer">Visor (Solo Lectura - Dashboards/Jugadores/Partidos)</option>
                  <option value="analyst">Analista Deportivo (Edición + Botonera)</option>
                  <option value="admin">Administrador del Sistema</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {creatingUser ? (
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Registrar Usuario</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
