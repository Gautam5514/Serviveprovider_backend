import InfoPageShell from "@/components/InfoPageShell";

export default function HowItWorksPage() {
  return (
    <InfoPageShell
      eyebrow="How It Works"
      title="Book, match, track, and pay after the work is done."
      description="The flow is simple for customers and practical for providers: choose a service, pick a slot, get matched with an available nearby professional, then track the job."
      cta={{ label: "Start Booking", href: "/services/ac" }}
      sections={[
        {
          kicker: "Step 01",
          title: "Choose the right service",
          body: "Search or browse service categories, compare upfront pricing, and select the repair, installation, or maintenance work you need.",
          items: ["AC, cooler, fan, fridge, TV, electrical, and appliance services", "Transparent platform fee and tax", "Cash on delivery support"],
        },
        {
          kicker: "Step 02",
          title: "Provider receives nearby job alert",
          body: "The booking is shown to eligible active providers in the same service area and working radius. Once one provider accepts, it moves away from the rest.",
          items: ["Location-based matching", "Live provider acceptance", "Customer receives booking progress updates"],
        },
        {
          kicker: "Step 03",
          title: "Complete, rate, and keep invoice proof",
          body: "After completion, the customer can rate the provider and keep the invoice in booking history. A PDF invoice can also be emailed.",
          items: ["Provider rating", "Invoice record", "Support-ready booking proof"],
        },
      ]}
    />
  );
}
