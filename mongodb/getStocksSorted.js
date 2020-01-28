const mongoose = require('mongoose');

module.exports.sortedByYearLow = function() {
    mongoose.connect('mongodb+srv://mongodb_user:mongodb@fgacluster-n5r3c.mongodb.net/stockwatch?retryWrites=true&w=majority', {useUnifiedTopology: true, useNewUrlParser: true});
    delete mongoose.connection.models['Companies'];
    const stockSchema = new mongoose.Schema({
        ticker: String,
        company_name: String,
        last_price: Number,
        last_trade_date: Date,
        year_low_price: Number,
        year_high_price: Number,
        year_low_date: Date,
        year_high_date: Date
    })
    const Companies = mongoose.model('Companies', stockSchema);
    const docs = Companies.find().sort({year_low_price: 1});
    return docs;
}  

module.exports.sortedByTicker = function() {
    mongoose.connect('mongodb+srv://mongodb_user:mongodb@fgacluster-n5r3c.mongodb.net/stockwatch?retryWrites=true&w=majority', {useUnifiedTopology: true, useNewUrlParser: true});
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
    const Companies = mongoose.model('Companies', stockSchema);
    const docs = Companies.find().sort({ticker:1})
    return docs;
} 

module.exports.sortedBySharePrice = function() {
    mongoose.connect('mongodb+srv://mongodb_user:mongodb@fgacluster-n5r3c.mongodb.net/stockwatch?retryWrites=true&w=majority', {useUnifiedTopology: true, useNewUrlParser: true});
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
    const Companies = mongoose.model('Companies', stockSchema);
    const docs = Companies.find().sort({last_price:1})
    return docs;
} 

module.exports.sortedByLowestYTD = function() {
    mongoose.connect('mongodb+srv://mongodb_user:mongodb@fgacluster-n5r3c.mongodb.net/stockwatch?retryWrites=true&w=majority', {useUnifiedTopology: true, useNewUrlParser: true});
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
    const Companies = mongoose.model('Companies', stockSchema);
    const docs = Companies.find().sort({percentual_level:1})
    
    return docs;
} 