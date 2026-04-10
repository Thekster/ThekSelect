import { ThekSelect, ThekSelectHandle } from '../src/index.ts';

window.toggleCode = (btn: HTMLElement) => {
  const snippet = btn.nextElementSibling as HTMLElement;
  snippet.classList.toggle('visible');
  btn.textContent = snippet.classList.contains('visible') ? 'Hide Code' : 'Show Code';
};

const instances: ThekSelectHandle<unknown>[] = [];
const pageThemeSelect = document.getElementById('page-theme-select') as HTMLSelectElement;
const thekThemeSelect = document.getElementById('thek-theme-select') as HTMLSelectElement;

const registerInstance = (instance: ThekSelectHandle<unknown>) => {
  instances.push(instance);
};

const applyThekTheme = (theme: string) => {
  const supportedThemes = [
    'dark',
    'forest',
    'red',
    'blue',
    'gray',
    'bootstrap',
    'tailwind',
    'material'
  ];
  const resolvedTheme = supportedThemes.includes(theme) ? theme : 'base';
  if (resolvedTheme === 'base') {
    document.documentElement.removeAttribute('data-thek-theme');
  } else {
    document.documentElement.setAttribute('data-thek-theme', resolvedTheme);
  }
  if (thekThemeSelect) thekThemeSelect.value = resolvedTheme;
};

const applyPageTheme = (theme: string) => {
  const supportedPageThemes = ['light', 'dark', 'gray', 'red', 'blue', 'green'];
  const resolvedTheme = supportedPageThemes.includes(theme) ? theme : 'light';
  document.documentElement.setAttribute('data-showcase-theme', resolvedTheme);
  document.documentElement.setAttribute('data-theme', resolvedTheme === 'dark' ? 'dark' : 'light');
  if (pageThemeSelect) pageThemeSelect.value = resolvedTheme;
};

if (pageThemeSelect) {
  pageThemeSelect.addEventListener('change', (e) => {
    applyPageTheme((e.target as HTMLSelectElement).value);
  });
}

if (thekThemeSelect) {
  thekThemeSelect.addEventListener('change', (e) => {
    applyThekTheme((e.target as HTMLSelectElement).value);
  });
}

// Basic
const basic = ThekSelect.init('#basic-select', {
  placeholder: 'Select framework...'
});
registerInstance(basic);

// Quick docs: initialize from existing native select
const quickCountry = ThekSelect.init('#quick-country-select');
registerInstance(quickCountry);

// Quick docs: global defaults demo
const quickDefaultsOptions = [
  { value: 'alpha', label: 'Alpha' },
  { value: 'beta', label: 'Beta' },
  { value: 'gamma', label: 'Gamma' }
];
ThekSelect.setDefaults({ height: 44 });
const quickDefaultsFirst = ThekSelect.init('#quick-defaults-first', {
  options: quickDefaultsOptions,
  placeholder: 'Uses global height (44px)'
});
const quickDefaultsSecond = ThekSelect.init('#quick-defaults-second', {
  options: quickDefaultsOptions,
  height: 56,
  placeholder: 'Overrides to 56px'
});
ThekSelect.resetDefaults();
registerInstance(quickDefaultsFirst);
registerInstance(quickDefaultsSecond);

// Multi
const multi = ThekSelect.init('#multi-select', {
  multiple: true,
  maxSelectedLabels: 3
});
registerInstance(multi);

// Creation
const create = ThekSelect.init('#create-container', {
  canCreate: true,
  multiple: true,
  options: [
    { value: 'design', label: 'Design' },
    { value: 'marketing', label: 'Marketing' }
  ],
  createText: "Add skill: '{%t}'"
});
registerInstance(create);

// Remote
const remote = ThekSelect.init('#remote-container', {
  searchable: true,
  placeholder: 'Type a GitHub username...',
  loadOptions: async (query) => {
    if (!query) return [];
    try {
      const res = await fetch(`https://api.github.com/search/users?q=${query}&per_page=10`);
      const data = await res.json();
      return (data.items || []).map((u) => ({ value: u.login, label: u.login }));
    } catch {
      return [];
    }
  }
});
registerInstance(remote);

// Virtualization
const bigOptions = Array.from({ length: 5000 }, (_, i) => ({
  value: `opt_${i + 1}`,
  label: `Option ${i + 1}`
}));
const virtualized = ThekSelect.init('#virtual-container', {
  options: bigOptions,
  searchable: true,
  placeholder: 'Search large list...',
  virtualize: true,
  virtualThreshold: 80,
  virtualItemHeight: 40,
  virtualOverscan: 4
});
registerInstance(virtualized);

// Sizing
const options = [
  { value: '1', label: 'Option 1' },
  { value: '2', label: 'Option 2' },
  { value: '3', label: 'Option 3' }
];
registerInstance(ThekSelect.init('#size-sm', { height: 32, options, placeholder: 'Small size' }));
registerInstance(ThekSelect.init('#size-md', { height: 40, options, placeholder: 'Medium size' }));
registerInstance(ThekSelect.init('#size-lg', { height: 48, options, placeholder: 'Large size' }));

// Multi-select sizing
const smMulti = ThekSelect.init('#size-sm-multi', {
  height: 32,
  multiple: true,
  options,
  placeholder: 'Small multi'
});
const mdMulti = ThekSelect.init('#size-md-multi', {
  height: 40,
  multiple: true,
  options,
  placeholder: 'Medium multi'
});
const lgMulti = ThekSelect.init('#size-lg-multi', {
  height: 48,
  multiple: true,
  options,
  placeholder: 'Large multi'
});

smMulti.setValue(['1', '2']);
mdMulti.setValue(['1', '2']);
lgMulti.setValue(['1', '2']);

registerInstance(smMulti);
registerInstance(mdMulti);
registerInstance(lgMulti);

// Custom Fields
const fieldOptions = [
  { id: 'usr_1', name: 'John Doe', role: 'Admin' },
  { id: 'usr_2', name: 'Jane Smith', role: 'Editor' },
  { id: 'usr_3', name: 'Bob Wilson', role: 'User' }
];
registerInstance(
  ThekSelect.init('#fields-container', {
    displayField: 'name',
    valueField: 'id',
    options: fieldOptions,
    placeholder: 'Select a user...'
  })
);

// API Methods
let apiInstance = null;
const initApiInstance = () => {
  const isMultiple = document.getElementById('api-multiple-toggle').checked;
  const maxOptVal = document.getElementById('api-max-options').value;
  const maxOptions = maxOptVal ? parseInt(maxOptVal) : null;

  apiInstance = ThekSelect.init('#api-target-container', {
    multiple: isMultiple,
    maxOptions: maxOptions,
    options: [
      { value: '1', label: 'API Option 1' },
      { value: '2', label: 'API Option 2' },
      { value: '3', label: 'API Option 3' },
      { value: '4', label: 'API Option 4' },
      { value: '5', label: 'API Option 5' }
    ],
    placeholder: 'API testing...'
  });
  registerInstance(apiInstance);
};
initApiInstance();

document.getElementById('api-multiple-toggle').addEventListener('change', () => {
  if (apiInstance) apiInstance.destroy();
  initApiInstance();
});

document.getElementById('api-max-options').addEventListener('input', (e) => {
  const val = e.target.value;
  apiInstance.setMaxOptions(val ? parseInt(val) : null);
});

document.getElementById('btn-getvalue').addEventListener('click', () => {
  const val = apiInstance.getValue();
  document.getElementById('getvalue-output').textContent = `=> ${JSON.stringify(val)}`;
});

document.getElementById('btn-getobjects').addEventListener('click', () => {
  const objs = apiInstance.getSelectedOptions();
  const out = document.getElementById('getobjects-output');
  out.style.display = 'block';
  out.textContent = `=> ${JSON.stringify(objs, null, 2)}`;
});

document.getElementById('btn-setvalue').addEventListener('click', () => {
  const val = document.getElementById('setvalue-input').value;
  const silent = document.getElementById('setvalue-silent').checked;
  apiInstance.setValue(val, silent);
});

document.getElementById('btn-destroy').addEventListener('click', () => {
  apiInstance.destroy();
  const idx = instances.indexOf(apiInstance);
  if (idx > -1) instances.splice(idx, 1);
});

document.getElementById('btn-reinit').addEventListener('click', () => {
  try {
    apiInstance.destroy();
  } catch {}
  initApiInstance();
});

// Configurator
const optionsWithMetadata = [
  { value: '1', label: 'User Profile', data: { icon: 'fa-user', desc: 'Account settings' } },
  {
    value: '2',
    label: 'Security',
    data: { icon: 'fa-shield-halved', desc: 'Password & Auth' }
  },
  {
    value: '3',
    label: 'Integrations',
    data: { icon: 'fa-puzzle-piece', desc: 'Connected apps' }
  },
  {
    value: '4',
    label: 'Billing',
    data: { icon: 'fa-credit-card', desc: 'Subscription plans' }
  }
];

const configPreview = ThekSelect.init('#config-preview-container', {
  placeholder: 'Custom preview...',
  options: optionsWithMetadata,
  multiple: true
});
registerInstance(configPreview);

const applyThemeToPreviewInstance = (theme) => {
  const targetElements = [configPreview.renderer?.wrapper, configPreview.renderer?.dropdown].filter(
    Boolean
  );
  const cssVarMap = {
    primary: '--thek-primary',
    primaryLight: '--thek-primary-light',
    bgSurface: '--thek-bg-surface',
    bgPanel: '--thek-bg-panel',
    border: '--thek-border',
    textMain: '--thek-text-main',
    fontFamily: '--thek-font-family',
    borderRadius: '--thek-border-radius',
    heightSm: '--thek-height-sm',
    heightMd: '--thek-height-md',
    heightLg: '--thek-height-lg',
    itemPadding: '--thek-item-padding'
  };

  targetElements.forEach((el) => {
    Object.entries(cssVarMap).forEach(([key, cssVar]) => {
      const value = theme[key];
      if (value) {
        el.style.setProperty(cssVar, value);
      } else {
        el.style.removeProperty(cssVar);
      }
    });
  });
};

const CONFIG_PRESETS = {
  light: {
    primary: '#0f172a',
    bgSurface: '#ffffff',
    textMain: '#0f172a',
    border: '#e2e8f0',
    fontFamily: 'inherit',
    borderRadius: '8px',
    height: 40,
    padding: '8px 10px',
    render: 'default'
  },
  dark: {
    primary: '#38bdf8',
    bgSurface: '#0f172a',
    textMain: '#ffffff',
    border: '#334155',
    fontFamily: 'inherit',
    borderRadius: '8px',
    height: 40,
    padding: '8px 10px',
    render: 'default'
  },
  slate: {
    primary: '#0f172a',
    bgSurface: '#ffffff',
    textMain: '#0f172a',
    border: '#e2e8f0',
    fontFamily: 'inherit',
    borderRadius: '8px',
    height: 40,
    padding: '8px 10px',
    render: 'default'
  },
  ocean: {
    primary: '#2563eb',
    bgSurface: '#eff6ff',
    textMain: '#1e3a8a',
    border: '#60a5fa',
    fontFamily: "'Inter', sans-serif",
    borderRadius: '12px',
    height: 42,
    padding: '8px 10px',
    render: 'custom'
  },
  sunset: {
    primary: '#e11d48',
    bgSurface: '#fff1f2',
    textMain: '#450a0a',
    border: '#cbd5e1',
    fontFamily: "'Georgia', serif",
    borderRadius: '12px',
    height: 42,
    padding: '12px 16px',
    render: 'default'
  },
  forest: {
    primary: '#059669',
    bgSurface: '#f0fdf4',
    textMain: '#064e3b',
    border: '#4ade80',
    fontFamily: "'Inter', sans-serif",
    borderRadius: '8px',
    height: 40,
    padding: '8px 10px',
    render: 'custom'
  },
  mono: {
    primary: '#0f172a',
    bgSurface: '#f8fafc',
    textMain: '#0f172a',
    border: '#94a3b8',
    fontFamily: "'Courier New', monospace",
    borderRadius: '4px',
    height: 38,
    padding: '4px 8px',
    render: 'default'
  }
};

const applyConfigPreset = (presetKey) => {
  const preset = CONFIG_PRESETS[presetKey];
  if (!preset) return;
  document.getElementById('config-primary').value = preset.primary;
  document.getElementById('config-bg').value = preset.bgSurface;
  document.getElementById('config-text').value = preset.textMain;
  document.getElementById('config-border').value = preset.border;
  document.getElementById('config-font').value = preset.fontFamily;
  document.getElementById('config-round').value = preset.borderRadius;
  document.getElementById('config-height').value = String(preset.height);
  document.getElementById('config-padding').value = preset.padding;
  document.getElementById('config-render').value = preset.render;
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const updateConfigurator = () => {
  const baseHeight = parseInt(document.getElementById('config-height').value) || 40;
  const primary = document.getElementById('config-primary').value;
  const bgSurface = document.getElementById('config-bg').value;
  const textMain = document.getElementById('config-text').value;
  const border = document.getElementById('config-border').value;
  const theme = {
    primary,
    bgSurface,
    textMain,
    border,
    fontFamily: document.getElementById('config-font').value,
    borderRadius: document.getElementById('config-round').value,
    heightMd: `${baseHeight}px`,
    heightSm: `${Math.max(24, baseHeight - 8)}px`,
    heightLg: `${baseHeight + 8}px`,
    itemPadding: document.getElementById('config-padding').value,
    primaryLight: `${primary}20`,
    bgPanel: `${primary}10`,
    bgSubtle: `${primary}08`,
    borderStrong: border,
    textMuted: textMain,
    textInverse: '#ffffff',
    danger: '#ef4444'
  };
  configPreview.setHeight(baseHeight);
  applyThemeToPreviewInstance(theme);

  const renderMode = document.getElementById('config-render').value;
  if (renderMode === 'custom') {
    configPreview.setRenderOption((option) => {
      if (!option.data) return option.label;
      const wrapper = document.createElement('div');
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.gap = '12px';
      wrapper.style.padding = '4px 0';
      wrapper.innerHTML = `
              <div style="width: 32px; height: 32px; border-radius: 6px; background: ${theme.primaryLight}; color: ${theme.primary}; display: flex; align-items: center; justify-content: center; font-size: 0.9em;">
                  <i class="fa-solid ${option.data.icon}"></i>
              </div>
              <div style="display: flex; flex-direction: column; line-height: 1.2;">
                  <span style="font-weight: 600; font-size: 0.9em;">${option.label}</span>
                  <span style="font-size: 0.75em; opacity: 0.6;">${option.data.desc}</span>
              </div>
          `;
      return wrapper;
    });
  } else {
    configPreview.setRenderOption((option) => option.label);
  }

  const themeVars = [
    ['--thek-primary', theme.primary],
    ['--thek-primary-light', theme.primaryLight],
    ['--thek-bg-surface', theme.bgSurface],
    ['--thek-bg-panel', theme.bgPanel],
    ['--thek-bg-subtle', theme.bgSubtle],
    ['--thek-border', theme.border],
    ['--thek-border-strong', theme.borderStrong],
    ['--thek-text-main', theme.textMain],
    ['--thek-text-muted', theme.textMuted],
    ['--thek-text-inverse', theme.textInverse],
    ['--thek-danger', theme.danger],
    ['--thek-font-family', theme.fontFamily],
    ['--thek-border-radius', theme.borderRadius],
    ['--thek-height-sm', theme.heightSm],
    ['--thek-height-md', theme.heightMd],
    ['--thek-height-lg', theme.heightLg],
    ['--thek-item-padding', theme.itemPadding]
  ];

  const cssThemeSnippetHtml = [
    `<span class="css-selector">:root</span> <span class="css-punct">{</span>`,
    ...themeVars.map(
      ([name, value]) =>
        `  <span class="css-var">${escapeHtml(name)}</span><span class="css-punct">:</span> <span class="css-value">${escapeHtml(value)}</span><span class="css-punct">;</span>`
    ),
    `<span class="css-punct">}</span>`
  ].join('\n');
  document.getElementById('config-json-output').innerHTML = cssThemeSnippetHtml;
};

document.getElementById('copy-theme-css').addEventListener('click', async () => {
  const output = document.getElementById('config-json-output');
  const cssText = output.textContent || '';
  if (!cssText.trim()) return;
  try {
    await navigator.clipboard.writeText(cssText);
  } catch {
    // Clipboard API might be unavailable in some contexts.
  }
});

const presetEl = document.getElementById('config-preset');
presetEl.addEventListener('change', (e) => {
  const value = e.target.value;
  applyConfigPreset(value);
  updateConfigurator();
});

[
  'config-primary',
  'config-bg',
  'config-text',
  'config-border',
  'config-font',
  'config-round',
  'config-height',
  'config-padding',
  'config-render'
].forEach((id) => {
  const el = document.getElementById(id);
  el.addEventListener('input', () => {
    updateConfigurator();
  });
  el.addEventListener('change', () => {
    updateConfigurator();
  });
});
applyConfigPreset('slate');
updateConfigurator();

const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
applyPageTheme(prefersDark ? 'dark' : 'light');
if (thekThemeSelect) {
  applyThekTheme(thekThemeSelect.value);
}

const sections = document.querySelectorAll('section');
const navLinks = document.querySelectorAll('nav a');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach((section) => {
    const sectionTop = section.offsetTop;
    if (pageYOffset >= sectionTop - 100) {
      current = section.getAttribute('id');
    }
  });

  navLinks.forEach((link) => {
    link.classList.remove('active');
    if (link.getAttribute('href') === `#${current}`) {
      link.classList.add('active');
    }
  });
});
