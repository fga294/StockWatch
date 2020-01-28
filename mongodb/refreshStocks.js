const mongoose = require('mongoose');
const fetch = require('cross-fetch');
const express = require('express');
const app = express();

app.use(express.json());

mongoose.connect('mongodb+srv://mongodb_user:mongodb@fgacluster-n5r3c.mongodb.net/stockwatch?retryWrites=true&w=majority', {useUnifiedTopology: true, useNewUrlParser: true});
mongoose.set('useFindAndModify', false);
delete mongoose.connection.models['Companies'];
const stockSchema = new mongoose.Schema({
    ticker: String,
    company_name: String,
    last_price: Number,
    last_trade_date: Date,
    year_low_price: Number,
    year_high_price: Number,
    year_low_date: Date,
    year_high_date: Date,
    percentual_level: Number
})
const Companies = mongoose.model('companies', stockSchema);
const baseurl = 'https://www.asx.com.au/asx/1/share/';


module.exports.getFreshDataFromAsx = async function() {

// async function refreshStocks() {
    let dataFromDB = await Companies.find();
        for (elements in dataFromDB) {
            let ticker = dataFromDB[elements].ticker;
            let url = baseurl + ticker;
            (async () => {
                try {
                    const res = await fetch(url);
                    const dataFromASX = await res.json();
                    const resultado = await Companies.findOneAndUpdate({ ticker : dataFromASX.code},
                        {last_price        : dataFromASX.open_price.toFixed(2),
                         last_trade_date   : dataFromASX.last_trade_date,
                         year_low_price    : dataFromASX.year_low_price.toFixed(2),
                         year_high_price   : dataFromASX.year_high_price.toFixed(2),
                         year_low_date     : dataFromASX.year_low_date,
                         year_high_date    : dataFromASX.year_high_date,
                         percentual_level  : Math.floor(((dataFromASX.last_price - dataFromASX.year_low_price) * 100) / (dataFromASX.year_high_price - dataFromASX.year_low_price))}, {new : true});
                } catch (err) {
                  console.error(err);
                } 
            })(); 
}
}