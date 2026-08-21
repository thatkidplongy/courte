import { PAGE_GUTTER } from '@/consts';
import { cn } from '@/lib/utils';

export type LegalSection = {
  heading: string;
  paragraphs: readonly string[];
};

type LegalLayoutProps = {
  title: string;
  summary: string;
  /** Written out, e.g. "16 August 2026" — a reader checking a policy wants the date it changed. */
  updated: string;
  sections: readonly LegalSection[];
};

/**
 * The shell both policy pages sit in. They share a shape and nothing else, which is exactly the
 * case for a template: the pages stay pure content, so amending a clause never means touching
 * layout, and the two can never drift into looking like documents from different products.
 *
 * The measure is capped well below the page gutter. Legal prose is the one thing on this site
 * read line after line, and a 1328px line is not read, it is skimmed and misremembered.
 */
export const LegalLayout = ({ title, summary, updated, sections }: LegalLayoutProps) => (
  <main className={cn(PAGE_GUTTER, 'py-12 lg:py-16')}>
    <div className="max-w-2xl">
      <h1 className="text-4xl font-extrabold tracking-tight">{title}</h1>
      <p className="text-muted-foreground mt-4 text-[15px] leading-relaxed">{summary}</p>
      <p className="text-muted-foreground mt-3 text-[12.5px] font-medium">Last updated {updated}</p>

      <div className="mt-10 flex flex-col gap-9">
        {sections.map(section => (
          <section key={section.heading}>
            <h2 className="text-lg font-extrabold tracking-tight">{section.heading}</h2>
            <div className="mt-3 flex flex-col gap-3 text-[14.5px] leading-relaxed">
              {section.paragraphs.map(paragraph => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  </main>
);
