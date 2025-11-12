"use client";

import { useState } from "react";

interface Props {
  programName: string;
  defaultAutoApprove?: boolean;
}

export function AutomationControls({ programName, defaultAutoApprove = true }: Props) {
  const [autoApprove, setAutoApprove] = useState(defaultAutoApprove);
  const [status, setStatus] = useState<string | null>(null);

  const toggleAutoApprove = () => {
    setAutoApprove((prev) => !prev);
    setStatus(null);
  };

  const handleManualPayout = () => {
    setStatus(`Manual payout for ${programName} queued (demo)`);
  };

  return (
    <div className="automation-controls">
      <button className={`control-button ${autoApprove ? "active" : ""}`} onClick={toggleAutoApprove}>
        Auto-approval: {autoApprove ? "ON" : "OFF"}
      </button>
      <button className="control-button" onClick={handleManualPayout} disabled={autoApprove}>
        Manual payout
      </button>
      {status ? <p className="control-status">{status}</p> : null}
    </div>
  );
}
