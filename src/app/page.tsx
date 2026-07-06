'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, MapPin, Calendar, ArrowRight } from 'lucide-react';
import { getUser, isLoggedIn } from '@/lib/auth';
import { Logo } from '@/components/ui/logo';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002/api';

interface PublicEvent { id: string; name: string; date: string; location?: string; logoUrl?: string; slug?: string; }

type Lang = 'fr' | 'ar' | 'en';

const t = {
  fr: {
    dir: 'ltr' as const,
    login: 'Connexion',
    start: 'Commencer gratuitement',
    badge: 'Plateforme de gestion du jour de course',
    slogan: 'La course commence',
    heroDesc: "De la ligne de départ jusqu'à l'arrivée — check-in, points de contrôle, bénévoles, tout en un seul endroit.",
    featTitle: 'Ce que vous pouvez faire avec كورسة',
    featSub: 'Tout ce dont vous avez besoin le jour de la course',
    howTitle: 'Comment ça marche',
    ctaTitle: 'Faites de votre prochaine course un succès',
    ctaSub: 'كورسة — La course commence',
    features: [
      { icon: '📋', title: 'Check-in par QR', desc: 'Scannez le dossard au départ — confirmation instantanée', color: 'bg-blue-50 text-blue-600' },
      { icon: '📍', title: 'Points de contrôle', desc: 'Suivez les coureurs point par point en temps réel', color: 'bg-red-50 text-red-600' },
      { icon: '👥', title: 'Gestion bénévoles', desc: 'Assignez chaque bénévole à son poste et suivez leur présence', color: 'bg-green-50 text-green-600' },
      { icon: '⏱️', title: 'Chronométrage', desc: 'Enregistrez les temps et générez le classement automatiquement', color: 'bg-amber-50 text-amber-600' },
      { icon: '🚨', title: 'Alertes retardataires', desc: "Si un coureur ne passe pas un point dans les temps — alerte immédiate", color: 'bg-purple-50 text-purple-600' },
      { icon: '🏅', title: 'Distribution', desc: 'Suivez la remise des médailles et kit dossard — zéro chaos', color: 'bg-orange-50 text-orange-600' },
    ],
    steps: [
      { step: '01', title: 'Créez votre course', desc: 'Parcours, points de contrôle, coureurs inscrits' },
      { step: '02', title: 'Assignez les rôles', desc: 'Chaque bénévole connaît son poste — check-in, contrôle ou distribution' },
      { step: '03', title: 'Suivez en live', desc: 'Dashboard mis à jour toutes les 10 secondes' },
    ],
    pricingTitle: 'Payez par événement, pas par mois',
    pricingSub: "Achetez un crédit, utilisez-le quand vous voulez — sans abonnement",
    popular: 'Le plus populaire',
    perEvent: '/ événement',
    free: 'Gratuit',
    packs: [
      {
        name: 'Starter',
        price: '0',
        label: '1 événement',
        desc: 'Pour tester كورسة sur votre première course',
        color: 'border-gray-200',
        cta: 'Commencer gratuitement',
        ctaStyle: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
        popular: false,
        features: ['1 événement inclus', "Jusqu'à 200 participants", 'Check-in QR', 'Dashboard live', 'Support communauté'],
      },
      {
        name: 'Pack 3',
        price: '79',
        label: '3 événements',
        desc: 'Le meilleur rapport qualité / prix',
        color: 'border-red-500',
        cta: 'Acheter le Pack 3',
        ctaStyle: 'bg-red-600 text-white hover:bg-red-700',
        popular: true,
        features: ['3 événements crédit', 'Participants illimités', 'Check-in QR', 'Points de contrôle', 'Gestion bénévoles', 'Alertes retardataires', 'Export PDF', 'Support prioritaire'],
      },
      {
        name: 'Club',
        price: '199',
        label: 'Illimité / an',
        desc: 'Pour les clubs et fédérations actifs',
        color: 'border-gray-200',
        cta: 'Contacter les ventes',
        ctaStyle: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
        popular: false,
        features: ['Événements illimités', 'Participants illimités', 'Multi-organisations', 'API accès', 'Manager dédié', 'Intégration chrono'],
      },
    ],
  },
  ar: {
    dir: 'rtl' as const,
    login: 'تسجيل الدخول',
    start: 'ابدأ مجاناً',
    badge: 'منصة إدارة يوم السباق',
    slogan: 'السباق بدا',
    heroDesc: 'من نقطة الانطلاق للـ finish line — check-in، نقاط المراقبة، المتطوعين، كل شيء في مكان واحد.',
    featTitle: 'شنوة تقدر تعمل مع كورسة',
    featSub: 'كل اللي تحتاجه يوم السباق',
    howTitle: 'كيفاش تخدم',
    ctaTitle: 'خلّي السباق القادم بلا فوضى',
    ctaSub: 'كورسة — السباق بدا',
    features: [
      { icon: '📋', title: 'Check-in بالـ QR', desc: 'امسح بيب المتسابق عند الانطلاق — تأكيد فوري وتحديث تلقائي', color: 'bg-blue-50 text-blue-600' },
      { icon: '📍', title: 'نقاط المراقبة', desc: 'تتبّع المتسابقين نقطة بنقطة — اعرف وين هو كل واحد في أي وقت', color: 'bg-red-50 text-red-600' },
      { icon: '👥', title: 'إدارة المتطوعين', desc: 'وزّع المتطوعين على النقاط وتابع حضورهم في الوقت الحقيقي', color: 'bg-green-50 text-green-600' },
      { icon: '⏱️', title: 'توقيت آني', desc: 'سجّل أوقات الوصول وأنشئ الترتيب تلقائياً بدون كرونو', color: 'bg-amber-50 text-amber-600' },
      { icon: '🚨', title: 'تنبيهات المتأخرين', desc: 'إذا متسابق ما عدّاش نقطة في الوقت المحدد — تنبيه فوري للمنظّم', color: 'bg-purple-50 text-purple-600' },
      { icon: '🏅', title: 'توزيع الجوائز', desc: 'تتبّع توزيع الميداليات والـ kit بيب — وداعاً للفوضى', color: 'bg-orange-50 text-orange-600' },
    ],
    steps: [
      { step: '01', title: 'أنشئ سباقك', desc: 'حطّ المسار، النقاط، والمتسابقين المسجّلين' },
      { step: '02', title: 'وزّع الأدوار', desc: 'كل متطوع يعرف نقطته — check-in، مراقبة، أو توزيع' },
      { step: '03', title: 'تابع live', desc: 'داشبورد يتحدّث كل 10 ثواني — وين كل واحد وشنوة حالته' },
    ],
    pricingTitle: 'ادفع بالحدث، مش بالشهر',
    pricingSub: 'اشتري كريدي واستخدمه وقتك — بدون اشتراك شهري',
    popular: 'الأكثر طلباً',
    perEvent: '/ حدث',
    free: 'مجاناً',
    packs: [
      {
        name: 'Starter',
        price: '0',
        label: 'حدث واحد',
        desc: 'باش تجرّب كورسة في أول سباق',
        color: 'border-gray-200',
        cta: 'ابدأ مجاناً',
        ctaStyle: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
        popular: false,
        features: ['حدث واحد مشمول', '200 متسابق كحد أقصى', 'Check-in بالـ QR', 'داشبورد live', 'دعم المجتمع'],
      },
      {
        name: 'Pack 3',
        price: '79',
        label: '3 أحداث',
        desc: 'أحسن نسبة جودة / سعر',
        color: 'border-red-500',
        cta: 'اشتري Pack 3',
        ctaStyle: 'bg-red-600 text-white hover:bg-red-700',
        popular: true,
        features: ['3 أحداث كريدي', 'متسابقين غير محدودين', 'Check-in بالـ QR', 'نقاط المراقبة', 'إدارة المتطوعين', 'تنبيهات المتأخرين', 'تصدير PDF', 'دعم أولوية'],
      },
      {
        name: 'Club',
        price: '199',
        label: 'غير محدود / سنة',
        desc: 'للأندية والاتحادات النشطة',
        color: 'border-gray-200',
        cta: 'تواصل معنا',
        ctaStyle: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
        popular: false,
        features: ['أحداث غير محدودة', 'متسابقين غير محدودين', 'متعدد المنظّمات', 'API', 'مدير مخصّص', 'تكامل مع الكرونو'],
      },
    ],
  },
  en: {
    dir: 'ltr' as const,
    login: 'Login',
    start: 'Get started free',
    badge: 'Race Day Management Platform',
    slogan: 'The race begins',
    heroDesc: 'From the start line to the finish — check-in, checkpoints, volunteers, everything in one place.',
    featTitle: 'Everything you need on race day',
    featSub: 'Built for race organizers',
    howTitle: 'How it works',
    ctaTitle: 'Make your next race chaos-free',
    ctaSub: 'كورسة — The race begins',
    features: [
      { icon: '📋', title: 'QR Check-in', desc: 'Scan the bib at the start — instant confirmation and live update', color: 'bg-blue-50 text-blue-600' },
      { icon: '📍', title: 'Checkpoints', desc: 'Track every runner point by point — know where everyone is at all times', color: 'bg-red-50 text-red-600' },
      { icon: '👥', title: 'Volunteer management', desc: 'Assign volunteers to checkpoints and track their attendance in real time', color: 'bg-green-50 text-green-600' },
      { icon: '⏱️', title: 'Live timing', desc: 'Record finish times and generate rankings automatically', color: 'bg-amber-50 text-amber-600' },
      { icon: '🚨', title: 'Late runner alerts', desc: 'If a runner misses a checkpoint on time — instant alert to the organizer', color: 'bg-purple-50 text-purple-600' },
      { icon: '🏅', title: 'Medal distribution', desc: 'Track medal and bib kit handouts — no more chaos at the finish', color: 'bg-orange-50 text-orange-600' },
    ],
    steps: [
      { step: '01', title: 'Create your race', desc: 'Set up the route, checkpoints, and registered runners' },
      { step: '02', title: 'Assign roles', desc: 'Every volunteer knows their post — check-in, control, or distribution' },
      { step: '03', title: 'Track live', desc: 'Dashboard updates every 10 seconds — see everyone\'s status at a glance' },
    ],
    pricingTitle: 'Pay per event, not per month',
    pricingSub: 'Buy credits, use them when you want — no subscription',
    popular: 'Most popular',
    perEvent: '/ event',
    free: 'Free',
    packs: [
      {
        name: 'Starter',
        price: '0',
        label: '1 event',
        desc: 'Try كورسة on your first race',
        color: 'border-gray-200',
        cta: 'Get started free',
        ctaStyle: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
        popular: false,
        features: ['1 event included', 'Up to 200 participants', 'QR Check-in', 'Live dashboard', 'Community support'],
      },
      {
        name: 'Pack 3',
        price: '79',
        label: '3 events',
        desc: 'Best value for active organizers',
        color: 'border-red-500',
        cta: 'Buy Pack 3',
        ctaStyle: 'bg-red-600 text-white hover:bg-red-700',
        popular: true,
        features: ['3 event credits', 'Unlimited participants', 'QR Check-in', 'Checkpoints', 'Volunteer management', 'Late runner alerts', 'PDF export', 'Priority support'],
      },
      {
        name: 'Club',
        price: '199',
        label: 'Unlimited / year',
        desc: 'For clubs & active federations',
        color: 'border-gray-200',
        cta: 'Contact sales',
        ctaStyle: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
        popular: false,
        features: ['Unlimited events', 'Unlimited participants', 'Multi-organization', 'API access', 'Dedicated manager', 'Chrono integration'],
      },
    ],
  },
};

export default function Home() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [lang, setLang] = useState<Lang>('fr');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicEvent[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReady(true);
    if (!isLoggedIn()) return;
    const role = getUser()?.role;
    if (role === 'VOLUNTEER') router.replace('/checkin');
    else if (role === 'PARTICIPANT') router.replace('/portal/my-registrations');
    else router.replace('/events/new');
  }, [router]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${API_URL}/events/public/search?q=${encodeURIComponent(query)}&limit=8`);
        const data = await res.json();
        setResults(data);
        setShowResults(true);
      } catch { setResults([]); }
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  if (!ready) return null;

  const c = t[lang];

  return (
    <div className="min-h-screen bg-[#111111] text-white" dir={c.dir}>

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-white/10 sticky top-0 bg-[#111111]/95 backdrop-blur z-50">
        <Logo size="sm" />
        <div className="flex items-center gap-3">
          {/* Language switcher */}
          <div className="flex rounded-lg border border-white/20 overflow-hidden text-sm">
            {(['fr', 'ar', 'en'] as Lang[]).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={`px-3 py-1.5 font-medium transition-colors ${lang === l ? 'bg-[#FF8C00] text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>
                {l === 'fr' ? 'FR' : l === 'ar' ? 'ع' : 'EN'}
              </button>
            ))}
          </div>
          <Link href="/login" className="text-sm text-white/60 hover:text-white px-2 transition-colors">{c.login}</Link>

          {/* Find a Race */}
          <div ref={searchRef} className="relative">
            <button onClick={() => { setShowResults(true); (document.getElementById('nav-search') as HTMLInputElement)?.focus(); }}
              className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:border-[#FF8C00] hover:bg-[#FF8C00]/10 transition-colors">
              <Search className="h-4 w-4" />
              {lang === 'ar' ? 'ابحث عن سباق' : lang === 'fr' ? 'Trouver une course' : 'Find a Race'}
            </button>
            {showResults && (
              <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-xl border border-[#333] bg-[#1a1a1a] shadow-2xl overflow-hidden">
                <div className="p-3 border-b border-white/10">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                    <input id="nav-search" type="text" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus
                      placeholder={lang === 'ar' ? 'اسم السباق...' : lang === 'fr' ? 'Nom de la course...' : 'Search races...'}
                      className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#FF8C00]" />
                  </div>
                </div>
                {searching && <div className="px-4 py-3 text-sm text-white/40">Searching…</div>}
                {!searching && results.length === 0 && (
                  <div className="px-4 py-4 text-sm text-white/40 text-center">
                    {query ? 'No events found' : (lang === 'fr' ? 'Tapez pour chercher' : lang === 'ar' ? 'اكتب للبحث' : 'Type to search')}
                  </div>
                )}
                {!searching && results.map((ev) => (
                  <Link key={ev.id} href={`/e/${ev.slug ?? ev.id}`} onClick={() => { setShowResults(false); setQuery(''); }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0">
                    {ev.logoUrl ? (
                      <img src={ev.logoUrl} alt="" className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-[#FF8C00]/20 flex items-center justify-center flex-shrink-0 text-[#FF8C00] text-xs font-bold">{ev.name[0]}</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{ev.name}</p>
                      <div className="flex items-center gap-3 text-xs text-white/40">
                        {ev.date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(ev.date).toLocaleDateString()}</span>}
                        {ev.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{ev.location}</span>}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-white/20 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Create a Race */}
          <Link href="/login" className="flex items-center gap-2 rounded-lg bg-[#FF8C00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e67e00] transition-colors">
            {lang === 'ar' ? 'أنشئ سباقاً' : lang === 'fr' ? 'Créer une course' : 'Create a Race'}
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,140,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,140,0,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        {/* Orange glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#FF8C00]/10 rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-8 py-28 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#FF8C00]/30 bg-[#FF8C00]/10 px-4 py-1.5 text-sm text-[#FF8C00]">
            <span className="h-2 w-2 rounded-full bg-[#FF8C00] animate-pulse inline-block" />
            {c.badge}
          </div>
          <h1 className="text-7xl font-black text-white leading-none mb-4 tracking-tight">كورسة</h1>
          <p className="text-3xl font-bold text-[#FF8C00] mb-6 tracking-widest">{c.slogan}</p>
          <p className="text-lg text-white/50 max-w-xl mx-auto mb-12">{c.heroDesc}</p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/login" className="rounded-xl bg-[#FF8C00] px-8 py-4 text-base font-bold text-white hover:bg-[#e67e00] shadow-lg shadow-[#FF8C00]/25 transition-all hover:scale-105">
              {c.start}
            </Link>
            <Link href="/login" className="rounded-xl border border-white/20 bg-white/5 px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition-all">
              {c.login}
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 border-t border-white/5">
        <div className="mx-auto max-w-6xl px-8">
          <h2 className="text-center text-3xl font-black text-white mb-2">{c.featTitle}</h2>
          <p className="text-center text-white/40 mb-14 text-sm">{c.featSub}</p>
          <div className="grid gap-5 sm:grid-cols-3">
            {c.features.map((f, i) => (
              <div key={f.title} className="group rounded-2xl border border-white/8 bg-white/3 p-6 hover:border-[#FF8C00]/40 hover:bg-[#FF8C00]/5 transition-all">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#FF8C00]/15 text-2xl">
                  {f.icon}
                </div>
                <h3 className="font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 border-t border-white/5">
        <div className="mx-auto max-w-4xl px-8">
          <h2 className="text-center text-3xl font-black text-white mb-14">{c.howTitle}</h2>
          <div className="grid gap-8 sm:grid-cols-3 text-center">
            {c.steps.map((s) => (
              <div key={s.step} className="flex flex-col items-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FF8C00] text-white font-black text-xl shadow-lg shadow-[#FF8C00]/30">
                  {s.step}
                </div>
                <h3 className="font-bold text-white mb-1">{s.title}</h3>
                <p className="text-sm text-white/40">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 border-t border-white/5">
        <div className="mx-auto max-w-5xl px-8">
          <h2 className="text-center text-3xl font-black text-white mb-2">{c.pricingTitle}</h2>
          <p className="text-center text-white/40 mb-14 text-sm">{c.pricingSub}</p>
          <div className="grid gap-6 sm:grid-cols-3">
            {c.packs.map((pack) => (
              <div key={pack.name}
                className={`relative rounded-2xl border flex flex-col p-8 transition-all
                  ${pack.popular ? 'border-[#FF8C00] bg-[#FF8C00]/8 shadow-lg shadow-[#FF8C00]/20' : 'border-white/10 bg-white/3 hover:border-white/20'}`}>
                {pack.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-[#FF8C00] px-4 py-1 text-xs font-bold text-white whitespace-nowrap">{c.popular}</span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-white mb-1">{pack.name}</h3>
                  <p className="text-sm text-white/40 mb-4">{pack.desc}</p>
                  <span className="inline-block rounded-full bg-white/10 px-3 py-0.5 text-xs font-medium text-white/60 mb-2">{pack.label}</span>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-black text-white">{pack.price === '0' ? c.free : `${pack.price} TND`}</span>
                    {pack.price !== '0' && <span className="text-white/30 text-sm mb-1">{c.perEvent}</span>}
                  </div>
                </div>
                <ul className="space-y-3 flex-1 mb-8">
                  {pack.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-white/60">
                      <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[#FF8C00]/20 text-[#FF8C00] text-xs">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/login"
                  className={`block rounded-xl px-6 py-3 text-center text-sm font-bold transition-colors
                    ${pack.popular ? 'bg-[#FF8C00] text-white hover:bg-[#e67e00]' : 'border border-white/20 text-white hover:bg-white/10'}`}>
                  {pack.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 border-t border-white/5">
        <div className="mx-auto max-w-3xl px-8 text-center">
          <div className="rounded-3xl border border-[#FF8C00]/30 bg-[#FF8C00]/8 p-14">
            <h2 className="text-3xl font-black text-white mb-3">{c.ctaTitle}</h2>
            <p className="text-white/50 mb-8 text-sm">{c.ctaSub}</p>
            <Link href="/login" className="inline-block rounded-xl bg-[#FF8C00] px-10 py-4 text-base font-bold text-white hover:bg-[#e67e00] shadow-lg shadow-[#FF8C00]/30 transition-all hover:scale-105">
              {c.start}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-white/20 border-t border-white/5">
        <div className="flex justify-center mb-3"><Logo size="sm" /></div>
        <p>© 2026 كورسة — Race Day Management Platform</p>
      </footer>

    </div>
  );
}
