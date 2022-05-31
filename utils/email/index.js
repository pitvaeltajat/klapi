var AWS = require('aws-sdk');

new AWS.Config({
    region: 'eu-north-1',
});

const AWS_SES = new AWS.SES({
    region: 'eu-north-1',
});

let sendEmail = (recipientEmail, subject, html) => {
    let params = {
        Source: 'klapi-noreply@pitkajarvenvaeltajat.fi',
        Destination: {
            ToAddresses: [recipientEmail],
        },
        ReplyToAddresses: [],
        Message: {
            Body: {
                Html: {
                    Charset: 'UTF-8',
                    Data: html,
                },
            },
            Subject: {
                Charset: 'UTF-8',
                Data: subject,
            },
        },
    };
    return AWS_SES.sendEmail(params).promise();
};

async function sendApproveEmail(recipientEmail, loan) {
    const html = `
    <h1>Laina ${loan.id} on hyväksytty</h1>
    <p>
       Lainasi on hyväksytty. 
    </p>
    `;

    const subject = `Laina hyväksytty ${loan.id}`;
    await sendEmail(recipientEmail, subject, html);
}

export { sendEmail, sendApproveEmail };
