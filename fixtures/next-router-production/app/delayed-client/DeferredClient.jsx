"use client";

import { useEffect, useState } from "react";

export default function DeferredClient({ missing = false }) {
  const [moduleState, setModuleState] = useState({ status: "loading" });

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      import("./DeferredContent.jsx")
        .then(({ default: Content }) => {
          if (active) setModuleState({ status: "ready", Content });
        })
        .catch(() => {
          if (active) setModuleState({ status: "error" });
        });
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  if (moduleState.status === "error")
    return <p role="alert">Delayed client module failed to load</p>;
  if (moduleState.status !== "ready")
    return <p role="status">Loading delayed client module</p>;
  const Content = moduleState.Content;
  return <Content missing={missing} />;
}
