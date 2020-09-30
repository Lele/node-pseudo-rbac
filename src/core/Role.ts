export interface IRole{
  name: string,
  label?: string
  description?: string
}

export interface IUserRoles {
  roles: string[]
  resourceRoles: string[]
}

class Role {
  public label: string

  constructor (public name:string, label?:string, public description?:string) {
    this.label = label || this.name
  }

  toJSON ():IRole {
    return {
      name: this.name,
      label: this.label,
      description: this.description
    }
  }
}

export interface IRoles {
  [role: string]: Role
}

export default Role
