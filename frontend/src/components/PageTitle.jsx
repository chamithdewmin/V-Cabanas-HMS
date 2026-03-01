import React from 'react';

/**
 * Shared layout for page title + optional short description.
 * Use under the main heading for consistent spacing and hierarchy.
 */
const PageTitle = ({ title, description, className = '' }) => (
  <div className={`mb-4 ${className}`}>
    <h1 className="text-2xl font-semibold text-foreground tracking-tight">{title}</h1>
    {description && (
      <p className="text-muted-foreground text-sm mt-1">{description}</p>
    )}
  </div>
);

export default PageTitle;
