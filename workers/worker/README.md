# Vercel Daemon infrastructure smoke test

This worker verifies that Vercel can start a continuous process and poll its `/health` endpoint on port `1234`.

- It does **not** consume a queue or run application jobs yet; no job source is configured.
- It runs a minimal heartbeat once per minute and shuts down gracefully on SIGTERM.
- It has no npm dependencies or `package.json`, matching this repository's static HTML/JavaScript setup.
- Daemons only start on **production** deployments, not preview deployments.
- A single `iad1` instance is configured with 1Gi memory. Continuously provisioned memory consumes Vercel quota.

References: https://vercel.com/docs/daemons and https://vercel.com/docs/daemons/config-reference
