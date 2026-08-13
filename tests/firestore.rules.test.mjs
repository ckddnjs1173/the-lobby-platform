import test, {
  after,
  before,
  beforeEach,
} from "node:test";

import assert from "node:assert/strict";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import {
  readFileSync,
} from "node:fs";

// ============================================================================
// Constants
// ============================================================================

const PROJECT_ID =
  "demo-the-lobby-rules";

const ORG_A =
  "org-a";

const ORG_B =
  "org-b";

const CANDIDATE_UID =
  "candidate-user-a";

const OTHER_CANDIDATE_UID =
  "candidate-user-b";

const RECRUITER_A_UID =
  "recruiter-a";

const RECRUITER_B_UID =
  "recruiter-b";

const ADMIN_UID =
  "admin-user";

const CANDIDATE_A =
  "candidate-a";

const CANDIDATE_B =
  "candidate-b";

const JOB_OPEN_A =
  "job-open-a";

const JOB_DRAFT_A =
  "job-draft-a";

const JOB_OPEN_B =
  "job-open-b";

const APPLICATION_A =
  `${CANDIDATE_A}__${JOB_OPEN_A}`;

const APPLICATION_B =
  `${CANDIDATE_B}__${JOB_OPEN_B}`;

// ============================================================================
// Test Environment
// ============================================================================

let testEnv;

// ============================================================================
// Seed Data
// ============================================================================

async function seedDatabase() {
  await testEnv.withSecurityRulesDisabled(
    async (context) => {
      const db =
        context.firestore();

      // ----------------------------------------------------------------------
      // B2B Users
      // ----------------------------------------------------------------------

      await setDoc(
        doc(
          db,
          "users",
          RECRUITER_A_UID
        ),
        {
          uid:
            RECRUITER_A_UID,

          email:
            "recruiter-a@example.com",

          name:
            "Recruiter A",

          role:
            "RECRUITER",

          organizationId:
            ORG_A,

          status:
            "ACTIVE",
        }
      );

      await setDoc(
        doc(
          db,
          "users",
          RECRUITER_B_UID
        ),
        {
          uid:
            RECRUITER_B_UID,

          email:
            "recruiter-b@example.com",

          name:
            "Recruiter B",

          role:
            "RECRUITER",

          organizationId:
            ORG_B,

          status:
            "ACTIVE",
        }
      );

      await setDoc(
        doc(
          db,
          "users",
          ADMIN_UID
        ),
        {
          uid:
            ADMIN_UID,

          email:
            "admin@example.com",

          name:
            "Admin",

          role:
            "ADMIN",

          organizationId:
            null,

          status:
            "ACTIVE",
        }
      );

      // ----------------------------------------------------------------------
      // Candidates
      // ----------------------------------------------------------------------

      await setDoc(
        doc(
          db,
          "candidates",
          CANDIDATE_A
        ),
        {
          candidateId:
            CANDIDATE_A,

          authUid:
            CANDIDATE_UID,

          name:
            "Candidate A",

          phone:
            "010-1111-1111",

          email:
            "candidate-a@example.com",

          source:
            "B2C_SELF",

          accountStatus:
            "ACTIVE",

          createdAt:
            new Date(),

          updatedAt:
            new Date(),
        }
      );

      await setDoc(
        doc(
          db,
          "candidates",
          CANDIDATE_B
        ),
        {
          candidateId:
            CANDIDATE_B,

          authUid:
            OTHER_CANDIDATE_UID,

          name:
            "Candidate B",

          phone:
            "010-2222-2222",

          email:
            "candidate-b@example.com",

          source:
            "B2C_SELF",

          accountStatus:
            "ACTIVE",

          createdAt:
            new Date(),

          updatedAt:
            new Date(),
        }
      );

      // ----------------------------------------------------------------------
      // Profiles
      // ----------------------------------------------------------------------

      await setDoc(
        doc(
          db,
          "profile",
          CANDIDATE_A
        ),
        {
          candidateId:
            CANDIDATE_A,

          headline:
            "Candidate A Headline",

          careerSummary:
            "Candidate A Career",

          skills: [
            "Recruiting",
          ],

          careers: [],

          education: [],

          profileCompleteness:
            80,

          updatedAt:
            new Date(),
        }
      );

      await setDoc(
        doc(
          db,
          "profile",
          CANDIDATE_B
        ),
        {
          candidateId:
            CANDIDATE_B,

          headline:
            "Candidate B Headline",

          careerSummary:
            "Candidate B Career",

          skills: [
            "Operations",
          ],

          careers: [],

          education: [],

          profileCompleteness:
            70,

          updatedAt:
            new Date(),
        }
      );

      // ----------------------------------------------------------------------
      // Jobs
      // ----------------------------------------------------------------------

      await setDoc(
        doc(
          db,
          "jobs",
          JOB_OPEN_A
        ),
        {
          jobId:
            JOB_OPEN_A,

          organizationId:
            ORG_A,

          company:
            "Company A",

          displayCompany:
            "Company A",

          title:
            "Open Job A",

          description:
            "Open job",

          requirements: [],

          preferredQualifications:
            [],

          salary:
            "협의",

          location:
            "서울",

          employmentType:
            "정규직",

          status:
            "OPEN",

          recruiterId:
            RECRUITER_A_UID,

          createdAt:
            new Date(),

          updatedAt:
            new Date(),
        }
      );

      await setDoc(
        doc(
          db,
          "jobs",
          JOB_DRAFT_A
        ),
        {
          jobId:
            JOB_DRAFT_A,

          organizationId:
            ORG_A,

          company:
            "Company A",

          displayCompany:
            "Company A",

          title:
            "Draft Job A",

          description:
            "Draft job",

          requirements: [],

          preferredQualifications:
            [],

          salary:
            "협의",

          location:
            "서울",

          employmentType:
            "정규직",

          status:
            "DRAFT",

          recruiterId:
            RECRUITER_A_UID,

          createdAt:
            new Date(),

          updatedAt:
            new Date(),
        }
      );

      await setDoc(
        doc(
          db,
          "jobs",
          JOB_OPEN_B
        ),
        {
          jobId:
            JOB_OPEN_B,

          organizationId:
            ORG_B,

          company:
            "Company B",

          displayCompany:
            "Company B",

          title:
            "Open Job B",

          description:
            "Open job",

          requirements: [],

          preferredQualifications:
            [],

          salary:
            "협의",

          location:
            "부산",

          employmentType:
            "정규직",

          status:
            "OPEN",

          recruiterId:
            RECRUITER_B_UID,

          createdAt:
            new Date(),

          updatedAt:
            new Date(),
        }
      );

      // ----------------------------------------------------------------------
      // Applications
      // ----------------------------------------------------------------------

      await setDoc(
        doc(
          db,
          "applications",
          APPLICATION_A
        ),
        {
          applicationId:
            APPLICATION_A,

          candidateId:
            CANDIDATE_A,

          jobId:
            JOB_OPEN_A,

          organizationId:
            ORG_A,

          recruiterId:
            RECRUITER_A_UID,

          stage:
            "NEW",

          source:
            "B2C_WEB",

          candidateSnapshot: {
            name:
              "Candidate A",

            phone:
              "010-1111-1111",

            email:
              "candidate-a@example.com",
          },

          jobSnapshot: {
            title:
              "Open Job A",

            company:
              "Company A",
          },

          appliedAt:
            new Date(),

          updatedAt:
            new Date(),

          lastActivityAt:
            new Date(),
        }
      );

      await setDoc(
        doc(
          db,
          "applications",
          APPLICATION_B
        ),
        {
          applicationId:
            APPLICATION_B,

          candidateId:
            CANDIDATE_B,

          jobId:
            JOB_OPEN_B,

          organizationId:
            ORG_B,

          recruiterId:
            RECRUITER_B_UID,

          stage:
            "NEW",

          source:
            "B2C_WEB",

          candidateSnapshot: {
            name:
              "Candidate B",

            phone:
              "010-2222-2222",

            email:
              "candidate-b@example.com",
          },

          jobSnapshot: {
            title:
              "Open Job B",

            company:
              "Company B",
          },

          appliedAt:
            new Date(),

          updatedAt:
            new Date(),

          lastActivityAt:
            new Date(),
        }
      );
    }
  );
}

// ============================================================================
// Setup / Teardown
// ============================================================================

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

  await seedDatabase();
});

after(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

// ============================================================================
// Public Job Access
// ============================================================================

test(
  "Public user can read an OPEN job",
  async () => {
    const db =
      testEnv
        .unauthenticatedContext()
        .firestore();

    await assertSucceeds(
      getDoc(
        doc(
          db,
          "jobs",
          JOB_OPEN_A
        )
      )
    );
  }
);

test(
  "Public user cannot read a DRAFT job",
  async () => {
    const db =
      testEnv
        .unauthenticatedContext()
        .firestore();

    await assertFails(
      getDoc(
        doc(
          db,
          "jobs",
          JOB_DRAFT_A
        )
      )
    );
  }
);

test(
  "Public OPEN jobs query succeeds",
  async () => {
    const db =
      testEnv
        .unauthenticatedContext()
        .firestore();

    const openJobsQuery =
      query(
        collection(
          db,
          "jobs"
        ),

        where(
          "status",
          "==",
          "OPEN"
        )
      );

    const snapshot =
      await assertSucceeds(
        getDocs(
          openJobsQuery
        )
      );

    assert.equal(
      snapshot.size,
      2
    );
  }
);

test(
  "Public unfiltered jobs query is denied",
  async () => {
    const db =
      testEnv
        .unauthenticatedContext()
        .firestore();

    await assertFails(
      getDocs(
        collection(
          db,
          "jobs"
        )
      )
    );
  }
);

// ============================================================================
// Candidate Access
// ============================================================================

test(
  "Candidate can read own Candidate document",
  async () => {
    const db =
      testEnv
        .authenticatedContext(
          CANDIDATE_UID
        )
        .firestore();

    await assertSucceeds(
      getDoc(
        doc(
          db,
          "candidates",
          CANDIDATE_A
        )
      )
    );
  }
);

test(
  "Candidate cannot read another Candidate document",
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
          "candidates",
          CANDIDATE_B
        )
      )
    );
  }
);

test(
  "Candidate can create own B2C Candidate document",
  async () => {
    const uid =
      "candidate-new";

    const candidateId =
      "candidate-new-id";

    const db =
      testEnv
        .authenticatedContext(
          uid
        )
        .firestore();

    await assertSucceeds(
      setDoc(
        doc(
          db,
          "candidates",
          candidateId
        ),
        {
          candidateId,

          authUid:
            uid,

          name:
            "New Candidate",

          phone:
            "010-3333-3333",

          email:
            "new@example.com",

          source:
            "B2C_SELF",

          accountStatus:
            "ACTIVE",

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        }
      )
    );
  }
);

test(
  "Candidate cannot spoof authUid during Candidate creation",
  async () => {
    const db =
      testEnv
        .authenticatedContext(
          CANDIDATE_UID
        )
        .firestore();

    await assertFails(
      setDoc(
        doc(
          db,
          "candidates",
          "spoofed-candidate"
        ),
        {
          candidateId:
            "spoofed-candidate",

          authUid:
            OTHER_CANDIDATE_UID,

          name:
            "Spoof",

          phone:
            "010-4444-4444",

          email:
            "spoof@example.com",

          source:
            "B2C_SELF",

          accountStatus:
            "ACTIVE",

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        }
      )
    );
  }
);

// ============================================================================
// Profile Access
// ============================================================================

test(
  "Candidate can read own Profile",
  async () => {
    const db =
      testEnv
        .authenticatedContext(
          CANDIDATE_UID
        )
        .firestore();

    await assertSucceeds(
      getDoc(
        doc(
          db,
          "profile",
          CANDIDATE_A
        )
      )
    );
  }
);

test(
  "Candidate cannot read another Profile",
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
          "profile",
          CANDIDATE_B
        )
      )
    );
  }
);

test(
  "Recruiter cannot directly read Candidate Profile PII",
  async () => {
    const db =
      testEnv
        .authenticatedContext(
          RECRUITER_A_UID
        )
        .firestore();

    await assertFails(
      getDoc(
        doc(
          db,
          "profile",
          CANDIDATE_A
        )
      )
    );
  }
);

test(
  "Candidate can update own Profile",
  async () => {
    const db =
      testEnv
        .authenticatedContext(
          CANDIDATE_UID
        )
        .firestore();

    await assertSucceeds(
      updateDoc(
        doc(
          db,
          "profile",
          CANDIDATE_A
        ),
        {
          headline:
            "Updated Headline",

          updatedAt:
            serverTimestamp(),
        }
      )
    );
  }
);

// ============================================================================
// Application Reads
// ============================================================================

test(
  "Candidate can read own Application",
  async () => {
    const db =
      testEnv
        .authenticatedContext(
          CANDIDATE_UID
        )
        .firestore();

    await assertSucceeds(
      getDoc(
        doc(
          db,
          "applications",
          APPLICATION_A
        )
      )
    );
  }
);

test(
  "Candidate cannot read another Candidate Application",
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
          "applications",
          APPLICATION_B
        )
      )
    );
  }
);

test(
  "Recruiter can read Application from own organization",
  async () => {
    const db =
      testEnv
        .authenticatedContext(
          RECRUITER_A_UID
        )
        .firestore();

    await assertSucceeds(
      getDoc(
        doc(
          db,
          "applications",
          APPLICATION_A
        )
      )
    );
  }
);

test(
  "Recruiter cannot read Application from another organization",
  async () => {
    const db =
      testEnv
        .authenticatedContext(
          RECRUITER_A_UID
        )
        .firestore();

    await assertFails(
      getDoc(
        doc(
          db,
          "applications",
          APPLICATION_B
        )
      )
    );
  }
);

test(
  "Recruiter own-tenant Application query succeeds",
  async () => {
    const db =
      testEnv
        .authenticatedContext(
          RECRUITER_A_UID
        )
        .firestore();

    const ownTenantQuery =
      query(
        collection(
          db,
          "applications"
        ),

        where(
          "organizationId",
          "==",
          ORG_A
        )
      );

    const snapshot =
      await assertSucceeds(
        getDocs(
          ownTenantQuery
        )
      );

    assert.equal(
      snapshot.size,
      1
    );
  }
);

test(
  "Recruiter cross-tenant Application query is denied",
  async () => {
    const db =
      testEnv
        .authenticatedContext(
          RECRUITER_A_UID
        )
        .firestore();

    const crossTenantQuery =
      query(
        collection(
          db,
          "applications"
        ),

        where(
          "organizationId",
          "==",
          ORG_B
        )
      );

    await assertFails(
      getDocs(
        crossTenantQuery
      )
    );
  }
);

test(
  "ADMIN can query Applications across organizations",
  async () => {
    const db =
      testEnv
        .authenticatedContext(
          ADMIN_UID
        )
        .firestore();

    const snapshot =
      await assertSucceeds(
        getDocs(
          collection(
            db,
            "applications"
          )
        )
      );

    assert.equal(
      snapshot.size,
      2
    );
  }
);

// ============================================================================
// Application Writes
// ============================================================================

test(
  "Candidate cannot create Application directly with Client SDK",
  async () => {
    const db =
      testEnv
        .authenticatedContext(
          CANDIDATE_UID
        )
        .firestore();

    const applicationId =
      `${CANDIDATE_A}__${JOB_OPEN_B}`;

    await assertFails(
      setDoc(
        doc(
          db,
          "applications",
          applicationId
        ),
        {
          applicationId,

          candidateId:
            CANDIDATE_A,

          jobId:
            JOB_OPEN_B,

          organizationId:
            ORG_B,

          recruiterId:
            RECRUITER_B_UID,

          stage:
            "NEW",

          source:
            "B2C_WEB",

          candidateSnapshot: {
            name:
              "Candidate A",

            phone:
              "010-1111-1111",

            email:
              "candidate-a@example.com",
          },

          jobSnapshot: {
            title:
              "Open Job B",

            company:
              "Company B",
          },

          appliedAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),

          lastActivityAt:
            serverTimestamp(),
        }
      )
    );
  }
);

test(
  "Recruiter cannot change Application stage directly with Client SDK",
  async () => {
    const db =
      testEnv
        .authenticatedContext(
          RECRUITER_A_UID
        )
        .firestore();

    await assertFails(
      updateDoc(
        doc(
          db,
          "applications",
          APPLICATION_A
        ),
        {
          stage:
            "INTERVIEW",

          updatedAt:
            serverTimestamp(),

          lastActivityAt:
            serverTimestamp(),
        }
      )
    );
  }
);

// ============================================================================
// AppEvent
// ============================================================================

test(
  "Client cannot create AppEvent",
  async () => {
    const db =
      testEnv
        .authenticatedContext(
          RECRUITER_A_UID
        )
        .firestore();

    await assertFails(
      setDoc(
        doc(
          db,
          "appEvents",
          "fake-event"
        ),
        {
          eventId:
            "fake-event",

          applicationId:
            APPLICATION_A,

          organizationId:
            ORG_A,

          type:
            "STAGE_CHANGED",

          fromStage:
            "NEW",

          toStage:
            "INTERVIEW",

          changedBy:
            RECRUITER_A_UID,

          createdAt:
            serverTimestamp(),
        }
      )
    );
  }
);

// ============================================================================
// User Authorization Documents
// ============================================================================

test(
  "Client cannot directly read B2B User authorization document",
  async () => {
    const db =
      testEnv
        .authenticatedContext(
          RECRUITER_A_UID
        )
        .firestore();

    await assertFails(
      getDoc(
        doc(
          db,
          "users",
          RECRUITER_A_UID
        )
      )
    );
  }
);

// ============================================================================
// Recruiter Job Access
// ============================================================================

test(
  "Recruiter can read DRAFT job from own organization",
  async () => {
    const db =
      testEnv
        .authenticatedContext(
          RECRUITER_A_UID
        )
        .firestore();

    await assertSucceeds(
      getDoc(
        doc(
          db,
          "jobs",
          JOB_DRAFT_A
        )
      )
    );
  }
);
// ============================================================================
// Phase 1 Rules v4 - Candidate Schema Hardening
// ============================================================================

test(
  "Candidate can update own mutable PII with valid types",
  async () => {
    const db =
      testEnv
        .authenticatedContext(
          CANDIDATE_UID
        )
        .firestore();

    await assertSucceeds(
      updateDoc(
        doc(
          db,
          "candidates",
          CANDIDATE_A
        ),
        {
          name:
            "Candidate A Updated",

          phone:
            "010-9999-1111",

          email:
            "candidate-a-updated@example.com",

          updatedAt:
            serverTimestamp(),
        }
      )
    );
  }
);

test(
  "Candidate creation rejects an injected top-level field",
  async () => {
    const uid =
      "candidate-schema-injection";

    const candidateId =
      "candidate-schema-injection-id";

    const db =
      testEnv
        .authenticatedContext(
          uid
        )
        .firestore();

    await assertFails(
      setDoc(
        doc(
          db,
          "candidates",
          candidateId
        ),
        {
          candidateId,
          authUid:
            uid,
          name:
            "Injected Candidate",
          phone:
            "010-3000-0001",
          email:
            "injection@example.com",
          source:
            "B2C_SELF",
          accountStatus:
            "ACTIVE",
          createdAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
          organizationId:
            "attacker-org",
        }
      )
    );
  }
);

test(
  "Candidate creation rejects B2B_DIRECT source from Client SDK",
  async () => {
    const uid =
      "candidate-source-spoof";

    const candidateId =
      "candidate-source-spoof-id";

    const db =
      testEnv
        .authenticatedContext(
          uid
        )
        .firestore();

    await assertFails(
      setDoc(
        doc(
          db,
          "candidates",
          candidateId
        ),
        {
          candidateId,
          authUid:
            uid,
          name:
            "Source Spoof",
          phone:
            "010-3000-0002",
          email:
            "source-spoof@example.com",
          source:
            "B2B_DIRECT",
          accountStatus:
            "ACTIVE",
          createdAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
        }
      )
    );
  }
);

test(
  "Candidate creation rejects invalid field types",
  async () => {
    const uid =
      "candidate-invalid-type";

    const candidateId =
      "candidate-invalid-type-id";

    const db =
      testEnv
        .authenticatedContext(
          uid
        )
        .firestore();

    await assertFails(
      setDoc(
        doc(
          db,
          "candidates",
          candidateId
        ),
        {
          candidateId,
          authUid:
            uid,
          name:
            1234,
          phone:
            "010-3000-0003",
          email:
            "invalid-type@example.com",
          source:
            "B2C_SELF",
          accountStatus:
            "ACTIVE",
          createdAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
        }
      )
    );
  }
);

test(
  "Candidate update rejects an injected top-level field",
  async () => {
    const db =
      testEnv
        .authenticatedContext(
          CANDIDATE_UID
        )
        .firestore();

    await assertFails(
      updateDoc(
        doc(
          db,
          "candidates",
          CANDIDATE_A
        ),
        {
          organizationId:
            "attacker-org",

          updatedAt:
            serverTimestamp(),
        }
      )
    );
  }
);

test(
  "Candidate update rejects invalid mutable field types",
  async () => {
    const db =
      testEnv
        .authenticatedContext(
          CANDIDATE_UID
        )
        .firestore();

    await assertFails(
      updateDoc(
        doc(
          db,
          "candidates",
          CANDIDATE_A
        ),
        {
          phone:
            10101010,

          updatedAt:
            serverTimestamp(),
        }
      )
    );
  }
);

test(
  "Candidate update cannot change source or accountStatus",
  async () => {
    const db =
      testEnv
        .authenticatedContext(
          CANDIDATE_UID
        )
        .firestore();

    await assertFails(
      updateDoc(
        doc(
          db,
          "candidates",
          CANDIDATE_A
        ),
        {
          source:
            "B2B_DIRECT",

          accountStatus:
            "SUSPENDED",

          updatedAt:
            serverTimestamp(),
        }
      )
    );
  }
);

// ============================================================================
// Phase 1 Rules v4 - Profile Schema Hardening
// ============================================================================

test(
  "Candidate can create own Profile with the exact valid schema",
  async () => {
    const uid =
      "profile-create-owner";

    const candidateId =
      "profile-create-candidate";

    const db =
      testEnv
        .authenticatedContext(
          uid
        )
        .firestore();

    await assertSucceeds(
      setDoc(
        doc(
          db,
          "candidates",
          candidateId
        ),
        {
          candidateId,
          authUid:
            uid,
          name:
            "Profile Owner",
          phone:
            "010-4000-0001",
          email:
            "profile-owner@example.com",
          source:
            "B2C_SELF",
          accountStatus:
            "ACTIVE",
          createdAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
        }
      )
    );

    await assertSucceeds(
      setDoc(
        doc(
          db,
          "profile",
          candidateId
        ),
        {
          candidateId,
          headline:
            "Reception Professional",
          careerSummary:
            "Customer service experience",
          skills: [
            "Customer Service",
          ],
          careers: [],
          education: [],
          profileCompleteness:
            60,
          updatedAt:
            serverTimestamp(),
        }
      )
    );
  }
);

test(
  "Profile creation rejects an injected top-level field",
  async () => {
    const uid =
      "profile-create-injection-owner";

    const candidateId =
      "profile-create-injection-candidate";

    const db =
      testEnv
        .authenticatedContext(
          uid
        )
        .firestore();

    await assertSucceeds(
      setDoc(
        doc(
          db,
          "candidates",
          candidateId
        ),
        {
          candidateId,
          authUid:
            uid,
          name:
            "Profile Injection Owner",
          phone:
            "010-4000-0002",
          email:
            "profile-injection@example.com",
          source:
            "B2C_SELF",
          accountStatus:
            "ACTIVE",
          createdAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
        }
      )
    );

    await assertFails(
      setDoc(
        doc(
          db,
          "profile",
          candidateId
        ),
        {
          candidateId,
          headline:
            "Injected Profile",
          careerSummary:
            "Schema injection test",
          skills: [],
          careers: [],
          education: [],
          profileCompleteness:
            10,
          updatedAt:
            serverTimestamp(),
          organizationId:
            "attacker-org",
        }
      )
    );
  }
);

test(
  "Profile creation rejects non-list career data",
  async () => {
    const uid =
      "profile-create-type-owner";

    const candidateId =
      "profile-create-type-candidate";

    const db =
      testEnv
        .authenticatedContext(
          uid
        )
        .firestore();

    await assertSucceeds(
      setDoc(
        doc(
          db,
          "candidates",
          candidateId
        ),
        {
          candidateId,
          authUid:
            uid,
          name:
            "Profile Type Owner",
          phone:
            "010-4000-0003",
          email:
            "profile-type@example.com",
          source:
            "B2C_SELF",
          accountStatus:
            "ACTIVE",
          createdAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
        }
      )
    );

    await assertFails(
      setDoc(
        doc(
          db,
          "profile",
          candidateId
        ),
        {
          candidateId,
          headline:
            "Invalid Profile",
          careerSummary:
            "Invalid careers type",
          skills: [],
          careers: {
            companyName:
              "Not A List",
          },
          education: [],
          profileCompleteness:
            10,
          updatedAt:
            serverTimestamp(),
        }
      )
    );
  }
);

test(
  "Profile creation rejects completeness outside 0 to 100",
  async () => {
    const uid =
      "profile-create-range-owner";

    const candidateId =
      "profile-create-range-candidate";

    const db =
      testEnv
        .authenticatedContext(
          uid
        )
        .firestore();

    await assertSucceeds(
      setDoc(
        doc(
          db,
          "candidates",
          candidateId
        ),
        {
          candidateId,
          authUid:
            uid,
          name:
            "Profile Range Owner",
          phone:
            "010-4000-0004",
          email:
            "profile-range@example.com",
          source:
            "B2C_SELF",
          accountStatus:
            "ACTIVE",
          createdAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp(),
        }
      )
    );

    await assertFails(
      setDoc(
        doc(
          db,
          "profile",
          candidateId
        ),
        {
          candidateId,
          headline:
            "Invalid Completeness",
          careerSummary:
            "Out of range",
          skills: [],
          careers: [],
          education: [],
          profileCompleteness:
            101,
          updatedAt:
            serverTimestamp(),
        }
      )
    );
  }
);

test(
  "Profile update rejects an injected top-level field",
  async () => {
    const db =
      testEnv
        .authenticatedContext(
          CANDIDATE_UID
        )
        .firestore();

    await assertFails(
      updateDoc(
        doc(
          db,
          "profile",
          CANDIDATE_A
        ),
        {
          organizationId:
            "attacker-org",

          updatedAt:
            serverTimestamp(),
        }
      )
    );
  }
);

test(
  "Profile update rejects candidateId mutation",
  async () => {
    const db =
      testEnv
        .authenticatedContext(
          CANDIDATE_UID
        )
        .firestore();

    await assertFails(
      updateDoc(
        doc(
          db,
          "profile",
          CANDIDATE_A
        ),
        {
          candidateId:
            CANDIDATE_B,

          updatedAt:
            serverTimestamp(),
        }
      )
    );
  }
);

test(
  "Profile update rejects invalid field types",
  async () => {
    const db =
      testEnv
        .authenticatedContext(
          CANDIDATE_UID
        )
        .firestore();

    await assertFails(
      updateDoc(
        doc(
          db,
          "profile",
          CANDIDATE_A
        ),
        {
          skills:
            "not-a-list",

          updatedAt:
            serverTimestamp(),
        }
      )
    );
  }
);

test(
  "Profile update rejects completeness outside 0 to 100",
  async () => {
    const db =
      testEnv
        .authenticatedContext(
          CANDIDATE_UID
        )
        .firestore();

    await assertFails(
      updateDoc(
        doc(
          db,
          "profile",
          CANDIDATE_A
        ),
        {
          profileCompleteness:
            -1,

          updatedAt:
            serverTimestamp(),
        }
      )
    );
  }
);
