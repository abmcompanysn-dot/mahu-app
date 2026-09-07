import { EnterprisePortalShell } from "@/components/enterprise-portal/enterprise-portal-shell"

export default function EnterprisePortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <EnterprisePortalShell>{children}</EnterprisePortalShell>
}
