import Rbac from '../index'
import IUser from '../core/IUser'
import { IGetRoles } from '../core/Resource'

export interface IAppUser extends IUser{
  id?:number
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
      resourceFilterGetter: (user:IAppUser) => {
        return [{ author: user.id }]
      }
    }, {
      name: 'watcher',
      resourceFilterGetter: (user:IAppUser) => {
        return [{ watchers: user.id }]
      }
    }, {
      name: 'assignee',
      resourceFilterGetter: (user:IAppUser) => {
        return [{ assignee: user.id }]
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
