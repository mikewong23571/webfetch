# INSTRUCTIONS.md – Repository Guide for **NimbusFetcher** & **HermesBridge**

> **Purpose** — This file tells an assisting LLM **exactly** what must be built in this repo: an edge‑hosted web‑fetching server (**NimbusFetcher**) and an MCP‑compatible client bridge (**HermesBridge**). Follow the tasks and acceptance criteria below; do **not** improvise beyond scope unless explicitly instructed.

---

## 0. Component names & shorthand

| Layer                      | Name              | Abbrev. | Tagline                                |
| -------------------------- | ----------------- | ------- | -------------------------------------- |
| Server (Cloudflare Worker) | **NimbusFetcher** | `NF`    | “Fetch • Clean • Chunk at the edge.”   |
| MCP client bridge          | **HermesBridge**  | `HB`    | “Deliver web pages to models via MCP.” |

Throughout the repo every file **must** reference these names (e.g. log prefixes, package names, binary commands).

---

## 1. Repository layout

```
/
├─ server/                # NimbusFetcher implementation
│  ├─ src/
│  │   └─ index.ts       # Worker entry – keep small, delegate to modules
│  ├─ wrangler.toml      # CF worker config (compatibility_date >= 2025‑07‑30)
│  ├─ package.json       # Deno/Node polyfill deps – use pnpm
│  └─ README.md          # Server‑specific how‑to
│
├─ client/                # HermesBridge implementation
│  ├─ src/
│  │   └─ bridge.ts      # MCP server process
│  ├─ package.json
│  └─ README.md
│
├─ tests/                 # Shared integration tests (Vitest)
├─ docs/                  # Extra design artefacts (kept light)
└─ INSTRUCTIONS.md        # (this file)
```

Do **not** add ad‑hoc folders. Any extra assets go under `docs/`.

---

## 2. Functional contract

### 2.1 NimbusFetcher (server)

* **Endpoint**: `POST /fetch`
* **Input JSON**  (validate with `ajv`):

  ```jsonc
  {
    "url": "https://…",
    "prompt": "optional string",
    "options": {
      "render_strategy": "markdown|html|playwright",
      "max_tokens": 32768,
      "wait_until": "networkidle|load"
    }
  }
  ```
* **Successful response**:

  ```jsonc
  {
    "title": "…",
    "chunks": [{"seq":1,"text":"…"}, …],
    "meta": {"fetched_at":"ISO‑8601","render_strategy":"markdown"}
  }
  ```
* **Error shape** (`HTTP 4xx/5xx` same body):

  ```jsonc
  {"error":{"code":"TIMEOUT|BAD_URL|…","message":"…","url":"…"}}
  ```

### 2.2 HermesBridge (client)

* Exposes MCP tool **`web_fetcher.fetch`** with schemas mapping 1‑1 to the above.
* On `tools/call`, forward ➜ `NF /fetch`, transform result into MCP `ToolResult`:

  ```jsonc
  {
    "content":"<plain‑text concat of chunks>",
    "structuredContent": { … NF JSON response … },
    "isError": false
  }
  ```
* Must send `notifications/tools/list_changed` when its toolset mutates.

---

## 3. Task list (tick off as you go)

### 3.1 Core logic – NimbusFetcher

* [ ] **Bootstrap** Worker project with `wrangler init` & TypeScript.
* [ ] **`/fetch` router** with schema validation + 400 on fail.
* [ ] **Cache layer** using `caches.default`, key = `sha256(url + prompt)`; TTL 12 h.
* [ ] **Renderer**

  * [ ] Fast path → Cloudflare Browser Rendering `/markdown`.
  * [ ] Fallback path → Playwright (feature flag `render_strategy=playwright`).
* [ ] **Extractor**: Readability.js + `sanitize-html` (strict inline whitelist).
* [ ] **Chunker**: naive token estimator (≈4 chars ≈1 token) → split to ≤ `max_tokens` per chunk.
* [ ] **Error mapping**: Map all thrown errors to `NF_ERROR_CODE` enum.
* [ ] **Unit tests** with synthetic HTML.

### 3.2 Core logic – HermesBridge

* [ ] Node ≥20 project; expose JSON‑RPC2 server on `localhost:7410` by default.
* [ ] Implement `tools/list` (static list initially) & `tools/call`.
* [ ] Parameter validation against `inputSchema` (use `zod`).
* [ ] HTTP proxy to NimbusFetcher; respect `HB_BASE_URL` env.
* [ ] Map NF error ➜ `result.isError=true` with same payload.
* [ ] Add Vitest suites (mock NF).

### 3.3 Tooling & CI

* [ ] Lint: ESLint + Prettier (shared config).
* [ ] Type safety: `strict` TS everywhere.
* [ ] GitHub Actions: `pnpm install && pnpm test` for both packages.
* [ ] Optional: Deploy NF to CF “staging” account on every push to `main`.

---

## 4. Style & conventions

1. **No heavy frameworks** – keep dependencies minimal.
2. **Edge‑safe code** – avoid Node built‑ins in Worker path (enable `node_compat`, but still prefer Web APIs).
3. **Logs** – prefix with `[NF]` or `[HB]` for grepability.
4. **Error codes** – central enum `error-codes.ts`, shared between packages.

---

## 5. Acceptance criteria

* Passing `pnpm test` = ✅
* `nf-dev` (`wrangler dev`) returns valid JSON for a public URL within 3 seconds.
* `HB` responds to `tools/list` and `tools/call` with correct schemas.
* At least 80 % unit‑test coverage on both packages.

---

## 6. Nice‑to‑have backlog (ignore for initial PR)

* Batch fetch (`/batch` + `web_fetcher.batch_fetch`).
* Workers AI in‑edge summarisation.
* Webhook push on cache refresh.

---

## 7. Quick start commands (for human devs)

```bash
pnpm i
# run server locally
cd server && wrangler dev
# run client locally
cd ../client && pnpm start
# test all
pnpm test -r
```

