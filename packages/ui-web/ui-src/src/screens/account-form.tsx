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
import type { Account, AccountInput, ExpenseDataClient } from "../api";
import { SelectField } from "./select-field";

export function AccountForm({
  account,
  open,
  api,
  defaultCurrency,
  onOpenChange,
  onSaved,
}: {
  account: Account | null;
  open: boolean;
  api: ExpenseDataClient;
  defaultCurrency: string;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountInput["type"]>("CHECKING");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [openingBalance, setOpeningBalance] = useState("0");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    setName(account?.name ?? "");
    setType(account?.type ?? "CHECKING");
    setCurrency(account?.currency ?? defaultCurrency);
    setOpeningBalance(account?.openingBalance ?? "0");
    setError("");
  }, [account, defaultCurrency, open]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    if (!name.trim()) return setError("Enter an account name.");
    if (!/^[A-Za-z]{3}$/.test(currency))
      return setError("Currency must be a three-letter code.");
    if (!/^-?\d+(?:\.\d{1,4})?$/.test(openingBalance))
      return setError("Opening balance must have at most four decimal places.");
    setPending(true);
    setError("");
    const value: AccountInput = {
      name: name.trim(),
      type,
      currency: currency.toUpperCase(),
      openingBalance,
    };
    try {
      if (account) await api.updateAccount(account.id, value);
      else await api.createAccount(value);
      await onSaved();
      onOpenChange(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Account could not be saved.",
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {account ? "Edit account" : "Create account"}
          </DialogTitle>
          <DialogDescription>
            Transactions use this account’s currency. Changing currency later
            may be restricted when transactions exist.
          </DialogDescription>
        </DialogHeader>
        <form
          id="account-form"
          className="form-grid"
          onSubmit={submit}
          aria-busy={pending}
        >
          <div className="field field-wide">
            <Label htmlFor="account-name">Name</Label>
            <Input
              id="account-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              autoFocus
              required
            />
          </div>
          <SelectField
            label="Type"
            value={type}
            onChange={(value) => setType(value as AccountInput["type"])}
            options={[
              { value: "CASH", label: "Cash" },
              { value: "CHECKING", label: "Checking" },
              { value: "SAVINGS", label: "Savings" },
              { value: "CREDIT_CARD", label: "Credit card" },
              { value: "WALLET", label: "Wallet" },
              { value: "OTHER", label: "Other" },
            ]}
          />
          <div className="field">
            <Label htmlFor="account-currency">Currency</Label>
            <Input
              id="account-currency"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              minLength={3}
              maxLength={3}
              required
            />
          </div>
          <div className="field field-wide">
            <Label htmlFor="opening-balance">Opening balance</Label>
            <Input
              id="opening-balance"
              inputMode="decimal"
              value={openingBalance}
              onChange={(event) => setOpeningBalance(event.target.value)}
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
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button form="account-form" type="submit" disabled={pending}>
            {pending ? "Saving…" : account ? "Save changes" : "Create account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
