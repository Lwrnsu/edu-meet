/*
  Classes   (route /classes)  — where "Back to Classes" goes.
  Lists the logged-in user's classes from the Classes module tables
  (students: classes they're in; faculty: classes they teach; deans and
  program chairs: their department's / program's classes).
*/
import { Link } from 'react-router'
import { FbPage } from './FbLayout'
import Icon from '../components/Icon'
import { ApiProblem, EmptyState } from '../components/Common'
import { useMyClasses } from '../hooks/useMyClasses'

export default function ClassesPage() {
  const result = useMyClasses()

  return (
    <FbPage>
      <div className="fb-pagehead">
        <h1>Classes</h1>
        {result?.response && result.body.me?.name ? <p>Welcome, {result.body.me.name}</p> : null}
      </div>
      {!result ? (
        <div className="fb-loading">Loading…</div>
      ) : !result.response ? (
        <section className="fb-panel"><ApiProblem result={result} /></section>
      ) : result.body.classes.length === 0 ? (
        <section className="fb-panel">
          <EmptyState icon="book" title="No classes yet" text="Classes you teach or are enrolled in will show up here." />
        </section>
      ) : (
        <div className="fb-class-grid">
          {result.body.classes.map((c) => (
            <Link key={c.id} to={`/classes/${c.id}/feed`} className="fb-class-card">
              <div className="fb-class-card__top">
                <h2>{c.name}</h2>
                <span>{[c.id, c.subject_code].filter(Boolean).join(' - ')}</span>
              </div>
              <div className="fb-class-card__body">
                <span><Icon name="calendar" size={16} />{c.schedule || 'Schedule TBA'}</span>
                <span><Icon name="book" size={16} />{c.room ? `Room ${c.room}` : 'Room TBA'}</span>
                {c.term ? <small>{c.term}</small> : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </FbPage>
  )
}
