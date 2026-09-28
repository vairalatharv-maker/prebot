import { ArrowUpRight, Sparkles } from 'lucide-react';
import '../styles/roadmap.css';

const details = {
  'Skill Assessment': ['Know your strengths. Find your next focus.', 'A guided assessment will help you make your preparation count.'],
  'Mock Interview': ['Practice makes confident.', 'Build interview confidence with structured practice sessions.'],
  'Preparation Roadmap': ['A plan that moves with you.', 'Your personalized preparation journey will take shape here.'],
};

export default function Placeholder({ page }) {
  const [headline, supporting] = details[page];

  if (page === 'Preparation Roadmap') {
    return <div className="page-wrap roadmap-page">
      <header className="page-topline roadmap-topline">
        <div className="eyebrow"><Sparkles size={14} /> PREPBOT · YOUR PLACEMENT COACH</div>
      </header>

      <section className="roadmap-hero">
        <div className="roadmap-copy">
          <span className="roadmap-kicker">YOUR NEXT CHAPTER STARTS HERE</span>
          <h2>{headline}</h2>
          <p>{supporting}</p>
          <div className="roadmap-progress"><span /><span /><span /><span /></div>
        </div>

        <div className="roadmap-art" aria-hidden="true">
          <div className="roadmap-orbit orbit-one" />
          <div className="roadmap-orbit orbit-two" />
          <div className="roadmap-core"><Sparkles size={24} /></div>
        </div>
      </section>

      <section className="roadmap-grid">
        <article className="roadmap-card roadmap-card-ghost">
          <span className="roadmap-icon"><Sparkles size={18} /></span>
          <div className="roadmap-skeleton skeleton-wide" />
          <div className="roadmap-skeleton skeleton-mid" />
          <div className="roadmap-skeleton skeleton-short" />
        </article>

        <article className="roadmap-card roadmap-note">
          <span className="mini-label">A NOTE FROM PREPBOT</span>
          <h3>Small steps add up.</h3>
          <p>Your learning space is being prepared. Check back soon to continue building momentum.</p>
          <div className="subtle-rule" />
        </article>
      </section>
    </div>;
  }

  return <div className="page-wrap"><header className="page-topline"><div><div className="eyebrow"><Sparkles size={14} /> PREPBOT · YOUR PLACEMENT COACH</div><h1>{page}</h1></div><button className="quiet-button">Coming soon <ArrowUpRight size={15} /></button></header><section className="welcome-card"><div className="welcome-copy"><span className="welcome-kicker">YOUR NEXT CHAPTER STARTS HERE</span><h2>{headline}</h2><p>{supporting}</p><div className="welcome-progress"><span /><span /><span /><span /></div></div><div className="welcome-art" aria-hidden="true"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-core"><Sparkles size={28} /></div></div></section><section className="placeholder-grid"><article className="placeholder-card"><span className="placeholder-icon"><Sparkles size={18} /></span><div className="skeleton skeleton-wide"/><div className="skeleton skeleton-mid"/><div className="skeleton skeleton-short"/></article><article className="placeholder-card subtle-card"><span className="mini-label">A NOTE FROM PREPBOT</span><h3>Small steps add up.</h3><p>Your learning space is being prepared. Check back soon to continue building momentum.</p><div className="subtle-rule"/></article></section></div>;
}
