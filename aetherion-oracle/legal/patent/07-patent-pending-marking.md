# Patent pending marking guide

> Use **only after** a provisional or non-provisional application is **filed**
> and you have an official USPTO application serial number.
> Not legal advice.

## What "Patent Pending" means

"Patent Pending" (or "Patent Applied For") indicates that a patent application
has been filed but not yet granted. It does **not** mean:

- A patent has issued
- You can sue for infringement (enforceable rights generally await grant)
- BSD-3 open-source license created patent status

## When you may mark

| Event | May mark? |
|-------|-----------|
| Documents prepared in repo | **No** |
| Provisional filed — serial number received | **Yes** |
| Non-provisional published | **Yes** |
| Patent granted | Use patent number |

## Recommended marking text

### Product / website (after provisional filed)

```
Patent Pending — U.S. Provisional Application No. 6X/XXX,XXX (replace with actual serial)
AQAI™ · Caduceus™ · AETHERION™
```

### Pitch deck footer

```
© 2026 Travis D Jones · Patent Pending · BSD-3 · legal/patent/
```

### Software / SDK header (optional)

```typescript
/**
 * AQAI Caduceus ISA — Patent Pending (U.S. Prov. App. No. 6X/XXX,XXX)
 * Copyright (c) 2026 Travis D Jones · BSD-3-Clause
 */
```

### Physical hardware (future)

- Engrave or label PCB silkscreen: `Patent Pending`
- Include provisional serial on packaging insert

## Where to place marks

| Surface | Placement |
|---------|-----------|
| excaliburcrypto.com/chipset | Footer or about panel |
| Pitch deck (`pitch-deck.html`) | Final slide footer |
| README | License section (after filing) |
| Investor materials | Cover or footer — one line |
| GitHub repo description | Optional — serial number not required in public repo |

## False marking warning

**Do not** mark "Patent Pending" before filing. False patent marking can carry
 penalties under 35 U.S.C. § 292 (historically — consult current law and counsel).

## Relationship to trademarks

| Mark | Status | Symbol |
|------|--------|--------|
| Patent | Pending (after filing) | "Patent Pending" text |
| AETHERION / AQAI / Caduceus | Unregistered (until TEAS registers) | ™ |
| Registered trademark (future) | After USPTO certificate | ® in registered class only |

## After patent grants

Replace provisional marking with:

```
U.S. Patent No. X,XXX,XXX
```

Remove "Patent Pending" once grant issues for that application.

## Checklist after provisional filing

- [ ] Save USPTO filing receipt PDF
- [ ] Record serial number and filing date in password manager / CRM
- [ ] Update pitch deck footer with "Patent Pending" + serial
- [ ] Set 11-month reminder for non-provisional deadline
- [ ] Do **not** claim granted patent until USPTO issues notice of allowance

---

**Inventor:** Travis D Jones  
**Pre-filing repo footer (current):** © 2026 Travis D Jones · BSD-3 · Patent package: legal/patent/
