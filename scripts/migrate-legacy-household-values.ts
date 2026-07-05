/**
 * One-time migration for pre-Clerk dev-household legacy values in `mypayboard-data`.
 *
 * Fixes:
 * - Maps legacy owner tokens (`user-chris`, `user-nicole`, `chris`, `nicole`) to real
 *   workspace member IDs from `data.users`.
 * - Applies the former NFCU CC due-day override (dueDay 4) as persisted data, not runtime logic.
 *
 * File usage:
 *   npx tsx scripts/migrate-legacy-household-values.ts --in backup.json --out migrated.json
 *   npx tsx scripts/migrate-legacy-household-values.ts --in backup.json --in-place
 *
 * Browser usage (dev tools on mypayboard.com, logged in):
 *   Copy the body of `runBrowserMigration()` below into the console, or import this module
 *   in a dev-only page. Writes back to localStorage key `mypayboard-data`.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Creditor, MyPayBoardData, PayDateCard, PersistedMyPayBoardData, Template, User } from '../lib/types'

const STORAGE_KEY = 'mypayboard-data'

const LEGACY_OWNER_ALIASES: Record<string, readonly string[]> = {
  'user-chris': ['user-chris', 'chris'],
  chris: ['user-chris', 'chris'],
  'user-nicole': ['user-nicole', 'nicole'],
  nicole: ['user-nicole', 'nicole'],
}

const LEGACY_NAME_HINTS: Record<string, string> = {
  'user-chris': 'chris',
  chris: 'chris',
  'user-nicole': 'nicole',
  nicole: 'nicole',
}

export type LegacyHouseholdMigrationReport = {
  ownerFieldsUpdated: number
  nfcuDueDayUpdated: boolean
  unresolvedOwnerValues: string[]
  ownerIdMap: Record<string, string>
}

function resolveWorkspaceUserId(users: User[], legacyToken: string): string | null {
  const direct = users.find(user => user.id === legacyToken)
  if (direct) return direct.id

  const aliases = LEGACY_OWNER_ALIASES[legacyToken]
  if (aliases) {
    const byAliasId = users.find(user => aliases.includes(user.id))
    if (byAliasId) return byAliasId.id

    const nameHint = LEGACY_NAME_HINTS[legacyToken]
    if (nameHint) {
      const byName = users.find(user => user.name.trim().toLowerCase().startsWith(nameHint))
      if (byName) return byName.id
    }
  }

  return null
}

function buildOwnerIdMap(users: User[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const legacyToken of Object.keys(LEGACY_OWNER_ALIASES)) {
    const resolved = resolveWorkspaceUserId(users, legacyToken)
    if (resolved) {
      for (const alias of LEGACY_OWNER_ALIASES[legacyToken] ?? [legacyToken]) {
        map.set(alias, resolved)
      }
    }
  }
  return map
}

function migrateOwnerValue(
  owner: string | undefined,
  ownerIdMap: Map<string, string>,
  unresolved: Set<string>
): string | undefined {
  if (!owner || owner === 'shared') return owner
  const mapped = ownerIdMap.get(owner)
  if (mapped) return mapped
  if (owner in LEGACY_OWNER_ALIASES) unresolved.add(owner)
  return owner
}

function migratePayDateCardOwner(
  card: PayDateCard,
  mapOwner: (owner: string | undefined) => string | undefined
): PayDateCard {
  return {
    ...card,
    owner: mapOwner(card.owner) ?? card.owner,
  }
}

function migrateNfcuCreditorDueDay(creditor: Creditor): { creditor: Creditor; changed: boolean } {
  if (creditor.name.trim().toLowerCase() !== 'nfcu cc') {
    return { creditor, changed: false }
  }
  if (creditor.dueDay === 4) {
    return { creditor, changed: false }
  }
  return {
    creditor: {
      ...creditor,
      dueDay: 4,
      dueDatePattern: '*/4',
    },
    changed: true,
  }
}

export function migrateLegacyHouseholdValues(
  input: PersistedMyPayBoardData | MyPayBoardData
): { data: PersistedMyPayBoardData; report: LegacyHouseholdMigrationReport } {
  const ownerIdMap = buildOwnerIdMap(input.users)
  const unresolved = new Set<string>()
  let ownerFieldsUpdated = 0

  const mapOwner = (owner: string | undefined): string | undefined => {
    const next = migrateOwnerValue(owner, ownerIdMap, unresolved)
    if (next !== owner) ownerFieldsUpdated += 1
    return next
  }

  const creditors = input.creditors.map(creditor => {
    let next = { ...creditor }
    const owner = mapOwner(creditor.owner)
    if (owner !== creditor.owner) {
      next = { ...next, owner }
    }
    const { creditor: withDueDay, changed: nfcuDueDayUpdated } = migrateNfcuCreditorDueDay(next)
    return { creditor: withDueDay, nfcuDueDayUpdated }
  })

  const incomes = input.incomes.map(income => {
    const owner = mapOwner(income.owner)
    if (owner === income.owner) return income
    return { ...income, owner: owner ?? income.owner }
  })

  const boards = input.boards.map(board => ({
    ...board,
    payDateCards: board.payDateCards.map(card => migratePayDateCardOwner(card, mapOwner)),
  }))

  const boardTemplates = input.boardTemplates.map((template): Template => {
    const assignedUserIds = template.assignedUserIds.map(id => {
      const next = mapOwner(id) ?? id
      return next
    })
    const payDateCards = template.payDateCards.map(card => ({
      ...card,
      assignedUserId: mapOwner(card.assignedUserId) ?? card.assignedUserId,
    }))
    return { ...template, assignedUserIds, payDateCards }
  })

  const { currentUserId: _runtimeUserId, ...persisted } = input as MyPayBoardData

  return {
    data: {
      ...persisted,
      creditors: creditors.map(entry => entry.creditor),
      incomes,
      boards,
      boardTemplates,
    },
    report: {
      ownerFieldsUpdated,
      nfcuDueDayUpdated: creditors.some(entry => entry.nfcuDueDayUpdated),
      unresolvedOwnerValues: [...unresolved],
      ownerIdMap: Object.fromEntries(ownerIdMap),
    },
  }
}

function parseArgs(argv: string[]): { inputPath?: string; outputPath?: string; inPlace: boolean; dryRun: boolean } {
  let inputPath: string | undefined
  let outputPath: string | undefined
  let inPlace = false
  let dryRun = false

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--in') {
      inputPath = argv[i + 1]
      i += 1
    } else if (arg === '--out') {
      outputPath = argv[i + 1]
      i += 1
    } else if (arg === '--in-place') {
      inPlace = true
    } else if (arg === '--dry-run') {
      dryRun = true
    }
  }

  return { inputPath, outputPath, inPlace, dryRun }
}

function loadJson(path: string): PersistedMyPayBoardData {
  const raw = readFileSync(resolve(path), 'utf8')
  return JSON.parse(raw) as PersistedMyPayBoardData
}

function printReport(report: LegacyHouseholdMigrationReport, dryRun: boolean): void {
  console.log(dryRun ? '[dry-run] Legacy household migration report:' : 'Legacy household migration report:')
  console.log(`  owner fields updated: ${report.ownerFieldsUpdated}`)
  console.log(`  NFCU CC dueDay set to 4: ${report.nfcuDueDayUpdated}`)
  if (Object.keys(report.ownerIdMap).length > 0) {
    console.log('  owner id map:', report.ownerIdMap)
  }
  if (report.unresolvedOwnerValues.length > 0) {
    console.warn('  unresolved legacy owner values:', report.unresolvedOwnerValues)
  }
  if (report.ownerFieldsUpdated > 0) {
    console.warn(
      '  Note: per-user moduleHeaderColors prefs keys include pay-date owner ids; re-save header colors if needed.'
    )
  }
}

export function runBrowserMigration(): LegacyHouseholdMigrationReport {
  if (typeof localStorage === 'undefined') {
    throw new Error('runBrowserMigration() must run in a browser context.')
  }
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) throw new Error(`No ${STORAGE_KEY} found in localStorage.`)
  const parsed = JSON.parse(raw) as PersistedMyPayBoardData
  const { data, report } = migrateLegacyHouseholdValues(parsed)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  printReport(report, false)
  return report
}

function main(): void {
  const { inputPath, outputPath, inPlace, dryRun } = parseArgs(process.argv.slice(2))
  if (!inputPath) {
    console.error(
      'Usage: npx tsx scripts/migrate-legacy-household-values.ts --in <path> [--out <path> | --in-place] [--dry-run]'
    )
    process.exit(1)
  }

  const parsed = loadJson(inputPath)
  const { data, report } = migrateLegacyHouseholdValues(parsed)
  printReport(report, dryRun)

  if (dryRun) return

  const targetPath = inPlace ? resolve(inputPath) : outputPath ? resolve(outputPath) : undefined
  if (!targetPath) {
    console.error('Provide --out <path> or --in-place to write migrated JSON.')
    process.exit(1)
  }

  writeFileSync(targetPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
  console.log(`Wrote migrated data to ${targetPath}`)
}

if (process.argv[1]?.endsWith('migrate-legacy-household-values.ts')) {
  main()
}
