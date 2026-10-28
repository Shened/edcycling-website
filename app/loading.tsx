// Aparece logo ao mudar de página, enquanto o servidor prepara os dados.
export default function Loading() {
  return (
    <section className="view" aria-busy="true" aria-label="A carregar">
      <div className="sk sk-h" />
      <div className="sk-row"><div className="sk sk-tile" /><div className="sk sk-tile" /><div className="sk sk-tile" /><div className="sk sk-tile" /></div>
      <div className="sk sk-card" />
      <div className="sk sk-card" />
    </section>
  );
}
