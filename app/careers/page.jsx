import InfoPageShell from "@/components/InfoPageShell";

export default function CareersPage() {
  return (
    <InfoPageShell
      eyebrow="Careers"
      title="Build the operating system for local home services."
      description="We are shaping a marketplace where customers get dependable service and professionals get cleaner access to nearby work."
      cta={{ label: "Contact Team", href: "/contact" }}
      sections={[
        {
          kicker: "Teams",
          title: "Roles we care about",
          body: "We look for practical builders who can improve reliability, provider operations, customer experience, support, and marketplace quality.",
          items: ["Frontend and product engineering", "Backend, real-time systems, and payments", "Provider operations and city launches"],
        },
        {
          kicker: "Culture",
          title: "Work on real customer problems",
          body: "The product is used for urgent home repairs, scheduled installations, provider earnings, and customer trust. Every improvement has visible impact.",
          items: ["High ownership", "Fast feedback from real bookings", "Quality-first execution"],
        },
      ]}
    />
  );
}
