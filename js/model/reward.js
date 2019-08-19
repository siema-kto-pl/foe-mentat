export class Reward {
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