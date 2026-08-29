export default [{
  files: ['dist/*.js'],
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'script',
    globals: {
      console:'readonly', window:'readonly', document:'readonly', customElements:'readonly', HTMLElement:'readonly',
      CustomEvent:'readonly', Event:'readonly', ResizeObserver:'readonly', requestAnimationFrame:'readonly',
      cancelAnimationFrame:'readonly', setTimeout:'readonly', clearTimeout:'readonly', queueMicrotask:'readonly',
      localStorage:'readonly', navigator:'readonly', CSS:'readonly', history:'readonly', structuredClone:'readonly'
    }
  },
  rules: { 'no-undef': 'error' }
}];
