import type { Question } from "../../../relayer/src/types";

/** The seller's public answers; only answered questions reach the app, so every row has an answer. */
export function Questions({ questions }: { questions: Question[] }) {
  return (
    <section aria-labelledby="qa-title">
      <h2 id="qa-title">Questions and answers</h2>
      {questions.length === 0 ? (
        <p className="muted">No questions answered yet.</p>
      ) : (
        <ul>
          {questions.map((q) => (
            <li key={q.id}>
              <p>{q.question}</p>
              <p className="muted">{q.answer}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
