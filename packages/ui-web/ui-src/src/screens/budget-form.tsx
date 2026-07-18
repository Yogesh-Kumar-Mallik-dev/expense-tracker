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
import type { Budget, BudgetInput, ExpenseDataClient } from "../api";
import { SelectField } from "./select-field";

export function BudgetForm({
  budget,
  open,
  api,
  currency,
  period,
  onOpenChange,
  onSaved,
}: {
  budget: Budget | null;
  open: boolean;
  api: ExpenseDataClient;
  currency: string;
  period: { from: string; to: string };
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const [value, setValue] = useState<BudgetInput>({
    name: "",
    amount: "",
    currency,
    startsOn: period.from,
    endsOn: period.to,
    mode: "SPENDING_LIMIT",
    rolloverPolicy: "NONE",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    setValue(
      budget
        ? {
            name: budget.name,
            amount: budget.amount,
            currency: budget.currency,
            startsOn: budget.startsOn,
            endsOn: budget.endsOn,
            mode: budget.mode,
            rolloverPolicy: budget.rolloverPolicy,
          }
        : {
            name: "",
            amount: "",
            currency,
            startsOn: period.from,
            endsOn: period.to,
            mode: "SPENDING_LIMIT",
            rolloverPolicy: "NONE",
          },
    );
    setError("");
  }, [budget, currency, open, period.from, period.to]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    if (!value.name.trim()) return setError("Enter a budget name.");
    if (!/^\d+(?:\.\d{1,4})?$/.test(value.amount))
      return setError("Enter an amount with up to four decimal places.");
    if (value.endsOn < value.startsOn)
      return setError("End date must not precede start date.");
    setPending(true);
    setError("");
    try {
      if (budget) await api.updateBudget(budget.id, value);
      else await api.createBudget(value);
      await onSaved();
      onOpenChange(false);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Budget could not be saved.",
      );
    } finally {
      setPending(false);
    }
  };
  const set = <K extends keyof BudgetInput>(key: K, next: BudgetInput[K]) =>
    setValue((current) => ({ ...current, [key]: next }));
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{budget ? "Edit budget" : "Create budget"}</DialogTitle>
          <DialogDescription>
            Choose a spending limit for warnings or an envelope budget for
            active allocation.
          </DialogDescription>
        </DialogHeader>
        <form
          id="budget-form"
          className="form-grid"
          onSubmit={submit}
          aria-busy={pending}
        >
          <div className="field field-wide">
            <Label htmlFor="budget-name">Name</Label>
            <Input
              id="budget-name"
              value={value.name}
              onChange={(event) => set("name", event.target.value)}
              required
            />
          </div>
          <SelectField
            label="Mode"
            value={value.mode}
            onChange={(next) => set("mode", next as BudgetInput["mode"])}
            options={[
              { value: "SPENDING_LIMIT", label: "Spending limit" },
              { value: "ENVELOPE", label: "Envelope / zero-based" },
            ]}
          />
          <SelectField
            label="Rollover"
            value={value.rolloverPolicy}
            onChange={(next) =>
              set("rolloverPolicy", next as BudgetInput["rolloverPolicy"])
            }
            options={[
              { value: "NONE", label: "None" },
              { value: "POSITIVE_ONLY", label: "Positive only" },
              { value: "FULL", label: "Full" },
            ]}
          />
          <div className="field">
            <Label htmlFor="budget-amount">
              {value.mode === "ENVELOPE" ? "Initial target" : "Limit"}
            </Label>
            <Input
              id="budget-amount"
              inputMode="decimal"
              value={value.amount}
              onChange={(event) => set("amount", event.target.value)}
              required
            />
          </div>
          <div className="field">
            <Label htmlFor="budget-currency">Currency</Label>
            <Input
              id="budget-currency"
              value={value.currency}
              onChange={(event) =>
                set("currency", event.target.value.toUpperCase())
              }
              maxLength={3}
              required
            />
          </div>
          <div className="field">
            <Label htmlFor="budget-start">Starts</Label>
            <Input
              id="budget-start"
              type="date"
              value={value.startsOn}
              onChange={(event) => set("startsOn", event.target.value)}
              required
            />
          </div>
          <div className="field">
            <Label htmlFor="budget-end">Ends</Label>
            <Input
              id="budget-end"
              type="date"
              value={value.endsOn}
              onChange={(event) => set("endsOn", event.target.value)}
              required
            />
          </div>
          {error ? (
            <Alert className="field-wide" variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </form>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button form="budget-form" type="submit" disabled={pending}>
            {pending ? "Saving…" : budget ? "Save changes" : "Create budget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
