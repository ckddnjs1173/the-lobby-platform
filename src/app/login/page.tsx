"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
} from "firebase/auth";

import Link from "next/link";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import toast from "react-hot-toast";

import CandidateHeader from "../../components/candidate/CandidateHeader";

import {
  CandidatePortalApiError,
  fetchCandidatePortalProfile,
} from "../../lib/candidatePortalApi";

import {
  auth,
} from "../../lib/firebase";

interface FirebaseLikeError {
  code?: string;
}

export default function CandidateLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const nextPath =
    searchParams.get("next") === "/jobs"
      ? "/jobs"
      : "/candidate";

  useEffect(() => {
    return onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          return;
        }

        try {
          await fetchCandidatePortalProfile();
          router.replace(nextPath);
        } catch (error) {
          if (
            error instanceof CandidatePortalApiError &&
            error.code === "CANDIDATE_NOT_FOUND"
          ) {
            router.replace("/register");
          }
        }
      }
    );
  }, [nextPath, router]);

  const handleLogin = async () => {
    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      toast.error(
        "이메일과 비밀번호를 입력해주세요."
      );
      return;
    }

    setLoading(true);

    try {
      await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        password
      );

      try {
        await fetchCandidatePortalProfile();
        toast.success("로그인했습니다.");
        router.replace(nextPath);
      } catch (profileError) {
        if (
          profileError instanceof CandidatePortalApiError &&
          profileError.code === "CANDIDATE_NOT_FOUND"
        ) {
          toast(
            "로그인 계정에 Candidate 프로필이 없어 등록 화면으로 이동합니다."
          );
          router.replace("/register");
          return;
        }

        throw profileError;
      }
    } catch (error) {
      console.error(
        "Candidate login failed:",
        error
      );

      const firebaseError =
        error as FirebaseLikeError;

      if (
        firebaseError.code === "auth/invalid-credential" ||
        firebaseError.code === "auth/wrong-password" ||
        firebaseError.code === "auth/user-not-found"
      ) {
        toast.error(
          "이메일 또는 비밀번호를 확인해주세요."
        );
      } else if (
        error instanceof CandidatePortalApiError
      ) {
        toast.error(error.message);
      } else {
        toast.error(
          "로그인 중 오류가 발생했습니다."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <CandidateHeader />

      <main className="mx-auto flex min-h-screen max-w-md items-center px-4 pb-12 pt-24">
        <div className="w-full space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
          <div className="space-y-2 text-center">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold">
              Candidate Portal
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              내 커리어로 돌아오기
            </h1>
            <p className="text-sm leading-6 text-slate-500">
              지원 현황과 예정 면접을 확인하고 프로필을 최신 상태로 관리하세요.
            </p>
          </div>

          <div className="space-y-4">
            <label className="block space-y-1">
              <span className="text-xs font-bold text-slate-700">
                이메일
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                autoComplete="email"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-navy"
                placeholder="name@example.com"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-bold text-slate-700">
                비밀번호
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-navy"
                placeholder="비밀번호"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void handleLogin();
                  }
                }}
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => void handleLogin()}
            disabled={loading}
            className="w-full rounded-xl bg-brand-navy py-3.5 text-sm font-bold text-brand-gold hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>

          <div className="border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
            아직 Candidate 프로필이 없나요?{" "}
            <Link
              href="/register"
              className="font-bold text-brand-navy hover:underline"
            >
              프로필 등록
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
