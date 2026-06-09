export function BrandPanel() {
  return (
    <section className="brand-panel" aria-label="Resumen de la plataforma">
      <div className="brand-header">
        <img src="./logo-img.png" alt="Logo JEPKOM" />
      </div>

      <div className="brand-copy">
        <h1>Construido para equipos que operan con precisión</h1>
        <p className="intro">Espacio de trabajo para operaciones, finanzas y personas. Inicia sesión para continuar donde lo dejaste.</p>

        <figure className="quote">
          <blockquote>"Confiabe, rápido, y exactamente donde tu equipo lo necesita. Compren porfavor."</blockquote>
          <figcaption>-Juancito, JEPKOM</figcaption>
        </figure>
      </div>

      <p className="brand-footnote">© {new Date().getFullYear()} JEPKOM S&P. Todos los derechos reservados.</p>
    </section>
  )
}
