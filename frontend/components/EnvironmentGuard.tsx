"use client";

import { useEffect, useState } from "react";
import {
  OPEN_DATA_REGISTRY_ADDRESS,
  ATTESTATION_REGISTRY_ADDRESS,
  POLICY_DATA_VIEW_ADDRESS,
} from "../lib/contracts";

const requiredEnv = [
  { key: "NEXT_PUBLIC_OPEN_DATA_REGISTRY", value: OPEN_DATA_REGISTRY_ADDRESS },
  { key: "NEXT_PUBLIC_ATTESTATION_REGISTRY", value: ATTESTATION_REGISTRY_ADDRESS },
  { key: "NEXT_PUBLIC_POLICY_DATA_VIEW", value: POLICY_DATA_VIEW_ADDRESS },
];

export function EnvironmentGuard({ children }: { children: React.ReactNode }) {
  const [missing, setMissing] = useState<string[]>([]);

  useEffect(() => {
    const absent = requiredEnv
      .filter(({ value }) => !value)
      .map(({ key }) => key);
    setMissing(absent);
  }, []);

  if (missing.length > 0) {
    return (
      <section className="card">
        <header className="card-header">
          <h2>Configuration Required</h2>
        </header>
        <p className="error">
          Missing environment variables: {missing.join(", ")}. Update `frontend/.env.local` and restart the dev server.
        </p>
      </section>
    );
  }

  return <>{children}</>;
}
