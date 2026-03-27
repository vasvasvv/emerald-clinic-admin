# Emerald Clinic Admin

Administrative panel for Emerald Clinic.

## Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- TanStack React Query
- React Router v6
- Vitest

## Requirements

- Node.js 20+
- npm 10+

## Getting Started

```bash
npm install
cp .env.example .env
npm run dev
```

Development server runs on [http://localhost:8080](http://localhost:8080).

## Environment Variables

Create `.env` from `.env.example`.

Available variables:

- `VITE_API_PROXY_TARGET`: backend target for the Vite dev proxy
- `VITE_DOCTOR_PHOTO_UPLOAD_ENDPOINT`: endpoint used to upload doctor photos

## Scripts

```bash
npm run dev
npm run build
npm run build:dev
npm run lint
npm run format
npm run format:check
npm run test
npm run test:watch
```

## Quality Gates

Project quality tooling currently includes:

- ESLint
- Prettier
- Vitest
- TypeScript strict mode
- GitHub Actions CI in `.github/workflows/ci.yml`
- Husky + lint-staged pre-commit hook

## Project Notes

- API requests go through `/proxy-api` in development.
- Authentication is handled in local storage and synchronized through the auth context.
- Data fetching is based on React Query hooks from `src/hooks`.
