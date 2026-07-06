'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import api from '@/lib/api';
import { saveSession } from '@/lib/auth';

const COUNTRIES = [
  'Tunisia', 'Algeria', 'Morocco', 'France', 'Belgium', 'Switzerland',
  'Germany', 'Italy', 'Spain', 'United Kingdom', 'United States', 'Canada',
  'Saudi Arabia', 'UAE', 'Qatar', 'Egypt', 'Libya', 'Senegal', 'Other',
];

const schema = z.object({
  firstName: z.string().min(2, 'Required'),
  lastName: z.string().min(2, 'Required'),
  email: z.string().email('Invalid email'),
  confirmEmail: z.string().email('Invalid email'),
  password: z.string().min(8, 'Minimum 8 characters'),
  confirmPassword: z.string().min(8, 'Required'),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  zipCode: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  hideFromResults: z.boolean().optional(),
  agreeTerms: z.literal(true, { error: 'You must agree to the terms' }),
}).refine((d) => d.email === d.confirmEmail, {
  message: 'Emails do not match',
  path: ['confirmEmail'],
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'One uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', ok: /[a-z]/.test(password) },
    { label: 'One number', ok: /[0-9]/.test(password) },
    { label: 'One special character', ok: /[~!@#$%^&*]/.test(password) },
  ];
  const passed = checks.filter((c) => c.ok).length;

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i < passed ? (passed >= 3 ? 'bg-green-500' : 'bg-amber-400') : 'bg-white/10'}`} />
        ))}
      </div>
      <p className="text-xs text-white/30">Meet at least 2 of the following:</p>
      <ul className="space-y-0.5">
        {checks.map((c) => (
          <li key={c.label} className={`flex items-center gap-1.5 text-xs ${c.ok ? 'text-green-400' : 'text-white/30'}`}>
            {c.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { hideFromResults: false, agreeTerms: undefined as any },
  });

  const password = watch('password') ?? '';

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const payload = {
        name: `${data.firstName} ${data.lastName}`,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        phone: data.phone || undefined,
        dateOfBirth: data.dateOfBirth || undefined,
        gender: data.gender || undefined,
        address: data.address || undefined,
        zipCode: data.zipCode || undefined,
        city: data.city || undefined,
        country: data.country || undefined,
        hideFromResults: data.hideFromResults ?? false,
      };
      const res = await api.post('/auth/register', payload);
      saveSession(res.data.access_token, res.data.refresh_token, res.data.user);
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Registration failed'));
    }
  };

  const field = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition focus:border-[#FF8C00] focus:ring-2 focus:ring-[#FF8C00]/20';
  const lbl = 'mb-1.5 block text-sm font-medium text-white/70';
  const errCls = 'mt-1 text-xs text-red-400';

  return (
    <div>
      <h1 className="text-2xl font-black text-white mb-1">Create your free account</h1>
      <p className="text-sm text-white/40 mb-8">انضم لـ كورسة — السباق بدا 🏁</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Name */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>First Name *</label>
            <input placeholder="Ahmed" className={field} {...register('firstName')} />
            {errors.firstName && <p className={errCls}>{errors.firstName.message}</p>}
          </div>
          <div>
            <label className={lbl}>Last Name *</label>
            <input placeholder="Ben Salem" className={field} {...register('lastName')} />
            {errors.lastName && <p className={errCls}>{errors.lastName.message}</p>}
          </div>
        </div>

        {/* Email */}
        <div>
          <label className={lbl}>Email Address *</label>
          <input type="email" placeholder="you@example.com" className={field} {...register('email')} />
          {errors.email && <p className={errCls}>{errors.email.message}</p>}
        </div>
        <div>
          <label className={lbl}>Confirm Email *</label>
          <input type="email" placeholder="you@example.com" className={field} {...register('confirmEmail')} />
          {errors.confirmEmail && <p className={errCls}>{errors.confirmEmail.message}</p>}
        </div>

        {/* Password */}
        <div>
          <label className={lbl}>Password *</label>
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} placeholder="••••••••" className={`${field} pr-12`} {...register('password')} />
            <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <PasswordStrength password={password} />
          {errors.password && <p className={errCls}>{errors.password.message}</p>}
        </div>
        <div>
          <label className={lbl}>Confirm Password *</label>
          <div className="relative">
            <input type={showConfirmPw ? 'text' : 'password'} placeholder="••••••••" className={`${field} pr-12`} {...register('confirmPassword')} />
            <button type="button" onClick={() => setShowConfirmPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
              {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && <p className={errCls}>{errors.confirmPassword.message}</p>}
        </div>

        {/* Address */}
        <div>
          <label className={lbl}>Address</label>
          <input placeholder="123 Main Street" className={field} {...register('address')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Zip Code</label>
            <input placeholder="1000" className={field} {...register('zipCode')} />
          </div>
          <div>
            <label className={lbl}>City</label>
            <input placeholder="Tunis" className={field} {...register('city')} />
          </div>
        </div>
        <div>
          <label className={lbl}>Country</label>
          <select className={`${field} [&>option]:bg-[#1a1a1a]`} {...register('country')}>
            <option value="">Select a country…</option>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Personal info */}
        <div>
          <label className={lbl}>Date of Birth</label>
          <input type="date" className={`${field} [color-scheme:dark]`} {...register('dateOfBirth')} />
        </div>
        <div>
          <label className={lbl}>Phone</label>
          <input type="tel" placeholder="+216 XX XXX XXX" className={field} {...register('phone')} />
        </div>
        <div>
          <label className={lbl}>Gender</label>
          <select className={`${field} [&>option]:bg-[#1a1a1a]`} {...register('gender')}>
            <option value="">Prefer not to say</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Options */}
        <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3">
          <p className="text-sm font-medium text-white/70 mb-3">Display Options</p>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-white/20 accent-[#FF8C00]" {...register('hideFromResults')} />
            <span className="text-sm text-white/50">Hide me from results and other public lists</span>
          </label>
        </div>

        {/* Terms */}
        <div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-white/20 accent-[#FF8C00]" {...register('agreeTerms')} />
            <span className="text-sm text-white/50">
              By checking this box, I certify that I am 18 or older and agree to the{' '}
              <Link href="/privacy" className="text-[#FF8C00] hover:underline">Privacy Policy</Link>. *
            </span>
          </label>
          {errors.agreeTerms && <p className={errCls}>{errors.agreeTerms.message}</p>}
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-[#FF8C00] py-3 text-sm font-bold text-white hover:bg-[#e67e00] disabled:opacity-60 transition-all hover:scale-[1.02] shadow-lg shadow-[#FF8C00]/25"
        >
          {isSubmitting ? 'Creating account…' : 'Create my account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-white/40">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-[#FF8C00] hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
