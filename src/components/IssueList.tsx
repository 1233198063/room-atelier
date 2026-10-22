import { CircleCheck, Lightbulb, TriangleAlert } from "lucide-react";
import type { Issue } from "../lib/layoutChecks";
import { useEditor } from "../store/editorStore";

interface IssueListProps {
  issues: Issue[];
  /** Shown when there's nothing to report; omit to render nothing instead. */
  emptyText?: string;
}

/**
 * Layout check results. Clicking an issue selects the piece involved — or the
 * other piece, if that one is already selected — so you can jump straight to
 * the thing that needs moving.
 */
export function IssueList({ issues, emptyText }: IssueListProps) {
  const selectedId = useEditor((s) => s.selectedId);
  const select = useEditor((s) => s.select);

  if (issues.length === 0) {
    return emptyText ? (
      <p className="issues-empty">
        <CircleCheck size={15} strokeWidth={1.8} /> {emptyText}
      </p>
    ) : null;
  }

  return (
    <ul className="issues">
      {issues.map((issue) => {
        const target = issue.targets.find((id) => id !== selectedId) ?? null;
        const Icon = issue.severity === "warning" ? TriangleAlert : Lightbulb;
        return (
          <li key={issue.key}>
            <button
              type="button"
              className={`issue issue--${issue.severity}`}
              onClick={() => target && select(target)}
              disabled={!target}
            >
              <Icon className="issue__icon" size={15} strokeWidth={1.9} />
              <span className="issue__text">
                <span className="issue__title">{issue.title}</span>
                <span className="issue__detail">{issue.detail}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
