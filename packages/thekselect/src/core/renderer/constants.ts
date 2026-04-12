import { ThekSelectOption } from '../types.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function createSvg(
  className: string,
  viewBox: string,
  fill: string = 'currentColor'
): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('xmlns', SVG_NS);
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('fill', fill);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  return svg;
}

function createPath(d: string, attrs: Record<string, string> = {}): SVGPathElement {
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', d);
  Object.entries(attrs).forEach(([key, value]) => path.setAttribute(key, value));
  return path;
}

export function createChevronIcon(): SVGSVGElement {
  const svg = createSvg('thek-arrow', '0 0 20 20');
  svg.appendChild(
    createPath(
      'M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z',
      {
        'fill-rule': 'evenodd',
        'clip-rule': 'evenodd'
      }
    )
  );
  return svg;
}

export function createSearchIcon(): SVGSVGElement {
  const svg = createSvg('thek-search-icon', '0 0 20 20');
  svg.appendChild(
    createPath(
      'M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z',
      {
        'fill-rule': 'evenodd',
        'clip-rule': 'evenodd'
      }
    )
  );
  return svg;
}

export function createSpinnerIcon(): SVGSVGElement {
  const svg = createSvg('thek-spinner', '0 0 24 24', 'none');
  const circle = document.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('cx', '12');
  circle.setAttribute('cy', '12');
  circle.setAttribute('r', '10');
  circle.setAttribute('stroke', 'currentColor');
  circle.setAttribute('stroke-width', '2.5');
  circle.setAttribute('stroke-dasharray', '52');
  circle.setAttribute('stroke-dashoffset', '20');
  circle.setAttribute('stroke-linecap', 'round');
  svg.appendChild(circle);
  return svg;
}

export function createCheckIcon(): SVGSVGElement {
  const svg = createSvg('thek-check', '0 0 20 20');
  svg.appendChild(
    createPath(
      'M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z',
      {
        'fill-rule': 'evenodd',
        'clip-rule': 'evenodd'
      }
    )
  );
  return svg;
}

export function replaceChildrenWithIcon(container: HTMLElement, icon: SVGSVGElement): void {
  container.replaceChildren(icon);
}

export interface RendererCallbacks<T = unknown> {
  onSelect: (option: ThekSelectOption<T>) => void;
  onCreate: (label: string) => void;
  onRemove: (option: ThekSelectOption<T>) => void;
  onReorder: (from: number, to: number) => void;
  onError: (err: Error) => void;
  onOrphan: () => void;
}
