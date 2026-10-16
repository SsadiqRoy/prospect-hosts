"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="login-shell">
      <section className="login-card">
        <h1>Unable to load your workspace</h1>
        <p>
          Please try again. If this continues, check your connection or contact
          your administrator.
        </p>
        <button onClick={reset}>Try again</button>
      </section>
    </main>
  );
}
