# ThekSelect

A lightweight, framework-agnostic, and accessible select library with native Drag-and-Drop support and robust object-based theming.

## Features

- **Headless Core**: Logic and state are separated from the UI for maximum flexibility.
- **Searchable**: Real-time filtering of options with built-in debounce.
- **Multi-select & Tagging**: Support for multiple selections with reorderable tags.
- **Custom Tag Creation**: Allow users to create new options on the fly.
- **Remote Data Loading**: Fetch options from APIs with ease.
- **Object-based Theming**: Fully customizable appearance via configuration objects.
- **Native Drag-and-Drop**: Reorder selected tags using HTML5 DnD.
- **Accessible**: WAI-ARIA compliant and keyboard navigable.
- **Responsive Sizing**: Built-in support for `sm`, `md`, and `lg` variants.

## Installation

```bash
npm install thekselect
```

## Usage

### Basic Initialization

```javascript
import { ThekSelect } from 'thekselect';

// Initialize using a selector or element
const select = ThekSelect.init('#my-select', {
  placeholder: 'Select an option...',
});
```

### Multi-select with Custom Tags

```javascript
const ts = ThekSelect.init('#container', {
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
const ts = ThekSelect.init('#remote-select', {
  loadOptions: async (query) => {
    const response = await fetch(`https://api.example.com/search?q=${query}`);
    const data = await response.json();
    // Return objects mapping to your valueField/displayField
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
| `maxSelectedLabels` | `number` | `3` | Number of tags to show before collapsing to summary. |
| `displayField` | `string` | `'label'` | Property name to use for display text. |
| `valueField` | `string` | `'value'` | Property name to use for internal value. |
| `maxOptions` | `number \| null` | `null` | Limit the number of items displayed in dropdown. |
| `theme` | `Object` | `{}` | Custom theme object (primary, bgSurface, borderRadius, etc.). |
| `loadOptions` | `Function` | `undefined` | Async function to fetch remote options. |
| `renderOption` | `Function` | `(o) => o[displayField]` | Custom rendering for dropdown options. |
| `renderSelection` | `Function` | `(o) => o[displayField]` | Custom rendering for selected items. |

### Theming Example

```javascript
const select = ThekSelect.init('#themed-select', {
  theme: {
    primary: '#8b5cf6',
    bgSurface: '#faf5ff',
    textMain: '#5b21b6',
    fontFamily: '"Inter", sans-serif',
    borderRadius: '12px'
  }
});
```

### Custom Fields & Data Example

```javascript
const select = ThekSelect.init('#custom-fields', {
  displayField: 'name',
  valueField: 'id',
  options: [
    { id: '1', name: 'John Doe', data: { role: 'Admin' } },
    { id: '2', name: 'Jane Smith', data: { role: 'User' } }
  ],
  renderOption: (opt) => {
    // Can return string or HTMLElement
    return `<div><strong>${opt.name}</strong> <small>(${opt.data.role})</small></div>`;
  }
});
```

## Methods

- `getValue()`: Returns the selected value (string) or values (array).
- `getSelectedOptions()`: Returns the full data objects for current selection.
- `setValue(value, silent = false)`: Programmatically sets the selection.
- `setTheme(theme)`: Updates the theme dynamically.
- `setSize(size)`: Updates the component size ('sm', 'md', 'lg') dynamically.
- `setMaxOptions(limit)`: Updates the dropdown item limit dynamically.
- `setRenderOption(callback)`: Updates the rendering function dynamically.
- `on(event, callback)`: Subscribe to events.
- `destroy()`: Removes the library instance and restores the original element.

## Events

- `change`: Triggered when selection changes. Returns current value(s).
- `open`: Triggered when dropdown opens.
- `close`: Triggered when dropdown closes.
- `search`: Triggered on user input. Returns search query.
- `tagAdded`: Triggered when a tag is added. Returns the option object.
- `tagRemoved`: Triggered when a tag is removed. Returns the option object.
- `reordered`: Triggered when tags are reordered via drag-and-drop.

## License

MIT