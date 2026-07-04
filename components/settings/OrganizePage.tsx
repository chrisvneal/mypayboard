'use client'

import Link from 'next/link'
import { Receipt, Wallet } from 'lucide-react'
import { OrganizeCategorySection } from '@/components/settings/OrganizeCategorySection'
import { DASHBOARD_PATHS } from '@/lib/dashboard-pages'
import { useMyPayBoard } from '@/lib/useMyPayBoard'

export function OrganizePage() {
  const {
    data,
    isLoaded,
    addCategoryDefinition,
    updateCategoryDefinition,
    deleteCategoryDefinitions,
    reorderCategoryDefinitions,
  } = useMyPayBoard()

  if (!isLoaded) {
    return (
      <div className="rounded-lg border border-[--module-divider-color] bg-(--bg-primary) p-8 text-center text-(--text-secondary) shadow-(--shadow-sm)">
        Loading Organize Lists...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-(--text-primary)">Organize Lists</h1>
        <p className="mt-2.5 max-w-xl text-[13px] leading-relaxed text-(--text-secondary)">
          Manage the bill and income groups used on{' '}
          <Link
            href={DASHBOARD_PATHS.billsAndIncome}
            className="font-medium text-(--text-secondary) underline decoration-[color-mix(in_srgb,var(--text-secondary)_40%,transparent)] underline-offset-2 transition duration-200 ease-out hover:text-(--navy) hover:decoration-(--navy)"
          >
            Bills &amp; Income
          </Link>
          .
        </p>
      </header>

      <div className="grid grid-cols-1 gap-7 md:grid-cols-2 md:grid-rows-[auto_auto] md:justify-items-start md:gap-x-6 md:gap-y-7">
        <OrganizeCategorySection
          scope="expense"
          title="Bills"
          description="Groups for your bills and spending."
          icon={<Receipt className="size-4" strokeWidth={2} />}
          categories={data.expenseCategories}
          creditors={data.creditors}
          incomes={data.incomes}
          onAdd={name => addCategoryDefinition('expense', name)}
          onRename={(categoryId, name) => updateCategoryDefinition(categoryId, { name })}
          onDelete={deleteCategoryDefinitions}
          onReorder={orderedIds => reorderCategoryDefinitions('expense', orderedIds)}
        />

        <OrganizeCategorySection
          scope="income"
          title="Income"
          description="Groups for your income sources."
          icon={<Wallet className="size-4" strokeWidth={2} />}
          categories={data.incomeCategories}
          creditors={data.creditors}
          incomes={data.incomes}
          onAdd={name => addCategoryDefinition('income', name)}
          onRename={(categoryId, name) => updateCategoryDefinition(categoryId, { name })}
          onDelete={deleteCategoryDefinitions}
          onReorder={orderedIds => reorderCategoryDefinitions('income', orderedIds)}
        />
      </div>
    </div>
  )
}
