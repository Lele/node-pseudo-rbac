export const ANY = 2

/**
 * interface defining permission possible values
 * `ANY` means a role can performe the specified action on every item of that resource. If a permission is set to `ANY` then the resource roles evaluation is by-passed. Because of this, `ANY` is meaningless used in resource-role permission definition
 * **true** means a role (or resource-role) can perform the specified action. If a role permission is set to **true** it means that the user can perform the action regardless of the resource-role he can take on. Though the resorce-role evaluation is not by-passed
 * **false** means a role (or resource-role) cannot perform the specified action. If a permission is not specified then it will take **false** as the defaul value. Though it can be used to overwrite resource-roles permission on the role higher level
 */
type PermissionValue = boolean | typeof ANY | string[]

/**
 * interface of the permission configuration object of a role over one resource
 */
export interface IPermission{
  [action: string]: PermissionValue
}

/**
 * interface of the permission configuration object (with resource-roles) of a role over one resource
 */
export interface IComplexPermission{
  [action: string]: IPermission
}

/**
 * interface of the permission configuration object (roles and resource-roles) of every role over one resource
 */
export interface IPermissionList {
  [role: string]: IComplexPermission|IPermission
}

/**
 * interface that represents how permissions are serialized
 */
export interface ISerializedPermission {
  resource: string
  role: string
  action: string
  resourceRole?: string
  value: PermissionValue
}

/**
 * interface of permission result match. Represent one of the `role` and `resourceRole` match that lead to the final permission result
 */
interface IPermissionResultItem {
  role?:string
  resourceRole?:string
}

/**
 * interface of the permission test result (**can** method)
 */
export interface IPermissionCheck {
  match: IPermissionResultItem
  value: boolean | typeof ANY
  attributes: string[]
}

/**
 * class representing the whole set of a resource permissions of a pseudo-rbac instance
 */
export class Permissions {
  constructor (public resource:string, public resourceRolePermissions: boolean, public permissionObject: IPermissionList = {}) {}

  /**
   * function to test a single action permission against a role (and a resource role)
   * @param action the name of the action to be performed
   * @param role the name of role to be tested
   * @param resourceRole the name of the resource-role to be tested
   * @param defaultResRolePermissions the object containing the set of resource-role permissions
   * @return the result of permission check
   *
   * Example
   * ```ts
   * permissionsInstance.can('write', 'owner', 'author', { author: { read: true, write: ANY } })
   * ```
   */
  can (action: string, role: string, resourceRole?:string, defaultResRolePermissions?:Permissions): false|IPermissionCheck {
    const rolePermissions = this.permissionObject[role]
    if (rolePermissions && action in rolePermissions) {
      if (typeof rolePermissions[action] === 'boolean' || rolePermissions[action] === ANY || Array.isArray(rolePermissions[action])) {
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

  /**
   * set one permission rule overwriting possible conflicting rules
   * @param permission the serializable permission configuration object
   */
  setPermission (permission:ISerializedPermission):void {
    // initialize permissionObject if it is undefined
    if (!this.permissionObject) {
      this.permissionObject = {}
    }

    const resourcePermissions = this.permissionObject

    // if no permission is defined for the current role then insert the definition
    if (!(permission.role in resourcePermissions)) {
      if (permission.resourceRole) {
        resourcePermissions[permission.role] = {
          [permission.action]: {
            [permission.resourceRole]: permission.value
          }
        }
      } else {
        resourcePermissions[permission.role] = {
          [permission.action]: permission.value
        }
      }
    } else {
      // otherwise check if the action permission is defined
      if (permission.action in resourcePermissions[permission.role]) {
        // if it is defined and is a boolean or an array of string then overwrite it
        if (typeof resourcePermissions[permission.role][permission.action] === 'boolean' || Array.isArray(resourcePermissions[permission.role][permission.action])) {
          if (permission.resourceRole) {
            resourcePermissions[permission.role][permission.action] = !permission.resourceRole ? permission.value : {
              [permission.resourceRole]: permission.value
            }
          } else {
            resourcePermissions[permission.role][permission.action] = permission.value
          }
        } else {
          // if it is an object check the new permission
          if (permission.resourceRole) {
            resourcePermissions[permission.role][permission.action] = {
              ...resourcePermissions[permission.role][permission.action] as IPermission,
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
