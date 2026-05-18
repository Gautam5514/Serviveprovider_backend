import InfoPageShell from "@/components/InfoPageShell";

export default function PrivacyPage() {
  return (
    <InfoPageShell
      eyebrow="Legal"
      title="Privacy Policy"
      description="ServiceMarket uses account, booking, location, and service data to run the marketplace, match jobs, protect users, and support completed work."
      cta={{ label: "Contact Support", href: "/contact" }}
      sections={[
        {
          kicker: "Data We Use",
          title: "Account and booking information",
          body: "We use customer and provider details to create accounts, manage bookings, verify providers, send essential updates, and generate invoices.",
          items: ["Name, phone, email, and booking details", "Service address and optional GPS coordinates", "Provider documents and professional profile"],
        },
        {
          kicker: "Location",
          title: "Provider and customer location",
          body: "Location is used for nearby provider matching, service area accuracy, route planning, and customer support for active bookings.",
          items: ["Providers can update current location", "Customers provide service address per booking", "Location improves job matching accuracy"],
        },
        {
          kicker: "Control",
          title: "Support and data questions",
          body: "For privacy questions, account corrections, or booking data concerns, contact support with your registered phone and booking reference.",
          items: ["Email support for corrections", "Keep login details private", "Use verified channels for support"],
        },
      ]}
    />
  );
}
