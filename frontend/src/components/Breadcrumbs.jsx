import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const REPORT_LABELS = {
  overview: 'Overview',
  'profit-loss': 'Profit & Loss',
  'cash-flow': 'Cash Flow',
  income: 'Income',
  expense: 'Expense',
  tax: 'Tax',
};

const toTitle = (segment) => segment && REPORT_LABELS[segment]
  ? REPORT_LABELS[segment]
  : segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Simple breadcrumbs for nested routes (e.g. Reports → Overview).
 */
const Breadcrumbs = ({ className = '' }) => {
  const location = useLocation();
  const path = location.pathname || '';
  const segments = path.split('/').filter(Boolean);

  if (segments.length < 2) return null;

  const items = segments.map((segment, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/');
    const label = segment === 'reports' ? 'Reports' : toTitle(segment);
    const isLast = i === segments.length - 1;
    return { href, label, isLast };
  });

  return (
    <nav aria-label="Breadcrumb" className={`flex items-center gap-1.5 text-sm text-muted-foreground ${className}`}>
      {items.map((item, i) => (
        <span key={item.href} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground/70" aria-hidden />}
          {item.isLast ? (
            <span className="font-medium text-foreground" aria-current="page">{item.label}</span>
          ) : (
            <Link to={item.href} className="hover:text-foreground transition-colors">
              {item.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
};

export default Breadcrumbs;
