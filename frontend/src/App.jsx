import { useState } from "react";
import "./App.css";

export default function App() {
  const [url, setUrl] = useState("");
  const [customAlias, setCustomAlias] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          customAlias: customAlias || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError("Could not reach the server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
    <h1>URL Shortener</h1>
    <form onSubmit={handleSubmit}>
    <input
    type="url"
    placeholder="https://example.com/very/long/link"
    value={url}
    onChange={(e) => setUrl(e.target.value)}
    required
    />
    <input
    type="text"
    placeholder="custom alias (optional)"
    value={customAlias}
    onChange={(e) => setCustomAlias(e.target.value)}
    />
    <button type="submit" disabled={loading}>
    {loading ? "Shortening..." : "Shorten"}
    </button>
    </form>

    {error && <p className="error">{error}</p>}

    {result && (
      <div className="result">
      <a href={result.shortUrl} target="_blank" rel="noreferrer">
      {result.shortUrl}
      </a>
      <p className="muted">→ {result.longUrl}</p>
      </div>
    )}
    </div>
  );
}
