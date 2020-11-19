/**
 * interface defining the action configuration object
 */
export interface IActionInfo{
  name:string
  label?:string
}

export class Action {
  constructor (public name:string, public label?:string, public description?:string) {
    this.label = label || this.name
  }
}

/**
 * interface of the object that lists all possible actions in a resource
 */
export interface IActions{
  [action: string]: Action
}

export default Action
