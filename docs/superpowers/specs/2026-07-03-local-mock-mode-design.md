# Design Spec: Local Offline Mock Mode

Implement a zero-dependency, local offline mode in RM Gym 2 that allows the application to run completely without internet (no Supabase connection required).

## Goal
To toggle the application into a local database and mock authentication mode using an environment variable (`NEXT_PUBLIC_USE_MOCK_DATA=true`), so that the site can be run on a plane, on a train, or anywhere without WiFi.

---

## Architectural Design

```mermaid
graph TD
    subgraph Client (Browser)
        React[React Components] -->|query/auth| MockClient[Mock Supabase Client]
    end

    subgraph Server (Next.js Local)
        MockClient -->|POST /api/mock-db| MockRoute[Mock DB API Route]
        ReactServer[Server Components / Actions] -->|direct call| MockEngine[Mock DB Engine]
        MockRoute -->|call| MockEngine
        MockEngine -->|read/write| LocalDB[mock-db.json]
    end
    
    style LocalDB fill:#f9f,stroke:#333,stroke-width:2px
```

### 1. The Local Database File (`mock-db.json`)
A local JSON database stored in the root directory. It contains arrays for each database table:
* `members`
* `attendance`
* `renewals`
* `products`
* `sales`
* `profiles`
* `app_settings`
* `member_notification_logs`

We will create a `mock-db-seed.json` template with seed data pre-populated from `supabase_seed.sql` and `supabase_schema.sql` (so there are initial members, rates, and products). If `mock-db.json` does not exist, the server will copy the contents of `mock-db-seed.json` to initialize it.

`mock-db.json` is added to `.gitignore` so local changes are never committed.

### 2. The Mock Query Engine (`utils/supabase/mockEngine.ts`)
A Node.js module that:
* Reads and writes the JSON database file synchronously or asynchronously with locking to avoid write corruption.
* Implements a generic JS-based filter and query execution system matching the Supabase JS client builder pattern:
  * **Filter operations:** `eq`, `neq`, `in`
  * **Sorting:** `order`
  * **Limiting:** `limit`
  * **Select/Projections:** Returning specific fields (or nested properties).
  * **Aggregation/Lookup:** Basic simulation of profiles/joins if required.
  * **Modifiers:** `single()`, `maybeSingle()`.
  * **Mutations:** `insert()`, `update()`, `delete()`.

### 3. Client & Server Integration
We will conditionally return a Mock client inside `utils/supabase/client.ts` and `utils/supabase/server.ts`:
* If `process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true"`:
  * **Client client (`client.ts`):** Returns a proxy client. Any database chain (`supabase.from("...")`) returns a serialized chain description. When executed (by `await`ing the query or calling `.then()`), it sends a `POST` request with the serialized query to `/api/mock-db`.
  * **Server client (`server.ts`):** Returns the same query interface, but executes the query *directly in-process* using `mockEngine.ts` to avoid overhead and HTTP roundtrips.
  * **Auth handling:**
    * Read/write a cookie called `sb-mock-session`.
    * If `sb-mock-session` cookie is present, `supabase.auth.getUser()` returns a mock admin/staff user:
      * ID: `mock-admin-uuid-1111-2222-3333-444444444444`
      * Email: `admin@example.com`
      * Role: `authenticated`
    * `signInWithPassword()` accepts any login and sets the `sb-mock-session` cookie.
    * `signOut()` deletes the `sb-mock-session` cookie.

### 4. Mock DB API Route (`app/api/mock-db/route.ts`)
A route handling POST requests containing the table name, action (select, insert, update), and chain parameters (filters, order, limit, data payload). It runs the query through the `mockEngine` and returns the resulting `{ data, error }`.

---

## Verification Plan

### Automated Checks
* Run `npm run build` and `npm run lint` to ensure no TypeScript compilation or linting errors.

### Manual Verification (Offline Test Simulation)
1. Turn off internet / disconnect WiFi.
2. Set `NEXT_PUBLIC_USE_MOCK_DATA=true` in `.env.local`.
3. Launch local development server (`npm run dev`).
4. Access the login screen, enter any email/password, and verify successful login redirect.
5. Verify members list loads with the mock seeded members (Alice, Bob, Charlie, Diana).
6. Try checking in a member on the kiosk page and verify attendance increments.
7. Try adding a new member and editing an existing member.
8. Verify everything persists to `mock-db.json` and remains in sync on reload.
