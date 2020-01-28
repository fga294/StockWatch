//****************************************//
// Dependencies
const express = require('express')
const morgan = require('morgan');
const router = express.Router();
const allStocks = require('../mongodb/getStocksSorted.js')
//****************************************//


//****************************************//
// Middleware
router.use(morgan('dev'));
router.use(express.json());
//****************************************//


//*****************************************//
// Resources
router.post('/', async (request,response) => {
    let result = await allStocks.sortedByLowestYTD();
    response.send(result)
});
//*****************************************//

module.exports = router;