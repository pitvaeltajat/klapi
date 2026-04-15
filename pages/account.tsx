import Head from 'next/head';
import { useSession, getSession, signOut } from 'next-auth/react';
import { serialize } from '@/utils/serialize';
import prisma from '../utils/prisma';
import { LoanCard } from './loan';
import Breadcrumbs from '../components/Breadcrumbs';
import type { GetServerSideProps } from 'next';
import type { Loan, User, ReportCreated, ReportStatus, ReservationStatus } from '@prisma/client';
import { useState, useEffect } from 'react';
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
  createdAt: Date;
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

interface AccountProps {
  loans: LoanWithUser[];
  userEmailPreferences: {
    emailWeeklyReminder: boolean;
    emailNewLoanNotification: boolean;
    emailOldBoxNotification: boolean;
    emailOverdueNotification: boolean;
  };
}

export const getServerSideProps: GetServerSideProps<AccountProps> = async (context) => {
  const session = await getSession(context);

  if (!session?.user?.id) {
    return {
      props: serialize({
        loans: [],
        userEmailPreferences: {
          emailWeeklyReminder: true,
          emailNewLoanNotification: true,
          emailOldBoxNotification: true,
          emailOverdueNotification: true,
        },
      }),
    };
  }

  const rawLoans = await prisma.loan.findMany({
    where: { user: { id: session.user.id } },
    include: {
      user: true,
      reservations: {
        include: {
          item: { select: { id: true, name: true } },
        },
      },
      reports: {
        select: {
          id: true,
          content: true,
          createdAt: true,
          created: true,
          status: true,
        },
      },
    },
  });

  const loans = rawLoans.map((loan) => ({
    ...loan,
    reports: loan.reports.map((report) => ({
      ...report,
      created: report.created as ReportCreated,
      status: report.status as ReportStatus,
    })),
  }));

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      emailWeeklyReminder: true,
      emailNewLoanNotification: true,
      emailOldBoxNotification: true,
      emailOverdueNotification: true,
    },
  });

  return {
    props: serialize({
      loans,
      userEmailPreferences: {
        emailWeeklyReminder: user?.emailWeeklyReminder ?? true,
        emailNewLoanNotification: user?.emailNewLoanNotification ?? true,
        emailOldBoxNotification: user?.emailOldBoxNotification ?? true,
        emailOverdueNotification: user?.emailOverdueNotification ?? true,
      },
    }),
  };
};

function compareDates(dateA: Date, dateB: Date) {
  return dateB.getTime() - dateA.getTime();
}

export default function Account({ loans, userEmailPreferences }: AccountProps) {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();

  const [emailWeeklyReminder, setEmailWeeklyReminder] = useState(
    userEmailPreferences.emailWeeklyReminder,
  );
  const [emailNewLoanNotification, setEmailNewLoanNotification] = useState(
    userEmailPreferences.emailNewLoanNotification,
  );
  const [emailOldBoxNotification, setEmailOldBoxNotification] = useState(
    userEmailPreferences.emailOldBoxNotification,
  );
  const [emailOverdueNotification, setEmailOverdueNotification] = useState(
    userEmailPreferences.emailOverdueNotification,
  );

  const [isSaving, setIsSaving] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loansSorted = loans.sort((a, b) =>
    compareDates(new Date(a.startTime), new Date(b.startTime)),
  );

  const handleEmailPreferenceChange = async (
    preference: 'weekly' | 'newLoan' | 'oldBox' | 'overdue',
    value: boolean,
  ) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/user/updateEmailPreferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailWeeklyReminder: preference === 'weekly' ? value : emailWeeklyReminder,
          emailNewLoanNotification: preference === 'newLoan' ? value : emailNewLoanNotification,
          emailOldBoxNotification: preference === 'oldBox' ? value : emailOldBoxNotification,
          emailOverdueNotification: preference === 'overdue' ? value : emailOverdueNotification,
        }),
      });

      if (!response.ok) throw new Error('Failed to update preferences');

      if (preference === 'weekly') setEmailWeeklyReminder(value);
      else if (preference === 'newLoan') setEmailNewLoanNotification(value);
      else if (preference === 'oldBox') setEmailOldBoxNotification(value);
      else if (preference === 'overdue') setEmailOverdueNotification(value);
    } catch (error) {
      console.error('Error updating email preferences:', error);
    } finally {
      setIsSaving(false);
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
      <Head>
        <title>Oma tili | Klapi</title>
      </Head>
      <Breadcrumbs items={[{ label: 'Oma tili' }]} />
      <h1 className="mb-6 text-4xl font-semibold">Oma tili</h1>

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
        <div className="rounded-md border bg-card p-6 shadow-sm">
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

        <div className="rounded-md border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Sähköposti-ilmoitukset</h2>
          <div className="flex flex-col items-start gap-4">
            {session?.user?.group === 'ADMIN' ? (
              <>
                <PrefRow
                  title="Uudet varaukset"
                  description="Ilmoitukset uusista varauksista (myös kiosk-käytöstä)"
                  checked={emailNewLoanNotification}
                  disabled={isSaving}
                  onCheckedChange={(v) => handleEmailPreferenceChange('newLoan', v)}
                />
                <PrefRow
                  title="Viikottaiset muistutukset vanhoista bokseista"
                  description="Muistutukset varauksista, jotka ovat olleet boksissa yli viikon"
                  checked={emailOldBoxNotification}
                  disabled={isSaving}
                  onCheckedChange={(v) => handleEmailPreferenceChange('oldBox', v)}
                />
                <PrefRow
                  title="Myöhässä olevat varaukset"
                  description="Ilmoitukset varauksista, joiden palautusaika on ylittynyt"
                  checked={emailOverdueNotification}
                  disabled={isSaving}
                  onCheckedChange={(v) => handleEmailPreferenceChange('overdue', v)}
                />
              </>
            ) : (
              <>
                <PrefRow
                  title="Ilmoitukset uusista varauksista"
                  description="Sähköpostit kun luot uuden varauksen"
                  checked={emailNewLoanNotification}
                  disabled={isSaving}
                  onCheckedChange={(v) => handleEmailPreferenceChange('newLoan', v)}
                />
                <PrefRow
                  title="Muistutukset varauksista"
                  description="Muistutukset varauksiesi päättymisestä"
                  checked={emailWeeklyReminder}
                  disabled={isSaving}
                  onCheckedChange={(v) => handleEmailPreferenceChange('weekly', v)}
                />
              </>
            )}
          </div>
        </div>

        <div className="rounded-md border bg-card p-6 shadow-sm">
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
            <h2 className="mb-4 text-xl font-semibold">Oma varaushistoria</h2>
            {loansSorted.length > 0 ? (
              <div className="flex flex-col gap-4">
                {loansSorted.map((loan) => (
                  <LoanCard key={loan.id} loan={loan} />
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">Ei varauksia</p>
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
