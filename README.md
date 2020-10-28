# README
We started to build this library because our team needed a permission library that could evaluate the permissions of a user based on his/her role in the application and with respect to the resource taken into consideration.

In particular the library let you:
  - define `role`s
  - define `resource`s and their own specific roles (called `resource-role`s)
  - define `permission`s for each role and resource-role with respect of each resource
  - define a list of query-conditions to filter out resources starting from user roles
  - use express middleware to manage user access on resources

Permission are attribute-based, this means that you can specify a list of resource attributes to limit the effect of an action.

## EXAMPLE

For example, let's consider we have to build a ticketing system with these requirements:
  - user has one or more Roles among: Owner, Member, Customer
  - every ticket has an author, an assignee and 0 or more watchers
  - ticket can be assigned to one user

We can immediately see that every user has a Role in the application (Owner, Member or Customer) and one or more roles with respect to the ticket; we want to define permissions based on all of them.
For example, let's think about *read*, *update*, *assign* and *comment* permissions. We could state that:

#### read
  - the Owner can read `ANY` ticket
  - a Member can read  `ANY` ticket
  - a Customer can read **only**  tickets in which is involved (i.e. he is either the author or one of the watchers)

#### assign
  - the Owner can assign `ANY` ticket
  - a Member can assign tickets he/she has created (he/she is the author)
  - a Customer cannot assign tickets

#### comment
  - the Owner can comment `ANY` ticket
  - authors, watchers and assignees can comment their `OWN` tickets
  - a Customers cannot comment any tickets

#### update
  - the Owner can comment `ANY` ticket
  - authors can update their own tickets
  - watcher and assignees cannot update tickets
  - a Member can always update ticket titles in the tickets they are involved in

Our ticket library let the user define:
  - user Roles (Owner, Member, Customer)
  - resources (ticket, attachment)
  - role permissions

### Defining **ROLES**
First, we want to define user roles. Create a new file *roles.js* and insert the code that will define roles and their correspondent labels:

```js
  // roles as an array of objects defining the name and the label of each one
  const roles = [{
    name: 'owner',
    label: 'Owner'
  }, {
    name: 'member',
    label: 'Member'
  }, {
    name: 'customer',
    label: 'Customer'
  }]

  module.exports = roles

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
  // always define resources with actions
  // if the user can assume particular roles with respect to the resource you have to specify resource-roles
  // at this point you need to define a function that returns user roles and user resource-roles
  // if you specify resource-roles you probably want to specify generic resource-role permissions for every action
  module.exports = {
    name:'ticket',
    resourceRoles: ['author', 'watcher', 'assignee'],
    actions: ['read', 'assign', 'comment'],
    resourceRolePermissions: {
      author: {
        read: true,
        comment: true,
        update: true
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
- an array of strings defining which attributes the user has the permission on (especially useful for read and update permissions)
- a `resourceRolePermission` to overwrite generic resource role permissions

let's create a *permissions.js* file
```js
const { ANY } = require('express-rbac/core')

module.exports = {
  ticket: {
    owner: {
    // owners can read, update, assign and comment regardless their role in the ticket
      read: ANY,
      assign: true,
      comment: ANY
      update: ANY
    },
    // overwrite generic assign and update behaviour for Member role
    member: {
      read: ANY,
      assign: {
        author: true
      },
      update: ['title']
    },
    //Customers cannot comment any ticket
    customer: {
      comment: false
    }
  }
}
```

### Configure `rbac`
now we have to configure the rbac instance with all the created conf. Let's do this in a *rbac.js* file

```js
const Rbac = require('express-rbac')
const roles = require('./roles')
const ticket = require('./ticket')
const permissions = require('./permissions')

const rbac = new Rbac()

rbac.setRoles(roles)
rbac.addResource(ticket)
rbac.setPermissions(Permissions)

module.exports = rbac
```

### Apply the Permission **MIDDLEWARE**
```js
  const rbac = require('./rbac')
  const express = require('express');

  const app = express()

  app.param('ticketId', (req, res, next, id) => {
    req.ticket = myGetTicketFunc(id)
    next()
  })

  // req.user e req["resourceName"] should be defined like the resource we want to test permissions on
  app.get('/:ticketId',myAuthMiddleware, rbac.can('read', 'ticket'), myGetTicketController)
```

If the user has the permission to access the controller, then the library will place a `permissionRes` attribute in the req object.\
`permissionRes` has the following structure:

```ts
{
  matches: [ // the list of permission matches (for debugging purposes)
    {
      match: {
        role?:string,
        resourceRole?:string
      },
      value: boolean | ANY,
      attributes: string[]
    }
  ],
  value: boolean | ANY, // the global value of the permission
  attributes: string[] // the list of attributes that the user can access for the specified action
}
```

## LISTS
