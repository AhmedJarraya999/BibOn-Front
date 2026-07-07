'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronLeft, Copy, Check, Trash2, MapPin, Mail, RefreshCw, ExternalLink } from 'lucide-react';
import api from '@/lib/api';
import { Logo } from '@/components/ui/logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-modal';

const F = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition focus:border-[#FF8C00] focus:ring-2 focus:ring-[#FF8C00]/20';
const L = 'mb-1.5 block text-sm font-medium text-white/60';

interface DistributionPoint {
  id: string;
  name: string;
  location?: string;
  token: string;
  pickupUrl: string;
  volunteerNames: string[];
  volunteerEmails: string[];
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${copied ? 'bg-green-500/20 text-green-400' : 'bg-[#FF8C00]/15 text-[#FF8C00] hover:bg-[#FF8C00]/25'}`}>
      {copied ? <><Check className="h-3 w-3" /> Copié</> : <><Copy className="h-3 w-3" /> Copier le lien</>}
    </button>
  );
}

function CreateForm({ eventId, onSuccess }: { eventId: string; onSuccess: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [volunteers, setVolunteers] = useState([{ name: '', email: '' }]);

  const mutation = useMutation({
    mutationFn: () => api.post('/distribution-points', {
      eventId,
      name,
      location: location || undefined,
      volunteerNames: volunteers.map(v => v.name).filter(Boolean),
      volunteerEmails: volunteers.map(v => v.email).filter(Boolean),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['distribution-points', eventId] });
      toast.success('Point créé. Les bénévoles ont reçu un email.');
      onSuccess();
    },
    onError: () => toast.error('Une erreur est survenue.'),
  });

  const addVolunteer = () => setVolunteers(v => [...v, { name: '', email: '' }]);
  const updateVolunteer = (i: number, field: 'name' | 'email', val: string) =>
    setVolunteers(v => v.map((vol, idx) => idx === i ? { ...vol, [field]: val } : vol));
  const removeVolunteer = (i: number) => setVolunteers(v => v.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-4">
      <div>
        <label className={L}>Nom du point</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="ex. Hall A, Entrée principale…" className={F} />
      </div>
      <div>
        <label className={L}>Lieu <span className="text-white/25">— optionnel</span></label>
        <input value={location} onChange={e => setLocation(e.target.value)} placeholder="ex. Salle des sports, Porte 2" className={F} />
      </div>

      <div>
        <label className={L}>Bénévoles assignés</label>
        <div className="space-y-2">
          {volunteers.map((v, i) => (
            <div key={i} className="flex gap-2">
              <input value={v.name} onChange={e => updateVolunteer(i, 'name', e.target.value)}
                placeholder="Nom" className={`${F} flex-1`} />
              <input value={v.email} onChange={e => updateVolunteer(i, 'email', e.target.value)}
                placeholder="Email" type="email" className={`${F} flex-1`} />
              {volunteers.length > 1 && (
                <button onClick={() => removeVolunteer(i)}
                  className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 text-red-400 hover:bg-red-500/15 transition-colors">
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <button onClick={addVolunteer} className="mt-2 text-xs text-[#FF8C00] hover:underline">+ Ajouter un bénévole</button>
      </div>

      <p className="text-xs text-white/30">Un lien d'accès unique sera généré et envoyé par email à chaque bénévole.</p>

      <div className="flex justify-end pt-2">
        <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !name.trim()}
          className="rounded-xl bg-[#FF8C00] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#e67e00] disabled:opacity-60 transition-all">
          {mutation.isPending ? 'Création…' : 'Créer le point'}
        </button>
      </div>
    </div>
  );
}

export default function DistributionPointsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: eventData } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.get(`/events/${id}`).then(r => r.data),
  });

  const { data: points = [], isLoading } = useQuery<DistributionPoint[]>({
    queryKey: ['distribution-points', id],
    queryFn: () => api.get(`/distribution-points/event/${id}`).then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (pointId: string) => api.delete(`/distribution-points/${pointId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['distribution-points', id] }); toast.success('Point supprimé.'); },
  });

  const regenMutation = useMutation({
    mutationFn: (pointId: string) => api.post(`/distribution-points/${pointId}/regenerate-token`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['distribution-points', id] }); toast.success('Lien régénéré.'); },
  });

  const handleDelete = async (p: DistributionPoint) => {
    const ok = await confirm({ title: 'Supprimer le point', message: `Supprimer "${p.name}" ? Le lien d'accès sera invalidé.`, confirmLabel: 'Supprimer' });
    if (ok) deleteMutation.mutate(p.id);
  };

  return (
    <div className="min-h-screen bg-[#111111] text-white">
      <div className="sticky top-0 z-50 bg-[#111111]/95 backdrop-blur border-b border-white/8 px-8 py-4 flex items-center justify-between">
        <Logo size="sm" variant="dark" />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button onClick={() => router.push(`/events/${id}`)}
            className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors">
            <ChevronLeft className="h-4 w-4" /> {eventData?.name ?? 'Événement'}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-white">Points de distribution</h1>
            <p className="text-white/40 text-sm mt-0.5">{points.length} point{points.length !== 1 ? 's' : ''} · chaque point a son propre lien d'accès</p>
          </div>
          <button onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-[#FF8C00] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#e67e00] shadow-lg shadow-[#FF8C00]/20 transition-all hover:scale-[1.02]">
            <Plus className="h-4 w-4" /> Nouveau point
          </button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 rounded-full border-2 border-[#FF8C00] border-t-transparent animate-spin" />
          </div>
        )}

        {!isLoading && points.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 py-20 text-center">
            <MapPin className="h-10 w-10 text-white/15 mx-auto mb-3" />
            <p className="text-white/30 text-sm">Aucun point de distribution</p>
            <button onClick={() => setCreateOpen(true)} className="mt-3 text-[#FF8C00] text-sm hover:underline">
              + Créer le premier point
            </button>
          </div>
        )}

        <div className="space-y-4">
          {points.map(p => (
            <div key={p.id} className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-base font-bold text-white">{p.name}</h3>
                  {p.location && (
                    <p className="text-xs text-white/35 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" /> {p.location}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => regenMutation.mutate(p.id)}
                    title="Régénérer le lien"
                    className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/40 hover:text-white transition-colors">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                  <a href={p.pickupUrl} target="_blank" rel="noreferrer"
                    className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/40 hover:text-white transition-colors">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <button onClick={() => handleDelete(p)}
                    className="rounded-lg border border-red-500/20 bg-red-500/5 p-2 text-red-400 hover:bg-red-500/15 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Link */}
              <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-black/20 px-3 py-2 mb-4">
                <span className="flex-1 text-xs text-white/40 truncate font-mono">{p.pickupUrl}</span>
                <CopyButton value={p.pickupUrl} />
              </div>

              {/* Volunteers */}
              {p.volunteerEmails.length > 0 && (
                <div>
                  <p className="text-xs text-white/30 mb-2">Bénévoles assignés</p>
                  <div className="flex flex-wrap gap-2">
                    {p.volunteerEmails.map((email, i) => (
                      <div key={email} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                        <Mail className="h-3 w-3 text-white/30" />
                        <span className="text-xs text-white/60">{p.volunteerNames[i] ?? email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {createOpen && (
        <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouveau point de distribution">
          <CreateForm eventId={id} onSuccess={() => setCreateOpen(false)} />
        </Modal>
      )}
    </div>
  );
}
