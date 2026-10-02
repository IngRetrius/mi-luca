import type { Messages } from '@miluca/i18n';

import { withAddress, type FormOfAddress } from '@/lib/address';

import type { BudgetFormText } from './budget-item-form';

/**
 * Textos del formulario según quién lo usa. Al cliente se le habla con su trato y se le pregunta
 * "¿Quién lo paga? Yo, Mi familia, Otra persona" (P-C07).
 */
export function budgetFormText(
  t: Messages,
  viewer:
    | { readonly role: 'advisor' }
    | { readonly role: 'client'; readonly formOfAddress: FormOfAddress },
): BudgetFormText {
  const budget = t.budget;
  const shared = {
    frequencies: budget.frequencies,
    expenseTypes: budget.expenseTypes,
    expenseTypeHints: budget.expenseTypeHints,
    categories: budget.categories,
  };
  if (viewer.role === 'advisor') {
    return {
      ...shared,
      form: budget.form,
      payers: budget.payers,
      preview: { ...budget.preview, title: budget.preview.advisorTitle, labels: t.keyFigures },
    };
  }
  const client = withAddress(budget.client, viewer.formOfAddress);
  return {
    ...shared,
    form: {
      ...budget.form,
      amountHint: client.amountHint,
      essentialHint: client.essentialHint,
      payerLabelHint: client.payerLabelHint,
      currencyHint: budget.form.currencyHint,
    },
    payers: client.payers,
    preview: {
      ...budget.preview,
      title: withAddress(budget.preview.title, viewer.formOfAddress),
      labels: t.keyFigures,
    },
  };
}
