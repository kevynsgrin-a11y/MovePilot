# Professional Web-Development Grading Rubric

`verify-deploy-agent` (Agent 5) scores each category 0–100 with cited file/line
evidence, then computes the weighted total.

| # | Category | Weight | What "100" looks like |
|---|----------|--------|-----------------------|
| 1 | First impression & visual polish | 15 | Indistinguishable from a top-firm build; cohesive design system. |
| 2 | UX & navigation | 10 | Obvious IA, zero dead ends, clear affordances. |
| 3 | Functional correctness — every feature & button | 20 | Every feature and control works against the live API. |
| 4 | Algorithm/equation accuracy vs. hand-computed cases | 10 | Every formula matches the backend's hand-computed fixtures exactly. |
| 5 | Code quality & structure | 10 | Clean, typed where sensible, no dead code, sane structure. |
| 6 | Performance | 10 | Fast loads, lean bundle, no obvious request waterfalls. |
| 7 | Mobile responsiveness | 10 | Flawless mobile-first behavior across breakpoints. |
| 8 | SEO & metadata | 5 | Titles, meta, canonical, OG, sitemap, structured data. |
| 9 | Accessibility basics | 5 | Keyboard nav, visible focus, ARIA, AA contrast. |
| 10 | Revenue readiness — ad slots, affiliate links, tier gating | 5 | All revenue surfaces present and functional. |

**Total weight = 100.**

## Weighted score

```
score = Σ (category_score × weight) / 100
```

## Deploy threshold

Deploy is allowed **only** when: **weighted total ≥ 90 AND no category < 80.**

## Self-Check-and-Fix loop

If below threshold, `verify-deploy-agent` fixes the weaknesses itself, re-runs
tests + build, and re-grades. Loop up to **3 passes**. If still short after 3,
stop and report exactly what remains and why.
