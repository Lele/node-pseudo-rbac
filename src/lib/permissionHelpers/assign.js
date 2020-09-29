const { logger } = require('../../../ceres/config');
const PermissionHelper = require('./permissionHelper');

/**
* get all the roles played by the user with respect to the resource
*/
const getRoles = (assign, user, userGroups) => {
  logger.log('debug', 'ASSIGN GET ROLES - check assignement: assignee %s, user %s', assign, user.user_id);

  const roles = [];
  if (assign === user.user_id) {
    logger.log('debug', 'ASSIGN GET ROLES - the user is self-assigning the ticket');
    // assign permission is *always* on the "Group" system group
    roles.push(...userGroups.map(({ name }) => `${name}Group`));
  }
  return roles;
};

const TicketHelper = new PermissionHelper('assign', '_id', getRoles);

module.exports = TicketHelper;
