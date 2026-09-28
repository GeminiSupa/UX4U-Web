import { Desk } from "@/components/Desk";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return <Desk>{children}</Desk>;
}
