import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

const config = {
    region: 'eu-north-1',
    signatureVersion: 'v4',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
};

const SESClient = new SESv2Client(config);

let sendEmail = async (recipientEmail, subject, html) => {
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
                    Data: JSON.stringify(html),
                },
                Text: {
                    Charset: 'UTF-8',
                    Data: 'Text version of email',
                },
            },
            Subject: {
                Charset: 'UTF-8',
                Data: JSON.stringify(subject),
            },
        },
    };
    try {
        const response = await SESClient.send(new SendEmailCommand(params));
        console.log('aws response', response);
        return response;
    } catch (error) {
        console.log('aws error', error);
        throw error;
    }
};

async function sendApproveEmail(recipientEmail, id) {
    const html = `
    <h1>Laina ${id} on hyväksytty</h1>
    <p>
       Lainasi on hyväksytty. 
    </p>
    `;

    const subject = `Laina hyväksytty ${id}`;
    await sendEmail(recipientEmail, subject, html);
}

export { sendEmail, sendApproveEmail };
