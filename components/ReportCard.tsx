'use client';

import React from 'react';
import { Loan, Reservation } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DateTime } from '@/components/DateTime';
import { cn } from '@/lib/utils';

interface Report {
  id: string;
  content: string;
  createdAt: string | Date;
  status: string;
}

interface ReportCardProps {
  reports: Report[];
  loan: Loan & { reservations: ReservationWithItem[] };
  expandedReportId: string | null;
  setExpandedReportId: (id: string | null) => void;
  announcement: { itemId: string; content: string };
  setAnnouncement: (a: { itemId: string; content: string }) => void;
  affectedItems: { [key: string]: number };
  setAffectedItems: (a: { [key: string]: number }) => void;
  onSetProcessing: (reportId: string, affectedItems?: { [key: string]: number }) => void;
  onSetResolved: (reportId: string, affectedItems?: { [key: string]: number }) => void;
  onSendAnnouncement: (itemId: string, content: string) => void;
}

interface ReservationWithItem extends Reservation {
  item: {
    id: string;
    name: string;
    amount: number;
  };
}

const ReportCard: React.FC<ReportCardProps> = ({
  reports,
  loan,
  expandedReportId,
  setExpandedReportId,
  announcement,
  setAnnouncement,
  affectedItems,
  setAffectedItems,
  onSetProcessing,
  onSetResolved,
  onSendAnnouncement,
}) => {
  const unresolvedReports = reports.filter((r) => r.status !== 'RESOLVED');
  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="mb-4 text-2xl font-semibold">
        Raportit {unresolvedReports.length > 0 ? `(${unresolvedReports.length})` : ''}
      </h2>
      <div className="flex flex-col gap-4">
        {reports.map((report) => {
          const expanded = expandedReportId === report.id;
          const inProgress = report.status === 'IN_PROGRESS';
          const isResolved = report.status === 'RESOLVED';
          const resetSelections = () => {
            setAnnouncement({ itemId: '', content: '' });
            setAffectedItems({});
          };
          return (
            <div
              key={report.id}
              className={cn(
                'rounded-md border bg-muted',
                expanded ? 'p-6 shadow-lg' : 'p-4',
              )}
            >
              <p className={cn('whitespace-pre-wrap', expanded ? 'text-base' : 'text-sm')}>
                {report.content}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Luotu: <DateTime value={report.createdAt} format="long" />
              </p>
              {isResolved ? (
                <Badge variant="success" className="mt-2">
                  Ratkaistu
                </Badge>
              ) : !expanded ? (
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() => !isResolved && setExpandedReportId(report.id)}
                >
                  Käsittele raportti
                </Button>
              ) : (
                <div>
                  <div className="mb-2 mt-4 rounded-md border bg-card p-4 text-lg font-semibold">
                    <p className="mb-2">Lisää ilmoitus kamalle:</p>
                    <div role="radiogroup" className="flex flex-wrap gap-3">
                      {loan.reservations.map((reservation: ReservationWithItem) => (
                        <label key={reservation.item.id} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="announcement-item"
                            value={reservation.item.id}
                            disabled={inProgress}
                            checked={announcement.itemId === reservation.item.id}
                            onChange={() =>
                              setAnnouncement({
                                itemId: reservation.item.id,
                                content: announcement.content,
                              })
                            }
                          />
                          {reservation.item.name}
                        </label>
                      ))}
                    </div>
                    <Textarea
                      className="mt-2"
                      placeholder="Kirjoita ilmoitus"
                      rows={3}
                      value={announcement.content}
                      disabled={inProgress}
                      onChange={(e) =>
                        setAnnouncement({
                          itemId: announcement.itemId,
                          content: e.target.value,
                        })
                      }
                    />
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        if (announcement.itemId && announcement.content) {
                          onSendAnnouncement(announcement.itemId, announcement.content);
                          resetSelections();
                        }
                      }}
                      disabled={!announcement.itemId || !announcement.content || inProgress}
                    >
                      Lähetä ilmoitus
                    </Button>
                  </div>
                  {!inProgress && (
                    <div className="mb-2 mt-4 rounded-md border bg-card p-4 text-lg font-semibold">
                      <p className="mb-2">Poista kama valikoimista käsittelyn ajaksi:</p>
                      <div className="flex flex-col gap-2">
                        {loan.reservations.map((reservation: ReservationWithItem) => (
                          <React.Fragment key={reservation.item.id}>
                            <hr />
                            <div className="flex items-center justify-between gap-2">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  value={reservation.item.id}
                                  checked={
                                    reservation.item.id in affectedItems &&
                                    affectedItems[reservation.item.id] > 0
                                  }
                                  disabled={inProgress || isResolved}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setAffectedItems({
                                        ...affectedItems,
                                        [reservation.item.id]: reservation.amount,
                                      });
                                    } else {
                                      setAffectedItems({
                                        ...affectedItems,
                                        [reservation.item.id]: 0,
                                      });
                                    }
                                  }}
                                />
                                {reservation.item.name}
                                {affectedItems[reservation.item.id] > 0 &&
                                  ` - ${affectedItems[reservation.item.id]} kpl`}
                              </label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={1}
                                  max={reservation.item.amount}
                                  value={affectedItems[reservation.item.id] || 0}
                                  className="h-9 w-20"
                                  disabled={
                                    inProgress ||
                                    isResolved ||
                                    !(reservation.item.id in affectedItems) ||
                                    affectedItems[reservation.item.id] === 0
                                  }
                                  onChange={(e) => {
                                    setAffectedItems({
                                      ...affectedItems,
                                      [reservation.item.id]: Number(e.target.value) || 0,
                                    });
                                  }}
                                />
                                <span>kpl</span>
                              </div>
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="warning"
                      size="sm"
                      disabled={inProgress}
                      onClick={() => {
                        onSetProcessing(report.id, affectedItems);
                        resetSelections();
                      }}
                    >
                      Ota käsittelyyn
                    </Button>
                    <Button
                      variant="success"
                      size="sm"
                      disabled={
                        Object.values(affectedItems).filter((v) => v > 0).length !== 0 || isResolved
                      }
                      onClick={() => {
                        onSetResolved(report.id, affectedItems);
                        resetSelections();
                      }}
                    >
                      Aseta käsitellyksi
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setExpandedReportId(null);
                        resetSelections();
                      }}
                    >
                      Käsittele myöhemmin
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReportCard;
