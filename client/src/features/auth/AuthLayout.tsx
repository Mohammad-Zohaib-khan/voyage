import { Eye, EyeOff } from 'lucide-react';
import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { PhotoCredit, SmartImage } from '../../components/ui/SmartImage';
import { Input } from '../../components/ui/Form';
import type { ImageRef } from '../../lib/types';

interface AuthLayoutProps {
  title: string;
  intro: ReactNode;
  image: ImageRef;
  place: string;
  children: ReactNode;
}

/** Split layout for sign-in and registration: a calm photograph beside a focused form. */
export function AuthLayout({ title, intro, image, place, children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-[calc(100svh-4.5rem)] lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden lg:block">
        <div className="absolute inset-0">
          <SmartImage image={image} sizes="50vw" priority className="size-full" decorative />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgb(8_17_15/0.75),transparent_55%)]" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-paper xl:p-14">
          <p className="font-serif text-[2.5rem] leading-[1.05]">{place}</p>
          <PhotoCredit image={image} className="mt-3 text-paper/75" />
        </div>
      </div>
      <div className="page-x flex items-center justify-center py-14 lg:py-20">
        <div className="w-full max-w-[26rem]">
          <h1 className="font-serif text-h2">{title}</h1>
          <div className="mt-4 text-muted">{intro}</div>
          <div className="mt-10">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Password input with an accessible show/hide toggle. */
export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function PasswordInput(props, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input ref={ref} type={visible ? 'text' : 'password'} className="pr-12" spellCheck={false} autoCapitalize="none" {...props} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-pressed={visible}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink"
      >
        {visible ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
      </button>
    </div>
  );
});
