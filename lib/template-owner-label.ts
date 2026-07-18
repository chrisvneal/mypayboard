import { getUserDisplayName } from '@/lib/user-display-name'
import type { Template, User } from '@/lib/types'

/** Household-visible creator label for a template list card. */
export function getTemplateCardOwnerLabel(
  template: Template,
  users: User[],
  currentUserId: string
): string {
  const currentUser = users.find(u => u.id === currentUserId)
  const currentLabel = currentUser ? getUserDisplayName(currentUser) : ''

  if (users.length <= 1) {
    return formatCreatedBy(currentLabel)
  }

  const resolvedAssigned = template.assignedUserIds
    .map(id => users.find(u => u.id === id))
    .filter((user): user is User => user != null)

  if (resolvedAssigned.length === 1 && resolvedAssigned[0].id !== currentUserId) {
    return formatCreatedBy(getUserDisplayName(resolvedAssigned[0]))
  }

  return formatCreatedBy(currentLabel)
}

function formatCreatedBy(name: string): string {
  return name ? `Created by ${name}` : ''
}
