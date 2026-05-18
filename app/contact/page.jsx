import InfoPageShell from "@/components/InfoPageShell";

export default function ContactPage() {
  return (
    <InfoPageShell
      eyebrow="Contact"
      title="Talk to ServiceMarket support."
      description="For booking help, provider onboarding, invoices, ratings, or service complaints, contact support with your booking number and registered phone."
      cta={{ label: "My Bookings", href: "/bookings" }}
      sections={[
        {
          kicker: "Customer Support",
          title: "Booking and service help",
          body: "Use your booking number when asking about assignment, job progress, invoice, payment, or rating issues.",
          items: ["Email: support@servicemarket.local", "Phone: +91 90000 00000", "Hours: 9:00 AM to 8:00 PM"],
        },
        {
          kicker: "Provider Support",
          title: "Onboarding and job help",
          body: "Providers can contact support for profile approval, documents, location update, job matching, payout, and rating questions.",
          items: ["Keep GPS location updated", "Check service category and working radius", "Use the provider dashboard for active jobs"],
        },
      ]}
    />
  );
}
