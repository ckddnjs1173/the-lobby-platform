"use client";

import { useCallback, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
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
  const [resettingPassword, setResettingPassword] = useState(false);

  const returnAfterAuthentication = useCallback(() => {
    router.replace(consumeCandidateReturnPath() || "/candidate");
  }, [router]);

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
  }, [returnAfterAuthentication, router]);

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

  const handlePasswordReset = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast.error("비밀번호 재설정 메일을 받을 이메일을 입력해주세요.");
      return;
    }

    setResettingPassword(true);

    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
      toast.success("비밀번호 재설정 메일을 보냈습니다. 받은편지함을 확인해주세요.");
    } catch (error) {
      console.error("Candidate password reset failed:", error);
      const firebaseError = error as FirebaseLikeError;

      if (firebaseError.code === "auth/invalid-email") {
        toast.error("이메일 형식을 확인해주세요.");
      } else {
        toast.error("비밀번호 재설정 메일을 보내지 못했습니다.");
      }
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <div className="candidate-surface min-h-screen bg-brand-light">
      <CandidateHeader />

      <main className="mx-auto grid max-w-[1240px] items-stretch px-5 pb-10 pt-24 sm:px-8 lg:grid-cols-[1.04fr_0.96fr] lg:px-10">
        <section className="relative hidden overflow-hidden rounded-l-2xl border border-r-0 border-brand-line bg-brand-espresso lg:block">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-80"
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(36,24,15,0.05), rgba(36,24,15,0.72)), url('https://images.unsplash.com/photo-1775447665921-87fb172bf115?auto=format&fit=crop&w=1400&q=88')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-brand-espresso/80 via-transparent to-transparent" />
          <div className="relative flex h-full min-h-[620px] flex-col justify-end p-10 text-white xl:p-11">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-cream/78">Candidate Experience</p>
            <h1 className="font-editorial mt-4 max-w-lg text-[38px] font-bold leading-[1.3] tracking-[-0.025em]">
              지원부터 면접, 입사까지
              <br />
              내 커리어를 한눈에.
            </h1>
            <p className="mt-5 max-w-md text-[14px] leading-7 text-white/72">
              The Lobby Candidate Portal에서 프로필을 최신 상태로 유지하고 모든 지원 진행 상황을 확인하세요.
            </p>
            <div className="mt-8 grid max-w-lg grid-cols-3 border-t border-white/20 pt-6 text-[12px]">
              <div><strong className="block text-white">Profile</strong><span className="mt-1 block text-white/58">경력 관리</span></div>
              <div className="border-l border-white/20 pl-5"><strong className="block text-white">Applications</strong><span className="mt-1 block text-white/58">지원 현황</span></div>
              <div className="border-l border-white/20 pl-5"><strong className="block text-white">Interview</strong><span className="mt-1 block text-white/58">면접 일정</span></div>
            </div>
          </div>
        </section>

        <section className="flex min-h-[570px] items-center rounded-2xl border border-brand-line bg-white px-6 py-10 shadow-soft sm:px-10 lg:rounded-l-none lg:px-12 xl:px-14">
          <div className="mx-auto w-full max-w-[420px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-bronze">Candidate Portal</p>
            <h2 className="font-editorial mt-3 text-[34px] font-bold tracking-[-0.025em] text-brand-espresso sm:text-[36px]">내 커리어로 돌아오기</h2>
            <p className="mt-3 text-[14px] leading-6 text-brand-muted">
              지원 현황과 예정 면접을 확인하고 프로필을 최신 상태로 관리하세요.
            </p>

            <div className="mt-8 space-y-4">
              <label className="block space-y-2">
                <span className="text-[12px] font-bold text-brand-ink">이메일</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  className="w-full rounded-lg border border-brand-line bg-brand-light px-4 py-3.5 text-[14px] outline-none transition focus:border-brand-bronze focus:bg-white"
                  placeholder="name@example.com"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-[12px] font-bold text-brand-ink">비밀번호</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-brand-line bg-brand-light px-4 py-3.5 text-[14px] outline-none transition focus:border-brand-bronze focus:bg-white"
                  placeholder="비밀번호"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void handleLogin();
                  }}
                />
              </label>
            </div>

            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => void handlePasswordReset()}
                disabled={resettingPassword || loading}
                className="text-[12px] font-bold text-brand-bronze hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resettingPassword ? "재설정 메일 발송 중..." : "비밀번호를 잊으셨나요?"}
              </button>
            </div>

            <button
              type="button"
              onClick={() => void handleLogin()}
              disabled={loading || resettingPassword}
              className="mt-5 min-h-[48px] w-full rounded-lg bg-brand-bronze py-3.5 text-[14px] font-bold text-white shadow-card transition hover:bg-brand-espresso disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>

            <div className="mt-6 border-t border-brand-line pt-5 text-center text-[13px] text-brand-muted">
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
