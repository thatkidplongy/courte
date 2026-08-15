# Gotchas

Traps this repo has actually sprung, each costing real time at least once. Short entries only.

Design and schema _rules_ live in [`CONVENTIONS.md`](CONVENTIONS.md) — this file is for the
tooling and language traps that no convention would have prevented.

## The contract is consumed as built output

`@courte/contract` publishes `dist/index.js`, not `src`. Editing `packages/contract/src` changes
nothing for the API until you build it:

```bash
pnpm --filter @courte/contract build
```

And the **running API process still holds the old copy in memory**, so a restart is the second
half of the fix. The symptom is a type that plainly exists reporting as "has no exported
member", or a new enum value type-checking but never appearing in a response.

## Postgres is on 5433, and Homebrew may already be squatting there

`docker-compose.yml` picks 5433 to dodge a Homebrew Postgres on 5432. Every connection string,
GUI profile and `psql` invocation has to say so.

It has already gone wrong once on a dev machine: a Homebrew `postgresql@18` service was also
bound to 5433, so when Docker Desktop quit, the app silently connected to an empty database and
every request 500'd with `role "courte" does not exist`. If queries start failing against
tables you know exist, check **which** server answered:

```bash
psql -h localhost -p 5433 -U courte -d courte -c "SELECT current_setting('data_directory')"
```

A path under `/var/lib/postgresql` is the container. Anything under `/opt/homebrew` is not.
Homebrew Postgres cannot run this app anyway — it has no PostGIS built for it.

## PostGIS brings its own schemas

The `postgis/postgis` image creates `tiger`, `tiger_data` and `topology`, full of US census
tables. In a GUI they bury ours. Everything of ours is in `public`.

## dbmate owns the schema

Read and edit rows in a GUI freely; do **not** add a column or an index there. The next migration
run will disagree with the database and `docs/schema.sql` will silently be wrong.

## Backfilling a new enum column needs an explicit cast

A `CASE` expression resolves to `text`, and Postgres will not implicitly narrow `text` to a
freshly created enum type. This fails:

```sql
UPDATE "Court" SET surface = CASE WHEN is_indoor THEN 'indoor' ELSE 'outdoor' END;
```

Cast the whole expression: `(CASE ... END)::court_surface`.

## `noUncheckedIndexedAccess` is on in all three workspaces

Every index into a `Record<K, V>` or array yields `V | undefined`. A lookup table keyed by a
wire-typed `number` cannot be `Record<number, string>` — narrow the key type, or handle the
`undefined`.

## An aliased boolean does not narrow a union for indexing

```ts
const isOpen = cell.state === 'open';
return isOpen ? <Price /> : LABELS[cell.state]; // TS7053 — state is still the full union
```

Aliased-condition narrowing does not reach a property access used as an index. Compare inline
in the ternary instead, and the else branch narrows.

## `next/link` scrolls to the top on navigation

Any in-page control built from links — a day strip, a filter chip, a sort toggle — throws the
reader back to the top of the document on every click. Pass `scroll={false}` when the control
and the content it changes are both already on screen.

## Restarting the API races itself on the port

The Nest watcher's restart and a manual start will collide as `EADDRINUSE: :::4000`. Stop it,
confirm the port is actually free, then start.

## An unquoted table name is a runtime error, not a compile error

Tables are PascalCase, and Postgres folds an unquoted identifier to lower case, so `FROM Court`
looks for a table called `court`. Nothing in the toolchain catches the missing quotes — not
TypeScript, not ESLint. It fails when that query runs, which may be a path you did not exercise.

## `pg` hands back bigint as a string

Every primary key here is int8, and `pg` returns int8 as a string by default because bigint's
range exceeds JS numbers. `db/client.ts` registers `types.setTypeParser(INT8, Number)` once, at
the driver. Without it ids arrive as `'1'` and every `===` against a number is false — with no
type error anywhere, because the row types claim `number`.

## Auth.js owns both `id` and `userId` on the session

Augmenting `Session` with `userId: number` intersects with `AdapterSession.userId: string` and
resolves to `never`; the same trap catches `user.id`. The error reads "Type 'number' is not
assignable to type 'never'", which does not point at the collision. Our key is
`session.courteUserId`, named so it cannot clash.

Two related traps in the same file: a `declare module` block only _augments_ if the file also
imports that module — otherwise it declares a new ambient module and silently does nothing. And
`sub` in a JWT is a string by RFC 7519, so the numeric user id is stringified when minting and
parsed when verifying.

## Turbopack does not always pick up a new route folder

Creating `app/…/staff/page.tsx` while `next dev` is running gave a **404 from the route itself**
— no request reached the API, and the page's own `notFound()` was never involved, so the obvious
suspects (a bad id parse, a 404 from the service) were all red herrings. Restarting the dev
server fixed it.

If a brand-new route 404s and the server log shows the request never left the web app, restart
before debugging the page.
