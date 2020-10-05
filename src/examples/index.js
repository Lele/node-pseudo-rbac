import core from '../index'

core.addRole('owner')
core.addRole('member', 'Member')
core.addRole('customer', 'Customer')

core.setRoles(['owner', { name: 'member', label: 'Member' }, 'customer'])

core.addResource('ticket', {
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
  getRoles: (user, ticket) => {
    const roles = user.roles
    const resourceRoles = []

    if (ticket.watchers.includes(user.id)) {
      resourceRoles.push('watcher')
    }
    if (ticket.author === user.id) {
      resourceRoles.push('author')
    }
    if (ticket.assignee === user.id) {
      resourceRoles.push('assignee')
    }
    return {
      roles,
      resourceRoles
    }
  }
})

core.setResources([
  {
    name: 'ticket',
    options: {
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
      getRoles: (user, ticket) => {
        const roles = user.roles
        const resourceRoles = []

        if (ticket.watchers.includes(user.id)) {
          resourceRoles.push('watcher')
        }
        if (ticket.author === user.id) {
          resourceRoles.push('author')
        }
        if (ticket.assignee === user.id) {
          resourceRoles.push('assignee')
        }
        return {
          roles,
          resourceRoles
        }
      }
    }
  }
])

core.setPermissions({
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
    }
  }
})

console.log(core.toJSON())

const user = {
  roles: ['customer'],
  resourceRoles: [],
  id: 1
}
const ticket = {
  title: 'bla',
  body: 'blabla',
  author: 2,
  assignee: undefined,
  watchers: [1]
}

const run = async () => {
  const resCan = await core.can(user, 'read', 'ticket', ticket)
  const resCould = await core.could(user, 'ticket', ticket)

  console.log(resCan)
  console.log(resCould)
}

run()
