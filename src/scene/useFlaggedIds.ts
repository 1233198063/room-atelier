import { useMemo } from "react";
import { selectIssues, useEditor } from "../store/editorStore";

/** Ids of furniture and openings involved in a layout warning (tips don't get highlighted). */
export function useFlaggedIds(): Set<string> {
  const issues = useEditor(selectIssues);
  return useMemo(
    () => new Set(issues.filter((i) => i.severity === "warning").flatMap((i) => i.targets)),
    [issues],
  );
}
