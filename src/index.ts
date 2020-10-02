import Core, { ICheck } from './lib/Core'
import IUser from './lib/IUser'
import Role, { IRole, IRoles } from './lib/Role'
import Resource, { IResource, IResourceOptions } from './lib/Resource'
import Permissions, { ISytemPermissions, ISerializedPermission, ISytemPermissionList, IPermissionCheck, ANY } from './lib/Permission'

const core:Core<IUser> = new Core()

export default core

interface IRequest {
  user: IUser,
  permissionRes?: boolean|ICheck
  [key: string]: unknown
}

interface INextFunction{
  ():void
}

interface IMiddleware {
  (req: IRequest, res:unknown, next:INextFunction):Promise<void>
}

export const canMiddleware = (action: string, resource:string): IMiddleware => {
  return async (req: IRequest, res: unknown, next:INextFunction) => {
    if (!('user' in req)) {
      throw Error('req.user must be defined')
    } else if ((!('roles' in req.user)) || !Array.isArray(req.user.roles)) {
      throw Error('req.user.roles must be defined as the list of the user-role names')
    }
    req.permissionRes = await core.can(req.user, action, resource, req[resource])
    next()
  }
}
