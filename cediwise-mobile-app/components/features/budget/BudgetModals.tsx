import type { BudgetBucket, BudgetCategory } from '../../../types/budget';
import type { AllocationExceededResult } from '../../../utils/allocationExceeded';
import { AddCustomCategoryModal } from '../../AddCustomCategoryModal';
import { AllocationExceededModal } from '../../AllocationExceededModal';
import { BudgetTransactionModal } from '../../BudgetTransactionModal';
import { ConfirmModal } from '../../ConfirmModal';
import { EditCategoryLimitModal } from '../../EditCategoryLimitModal';
import { EditCycleDayModal } from '../../EditCycleDayModal';
import { EditIncomeSourceModal } from '../../EditIncomeSourceModal';

interface PendingConfirm {
  bucket: BudgetBucket;
  categoryId?: string | null;
  amount: number;
  note?: string;
}

interface IncomeToEdit {
  id: string;
  name: string;
  type: 'primary' | 'side';
  amount: number;
  applyDeductions: boolean;
}

interface EditingLimit {
  id: string;
  name: string;
  current: number;
}

interface BudgetModalsProps {
  showAddCustomCategoryModal: boolean;
  setShowAddCustomCategoryModal: (v: boolean) => void;
  onAddCategory: (params: { name: string; bucket: BudgetBucket; limitAmount: number }) => Promise<void>;

  showTxModal: boolean;
  setShowTxModal: (v: boolean) => void;
  cycleCategories: BudgetCategory[]; // from types/budget (full shape for BudgetTransactionModal)
  needsOverLimitFor: (categoryId: string | null | undefined, amount: number) => boolean;
  onAddTransaction: (params: {
    amount: number;
    note?: string;
    bucket: BudgetBucket;
    categoryId?: string | null;
  }) => Promise<void>;
  pendingConfirm: PendingConfirm | null;
  setPendingConfirm: (v: PendingConfirm | null) => void;
  showNeedsOverModal: boolean;
  setShowNeedsOverModal: (v: boolean) => void;

  showResetConfirm: boolean;
  setShowResetConfirm: (v: boolean) => void;
  onResetBudget: () => Promise<void>;

  categoryToDelete: { id: string; name: string } | null;
  setCategoryToDelete: (v: { id: string; name: string } | null) => void;
  showDeleteCategoryConfirm: boolean;
  setShowDeleteCategoryConfirm: (v: boolean) => void;
  onDeleteCategory: (id: string) => Promise<void>;

  incomeToDelete: { id: string; name: string } | null;
  setIncomeToDelete: (v: { id: string; name: string } | null) => void;
  showDeleteIncomeConfirm: boolean;
  setShowDeleteIncomeConfirm: (v: boolean) => void;
  onDeleteIncomeSource: (id: string) => Promise<void>;

  incomeToEdit: IncomeToEdit | null;
  setIncomeToEdit: (v: IncomeToEdit | null) => void;
  showEditIncomeModal: boolean;
  setShowEditIncomeModal: (v: boolean) => void;
  onUpdateIncomeSource: (id: string, next: Partial<IncomeToEdit>) => Promise<void>;

  editingLimit: EditingLimit | null;
  setEditingLimit: (v: EditingLimit | null) => void;
  showEditLimitModal: boolean;
  setShowEditLimitModal: (v: boolean) => void;
  onUpdateCategoryLimit: (id: string, nextLimit: number) => Promise<void>;

  allocationExceededResult: AllocationExceededResult | null;
  showAllocationExceededModal: boolean;
  setShowAllocationExceededModal: (v: boolean) => void;
  onConfirmAllocationExceeded: () => Promise<void>;
  onCloseAllocationExceeded: () => void;

  showEditCycleModal: boolean;
  setShowEditCycleModal: (v: boolean) => void;
  activeCyclePaydayDay: number;
  onUpdateCycleDay: (nextDay: number) => Promise<void>;
}

export function BudgetModals({
  showAddCustomCategoryModal,
  setShowAddCustomCategoryModal,
  onAddCategory,
  showTxModal,
  setShowTxModal,
  cycleCategories,
  needsOverLimitFor,
  onAddTransaction,
  pendingConfirm,
  setPendingConfirm,
  showNeedsOverModal,
  setShowNeedsOverModal,
  showResetConfirm,
  setShowResetConfirm,
  onResetBudget,
  categoryToDelete,
  setCategoryToDelete,
  showDeleteCategoryConfirm,
  setShowDeleteCategoryConfirm,
  onDeleteCategory,
  incomeToDelete,
  setIncomeToDelete,
  showDeleteIncomeConfirm,
  setShowDeleteIncomeConfirm,
  onDeleteIncomeSource,
  incomeToEdit,
  setIncomeToEdit,
  showEditIncomeModal,
  setShowEditIncomeModal,
  onUpdateIncomeSource,
  editingLimit,
  setEditingLimit,
  showEditLimitModal,
  setShowEditLimitModal,
  onUpdateCategoryLimit,
  allocationExceededResult,
  showAllocationExceededModal,
  setShowAllocationExceededModal,
  onConfirmAllocationExceeded,
  onCloseAllocationExceeded,
  showEditCycleModal,
  setShowEditCycleModal,
  activeCyclePaydayDay,
  onUpdateCycleDay,
}: BudgetModalsProps) {
  return (
    <>
      <AddCustomCategoryModal
        visible={showAddCustomCategoryModal}
        onClose={() => setShowAddCustomCategoryModal(false)}
        onAdd={async (params) => {
          await onAddCategory(params);
          setShowAddCustomCategoryModal(false);
        }}
      />

      <BudgetTransactionModal
        visible={showTxModal}
        categories={cycleCategories}
        onClose={() => setShowTxModal(false)}
        onSubmit={async ({ amount, note, bucket, categoryId }) => {
          if (bucket === 'needs' && needsOverLimitFor(categoryId, amount)) {
            setPendingConfirm({ amount, note, bucket, categoryId });
            setShowNeedsOverModal(true);
            return;
          }
          await onAddTransaction({ amount, note, bucket, categoryId });
        }}
      />

      <ConfirmModal
        visible={showNeedsOverModal}
        title="Needs limit exceeded"
        description="This expense will push a Needs category above its limit. Log anyway?"
        confirmLabel="Log anyway"
        onClose={() => {
          setShowNeedsOverModal(false);
          setPendingConfirm(null);
        }}
        onConfirm={async () => {
          setShowNeedsOverModal(false);
          if (!pendingConfirm) return;
          await onAddTransaction(pendingConfirm);
          setPendingConfirm(null);
        }}
      />

      <ConfirmModal
        visible={showResetConfirm}
        title="Reset budget?"
        description="This clears your local Budget data and deletes your Budget data from Supabase. This action cannot be undone."
        confirmLabel="Reset"
        onClose={() => setShowResetConfirm(false)}
        onConfirm={async () => {
          setShowResetConfirm(false);
          await onResetBudget();
        }}
      />

      <ConfirmModal
        visible={showDeleteCategoryConfirm}
        title="Delete category?"
        description={
          categoryToDelete
            ? `Delete "${categoryToDelete.name}"? This removes it locally and deletes it from Supabase.`
            : 'Delete this category?'
        }
        confirmLabel="Delete"
        onClose={() => {
          setShowDeleteCategoryConfirm(false);
          setCategoryToDelete(null);
        }}
        onConfirm={async () => {
          setShowDeleteCategoryConfirm(false);
          if (!categoryToDelete) return;
          await onDeleteCategory(categoryToDelete.id);
          setCategoryToDelete(null);
        }}
      />

      <ConfirmModal
        visible={showDeleteIncomeConfirm}
        title="Remove income source?"
        description={
          incomeToDelete
            ? `Remove "${incomeToDelete.name}"? This updates your category limits and deletes it from Supabase.`
            : 'Remove this income source?'
        }
        confirmLabel="Remove"
        onClose={() => {
          setShowDeleteIncomeConfirm(false);
          setIncomeToDelete(null);
        }}
        onConfirm={async () => {
          setShowDeleteIncomeConfirm(false);
          if (!incomeToDelete) return;
          await onDeleteIncomeSource(incomeToDelete.id);
          setIncomeToDelete(null);
        }}
      />

      <EditIncomeSourceModal
        visible={showEditIncomeModal}
        initial={{
          name: incomeToEdit?.name ?? 'Income',
          type: incomeToEdit?.type ?? 'primary',
          amount: incomeToEdit?.amount ?? 0,
          applyDeductions: incomeToEdit?.applyDeductions ?? false,
        }}
        onClose={() => {
          setShowEditIncomeModal(false);
          setIncomeToEdit(null);
        }}
        onSave={async (next) => {
          if (!incomeToEdit) return;
          await onUpdateIncomeSource(incomeToEdit.id, next);
          setShowEditIncomeModal(false);
          setIncomeToEdit(null);
        }}
      />

      <EditCategoryLimitModal
        visible={showEditLimitModal}
        categoryName={editingLimit?.name ?? 'Category'}
        currentLimit={editingLimit?.current ?? 0}
        onClose={() => {
          setShowEditLimitModal(false);
          setEditingLimit(null);
        }}
        onSave={async (nextLimit) => {
          if (!editingLimit) return;
          await onUpdateCategoryLimit(editingLimit.id, nextLimit);
          setShowEditLimitModal(false);
          setEditingLimit(null);
        }}
      />

      <AllocationExceededModal
        visible={showAllocationExceededModal}
        result={allocationExceededResult}
        onClose={onCloseAllocationExceeded}
        onConfirm={onConfirmAllocationExceeded}
      />

      <EditCycleDayModal
        visible={showEditCycleModal}
        currentDay={activeCyclePaydayDay}
        onClose={() => setShowEditCycleModal(false)}
        onSave={async (nextDay) => {
          await onUpdateCycleDay(nextDay);
          setShowEditCycleModal(false);
        }}
      />
    </>
  );
}
