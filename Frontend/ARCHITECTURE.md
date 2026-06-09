# Frontend Architecture

The frontend follows Feature-Driven Development. There is one canonical implementation for each domain.

## Structure

- `src/components/ui`: reusable, business-agnostic UI primitives.
- `src/components/layout`: application shell and global layout.
- `src/features/auth`: authentication UI, services, and types.
- `src/features/dashboard`: dashboard composition.
- `src/features/plano`: canvas, drag and drop, plans, geometry, and editor state.
- `src/features/procesos`: process lifecycle, history, records, filters, and process UI.
- `src/features/telemetria`: sensors, groups, controllers, PLC data, and readings.
- `src/features/workspace`: navigation, global search, route selection, and shell orchestration.
- `src/pages`: route adapters only. Telemetry routes live in `src/pages/telemetria`.
- `src/utils`: domain-neutral identifiers and small shared utilities.

## Public APIs

Cross-domain consumers use:

- `features/plano/index.ts`
- `features/procesos/index.ts`
- `features/telemetria/index.ts`

Inside a feature, use direct relative imports. Do not import a feature's own `index.ts`; that creates barrel cycles and loads unrelated modules.

## Dependency Rules

1. Pages contain no business state or heavy UI.
2. UI primitives do not import industrial domain modules.
3. Workspace orchestrates features but does not own their domain types.
4. Runtime helpers belong to the feature that owns the behavior.
5. Shared identifiers live in `src/utils`; domain models remain inside their feature.
6. The deleted `legacy-workspace`, `features/processes`, `features/plans`, `features/groups`, `features/sensors`, and `features/plc` trees must not return.

## Circular Dependency Review

The former process-reading helper lived in Telemetry while Process UI consumed it, creating a two-way feature dependency. It now lives in `features/procesos/utils/processReadings.ts`. Telemetry supplies sensor readings; Processes derives process-specific views.

Type-only references remain between industrial domains where their contracts meet. They are erased by TypeScript and do not create runtime cycles.

## File Size Policy

New TypeScript, TSX, and CSS files are limited to 150 lines. Existing oversized implementations are recorded as non-growing debt in `scripts/check-workspace-lines.mjs`; each should be split by responsibility when modified.

Run `npm run check` before merging.
