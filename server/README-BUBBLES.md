# Bubbles AI – Server Notes

## Environment

Required env vars:
- `DATABASE_URL` – PostgreSQL connection string
- `JWT_SECRET` – for auth middleware
- `OPENAI_API_KEY` – optional; if missing, mock responses are used

## Prisma

- Generate client: `npx prisma generate`
- Apply schema (dev): `npx prisma db push`
- Apply migrations (prod): `npx prisma migrate deploy`

## Workflow

- Initialize trackers for projects (main workflow):
  ```bash
  npm run workflow:init --prefix server
  ```

## Knowledge Base (minimal)

- Check local sources: `npm run kb:build --prefix server`

## Bubbles Endpoints

- `POST /api/bubbles/chat` – body: `{ message: string, projectId?: string }`
- `GET /api/bubbles/status`
- Insights endpoints under `/api/bubbles/insights/*`

## Tests

From `/workspace/server`:
```bash
npm i
npm test
```

## Notes

- When issuing actionable workflow requests, include a valid `projectId`.
- Socket.IO emits next-step alerts to `user_${userId}` rooms.