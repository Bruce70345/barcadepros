import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

export type AdminEnvMeta = {
  usingJson: boolean;
  hasProjectId: boolean;
  hasClientEmail: boolean;
  privateKeyLength: number;
};

export function getAdminEnvMeta(): AdminEnvMeta {
  const usingJson = !!process.env.FIREBASE_ADMIN_JSON;
  if (usingJson) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_ADMIN_JSON || "{}");
      return {
        usingJson: true,
        hasProjectId: !!parsed.project_id,
        hasClientEmail: !!parsed.client_email,
        privateKeyLength: (parsed.private_key || "").length,
      };
    } catch {
      return {
        usingJson: true,
        hasProjectId: false,
        hasClientEmail: false,
        privateKeyLength: 0,
      };
    }
  }

  return {
    usingJson: false,
    hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
    hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    privateKeyLength: (process.env.FIREBASE_PRIVATE_KEY || "").length,
  };
}

function loadServiceAccount(): ServiceAccount {
  if (process.env.FIREBASE_ADMIN_JSON) {
    const raw = process.env.FIREBASE_ADMIN_JSON;
    const parsed = JSON.parse(raw);
    return {
      project_id: parsed.project_id,
      client_email: parsed.client_email,
      private_key: parsed.private_key,
    };
  }

  return {
    project_id: process.env.FIREBASE_PROJECT_ID || "",
    client_email: process.env.FIREBASE_CLIENT_EMAIL || "",
    private_key: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  };
}

export function getAdminMessaging() {
  if (!getApps().length) {
    const sa = loadServiceAccount();
    if (!sa.project_id || !sa.client_email || !sa.private_key) {
      throw new Error(
        "Missing Firebase Admin credentials. Set FIREBASE_ADMIN_JSON or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY."
      );
    }
    initializeApp({
      credential: cert({
        projectId: sa.project_id,
        clientEmail: sa.client_email,
        privateKey: sa.private_key,
      }),
    });
  }

  return getMessaging();
}
