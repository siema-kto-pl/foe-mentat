export class Contributor {

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