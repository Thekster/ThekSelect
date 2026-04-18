import { describe, it, expect, afterEach } from 'vitest';
import { ThekSelectDom } from '../../src/core/thekselect-dom.js';

describe('Accessible name / label association', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('transfers aria-labelledby from a <label for="..."> association on a wrapped <select>', () => {
    document.body.innerHTML = `
      <label for="fruit-select">Favourite fruit</label>
      <select id="fruit-select">
        <option value="apple">Apple</option>
      </select>
    `;
    const select = document.getElementById('fruit-select') as HTMLSelectElement;
    // Default config has searchable: true, so role="combobox" lives on the input
    ThekSelectDom.init(select);

    const control = document.querySelector('.thek-control') as HTMLElement;
    // The control (combobox element) must reference the label so screen readers announce "Favourite fruit"
    expect(control.getAttribute('aria-labelledby')).toBe('fruit-select-label');

    const label = document.querySelector('label') as HTMLLabelElement;
    expect(label.id).toBe('fruit-select-label');
  });

  it('preserves an existing aria-label on a wrapped <select>', () => {
    document.body.innerHTML = `
      <select id="country" aria-label="Country selector">
        <option value="us">US</option>
      </select>
    `;
    const select = document.getElementById('country') as HTMLSelectElement;
    // Default config has searchable: true, so role="combobox" lives on the input
    ThekSelectDom.init(select);

    const control = document.querySelector('.thek-control') as HTMLElement;
    expect(control.getAttribute('aria-label')).toBe('Country selector');
  });

  it('does not set aria-labelledby when no label or aria-label is present', () => {
    document.body.innerHTML = '<div id="plain"></div>';
    const el = document.getElementById('plain') as HTMLElement;
    ThekSelectDom.init(el, { options: [{ value: '1', label: 'One' }] });

    const control = document.querySelector('.thek-control') as HTMLElement;
    expect(control.getAttribute('aria-labelledby')).toBeNull();
    expect(control.getAttribute('aria-label')).toBeNull();
  });

  it('transfers aria-labelledby when the <select> already has aria-labelledby', () => {
    document.body.innerHTML = `
      <span id="my-label">Pick one</span>
      <select id="sel" aria-labelledby="my-label">
        <option value="x">X</option>
      </select>
    `;
    const select = document.getElementById('sel') as HTMLSelectElement;
    ThekSelectDom.init(select);

    const control = document.querySelector('.thek-control') as HTMLElement;
    expect(control.getAttribute('aria-labelledby')).toBe('my-label');
  });
});
