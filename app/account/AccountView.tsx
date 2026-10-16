'use client';

import { useSession, signOut } from 'next-auth/react';
import LoanCard from '@/components/LoanCard';
import Breadcrumbs from '@/components/Breadcrumbs';
import PendingPickupBanner from '@/components/PendingPickupBanner';
import type { Loan, User, ReportCreated, ReportStatus, ReservationStatus } from '@prisma/client';
import { useState, useSyncExternalStore } from 'react';
import React from 'react';
import { TriangleAlert } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardTitle, SectionTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

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
    amount: number;
    item: {
      id: string;
      name: string;
    };
  }[];
  reports: Report[];
}

interface AccountViewProps {
  loans: LoanWithUser[];
  notificationPreferences: {
    emailWeeklyReminder: boolean;
    emailNewLoanNotification: boolean;
    emailLoanConfirmation: boolean;
    emailExpiringReminder: boolean;
    emailOldBoxNotification: boolean;
    emailOverdueNotification: boolean;
  };
}

/** How many loan cards to render at once — the rest are a click away. */
const PAGE_SIZE = 10;

export default function AccountView({ loans, notificationPreferences }: AccountViewProps) {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();

  const [emailWeeklyReminder, setEmailWeeklyReminder] = useState(
    notificationPreferences.emailWeeklyReminder,
  );
  const [emailNewLoanNotification, setEmailNewLoanNotification] = useState(
    notificationPreferences.emailNewLoanNotification,
  );
  const [emailExpiringReminder, setEmailExpiringReminder] = useState(
    notificationPreferences.emailExpiringReminder,
  );
  const [emailOldBoxNotification, setEmailOldBoxNotification] = useState(
    notificationPreferences.emailOldBoxNotification,
  );
  const [emailOverdueNotification, setEmailOverdueNotification] = useState(
    notificationPreferences.emailOverdueNotification,
  );
  const [emailLoanConfirmation, setEmailLoanConfirmation] = useState(
    notificationPreferences.emailLoanConfirmation,
  );

  const [signOutOpen, setSignOutOpen] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const handleEmailPreferenceChange = async (
    preference: 'weekly' | 'newLoan' | 'loanConfirmation' | 'expiring' | 'oldBox' | 'overdue',
    value: boolean,
  ) => {
    const setters = {
      weekly: setEmailWeeklyReminder,
      newLoan: setEmailNewLoanNotification,
      loanConfirmation: setEmailLoanConfirmation,
      expiring: setEmailExpiringReminder,
      oldBox: setEmailOldBoxNotification,
      overdue: setEmailOverdueNotification,
    } as const;
    const previous = {
      weekly: emailWeeklyReminder,
      newLoan: emailNewLoanNotification,
      loanConfirmation: emailLoanConfirmation,
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
          emailLoanConfirmation:
            preference === 'loanConfirmation' ? value : emailLoanConfirmation,
          emailExpiringReminder: preference === 'expiring' ? value : emailExpiringReminder,
          emailOldBoxNotification: preference === 'oldBox' ? value : emailOldBoxNotification,
          emailOverdueNotification: preference === 'overdue' ? value : emailOverdueNotification,
        }),
      });

      if (!response.ok) throw new Error('Failed to update preferences');
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      setters[preference](previous);
    }
  };

  if (!session) return null;

  // `session.user.group` is the *effective* group: a kiosk that has PIN-elevated
  // reads as ADMIN (see lib/auth.ts). This page is about the account you are
  // signed in as — its loans, its email settings — and elevation never changes
  // `session.user.id`, so everything here keys off the underlying account
  // instead. Only a kiosk can ever be elevated, so elevated ⇒ base is KIOSK.
  const elevated = Boolean(session.user.elevatedById);
  const baseGroup = elevated ? 'KIOSK' : session.user.group;
  const isAdmin = baseGroup === 'ADMIN';

  const handleSignOut = () => {
    if (baseGroup === 'KIOSK') {
      setSignOutOpen(true);
      return;
    }
    signOut();
  };

  return (
    <>
      <Breadcrumbs items={[{ label: 'Oma tili' }]} />
      <PageHeader title="Oma tili" />

      <PendingPickupBanner />

      <ConfirmDialog
        open={signOutOpen}
        onOpenChange={setSignOutOpen}
        title="Kaluston koneen uloskirjautuminen"
        description="Olet kirjautumassa ulos kaluston koneen käyttäjältä. Tätä ei yleensä pitäisi tehdä jotta myös seuraava käyttäjä voi käyttää laitetta normaalisti. Haluatko varmasti kirjautua ulos?"
        confirmLabel={
          <>
            <TriangleAlert className="mr-2 h-4 w-4" />
            Kirjaudu ulos
          </>
        }
        onConfirm={() => {
          signOut();
          setSignOutOpen(false);
        }}
      />

      <div className="flex flex-col gap-6">
        <Card>
          <div className="flex flex-col items-start gap-3">
            <h2 className="text-2xl font-semibold">{session?.user?.name}</h2>
            <p className="text-muted-foreground">{session?.user?.email}</p>
            <p className="text-sm text-muted-foreground">
              Rooli:{' '}
              {baseGroup === 'USER'
                ? 'Käyttäjä'
                : baseGroup === 'KIOSK'
                  ? 'Kaluston kone'
                  : 'Admin'}
            </p>
            {elevated && (
              <p className="mt-1 text-xs text-success">
                ADMIN-oikeudet käytössä (tähän sessioon)
                {session.user.elevatedByName ? `: ${session.user.elevatedByName}` : ''}
              </p>
            )}
          </div>
          <hr className="my-4" />
          <Button variant="destructive" onClick={handleSignOut}>
            Kirjaudu ulos
          </Button>
        </Card>

        <Card>
          <CardTitle>Sähköposti-ilmoitukset</CardTitle>
          {/* Admins are borrowers too: they get the same "Omat lainat" toggles as
              everyone else (confirmation of their own loans, pickup/overdue reminders),
              plus the fleet-wide "Ylläpito" ones on top — not instead of them. */}
          {isAdmin && (
            <div className="mb-6 flex flex-col items-start gap-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Ylläpito</h3>
              <PrefRow
                title="Uudet lainat"
                description="Ilmoitukset kaikista uusista lainoista, myös omistasi ja kiosk-käytöstä"
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
            </div>
          )}
          <div className="flex flex-col items-start gap-4">
            {isAdmin && (
              <h3 className="text-sm font-semibold text-muted-foreground">Omat lainat</h3>
            )}
            <PrefRow
              title="Vahvistus lainasta"
              description="Sähköposti tekemistäsi lainoista: mitä lainasit ja milloin palautat"
              checked={emailLoanConfirmation}
              onCheckedChange={(v) => handleEmailPreferenceChange('loanConfirmation', v)}
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
          </div>
        </Card>

        <Card>
          <CardTitle>Ulkoasu</CardTitle>
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
        </Card>

        {session?.user?.group !== 'KIOSK' && (
          <div>
            <SectionTitle>Oma lainahistoria</SectionTitle>
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
              <EmptyState title="Ei lainoja" />
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
