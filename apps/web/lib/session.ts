import type { Entry, ScanResponse } from "./types";

// Module-level session state. Survives client-side navigation between routes,
// which is how the picked files travel from / to /loading to /convert.
export const session: {
  files: File[];
  entries: Entry[];
  scan: ScanResponse | null;
  target: "kaggle" | "colab";
  notebookName: string;
} = { files: [], entries: [], scan: null, target: "kaggle", notebookName: "" };

export function resetSession() {
  session.files = [];
  session.entries = [];
  session.scan = null;
}
