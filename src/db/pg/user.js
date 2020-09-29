/* eslint no-underscore-dangle: ["error", { "allowAfterThis": true }] */
const bcrypt = require('bcrypt');
const moment = require('moment');
const db = require('../../../ceres/lib/db');
const { logger, auth } = require('../../../ceres/config');
const Model = require('../../../ceres/schema/pg/model');

class UserModel extends Model('users', 'user_id') {
  // soft delete one user
  static async softDeleteOne(userId) {
    const softDeleteSessionSql = 'UPDATE sessions SET refresh_expire_ts = UNIX_TIMESTAMP() WHERE user_id = $1';
    const deleteAttemptsSql = 'DELELE attempts WHERE user_id = $1';
    const softDeleteUserSql = 'UPDATE users SET active = 0, last_update=NOW() WHERE user_id = $1';
    const dbClient = await db.getTransactionClient();
    try {
      await dbClient.beginTransaction();
      const sessionRes = await dbClient.query(softDeleteSessionSql, [userId]);
      if (sessionRes === false) {
        return false;
      }
      const attemptRes = await dbClient.query(deleteAttemptsSql, [userId]);
      if (attemptRes === false) {
        return false;
      }
      const userRes = await dbClient.query(softDeleteUserSql, [userId]);
      if (userRes === false) {
        return false;
      }
      await dbClient.endTransaction();
      return true;
    } catch (e) {
      return false;
    }
  }

  // redefine save method in order to hash the password
  async save() {
    if (!this.user_id || (this._modifiedFields && this._modifiedFields.password)) {
      try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(this.password, salt);
        this.password = hash;
      } catch (e) {
        logger.log('DB ERROR - cannot save user: %s', e);
        return false;
      }
    }
    if (!this.user_id || (this._modifiedFields && this._modifiedFields.email)) {
      this.email = this.email.trim().toLowerCase();
    }
    return super.save();
  }

  // define the password comparison method
  async comparePassword(pw) {
    try {
      const match = await bcrypt.compare(pw, this.password.replace(/^\$2y/, '$2a'));

      return match;
    } catch (e) {
      logger.log('ENCRYPTION ERROR - cannot compare passwords: %s', e);

      return false;
    }
  }

  // insert new failed login req is, now is a string in the format (Y-m-d h:i:s)
  async addAttempt(now) {
    let sql = '';
    let params = [];
    const nowM = moment(now);

    if (!this.attempts || !this.attempts.attempt_id) {
      sql = 'INSERT INTO attempts (user_id, last_failed, failed_logins) VALUES ($1,$2,1)';
      params = [this.user_id, now];
    } else {
      // Check last failed attempt
      const lastFail = moment(this.attempts.last_failed);
      const lastLogin = moment(this.last_login_success);
      const failNumber = this.attempts.failed_logins;

      if (lastFail.isValid() && (lastFail.isBefore(lastLogin) || (nowM.diff(lastFail, 'minutes') > Math.floor(failNumber / auth.MAX_FAIL) * auth.BLOCK_MINUTES))) {
        this.attempts.failed_logins = 0;
      }

      sql = `UPDATE attempts SET
        last_failed = $1,
        failed_logins = $2
        WHERE attempt_id = $3`;
      this.attempts.failed_logins += 1;
      params = [now, this.attempts.failed_logins, this.attempts.attempt_id];
    }
    const result = await db.query(sql, params);

    return result;
  }

  softDelete() {
    return this.constructor.softDeleteOne(this.user_id);
  }

  async saveOrUpdateSession(sessionId, exp, appType = 0) {
    if (sessionId) {
      const sql = 'UPDATE sessions SET refresh_expire_ts = $3, last_update = NOW() WHERE user_id = $1 AND session_id=$2';
      const params = [this.user_id, sessionId, exp];
      const result = await db.query(sql, params);
      if (result) {
        return sessionId;
      }
      logger.error(`Error on updating session ${sessionId}`);
      return false;
    }
    const sql = 'INSERT INTO sessions (user_id, app_type, refresh_expire_ts, last_update) VALUES ($1, $2, $3, NOW()) RETURNING session_id';
    const params = [this.user_id, appType, exp];
    const result = await db.query(sql, params);
    if (result) {
      return result.rows[0].session_id;
    }
    logger.error(`Error on creating new session (${this.user_id})`);
    return false;
  }

  async saveOrUpdateToken(token) {
    const sql = 'INSERT INTO expo_tokens (user_id, token) VALUES ($1, $2 ) ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id';
    try {
      const result = await db.query(sql, [this.user_id, token]);
      return result;
    } catch (e) {
      logger.log('error', 'EXPO TOKEN - cannot insert expo token: %s', e.message);
      return false;
    }
  }
}

module.exports = UserModel;
