"use client";

import { Show, SignInButton } from "@clerk/nextjs";
import { useState } from "react";

import { api } from "~/trpc/react";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Show when="signed-out">
        <div className="rounded-xl border p-8 text-center">
          <h1 className="text-2xl font-semibold">Neon CRUD test</h1>
          <p className="mt-2 text-neutral-500">Sign in to test the database.</p>
          <SignInButton>
            <button className="mt-6 cursor-pointer rounded-md bg-black px-4 py-2 text-sm font-medium text-white">
              Sign in
            </button>
          </SignInButton>
        </div>
      </Show>
      <Show when="signed-in">
        <CrudTest />
      </Show>
    </main>
  );
}

function CrudTest() {
  const utils = api.useUtils();
  const [value, setValue] = useState("");
  const items = api.crud.list.useQuery();

  const refresh = () => utils.crud.list.invalidate();
  const createItem = api.crud.create.useMutation({ onSuccess: refresh });
  const updateItem = api.crud.update.useMutation({ onSuccess: refresh });
  const deleteItem = api.crud.delete.useMutation({ onSuccess: refresh });

  const busy =
    createItem.isPending || updateItem.isPending || deleteItem.isPending;

  return (
    <section>
      <h1 className="text-2xl font-semibold">Neon CRUD test</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Add, rename, and delete rows in PostgreSQL.
      </p>

      <form
        className="mt-8 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!value.trim()) return;
          createItem.mutate(
            { value },
            { onSuccess: () => setValue("") },
          );
        }}
      >
        <input
          aria-label="New item"
          className="min-w-0 flex-1 rounded-md border px-3 py-2"
          onChange={(event) => setValue(event.target.value)}
          placeholder="New test row"
          value={value}
        />
        <button
          className="cursor-pointer rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={busy || !value.trim()}
          type="submit"
        >
          Add
        </button>
      </form>

      {items.isLoading && <p className="mt-6 text-sm">Loading…</p>}
      {items.error && (
        <p className="mt-6 text-sm text-red-600">{items.error.message}</p>
      )}
      {items.data?.length === 0 && (
        <p className="mt-6 text-sm text-neutral-500">No rows yet.</p>
      )}

      <ul className="mt-6 space-y-2">
        {items.data?.map((item) => (
          <li
            className="flex items-center gap-2 rounded-md border p-3"
            key={item.id}
          >
            <span className="min-w-0 flex-1 truncate">{item.value}</span>
            <button
              className="cursor-pointer rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
              disabled={busy}
              onClick={() => {
                const next = window.prompt("Rename row", item.value)?.trim();
                if (next && next !== item.value) {
                  updateItem.mutate({ id: item.id, value: next });
                }
              }}
              type="button"
            >
              Rename
            </button>
            <button
              className="cursor-pointer rounded-md border px-3 py-1.5 text-sm text-red-600 disabled:opacity-50"
              disabled={busy}
              onClick={() => deleteItem.mutate({ id: item.id })}
              type="button"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
