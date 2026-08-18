"use client";

import { Suspense, useEffect, useState } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { auth } from "../../../lib/firebase";
import { B2BApiError, fetchB2BSession } from "../../../lib/b2bApi";

function getErrorMessage(errorCode: string | null): string {
  switch (errorCode) {
    case "B2B_USER_NOT_FOUND":
      return "관리자로 등록되지 않은 계정입니다.";
    case "B2B_ROLE_REQUIRED":
      return "헤드헌터 워크스페이스 접근 권한이 없는 계정입니다.";
    case "B2B_USER_INACTIVE":
      return "현재 사용할 수 없는 관리자 계정입니다.";
    case "RECRUITER_ORGANIZATION_MISSING":
      return "관리자 조직 정보가 설정되지 않았습니다.";
    case "INVALID_ID_TOKEN":
      return "로그인 세션이 만료되었습니다. 다시 로그인해주세요.";
    case "AUTH_REQUIRED":
      return "관리자 로그인이 필요합니다.";
    case "B2B_SESSION_FAILED":
      return "관리자 권한을 확인할 수 없습니다.";
    case "NETWORK_ERROR":
      return "서버에 연결할 수 없습니다.";
    default:
      return "";
  }
}

function LobbyMark() {
  return (
    <div className="relative h-10 w-9 shrink-0 text-brand-cream" aria-hidden="true">
      <span className="font-editorial absolute left-0 top-[-3px] text-[31px] leading-none">L</span>
      <span className="font-editorial absolute left-[11px] top-[7px] text-[21px] leading-none text-brand-gold">L</span>
      <span className="absolute bottom-0 left-0 h-px w-8 bg-brand-gold/45" />
    </div>
  );
}

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const message = getErrorMessage(searchParams.get("error"));
    if (message) setError(message);
  }, [searchParams]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, normalizedEmail, password);
      await fetchB2BSession();
      router.replace("/b2b-admin");
    } catch (caughtError) {
      console.error("B2B login failed:", caughtError);

      try {
        await signOut(auth);
      } catch (signOutError) {
        console.error("Failed to sign out after B2B login failure:", signOutError);
      }

      if (caughtError instanceof B2BApiError) {
        setError(caughtError.message);
        return;
      }

      setError("이메일 또는 비밀번호가 일치하지 않거나 관리자 권한이 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-brand-espresso px-4 py-4 sm:px-6 sm:py-6 lg:p-7">
      <div className="mx-auto grid min-h-[calc(100vh-32px)] max-w-[1240px] overflow-hidden rounded-2xl border border-white/10 bg-brand-light shadow-soft sm:min-h-[calc(100vh-48px)] lg:grid-cols-[1.04fr_0.96fr]">
        <section className="relative hidden overflow-hidden bg-brand-espresso lg:block">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-55"
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(36,24,15,0.16), rgba(36,24,15,0.88)), url('https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1500&q=88')",
            }}
          />
          <div className="absolute inset-0 lobby-grid opacity-15" />

          <div className="relative flex h-full min-h-[620px] flex-col justify-between p-10 text-white xl:p-12">
            <Link href="/" className="flex items-center gap-3.5">
              <LobbyMark />
              <div className="leading-none">
                <div className="font-editorial text-[21px] font-bold tracking-[0.07em]">THE LOBBY</div>
                <div className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/58">Recruiting Operating System</div>
              </div>
            </Link>

            <div className="max-w-xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-cream/72">J&C Recruiter Workspace</p>
              <h1 className="font-editorial mt-4 text-[40px] font-bold leading-[1.3] tracking-[-0.025em]">
                좋은 인재와 좋은 포지션을
                <br />
                더 빠르게 연결합니다.
              </h1>
              <p className="mt-5 max-w-lg text-[14px] leading-7 text-white/68">
                지원자 CRM, 채용 파이프라인, 면접 운영, 커뮤니케이션과 분석을 하나의 워크스페이스에서 관리합니다.
              </p>

              <div className="mt-8 grid grid-cols-3 border-y border-white/15 py-5 text-[12px]">
                <div><strong className="block text-white">Candidate CRM</strong><span className="mt-1 block text-white/50">후보자 관리</span></div>
                <div className="border-l border-white/15 pl-5"><strong className="block text-white">Pipeline</strong><span className="mt-1 block text-white/50">전형 운영</span></div>
                <div className="border-l border-white/15 pl-5"><strong className="block text-white">Analytics</strong><span className="mt-1 block text-white/50">채용 분석</span></div>
              </div>
            </div>

            <p className="text-[10px] leading-5 text-white/42">Authorized J&C personnel only · Server-side role and tenant verification</p>
          </div>
        </section>

        <section className="flex min-h-[570px] items-center bg-brand-light px-6 py-10 sm:px-12 lg:px-14 xl:px-16">
          <div className="mx-auto w-full max-w-[420px]">
            <Link href="/" className="mb-9 inline-flex items-center gap-2 text-[12px] font-bold text-brand-muted transition hover:text-brand-bronze lg:hidden">
              ← THE LOBBY 홈
            </Link>

            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-bronze">Admin Access</p>
            <h2 className="font-editorial mt-3 text-[34px] font-bold tracking-[-0.025em] text-brand-espresso sm:text-[36px]">Recruiter 로그인</h2>
            <p className="mt-3 text-[14px] leading-6 text-brand-muted">
              Firebase 인증 후 서버에서 관리자 역할과 조직 권한을 다시 검증합니다.
            </p>

            <form onSubmit={handleLogin} className="mt-8 space-y-4.5">
              <label className="block space-y-2" htmlFor="admin-email">
                <span className="text-[12px] font-bold text-brand-ink">이메일</span>
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={loading}
                  className="w-full rounded-lg border border-brand-line bg-white px-4 py-3.5 text-[14px] outline-none transition focus:border-brand-bronze disabled:cursor-not-allowed disabled:opacity-60"
                  placeholder="recruiter@jnc.com"
                  autoComplete="email"
                  required
                />
              </label>

              <label className="block space-y-2" htmlFor="admin-password">
                <span className="text-[12px] font-bold text-brand-ink">비밀번호</span>
                <input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={loading}
                  className="w-full rounded-lg border border-brand-line bg-white px-4 py-3.5 text-[14px] outline-none transition focus:border-brand-bronze disabled:cursor-not-allowed disabled:opacity-60"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </label>

              {error ? (
                <div role="alert" className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
                  <p className="text-center text-[13px] font-medium leading-5 text-red-600">{error}</p>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="min-h-[48px] w-full rounded-lg bg-brand-bronze py-3.5 text-[14px] font-bold text-white shadow-card transition hover:bg-brand-espresso disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "권한 확인 중..." : "워크스페이스 접속"}
              </button>
            </form>

            <div className="mt-7 border-t border-brand-line pt-5 text-center text-[12px] leading-5 text-brand-muted">
              B2B 계정은 내부 관리자에 의해 승인된 사용자만 이용할 수 있습니다.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function AdminLoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-espresso px-4">
      <div className="rounded-xl border border-white/10 bg-white/5 px-8 py-7 text-center text-white backdrop-blur">
        <div className="font-editorial text-xl font-bold">THE LOBBY</div>
        <div className="mt-2 text-[13px] text-white/58">로그인 화면을 준비하고 있습니다.</div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<AdminLoginFallback />}>
      <AdminLoginContent />
    </Suspense>
  );
}
