export class ExpeditionContributors {
    constructor(currentDate, playerContr) {
        this.currentDate = currentDate;
        this.playerContr = playerContr;
    }

    static create(expDataArray) {
        const today = new Date();
        const date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
        const time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
        const dateTime = date+' '+time;
        const playerContr = [];
        expDataArray.forEach(el => {
            const contrb = {
                player: el.player.name,
                solvedEncounters: el.solvedEncounters
            }
            playerContr.push(contrb);
        });
        playerContr.sort((a, b) => a.solvedEncounters - b.solvedEncounters);
        const res = new ExpeditionContributors(dateTime, playerContr);
        return res;
    }
}