"use client";

import { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>CityOS · Verifiable Datasets</h1>
        <p className="app-subtitle">Taipei MOENV Air Quality · Phase 1</p>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
