'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';
import { saveSession } from '@/lib/auth';

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});
type FormData = z.infer<typeof schema>;

const field = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition focus:border-[#FF8C00] focus:ring-2 focus:ring-[#FF8C00]/20';
const label = 'mb-1.5 block text-sm font-medium text-white/70';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const res = await api.post('/auth/login', data);
      saveSession(res.data.access_token, res.data.refresh_token, res.data.user);
      const role = res.data.user.role;
      if (role === 'VOLUNTEER') { router.push('/checkin'); return; }
      if (role === 'PARTICIPANT') { router.push('/portal/my-registrations'); return; }
      // Organizer/Admin: check if they already have events
      try {
        const evRes = await api.get('/events');
        const events = evRes.data?.data ?? (Array.isArray(evRes.data) ? evRes.data : []);
        if (Array.isArray(events) && events.length > 0) router.push(`/events/${events[0].id}`);
        else router.push('/events/new');
      } catch {
        router.push('/events/new');
      }
    } catch {
      setError('Email ou mot de passe incorrect');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-black text-white mb-1">Connexion</h1>
      <p className="text-sm text-white/40 mb-8">Bon retour على كورسة 👋</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className={label}>Email</label>
          <input type="email" placeholder="vous@exemple.com" className={field} {...register('email')} />
          {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
        </div>

        <div>
          <label className={label}>Mot de passe</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              className={`${field} pr-12`}
              {...register('password')}
            />
            <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-[#FF8C00] py-3 text-sm font-bold text-white hover:bg-[#e67e00] disabled:opacity-60 transition-all hover:scale-[1.02] shadow-lg shadow-[#FF8C00]/25"
        >
          {isSubmitting ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-white/40">
        Pas encore de compte ?{' '}
        <Link href="/register" className="font-medium text-[#FF8C00] hover:underline">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}
