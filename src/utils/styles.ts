export const BASE_STYLES = `:root {
    --thek-primary: #0f172a;
    --thek-primary-light: #f1f5f9;
    --thek-bg-surface: #ffffff;
    --thek-bg-panel: #f8fafc;
    --thek-bg-subtle: #f1f5f9;
    --thek-border: #e2e8f0;
    --thek-border-strong: #cbd5e1;
    --thek-text-main: #0f172a;
    --thek-text-muted: #64748b;
    --thek-text-inverse: #ffffff;
    --thek-danger: #ef4444;
    --thek-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
    --thek-input-height: 40px;
    --thek-height-sm: 32px;
    --thek-height-md: 40px;
    --thek-height-lg: 48px;
    --thek-item-padding: 8px 10px;
    --thek-font-family: inherit;
    --thek-border-radius: 8px;
}

@media (prefers-color-scheme: dark) {
    :root {
        --thek-primary: #38bdf8;
        --thek-primary-light: rgba(56, 189, 248, 0.15);
        --thek-bg-surface: #0f172a;
        --thek-bg-panel: #334155;
        --thek-bg-subtle: #475569;
        --thek-border: #334155;
        --thek-border-strong: #475569;
        --thek-text-main: #f8fafc;
        --thek-text-muted: #94a3b8;
        --thek-text-inverse: #0f172a;
        --thek-danger: #f43f5e;
        --thek-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.4);
    }
}

[data-theme='dark'] {
    --thek-primary: #38bdf8;
    --thek-primary-light: rgba(56, 189, 248, 0.15);
    --thek-bg-surface: #0f172a;
    --thek-bg-panel: #334155;
    --thek-bg-subtle: #475569;
    --thek-border: #334155;
    --thek-border-strong: #475569;
    --thek-text-main: #f8fafc;
    --thek-text-muted: #94a3b8;
    --thek-text-inverse: #0f172a;
    --thek-danger: #f43f5e;
    --thek-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.4);
}

.thek-select {
    position: relative;
    width: 100%;
    font-family: var(--thek-font-family);
    box-sizing: border-box;
}

.thek-select *, .thek-dropdown * {
    box-sizing: border-box;
}

.thek-control {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 12px;
    cursor: pointer;
    min-height: var(--thek-input-height);
    background-color: var(--thek-bg-surface);
    color: var(--thek-text-main);
    border: 1px solid var(--thek-border);
    border-radius: var(--thek-border-radius);
    transition: all 0.2s ease;
}

.thek-control:hover {
    border-color: var(--thek-border-strong);
}

.thek-select.thek-open .thek-control {
    border-color: var(--thek-primary);
    box-shadow: 0 0 0 2px var(--thek-primary-light);
}

.thek-placeholder {
    color: var(--thek-text-muted);
    margin-left: 2px;
    font-size: 0.95em;
}

.thek-indicators {
    display: flex;
    align-items: center;
    padding-left: 12px;
    color: var(--thek-text-muted);
}

.thek-arrow {
    font-size: 0.8em;
    transition: transform 0.2s ease;
}

.thek-open .thek-arrow {
    transform: rotate(180deg);
}

.thek-selection {
    display: flex;
    flex-wrap: nowrap;
    overflow: hidden;
    gap: 6px;
    flex: 1;
    -webkit-mask-image: linear-gradient(to right, black 90%, transparent 100%);
    mask-image: linear-gradient(to right, black 90%, transparent 100%);
}

.thek-summary-text {
    font-size: 0.9em;
    color: var(--thek-text-main);
    white-space: nowrap;
    font-weight: 500;
}

.thek-tag {
    flex-shrink: 0;
    background-color: var(--thek-bg-panel);
    border: 1px solid var(--thek-border);
    color: var(--thek-text-main);
    border-radius: calc(var(--thek-border-radius) - 2px);
    padding: 2px 8px;
    font-size: 0.8em;
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 500;
    transition: background-color 0.1s;
}

.thek-tag:hover {
    background-color: var(--thek-bg-subtle);
}

.thek-tag-remove {
    cursor: pointer;
    color: var(--thek-text-muted);
    font-size: 1.1em;
    line-height: 1;
}

.thek-tag-remove:hover {
    color: var(--thek-danger);
}

.thek-dropdown {
    background-color: var(--thek-bg-surface);
    border: 1px solid var(--thek-border);
    border-radius: var(--thek-border-radius);
    box-shadow: var(--thek-shadow);
    overflow: hidden;
    box-sizing: border-box;
    margin-top: 4px;
    animation: thek-fade-in 0.15s ease-out;
}

@keyframes thek-fade-in {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
}

.thek-search-wrapper {
    padding: 10px;
    border-bottom: 1px solid var(--thek-border);
    position: relative;
    background-color: var(--thek-bg-surface);
}

.thek-input {
    width: 100%;
    border: 1px solid var(--thek-border);
    background: var(--thek-bg-surface);
    padding: 8px 12px 8px 34px;
    border-radius: calc(var(--thek-border-radius) - 2px);
    color: var(--thek-text-main);
    outline: none;
    font-size: 0.9em;
    transition: border-color 0.2s;
}

.thek-input:focus {
    border-color: var(--thek-primary);
}

.thek-search-icon {
    position: absolute;
    left: 22px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--thek-text-muted);
    font-size: 0.85em;
}

.thek-options {
    list-style: none;
    margin: 0;
    padding: 6px;
    max-height: 240px;
    overflow-y: auto;
}

.thek-option {
    padding: var(--thek-item-padding);
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: all 0.1s ease;
    color: var(--thek-text-main);
    font-size: 0.95em;
    margin-bottom: 2px;
}

.thek-option:last-child {
    margin-bottom: 0;
}

.thek-option:hover {
    background-color: var(--thek-bg-panel);
}

.thek-option.thek-focused {
    background-color: var(--thek-bg-panel);
}

.thek-option.thek-selected {
    background-color: var(--thek-primary-light);
    color: var(--thek-primary);
    font-weight: 500;
}

.thek-checkbox {
    width: 1.2em;
    height: 1.2em;
    border: 1.5px solid var(--thek-border-strong);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--thek-bg-surface);
    font-size: 0.7em;
    flex-shrink: 0;
    transition: all 0.2s;
}

.thek-option.thek-selected .thek-checkbox {
    background-color: var(--thek-primary);
    border-color: var(--thek-primary);
    color: var(--thek-text-inverse);
}

.thek-option.thek-disabled {
    opacity: 0.4;
    cursor: not-allowed;
    background-color: transparent;
}

.thek-no-results, .thek-loading {
    padding: 20px 12px;
    text-align: center;
    color: var(--thek-text-muted);
    font-size: 0.9em;
}

.thek-select-sm, .thek-dropdown-sm { --thek-input-height: var(--thek-height-sm); font-size: 0.875rem; }
.thek-select-md, .thek-dropdown-md { --thek-input-height: var(--thek-height-md); font-size: 1rem; }
.thek-select-lg, .thek-dropdown-lg { --thek-input-height: var(--thek-height-lg); font-size: 1.125rem; }

.thek-disabled .thek-control {
    background-color: var(--thek-bg-subtle);
    cursor: not-allowed;
    opacity: 0.7;
    border-color: var(--thek-border);
}
`;

let injected = false;

export function injectStyles() {
    if (injected || typeof document === 'undefined') return;
    
    const style = document.createElement('style');
    style.id = 'thekselect-base-styles';
    style.textContent = BASE_STYLES;
    document.head.appendChild(style);
    injected = true;
}
