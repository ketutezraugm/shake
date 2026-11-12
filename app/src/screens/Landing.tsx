import { navigate } from "../routes";

export function Landing() {
  return (
    <main className="screen">
      <h1 className="headline">Shake on it. Nobody sees.</h1>
      <p className="muted">Your number stays under the cloth. Even we can't lift it.</p>

      <ol className="steps">
        <li>You set the lowest price you'd take. The buyer sets the most they'd pay.</li>
        <li>Sealed code compares them. Neither of you sees the other's number.</li>
        <li>If they meet, the deal closes at one price in between. If not, both see only "No deal".</li>
      </ol>

      <button className="primary" onClick={() => navigate("/new")}>
        Sell something
      </button>
    </main>
  );
}
