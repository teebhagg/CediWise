import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface AppleIconProps {
  size?: number;
  /** Fill color (e.g. white on black button, muted when disabled). */
  color?: string;
}

/**
 * Apple mark from Font Awesome Free 6.5.1 (fa-apple).
 * License: https://fontawesome.com/license/free
 */
export const Apple = {
  Logo: ({ size = 24, color = '#FFFFFF' }: AppleIconProps) => (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 384 512"
      preserveAspectRatio="xMidYMid meet"
    >
      <Path
        fill={color}
        d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-33.3 22.9-82.3 17.5-92.4-17.5 2.1-38.8 13.9-51.4 28.5-13.5 15.6-23.7 44.7-18.7 72.8 19.3 1.9 43.1-4.7 52.6-8.9z"
      />
    </Svg>
  ),
};
