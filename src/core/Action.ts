export interface IActionInfo{
  name:string
  label?:string
}

class Action {
  constructor (public name:string, public label?:string, public description?:string) {
    this.label = label || this.name
  }
}

export interface IActions{
  [action: string]: Action
}

export default Action
