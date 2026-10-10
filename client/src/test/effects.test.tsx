import { fireEvent, screen, within } from '@testing-library/react';
import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FeaturedCarousel } from '../features/home/FeaturedCarousel';
import { PhotoLightbox } from '../features/destinations/PhotoLightbox';
import { Hero } from '../features/home/Hero';
import { HeroSearch } from '../features/home/HeroSearch';
import { MountainFeature } from '../features/home/MountainFeature';
import { HeroScene } from '../features/home/orb/HeroScene';
import { OrbController } from '../features/home/orb/orbController';
import { ItineraryTimeline, type TimelineHandlers } from '../features/trips/ItineraryTimeline';
import type { DestinationCard, ItineraryDay } from '../lib/types';
import { mockApi, ok, renderWithProviders } from './utils';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function card(slug: string, name: string, country: string): DestinationCard {
  return {
    id: slug.padEnd(24, '0').slice(0, 24),
    slug,
    name,
    country,
    region: 'europe',
    location: { lat: 0, lng: 0 },
    summary: `${name} summary`,
    heroImage: { src: '', alt: name, focus: 'center', credit: { name: 'Photographer', url: 'https://unsplash.com' } },
    travelStyles: ['mountains'],
    bestMonths: [6, 7],
    suggestedDays: { min: 3, max: 5 },
    dailyTotalMinor: 20_000,
    currency: 'USD',
    budgetBand: 'comfortable',
  };
}

describe('hero scene wrapper', () => {
  it('shows the poster with an accessible description and never starts 3D without WebGL', () => {
    renderWithProviders(<HeroScene label="Orb between mountains" poster={<span data-testid="poster" />} className="relative h-64" />);
    const figure = screen.getByRole('img', { name: 'Orb between mountains' });
    expect(figure).toHaveAttribute('data-scene-status', 'poster');
    expect(within(figure).getByTestId('poster')).toBeInTheDocument();
    expect(figure.querySelector('canvas')).toBeNull();
  });
});

describe('mountain feature', () => {
  it('lists real mountain destinations from the API beside the scene', async () => {
    const { calls } = mockApi((url) => (url.includes('style=mountains') ? ok([card('banff', 'Banff', 'Canada'), card('zermatt', 'Zermatt', 'Switzerland')]) : undefined));
    renderWithProviders(<MountainFeature />);
    expect(await screen.findByRole('link', { name: /^Banff, Canada, about/ })).toHaveAttribute('href', '/destinations/banff');
    expect(screen.getByRole('link', { name: /^Zermatt, Switzerland/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'All mountain destinations' })).toHaveAttribute('href', '/destinations?style=mountains');
    expect(calls.some((call) => call.url.includes('/destinations?style=mountains'))).toBe(true);
  });

  it('offers a retry when the list fails', async () => {
    mockApi(() => ({ status: 500, body: { data: null, error: { code: 'INTERNAL', message: 'Boom' }, meta: null } }));
    renderWithProviders(<MountainFeature />);
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

describe('featured carousel', () => {
  it('moves between slides with buttons, arrow keys and the tab list', async () => {
    mockApi((url) => (url.includes('/destinations?limit=6') ? ok([card('kyoto', 'Kyoto', 'Japan'), card('lisbon', 'Lisbon', 'Portugal'), card('banff', 'Banff', 'Canada')]) : undefined));
    const user = userEvent.setup();
    renderWithProviders(<FeaturedCarousel />);

    expect(await screen.findByRole('group', { name: '1 of 3: Kyoto' })).toBeInTheDocument();

    // Slides animate out before the next one appears, so wait for each.
    const slide = (name: string) => screen.findByRole('group', { name });
    await user.click(screen.getByRole('button', { name: 'Next destination' }));
    fireEvent.keyDown(await slide('2 of 3: Lisbon'), { key: 'ArrowRight' });
    fireEvent.keyDown(await slide('3 of 3: Banff'), { key: 'ArrowRight' });
    await slide('1 of 3: Kyoto');
    await user.click(screen.getByRole('button', { name: 'Previous destination' }));
    await slide('3 of 3: Banff');

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    const lisbonTab = screen.getByRole('tab', { name: /Lisbon/ });
    await user.click(lisbonTab);
    await slide('2 of 3: Lisbon');
    expect(lisbonTab).toHaveAttribute('aria-selected', 'true');
  });
});

describe('itinerary reorder feedback', () => {
  const base: ItineraryDay = {
    id: 'd1',
    date: '2026-11-12',
    dayNumber: 1,
    activities: [
      { id: 'a1', title: 'Temple walk', category: 'activities', time: '08:00', location: '', notes: '', estimatedCostMinor: 0, order: 0 },
      { id: 'a2', title: 'Market lunch', category: 'food', time: '12:30', location: '', notes: '', estimatedCostMinor: 0, order: 1 },
    ],
  };

  function Harness({ onMove }: { onMove: TimelineHandlers['onMove'] }) {
    const [days, setDays] = useState([base]);
    const handlers: TimelineHandlers = {
      onAdd: vi.fn(),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
      onReorder: vi.fn(),
      onMove: (day, activity, direction) => {
        onMove(day, activity, direction);
        // Stand-in for the server confirming the new order.
        const list = [...day.activities];
        const from = list.findIndex((item) => item.id === activity.id);
        list.splice(from + direction, 0, ...list.splice(from, 1));
        setDays([{ ...day, activities: list }]);
      },
    };
    return <ItineraryTimeline days={days} currency="INR" format="d MMM yyyy" handlers={handlers} />;
  }

  it('keeps focus on the move button and highlights the moved activity once the server confirms', async () => {
    const onMove = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<Harness onMove={onMove} />);

    const button = screen.getByRole('button', { name: 'Move Market lunch earlier' });
    await user.click(button);
    expect(onMove).toHaveBeenCalledWith(base, base.activities[1], -1);

    const titles = screen.getAllByText(/^(Temple walk|Market lunch)$/).map((node) => node.textContent);
    expect(titles).toEqual(['Market lunch', 'Temple walk']);
    // The list stayed mounted (same button element). It is now at the top edge, so focus moves to
    // the activity's other move button rather than being lost.
    expect(screen.getByRole('button', { name: 'Move Market lunch earlier' })).toBe(button);
    expect(button).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Market lunch later' })).toHaveFocus();
    const movedItem = screen.getByText('Market lunch').closest('li');
    expect(movedItem).toHaveAttribute('data-highlighted', 'true');
    expect(screen.getByText('Temple walk').closest('li')).not.toHaveAttribute('data-highlighted');
  });
});

describe('hero search', () => {
  it('shows live results, browses them with the keyboard and opens one with Enter', async () => {
    const { calls } = mockApi((url) =>
      url.includes('q=ja') ? ok([card('kyoto', 'Kyoto', 'Japan')], { page: 1, limit: 5, total: 1, totalPages: 1 }) : undefined,
    );
    const onOutcome = vi.fn();
    const user = userEvent.setup();
    const { router } = renderWithProviders(<HeroSearch onOutcome={onOutcome} />);

    const input = screen.getByRole('combobox', { name: 'Search destinations' });
    await user.type(input, 'ja');
    const option = await screen.findByRole('option', { name: /Kyoto/ });
    expect(screen.getByRole('status')).toHaveTextContent('1 place matches');
    expect(onOutcome).toHaveBeenLastCalledWith({ state: 'results', count: 1 });
    expect(calls.some((call) => call.url.includes('/destinations?q=ja&limit=5'))).toBe(true);

    await user.keyboard('{ArrowDown}');
    expect(option).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', option.id);
    await user.keyboard('{Enter}');
    expect(router.state.location.pathname).toBe('/destinations/kyoto');
  });

  it('explains when nothing matches and reports it so the orb can sink', async () => {
    mockApi((url) => (url.includes('/destinations?q=') ? ok([], { page: 1, limit: 5, total: 0, totalPages: 1 }) : undefined));
    const onOutcome = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<HeroSearch onOutcome={onOutcome} />);
    await user.type(screen.getByRole('combobox', { name: 'Search destinations' }), 'zzzz');
    expect(await screen.findByText(/No places match “zzzz”/, { selector: 'p:not([role])' })).toBeInTheDocument();
    expect(onOutcome).toHaveBeenLastCalledWith({ state: 'empty' });
  });

  it('opens the full results page from the submit button', async () => {
    mockApi(() => ok([], { page: 1, limit: 5, total: 0, totalPages: 1 }));
    const user = userEvent.setup();
    const { router } = renderWithProviders(<HeroSearch onOutcome={vi.fn()} />);
    await user.type(screen.getByRole('combobox', { name: 'Search destinations' }), 'Portugal');
    await user.click(screen.getByRole('button', { name: /See all/ }));
    expect(router.state.location.pathname).toBe('/destinations');
    expect(router.state.location.search).toBe('?q=Portugal');
  });
});

describe('hero orb', () => {
  afterEach(() => document.documentElement.removeAttribute('data-motion'));

  it('chooses a real destination, moves focus to it and can choose again', async () => {
    document.documentElement.setAttribute('data-motion', 'reduce');
    mockApi((url) => (url.includes('/destinations?limit=24') ? ok([card('kyoto', 'Kyoto', 'Japan'), card('banff', 'Banff', 'Canada')]) : undefined));
    const user = userEvent.setup();
    renderWithProviders(<Hero />);

    await user.click(screen.getByRole('button', { name: 'Let the orb choose' }));
    const heading = await screen.findByRole('heading', { name: /^(Kyoto|Banff)$/ });
    expect(heading).toHaveFocus();
    const first = heading.textContent;
    const pickCard = heading.closest('article');
    expect(pickCard).not.toBeNull();
    const openLink = within(pickCard as HTMLElement).getByRole('link', { name: `Open ${first}` });
    expect(openLink.getAttribute('href')).toMatch(/^\/destinations\/(kyoto|banff)$/);
    expect(within(pickCard as HTMLElement).getByRole('link', { name: 'Plan it' }).getAttribute('href')).toMatch(/^\/app\/trips\/new\?destination=[a-z0-9]{24}$/);

    // Never the same place twice in a row.
    await user.click(screen.getByRole('button', { name: 'Choose again' }));
    const next = await screen.findByRole('heading', { name: first === 'Kyoto' ? 'Banff' : 'Kyoto' });
    expect(next).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Dismiss the orb’s choice' }));
    expect(await screen.findByRole('button', { name: 'Let the orb choose' })).toBeInTheDocument();
  });

  it('says so when it cannot reach the destinations', async () => {
    document.documentElement.setAttribute('data-motion', 'reduce');
    mockApi(() => ({ status: 500, body: { data: null, error: { code: 'INTERNAL', message: 'Boom' }, meta: null } }));
    const user = userEvent.setup();
    renderWithProviders(<Hero />);
    await user.click(screen.getByRole('button', { name: 'Let the orb choose' }));
    expect(await screen.findByText(/couldn’t reach the destinations/)).toBeInTheDocument();
  });
});

describe('orb controller', () => {
  function fakeObject(name: string, y = 0) {
    return { name, position: { x: 0, y, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } };
  }

  it('moves the named scene objects towards the pointer and lift targets', () => {
    const orb = fakeObject('sphere', 100);
    const ridge = fakeObject('mountain');
    const app = { findObjectByName: (name: string) => (name === 'sphere' ? orb : name === 'mountain' ? ridge : undefined) };
    const controller = new OrbController();
    expect(controller.attach(app as never)).toBe(true);

    controller.setPointer(1, 0);
    controller.setLift(1);
    for (let frame = 0; frame < 300; frame += 1) controller.step(1 / 60, 10_000 + frame * 16);
    expect(orb.position.y).toBeCloseTo(260, 0);
    expect(orb.position.x).toBeCloseTo(18, 0);
    expect(ridge.rotation.y).toBeCloseTo(0.07, 2);
    expect(controller.settling).toBe(false);

    controller.setLift(-5);
    for (let frame = 0; frame < 300; frame += 1) controller.step(1 / 60, 20_000 + frame * 16);
    expect(orb.position.y).toBeCloseTo(-20, 0);
  });

  it('moves the cursor light with the pointer and can start with the orb rising into place', () => {
    const orb = fakeObject('sphere', 60);
    const light = fakeObject('cursorLight', 280);
    const scene = { findObjectByName: (name: string) => (name === 'sphere' ? orb : name === 'cursorLight' ? light : undefined) };
    const controller = new OrbController();
    expect(controller.attach(scene, { rise: true })).toBe(true);

    controller.step(1 / 60, 10_000);
    expect(orb.position.y).toBeLessThan(0);
    controller.setPointer(-1, 1);
    for (let frame = 0; frame < 300; frame += 1) controller.step(1 / 60, 10_000 + frame * 16);
    expect(orb.position.y).toBeCloseTo(52, 0);
    expect(light.position.x).toBeCloseTo(-420, 0);
    expect(light.position.y).toBeCloseTo(140, 0);
  });

  it('does nothing when the scene lacks the expected objects', () => {
    const controller = new OrbController();
    expect(controller.attach({ findObjectByName: () => undefined })).toBe(false);
    expect(() => controller.step(0.016)).not.toThrow();
  });
});

describe('photo lightbox', () => {
  const photos = [
    { src: 'https://images.unsplash.com/photo-a', alt: 'A lake', focus: 'center', credit: { name: 'Ana', url: 'https://unsplash.com/a' } },
    { src: 'https://images.unsplash.com/photo-b', alt: 'A ridge', focus: 'center', credit: { name: 'Ben', url: 'https://unsplash.com/b' } },
    { src: 'https://images.unsplash.com/photo-c', alt: 'A town', focus: 'center', credit: { name: 'Cy', url: 'https://unsplash.com/c' } },
  ];

  function LightboxHarness() {
    const [index, setIndex] = useState<number | null>(null);
    return (
      <>
        <button type="button" onClick={() => setIndex(1)}>
          Open
        </button>
        <PhotoLightbox images={photos} index={index} onIndexChange={setIndex} place="Banff" />
      </>
    );
  }

  it('opens on the chosen photo and moves with buttons, arrow keys and thumbnails', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LightboxHarness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(await screen.findByText('Photo 2 of 3')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'A ridge' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next photo' }));
    expect(await screen.findByText('Photo 3 of 3')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Next photo' }), { key: 'ArrowRight' });
    expect(await screen.findByText('Photo 1 of 3')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Next photo' }), { key: 'ArrowLeft' });
    expect(await screen.findByText('Photo 3 of 3')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show photo 2: A ridge' }));
    expect(await screen.findByText('Photo 2 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show photo 2: A ridge' })).toHaveAttribute('aria-current', 'true');

    await user.click(screen.getByRole('button', { name: 'Close photos' }));
    expect(screen.queryByText(/Photo \d of 3/)).not.toBeInTheDocument();
  });
});
