import { Link } from 'react-router'
import './home-page.css'

function DropIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
      <path d="M12 3c-4 5-6.5 8.4-6.5 11.4a6.5 6.5 0 0 0 13 0C18.5 11.4 16 8 12 3z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.1" />
    </svg>
  )
}

function LeafIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
      <path d="M19.5 4.5c-7.8 0-14 4.9-14 12.2 0 .9.1 1.8.3 2.6C14.6 18.2 19.5 12.4 19.5 4.5z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.1" />
      <path d="M6.2 18.9c2.8-2.9 5.8-6.6 7.6-10.4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.1" />
    </svg>
  )
}

function HexagonIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
      <path d="M12 2.5 20 7v10l-8 4.5-8-4.5V7z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.1" />
    </svg>
  )
}

function DotsIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" height="20" viewBox="0 0 24 24" width="20">
      <circle cx="6" cy="13" r="1.5" />
      <circle cx="13" cy="7" r="1.5" />
      <circle cx="19" cy="15" r="1.5" />
      <circle cx="10" cy="18" r="1.5" />
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" height="20" viewBox="0 0 24 24" width="20">
      <path d="M12 2 14 10 22 12 14 14 12 22 10 14 2 12 10 10Z" />
    </svg>
  )
}

const applications = [
  { icon: DropIcon, label: 'Water' },
  { icon: LeafIcon, label: 'Rubber' },
  { icon: HexagonIcon, label: 'Ceramics' },
  { icon: DotsIcon, label: 'Rare Earth' },
  { icon: SparkIcon, label: 'Emerging Applications' },
]

export function HomePage() {
  return (
    <section aria-label="MicronHub" className="home-page">
      <div aria-label="Primary navigation" className="home-page__header">
        <a aria-label="MicronHub home" className="home-page__wordmark" href="/">MicronHub</a>
        <nav className="home-page__navigation">
          <a href="/technology">Technology</a>
          <a href="/applications">Applications</a>
          <a href="/company">About</a>
        </nav>
      </div>

      <div aria-hidden="true" className="home-page__material">
        <div className="home-page__particles">
          <span className="particle particle--fragment particle--fragment-a" />
          <span className="particle particle--fragment particle--fragment-b" />
          <span className="particle particle--medium particle--medium-a" />
          <span className="particle particle--medium particle--medium-b" />
          <span className="particle particle--medium particle--medium-c" />
          <span className="particle particle--dust particle--dust-a" />
          <span className="particle particle--dust particle--dust-b" />
          <span className="particle particle--dust particle--dust-c" />
          <span className="particle particle--dust particle--dust-d" />
          <span className="particle particle--dust particle--dust-e" />
        </div>
        <div className="home-page__material-image">
          <img alt="" src="/assets/home-material.png" />
        </div>
      </div>

      <div className="home-page__copy">
        <span aria-hidden="true" className="home-page__rule" />
        <h1>ONE TECHNOLOGY<br />PLATFORM. MANY ENGINEERED<br />OUTCOMES.</h1>
        <p>We engineer the particle state the next process step requires.</p>
      </div>

      <nav aria-label="Applications" className="home-page__applications">
        {applications.map(({ icon: Icon, label }) => (
          <Link className="home-page__application" key={label} to="/applications">
            <Icon />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      <div aria-hidden="true" className="home-page__scroll">
        <span />
        <b>Scroll</b>
        <i />
      </div>
    </section>
  )
}
