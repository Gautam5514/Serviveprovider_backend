import InfoPageShell from "@/components/InfoPageShell";

export default function BlogPage() {
  return (
    <InfoPageShell
      eyebrow="Blog"
      title="Service guides for better home maintenance."
      description="Read practical guidance for AC care, electrical safety, appliance repair decisions, and how to choose verified professionals."
      cta={{ label: "Explore Services", href: "/services/ac" }}
      sections={[
        {
          kicker: "Guide",
          title: "When should you service an AC?",
          body: "Most homes should schedule AC cleaning before heavy summer use. Weak cooling, water leakage, unusual noise, and high electricity bills are early warning signs.",
          items: ["Clean filters regularly", "Check gas pressure only with a trained technician", "Book deep cleaning before peak season"],
        },
        {
          kicker: "Guide",
          title: "How to prepare for appliance repair",
          body: "Keep the model details, issue description, and previous repair history ready. Clear access to the appliance helps the provider finish faster.",
          items: ["Share symptoms clearly", "Keep invoice proof", "Rate the provider after completion"],
        },
      ]}
    />
  );
}
