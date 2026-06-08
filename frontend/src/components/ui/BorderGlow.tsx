/* reactbits BorderGlow (TS-TW) - https://reactbits.dev/components/border-glow */
import { type ReactNode } from 'react';

interface BorderGlowProps {
  children?: ReactNode;
  className?: string;
  edgeSensitivity?: number;
  glowColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  glowRadius?: number;
  glowIntensity?: number;
  coneSpread?: number;
  animated?: boolean;
  colors?: string[];
  fillOpacity?: number;
}

const BorderGlow: React.FC<BorderGlowProps> = ({
  children,
  className = '',
  borderRadius = 28,
  backgroundColor = '#120F17',
}) => {
  return (
    <div
      className={`relative ${className}`}
      style={{
        background: backgroundColor,
        borderRadius: `${borderRadius}px`,
      }}
    >
      <div className="flex flex-col relative overflow-auto z-[1]">
        {children}
      </div>
    </div>
  );
};

export default BorderGlow;