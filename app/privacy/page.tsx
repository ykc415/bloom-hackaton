import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy Policy — magent' };

export default function PrivacyPage() {
  return (
    <main className="main legal">
      <h1>Privacy Policy</h1>
      <p>Last updated: October 24, 2026</p>

      <h2>What magent accesses</h2>
      <p>If you choose to connect Gmail, magent requests read-only access (<code>gmail.readonly</code>) and searches only for purchase-related emails such as order confirmations, receipts and shipping notices from the last 12 months (up to 50 at a time).</p>

      <h2>How the data is used</h2>
      <p>The text of those emails is sent to Anthropic&apos;s Claude API to extract what you bought (merchant, product, brand, category, size, price) and to build a shopping profile: favorite brands, sizes, usual budgets, style and interests. Sensitive purchases (health, pharmacy, adult, financial and similar) are skipped. The profile is used only to personalize product recommendations inside magent. Product searches are sent to the Channel3 product catalog.</p>

      <h2>What is stored, and where</h2>
      <ul>
        <li>Your emails are never stored. They are processed in memory during a sync and discarded.</li>
        <li>Your Google refresh token is kept only in an encrypted, httpOnly cookie in your browser, so magent can check for new orders when you return. magent has no database.</li>
        <li>Your profile and conversations are stored in your browser&apos;s local storage.</li>
      </ul>

      <h2>Your controls</h2>
      <p>You can delete any profile entry or clear the whole profile from the Profile panel. &quot;Disconnect Gmail&quot; revokes magent&apos;s access token at Google and deletes the cookie. You can also remove access at any time from your Google Account permissions page.</p>

      <h2>Google API Services User Data Policy</h2>
      <p>magent&apos;s use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements. Gmail data is not sold, not used for advertising, and not used to train AI models.</p>

      <h2>Contact</h2>
      <p>magent.ssody@gmail.com</p>
    </main>
  );
}
