import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

/**
 * The primary journey from the specification, in a real browser against the production build:
 * register → filter destinations → create a trip → add activities with costs → verify totals →
 * reorder → reload and verify persistence → export CSV → sign out → protected-route handling →
 * a second user cannot open the first user's trip.
 */

const stamp = Date.now();
const alice = { name: 'Alice Traveller', email: `alice.${stamp}@example.com`, password: 'quiet lanterns over the river' };
const bob = { name: 'Bob Traveller', email: `bob.${stamp}@example.com`, password: 'slow ferries and long lunches' };

function watchForProblems(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    const text = message.text();
    // Unsplash may be unreachable in CI sandboxes; image failures fall back to a panel.
    const offlineAsset = /images\.unsplash\.com|Failed to load resource/.test(text);
    if (message.type() === 'error' && !offlineAsset) problems.push(text);
    if (/Content Security Policy/i.test(text)) problems.push(`CSP: ${text}`);
  });
  return problems;
}

async function register(page: Page, user: typeof alice) {
  await page.goto('/register');
  await page.getByLabel('Your name').fill(user.name);
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(user.name.split(' ')[0] ?? '');
}

async function signOut(page: Page) {
  await page.getByRole('button', { name: /account menu/ }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
}

test('primary journey with persistence, export and two-user isolation', async ({ page }) => {
  const problems = watchForProblems(page);

  // Home renders with the real search.
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /Places worth/ })).toBeVisible();

  // Hero: live search answers as you type and opens a result from the keyboard.
  const search = page.getByRole('combobox', { name: 'Search destinations' });
  await search.fill('Japan');
  await expect(page.getByRole('option', { name: /Kyoto/ })).toBeVisible();
  await search.press('ArrowDown');
  await search.press('Enter');
  await expect(page).toHaveURL(/\/destinations\/kyoto$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Kyoto' })).toBeVisible();

  // The destination's photos open in a viewer that moves with the keyboard.
  await page.getByRole('button', { name: /View \d+ photos of Kyoto/ }).click();
  const viewer = page.getByRole('dialog', { name: /Kyoto/ });
  await expect(viewer.getByText(/Photo 1 of \d/)).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(viewer.getByText(/Photo 2 of \d/)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(viewer).toBeHidden();

  // "Let the orb choose" picks a real destination that can be opened.
  await page.goto('/');
  await page.getByRole('button', { name: 'Let the orb choose' }).click();
  const pick = page.getByRole('article', { name: /.+/ }).filter({ hasText: 'The orb chose' });
  await expect(pick).toBeVisible();
  const chosen = (await pick.getByRole('heading').textContent())?.trim() ?? '';
  await pick.getByRole('link', { name: `Open ${chosen}` }).click();
  await expect(page.getByRole('heading', { level: 1, name: chosen })).toBeVisible();

  await register(page, alice);

  // Discovery: combined filters narrow results and sync to the URL.
  await page.goto('/destinations');
  await expect(page.getByRole('heading', { name: /18 destinations/ })).toBeVisible();
  await page.getByRole('checkbox', { name: /Mountains/ }).check();
  await page.getByRole('checkbox', { name: 'Asia' }).check();
  await expect(page).toHaveURL(/style=mountains/);
  await expect(page).toHaveURL(/region=asia/);
  await expect(page.getByRole('heading', { name: /1 destination with 2 filters/ })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Ladakh' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear all' }).first().click();
  await expect(page.getByRole('heading', { name: /18 destinations/ })).toBeVisible();

  // Save a destination, then start a trip from its guide.
  await page.goto('/destinations/kyoto');
  await page.getByRole('button', { name: 'Save for later' }).click();
  await expect(page.getByText('Saved Kyoto.')).toBeVisible();
  await page.getByRole('button', { name: 'Add to a trip' }).first().click();
  await page.getByRole('link', { name: 'Start a new trip with Kyoto' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'A new trip' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove Kyoto' })).toBeVisible();
  await page.getByLabel('Trip name').fill('Kyoto in autumn');
  await page.getByLabel('Start date').fill('2027-11-10');
  await page.getByLabel('End date').fill('2027-11-12');
  await page.getByLabel(/Budget target/).fill('50000');
  await page.getByRole('button', { name: 'Create trip' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Kyoto in autumn' })).toBeVisible();
  const tripUrl = page.url();

  // Add three activities with costs.
  const addActivity = async (day: number, title: string, category: string, cost: string, time?: string) => {
    await page.getByRole('button', { name: `Add activity to day ${day}` }).click();
    const dialog = page.getByRole('dialog', { name: 'Add an activity' });
    await dialog.getByLabel('What’s the plan?').fill(title);
    await dialog.getByText(category, { exact: true }).click();
    if (time) await dialog.getByLabel('Time').fill(time);
    await dialog.getByLabel(/Estimated cost/).fill(cost);
    await dialog.getByRole('button', { name: 'Add activity' }).click();
    await expect(dialog).toBeHidden();
  };
  await addActivity(1, 'Ryokan check-in', 'Stay', '24000.50', '15:00');
  await addActivity(1, 'Kaiseki dinner', 'Food', '9000', '19:00');
  await addActivity(2, 'Fushimi Inari at dawn', 'Experiences', '0', '06:30');

  const budget = page.getByRole('complementary', { name: 'Budget' });
  await expect(budget.getByText('₹33,000.50')).toBeVisible();
  await expect(budget.getByText('₹16,500.25 per person')).toBeVisible();
  await expect(budget.getByText('₹16,999.50')).toBeVisible();

  // Reorder with the keyboard-accessible control.
  await page.getByRole('button', { name: 'Move Kaiseki dinner earlier' }).click();
  await expect(page.getByText('Moved Kaiseki dinner earlier on day 1.')).toBeAttached();
  const dayOne = page.locator('li[id^="day-"]').first();
  await expect(dayOne.locator('p.font-semibold').first()).toHaveText('Kaiseki dinner');

  // Reload: everything comes back from MongoDB.
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Kyoto in autumn' })).toBeVisible();
  await expect(page.locator('li[id^="day-"]').first().locator('p.font-semibold').first()).toHaveText('Kaiseki dinner');
  await expect(page.getByRole('complementary', { name: 'Budget' }).getByText('₹33,000.50')).toBeVisible();

  // Export CSV.
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('kyoto-in-autumn.csv');
  const csv = await readFile((await download.path()) ?? '', 'utf8');
  expect(csv).toContain('"Kaiseki dinner"');
  expect(csv).toContain('"Total estimate","33000.50"');
  expect(csv).toContain('"Remaining","16999.50"');

  // Sign out; protected routes now redirect to sign-in.
  await signOut(page);
  await page.goto(tripUrl);
  await expect(page).toHaveURL(/\/login\?next=/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

  // A second user cannot see the first user's trip.
  await register(page, bob);
  await page.goto(tripUrl);
  await expect(page.getByRole('heading', { name: 'We couldn’t find that trip' })).toBeVisible();
  await expect(page.getByText('Kyoto in autumn')).toHaveCount(0);
  await page.goto('/app/trips');
  await expect(page.getByRole('heading', { name: 'No trips yet' })).toBeVisible();
  await page.goto('/app/saved');
  await expect(page.getByRole('heading', { name: 'Nothing saved yet' })).toBeVisible();

  // And the first user still has everything after signing back in.
  await signOut(page);
  await page.goto('/login');
  await page.getByLabel('Email').fill(alice.email);
  await page.getByLabel('Password', { exact: true }).fill(alice.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Alice');
  await page.goto('/app/trips');
  await expect(page.getByRole('link', { name: 'Kyoto in autumn' })).toBeVisible();

  expect(problems).toEqual([]);
});

test('keyboard users can reach the main content and navigation', async ({ page }) => {
  await page.goto('/destinations');
  await expect(page.getByRole('heading', { level: 1, name: 'Destinations' })).toBeVisible();
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});
