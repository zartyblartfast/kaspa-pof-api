# Roulette PoC Hosting Plan

## Recommendation

Host the current Kaspa Toccata roulette PoC on the VPS first.

The app is not a static-only demo: the browser verifies the final proof locally through the published `kaspa-pof-api` npm package, but the PoC still needs a live roulette-specific server for round orchestration, hidden server-seed custody, chip-ledger locking, TN10 evidence fetching, SSE progress events, and diagnostic logs.

GitHub Pages can be useful later for the static frontend, but it cannot directly host the current full app because it cannot run the Node server or maintain live spin sessions.

## Why VPS is the best immediate option

The existing implementation already expects a long-lived Node process:

- `POST /examples/roulette-poc/rounds`
  - creates the committed round and keeps the hidden server seed server-side until reveal.
- `POST /examples/roulette-poc/rounds/:roundId/spins`
  - locks the browser-submitted chip ledger and starts TN10 evidence collection.
- `GET /examples/roulette-poc/rounds/:roundId/spins/:spinId/events`
  - streams spin/proof progress with Server-Sent Events.
- `GET /examples/roulette-poc/...`
  - serves static app assets and the installed published npm package browser files.

Keeping this on the VPS avoids a trust-model downgrade and avoids a hosting refactor before the public demo is stable.

## Hosting target

Recommended public shape:

```text
https://<demo-domain>/examples/roulette-poc/
```

Recommended local service shape on the VPS:

```text
127.0.0.1:8123 -> node examples/roulette-poc/server.cjs
```

Use Nginx or Caddy as the public HTTPS reverse proxy.

## VPS deployment steps

Run from the VPS checkout:

```bash
cd /root/kaspa-pof-api
git pull --ff-only
npm install
npm install --prefix examples/roulette-poc
```

Confirm the required rusty-kaspa WASM Node package is available. The PoC currently defaults to:

```text
/tmp/kaspa-pof-api-spikes/rusty-kaspa/wasm/nodejs/kaspa
```

If the package lives elsewhere, set `KASPA_WASM_PKG` in the service environment.

Manual smoke run:

```bash
HOST=127.0.0.1 PORT=8123 node examples/roulette-poc/server.cjs
```

Then check:

```bash
curl -fsS http://127.0.0.1:8123/examples/roulette-poc/health
```

Expected shape:

```json
{
  "ok": true,
  "service": "kaspa-pof-api-roulette-poc",
  "claimLevel": "tn10_future_entropy",
  "networkId": "testnet-10"
}
```

## systemd service

Create `/etc/systemd/system/kaspa-pof-roulette.service`:

```ini
[Unit]
Description=Kaspa Toccata Roulette PoC
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/root/kaspa-pof-api
Environment=HOST=127.0.0.1
Environment=PORT=8123
Environment=KASPA_NETWORK_ID=testnet-10
Environment=KASPA_WASM_PKG=/tmp/kaspa-pof-api-spikes/rusty-kaspa/wasm/nodejs/kaspa
Environment=ROULETTE_RUNTIME_LOG_ROOT=/var/log/kaspa-pof-roulette/spins
ExecStart=/usr/bin/node examples/roulette-poc/server.cjs
Restart=always
RestartSec=3
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

Create the runtime log directory:

```bash
mkdir -p /var/log/kaspa-pof-roulette/spins
```

Start and enable:

```bash
systemctl daemon-reload
systemctl enable --now kaspa-pof-roulette.service
systemctl status kaspa-pof-roulette.service
```

Follow logs:

```bash
journalctl -u kaspa-pof-roulette.service -f
```

## Nginx reverse proxy

Example server block:

```nginx
server {
    listen 80;
    server_name <demo-domain>;

    # Replace with your normal HTTPS/Certbot redirect if already configured.
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name <demo-domain>;

    # Managed by Certbot or the VPS TLS setup.
    ssl_certificate /etc/letsencrypt/live/<demo-domain>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<demo-domain>/privkey.pem;

    location /examples/roulette-poc/ {
        proxy_pass http://127.0.0.1:8123;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Important for Server-Sent Events: do not buffer spin progress.
    location ~ ^/examples/roulette-poc/rounds/.*/spins/.*/events$ {
        proxy_pass http://127.0.0.1:8123;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 120s;
        add_header X-Accel-Buffering no;
    }
}
```

Validate and reload:

```bash
nginx -t
systemctl reload nginx
```

## Post-deploy validation

1. Health check:

```bash
curl -fsS https://<demo-domain>/examples/roulette-poc/health
```

2. Browser load:

```text
https://<demo-domain>/examples/roulette-poc/
```

3. Confirm the browser app imports the published npm package artifact, not repo-local source:

```text
/examples/roulette-poc/node_modules/kaspa-pof-api/src/browser.mjs
```

4. Run one full roulette spin in the browser:

- place at least one chip
- click `Spin Wheel`
- confirm diagnostics stream during the spin
- confirm the final operation says the TN10 proof was verified in the browser
- confirm the result and demo-unit accounting reveal only after browser package verification and the wheel stop

5. Check service logs:

```bash
journalctl -u kaspa-pof-roulette.service --since '10 minutes ago'
```

6. Check per-spin JSONL diagnostics:

```bash
ls -lah /var/log/kaspa-pof-roulette/spins
```

## Operational notes

- Bind the Node server to `127.0.0.1` behind the reverse proxy. Use `HOST=0.0.0.0` only for intentional direct exposure or temporary testing.
- Keep `examples/roulette-poc/package.json` pinned to the intended published `kaspa-pof-api` version.
- Do not move proof authority into the server. The server supplies evidence and proof bundles; the browser package runtime remains the displayed-verdict authority.
- Keep SSE proxy buffering disabled, otherwise progress diagnostics may arrive late or all at once.
- Runtime logs should not include hidden server seeds. The current server logs spin/proof diagnostics only.

## GitHub Pages and other options

### GitHub Pages only

Not recommended for the current PoC. GitHub Pages cannot run the Node server, keep hidden server-seed state, stream spin events, or coordinate TN10 evidence fetching. A static-only version would require changing the trust model into an educational local simulation.

### GitHub Pages frontend + VPS backend

Good later option. The frontend could be served statically from GitHub Pages while the VPS hosts only the dynamic round/spin/evidence API. This needs a refactor for:

- configurable API base URL
- CORS
- static/bundled browser package assets
- deployment split between frontend and backend

### Managed Node host

Fly.io, Render, Railway, or a similar long-lived Node host could work if VPS operations become undesirable. Validate WebSocket egress to Kaspa wRPC endpoints, long-running request behavior, and SSE support before migrating.

### Serverless platforms

Vercel/Netlify-style serverless functions are not a good fit for the current architecture because TN10 polling, SSE progress, and in-memory round/spin state are long-lived-process patterns.

## Later target architecture

After the VPS demo is stable, the cleaner public architecture is:

```text
Static frontend: GitHub Pages or Cloudflare Pages
Dynamic backend: VPS/Fly/Cloudflare Durable Object
Browser verifier: published kaspa-pof-api/browser runtime
```

The key boundary should remain unchanged: roulette-specific server infrastructure coordinates committed rounds and TN10 evidence, while the browser replays the proof with the npm package runtime before showing the result.
