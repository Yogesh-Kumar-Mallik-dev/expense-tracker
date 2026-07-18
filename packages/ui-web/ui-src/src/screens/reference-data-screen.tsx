import React, { useCallback, useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "#components/ui/alert";
import { Button } from "#components/ui/button";
import { Input } from "#components/ui/input";
import { Label } from "#components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components/ui/table";
import type {
  Category,
  CategoryInput,
  ExpenseDataClient,
  Tag,
  TagInput,
} from "../api";
import { SelectField } from "./select-field";

export function ReferenceDataScreen({ api }: { api: ExpenseDataClient }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [categoryType, setCategoryType] =
    useState<CategoryInput["type"]>("EXPENSE");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [tagName, setTagName] = useState("");
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const load = useCallback(async () => {
    const [categoryResult, tagResult] = await Promise.all([
      api.categories(undefined, includeArchived),
      api.tags(),
    ]);
    setCategories(categoryResult.data);
    setTags(tagResult.data);
  }, [api, includeArchived]);
  useEffect(() => {
    void load().catch((caught) =>
      setError(
        caught instanceof Error
          ? caught.message
          : "Reference data could not be loaded.",
      ),
    );
  }, [load]);
  const saveCategory = async (event: FormEvent) => {
    event.preventDefault();
    if (pending || !categoryName.trim()) return;
    setPending(true);
    setError("");
    try {
      const value = { name: categoryName.trim(), type: categoryType };
      if (editingCategory) await api.updateCategory(editingCategory.id, value);
      else await api.createCategory(value);
      setCategoryName("");
      setEditingCategory(null);
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Category could not be saved.",
      );
    } finally {
      setPending(false);
    }
  };
  const saveTag = async (event: FormEvent) => {
    event.preventDefault();
    if (pending || !tagName.trim()) return;
    setPending(true);
    setError("");
    try {
      const value: TagInput = { name: tagName.trim(), color: null };
      if (editingTag) await api.updateTag(editingTag.id, value);
      else await api.createTag(value);
      setTagName("");
      setEditingTag(null);
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Tag could not be saved.",
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <section className="route-screen" aria-labelledby="reference-title">
      <header className="route-header">
        <div>
          <p className="eyebrow">Classification</p>
          <h1 id="reference-title">Categories and tags</h1>
          <p>
            Categories affect transaction type and budgets. Tags provide
            optional labels.
          </p>
        </div>
      </header>
      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <label className="toggle-row">
        <input
          type="checkbox"
          checked={includeArchived}
          onChange={(event) => setIncludeArchived(event.target.checked)}
        />{" "}
        Show archived categories
      </label>
      <div className="split-workflow">
        <section className="data-panel" aria-labelledby="categories-title">
          <h2 id="categories-title">Categories</h2>
          <form className="inline-form" onSubmit={saveCategory}>
            <div className="field">
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                maxLength={120}
                required
              />
            </div>
            <SelectField
              label="Type"
              value={categoryType}
              onChange={(value) =>
                setCategoryType(value as CategoryInput["type"])
              }
              options={[
                { value: "EXPENSE", label: "Expense" },
                { value: "INCOME", label: "Income" },
              ]}
            />
            <Button type="submit" disabled={pending}>
              <Plus /> {editingCategory ? "Save" : "Add category"}
            </Button>
          </form>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    {category.name}
                    {category.isArchived ? <small>Archived</small> : null}
                  </TableCell>
                  <TableCell>
                    {category.type === "EXPENSE" ? "Expense" : "Income"}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${category.name}`}
                      onClick={() => {
                        setEditingCategory(category);
                        setCategoryName(category.name);
                        setCategoryType(category.type);
                      }}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`${category.isArchived ? "Restore" : "Archive"} ${category.name}`}
                      onClick={() =>
                        void api
                          .updateCategory(category.id, {
                            isArchived: !category.isArchived,
                          })
                          .then(load)
                      }
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
        <section className="data-panel" aria-labelledby="tags-title">
          <h2 id="tags-title">Tags</h2>
          <form className="inline-form" onSubmit={saveTag}>
            <div className="field">
              <Label htmlFor="tag-name">Name</Label>
              <Input
                id="tag-name"
                value={tagName}
                onChange={(event) => setTagName(event.target.value)}
                maxLength={80}
                required
              />
            </div>
            <Button type="submit" disabled={pending}>
              <Plus /> {editingTag ? "Save" : "Add tag"}
            </Button>
          </form>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tags.map((tag) => (
                <TableRow key={tag.id}>
                  <TableCell>{tag.name}</TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${tag.name}`}
                      onClick={() => {
                        setEditingTag(tag);
                        setTagName(tag.name);
                      }}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${tag.name}`}
                      onClick={() =>
                        window.confirm(`Delete ${tag.name}?`) &&
                        void api.deleteTag(tag.id).then(load)
                      }
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      </div>
    </section>
  );
}
