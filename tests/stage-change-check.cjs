const fs = require("fs");

const {
  initializeApp,
  cert,
} = require("firebase-admin/app");

const {
  getFirestore,
} = require("firebase-admin/firestore");

const serviceAccountPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!serviceAccountPath) {
  throw new Error("GOOGLE_APPLICATION_CREDENTIALS_NOT_SET");
}

const serviceAccount =
  JSON.parse(
    fs.readFileSync(
      serviceAccountPath,
      "utf8"
    )
  );

initializeApp({
  credential: cert(serviceAccount),
  projectId: "the-lobby-platform",
});

const applicationId =
  "xnHT4sEYN2wFjOZIEIcP__hansung-yuseong-reception-20260813";

const adminUid =
  "57fzOuVMutNiOlbHadcIQ9KtLj13";

async function run() {
  const db =
    getFirestore();

  const applicationSnapshot =
    await db
      .collection("applications")
      .doc(applicationId)
      .get();

  if (!applicationSnapshot.exists) {
    throw new Error("APPLICATION_NOT_FOUND");
  }

  const application =
    applicationSnapshot.data();

  console.log(
    "APPLICATION_STAGE:",
    application.stage
  );

  console.log(
    "ORGANIZATION_ID:",
    application.organizationId
  );

  const eventsSnapshot =
    await db
      .collection("appEvents")
      .where(
        "applicationId",
        "==",
        applicationId
      )
      .get();

  console.log(
    "APP_EVENT_COUNT:",
    eventsSnapshot.size
  );

  const events =
    eventsSnapshot.docs
      .map((document) => ({
        eventId: document.id,
        ...document.data(),
      }))
      .sort((a, b) => {
        const aTime =
          a.createdAt?.toMillis?.() ?? 0;

        const bTime =
          b.createdAt?.toMillis?.() ?? 0;

        return aTime - bTime;
      });

  for (const event of events) {
    console.log(
      "EVENT:",
      JSON.stringify({
        eventId:
          event.eventId,

        type:
          event.type,

        fromStage:
          event.fromStage ?? null,

        toStage:
          event.toStage ?? null,

        changedBy:
          event.changedBy,

        organizationId:
          event.organizationId ?? null,

        changedByIsAdmin:
          event.changedBy === adminUid,
      })
    );
  }
}

run()
  .then(() => {
    console.log("STAGE_CHANGE_CHECK_FINISHED");
    process.exit(0);
  })
  .catch((error) => {
    console.error(
      "TEST_FAILED:",
      error instanceof Error
        ? error.message
        : error
    );

    process.exit(1);
  });