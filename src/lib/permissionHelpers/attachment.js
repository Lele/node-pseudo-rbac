const { logger } = require('../../../ceres/config');
const PermissionHelper = require('./permissionHelper');
const { getRolesFromGroups } = require('../../../ceres/config/groupsAndPermission');

/**
* get all the roles played by the user with respect to the resource
*/
const getRoles = (attachment, user, userGroups) => {
  const roles = [];
  if (attachment.author.id === user.user_id) {
    logger.log('debug', 'the user is author');
    roles.push(...getRolesFromGroups(userGroups));
  }
  return roles;
};

const TicketHelper = new PermissionHelper('attachment', 'uri', getRoles);

module.exports = TicketHelper;
