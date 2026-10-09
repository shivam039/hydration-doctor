"use client";

import { useRef, useState } from "react";

export default function RaceDashboard({ protectStaleResponse = true }) {
  const [account, setAccount] = useState("No account selected");
  const [pending, setPending] = useState(0);
  const latestRequest = useRef(0);

  async function loadAccount(name) {
    const requestId = ++latestRequest.current;
    setPending((count) => count + 1);
    try {
      const response = await fetch(`/api/account?name=${name}`);
      const result = await response.json();
      if (!protectStaleResponse || requestId === latestRequest.current) {
        setAccount(result.label);
      }
    } finally {
      setPending((count) => count - 1);
    }
  }

  return (
    <main>
      <button id="load-slow-account" onClick={() => loadAccount("slow")}>
        Load account A slowly
      </button>
      <button id="load-fast-account" onClick={() => loadAccount("fast")}>
        Load account B quickly
      </button>
      <p id="race-account">{account}</p>
      {pending === 0 && account !== "No account selected" ? (
        <p id="race-settled">All account requests settled</p>
      ) : null}
    </main>
  );
}
