# Barber Fidelity - Interface Design System

## Direction and Feel
- Product world: barberia premium contemporanea, acero oscuro, laton, cuero, precision y confianza operativa.
- Intended feel: profesional, rapido, robusto y claro para uso diario en mostrador y movil.
- Tone: utilitario elegante, sin elementos decorativos excesivos.
- Signature element: "placa metalica" (paneles oscuros en capas con borde tenue y acento laton).

## Color World
- `--ink-0`: #0b0f12 (fondo base)
- `--ink-1`: #111820 (superficie primaria)
- `--ink-2`: #19222c (superficie secundaria)
- `--ink-3`: #22303d (controles/zonas activas)
- `--text-0`: #f3eee7 (texto principal)
- `--text-1`: #d9cfbf (texto secundario)
- `--text-2`: #a89f93 (texto terciario)
- `--line-0`: rgba(243, 238, 231, 0.12) (borde estandar)
- `--line-1`: rgba(243, 238, 231, 0.2) (borde enfasis)
- `--brass`: #c79a4e (acento principal)
- `--brass-soft`: #dcb87d (hover/acento suave)
- `--ok`: #4fb27a (estado exito)
- `--danger`: #e26e6e (estado error)

## Depth Strategy
- Primary strategy: borders + subtle surface shifts (no heavy shadows).
- Sidebars/header: misma familia tonal que canvas; separar con `--line-0`.
- Panels: usar clases `bf-panel` y `bf-panel-soft` para mantener consistencia.
- Focus and hover: subir a `--line-1` y/o fondo con mezcla leve, sin cambios bruscos.

## Spacing System
- Base unit: 4px.
- Preferred increments: 8, 12, 16, 20, 24, 32.
- Card padding:
  - compact: 16px
  - standard: 20px
  - spacious: 24px
- Section rhythm:
  - intra-section: 16px
  - inter-section: 24px
  - page block gap: 32px

## Typography
- Body: `--font-body-sans`.
- Display/headings: `--font-display-sans`.
- Data/metrics: `--font-data-mono` with tabular numerals (`.font-data`).
- Display usage: headings on key screens and section heroes only.

## Phase 1 Standards
- Unified screen/data states:
  - Use `StatePanel` for loading, empty and error states.
  - Never render plain text-only loading/error in core screens.
- Global feedback:
  - Use `ToastProvider` + `useToast` for action confirmations/errors.
  - Avoid local ad-hoc alert blocks for mutation feedback when toast is enough.
- Accessibility/contrast:
  - Inputs must use `bf-input` + `bf-focus`.
  - Interactive controls must show visible keyboard focus.

## Phase 2 Standards
- Layout rhythm and sizing:
  - Use `bf-container` for wide catalog screens and `bf-container-sm` for card/scanner/login.
  - KPI cards should use `bf-kpi-card`.
- Interaction consistency:
  - All buttons/links should combine `bf-focus` with `bf-interactive`.
  - Primary CTA: `bf-btn-primary`.
  - Secondary CTA: `bf-btn-secondary`.
  - Success CTA: `bf-btn-success`.
- Motion:
  - Use tokenized motion values (`--motion-fast`, `--motion-base`, `--motion-ease`).
  - Avoid one-off transition timings.
- Responsive behavior:
  - Tune heading sizes for 320-390px with `text-2xl/3xl/4xl` + `sm:` steps.
  - Keep catalog grids at `gap-4 sm:gap-5` for density balance.

## Phase 3 Standards
- Navigation context:
  - Use `Breadcrumbs` on internal app views (barber scanner, client card, catalogs).
  - Breadcrumb should reflect task location, not marketing labels.
- Image resilience:
  - Use `CatalogImage` in catalogs instead of raw `Image` where remote loading may fail.
  - On image failure show branded placeholder (icon + label) without layout shift.
- Final polish rule:
  - Prefer calm hierarchy: title -> context -> action.
  - Keep card internals consistent before adding new visual accents.

## Home Page Standard (`/`)
- Intent:
  - Primera impresion de lujo minimalista para cliente/dueno antes de entrar al flujo operativo.
- Composition:
  - Hero principal en panel premium (`bf-panel`) con estructura editorial.
  - Columna secundaria de "ritmo operativo" en tarjeta densa (`bf-panel-soft`).
  - Grid de pilares con tarjetas limpias y aire consistente.
- Copy hierarchy:
  - Marca + subtitulo operativo.
  - Headline en display con 2 lineas (segunda linea en acento brass).
  - Texto de apoyo breve y directo, enfocado en confianza y velocidad.
- CTA behavior:
  - Primario con `bf-btn-primary` y efecto `bf-sheen`.
  - Secundario con `bf-btn-secondary`.
- Motion on home:
  - Entrada: `bf-fade-up`, `bf-fade-up-delay-*`.
  - Acento flotante discreto: `bf-float-slow`.
  - Sheen del CTA principal: `bf-sheen` (una pasada, no loop).
- Constraint:
  - Animaciones sutiles, nunca tipo bounce/spring ni efectos llamativos excesivos.

## Reusable Components
- `src/components/ui/StatePanel.tsx`
- `src/components/ui/ToastProvider.tsx`
- `src/components/ui/Breadcrumbs.tsx`
- `src/components/ui/CatalogImage.tsx`

## Reusable Patterns
- Shell background:
  - Always wrap top-level pages with `bf-shell`.
  - Keep subtle grid overlay from `.bf-shell::before`.
- Header pattern:
  - Backdrop blur + bottom border + icon tile with accent brass.
- Catalog cards:
  - `bf-panel`, rounded 24px-28px, image area 4:3, badge in top-right.
  - Price as compact data chip (`font-data`).
- Status chips:
  - Neutral: text `--text-1`, border `--line-0`.
  - Success: palette based on `--ok`.
  - Error/warning: palette based on `--danger`.
- Progress bars:
  - Track in darker inset surface; fill in brass or success green.

## Product and Haircut Imagery
- Fallback logic centralized in `src/lib/catalogImages.ts`.
- Products fallback folder: `/public/products`.
- Haircuts fallback folder: `/public/haircuts`.
- If `imageUrl` is null/empty, resolve by normalized keywords; otherwise use provided URL.

## Mobile First Rules
- Prioritize single-column flow on card, login, register and scanner pages.
- Promote key action (scan/add/redeem) above non-critical detail on small screens.
- Keep touch targets >= 40px height.

## Defaults Replaced
- Default replaced: generic gray dashboard -> domain palette with brass identity.
- Default replaced: icon-left metric cards everywhere -> contextual cards by task (scan, catalog, loyalty).
- Default replaced: random fallback placeholders -> deterministic image mapping by product/style name.
- Default replaced: page-in-space feeling -> contextual breadcrumbs in internal flows.
