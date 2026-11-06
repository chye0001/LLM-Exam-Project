## Code conventions

- `src/app/` holds only Next.js files: pages, layouts and server actions in `*.actions.ts` next to the page that uses them. The app has no route handlers.
- `src/components/` holds React components, with small building blocks in `ui/`. Components import only types from features, and pages pass server actions to them as props.
- Each `src/features/<feature>/` holds `<feature>.model.ts` (types and Zod schemas), `<feature>.repository.interface.ts`, `<feature>.repository.ts`, `<feature>.service.interface.ts` and `<feature>.service.ts`.
- Interfaces are named `<Name>Interface`, implementations get the plain name, and stubs and fakes end in `Stub` or `Fake`.
- Services receive their dependencies as interfaces through the constructor. `src/shared/dependency-container.ts` is the only place that creates implementations.
- Only repository implementations and `src/shared/db/prisma.ts` import Prisma.
- Errors extend `AppError`. Server actions are wrapped in `safeAction` and return `{ ok: false, error }` instead of throwing.

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Label strings match the five canonical triage role names. See `docs/agents/triage-labels.md`.

### Domain docs

The layout is single-context: one `GLOSSARY.md` and one `docs/adr/`, both at the repo root. See `docs/agents/domain.md`.
