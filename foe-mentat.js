let navUtils = null;
import('./js/nav.js').then((m) => {
    navUtils = m.navUtils;
});

let BuildingStatus = null;
import('./js/model/buildingStatus.js').then((m) => {
    BuildingStatus = m.BuildingStatus;
});

let ContributionStatus = null;
import('./js/model/contributionStatus.js').then((m) => {
    ContributionStatus = m.ContributionStatus;
});

let Contributor = null;
import('./js/model/contributor.js').then((m) => {
    Contributor = m.Contributor;
});

let Reward = null;
import('./js/model/reward.js').then((m) => {
    Reward = m.Reward;
});

let ExpeditionContributors = null;
import('./js/model/expeditionContributions.js').then((m) => {
    ExpeditionContributors = m.ExpeditionContributors;
});

var bkg = chrome.extension.getBackgroundPage();
// chrome.runtime.sendMessage({greeting: "hello"}, function(response) {
//     console.log(response.greeting);
//   });

let currentPlayerId = -1;
let playerArcBonus = 1.9;

//minimum number of points to invest in particular great building to summarise investment
let minContributionToSummary = 10;

//last received player contribution data
let playerContributionData = undefined;
//last received great building status
let greatBuildingStatus = undefined;
//expedition contributors data
let expdData = undefined;

const inpArcBonus = document.getElementById("arc_bonus");
inpArcBonus.value = playerArcBonus;
inpArcBonus.onchange = (evt) => {
    playerArcBonus = evt.target.value;
    const span = document.getElementById('arc_bonus_span');
    if(span && span !== null) {
        span.innerText = playerArcBonus;
    }
    const header = document.getElementById("pearlStatusHeader");
    if(header && header !== null) {
        renderBuildingStatus(greatBuildingStatus);
    }
    
    //alert(playerArcBonus);
}

// document.getElementById("pearlStatusToggle").onclick = () => { toggleDiv("pearlStatus") };
// document.getElementById("myContributionsToggle").onclick = () => { toggleDiv("myContributions") };

function toggleDiv(divId) {
    const div = document.getElementById(divId);
    const emptyDiv = document.createElement('div');
    replaceElement(emptyDiv, div.id);
    // if(div.style.diplay == "none") {
    //     div.style.diplay = "";
    // } else {
    //     div.style.diplay = "none";
    // }
}






chrome.devtools.network.onRequestFinished.addListener(request => {
    request.getContent((body) => {
      if (request.request && request.request.url && request.request.postData) {
        if (request.request.url.includes("forgeofempires.com")) {
            

            const reqDataText = request.request.postData.text;
            const reqData = JSON.parse(reqDataText)[0];
            const reqClass = reqData.requestClass;
            const reqMethod = reqData.requestMethod;
            //if enters details of pearl

            const jsonBody=JSON.parse(body);
            console.log(`reqClass: ${reqClass}`);
            console.log(`reqMethod: ${reqMethod}`);
            console.dir(jsonBody);

            if(reqClass && reqClass == "GreatBuildingsService" 
                && reqMethod && reqMethod != "getContributions"
                ) {
                    const respObjArr = JSON.parse(body);
                    let contributionData;
                    let buildingData;
                    for ( let i=0; i<respObjArr.length; i++ ) {
                        let respObj = respObjArr[i]
                        const respClass = respObj.requestClass;
                        const respMethod = respObj.requestMethod;
                        //contribution data
                        if(respClass && respClass == "GreatBuildingsService" && respMethod 
                        // && respMethod == "getConstruction"
                        ) {
                            contributionData = parseContributionData(respObj, respMethod);
                            console.log("contribution data:");
                            console.dir(contributionData);
                        }
                        if(respClass && respClass == "CityMapService" 
                        // && respMethod && respMethod == "updateEntity"
                        ) {
                            const respData = respObj.responseData[0];
                            buildingData = parseBuildingData(respData);
                            console.log("building respObj:");
                            console.dir(respObj);
                        }
                    }
                    if(contributionData && buildingData) {
                        const bs = BuildingStatus.create(buildingData, contributionData);
                        greatBuildingStatus = bs;
                        saveToStorage('foe_building_status', bs);
                        // const view = renderBuildingStatus(contributionData, buildingData);
                        renderBuildingStatus(greatBuildingStatus);
                        // const pearlContainer = document.getElementById('pearlStatus');
                        // pearlContainer.parentNode.replaceChild(view, pearlContainer);
                        //pearlContainer.children[0] = view;
                    }
                    const x = 1;
            } else if(reqClass && reqClass == "GreatBuildingsService" 
                && reqMethod && reqMethod == "getContributions") {
                //all contribution summary
                const respObjArr = JSON.parse(body);
                respObjArr.forEach(respObj => {
                    const respClass = respObj.requestClass;
                    const respMethod = respObj.requestMethod;
                    if(respClass && respClass == "GreatBuildingsService" && respMethod && respMethod == "getContributions") {
                        playerContributionData = respObj.responseData;
                        renderMyContributions();
                        // const view = renderContributions(playerContributionData);
                        // const pearlContainer = document.getElementById('myContributions');
                        // pearlContainer.parentNode.replaceChild(view, pearlContainer);
                    }
                });
                

            } else if(reqClass && reqClass == "GuildExpeditionService"
                && reqMethod && reqMethod == "getContributionList") {
                const respObjArr = JSON.parse(body);
                for ( let i=0; i<respObjArr.length; i++ ) {
                    let respObj = respObjArr[i]
                    const respClass = respObj.requestClass;
                    const respMethod = respObj.requestMethod;
                    //expedition contributors data
                    if(respClass && respClass == "GuildExpeditionService" && respMethod && respMethod == "getContributionList") {
                        const respData = respObj.responseData;
                        console.log("exp resp data:");
                        console.dir(respData);
                        expdData = ExpeditionContributors.create(respData);
                        console.dir(expdData);
                        renderExpeditionContributors();
                        // console.log("contribution request:");
                        // console.dir(request);
                    }
                }
            }

        }
      }
    });
  });

  const parseContributionData = ((responseObject, respMethod) => {
    console.log("parseContributionData, respMethod: "+respMethod+" respObject: ");
    console.dir(responseObject);
    let respData = undefined;
    if(respMethod == "getConstruction") {
        //for building level being constructed
        respData = responseObject.responseData.rankings;
    } else if(respMethod == "getConstructionRanking") {
        //for building level already constructed
        respData = responseObject.responseData;
    }
    const res = [...respData];
    return res;
  });

  const parseBuildingData = (responseObject => {
    const res = {...responseObject};
    return res;
  });


/**
 * 
 * @param {BuildingStatus} bs
 */
function renderBuildingStatus(bs) {
    if(!bs) {
        return;
    }
    const mainDiv = document.createElement('div');
    mainDiv.setAttribute('id', 'pearlStatus');
    const mainDivTemplate = `
        <h3>Arc bonus: <span id="arc_bonus_span">${playerArcBonus}</span></h3>
        <p>Level: ${bs.buildingLevel} / ${bs.buildingUnlockedLevel}</p>
        <p>FP: ${bs.totalInvestedFP} / ${bs.maxFPToLevelUp} FP to level up: ${bs.fpToLevelUp}</p>
        <p>Player current investment: ${bs.playerInvestment} </p>

        <table >
            <tr>
                <th>Rank</th>
                <th>Investor name</th>
                <th>Invested FP</th>
                <th>Place secured</th>
                <th>FP to secure by player (remaining)</th>
                <th>FP to secure by given investor (remaining)</th>
                <th>Reward (with bonus)</th>
                <th>Profit</th>
            </tr>
            ${this.renderContributionRows(bs.contributions)}
        </table>
    `;
    mainDiv.innerHTML = mainDivTemplate;
    replaceElement(mainDiv, "pearlStatus");
    navUtils.highlightTabButton('gbstatus');
    return mainDiv;
}

/**
 * 
 * @param {ContributionStatus[]} csArr
 */
function renderContributionRows(csArr) {
    let res = "";
    csArr.forEach(cs => {
        const styleHighlightRow = 'style="background-color: rgb(124,252,0);"';
        const rowStyle = cs.securedPlacePlayerFPIncome > 0 ? styleHighlightRow : "";
        res += `
            <tr ${rowStyle}>
                <td>${defaultValue( cs.rank, "" )}</td>
                <td>${defaultValue( cs.contributor.name, "" )}</td>
                <td>${defaultValue( cs.investedFP, "" )}</td>
                <td>${cs.isPlaceSecured === true ? "YES" : "NO"}</td>
                <td>${cs.pointsToSecureByPlayerTotal} (${cs.pointsToSecureByPlayerRemaining})</td>
                <td>${cs.pointsToSecureTotal} (${cs.pointsToSecure})</td>
                <td>${cs.securedPlacePlayerFPBaseReward} (${cs.securedPlacePlayerFPReward})</td>
                <td>${cs.securedPlacePlayerFPIncome}</td>
            </tr>
        `;
    });
    return res;
}

function renderBuildingStatusOld(contribData, buildingData) {
    const mainDiv = document.createElement('div');
    mainDiv.setAttribute('id', 'pearlStatus');
    const progressPar = document.createElement('p');
    const investedPoints = buildingData.state.invested_forge_points ? buildingData.state.invested_forge_points : 0;
    const pointsForLevelUp = buildingData.state.forge_points_for_level_up ? buildingData.state.forge_points_for_level_up : 0;
    progressPar.innerText=`Level: ${buildingData.level} / ${buildingData.max_level} FP: ${investedPoints} / ${pointsForLevelUp}`;
    mainDiv.appendChild(progressPar);

    const remainingFP = pointsForLevelUp - investedPoints;
    const remainingFPPar = document.createElement('p');
    remainingFPPar.innerText=`Remaining FP: ${remainingFP}`;
    mainDiv.appendChild(remainingFPPar);

    const contribLabel = document.createElement('h5');
    contribLabel.innerText="Contributors:";
    mainDiv.appendChild(contribLabel);
    for(let i=0; i<contribData.rankings.length; i++) {
        const contr = contribData.rankings[i];
        const contribPar = document.createElement('p');
        let reward="";
        if(contr.reward) {
            const rewardPoints = contr.reward.strategy_point_amount ? contr.reward.strategy_point_amount : 0;
            reward=`Reward: ${rewardPoints}`;
        }
        const investedPoints = contr.forge_points ? contr.forge_points : 0;
        contribPar.innerText=`Name: ${contr.player.name} Invested points: ${investedPoints} ${reward}`;
        mainDiv.appendChild(contribPar);
    }
    return mainDiv;

}

function renderContributions(responseObjArr) {
    if(!responseObjArr) {
        return;
    }
    let res = "";
    let sumInvFP = 0;
    let sumRewFP = 0;
    let sumRewFPBonus = 0;
    let sumProfit = 0;
    let tableHTML =`
    <table>
    <tr>
        <th>Building name</th>
        <th>Owner</th>
        <th>Invested FP</th>
        <th>Rank</th>
        <th>Reward (with bonus)</th>
        <th>Profit</th>
    </tr>
    `;


    responseObjArr.filter(ct => ct.forge_points > minContributionToSummary).forEach(ct => {
        // const styleHighlightRow = 'style="background-color: rgb(124,252,0);"';
        // const rowStyle = cs.securedPlacePlayerFPIncome > 0 ? styleHighlightRow : "";
        const buildingName = ct.name;
        const owner = ct.player.name;
        const investedFP = ct.forge_points;
        sumInvFP += investedFP;
        const rank = ct.rank;
        let reward = 0;
        if(ct.reward && ct.reward.strategy_point_amount) {
            reward = ct.reward.strategy_point_amount;
        }
        sumRewFP += reward;
        const rewardWithBonus = Math.round(reward * playerArcBonus);
        sumRewFPBonus += rewardWithBonus;
        const profit = rewardWithBonus - investedFP;
        sumProfit += profit;
        tableHTML += `
            <tr>
                <td>${buildingName}</td>
                <td>${owner}</td>
                <td>${investedFP}</td>
                <td>${rank}</td>
                <td>${reward} (${rewardWithBonus})</td>
                <td>${profit}</td>
            </tr>
        `;
    });
    tableHTML += `
    </table>
    `
    // res += `<h2>My great building contributions summary:</h2>`;
    res += `<h3>Total Invested FP: ${sumInvFP}</h3>`;
    res += `<h3>Total FP Reward (with bonus): ${sumRewFP} (${sumRewFPBonus})</h3>`;
    res += `<h3>Total FP profit: ${sumProfit}</h3>`;
    res += `<h3>Filter min. invested FP: <input id="min_investment" type="number" value="${minContributionToSummary}" min="0"/> </h3>`;
    
    res += tableHTML;
    const mainDiv = document.createElement('div');
    mainDiv.setAttribute('id', 'myContributions');
    mainDiv.innerHTML = res;
    return mainDiv;
}

function renderMyContributions() {
    const view = renderContributions(playerContributionData);
    const pearlContainer = document.getElementById('myContributions');
    pearlContainer.parentNode.replaceChild(view, pearlContainer);
    document.getElementById("min_investment").oninput = () => { updateMinInvestment(); };
    navUtils.highlightTabButton('mycontributions');
}

function renderExpeditionContributors() {
    // let html = "<div id='expedition_contrib'>";
    let html = "";
    html += `<p>Data raportu: ${expdData.currentDate}</p>`;
    expdData.playerContr.forEach(el => {
        html += `${el.player}: ${el.solvedEncounters}<br/>`;
    });
    // html += "</div>";
    const mainDiv = document.createElement('div');
    mainDiv.setAttribute('id', 'expedition_contrib');
    mainDiv.innerHTML = html;
    replaceElement(mainDiv, "expedition_contrib");
    navUtils.highlightTabButton('expedition_contrib');
}

function updateMinInvestment() {
    const elMinInvestment = document.getElementById("min_investment");
    const newVal = elMinInvestment.value;
    minContributionToSummary = newVal;
    renderMyContributions();
    replaceElement(elMinInvestment, "min_investment")
    elMinInvestment.focus();
}

function defaultValue(val, defaultVal) {
    const res = val ? val : defaultVal;
    return res;
}

function replaceElement(newEl, idElToReplace) {
    const old = document.getElementById(idElToReplace);
    const id = old.id;
    newEl.id = id;
    old.parentNode.replaceChild(newEl, old);
}

function saveToStorage(key, data) {
    // chrome.storage.sync.set({'foe_data': null}, function() {
    // });
    // chrome.storage.sync.set({key: null}, function() {
    // });

    const storagekey = key;
    chrome.storage.sync.get([storagekey], function(result) {
        var array = result[storagekey]?result[storagekey]:[];
        console.dir(result);
        console.dir(chrome.storage.sync);
        array.unshift(data);
        // array.push(data);

        var jsonObj = {};
        jsonObj[storagekey] = array;
        chrome.storage.sync.set(jsonObj, function() {
            console.log("Saved a new array item");
        });
    });

    // chrome.storage.sync.get(['foe_data'], function(res) {
    //     console.dir(res);
    //     if(!res) {
    //         res = {};
    //     }
    //     if(!res[key]) {
    //         res[key] = [];
    //     }
    //     res[key].push(data);
    //     chrome.storage.sync.set({'foe_data': res}, function() {
    //         console.log('Value is set to ' + data);
    //     });
    // });
}