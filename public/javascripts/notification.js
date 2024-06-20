const Mailjet = require('node-mailjet')
const mailjet = new Mailjet({
    apiKey: 'API_KEY',
    apiSecret: 'API_SECRET'
});

function sendResults(receiverEmail, receiverName, qualified) {
    const qualificationStatus = qualified ? "qualified" : "not qualified";
    const nextStepMessage = qualified ? "Please contact your doctor for further instructions." : "Take care and see you in the next survey.";
    const request = mailjet
        .post('send', {version: 'v3.1'})
        .request({
            Messages: [
                {
                    From: {
                        Email: "krainievlc@gmail.com",
                        Name: "MediSurvey"
                    },
                    To: [
                        {
                            Email: receiverEmail,
                            Name: receiverName
                        }
                    ],
                    Subject: "Here are your last survey results",
                    TextPart: "",
                    HTMLPart: "<p>Dear " + receiverName + "," +
                        "<br><br>Based on your last survey results you are " + "<h3>" + qualificationStatus + " for the next appointment.</h3></p>" +
                        "<br><p>" + nextStepMessage + "</p>" +
                        "<br><p>Thank you for using MediSurvey. We are here to support your health journey.</p>" +
                        "<br><p>Best regards,<br>The MediSurvey Team</p>"
                }
            ]
        })

    request
        .then((result) => {
            console.log(result.body)
        })
        .catch((err) => {
            console.log(err.statusCode)
        })
}

function sendReminder(receiverEmail, receiverName) {
    const request = mailjet
        .post('send', {version: 'v3.1'})
        .request({
            Messages: [
                {
                    From: {
                        Email: "krainievlc@gmail.com",
                        Name: "MediSurvey"
                    },
                    To: [
                        {
                            Email: receiverEmail,
                            Name: receiverName
                        }
                    ],
                    Subject: "Fill your new health status survey!",
                    TextPart: "",
                    HTMLPart: "<p>Dear " + receiverName + "," +
                        "<br><br><p>This is a friendly reminder to complete your new survey. Your feedback is essential for us to provide the best care possible.</p>" +
                        "<br><p>Please log in to your account and complete the survey at your earliest convenience.</p>" +
                        "<br><p>Thank you for your time and cooperation.</p>" +
                        "<br><p>Best regards,<br>The MediSurvey Team</p>"
                }
            ]
        })

    request
        .then((result) => {
            console.log(result.body)
        })
        .catch((err) => {
            console.log(err.statusCode)
        })
}

function sendQualified(receiverEmail, receiverName, patientName, patientPhone) {
    const request = mailjet
        .post('send', {version: 'v3.1'})
        .request({
            Messages: [
                {
                    From: {
                        Email: "krainievlc@gmail.com",
                        Name: "MediSurvey"
                    },
                    To: [
                        {
                            Email: receiverEmail,
                            Name: receiverName
                        }
                    ],
                    Subject: "Patient qualified for an appointment",
                    TextPart: "",
                    HTMLPart: "<p>Dear dr " + receiverName + "," +
                        "<br><br><p>Based on the last filled survey, patient " + patientName + " is qualified for check-up.</p>" +
                        "<br><p>Please contact the patient to arrange an appointment.</p>" +
                        "<br><p>Patient contact info: " + patientPhone + "</p>" +
                        "<br><p>Best regards,<br>The MediSurvey Team</p>"
                }
            ]
        })

    request
        .then((result) => {
            console.log(result.body)
        })
        .catch((err) => {
            console.log(err.statusCode)
        })
}

module.exports = { sendResults , sendReminder, sendQualified};
