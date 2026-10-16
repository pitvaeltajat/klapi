import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const isLocal = process.env.USE_LOCAL_SES === 'true';

const ses = new SESClient({
  region: process.env.KLAPI_AWS_REGION || 'eu-north-1',
  ...(isLocal
    ? {
        endpoint: 'http://localhost:8005',
        credentials: {
          accessKeyId: 'local',
          secretAccessKey: 'local',
        },
      }
    : {
        credentials: {
          accessKeyId: process.env.KLAPI_AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.KLAPI_AWS_SECRET_ACCESS_KEY || '',
        },
      }),
});

/** Every Klapi mail subject carries this tag, so it's applied in one place. */
export const SUBJECT_PREFIX = '[Klapi] ';

export async function sendEmail(to: string | string[], subject: string, html: string) {
  const toAddresses = Array.isArray(to) ? to : [to];
  const taggedSubject = subject.startsWith(SUBJECT_PREFIX) ? subject : `${SUBJECT_PREFIX}${subject}`;

  const params = {
    Destination: {
      ToAddresses: toAddresses,
    },
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: html,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: taggedSubject,
      },
    },
    Source: process.env.AWS_SES_FROM_EMAIL,
  };

  const command = new SendEmailCommand(params);
  return ses.send(command);
}
