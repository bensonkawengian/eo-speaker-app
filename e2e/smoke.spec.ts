import { test, expect } from '@playwright/test';

test.describe('Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should not have any console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    await page.waitForLoadState('networkidle');
    expect(consoleErrors).toHaveLength(0);
  });

  test('should navigate to all routes and click all buttons', async ({ page }) => {
    // Check speakers tab
    await page.getByRole('button', { name: 'Speakers' }).click();
    await expect(page.getByRole('heading', { name: 'Find Your Next Unforgettable Speaker' })).toBeVisible();

    // Check nominate tab
    await page.getByRole('button', { name: 'Nominate' }).click();
    await expect(page.getByRole('heading', { name: 'Nominate a Speaker' })).toBeVisible();

    // Check admin tab
    await page.getByRole('button', { name: 'Admin Login' }).click();
    await page.getByLabel('Username').fill('eoapacadmin');
    await page.getByLabel('Password').fill('apac234');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByRole('heading', { name: 'Pending Nominations' })).toBeVisible();
  });

  test('should complete primary flows', async ({ page }) => {
    // Nomination flow
    await page.getByRole('button', { name: 'Nominate' }).click();
    await page.getByLabel("Speaker's Name").fill('Test Speaker');
    await page.getByLabel("Your Name (Referrer)").fill('Test Referrer');
    await page.getByLabel("Your EO Chapter / Organization (Referrer)").fill('Test Chapter');
    await page.getByLabel('Email').fill('test@test.com');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText('Nomination submitted successfully!')).toBeVisible();

    // Edit speaker flow
    await page.getByRole('button', { name: 'Admin' }).click();
    await page.getByRole('button', { name: 'Edit' }).first().click();
    await page.getByLabel("Full name").fill('Test Speaker Edited');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('Test Speaker Edited')).toBeVisible();

    // Rate speaker flow
    await page.getByRole('button', { name: 'Speakers' }).click();
    await page.getByRole('button', { name: 'View Profile' }).first().click();
    await page.getByPlaceholder('Your Name').fill('Test Rater');
    await page.getByPlaceholder('Rating (1-5)').fill('5');
    await page.getByPlaceholder('Comment').fill('Test comment');
    await page.getByRole('button', { name: 'Submit Review' }).click();
    await expect(page.getByText('Test Rater')).toBeVisible();

    // Search flow
    await page.getByPlaceholder('Name, topic, or chapter...').fill('Aisha');
    await expect(page.getByText('Aisha Tan')).toBeVisible();

    // AI topic suggest flow
    await page.getByRole('button', { name: 'Nominate' }).click();
    await page.getByPlaceholder('e.g., Jane Doe is an award-winning entrepreneur who...').fill('A bio');
    await page.getByRole('button', { name: '✨ Suggest Topics' }).click();
    await expect(page.getByDisplayValue('Leadership, Team Building, Scaling, Fundraising')).toBeVisible();
  });
});
