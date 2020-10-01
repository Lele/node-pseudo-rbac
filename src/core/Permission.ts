export const ANY = 2

type PermissionValue = boolean | typeof ANY | string[]

export interface IPermission{
  [action: string]: PermissionValue
}

export interface IComplexPermission{
  [action: string]: IPermission
}

export interface IPermissionList {
  [role: string]: IComplexPermission|IPermission
}

export interface ISerializedPermission {
  resource: string
  role: string
  action: string
  resourceRole?: string
  value: PermissionValue
}

interface IPermissionResultItem {
  role?:string
  resourceRole?:string
}

export interface IPermissionCheck {
  match: IPermissionResultItem
  value: boolean | typeof ANY
  attributes: string[]
}

class Permissions {
  constructor (public resource:string, public resourceRolePermissions: boolean, public permissionObject: IPermissionList) {}

  can (action: string, role: string, resourceRole?:string, defaultResRolePermissions?:Permissions): false|IPermissionCheck {
    const rolePermissions = this.permissionObject[role]
    if (rolePermissions && action in rolePermissions) {
      if (typeof rolePermissions[action] === 'boolean' || Array.isArray(rolePermissions[action])) {
        if (rolePermissions[action]) {
          let value: PermissionValue
          let attributes: string[]

          if (rolePermissions[action] === ANY) {
            value = ANY
            attributes = ['*']
          } else {
            value = !!rolePermissions[action]
            attributes = rolePermissions[action] === true ? ['*'] : rolePermissions[action] as string[]
          }

          return {
            match: {
              role
            },
            value,
            attributes
          }
        } else {
          return false
        }
      } else {
        if (resourceRole && resourceRole in (rolePermissions[action] as IPermission)) {
          const resourceRolePermission: IPermission = rolePermissions[action] as IPermission
          if (resourceRolePermission[resourceRole]) {
            let value: PermissionValue
            let attributes: string[]

            if (resourceRolePermission[resourceRole] === ANY) {
              value = ANY
              attributes = ['*']
            } else {
              value = !!resourceRolePermission[resourceRole]
              attributes = resourceRolePermission[resourceRole] === true ? ['*'] : resourceRolePermission[resourceRole] as string[]
            }

            return {
              match: { role, resourceRole },
              value,
              attributes
            }
          } else {
            return false
          }
        }
      }
    }
    if (resourceRole) {
      const defaultPermission = defaultResRolePermissions?.can(action, resourceRole)
      if (defaultPermission) {
        return defaultPermission
      }
    }
    return false
  }

  setPermission (permission:ISerializedPermission):void {
    // initizlize permissionObject if it is undefined
    if (!this.permissionObject) {
      this.permissionObject = {}
    }

    // if no permission is defined for the current resource then simply insert the definition
    if (this.permissionObject && !(permission.resource in this.permissionObject)) {
      this.permissionObject[permission.resource] = {
        [permission.resource]: {
          [permission.role]: {
            [permission.action]: !permission.resourceRole ? permission.value : {
              [permission.resourceRole]: permission.value
            }
          }
        }
      }
      return
    }

    const resourcePermissions = this.permissionObject[permission.resource]

    // if no permission is defined for the current role then insert the definition
    if (!(permission.role in resourcePermissions)) {
      resourcePermissions[permission.role] = {
        [permission.action]: !permission.resourceRole ? permission.value : {
          [permission.resourceRole]: permission.value
        }
      }
    } else {
      // otherwise check if the action permission is defined
      if (permission.action in resourcePermissions[permission.role]) {
        // if it is defined and is a boolean or an array of string then overwrite it
        if (typeof resourcePermissions[permission.role][permission.action] === 'boolean' || Array.isArray(resourcePermissions[permission.role][permission.action])) {
          resourcePermissions[permission.role][permission.action] = !permission.resourceRole ? permission.value : {
            [permission.resourceRole]: permission.value
          }
        } else {
          // if it is an object check the new permission
          if (permission.resourceRole) {
            resourcePermissions[permission.role][permission.action] = {
              ...resourcePermissions[permission.role][permission.action] as IComplexPermission,
              [permission.resourceRole]: permission.value
            }
          } else {
            resourcePermissions[permission.role][permission.action] = permission.value
          }
        }
      }
    }
  }

  toJSON ():ISerializedPermission[] {
    const outJson:ISerializedPermission[] = []
    for (const [role, rolePermissions] of Object.entries(this.permissionObject)) {
      for (const [action, actionPermission] of Object.entries(rolePermissions)) {
        if (typeof actionPermission === 'boolean' || Array.isArray(actionPermission)) {
          outJson.push({
            resource: this.resource,
            role: role,
            action: action,
            value: actionPermission
          })
        } else {
          for (const [resourceRole, resourceRolePermission] of Object.entries(actionPermission)) {
            outJson.push({
              resource: this.resource,
              role: role,
              action: action,
              resourceRole,
              value: resourceRolePermission as PermissionValue
            })
          }
        }
      }
    }

    return outJson
  }
}

export interface ISytemPermissionList {
  [resource: string]: IPermissionList
}

export interface ISytemPermissions {
  [resource: string]: Permissions
}

export default Permissions
