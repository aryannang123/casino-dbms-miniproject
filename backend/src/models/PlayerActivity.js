/**
 * Mongoose Model: PlayerActivity
 * 
 * Tracks login history, session counts, and per-action activity logs
 * for each player. Complements the MySQL PLAYER table with behavioural data.
 */

'use strict';

const { PlayerActivity } = require('../../../../database/nosql/mongodb-schema');

module.exports = PlayerActivity;
