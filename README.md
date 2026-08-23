# AI Healthcare Frontend

Production-oriented frontend and design-system foundation for the AI Healthcare Front Desk Voice Agent. This iteration contains static showcase data only—no authentication, PHI, domain CRUD, or backend integration.

## Requirements and local setup

Use Node.js **20.19.6** and npm 10.

```bash
nvm use
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Validation commands are `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.

`NEXT_PUBLIC_API_BASE_URL` is the centralized backend origin plus version prefix, for example `http://localhost:3001/api/v1`. Never place secrets in `NEXT_PUBLIC_*` variables: they are exposed to the browser bundle.

## Frontend conventions

- Light and Dark modes must use semantic design tokens. Tokens live in `src/app/globals.css`; components should prefer names such as `background`, `card`, `primary`, `muted`, `border`, and `sidebar` over literal colors.
- Lucide outline icons are the standard application icon set. Use consistent 16–20px icons and avoid mixing icon libraries.
- Action/button labels use Title Case. For example, use `Add Appointment`, not `Add appointment`.
- Text actions use a meaningful icon on the left when one naturally exists. Icon-only controls require an accessible label.
- Server Components are the default. Client boundaries are limited to providers and interactive shell/theme controls.
- TanStack Query uses a single browser `QueryClient` with a one-minute stale time, one retry, and window-focus refetching disabled. Feature-level query keys belong with future features.
- `src/lib/api/client.ts` owns base URL resolution, JSON headers, cancellation signals, and typed API errors. Authentication headers are deliberately not implemented.

## Docker

Build and run independently:

```bash
docker build -t ai-healthcare-frontend .
docker run --rm -p 3000:3000 -e NEXT_PUBLIC_API_BASE_URL=http://host.docker.internal:3001/api/v1 ai-healthcare-frontend
```

From `ai_healthcare_backend`, the integrated stack can be built with `docker compose up --build`. The frontend is available at `http://localhost:3000` by default; this repository’s current backend environment exposes the API at `http://localhost:3001`. Public variables used by browser code are supplied as Docker build arguments and must never contain secrets.
