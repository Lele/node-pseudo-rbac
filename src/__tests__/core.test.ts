import rbac from '../index'
import {ICheck} from '../lib/Core'
import {initializePermissions} from './fixtures'


beforeEach(() => {
  initializePermissions()
})

test('watcher can read', async () => {
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
  const permissionValue:ICheck = await rbac.can(user, 'read', 'ticket', ticket) as ICheck
  expect(permissionValue.value).toBe(true)
})

test('customer cannot read any ticket', async () => {
  const user = {
    roles: ['customer'],
    resourceRoles: [],
    id: 1
  }

  // user is not involved in the ticket
  const ticket = {
    title: 'bla',
    body: 'blabla',
    author: 2,
    assignee: undefined,
    watchers: [4]
  }
  const permissionValue:boolean = await rbac.can(user, 'read', 'ticket', ticket) as boolean
  expect(permissionValue).toBe(false)
})

test('customer cannot comment', async () => {
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
  const permissionValue:boolean = await rbac.can(user, 'comment', 'ticket', ticket) as boolean
  expect(permissionValue).toBe(false)
})

test('user without roles cannot read anything', async () => {
  const user = {
    roles: [],
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
  const permissionValue:boolean = await rbac.can(user, 'read', 'ticket', ticket) as boolean
  expect(permissionValue).toBe(false)
})
