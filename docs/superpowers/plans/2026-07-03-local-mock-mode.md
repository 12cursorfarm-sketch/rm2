# Local Offline Mock Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a zero-dependency, local offline mode in RM Gym 2 that allows the application to run completely without internet (no Supabase connection required).

**Architecture:** We will create a local database file `mock-db.json` populated with seed data. We will mock the client/server Supabase clients to intercept queries, using in-process node file reads/writes on the server and a single Next.js API endpoint proxy (`/api/mock-db`) for the browser.

**Tech Stack:** Next.js, Node.js filesystem APIs, TypeScript, Cookies.

## Global Constraints
* Naming: Toggle via environment variable `NEXT_PUBLIC_USE_MOCK_DATA=true`.
* Cookies: Auth session stored in cookie `sb-mock-session`.
* SQLite / Node FS: Zero-dependency JSON storage in root path `mock-db.json`.

---

### Task 1: Repository Configuration & Seed Data Scaffolding

**Files:**
- Create: `mock-db-seed.json`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `mock-db-seed.json` template data for initialization.

- [ ] **Step 1: Create a git branch for mock development**
  Run command: `git checkout -b feat/local-mock-mode`
  Expected: Switches to the new branch.

- [ ] **Step 2: Append mock-db.json to .gitignore**
  Modify `/Users/macbookairm2/codebase/rm2/.gitignore` by adding `/mock-db.json` on a new line at the end to prevent local runtime data overrides from being committed.

- [ ] **Step 3: Create mock-db-seed.json with initial database state**
  Create `/Users/macbookairm2/codebase/rm2/mock-db-seed.json` with collections parsed from the SQL seeds.
  Content:
  ```json
  {
    "members": [
      {
        "id": "11111111-1111-1111-1111-111111111111",
        "name": "Alice Smith",
        "email": "alice@example.com",
        "membership_type": "monthly",
        "start_date": "2026-06-23",
        "end_date": "2026-07-23",
        "status": "active",
        "qr_code": "QR-ALICE-001",
        "payment_amount": 50.00,
        "created_at": "2026-06-23T12:00:00.000Z"
      },
      {
        "id": "22222222-2222-2222-2222-222222222222",
        "name": "Bob Jones",
        "email": "bob@example.com",
        "membership_type": "weekly",
        "start_date": "2026-06-30",
        "end_date": "2026-07-07",
        "status": "active",
        "qr_code": "QR-BOB-002",
        "payment_amount": 15.00,
        "created_at": "2026-06-30T12:00:00.000Z"
      },
      {
        "id": "33333333-3333-3333-3333-333333333333",
        "name": "Charlie Brown",
        "email": "charlie@example.com",
        "membership_type": "1_day",
        "start_date": "2026-07-03",
        "end_date": "2026-07-03",
        "status": "active",
        "qr_code": "QR-CHARLIE-003",
        "payment_amount": 5.00,
        "created_at": "2026-07-03T12:00:00.000Z"
      },
      {
        "id": "44444444-4444-4444-4444-444444444444",
        "name": "Diana Prince",
        "email": "diana@example.com",
        "membership_type": "monthly",
        "start_date": "2026-05-24",
        "end_date": "2026-06-23",
        "status": "expired",
        "qr_code": "QR-DIANA-004",
        "payment_amount": 50.00,
        "created_at": "2026-05-24T12:00:00.000Z"
      }
    ],
    "attendance": [
      {
        "id": "a1111111-1111-1111-1111-111111111111",
        "member_id": "11111111-1111-1111-1111-111111111111",
        "check_in_date": "2026-07-03",
        "created_at": "2026-07-03T09:00:00.000Z"
      },
      {
        "id": "a2222222-2222-2222-2222-222222222222",
        "member_id": "11111111-1111-1111-1111-111111111111",
        "check_in_date": "2026-07-02",
        "created_at": "2026-07-02T09:00:00.000Z"
      },
      {
        "id": "a3333333-3333-3333-3333-333333333333",
        "member_id": "22222222-2222-2222-2222-222222222222",
        "check_in_date": "2026-07-03",
        "created_at": "2026-07-03T10:00:00.000Z"
      }
    ],
    "renewals": [
      {
        "id": "r1111111-1111-1111-1111-111111111111",
        "member_id": "44444444-4444-4444-4444-444444444444",
        "membership_type": "monthly",
        "previous_end_date": "2026-05-24",
        "new_end_date": "2026-06-23",
        "payment_amount": 45.00,
        "renewed_by": "System Seed",
        "created_at": "2026-05-24T12:00:00.000Z"
      }
    ],
    "app_settings": [
      { "key": "session_rate", "value": 70.00 },
      { "key": "weekly_rate", "value": 200.00 },
      { "key": "monthly_rate", "value": 600.00 },
      { "key": "student_rate", "value": 500.00 }
    ],
    "products": [
      {
        "id": "p1111111-1111-1111-1111-111111111111",
        "name": "Water Bottle",
        "category": "Drinks",
        "price": 20.00,
        "stock_count": 50,
        "total_sold": 5,
        "image_url": null,
        "created_at": "2026-07-03T12:00:00.000Z"
      },
      {
        "id": "p2222222-2222-2222-2222-222222222222",
        "name": "Gym Chalk",
        "category": "Equipment",
        "price": 150.00,
        "stock_count": 20,
        "total_sold": 2,
        "image_url": null,
        "created_at": "2026-07-03T12:00:00.000Z"
      }
    ],
    "sales": [
      {
        "id": "s1111111-1111-1111-1111-111111111111",
        "product_id": "p1111111-1111-1111-1111-111111111111",
        "quantity": 1,
        "total_price": 20.00,
        "created_at": "2026-07-03T10:30:00.000Z"
      }
    ],
    "profiles": [
      {
        "id": "mock-admin-uuid-1111-2222-3333-444444444444",
        "role": "admin",
        "updated_at": "2026-07-03T12:00:00.000Z"
      }
    ],
    "member_notification_logs": []
  }
  ```

- [ ] **Step 4: Commit settings and seed**
  Run:
  ```bash
  git add .gitignore mock-db-seed.json
  git commit -m "chore: setup mock-db.json ignore and seed template"
  ```

---

### Task 2: Implement Mock Database Engine (`utils/supabase/mockEngine.ts`)

**Files:**
- Create: `utils/supabase/mockEngine.ts`

**Interfaces:**
- Consumes: JSON data from file system.
- Produces: `executeQuery(query: any): Promise<{ data: any, error: any }>` for evaluating query filters and mutations.

- [ ] **Step 1: Create mockEngine.ts file**
  Implement the file system interaction and filter parser.
  Create `/Users/macbookairm2/codebase/rm2/utils/supabase/mockEngine.ts` with code to filter, insert, update and write to `mock-db.json`.
  Code:
  ```typescript
  import fs from 'fs'
  import path from 'path'

  const DB_PATH = path.join(process.cwd(), 'mock-db.json')
  const SEED_PATH = path.join(process.cwd(), 'mock-db-seed.json')

  function getDb() {
    if (!fs.existsSync(DB_PATH)) {
      const seedData = fs.readFileSync(SEED_PATH, 'utf-8')
      fs.writeFileSync(DB_PATH, seedData, 'utf-8')
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
  }

  function writeDb(data: any) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8')
  }

  export async function executeQuery(query: {
    table: string
    actions: any[]
    selectFields?: string
    singleRecord?: boolean
    maybeSingleRecord?: boolean
  }): Promise<{ data: any; error: any }> {
    try {
      const db = getDb()
      let collection = db[query.table]
      if (!collection) {
        collection = []
        db[query.table] = collection
      }

      let data = [...collection]
      let error: any = null

      for (const action of query.actions) {
        if (action.type === 'eq') {
          data = data.filter((row: any) => row[action.column] === action.value)
        } else if (action.type === 'neq') {
          data = data.filter((row: any) => row[action.column] !== action.value)
        } else if (action.type === 'in') {
          data = data.filter((row: any) => action.values.includes(row[action.column]))
        } else if (action.type === 'order') {
          data.sort((a: any, b: any) => {
            const valA = a[action.column]
            const valB = b[action.column]
            if (valA < valB) return action.ascending ? -1 : 1
            if (valA > valB) return action.ascending ? 1 : -1
            return 0
          })
        } else if (action.type === 'limit') {
          data = data.slice(0, action.count)
        } else if (action.type === 'insert') {
          const payload = Array.isArray(action.data) ? action.data : [action.data]
          const inserted: any[] = []
          for (const item of payload) {
            const newItem = {
              id: item.id || crypto.randomUUID(),
              created_at: new Date().toISOString(),
              ...item
            }
            collection.push(newItem)
            inserted.push(newItem)
          }
          writeDb(db)
          data = inserted
        } else if (action.type === 'update') {
          // Applies the update to currently filtered data items
          const matchingIds = data.map((item: any) => item.id)
          collection.forEach((item: any) => {
            if (matchingIds.includes(item.id)) {
              Object.assign(item, action.data)
            }
          })
          writeDb(db)
          // reload updated items
          data = collection.filter((item: any) => matchingIds.includes(item.id))
        }
      }

      // Handle projections (select fields)
      if (query.selectFields && query.selectFields !== '*') {
        // Simple select parser for comma separated fields, supporting basic single relations (e.g. member_id(name))
        const fields = query.selectFields.split(',').map(f => f.trim())
        data = data.map((row: any) => {
          const projected: any = {}
          fields.forEach((field: string) => {
            // handle member_id(name) or similar
            if (field.includes('(')) {
              const match = field.match(/^(\w+)\((.+)\)$/)
              if (match) {
                const relationTable = match[1] === 'member_id' ? 'members' : match[1] + 's'
                const relFields = match[2].split(',').map(f => f.trim())
                const relatedId = row[match[1]]
                const relatedRow = db[relationTable]?.find((r: any) => r.id === relatedId)
                if (relatedRow) {
                  projected[match[1]] = {}
                  relFields.forEach((rf: string) => {
                    projected[match[1]][rf] = relatedRow[rf]
                  })
                } else {
                  projected[match[1]] = null
                }
              }
            } else {
              projected[field] = row[field]
            }
          })
          return projected
        })
      }

      if (query.singleRecord) {
        return { data: data[0] || null, error: data[0] ? null : { message: 'Row not found' } }
      }
      if (query.maybeSingleRecord) {
        return { data: data[0] || null, error: null }
      }

      return { data, error }
    } catch (err: any) {
      return { data: null, error: { message: err.message || err } }
    }
  }
  ```

- [ ] **Step 2: Commit mock engine**
  Run:
  ```bash
  git add utils/supabase/mockEngine.ts
  git commit -m "feat: add mock database query engine"
  ```

---

### Task 3: Implement Mock Database API Route (`app/api/mock-db/route.ts`)

**Files:**
- Create: `app/api/mock-db/route.ts`

**Interfaces:**
- Consumes: POST HTTP requests containing JSON query serialization.
- Produces: JSON response with `{ data, error }`.

- [ ] **Step 1: Create the API route file**
  Create `/Users/macbookairm2/codebase/rm2/app/api/mock-db/route.ts` to expose the mock engine to browser requests.
  Content:
  ```typescript
  import { NextRequest, NextResponse } from 'next/server'
  import { executeQuery } from '@/utils/supabase/mockEngine'

  export async function POST(req: NextRequest) {
    if (process.env.NEXT_PUBLIC_USE_MOCK_DATA !== 'true') {
      return NextResponse.json({ error: 'Mock data is not enabled' }, { status: 400 })
    }
    const query = await req.json()
    const result = await executeQuery(query)
    return NextResponse.json(result)
  }
  ```

- [ ] **Step 2: Commit the API route**
  Run:
  ```bash
  git add app/api/mock-db/route.ts
  git commit -m "feat: add API endpoint for client-side mock DB queries"
  ```

---

### Task 4: Integrate Mock Clients inside client.ts & server.ts

**Files:**
- Modify: `utils/supabase/client.ts`
- Modify: `utils/supabase/server.ts`

**Interfaces:**
- Consumes: `process.env.NEXT_PUBLIC_USE_MOCK_DATA` toggle.
- Produces: Conditionally swaps client/server supabase instances for mock builder wrappers.

- [ ] **Step 1: Implement Client Client Wrapper**
  Modify `/Users/macbookairm2/codebase/rm2/utils/supabase/client.ts` to return mock query and auth builders.
  Content:
  ```typescript
  import { createBrowserClient } from "@supabase/ssr"

  // Mock Query Builder mimicking Supabase chaining
  class MockQueryBuilder {
    private table: string
    private actions: any[] = []
    private selectFields: string = '*'
    private singleRecord: boolean = false
    private maybeSingleRecord: boolean = false

    constructor(table: string) {
      this.table = table
    }

    select(fields = '*') {
      this.selectFields = fields
      return this
    }

    insert(data: any) {
      this.actions.push({ type: 'insert', data })
      return this
    }

    update(data: any) {
      this.actions.push({ type: 'update', data })
      return this
    }

    eq(column: string, value: any) {
      this.actions.push({ type: 'eq', column, value })
      return this
    }

    neq(column: string, value: any) {
      this.actions.push({ type: 'neq', column, value })
      return this
    }

    in(column: string, values: any[]) {
      this.actions.push({ type: 'in', column, values })
      return this
    }

    order(column: string, options?: { ascending?: boolean }) {
      this.actions.push({ type: 'order', column, ascending: options?.ascending !== false })
      return this
    }

    limit(count: number) {
      this.actions.push({ type: 'limit', count })
      return this
    }

    single() {
      this.singleRecord = true
      return this
    }

    maybeSingle() {
      this.maybeSingleRecord = true
      return this
    }

    async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
      try {
        const res = await fetch('/api/mock-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table: this.table,
            actions: this.actions,
            selectFields: this.selectFields,
            singleRecord: this.singleRecord,
            maybeSingleRecord: this.maybeSingleRecord
          })
        })
        const result = await res.json()
        if (onfulfilled) return onfulfilled(result)
        return result
      } catch (err) {
        if (onrejected) return onrejected(err)
        throw err
      }
    }
  }

  // Mock authentication client
  const mockAuth = {
    getUser: async () => {
      const cookies = typeof document !== 'undefined' ? document.cookie : ''
      const hasSession = cookies.includes('sb-mock-session=')
      if (hasSession) {
        return {
          data: {
            user: {
              id: 'mock-admin-uuid-1111-2222-3333-444444444444',
              email: 'admin@example.com',
              role: 'authenticated'
            }
          },
          error: null
        }
      }
      return { data: { user: null }, error: null }
    },
    signInWithPassword: async (credentials: any) => {
      if (typeof document !== 'undefined') {
        document.cookie = 'sb-mock-session=true; path=/; max-age=86400'
      }
      return { data: { user: {} }, error: null }
    },
    signOut: async () => {
      if (typeof document !== 'undefined') {
        document.cookie = 'sb-mock-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      }
      return { error: null }
    },
    exchangeCodeForSession: async (code: string) => {
      return { data: { session: {} }, error: null }
    }
  }

  const mockSupabaseClient: any = {
    from: (table: string) => new MockQueryBuilder(table),
    auth: mockAuth
  }

  export const supabase = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true"
    ? mockSupabaseClient
    : createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
  ```

- [ ] **Step 2: Implement Server Client Wrapper**
  Modify `/Users/macbookairm2/codebase/rm2/utils/supabase/server.ts` to return Server mock builder invoking in-process file reads.
  Content:
  ```typescript
  import { createServerClient } from "@supabase/ssr"
  import { cookies } from "next/headers"

  class ServerMockQueryBuilder {
    private table: string
    private actions: any[] = []
    private selectFields: string = '*'
    private singleRecord: boolean = false
    private maybeSingleRecord: boolean = false

    constructor(table: string) {
      this.table = table
    }

    select(fields = '*') {
      this.selectFields = fields
      return this
    }

    insert(data: any) {
      this.actions.push({ type: 'insert', data })
      return this
    }

    update(data: any) {
      this.actions.push({ type: 'update', data })
      return this
    }

    eq(column: string, value: any) {
      this.actions.push({ type: 'eq', column, value })
      return this
    }

    neq(column: string, value: any) {
      this.actions.push({ type: 'neq', column, value })
      return this
    }

    in(column: string, values: any[]) {
      this.actions.push({ type: 'in', column, values })
      return this
    }

    order(column: string, options?: { ascending?: boolean }) {
      this.actions.push({ type: 'order', column, ascending: options?.ascending !== false })
      return this
    }

    limit(count: number) {
      this.actions.push({ type: 'limit', count })
      return this
    }

    single() {
      this.singleRecord = true
      return this
    }

    maybeSingle() {
      this.maybeSingleRecord = true
      return this
    }

    async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
      try {
        const { executeQuery } = require('./mockEngine')
        const result = await executeQuery({
          table: this.table,
          actions: this.actions,
          selectFields: this.selectFields,
          singleRecord: this.singleRecord,
          maybeSingleRecord: this.maybeSingleRecord
        })
        if (onfulfilled) return onfulfilled(result)
        return result
      } catch (err) {
        if (onrejected) return onrejected(err)
        throw err
      }
    }
  }

  export async function createClient() {
    if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true") {
      const cookieStore = await cookies()
      const hasSession = cookieStore.has('sb-mock-session')

      const serverMockAuth = {
        getUser: async () => {
          if (hasSession) {
            return {
              data: {
                user: {
                  id: 'mock-admin-uuid-1111-2222-3333-444444444444',
                  email: 'admin@example.com',
                  role: 'authenticated'
                }
              },
              error: null
            }
          }
          return { data: { user: null }, error: null }
        },
        signInWithPassword: async (credentials: any) => {
          return { data: { user: {} }, error: null }
        },
        signOut: async () => {
          return { error: null }
        }
      }

      return {
        from: (table: string) => new ServerMockQueryBuilder(table),
        auth: serverMockAuth
      } as any
    }

    const cookieStore = await cookies()

    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Called from a Server Component without mutable cookie store
            }
          },
        },
      }
    )
  }
  ```

- [ ] **Step 3: Modify proxy.ts (the middleware check)**
  Since `proxy.ts` performs authentication checks at Next.js routing level using raw clients, we need to modify `/Users/macbookairm2/codebase/rm2/proxy.ts` to check `NEXT_PUBLIC_USE_MOCK_DATA` and read the `sb-mock-session` cookie.
  Modify `proxy.ts` lines 20-43:
  ```typescript
  let user: any = null
  let role: AppRole = "staff"

  if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true") {
    const hasSession = request.cookies.has("sb-mock-session")
    if (hasSession) {
      user = {
        id: "mock-admin-uuid-1111-2222-3333-444444444444",
        email: "admin@example.com",
        role: "authenticated"
      }
      role = "admin" // seed matches this to admin role
    }
  } else {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            response = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )
    const { data } = await supabase.auth.getUser()
    user = data.user
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle()
      if (isAppRole(profile?.role)) {
        role = profile.role
      }
    }
  }
  ```

- [ ] **Step 4: Commit changes to client, server, and proxy**
  Run:
  ```bash
  git add utils/supabase/client.ts utils/supabase/server.ts proxy.ts
  git commit -m "feat: conditionally intercept and route supabase clients to mock client/server builders"
  ```

---

### Task 5: Enable Mocking and Run Local Verification

**Files:**
- Modify: `.env.local`

**Interfaces:**
- Consumes: Environment variable configuration.
- Produces: Active local mock database.

- [ ] **Step 1: Enable mock toggle in environment variables**
  Add `NEXT_PUBLIC_USE_MOCK_DATA=true` to `/Users/macbookairm2/codebase/rm2/.env.local`.

- [ ] **Step 2: Run build to verify TypeScript and build compilation**
  Run command: `npm run build`
  Expected: Successful next build without errors.

- [ ] **Step 3: Run the app dev server**
  Run command: `npm run dev`
  Expected: Launches development server on http://localhost:3000.
