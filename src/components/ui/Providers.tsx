"use client";

import { Toaster } from "sonner";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="bottom-center"
        toastOptions={{
          classNames: {
            toast: "rounded-xl border border-border bg-card text-text shadow-md",
          },
        }}
      />
    </>
  );
}
