# Color Theme Usage Documentation

This document lists all color theme definitions and their usages throughout the MyAccounts application.

## 📋 Table of Contents
1. [CSS Variables (index.css)](#css-variables)
2. [Tailwind Config](#tailwind-config)
3. [Report Pages Color Constants](#report-pages)
4. [Hardcoded Colors](#hardcoded-colors)
5. [Status Colors](#status-colors)

---

## 🎨 CSS Variables (index.css)

### Light Theme (`:root`)
```css
--background: 225 25% 6%           /* #0c0e14 - Page background */
--foreground: 210 40% 96%          /* Text color */
--card: 0 0% 100%                  /* White cards */
--card-foreground: 222 47% 11%     /* Dark text on cards */
--primary: 217 91% 60%             /* Blue - Primary actions */
--primary-foreground: 0 0% 100%    /* White text on primary */
--secondary: 214 20% 90%           /* Light gray secondary */
--secondary-foreground: 222 47% 11% /* Dark text on secondary */
--muted: 214 20% 92%               /* Muted backgrounds */
--muted-foreground: 215 15% 35%    /* Muted text */
--accent: 217 91% 60%              /* Blue - Accent color */
--accent-foreground: 0 0% 100%     /* White text on accent */
--destructive: 0 72% 51%            /* Red - Destructive actions */
--destructive-foreground: 0 0% 100% /* White text on destructive */
--border: 214 20% 86%               /* Border color */
--input: 214 20% 88%                /* Input background */
--ring: 222 84% 56%                 /* Focus ring color */
--sidebar-active-bg: 217 55% 22%   /* Dark blue sidebar active bg */
--sidebar-active-accent: 217 91% 60% /* Blue sidebar active accent */
```

### Dark Theme (`.dark`)
```css
--background: 225 25% 6%           /* #0c0e14 - Page background */
--foreground: 210 40% 96%          /* Text color */
--card: 224 22% 10%                /* #13161e - Card background */
--card-foreground: 210 40% 96%     /* Light text on cards */
--primary: 217 91% 60%             /* Blue - Primary actions */
--primary-foreground: 0 0% 100%    /* White text on primary */
--secondary: 210 25% 18%           /* Dark gray secondary */
--secondary-foreground: 210 30% 80% /* Light text on secondary */
--muted: 210 25% 18%               /* Muted backgrounds */
--muted-foreground: 210 30% 80%    /* Muted text */
--accent: 217 91% 60%              /* Blue - Accent color */
--accent-foreground: 0 0% 100%     /* White text on accent */
--destructive: 0 72% 51%            /* Red - Destructive actions */
--destructive-foreground: 0 0% 100% /* White text on destructive */
--border: 216 19% 15%               /* Border color */
--input: 216 19% 15%                /* Input background */
--ring: 222 84% 56%                 /* Focus ring color */
--sidebar-active-bg: 217 55% 22%   /* Dark blue sidebar active bg */
--sidebar-active-accent: 217 91% 60% /* Blue sidebar active accent */

/* Table Colors */
--table-header-bg: #0f1117         /* Table header background */
--table-row-odd: #111419           /* Odd row background */
--table-row-even: #13161e          /* Even row background */
--table-row-hover: #1a1d27         /* Row hover background */
--table-divider: #1e2433           /* Table divider/border */
--table-border: #2a3347            /* Table border */
--text-primary: #fff                /* Primary text */
--text-body: #d1d9e6               /* Body text */
--text-label: #8b9ab0              /* Label text */
--text-muted: #6b7a99              /* Muted text */
--text-placeholder: #4a5568        /* Placeholder text */
```

### Scrollbar Colors
**Light Theme:**
- Track: `hsl(214 20% 94%)`
- Thumb: `hsl(214 20% 75%)`
- Thumb Hover: `hsl(214 20% 65%)`

**Dark Theme:**
- Track: `#111`
- Thumb: `#333`
- Thumb Hover: `#444`

---

## 🎯 Tailwind Config Colors

All colors are mapped from CSS variables:
- `bg-background` → `hsl(var(--background))`
- `bg-card` → `hsl(var(--card))`
- `bg-primary` → `hsl(var(--primary))`
- `bg-secondary` → `hsl(var(--secondary))`
- `bg-muted` → `hsl(var(--muted))`
- `bg-accent` → `hsl(var(--accent))`
- `bg-destructive` → `hsl(var(--destructive))`
- `text-foreground` → `hsl(var(--foreground))`
- `text-muted-foreground` → `hsl(var(--muted-foreground))`
- `border-border` → `hsl(var(--border))`

---

## 📊 Report Pages Color Constants

### ReportOverview.jsx, ReportCashFlow.jsx, BalanceSheet.jsx, ReportTax.jsx, ReportProfitLoss.jsx
```javascript
const C = {
  bg: "#0c0e14",           // Page background
  bg2: "#0f1117",           // Secondary background
  card: "#13161e",          // Card background
  border: "#1e2433",        // Border color
  border2: "#2a3347",       // Secondary border
  text: "#fff",             // Primary text
  text2: "#d1d9e6",         // Secondary text
  muted: "#8b9ab0",         // Muted text
  faint: "#4a5568",         // Faint text
  green: "#22c55e",         // Green (success/income)
  red: "#ef4444",           // Red (error/expenses)
  blue: "#3b82f6",          // Blue (info)
  cyan: "#22d3ee",          // Cyan (secondary info)
  yellow: "#eab308",        // Yellow (warning)
  purple: "#a78bfa",        // Purple (accent)
  orange: "#f97316",        // Orange (accent)
};
```

### Status Map Colors (ReportCashFlow.jsx)
```javascript
const sMap = {
  Received: {
    bg: "rgba(34,197,94,0.15)",   // Green background
    c: "#22c55e"                   // Green text
  },
  Paid: {
    bg: "rgba(59,130,246,0.15)",  // Blue background
    c: "#3b82f6"                   // Blue text
  },
  Overdue: {
    bg: "rgba(239,68,68,0.15)",   // Red background
    c: "#ef4444"                   // Red text
  },
  Pending: {
    bg: "rgba(234,179,8,0.15)",   // Yellow background
    c: "#eab308"                   // Yellow text
  }
};
```

---

## 🔴 Hardcoded Colors

### Action Buttons (Report Pages)
```css
background: #1c1e24
border: 1px solid #303338
color: #fff
borderRadius: 8
```

### Modal Overlay
```css
background: rgba(0,0,0,0.7)
backdropFilter: blur(4px)
```

### Chart Colors
- **Green (Income/Positive)**: `#22c55e`
- **Red (Expense/Negative)**: `#ef4444`
- **Blue (Info)**: `#3b82f6`
- **Cyan (Secondary Info)**: `#22d3ee`
- **Yellow (Warning)**: `#eab308`
- **Purple (Accent)**: `#a78bfa`
- **Orange (Accent)**: `#f97316`

### Gradient Colors
- **Green Gradient**: `linear-gradient(135deg, #16a34a, #15803d)`
- **Blue Gradient**: `linear-gradient(135deg, #2563eb, #1d4ed8)`
- **Red Gradient**: `linear-gradient(135deg, #ef4444, #dc2626)`

### Dashboard Specific Colors
- **Page Background**: `#0c0e14`
- **Card Background**: `#13161e`
- **Card Border**: `#1e2433`
- **Hover Background**: `#1a1d27`
- **Alternate Row**: `#111419`

### Invoice Theme Color
- **Default**: `#F97316` (Orange) - User configurable in Settings

---

## 🎨 Color Usage by Component Type

### Buttons
- **Primary**: `bg-primary` (Blue: `hsl(217 91% 60%)`)
- **Secondary**: `bg-secondary` (Dark gray)
- **Destructive**: `bg-destructive` (Red: `hsl(0 72% 51%)`)
- **Action Buttons**: `#1c1e24` background with `#303338` border

### Cards
- **Background**: `bg-card` → `#13161e` (dark theme)
- **Border**: `border-secondary` → `hsl(var(--border))`
- **Text**: `text-foreground` → `#fff` (dark theme)

### Tables
- **Header**: `#0f1117`
- **Odd Rows**: `#111419`
- **Even Rows**: `#13161e`
- **Hover**: `#1a1d27`
- **Divider**: `#1e2433`

### Status Indicators
- **Success/Income**: Green (`#22c55e`)
- **Error/Expense**: Red (`#ef4444`)
- **Warning/Pending**: Yellow (`#eab308`)
- **Info**: Blue (`#3b82f6`)

### Text Colors
- **Primary**: `#fff`
- **Secondary**: `#d1d9e6`
- **Muted**: `#8b9ab0`
- **Label**: `#8b9ab0`
- **Placeholder**: `#4a5568`

---

## 📝 Usage Examples

### Using CSS Variables
```jsx
<div className="bg-card text-foreground border border-border">
  <button className="bg-primary text-primary-foreground">Click</button>
</div>
```

### Using Report Page Colors
```jsx
<div style={{ background: C.card, color: C.text, border: `1px solid ${C.border}` }}>
  <span style={{ color: C.green }}>Income</span>
  <span style={{ color: C.red }}>Expense</span>
</div>
```

### Using Status Colors
```jsx
const status = sMap[transaction.status];
<div style={{ background: status.bg, color: status.c }}>
  {transaction.status}
</div>
```

---

## 🔄 Color Conversion Reference

### HSL to Hex
- `217 91% 60%` = `#3b82f6` (Blue)
- `225 25% 6%` = `#0c0e14` (Background)
- `224 22% 10%` = `#13161e` (Card)
- `0 72% 51%` = `#ef4444` (Red)

### Common Colors
- **Primary Blue**: `#3b82f6` / `hsl(217 91% 60%)`
- **Success Green**: `#22c55e`
- **Error Red**: `#ef4444`
- **Warning Yellow**: `#eab308`
- **Background**: `#0c0e14`
- **Card**: `#13161e`
- **Border**: `#1e2433`

---

## 📌 Notes

1. **Primary Theme**: Blue (`#3b82f6` / `hsl(217 91% 60%)`)
2. **Card Background**: `#13161e` (used consistently across all cards)
3. **Page Background**: `#0c0e14` (dark theme)
4. **Report Pages**: Use hardcoded color constants (`C` object) for consistency
5. **Main App**: Uses CSS variables for theme flexibility
6. **Invoice Theme**: User-configurable, defaults to orange (`#F97316`)

---

*Last Updated: Based on current codebase state*
