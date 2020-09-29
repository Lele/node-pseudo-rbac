const { logger } = require('../../../ceres/config');
const PermissionHelper = require('./permissionHelper');

/**
* get all the roles played by the user with respect to the resource
*/
const getRoles = (scheduledAction, user, userGroups) => {
  const roles = [];
  if (user.user_id === scheduledAction.author.id) {
    logger.log('debug', 'Current user is the author of the scheduled action');
    roles.push(...userGroups.map(({ name }) => name));
  }
  return roles;
};

const getFilters = (user) => {
  const filters = [
    { 'author.id': user.user_id },
  ];
  return filters;
};

const TicketHelper = new PermissionHelper('scheduledAction', '_id', getRoles, getFilters);

module.exports = TicketHelper;
