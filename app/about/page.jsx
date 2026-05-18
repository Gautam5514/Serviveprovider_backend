import InfoPageShell from "@/components/InfoPageShell";

export default function AboutPage() {
  return (
    <InfoPageShell
      eyebrow="Company"
      title="Expert home service, built around trust."
      description="ServiceMarket connects customers with verified local professionals for AC, fridge, fan, TV, electrical, cooler, and appliance work."
      cta={{ label: "Book Service", href: "/services/ac" }}
      secondaryCta={{ label: "Join Provider", href: "/provider" }}
      sections={[
        {
          kicker: "Mission",
          title: "Clear pricing and reliable professionals",
          body: "Customers see the service, price, schedule, and booking status before work starts. Providers get nearby jobs that match their services and working radius.",
          items: ["Verified provider onboarding", "Location-aware job matching", "Transparent payment and invoice records"],
        },
        {
          kicker: "Quality",
          title: "Every booking has a trackable workflow",
          body: "From booking creation to provider acceptance, work progress, completion, rating, and invoice, the platform keeps the customer and provider aligned.",
          items: ["Real-time job notifications", "Customer booking history", "Provider ratings and reviews"],
        },
      ]}
    />
  );
}
