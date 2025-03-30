"use client"

import React from 'react';
import { cn } from '@/lib/utils';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onCheckedChange) {
        onCheckedChange(e.target.checked);
      }
    };
    
    return (
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={handleChange}
          className={cn(
            "peer h-4 w-4 shrink-0 rounded-sm border border-primary cursor-pointer appearance-none",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50 checked:bg-primary",
            className
          )}
          {...props}
        />
        <svg
          className={cn(
            "absolute h-4 w-4 pointer-events-none stroke-white fill-none",
            "opacity-0 peer-checked:opacity-100 transition-opacity"
          )}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="3"
        >
          <polyline points="6 12 10 16 18 8" />
        </svg>
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox'; 