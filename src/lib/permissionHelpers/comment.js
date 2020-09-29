const { logger } = require('../../../ceres/config');
const PermissionHelper = require('./permissionHelper');
const { getRolesFromGroups } = require('../../../ceres/config/groupsAndPermission');

/**
* get all the roles played by the user with respect to the resource
*/
const getRoles = (comment, user, userGroups) => {
  const roles = [];
  if (comment.author.id === user.user_id) {
    logger.log('debug', 'the user is the author of the comment');
    roles.push(...getRolesFromGroups(userGroups));
  }
  return roles;
};

const TicketHelper = new PermissionHelper('comment', '_id', getRoles);

module.exports = TicketHelper;
