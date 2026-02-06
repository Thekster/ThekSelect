# ThekSelect

A headless, framework-agnostic, and accessible select library with native Drag-and-Drop support and multiple themes.

## Features

- **Headless Core**: Logic and state are separated from the UI.
- **Searchable**: Real-time filtering of options.
- **Multi-select & Tagging**: Support for multiple selections with reorderable tags.
- **Custom Tag Creation**: Allow users to create new options on the fly.
- **Remote Data Loading**: Fetch options from APIs with built-in debounce.
- **Native Drag-and-Drop**: Reorder selected tags using HTML5 DnD.
- **Accessible**: WAI-ARIA compliant.
- **Responsive Sizing**: Support for `sm`, `md`, and `lg` variants.

## Installation

```bash
npm install thekselect
```

## Usage

### Basic Initialization

```javascript
import { ThekSelect } from 'thekselect';
import 'thekselect/css/thekselect.css';

const select = new ThekSelect('#my-select', {
  placeholder: 'Select an option...',
});
```

### Multi-select with Custom Tags

```javascript
const ts = new ThekSelect('#container', {
  multiple: true,
  canCreate: true,
  options: [
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' }
  ]
});
```

### Remote Data Loading

```javascript
const ts = new ThekSelect('#remote-select', {
  loadOptions: async (query) => {
    const response = await fetch(`https://api.example.com/search?q=${query}`);
    const data = await response.json();
    return data.map(item => ({ value: item.id, label: item.name }));
  },
  debounce: 500
});
```

## Configuration Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `options` | `Option[]` | `[]` | Initial list of options. |
| `multiple` | `boolean` | `false` | Enable multi-selection. |
| `searchable` | `boolean` | `true` | Enable search filtering. |
| `disabled` | `boolean` | `false` | Disable the control. |
| `placeholder` | `string` | `'Select...'` | Placeholder text. |
| `canCreate` | `boolean` | `false` | Allow creating new options. |
| `createText` | `string` | `"Create '{%t}'..."` | Text for creation option. `{%t}` is replaced by input. |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size of the control. |
| `debounce` | `number` | `300` | Debounce delay for `loadOptions`. |
| `maxSelectedLabels` | `number` | `3` | Maximum number of tags to show before collapsing to summary text. |
| `theme` | `ThekSelectTheme` | `{}` | Custom theme object (primary, bgSurface, fontFamily, etc.). |
| `displayField` | `string` | `'label'` | Property name to use for display text. |
| `valueField` | `string` | `'value'` | Property name to use for internal value. |
| `loadOptions` | `Function` | `undefined` | Async function to fetch remote options. |
| `renderOption` | `Function` | `(o) => o[displayField]` | Custom rendering for dropdown options. |
| `renderSelection` | `Function` | `(o) => o[displayField]` | Custom rendering for selected items. |

### Theming Example

```javascript
const select = new ThekSelect('#themed-select', {
  theme: {
    primary: '#8b5cf6',
    bgSurface: '#faf5ff',
    textMain: '#5b21b6',
    fontFamily: '"Georgia", serif'
  }
});
```

### Custom Fields & Data Example

```javascript
const select = new ThekSelect('#custom-fields', {
  displayField: 'name',
  valueField: 'id',
  options: [
    { id: '1', name: 'John Doe', data: { role: 'Admin' } },
    { id: '2', name: 'Jane Smith', data: { role: 'User' } }
  ],
  renderOption: (opt) => {
    return `<div><strong>${opt.name}</strong> <small>(${opt.data.role})</small></div>`;
  }
});
```

## Methods

- `getValue()`: Returns the selected value (or values array).
- `setValue(value)`: Programmatically sets the selection.
- `setTheme(theme)`: Updates the theme dynamically.
- `setRenderOption(callback)`: Updates the rendering function dynamically.
- `on(event, callback)`: Subscribe to events.
- `destroy()`: Removes the library instance and restores the original element.

## Events

- `change`: Triggered when selection changes.
- `open`: Triggered when dropdown opens.
- `close`: Triggered when dropdown closes.
- `search`: Triggered on user input.
- `tagAdded`: Triggered when a tag is added (multi-select).
- `tagRemoved`: Triggered when a tag is removed (multi-select).
- `reordered`: Triggered when tags are reordered via drag-and-drop.

## License

MIT
