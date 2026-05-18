import ProviderLayoutClient from "./ProviderLayoutClient";

export const metadata = {
  title: "Provider Dashboard",
  description: "Manage your ServiceMarket profile, bookings, and earnings.",
};

export default function ProviderLayout({ children }) {
  return <ProviderLayoutClient>{children}</ProviderLayoutClient>;
}
