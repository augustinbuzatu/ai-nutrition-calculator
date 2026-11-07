// The shared demo account, for recruiters: its email and password stay on the
// server (DEMO_EMAIL and DEMO_PASSWORD in .env.local or on the host), and the
// "Try the demo" button signs in with them, so they never reach a browser.

export type DemoCredentials = { email: string; password: string };

/** The demo account's credentials, or null when there is no demo. */
export function demoCredentials(): DemoCredentials | null {
  const email = process.env.DEMO_EMAIL?.trim();
  const password = process.env.DEMO_PASSWORD;
  return email && password ? { email, password } : null;
}

export function isDemoConfigured(): boolean {
  return demoCredentials() !== null;
}
