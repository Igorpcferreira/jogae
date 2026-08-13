/** Crédito discreto e permanente, inclusive nas páginas públicas compartilhadas. */
export function Footer() {
  return (
    <footer className="border-t border-line bg-surface-2">
      <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-center px-4 py-4 text-center">
        <p className="text-caption font-bold uppercase tracking-[0.1em] text-ink-3">
          Desenvolvido por{" "}
          <a
            href="https://www.igordecastro.com.br"
            target="_blank"
            rel="noreferrer"
            className="text-ink transition-colors duration-[120ms] hover:text-green focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-yellow"
          >
            Igor de Castro
          </a>
        </p>
      </div>
    </footer>
  );
}
