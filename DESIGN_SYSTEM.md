# Second Brain Design System
## Phase 4: Professional UI Overhaul

**Design Philosophy:** Calming, focused cognitive support system (not a todo app)
**Inspiration:** Things 3 (calm), Linear (professional/fast), Notion (flexible not overwhelming)

---

## Color Palette

### Core Colors
- **Primary (Focus):** `blue-600` (#2563eb) - For primary actions, active states
- **Background:** `slate-50` (#f8fafc) - Soft, calming background
- **Surface:** `white` - Card backgrounds
- **Text Primary:** `slate-900` (#0f172a) - Main content
- **Text Secondary:** `slate-600` (#475569) - Supporting text
- **Text Tertiary:** `slate-400` (#94a3b8) - Hints, placeholders

### Semantic Colors
- **Success:** `emerald-500` (#10b981) - Capture confirmation, completed tasks
- **Warning:** `amber-500` (#f59e0b) - Due soon, needs attention
- **Error:** `rose-500` (#f43f5e) - Errors, overdue
- **Info:** `blue-500` (#3b82f6) - Information, clarifications

### Accent Colors (Context Tags)
- **Work:** `indigo-100/indigo-700`
- **Personal:** `purple-100/purple-700`
- **Project:** `cyan-100/cyan-700`

### Border & Divider
- **Border Light:** `slate-200` (#e2e8f0)
- **Border Medium:** `slate-300` (#cbd5e1)
- **Focus Ring:** `blue-500` with opacity

---

## Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
```

### Scale
- **Page Title:** `text-3xl font-bold` (30px)
- **Section Heading:** `text-xl font-semibold` (20px)
- **Card Title:** `text-base font-medium` (16px)
- **Body:** `text-sm` (14px)
- **Small/Meta:** `text-xs` (12px)

### Line Height
- Tight for headings: `leading-tight`
- Relaxed for body: `leading-relaxed`

---

## Spacing & Layout

### Spacing Scale (Tailwind)
- `space-y-2` (0.5rem / 8px) - Tight grouping
- `space-y-4` (1rem / 16px) - Default vertical spacing
- `space-y-6` (1.5rem / 24px) - Section spacing
- `space-y-8` (2rem / 32px) - Major section breaks

### Container
- Max width: `max-w-4xl` (896px) for content
- Padding: `px-6` on mobile, `px-8` on desktop
- Centered: `mx-auto`

### Cards
- Padding: `p-5` (20px) for regular cards
- Border: `border border-slate-200`
- Radius: `rounded-xl` (12px) for cards, `rounded-lg` (8px) for buttons
- Shadow: `shadow-sm` default, `shadow-md` on hover

---

## Animations & Transitions

### Principles
- Subtle, purposeful motion
- Fast enough to feel instant (150-200ms)
- Reduce anxiety, don't add excitement

### Standard Transitions
```css
transition-all duration-150 ease-in-out
```

### Specific Animations
1. **Capture Success:**
   - Scale feedback on textarea: `scale-[0.99]` → `scale-100`
   - Green pulse on success message
   - Smooth fade-out after 2s

2. **Card Hover:**
   - Lift effect: `translate-y-[-2px]`
   - Shadow increase: `shadow-sm` → `shadow-md`
   - Border color shift: `border-slate-200` → `border-slate-300`

3. **Modal Entry:**
   - Backdrop fade-in: `opacity-0` → `opacity-100`
   - Content slide-up: `translate-y-4` → `translate-y-0`

4. **Loading States:**
   - Skeleton shimmer effect (gradient animation)
   - Spinner for actions: subtle rotation

---

## Component Patterns

### Buttons

**Primary Action:**
```tsx
bg-blue-600 text-white px-4 py-2.5 rounded-lg
hover:bg-blue-700 active:bg-blue-800
transition-colors duration-150
disabled:opacity-50 disabled:cursor-not-allowed
```

**Secondary Action:**
```tsx
bg-white border border-slate-300 text-slate-700 px-4 py-2.5 rounded-lg
hover:bg-slate-50 active:bg-slate-100
transition-colors duration-150
```

**Destructive:**
```tsx
bg-rose-600 text-white px-4 py-2.5 rounded-lg
hover:bg-rose-700 active:bg-rose-800
```

### Input Fields
```tsx
px-4 py-2.5 border border-slate-300 rounded-lg
focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
transition-all duration-150
placeholder:text-slate-400
```

### Cards (Clickable)
```tsx
bg-white border border-slate-200 rounded-xl p-5
hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5
transition-all duration-150 cursor-pointer
```

### Empty States
- Icon: Large, subtle color (slate-300)
- Text: Encouraging, not apologetic
- Action: Clear next step

---

## Mobile-First Considerations

### Touch Targets
- Minimum: `h-11` (44px) for all interactive elements
- Buttons: `py-2.5` minimum
- Adequate spacing between clickable items: `gap-2` minimum

### Thumb Zones
- Primary actions at bottom on mobile
- Navigation accessible (top or bottom bar)
- Large capture textarea, easy to tap

### Responsive Breakpoints
- Mobile: `<640px` - Stack vertically, full-width cards
- Tablet: `640-1024px` - 2-column layouts where appropriate
- Desktop: `>1024px` - 3-column layouts, sidebar options

---

## Screen-Specific Guidelines

### Capture
- Large, inviting textarea
- Instant visual feedback on typing
- Satisfying success animation
- Tips section: Collapsible, non-intrusive

### Digest/Today
- Stats: Large numbers, clear labels, icons for visual interest
- Next Actions: Card-based, clear hierarchy
- Progressive disclosure: Show 5 tasks, "Show more" button
- Calming color scheme: Blue accent for focus

### Browse
- Tabs for entity types (Tasks, Projects, Ideas, People)
- Search prominent but not overwhelming
- Filters: Collapsible, remember state
- Grid on desktop, list on mobile

### Modals
- Backdrop: `bg-slate-900/20` (light) or `bg-slate-900/40` (dark)
- Content: Slide up with fade-in
- Close: X button + click outside + ESC key
- Mobile: Full-screen or slide-up sheet

---

## Implementation Priority

1. **Foundation:** Update Tailwind config with custom colors
2. **Global:** Typography, spacing, color variables
3. **Components:** Buttons, inputs, cards (shared)
4. **Capture:** Most critical for first impression
5. **Digest:** Primary daily interaction
6. **Browse & Other Screens:** Systematically apply patterns
7. **Polish:** Animations, empty states, micro-interactions
8. **Mobile:** Responsive refinements

---

## Success Criteria

- **Feels calm:** Muted colors, generous spacing, no visual noise
- **Feels focused:** Clear hierarchy, one primary action per screen
- **Feels professional:** Consistent styling, attention to detail
- **Feels supportive:** Encouraging copy, helpful empty states
- **Feels fast:** Instant feedback, smooth transitions
