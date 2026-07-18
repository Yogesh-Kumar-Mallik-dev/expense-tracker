import React, { useEffect, useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "#components/ui/alert";
import { Button } from "#components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#components/ui/dialog";
import { Input } from "#components/ui/input";
import { Label } from "#components/ui/label";
import type { Budget, Category, ExpenseDataClient } from "../api";
import { SelectField } from "./select-field";

export function BudgetManage({
  budget,
  categories,
  api,
  open,
  onOpenChange,
  onChanged,
}: {
  budget: Budget | null;
  categories: Category[];
  api: ExpenseDataClient;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => Promise<void>;
}) {
  const [assigned, setAssigned] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [fromCategoryId, setFromCategoryId] = useState("");
  const [toCategoryId, setToCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [targetName, setTargetName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  useEffect(() => {
    if (!budget || !open) return;
    void api
      .budgetCategories(budget.id)
      .then((result) => {
        const ids = result.data.map((item) => item.categoryId);
        setAssigned(ids);
        setCategoryId(ids[0] ?? "");
      })
      .catch((caught) =>
        setError(
          caught instanceof Error
            ? caught.message
            : "Assignments could not be loaded.",
        ),
      );
    setTargetName(
      `${budget.name} (${budget.mode === "ENVELOPE" ? "Limit" : "Envelope"})`,
    );
    setTargetAmount(budget.amount);
  }, [api, budget, open]);
  if (!budget) return null;
  const toggle = async (id: string, checked: boolean) => {
    setPending(true);
    setError("");
    try {
      if (checked) await api.assignBudgetCategory(budget.id, id);
      else await api.removeBudgetCategory(budget.id, id);
      setAssigned((current) =>
        checked ? [...current, id] : current.filter((value) => value !== id),
      );
      await onChanged();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Assignment could not be changed.",
      );
    } finally {
      setPending(false);
    }
  };
  const allocate = async (event: FormEvent) => {
    event.preventDefault();
    if (pending || !categoryId) return;
    setPending(true);
    setError("");
    try {
      await api.allocateEnvelope(budget.id, {
        categoryId,
        amount,
        occurredAt: new Date().toISOString().slice(0, 10),
        note: null,
      });
      setAmount("");
      await onChanged();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Allocation could not be recorded.",
      );
    } finally {
      setPending(false);
    }
  };
  const transfer = async (event: FormEvent) => {
    event.preventDefault();
    if (pending || fromCategoryId === toCategoryId)
      return setError("Choose different source and destination categories.");
    setPending(true);
    setError("");
    try {
      await api.transferEnvelope(budget.id, {
        fromCategoryId: fromCategoryId || null,
        toCategoryId: toCategoryId || null,
        amount,
        occurredAt: new Date().toISOString().slice(0, 10),
        note: null,
      });
      setAmount("");
      await onChanged();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Transfer could not be recorded.",
      );
    } finally {
      setPending(false);
    }
  };
  const assignedOptions = categories
    .filter((category) => assigned.includes(category.id))
    .map((category) => ({ value: category.id, label: category.name }));
  const convert = async () => {
    if (!window.confirm(`Create ${targetName} and archive ${budget.name}?`))
      return;
    setPending(true);
    setError("");
    try {
      await api.convertBudget(budget.id, {
        targetName,
        targetAmount,
        targetRolloverPolicy: budget.rolloverPolicy,
        expectedSourceUpdatedAt: budget.updatedAt,
      });
      await onChanged();
      onOpenChange(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Budget could not be converted.",
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="transaction-dialog">
        <DialogHeader>
          <DialogTitle>Manage {budget.name}</DialogTitle>
          <DialogDescription>
            Assign expense categories. Envelope budgets can then receive
            allocations and category transfers.
          </DialogDescription>
        </DialogHeader>
        <section>
          <h3>Categories</h3>
          <div className="checkbox-list">
            {categories
              .filter((category) => category.type === "EXPENSE")
              .map((category) => (
                <label key={category.id}>
                  <input
                    type="checkbox"
                    checked={assigned.includes(category.id)}
                    disabled={pending}
                    onChange={(event) =>
                      void toggle(category.id, event.target.checked)
                    }
                  />
                  {category.name}
                </label>
              ))}
          </div>
        </section>
        {budget.mode === "ENVELOPE" ? (
          <div className="split-workflow">
            <form className="form-stack" onSubmit={allocate}>
              <h3>Allocate money</h3>
              <SelectField
                label="Category"
                value={categoryId}
                onChange={setCategoryId}
                options={assignedOptions}
                required
              />
              <div className="field">
                <Label htmlFor="allocation-amount">Amount</Label>
                <Input
                  id="allocation-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={pending || !assignedOptions.length}
              >
                Allocate
              </Button>
            </form>
            <form className="form-stack" onSubmit={transfer}>
              <h3>Move money</h3>
              <SelectField
                label="From"
                value={fromCategoryId}
                onChange={setFromCategoryId}
                placeholder="Ready to assign"
                options={assignedOptions}
              />
              <SelectField
                label="To"
                value={toCategoryId}
                onChange={setToCategoryId}
                placeholder="Ready to assign"
                options={assignedOptions}
              />
              <div className="field">
                <Label htmlFor="transfer-amount">Amount</Label>
                <Input
                  id="transfer-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={pending || !assignedOptions.length}
              >
                Move money
              </Button>
            </form>
          </div>
        ) : null}
        <section className="settings-action">
          <div>
            <h3>Convert budget mode</h3>
            <p>
              Creates a replacement in the other mode, copies category
              assignments, and archives this budget in one server transaction.
            </p>
          </div>
          <div className="form-stack">
            <div className="field">
              <Label htmlFor="conversion-name">Replacement name</Label>
              <Input
                id="conversion-name"
                value={targetName}
                onChange={(event) => setTargetName(event.target.value)}
              />
            </div>
            <div className="field">
              <Label htmlFor="conversion-amount">Replacement amount</Label>
              <Input
                id="conversion-amount"
                inputMode="decimal"
                value={targetAmount}
                onChange={(event) => setTargetAmount(event.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={pending || !targetName || !targetAmount}
              onClick={() => void convert()}
            >
              Convert to{" "}
              {budget.mode === "ENVELOPE" ? "spending limit" : "envelope"}
            </Button>
          </div>
        </section>
        {error ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
