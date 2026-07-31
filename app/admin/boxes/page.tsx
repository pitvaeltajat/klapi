import { permanentRedirect } from 'next/navigation';

// There is one palautuslaatikko, so a page that grouped loans by box was a
// filtered slice of `/loan` in a card wrapper. The "Laatikossa" chip on the
// loan list does that job now. This stub keeps old links and bookmarks working.
export default function BoxesRedirect() {
  permanentRedirect('/loan');
}
