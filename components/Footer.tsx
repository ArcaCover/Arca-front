const RESOURCES = ["Terms of Service", "Privacy Policy", "FAQ"];
const COMPANY = ["Partners", "Blog", "Careers"];

export default function Footer() {
  return (
    <footer className="bg-marino px-6 pb-10 pt-16">
      <div className="mx-auto grid max-w-5xl gap-10 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <h3 className="font-heading text-xs font-medium uppercase tracking-widest text-white/50">
            Contact
          </h3>
          {/* TODO: replace placeholder email before launch */}
          <p className="mt-4 text-sm text-white/70">
            <a href="mailto:hello@arca.com" className="hover:text-white">
              hello@arca.com
            </a>
          </p>
          <p className="mt-2 text-sm text-white/70">
            Questions? We&rsquo;d love to hear from you.
          </p>
        </div>
        <div>
          <h3 className="font-heading text-xs font-medium uppercase tracking-widest text-white/50">
            Resources
          </h3>
          <ul className="mt-4 space-y-2">
            {RESOURCES.map((link) => (
              <li key={link}>
                <a href="#" className="text-sm text-white/75 transition-colors hover:text-white">
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-heading text-xs font-medium uppercase tracking-widest text-white/50">
            Company
          </h3>
          <ul className="mt-4 space-y-2">
            {COMPANY.map((link) => (
              <li key={link}>
                <a href="#" className="text-sm text-white/75 transition-colors hover:text-white">
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-heading text-xs font-medium uppercase tracking-widest text-white/50">
            Follow us
          </h3>
          <div className="mt-4 flex gap-4">
            <a href="#" aria-label="Arca on LinkedIn" className="text-white/70 hover:text-white">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="currentColor">
                <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h4V23h-4V8zm7.5 0h3.8v2.05h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V23h-4v-7.9c0-1.88-.03-4.3-2.62-4.3-2.62 0-3.02 2.05-3.02 4.17V23H8V8z" />
              </svg>
            </a>
            <a href="#" aria-label="Arca on X" className="text-white/70 hover:text-white">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="currentColor">
                <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-14 max-w-5xl border-t border-white/10 pt-8">
        <p className="text-center text-sm text-white/50">
          &copy; 2026 Arca. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
