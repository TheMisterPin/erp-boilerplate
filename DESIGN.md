# ERP UI Design Specification

## 1. Visual Direction

The interface should feel like a modern enterprise application influenced by **SAP Fiori**, but without copying its default visual style.

The product should be:

- Structured and predictable
- Spacious rather than dense
- Dark, premium, and restrained
- Calm during prolonged daily use
- Clearly designed for operational work
- Professional without looking generic or outdated

The design should communicate reliability, control, and clarity. It should not feel playful, consumer-oriented, futuristic, or excessively decorative.

---

## 2. Core Design Principles

### 2.1 Clarity before decoration

Every screen should make hierarchy, status, ownership, and available actions obvious before adding visual polish.

Decoration should support structure, not compete with it.

### 2.2 Spacious enterprise UI

Use generous spacing, clear section separation, and restrained information grouping.

The application may display complex business data, but it should avoid the cramped appearance common in legacy ERP systems.

### 2.3 Predictable patterns

Equivalent entities and workflows should use the same visual patterns throughout the application.

For example:

- Lists should share the same toolbar and table structure
- Detail pages should share the same header and section rhythm
- Statuses should use the same badge treatment
- Primary and secondary actions should remain in consistent positions

### 2.4 Quiet confidence

The interface should feel premium through proportion, typography, contrast, and restraint rather than gradients, oversized effects, or heavy animation.

### 2.5 Operational focus

The design should favor scanning, comparison, navigation, and action. Visual decisions should reduce hesitation and help users understand what requires attention.

---

## 3. Overall Theme

### 3.1 Theme name

**Midnight Enterprise**

### 3.2 Visual character

A dark graphite foundation with layered charcoal surfaces, subtle cool-blue highlights, soft borders, and limited use of bright color.

The theme should resemble a premium control center rather than a gaming dashboard.

### 3.3 General appearance

- Dark neutral background
- Slightly lighter elevated surfaces
- Thin, low-contrast borders
- Muted accent color
- Minimal shadows
- Soft corners
- Crisp typography
- Strong information hierarchy

Avoid pure black backgrounds and pure white text. Both create excessive contrast and visual fatigue.

---

## 4. Color System

### 4.1 Neutral palette

| Token | Value | Usage |
|---|---:|---|
| `background` | `#0B0F14` | Main application background |
| `surface-1` | `#111820` | Sidebar, page sections, primary panels |
| `surface-2` | `#16202A` | Cards, tables, form groups, drawers |
| `surface-3` | `#1B2733` | Hovered or elevated surfaces |
| `surface-selected` | `#1D2E3D` | Selected rows and navigation items |
| `border-subtle` | `#263442` | Default borders and separators |
| `border-strong` | `#344556` | Focused or emphasized boundaries |
| `text-primary` | `#EDF2F7` | Main content and headings |
| `text-secondary` | `#A7B2BE` | Labels, metadata, secondary content |
| `text-muted` | `#778594` | Disabled text, hints, timestamps |

### 4.2 Accent palette

Use a restrained cool blue as the primary accent.

| Token | Value | Usage |
|---|---:|---|
| `accent` | `#5A9FD4` | Primary actions, active navigation, links |
| `accent-hover` | `#72AFE0` | Hover state |
| `accent-muted` | `#1C3A50` | Selected backgrounds and subtle highlights |
| `focus-ring` | `#6BADE0` | Keyboard focus indicator |

The accent should not dominate the interface. Most screens should remain neutral, with blue reserved for active elements and actions.

### 4.3 Semantic colors

| State | Foreground | Background |
|---|---:|---:|
| Success | `#71C99A` | `#153428` |
| Warning | `#E5B85C` | `#3A2E16` |
| Error | `#E47777` | `#3A1E22` |
| Information | `#78B4DF` | `#183247` |
| Neutral | `#A7B2BE` | `#252F39` |

Semantic colors should primarily appear in badges, icons, alerts, validation messages, and key metrics.

Do not flood entire cards or rows with bright semantic colors unless the condition is critical.

---

## 5. Typography

### 5.1 Typeface

Use a clean sans-serif typeface optimized for interfaces.

Preferred order:

1. Geist Sans
2. Inter
3. SF Pro Text
4. System sans-serif

Use a monospace font only for technical identifiers, codes, serial numbers, SKUs, references, and machine-readable values.

Preferred monospace:

1. Geist Mono
2. JetBrains Mono
3. SF Mono

### 5.2 Type scale

| Role | Size | Weight | Line height |
|---|---:|---:|---:|
| Page title | 28px | 600 | 36px |
| Section title | 20px | 600 | 28px |
| Card title | 16px | 600 | 24px |
| Body | 14px | 400 | 21px |
| Label | 13px | 500 | 18px |
| Metadata | 12px | 400 | 17px |
| Table header | 12px | 600 | 16px |

Typography should remain compact enough for business software, but with sufficient line height and spacing to preserve the spacious visual direction.

### 5.3 Text hierarchy

- Use weight before size to establish hierarchy
- Avoid excessive uppercase text
- Reserve uppercase for compact table headers or short category labels
- Use muted text for metadata, not reduced font size alone
- Keep long labels left aligned
- Use tabular numerals for quantities, prices, percentages, and dates

---

## 6. Spacing and Density

### 6.1 Base spacing scale

Use an 8px spacing system.

| Token | Value |
|---|---:|
| `space-1` | 4px |
| `space-2` | 8px |
| `space-3` | 12px |
| `space-4` | 16px |
| `space-5` | 24px |
| `space-6` | 32px |
| `space-7` | 40px |
| `space-8` | 48px |
| `space-9` | 64px |

### 6.2 Page spacing

- Desktop page padding: 32px
- Large desktop page padding: 40px
- Vertical spacing between major sections: 32px
- Card padding: 24px
- Compact card padding: 20px
- Form section spacing: 32px
- Field spacing: 20px

### 6.3 Density rules

The default experience should be spacious.

- Standard control height: 40px
- Large control height: 44px
- Standard table row height: 52px
- Compact table row height: 44px
- Navigation item height: 44px
- Header height: 64px

Compact density may be offered for power users later, but it should not define the primary visual language.

---

## 7. Shape, Borders, and Elevation

### 7.1 Border radius

| Element | Radius |
|---|---:|
| Buttons | 8px |
| Inputs | 8px |
| Cards | 12px |
| Panels | 12px |
| Modals | 16px |
| Badges | 999px |

Corners should feel refined, not overly rounded.

### 7.2 Borders

Use thin borders to separate surfaces.

- Default border: 1px solid `border-subtle`
- Focused border: 1px solid `accent`
- Section separators: 1px solid `border-subtle`

Avoid heavy outlines and boxed-in layouts.

### 7.3 Shadows

Use shadows sparingly.

Recommended shadow:

```css
box-shadow: 0 12px 32px rgba(0, 0, 0, 0.24);
```

Shadows should primarily appear on:

- Modals
- Drawers
- Popovers
- Floating menus
- Elevated command surfaces

Cards inside the page should usually rely on surface contrast and borders instead of shadows.

---

## 8. Application Shell

### 8.1 Sidebar

The sidebar should be permanent on desktop and visually stable.

Recommended width:

- Expanded: 248px
- Collapsed: 72px

Visual treatment:

- `surface-1` background
- Right border using `border-subtle`
- Product logo and name at the top
- Navigation grouped by business domain
- Clear active state using `accent-muted`
- Muted inactive icons
- User and environment controls at the bottom

Navigation groups should have generous vertical separation. Avoid displaying too many nested levels simultaneously.

### 8.2 Top bar

Recommended height: 64px.

The top bar should contain only globally relevant controls:

- Breadcrumbs or current context
- Global search
- Quick create action
- Notifications
- User profile

The top bar should not become a second navigation menu.

### 8.3 Main content area

The main content area should have a maximum readable width for forms and detail pages, while tables and operational dashboards may use the full available width.

Recommended behavior:

- Tables: full width
- Dashboards: full width with grid alignment
- Forms: 960px to 1200px content width
- Long-form detail pages: 1200px maximum

---

## 9. Page Header Pattern

Each major page should begin with a consistent header.

### 9.1 Structure

1. Breadcrumbs
2. Page title
3. Short description or metadata
4. Status badge when relevant
5. Primary and secondary actions
6. Optional tabs or segmented navigation

### 9.2 Action hierarchy

- One primary action per page
- Secondary actions use neutral or ghost buttons
- Destructive actions should be separated from normal actions
- Overflow menus should contain infrequent actions

The primary action should normally appear in the upper-right area of the page header.

---

## 10. Dashboard Style

Dashboards should feel operational and controlled, not promotional.

### 10.1 KPI cards

KPI cards should contain:

- Short label
- Primary value
- Optional comparison or trend
- Optional icon
- Contextual status only when useful

Recommended style:

- `surface-2` background
- Thin border
- 12px radius
- 24px padding
- Large value with tabular numerals
- Minimal chart decoration

Avoid oversized cards with large empty illustrations.

### 10.2 Charts

Charts should use muted colors and limited series.

- Prefer direct labels when possible
- Keep grid lines subtle
- Avoid unnecessary legends
- Use accent color for the primary series
- Use neutral tones for comparison series
- Reserve semantic colors for actual semantic meaning

### 10.3 Attention areas

Problems, warnings, and pending work should be visible through compact lists, badges, and counts rather than bright dashboard-wide banners.

---

## 11. Data Tables

Tables are a central visual component and should receive first-class treatment.

### 11.1 Table structure

A standard table page should contain:

1. Page header
2. Search and filter toolbar
3. Active filter summary
4. Table
5. Pagination or result summary

### 11.2 Visual treatment

- `surface-2` table container
- Sticky table header where useful
- Subtle row separators
- No vertical grid lines by default
- Left alignment for text
- Right alignment for numeric values
- Monospace for codes and identifiers
- Status badges for state columns
- Contextual row actions at the far right

### 11.3 Row states

| State | Treatment |
|---|---|
| Hover | Slightly lighter surface |
| Selected | `surface-selected` with subtle accent edge |
| Disabled | Reduced text contrast |
| Error | Small semantic indicator, not full red row |
| Focused | Visible keyboard focus ring |

### 11.4 Table toolbar

The toolbar should support:

- Search
- Filters
- Sort
- Column visibility
- Export
- Saved views
- Bulk actions when rows are selected

The toolbar should remain visually calm. Secondary controls should not compete with the primary task.

---

## 12. Forms

### 12.1 Form layout

Use clear groups and section headings.

Preferred layout:

- Single column for complex or explanatory forms
- Two columns for short, related fields
- Full-width fields for descriptions, addresses, notes, and long values

Avoid large walls of fields.

### 12.2 Field presentation

Each field should include:

- Label above the control
- Optional description below the label
- Control
- Validation or helper text below the control

Do not rely on placeholders as labels.

### 12.3 Input treatment

- `surface-1` or `surface-2` background
- Thin neutral border
- Clear blue focus state
- 40px minimum height
- Muted placeholder text
- Visible disabled treatment

### 12.4 Form actions

Primary form actions should appear consistently:

- Bottom-right for standard pages
- Sticky footer for long forms
- Modal footer for modal forms

Use explicit labels such as **Save customer**, **Create order**, or **Post invoice** rather than generic labels when practical.

---

## 13. Detail Pages and Object Pages

Complex business entities should use an object-page pattern inspired by SAP Fiori.

### 13.1 Header area

The entity header should contain:

- Entity type
- Primary identifier
- Human-readable name
- Status
- Key metadata
- Main actions

### 13.2 Content structure

Use clearly separated sections such as:

- Overview
- General information
- Lines or items
- Financial information
- Related documents
- Activity
- Audit history

Sections should use consistent headings and spacing. Avoid placing every section inside a separate card unless the card adds meaningful grouping.

### 13.3 Summary rail

For complex pages, a right-side summary rail may display:

- Totals
- Current status
- Assigned owner
- Dates
- Alerts
- Related entities

The summary rail should remain narrower and visually quieter than the main content.

---

## 14. Cards and Panels

Cards should be used selectively.

Use cards for:

- KPI summaries
- Related entity previews
- Dashboard modules
- Self-contained configuration groups
- Compact activity summaries

Avoid wrapping every section in a card. Excessive cards weaken hierarchy and create unnecessary visual boxes.

Card structure:

- Header
- Optional action
- Content
- Optional footer

Use consistent internal spacing and title placement.

---

## 15. Buttons and Actions

### 15.1 Button hierarchy

#### Primary

- Accent background
- High-contrast text
- Used once per major action area

#### Secondary

- Neutral surface
- Border
- Used for supporting actions

#### Ghost

- Transparent background
- Used for low-emphasis actions

#### Destructive

- Red treatment
- Used only when the action is genuinely destructive

### 15.2 Button sizing

| Size | Height | Horizontal padding |
|---|---:|---:|
| Small | 32px | 12px |
| Standard | 40px | 16px |
| Large | 44px | 20px |

Buttons should use concise, action-oriented labels.

---

## 16. Status Badges

Statuses should use compact rounded badges.

Examples:

- Draft
- Open
- In progress
- Completed
- Posted
- Blocked
- Cancelled
- Overdue

Badge requirements:

- Soft tinted background
- Semantic or neutral foreground
- 12px to 13px text
- Medium weight
- Consistent terminology
- Optional small dot icon

Do not use different visual treatments for equivalent states across modules.

---

## 17. Navigation Patterns

### 17.1 List-detail pattern

Use a list-detail layout when users frequently move between records.

Recommended structure:

- Searchable list on the left
- Active detail on the right
- Clear selected state
- Independent scrolling where useful

### 17.2 Tabs

Tabs should organize peer sections, not replace navigation.

- Use short labels
- Keep tab count limited
- Use a subtle underline or contained active state
- Avoid multiple nested tab levels

### 17.3 Breadcrumbs

Breadcrumbs should appear on deeply nested screens and object pages.

They should remain visually secondary to the page title.

---

## 18. Drawers, Modals, and Popovers

### 18.1 Drawers

Use drawers for:

- Quick record previews
- Filters
- Secondary editing
- Contextual details

Recommended width:

- Small: 400px
- Standard: 520px
- Large: 720px

### 18.2 Modals

Use modals for focused tasks that require explicit completion or cancellation.

Avoid placing long or complex workflows inside modals.

### 18.3 Popovers

Use popovers for lightweight contextual controls such as:

- Date selection
- Column settings
- Quick filters
- Short menus

All elevated surfaces should use `surface-2` or `surface-3`, a subtle border, and restrained shadow.

---

## 19. Empty, Loading, and Error States

### 19.1 Empty states

Empty states should be practical and concise.

Include:

- Clear explanation
- Relevant next action
- Optional minimal icon

Avoid oversized illustrations.

### 19.2 Loading states

Use skeleton loaders that match the final layout.

Avoid excessive spinners, especially for full-page loading.

### 19.3 Error states

Errors should state:

- What failed
- What the user can do next
- Whether data was saved

Use inline errors for local problems and banners for page-level failures.

---

## 20. Icons

Use a consistent outline icon set with simple geometry.

Recommended characteristics:

- 1.5px to 2px stroke
- Rounded joins
- Minimal detail
- 16px, 18px, 20px, and 24px sizes

Icons should support labels, not replace them for unfamiliar actions.

Avoid mixing filled, outlined, and highly decorative icon styles.

---

## 21. Motion

Motion should be subtle and functional.

Recommended durations:

| Interaction | Duration |
|---|---:|
| Hover or focus | 100–150ms |
| Dropdown or popover | 150–180ms |
| Drawer | 200–240ms |
| Modal | 180–220ms |
| Page transition | 180–240ms |

Use simple easing. Avoid elastic, bouncy, or decorative animation.

Respect reduced-motion preferences.

---

## 22. Responsive Behavior

The primary target is desktop operational use.

### Desktop

- Persistent sidebar
- Full tables
- Multi-column layouts
- Right-side summary rails

### Tablet

- Collapsible sidebar
- Reduced horizontal spacing
- Responsive cards
- Horizontal table scrolling where necessary

### Mobile

- Drawer navigation
- Stacked forms
- Cards or condensed lists instead of wide tables
- Sticky primary actions when useful

Mobile should remain usable, but the desktop experience defines the visual system.

---

## 23. Accessibility

The dark theme must remain accessible.

Requirements:

- Maintain sufficient contrast for text and controls
- Never rely on color alone to communicate status
- Provide visible keyboard focus
- Use minimum 40px interactive target height where possible
- Support screen-reader labels
- Preserve logical heading structure
- Use clear validation messages
- Support reduced motion

Muted text should remain readable and should not be used for critical information.

---

## 24. Visual Do and Do Not

### Do

- Use clear hierarchy
- Use generous spacing
- Keep surfaces restrained
- Use thin borders
- Keep the accent color limited
- Use consistent status language
- Prioritize scanning and comparison
- Present complex information in calm, structured sections

### Do not

- Use bright gradients
- Use neon colors
- Use glassmorphism
- Use oversized illustrations
- Use excessive shadows
- Use highly rounded consumer-style cards
- Put every section inside a card
- Compress tables to legacy-ERP density by default
- Add decorative animation
- Use color as the only status indicator

---

## 25. Reference Screen Composition

A typical list page should look like this:

1. Dark application shell
2. Stable left sidebar
3. Slim global top bar
4. Breadcrumbs
5. Spacious page header
6. One clear primary action
7. Search and filter toolbar
8. Large bordered table surface
9. Muted pagination and result count

A typical entity page should look like this:

1. Breadcrumbs
2. Object header with identifier, name, and status
3. Primary actions aligned right
4. Optional tabs
5. Wide main content column
6. Calm section separation
7. Optional right-side summary rail
8. Activity or audit history near the bottom

---

## 26. Final Design Standard

The finished interface should look like a premium enterprise product designed for prolonged daily use.

It should feel more refined and spacious than a traditional ERP, while preserving the structure, predictability, and operational clarity associated with SAP Fiori.

The visual system should communicate:

- Control
- Reliability
- Calm
- Precision
- Professionalism

The design should never sacrifice readability or operational efficiency for visual novelty.
