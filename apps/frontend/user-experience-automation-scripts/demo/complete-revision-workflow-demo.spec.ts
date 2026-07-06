import path from 'path';

import { test, Page } from '@playwright/test';
import dotenv from 'dotenv';

import { getValidFrequencyAndBandwidth } from '../scripts/request-form/utils';

dotenv.config();

// Demo configuration
const DEMO_MODE = true;
const COMMERCIAL_USER_DELAY = 125; // 8x faster for commercial user actions (was 1000)
const ADMIN_USER_DELAY = 600; // Keep original speed for admin actions
const FORM_SECTION_DELAY = 1500; // Keep original pause between form sections

// Pause/Resume state
// let isPaused = false;

const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
const loginUrl = `${baseUrl}${process.env.LOGIN_URL || '/'}`;
const formUrl = `${baseUrl}${process.env.FORM_URL || '/create-request'}`;
const viewRequestsUrl = `${baseUrl}${process.env.VIEW_REQUESTS_URL || '/view-requests'}`;

const getFormattedRequestId = (rawId: string) =>
  `SLFCP-${rawId.toString().padStart(5, '0')}-${new Date().getFullYear()}`;

// Demo helper functions
const demoLog = (
  message: string,
  userType: 'commercial' | 'ntia' | 'navy' | 'nasa' | 'system' = 'system'
) => {
  const timestamp = new Date().toLocaleTimeString();
  const userEmoji = {
    commercial: '🏢',
    ntia: '🏛️',
    navy: '⚓',
    nasa: '🚀',
    system: '⚙️',
  };
  console.log(`\n${userEmoji[userType]} [${timestamp}] ${message}\n`);
};

const highlightElement = async (
  page: Page,
  selector: string,
  color = '#ff6b6b',
  duration = 2000
) => {
  if (!DEMO_MODE) return;

  // Check for pause before highlighting
  await waitForResume(page);

  try {
    // Use Playwright's locator to find the element first, then highlight it
    const element = page.locator(selector).first();
    if ((await element.count()) > 0) {
      await element.evaluate(
        (el, { color, duration }) => {
          const originalStyle = el.style.cssText;
          el.style.cssText += `
          outline: 3px solid ${color} !important;
          outline-offset: 2px !important;
          background-color: ${color}20 !important;
          transition: all 0.3s ease !important;
        `;
          setTimeout(() => {
            el.style.cssText = originalStyle;
          }, duration);
        },
        { color, duration }
      );
    }
  } catch {
    // Silently fail if element not found - this is for demo purposes
    console.log(`Could not highlight element: ${selector}`);
  }
};

// Global variable to track current user type
let currentUserType = null;

const createUserWatermark = async (page: Page, userType: string) => {
  if (!DEMO_MODE) return;

  console.log(`Creating watermark for user type: ${userType}`);
  currentUserType = userType;

  // Remove existing watermark if it exists
  await page.evaluate(() => {
    const existing = document.getElementById('demo-user-watermark');
    if (existing) {
      console.log('Removing existing watermark');
      existing.remove();
    }
  });

  // Create new watermark banner
  await page.evaluate((userType) => {
    console.log(`Creating watermark banner for: ${userType}`);

    const watermark = document.createElement('div');
    watermark.id = 'demo-user-watermark';

    // Format user type text
    let displayText;
    switch (userType.toUpperCase()) {
      case 'COMMERCIAL':
        displayText = 'COMMERCIAL USER';
        break;
      case 'NTIA':
        displayText = 'NTIA USER';
        break;
      case 'NAVY':
        displayText = 'FEDERAL AGENCY USER';
        break;
      case 'FEDERAL AGENCY':
        displayText = 'FEDERAL AGENCY USER';
        break;
      default:
        displayText = `${userType.toUpperCase()} USER`;
    }

    console.log(`Watermark text: ${displayText}`);

    watermark.innerHTML = displayText;
    watermark.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      width: 100vw !important;
      height: 30px !important;
      background: rgba(59, 130, 246, 0.15) !important;
      color: rgba(30, 64, 175, 0.9) !important;
      padding: 8px 0 !important;
      text-align: center !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 12px !important;
      font-weight: 500 !important;
      z-index: 2147483647 !important;
      border-bottom: 1px solid rgba(200, 200, 200, 0.2) !important;
      text-transform: uppercase !important;
      letter-spacing: 1px !important;
      pointer-events: none !important;
      opacity: 1 !important;
      display: block !important;
      visibility: visible !important;
      line-height: 14px !important;
      box-sizing: border-box !important;
    `;

    document.body.appendChild(watermark);
    console.log('Watermark added to body');

    // Verify it was added
    const added = document.getElementById('demo-user-watermark');
    if (added) {
      console.log('Watermark successfully added and found in DOM');
      console.log('Watermark styles:', added.style.cssText);
    } else {
      console.log('ERROR: Watermark not found after adding');
    }
  }, userType);

  // Add a small delay to ensure it's rendered
  await page.waitForTimeout(100);
};

// Function to ensure watermark persists after page navigation
const ensureWatermarkPersists = async (page: Page) => {
  if (!DEMO_MODE || !currentUserType) return;

  // Check if watermark exists, if not recreate it
  let watermarkExists = false;
  try {
    watermarkExists = await page.evaluate(() => {
      return document.getElementById('demo-user-watermark') !== null;
    });
  } catch {
    // Page context destroyed during navigation, watermark needs recreation
    console.log('Page context destroyed, watermark needs recreation');
    watermarkExists = false;
  }

  if (!watermarkExists) {
    console.log('Watermark missing after navigation, recreating...');
    await createUserWatermark(page, currentUserType);
  }
};

// Start periodic watermark monitoring
let monitoringActive = true;
const startWatermarkMonitoring = async (page: Page) => {
  if (!DEMO_MODE) return;

  // Check watermark every 2 seconds
  const checkWatermark = async () => {
    if (currentUserType && monitoringActive) {
      try {
        await ensureWatermarkPersists(page);
      } catch (error) {
        console.log(
          'Watermark monitoring error (likely during navigation):',
          error.message
        );
      }
    }
    if (monitoringActive) {
      setTimeout(checkWatermark, 2000);
    }
  };

  checkWatermark();
};

const stopWatermarkMonitoring = () => {
  monitoringActive = false;
};

// Function to remove overlay effects but keep highlights
const removeOverlays = async (page: Page) => {
  if (!DEMO_MODE) return;

  await page.evaluate(() => {
    // Remove all overlay elements (but keep highlights on elements)
    const overlays = document.querySelectorAll('.demo-highlight-overlay');
    overlays.forEach((overlay) => overlay.remove());

    // Remove all annotations
    const annotations = document.querySelectorAll('.demo-annotation');
    annotations.forEach((annotation) => annotation.remove());

    console.log('All overlays and annotations removed, highlights preserved');
  });
};

const createPauseResumeButton = async (page: Page) => {
  if (!DEMO_MODE) return;

  await page.evaluate(() => {
    // Remove existing button if it exists
    const existingButton = document.getElementById('demo-pause-resume-btn');
    if (existingButton) {
      existingButton.remove();
    }

    // Create the pause/resume button
    const button = document.createElement('button');
    button.id = 'demo-pause-resume-btn';
    button.innerHTML = '⏸️ Pause Demo';
    button.style.cssText = `
      position: fixed;
      bottom: 50px;
      left: 50px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 25px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      z-index: 99999;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
      backdrop-filter: blur(10px);
      border: 2px solid rgba(255,255,255,0.2);
      min-width: 140px;
      text-align: center;
    `;

    // Add hover effects
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
    });

    // Store pause state on window object for access across functions
    window.demoPaused = false;

    // Add click handler
    button.addEventListener('click', () => {
      window.demoPaused = !window.demoPaused;
      if (window.demoPaused) {
        button.innerHTML = '▶️ Resume Demo';
        button.style.background =
          'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)';

        // Show pause notification
        const notification = document.createElement('div');
        notification.id = 'demo-pause-notification';
        notification.innerHTML = '⏸️ Demo Paused - Click Resume to continue';
        notification.style.cssText = `
          position: fixed;
          bottom: 120px;
          left: 50px;
          background: rgba(231, 76, 60, 0.95);
          color: white;
          padding: 10px 16px;
          border-radius: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 13px;
          font-weight: 500;
          z-index: 99998;
          box-shadow: 0 4px 15px rgba(0,0,0,0.3);
          backdrop-filter: blur(10px);
          animation: slideInDown 0.3s ease-out;
          white-space: nowrap;
        `;
        document.body.appendChild(notification);
      } else {
        button.innerHTML = '⏸️ Pause Demo';
        button.style.background =
          'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

        // Remove pause notification
        const notification = document.getElementById('demo-pause-notification');
        if (notification) {
          notification.remove();
        }
      }
    });

    // Add CSS animations if not already added
    if (!document.getElementById('pause-button-styles')) {
      const style = document.createElement('style');
      style.id = 'pause-button-styles';
      style.textContent = `
        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(button);
  });
};

const waitForResume = async (page: Page) => {
  if (!DEMO_MODE) return;

  // Check if demo is paused and wait until resumed
  while (true) {
    const isPausedNow = await page.evaluate(() => window.demoPaused);
    if (!isPausedNow) break;
    await page.waitForTimeout(100); // Check every 100ms
  }
};

const demoGoto = async (page: Page, url: string) => {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Wait a bit for page to stabilize
    await page.waitForTimeout(1000);
    // Always recreate the pause/resume button after navigation
    await createPauseResumeButton(page);
    // Ensure watermark persists after navigation
    await ensureWatermarkPersists(page);
    // Check if we need to wait for resume after navigation
    await waitForResume(page);
  } catch (error) {
    console.log(`Navigation error to ${url}:`, error.message);
    throw error;
  }
};

const addAnnotation = async (
  page: Page,
  text: string,
  x = 50,
  y = 50,
  duration = 5000
) => {
  if (!DEMO_MODE) return;

  // Check for pause before adding annotation
  await waitForResume(page);

  await page.evaluate(
    ({ text, x, y, duration }) => {
      // Remove any existing annotations first
      const existingAnnotations = document.querySelectorAll('.demo-annotation');
      existingAnnotations.forEach((annotation) => {
        annotation.remove();
      });

      const annotation = document.createElement('div');
      annotation.className = 'demo-annotation'; // Add class for easy identification
      annotation.innerHTML = text;
      annotation.style.cssText = `
      position: fixed;
      top: ${y}px;
      left: ${x}px;
      background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 15px;
      font-weight: 500;
      z-index: 10001;
      box-shadow: 0 8px 25px rgba(0,0,0,0.4);
      border: 2px solid rgba(255,255,255,0.1);
      animation: fadeInSlide 0.5s ease-out;
      max-width: 400px;
      min-width: 250px;
      line-height: 1.5;
      backdrop-filter: blur(10px);
    `;

      // Add CSS animation
      if (!document.getElementById('demo-styles')) {
        const style = document.createElement('style');
        style.id = 'demo-styles';
        style.textContent = `
        @keyframes fadeInSlide {
          from { opacity: 0; transform: translateY(-15px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeOutSlide {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(-15px) scale(0.95); }
        }
      `;
        document.head.appendChild(style);
      }

      document.body.appendChild(annotation);

      setTimeout(() => {
        if (annotation.parentNode) {
          annotation.style.animation = 'fadeOutSlide 0.5s ease-out';
          setTimeout(() => annotation.remove(), 500);
        }
      }, duration);
    },
    { text, x, y, duration }
  );
};

const demoWait = async (
  page: Page,
  delay: number,
  userType: 'commercial' | 'admin' = 'admin'
) => {
  if (!DEMO_MODE) {
    await page.waitForTimeout(200);
    return;
  }

  // Check for pause before waiting
  await waitForResume(page);

  const actualDelay =
    userType === 'commercial' ? COMMERCIAL_USER_DELAY : ADMIN_USER_DELAY;
  await page.waitForTimeout(Math.max(delay, actualDelay));

  // Check for pause after waiting (in case user paused during the wait)
  await waitForResume(page);
};

const showUserContext = async (
  page: Page,
  userType: string,
  action: string
) => {
  if (!DEMO_MODE) return;

  // Create/update the user watermark
  await createUserWatermark(page, userType);

  await addAnnotation(
    page,
    `<strong>${userType.toUpperCase()} USER</strong><br/>${action}`,
    20,
    20,
    4000
  );
};

const openRequestDetails = async (
  page: Page,
  formattedRequestId: string,
  retries = 3
) => {
  await addAnnotation(
    page,
    `🔍 <strong>Searching for Request</strong><br/>📋 Looking for: ${formattedRequestId}<br/>🔎 Scanning through request database`,
    300,
    100,
    6000
  );

  for (let attempt = 1; attempt <= retries; attempt++) {
    demoLog(
      `Searching for request ${formattedRequestId} (attempt ${attempt}/${retries})`,
      'system'
    );

    await demoGoto(page, viewRequestsUrl);
    await highlightElement(page, 'table', '#3498db');
    await page.waitForSelector('table');
    await demoWait(page, 2000, 'admin');

    let found = false;
    let currentPage = 1;

    while (!found) {
      const row = await page
        .locator('table >> tr', {
          hasText: formattedRequestId,
        })
        .first();

      if (await row.count()) {
        await highlightElement(
          page,
          `tr:has-text("${formattedRequestId}")`,
          '#27ae60'
        );
        await addAnnotation(
          page,
          `✅ <strong>Request Found!</strong><br/>📄 Located on page ${currentPage}<br/>👁️ Opening request details`,
          300,
          150,
          6000
        );

        const viewButton = row.locator('a[aria-label^="View details"]');
        await viewButton.scrollIntoViewIfNeeded();
        await highlightElement(
          page,
          'a[aria-label^="View details"]',
          '#f39c12'
        );
        await demoWait(page, 1000, 'admin');
        await viewButton.click();
        return;
      }

      const nextButton = page.getByRole('button', { name: /next/i });
      const isDisabled = await nextButton.getAttribute('disabled');
      if (isDisabled !== null) {
        demoLog(
          `Request ${formattedRequestId} not found on page ${currentPage}`,
          'system'
        );
        break; // No more pages
      }

      await highlightElement(page, 'button:has-text("Next")', '#95a5a6');
      await nextButton.click();
      await demoWait(page, 1000, 'admin');
      currentPage++;
    }

    if (attempt < retries) {
      demoLog(
        `Request not found, waiting before retry ${attempt + 1}...`,
        'system'
      );
      await page.waitForTimeout(5000);
    }
  }

  throw new Error(
    `❌ Request ${formattedRequestId} not found after ${retries} attempts.`
  );
};

const fillCommentAndSubmit = async (
  page,
  comment: string,
  action: 'approve' | 'concur' | 'request_revisions',
  confidential = false,
  requestedChanges?: string
) => {
  const actionLabels = {
    approve: '✅ Approving',
    concur: '🤝 Concurring',
    request_revisions: '📝 Requesting Revisions',
  };

  await addAnnotation(page, `${actionLabels[action]} request`, 300, 200);

  await page.waitForSelector('textarea[name="comment"]');
  await highlightElement(page, 'textarea[name="comment"]', '#3498db');
  await demoWait(page, 800, 'admin');
  await page.locator('textarea[name="comment"]').fill(comment);

  if (confidential) {
    await highlightElement(page, '[name="is_internal"] + span', '#e74c3c');
    await demoWait(page, 500, 'admin');
    await page.locator('[name="is_internal"] + span').click();
    await addAnnotation(page, '🔒 Marking as confidential', 300, 250);
  }

  await highlightElement(page, 'select[name="action"]', '#f39c12');
  await demoWait(page, 800, 'admin');
  await page.selectOption('select[name="action"]', action);

  // If requesting revisions, fill in the requested changes
  if (action === 'request_revisions' && requestedChanges) {
    await page.waitForSelector('textarea[id="justificationTextVisible"]');
    await highlightElement(
      page,
      'textarea[id="justificationTextVisible"]',
      '#e67e22'
    );
    await addAnnotation(page, '📋 Adding revision details', 300, 300);
    await demoWait(page, 800, 'admin');
    await page
      .locator('textarea[id="justificationTextVisible"]')
      .fill(requestedChanges);
  }

  await highlightElement(page, 'button:has-text("Save")', '#27ae60');
  await demoWait(page, 1000, 'admin');
  await page.getByRole('button', { name: /^save$/i }).click();

  // Remove overlays after submission
  await removeOverlays(page);

  await page.waitForTimeout(3000);
};

const logOut = async (page) => {
  await addAnnotation(page, '👋 Logging out...', 300, 350);
  await highlightElement(page, 'button:has-text("Log Out")', '#95a5a6');
  await demoWait(page, 800, 'admin');
  await page.getByRole('button', { name: 'Log Out' }).click();
  await page.waitForTimeout(3000);

  // Remove user watermark when logging out and clear current user type
  currentUserType = null;
  await page.evaluate(() => {
    const existing = document.getElementById('demo-user-watermark');
    if (existing) existing.remove();
  });
  console.log('User logged out, watermark removed');
};

const submitInitialRequest = async (page) => {
  demoLog('Starting initial request submission process', 'commercial');
  await showUserContext(page, 'Commercial', 'Submitting new frequency request');

  // --- Login as commercial user ---
  await addAnnotation(
    page,
    '🏢 <strong>Commercial User Login</strong><br/>👤 Logging in as commercial@qa.com<br/>📝 Ready to submit frequency request',
    50,
    100,
    10000
  );

  // Wait for the login annotation to be visible
  await page.waitForTimeout(2000);

  await demoGoto(page, loginUrl);

  await highlightElement(page, 'input[type="email"]', '#3498db');
  await demoWait(page, 1000, 'commercial');
  await page.getByLabel('Email Address').fill('commercial@qa.com');

  await highlightElement(page, 'input[type="password"]', '#3498db');
  await demoWait(page, 800, 'commercial');
  await page.getByLabel('Password').fill('password123');

  await highlightElement(page, 'button:has-text("Sign In")', '#27ae60');
  await demoWait(page, 125, 'commercial');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for login to complete
  await page.waitForTimeout(3000);

  // Show commercial user watermark
  await createUserWatermark(page, 'Commercial');

  // Ensure watermark persists after login
  await ensureWatermarkPersists(page);

  // --- Navigate to homepage first ---
  await addAnnotation(
    page,
    '🏠 <strong>Navigating to Homepage</strong><br/>📋 Going to main dashboard<br/>🎯 Looking for New Request option',
    50,
    150,
    6000
  );
  await demoWait(page, 2000, 'commercial');
  await demoGoto(page, baseUrl);

  // Wait for homepage to fully load
  await page.waitForTimeout(2000);

  // --- Look for and click New Request button ---
  await addAnnotation(
    page,
    '➕ <strong>Starting New Request</strong><br/>� Searching for New Request button<br/>� Ready to create frequency request',
    50,
    200,
    6000
  );

  demoLog('Looking for New Request button on homepage', 'commercial');

  // Wait a bit more to ensure page is fully loaded
  await demoWait(page, 125, 'commercial');

  try {
    // Try multiple selectors for the New Request button
    const possibleSelectors = [
      'a[href*="create-request"]',
      'button:has-text("New Request")',
      'a:has-text("New Request")',
      'button:has-text("Create Request")',
      'a:has-text("Create Request")',
      'button:has-text("New")',
      'a:has-text("New")',
      '[data-testid="new-request"]',
      '[data-testid="create-request"]',
    ];

    let buttonFound = false;

    for (const selector of possibleSelectors) {
      const button = page.locator(selector).first();
      if ((await button.count()) > 0) {
        demoLog(
          `Found New Request button with selector: ${selector}`,
          'system'
        );
        await highlightElement(page, selector, '#27ae60');
        await demoWait(page, 2000, 'commercial');
        await button.click();
        buttonFound = true;
        break;
      }
    }

    if (!buttonFound) {
      // If no button found, try to look for any clickable element with "request" text
      demoLog('Standard selectors failed, trying broader search', 'system');
      const requestElements = page.locator(
        '*:has-text("Request"), *:has-text("request"), *:has-text("New"), *:has-text("Create")'
      );
      const count = await requestElements.count();

      if (count > 0) {
        demoLog(
          `Found ${count} elements with request-related text, trying first clickable one`,
          'system'
        );
        for (let i = 0; i < count; i++) {
          const element = requestElements.nth(i);
          const tagName = await element.evaluate((el) =>
            el.tagName.toLowerCase()
          );
          const isClickable =
            ['a', 'button'].includes(tagName) ||
            (await element.evaluate(
              (el) =>
                window.getComputedStyle(el).cursor === 'pointer' ||
                el.onclick !== null
            ));

          if (isClickable) {
            await highlightElement(
              page,
              `*:has-text("Request"):nth-child(${i + 1})`,
              '#f39c12'
            );
            await demoWait(page, 2000, 'commercial');
            await element.click();
            buttonFound = true;
            break;
          }
        }
      }
    }

    if (!buttonFound) {
      // Final fallback: navigate directly to form URL
      demoLog(
        'No New Request button found on homepage, navigating directly to form URL',
        'system'
      );
      await addAnnotation(
        page,
        '⚠️ <strong>Button Not Found</strong><br/>🔄 Navigating directly to form<br/>📝 Opening request form manually',
        50,
        250,
        4000
      );
      await demoGoto(page, formUrl);
    }
  } catch (error) {
    // Error fallback: navigate directly to form URL
    demoLog(`Error finding New Request button: ${error.message}`, 'system');
    await addAnnotation(
      page,
      '⚠️ <strong>Navigation Error</strong><br/>🔄 Using direct form URL<br/>📝 Opening request form manually',
      50,
      250,
      4000
    );
    await page.goto(formUrl);
  }

  // Wait before showing the next annotation
  await page.waitForTimeout(1500);

  // === TAB 0: Launch Site ===
  await addAnnotation(
    page,
    '🚀 <strong>Section 1: Launch Site Information</strong><br/>📍 Filling mission details and coordinates<br/>🗓️ Setting launch dates and orbital location',
    50,
    200,
    7000
  );
  await demoWait(page, FORM_SECTION_DELAY, 'commercial');

  demoLog('Filling launch site information', 'commercial');

  const missionField = page.locator('#mission_name');
  await highlightElement(page, 'input[name*="mission"]', '#3498db');
  await demoWait(page, 800, 'commercial');
  await missionField.fill('Falcon Heavy Demo Mission');

  const licenseeField = page.locator('#name_of_licensee');
  await highlightElement(page, 'input[name*="licensee"]', '#3498db');
  await demoWait(page, 800, 'commercial');
  await licenseeField.fill('SpaceX');

  const callSignField = page.locator('#call_sign');
  await highlightElement(page, 'input[name*="call"]', '#3498db');
  await demoWait(page, 800, 'commercial');
  await callSignField.fill('SLI-001');

  const vehicleField = page.locator('#name_of_launch_vehicle');
  await highlightElement(page, 'input[name*="vehicle"]', '#3498db');
  await demoWait(page, 800, 'commercial');
  await vehicleField.fill('Falcon Heavy');

  const cityField = page.locator('#city');
  await highlightElement(page, 'input[name*="city"]', '#3498db');
  await demoWait(page, 800, 'commercial');
  await cityField.fill('Cape Canaveral');

  const stateField = page.locator('#state');
  await highlightElement(page, 'select[name*="state"]', '#f39c12');
  await demoWait(page, 800, 'commercial');
  await stateField.selectOption({ label: 'Florida' });

  const latField = page.locator('#latitude');
  await highlightElement(page, 'input[name*="latitude"]', '#3498db');
  await demoWait(page, 800, 'commercial');
  await latField.fill('28.3922');

  const lonField = page.locator('#longitude');
  await highlightElement(page, 'input[name*="longitude"]', '#3498db');
  await demoWait(page, 800, 'commercial');
  await lonField.fill('80.6077');

  const primaryDateField = page.locator('#launch_datetime_primary');
  await highlightElement(page, 'input[name*="primary"]', '#e67e22');
  await demoWait(page, 800, 'commercial');
  await primaryDateField.fill('2030-07-10T08:30');

  const backupDateField = page.locator('#launch_datetime_backup');
  await highlightElement(page, 'input[name*="backup"]', '#e67e22');
  await demoWait(page, 800, 'commercial');
  await backupDateField.fill('2030-07-11T08:30');

  const orbitalField = page.locator('#orbital_location');
  await highlightElement(page, 'input[name*="orbital"]', '#3498db');
  await demoWait(page, 800, 'commercial');
  await orbitalField.fill('Geostationary Orbit over 75W');

  // Scroll to bottom to show navigation buttons
  await page.evaluate(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  });
  await demoWait(page, 1000, 'commercial');

  await addAnnotation(
    page,
    '➡️ <strong>Moving to Frequencies Section</strong><br/>📡 Next: Configure radio frequency parameters<br/>⚡ Setting up transmission details',
    50,
    250,
    6000
  );
  await highlightElement(page, '.forward-submit-btn', '#27ae60');
  await demoWait(page, 2000, 'commercial');
  await page.locator('.forward-submit-btn').click(); // go to Frequencies tab

  // === TAB 1: Frequencies ===
  await addAnnotation(
    page,
    '📡 <strong>Section 2: Frequency Information</strong><br/>🔢 Setting frequency values and bandwidth<br/>⚡ Configuring EIRP and transmitter location',
    50,
    200,
    7000
  );
  await demoWait(page, FORM_SECTION_DELAY, 'commercial');

  demoLog('Configuring frequency parameters', 'commercial');

  const frequenciesField = page.getByLabel('Number Of Frequencies');
  await highlightElement(page, 'input[name*="frequencies"]', '#3498db');
  await demoWait(page, 800, 'commercial');
  await frequenciesField.fill('1');

  await page.waitForTimeout(200);

  const { frequency, transmittedBandwidth } = getValidFrequencyAndBandwidth();
  const eirp = (Math.random() * 999).toFixed(2);
  const gain = (Math.random() * 99).toFixed(1);
  const beamwidth = (Math.random() * 360 + 1).toFixed(1);
  const shouldJustify = transmittedBandwidth > 5;

  await addAnnotation(
    page,
    `📊 <strong>Frequency Configuration</strong><br/>🔢 Setting frequency: ${frequency} MHz<br/>📡 Within approved frequency bands`,
    300,
    200,
    6000
  );
  const frequencyField = page.locator('#frequency');
  await highlightElement(page, 'input[name*="frequency"]', '#e67e22');
  await demoWait(page, 1000, 'commercial');
  await frequencyField.fill(frequency.toString());

  const transmitterField = page.locator(
    '#location_of_transmitter_on_vehicle_or_platform'
  );
  await highlightElement(page, 'select[name*="transmitter"]', '#f39c12');
  await demoWait(page, 800, 'commercial');
  await transmitterField.selectOption({ label: 'First Stage' });

  await addAnnotation(
    page,
    `⚡ <strong>Power Configuration</strong><br/>📊 EIRP: ${eirp} dBW<br/>🔋 Effective Isotropic Radiated Power`,
    300,
    250,
    6000
  );
  const eirpField = page.locator('#eirp');
  await highlightElement(page, 'input[role="spinbutton"]', '#e67e22');
  await demoWait(page, 800, 'commercial');
  await eirpField.fill(eirp);

  const eirpUnitButton = page.getByLabel(/Change the EIRP unit/);
  await highlightElement(page, 'button[aria-label*="EIRP"]', '#95a5a6');
  await demoWait(page, 600, 'commercial');
  await eirpUnitButton.click();

  await addAnnotation(
    page,
    `📶 <strong>Bandwidth Configuration</strong><br/>📊 Bandwidth: ${transmittedBandwidth} MHz<br/>📡 Signal transmission width`,
    300,
    300,
    6000
  );
  const bandwidthField = page.locator('#transmitted_bandwidth');
  await highlightElement(page, 'input[name*="bandwidth"]', '#e67e22');
  await demoWait(page, 1000, 'commercial');
  await bandwidthField.fill(transmittedBandwidth.toString());
  await bandwidthField.press('Tab');

  await addAnnotation(
    page,
    `🔧 <strong>Signal Filtering Configuration</strong><br/>📡 Setting signal filtering options<br/>⚙️ Configuring bandwidth parameters`,
    300,
    350,
    5000
  );
  await highlightElement(
    page,
    '#transmitted_bandwidth_is_signal_filtered',
    '#9b59b6'
  );
  await demoWait(page, 800, 'commercial');
  await page
    .locator('#transmitted_bandwidth_is_signal_filtered')
    .getByText('Signal is Filtered')
    .click();

  if (shouldJustify) {
    await addAnnotation(
      page,
      `📝 <strong>Bandwidth Justification</strong><br/>✍️ Explaining high bandwidth requirement<br/>📊 Technical justification needed`,
      300,
      400,
      5000
    );
    const justificationInput = page.locator(
      '#transmitted_bandwidth_justification'
    );
    await justificationInput.waitFor({ state: 'visible', timeout: 5000 });
    await highlightElement(page, 'textarea[name*="justification"]', '#e67e22');
    await demoWait(page, 1000, 'commercial');
    await justificationInput.fill(
      'High data rate required for mission-critical telemetry and payload data transmission'
    );
  }

  await addAnnotation(
    page,
    `📊 <strong>Detailed Bandwidth Settings</strong><br/>🔢 Configuring -3dB, -20dB, -60dB parameters<br/>📡 Precise signal characteristics`,
    300,
    200,
    6000
  );

  await highlightElement(page, 'input[name*="3db"]', '#3498db');
  await demoWait(page, 800, 'commercial');
  await page
    .locator('#minus_3db_bandwidth')
    .fill((Math.random() * 99).toFixed(2));

  await highlightElement(
    page,
    '#minus_3db_bandwidth_before_or_after_filtering',
    '#f39c12'
  );
  await demoWait(page, 600, 'commercial');
  await page
    .locator('#minus_3db_bandwidth_before_or_after_filtering')
    .getByText('Before Filtering')
    .click();

  await highlightElement(page, 'input[name*="20db"]', '#3498db');
  await demoWait(page, 800, 'commercial');
  await page
    .locator('#minus_20db_bandwidth')
    .fill((Math.random() * 99).toFixed(2));

  await highlightElement(
    page,
    '#minus_20db_bandwidth_before_or_after_filtering',
    '#f39c12'
  );
  await demoWait(page, 600, 'commercial');
  await page
    .locator('#minus_20db_bandwidth_before_or_after_filtering')
    .getByText('Before Filtering')
    .click();

  await highlightElement(page, 'input[name*="60db"]', '#3498db');
  await demoWait(page, 800, 'commercial');
  await page
    .locator('#minus_60db_bandwidth')
    .fill((Math.random() * 99).toFixed(2));

  await highlightElement(
    page,
    '#minus_60db_bandwidth_before_or_after_filtering',
    '#f39c12'
  );
  await demoWait(page, 600, 'commercial');
  await page
    .locator('#minus_60db_bandwidth_before_or_after_filtering')
    .getByText('Before Filtering')
    .click();

  await addAnnotation(
    page,
    `📻 <strong>Modulation & Emission Settings</strong><br/>🔧 Digital modulation signals<br/>📡 Then setting emission designator: 16K0F3E`,
    300,
    250,
    5000
  );
  await highlightElement(page, 'input[name*="modulating"]', '#e67e22');
  await demoWait(page, 800, 'commercial');
  await page.getByLabel('Nature of Modulating Signals').fill('Digital');

  await highlightElement(page, 'input[name*="emission"]', '#e67e22');
  await demoWait(page, 800, 'commercial');
  await page.getByLabel('Emission Designator').fill('16K0F3E');

  // TX
  await addAnnotation(
    page,
    `📡 <strong>Transmission Configuration</strong><br/>📅 Setting transmission schedule<br/>🕐 Start: 08:00 - End: 09:00`,
    300,
    300,
    5000
  );
  await highlightElement(page, 'input[name*="transmission_start"]', '#27ae60');
  await demoWait(page, 800, 'commercial');
  await page.locator('#tx_transmission_start').fill('2030-07-01T08:00');

  await highlightElement(page, 'input[name*="transmission_end"]', '#27ae60');
  await demoWait(page, 800, 'commercial');
  await page.locator('#tx_transmission_end').fill('2030-07-01T09:00');

  await addAnnotation(
    page,
    `📡 <strong>Antenna Configuration (TX)</strong><br/>🔧 Patch antenna with ${gain}dB gain<br/>📐 Beamwidth: ${beamwidth}°`,
    300,
    350,
    5000
  );
  await highlightElement(page, 'input[name*="antenna_type"]', '#e67e22');
  await demoWait(page, 800, 'commercial');
  await page.locator('#tx_antenna_type').fill('Patch Antenna');

  await highlightElement(page, 'input[name*="antenna_gain"]', '#f39c12');
  await demoWait(page, 800, 'commercial');
  await page.locator('#tx_antenna_gain').fill(gain);

  await highlightElement(page, 'input[name*="antenna_beamwidth"]', '#f39c12');
  await demoWait(page, 800, 'commercial');
  await page.locator('#tx_antenna_beamwidth').fill(beamwidth);

  const altitude = (Math.random() * 100).toFixed(2);
  await addAnnotation(
    page,
    `🏔️ <strong>Altitude Configuration</strong><br/>📏 Setting antenna altitude: ${altitude}<br/>🔄 Converting to appropriate units`,
    300,
    400,
    4000
  );
  await highlightElement(page, 'input[name*="altitude"]', '#9b59b6');
  await demoWait(page, 800, 'commercial');
  await page.locator('#tx_antenna_altitude').fill(altitude);

  await highlightElement(page, '#tx_antenna_altitude + div', '#95a5a6');
  await demoWait(page, 600, 'commercial');
  await page.locator('#tx_antenna_altitude + div').click();

  // Receiver Section (first receiver in the array)
  await addAnnotation(
    page,
    `📡 <strong>Reception Configuration</strong><br/>📅 Setting reception schedule<br/>🔄 Matching transmission parameters`,
    300,
    300,
    5000
  );
  await highlightElement(
    page,
    'input[name*="receivers.0.transmission_start"], input[name*="transmission_start"]',
    '#27ae60'
  );
  await demoWait(page, 800, 'commercial');
  await page
    .locator('#receivers\\.0\\.transmission_start')
    .fill('2030-07-01T08:00');

  await highlightElement(
    page,
    'input[name*="receivers.0.transmission_end"], input[name*="transmission_end"]',
    '#27ae60'
  );
  await demoWait(page, 800, 'commercial');
  await page
    .locator('#receivers\\.0\\.transmission_end')
    .fill('2030-07-01T09:00');

  await addAnnotation(
    page,
    `📡 <strong>Antenna Configuration (RX)</strong><br/>🔧 Dish antenna for ground reception<br/>📐 Optimized for signal reception`,
    300,
    350,
    5000
  );
  await highlightElement(
    page,
    'input[name*="receivers.0.antenna_type"], input[name*="antenna_type"]',
    '#e67e22'
  );
  await demoWait(page, 800, 'commercial');
  await page.locator('#receivers\\.0\\.antenna_type').fill('Dish Antenna');

  await highlightElement(
    page,
    'input[name*="receivers.0.antenna_gain"], input[name*="antenna_gain"]',
    '#f39c12'
  );
  await demoWait(page, 800, 'commercial');
  await page.locator('#receivers\\.0\\.antenna_gain').fill(gain);

  await highlightElement(
    page,
    'input[name*="receivers.0.antenna_beamwidth"], input[name*="antenna_beamwidth"]',
    '#f39c12'
  );
  await demoWait(page, 800, 'commercial');
  await page.locator('#receivers\\.0\\.antenna_beamwidth').fill(beamwidth);

  const rxAltitude = (Math.random() * 100).toFixed(2);
  await addAnnotation(
    page,
    `🏔️ <strong>RX Altitude Configuration</strong><br/>📏 Ground station altitude: ${rxAltitude}<br/>🌍 Earth-based reception point`,
    300,
    400,
    4000
  );
  await highlightElement(
    page,
    'input[name*="receivers.0.antenna_altitude"], input[name*="altitude"]',
    '#9b59b6'
  );
  await demoWait(page, 800, 'commercial');
  await page.locator('#receivers\\.0\\.antenna_altitude').fill(rxAltitude);

  await highlightElement(
    page,
    '#receivers\\.0\\.antenna_altitude + div',
    '#95a5a6'
  );
  await demoWait(page, 600, 'commercial');
  await page.locator('#receivers\\.0\\.antenna_altitude + div').click();

  await addAnnotation(
    page,
    `📍 <strong>Ground Station Location</strong><br/>🏢 Setting receiving ground station<br/>📡 First Stage location selected`,
    300,
    450,
    4000
  );
  await highlightElement(
    page,
    'select[name*="receivers.0.location_of_receiving_ground_station"], select[name*="receiving"]',
    '#f39c12'
  );
  await demoWait(page, 800, 'commercial');
  await page
    .locator('#receivers\\.0\\.location_of_receiving_ground_station')
    .selectOption({ label: 'First Stage' });

  await addAnnotation(
    page,
    `🌍 <strong>Antenna Coordinates</strong><br/>📍 Setting precise GPS coordinates<br/>🗺️ Latitude and longitude positioning`,
    300,
    500,
    5000
  );
  await highlightElement(
    page,
    'input[name*="receivers.0.latitude_of_receiving_antenna"], input[name*="latitude"]',
    '#27ae60'
  );
  await demoWait(page, 800, 'commercial');
  await page
    .locator('#receivers\\.0\\.latitude_of_receiving_antenna')
    .fill((Math.random() * 180 - 90).toFixed(4));

  await highlightElement(
    page,
    'input[name*="receivers.0.longitude_of_receiving_antenna"], input[name*="longitude"]',
    '#27ae60'
  );
  await demoWait(page, 800, 'commercial');
  await page
    .locator('#receivers\\.0\\.longitude_of_receiving_antenna')
    .fill((Math.random() * 360 - 180).toFixed(4));

  // Scroll to bottom to show Add Frequency button
  await page.evaluate(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  });
  await demoWait(page, 1000, 'commercial');

  await addAnnotation(
    page,
    `➕ <strong>Adding Frequency</strong><br/>✅ Frequency configuration complete<br/>📊 Adding to frequency list`,
    300,
    200,
    4000
  );
  await highlightElement(page, 'button:has-text("Add Frequency")', '#27ae60');
  await demoWait(page, 125, 'commercial');
  await page.getByRole('button', { name: /Add Frequency/i }).click();
  await page.waitForTimeout(400);

  // === TAB 2: Additional Information ===
  await addAnnotation(
    page,
    '📋 <strong>Section 3: Additional Information</strong><br/>📄 Adding technical documentation and contact info<br/>🗂️ Complete form with all required details',
    50,
    200,
    7000
  );
  await demoWait(page, FORM_SECTION_DELAY, 'commercial');

  // Scroll to top to show tabs clearly
  await page.evaluate(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  await demoWait(page, 1000, 'commercial');

  demoLog(
    'Adding supplementary documentation and contact information',
    'commercial'
  );
  const additionalInfoTab = page.getByRole('tab', {
    name: 'Additional Information',
  });
  await highlightElement(
    page,
    '[role="tab"]:has-text("Additional Information")',
    '#9b59b6'
  );
  await demoWait(page, 125, 'commercial');
  await additionalInfoTab.click();

  await addAnnotation(
    page,
    `📝 <strong>Ground Track Description</strong><br/>🚀 Describing launch trajectory<br/>🌍 Equatorial path to geostationary orbit`,
    300,
    250,
    5000
  );
  await highlightElement(page, 'textarea[name*="ground_track"]', '#3498db');
  await demoWait(page, 1000, 'commercial');

  try {
    await page
      .locator('#ground_track_from_liftoff_until_payload_separation')
      .fill(
        'Launch will follow equatorial trajectory toward geostationary orbit.'
      );
  } catch (error) {
    console.log(
      'Ground track field not found, trying alternative selector:',
      error.message
    );
    try {
      await page
        .locator('#ground_track_from_liftoff_until_payload_separation')
        .fill(
          'Launch will follow equatorial trajectory toward geostationary orbit.'
        );
    } catch (fallbackError) {
      console.log('Could not fill ground track field:', fallbackError.message);
    }
  }

  await addAnnotation(
    page,
    `📊 <strong>ECF Cartesian Vectors</strong><br/>📐 Describing coordinate format<br/>🔢 X, Y, Z vectors at 1-second intervals`,
    300,
    300,
    5000
  );
  await highlightElement(page, 'textarea[name*="ecf"]', '#e67e22');
  await demoWait(page, 1000, 'commercial');

  try {
    await page
      .locator('#ecf_cartesian_vectors_format_file_desc')
      .fill('Format includes X, Y, Z vectors at 1-second intervals.');
  } catch (error) {
    console.log(
      'ECF field not found, trying alternative selector:',
      error.message
    );
    try {
      await page
        .locator('#ecf_cartesian_vectors_format_file_desc')
        .fill('Format includes X, Y, Z vectors at 1-second intervals.');
    } catch (fallbackError) {
      console.log('Could not fill ECF field:', fallbackError.message);
    }
  }

  await addAnnotation(
    page,
    `📁 <strong>File Upload: ECF Data</strong><br/>📊 Uploading trajectory data file<br/>📈 Excel format with coordinate vectors`,
    300,
    350,
    5000
  );
  await highlightElement(
    page,
    'input[type="file"]#ecf_cartesian_vectors_format_file',
    '#f39c12'
  );
  await demoWait(page, 1000, 'commercial');
  try {
    await page.setInputFiles(
      'input[type="file"]#ecf_cartesian_vectors_format_file',
      path.join(
        __dirname,
        '..',
        'scripts',
        'request-form',
        'files',
        'testECF1.xls'
      )
    );
  } catch (error) {
    console.log('File upload failed, continuing without file:', error.message);
  }

  await addAnnotation(
    page,
    `🗺️ <strong>2D Ground Track Description</strong><br/>📸 Describing ground track image<br/>🌍 2D projection of flight path`,
    300,
    400,
    5000
  );
  await highlightElement(page, 'textarea[name*="2d_ground_track"]', '#9b59b6');
  await demoWait(page, 1000, 'commercial');

  try {
    await page
      .locator('#ground_track_of_launch_vehicle_2d_img_file_desc')
      .fill('PNG image showing 2D projection of flight path.');
  } catch (error) {
    console.log(
      '2D Ground Track field not found, trying alternative selector:',
      error.message
    );
    try {
      await page
        .locator('#ground_track_of_launch_vehicle_2d_img_file_desc')
        .fill('PNG image showing 2D projection of flight path.');
    } catch (fallbackError) {
      console.log(
        'Could not fill 2D Ground Track field:',
        fallbackError.message
      );
    }
  }

  await addAnnotation(
    page,
    `📁 <strong>File Upload: Ground Track Image</strong><br/>🖼️ Uploading ground track visualization<br/>📊 PNG format trajectory map`,
    300,
    450,
    5000
  );
  await highlightElement(
    page,
    'input[type="file"]#ground_track_of_launch_vehicle_2d_img_file',
    '#f39c12'
  );
  await demoWait(page, 1000, 'commercial');
  try {
    await page.setInputFiles(
      'input[type="file"]#ground_track_of_launch_vehicle_2d_img_file',
      path.join(__dirname, '..', 'scripts', 'request-form', 'files', 'cmis.png')
    );
  } catch (error) {
    console.log('File upload failed, continuing without file:', error.message);
  }

  await addAnnotation(
    page,
    `📅 <strong>FCC Filing Date</strong><br/>📋 Setting regulatory filing date<br/>🗓️ October 1, 2030`,
    300,
    200,
    4000
  );
  await highlightElement(page, 'input[name*="fcc"]', '#27ae60');
  await demoWait(page, 800, 'commercial');

  try {
    await page.locator('#fcc_filing_date').fill('2030-10-01');
  } catch (error) {
    console.log(
      'FCC Filing Date field not found, trying alternative selector:',
      error.message
    );
    try {
      await page.locator('#fcc_filing_date').fill('2030-10-01');
    } catch (fallbackError) {
      console.log(
        'Could not fill FCC Filing Date field:',
        fallbackError.message
      );
    }
  }

  // Points of Contact section (part of Additional Information tab)
  await addAnnotation(
    page,
    '👥 <strong>Points of Contact</strong><br/>📞 Adding primary and alternate contacts<br/>✉️ Setting up communication channels',
    50,
    200,
    7000
  );
  await demoWait(page, 1000, 'commercial');

  demoLog('Adding contact information', 'commercial');

  await addAnnotation(
    page,
    `👤 <strong>Primary Point of Contact</strong><br/>📝 Adding main contact: John Doe<br/>📧 john.doe@example.com`,
    300,
    250,
    5000
  );
  await highlightElement(
    page,
    'input[name*="primary"], label:has-text("Primary POC") + input',
    '#3498db'
  );
  await demoWait(page, 800, 'commercial');
  await page.locator('#primary_poc_name').fill('John Doe');

  await highlightElement(page, 'input[name*="email"]', '#3498db');
  await demoWait(page, 600, 'commercial');
  await page.locator('#primary_poc_email').fill('john.doe@example.com');

  await highlightElement(page, 'input[name*="phone"]', '#3498db');
  await demoWait(page, 600, 'commercial');
  await page.locator('#primary_poc_phone').fill('5551234567');

  await addAnnotation(
    page,
    `👥 <strong>Alternate Point of Contact</strong><br/>📝 Adding backup contact: Jane Smith<br/>📧 jane.smith@example.com`,
    300,
    300,
    5000
  );
  await highlightElement(
    page,
    'input[name*="alternate"], label:has-text("Alternate POC") + input',
    '#e67e22'
  );
  await demoWait(page, 800, 'commercial');
  await page.locator('#alternate_poc_name').fill('Jane Smith');

  await highlightElement(page, 'input[name*="email"]', '#e67e22');
  await demoWait(page, 600, 'commercial');
  await page.locator('#alternate_poc_email').fill('jane.smith@example.com');

  await highlightElement(page, 'input[name*="phone"]', '#e67e22');
  await demoWait(page, 600, 'commercial');
  await page.locator('#alternate_poc_phone').fill('5559876543');

  // === TAB 3: Summary ===
  await addAnnotation(
    page,
    '📄 <strong>Section 4: Review & Submit</strong><br/>👀 Final review of all entered data<br/>🚀 Ready to submit frequency request',
    50,
    200,
    7000
  );
  await demoWait(page, FORM_SECTION_DELAY, 'commercial');

  // Scroll to top to show tabs clearly
  await page.evaluate(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  await demoWait(page, 1000, 'commercial');

  demoLog('Reviewing request before submission', 'commercial');
  const summaryTab = page.getByRole('tab', { name: 'Summary' });
  await highlightElement(page, '[role="tab"]:has-text("Summary")', '#27ae60');
  await demoWait(page, 125, 'commercial');
  await summaryTab.click();

  // Scroll to bottom to show submit button
  await page.evaluate(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  });
  await demoWait(page, 1000, 'commercial');

  // Submit the request
  await addAnnotation(
    page,
    '🚀 <strong>Submitting Frequency Request</strong><br/>📤 Sending request to NTIA for review<br/>⏳ Awaiting confirmation...',
    50,
    250,
    6000
  );
  const submitButton = page.getByRole('button', { name: /submit/i });
  await highlightElement(page, 'button[type="submit"]', '#e74c3c');
  await demoWait(page, 2500, 'commercial');
  await submitButton.click();

  // Remove overlays after submission
  await removeOverlays(page);

  // Wait for the success modal to appear
  try {
    await page.waitForSelector('[role="dialog"]', { timeout: 15000 });
    await highlightElement(page, '[role="dialog"]', '#27ae60');
  } catch (error) {
    console.log('Modal not found, checking for other success indicators...');
    // Try to find alternative success indicators
    await page.waitForTimeout(3000);

    // Check if we're redirected to a success page or if there's another success indicator
    const currentUrl = page.url();
    console.log('Current URL after submission:', currentUrl);

    // If we can't find the modal, try to continue anyway
    if (!currentUrl.includes('create-request')) {
      console.log('Appears to have been redirected, continuing...');
    } else {
      throw error;
    }
  }

  // Extract request ID from the modal text
  const modalText = await page.locator('[role="dialog"]').textContent();
  const requestIdMatch = modalText?.match(/SLFCP-(\d+)-(\d{4})/);
  if (!requestIdMatch) {
    throw new Error(
      `Could not extract request ID from modal. Modal text: ${modalText}`
    );
  }

  const requestId = requestIdMatch[1];
  const formattedId = getFormattedRequestId(requestId);

  await addAnnotation(
    page,
    `✅ <strong>Request Successfully Created!</strong><br/>📋 Request ID: ${formattedId}<br/>📤 Submitted to NTIA for initial review`,
    50,
    300,
    8000
  );
  demoLog(`Commercial user submitted request ${formattedId}`, 'commercial');

  // Close the modal
  const okButton = page.getByRole('button', { name: /ok/i });
  await highlightElement(page, 'button:has-text("OK")', '#95a5a6');
  await demoWait(page, 2000, 'commercial');
  await okButton.click();
  await page.waitForTimeout(2000);

  await logOut(page);
  return requestId;
};

const reviseAndResubmitRequest = async (
  page,
  requestId: string,
  stepDescription: string,
  revisionType: 'initial' | 'final' = 'initial'
) => {
  const formattedRequestId = getFormattedRequestId(requestId);
  demoLog(`Starting revision process for ${formattedRequestId}`, 'commercial');
  await showUserContext(page, 'Commercial', 'Revising frequency request');

  // --- Login as commercial user ---
  await addAnnotation(
    page,
    '🔄 <strong>Commercial User - Revising Request</strong><br/>👤 Logging back in to make changes<br/>✏️ Addressing NTIA feedback',
    50,
    100,
    6000
  );
  await demoGoto(page, loginUrl);

  await highlightElement(
    page,
    'input[type="email"], input[name*="email"]',
    '#3498db'
  );
  await demoWait(page, 800, 'commercial');
  await page.getByLabel('Email Address').fill('commercial@qa.com');

  await highlightElement(
    page,
    'input[type="password"], input[name*="password"]',
    '#3498db'
  );
  await demoWait(page, 800, 'commercial');
  await page.getByLabel('Password').fill('password123');

  await highlightElement(
    page,
    'button[type="submit"], button:has-text("Sign In")',
    '#27ae60'
  );
  await demoWait(page, 1000, 'commercial');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Show commercial user watermark
  await createUserWatermark(page, 'Commercial');

  // Navigate directly to the revise request page
  const reviseUrl = `${baseUrl}/revise-request/${requestId}`;
  await addAnnotation(
    page,
    `📝 <strong>Opening Revision Form</strong><br/>📋 Request: ${formattedRequestId}<br/>🔧 Ready to make required changes`,
    50,
    150,
    6000
  );

  // Wait a bit for the status to update after NTIA requested revisions
  await page.waitForTimeout(1000);

  await demoGoto(page, reviseUrl);
  await demoWait(page, 2000, 'commercial');

  // Make the required changes based on NTIA's revision request
  const missionName =
    revisionType === 'initial' ? 'DEMO-MISSION-REV1' : 'DEMO-MISSION-FINAL';
  const orbitalLocation =
    revisionType === 'initial' ? 'GEO-SLOT-105W' : 'GEO-SLOT-110W';

  await addAnnotation(
    page,
    `✏️ <strong>Making Required Changes</strong><br/>📝 Updating mission name to "${missionName}"<br/>🛰️ Updating orbital location to "${orbitalLocation}"<br/>🔧 Implementing NTIA feedback`,
    50,
    200,
    8000
  );

  // Update Mission Name
  await highlightElement(
    page,
    'input[name*="mission"], label:has-text("Mission Name") + input',
    '#e67e22'
  );
  await demoWait(page, 125, 'commercial');
  await page.locator('#mission_name').fill(missionName);

  // Update Orbital Location
  await highlightElement(
    page,
    'input[name*="orbital"], label:has-text("Orbital Location") + input',
    '#e67e22'
  );
  await demoWait(page, 125, 'commercial');
  await page.locator('#orbital_location').fill(orbitalLocation);

  // Navigate through all tabs to ensure form validation passes
  await addAnnotation(
    page,
    '🔄 <strong>Navigating Form Sections</strong><br/>📋 Validating all form sections<br/>✅ Ensuring data integrity',
    50,
    250,
    6000
  );
  await highlightElement(page, '.forward-submit-btn', '#27ae60');
  await demoWait(page, 1000, 'commercial');
  await page.locator('.forward-submit-btn').click(); // go to Frequencies tab
  await page.waitForTimeout(1000);

  // Go to Additional Information tab
  await highlightElement(
    page,
    'button[role="tab"]:has-text("Additional Information")',
    '#9b59b6'
  );
  await demoWait(page, 800, 'commercial');
  await page.getByRole('tab', { name: 'Additional Information' }).click();
  await page.waitForTimeout(1000);

  // Navigate to summary tab (should now be enabled)
  await addAnnotation(
    page,
    '📄 <strong>Reviewing Changes</strong><br/>👀 Final review before resubmission<br/>✅ Confirming all revisions are complete',
    50,
    300,
    6000
  );
  await highlightElement(
    page,
    'button[role="tab"]:has-text("Summary")',
    '#27ae60'
  );
  await demoWait(page, 1000, 'commercial');
  await page.getByRole('tab', { name: 'Summary' }).click();

  // Scroll to bottom to show submit button
  await page.evaluate(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  });
  await demoWait(page, 1000, 'commercial');

  await highlightElement(
    page,
    'button:has-text("Submit"), button[type="submit"]',
    '#e74c3c'
  );
  await demoWait(page, 2000, 'commercial');
  await page.getByRole('button', { name: /submit/i }).click();

  // Remove overlays after submission
  await removeOverlays(page);

  // Wait for the success modal to appear and close it
  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
  await highlightElement(page, '[role="dialog"]', '#27ae60');
  await addAnnotation(
    page,
    '✅ <strong>Request Successfully Revised!</strong><br/>📤 Resubmitted to NTIA for review<br/>🔄 Revision cycle complete',
    50,
    350,
    8000
  );

  await highlightElement(
    page,
    'button:has-text("OK"), button:has-text("Close")',
    '#95a5a6'
  );
  await demoWait(page, 125, 'commercial');
  await page.getByRole('button', { name: /ok/i }).click();
  await page.waitForTimeout(2000);

  demoLog(
    `${stepDescription}: Commercial user revised and resubmitted request ${formattedRequestId}`,
    'commercial'
  );
  await logOut(page);
};

test('Complete revision workflow: Submit → NTIA requests revision → Revise → Approve → Concur → NTIA requests revision → Revise → Concur → Approve', async ({
  page,
}) => {
  test.setTimeout(7 * 60 * 1000); // 7 minutes timeout for demo

  // Set viewport to ensure large window size (90% height)
  await page.setViewportSize({ width: 1920, height: 972 });

  // Wait a moment for the viewport to be applied
  await page.waitForTimeout(1000);

  // Create the pause/resume button first
  await createPauseResumeButton(page);

  // Start watermark monitoring
  await startWatermarkMonitoring(page);

  demoLog('🎬 STARTING COMPLETE REVISION WORKFLOW DEMONSTRATION', 'system');
  await addAnnotation(
    page,
    '🎬 <strong>SLFCP Workflow Demonstration</strong><br/>📋 Complete Revision Process<br/>⏱️ This demo shows the full lifecycle of a frequency request<br/>🎮 Use the Pause/Resume button to control the demo',
    50,
    50,
    12000
  );

  // Wait longer for the intro annotation to be visible
  await page.waitForTimeout(3000);

  // Test watermark visibility
  await createUserWatermark(page, 'Commercial');
  console.log('Test watermark created at demo start');

  // Step 1: Commercial user submits initial request
  demoLog('=== STEP 1: INITIAL REQUEST SUBMISSION ===', 'system');
  const requestId = await submitInitialRequest(page);
  const formattedRequestId = getFormattedRequestId(requestId);

  // Step 2: NTIA requests revision with "initial changes"
  demoLog('=== STEP 2: NTIA INITIAL REVIEW ===', 'system');
  await showUserContext(page, 'NTIA', 'Reviewing submitted request');

  await addAnnotation(
    page,
    '🏛️ <strong>NTIA User Login</strong><br/>👤 Logging in as ntia@dev.com<br/>📋 Ready to review frequency request',
    50,
    100,
    10000
  );
  await demoGoto(page, loginUrl);

  await highlightElement(
    page,
    'input[type="email"], input[name*="email"]',
    '#e74c3c'
  );
  await demoWait(page, 800, 'admin');
  await page.getByLabel('Email Address').fill('ntia@dev.com');

  await highlightElement(
    page,
    'input[type="password"], input[name*="password"]',
    '#e74c3c'
  );
  await demoWait(page, 800, 'admin');
  await page.getByLabel('Password').fill('password123');

  await highlightElement(
    page,
    'button[type="submit"], button:has-text("Sign In")',
    '#27ae60'
  );
  await demoWait(page, 1500, 'admin');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Show NTIA user watermark
  await createUserWatermark(page, 'NTIA');

  await openRequestDetails(page, formattedRequestId);
  await fillCommentAndSubmit(
    page,
    'NTIA requesting initial revisions',
    'request_revisions',
    false,
    'Please make the following changes: 1) Change mission name from current value to "DEMO-MISSION-REV1" 2) Update orbital location to "GEO-SLOT-105W"'
  );
  demoLog(
    `Step 2: NTIA requested revision - Mission Name and Orbital Location changes for request ${formattedRequestId}`,
    'ntia'
  );
  await logOut(page);

  // Step 3: Commercial user revises and resubmits
  demoLog('=== STEP 3: COMMERCIAL USER REVISION ===', 'system');
  await reviseAndResubmitRequest(page, requestId, 'Step 3', 'initial');

  // Step 4: NTIA approves
  demoLog('=== STEP 4: NTIA APPROVAL ===', 'system');
  await showUserContext(page, 'NTIA', 'Reviewing revised request');

  await addAnnotation(page, '🏛️ NTIA - Reviewing Revision', 50, 100);
  await demoGoto(page, loginUrl);

  await highlightElement(
    page,
    'input[type="email"], input[name*="email"]',
    '#e74c3c'
  );
  await demoWait(page, 600, 'admin');
  await page.getByLabel('Email Address').fill('ntia@dev.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Show NTIA user watermark
  await createUserWatermark(page, 'NTIA');

  await openRequestDetails(page, formattedRequestId);
  await fillCommentAndSubmit(
    page,
    'NTIA initial approval after revision',
    'approve'
  );
  demoLog(`Step 4: NTIA approved request ${formattedRequestId}`, 'ntia');
  await logOut(page);

  // Step 5: Navy concurs
  demoLog('=== STEP 5: NAVY CONCURRENCE ===', 'system');
  await showUserContext(page, 'Navy', 'Reviewing approved request');

  await addAnnotation(
    page,
    '⚓ <strong>Navy User Login</strong><br/>👤 Logging in as federal@navy.gov<br/>🔍 Ready to review and concur',
    50,
    100,
    10000
  );
  await demoGoto(page, loginUrl);

  await highlightElement(
    page,
    'input[type="email"], input[name*="email"]',
    '#2c3e50'
  );
  await demoWait(page, 600, 'admin');
  await page.getByLabel('Email Address').fill('federal@navy.gov');

  await highlightElement(
    page,
    'input[type="password"], input[name*="password"]',
    '#2c3e50'
  );
  await demoWait(page, 600, 'admin');
  await page.getByLabel('Password').fill('password123');

  await highlightElement(
    page,
    'button[type="submit"], button:has-text("Sign In")',
    '#27ae60'
  );
  await demoWait(page, 800, 'admin');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Show Federal Agency user watermark
  await createUserWatermark(page, 'Federal Agency');

  await openRequestDetails(page, formattedRequestId);
  await fillCommentAndSubmit(page, 'Navy concurs with request', 'concur');
  demoLog(`Step 5: Navy concurred with request ${formattedRequestId}`, 'navy');
  await logOut(page);

  // Step 6: NASA concurs
  demoLog('=== STEP 6: NASA CONCURRENCE ===', 'system');
  await showUserContext(page, 'NASA', 'Reviewing approved request');

  await addAnnotation(
    page,
    '🚀 <strong>NASA User Login</strong><br/>👤 Logging in as federal@nasa.gov<br/>🔍 Ready to review and concur',
    50,
    100,
    10000
  );
  await demoGoto(page, loginUrl);

  await highlightElement(
    page,
    'input[type="email"], input[name*="email"]',
    '#f39c12'
  );
  await demoWait(page, 600, 'admin');
  await page.getByLabel('Email Address').fill('federal@nasa.gov');

  await highlightElement(
    page,
    'input[type="password"], input[name*="password"]',
    '#f39c12'
  );
  await demoWait(page, 600, 'admin');
  await page.getByLabel('Password').fill('password123');

  await highlightElement(
    page,
    'button[type="submit"], button:has-text("Sign In")',
    '#27ae60'
  );
  await demoWait(page, 800, 'admin');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Show Federal Agency user watermark
  await createUserWatermark(page, 'Federal Agency');

  await openRequestDetails(page, formattedRequestId);
  await fillCommentAndSubmit(page, 'NASA concurs with request', 'concur');
  demoLog(`Step 6: NASA concurred with request ${formattedRequestId}`, 'nasa');
  await logOut(page);

  // Step 7: NTIA requests revision with "final changes"
  demoLog('=== STEP 7: NTIA REQUESTS FINAL REVISION ===', 'system');
  await showUserContext(page, 'NTIA', 'Requesting final changes');

  await addAnnotation(
    page,
    '🏛️ <strong>NTIA - Final Review</strong><br/>👤 Logging in as ntia@dev.com<br/>📝 Requesting final revisions',
    50,
    100,
    10000
  );
  await demoGoto(page, loginUrl);

  await highlightElement(
    page,
    'input[type="email"], input[name*="email"]',
    '#e74c3c'
  );
  await demoWait(page, 600, 'admin');
  await page.getByLabel('Email Address').fill('ntia@dev.com');

  await highlightElement(
    page,
    'input[type="password"], input[name*="password"]',
    '#e74c3c'
  );
  await demoWait(page, 600, 'admin');
  await page.getByLabel('Password').fill('password123');

  await highlightElement(
    page,
    'button[type="submit"], button:has-text("Sign In")',
    '#27ae60'
  );
  await demoWait(page, 800, 'admin');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Show NTIA user watermark
  await createUserWatermark(page, 'NTIA');

  await openRequestDetails(page, formattedRequestId);
  await fillCommentAndSubmit(
    page,
    'NTIA requesting final revisions',
    'request_revisions',
    false,
    'Final revision required: 1) Change mission name to "DEMO-MISSION-FINAL" 2) Update orbital location to "GEO-SLOT-110W" for final approval'
  );
  demoLog(
    `Step 7: NTIA requested final revision - Mission Name and Orbital Location updates for request ${formattedRequestId}`,
    'ntia'
  );
  await logOut(page);

  // Step 8: Commercial user revises and resubmits
  demoLog('=== STEP 8: FINAL COMMERCIAL REVISION ===', 'system');
  await reviseAndResubmitRequest(page, requestId, 'Step 8', 'final');

  // Step 9: Navy concurs
  demoLog('=== STEP 9: NAVY FINAL CONCURRENCE ===', 'system');
  await showUserContext(page, 'Navy', 'Final concurrence after revision');

  await addAnnotation(
    page,
    '⚓ <strong>Navy - Final Concurrence</strong><br/>👤 Logging in as federal@navy.gov<br/>✅ Final approval step',
    50,
    100,
    6000
  );
  await demoGoto(page, loginUrl);

  await highlightElement(
    page,
    'input[type="email"], input[name*="email"]',
    '#2c3e50'
  );
  await demoWait(page, 600, 'admin');
  await page.getByLabel('Email Address').fill('federal@navy.gov');

  await highlightElement(
    page,
    'input[type="password"], input[name*="password"]',
    '#2c3e50'
  );
  await demoWait(page, 600, 'admin');
  await page.getByLabel('Password').fill('password123');

  await highlightElement(
    page,
    'button[type="submit"], button:has-text("Sign In")',
    '#27ae60'
  );
  await demoWait(page, 800, 'admin');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Show Federal Agency user watermark
  await createUserWatermark(page, 'Federal Agency');

  await openRequestDetails(page, formattedRequestId);
  await fillCommentAndSubmit(
    page,
    'Navy concurs with final revision',
    'concur'
  );
  console.log(
    `✅ Step 9: Navy concurred with final revision ${formattedRequestId}`
  );
  await logOut(page);

  // Step 10: NASA concurs
  demoLog('=== STEP 10: NASA FINAL CONCURRENCE ===', 'system');
  await showUserContext(page, 'NASA', 'Final concurrence after revision');

  await addAnnotation(
    page,
    '🚀 <strong>NASA - Final Concurrence</strong><br/>👤 Logging in as federal@nasa.gov<br/>✅ Final approval step',
    50,
    100,
    6000
  );
  await demoGoto(page, loginUrl);

  await highlightElement(
    page,
    'input[type="email"], input[name*="email"]',
    '#f39c12'
  );
  await demoWait(page, 600, 'admin');
  await page.getByLabel('Email Address').fill('federal@nasa.gov');

  await highlightElement(
    page,
    'input[type="password"], input[name*="password"]',
    '#f39c12'
  );
  await demoWait(page, 600, 'admin');
  await page.getByLabel('Password').fill('password123');

  await highlightElement(
    page,
    'button[type="submit"], button:has-text("Sign In")',
    '#27ae60'
  );
  await demoWait(page, 800, 'admin');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Show Federal Agency user watermark
  await createUserWatermark(page, 'Federal Agency');

  await openRequestDetails(page, formattedRequestId);
  await fillCommentAndSubmit(
    page,
    'NASA concurs with final revision',
    'concur'
  );
  console.log(
    `✅ Step 10: NASA concurred with final revision ${formattedRequestId}`
  );
  await logOut(page);

  // Step 11: NTIA final approval
  demoLog('=== STEP 11: NTIA FINAL APPROVAL ===', 'system');
  await showUserContext(page, 'NTIA', 'Final approval decision');

  await addAnnotation(
    page,
    '🏛️ <strong>NTIA - Final Approval</strong><br/>👤 Logging in as ntia@dev.com<br/>🎯 Making final approval decision',
    50,
    100,
    10000
  );
  await demoGoto(page, loginUrl);

  await highlightElement(
    page,
    'input[type="email"], input[name*="email"]',
    '#e74c3c'
  );
  await demoWait(page, 600, 'admin');
  await page.getByLabel('Email Address').fill('ntia@dev.com');

  await highlightElement(
    page,
    'input[type="password"], input[name*="password"]',
    '#e74c3c'
  );
  await demoWait(page, 600, 'admin');
  await page.getByLabel('Password').fill('password123');

  await highlightElement(
    page,
    'button[type="submit"], button:has-text("Sign In")',
    '#27ae60'
  );
  await demoWait(page, 800, 'admin');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Show NTIA user watermark
  await createUserWatermark(page, 'NTIA');

  await openRequestDetails(page, formattedRequestId);
  await fillCommentAndSubmit(page, 'NTIA final approval', 'approve');
  demoLog(
    `Step 11: NTIA gave final approval for request ${formattedRequestId}`,
    'ntia'
  );

  // Grand finale
  await addAnnotation(
    page,
    '🎉 <strong>WORKFLOW COMPLETE!</strong><br/>✅ Request Successfully Approved<br/>🚀 Ready for launch coordination',
    50,
    200,
    10000
  );
  demoLog(
    `🎉 COMPLETE WORKFLOW FINISHED SUCCESSFULLY FOR REQUEST ${formattedRequestId}`,
    'system'
  );

  // Show final summary
  await page.evaluate(() => {
    const summary = document.createElement('div');
    summary.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 30px;
        border-radius: 15px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        text-align: center;
        z-index: 10001;
        box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        max-width: 500px;
        line-height: 1.6;
      ">
        <h2 style="margin: 0 0 20px 0; font-size: 24px;">🎉 Demo Complete!</h2>
        <p style="margin: 0 0 15px 0; font-size: 16px;">
          <strong>SLFCP Workflow Demonstration</strong><br/>
          Complete Revision Process
        </p>
        <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px; margin: 20px 0;">
          <div style="font-size: 14px; opacity: 0.9;">
            ✅ Initial Request Submitted<br/>
            ✅ NTIA Initial Review & Revision Request<br/>
            ✅ Commercial User Revision<br/>
            ✅ NTIA Approval<br/>
            ✅ Navy & NASA Concurrence<br/>
            ✅ NTIA Final Review & Revision Request<br/>
            ✅ Final Commercial Revision<br/>
            ✅ Final Navy & NASA Concurrence<br/>
            ✅ NTIA Final Approval
          </div>
        </div>
        <p style="margin: 15px 0 0 0; font-size: 14px; opacity: 0.8;">
          Thank you for watching the SLFCP workflow demonstration!
        </p>
      </div>
    `;
    document.body.appendChild(summary);

    // setTimeout(() => {
    //   if (summary.parentNode) {
    //     summary.remove();
    //   }
    // }, 10000);
  });

  await page.waitForTimeout(5000);

  // Stop watermark monitoring before test ends
  stopWatermarkMonitoring();

  await page.pause();
});
