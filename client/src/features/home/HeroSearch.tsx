import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Loader2, Search } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';
import { SmartImage } from '../../components/ui/SmartImage';
import { api } from '../../lib/api';
import { cn } from '../../lib/cn';
import { formatMoney } from '../../lib/money';
import type { DestinationCard } from '../../lib/types';

export type SearchOutcome = { state: 'idle' } | { state: 'searching' } | { state: 'results'; count: number } | { state: 'empty' } | { state: 'error' };

const RESULT_LIMIT = 5;

function useDebounced(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/**
 * Live destination search for the hero, following the ARIA combobox pattern: results from the real
 * API appear as you type, arrow keys move through them, Enter opens one (or the full results page
 * when none is highlighted) and Escape closes the list. Reports its state so the scene can react.
 */
export function HeroSearch({ onOutcome }: { onOutcome: (outcome: SearchOutcome) => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const term = useDebounced(query.trim(), 220);
  const inputId = useId();
  const listId = useId();
  const statusId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data, isFetching, isError } = useQuery({
    queryKey: ['destinations', 'hero-search', term],
    queryFn: ({ signal }) => api.getPage<DestinationCard[]>(`/destinations?q=${encodeURIComponent(term)}&limit=${RESULT_LIMIT}`, signal),
    enabled: term.length > 0,
    staleTime: 5 * 60_000,
  });

  const typing = query.trim() !== term;
  const results = term && data ? data.items : [];
  const total = data?.meta.total ?? 0;

  let outcome: SearchOutcome = { state: 'idle' };
  if (query.trim()) {
    if (typing || (isFetching && !data)) outcome = { state: 'searching' };
    else if (isError) outcome = { state: 'error' };
    else if (results.length === 0) outcome = { state: 'empty' };
    else outcome = { state: 'results', count: total };
  }
  const outcomeKey = outcome.state === 'results' ? `results:${outcome.count}` : outcome.state;
  const lastOutcome = useRef('');
  useEffect(() => {
    if (lastOutcome.current === outcomeKey) return;
    lastOutcome.current = outcomeKey;
    onOutcome(outcome);
  });

  const showList = open && query.trim().length > 0;
  const openAll = () => {
    const value = query.trim();
    void navigate(value ? `/destinations?q=${encodeURIComponent(value)}` : '/destinations', { viewTransition: true });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, -1));
    } else if (event.key === 'Escape') {
      if (showList) {
        event.preventDefault();
        setOpen(false);
        setActive(-1);
      } else {
        setQuery('');
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const chosen = results[active];
      if (showList && chosen) void navigate(`/destinations/${chosen.slug}`, { viewTransition: true });
      else openAll();
    }
  };

  let status = '';
  if (outcome.state === 'results') status = `${outcome.count} ${outcome.count === 1 ? 'place matches' : 'places match'}. Use the arrow keys to browse.`;
  else if (outcome.state === 'empty') status = `No places match “${query.trim()}”. Try a place name or a country.`;
  else if (outcome.state === 'error') status = 'Search is unavailable right now. Try again in a moment.';

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onBlur={(event) => {
        if (!wrapperRef.current?.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          openAll();
        }}
        className="group relative"
      >
        <label htmlFor={inputId} className="sr-only">
          Search destinations
        </label>
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 transition-colors" style={{ color: 'var(--hs-muted)' }} />
        <input
          id={inputId}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          aria-describedby={statusId}
          autoComplete="off"
          spellCheck={false}
          maxLength={80}
          value={query}
          placeholder="Where to? A place or country"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-16 w-full rounded-[4px] border pr-32 pl-13 sm:pr-36 text-[1.0625rem] shadow-[0_20px_60px_-30px_rgb(0_0_0/0.4)] backdrop-blur-md transition-[border-color,background-color,box-shadow] duration-300 focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
          style={{
            backgroundColor: 'var(--hs-input-bg)',
            borderColor: 'var(--hs-input-border)',
            color: 'var(--hs-input-text)',
          }}
        />
        <button
          type="submit"
          className="absolute top-2 right-2 bottom-2 inline-flex items-center gap-2 rounded-[3px] px-5 text-small font-semibold transition-[transform,opacity] duration-200 hover:opacity-90 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{
            backgroundColor: 'var(--hs-btn-primary-bg)',
            color: 'var(--hs-btn-primary-text)',
          }}
        >
          {outcome.state === 'searching' ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
          {query.trim() ? 'See all' : 'Explore'}
          <ArrowRight aria-hidden="true" className="size-4" />
        </button>
      </form>

      <p id={statusId} role="status" className="sr-only">
        {status}
      </p>

      <div
        className={cn(
          'hs-card absolute inset-x-0 top-[calc(100%+0.5rem)] z-20 origin-top overflow-hidden rounded-[6px] border shadow-[0_30px_80px_-30px_rgb(0_0_0/0.5)] backdrop-blur-xl transition-[opacity,transform] duration-200',
          showList ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0',
        )}
      >
        <ul id={listId} role="listbox" aria-label="Matching destinations" className={cn('max-h-[22rem] overflow-y-auto p-2', results.length === 0 && 'hidden')}>
          {results.map((destination, index) => (
            <li
              key={destination.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              onPointerEnter={() => setActive(index)}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => void navigate(`/destinations/${destination.slug}`, { viewTransition: true })}
              className={cn(
                'grid cursor-pointer grid-cols-[3.5rem_1fr_auto] items-center gap-4 rounded-[4px] p-2 transition-colors',
                index === active ? 'bg-black/5 dark:bg-white/10 shadow-[inset_2px_0_0_#e3a184]' : 'hover:bg-black/5 dark:hover:bg-white/5',
              )}
              style={{ color: 'var(--hs-text)' }}
            >
              <SmartImage image={destination.heroImage} ratio={1} sizes="3.5rem" decorative maxWidth={240} className="rounded-[3px]" />
              <span className="min-w-0">
                <span className="block truncate font-serif text-[1.35rem] leading-tight" style={{ color: 'var(--hs-text)' }}>{destination.name}</span>
                <span className="block truncate text-small" style={{ color: 'var(--hs-muted)' }}>{destination.country}</span>
              </span>
              <span className="tabular pr-2 text-small" style={{ color: 'var(--hs-muted)' }}>≈ {formatMoney(destination.dailyTotalMinor, destination.currency, { compact: true })}/day</span>
            </li>
          ))}
        </ul>
        {outcome.state === 'empty' || outcome.state === 'error' ? <p className="px-5 py-4 text-small" style={{ color: 'var(--hs-muted)' }}>{status}</p> : null}
        {outcome.state === 'searching' && results.length === 0 ? <p className="px-5 py-4 text-small" style={{ color: 'var(--hs-muted)' }}>Searching…</p> : null}
        {outcome.state === 'results' && outcome.count > results.length ? (
          <button type="button" onClick={openAll} className="w-full border-t px-5 py-3 text-left text-small font-semibold hover:bg-black/5 dark:hover:bg-white/5" style={{ borderColor: 'var(--hs-border)', color: 'var(--hs-text)' }}>
            See all {outcome.count} matches
          </button>
        ) : null}
      </div>
    </div>
  );
}
