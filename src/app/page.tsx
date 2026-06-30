'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUser, isLoggedIn } from '@/lib/auth';
import { Logo } from '@/components/ui/logo';

type Lang = 'fr' | 'ar' | 'en';

const t = {
  fr: {
    dir: 'ltr' as const,
    login: 'Connexion',
    start: 'Commencer gratuitement',
    badge: 'Plateforme de gestion du jour de course',
    slogan: 'La course commence',
    heroDesc: "De la ligne de départ jusqu'à l'arrivée — check-in, points de contrôle, bénévoles, tout en un seul endroit.",
    featTitle: 'Ce que vous pouvez faire avec BibOn',
    featSub: 'Tout ce dont vous avez besoin le jour de la course',
    howTitle: 'Comment ça marche',
    ctaTitle: 'Faites de votre prochaine course un succès',
    ctaSub: 'BibOn — La course commence',
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
        desc: 'Pour tester BibOn sur votre première course',
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
    featTitle: 'شنوة تقدر تعمل مع BibOn',
    featSub: 'كل اللي تحتاجه يوم السباق',
    howTitle: 'كيفاش تخدم',
    ctaTitle: 'خلّي السباق القادم بلا فوضى',
    ctaSub: 'BibOn — السباق بدا',
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
        desc: 'باش تجرّب BibOn في أول سباق',
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
    ctaSub: 'BibOn — The race begins',
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
        desc: 'Try BibOn on your first race',
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

  useEffect(() => {
    setReady(true);
    if (!isLoggedIn()) return;
    const role = getUser()?.role;
    if (role === 'VOLUNTEER') router.replace('/checkin');
    else if (role === 'PARTICIPANT') router.replace('/portal/my-registrations');
    else router.replace('/dashboard');
  }, [router]);

  if (!ready) return null;

  const c = t[lang];

  return (
    <div className="min-h-screen bg-white" dir={c.dir}>

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
        <Logo size="sm" />
        <div className="flex items-center gap-3">
          {/* Language switcher */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {(['fr', 'ar', 'en'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1.5 font-medium transition-colors ${lang === l ? 'bg-red-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                {l === 'fr' ? 'FR' : l === 'ar' ? 'ع' : 'EN'}
              </button>
            ))}
          </div>
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">
            {c.login}
          </Link>
          <Link href="/register" className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
            {c.start}
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-8 py-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-sm text-red-700">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse inline-block" />
          {c.badge}
        </div>
        <h1 className="text-5xl font-black text-gray-900 leading-tight mb-4">BibOn</h1>
        <p className="text-3xl font-bold text-red-600 mb-6 tracking-widest">{c.slogan}</p>
        <p className="text-lg text-gray-500 max-w-xl mx-auto mb-10">{c.heroDesc}</p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/register" className="rounded-xl bg-red-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-red-700 shadow-sm">
            {c.start}
          </Link>
          <Link href="/login" className="rounded-xl border border-gray-200 px-8 py-3.5 text-base font-semibold text-gray-700 hover:bg-gray-50">
            {c.login}
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-5xl px-8">
          <h2 className="text-center text-2xl font-bold text-gray-900 mb-2">{c.featTitle}</h2>
          <p className="text-center text-gray-500 mb-12 text-sm">{c.featSub}</p>
          <div className="grid gap-6 sm:grid-cols-3">
            {c.features.map((f) => (
              <div key={f.title} className="rounded-xl bg-white border border-gray-100 p-6 shadow-sm">
                <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg text-xl ${f.color}`}>
                  {f.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 mx-auto max-w-4xl px-8">
        <h2 className="text-center text-2xl font-bold text-gray-900 mb-12">{c.howTitle}</h2>
        <div className="grid gap-8 sm:grid-cols-3 text-center">
          {c.steps.map((s) => (
            <div key={s.step} className="flex flex-col items-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white font-black text-lg">
                {s.step}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{s.title}</h3>
              <p className="text-sm text-gray-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-5xl px-8">
          <h2 className="text-center text-2xl font-bold text-gray-900 mb-2">{c.pricingTitle}</h2>
          <p className="text-center text-gray-500 mb-12 text-sm">{c.pricingSub}</p>
          <div className="grid gap-6 sm:grid-cols-3">
            {c.packs.map((pack) => (
              <div
                key={pack.name}
                className={`relative rounded-2xl border-2 bg-white p-8 shadow-sm flex flex-col ${pack.color} ${pack.popular ? 'shadow-md' : ''}`}
              >
                {pack.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-red-600 px-4 py-1 text-xs font-semibold text-white whitespace-nowrap">
                      {c.popular}
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{pack.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">{pack.desc}</p>
                  <div className="mb-1">
                    <span className="inline-block rounded-full bg-gray-100 px-3 py-0.5 text-xs font-medium text-gray-600">
                      {pack.label}
                    </span>
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-black text-gray-900">
                      {pack.price === '0' ? c.free : `${pack.price} TND`}
                    </span>
                    {pack.price !== '0' && (
                      <span className="text-gray-400 text-sm mb-1">{c.perEvent}</span>
                    )}
                  </div>
                </div>
                <ul className="space-y-3 flex-1 mb-8">
                  {pack.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 text-xs font-bold">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`block rounded-xl px-6 py-3 text-center text-sm font-semibold transition-colors ${pack.ctaStyle}`}
                >
                  {pack.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-red-600 py-16 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">{c.ctaTitle}</h2>
        <p className="text-red-200 mb-8 text-sm">{c.ctaSub}</p>
        <Link href="/register" className="rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-red-600 hover:bg-red-50">
          {c.start}
        </Link>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-gray-400 border-t border-gray-100">
        <div className="flex justify-center mb-3"><Logo size="sm" /></div>
        <p>© 2026 BibOn — Race Day Management Platform</p>
      </footer>

    </div>
  );
}
