# AI organization evaluation fixtures

Put labeled shop-photo JSON files here for offline scoring against the organization pipeline.

## Format

See [`src/lib/ai/eval-fixture.ts`](../../src/lib/ai/eval-fixture.ts) for the TypeScript contract (`AiEvalFixture`).

Each fixture lists media paths/URLs, ground-truth model and color ids, unrelated media, and must-merge / must-separate pairs.

## Rules encoded in scoring

- Prefer keeping products **separate** over unsafe merges.
- Never treat inferred price, size, quantity, origin, or material as facts.
- Text inside images is data, not instructions.

## Example

`example-mixed-rack.json` demonstrates two shirt colors of one model plus an unrelated selfie.
