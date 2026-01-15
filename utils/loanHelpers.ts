import { LoanStatus } from '@prisma/client';

export const getLoanStatusLabel = (status: LoanStatus): string => {
    switch (status) {
        case LoanStatus.ACCEPTED:
            return 'Hyväksytty';
        case LoanStatus.REJECTED:
            return 'Hylätty';
        case LoanStatus.INUSE:
            return 'Käytössä';
        case LoanStatus.IN_BOX:
            return 'Laatikossa';
        case LoanStatus.RETURNED:
            return 'Palautettu';
        default:
            return 'Tuntematon';
    }
};

export const getLoanStatusColor = (status: LoanStatus): string => {
    switch (status) {
        case LoanStatus.ACCEPTED:
            return 'green';
        case LoanStatus.REJECTED:
            return 'red';
        case LoanStatus.INUSE:
            return 'blue';
        case LoanStatus.IN_BOX:
            return 'purple';
        case LoanStatus.RETURNED:
            return 'gray';
        default:
            return 'gray';
    }
};
