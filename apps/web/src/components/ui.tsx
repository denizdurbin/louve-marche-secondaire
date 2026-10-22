import type { ReactNode } from 'react';

export function Section(props: { id: string; step: string; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section id={props.id} className="section">
      <header className="section-header">
        <span className="section-step" aria-hidden="true">{props.step}</span>
        <h2>{props.title}</h2>
      </header>
      {props.intro && <p className="section-intro">{props.intro}</p>}
      {props.children}
    </section>
  );
}

export function Card(props: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`card ${props.className ?? ''}`}>
      {props.title && <h3 className="card-title">{props.title}</h3>}
      {props.children}
    </div>
  );
}

/** A headline figure with its label and an optional caption (date, source, comparison). */
export function Stat(props: { label: string; value: ReactNode; caption?: ReactNode; emphasis?: boolean }) {
  return (
    <div className={`stat ${props.emphasis ? 'stat-emphasis' : ''}`}>
      <div className="stat-label">{props.label}</div>
      <div className="stat-value">{props.value}</div>
      {props.caption && <div className="stat-caption">{props.caption}</div>}
    </div>
  );
}

/** Callout. `warning` for risks the client must see, `info` for hypotheses and method. */
export function Note(props: { tone?: 'info' | 'warning'; title?: string; children: ReactNode }) {
  return (
    <div className={`note note-${props.tone ?? 'info'}`} role={props.tone === 'warning' ? 'alert' : undefined}>
      {props.title && <strong className="note-title">{props.title}</strong>}
      <div>{props.children}</div>
    </div>
  );
}

export function Source(props: { children: ReactNode; href?: string }) {
  return (
    <p className="source">
      Source :{' '}
      {props.href ? (
        <a href={props.href} target="_blank" rel="noreferrer">
          {props.children}
        </a>
      ) : (
        props.children
      )}
    </p>
  );
}
