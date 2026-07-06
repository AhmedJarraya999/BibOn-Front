'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Check, Plus, Trash2, Flag, MapPin, CreditCard, Upload, Users, Building2 } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { Logo } from '@/components/ui/logo';

interface RaceInput {
  name: string; description: string; type: string;
  distance: number | ''; startTime: string; endTime: string; fee: number | '';
}

const STEPS = [
  { id: 1, label: 'Organisation', icon: <Building2 className="h-4 w-4" /> },
  { id: 2, label: 'Infos',        icon: <Flag className="h-4 w-4" /> },
  { id: 3, label: 'Lieu',         icon: <MapPin className="h-4 w-4" /> },
  { id: 4, label: 'Courses',      icon: <Users className="h-4 w-4" /> },
  { id: 5, label: 'Inscription',  icon: <CreditCard className="h-4 w-4" /> },
  { id: 6, label: 'Votre page',   icon: <Upload className="h-4 w-4" /> },
  { id: 7, label: 'Terminé !',    icon: <Check className="h-4 w-4" /> },
];

const RACE_TYPES = ['Road Race', '5K', '10K', 'Half Marathon', 'Marathon', 'Ultra Marathon', 'Trail Run', 'Triathlon', 'Duathlon', 'Kids Run', 'Virtual Race', 'Other'];
const COUNTRIES = ['Tunisia', 'Algeria', 'Morocco', 'France', 'Belgium', 'Germany', 'Italy', 'Spain', 'United Kingdom', 'United States', 'Canada', 'Saudi Arabia', 'UAE', 'Egypt', 'Other'];
const TIMEZONES = ['Africa/Tunis', 'Africa/Algiers', 'Africa/Casablanca', 'Europe/Paris', 'Europe/London', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Asia/Dubai', 'Asia/Riyadh'];
const PROCESSING_MODES = [
  { value: 'REGISTRANT', label: 'Frais payés par le participant', desc: 'Le participant paie les frais de traitement en plus du droit d\'inscription' },
  { value: 'RACE',       label: 'Frais déduits de votre recette', desc: 'Les frais de traitement sont déduits de ce que vous recevez' },
  { value: 'SPLIT',      label: 'Partagé — moitié chacun',        desc: 'Moitié payée par le participant, moitié déduite de votre recette' },
];

/* ── Field styles (dark) ─────────────────────────────────────────── */
const F = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition focus:border-[#FF8C00] focus:ring-2 focus:ring-[#FF8C00]/20 [&>option]:bg-[#1a1a1a]';
const L = 'block text-sm font-medium text-white/70 mb-1.5';

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={L}>{label}{required && <span className="text-[#FF8C00] ml-0.5">*</span>}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

function SectionHeader({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <div className="h-12 w-12 rounded-xl bg-[#FF8C00]/15 flex items-center justify-center text-[#FF8C00] flex-shrink-0">{icon}</div>
      <div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <p className="text-sm text-white/40">{sub}</p>
      </div>
    </div>
  );
}

/* ── Step Bar ────────────────────────────────────────────────────── */
function StepBar({ current }: { current: number }) {
  const pct = ((current - 1) / (STEPS.length - 1)) * 100;
  return (
    <div className="relative flex items-center justify-between px-2 mb-12">
      <div className="absolute left-0 right-0 top-5 h-0.5 bg-white/8 z-0" />
      <div className="absolute left-0 top-5 h-0.5 bg-[#FF8C00] transition-all duration-500 z-0" style={{ width: `${pct}%` }} />
      {STEPS.map((s) => {
        const done = s.id < current;
        const active = s.id === current;
        return (
          <div key={s.id} className="flex flex-col items-center gap-2 z-10">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-bold text-sm transition-all
              ${done   ? 'border-[#FF8C00] bg-[#FF8C00] text-white shadow-lg shadow-[#FF8C00]/30'
              : active ? 'border-[#FF8C00] bg-[#FF8C00]/10 text-[#FF8C00] shadow-lg shadow-[#FF8C00]/20'
              :          'border-white/15 bg-white/5 text-white/30'}`}>
              {done ? <Check className="h-5 w-5" /> : s.icon}
            </div>
            <span className={`text-xs font-medium hidden sm:block transition-colors ${active ? 'text-[#FF8C00]' : done ? 'text-white/60' : 'text-white/25'}`}>{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Wizard ──────────────────────────────────────────────────────── */
export default function NewEventWizard() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);

  // Step 1
  const [orgMode, setOrgMode] = useState<'create' | 'select'>('create');
  const [orgId, setOrgId] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgDescription, setOrgDescription] = useState('');
  const [orgWebsite, setOrgWebsite] = useState('');
  const [orgPhone, setOrgPhone] = useState('');
  const [orgAddress, setOrgAddress] = useState('');
  const [orgFacebook, setOrgFacebook] = useState('');
  const [orgInstagram, setOrgInstagram] = useState('');
  const [orgLogoUrl, setOrgLogoUrl] = useState('');
  const [createdOrgId, setCreatedOrgId] = useState<string | null>(null);

  // Step 2
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [externalResultsUrl, setExternalResultsUrl] = useState('');
  const [facebookPageId, setFacebookPageId] = useState('');
  const [facebookEventId, setFacebookEventId] = useState('');

  // Step 3
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('Tunisia');
  const [timezone, setTimezone] = useState('Africa/Tunis');
  const [date, setDate] = useState('');

  // Step 4
  const [races, setRaces] = useState<RaceInput[]>([{ name: '', description: '', type: '', distance: '', startTime: '', endTime: '', fee: '' }]);

  // Step 5
  const [paymentMode, setPaymentMode] = useState('PREPAID_OR_ONSITE');
  const [processingFeeMode, setProcessingFeeMode] = useState('REGISTRANT');
  const [acceptDonations, setAcceptDonations] = useState(false);
  const [isFirstYear, setIsFirstYear] = useState(true);
  const [estimatedParticipants, setEstimatedParticipants] = useState('');
  const [supportNonBinary, setSupportNonBinary] = useState(false);
  const [allowPreferNotToSay, setAllowPreferNotToSay] = useState(false);
  const [pickupLocations, setPickupLocations] = useState<string[]>(['']);

  // Step 6
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');

  const { data: orgsData } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => api.get('/organizations').then((r) => r.data),
  });
  const orgs = orgsData?.data ?? orgsData ?? [];

  const addRace = () => setRaces((r) => [...r, { name: '', description: '', type: '', distance: '', startTime: '', endTime: '', fee: '' }]);
  const removeRace = (i: number) => setRaces((r) => r.filter((_, idx) => idx !== i));
  const updateRace = (i: number, field: keyof RaceInput, val: string) => {
    setRaces((r) => r.map((race, idx) => {
      if (idx !== i) return race;
      if (field === 'distance' || field === 'fee') return { ...race, [field]: val === '' ? '' : Number(val) };
      return { ...race, [field]: val };
    }));
  };

  const handleImg = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setter(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleOrgStep = async () => {
    setLoading(true);
    try {
      let resolvedOrgId = orgId;
      if (orgMode === 'create') {
        const res = await api.post('/organizations', {
          name: orgName,
          description: orgDescription || undefined,
          website: orgWebsite || undefined,
          phone: orgPhone || undefined,
          address: orgAddress || undefined,
          facebook: orgFacebook || undefined,
          instagram: orgInstagram || undefined,
          logoUrl: orgLogoUrl || undefined,
        });
        resolvedOrgId = res.data.id;
        setCreatedOrgId(resolvedOrgId);
        setOrgId(resolvedOrgId);
      }
      setStep(2);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Could not create organization');
    } finally {
      setLoading(false);
    }
  };

  const submitEvent = async () => {
    setLoading(true);
    try {
      const resolvedOrgId = createdOrgId ?? orgId;
      const evRes = await api.post('/events', {
        name, description: description || undefined,
        location: [addressLine1, city, country].filter(Boolean).join(', '),
        addressLine1: addressLine1 || undefined, addressLine2: addressLine2 || undefined,
        city: city || undefined, state: state || undefined,
        zipCode: zipCode || undefined, country, timezone,
        date: new Date(date).toISOString(),
        contactEmail: contactEmail || undefined,
        externalUrl: externalUrl || undefined, externalResultsUrl: externalResultsUrl || undefined,
        facebookPageId: facebookPageId || undefined, facebookEventId: facebookEventId || undefined,
        organizationId: resolvedOrgId, paymentMode, processingFeeMode,
        acceptDonations, supportNonBinary, allowPreferNotToSay, isFirstYear,
        estimatedParticipants: estimatedParticipants ? Number(estimatedParticipants) : undefined,
        logoUrl: logoUrl || undefined, bannerUrl: bannerUrl || undefined,
        pickupLocations: pickupLocations.filter(Boolean),
      });
      const eventId = evRes.data.id;
      setCreatedEventId(eventId);
      for (const race of races.filter((r) => r.name && r.distance && r.startTime)) {
        await api.post('/races', {
          name: race.name, description: race.description || undefined,
          type: race.type || undefined, distance: Number(race.distance),
          startTime: new Date(race.startTime).toISOString(),
          endTime: race.endTime ? new Date(race.endTime).toISOString() : undefined,
          fee: race.fee !== '' ? Number(race.fee) : undefined, eventId,
        });
      }
      router.push(`/events/${eventId}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const step1Valid = orgMode === 'select' ? !!orgId : orgName.trim().length >= 2;
  const step2Valid = name.trim().length >= 2;
  const step3Valid = !!(addressLine1.trim() && city.trim() && date);

  return (
    <div className="min-h-screen bg-[#111111] text-white">

      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-[#111111]/95 backdrop-blur border-b border-white/8 px-8 py-4 flex items-center justify-between">
        <Logo size="sm" variant="dark" />
        <div className="flex items-center gap-2 text-sm text-white/40">
          <span>Étape</span>
          <span className="text-[#FF8C00] font-bold">{Math.min(step, 6)}</span>
          <span>sur 6</span>
        </div>
        <button onClick={() => router.push('/events')} className="text-sm text-white/30 hover:text-white/60 transition-colors">Annuler</button>
      </div>

      {/* Hero strip */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,140,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,140,0,0.03)_1px,transparent_1px)] bg-[size:48px_48px]"/>
        <div className="absolute right-0 top-0 w-96 h-full bg-[#FF8C00]/5 blur-3xl"/>
        <div className="relative mx-auto max-w-5xl px-8 py-10">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#FF8C00]/30 bg-[#FF8C00]/10 px-3 py-1 text-xs text-[#FF8C00]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#FF8C00] animate-pulse inline-block"/>
            Création d&apos;événement
          </div>
          <h1 className="text-3xl font-black text-white mt-2">Créez votre course 🏁</h1>
          <p className="text-white/40 text-sm mt-1">Organisation → Événement → Courses — tout en quelques minutes</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-8 py-10">
        <StepBar current={step} />

        {/* Card */}
        <div className="rounded-2xl border border-white/8 bg-white/3 p-10 backdrop-blur">

          {/* ─── Step 1: Organization ─── */}
          {step === 1 && (
            <div className="space-y-5">
              <SectionHeader icon={<Building2 className="h-5 w-5"/>} title="Votre Organisation" sub="Créez ou sélectionnez le club / association qui organise cet événement" />

              <div className="flex rounded-xl border border-white/10 overflow-hidden">
                <button onClick={() => setOrgMode('create')} className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${orgMode === 'create' ? 'bg-[#FF8C00] text-white' : 'text-white/50 hover:bg-white/5'}`}>
                  Créer une organisation
                </button>
                <button onClick={() => setOrgMode('select')} className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${orgMode === 'select' ? 'bg-[#FF8C00] text-white' : 'text-white/50 hover:bg-white/5'}`}>
                  Utiliser une existante
                </button>
              </div>

              {orgMode === 'select' ? (
                <Field label="Sélectionner une organisation" required>
                  <select value={orgId} onChange={(e) => setOrgId(e.target.value)} className={F}>
                    <option value="">Choisir…</option>
                    {orgs.map((o: { id: string; name: string }) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                  {orgs.length === 0 && <p className="mt-1 text-xs text-amber-400">Aucune organisation trouvée. Passez à "Créer".</p>}
                </Field>
              ) : (
                <>
                  <Field label="Nom de l'organisation" required>
                    <input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Marathon Club Tunis" className={F} />
                  </Field>
                  <Field label="Description">
                    <textarea value={orgDescription} onChange={(e) => setOrgDescription(e.target.value)} rows={3} placeholder="À propos de votre club…" className={`${F} resize-none`} />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Site web">
                      <input value={orgWebsite} onChange={(e) => setOrgWebsite(e.target.value)} placeholder="https://…" className={F} />
                    </Field>
                    <Field label="Téléphone">
                      <input value={orgPhone} onChange={(e) => setOrgPhone(e.target.value)} placeholder="+216 XX XXX XXX" className={F} />
                    </Field>
                  </div>
                  <Field label="Adresse">
                    <input value={orgAddress} onChange={(e) => setOrgAddress(e.target.value)} placeholder="123 Rue de la Course, Tunis" className={F} />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Facebook">
                      <input value={orgFacebook} onChange={(e) => setOrgFacebook(e.target.value)} placeholder="facebook.com/votreclub" className={F} />
                    </Field>
                    <Field label="Instagram">
                      <input value={orgInstagram} onChange={(e) => setOrgInstagram(e.target.value)} placeholder="@votreclub" className={F} />
                    </Field>
                  </div>
                  <div>
                    <p className={L}>Logo de l&apos;organisation</p>
                    <div className="flex items-center gap-4">
                      {orgLogoUrl ? (
                        <img src={orgLogoUrl} alt="" className="h-16 w-16 rounded-xl object-cover border border-white/10 flex-shrink-0" />
                      ) : (
                        <div className="h-16 w-16 rounded-xl bg-white/5 border-2 border-dashed border-white/15 flex items-center justify-center text-2xl flex-shrink-0">🏢</div>
                      )}
                      <label className="flex-1 flex flex-col items-center justify-center h-16 rounded-xl border-2 border-dashed border-white/15 bg-white/3 cursor-pointer hover:border-[#FF8C00]/50 hover:bg-[#FF8C00]/5 transition-colors">
                        <Upload className="h-4 w-4 text-white/30 mb-0.5" />
                        <span className="text-xs text-white/40">Uploader un logo</span>
                        <input type="file" accept=".png,.jpg,.jpeg,.gif" className="hidden" onChange={handleImg(setOrgLogoUrl)} />
                      </label>
                      {orgLogoUrl && <button onClick={() => setOrgLogoUrl('')} className="text-xs text-red-400 hover:underline">Supprimer</button>}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ─── Step 2: Basic Info ─── */}
          {step === 2 && (
            <div className="space-y-5">
              <SectionHeader icon={<Flag className="h-5 w-5"/>} title="Informations sur la course" sub="Décrivez votre événement" />

              <div className="rounded-xl border border-[#FF8C00]/20 bg-[#FF8C00]/8 px-4 py-3 text-sm text-[#FF8C00] flex gap-2">
                <span>💡</span>
                <span>Vous voulez <strong>vous inscrire</strong> à une course ? <button onClick={() => router.push('/')} className="underline">Retournez à l&apos;accueil</button> et cherchez votre course.</span>
              </div>

              <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-[#FF8C00]/20 flex items-center justify-center text-[#FF8C00] flex-shrink-0">🏢</div>
                <div>
                  <p className="text-xs text-white/35">Organisation</p>
                  <p className="text-sm font-semibold text-white">{orgName || orgs.find((o: { id: string; name: string }) => o.id === orgId)?.name || '—'}</p>
                </div>
              </div>

              <Field label="Nom de la course" required>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Marathon de Tunis 2026" className={F} />
              </Field>
              <Field label="Description" required>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Décrivez votre événement…" className={`${F} resize-none`} />
              </Field>

              <div className="border-t border-white/8 pt-5">
                <p className="text-sm font-semibold text-white/70 mb-4">Contact & Liens</p>
                <div className="space-y-4">
                  <Field label="Email de contact" required>
                    <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="course@exemple.com" className={F} />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="URL de la course">
                      <input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://…" className={F} />
                    </Field>
                    <Field label="URL des résultats">
                      <input value={externalResultsUrl} onChange={(e) => setExternalResultsUrl(e.target.value)} placeholder="https://…" className={F} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="ID Page Facebook">
                      <input value={facebookPageId} onChange={(e) => setFacebookPageId(e.target.value)} placeholder="MarathonTunis" className={F} />
                    </Field>
                    <Field label="ID Événement Facebook">
                      <input value={facebookEventId} onChange={(e) => setFacebookEventId(e.target.value)} placeholder="123456789" className={F} />
                    </Field>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── Step 3: Location ─── */}
          {step === 3 && (
            <div className="space-y-5">
              <SectionHeader icon={<MapPin className="h-5 w-5"/>} title="Lieu" sub="Où se déroule votre course ?" />
              <Field label="Adresse (ligne 1)" required>
                <input value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="Avenue Habib Bourguiba" className={F} />
              </Field>
              <Field label="Adresse (ligne 2)">
                <input value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} placeholder="Bâtiment, étage…" className={F} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Pays" required>
                  <select value={country} onChange={(e) => setCountry(e.target.value)} className={F}>
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Code postal">
                  <input value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="1000" className={F} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Ville" required>
                  <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Tunis" className={F} />
                </Field>
                <Field label="État / Région">
                  <input value={state} onChange={(e) => setState(e.target.value)} placeholder="Tunis" className={F} />
                </Field>
              </div>
              <Field label="Fuseau horaire" required>
                <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={F}>
                  {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </Field>
              <Field label="Date et heure de l'événement" required>
                <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className={`${F} [color-scheme:dark]`} />
              </Field>
            </div>
          )}

          {/* ─── Step 4: Races ─── */}
          {step === 4 && (
            <div className="space-y-5">
              <SectionHeader icon={<Users className="h-5 w-5"/>} title="Vos courses" sub="Ajoutez les distances / catégories de votre événement" />
              <div className="space-y-4">
                {races.map((race, i) => (
                  <div key={i} className="rounded-xl border border-white/8 bg-white/3 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FF8C00] text-xs font-bold text-white">{i + 1}</span>
                        <span className="font-semibold text-white text-sm">Course {i + 1}</span>
                      </div>
                      {races.length > 1 && (
                        <button onClick={() => removeRace(i)} className="text-white/25 hover:text-red-400 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Nom de la course" required>
                        <input value={race.name} onChange={(e) => updateRace(i, 'name', e.target.value)} placeholder='"Semi-marathon", "5K"' className={F} />
                      </Field>
                      <Field label="Type">
                        <select value={race.type} onChange={(e) => updateRace(i, 'type', e.target.value)} className={F}>
                          <option value="">Sélectionner…</option>
                          {RACE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </Field>
                    </div>
                    <Field label="Description">
                      <input value={race.description} onChange={(e) => updateRace(i, 'description', e.target.value)} placeholder="Description courte de cette catégorie" className={F} />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Distance (km)" required>
                        <input type="number" min="0" step="0.1" value={race.distance} onChange={(e) => updateRace(i, 'distance', e.target.value)} placeholder="10" className={F} />
                      </Field>
                      <Field label="Frais d'inscription (TND)">
                        <input type="number" min="0" step="0.5" value={race.fee} onChange={(e) => updateRace(i, 'fee', e.target.value)} placeholder="0 = gratuit" className={F} />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Heure de départ" required>
                        <input type="datetime-local" value={race.startTime} onChange={(e) => updateRace(i, 'startTime', e.target.value)} className={`${F} [color-scheme:dark]`} />
                      </Field>
                      <Field label="Heure d'arrivée (optionnel)">
                        <input type="datetime-local" value={race.endTime} onChange={(e) => updateRace(i, 'endTime', e.target.value)} className={`${F} [color-scheme:dark]`} />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={addRace} className="flex items-center gap-2 text-sm font-medium text-[#FF8C00] hover:text-[#e67e00] transition-colors">
                <Plus className="h-4 w-4" /> Ajouter une course
              </button>
            </div>
          )}

          {/* ─── Step 5: Registration ─── */}
          {step === 5 && (
            <div className="space-y-6">
              <SectionHeader icon={<CreditCard className="h-5 w-5"/>} title="Paramètres d'inscription" sub="Configurez les paiements et les options participants" />

              <div>
                <p className={L}>Mode de paiement</p>
                <div className="space-y-2">
                  {[
                    { value: 'PREPAID_OR_ONSITE', label: 'En ligne & sur place', desc: 'Les participants peuvent payer en ligne ou au départ' },
                    { value: 'PREPAID_ONLY',      label: 'En ligne uniquement',  desc: 'Le paiement doit être effectué en ligne avant le jour J' },
                  ].map((pm) => (
                    <label key={pm.value} className={`flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition-colors ${paymentMode === pm.value ? 'border-[#FF8C00] bg-[#FF8C00]/8' : 'border-white/8 bg-white/3 hover:border-white/15'}`}>
                      <input type="radio" name="paymentMode" value={pm.value} checked={paymentMode === pm.value} onChange={() => setPaymentMode(pm.value)} className="mt-0.5 accent-[#FF8C00]" />
                      <div><p className="text-sm font-semibold text-white">{pm.label}</p><p className="text-xs text-white/40">{pm.desc}</p></div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className={L}>Frais de traitement <span className="text-white/25 font-normal text-xs">(paiements en ligne)</span></p>
                <div className="space-y-2">
                  {PROCESSING_MODES.map((pm) => (
                    <label key={pm.value} className={`flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition-colors ${processingFeeMode === pm.value ? 'border-[#FF8C00] bg-[#FF8C00]/8' : 'border-white/8 bg-white/3 hover:border-white/15'}`}>
                      <input type="radio" name="processingFeeMode" value={pm.value} checked={processingFeeMode === pm.value} onChange={() => setProcessingFeeMode(pm.value)} className="mt-0.5 accent-[#FF8C00]" />
                      <div><p className="text-sm font-semibold text-white">{pm.label}</p><p className="text-xs text-white/40">{pm.desc}</p></div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/8 bg-white/3 p-4">
                <p className="text-sm font-semibold text-white mb-3">Dons</p>
                <div className="flex gap-3">
                  {[{ v: true, l: 'Oui' }, { v: false, l: 'Non' }].map(({ v, l }) => (
                    <label key={l} className={`flex items-center gap-2 rounded-lg border-2 px-4 py-2 cursor-pointer transition-colors ${acceptDonations === v ? 'border-[#FF8C00] bg-[#FF8C00]/10 text-[#FF8C00]' : 'border-white/10 text-white/50'}`}>
                      <input type="radio" checked={acceptDonations === v} onChange={() => setAcceptDonations(v)} className="accent-[#FF8C00]" />
                      <span className="text-sm font-medium">{l}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-4">
                <p className="text-sm font-semibold text-white">Historique de la course</p>
                <div>
                  <p className={L}>Est-ce la première édition ?</p>
                  <div className="flex gap-3 mt-1">
                    {[{ v: true, l: 'Oui' }, { v: false, l: 'Non' }].map(({ v, l }) => (
                      <label key={l} className={`flex items-center gap-2 rounded-lg border-2 px-4 py-2 cursor-pointer transition-colors ${isFirstYear === v ? 'border-[#FF8C00] bg-[#FF8C00]/10 text-[#FF8C00]' : 'border-white/10 text-white/50'}`}>
                        <input type="radio" checked={isFirstYear === v} onChange={() => setIsFirstYear(v)} className="accent-[#FF8C00]" />
                        <span className="text-sm font-medium">{l}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <Field label="Nombre estimé de participants">
                  <input type="number" min="0" value={estimatedParticipants} onChange={(e) => setEstimatedParticipants(e.target.value)} placeholder="500" className={F} />
                </Field>
              </div>

              <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-3">
                <p className="text-sm font-semibold text-white">Options de genre</p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={supportNonBinary} onChange={(e) => setSupportNonBinary(e.target.checked)} className="h-4 w-4 rounded accent-[#FF8C00]" />
                  <span className="text-sm text-white/60">Accepter les inscriptions non-binaires</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={allowPreferNotToSay} onChange={(e) => setAllowPreferNotToSay(e.target.checked)} className="h-4 w-4 rounded accent-[#FF8C00]" />
                  <span className="text-sm text-white/60">Autoriser &quot;Préfère ne pas dire&quot;</span>
                </label>
              </div>

              <div>
                <p className={L}>Lieux de retrait du dossard <span className="text-white/25 font-normal text-xs">(optionnel)</span></p>
                <div className="space-y-2">
                  {pickupLocations.map((loc, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={loc} onChange={(e) => setPickupLocations((l) => l.map((v, idx) => idx === i ? e.target.value : v))} placeholder={`Lieu ${i + 1}`} className={`${F} flex-1`} />
                      {pickupLocations.length > 1 && (
                        <button onClick={() => setPickupLocations((l) => l.filter((_, idx) => idx !== i))} className="text-white/25 hover:text-red-400 px-2 transition-colors"><Trash2 className="h-4 w-4" /></button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={() => setPickupLocations((l) => [...l, ''])} className="mt-2 flex items-center gap-1.5 text-sm text-[#FF8C00] hover:text-[#e67e00] transition-colors">
                  <Plus className="h-4 w-4" /> Ajouter un lieu
                </button>
              </div>
            </div>
          )}

          {/* ─── Step 6: Your Page ─── */}
          {step === 6 && (
            <div className="space-y-6">
              <SectionHeader icon={<Upload className="h-5 w-5"/>} title="Votre page événement" sub="Ajoutez vos visuels et vérifiez avant de publier" />

              <div>
                <p className={L}>Logo de l&apos;événement</p>
                <div className="flex items-start gap-5">
                  {logoUrl ? (
                    <img src={logoUrl} alt="" className="h-24 w-24 rounded-xl object-cover border border-white/10 flex-shrink-0" />
                  ) : (
                    <div className="h-24 w-24 rounded-xl bg-white/5 border-2 border-dashed border-white/15 flex items-center justify-center flex-shrink-0 text-3xl">🏁</div>
                  )}
                  <label className="flex-1 flex flex-col items-center justify-center h-24 rounded-xl border-2 border-dashed border-white/15 bg-white/3 cursor-pointer hover:border-[#FF8C00]/50 hover:bg-[#FF8C00]/5 transition-colors">
                    <Upload className="h-5 w-5 text-white/30 mb-1" />
                    <span className="text-sm text-white/40">Uploader un logo</span>
                    <span className="text-xs text-white/25 mt-0.5">.png, .jpg — max 5 Mo, carré de préférence</span>
                    <input type="file" accept=".png,.jpg,.jpeg,.gif" className="hidden" onChange={handleImg(setLogoUrl)} />
                  </label>
                </div>
                {logoUrl && <button onClick={() => setLogoUrl('')} className="mt-1 text-xs text-red-400 hover:underline">Supprimer</button>}
              </div>

              <div>
                <p className={L}>Bannière <span className="text-white/25 font-normal text-xs">(optionnel — affichée sur votre page publique)</span></p>
                {bannerUrl ? (
                  <div className="relative">
                    <img src={bannerUrl} alt="" className="w-full h-36 object-cover rounded-xl border border-white/10" />
                    <button onClick={() => setBannerUrl('')} className="absolute top-2 right-2 bg-[#111111]/80 rounded-full px-2 py-0.5 text-xs text-red-400 border border-white/10 hover:bg-red-500/20">Supprimer</button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-36 rounded-xl border-2 border-dashed border-white/15 bg-white/3 cursor-pointer hover:border-[#FF8C00]/50 hover:bg-[#FF8C00]/5 transition-colors">
                    <Upload className="h-5 w-5 text-white/30 mb-1" />
                    <span className="text-sm text-white/40">Uploader une bannière</span>
                    <span className="text-xs text-white/25 mt-0.5">Recommandé : 1200×400px</span>
                    <input type="file" accept=".png,.jpg,.jpeg" className="hidden" onChange={handleImg(setBannerUrl)} />
                  </label>
                )}
              </div>

              {/* Summary card */}
              <div className="rounded-xl border border-[#FF8C00]/20 bg-[#FF8C00]/5 p-5">
                <p className="text-sm font-semibold text-[#FF8C00] mb-4">Récapitulatif</p>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  {[
                    ['Événement', name],
                    ['Lieu', `${city}${state ? `, ${state}` : ''}, ${country}`],
                    ['Date', date ? new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'],
                    ['Courses', `${races.filter((r) => r.name).length} course(s)`],
                    ['Paiement', paymentMode === 'PREPAID_ONLY' ? 'En ligne uniquement' : 'En ligne & sur place'],
                    ['Dons', acceptDonations ? 'Activés' : 'Désactivés'],
                  ].map(([k, v]) => (
                    <>
                      <span key={`k-${k}`} className="text-white/40">{k}</span>
                      <span key={`v-${k}`} className="font-medium text-white">{v}</span>
                    </>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── Step 7: Done ─── */}
          {step === 7 && (
            <div className="text-center py-12 space-y-6">
              <div className="mx-auto h-24 w-24 rounded-full bg-[#FF8C00]/15 flex items-center justify-center border-2 border-[#FF8C00]/40" style={{ boxShadow: '0 0 40px rgba(255,140,0,0.2)' }}>
                <Check className="h-12 w-12 text-[#FF8C00]" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-white">Votre course est en ligne ! 🎉</h2>
                <p className="text-white/40 text-sm mt-2 max-w-sm mx-auto">Partagez le lien d&apos;inscription avec vos participants et gérez votre journée de course.</p>
              </div>
              <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
                <button onClick={() => router.push('/events')} className="rounded-xl bg-[#FF8C00] px-7 py-3 text-sm font-bold text-white hover:bg-[#e67e00] shadow-lg shadow-[#FF8C00]/25 transition-all hover:scale-105">
                  Voir mes événements
                </button>
                {createdEventId && (
                  <button onClick={() => router.push(`/e/${createdEventId}`)} className="rounded-xl border border-white/15 bg-white/5 px-7 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-all">
                    Voir la page publique
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ─── Navigation ─── */}
          {step < 7 && (
            <div className="flex items-center justify-between mt-10 pt-6 border-t border-white/8">
              {step > 1 ? (
                <button onClick={() => setStep((s) => s - 1)} className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 transition-colors">
                  ← Retour
                </button>
              ) : (
                <button onClick={() => router.push('/events')} className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/40 hover:text-white/70 transition-colors">
                  Annuler
                </button>
              )}

              {step === 1 && (
                <button onClick={handleOrgStep} disabled={!step1Valid || loading}
                  className="rounded-xl bg-[#FF8C00] px-7 py-2.5 text-sm font-bold text-white hover:bg-[#e67e00] disabled:opacity-40 shadow-lg shadow-[#FF8C00]/20 transition-all hover:scale-[1.02]">
                  {loading ? 'Enregistrement…' : 'Continuer →'}
                </button>
              )}
              {step >= 2 && step < 6 && (
                <button onClick={() => setStep((s) => s + 1)}
                  disabled={(step === 2 && !step2Valid) || (step === 3 && !step3Valid)}
                  className="rounded-xl bg-[#FF8C00] px-7 py-2.5 text-sm font-bold text-white hover:bg-[#e67e00] disabled:opacity-40 shadow-lg shadow-[#FF8C00]/20 transition-all hover:scale-[1.02]">
                  Continuer →
                </button>
              )}
              {step === 6 && (
                <button onClick={submitEvent} disabled={loading}
                  className="rounded-xl bg-[#FF8C00] px-7 py-2.5 text-sm font-bold text-white hover:bg-[#e67e00] disabled:opacity-60 shadow-lg shadow-[#FF8C00]/20 transition-all hover:scale-[1.02]">
                  {loading ? 'Création…' : '🚀 Créer l\'événement'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
