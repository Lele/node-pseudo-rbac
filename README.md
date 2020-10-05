# README
We started to build this library because our team needed a permission library that could evaluate the permissions of a user based on his/her role in the application and with respect to the resource taken into consideration.

For example let's consider we have to build a ticketing system with these requirements:
  - user has one or more Roles among: Owner, Member, Customer
  - every ticket has an author, an assignee and 0 or more watchers
  - ticket can be assigned to one user

We can immediately see that every user has a Role in the application (Owner, Member or Customer) and one or more roles with respect to the ticket; we want to define permissions based on all of them.
For example, let's think about *read*, *assign* and *comment* permissions. For example, we could state that:

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
  - Customers cannot comment any tickets

Our ticket library let the user define:
  - user Roles (Owner, Member, Customer)
  - resources (ticket, attachment)
  - role permissions

### Defining **ROLES**
First, we want to define user roles. Create a new file *roles.js* and insert the code that will define roles and their correspondent labels:

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
Resources are more complicated to define.
For each resource we have to explicitly write:
- the `actions` that could be performed by users
- the `resourceRoles` that a user can have with respect to the resource itself
- the `resourceRolePermissions` that will define generic permission on the resource
- a custmom `getRoles` function that will return the roles and the resourceRoles of the user that will be evaluated

Let's create a new file *ticket.js* and define resource roles permissions such that `author`s, `watcher`s and `assignee`s can `read` and `comment` tickets.

```js
  const rbac = require('express-rbac')

  // always define resources with actions
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
Finally we can define roles permissions. The permissions-object defines permissions on every resource and role.
Possible values for each permission are:
- a `boolean`
- an array of strings defining on which attributes the user have the permission (especially usefull for read and update permissions)
- a `resourceRolePermission` to overwrite generic resource role permissions

let's create a *permissions.js* file
```js
const rbac, { ANY } = require('express-rbac')

rbac.setPermissions({
  ticket: {
    owner: {
    // owners can read, assign and comment regardless their role in the ticket
      read: ANY,
      assign: true,
      comment: ANY
    },
    // overwrite generic assign behaviour for Member role
    member: {
      read: ANY,
      assign: {
        author: true
      }
    },
    //Customers cannot comment any ticket
    customer: {
      comment: false
    }
  }
})
```

### Configure `rbac`
Import your project main file import the previously created configuration files
```js
require('roles.js')
require('ticket.js')
require('permissions.js')
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
