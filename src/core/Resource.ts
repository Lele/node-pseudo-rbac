import Action, { IActionInfo, IActions } from './Action'
import Role, { IRole, IRoles } from './Role'
import IUser from './IUser'
import Permissions, { ISerializedPermission, IPermissionList } from './Permission'

/* eslint-disable  @typescript-eslint/no-explicit-any */
export interface IGetRoles <U extends IUser>{
  (user: U, ticket: any): IUser|Promise<IUser>
}

export interface IResourceOptions <U extends IUser>{
  label?:string
  actions?: (string|IActionInfo)[]
  resourceRoles?:(string|IRole)[]
  resourceRolePermissions?: IPermissionList
  getRoles?: IGetRoles<U>
}

export interface IResource <U extends IUser>{
  name: string,
  options?: IResourceOptions<U>
}

export interface ISerializedResource {
  name: string
  label: string
  actions?: IActionInfo[]
  resourceRoles?: IRole[]
  resourceRolePermissions?: ISerializedPermission[]
}

class Resource <U extends IUser> {
  label: string
  actions?: IActions
  resourceRoles?: IRoles
  resourceRolePermissions?: Permissions
  getRoles: IGetRoles<U>

  constructor (public name:string, options?: IResourceOptions<U>) {
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
          aggr[roleItem.name] = new Role(roleItem.name, roleItem.label)
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
      this.getRoles = (user: U):IUser|Promise<IUser> => {
        let { roles, resourceRoles } = user

        if (!resourceRoles) {
          resourceRoles = this.resourceRoles ? Object.keys(this.resourceRoles) : []
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

export interface IResources <U extends IUser>{
  [resource: string]: Resource<U>
}

export default Resource
