const AccessControl = require('accesscontrol');
const db = require('../../ceres/lib/db');
const { logger } = require('../../ceres/config');
const redis = require('../../ceres/lib/redisClient');
const {
  groupQuery, categoryQuery, permissionQuery, menuQuery,
} = require('../../ceres/config/commonQueries');

// define ceres System Groups
const ceresSystemGroups = [
  {
    name: 'watcher',
    suffix: 'Watcher',
  },
  {
    name: 'assignee',
    suffix: 'Assignee',
  },
  {
    name: 'group',
    suffix: 'Group',
  },
  {
    name: 'accountManager',
    suffix: 'AM',
  },
];

// groups, permissions and categories are variables and
// they are not in cache because they are accessed frequently
let groupConfig = false;
let categoryConfig = false;
let permConfig = false;
let menuConfig = false;

// define category array getter
const getCategories = async () => {
  try {
    const cat = await db.query(categoryQuery);

    categoryConfig = cat.rows.map(item => ({
      label: item.label,
      id: item.id,
      groups: item.groups,
      notifyGroups: item.notify_groups,
      transitions: {
        type: item.transition_type,
        name: item.name,
        permitted: item.permitted,
      },
    }));
  } catch (e) {
    logger.error('error', 'FATAL PERMISSION ERROR: cannot load categories configurations: %s', e);
  }
};

// define group array getter
const getGroups = async () => {
  try {
    const gr = await db.query(groupQuery);
    groupConfig = gr.rows.map(item => ({
      id: item.id,
      label: item.label,
      systemGroups: item.system_groups,
      name: item.name,
      childGroups: item.child_groups,
    }));
  } catch (e) {
    logger.error('error', 'FATAL PERMISSION ERROR: cannot load groups configurations: %s', e);
  }
};

// define menu array getter
const getAppMenu = async () => {
  try {
    const appMenuItems = await db.query(menuQuery);
    menuConfig = appMenuItems.rows.reduce((aggr, menuRow) => {
      const appMenu = aggr[menuRow.application_id] || [];

      appMenu.push({
        label: menuRow.label,
        link: menuRow.link,
        icon: menuRow.icon,
        groups: menuRow.groups,
        home: !!menuRow.home,
      });
      return {
        ...aggr,
        [menuRow.application_id]: appMenu,
      };
    }, {});
  } catch (e) {
    logger.error('error', 'FATAL PERMISSION ERROR: cannot load menu configurations: %s', e);
  }
};

// define permission array getter
const getPermissions = async () => {
  try {
    const perm = await db.query(permissionQuery);
    permConfig = new AccessControl(perm.rows);
  } catch (e) {
    logger.error('error', 'FATAL PERMISSION ERROR: cannot load permission configurations: %s', e);
  }
};


// listen to config changes
redis.subscribe(['confChanged', 'permChanged']);
redis.onMessage(async (channel) => {
  if (channel === 'confChanged') {
    await getCategories();
    await getGroups();
  } else if (channel === 'permChanged') {
    await getPermissions();
  } else if (channel === 'menuChanged') {
    await getAppMenu();
  }
});

const groupsAndPermConf = {
};

Object.defineProperty(groupsAndPermConf, 'groups', {
  get: () => groupConfig,
});

Object.defineProperty(groupsAndPermConf, 'categories', {
  get: () => categoryConfig,
});

logger.log('debug', 'CONF. INIT. - loading group configurations');
getGroups();

logger.log('debug', 'CONF. INIT. - loading category configurations');
getCategories();

logger.log('debug', 'CONF. INIT. - loading permission configurations');
getPermissions();

logger.log('debug', 'CONF. INIT. - loading menu configurations');
getAppMenu();


const can = (role, action, possession, resourceName) => {
  const query = permConfig.can(role);

  switch (action) {
    case 'get':
      if (possession === 'any') {
        return query.readAny(resourceName);
      }
      return query.readOwn(resourceName);

    case 'create':
      if (possession === 'any') {
        return query.createAny(resourceName);
      }
      return query.createOwn(resourceName);

    case 'update':
      if (possession === 'any') {
        return query.updateAny(resourceName);
      }
      return query.updateOwn(resourceName);

    case 'delete':
      if (possession === 'any') {
        return query.deleteAny(resourceName);
      }
      return query.deleteOwn(resourceName);

    default:
      return false;
  }
};


/**
 * getRolesFromGroups get all possible roles from group array
 * @param groups the array of group objects
 * @return the array of roles string
 */
const getRolesFromGroups = groups => groups.reduce((aggr, group) => {
  const { systemGroups } = group;

  aggr.push(group.name);
  for (let i = 0; i < ceresSystemGroups.length; i += 1) {
    if (systemGroups[ceresSystemGroups[i].name]) {
      aggr.push(group.name + ceresSystemGroups[i].suffix);
    }
  }
  return aggr;
}, []);

/**
 * getGrant get all the grants from group array
 * @param groups the array of group objects
 * @return the grants object
 */
const getGrants = (groups) => {
  const roles = getRolesFromGroups(groups);
  const grants = permConfig.getGrants();
  return roles.reduce((aggr, item) => ({
    ...aggr,
    [item]: grants[item],
  }), {});
};

module.exports = {
  groupsAndPermConf,
  can,
  getGrants,
  getAllCategoriesFromGroups: (groups, returnObj = false) => {
    const { categories } = groupsAndPermConf;
    const filtered = categories.filter(cat => cat.groups.some((gr => groups.includes(gr))));
    if (returnObj) {
      return filtered;
    }
    return filtered.map(({ id }) => id);
  },
  isGroupInCategory: (groupId, catId) => {
    const { categories } = groupsAndPermConf;
    const cat = categories.find(({ id }) => id === catId);
    if (!cat) return false;
    return cat.groups.includes(groupId);
  },
  // setConfUpdate: async () => redis.publish('confChanged'),
  getRolesFromGroups,
  ceresSystemGroups,
  getLoginInfo: (appIndex, groups) => ({
    groups: groupsAndPermConf.groups.reduce((aggr, group) => {
      const newAggr = { ...aggr };
      newAggr[group.id] = group.label;
      return newAggr;
    }, {}),
    categories: groupsAndPermConf.categories,
    menu: menuConfig[appIndex] && menuConfig[appIndex].filter(item => item.groups.length === 0
      || item.groups.reduce((a, b) => a || groups.includes(b), false)),
  }),
};
