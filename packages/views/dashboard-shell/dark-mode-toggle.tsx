"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@multica/ui/components/ui/button";
import { useTheme } from "@multica/ui/components/common/theme-provider";

/**
 * Hydration-safe Sun/Moon theme toggle. Pre-mount the icon defaults to Moon
 * (light-default assumption) and the aria-label is the generic "Toggle theme"
 * so screen readers don't announce the wrong directional action before the
 * client hydrates and `next-themes` resolves the actual theme.
 */
export function DarkModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";
  const Icon = isDark ? Sun : Moon;
  const label = mounted
    ? isDark
      ? "Switch to light mode"
      : "Switch to dark mode"
    : "Toggle theme";

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Icon className="size-4" />
    </Button>
  );
}
