/**
 * interface that defines the mandatory fields a user object should have
 */
export interface IUser{
  /** roles should be retrieved by the authentication library */
  roles: string[]
  /** resource roles are evaluated at run-time */
  resourceRoles?: string[]
}

export default IUser
