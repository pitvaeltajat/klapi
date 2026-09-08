import { permanentRedirect } from 'next/navigation';

// There is one loan edit page now, at `/loan/[id]/edit`, with the admin-only
// controls gated inside it. This stub keeps old links and bookmarks working.
export default async function EditLoanRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  permanentRedirect(`/loan/${id}/edit`);
}
