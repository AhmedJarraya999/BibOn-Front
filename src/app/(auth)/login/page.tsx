'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { saveSession } from '@/lib/auth';

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const res = await api.post('/auth/login', data);
      saveSession(res.data.access_token, res.data.refresh_token, res.data.user);
      const role = res.data.user.role;
      if (role === 'VOLUNTEER') router.push('/checkin');
      else if (role === 'PARTICIPANT') router.push('/portal/my-registrations');
      else router.push('/dashboard');
    } catch {
      setError('Email ou mot de passe incorrect');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-black text-gray-900 mb-1">Connexion</h1>
      <p className="text-sm text-gray-500 mb-8">Bon retour — السباق بدا 👋</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            placeholder="vous@exemple.com"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            {...register('email')}
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Mot de passe</label>
          <input
            type="password"
            placeholder="••••••••"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            {...register('password')}
          />
          {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
        >
          {isSubmitting ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Pas encore de compte ?{' '}
        <Link href="/register" className="font-medium text-red-600 hover:underline">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}
