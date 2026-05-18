# Schema Changes — Batch B

Open `prisma/schema.prisma` on GitHub. Find the `model Quarter` block.
**Add these four lines** inside the model, anywhere before the closing `}`.
Do NOT delete any existing fields — the legacy ones stay for backwards
compatibility with already-saved data.

```prisma
  // === New column set (replaces AGT / AGT $ in the UI) ===
  targetSegment       String?   // SMB | Mid-Market | Enterprise | PubSec | Other
  conversationsRange  String?   // <50 | 50-100 | 100-250 | 250+
  meetingsRange       String?   // <50 | 50-100 | 100-250 | 250+
  pipeOpps            Int?      // number of pipeline opportunities created this quarter
```

That's it. The Vercel build runs `prisma db push` so the columns get added
automatically on deploy.
