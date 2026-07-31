import { permanentRedirect } from 'next/navigation';

// Item announcements and loan reports were two pages describing two halves of
// one workflow. They are now one feature — "huomiot" — at `/notices`. This stub
// keeps old links and bookmarks working.
export default function AnnouncementsRedirect() {
  permanentRedirect('/notices');
}
