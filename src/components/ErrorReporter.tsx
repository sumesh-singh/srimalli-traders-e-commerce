"use client";

import { useEffect } from "react";

// Minimal client-side error reporter to avoid build/runtime import errors
// Logs client errors to the console. Extend later to send to your backend.
export default function ErrorReporter() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // eslint-disable-next-line no-console
      console.error("Client Error: ", event.error || event.message);
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      // eslint-disable-next-line no-console
      console.error("Unhandled Rejection: ", event.reason);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}