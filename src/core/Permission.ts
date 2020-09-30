export const ANY = 2

type PermissionValue = boolean | typeof ANY

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
  value: boolean
}

interface IPermissionResultItem {
  role?:string
  resourceRole?:string
}

export interface IPermissionCheck {
  match: IPermissionResultItem
  value: PermissionValue
}

class Permissions {
  constructor (public resource:string, public resourceRolePermissions: boolean, public permissionObject: IPermissionList) {}

  can (action: string, role: string, resourceRole?:string, defaultResRolePermissions?:Permissions): false|IPermissionCheck {
    const rolePermissions = this.permissionObject[role]
    if (rolePermissions && action in rolePermissions) {
      if (typeof rolePermissions[action] === 'boolean') {
        if (rolePermissions[action]) {
          return {
            match: {
              role
            },
            value: rolePermissions[action] as PermissionValue
          }
        } else {
          return false
        }
      } else {
        if (resourceRole && resourceRole in (rolePermissions[action] as IPermission)) {
          const resourceRolePermission: IPermission = rolePermissions[action] as IPermission
          if (resourceRolePermission[resourceRole]) {
            return {
              match: { role, resourceRole },
              value: resourceRolePermission[resourceRole]
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

  toJSON ():ISerializedPermission[] {
    const outJson:ISerializedPermission[] = []
    for (const [role, rolePermissions] of Object.entries(this.permissionObject)) {
      for (const [action, actionPermission] of Object.entries(rolePermissions)) {
        if (typeof actionPermission === 'boolean') {
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
              value: resourceRolePermission as boolean
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
