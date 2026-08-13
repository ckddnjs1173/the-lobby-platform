"use client";

import {
  createContext,
  useContext,
} from "react";

import type {
  B2BSession,
} from "../../lib/b2bApi";

interface B2BSessionProviderProps {
  session: B2BSession;
  children: React.ReactNode;
}

const B2BSessionContext =
  createContext<
    B2BSession | undefined
  >(undefined);

export function B2BSessionProvider({
  session,
  children,
}: B2BSessionProviderProps) {
  return (
    <B2BSessionContext.Provider
      value={session}
    >
      {children}
    </B2BSessionContext.Provider>
  );
}

export function useB2BSession(): B2BSession {
  const context =
    useContext(
      B2BSessionContext
    );

  if (!context) {
    throw new Error(
      "useB2BSession must be used inside B2BSessionProvider."
    );
  }

  return context;
}