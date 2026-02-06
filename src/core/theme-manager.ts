import { ThekSelectTheme } from './types.js';

export class ThemeManager {
  constructor(private wrapper: HTMLElement, private dropdown: HTMLElement) {}

  public apply(theme?: ThekSelectTheme): void {
    if (!theme) return;

    const mapping: Record<string, string> = {
      primary: '--thek-primary',
      primaryLight: '--thek-primary-light',
      bgSurface: '--thek-bg-surface',
      bgPanel: '--thek-bg-panel',
      bgSubtle: '--thek-bg-subtle',
      border: '--thek-border',
      borderStrong: '--thek-border-strong',
      textMain: '--thek-text-main',
      textMuted: '--thek-text-muted',
      textInverse: '--thek-text-inverse',
      danger: '--thek-danger',
      shadow: '--thek-shadow',
      fontFamily: '--thek-font-family',
      borderRadius: '--thek-border-radius',
      heightSm: '--thek-height-sm',
      heightMd: '--thek-height-md',
      heightLg: '--thek-height-lg',
      itemPadding: '--thek-item-padding',
    };

    Object.entries(theme).forEach(([key, value]) => {
      const varName = mapping[key];
      if (varName && value) {
        this.wrapper.style.setProperty(varName, value as string);
        this.dropdown.style.setProperty(varName, value as string);
      }
    });
  }

  public reset(): void {
    this.wrapper.removeAttribute('style');
    this.dropdown.removeAttribute('style');
  }
}
