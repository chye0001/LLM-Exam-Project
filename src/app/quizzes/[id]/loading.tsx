// The quiz id is only known at request time, so Cache Components needs this
// fallback to show while the page loads the quiz.
export default function QuizLoading() {
  return <p className="text-muted">Loading the quiz...</p>;
}
