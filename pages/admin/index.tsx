import NextLink from 'next/link';
import Head from 'next/head';
import { FaTrash, FaPlus } from 'react-icons/fa';
import { MdOutlinePassword } from 'react-icons/md';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'sonner';
import NotAuthenticated from '../../components/NotAuthenticated';
import Breadcrumbs from '../../components/Breadcrumbs';
import type { NextPage } from 'next';
import type { User } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { PinInput } from '@/components/ui/pin-input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface UserWithGroup extends User {
  group: 'ADMIN' | 'USER' | 'KIOSK';
}

const RoleSwitch: React.FC<{ user: UserWithGroup }> = ({ user }) => {
  const { mutate } = useSWRConfig();

  const updateRole = async (userId: string, group: 'ADMIN' | 'USER' | 'KIOSK') => {
    const newGroup = group === 'ADMIN' ? 'USER' : 'ADMIN';
    try {
      await fetch(`/api/user/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group: newGroup }),
      });
      toast.success('Rooli päivitetty', {
        description: `Käyttäjän rooli vaihdettu: ${newGroup}`,
      });
      mutate('/api/user/getUsers');
    } catch {
      toast.error('Virhe', { description: 'Roolin päivitys epäonnistui' });
    }
  };

  return (
    <Switch
      checked={user.group === 'ADMIN'}
      onCheckedChange={() => updateRole(user.id, user.group)}
      disabled={user.group === 'KIOSK'}
    />
  );
};

const Admin: NextPage = () => {
  const { data: session } = useSession();
  const { data: users, error } = useSWR<UserWithGroup[]>('/api/user/getUsers');
  const { mutate } = useSWRConfig();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithGroup | null>(null);

  const [kioskPassword, setKioskPassword] = useState<string | null>(null);
  const [kioskDialogOpen, setKioskDialogOpen] = useState(false);

  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinValue, setPinValue] = useState('');

  if (session?.user?.group !== 'ADMIN') {
    return <NotAuthenticated />;
  }

  const handleDeleteClick = (user: UserWithGroup) => {
    setUserToDelete(user);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    try {
      await fetch(`/api/user/${userToDelete.id}`, { method: 'DELETE' });
      toast.success('Käyttäjä poistettu', {
        description: `${userToDelete.name || userToDelete.email} poistettu onnistuneesti`,
      });
      mutate('/api/user/getUsers');
      setDeleteOpen(false);
    } catch {
      toast.error('Virhe', { description: 'Käyttäjän poisto epäonnistui' });
    }
  };

  const getGroupBadge = (group: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'warning' | 'gray'> = {
      ADMIN: 'secondary',
      USER: 'default',
      KIOSK: 'warning',
    };
    const labels: Record<string, string> = {
      ADMIN: 'Admin',
      USER: 'Käyttäjä',
      KIOSK: 'Kiosk',
    };
    return <Badge variant={variants[group] || 'gray'}>{labels[group] || group}</Badge>;
  };

  const getOTP = async () => {
    try {
      const response = await fetch('/api/user/createKioskPassword', { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        setKioskPassword(data.kioskPassword);
        setKioskDialogOpen(true);
      } else {
        throw new Error(data.message || 'Salasanan luominen epäonnistui');
      }
    } catch (error) {
      toast.error('Virhe', {
        description: error instanceof Error ? error.message : 'Salasanan luominen epäonnistui',
      });
    }
  };

  const setAdminPin = async (pin: string) => {
    try {
      const response = await fetch('/api/auth/createPin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success('PIN-koodi asetettu', {
          description: 'Admin PIN-koodi on asetettu onnistuneesti',
        });
      } else {
        toast.error('Virhe', {
          description: data.message || 'PIN-koodin asettaminen epäonnistui',
        });
      }
    } catch (error) {
      toast.error('Virhe', {
        description: error instanceof Error ? error.message : 'PIN-koodin asettaminen epäonnistui',
      });
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <p className="text-destructive">Käyttäjien lataaminen epäonnistui</p>
      </div>
    );
  }

  if (!users) {
    return (
      <div className="p-6">
        <p>Ladataan...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Admin | Klapi</title>
      </Head>
      <Breadcrumbs items={[{ label: 'Admin' }]} />
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-semibold">Admin</h1>
          <Button asChild variant="success" size="lg" className="gap-2">
            <NextLink href="/admin/createItem">
              <FaPlus /> Luo uusi kama
            </NextLink>
          </Button>
        </div>

        <div className="flex justify-end">
          <Button onClick={getOTP} variant="warning" className="gap-2">
            <MdOutlinePassword /> Näytä kioskikäyttäjän salasana
          </Button>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => setPinDialogOpen(true)} variant="warning" className="gap-2">
            <MdOutlinePassword /> Aseta admin pin-koodi
          </Button>
        </div>

        <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aseta admin PIN-koodi</DialogTitle>
            </DialogHeader>
            <p className="mb-2">Syötä uusi 4-merkkinen PIN-koodi:</p>
            <div className="mb-4 flex justify-center">
              <PinInput value={pinValue} onChange={setPinValue} />
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setPinDialogOpen(false)}>
                Peruuta
              </Button>
              <Button
                variant="warning"
                onClick={async () => {
                  if (pinValue.length === 4) {
                    await setAdminPin(pinValue);
                    setPinValue('');
                    setPinDialogOpen(false);
                  } else {
                    toast.error('Virhe', { description: 'PIN-koodin tulee olla 4 merkkiä' });
                  }
                }}
                disabled={pinValue.length !== 4}
              >
                Aseta PIN
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Käyttäjien hallinta</h2>
            <p className="text-sm text-muted-foreground">Yhteensä {users.length} käyttäjää</p>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nimi</TableHead>
                <TableHead>Sähköposti</TableHead>
                <TableHead>Rooli</TableHead>
                <TableHead>Admin-oikeudet</TableHead>
                <TableHead className="w-[100px]">Toiminnot</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name || '-'}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getGroupBadge(user.group)}</TableCell>
                  <TableCell>
                    <RoleSwitch user={user} />
                  </TableCell>
                  <TableCell>
                    <Button
                      aria-label="Poista käyttäjä"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDeleteClick(user)}
                      disabled={user.id === session?.user?.id}
                      title={
                        user.id === session?.user?.id
                          ? 'Et voi poistaa itseäsi'
                          : 'Poista käyttäjä'
                      }
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <FaTrash />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Dialog open={kioskDialogOpen} onOpenChange={setKioskDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kioskikäyttäjän salasana luotu</DialogTitle>
            </DialogHeader>
            <div>
              Uusi salasana:
              <div className="mb-4 mt-2">
                <p className="text-2xl font-bold tracking-wider">{kioskPassword}</p>
              </div>
              (voimassa 15 minuuttia)
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setKioskDialogOpen(false)}>
                Sulje
              </Button>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(kioskPassword || '');
                  setKioskDialogOpen(false);
                }}
              >
                Kopioi leikepöydälle
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Poista käyttäjä</DialogTitle>
            </DialogHeader>
            <p>
              Haluatko varmasti poistaa käyttäjän{' '}
              <span className="font-bold">{userToDelete?.name || userToDelete?.email}</span>? Tätä
              toimintoa ei voi perua.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Peruuta
              </Button>
              <Button variant="destructive" onClick={handleDeleteConfirm}>
                Poista
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default Admin;
