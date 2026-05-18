import { CATEGORY_META } from "@/lib/services";

export async function generateMetadata({ params }) {
  const { category } = await params;
  const meta = CATEGORY_META[category];

  if (!meta) {
    return {
      title: "Service Category Not Found",
    };
  }

  return {
    title: meta.label,
    description: meta.description || `Browse and book professional ${meta.label} services on ServiceMarket.`,
  };
}

export default function ServiceCategoryLayout({ children }) {
  return <>{children}</>;
}
