/**
 * Mongoose Model: GameLog
 * 
 * Tracks a full game session life-cycle including every in-game event.
 * Re-exported from the central schema file for clean controller imports.
 */

'use strict';

const { GameLog } = require('../../../../database/nosql/mongodb-schema');

module.exports = GameLog;
