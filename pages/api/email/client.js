var ses = require('node-ses');

require('dotenv').config();

const client = ses.createClient({
    key: process.env.KLAPI_AWS_ACCESS_KEY_ID,
    secret: process.env.KLAPI_AWS_SECRET_ACCESS_KEY,
    amazon: 'https://email.eu-north-1.amazonaws.com',
});

export const sendEmail = async (recipientEmail, subject, html) => {
    client.sendEmail(
        {
            to: recipientEmail,
            from: 'klapi-noreply@pitkajarvenvaeltajat.fi',
            subject: subject,
            message: html,
            altText: '',
        },
        function (err, data, res) {
            if (err) {
                console.log(err);
            } else {
                console.log(data);
                return data;
            }
        }
    );
};
