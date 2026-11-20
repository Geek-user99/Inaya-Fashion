import React from 'react';

interface BrandLogoProps {
  className?: string;
  compact?: boolean;
  subtitle?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = '', compact = false, subtitle }) => {
  return (
    <span className={`inline-flex flex-col leading-none whitespace-nowrap shrink-0 select-none ${className}`}>
      <span
        className={`font-display font-semibold tracking-[0.2em] uppercase text-[#171614] dark:text-[#F4F2EE] ${
          compact ? 'text-base' : 'text-lg sm:text-xl'
        }`}
      >
        INAYA <span className="font-normal text-[#9E7B42] dark:text-[#D9B675]">FASHION</span>
      </span>
      {subtitle && (
        <span className="text-[10px] tracking-[0.18em] uppercase text-[#6E6A63] dark:text-[#A39E93] mt-0.5">
          {subtitle}
        </span>
      )}
    </span>
  );
};
