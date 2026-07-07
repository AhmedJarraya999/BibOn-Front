'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Trash2, ChevronLeft, User, Mail, Shield } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { logout, getUser } from '@/lib/auth';
import api from '@/lib/api';
import { useToast } from '@/components/ui/toast';

export default function AccountPage() {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (u) setUser(u);
  }, []);

  const handleDeleteAccount = async () => {
    if (deleteInput !== 'SUPPRIMER') return;
    setDeleting(true);
    try {
      await api.delete('/users/me');
      logout();
    } catch {
      toast.error('Erreur lors de la suppression du compte.');
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111111] text-white">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-[#111111]/95 backdrop-blur border-b border-white/8 px-8 py-4 flex items-center justify-between">
        <Logo size="sm" variant="dark" />
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors">
          <ChevronLeft className="h-4 w-4" /> Retour
        </button>
      </div>

      <div className="mx-auto max-w-xl px-8 py-12 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-white">Paramètres du compte</h1>
          <p className="text-white/40 text-sm mt-1">Gérez votre compte et vos préférences</p>
        </div>

        {/* Profile info */}
        <div className="rounded-2xl border border-white/8 bg-white/3 p-6 space-y-4">
          <h2 className="text-sm font-bold text-white/50 uppercase tracking-wider">Profil</h2>
          {[
            { icon: <User className="h-4 w-4" />, label: 'Nom', value: user?.name ?? '—' },
            { icon: <Mail className="h-4 w-4" />, label: 'Email', value: user?.email ?? '—' },
            { icon: <Shield className="h-4 w-4" />, label: 'Rôle', value: user?.role ?? '—' },
          ].map(row => (
            <div key={row.label} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/30">
                {row.icon}
              </div>
              <div>
                <p className="text-xs text-white/30">{row.label}</p>
                <p className="text-sm font-medium text-white">{row.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Logout */}
        <div className="rounded-2xl border border-white/8 bg-white/3 p-6 space-y-4">
          <h2 className="text-sm font-bold text-white/50 uppercase tracking-wider">Session</h2>
          <button onClick={logout}
            className="flex items-center gap-3 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/60 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all">
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </button>
        </div>

        {/* Delete account */}
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 space-y-4">
          <h2 className="text-sm font-bold text-red-400/70 uppercase tracking-wider">Zone de danger</h2>
          <p className="text-sm text-white/40">
            Supprimer votre compte effacera définitivement toutes vos données, événements et inscriptions. Cette action est irréversible.
          </p>

          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-500/20 transition-all">
              <Trash2 className="h-4 w-4" />
              Supprimer mon compte
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-white/60">
                Tapez <span className="font-black text-red-400">SUPPRIMER</span> pour confirmer :
              </p>
              <input
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                placeholder="SUPPRIMER"
                className="w-full rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm font-bold text-red-400 placeholder-red-400/20 outline-none focus:border-red-500 tracking-widest [color-scheme:dark]"
              />
              <div className="flex gap-3">
                <button onClick={() => { setConfirmDelete(false); setDeleteInput(''); }}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/50 hover:bg-white/10 transition-all">
                  Annuler
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteInput !== 'SUPPRIMER' || deleting}
                  className="flex-1 rounded-xl border border-red-500/30 bg-red-500/15 px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-500/25 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  {deleting ? 'Suppression...' : 'Confirmer la suppression'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
