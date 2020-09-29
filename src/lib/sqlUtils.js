const escape = require('pg-escape');


/**
 * getCondition - get a single query condition
 *
 * @param {string} type         the type of the field
 * @param {string} field        the field to apply the condition
 * @param {string} value        the value of the condition
 * @param {integer} identifier  the integer identifying the field
 * @return {object}             the object defining the query condition
 */
const getCondition = (type, field, value, identifier) => {
  switch (type) {
    case 'string':
      return {
        sql: escape("%I ILIKE ('%%%s%%')", field, value),
        param: false,
      };
    case 'date':
      return {
        sql: escape('%I::date BETWEEN %s::date AND %s::date', field, value.from, value.to),
        param: false,
      };
    case 'id':
      return {
        sql: escape(`%I = $${identifier}`, field),
        param: value,
      };
    case 'inArray':
      return {
        sql: escape(`%I = ANY($${identifier})`, field),
        param: value,
      };
    case 'array':
      return {
        sql: escape(`%I @> $${identifier}`, field),
        param: value,
      };
    default:
      return '';
  }
};


module.exports = {
  /**
   * getFilters - get the sql query parameters
   *
   * @param {Array} filtered    the array of filters coming from the client
   * @param {object} properties the properties of the table you are dealing with
   * @return {object}           an object containing the sql query and the params Array
   */
  getFilters: (filtered, properties) => {
    const sql = [];
    const params = [];
    let i = 1;
    filtered.forEach((item) => {
      const conf = properties[item.field];
      if (conf && conf.filterable) {
        const condition = getCondition(conf.type, item.field, item.value, i);
        sql.push(condition.sql);
        if (condition.param) {
          params.push(condition.param);
          i += 1;
        }
      }
    });

    return {
      sql: sql.length > 0 ? `WHERE ${sql.join(' AND ')}` : '',
      params,
    };
  },
  checkFields: (id, properties, fields) => {
  },
};
