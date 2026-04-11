export function normalizeHeight(value: number | string): string {
  if (typeof value === 'number') {
    return `${value}px`;
  }
  const trimmed = value.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return `${trimmed}px`;
  }
  return trimmed;
}

export function positionDropdown(
  dropdown: HTMLElement,
  control: HTMLElement,
  optionsList: HTMLElement
): void {
  const rect = control.getBoundingClientRect();
  const viewportWidth = document.documentElement.clientWidth;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  dropdown.style.position = 'absolute';
  dropdown.style.zIndex = '9999';

  let width = rect.width;
  if (width > viewportWidth - 20) {
    width = viewportWidth - 20;
  }
  dropdown.style.width = `${width}px`;

  let left = rect.left + scrollX;
  if (rect.left + width > viewportWidth) {
    left = viewportWidth - width - 10 + scrollX;
  }
  if (left < scrollX + 10) {
    left = scrollX + 10;
  }

  dropdown.style.left = `${left}px`;

  const viewportHeight = window.innerHeight;
  const dropdownHeight = optionsList.clientHeight || 240;
  const spaceBelow = viewportHeight - rect.bottom;
  const spaceAbove = rect.top;

  const flipUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
  dropdown.classList.toggle('thek-drop-up', flipUp);

  if (flipUp) {
    dropdown.style.top = `${rect.top + scrollY - dropdownHeight - 4}px`;
  } else {
    dropdown.style.top = `${rect.bottom + scrollY}px`;
  }
}
