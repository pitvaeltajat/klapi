import { permanentRedirect } from 'next/navigation';

// The admin report queue is no longer a separate feature: it is the untriaged
// half of "huomiot" and lives at `/notices`, above the published ones.
export default function ReportsRedirect() {
  permanentRedirect('/notices');
}
