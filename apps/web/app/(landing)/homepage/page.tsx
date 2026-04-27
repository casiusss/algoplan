import type { Metadata } from "next";
import { AlgoPlanLanding } from "@/features/landing/components/algoplan-landing";

export const metadata: Metadata = {
  title: "Homepage",
  description:
    "AlgoPlan — open-source platform that turns coding agents into real teammates. Assign tasks, track progress, compound skills.",
  openGraph: {
    title: "AlgoPlan — Project Management for Human + Agent Teams",
    description:
      "Manage your human + agent workforce in one place.",
    url: "/homepage",
  },
  alternates: {
    canonical: "/homepage",
  },
};

export default function HomepagePage() {
  return <AlgoPlanLanding />;
}
