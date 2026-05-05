'use client';

import { FaBars } from 'react-icons/fa';
import NextLink from 'next/link';
import { useSession } from 'next-auth/react';
import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { useDates } from '@/contexts/DatesContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { PinInput } from '@/components/ui/pin-input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';

export default function TopBar({ children }: { children: ReactNode }) {
  const { data: session, update } = useSession();
  useEffect(() => {
    if (
      session?.user &&
      session.user.group === 'ADMIN' &&
      session.user.adminExpiry &&
      Date.now() >=
        (typeof session.user.adminExpiry === 'string'
          ? Date.parse(session.user.adminExpiry)
          : session.user.adminExpiry)
    ) {
      update({ user: { ...session.user, group: 'KIOSK', adminExpiry: null } });
    }
  }, [session?.user, update]);
  const role = session?.user?.group;
  const [adminSwitchLoading, setAdminSwitchLoading] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const effectiveGroup = session?.user?.group;
  const [expiry, setExpiry] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number>(0);

  const derivedExpiry =
    session?.user && 'adminExpiry' in session.user && session.user.adminExpiry
      ? typeof session.user.adminExpiry === 'string'
        ? Date.parse(session.user.adminExpiry)
        : session.user.adminExpiry
      : null;

  if (derivedExpiry !== expiry) {
    setExpiry(derivedExpiry);
  }

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- timer countdown */
  useEffect(() => {
    if (!expiry || effectiveGroup !== 'ADMIN') {
      if (remaining !== 0) setRemaining(0);
      return;
    }
    const update = () => {
      setRemaining(Math.max(0, Math.floor((expiry - Date.now()) / 1000)));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiry, effectiveGroup]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  const handleAdminSwitch = async (checked: boolean) => {
    if (checked) {
      setPinDialogOpen(true);
      setPinInput('');
      setPinError('');
    } else {
      setAdminSwitchLoading(true);
      await update({ user: { ...session?.user, group: 'KIOSK', adminExpiry: null } });
      setAdminSwitchLoading(false);
    }
  };

  const comparePins = async (inputPin: string) => {
    return await fetch('/api/auth/validatePin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: inputPin }),
    })
      .then((res) => res.json())
      .then((data) => data.isValidPin);
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await comparePins(pinInput)) {
      setAdminSwitchLoading(true);
      const expiryDate = new Date(Date.now() + 30 * 60 * 1000);
      await update({
        user: { ...session?.user, group: 'ADMIN', adminExpiry: expiryDate.toISOString() },
      });
      setPinDialogOpen(false);
      setPinError('');
      setAdminSwitchLoading(false);
    } else {
      setPinError('Väärä PIN-koodi');
    }
  };

  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null;
    function checkAndRevert() {
      if (effectiveGroup === 'ADMIN' && expiry && Date.now() >= expiry) {
        update({ user: { ...session?.user, group: 'KIOSK', adminExpiry: null } });
      }
    }
    if (effectiveGroup === 'ADMIN' && expiry && Date.now() < expiry) {
      timeout = setTimeout(() => {
        update({ user: { ...session?.user, group: 'KIOSK', adminExpiry: null } });
      }, expiry - Date.now());
      document.addEventListener('visibilitychange', checkAndRevert);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
      document.removeEventListener('visibilitychange', checkAndRevert);
    };
  }, [effectiveGroup, expiry, session, update]);

  const [isOpen, setIsOpen] = useState(false);
  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);

  const router = useRouter();
  const pathname = usePathname();

  const {
    state: { items },
  } = useCart();
  const { state: dates, setBrowseMode, setDatesSet } = useDates();
  const totalItems = items.reduce((sum, item) => sum + item.amount, 0);

  const handleBrowseClick = () => {
    setBrowseMode(true);
    setDatesSet(false);
    if (pathname !== '/') {
      router.push('/');
    }
  };

  const handleReserveClick = () => {
    setBrowseMode(false);
  };

  const isOnRoot = pathname === '/';
  const isLainaaActive = isOnRoot && !dates.browseMode;
  const isKamatActive = isOnRoot && dates.browseMode;
  const isPathActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const linkClass = (active: boolean) =>
    `font-medium text-white transition ${active ? 'font-bold underline underline-offset-4 decoration-2' : 'hover:underline'}`;

  const navLinks = [
    { href: '/', label: 'Lainaa', onClick: handleReserveClick },
    ...(role === 'ADMIN' || role === 'KIOSK'
      ? [{ href: '/kiosk/return', label: 'Palauta' }]
      : []),
  ];

  const browseLink = (
    <button
      type="button"
      onClick={() => {
        handleBrowseClick();
      }}
      className={`cursor-pointer ${linkClass(isKamatActive)}`}
    >
      Kamat
    </button>
  );

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-1000 bg-[rgba(66,131,209,0.9)] shadow-xs backdrop-blur-xs dark:bg-[rgba(26,32,44,0.95)]">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between text-white">
            <div className="flex items-center gap-4">
              {session && (
                <Button
                  aria-label="open menu"
                  variant="ghost"
                  size="icon"
                  onClick={isOpen ? onClose : onOpen}
                  className="text-white hover:bg-white/30 active:bg-white/40 md:hidden"
                >
                  <FaBars />
                </Button>
              )}

              <div className="flex items-center text-2xl font-semibold leading-none tracking-[0.02em] transition-transform hover:scale-105">
                <NextLink href="/" aria-label="KLAPI">
                  KLAPI
                </NextLink>
              </div>
              {session && (role === 'KIOSK' || (role === 'ADMIN' && session.user.adminExpiry)) && (
                <div className="ml-4 flex items-center gap-2">
                  <span className="text-sm text-white">ADMIN</span>
                  <Switch
                    checked={effectiveGroup === 'ADMIN'}
                    onCheckedChange={handleAdminSwitch}
                    aria-label="Vaihda admin-oikeudet"
                  />
                  {effectiveGroup === 'ADMIN' && expiry && (
                    <span className="ml-1 min-w-[60px] text-xs">
                      {Math.floor(remaining / 60)}:{(remaining % 60).toString().padStart(2, '0')}
                    </span>
                  )}
                </div>
              )}
            </div>

            <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Anna admin-PIN</DialogTitle>
                </DialogHeader>
                <form onSubmit={handlePinSubmit}>
                  <div className="flex justify-center">
                    <PinInput type="number" value={pinInput} onChange={setPinInput} />
                  </div>
                  {pinError && <p className="mt-2 text-destructive">{pinError}</p>}
                  <DialogFooter className="mt-4">
                    <Button type="button" variant="secondary" onClick={() => setPinDialogOpen(false)}>
                      Peruuta
                    </Button>
                    <Button type="submit" disabled={adminSwitchLoading}>
                      Korota adminiksi
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {session && (
            <div className="hidden items-center gap-6 md:flex">
              <NextLink href="/" className={linkClass(isLainaaActive)} onClick={handleReserveClick}>
                Lainaa
              </NextLink>
              {(role === 'ADMIN' || role === 'KIOSK') && (
                <NextLink href="/kiosk/return" className={linkClass(isPathActive('/kiosk/return'))}>
                  Palauta
                </NextLink>
              )}
              <div className="h-6 w-px bg-white/30" />
              {browseLink}
              <NextLink
                href="/item/announcements"
                className={linkClass(isPathActive('/item/announcements'))}
              >
                Ilmoitukset
              </NextLink>
              {(role === 'ADMIN' || role === 'KIOSK') && (
                <NextLink href="/loan" className={linkClass(isPathActive('/loan'))}>
                  Lainat
                </NextLink>
              )}
              {role === 'ADMIN' && (
                <>
                  <NextLink href="/admin/boxes" className={linkClass(isPathActive('/admin/boxes'))}>
                    Laatikot
                  </NextLink>
                  <NextLink href="/admin/reports" className={linkClass(isPathActive('/admin/reports'))}>
                    Raportit
                  </NextLink>
                  <div className="h-6 w-px bg-white/30" />
                  <NextLink
                    href="/admin"
                    className={linkClass(pathname === '/admin')}
                  >
                    Admin
                  </NextLink>
                </>
              )}
              <div className="relative flex items-center">
                <NextLink
                  href="/account"
                  className={`mr-6 ${linkClass(isPathActive('/account'))}`}
                >
                  Oma tili
                </NextLink>
                {children}
                {totalItems > 0 && (
                  <span className="absolute -right-3 -top-3 mt-[5px] flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-sm font-bold text-white shadow-md">
                    {totalItems}
                  </span>
                )}
              </div>
            </div>
            )}

            {session && (
              <div className="relative md:hidden">
                {children}
                {totalItems > 0 && (
                  <span className="absolute -right-3 -top-3 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-sm font-bold text-white shadow-md">
                    {totalItems}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="h-16" />
      <Drawer open={isOpen} onOpenChange={(o) => (o ? onOpen() : onClose())}>
        <DrawerContent side="top" className="pt-16">
          <nav className="flex flex-col divide-y">
            {navLinks.map((l) => {
              const active = l.href === '/' ? isLainaaActive : isPathActive(l.href);
              return (
                <NextLink
                  key={l.href}
                  href={l.href}
                  onClick={() => {
                    l.onClick?.();
                    onClose();
                  }}
                  className={`px-6 py-4 ${active ? 'font-bold' : ''}`}
                >
                  {l.label}
                </NextLink>
              );
            })}
            <button
              type="button"
              onClick={() => {
                handleBrowseClick();
                onClose();
              }}
              className={`cursor-pointer px-6 py-4 text-left ${isKamatActive ? 'font-bold' : ''}`}
            >
              Kamat
            </button>
            <NextLink
              href="/item/announcements"
              onClick={onClose}
              className={`px-6 py-4 ${isPathActive('/item/announcements') ? 'font-bold' : ''}`}
            >
              Ilmoitukset
            </NextLink>
            {(role === 'ADMIN' || role === 'KIOSK') && (
              <NextLink
                href="/loan"
                onClick={onClose}
                className={`px-6 py-4 ${isPathActive('/loan') ? 'font-bold' : ''}`}
              >
                Lainat
              </NextLink>
            )}
            {role === 'ADMIN' && (
              <>
                <NextLink
                  href="/admin/boxes"
                  onClick={onClose}
                  className={`px-6 py-4 ${isPathActive('/admin/boxes') ? 'font-bold' : ''}`}
                >
                  Laatikot
                </NextLink>
                <NextLink
                  href="/admin/reports"
                  onClick={onClose}
                  className={`px-6 py-4 ${isPathActive('/admin/reports') ? 'font-bold' : ''}`}
                >
                  Raportit
                </NextLink>
                <NextLink
                  href="/admin"
                  onClick={onClose}
                  className={`px-6 py-4 ${pathname === '/admin' ? 'font-bold' : ''}`}
                >
                  Admin
                </NextLink>
              </>
            )}
            <NextLink
              href="/account"
              onClick={onClose}
              className={`px-6 py-4 ${isPathActive('/account') ? 'font-bold' : ''}`}
            >
              Oma tili
            </NextLink>
          </nav>
        </DrawerContent>
      </Drawer>
    </>
  );
}
