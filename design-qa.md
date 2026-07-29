**Comparison target**

- Source visual truth:
  - `/var/folders/lv/lp5x7z1d6dxgx4td81cg1lph0000gn/T/codex-clipboard-2f0240ba-f7c1-415a-94a2-46d94771aa62.png`
  - `/var/folders/lv/lp5x7z1d6dxgx4td81cg1lph0000gn/T/codex-clipboard-4bc2bded-3213-4752-85db-74c51c6260a6.png`
  - `/var/folders/lv/lp5x7z1d6dxgx4td81cg1lph0000gn/T/codex-clipboard-7732f856-ebf0-4a83-b8f1-f14ae0053b9d.png`
  - `/var/folders/lv/lp5x7z1d6dxgx4td81cg1lph0000gn/T/codex-clipboard-fcd73f62-d03c-4697-97b8-4d05e9cda5c4.png`
  - `/var/folders/lv/lp5x7z1d6dxgx4td81cg1lph0000gn/T/codex-clipboard-60f33f57-c5ed-4219-ba20-cf3653ba6c6c.png`
- Source dimensions: four populated states at 2880 × 6400 px and one draft state at 2880 × 4600 px.
- Intended CSS viewport: 1440 px wide at 2× source density; the card content region is 800 CSS px wide.
- States: active amount-off-products, scheduled Buy X Get Y, paused amount-off-order, active free shipping, and unconfigured draft.
- Implementation screenshot: unavailable.
- Implementation viewport and density: unavailable.

**Findings**

- [P0] Browser-rendered comparison is unavailable.
  Location: Discount details modal in the local Admin application.
  Evidence: the source screenshots are available, but the configured in-app browser rejected access to the local Admin URL, so no implementation screenshot could be captured at the matching viewport.
  Impact: typography, spacing, overflow, token rendering, responsive behavior, and pixel-level state parity cannot be verified from rendered evidence.
  Fix: allow the local Admin URL in the in-app browser, capture each fixture state at a 1440 px CSS viewport, combine each implementation capture with its matching source screenshot, and run the visual comparison again.

**Required fidelity surfaces**

- Fonts and typography: blocked pending a rendered capture.
- Spacing and layout rhythm: blocked pending a rendered capture.
- Colors and visual tokens: blocked pending a rendered capture.
- Image and icon fidelity: blocked pending a rendered capture.
- Copy and content: statically aligned to the supplied states, but visual wrapping and truncation remain unverified.

**Full-view comparison evidence**

- Source screenshots were inspected.
- No implementation screenshot was available, so a normalized full-view comparison could not be produced.

**Focused region comparison evidence**

- Discount codes was compared against the user-provided implementation capture
  `/var/folders/lv/lp5x7z1d6dxgx4td81cg1lph0000gn/T/codex-clipboard-26fcb678-e1a0-4fcc-b421-1ef9ed11d7d9.png`.
- The comparison found excessive item height and line spacing, oversized status
  tags and usage typography, excessive horizontal padding, and a missing header
  action. These focused-region mismatches were corrected.

**Comparison history**

- Initial implementation pass: presentation code updated to the new compact section layouts.
- Icon refinement pass: added Ant Design `Avatar` wrappers and explicit primary,
  neutral, and warning icon states for value, target, eligibility, channel,
  combination, code, and external-reference rows.
- Screenshot correction pass: removed Avatar wrappers from Channels, changed
  active Combination avatars to primary outlines, matched 24/32/36 px icon
  sizes, converted Buy X/Get Y to Ant Design Timeline nodes, and applied
  warning surface styling to failed external references.
- Availability correction pass: replaced the hand-built Starts/Ends markers
  with an Ant Design Timeline and mapped its active node to the theme primary
  token and its end node to the neutral text token.
- Discount codes correction pass: rebuilt each code as an independent bordered
  item with a plain monospace code and metadata on the left, usage and
  reservation figures in the right statistics column, status tags at the far
  edge, and the header action shown by the supplied reference.
- Tags implementation pass: extracted the Product details tag/picker treatment
  into a shared entity tags section and reused it for both Products and
  Discounts; Discounts now persist picker additions and removals through the
  unified discount update workflow.
- Value and usage implementation pass: removed the Discount-specific ECharts
  implementation and reused the Product pricing widget columns, period switch,
  KPI layout, styles, and chart component with discount usage data.
- Post-fix visual evidence: unavailable because local browser capture is blocked.

**Implementation checklist**

- Capture the modal at a 1440 px CSS viewport for every supplied state.
- Compare the 800 px content column and each section at equal density.
- Check console errors and the primary modal interactions.
- Fix any P0/P1/P2 mismatches and repeat the capture.

final result: blocked
