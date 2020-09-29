const { Pool } = require('pg');
const conf = require('../config');

const pool = new Pool({
  user: 'sweetguest',
  host: '10.8.0.1',
  database: 'sgDb',
  password: 'sw55tgu5stTest',
  port: '5432',
});

pool.on('connect', client => client.query(`SET search_path TO ${conf.pg.schema}`));

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
    conditions.push([`${key} = $${i}`]);
    params.push(value);
    i += 1;
  });

  let sql = '';
  if (conditions.length > 0) {
    sql = `WHERE ${conditions.join(' AND ')}`;
  }
  return [`SELECT ${select} FROM ${from} ${sql}`, params];
}

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
};
