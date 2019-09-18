# mcubed-lineup-insight-server

Description
----
A node module that caches and serves fantasy sports data.

[mcubed-lineup-insight-data](https://github.com/nickp10/mcubed-lineup-insight-data) vs. [mcubed-lineup-insight-server](https://github.com/nickp10/mcubed-lineup-insight-server)
----
mcubed-lineup-insight-server is a node module that relies on mcubed-lineup-insight-data for all of its data. The data module is used for retrieving the fantasy sports data from third-parties. The server module is used for aggregating the data for all the current contests and merging the data from the different third-parties into the contests.

Features
----
* The ability to serve fantasy sports data over HTTP
* The ability to cache fantasy sports data for quick response times
* The ability to aggregate fantasy sports data from multiple sources/sports into one response
* The ability to merge fantasy sports data for the same entity (player, team, contest, etc.)

Command Line Interface
----
This node module is only usable from the command line using `mcubed-lineup-insight-server -p 80`. The arguments for the command line interface are:

* *-p / --port* - **Optional.** Specifies the port on which to run the lineup insight server. This will default to 8000.
* *--mongoConnectionUrl* - **Optional.** Indicates the connection URL to the MongoDB instance. Refer to the [MongoDB](#mongodb) section. Both MongoDB options must be specified to enable the persistence feature.
* *--mongoDBName* - **Optional.** Indicates the name of the database to connect to within the MongoDB instance. Refer to the [MongoDB](#mongodb) section. Both MongoDB options must be specified to enable the persistence feature.

<a name="mongodb"></a>
[MongoDB](https://www.mongodb.com/)
----
This module relies on a connection to a MongoDB instance to store alternate and missing names when merging the fantasy sports data. Different third-parties refer to the same player with slight variations in the name. Alternate names are used to map these variations to the players defined in the contests. Missing names are used to store those names that cannot match a player defined in the contests. To enable these two features, both MongoDB options must be specified on the CLI. Refer to the MongoDB documentation on how to obtain a connection URL. The collection names used by this module are:

* *lineupalternatenames* - Stores the mapping between a third-party player name and the corresponding contest name.
* *lineupmissingnames* - Stores the names that cannot be mapped to a corresponding contest name.

Accessing the Data
----
Accessing the data is done using the read operation via the RESTful GET verb. The URL to the data will be:

`http://{server-name}:{server-port}`

* *server-name* - **Required.** Indicates the server name or IP address on which the lineup insight server is running.
* *server-port* - **Required.** Indicates the server port on which the lineup insight server is running.

The HTTP endpoints that are exposed are:

* *GET /contest-list/full* - Retrieves the contest list and all corresponding insight data. This will return a [Contest](https://github.com/nickp10/mcubed-lineup-insight-data#Contest)[].
* *GET /contest-list/summary* - Retrieves the contest list containing only summary information. This will return a [ServerContestSummary](#ServerContestSummary)[].
* *GET /contest-data/{contest-id}* - Retrieves the contest data with its corresponding insight data for a specific contest. This will return a [Contest](https://github.com/nickp10/mcubed-lineup-insight-data#Contest). *contest-id* is required and indicates the ID of the contest to retrieve the data for.
* *GET /player-card/{contest-id}/{player-id}* - Retrieves the player card for a single player. This will return a [PlayerCard](https://github.com/nickp10/mcubed-lineup-insight-data#PlayerCard). *contest-id* is required and indicates the ID of the contest to retrieve a player card for. *player-id* is required and indicates the ID of the player to retrieve a player card for.

API
----
The data returned via the HTTP server follows the same API as defined by [mcubed-lineup-insight-data](https://github.com/nickp10/mcubed-lineup-insight-data#InsightData). However, this module contains the following additional data elements.

#### <a name="ServerContestSummary"></a>SeverContestSummary
Instances of this class are returned when hitting the summary contest-list endpoint.

* `contestType: ContestType` - Specifies the [ContestType](https://github.com/nickp10/mcubed-lineup-insight-data#ContestType).
* `ID: string` - Specifies a unique identifier for the contest.
* `label: string` - Specifies a label describing the contest.
* `sport: Sport` - Specifies the [Sport](https://github.com/nickp10/mcubed-lineup-insight-data#Sport).
* `startTime?: Date` - Optionally specifies the start time for the contest.

#### <a name="ServerPlayer"></a>ServerPlayer
Instances of this class are extensions of the [Player](https://github.com/nickp10/mcubed-lineup-insight-data#Player) class. When retrieving the full contest-list or a specific contest-data, the players nested in the contest data will contain these data elements along with the data elements from the parent [Player](https://github.com/nickp10/mcubed-lineup-insight-data#Player) class.

* `isPlaying?: boolean` - Optionally specifies a single boolean that combines if a player is starting or is the probable pitcher (i.e., `isPlaying === isStarter || isProbablePitcher`).
* `likeability?: number` - Optionally specifies a single number between 0 and 100 determining how much the lineup insight server likes the player (0 indicates hate and 100 indicates love).
* `opponent?: string` - Optionally specifies the team abbreviation for the player's opponent.
* `oppositionPercentile?: number` - Optionally specifies the percentile in which the player's opposition allows fantasy points at the player's position. For MLB, instead of basing it on the player's position, it is based on the player's handedness. A higher percentile translates to the player's opposition allowing more fantasy points. A lower percentile translates to the player's opposition allowing fewer fantasy points. The percentile will always range from 0 to 100.
* `projectedPointsPercentiles?: PositionPercentile[]` - Optionally specifies an array of [PositionPercentiles](#PositionPercentile). The percentile will be a number from 0 to 100 indicating where the player's total projected points compare to all other players at that position. If a player is eligible for multiple positions (e.g, a `RB` and a `FLEX` position), then the player will have a percentile for each position independently.
* `projectedPointsPerDollar?: number` - Optionally specifies a number that indicates how many points the player is projected per dollar (based on salary).
* `projectedPointsPerDollarPercentiles?: PositionPercentile[]` - Optionally specifies an array of [PositionPercentiles](#PositionPercentile). The percentile will be a number from 0 to 100 indicating where the player's projected points per dollar compare to all other players at that position. If a player is eligible for multiple positions (e.g, a `RB` and a `FLEX` position), then the player will have a percentile for each position independently.
* `projectedCeiling?: number` - Optionally specifies a number that indicates the most number of points the player is projected to obtain.
* `projectedFloor?: number` - Optionally specifies a number that indicates the least number of points the player is projected to obtain.
* `projectedPoints?: number` - Optionally specifies a number that indicates the likely number of points the player is projected to obtain.
* `recentAveragePoints?: number` - Optionally specifies a number that indicates the average number of points the player has scored recently.
* `seasonAveragePoints?: number` - Optionally specifies a number that indicates the average number of points the player has scored on the season.

#### <a name="PositionPercentile"></a>PositionPercentile
Instances of this class are associated with a [ServerPlayer](#ServerPlayer) and represent a player's percentile for a single position.

* `position: string` - Specifies the position the player is eligible for.
* `percentile: number` - Specifies the percentile that the player falls within for that position.
