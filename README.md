# README
We started to build this library because our team needed a permission library that could evaluate the permissions of a user based on his/her role in the application and with respect to the resource taken into consideration.

For example let's consider we should build a ticketing system in an application with these requirements:
  - user has one or more Roles among: Owner, Member, Customer
  - every ticket has an author, an assignee and 0 or more watchers
  - ticket can be assigned to one user

We can immediately see that every user has a Role in the application (Owner, Member or Customer) and one or more roles with respect to the ticket; we want to define permissions based on all.
For example, let's think about *read*, *assign* and *comment* permissions. For example, we can state that:

#### read
  - the Owner can read `ANY` ticket
  - the Member can read  `ANY` ticket
  - the Customer can read **only**  tickets in which is involved (i.e. he is either the author or one of the watchers)

#### assign
  - the Owner can assign `ANY` ticket
  - Member can assign tickets he/she has created (he/she is the author)
  - Customer cannot assign tickets

#### comment
  - the Owner can comment `ANY` ticket
  - authors, watchers and assignees can comment their `OWN` tickets

Our ticket library let the user define:
  - user Roles (Owner, Member, Customer)
  - resources (ticket, attachment)
  - role permissions

### Defining **ROLES**
```js
  const rbac = require('express-rbac')

  // roles as an array of strings
  let roles = ['owner', 'member', 'customer']

  rbac.setRoles(roles)

  // roles as an array of objects defining the name and the label of each one
  roles = [{
    name: 'owner',
    label: 'Owner'
  }, {
    name: 'member',
    label: 'Member'
  }, {
    name: 'customer',
    label: 'Customer'
  }]

  rbac.setRoles(roles)

  // adding each role with the addRole function

  rbac.addRole('owner')

  rbac.addRole('member', 'Member')

```

### Defining **RESOURCES**
```js
  const rbac = require('express-rbac')

  // always define resources with actions
  // if no actions are specified then the default actions will be 'create','read','update' and 'delete'
  const resources = [
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
        }
      }
    }
  ]

  rbac.setResources(resources)

  // if the user can assume particular roles with respect to the resource you have to specify resource-roles
  // at this point you need to define a function that returns user roles and user resource-roles
  // if you specify resource-roles you probably want to specify generic resource-role permissions for every action
  rbac.addResource("ticket", {
    resourceRoles: ['author', 'watcher', 'assignee'],
    actions: ['read', 'assign', 'comment'],
    resourceRolePermissions: {
      author: {
        read: true,
        comment: true,
      },
      watcher: {
        read: true,
        comment: true
      },
      assignee: {
        read: true,
        comment: true,
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
```
### Defining **ROLE PERMISSIONS**

```js
const rbac = require('express-rbac')

rbac.setPermissions({
  ticket: {
    owner: {
    // owners can read, assign and comment regardless their role in the ticket
      read: true,
      assign: true,
      comment: true
    }
    member: {
      assign: {
        author: true
      }
    }
    // We don't need to specify any permission for Customers because they will use default resource-role permissions
  }
})
```

### Apply the Permission **MIDDLEWARE**
```js
  const rbac = require('express-rbac')
  const express = require('express');

  const app = express()

  app.param('ticketId', (req, res, next, id) => {
    req.ticket = myGetTicketFunc(id)
    next()
  })

  // req.user e req["resourceName"] should be defined like the resource we want to test permissions on
  app.get('/:ticketId',myAuthMiddleware, rbac.can('read', 'ticket'), myGetTicketController)
```
