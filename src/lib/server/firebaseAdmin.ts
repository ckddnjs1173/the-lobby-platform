import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import {
  getAuth,
  type Auth,
} from "firebase-admin/auth";
import {
  getFirestore,
  type Firestore,
} from "firebase-admin/firestore";

/**
 * Firebase Admin SDK 초기화
 *
 * 지원 방식:
 *
 * 1. 배포 환경
 *    FIREBASE_ADMIN_PROJECT_ID
 *    FIREBASE_ADMIN_CLIENT_EMAIL
 *    FIREBASE_ADMIN_PRIVATE_KEY
 *
 * 2. 로컬 개발환경
 *    GOOGLE_APPLICATION_CREDENTIALS
 *
 * 로컬에서 service account JSON을 사용하는 경우
 * applicationDefault()가 해당 자격증명을 읽는다.
 */

let cachedAdminApp: App | null = null;

function getProjectId(): string | undefined {
  return (
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    undefined
  );
}

function getFirebaseAdminApp(): App {
  if (cachedAdminApp) {
    return cachedAdminApp;
  }

  const existingApps = getApps();

  if (existingApps.length > 0) {
    cachedAdminApp = existingApps[0];
    return cachedAdminApp;
  }

  const projectId = getProjectId();

  const clientEmail =
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

  const privateKey =
    process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  /**
   * 명시적 Service Account 환경변수가 모두 존재하면
   * cert() 방식으로 초기화한다.
   */
  if (
    projectId &&
    clientEmail &&
    privateKey
  ) {
    cachedAdminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(
          /\\n/g,
          "\n"
        ),
      }),
      projectId,
    });

    return cachedAdminApp;
  }

  /**
   * 로컬 또는 Google 관리 환경에서는
   * Application Default Credentials 사용.
   */
  cachedAdminApp = initializeApp({
    credential: applicationDefault(),
    ...(projectId
      ? {
          projectId,
        }
      : {}),
  });

  return cachedAdminApp;
}

export function getFirebaseAdminAuth(): Auth {
  return getAuth(getFirebaseAdminApp());
}

export function getFirebaseAdminDb(): Firestore {
  return getFirestore(getFirebaseAdminApp());
}