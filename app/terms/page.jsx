import InfoPageShell from "@/components/InfoPageShell";

export default function TermsPage() {
  return (
    <InfoPageShell
      eyebrow="Legal"
      title="Terms of Service"
      description="These terms explain how customers, providers, bookings, payments, ratings, and platform support work on ServiceMarket."
      cta={{ label: "Contact Support", href: "/contact" }}
      sections={[
        {
          kicker: "Bookings",
          title: "Customer responsibilities",
          body: "Customers must provide accurate contact details, service address, issue details, and safe access to the work location.",
          items: ["Pay the agreed amount after completion", "Do not misuse provider contact details", "Raise disputes with booking proof"],
        },
        {
          kicker: "Providers",
          title: "Professional responsibilities",
          body: "Providers must keep profile, location, services, working radius, documents, and availability accurate before accepting jobs.",
          items: ["Accept only jobs that can be completed", "Follow safety and quality standards", "Do not request off-platform payments"],
        },
        {
          kicker: "Platform",
          title: "ServiceMarket role",
          body: "ServiceMarket helps connect customers and providers, track booking status, collect ratings, and generate service records.",
          items: ["Pricing may include service charge, platform fee, and tax", "Support decisions use booking history", "Policies may change as the product improves"],
        },
      ]}
    />
  );
}
