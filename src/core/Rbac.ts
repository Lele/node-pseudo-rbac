import Resource, { IResource, IResources, IResourceOptions, ISerializedResource } from './Resource'
import Role, { IRole, IRoles, IResourceFilters } from './Role'
import IUser from './IUser'
import Permissions, { ISytemPermissions, ISerializedPermission, ISytemPermissionList, IPermissionCheck, ANY } from './Permission'
import { Request, Response, NextFunction, RequestHandler } from 'express'

import { Notation } from 'notation'

const Glob = Notation.Glob

interface ISerializedRbac{
  roles: IRole[],
  resources: ISerializedResource[]
  permissions: ISerializedPermission[]
}

export interface ICheck {
  matches: IPermissionCheck[],
  value: boolean | typeof ANY,
  attributes: string[]
}

export interface IChecks {
  [action:string]:boolean|ICheck
}

interface BaseRequest extends Request{
  permissionRes?: boolean|ICheck
  permissionFilters?: unknown[]|boolean
  [prop: string]: unknown
}

export interface IPermissionDenied {
  (req:Request, res:Response, next:NextFunction, resource:string, action?: string): void
}

type IRequest<UserProp extends string> = BaseRequest & {
  [U in UserProp]: IUser;
}

const isIRequest = <UserProp extends string> (req: Request, userProp:UserProp): req is IRequest<UserProp> => {
  return (req as IRequest<UserProp>)[userProp] as IUser !== undefined
}

// interface IMiddleware extends RequestHandler{
//   (req: IRequest, res:Response, next:NextFunction):Promise<void>
// }

interface IRbacOptions<UserProp extends string>{
  roles?:IRole[],
  resources?:IResource[],
  permissions?: ISytemPermissionList,
  userProp?: UserProp
  permissionDeniedCallback?: IPermissionDenied
}

class Rbac<UserProp extends string = 'user'> {
  roles:IRoles = {}
  resources:IResources = {}
  permissions?:ISytemPermissions = undefined
  userProp:UserProp = 'user' as UserProp
  permissionDeniedCallback?: IPermissionDenied

  constructor (options?:IRbacOptions<UserProp>) {
    if (options?.roles) {
      this.setRoles(options?.roles)
    }
    if (options?.resources) {
      this.setResources(options?.resources)
    }
    if (options?.permissions) {
      this.setPermissions(options?.permissions)
    }
    if (options?.userProp) {
      this.userProp = options.userProp
    }
    if (options?.permissionDeniedCallback) {
      this.permissionDeniedCallback = options.permissionDeniedCallback
    }
  }

  addRole (role:string|Role, label?:string, description?:string, resourceFilterGetters?:IResourceFilters):void{
    if (typeof role === 'string') {
      this.checkRoleName(role)
      this.roles[role] = new Role(role, label, description, resourceFilterGetters)
    } else {
      this.checkRoleName(role.name)
      this.roles[role.name] = role
    }
  }

  setRoles (roles:(string|IRole|Role)[]):void {
    this.roles = {}

    for (const roleInfo of roles) {
      if (typeof roleInfo === 'string') {
        const newRole = new Role(roleInfo)
        this.roles[newRole.name] = newRole
      } else if (roleInfo instanceof Role) {
        this.roles[roleInfo.name] = roleInfo
      } else {
        const newRole = new Role(roleInfo.name, roleInfo.label, roleInfo.description)
        this.roles[newRole.name] = newRole
      }
    }
  }

  addResource (resource:string|Resource, options?:IResourceOptions):void{
    if (typeof resource === 'string') {
      this.resources[resource] = new Resource(resource, options)
    } else {
      this.resources[resource.name] = resource
    }
  }

  setResources (resources:(string|IResource|Resource)[]):void {
    this.resources = {}

    for (const resourceInfo of resources) {
      if (typeof resourceInfo === 'string') {
        const newResource = new Resource(resourceInfo)
        this.resources[newResource.name] = newResource
      } else if (resourceInfo instanceof Resource) {
        this.resources[resourceInfo.name] = resourceInfo
      } else {
        const newResource = new Resource(resourceInfo.name, resourceInfo?.options)
        this.resources[newResource.name] = newResource
      }
    }
  }

  addPermission (permission: ISerializedPermission):void{
    if (!this.roles || !(permission.role in this.roles)) {
      throw Error(`No role found with name: ${permission.role}`)
    }
    if (!this.resources || !(permission.resource in this.resources)) {
      throw Error(`No resource found with name: ${permission.resource}`)
    }
    if (permission.resourceRole && (this.resources && !this.resources[permission.resource].hasResourceRole(permission.resourceRole))) {
      throw Error(`No resource role found with name ${permission.resourceRole} in ${permission.resource} resource`)
    }

    if (!this.permissions) {
      this.permissions = {}
    }

    if (!(permission.resource in this.permissions)) {
      this.permissions[permission.resource] = new Permissions(permission.resource, false)
    }

    this.permissions[permission.resource].setPermission(permission)
  }

  setPermissions (permissions:ISytemPermissionList):void{
    this.permissions = {}

    for (const [resourceName, rolePermissions] of Object.entries(permissions)) {
      if (!(resourceName in this.resources)) {
        this.permissions = undefined
        throw Error(`No resources found with name = ${resourceName}`)
      }

      for (const [, actionPermissions] of Object.entries(rolePermissions)) {
        if (!(resourceName in this.resources)) {
          this.permissions = undefined
          throw Error(`No resources found with name = ${resourceName}`)
        }

        for (const [actionName, permissionValue] of Object.entries(actionPermissions)) {
          if (!this.resources[resourceName].hasAction(actionName)) {
            this.permissions = undefined
            throw Error(`No actions found with name = ${actionName} `)
          }
          if (typeof permissionValue !== 'boolean' && !Array.isArray(permissionValue)) {
            for (const [resourceRoleName] of Object.entries(permissionValue)) {
              if (!this.resources[resourceName].hasResourceRole(resourceRoleName)) {
                this.permissions = undefined
                throw Error(`No resource role found with name = ${resourceRoleName} in ${resourceName} resource`)
              }
            }
          }
        }
      }
      this.permissions[resourceName] = new Permissions(resourceName, false, rolePermissions)
    }
  }

  checkRoleName (roleName:string): void{
    for (const [, resource] of Object.entries(this.resources)) {
      if (resource.hasResourceRole(roleName)) {
        throw Error(`Role Name ${roleName} is already defined in ${resource.label} resource`)
      }
    }
  }

  toJSON (): ISerializedRbac {
    const outJson: ISerializedRbac = {
      roles: [],
      resources: [],
      permissions: []
    }

    if (this.roles) {
      for (const [, role] of Object.entries(this.roles)) {
        outJson.roles.push(role.toJSON())
      }
    }

    if (this.resources) {
      for (const [, resource] of Object.entries(this.resources)) {
        outJson.resources.push(resource.toJSON())
      }
    }

    if (this.permissions) {
      for (const [, resourcePermissions] of Object.entries(this.permissions)) {
        outJson.permissions.push(...resourcePermissions.toJSON())
      }
    }

    return outJson
  }

  async could (user:IUser, resourceName:string, resourceObj?:unknown):Promise<IChecks> {
    let { roles } = user
    const { actions } = this.resources[resourceName]
    const out:IChecks = {}
    if (this.permissions && actions) {
      const resourcePermission = this.permissions[resourceName]
      for (const action of Object.keys(actions)) {
        for (const role of roles) {
          const permissionRes = resourcePermission.can(action, role)
          if (permissionRes && permissionRes.value === ANY) {
            out[action] = {
              matches: [permissionRes],
              value: ANY,
              attributes: ['*']
            }
          }
        }

        if (!out[action]) {
          let resourceRoles: undefined|string[] = []

          if (resourceObj) {
            ({ roles, resourceRoles } = await this.resources[resourceName].getRoles(user, resourceObj))
          } else if (!resourceObj) {
            resourceRoles = Object.keys(this.resources[resourceName].resourceRoles || {})
          }

          // if the resource has resource-roles but the user is not connected to it then return false
          if (this.resources[resourceName].resourceRoles && (!resourceRoles || resourceRoles.length === 0)) {
            out[action] = false
          } else {
            const matches: IPermissionCheck[] = []
            const attributes: string[] = []

            for (const role of roles) {
              if (resourceRoles && resourceRoles.length > 0) {
                for (const resourceRole of resourceRoles) {
                  const permissionValue = resourcePermission.can(action, role, resourceRole, this.resources[resourceName].resourceRolePermissions)
                  if (permissionValue) {
                    matches.push(permissionValue)
                    attributes.push(...permissionValue.attributes)
                  }
                }
              } else {
                const permissionValue = resourcePermission.can(action, role, undefined, this.resources[resourceName].resourceRolePermissions)
                if (permissionValue) {
                  matches.push(permissionValue)
                  attributes.push(...permissionValue.attributes)
                }
              }
            }

            if (matches.length === 0) {
              out[action] = false
            } else {
              out[action] = {
                matches,
                value: true,
                attributes: Glob.normalize(attributes)
              }
            }
          }
        }
      }
    }
    return out
  }

  async can (user:IUser, action: string, resourceName:string, resourceObj?:unknown):Promise<false|ICheck> {
    let { roles } = user
    if (this.permissions && this.resources && this.resources[resourceName]) {
      const resourcePermission = this.permissions[resourceName]
      for (const role of roles) {
        const permissionRes = resourcePermission.can(action, role)
        if (permissionRes && permissionRes.value === ANY) {
          return {
            matches: [permissionRes],
            value: ANY,
            attributes: ['*']
          }
        }
      }

      let resourceRoles: undefined|string[] = []

      if (resourceObj) {
        ({ roles, resourceRoles } = await this.resources[resourceName].getRoles(user, resourceObj))
      } else if (!resourceObj) {
        resourceRoles = Object.keys(this.resources[resourceName].resourceRoles || {})
      }

      // if the resource has resource-roles but the user is not connected to it then return false
      if (this.resources[resourceName].resourceRoles && (!resourceRoles || resourceRoles.length === 0)) {
        return false
      }

      const matches: IPermissionCheck[] = []
      const attributes: string[] = []

      for (const role of roles) {
        if (resourceRoles && resourceRoles.length > 0) {
          for (const resourceRole of resourceRoles) {
            const permissionValue = resourcePermission.can(action, role, resourceRole, this.resources[resourceName].resourceRolePermissions)
            if (permissionValue) {
              matches.push(permissionValue)
              attributes.push(...permissionValue.attributes)
            }
          }
        } else {
          const permissionValue = resourcePermission.can(action, role, undefined, this.resources[resourceName].resourceRolePermissions)
          if (permissionValue) {
            matches.push(permissionValue)
            attributes.push(...permissionValue.attributes)
          }
        }
      }
      if (matches.length === 0) {
        return false
      }
      return {
        matches,
        value: true,
        attributes: Glob.normalize(attributes)
      }
    }
    return false
  }

  async getFilters (user:IUser, resourceName:string):Promise<unknown[]|boolean> {
    let { roles, resourceRoles } = user

    const permission = await this.can(user, 'read', resourceName)

    if (permission === false) {
      // user cannot read any resource
      return false
    }

    if (permission.value === ANY) {
      // no filter to apply, user can read any object of this type
      return []
    }

    // otherwise apply search for all the filters
    if (typeof resourceRoles === 'undefined') {
      resourceRoles = Object.keys(this.resources[resourceName].resourceRoles || {})
    }
    const filters: unknown[] = []

    for (const role of roles) {
      filters.push(...this.roles[role].getFilters(user, resourceName))
    }

    filters.push(...this.resources[resourceName].getResourceRoleFilters(user, resourceRoles))

    return filters
  }

  canMiddleware (action: string, resource:string): RequestHandler {
    return async (req: Request, res: Response, next:NextFunction) => {
      if (!isIRequest(req, this.userProp)) {
        throw Error(`req.${this.userProp} must be defined`)
      } else if ((!('roles' in req[this.userProp])) || !Array.isArray(req[this.userProp].roles)) {
        throw Error(`req.${this.userProp}.roles must be defined as the list of the user-role names`)
      }
      const permissionRes = await this.can(req[this.userProp], action, resource, req[resource])

      if (permissionRes === false) {
        if (this.permissionDeniedCallback) {
          this.permissionDeniedCallback(req, res, next, resource, action)
        } else {
          res.sendStatus(401)
        }
        return
      }

      req.permissionRes = permissionRes

      next()
    }
  }

  filtersMiddleware (resource:string): RequestHandler {
    return async (req: Request, res: Response, next:NextFunction) => {
      if (!isIRequest(req, this.userProp)) {
        throw Error(`req.${this.userProp} must be defined`)
      } else if ((!('roles' in req[this.userProp])) || !Array.isArray(req[this.userProp].roles)) {
        throw Error(`req.${this.userProp}.roles must be defined as the list of the user-role names`)
      }
      const permissionFilters = await this.getFilters(req[this.userProp], resource)

      if (permissionFilters === false) {
        if (this.permissionDeniedCallback) {
          this.permissionDeniedCallback(req, res, next, resource)
        } else {
          res.sendStatus(401)
        }
        return
      }

      req.permissionFilters = permissionFilters
      next()
    }
  }
}

export default Rbac
