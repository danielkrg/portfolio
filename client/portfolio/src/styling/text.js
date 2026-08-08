import { light } from './theme';

export const createText = (theme = light) => ({
  title:        `text-7xl font-bold tracking-wide leading-none ${theme.textPrimary}`,
  titleAlt:     `text-7xl font-bold tracking-wide leading-none ${theme.textSecondary}`,
  subtitle:     `text-5xl font-bold leading-tight tracking-normal ${theme.textPrimary}`,
  subtitleAlt:     `text-5xl font-bold leading-tight tracking-normal ${theme.textSecondary}`,
  sectionLabel: `text-xs font-semibold tracking-widest uppercase ${theme.textSecondary}`,
  navBrand:     `text-sm font-medium tracking-widest uppercase ${theme.textSecondary}`,
  navLink:      `text-xs tracking-widest uppercase ${theme.textSecondary}`,
  body:         `text-m leading-relaxed ${theme.textSecondary}`,
  bodyLight:    `text-m font-light leading-relaxed ${theme.textSecondary}`,
  caption:      `text-sm font-light italic tracking-normal ${theme.textSecondary}`,
  small:        `text-xs tracking-wide ${theme.textSecondary}`,
  rowNum:       `font-light tracking-widest ${theme.textSecondary}`,
  rowText:      `font-light tracking-tight ${theme.textSecondary}`,
});