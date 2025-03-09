import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

export const sendEmail = async (recipientEmail, subject, html) => {
  const client = new SESClient({
    region: "eu-north-1",
    credentials: {
      accessKeyId: process.env.KLAPI_AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.KLAPI_AWS_SECRET_ACCESS_KEY,
    },
  });

  var params = {
    Destination: {
      ToAddresses: recipientEmail,
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: html,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: subject,
      },
    },
    Source: "klapi-noreply@pitkajarvenvaeltajat.fi",
  };

  const command = new SendEmailCommand(params);
  try {
    const data = await client.send(command);
    return data;
  } catch (err) {
    console.log(err);
  }
};
