This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Browser tests

One Playwright test (`e2e/eligibility.spec.ts`) walks the main `/check` journey in Chromium:
fill the form, see the loading state, and read a cited verdict.

```bash
npx playwright install chromium   # first time only
npm run test:e2e
```

`playwright.config.ts` starts its own dev server on port 3100 with `NEXT_PUBLIC_API_URL`
pointed at an address nothing listens on, and the test answers `POST /eligibility` itself
with `page.route`. No backend is needed and no Gemini credits are spent. Stop any running
`npm run dev` first: Next refuses to start a second dev server in the same folder, and the
test run fails with "Process from config.webServer was not able to start".

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
