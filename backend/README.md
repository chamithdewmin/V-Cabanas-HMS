# MyAccounts Backend

Node.js + Express + PostgreSQL API for MyAccounts.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   - Copy `.env.example` to `.env`
   - Set `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`

3. **Initialize database**
   ```bash
   npm run db:init
   npm run db:seed
   ```

4. **Run**
   ```bash
   npm run dev
   ```

## API Base URL

- **Same domain** (production): `https://myaccounts.logozodev.com/api`
- **Different URL**: Set `VITE_API_URL` in frontend (e.g. `https://api.myaccounts.logozodev.com`)

Configure your reverse proxy (e.g. Nginx, Caddy) to route `/api` to the backend.

## Endpoints

| Method | Path | Auth |
|--------|------|------|
| POST | /api/auth/login | No |
| GET | /api/auth/me | Yes |
| GET/POST/PUT/DELETE | /api/clients | Yes |
| GET/POST/PUT/DELETE | /api/incomes | Yes |
| GET/POST/PUT/DELETE | /api/expenses | Yes |
| GET/POST/PATCH/DELETE | /api/invoices | Yes |
| GET/PUT | /api/settings | Yes |
| GET/POST/DELETE | /api/assets | Yes |
| GET/POST/DELETE | /api/loans | Yes |
| GET/POST/PUT/DELETE | /api/cars | Yes |
| GET/POST/PUT/DELETE | /api/customers | Yes |
| GET/POST | /api/orders | Yes |

## Default Login

- Email: `admin@gmail.com`
- Password: `admin123`

Run `npm run db:seed` after init to create this user.
