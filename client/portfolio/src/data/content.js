import { createText } from '../styling/text';
import { light, dark } from '../styling/theme';

const buildContent = (t) => ({
  en: {
    nav: {
      brand: { value: "portfolio", style: t.navBrand },
      links: [
        { value: "about", style: t.navLink },
        { value: "projects", style: t.navLink },
        { value: "contact", style: t.navLink },
      ],
    },
    hero: {
      name: { value: "Daniel Krouguerski", style: t.title },
      title: { value: "Professional Developer", style: t.subtitleAlt},
      subtitle: { value: "Clean, intentional design backed by problem-solving skills and an analytical mindset.", style: t.body },
      stats: [
        { label: { value: "Education", style: t.sectionLabel }, value: { value: "UBC: BSc Mathematics", style: t.small } },
        { label: { value: "Based in", style: t.sectionLabel }, value: { value: "Paris, France", style: t.small } },
        { label: { value: "Interests", style: t.sectionLabel }, value: { value: "Photography, Cycling, Exploring", style: t.small } },
        { label: { value: "Seeking", style: t.sectionLabel }, value: { value: "Full-stack & Frontend", style: t.small } },
      ],
    },
    about: {
      sectionLabel: { value: "About", style: t.sectionLabel },
      heading: { value: "I build things that go beyond good.", style: t.subtitle },
      captions: [
        'Class of 2025: UBC',
        'Tour de France 2025, Paris',
        'Kelp, Mount Battie',
        'Stanley Park, Vancouver',
        'Widgeon Lake, Pinecone Burke',
        'Semaphore Lakes, Pemberton',
        'Panorama Ridge, Golden Ears',
        'Swans, Annecy',
        'Me, Regensburg',
        'Christmas Markets, Vienna',
      ],
      paragraphs: [
        { value: "Through my background in Mathematics, I am wired to seek elegant solutions to complex problems. \
        This perspective lays the foundation for every application that I build and design.", style: t.body },
        { value: "I believe the key to a rewarding user experience lives in the details, and \
        I take pride in my acute attentiveness that takes work from good to great.",
        style: t.body },
        { value: "I'm always looking to challenge myself, whether it's with a new technology, hobby, or artistic endeavor, and \
        I'm eager to join a team that will push me as a professional.", style: t.body },
      ],
    },
    projects: {
      sectionLabel: { value: "Projects", style: t.sectionLabel },
      heading: { value: "My Projects", style: t.title },
      items: [
        { index: { value: "01", style: t.rowNum }, name: { value: "StarSync", style: t.rowText }, stack: { value: "React / Express / Spotify API", style: t.rowText }, year: { value: "2025", style: t.rowNum } },
        { index: { value: "02", style: t.rowNum }, name: { value: "Coming Soon", style: t.rowText }, stack: null, year: { value: "2026", style: t.rowNum } },
      ],
    },
    contact: {
      sectionLabel: { value: "Contact", style: t.sectionLabel },
      heading: { value: "Let's Work\nTogether.", style: t.title },
      links: [
        { label: { value: "Email", style: t.body }, href: "mailto:danielkrg11@gmail.com" },
        { label: { value: "LinkedIn", style: t.body }, href: "https://linkedin.com/in/daniel-krouguerski-72564718a" },
        { label: { value: "GitHub", style: t.body }, href: "https://github.com/danielkrg" },
        { label: { value: "Resume", style: t.body }, href: "/resume.pdf" },
      ],
    },
    footer: {
      left: { value: "Portfolio", style: t.small },
      right: { value: "2026", style: t.small },
    },
  },
  fr: {
    nav: {
      brand: { value: "Portfolio", style: t.navBrand },
      links: [
        { value: "à propos", style: t.navLink },
        { value: "projets", style: t.navLink },
        { value: "contact", style: t.navLink },
      ],
    },
    hero: {
      name: { value: "Daniel Krouguerski", style: t.title },
      title: { value: "Développeur Professionnel", style: t.subtitleAlt },
      subtitle: { value: "Un design propre et intentionnel, soutenu par une pensée analytique.", style: t.body },
      stats: [
        { label: { value: "Formation", style: t.sectionLabel }, value: { value: "UBC: BSc Mathématiques", style: t.small } },
        { label: { value: "Basé à", style: t.sectionLabel }, value: { value: "Paris, France", style: t.small } },
        { label: { value: "Intérêts", style: t.sectionLabel }, value: { value: "Photographie, Cyclisme, Exploration", style: t.small } },
        { label: { value: "Recherche", style: t.sectionLabel }, value: { value: "Full-stack & Frontend", style: t.small } },
      ],
    },
    about: {
      sectionLabel: { value: "À Propos", style: t.sectionLabel },
      heading: { value: "Je construis des choses qui dépassent les attentes", style: t.subtitle },
      captions: [
        'Promotion 2025 : UBC',
        'Tour de France 2025, Paris',
        'Kelp, Mont Battie',
        'Parc Stanley, Vancouver',
        'Lac Widgeon, Pinecone Burke',
        'Lacs Semaphore, Pemberton',
        'Crête Panorama, Golden Ears',
        'Cygnes, Annecy',
        'Moi, Regensburg',
        'Marchés de Noël, Vienne',
      ],
      paragraphs: [
        { value: "Ma formation en mathématiques m'a appris à chercher des solutions élégantes à des problèmes complexes. Cette perspective constitue le fondement de chaque application que je conçois et développe.", style: t.body },
        { value: "Je crois que la clé d'une expérience utilisateur enrichissante réside dans les détails, et je tire fierté d'une attention méticuleuse qui élève mon travail de bien à excellent.", style: t.body },
        { value: "Je cherche constamment à me dépasser, que ce soit avec une nouvelle technologie, un loisir ou une démarche artistique, et j'aspire à rejoindre une équipe qui saura me faire grandir en tant que professionnel.", style: t.body },
      ],
    },
    projects: {
      sectionLabel: { value: "Projets", style: t.sectionLabel },
      heading: { value: "Mes Projets", style: t.title },
      items: [
        { index: { value: "01", style: t.rowNum }, name: { value: "StarSync", style: t.rowText }, stack: { value: "React / Express / Spotify API", style: t.rowText }, year: { value: "2025", style: t.rowNum } },
        { index: { value: "02", style: t.rowNum }, name: { value: "À Venir", style: t.rowText }, stack: null, year: { value: "2026", style: t.rowNum } },
      ],
    },
    contact: {
      sectionLabel: { value: "Contact", style: t.sectionLabel },
      heading: { value: "Travaillons\nEnsemble.", style: t.title },
      links: [
        { label: { value: "Email", style: t.body }, href: "mailto:danielkrg11@gmail.com" },
        { label: { value: "LinkedIn", style: t.body }, href: "https://linkedin.com/in/daniel-krouguerski-72564718a" },
        { label: { value: "GitHub", style: t.body }, href: "https://github.com/danielkrg" },
        { label: { value: "CV", style: t.body }, href: "/resume.pdf" },
      ],
    },
    footer: {
      left: { value: "Portfolio", style: t.small },
      right: { value: "2026", style: t.small },
    },
  },
});

export const getContent = (isDark = false) => {
  const t = createText(isDark ? dark : light);
  return buildContent(t);
};