const { isGroupInCategory } = require('../../../ceres/config/groupsAndPermission');

class PermissionHelper {
  /** Permission helper is the container of all the information needed by the permission module.
   *
   * @param resource    the name of the resource
   * @param idField     the id property of the resource (e.g. '_id' for all mongo collection)
   * @param getRoles    a function (resource, user):array where resource is
   * the actual resource object and user the current user object and userGroups is the array
   * of all the groups of the user
   * @param getFilters  a function (user, userGroups):array where user is the current user object
   * and userGroups is the array of all the groups of the user
  */
  constructor(resourceName, idField, getRoles = false, getFilters = false) {
    this.resource = resourceName;

    this.idField = idField;
    // set getRoles function or fallBack to default
    this.getRoles = getRoles
      || ((resource, user, userGroups) => userGroups.map(({ name }) => name));
    // set getFilters function or fallback to default
    this.getFilters = getFilters || (() => []);
  }


  /**
   * @static filterGroups - get groups filtered by category and/or by system groups
   *
   * @param  {array} groups               the array to be filtered
   * @param  {int} category = false       if present, the category to filter the group array
   * @param  {string} systemGroup = false if present, the system group to filter the group array
   * @return {array}                      the filtered group array
   */
  static filterGroups(groups, category = false, systemGroup = false) {
    const filtered = groups.filter((group) => {
      if (systemGroup !== false && !group.systemGroups[systemGroup]) return false;

      if (category !== false) {
        const isIn = isGroupInCategory(group.id, category);
        return isIn;
      }
      return true;
    });
    return filtered;
  }
}

module.exports = PermissionHelper;
