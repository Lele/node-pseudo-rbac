import Action, { IActionInfo, IActions } from './Action'
import Role, { IResourceRole, IRole, IRoles, IResourceFilters } from './Role'
import IUser from './IUser'
import Permissions, { ISerializedPermission, IPermissionList } from './Permission'

/* eslint-disable  @typescript-eslint/no-explicit-any */
/**
* interface for custom function that retrieve the roles and resource-roles of a user with respect to a resource
*/
export interface IGetRoles{
  (user: IUser, resource?: unknown): IUser|Promise<IUser>
}

/**
* interface that defines resource-options object
*/
export interface IResourceOptions{
  /** resource label */
  label?:string
  /** the list of actions that can be performed over the resource */
  actions?: (string|IActionInfo)[]
  /** the list of roles that a user can take on with respect to the resource */
  resourceRoles?:(string|IResourceRole)[]
  /** the resource-role permission configuration-object */
  resourceRolePermissions?: IPermissionList
  /** the function that retrieve the user roles and resource-roles with respect to the resource */
  getRoles?: IGetRoles
}

/**
* interface of the resource configuration object
*/
export interface IResource{
  name: string,
  options?: IResourceOptions
}

/**
* interface that defines a serialized resource
*/
export interface ISerializedResource {
  name: string
  label: string
  actions?: IActionInfo[]
  resourceRoles?: IRole[]
  resourceRolePermissions?: ISerializedPermission[]
}

export class Resource {
  label: string
  actions?: IActions
  resourceRoles?: IRoles
  resourceRolePermissions?: Permissions
  getRoles: IGetRoles

  constructor (public name:string, options?: IResourceOptions) {
    this.label = options?.label || this.name

    if (options?.actions) {
      this.actions = options.actions.reduce((aggr:IActions, actionItem: string|IActionInfo): IActions => {
        if (typeof actionItem === 'string') {
          aggr[actionItem] = new Action(actionItem)
        } else {
          aggr[actionItem.name] = new Action(actionItem.name, actionItem.label)
        }
        return aggr
      }, {})
    }

    if (options?.resourceRoles) {
      this.resourceRoles = options.resourceRoles.reduce((aggr: IRoles, roleItem: string|IResourceRole):IRoles => {
        if (typeof roleItem === 'string') {
          aggr[roleItem] = new Role(roleItem)
        } else {
          const getters: IResourceFilters | undefined = roleItem.resourceFilterGetter ? {
            [this.name]: roleItem.resourceFilterGetter
          } : undefined
          aggr[roleItem.name] = new Role(roleItem.name, roleItem.label, roleItem.description, getters)
        }
        return aggr
      }, {})
    }

    if (options?.resourceRolePermissions) {
      this.setResourceRolePermissions(options.resourceRolePermissions)
    }

    if (options?.getRoles) {
      this.getRoles = options.getRoles
    } else {
      this.getRoles = (user: IUser):IUser|Promise<IUser> => {
        let { roles, resourceRoles } = user

        if (!resourceRoles) {
          resourceRoles = this.resourceRoles ? Object.keys(this.resourceRoles) : undefined
        }
        return {
          roles,
          resourceRoles
        }
      }
    }
  }

  /**
   * set resource role permissions - overwrite existing permissions
   * @param resourceRolePermissions the resource role permission configuration-object
   */
  setResourceRolePermissions (resourceRolePermissions: IPermissionList):void {
    for (const [roleName, actionPermissions] of Object.entries(resourceRolePermissions)) {
      if (!this.hasResourceRole(roleName)) {
        throw Error(`No ${this.name} role found with name ${roleName}`)
      }
      for (const actionName of Object.keys(actionPermissions)) {
        if (!this.hasAction(actionName)) {
          throw Error(`No ${this.name} action found with name ${roleName}`)
        }
      }
    }
    this.resourceRolePermissions = new Permissions(this.name, true, resourceRolePermissions)
  }

  /**
   * verify if a resource has a certain resource role
   * @param roleName the resource role name
   * @return true if the resource role exists
   */
  hasResourceRole (roleName: string): boolean {
    return !!this.resourceRoles && roleName in this.resourceRoles
  }

  /**
   * verify if a resource has a certain action
   * @param actionName the action name
   * @return true if the action exists
   */
  hasAction (actionName: string): boolean {
    return !!this.actions && actionName in this.actions
  }

  /**
   * Function returning the list of conditions to filter out a specific resource based on resource-roles
   * @param user the user object
   * @param resourceRole the list of resourceRoles to test or undefined (test all resource roles)
   * @return an array of user-defined conditions
   */
  getResourceRoleFilters (user:IUser, resourceRoles?:string[]):unknown[] {
    if (!this.resourceRoles) {
      return []
    }

    if (!resourceRoles) {
      resourceRoles = Object.keys(this.resourceRoles || {})
    }

    const outFilters = []

    for (const resRole of resourceRoles) {
      outFilters.push(...this.resourceRoles[resRole].getFilters(user, this.name))
    }

    return outFilters
  }

  /**
   * function returning a serialized version of the resource instance
   */
  toJSON (): ISerializedResource {
    return {
      name: this.name,
      label: this.label,
      actions: this.actions && Object.values(this.actions).map((action):IActionInfo => ({
        name: action.name,
        label: action.label
      })),
      resourceRoles: this.resourceRoles && Object.values(this.resourceRoles).map((resourceRole): IRole => ({
        name: resourceRole.name,
        label: resourceRole.label,
        description: resourceRole.description
      })),
      resourceRolePermissions: this.resourceRolePermissions?.toJSON()
    }
  }
}

/**
 * interface of the object that lists all possible resources in a library instance
 */
export interface IResources{
  [resource: string]: Resource
}

export default Resource
