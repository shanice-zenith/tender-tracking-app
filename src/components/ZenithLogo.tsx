import React from 'react';

interface ZenithLogoProps {
  className?: string;
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  align?: 'left' | 'center';
}

/**
 * Official Zenith Group Wordmark Logo
 * Faithfully matches ZenithLogoArtboard 1@4x.png:
 * Features the bold classical Roman serif wordmark "ZENITH"
 * with centered, tracked "GROUP" in clean architectural sans-serif underneath.
 */
export const ZenithLogo: React.FC<ZenithLogoProps> = ({
  className = '',
  variant = 'dark',
  size = 'md',
  align = 'left'
}) => {
  const isLight = variant === 'light';
  const mainColor = isLight ? '#ffffff' : '#0a0a0a';
  const subColor = isLight ? '#e2e8f0' : '#171717';

  const fontSizes = {
    sm: { main: 'text-lg sm:text-xl', sub: 'text-[9px] sm:text-[10px]' },
    md: { main: 'text-2xl sm:text-3xl', sub: 'text-[11px] sm:text-xs' },
    lg: { main: 'text-3xl sm:text-4xl', sub: 'text-xs sm:text-sm' },
    xl: { main: 'text-4xl sm:text-5xl', sub: 'text-sm sm:text-base' }
  };

  const alignClass = align === 'center' ? 'items-center text-center' : 'items-start text-left';

  return (
    <div className={`inline-flex flex-col select-none leading-none ${alignClass} ${className}`}>
      {/* ZENITH (Classical Roman Serif) */}
      <span
        className={`font-black uppercase tracking-[0.24em] ${fontSizes[size].main}`}
        style={{
          fontFamily: '"Cinzel", "Times New Roman", "Baskerville", "Playfair Display", Georgia, serif',
          color: mainColor,
          letterSpacing: '0.26em',
          fontWeight: 900
        }}
      >
        ZENITH
      </span>

      {/* GROUP (Clean wide-tracked sans-serif) */}
      <span
        className={`font-normal uppercase tracking-[0.45em] mt-1.5 ${fontSizes[size].sub}`}
        style={{
          fontFamily: '"Montserrat", "Inter", "Helvetica Neue", Arial, sans-serif',
          color: subColor,
          letterSpacing: '0.48em',
          fontWeight: 300,
          paddingLeft: '0.24em'
        }}
      >
        G R O U P
      </span>
    </div>
  );
};
