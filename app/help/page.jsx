import InfoPageShell from "@/components/InfoPageShell";

export default function HelpCenterPage() {
  return (
    <InfoPageShell
      eyebrow="Support"
      title="Help Center"
      description="Find quick answers for bookings, provider assignment, payment, invoice, ratings, and account support."
      cta={{ label: "My Bookings", href: "/bookings" }}
      secondaryCta={{ label: "Contact Us", href: "/contact" }}
      sections={[
        {
          kicker: "Booking",
          title: "Where can I see my service status?",
          body: "Open My Bookings to see pending, accepted, in-progress, completed, rating, and invoice details for each booking.",
          items: ["Provider assignment appears after acceptance", "Completed bookings can show invoice and rating options", "Use the booking number for support"],
        },
        {
          kicker: "Provider",
          title: "Why is a provider not assigned yet?",
          body: "The platform checks active providers near your service address, category match, availability, and working radius. Assignment happens when an eligible provider accepts.",
          items: ["Keep address accurate", "Use GPS location when possible", "Support can help with delayed matching"],
        },
      ]}
    />
  );
}
