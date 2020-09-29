// const Notation = require('notation');
const { logger } = require('../../ceres/config');
const { labels, getMessage } = require('../config/messages');
const { groupsAndPermConf, can } = require('../../ceres/config/groupsAndPermission.js');
const PermissionHelper = require('./permissionHelpers/permissionHelper');

// const ac = new AccessControl(configPermission);

/**
 * check the permission requested against possession
 *
 * @param {string} resourceName     the name of the resource
 * @param {string} action           the action to be performed over the resourceName
 * @param {Array|string} possession the type of possession to be checked
 * @param {Array} roles             the roles to be checked
 * @return{Array}                   the list of granted roles
 */
const check = (resourceName, action, possessions, roles) => {
  try {
    const possessionArray = [];
    if (!Array.isArray(possessions)) {
      possessionArray.push(possessions);
    } else {
      possessionArray.push(...possessions);
    }
    let permissions = [];
    for (let i = 0; i < possessionArray.length; i += 1) {
      const possession = possessionArray[i];
      logger.log('debug', 'CHECK - check permission resource:%s, roles: %s, action: %s, possession: %s', resourceName, roles, action, possession);
      permissions.push(...roles.map(role => can(role, action, possession, resourceName)));
    }

    permissions = permissions.filter(permission => permission && permission.granted);

    return permissions;
  } catch (e) {
    logger.log('error', 'CHECK - error checking permission: %s', e.message);
    return [];
  }
};

/**
 * check any and own permissions of a user on a resource against a specific action
 *
 * @param {object} user         the user object
 * @param {string} action       the action to be performed
 * @param {string} resourceName the resource name
 * @param {object} resource     the resource object
 * @param {Array} startingRoles if specified, the role bucket to verify
 * @return{Array}               the granted permission objects
 */
const checkPermission = (user, action, resourceName, resource,
  permissionHelper = false, currentRoles = false) => {
  let startingRoles = currentRoles;
  // console.log(startingRoles);
  if (startingRoles !== false && startingRoles.some(item => item.roles)) {
    startingRoles = startingRoles.map(item => item.roles);
  }

  const userGroups = groupsAndPermConf.groups
    .filter(({ id }) => user.groups && user.groups.includes(id));

  let anyRoles = startingRoles;

  if (anyRoles === false) {
    anyRoles = userGroups.map(group => group.name);
  }

  logger.log('debug', 'CHECK PERMISSION - checking "any" %s permission on %s with roles %s', action, resourceName, JSON.stringify(anyRoles));

  const anyPermissions = check(resourceName, action, 'any', anyRoles);

  logger.log('debug', 'CHECK PERMISSION - "any" permission array: %s', JSON.stringify(anyPermissions));

  let helper = permissionHelper;
  if (!helper) {
    helper = new PermissionHelper();
  }

  logger.log('debug', 'CHECK PERMISSION - get "own" roles');
  let ownRoles = helper.getRoles(resource, user, userGroups);
  // console.log('ownRoles', ownRoles);
  if (startingRoles !== false) {
    ownRoles = ownRoles.filter(label => startingRoles.includes(label));
  }

  logger.log('debug', 'CHECK PERMISSION - own roles: %s', JSON.stringify(ownRoles));


  logger.log('debug', 'CHECK PERMISSION - checking "own" %s permission on %s with roles %s', action, resourceName, JSON.stringify(ownRoles));

  const ownPermissions = [];
  if (ownRoles.length > 0) {
    ownPermissions.push(...check(resourceName, action, 'own', ownRoles));
  }

  logger.log('debug', 'CHECK PERMISSION - "own" permission array: %s', JSON.stringify(ownPermissions));

  if (ownPermissions.length === 0 && anyPermissions === 0) {
    return [];
  }
  return [
    ...anyPermissions,
    ...ownPermissions,
  ];
};

/**
 * getFilters - get all the filters needed to retrieve all the resources the user can Manager
 * @param {object} user          the user object
 * @param {string} resourceName  the resource name
 * @return {Array}               the array af all the filters
 */
const getFilters = (user, resourceName, permissionHelper) => {
  const userGroups = groupsAndPermConf.groups
    .filter(({ id }) => user.groups && user.groups.includes(id));

  const anyRoles = check(resourceName, 'get', 'any', userGroups.map(({ name }) => name));

  if (anyRoles.length !== 0) {
    logger.log('debug', 'GET FILTERS - user\'s (id = %s) permission on %s are set to "any"', user.user_id, resourceName);

    return false;
  }

  let helper = permissionHelper;
  if (!helper) {
    helper = new PermissionHelper();
  }

  const filters = helper.getFilters(user, userGroups);
  return filters;
};

/**
 * accessMiddleware - get the check permission middleware
 * @param {string} action        the action to be performed
 * @param {string} resourceName  the resource name
 * @return{function}             the middleware function
 */
const accessMiddleware = (action, resourceName,
  permissionHelper = false, objectName = false) => (req, res, next) => {
  const currentRoles = req.permissions || false;
  const resource = objectName ? req[objectName] : req[resourceName];

  logger.log('debug', 'ACCESS MIDDLEWARE - Verify %s permission on %s of user %s', action, resourceName, req.user.user_id);
  const permissions = checkPermission(req.user, action, resourceName, resource,
    permissionHelper, currentRoles);

  logger.log('debug', 'ACCESS MIDDLEWARE - permission array: %s', JSON.stringify(permissions));
  if (permissions.length === 0) {
    return res.status(401).json({ message: getMessage(labels.UNAUTHORIZED) });
  }
  req.permissions = permissions;
  return next();
};

/**
 * filterMiddleware - get the filter middleware
 * @param {string} resourceName  the resource name
 * @return{function}             the middleware function
 */
const filterMiddleware = (resourceName, permissionHelper = false) => (req, res, next) => {
  logger.log('debug', 'FILTER MIDDLEWARE - getting filter array for %s', resourceName);

  req.filters = getFilters(req.user, resourceName, permissionHelper);
  return next();
};

module.exports = {
  check,
  checkPermission,
  getFilters,
  accessMiddleware,
  filterMiddleware,
};
