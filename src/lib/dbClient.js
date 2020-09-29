const { logger } = require('../config');


/**
 * Class to handle postgres transactions
 */
class DbClient {
  /**
   * constructor
   *
   * @param  {object} client the postgres db client
   */
  constructor(client) {
    this.client = client;
    this.isTransactionBegan = false;
  }

  /**
   * async beginTransaction - start a new transaction
   *
   * @return {Promise}  return a promise resolving into a boolean
   */
  async beginTransaction() {
    if (this.isTransactionBegan) {
      logger.log('error', 'TRANSACTION ERROR: the transaction is already begun');
      throw new Error('the transaction is already begun');
    }
    try {
      await this.client.query('BEGIN');
      this.isTransactionBegan = true;
      return true;
    } catch (e) {
      throw e;
    }
  }

  /**
   * async endTransaction - explicitly end a transaction
   *
   * @return {Promise}  return a promise resolving into the commit result
   */
  async endTransaction() {
    if (!this.isTransactionBegan) {
      logger.log('error', 'TRANSACTION ERROR: the transaction is already ended');
      return true;
    }
    try {
      const end = await this.client.query('COMMIT');
      if (end) {
        this.isTransactionBegan = false;
        this.client.release();
      }
      return end;
    } catch (e) {
      throw e;
    }
  }

  /**
   * async rollBack - rollback the entire transaction
   *
   * @return {Promise} a promise resolving into the rollback result
   */
  async rollBack() {
    if (!this.isTransactionBegan) {
      logger.log('info', 'TRANSACTION ERROR: the transaction is already ended');
      return true;
    }
    try {
      const roolBack = await this.client.query('ROLLBACK');
      if (roolBack) {
        this.isTransactionBegan = true;
      }
      return roolBack;
    } catch (e) {
      throw e;
    }
  }

  /**
   * async query - perform a query inside a transaction
   *
   * @param  {string} sql       the query string
   * @param  {Array}  params    the array of parameters
   * @return {Promise|boolean}  the Promise resolving into the query result or
   * false if the transaction was already ended
   */
  async query(sql, params) {
    try {
      if (this.isTransactionBegan) {
        return this.client.query(sql, params);
      }
      return false;
    } catch (e) {
      await this.client.query('ROLLBACK');
      this.client.release();
      throw e;
    }
  }
}

module.exports = DbClient;
