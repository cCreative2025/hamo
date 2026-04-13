import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

const borderClasses = {
  sm: 'border-2',
  md: 'border-4',
  lg: 'border-4',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text,
  fullScreen = false,
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div
        className={cn(
          'border-primary-300 border-t-primary-600 rounded-full animate-spin',
          sizeClasses[size],
          borderClasses[size]
        )}
      />
      {text && <p className="text-sm text-neutral-600">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-80">
        {content}
      </div>
    );
  }

  return content;
};
