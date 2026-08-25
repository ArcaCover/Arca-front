import {
  AlertTriangle,
  Eye,
  GraduationCap,
  Lock,
  Shield,
  Wrench,
  type LucideIcon,
} from "lucide-react";

// The six scoring domains. Keyed by the string the API sends, with a fallback
// so an unknown domain renders as a plain pill instead of crashing the card.
const DOMAIN_ICONS: Record<string, LucideIcon> = {
  governance: Shield,
  tools: Wrench,
  oversight: Eye,
  data_protection: Lock,
  training: GraduationCap,
  incident_preparedness: AlertTriangle,
};

export default function DomainIndicator({
  domain,
  domain_label,
}: {
  domain: string;
  domain_label: string;
}) {
  const Icon = DOMAIN_ICONS[domain] ?? Shield;

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-bruma px-4 py-1.5 font-heading text-xs font-semibold tracking-wide text-marino">
      <Icon className="h-3.5 w-3.5 text-cielo" strokeWidth={2.25} aria-hidden />
      {domain_label}
    </span>
  );
}
