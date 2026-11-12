// Route shell; the buyer's enter-limit flow lands in M1-09.
export function Join({ id }: { id: number }) {
  return (
    <main className="screen">
      <h1 className="headline">Deal #{id}</h1>
      <p className="muted">Buyer view: enter the most you'd pay.</p>
    </main>
  );
}
