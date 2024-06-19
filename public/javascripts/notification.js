const Mailjet = require('node-mailjet')
const mailjet = new Mailjet({
    apiKey: 'API_KEY',
    apiSecret: 'API_SECRET'
});
function send() {
    const request = mailjet
        .post('send', { version: 'v3.1' })
        .request({
            Messages: [
                {
                    From: {
                        Email: "krainievlc@gmail.com",
                        Name: "Mailjet Pilot"
                    },
                    To: [
                        {
                            Email: "vaydobespa@gufum.com",
                            Name: "passenger 1"
                        }
                    ],
                    Subject: "Your email flight plan!",
                    TextPart: "Dear passenger 1, welcome to Mailjet! May the delivery force be with you!",
                    HTMLPart: "<h3>Dear passenger 1, welcome to <a href=\"https://www.mailjet.com/\">Mailjet</a>!</h3><br />May the delivery force be with you!"
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

module.exports = {send}
