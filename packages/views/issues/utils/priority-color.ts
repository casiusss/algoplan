import type { IssuePriority } from "@multica/core/types";
import type { AccentBarColor } from "@multica/ui/components/ui/accent-bar";

export function priorityToAccentColor(p: IssuePriority): AccentBarColor {
  switch (p) {
    case "urgent":
      return "tag-p0";
    case "high":
      return "tag-p1";
    case "medium":
      return "tag-p2";
    case "low":
      return "tag-p3";
    case "none":
      return "muted";
  }
}
