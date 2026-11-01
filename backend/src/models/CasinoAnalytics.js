/**
 * Mongoose Model: CasinoAnalytics
 * 
 * Stores one pre-aggregated document per calendar day covering hourly
 * revenue buckets and per-game-type breakdowns for the analytics dashboard.
 */

'use strict';

const { CasinoAnalytics } = require('../../../../database/nosql/mongodb-schema');

module.exports = CasinoAnalytics;
