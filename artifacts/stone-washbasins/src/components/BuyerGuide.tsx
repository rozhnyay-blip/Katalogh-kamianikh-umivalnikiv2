import searchContent from '../lib/searchContent.json';
import type { Locale } from '../lib/localization';
import './BuyerGuide.css';

export function BuyerGuide({ locale }: { locale: Locale }) {
  const copy = searchContent[locale];
  return (
    <section className="buyer-guide container-wide" id="vyber-umyvadla" aria-labelledby="buyer-guide-title">
      <div className="story-grid">
        <div>
          <span className="eyebrow">{copy.eyebrow}</span>
          <h2 className="display buyer-guide-title" id="buyer-guide-title">{copy.heading}</h2>
          <p className="story-copy">{copy.intro}</p>
          <div className="buyer-guide-links">
            <a href="#katalog">{copy.catalogLink}</a>
            <a href="#kontakty">{copy.contactLink}</a>
          </div>
        </div>
        <div className="buyer-guide-answers">
          {copy.questions.map(({ question, answer }) => (
            <article key={question}>
              <h3>{question}</h3>
              <p>{answer}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
