import Action, { IActionInfo, IActions } from './Action'
import Role, { IRole, IRoles } from './Role'
import IUser from './IUser'
import Permissions, { ISerializedPermission, IPermissionList } from './Permission'

/* eslint-disable  @typescript-eslint/no-explicit-any */
export interface IGetRoles{
  (user: IUser, resource?: unknown): IUser|Promise<IUser>
}

export interface IResourceOptions{
  label?:string
  actions?: (string|IActionInfo)[]
  resourceRoles?:(string|IRole)[]
  resourceRolePermissions?: IPermissionList
  getRoles?: IGetRoles
}

export interface IResource{
  name: string,
  options?: IResourceOptions
}

export interface ISerializedResource {
  name: string
  label: string
  actions?: IActionInfo[]
  resourceRoles?: IRole[]
  resourceRolePermissions?: ISerializedPermission[]
}

class Resource {
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
      this.resourceRoles = options.resourceRoles.reduce((aggr: IRoles, roleItem: string|IRole):IRoles => {
        if (typeof roleItem === 'string') {
          aggr[roleItem] = new Role(roleItem)
        } else {
          aggr[roleItem.name] = new Role(roleItem.name, roleItem.label, roleItem.description, roleItem.resourceFilterGetters)
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

  hasResourceRole (roleName: string): boolean {
    return !!this.resourceRoles && roleName in this.resourceRoles
  }

  hasAction (actionName: string): boolean {
    return !!this.actions && actionName in this.actions
  }

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

export interface IResources{
  [resource: string]: Resource
}

export default Resource
