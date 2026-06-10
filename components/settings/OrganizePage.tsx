'use client'

import { Receipt, Wallet } from 'lucide-react'
import { OrganizeCategorySection } from '@/components/settings/OrganizeCategorySection'
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
        Loading organize settings...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-(--text-primary)">Organize</h1>
        <p className="mt-2.5 max-w-xl text-[13px] leading-relaxed text-(--text-secondary)">
          Manage the groups used to organize your expenses and income.
        </p>
      </header>

      <div className="space-y-6">
        <OrganizeCategorySection
          scope="expense"
          title="Expenses"
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
