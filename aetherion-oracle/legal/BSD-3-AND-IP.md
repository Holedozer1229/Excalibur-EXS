# BSD-3-Clause vs patents vs trademarks

> **Disclaimer:** Educational overview for the AETHERION / AQAI project.
> Not legal advice.

## Common confusion: "BSD business class 3"

People sometimes mix up:

| Term | What it actually is |
|------|---------------------|
| **BSD-3-Clause** | An **open-source software license** (3 conditions + disclaimer). Free on GitHub. Protects *how code is shared*, not your brand or inventions. |
| **USPTO Class 9 / 42 / 35** | **Trademark service classes** for goods and services. Unrelated to BSD. |
| **"Class 3" in other contexts** | Might mean cosmetics trademarks internationally — **not** what you want for chips/software. |

**Bottom line:** Adding BSD-3 to the repo does **not** trademark anything and does
**not** patent anything.

## What BSD-3-Clause does

The [LICENSE](../LICENSE) at repo root grants others permission to:

- Use, modify, and redistribute source code
- Create derivative works

…subject to:

1. Retaining copyright notice
2. Retaining license text in distributions
3. **Not** using your name to endorse derivatives without permission

### What BSD-3 does NOT do

| Protection type | Covered by BSD-3? |
|-----------------|-------------------|
| Copyright on code you wrote | Yes (you retain copyright; license grants terms) |
| Trademark on AETHERION / AQAI / Caduceus | **No** — see [TRADEMARK.md](./TRADEMARK.md) |
| Patent on novel methods | **No** — see [patent/](./patent/) |
| Trade secret on unreleased RTL | **No** — publishing code may forfeit secrecy |
| Idea / concept monopoly | **No** — ideas are not copyrightable |

## Layered IP model (summary)

```
┌─────────────────────────────────────────────────────────┐
│  Patent (optional)     — novel methods & systems        │
│  Trademark (optional)  — brand names & logos            │
│  Trade secret          — unreleased tape-out details    │
│  Copyright (BSD-3)     — source code as expressed       │
└─────────────────────────────────────────────────────────┘
```

See [IP-STRATEGY.md](./IP-STRATEGY.md) for the full strategy.

## Open source + commercial hardware

BSD-3 is compatible with a **fabless commercial model**:

- Open-source the **Soft Silicon** SDK, docs, and reference RTL stubs
- Keep fab-specific constraints, yield data, and production GDS as trade secrets
- File **patents** on novel architecture combinations (seal-native pipeline,
  twin-pipe schedule, etc.) if counsel agrees
- Register **trademarks** on product names

## Honesty rails

1. This repository's maintainers **prepare documents**; we do **not** file with USPTO on your behalf.
2. BSD-3 **does not** create "patent pending" status — only a filed patent application does.
3. Third parties may fork BSD-licensed code; your moat is brand, patents (if granted),
   execution, and trade secrets — not the license alone.
4. Recommend a **patent attorney** before converting a provisional to non-provisional.

## Files in this repo

| File | Purpose |
|------|---------|
| [LICENSE](../LICENSE) | BSD-3-Clause text |
| [NOTICE](../NOTICE) | Copyright + ™ notice |
| [TRADEMARK.md](./TRADEMARK.md) | USPTO trademark guide |
| [IP-STRATEGY.md](./IP-STRATEGY.md) | Layered protection plan |
| [patent/](./patent/) | Provisional patent templates |
