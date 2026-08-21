'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import LoanCard, { type LoanType } from '@/components/LoanCard';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle, SectionTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Alert } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatDateNumeric } from '@/utils/dateFormat';

type Group = 'ADMIN' | 'USER' | 'KIOSK';

type MergeRef = { id: string; name: string | null; email: string | null };

export interface AdminUserViewProps {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    group: Group;
    deletedAt: Date | string | null;
    deletedBySync: boolean;
    hasElevatePin: boolean;
    emailWeeklyReminder: boolean;
    emailNewLoanNotification: boolean;
    emailExpiringReminder: boolean;
    emailOldBoxNotification: boolean;
    emailOverdueNotification: boolean;
    calendarLoanEvents: boolean;
    mergedInto: MergeRef | null;
    mergedFrom: MergeRef[];
  };
  loans: LoanType[];
  /** Whether the loan calendar can invite this account at all — see `/account`. */
  calendarAvailable: boolean;
  /** The signed-in admin, so the page can refuse to let them delete themselves. */
  viewerId: string;
}

/** How many loan cards to render at once — the rest are a click away. */
const PAGE_SIZE = 10;

const GROUP_LABEL: Record<Group, string> = {
  ADMIN: 'Admin',
  USER: 'Käyttäjä',
  KIOSK: 'Kaluston kone',
};

const GROUP_VARIANT: Record<Group, 'secondary' | 'default' | 'warning'> = {
  ADMIN: 'secondary',
  USER: 'default',
  KIOSK: 'warning',
};

type PrefKey =
  | 'emailWeeklyReminder'
  | 'emailNewLoanNotification'
  | 'emailExpiringReminder'
  | 'emailOldBoxNotification'
  | 'emailOverdueNotification'
  | 'calendarLoanEvents';

export default function AdminUserView({
  user,
  loans,
  calendarAvailable,
  viewerId,
}: AdminUserViewProps) {
  const router = useRouter();

  const [group, setGroup] = useState<Group>(user.group);
  const [prefs, setPrefs] = useState<Record<PrefKey, boolean>>({
    emailWeeklyReminder: user.emailWeeklyReminder,
    emailNewLoanNotification: user.emailNewLoanNotification,
    emailExpiringReminder: user.emailExpiringReminder,
    emailOldBoxNotification: user.emailOldBoxNotification,
    emailOverdueNotification: user.emailOverdueNotification,
    calendarLoanEvents: user.calendarLoanEvents,
  });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const isSelf = user.id === viewerId;
  const isDeleted = Boolean(user.deletedAt);
  const displayName = user.name || user.email || 'Nimetön käyttäjä';

  const updatePreference = async (key: PrefKey, value: boolean) => {
    const previous = prefs[key];
    setPrefs((current) => ({ ...current, [key]: value }));
    try {
      const response = await fetch('/api/user/updateEmailPreferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, [key]: value }),
      });
      if (!response.ok) throw new Error('Asetuksen tallennus epäonnistui');
    } catch {
      setPrefs((current) => ({ ...current, [key]: previous }));
      toast.error('Virhe', { description: 'Asetuksen tallennus epäonnistui' });
    }
  };

  const updateGroup = async (makeAdmin: boolean) => {
    const next: Group = makeAdmin ? 'ADMIN' : 'USER';
    const previous = group;
    setGroup(next);
    try {
      const response = await fetch(`/api/user/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group: next }),
      });
      if (!response.ok) throw new Error('Roolin päivitys epäonnistui');
      toast.success('Rooli päivitetty', {
        description: `${displayName}: ${GROUP_LABEL[next]}`,
      });
    } catch {
      setGroup(previous);
      toast.error('Virhe', { description: 'Roolin päivitys epäonnistui' });
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/user/${user.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Poisto epäonnistui');
      toast.success('Käyttäjä poistettu', {
        description: `${displayName} poistettu. Lainat ja historia säilyvät.`,
      });
      setDeleteOpen(false);
      router.push('/admin');
      router.refresh();
    } catch {
      toast.error('Virhe', { description: 'Käyttäjän poisto epäonnistui' });
    }
  };

  return (
    <>
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: displayName }]} />
      <PageHeader
        title={displayName}
        actions={
          !isSelf &&
          !isDeleted && (
            <Button
              variant="destructive"
              className="gap-2"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" /> Poista käyttäjä
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-6">
        {isDeleted && (
          <Alert variant="warning">
            <p className="font-medium">
              Tili on poistettu {user.deletedAt ? formatDateNumeric(user.deletedAt) : ''}
            </p>
            <p className="text-sm">
              {user.mergedInto ? (
                <>
                  Tili yhdistettiin toiseen tiliin — lainat ja historia löytyvät nyt täältä:{' '}
                  <NextLink
                    href={`/admin/user/${user.mergedInto.id}`}
                    className="underline underline-offset-2"
                  >
                    {user.mergedInto.name || user.mergedInto.email}
                  </NextLink>
                  .
                </>
              ) : user.deletedBySync ? (
                'Poisto tuli Google Workspace -synkronoinnista: käyttäjää ei enää löydy työtilasta. Tili palautuu automaattisesti, jos hän palaa työtilaan.'
              ) : (
                'Poiston teki ylläpitäjä. Synkronointi ei palauta tiliä itsestään.'
              )}{' '}
              Lainat ja lainahistoria säilyvät, mutta sisäänkirjautuminen on estetty.
            </p>
          </Alert>
        )}

        <Card>
          <dl className="grid gap-3 text-sm sm:grid-cols-[10rem_1fr] sm:text-base">
            <dt className="text-muted-foreground">Sähköposti</dt>
            <dd className="break-all">{user.email || '-'}</dd>

            <dt className="text-muted-foreground">Rooli</dt>
            <dd>
              <Badge variant={GROUP_VARIANT[group]}>{GROUP_LABEL[group]}</Badge>
            </dd>

            <dt className="text-muted-foreground">Lainoja</dt>
            <dd>{loans.length}</dd>

            {group === 'ADMIN' && (
              <>
                <dt className="text-muted-foreground">Admin-PIN</dt>
                <dd>{user.hasElevatePin ? 'Asetettu' : 'Ei asetettu'}</dd>
              </>
            )}

            {user.mergedFrom.length > 0 && (
              <>
                <dt className="text-muted-foreground">Yhdistetyt tilit</dt>
                <dd className="flex flex-col gap-1">
                  {user.mergedFrom.map((merged) => (
                    <span key={merged.id} className="break-all">
                      {merged.email}
                    </span>
                  ))}
                </dd>
              </>
            )}
          </dl>
        </Card>

        <Card>
          <CardTitle>Rooli ja oikeudet</CardTitle>
          {group === 'KIOSK' ? (
            <EmptyState
              variant="inline"
              title="Kaluston koneen rooli ei ole vaihdettavissa täältä."
            />
          ) : (
            <div className="flex w-full items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Admin-oikeudet</p>
                <p className="text-xs text-muted-foreground">
                  {isSelf
                    ? 'Et voi poistaa omia admin-oikeuksiasi täältä.'
                    : 'Pääsy kaluston hallintaan, käyttäjiin ja kaikkiin lainoihin.'}
                </p>
              </div>
              <Switch
                checked={group === 'ADMIN'}
                disabled={isSelf || isDeleted}
                onCheckedChange={updateGroup}
              />
            </div>
          )}
        </Card>

        {/* No address, nothing to send: the kiosk terminal has no email, so its
            toggles would be five switches that do nothing. */}
        {user.email ? (
        <Card>
          <CardTitle>Sähköposti-ilmoitukset</CardTitle>
          <p className="mb-4 text-sm text-muted-foreground">
            Samat asetukset jotka käyttäjä näkee itse sivulla Oma tili. Muutokset tallentuvat
            heti.
          </p>

          {group === 'ADMIN' && (
            <div className="mb-6 flex flex-col items-start gap-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Ylläpito</h3>
              <PrefRow
                title="Uudet lainat"
                description="Ilmoitukset kaikista uusista lainoista, myös omista ja kiosk-käytöstä"
                checked={prefs.emailNewLoanNotification}
                disabled={isDeleted}
                onCheckedChange={(v) => updatePreference('emailNewLoanNotification', v)}
              />
              <PrefRow
                title="Viikottaiset muistutukset vanhoista bokseista"
                description="Muistutukset lainoista, jotka ovat olleet boksissa yli viikon"
                checked={prefs.emailOldBoxNotification}
                disabled={isDeleted}
                onCheckedChange={(v) => updatePreference('emailOldBoxNotification', v)}
              />
              <PrefRow
                title="Myöhässä olevat lainat"
                description="Ilmoitukset lainoista, joiden palautusaika on ylittynyt"
                checked={prefs.emailOverdueNotification}
                disabled={isDeleted}
                onCheckedChange={(v) => updatePreference('emailOverdueNotification', v)}
              />
            </div>
          )}

          <div className="flex flex-col items-start gap-4">
            {group === 'ADMIN' && (
              <h3 className="text-sm font-semibold text-muted-foreground">Omat lainat</h3>
            )}
            {group !== 'ADMIN' && (
              <PrefRow
                title="Ilmoitukset uusista lainoista"
                description="Sähköpostit kun käyttäjälle luodaan uusi laina"
                checked={prefs.emailNewLoanNotification}
                disabled={isDeleted}
                onCheckedChange={(v) => updatePreference('emailNewLoanNotification', v)}
              />
            )}
            <PrefRow
              title="Muistutukset lainoista"
              description="Muistutus noutopäivästä ja myöhässä olevista lainoista"
              checked={prefs.emailWeeklyReminder}
              disabled={isDeleted}
              onCheckedChange={(v) => updatePreference('emailWeeklyReminder', v)}
            />
            <PrefRow
              title="Muistutus lainan päättymisestä"
              description="Muistutus päivää ennen palautuspäivää (oletuksena pois päältä)"
              checked={prefs.emailExpiringReminder}
              disabled={isDeleted}
              onCheckedChange={(v) => updatePreference('emailExpiringReminder', v)}
            />
            {calendarAvailable && (
              <PrefRow
                title="Lainat kalenteriin"
                description="Lisää käyttäjän lainat hänen Google-kalenteriinsa. Kaluston yhteiseen kalenteriin ne tulevat tästä riippumatta."
                checked={prefs.calendarLoanEvents}
                disabled={isDeleted}
                onCheckedChange={(v) => updatePreference('calendarLoanEvents', v)}
              />
            )}
          </div>
        </Card>
        ) : null}

        <div>
          <SectionTitle>Lainahistoria</SectionTitle>
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
                  <Button variant="outline" onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}>
                    Näytä lisää
                  </Button>
                </div>
              )}
            </>
          ) : (
            <EmptyState title="Ei lainoja" />
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Poista käyttäjä"
        confirmLabel={
          <>
            <Trash2 className="mr-2 h-4 w-4" /> Poista
          </>
        }
        onConfirm={handleDelete}
      >
        Haluatko varmasti poistaa käyttäjän <span className="font-bold">{displayName}</span>?
        Lainat ja lainahistoria säilyvät, mutta hän ei voi enää kirjautua sisään.
      </ConfirmDialog>
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
