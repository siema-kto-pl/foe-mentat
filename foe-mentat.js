// const BuildingStatus = require('./model/buildingStatus');
// import BuildingStatus from "./model/buildingStatus";

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

document.getElementById("pearlStatusToggle").onclick = () => { toggleDiv("pearlStatus") };
document.getElementById("myContributionsToggle").onclick = () => { toggleDiv("myContributions") };

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

class BuildingStatus {
    // constructor() {
    //     this.buildingLevel = -1;
    //     this.buildingUnlockedLevel = -1;
    //     this.totalInvestedFP = -1;
    //     this.fpToLevelUp = -1;
    //     this.contributions = [];
    //     this.ownerId = -1;
    // }

    constructor(buildingLevel, buildingUnlockedLevel, totalInvestedFP, maxFPToLevelUp, ownerId) {
        this.buildingLevel = buildingLevel;
        this.buildingUnlockedLevel = buildingUnlockedLevel;
        this.totalInvestedFP = totalInvestedFP;
        this.maxFPToLevelUp = maxFPToLevelUp;
        this.ownerId = ownerId;
        this.ownerInvestment = 0;
        this.contributions = [];
    }

    //a number of remaining fp to level up
    get fpToLevelUp() {
        return this.maxFPToLevelUp - this.totalInvestedFP;
    }

    //a number of points invested by the player
    get playerInvestment() {
        let res = 0;
        this.contributions.forEach(contrib => {
            if(contrib.contributor.isPlayer === true) {
                res = contrib.investedFP;
            }
        });
        return res;
    }

    static create(buildingServerData, contributionsServerData) {
        const buildingLevel = defaultValue(buildingServerData.level, 0);
        const buildingUnlockedLevel = defaultValue(buildingServerData.max_level, 0);
        const investedPoints = defaultValue(buildingServerData.state.invested_forge_points, 0);
        const pointsForLevelUp = defaultValue(buildingServerData.state.forge_points_for_level_up, 0);
        const ownerId = defaultValue(buildingServerData.player_id, 0);

        const res = new BuildingStatus(buildingLevel, buildingUnlockedLevel, investedPoints, pointsForLevelUp, ownerId);
        const contributions = [];
        // for(let i=0; )
        contributionsServerData.rankings.forEach(rank => {
            const contrib = ContributionStatus.create(rank, res);
            contributions.push(contrib);
        });

        res.contributions = contributions;
        return res;
    }
}

class ContributionStatus {
    // constructor() {
    //     this.contributor = undefined;
    //     this.buildingStatus = undefined;
    //     this.investedFP = -1;
    //     this.baseFPReward = -1;
    // }

    /**
     * 
     * @param {Number} rank 
     * @param {Contributor} contributor 
     * @param {BuildingStatus} buildingStatus 
     * @param {Number} investedFP 
     * @param {Reward} reward 
     */
    constructor(rank, contributor, buildingStatus, investedFP, reward) {
        this.rank = rank;
        this.contributor = contributor;
        this.buildingStatus = buildingStatus;
        this.investedFP = investedFP;
        this.reward = reward;
    }

    static create(contributionStatusServerData, buildingStatus) {
        const rank = contributionStatusServerData.rank;
        const investedFP = defaultValue(contributionStatusServerData.forge_points, 0);
        const contributor = Contributor.create(contributionStatusServerData.player);
        const reward = Reward.create(contributionStatusServerData.reward);
        
        const res = new ContributionStatus(rank, contributor, buildingStatus, investedFP, reward);
        if(contributor.isPlayer) {
            buildingStatus.ownerInvestment = investedFP;
        }
        res.contributor.contribution = res;
        return res;
    }

    get isPlaceSecured() {
        if(this.contributor.isBuildingOwner) {
            return undefined;
        }
        const pointsToSecure = this.pointsToSecure;
        return pointsToSecure <= 0;
    }

    get canPlayerOverbidAndSecurePlace() {
        if(this.isValidRank !== true) {
            //you cannot overbid yourself
            return false;
        } else {
            const fpToLevelUp = this.buildingStatus.fpToLevelUp;
            const pointsToSecure = this.pointsToOverbidAndSecureByPlayer;
            return pointsToSecure < fpToLevelUp;
        }
    }

    get canPlayerOverbid() {
        if(this.isValidRank !== true) {
            return false;
        } else {
            const fpToLevelUp = this.buildingStatus.fpToLevelUp;
            const playerInvestment = this.buildingStatus.playerInvestment;
            return fpToLevelUp > this.investedFP - playerInvestment;
        }
    }

    get securedPlacePlayerFPBaseReward() {
        let rewardFP = 0;
        if(this.reward && this.reward.fp) {
            rewardFP = this.reward.fp;
        }
        return rewardFP;
    }

    get securedPlacePlayerFPReward() {
        let rewardFP = 0;
        if(this.reward && this.reward.fp) {
            rewardFP = this.reward.getFPWithBonus(playerArcBonus);
        }
        return rewardFP;
    }

    get securedPlacePlayerMedalsReward() {
        let rewardMedals = 0;
        if(this.reward && this.reward.medals) {
            rewardMedals = this.reward.getMedalsWithBonus(playerArcBonus);
        }
        return rewardMedals;
    }

    get securedPlacePlayerBlueprintsReward() {
        let rewardBlueprints = 0;
        if(this.reward && this.reward.blueprints) {
            rewardBlueprints = this.reward.getBlueprintsWithBonus(playerArcBonus);
        }
        return rewardBlueprints;
    }

    get securedPlacePlayerFPIncome() {
        if(!this.isValidRank === true) {
            return NaN;
        }
        let rewardFP = this.securedPlacePlayerFPReward;
        let pointsToInvest;
        if(this.contributor.isPlayer) {
            pointsToInvest = Math.max(this.pointsToSecure,0);
        } else if(this.canPlayerOverbidAndSecurePlace) {
            pointsToInvest = this.pointsToOverbidAndSecureByPlayer;   
        } else {
            return 0;
        }
        return rewardFP - pointsToInvest - this.buildingStatus.playerInvestment;
    }

    //how much invested a player on the next place 
    get pointsOfTheFollowingContribution() {
        const allContribs = this.buildingStatus.contributions;
        let currentContribIndex = -1;
        let res = 0;
        for(let i=0; i<allContribs.length && res == 0; i++) {
            const contrib = allContribs[i];
            if(contrib === this) {
                currentContribIndex = i;
                for(let j=currentContribIndex+1; j<allContribs.length && res == 0; j++) {
                    const nextContrib = allContribs[j];
                    if(nextContrib.rank && nextContrib.rank > 0) {
                        res = nextContrib.investedFP;
                    }
                }
            }
            
        }
        return res;
    }

    get pointsToSecureByPlayerRemaining() {
        if(this.isValidRank !== true) {
            return NaN;
        }
        let res = -1;
        const fpToLevelUp = this.buildingStatus.fpToLevelUp;
        if(this.contributor.isPlayer) {
            res = this.pointsToSecure;
        } else {
            res = this.pointsToOverbidAndSecureByPlayer;
        }
        if(res >= fpToLevelUp) {
            return NaN;
        } else {
            return res;
        }
    }

    get pointsToSecureByPlayerTotal() {
        const remain = this.pointsToSecureByPlayerRemaining;
        if(remain === undefined || isNaN(remain)) {
            return NaN;
        }    
        return remain + this.buildingStatus.playerInvestment;
    }

    //number of points that remains to invest of the contributor to secure the place
    get pointsToSecure() {
    // get pointsToSecure() {
        if(this.isValidRank !== true) {
            return NaN;
        }
        // (how much to end of level):
        const fpToLevelUp = this.buildingStatus.fpToLevelUp;
        //(how much invested a player on the next place)
        const nextInvestment = this.pointsOfTheFollowingContribution;
        //(how much the current player already invested) – (how much invested a player on the next place) = (how much more the current player invested than the next player)
        const nextInvestmentDiff = this.investedFP - nextInvestment;
        //(how much to end of level) – (how much more the current player invested than the next player) = (result)
        const result = fpToLevelUp - nextInvestmentDiff;
        const finalResult = Math.ceil(result / 2);
        return finalResult;
    }

    get pointsToSecureTotal() {
        const remain = this.pointsToSecure;
        if(remain === undefined || isNaN(remain)) {
            return NaN;
        }
        return remain + this.investedFP;
    }

    get pointsToOverbidAndSecureByPlayer() {
        if(this.contributor.isPlayer) {
            return 0;
        } else { //another player is the contributor. We need to calculate how many points the player should invest to overbid and block the place
            // (how much to end of level):
            const fpToLevelUp = this.buildingStatus.fpToLevelUp;
            //(how much invested a player, which you want to overtake) – (how much you already invested) = (how much less you invested than the player, which you want to overtake)
            const investmentDiff = this.investedFP - this.buildingStatus.playerInvestment;
            //(how much to end of level) + (how much less you invested than the player, which you want to overtake) = (result)
            const result = fpToLevelUp + investmentDiff;
            const finalResult = Math.ceil(result / 2);
            return finalResult;
        }
    }

    get isValidRank() {
        return this.rank && this.rank > 0;
    }
}

class Contributor {
    // constructor() {
    //     this.contribId = -1;
    //     this.isBuildingOwner = false;
    //     this.isPlayer = false;
    // }

    constructor(contribId, isPlayer, name) {
        this.contribId = contribId;
        // this.isBuildingOwner = isBuildingOwner;
        this.isPlayer = isPlayer;
        this.contribution = undefined;
        this.name = name;
    }

    static create(contributorServerData) {
        const contribId = contributorServerData.player_id;
        const isPlayer = contributorServerData.is_self;
        const name = contributorServerData.name;
        const res = new Contributor(contribId, isPlayer, name);
        return res;
    }

    get isBuildingOwner() {
        const ownerId = this.contribution.buildingStatus.ownerId;
        return this.contribId == ownerId;
    }
}

class Reward {
    constructor(fp, blueprints, medals) {
        this.fp = fp;
        this.blueprints = blueprints;
        this.medals = medals;
    }

    static create(rewardServerData) {
        if(! rewardServerData) {
            return undefined;
        }
        const fp = rewardServerData.strategy_point_amount;
        const blueprints = rewardServerData.blueprints;
        const medals = rewardServerData.resources.medals;
        
        const res = new Reward(fp, blueprints, medals);
        return res;
    }

    getFPWithBonus(bonusMultiplier) {
        return this.calcBonus(this.fp, bonusMultiplier);
    }

    getBlueprintsWithBonus(bonusMultiplier) {
        return this.calcBonus(this.blueprints, bonusMultiplier);
    }

    getMedalsWithBonus(bonusMultiplier) {
        return this.calcBonus(this.medals, bonusMultiplier);
    }

    /**
     * 
     * @param {Number} base 
     * @param {Number} bonusMultiplier (1.0 to 1.9 or more)
     */
    calcBonus(base, bonusMultiplier) {
        return Math.round(base * bonusMultiplier);
    }
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
            if(reqClass && reqClass == "GreatBuildingsService" 
                && reqMethod && reqMethod == "getConstruction") {
                    const respObjArr = JSON.parse(body);
                    let contributionData;
                    let buildingData;
                    for ( let i=0; i<respObjArr.length; i++ ) {
                        let respObj = respObjArr[i]
                        const respClass = respObj.requestClass;
                        const respMethod = respObj.requestMethod;
                        //contribution data
                        if(respClass && respClass == "GreatBuildingsService" && respMethod && respMethod == "getConstruction") {
                            const respData = respObj.responseData;
                            contributionData = parseContributionData(respData);
                        }
                        if(respClass && respClass == "CityMapService" && respMethod && respMethod == "updateEntity") {
                            const respData = respObj.responseData[0];
                            buildingData = parseBuildingData(respData);
                        }
                    }
                    if(contributionData && buildingData) {
                        const bs = BuildingStatus.create(buildingData, contributionData);
                        greatBuildingStatus = bs;
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
                

            }
        }
      }
    });
  });

  const parseContributionData = (responseObject => {
    const res = {...responseObject};
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
        <h2 id="pearlStatusHeader">Great building contributions</h2>
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
    res += `<h2>My great building contributions summary:</h2>`;
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