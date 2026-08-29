import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useMobile from '@shared/hooks/useMobile';
import ImageCarousel from '../components/ImageCarousel';
import NavBar from "../components/NavBar";
import { getContent } from '../data/content';
import { light, dark } from '../styling/theme';

export default function Home({ isDark, setIsDark, isFrench, setIsFrench }) {
  const navigate = useNavigate();
  const [starSyncHovered, setStarSyncHovered] = useState(false);
  const mobile = useMobile();
  const [menuOpen, setMenuOpen] = useState(false);

  const theme = isDark ? dark : light;
  const content = getContent(isDark);
  const c = isFrench ? content.fr : content.en;
  const [translating, setTranslating] = useState(false);

  const toggleLanguage = () => {
    setTranslating(true);
    setTimeout(() => {
      setIsFrench((prev) => !prev);
      setTranslating(false);
    }, 300);
  };

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      className={`relative min-h-screen transition-colors duration-500 ${theme.bg}`}
      style={{ color: starSyncHovered ? "rgba(255,255,255,0.5)" : undefined }}
    >

      {/* Gradient overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(to top, #500724, #1e1b4b)",
          opacity: starSyncHovered ? 1 : 0,
          transition: "opacity 500ms ease",
          zIndex: 0,
        }}
      />

      <div className="relative max-w-7xl mx-auto px-5 animate-fadeInMed"
          style={{
            zIndex: 1,
            opacity: translating ? 0 : 1,
            transition: "opacity 300ms ease",
          }}>

        {/* Nav */}
        <NavBar
          theme={theme}
          c={c}
          mobile={mobile}
          starSyncHovered={starSyncHovered}
          scrollTo={scrollTo}
          toggleLanguage={toggleLanguage}
          isFrench={isFrench}
          isDark={isDark}
          setIsDark={setIsDark}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
        />

        {/* Hero */}
        <section id="portfolio" className={`pb-15 pt-34 flex justify-between ${mobile ? "flex-col gap-10" : ""}`}>
          <div>
            <h1 className="pb-6">
              <span className={c.hero.name.style.replace('text-7xl', 'text-6xl md:text-7xl')}>{c.hero.name.value}</span><br />
              <span className={c.hero.title.style}>{c.hero.title.value}</span><br />
            </h1>
            <p className={`${c.hero.subtitle.style} mt-6`}>
              {c.hero.subtitle.value}
            </p>
          </div>
          <div className={`${mobile ? "grid grid-cols-2 gap-x-8 gap-y-6" : "flex flex-col gap-6 w-72"} pt-1`}>
            {c.hero.stats.map(({ label, value }) => (
              <div key={label.value} className={`border-l-2 ${theme.borderAccent} pl-4`}>
                <p className={`${label.style} mb-1`}>{label.value}</p>
                <p className={value.style}>{value.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* About */}
        <section id="about" className={`py-10 border-t ${theme.border} transition-colors duration-500`}>
          <p className={`${c.about.sectionLabel.style} mb-12`}>{c.about.sectionLabel.value}</p>
          <div className={`flex justify-between gap-15 ${mobile ? "flex-col" : ""}`}>
            <div className="space-y-5 tracking-wide">
              <h2 className={`${c.about.heading.style} pb-5`}>{c.about.heading.value}</h2>
              {c.about.paragraphs.map((p, i) => (
                <p key={i} className={`${p.style} pb-5`}>{p.value}</p>
              ))}
            </div>
            <ImageCarousel dimmed={starSyncHovered} isDark={isDark} captions={c.about.captions} />
          </div>
        </section>

        {/* Projects */}
        <section id="projects" className={`pb-30 pt-10 border-t ${theme.border} transition-colors duration-500`}>
          <p className={`${c.projects.sectionLabel.style} mb-12`}>{c.projects.sectionLabel.value}</p>
          <p className={`${c.projects.heading.style} mb-5`}>{c.projects.heading.value}</p>
            {mobile ? (<p className={`${c.projects.mobileHelper.style} italic mb-20`}>{c.projects.mobileHelper.value}</p>) 
              : <p className='mb-20'></p>
            }
          <div className="flex flex-col">
            {c.projects.items.map((item, i) => (
              <div
                key={item.index.value}
                className={`flex items-center gap-8 py-6 w-full border-t ${theme.border}
                           transition-colors duration-200
                           ${mobile ? "text-sm" : "text-m"}
                           ${i === 0 ? "group" : ""}`}
                onMouseEnter={i === 0 ? () => setStarSyncHovered(true) : undefined}
                onMouseLeave={i === 0 ? () => setStarSyncHovered(false) : undefined}
                data-cursor={i === 0 ? "app" : undefined}
                onClick={i === 0 ? () => navigate("/apps/starsync") : undefined}
              >
                <span className={`${item.index.style} group-hover:text-white transition-colors duration-200 pl-5`}>
                  {item.index.value}
                </span>
                <div className="flex items-center justify-between flex-1 group-hover:text-white transition-colors duration-200 pr-5">
                  <p className={`${item.name.style} group-hover:text-white transition-colors duration-200`}>
                    {item.name.value}
                  </p>
                  {item.stack && <p className={`${item.name.style} group-hover:text-white transition-colors duration-200`}>
                    {item.stack.value}
                  </p>}
                  <p className={`${item.name.style} group-hover:text-white transition-colors duration-200`}>
                    {item.year.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className={`pb-30 pt-10 border-t ${theme.border} transition-colors duration-500`}>
          <p className={`${c.contact.sectionLabel.style} mb-12`}>{c.contact.sectionLabel.value}</p>
          <div className={`grid ${mobile ? "" : "grid-cols-2"} gap-16`}>
            <h2 className={`${c.contact.heading.style} leading-tight`}>
              {c.contact.heading.value.split("\n").map((line, i) => (
                <span key={i}>{line}{i === 0 && <br />}</span>
              ))}
            </h2>
            <div className="flex flex-col">
              {c.contact.links.map(({ label, href }) => (
                <a
                  key={label.value}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex items-center justify-between py-4 border-t ${theme.border} last:border-b group pl-2 pr-2`}
                >
                  <span className={`${label.style} ${theme.groupTextHover} transition-colors duration-200`}>
                    {label.value}
                  </span>
                  <span className={`text-sm ${theme.textSecondary} ${theme.groupTextHover} group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-200`}>
                    ↗
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className={`flex justify-between items-center py-8 border-t ${theme.border}`}>
          <span className={c.footer.left.style}>{c.footer.left.value}</span>
          <span className={c.footer.right.style}>{c.footer.right.value}</span>
        </footer>

      </div>
    </div>
  );
}