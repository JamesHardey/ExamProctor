# WokkahCBT Design Guidelines

## Design Approach

**Selected Approach:** Design System - Professional Dashboard Pattern
**Justification:** WokkahCBT is a utility-focused, information-dense application requiring clarity, trust, and efficiency. Drawing inspiration from Linear, Notion, and enterprise dashboards for clean data presentation and professional aesthetics.

## Core Design Principles

1. **Clarity Over Decoration** - Information hierarchy guides every decision
2. **Trust Through Professionalism** - Clean, secure aesthetics reinforce platform integrity
3. **Efficiency First** - Minimize cognitive load for both admins and candidates
4. **Contextual Emphasis** - Highlight critical actions (Start Exam, Submit, Alerts) appropriately

---

## Color Palette

### Light Mode
- **Primary:** 217 91% 60% (Professional Blue - trust and security)
- **Primary Hover:** 217 91% 50%
- **Secondary:** 142 76% 36% (Green - success states, completion)
- **Background:** 0 0% 100% (Pure white)
- **Surface:** 210 20% 98% (Subtle gray for cards)
- **Border:** 214 32% 91% (Soft borders)
- **Text Primary:** 222 47% 11% (Near black)
- **Text Secondary:** 215 16% 47% (Muted gray)

### Dark Mode
- **Primary:** 217 91% 60%
- **Primary Hover:** 217 91% 70%
- **Secondary:** 142 76% 45%
- **Background:** 222 47% 11%
- **Surface:** 217 33% 17%
- **Border:** 215 28% 25%
- **Text Primary:** 210 20% 98%
- **Text Secondary:** 215 20% 65%

### Status Colors
- **Success:** 142 76% 36%
- **Warning:** 38 92% 50%
- **Danger:** 0 84% 60%
- **Info:** 199 89% 48%

### Proctoring Alert Colors
- **Low Severity:** 45 93% 47% (Amber)
- **Medium Severity:** 24 100% 50% (Orange)
- **High Severity:** 0 84% 60% (Red)

---

## Typography

**Font Families:**
- **Primary:** 'Inter', system-ui, sans-serif (body, UI elements)
- **Monospace:** 'JetBrains Mono', monospace (codes, IDs, technical data)

**Type Scale:**
- **Display:** text-5xl font-bold (Admin dashboard headers)
- **H1:** text-3xl font-semibold (Page titles)
- **H2:** text-2xl font-semibold (Section headers)
- **H3:** text-xl font-medium (Card titles)
- **Body Large:** text-base font-normal (Primary content)
- **Body:** text-sm font-normal (Secondary content)
- **Caption:** text-xs font-medium (Labels, metadata)

**Font Weights:**
- Regular: 400 (body text)
- Medium: 500 (labels, navigation)
- Semibold: 600 (headings, emphasis)
- Bold: 700 (critical actions)

---

## Layout System

**Spacing Units:** Use Tailwind spacing of 2, 4, 6, 8, 12, 16, 24 for consistency
- Micro spacing: p-2, gap-2 (tight elements)
- Component spacing: p-4, gap-4 (cards, buttons)
- Section spacing: p-6 to p-8 (page sections)
- Major spacing: mb-12, mt-16 (page divisions)

**Grid System:**
- Admin Dashboard: 12-column grid with responsive breakpoints
- Exam Interface: Centered single column (max-w-4xl)
- Monitoring: Multi-column flexible grid (2-4 columns based on screen)

**Container Widths:**
- Full-width dashboards: max-w-7xl
- Forms and exams: max-w-3xl
- Settings panels: max-w-5xl

---

## Component Library

### Navigation
**Admin Sidebar:**
- Fixed left sidebar (w-64) with logo, navigation items, user profile
- Icon + label navigation items with active state indicator (left border accent)
- Collapsible on mobile (hamburger menu)

**Candidate Top Bar:**
- Fixed top bar with exam title, timer (always visible), and minimal controls
- Sticky positioning for constant visibility

### Data Display

**Dashboard Cards:**
- White/dark surface with subtle shadow (shadow-sm)
- Rounded corners (rounded-lg)
- Padding: p-6
- Border: border border-gray-200/dark:border-gray-700

**Data Tables:**
- Zebra striping for row differentiation
- Sticky headers for long lists
- Sortable columns with icon indicators
- Row hover states for interactivity
- Actions menu (three-dot) aligned right

**Stat Cards:**
- Large numerical display (text-4xl font-bold)
- Label below (text-sm text-secondary)
- Trend indicator with color-coded arrows
- Compact padding (p-4)

### Forms

**Input Fields:**
- Consistent height (h-10)
- Border with focus ring (focus:ring-2 focus:ring-primary)
- Dark mode: proper background and text contrast
- Labels above inputs (text-sm font-medium)
- Helper text below (text-xs text-secondary)

**Buttons:**
- Primary: bg-primary text-white with hover state
- Secondary: border border-primary text-primary
- Danger: bg-red-600 text-white (delete, submit)
- Size variants: sm (h-8), default (h-10), lg (h-12)

**Question Display (Exam Interface):**
- Large, readable question text (text-lg)
- Radio buttons or checkboxes with ample spacing (gap-3)
- Clear selection states with primary color
- Progress indicator showing question number

### Proctoring Components

**Camera Feed Display:**
- Rounded window (rounded-lg) showing live feed
- Border color indicating monitoring status (green=active, red=alert)
- Compact view in admin dashboard (w-48 h-36)
- Picture-in-picture option for candidate during exam

**Alert Banners:**
- Top-positioned sticky alerts (top-0)
- Color-coded by severity (bg-amber-100 for warnings)
- Dismissible with X icon
- Icon + message + timestamp format

**Event Log:**
- Chronological list with timestamps
- Color-coded severity indicators (left border)
- Expandable for detailed metadata
- Auto-scroll to latest events

### Overlays

**Modals:**
- Centered overlay with backdrop (bg-black/50)
- White/dark card (max-w-2xl)
- Header with title and close button
- Footer with action buttons (right-aligned)

**Pre-Exam System Check:**
- Full-screen overlay with checklist UI
- Green checkmarks for passed tests
- Red X for failures with troubleshooting
- Large "Start Exam" button (disabled until all checks pass)

---

## Exam Interface Specific Design

**Layout:**
- Centered question container (max-w-3xl mx-auto)
- Fixed timer bar at top (always visible)
- Question number and navigation at bottom
- Full-screen mode enforcement (clean, distraction-free)

**Question Card:**
- Generous padding (p-8)
- Clear question text (text-xl mb-6)
- Answer options with large click targets
- "Mark for Review" toggle (subtle, top-right)

**Navigation:**
- Bottom bar with Previous/Next buttons
- Question palette sidebar showing all questions (numbered grid)
- Visual indicators: answered (green), flagged (amber), unanswered (gray)

---

## Admin Dashboard Layout

**Main Dashboard:**
- Top stats row (4 columns): Active Exams, Total Candidates, Flagged Incidents, Completion Rate
- Live Monitoring section (grid of camera feeds, 3-4 per row)
- Recent activity feed (right sidebar)
- Quick action buttons (Create Exam, Add Candidate)

**Exam Management:**
- List view with search/filter controls
- Each exam card shows: title, domain, schedule, candidate count, status toggle
- Inline edit and duplicate actions

**Monitoring Dashboard:**
- Split view: Camera grid (left 2/3) + Event log (right 1/3)
- Real-time status badges for each candidate
- Filter controls for severity levels

---

## Animations

Use sparingly for feedback only:
- Button hover: subtle scale (scale-105) and shadow increase
- Page transitions: fade-in (200ms)
- Alert appearances: slide-down (300ms)
- Loading states: pulse animation on skeletons
- No decorative animations in exam interface

---

## Images

**Admin Dashboard Header:**
- Optional abstract tech/security illustration in hero area (if using hero section)
- Dimensions: 1200x400px, subtle gradient overlay
- Purpose: Brand identity and visual interest

**Empty States:**
- Illustration for "No exams created yet" (centered, max-w-sm)
- Illustration for "No candidates enrolled" 
- Purpose: Guide users to take action

**System Check Icons:**
- Camera, microphone, browser icons for pre-exam checklist
- Simple, outlined style matching UI icons

**No large hero image** - This is a functional dashboard application focused on data and workflows, not marketing content.

---

## Accessibility & Responsiveness

- Maintain WCAG 2.1 AA contrast ratios (4.5:1 for text)
- Focus indicators on all interactive elements
- Keyboard navigation support throughout
- Screen reader labels for icon-only buttons
- Mobile-responsive breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Exam interface optimized for tablets and desktops (min 768px recommended)