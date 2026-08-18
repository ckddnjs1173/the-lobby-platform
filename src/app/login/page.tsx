"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import CandidateHeader from "../../components/candidate/CandidateHeader";
import { consumeCandidateReturnPath } from "../../lib/candidateNavigationIntent";
import {
  CandidatePortalApiError,
  fetchCandidatePortalProfile,
} from "../../lib/candidatePortalApi";
import { auth } from "../../lib/firebase";

interface FirebaseLikeError {
  code?: string;
}

export default function CandidateLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const returnAfterAuthentication = () => {
    router.replace(consumeCandidateReturnPath() || "/candidate");
  };

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      try {
        await fetchCandidatePortalProfile();
        returnAfterAuthentication();
      } catch (error) {
        if (
          error instanceof CandidatePortalApiError &&
          error.code === "CANDIDATE_NOT_FOUND"
        ) {
          router.replace("/register");
        }
      }
    });
  }, [router]);

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      toast.error("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, normalizedEmail, password);

      try {
        await fetchCandidatePortalProfile();
        toast.success("로그인했습니다.");
        returnAfterAuthentication();
      } catch (profileError) {
        if (
          profileError instanceof CandidatePortalApiError &&
          profileError.code === "CANDIDATE_NOT_FOUND"
        ) {
          toast("로그인 계정에 Candidate 프로필이 없어 등록 화면으로 이동합니다.");
          router.replace("/register");
          return;
        }
        throw profileError;
      }
    } catch (error) {
      console.error("Candidate login failed:", error);
      const firebaseError = error as FirebaseLikeError;

      if (
        firebaseError.code === "auth/invalid-credential" ||
        firebaseError.code === "auth/wrong-password" ||
        firebaseError.code === "auth/user-not-found"
      ) {
        toast.error("이메일 또는 비밀번호를 확인해주세요.");
      } else if (error instanceof CandidatePortalApiError) {
        toast.error(error.message);
      } else {
        toast.error("로그인 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="candidate-surface min-h-screen bg-brand-light">
      <CandidateHeader />

      <main className="mx-auto grid min-h-screen max-w-[1280px] items-stretch px-5 pb-10 pt-24 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
        <section className="relative hidden overflow-hidden rounded-l-2xl border border-r-0 border-brand-line bg-brand-espresso lg:block">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-80"
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(36,24,15,0.05), rgba(36,24,15,0.72)), url('https://images.unsplash.com/photo-1775447665921-87fb172bf115?auto=format&fit=crop&w=1400&q=88')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-brand-espresso/80 via-transparent to-transparent" />
          <div className="relative flex h-full min-h-[650px] flex-col justify-end p-12 text-white">
            <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-brand-cream/75">Candidate Experience</p>
            <h1 className="font-editorial mt-4 max-w-lg text-[42px] leading-[1.28] tracking-[-0.04em]">
              지원부터 면접, 입사까지
              <br />
              내 커리어를 한눈에.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-white/68">
              The Lobby Candidate Portal에서 프로필을 최신 상태로 유지하고 모든 지원 진행 상황을 확인하세요.
            </p>
            <div className="mt-9 grid max-w-lg grid-cols-3 border-t border-white/20 pt-6 text-[11px]">
              <div><strong className="block text-white">Profile</strong><span className="mt-1 block text-white/55">경력 관리</span></div>
              <div className="border-l border-white/20 pl-5"><strong className="block text-white">Applications</strong><span className="mt-1 block text-white/55">지원 현황</span></div>
              <div className="border-l border-white/20 pl-5"><strong className="block text-white">Interview</strong><span className="mt-1 block text-white/55">면접 일정</span></div>
            </div>
          </div>
        </section>

        <section className="flex min-h-[620px] items-center rounded-2xl border border-brand-line bg-white px-6 py-12 shadow-soft sm:px-10 lg:rounded-l-none lg:px-14">
          <div className="mx-auto w-full max-w-[420px]">
            <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-brand-bronze">Candidate Portal</p>
            <h2 className="font-editorial mt-3 text-[36px] tracking-[-0.04em] text-brand-espresso">내 커리어로 돌아오기</h2>
            <p className="mt-3 text-sm leading-6 text-brand-muted">
              지원 현황과 예정 면접을 확인하고 프로필을 최신 상태로 관리하세요.
            </p>

            <div className="mt-9 space-y-4">
              <label className="block space-y-2">
                <span className="text-[11px] font-bold text-brand-ink">이메일</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  className="w-full rounded-lg border border-brand-line bg-brand-light px-4 py-3.5 text-sm outline-none transition focus:border-brand-bronze focus:bg-white"
                  placeholder="name@example.com"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-[11px] font-bold text-brand-ink">비밀번호</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-brand-line bg-brand-light px-4 py-3.5 text-sm outline-none transition focus:border-brand-bronze focus:bg-white"
                  placeholder="비밀번호"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void handleLogin();
                  }}
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => void handleLogin()}
              disabled={loading}
              className="mt-6 w-full rounded-lg bg-brand-bronze py-3.5 text-sm font-bold text-white shadow-card transition hover:bg-brand-espresso disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>

            <div className="mt-6 border-t border-brand-line pt-5 text-center text-xs text-brand-muted">
              아직 Candidate 프로필이 없나요?{" "}
              <Link href="/register" className="font-bold text-brand-bronze hover:underline">
                1분 프로필 등록
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
