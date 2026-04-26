import type { Metadata } from "next";
import { AboutPageClient } from "@/features/landing/components/about-page-client";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about AlgoPlan — an open-source project management platform for human + agent teams.",
  openGraph: {
    title: "About AlgoPlan",
    description:
      "The story behind AlgoPlan and why we're building project management for human + agent teams.",
    url: "/about",
  },
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return <AboutPageClient />;
}
