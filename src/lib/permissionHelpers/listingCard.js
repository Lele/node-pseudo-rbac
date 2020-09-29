const { logger } = require('../../../ceres/config');
const PermissionHelper = require('./permissionHelper');

/**
* get all the roles played by the user with respect to the resource
*/
const getRoles = (listingCard, user, userGroups) => {
  try {
    const roles = [];
    const listing = listingCard.listingObj;

    if (listingCard.author && listingCard.author.id === user.user_id) {
      logger.log('debug', 'LISTING CARD PERM.: the user is the author of the listing card');
      roles.push(...userGroups.map(({ name }) => name));
    }

    if (listing && listing.account_manager_id === user.user_id) {
      logger.log('debug', 'LISTING CARD PERM.: the user is the account manager of the listing');
      roles.push(...(PermissionHelper.filterGroups(userGroups, false, 'accountManager').map(({ name }) => `${name}AM`)));
    }

    const areas = Object.assign([], ...user.groups_areas.map(ga => ga.areas));

    if (listing && ((!areas || areas.length === 0)
      || areas.includes(listing.area_id))) {
      logger.log('debug', 'LISTING CARD PERM.: the user is in the same area of the listing');

      roles.push(...userGroups.map(({ name }) => name));
    }

    return roles;
  } catch (e) {
    logger.log('error', 'LISTING CARD PERM.: Error while evaluating listing card permissions %s', e.message);

    return [];
  }
};

const getFilters = (user) => {
  const filters = [
    { 'author.id': user.user_id },
  ];
  return filters;
};

const TicketHelper = new PermissionHelper('listingCard', '_id', getRoles, getFilters);

module.exports = TicketHelper;
