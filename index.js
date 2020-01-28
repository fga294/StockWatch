
//**********************************//
// Dependencies
const fs = require('fs');
const http = require('http');
const https = require('https');
const express = require('express');
const byTicker = require('./routes/stocks-tickers');
const byYearLow = require('./routes/stocks-yearlow');
const bySharePrice = require('./routes/stocks-shareprice');
const byLowestYTD = require('./routes/stocks-lowestytd');
const refreshStocks = require('./mongodb/refreshStocks');
const app = express();
const cron = require("node-cron");
//**********************************//


//***********************************************************************************************//
// Self-Certificate (HTTPS settings)
const privateKey = fs.readFileSync('/etc/letsencrypt/live/fgacloud.com/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/fgacloud.com/cert.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/fgacloud.com/chain.pem', 'utf8');
const credentials = {
        key: privateKey,
        cert: certificate,
        ca: ca
};
const httpServer = http.createServer(app);
const httpsServer = https.createServer(credentials, app);
//***********************************************************************************************//


//************************************//
// Middlewares
app.use(express.static('public'));
//************************************//


//************************************//
// Routes
app.use('/stocks-tickers', byTicker);
app.use('/stocks-yearlow', byYearLow);
app.use('/stocks-shareprice', bySharePrice);
app.use('/stocks-lowestytd', byLowestYTD);
//************************************//


//****************************************//
//Refresh Cron Job
//cron.schedule("33 15 * * *", refreshStocks.getFreshDataFromAsx);
//****************************************//
// refreshStocks.getFreshDataFromAsx();



//****************************************//
//Start Listeners
httpServer.listen(80, () => {
    console.log("Listening on port 80");
});

httpsServer.listen(443, () => {
    console.log("Listening on port 443")
});
//****************************************//

