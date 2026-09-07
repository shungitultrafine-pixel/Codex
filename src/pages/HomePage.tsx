import './home-page.css'

export function HomePage() {
  return (
    <section aria-label="MicronHub" className="home-page">
      <div aria-label="Primary navigation" className="home-page__header">
        <a aria-label="MicronHub home" className="home-page__wordmark" href="/">MicronHub</a>
        <nav className="home-page__navigation">
          <a href="/technology">Technology</a>
          <a href="/applications">Applications</a>
          <a href="/company">About</a>
          <span aria-hidden="true" className="home-page__menu"><i /><i /></span>
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
        <a href="/water">Water</a>
        <a href="/applications">Rubber</a>
        <a href="/applications">Ceramics</a>
        <a href="/applications">Rare Earth</a>
        <a href="/applications">Emerging Applications</a>
      </nav>

      <div aria-hidden="true" className="home-page__scroll">
        <span />
        <b>Scroll</b>
        <i />
      </div>
    </section>
  )
}
