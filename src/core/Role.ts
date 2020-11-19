import IUser from './IUser'

/**
 * Interface for custom function that returns an array of conditions to filter out a resource list.
 * for example, imagine you are defining the function that returns the conditions for the `author` role to filter out a mongoDB collection:
 * ```ts
 * const authorGetFilter: IGetResourceFilter = (user:IUser) => {
 *  return [{author: user.id}]
 * }
 * ```
 */
export interface IGetResourceFilter {
  (user?:IUser): unknown[]
}

/**
 * Interface of the object containing all the [[IGetResourceFilter]] functions of a specific role. Each function is indexed by the name of the resource.
 * Considering the role 'author' of a ticketing system:
 * ```ts
 * const resourceFilters:IResourceFilters = {
 *   ticket: (user:IUser) => {
 *    return [{author: user.id}]
 *   }
 * }
 * ```
 *
 */
export interface IResourceFilters{
  [resource: string]: IGetResourceFilter
}

/**
* interface defining the properties in common between Roles and ResourceRoles
*/
interface BaseRole {
  name: string,
  label?: string
  description?: string
}

/**
 * interface of the role configuration-object.\
 * e.g.:
 * ```ts
 * const Customer:IRole = {
 *   name: 'customer',
 *   label: 'Customer',
 *   resourceFilterGetters: {
 *     ticket: ()=>[]
 *   }
 * }
 * ```
 */
export interface IRole extends BaseRole{
  resourceFilterGetters?:IResourceFilters
}

/**
 * interface of the resource role configuration-object. Resource-roles are resource-specific roles so they will have a unique filter getter.\
 * e.g.:
 * ```ts
 * const Customer:IRole = {
 *   name: 'customer',
 *   label: 'Customer',
 *   resourceFilterGetter: ()=>[]
 * }
 * ```
 */
export interface IResourceRole extends BaseRole{
  resourceFilterGetter?:IGetResourceFilter
}

/**
 * Class representing a user Role or Resource-Role.
 */
export class Role implements IRole {
  public label: string

  constructor (public name:string, label?:string, public description?:string, public resourceFilterGetters?: IResourceFilters) {
    this.label = label || this.name
  }

  /**
  * Function returning a serialized version of the instance
  */
  toJSON ():BaseRole {
    return {
      name: this.name,
      label: this.label,
      description: this.description
    }
  }

  /**
   * Function returning the list of conditions to filter out a specific resource based on this role
   * @param user the user object
   * @param resource the name of the resource to test
   * @return an array of user-defined conditions
   */
  getFilters (user:IUser, resource: string):unknown[] {
    if (this.resourceFilterGetters && this.resourceFilterGetters[resource]) {
      return this.resourceFilterGetters[resource](user)
    }
    return []
  }
}

/**
 * interface of the object that lists all possible roles in a library instance
 */
export interface IRoles {
  [role: string]: Role
}

export default Role
