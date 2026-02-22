import { browser } from 'k6/browser';
import { check } from 'k6';

const BASE_URL = __ENV.WEB_BASE_URL || 'http://localhost:5173';

export const options = {
  scenarios: {
    browser: {
      executor: 'shared-iterations',
      options: {
        browser: {
          type: 'chromium'
        }
      },
      vus: 1,
      iterations: 1
    }
  }
};

export default async function () {
  const page = await browser.newPage();

  try {
    await page.goto(`${BASE_URL}/fileformats`, { waitUntil: 'networkidle' });

    const title = page.locator('h1');
    await title.waitFor();

    check(await title.textContent(), {
      'file formats title renders': (text) => text?.includes('File Formats') ?? false
    });

    const createButton = page.getByRole('button', { name: 'Create New Format' });
    await createButton.click();

    const profileInput = page.locator('#profile-name');
    await profileInput.waitFor();
    await profileInput.type('k6 Browser E2E Profile');

    const statusText = page.locator('text=No file loaded yet.');
    check(await statusText.isVisible(), {
      'wizard initial status visible': (visible) => visible
    });
  } finally {
    await page.close();
  }
}
