import rbac from '../index'
import IUser from '../lib/IUser'

interface AppUser extends IUser{
  id?:number
}

interface AppTicket {
  watchers: number[]
  author: number
  assignee: number
}

export const initializePermissions = () => {
  rbac.addRole('owner')
  rbac.addRole('member', 'Member')
  rbac.addRole('customer', 'Customer')

  rbac.setRoles(['owner', { name: 'member', label: 'Member' }, 'customer'])

  rbac.addResource('ticket', {
    actions: ['read', 'assign', 'comment'],
    resourceRoles: ['author', 'watcher', 'assignee'],
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
    getRoles: (user:AppUser, ticket:AppTicket):IUser => {
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
      customer:{
        comment:false
      }
    }
  })
}
