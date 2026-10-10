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
import { useRegister, useSession } from '../features/auth/session';
import { ApiError, errorMessage } from '../lib/api';
import type { ImageRef } from '../lib/types';
import { useDocumentTitle } from './useDocumentTitle';

const schema = z.object({
  displayName: z.string().trim().min(1, 'Tell us what to call you').max(60, 'Use 60 characters or fewer'),
  email: z.string().trim().min(1, 'Enter your email address').max(254).pipe(z.email('Enter a valid email address')),
  password: z.string().min(10, 'Use at least 10 characters').max(128, 'Use 128 characters or fewer'),
});
type Values = z.infer<typeof schema>;

const IMAGE: ImageRef = {
  src: 'https://images.unsplash.com/photo-1704365159747-1f7b8913044f',
  alt: 'Two boats on a calm river lined with palm trees',
  focus: '50% 50%',
  credit: { name: 'Swastik Arora', url: 'https://unsplash.com/photos/two-boats-are-in-the-middle-of-a-river-surrounded-by-palm-trees-6R_k1QF1LCw?utm_source=voyage_travel_planner&utm_medium=referral' },
};

export default function RegisterPage() {
  useDocumentTitle('Create an account');
  const [params] = useSearchParams();
  const next = safeNextPath(params.get('next'));
  const { user } = useSession();
  const registerUser = useRegister();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState, setError } = useForm<Values>({ resolver: zodResolver(schema) });

  if (user && !registerUser.isPending) return <Navigate to={next} replace />;

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await registerUser.mutateAsync(values);
      void navigate(next, { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'EMAIL_UNAVAILABLE') {
        setError('email', { message: error.message });
        return;
      }
      if (error instanceof ApiError && error.details.length) {
        for (const issue of error.details) {
          if (issue.path === 'displayName' || issue.path === 'email' || issue.path === 'password') setError(issue.path, { message: issue.message });
        }
        return;
      }
      setFormError(errorMessage(error, 'We couldn’t create your account. Try again in a moment.'));
    }
  });

  return (
    <AuthLayout
      title="Start planning"
      intro={
        <>
          Already have an account?{' '}
          <Link to={`/login${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`} className="link font-semibold text-ink">
            Sign in
          </Link>
        </>
      }
      image={IMAGE}
      place="The Kerala backwaters"
    >
      <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-6">
        {formError ? <FormError>{formError}</FormError> : null}
        <Field label="Your name" error={formState.errors.displayName?.message}>
          {({ id, describedBy, invalid }) => <Input id={id} autoComplete="name" aria-describedby={describedBy} invalid={invalid} {...register('displayName')} />}
        </Field>
        <Field label="Email" error={formState.errors.email?.message}>
          {({ id, describedBy, invalid }) => (
            <Input id={id} type="email" autoComplete="email" inputMode="email" aria-describedby={describedBy} invalid={invalid} {...register('email')} />
          )}
        </Field>
        <Field label="Password" hint="At least 10 characters. A short phrase you’ll remember works well." error={formState.errors.password?.message}>
          {({ id, describedBy, invalid }) => <PasswordInput id={id} autoComplete="new-password" aria-describedby={describedBy} invalid={invalid} {...register('password')} />}
        </Field>
        <Button type="submit" size="lg" loading={formState.isSubmitting} className="mt-2">
          Create account
        </Button>
        <p className="text-small text-faint">
          By creating an account you agree to the{' '}
          <Link to="/terms" className="link">
            terms
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="link">
            privacy notice
          </Link>
          .
        </p>
      </form>
    </AuthLayout>
  );
}
