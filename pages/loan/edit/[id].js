export async function getServerSideProps(req, res) {
    const loan = await prisma.loan.findUnique({
        where: {
            id: req.params.id,
        },
        include: {
            reservations: {
                include: {
                    item: true,
                },
            },
        },
    });
    if (!loan) {
        return {
            props: { notFound: true },
        };
    }
    return {
        props: {
            loan,
        },
    };
}

export default function LoanEditView({ loan, notFound }) {
    return (
        <div>
            <h1>Loan Edit View</h1>
            <p>Loan: {loan.id}</p>
            <p>{notFound}</p>
        </div>
    );
}
