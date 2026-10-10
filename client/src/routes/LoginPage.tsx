import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';
import { Button } from '../components/ui/Button';
import { FormError } from '../components/ui/Feedback';
import { Field, Input } from '../components/ui/Form';
import { AuthLayout, PasswordInput } from '../features/auth/AuthLayout';
import { safeNextPath } from '../features/auth/nextPath';
import { useLogin, useSession } from '../features/auth/session';
import { ApiError, errorMessage } from '../lib/api';
import type { ImageRef } from '../lib/types';
import { useDocumentTitle } from './useDocumentTitle';

const schema = z.object({
  email: z.string().trim().min(1, 'Enter your email address').pipe(z.email('Enter a valid email address')),
  password: z.string().min(1, 'Enter your password'),
});
type Values = z.infer<typeof schema>;

const IMAGE: ImageRef = {
  src: 'https://images.unsplash.com/photo-1695956353120-54ce5e91632b',
  alt: 'The City Palace on the banks of Lake Pichola at golden hour',
  focus: '50% 50%',
  credit: { name: 'Maitree Patel', url: 'https://unsplash.com/photos/city-palace-on-lake-pichola-udaipur-t2x2R0ZpXpw?utm_source=voyage_travel_planner&utm_medium=referral' },
};

export default function LoginPage() {
  useDocumentTitle('Sign in');
  const [params] = useSearchParams();
  const next = safeNextPath(params.get('next'));
  const { user } = useSession();
  const login = useLogin();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(schema) });

  if (user && !login.isPending) return <Navigate to={next} replace />;

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login.mutateAsync(values);
      void navigate(next, { replace: true });
    } catch (error) {
      setFormError(
        error instanceof ApiError && error.code === 'RATE_LIMITED' ? error.message : errorMessage(error, 'We couldn’t sign you in. Try again in a moment.'),
      );
    }
  });

  return (
    <AuthLayout
      title="Welcome back"
      intro={
        <>
          New to Voyage?{' '}
          <Link to={`/register${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`} className="link font-semibold text-ink">
            Create an account
          </Link>
        </>
      }
      image={IMAGE}
      place="Lake Pichola, Udaipur"
    >
      <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-6">
        {formError ? <FormError>{formError}</FormError> : null}
        <Field label="Email" error={formState.errors.email?.message}>
          {({ id, describedBy, invalid }) => (
            <Input id={id} type="email" autoComplete="email" inputMode="email" aria-describedby={describedBy} invalid={invalid} {...register('email')} />
          )}
        </Field>
        <Field label="Password" error={formState.errors.password?.message}>
          {({ id, describedBy, invalid }) => <PasswordInput id={id} autoComplete="current-password" aria-describedby={describedBy} invalid={invalid} {...register('password')} />}
        </Field>
        <Button type="submit" size="lg" loading={formState.isSubmitting} className="mt-2">
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
