# UI Redesign Plan: Softer, Clearer, Mobile-First

## Overview

**Goal**: Transform the current dark-only "elite athleticism" theme into a softer, cleaner design with proper light/dark mode support and improved mobile experience.

**Key Changes**:
- Switch from HSL to OKLCH color space (modern, perceptually uniform)
- Add light mode as default with dark mode support
- Warm amber primary (light) / teal primary (dark)
- Softer border radius (0.375rem vs current 0.5rem)
- Improved mobile navigation and layouts
- Remove hardcoded dark theme classes throughout

---

## Phase 1: Foundation - Design Tokens & Theme System
**Priority**: Critical (must complete first)
**Estimated Scope**: ~5 files

### Tasks

#### 1.1 Update CSS Variables (`src/index.css`)
- [ ] Replace current HSL variables with new OKLCH theme
- [ ] Add `:root` (light mode) variables
- [ ] Add `.dark` class variables
- [ ] Add new sidebar-specific variables
- [ ] Add new shadow variables
- [ ] Update Google Fonts import to include Source Serif 4

#### 1.2 Update Tailwind Config (`tailwind.config.js`)
- [ ] Add sidebar color definitions
- [ ] Update font-family to include `font-serif` (Source Serif 4)
- [ ] Update border-radius values
- [ ] Add chart color definitions
- [ ] Remove legacy colors (obsidian, charcoal, electric-blue, signal-red, neon-green)
- [ ] Update keyframes/animations for new color scheme

#### 1.3 Update Base Styles (`src/index.css`)
- [ ] Update body styles to use semantic classes (`bg-background text-foreground`)
- [ ] Update utility classes (`.glass`, `.card-surface`, `.btn-primary`, `.btn-secondary`, `.input-dark`)
- [ ] Update scrollbar styling for light/dark modes
- [ ] Update phone-frame styling
- [ ] Update pillar/framework badge styles

#### 1.4 Add Theme Toggle Infrastructure
- [ ] Ensure `next-themes` ThemeProvider is configured correctly in `App.js`
- [ ] Create theme toggle component (sun/moon icon)
- [ ] Add to Layout header/sidebar

**Deliverable**: Theme system working, can toggle between light/dark modes

---

## Phase 2: Core Layout & Navigation
**Priority**: High
**Estimated Scope**: ~3 files

### Tasks

#### 2.1 Update Layout Component (`src/components/Layout.jsx`)
- [ ] Replace hardcoded dark classes (`text-white`, `bg-obsidian`, `border-white/10`)
- [ ] Use semantic color classes (`text-foreground`, `bg-background`, `border-border`)
- [ ] Update sidebar styling to use new `sidebar-*` variables
- [ ] Update mobile header styling
- [ ] Update tier badge colors for light/dark modes
- [ ] Update Clerk UserButton appearance for both themes

#### 2.2 Improve Mobile Navigation
- [ ] Review Sheet/slide-out menu on mobile
- [ ] Ensure touch targets are at least 44x44px
- [ ] Add smooth transitions
- [ ] Test bottom navigation alternative (if beneficial)

#### 2.3 Update Common UI Components
- [ ] Review and update `Button` variants in `src/components/ui/button.jsx`
- [ ] Review and update `Card` component styling
- [ ] Review and update `Input` component styling
- [ ] Review and update `Dialog`/`Sheet` components

**Deliverable**: Layout works beautifully in both themes, mobile nav is improved

---

## Phase 3: Page Updates - High Priority Pages
**Priority**: High
**Estimated Scope**: ~4 pages

### Tasks

#### 3.1 Dashboard (`src/pages/Dashboard.jsx`)
- [ ] Update bento grid cards to use semantic colors
- [ ] Update stats/metrics styling
- [ ] Update calendar component styling
- [ ] Update topic suggestions styling
- [ ] Ensure mobile layout stacks properly

#### 3.2 Editor (`src/pages/Editor.jsx`) - Most Complex
- [ ] Update split-pane layout for mobile (single column)
- [ ] Update FrameworkEditor styling
- [ ] Update MobilePreview component
- [ ] Update scheduling UI
- [ ] Update toolbar/action buttons
- [ ] Ensure AI generation UI works in both themes

#### 3.3 Settings (`src/pages/Settings.jsx`)
- [ ] Update settings sections/cards
- [ ] Update form inputs styling
- [ ] Update API key management UI
- [ ] Update LinkedIn connection UI
- [ ] Update subscription display

#### 3.4 Library (`src/pages/Library.jsx`)
- [ ] Update post cards styling
- [ ] Update filter/search UI
- [ ] Update empty states

**Deliverable**: Core user flows look polished in new theme

---

## Phase 4: Page Updates - Secondary Pages
**Priority**: Medium
**Estimated Scope**: ~6 pages

### Tasks

#### 4.1 Knowledge Vault (`src/pages/KnowledgeVault.jsx`)
- [ ] Update document/source cards
- [ ] Update upload UI
- [ ] Update tab navigation
- [ ] Update empty states

#### 4.2 Voice Profile (`src/pages/VoiceProfile.jsx`)
- [ ] Update profile sections
- [ ] Update form elements
- [ ] Update tone/style selectors

#### 4.3 Influencer Roster (`src/pages/InfluencerRoster.jsx`)
- [ ] Update influencer cards
- [ ] Update add/edit forms
- [ ] Update list views

#### 4.4 Engagement Queue (`src/pages/EngagementQueue.jsx`)
- [ ] Update queue items styling
- [ ] Update scheduling UI
- [ ] Update action buttons

#### 4.5 Analytics (`src/pages/Analytics.jsx`)
- [ ] Update chart colors (use new chart-1 through chart-5)
- [ ] Update metrics cards
- [ ] Update recommendations UI

#### 4.6 Pricing (`src/pages/Pricing.jsx`)
- [ ] Update pricing cards
- [ ] Update feature lists
- [ ] Update CTA buttons
- [ ] Ensure good contrast in both modes

**Deliverable**: All pages consistent with new design system

---

## Phase 5: Mobile Polish & Responsive Fixes
**Priority**: High
**Estimated Scope**: Cross-cutting

### Tasks

#### 5.1 Responsive Audit
- [ ] Test all pages at 320px, 375px, 414px, 768px widths
- [ ] Identify and fix overflow issues
- [ ] Ensure no horizontal scrolling
- [ ] Fix any text truncation issues

#### 5.2 Touch Optimization
- [ ] Ensure all buttons/links have minimum 44x44px touch targets
- [ ] Add appropriate spacing between interactive elements
- [ ] Review and improve tap feedback (active states)

#### 5.3 Mobile-Specific Layouts
- [ ] Editor: Ensure mobile preview works well
- [ ] Dashboard: Stack bento cards appropriately
- [ ] Forms: Ensure inputs are easy to use on mobile
- [ ] Tables: Convert to card layouts on mobile where needed

#### 5.4 Performance
- [ ] Lazy load heavy components
- [ ] Optimize images if any
- [ ] Test on throttled connections

**Deliverable**: Excellent mobile experience across all pages

---

## Phase 6: Final Polish & QA
**Priority**: Medium
**Estimated Scope**: Cross-cutting

### Tasks

#### 6.1 Accessibility Review
- [ ] Run axe/lighthouse accessibility audit
- [ ] Ensure WCAG AA contrast ratios (4.5:1 for text)
- [ ] Verify keyboard navigation works
- [ ] Add missing ARIA labels
- [ ] Test with screen reader

#### 6.2 Animation & Micro-interactions
- [ ] Add subtle hover effects
- [ ] Add focus ring styling consistent with theme
- [ ] Add loading states where needed
- [ ] Ensure transitions are smooth (200-300ms)

#### 6.3 Edge Cases
- [ ] Empty states for all lists
- [ ] Error states
- [ ] Loading states
- [ ] Long content handling

#### 6.4 Cross-Browser Testing
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Safari
- [ ] Mobile Chrome

#### 6.5 Documentation
- [ ] Update design_guidelines.json with new system
- [ ] Document color usage guidelines
- [ ] Document component patterns

**Deliverable**: Production-ready UI

---

## New Theme Reference

### Light Mode (`:root`)
```css
--background: oklch(1.0000 0 0);           /* Pure white */
--foreground: oklch(0.2686 0 0);           /* Dark gray text */
--primary: oklch(0.7686 0.1647 70.0804);   /* Warm amber/orange */
--secondary: oklch(0.9670 0.0029 264.5419); /* Light blue-gray */
--accent: oklch(0.9869 0.0214 95.2774);    /* Soft yellow */
--muted: oklch(0.9846 0.0017 247.8389);    /* Very light gray */
--border: oklch(0.9276 0.0058 264.5313);   /* Light gray border */
--radius: 0.375rem;                         /* Softer corners */
```

### Dark Mode (`.dark`)
```css
--background: oklch(0.2046 0 0);           /* Soft dark (not pure black) */
--foreground: oklch(0.9219 0 0);           /* Light gray text */
--primary: oklch(0.7650 0.1770 163.2230);  /* Teal/cyan */
--accent: oklch(0.6230 0.2140 259.8150);   /* Purple/violet */
--card: oklch(0.2686 0 0);                  /* Slightly lighter than bg */
--sidebar: oklch(0.1684 0 0);               /* Darker sidebar */
```

### Typography
- **Sans**: Inter (body text)
- **Serif**: Source Serif 4 (accent/quotes)
- **Mono**: JetBrains Mono (code)

---

## Success Criteria

1. **Theme Toggle**: Users can switch between light/dark modes
2. **Mobile First**: All pages work excellently on mobile (320px+)
3. **Consistency**: All pages use semantic color classes
4. **Accessibility**: WCAG AA compliant
5. **Performance**: No regressions in load time
6. **Polish**: Smooth transitions, consistent spacing

---

## Risk Mitigation

1. **Incremental Delivery**: Each phase produces a working state
2. **Feature Flags**: Can toggle new theme if needed
3. **Component-by-Component**: Update in isolation, test thoroughly
4. **Mobile Testing**: Test on real devices throughout

---

## Files to Modify (Summary)

### Core (Phase 1-2)
- `src/index.css` - Theme variables, base styles
- `tailwind.config.js` - Tailwind configuration
- `src/App.js` - Theme provider setup
- `src/components/Layout.jsx` - Main layout

### Pages (Phase 3-4)
- `src/pages/Dashboard.jsx`
- `src/pages/Editor.jsx`
- `src/pages/Settings.jsx`
- `src/pages/Library.jsx`
- `src/pages/KnowledgeVault.jsx`
- `src/pages/VoiceProfile.jsx`
- `src/pages/InfluencerRoster.jsx`
- `src/pages/EngagementQueue.jsx`
- `src/pages/Analytics.jsx`
- `src/pages/Pricing.jsx`

### Components (as needed)
- `src/components/ui/*.jsx` - shadcn components
- `src/components/MobilePreview.jsx`
- `src/components/FrameworkEditor.jsx`
- `src/components/CalendarView.jsx`
- Other custom components

---

*Plan created: 2026-01-31*
*Branch: claude/plan-new-ui-tSqZf*
