'use client';

import { useSession, signOut } from 'next-auth/react';
import LoanCard from '@/components/LoanCard';
import Breadcrumbs from '@/components/Breadcrumbs';
import PendingPickupBanner from '@/components/PendingPickupBanner';
import type { Loan, User, ReportCreated, ReportStatus, ReservationStatus } from '@prisma/client';
import { useState, useSyncExternalStore } from 'react';
import React from 'react';
import { LuTriangleAlert } from 'react-icons/lu';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface Report {
  id: string;
  content: string;
  createdAt: Date | string;
  created: ReportCreated;
  status: ReportStatus;
}

interface LoanWithUser extends Loan {
  user: User;
  reservations: {
    status: ReservationStatus;
    item: {
      id: string;
      name: string;
    };
  }[];
  reports: Report[];
}

interface AccountViewProps {
  loans: LoanWithUser[];
  userEmailPreferences: {
    emailWeeklyReminder: boolean;
    emailNewLoanNotification: boolean;
    emailExpiringReminder: boolean;
    emailOldBoxNotification: boolean;
    emailOverdueNotification: boolean;
  };
}

/** How many loan cards to render at once — the rest are a click away. */
const PAGE_SIZE = 10;

export default function AccountView({ loans, userEmailPreferences }: AccountViewProps) {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();

  const [emailWeeklyReminder, setEmailWeeklyReminder] = useState(
    userEmailPreferences.emailWeeklyReminder,
  );
  const [emailNewLoanNotification, setEmailNewLoanNotification] = useState(
    userEmailPreferences.emailNewLoanNotification,
  );
  const [emailExpiringReminder, setEmailExpiringReminder] = useState(
    userEmailPreferences.emailExpiringReminder,
  );
  const [emailOldBoxNotification, setEmailOldBoxNotification] = useState(
    userEmailPreferences.emailOldBoxNotification,
  );
  const [emailOverdueNotification, setEmailOverdueNotification] = useState(
    userEmailPreferences.emailOverdueNotification,
  );

  const [signOutOpen, setSignOutOpen] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const handleEmailPreferenceChange = async (
    preference: 'weekly' | 'newLoan' | 'expiring' | 'oldBox' | 'overdue',
    value: boolean,
  ) => {
    const setters = {
      weekly: setEmailWeeklyReminder,
      newLoan: setEmailNewLoanNotification,
      expiring: setEmailExpiringReminder,
      oldBox: setEmailOldBoxNotification,
      overdue: setEmailOverdueNotification,
    } as const;
    const previous = {
      weekly: emailWeeklyReminder,
      newLoan: emailNewLoanNotification,
      expiring: emailExpiringReminder,
      oldBox: emailOldBoxNotification,
      overdue: emailOverdueNotification,
    }[preference];

    setters[preference](value);

    try {
      const response = await fetch('/api/user/updateEmailPreferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailWeeklyReminder: preference === 'weekly' ? value : emailWeeklyReminder,
          emailNewLoanNotification: preference === 'newLoan' ? value : emailNewLoanNotification,
          emailExpiringReminder: preference === 'expiring' ? value : emailExpiringReminder,
          emailOldBoxNotification: preference === 'oldBox' ? value : emailOldBoxNotification,
          emailOverdueNotification: preference === 'overdue' ? value : emailOverdueNotification,
        }),
      });

      if (!response.ok) throw new Error('Failed to update preferences');
    } catch (error) {
      console.error('Error updating email preferences:', error);
      setters[preference](previous);
    }
  };

  const handleSignOut = () => {
    if (session && session.user.group === 'KIOSK') {
      setSignOutOpen(true);
      return;
    }
    signOut();
  };

  if (!session) return null;

  const effectiveGroup = session?.user?.group;

  return (
    <>
      <Breadcrumbs items={[{ label: 'Oma tili' }]} />
      <h1 className="mb-6 text-3xl font-semibold">Oma tili</h1>

      <PendingPickupBanner />

      <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kaluston koneen uloskirjautuminen</DialogTitle>
          </DialogHeader>
          <p>
            Olet kirjautumassa ulos kaluston koneen käyttäjältä. Tätä ei yleensä pitäisi tehdä
            jotta myös seuraava käyttäjä voi käyttää laitetta normaalisti. Haluatko varmasti
            kirjautua ulos?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignOutOpen(false)}>
              Peruuta
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                signOut();
                setSignOutOpen(false);
              }}
              className="gap-2"
            >
              <LuTriangleAlert />
              Kirjaudu ulos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-6">
        <div className="rounded-md border bg-card p-6 shadow-xs">
          <div className="flex flex-col items-start gap-3">
            <h2 className="text-2xl font-semibold">{session?.user?.name}</h2>
            <p className="text-muted-foreground">{session?.user?.email}</p>
            <p className="text-sm text-muted-foreground">
              Rooli:{' '}
              {effectiveGroup === 'USER'
                ? 'Käyttäjä'
                : effectiveGroup === 'KIOSK'
                  ? 'Kaluston kone'
                  : 'Admin'}
            </p>
            {session?.user?.group === 'KIOSK' && effectiveGroup === 'ADMIN' && (
              <p className="mt-1 text-xs text-success">
                ADMIN-oikeudet käytössä (tähän sessioon)
              </p>
            )}
          </div>
          <hr className="my-4" />
          <Button variant="destructive" onClick={handleSignOut}>
            Kirjaudu ulos
          </Button>
        </div>

        <div className="rounded-md border bg-card p-6 shadow-xs">
          <h2 className="mb-4 text-xl font-semibold">Sähköposti-ilmoitukset</h2>
          <div className="flex flex-col items-start gap-4">
            {session?.user?.group === 'ADMIN' ? (
              <>
                <PrefRow
                  title="Uudet lainat"
                  description="Ilmoitukset uusista lainoista (myös kiosk-käytöstä)"
                  checked={emailNewLoanNotification}
                  onCheckedChange={(v) => handleEmailPreferenceChange('newLoan', v)}
                />
                <PrefRow
                  title="Viikottaiset muistutukset vanhoista bokseista"
                  description="Muistutukset lainoista, jotka ovat olleet boksissa yli viikon"
                  checked={emailOldBoxNotification}
                  onCheckedChange={(v) => handleEmailPreferenceChange('oldBox', v)}
                />
                <PrefRow
                  title="Myöhässä olevat lainat"
                  description="Ilmoitukset lainoista, joiden palautusaika on ylittynyt"
                  checked={emailOverdueNotification}
                  onCheckedChange={(v) => handleEmailPreferenceChange('overdue', v)}
                />
              </>
            ) : (
              <>
                <PrefRow
                  title="Ilmoitukset uusista lainoista"
                  description="Sähköpostit kun sinulle luodaan uusi laina"
                  checked={emailNewLoanNotification}
                  onCheckedChange={(v) => handleEmailPreferenceChange('newLoan', v)}
                />
                <PrefRow
                  title="Muistutukset lainoista"
                  description="Muistutus noutopäivästä ja myöhässä olevista lainoista"
                  checked={emailWeeklyReminder}
                  onCheckedChange={(v) => handleEmailPreferenceChange('weekly', v)}
                />
                <PrefRow
                  title="Muistutus lainan päättymisestä"
                  description="Muistutus päivää ennen palautuspäivää (oletuksena pois päältä)"
                  checked={emailExpiringReminder}
                  onCheckedChange={(v) => handleEmailPreferenceChange('expiring', v)}
                />
              </>
            )}
          </div>
        </div>

        <div className="rounded-md border bg-card p-6 shadow-xs">
          <h2 className="mb-4 text-xl font-semibold">Ulkoasu</h2>
          <div className="flex flex-col items-start gap-4">
            <div>
              <p className="text-sm font-medium">Teema</p>
              <p className="text-xs text-muted-foreground">Valitse sovelluksen väritila</p>
            </div>
            {mounted && (
              <div role="radiogroup" className="flex gap-4">
                {[
                  { value: 'light', label: 'Vaalea' },
                  { value: 'dark', label: 'Tumma' },
                  { value: 'system', label: 'Järjestelmä' },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="theme"
                      value={opt.value}
                      checked={theme === opt.value}
                      onChange={() => setTheme(opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {session?.user?.group !== 'KIOSK' && (
          <div>
            <h2 className="mb-4 text-xl font-semibold">Oma lainahistoria</h2>
            {loans.length > 0 ? (
              <>
                <div className="flex flex-col gap-4">
                  {loans.slice(0, visibleCount).map((loan) => (
                    <LoanCard key={loan.id} loan={loan} />
                  ))}
                </div>
                {loans.length > visibleCount && (
                  <div className="mt-4 flex flex-col items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      Näytetään {visibleCount} / {loans.length} lainaa
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                    >
                      Näytä lisää
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <p className="py-8 text-center text-muted-foreground">Ei lainoja</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function PrefRow({
  title,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}
