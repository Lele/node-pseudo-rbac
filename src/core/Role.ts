import IUser from './IUser'

export interface IGetResourceFilter {
  (user:IUser): unknown[]
}

export interface IResourceFilters{
  [resource: string]: IGetResourceFilter
}

export interface IRole{
  name: string,
  label?: string
  description?: string
  resourceFilterGetters?:IResourceFilters
}

export interface IUserRoles {
  roles: string[]
  resourceRoles: string[]
}

class Role {
  public label: string

  constructor (public name:string, label?:string, public description?:string, public resourceFilterGetters?: IResourceFilters) {
    this.label = label || this.name
  }

  toJSON ():IRole {
    return {
      name: this.name,
      label: this.label,
      description: this.description
    }
  }

  getFilters (user:IUser, resource: string):unknown[] {
    if (this.resourceFilterGetters && this.resourceFilterGetters[resource]) {
      return this.resourceFilterGetters[resource](user)
    }
    return []
  }
}

export interface IRoles {
  [role: string]: Role
}

export default Role
