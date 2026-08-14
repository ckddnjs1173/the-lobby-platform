"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import Link from "next/link";
import {
  useRouter,
} from "next/navigation";

import {
  auth,
} from "../../lib/firebase";

export default function CandidateHeader() {
  const router = useRouter();
  const [authenticated, setAuthenticated] =
    useState(false);
  const [authReady, setAuthReady] =
    useState(false);

  useEffect(() => {
    return onAuthStateChanged(
      auth,
      (user) => {
        setAuthenticated(Boolean(user));
        setAuthReady(true);
      }
    );
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/");
    router.refresh();
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="font-extrabold tracking-tight text-brand-navy"
        >
          The Lobby
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/jobs"
            className="rounded-lg px-3 py-2 font-semibold text-slate-600 hover:bg-slate-100 hover:text-brand-navy"
          >
            채용공고
          </Link>

          {authReady && authenticated ? (
            <>
              <Link
                href="/candidate"
                className="rounded-lg px-3 py-2 font-semibold text-slate-600 hover:bg-slate-100 hover:text-brand-navy"
              >
                내 커리어
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600 hover:bg-slate-50"
              >
                로그아웃
              </button>
            </>
          ) : authReady ? (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 font-semibold text-slate-600 hover:bg-slate-100 hover:text-brand-navy"
              >
                로그인
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-brand-navy px-3 py-2 font-bold text-brand-gold hover:bg-slate-900"
              >
                프로필 등록
              </Link>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
