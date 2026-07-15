import type { Metadata } from "next";
import { Inter, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import "@/styles/globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LangToggle } from "@/components/LangToggle";
import { BrandMark } from "@/components/BrandMark";
import { MobileNav } from "@/components/MobileNav";
import { getDict } from "@/lib/i18n";
import {
  LANGS,
  LANG_TAG,
  SITE_URL,
  isLang,
  langAlternates,
  localePath,
  type Lang,
} from "@/lib/lang";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});
const serif = Source_Serif_4({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif",
  weight: ["400", "600"],
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  weight: ["400", "500"],
});

/**
 * The language segment. English lives at the bare path through the rewrites in
 * next.config.js, while French lives under /fr. Anything that is not exactly
 * 'en' or 'fr' returns 404 instead of rendering under an invalid language.
 */
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}
export const dynamicParams = false;

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const lang: Lang = isLang(params.lang) ? params.lang : "en";
  const t = getDict(lang);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t.meta.titleDefault, template: t.meta.titleTemplate },
    description: t.meta.description,
    alternates: langAlternates(lang, "/"),
    openGraph: {
      type: "website",
      locale: lang === "fr" ? "fr_CA" : "en_CA",
      alternateLocale: lang === "fr" ? "en_CA" : "fr_CA",
      siteName: "MétaCan",
      title: t.meta.titleDefault,
      description: t.meta.description,
    },
  };
}

export default async function RootLayout(props: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const params = await props.params;

  const { children } = props;

  // dynamicParams = false already 404s unknown segments; this guard keeps the
  // type honest and fails loudly if that ever changes.
  if (!isLang(params.lang)) notFound();
  const lang: Lang = params.lang;
  const t = getDict(lang);
  const p = (path: string) => localePath(lang, path);

  // Two tiers, on purpose. The site is a TOOL first: the cohort builder (the
  // home page), the Landscape and the API are what a meta-researcher came for.
  // The project's account of itself (the screen, the findings, the about page)
  // is kept in full but demoted to a labelled secondary group.
  const NAV = [
    { href: p("/"), label: t.nav.cohort },
    { href: p("/recent"), label: t.nav.recent },
    { href: p("/landscape"), label: t.nav.landscape },
    { href: p("/api-docs"), label: t.nav.api },
  ];
  const NAV_SECONDARY = [
    { href: p("/screen"), label: t.nav.screen },
    { href: p("/findings"), label: t.nav.findings },
    { href: p("/about"), label: t.nav.about },
  ];

  return (
    // lang is per request, from the URL, so screen readers pick the right
    // voice and a shared French link announces itself in French.
    <html
      lang={LANG_TAG[lang]}
      suppressHydrationWarning
      className={`${inter.variable} ${serif.variable} ${mono.variable}`}
    >
      <body>
        <ThemeProvider>
          <a className="skip-link" href="#main-content">
            {lang === "fr" ? "Aller au contenu principal" : "Skip to main content"}
          </a>
          <header
            className="sticky top-0 z-40 border-b"
            style={{ background: "var(--surface)" }}
          >
            <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-3 md:gap-6">
              <Link
                href={p("/")}
                aria-label="MétaCan"
                className="flex shrink-0 items-center gap-2"
              >
                <BrandMark className="h-8 w-8" />
                <span className="font-serif text-xl font-semibold tracking-tight">
                  MétaCan
                </span>
              </Link>
              <MobileNav
                primary={NAV}
                secondary={NAV_SECONDARY}
                howBuilt={t.nav.howBuilt}
                menuLabel={t.nav.menu}
                closeLabel={t.nav.close}
                navigationLabel={t.nav.navigation}
                lang={lang}
                themeLabel={t.common.toggleTheme}
              />
              <nav
                aria-label={t.nav.navigation}
                className="hidden flex-1 flex-wrap items-baseline gap-4 text-sm md:flex"
                style={{ color: "var(--ink-3)" }}
              >
                {NAV.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    className="font-medium hover:text-[var(--mc)]"
                  >
                    {n.label}
                  </Link>
                ))}
                <span
                  className="hidden items-baseline gap-3 text-xs md:inline-flex"
                  style={{ color: "var(--ink-5)" }}
                >
                  <span>{t.nav.howBuilt}</span>
                  {NAV_SECONDARY.map((n) => (
                    <Link
                      key={n.href}
                      href={n.href}
                      className="hover:text-[var(--mc)]"
                    >
                      {n.label}
                    </Link>
                  ))}
                </span>
              </nav>
              {/* useSearchParams inside needs a Suspense boundary on statically rendered pages. */}
              <div className="hidden md:block">
                <Suspense fallback={null}>
                  <LangToggle lang={lang} />
                </Suspense>
              </div>
              <div className="hidden md:block">
                <ThemeToggle label={t.common.toggleTheme} />
              </div>
            </div>
          </header>

          <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl px-5 py-8">
            {children}
          </main>

          <footer
            className="mt-16 border-t py-8"
            style={{ background: "var(--surface-2)" }}
          >
            <div
              className="mx-auto max-w-7xl px-5 text-sm"
              style={{ color: "var(--ink-4)" }}
            >
              <p className="mb-2">{t.footer.line1}</p>
              <p>{t.footer.line2}</p>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
