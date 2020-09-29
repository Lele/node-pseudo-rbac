const db = require('../../../ceres/lib/db');
const { logger } = require('../../../ceres/config');
/* eslint no-underscore-dangle: ["error", { "allowAfterThis": true, "allow":["__index"] }] */


/**
 * staticPropModel - get the class derived from the Model template class
 *
 * @param  {string} __table the name of the table
 * @param  {string} __index the index field of the table
 * @return {class}          the class representing the input table
 */
function staticPropModel(__table, __index) {
  class Model {
    constructor(props) {
      Object.entries(props).forEach((entry) => {
        const key = entry[0];
        const value = entry[1];
        if (key[0] !== '_') {
          // create a private (prefixed with "_") field for every input props
          this[`_${key}`] = value;

          // define public getter and setter of these fields to keep trace of every modification
          Object.defineProperty(this, key, {
            enumerable: true, // this makes properties enumerable when you call Object.entries
            get() {
              return this[`_${key}`];
            },
            set(x) {
              // register every modification in _modifiedFields
              const modifiedFields = this._modifiedFields || {};
              modifiedFields[key] = x;
              this[`_${key}`] = x;
              this._modifiedFields = modifiedFields;
            },
          });
        } else {
          const rootPath = this.setByPath(key, value);
          const varPath = rootPath.substr(1);
          // define public getter and setter of these fields to keep trace of every modification
          if (!Object.prototype.hasOwnProperty.call(this, varPath)) {
            Object.defineProperty(this, varPath, {
              get() {
                return this[rootPath];
              },
              set(x) {
                // register every modification in _modifiedFields
                this[rootPath] = x;
              },
            });
          }
        }
      });
    }

    setByPath(path, value) {
      let schema = this; // a moving reference to internal objects within obj
      const pList = path.split('.');
      const rootKey = pList[0];
      const len = pList.length;
      for (let i = 0; i < len - 1; i += 1) {
        const elem = pList[i];
        if (!schema[elem]) schema[elem] = {};
        schema = schema[elem];
      }

      schema[pList[len - 1]] = value;

      return rootKey;
    }

    async save() {
      // insert or update the row
      if (this[__index]) {
        // if the index field is assigned then the query will be an UPDATE query
        if (this._modifiedFields) {
          const { sql, values } = this.getSaveSql();

          if (!sql) {
            logger.log('error', 'Cannot get sql query');
            return false;
          }
          try {
            // launch the query and wait for the completion
            const res = await db.query(sql, values);
            return res ? this[__index] : false;
          } catch (e) {
            logger.error('POSTGRES ERROR: %s', e.message);
            return false;
          }
        } else {
          return this[__index];
        }
      } else {
        const { sql, values } = this.getSaveSql();

        try {
          // launch the query
          const res = await db.query(sql, values);
          logger.log('info', 'NEW %s inserted: %s, %s', __table, JSON.stringify(res.rows), __index);
          return res ? res.rows[0][__index] : false;
        } catch (e) {
          logger.error('POSTGRES ERROR: %s', e.message);
          return false;
        }
      }
    }

    // search for one row responding to the query requisites
    // all the query conditions are AND conditions
    static async findOne(query, join = false) {
      try {
        const row = await db.findOne(__table, query, join);
        if (!row) {
          return false;
        }

        return new this(row);
      } catch (e) {
        logger.log('error', 'DB ERROR - cannot find one %s', e);
        return false;
      }
    }

    // search for multiple rows responding to the query requisites
    // all the query conditions are AND conditions
    static async find(query, join = false) {
      try {
        const result = await db.find(__table, query, join);
        return result.map(item => new this(item));
      } catch (e) {
        return false;
      }
    }

    // return the sql and parameters of the save query
    getSaveSql() {
      // insert or update the row
      if (this[__index]) {
        // if the index field is assigned then the query will be an UPDATE query
        if (this._modifiedFields) {
          // prepare the query
          const fields = [];
          const values = [];
          let i = 1;
          Object.entries(this._modifiedFields).forEach((entry) => {
            const key = entry[0];

            if (key[0] !== '_') {
              fields.push(`${key} = $${i}`);

              values.push(this[key]);
              i += 1;
            }
          });
          values.push(this[__index]);
          const sql = `UPDATE ${__table} SET ${fields.join(',')} WHERE ${__index} = $${i}`;

          // reset _modifiedFields
          delete this._modifiedFields;

          return { sql, values };
        }
        return false;
      }
      // set up INSERT query
      const fields = [];
      const values = [];
      Object.entries(this).forEach((entry) => {
        const key = entry[0];
        // console.log(`reading key ${key}`);
        if (key[0] !== '_') {
          fields.push(key);
          values.push(this[key]);
        }
      });

      const sql = `INSERT INTO ${__table} (${fields.join(',')}) VALUES (${values.map((item, index) => `$${index + 1}`)}) RETURNING ${__index}`;

      return { sql, values };
    }

    // redefine toJSON method in order to print oly public fields (properties)
    toJSON() {
      const res = {};

      Object.entries(this).forEach((entry) => {
        const key = entry[0];

        if (key[0] !== '_') {
          // console.log(`getting key: ${key}`);
          res[key] = this[key];
        }
      });

      return res;
    }

    toObject() {
      const res = {};

      Object.entries(this).forEach((entry) => {
        const key = entry[0];

        if (key[0] !== '_') {
          // console.log(`getting key: ${key}`);
          res[key] = this[key];
        }
      });

      return res;
    }
  }

  return Model;
}

module.exports = staticPropModel;
