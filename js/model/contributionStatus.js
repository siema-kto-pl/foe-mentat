export class ContributionStatus {
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