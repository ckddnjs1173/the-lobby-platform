import test, {
  after,
  before,
  beforeEach,
} from "node:test";

import {
  assertFails,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";

import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

import {
  readFileSync,
} from "node:fs";

const PROJECT_ID =
  "demo-the-lobby-phase2-rules";

const RECRUITER_UID =
  "phase2-recruiter";

const CANDIDATE_UID =
  "phase2-candidate";

const INTERVIEW_ID =
  "phase2-interview";

const EVENT_ID =
  "phase2-event";

let testEnv;

async function seedServerOnlyCollections() {
  await testEnv.withSecurityRulesDisabled(
    async (context) => {
      const db = context.firestore();

      await setDoc(
        doc(
          db,
          "interviews",
          INTERVIEW_ID
        ),
        {
          interviewId:
            INTERVIEW_ID,
          applicationId:
            "candidate__job",
          candidateId:
            "candidate",
          jobId:
            "job",
          organizationId:
            "org-a",
          recruiterId:
            RECRUITER_UID,
          scheduledAt:
            new Date(
              "2026-08-14T09:00:00Z"
            ),
          method:
            "ONSITE",
          location:
            "Test Room",
          interviewer:
            "Interviewer",
          note:
            null,
          status:
            "SCHEDULED",
          createdBy:
            RECRUITER_UID,
          createdAt:
            new Date(),
          updatedAt:
            new Date(),
        }
      );

      await setDoc(
        doc(
          db,
          "appEvents",
          EVENT_ID
        ),
        {
          eventId:
            EVENT_ID,
          applicationId:
            "candidate__job",
          organizationId:
            "org-a",
          type:
            "INTERVIEW_SCHEDULED",
          changedBy:
            RECRUITER_UID,
          createdAt:
            new Date(),
        }
      );
    }
  );
}

before(async () => {
  testEnv =
    await initializeTestEnvironment({
      projectId:
        PROJECT_ID,
      firestore: {
        rules:
          readFileSync(
            "firestore.rules",
            "utf8"
          ),
      },
    });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seedServerOnlyCollections();
});

after(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

test(
  "Recruiter cannot directly read an Interview document",
  async () => {
    const db =
      testEnv
        .authenticatedContext(
          RECRUITER_UID
        )
        .firestore();

    await assertFails(
      getDoc(
        doc(
          db,
          "interviews",
          INTERVIEW_ID
        )
      )
    );
  }
);

test(
  "Recruiter cannot directly create an Interview document",
  async () => {
    const db =
      testEnv
        .authenticatedContext(
          RECRUITER_UID
        )
        .firestore();

    await assertFails(
      setDoc(
        doc(
          db,
          "interviews",
          "client-created-interview"
        ),
        {
          interviewId:
            "client-created-interview",
          applicationId:
            "candidate__job",
          candidateId:
            "candidate",
          jobId:
            "job",
          organizationId:
            "org-a",
          recruiterId:
            RECRUITER_UID,
          scheduledAt:
            new Date(
              "2026-08-14T10:00:00Z"
            ),
          method:
            "VIDEO",
          status:
            "SCHEDULED",
          createdBy:
            RECRUITER_UID,
          createdAt:
            new Date(),
          updatedAt:
            new Date(),
        }
      )
    );
  }
);

test(
  "Candidate cannot directly read an Interview document",
  async () => {
    const db =
      testEnv
        .authenticatedContext(
          CANDIDATE_UID
        )
        .firestore();

    await assertFails(
      getDoc(
        doc(
          db,
          "interviews",
          INTERVIEW_ID
        )
      )
    );
  }
);

test(
  "Recruiter cannot directly read an AppEvent document",
  async () => {
    const db =
      testEnv
        .authenticatedContext(
          RECRUITER_UID
        )
        .firestore();

    await assertFails(
      getDoc(
        doc(
          db,
          "appEvents",
          EVENT_ID
        )
      )
    );
  }
);
