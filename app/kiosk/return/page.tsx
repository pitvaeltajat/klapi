import { permanentRedirect } from 'next/navigation';

// Returning is not a kiosk-only flow — everyone returns their own loans from
// their own phone too — so the page now lives at `/return`. This stub keeps
// the kiosk's saved shortcut and any bookmarks working.
export default function KioskReturnRedirect() {
  permanentRedirect('/return');
}
