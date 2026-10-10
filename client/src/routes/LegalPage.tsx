import { useDocumentTitle } from './useDocumentTitle';

interface LegalPageProps {
  title: string;
  updated: string;
  sections: Array<{ heading: string; body: string[] }>;
}

export function LegalPage({ title, updated, sections }: LegalPageProps) {
  useDocumentTitle(title);
  return (
    <div className="page-x container-wide grid gap-12 pt-14 pb-24 md:pt-20 lg:grid-cols-12">
      <header className="lg:col-span-4">
        <h1 className="font-serif text-h1">{title}</h1>
        <p className="mt-4 text-small text-faint">Last updated {updated}</p>
      </header>
      <div className="lg:col-span-7 lg:col-start-6">
        {sections.map((section) => (
          <section key={section.heading} className="border-t border-line py-8 first:border-t-2 first:border-ink">
            <h2 className="font-serif text-[1.75rem] leading-tight">{section.heading}</h2>
            <div className="measure mt-4 flex flex-col gap-4 text-muted">
              {section.body.map((paragraph) => (
                <p key={paragraph.slice(0, 32)}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
