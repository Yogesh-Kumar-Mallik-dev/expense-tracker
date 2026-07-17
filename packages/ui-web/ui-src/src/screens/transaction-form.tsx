import React from "react";
import { useEffect, useState, type FormEvent } from "react";
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
import type {
  Account,
  Category,
  ExpenseApi,
  Transaction,
  TransactionInput,
} from "../api";
import { SelectField } from "./select-field";

export function TransactionForm({
  open,
  transaction,
  accounts,
  categories,
  api,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  transaction: Transaction | null;
  accounts: Account[];
  categories: Category[];
  api: ExpenseApi;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const [type, setType] = useState<TransactionInput["type"]>("EXPENSE");
  const [accountId, setAccountId] = useState("");
  const [transferAccountId, setTransferAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setType(transaction?.type ?? "EXPENSE");
    setAccountId(transaction?.accountId ?? accounts[0]?.id ?? "");
    setTransferAccountId(transaction?.transferAccountId ?? "");
    setCategoryId(transaction?.categoryId ?? "");
    setAmount(transaction?.amount ?? "");
    setDescription(transaction?.description ?? "");
    setNote(transaction?.note ?? "");
    setOccurredAt(
      toLocalDateTime(transaction?.occurredAt ?? new Date().toISOString()),
    );
    setError("");
  }, [accounts, open, transaction]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    const account = accounts.find((item) => item.id === accountId);
    if (!account) return setError("Choose an account.");
    if (
      type === "TRANSFER" &&
      (!transferAccountId || transferAccountId === accountId)
    )
      return setError("Choose a different destination account.");
    if (!/^\d+(?:\.\d{1,4})?$/.test(amount) || /^0+(?:\.0+)?$/.test(amount))
      return setError(
        "Enter an amount greater than zero with up to four decimal places.",
      );
    setPending(true);
    setError("");
    const value: TransactionInput = {
      accountId,
      transferAccountId: type === "TRANSFER" ? transferAccountId : null,
      categoryId: type === "TRANSFER" ? null : categoryId || null,
      type,
      amount,
      currency: account.currency,
      description: description.trim() || null,
      note: note.trim() || null,
      occurredAt: new Date(occurredAt).toISOString(),
    };
    try {
      if (transaction) await api.updateTransaction(transaction.id, value);
      else await api.createTransaction(value);
      await onSaved();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The transaction could not be saved.",
      );
    } finally {
      setPending(false);
    }
  };

  const availableCategories = categories.filter(
    (category) => category.type === (type === "INCOME" ? "INCOME" : "EXPENSE"),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
    >
      <DialogContent className="transaction-dialog">
        <DialogHeader>
          <DialogTitle>
            {transaction ? "Edit transaction" : "Add transaction"}
          </DialogTitle>
          <DialogDescription>
            Amounts retain four-decimal precision. Transfers require two
            different accounts.
          </DialogDescription>
        </DialogHeader>
        <form
          id="transaction-form"
          className="form-grid"
          onSubmit={submit}
          aria-busy={pending}
        >
          <SelectField
            label="Type"
            value={type}
            onChange={(value) => setType(value as TransactionInput["type"])}
            required
            options={[
              { value: "EXPENSE", label: "Expense" },
              { value: "INCOME", label: "Income" },
              { value: "TRANSFER", label: "Transfer" },
            ]}
          />
          <SelectField
            label="Account"
            value={accountId}
            onChange={setAccountId}
            required
            options={accounts.map((account) => ({
              value: account.id,
              label: `${account.name} (${account.currency})`,
            }))}
          />
          {type === "TRANSFER" ? (
            <SelectField
              label="Destination account"
              value={transferAccountId}
              onChange={setTransferAccountId}
              required
              options={accounts
                .filter(
                  (account) =>
                    account.id !== accountId &&
                    account.currency ===
                      accounts.find((item) => item.id === accountId)?.currency,
                )
                .map((account) => ({
                  value: account.id,
                  label: account.name,
                }))}
            />
          ) : (
            <SelectField
              label="Category"
              value={categoryId}
              onChange={setCategoryId}
              placeholder="Uncategorized"
              options={availableCategories.map((category) => ({
                value: category.id,
                label: category.name,
              }))}
            />
          )}
          <div className="field">
            <Label htmlFor="transaction-amount">Amount</Label>
            <Input
              id="transaction-amount"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-describedby="amount-help"
              required
            />
            <small id="amount-help">
              Positive amount, up to four decimal places.
            </small>
          </div>
          <div className="field">
            <Label htmlFor="transaction-date">Date and time</Label>
            <Input
              id="transaction-date"
              type="datetime-local"
              value={occurredAt}
              onChange={(event) => setOccurredAt(event.target.value)}
              required
            />
          </div>
          <div className="field field-wide">
            <Label htmlFor="transaction-description">Description</Label>
            <Input
              id="transaction-description"
              maxLength={240}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="field field-wide">
            <Label htmlFor="transaction-note">Note</Label>
            <Input
              id="transaction-note"
              maxLength={2000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
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
            variant="outline"
            type="button"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button form="transaction-form" type="submit" disabled={pending}>
            {pending
              ? "Saving…"
              : transaction
                ? "Save changes"
                : "Add transaction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function toLocalDateTime(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
