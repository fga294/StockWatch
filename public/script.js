/*************************************************/
/*Helper Function*/
function createNode(element) {
    newElement = document.createElement(element);
    return newElement;
}


async function stocksByLowestYTD() {
    const mainDiv = document.getElementById("mainDiv");
    const stocklist = await fetch('/stocks-lowestytd', {method:'POST'})
    const response = await stocklist.json();

    while (mainDiv.firstChild) {
      mainDiv.removeChild(mainDiv.firstChild);
    }
    
    
    for (elems in response) {
        varRange = response[elems].year_high_price - response[elems].year_low_price;
        varCurrentRange = response[elems].last_price - response[elems].year_low_price;
        varSetPoint = Math.floor((varCurrentRange*100)/varRange);

        let coInfo = createNode("button");
            coInfo.classList.add("col-1", "coInfo", "btn", "btn-secondary", "btn-sm");
            coInfo.innerHTML = response[elems].ticker;
            coInfo.setAttribute("id", "coInfo" + elems);
            coInfo.setAttribute("flow", "right");
            coInfo.setAttribute("title", response[elems].company_name);
            coInfo.setAttribute("tooltip", response[elems].company_name);

        let yearLow = createNode("button");
            yearLow.classList.add("col-1", "yearLow", "btn", "btn-light", "btn-sm");
            yearLow.innerHTML = response[elems].year_low_price.toFixed(2);
            yearLow.setAttribute("id", "yearLow" + elems);
            yearLow.setAttribute("tooltip", new Date(response[elems].year_low_date).toDateString());
            yearLow.setAttribute("flow", "up");
            

        let yearHigh = createNode("button");
            yearHigh.classList.add("col-1", "yearHigh", "btn", "btn-light", "btn-sm");
            yearHigh.innerHTML = response[elems].year_high_price.toFixed(2); 
            yearHigh.setAttribute("id", "yearHigh" + elems);
            yearHigh.setAttribute("tooltip", new Date(response[elems].year_high_date).toDateString());
            yearHigh.setAttribute("flow", "up");
            
        let newDiv = createNode("div");
            newDiv.setAttribute("id", "newDiv" + elems);
            newDiv.classList.add("row");
            newDiv.setAttribute("style", "height: 25px; margin: 35px 0px 35px");

        let subDivOut = createNode("div");
            subDivOut.classList.add("progress", "col-8");
            subDivOut.setAttribute("style", "height: 35px;");

        let subDivIn = createNode("div");
            if (varSetPoint < 33) {
                subDivIn.classList.add("progress-bar", "bg-warning");    
            } else {
                subDivIn.classList.add("progress-bar", "bg-info"); 
            }
            subDivIn.innerHTML = "$ " + response[elems].last_price.toFixed(2);
            subDivIn.setAttribute("id", "subDivIn" + elems);
            subDivIn.setAttribute("role", "progressbar");
            subDivIn.setAttribute("style", "width: " + varSetPoint + "%");
            subDivIn.setAttribute("tooltip" , "Last trade on " + new Date(response[elems].last_trade_date).toDateString());
            subDivIn.setAttribute("flow", "up");
            
            newDiv.appendChild(coInfo);
            newDiv.appendChild(yearLow);
            newDiv.appendChild(subDivOut);
            subDivOut.appendChild(subDivIn);
            newDiv.appendChild(yearHigh);

        mainDiv.appendChild(newDiv);
    }
};

async function stocksBySharePrice() {
    const mainDiv = document.getElementById("mainDiv");
    const stocklist = await fetch('/stocks-shareprice', {method:'POST'})
    const response = await stocklist.json();

    while (mainDiv.firstChild) {
      mainDiv.removeChild(mainDiv.firstChild);
    }
    
    
    for (elems in response) {
        varRange = response[elems].year_high_price - response[elems].year_low_price;
        varCurrentRange = response[elems].last_price - response[elems].year_low_price;
        varSetPoint = Math.floor((varCurrentRange*100)/varRange);

        let coInfo = createNode("button");
            coInfo.classList.add("col-1", "coInfo", "btn", "btn-secondary", "btn-sm");
            coInfo.innerHTML = response[elems].ticker;
            coInfo.setAttribute("id", "coInfo" + elems);
            coInfo.setAttribute("flow", "right");
            coInfo.setAttribute("title", response[elems].company_name);
            coInfo.setAttribute("tooltip", response[elems].company_name);

        let yearLow = createNode("button");
            yearLow.classList.add("col-1", "yearLow", "btn", "btn-light", "btn-sm");
            yearLow.innerHTML = response[elems].year_low_price.toFixed(2);
            yearLow.setAttribute("id", "yearLow" + elems);
            yearLow.setAttribute("tooltip", new Date(response[elems].year_low_date).toDateString());
            yearLow.setAttribute("flow", "up");
            

        let yearHigh = createNode("button");
            yearHigh.classList.add("col-1", "yearHigh", "btn", "btn-light", "btn-sm");
            yearHigh.innerHTML = response[elems].year_high_price.toFixed(2); 
            yearHigh.setAttribute("id", "yearHigh" + elems);
            yearHigh.setAttribute("tooltip", new Date(response[elems].year_high_date).toDateString());
            yearHigh.setAttribute("flow", "up");
            
        let newDiv = createNode("div");
            newDiv.setAttribute("id", "newDiv" + elems);
            newDiv.classList.add("row");
            newDiv.setAttribute("style", "height: 25px; margin: 35px 0px 35px");

        let subDivOut = createNode("div");
            subDivOut.classList.add("progress", "col-8");
            subDivOut.setAttribute("style", "height: 35px;");

        let subDivIn = createNode("div");
            if (varSetPoint < 33) {
                subDivIn.classList.add("progress-bar", "bg-success");    
            } else {
                subDivIn.classList.add("progress-bar", "bg-info"); 
            }
            subDivIn.innerHTML = "$ " + response[elems].last_price.toFixed(2);
            subDivIn.setAttribute("id", "subDivIn" + elems);
            subDivIn.setAttribute("role", "progressbar");
            subDivIn.setAttribute("style", "width: " + varSetPoint + "%");
            subDivIn.setAttribute("tooltip" , "Last trade on " + new Date(response[elems].last_trade_date).toDateString());
            subDivIn.setAttribute("flow", "up");
            
            newDiv.appendChild(coInfo);
            newDiv.appendChild(yearLow);
            newDiv.appendChild(subDivOut);
            subDivOut.appendChild(subDivIn);
            newDiv.appendChild(yearHigh);

        mainDiv.appendChild(newDiv);
    }
};



async function stocksByYearLow() {
    const mainDiv = document.getElementById("mainDiv");
    const stocklist = await fetch('/stocks-yearlow', {method:'POST'})
    const response = await stocklist.json();

    while (mainDiv.firstChild) {
      mainDiv.removeChild(mainDiv.firstChild);
    }
    
    
    for (elems in response) {
        varRange = response[elems].year_high_price - response[elems].year_low_price;
        varCurrentRange = response[elems].last_price - response[elems].year_low_price;
        varSetPoint = Math.floor((varCurrentRange*100)/varRange);

        let coInfo = createNode("button");
            coInfo.classList.add("col-1", "coInfo", "btn", "btn-secondary", "btn-sm");
            coInfo.innerHTML = response[elems].ticker;
            coInfo.setAttribute("id", "coInfo" + elems);
            coInfo.setAttribute("flow", "right");
            coInfo.setAttribute("title", response[elems].company_name);
            coInfo.setAttribute("tooltip", response[elems].company_name);

        let yearLow = createNode("button");
            yearLow.classList.add("col-1", "yearLow", "btn", "btn-light", "btn-sm");
            yearLow.innerHTML = response[elems].year_low_price.toFixed(2);
            yearLow.setAttribute("id", "yearLow" + elems);
            yearLow.setAttribute("tooltip", new Date(response[elems].year_low_date).toDateString());
            yearLow.setAttribute("flow", "up");
            

        let yearHigh = createNode("button");
            yearHigh.classList.add("col-1", "yearHigh", "btn", "btn-light", "btn-sm");
            yearHigh.innerHTML = response[elems].year_high_price.toFixed(2); 
            yearHigh.setAttribute("id", "yearHigh" + elems);
            yearHigh.setAttribute("tooltip", new Date(response[elems].year_high_date).toDateString());
            yearHigh.setAttribute("flow", "up");
            
        let newDiv = createNode("div");
            newDiv.setAttribute("id", "newDiv" + elems);
            newDiv.classList.add("row");
            newDiv.setAttribute("style", "height: 25px; margin: 35px 0px 35px");

        let subDivOut = createNode("div");
            subDivOut.classList.add("progress", "col-8");
            subDivOut.setAttribute("style", "height: 35px;");

        let subDivIn = createNode("div");
            if (varSetPoint < 33) {
                subDivIn.classList.add("progress-bar", "bg-success");    
            } else {
                subDivIn.classList.add("progress-bar", "bg-info"); 
            }
            subDivIn.innerHTML = "$ " + response[elems].last_price.toFixed(2);
            subDivIn.setAttribute("id", "subDivIn" + elems);
            subDivIn.setAttribute("role", "progressbar");
            subDivIn.setAttribute("style", "width: " + varSetPoint + "%");
            subDivIn.setAttribute("tooltip" , "Last trade on " + new Date(response[elems].last_trade_date).toDateString());
            subDivIn.setAttribute("flow", "up");
            
            newDiv.appendChild(coInfo);
            newDiv.appendChild(yearLow);
            newDiv.appendChild(subDivOut);
            subDivOut.appendChild(subDivIn);
            newDiv.appendChild(yearHigh);

        mainDiv.appendChild(newDiv);
    }
};

async function stocksByTicker() {
    const mainDiv = document.getElementById("mainDiv");
    const stocklist = await fetch('/stocks-tickers', {method:'POST'})
    const response = await stocklist.json();
    
    while (mainDiv.firstChild) {
        mainDiv.removeChild(mainDiv.firstChild);
      }

    for (elems in response) {
        varRange = response[elems].year_high_price - response[elems].year_low_price;
        varCurrentRange = response[elems].last_price - response[elems].year_low_price;
        varSetPoint = Math.floor((varCurrentRange*100)/varRange);

        let coInfo = createNode("button");
            coInfo.classList.add("col-1", "coInfo", "btn", "btn-secondary", "btn-sm");
            coInfo.innerHTML = response[elems].ticker;
            coInfo.setAttribute("id", "coInfo" + elems);
            coInfo.setAttribute("flow", "right");
            coInfo.setAttribute("title", response[elems].company_name);
            coInfo.setAttribute("tooltip", response[elems].company_name);

        let yearLow = createNode("button");
            yearLow.classList.add("col-1", "yearLow", "btn", "btn-light", "btn-sm");
            yearLow.innerHTML = response[elems].year_low_price.toFixed(2);
            yearLow.setAttribute("id", "yearLow" + elems);
            yearLow.setAttribute("tooltip", new Date(response[elems].year_low_date).toDateString());
            yearLow.setAttribute("flow", "up");

        let yearHigh = createNode("button");
            yearHigh.classList.add("col-1", "yearHigh", "btn", "btn-light", "btn-sm");
            yearHigh.innerHTML = response[elems].year_high_price.toFixed(2); 
            yearHigh.setAttribute("id", "yearHigh" + elems);
            yearHigh.setAttribute("tooltip", new Date(response[elems].year_high_date).toDateString());
            yearHigh.setAttribute("flow", "up");
 
        let newDiv = createNode("div");
            newDiv.setAttribute("id", "newDiv" + elems);
            newDiv.classList.add("row");
            newDiv.setAttribute("style", "height: 25px; margin: 35px 0px 35px");
            newDiv.setAttribute("tooltip" , "Last trade on " + new Date(response[elems].last_trade_date).toDateString());
            newDiv.setAttribute("flow", "up");

        let subDivOut = createNode("div");
            subDivOut.classList.add("progress", "col-8");
            subDivOut.setAttribute("style", "height: 35px;");


        let subDivIn = createNode("div");
            if (varSetPoint < 33) {
                subDivIn.classList.add("progress-bar", "bg-success");    
            } else {
                subDivIn.classList.add("progress-bar", "bg-info"); 
            }
            subDivIn.setAttribute("id", "subDivIn" + elems);
            subDivIn.setAttribute("role", "progressbar");
            subDivIn.setAttribute("style", "width: "+varSetPoint+"%");
            subDivIn.innerHTML = "$ " + response[elems].last_price.toFixed(2);


            newDiv.appendChild(coInfo);
            newDiv.appendChild(yearLow);
            newDiv.appendChild(subDivOut);
            subDivOut.appendChild(subDivIn);
            newDiv.appendChild(yearHigh);

        mainDiv.appendChild(newDiv);
    }
};

stocksByTicker();


