export class BuildingStatus {

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
        contributionsServerData.forEach(rank => {
            const contrib = ContributionStatus.create(rank, res);
            contributions.push(contrib);
        });

        res.contributions = contributions;
        return res;
    }
}