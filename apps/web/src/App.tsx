import { useEffect, useState } from "react";
import { healthSchema, type Health } from "@rengas/shared";

export function App() {
  const [health, setHealth] = useState<Health | undefined>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((response) => response.json())
      .then((body) => setHealth(healthSchema.parse(body)))
      .catch(() => setFailed(true));
  }, []);

  return (
    <main>
      <h1>Rengas Online Contactor</h1>
      <p role="status">
        {failed
          ? "Server unreachable"
          : health
            ? `Server status: ${health.status}`
            : "Checking server…"}
      </p>
    </main>
  );
}
