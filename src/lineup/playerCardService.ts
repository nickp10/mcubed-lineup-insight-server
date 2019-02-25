import insightData, { IContest, IPlayer, IPlayerCard } from "mcubed-lineup-insight-data";
import log from "../log";

export default class PlayerCardService {
    async getPlayerCard(contest: IContest, player: string | IPlayer): Promise<IPlayerCard> {
        const playerID = typeof player === "string" ? player : player.ID;
        log.info(`Start retrieving player card for contestID=${contest.ID} and playerID=${playerID}`);
        try {
            const playerCard = await insightData.getPlayerCard(contest.contestType, contest.ID, playerID);
            log.info(`Finished retrieving player card for contestID=${contest.ID} and playerID=${playerID}`);
            return playerCard;
        } catch (error) {
            log.error(`Could not retrieve player card for contestID=${contest.ID} and playerID=${playerID}`);
            log.exception(error);
            return {
                gameLog: [],
                news: []
            };
        }
    }
}
