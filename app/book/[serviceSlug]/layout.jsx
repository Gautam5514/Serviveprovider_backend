import { getServiceBySlug } from "@/lib/services";

export async function generateMetadata({ params }) {
  const { serviceSlug } = await params;
  const svc = getServiceBySlug(serviceSlug);

  if (!svc) {
    return {
      title: "Service Not Found",
    };
  }

  return {
    title: `Book ${svc.name}`,
    description: `Book ${svc.name} online with ServiceMarket. Verified professionals, transparent pricing, and instant confirmation.`,
  };
}

export default function BookServiceLayout({ children }) {
  return <>{children}</>;
}
