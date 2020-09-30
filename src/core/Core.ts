import Resource, { IResource, IResources, IResourceOptions, ISerializedResource } from './Resource'
import Role, { IRole, IRoles } from './Role'
import IUser from './IUser'
import Permissions, { ISytemPermissions, ISerializedPermission, ISytemPermissionList, IPermissionCheck, ANY } from './Permission'

interface ISerializedRbac{
  roles: IRole[],
  resources: ISerializedResource[]
  permissions: ISerializedPermission[]
}

class Core {
  roles:IRoles
  resources:IResources
  permissions?:ISytemPermissions

  constructor () {
    this.roles = {}
    this.resources = {}
    this.permissions = undefined
  }

  addRole (role:string|Role, label?:string, description?:string):void{
    if (typeof role === 'string') {
      this.checkRoleName(role)
      this.roles[role] = new Role(role, label, description)
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
          if (typeof permissionValue !== 'boolean') {
            for (const [resourceRoleName] of Object.entries(permissionValue)) {
              if (!this.resources[resourceName].hasResourceRole(resourceRoleName)) {
                this.permissions = undefined
                throw Error(`No resource role found with name = ${actionName} in ${resourceName} resource`)
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

  can (user:IUser, action: string, resourceName:string, resourceObj?:unknown):boolean|IPermissionCheck {
    let { roles, resourceRoles } = user
    if (this.permissions) {
      const resourcePermission = this.permissions[resourceName]
      for (const role of roles) {
        const permissionRes = resourcePermission.can(action, role)
        if (permissionRes && permissionRes.value === ANY) {
          return {
            match: {
              role
            },
            value: ANY
          }
        }
      }

      if (resourceObj && this.resources && this.resources[resourceName]) {
        ({ roles, resourceRoles } = this.resources[resourceName]?.getRoles(user, resourceObj))
      }

      for (const role of roles) {
        if (resourceRoles.length > 0) {
          for (const resourceRole of resourceRoles) {
            const permissionValue = resourcePermission.can(action, role, resourceRole, this.resources[resourceName].resourceRolePermissions)
            if (permissionValue) {
              return permissionValue
            }
          }
        } else {
          const permissionValue = resourcePermission.can(action, role, undefined, this.resources[resourceName].resourceRolePermissions)
          if (permissionValue) {
            return permissionValue
          }
        }
      }
    }
    return false
  }
}

export default Core
