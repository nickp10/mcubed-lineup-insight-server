# mcubed-lineup-insight-server

Description
----
A node module that caches and serves fantasy sports data.

[mcubed-lineup-insight-data](https://github.com/nickp10/mcubed-lineup-insight-data) vs. mcubed-lineup-insight-server
----
This node module relies on mcubed-lineup-insight-data for all of its data. The main features that this node module add are:

* The ability to serve fantasy sports data over HTTP
* The ability to cache fantasy sports data for quick response times
* The ability to aggregate fantasy sports data from multiple sources/sports into one response
* The ability to merge fantasy sports data for the same entity (player, team, contest, etc.)

Command Line Interface
----
This node module is only usable from the command line using `mcubed-lineup-insight-server -p 80`. The arguments for the command line interface are:

* *-p / --port* - **Optional.** Specifies the port on which to run the server. This will default to 8000.
