import { Bars3Icon, XMarkIcon, MoonIcon, SunIcon } from "@heroicons/react/24/outline";

export default function NavBar({
  theme,
  c,
  mobile,
  starSyncHovered,
  scrollTo,
  toggleLanguage,
  isFrench,
  isDark,
  setIsDark,
  menuOpen,
  setMenuOpen,
}) {
  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 border-b ${theme.border} backdrop-blur-sm transition-colors duration-500
        ${starSyncHovered ? "bg-black/30" : theme.navBg}`}
    >
      <div className="max-w-7xl mx-auto px-10">
        {/* Top row — always visible */}
        <div className="flex justify-between items-center py-8">
          {/* Brand */}
          <button
            onClick={() => scrollTo(c.nav.brand.value)}
            className={`${c.nav.brand.style} ${theme.textHover} cursor-pointer`}
          >
            {c.nav.brand.value}
          </button>

          {mobile ? (
            /* Mobile — burger on right */
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className={`${theme.textSecondary} ${theme.textHover} w-10 h-10 cursor-pointer transition-colors duration-200`}
            >
              {menuOpen ? (
                <XMarkIcon className="h-5 w-5" />
              ) : (
                <Bars3Icon className="h-5 w-5" />
              )}
            </button>
          ) : (
            /* Desktop */
            <div className="flex items-center justify-between w-110">
              <div className="flex items-center gap-10">
                <button
                  onClick={toggleLanguage}
                  className={`text-xs tracking-widest font-medium transition-colors duration-200 cursor-pointer
                    ${theme.textSecondary} ${theme.textHover}`}
                >
                  {isFrench ? "FR" : "EN"}
                </button>
                <button
                  onClick={() => setIsDark((prev) => !prev)}
                  className={`transition-colors duration-200 cursor-pointer ${theme.textSecondary} ${theme.textHover}`}
                >
                  {isDark ? (
                    <MoonIcon className="h-5 w-5" />
                  ) : (
                    <SunIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              <div className="flex items-center gap-8">
                {c.nav.links.map((link) => (
                  <button
                    key={link.value}
                    onClick={() => scrollTo(link.value)}
                    className={`${link.style} ${theme.textHover} transition-colors duration-200 cursor-pointer`}
                  >
                    {link.value}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mobile expanding menu — grows the nav itself, no separate panel */}
        {mobile && (
          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-in-out
              ${menuOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
          >
            <div className="overflow-hidden">
              <div className="flex items-center justify-between pb-8 pt-2">
                <div className="flex flex-col items-left gap-6">
                  {c.nav.links.map((link, i) => (
                    <button
                      key={link.value}
                      onClick={() => {
                        scrollTo(link.value);
                        setMenuOpen(false);
                      }}
                      className={`${link.style} ${theme.textHover} text-left cursor-pointer
                        transition-all duration-300 ease-out whitespace-nowrap
                        ${menuOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"}`}
                    >
                      {link.value}
                    </button>
                  ))}
                </div>

                <div
                  className={`flex flex-col items-right gap-13 mr-5 transition-all duration-300 ease-out
                    ${menuOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"}`}
                >
                  <button
                    onClick={toggleLanguage}
                    className={`text-xs tracking-widest font-medium transition-colors duration-200 cursor-pointer
                      ${theme.textSecondary} ${theme.textHover}`}
                  >
                    {isFrench ? "FR" : "EN"}
                  </button>
                  <button
                    onClick={() => setIsDark((prev) => !prev)}
                    className={`transition-colors duration-200 cursor-pointer ${theme.textSecondary} ${theme.textHover}`}
                  >
                    {isDark ? (
                      <MoonIcon className="h-5 w-5" />
                    ) : (
                      <SunIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}