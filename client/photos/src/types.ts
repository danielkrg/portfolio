import type { Dispatch, SetStateAction } from 'react';

/**
 * The portfolio theme token set (see client/portfolio/src/styling/theme.js).
 * The Photos app receives the resolved theme from its wrapper so it renders in
 * the same light/dark palette as the rest of the portfolio.
 */
export interface PhotosTheme {
  bg: string;
  bgOverlay: string;
  textPrimary: string;
  textSecondary: string;
  textSubtle: string;
  textHover: string;
  groupTextHover: string;
  border: string;
  borderAccent: string;
  navBg: string;
  cursorDark: boolean;
}

export interface PhotosAppProps {
  isDark: boolean;
  setIsDark: Dispatch<SetStateAction<boolean>>;
  theme: PhotosTheme;
  onExit: () => void;
}
