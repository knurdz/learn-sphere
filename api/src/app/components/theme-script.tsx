export function ThemeScript() {
  // Marketing site is dark-only to match the product design reference.
  const script = `(function(){document.documentElement.setAttribute("data-theme","dark");})();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
