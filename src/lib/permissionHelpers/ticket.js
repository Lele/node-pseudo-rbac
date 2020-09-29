const { getAllCategoriesFromGroups } = require('../../../ceres/config/groupsAndPermission');
const { logger } = require('../../../ceres/config');
const PermissionHelper = require('./permissionHelper');

/**
* get all the roles played by the user with respect to the resource
*/
const getRoles = (ticket, user, userGroups) => {
  const roles = [];
  const { watchers } = ticket;

  for (let i = 0, found = false; watchers && i < watchers.length && !found; i += 1) {
    if (!watchers[i].group && watchers[i].id === user.user_id) {
      logger.log('debug', 'the user is watcher');
      roles.push(
        ...(userGroups.filter(({ systemGroups }) => systemGroups && systemGroups.watcher)
          .map(({ name }) => `${name}Watcher`)),
      );
      found = true;
    } else if (watchers[i].group && user.groups.indexOf(watchers[i].id) !== -1) {
      logger.log('debug', 'the user is group watcher');
      const group = userGroups.find(({ id }) => watchers[i].id === id);
      roles.push(`${group.name}Watcher`);
    }
  }

  if (ticket.assignee && ticket.assignee.id === user.user_id) {
    logger.log('debug', 'the user is assignee');
    roles.push(...(PermissionHelper.filterGroups(userGroups, ticket.category, 'assignee').map(({ name }) => `${name}Assignee`)));
  }

  const groups = user.groups.filter(id => userGroups.find(userGroup => (userGroup.id === id
    && userGroup.systemGroups.group)));

  const categoriesId = getAllCategoriesFromGroups(groups);

  if (categoriesId.indexOf(ticket.category) !== -1) {
    // find all the target groups of the category
    const catGroups = PermissionHelper.filterGroups(userGroups, ticket.category, 'group');
    const catGroupIds = catGroups.map(({ id }) => id);

    const groupsAreas = user.groups_areas.filter(ga => catGroupIds.includes(ga.group));

    // find the user areas
    const areas = [];
    if (!groupsAreas.some(ga => ga.areas.length === 0)) {
      groupsAreas.forEach((ga) => {
        areas.push(...ga.areas);
      });
    }

    // verify that the user is in the same area of the ticket listing (if present)
    if (areas && areas.length > 0) {
      // if the user has areas then check the areaId
      if (ticket.areaId) {
        if (areas.includes(ticket.areaId)) {
          logger.log('debug', 'the ticket is in the right category and area');
          roles.push(...(PermissionHelper.filterGroups(userGroups, ticket.category, 'group').map(({ name }) => `${name}Group`)));
        } else {
          logger.log('debug', 'the ticket is in the right category but the ticket area is not');
        }
      } else {
        logger.log('debug', 'the ticket is in the right category, the ticket has no area');
        roles.push(...(PermissionHelper.filterGroups(userGroups, ticket.category, 'group').map(({ name }) => `${name}Group`)));
      }
    } else {
      // otherwise the user can see all areas
      logger.log('debug', 'the ticket is in the right category, the user has no associated areas');
      roles.push(...(PermissionHelper.filterGroups(userGroups, ticket.category, 'group').map(({ name }) => `${name}Group`)));
    }
  }

  if (ticket.accountManager && ticket.accountManager.id === user.user_id) {
    roles.push('accountManager');
  }

  if (ticket.author.id === user.user_id) {
    logger.log('debug', 'the user is author');
    roles.push(...userGroups.map(({ name }) => name));
  }

  return roles;
};

/**
* get all the necessary filters to retrieve the list of all
* the tickets the user is authorized to interact
*/
const getFilters = (user, userGroups) => {
  const filters = [];

  // get all the system groups
  const systemGroups = userGroups.reduce((aggr, currentGroup) => {
    // sg? Che vordì sg? Sandro Giacobbe? no, systemGroup
    const { group, ...sg } = currentGroup.systemGroups;
    const newAggr = {
      ...aggr,
      ...sg,
    };

    // collect all the elements id that has the "group" system group
    // (sorry for the word-game (gioco di parole))
    if (group) {
      newAggr.group.push(currentGroup.id);
    }
    return newAggr;
  }, { group: [] });

  if (systemGroups.assignee) {
    logger.log('info', 'TICKET FILTERS: Adding assignee condition');

    filters.push({ 'assignee.id': user.user_id });
  }

  if (systemGroups.watcher) {
    filters.push({ watchers: { $elemMatch: { id: user.user_id, group: false } } });

    // add group watcher filter
    filters.push(...user.groups_areas.map((ga) => {
      const condition = [
        { watchers: { $elemMatch: { id: ga.group, group: true } } },
      ];
      if (ga.areas && ga.areas.length > 0) {
        condition.push({ $or: [{ areaId: null }, { areaId: { $in: ga.areas } }] });
      }
      return {
        $and: condition,
      };
    }));
  }

  // Group Role filters
  if (systemGroups.group && systemGroups.group.length > 0) {
    const categoriesFromGroups = getAllCategoriesFromGroups(systemGroups.group, true);
    logger.log('info', 'TICKET FILTERS: Adding group condition');
    if (categoriesFromGroups.length > 0) {
      const groupConditions = [];

      groupConditions.push(...categoriesFromGroups.map((cat) => {
        const catGroups = user.groups_areas
          .filter(ga => cat.groups.includes(ga.group));
        const areaFilters = [];

        if (!catGroups.some(gr => gr.areas.length === 0)) {
          areaFilters.push(...catGroups.reduce((aggr, cg) => {
            aggr.push(...cg.areas);
            return aggr;
          }, []));
        }

        if (areaFilters.length === 0) {
          return {
            category: cat.id,
          };
        }
        return {
          category: cat.id,
          $or: [{ areaId: null }, { areaId: { $in: areaFilters } }],
        };
      }));

      const condition = [
        { 'status.id': { $ne: 1 } }, // only assigned ticket, the others are part of the queue
        { $or: groupConditions }, // in oe of the categories of the user
      ];

      filters.push({
        $and: condition,
      });
    } else {
      logger.log('info', 'TICKET FILTERS: groups has no categories');
    }
  }
  if (systemGroups.accountManager) {
    logger.log('info', 'TICKET FILTERS: Adding account manager condition');

    filters.push({ 'accountManager.id': user.user_id });
  }

  logger.log('info', 'TICKET FILTERS: Adding author condition');
  filters.push({ 'author.id': user.user_id });

  return filters;
};

const TicketHelper = new PermissionHelper('ticket', '_id', getRoles, getFilters);

module.exports = TicketHelper;
