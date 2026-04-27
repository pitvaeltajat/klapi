'use client';

import React, { useState } from 'react';
import { IoMdAlert } from 'react-icons/io';
import { useSession } from 'next-auth/react';
import { LoanStatus, ReservationStatus } from '@prisma/client';
import NotAuthenticated from '@/components/NotAuthenticated';
import Breadcrumbs from '@/components/Breadcrumbs';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { deriveLoanStatus, getLoanStatusLabel, getLoanStatusColor } from '@/utils/loanHelpers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDateOnly } from '@/utils/dateFormat';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface Reservation {
  id: string;
  amount: number;
  status: ReservationStatus;
  item: {
    id: string;
    name: string;
  };
}

interface LoanType {
  id: string;
  userId: string;
  status: LoanStatus;
  description: string | null;
  startTime: Date | string;
  endTime: Date | string;
  loaner: string | null;
  user: {
    name: string | null;
    email: string | null;
  };
  reservations: Reservation[];
}

const LoanStartCard = ({
  loan,
  onStart,
  onStartComplete,
}: {
  loan: LoanType;
  onStart: (id: string) => Promise<void>;
  onStartComplete: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [reportContent, setReportContent] = useState('');

  const derivedStatus = deriveLoanStatus(loan.reservations, loan.status);
  const acceptedReservations = loan.reservations.filter(
    (r) => r.status === ReservationStatus.ACCEPTED,
  );

  const handleStartLoan = async () => {
    if (reportContent.trim() !== '') {
      try {
        await fetch('/api/loan/createReport', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ loanId: loan.id, content: reportContent, created: 'BEFORE_LOAN' }),
        });
      } catch (e) {
        console.error('Virhe luotaessa raporttia:', e);
      }
    }
    await onStart(loan.id);
    setOpen(false);
    onStartComplete();
  };

  return (
    <>
      <div className="mb-4 overflow-hidden rounded-lg border p-4">
        <div className="flex flex-col gap-3">
          <h3 className="text-lg font-semibold">{loan.description || loan.loaner}</h3>
          <Badge variant={getLoanStatusColor(derivedStatus)} className="w-fit">
            {getLoanStatusLabel(derivedStatus)}
          </Badge>
          <p>Lainaaja: {loan.loaner}</p>
          <p>
            Laina-aika: {formatDateOnly(loan.startTime)} -{' '}
            {formatDateOnly(loan.endTime)}
          </p>
          <div>
            <p className="mb-2 font-bold">Tavarat:</p>
            <div className="flex flex-wrap gap-2">
              {acceptedReservations.map((reservation) => (
                <Badge key={reservation.id} className="rounded-full">
                  {reservation.item.name} ({reservation.amount})
                </Badge>
              ))}
            </div>
          </div>
          <Button variant="success" size="lg" onClick={() => setOpen(true)}>
            Aloita lainaus
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hyväksy lainauksen aloitus</DialogTitle>
          </DialogHeader>
          <div>
            <p className="mb-4">
              Vahvistamalla lainauksen aloituksen otat vastuullesi lainattavat tavarat.
            </p>
            <div className="mb-4 rounded-md border border-primary/30 bg-primary/10 p-3">
              <p className="font-bold leading-relaxed text-primary">
                💡 Vinkki: Ota kuva kamoista puhelimellasi
              </p>
              <p className="mt-1 leading-relaxed">
                Suosittelemme ottamaan kuvan kamoista ennen lainauksen aloitusta. Jos palautuksessa
                tulee hämminkiä, kuva puhelimessasi toimii omana todisteenasi. Kuvaa ei tarvitse
                lähettää mihinkään — säilytä se omassa puhelimessasi.
              </p>
            </div>
            <div className="mb-4 rounded-md border bg-muted p-3">
              <p className="leading-relaxed">
                Tarkista ennen lainan vahvistamista, että kaikki kamat ovat kunnossa ja
                mahdolliset vahingot on raportoitu alla olevaan kenttään. (Esim. puuttuvat kiilat,
                reikä laavussa tms.)
              </p>
              <p className="mt-2 leading-relaxed text-destructive">
                <IoMdAlert className="mr-2 inline" />
                Huomio: Voit joutua korvausvastuuseen, mikäli et ole raportoinut etukäteen kamoissa
                havaitsemiasi puutteita tai vahinkoja.
              </p>
              <Textarea
                placeholder="Kirjoita puutteet tai huomiot tähän..."
                value={reportContent}
                onChange={(e) => setReportContent(e.target.value)}
                className="mt-2 min-h-[100px] text-sm"
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              Ymmärrän ja hyväksyn vastuuni lainattavista tavaroista.
            </label>
          </div>
          <DialogFooter>
            <Button variant="success" onClick={handleStartLoan} disabled={!termsAccepted}>
              Aloita lainaus
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Peruuta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default function StartLoanView({ loans }: { loans: LoanType[] }) {
  const { data: session } = useSession();
  const router = useRouter();

  const handleStart = async (loanId: string) => {
    try {
      const response = await fetch('/api/loan/startLoan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: loanId }),
      });
      if (response.ok) {
        toast.success('Lainaus aloitettu!');
      } else {
        throw new Error('Lainauksen aloitus epäonnistui');
      }
    } catch {
      toast.error('Virhe', { description: 'Lainauksen aloitus epäonnistui. Yritä uudelleen.' });
    }
  };

  const handleStartComplete = () => {
    router.push('/');
  };

  if (session?.user?.group !== 'KIOSK' && session?.user?.group !== 'ADMIN') {
    return <NotAuthenticated />;
  }

  return (
    <>
      <Breadcrumbs items={[{ label: 'Aloita lainaus' }]} />
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="mb-4 text-3xl font-semibold">Aloita lainaus</h1>
          {loans.length === 0 ? (
            <div className="py-8 text-center">
              <h2 className="text-xl font-semibold text-muted-foreground">
                Ei aloitettavia lainoja
              </h2>
            </div>
          ) : (
            loans.map((loan) => (
              <LoanStartCard
                key={loan.id}
                loan={loan}
                onStart={handleStart}
                onStartComplete={handleStartComplete}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
