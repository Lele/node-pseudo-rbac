import Rbac from '../index'
import IUser from '../core/IUser'
import { IGetRoles } from '../core/Resource'

export interface IAppUser extends IUser{
  id?:number
}

const isIAppUser =  (user: IUser): user is IAppUser=> {
  return (user as IAppUser).id !== undefined
}

interface AppTicket {
  watchers: number[]
  author: number
  assignee: number
}

const getRoles = (user:IAppUser, ticket:AppTicket):IUser => {
  const roles = user.roles
  const resourceRoles = []

  if (ticket.watchers.includes(user.id as number)) {
    resourceRoles.push('watcher')
  }
  if (ticket.author === user.id as number) {
    resourceRoles.push('author')
  }
  if (ticket.assignee === user.id as number) {
    resourceRoles.push('assignee')
  }
  return {
    roles,
    resourceRoles
  }
}

export const initializePermissions = (rbac: Rbac):void => {
  rbac.addRole('owner')
  rbac.addRole('member', 'Member')
  rbac.addRole('customer', 'Customer')

  rbac.setRoles(['owner', { name: 'member', label: 'Member' }, 'customer'])

  rbac.addResource('ticket', {
    actions: ['read', 'assign', 'comment'],
    resourceRoles: [{
      name: 'author',
      resourceFilterGetter: (user?:IUser) => {
        if(user && isIAppUser(user)){
          return [{ author: user.id }]
        } else {
          return []
        }
      }
    }, {
      name: 'watcher',
      resourceFilterGetter: (user?:IUser) => {
        if(user && isIAppUser(user)){
          return [{ watchers: user.id }]
        } else {
          return []
        }
      }
    }, {
      name: 'assignee',
      resourceFilterGetter: (user?:IUser) => {
        if(user && isIAppUser(user)){
          return [{ assignee: user.id }]
        } else {
          return []
        }
      }
    }],
    resourceRolePermissions: {
      author: {
        read: true,
        comment: true
      },
      watcher: {
        read: true,
        comment: true
      },
      assignee: {
        read: true,
        comment: true
      }
    },
    getRoles: (getRoles as IGetRoles)
  })

  rbac.setPermissions({
    ticket: {
      owner: {
        read: true,
        assign: true,
        comment: true
      },
      member: {
        assign: {
          author: true
        }
      },
      customer: {
        comment: false
      }
    }
  })
}
