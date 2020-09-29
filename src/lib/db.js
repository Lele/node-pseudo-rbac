const { Pool } = require('pg');
const conf = require('../config');
const DbClient = require('./dbClient');

// create a connection pool
const pool = new Pool({
  user: conf.pg.user,
  host: conf.pg.host,
  database: conf.pg.database,
  password: conf.pg.password,
  port: conf.pg.port,
});

// once connected set the default schema
pool.on('connect', client => client.query(`SET search_path TO ${conf.pg.schema}`));

/**
 * query - perform an SQL query on the db
 *
 * @param  {string} text    the sql query
 * @param  {Array} params   the array of parameters
 * @return {Promise}        the query promise
 */
function query(text, params) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    return pool.query(text, params, (err, res) => {
      const duration = Date.now() - start;
      if (err) {
        console.error('failed query', {
          sql: text, params, err, duration,
        });
        reject(err);
      } else {
        // console.log('executed query', { text, duration, rows: res.rowCount });
        resolve(res);
      }
    });
  });
}

/**
 * getTransactionClient - get a transaction client from the pool
 *
 * @return {DbClient}   the DbClient instance to perform transaction
 */
async function getTransactionClient() {
  try {
    const client = await pool.connect();
    return new DbClient(client);
  } catch (e) {
    return false;
  }
}

/**
 * getSql - description
 *
 * @param  {string} table                 the from table
 * @param  {object} options = {}          the query parameters
 * @param  {Array|Boolean} join = false   an Array containing join objects e.g.
 * ({
       table: 'joinTable',
       on: 'table.field = joinTable.field',
       fields: [
         'field1',
         'field2',
         'field3',
       ],
       type: 'LEFT',
 *  })
 * @return {Array}                        an array containing the sql string and the parameters
 */
function getSql(table, options = {}, join = false) {
  let i = 1;
  const params = [];
  const conditions = [];

  let select = [`${table}.*`];

  let from = [`${table}`];

  if (join) {
    join.forEach((joinItem) => {
      joinItem.fields.forEach((value) => {
        select.push(`${joinItem.table}.${value} as "_${joinItem.table}.${value}"`);
      });

      from.push(`${joinItem.type} JOIN ${joinItem.table} ON ${joinItem.on}`);
    });
  }

  select = select.join(',');
  from = from.join(' ');

  Object.entries(options).forEach((entry) => {
    const key = entry[0];
    const value = entry[1];
    if (Array.isArray(value)) {
      conditions.push([`${key} = ANY($${i})`]);
    } else {
      conditions.push([`${key} = $${i}`]);
    }
    params.push(value);
    i += 1;
  });

  let sql = '';
  if (conditions.length > 0) {
    sql = `WHERE ${conditions.join(' AND ')}`;
  }
  return [`SELECT ${select} FROM ${from} ${sql}`, params];
}

/**
 * findOne - find one element of a table
 *
 * @param  {string} table         the name of the table
 * @param  {string} options = {}  the parameters to extract the row
 * @param  {Array} join = false   an Array containing join objects
 * @return {Promise}              the promise of the query returning a single object
 */
async function findOne(table, options = {}, join = false) {
  try {
    const [sqlQuery, params] = getSql(table, options, join);
    const res = await query(sqlQuery, params);
    return res.rows[0];
  } catch (e) {
    console.log(e);
    return false;
  }
}

/**
 * find - find elements of a table
 *
 * @param  {string} table         the name of the table
 * @param  {string} options = {}  the parameters to extract the row
 * @param  {Array} join = false   an Array containing join objects
 * @return {Promise}              the promise of the query returning an array of objects
 */
async function find(table, options = {}, join = false) {
  try {
    const [sqlQuery, params] = getSql(table, options, join);
    const res = await query(sqlQuery, params);
    return res.rows;
  } catch (e) {
    return false;
  }
}


module.exports = {
  query,
  find,
  findOne,
  getTransactionClient,
};
