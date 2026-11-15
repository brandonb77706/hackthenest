"use client";

import { useEffect, useRef, useState } from "react";
import { ReadAloudButton } from "@/components/ReadAloudButton";
import { Icon } from "@/components/bridge/Icon";
import { br } from "@/components/bridge/styles";
import { liveCatalog, type GroceryCatalog, type Product, type Store } from "./catalog";

const help = "Excuse me, could you help me find this item?";
export function GroceryShopping({ catalog = liveCatalog, demo = false }: { catalog?: GroceryCatalog; demo?: boolean }) {
  const [stores, setStores] = useState<Store[]>([]);
  const [zip, setZip] = useState("");
  const [locationId, setLocationId] = useState("");
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [items, setItems] = useState<Product[]>([]);
  const [collected, setCollected] = useState<Set<string>>(() => new Set());
  const [listOpen, setListOpen] = useState(false);
  const [status, setStatus] = useState("Enter your ZIP code to find a store.");
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    const currentGeneration = generation;
    return () => { currentGeneration.current++; };
  }, [catalog]);
  async function findStores(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{5}$/.test(zip)) { setStatus("Enter a 5-digit ZIP code."); return; }
    const request = ++generation.current;
    setBusy(true); setLocationId(""); setStores([]); setResults([]); setItems([]); setCollected(new Set()); setStatus("Finding stores…");
    try {
      const found = await catalog.stores(zip);
      if (request !== generation.current) return;
      setStores(found); setStatus(found.length ? "Choose a store." : "No stores found near that ZIP code.");
    } catch { if (request === generation.current) setStatus("Stores could not be loaded. Try again."); }
    finally { if (request === generation.current) setBusy(false); }
  }
  async function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!locationId || !term.trim()) { setStatus("Choose a store and enter an item."); return; }
    const request = ++generation.current;
    setBusy(true); setResults([]); setStatus("Searching…");
    try {
      const products = await catalog.search(locationId, term.trim());
      if (request !== generation.current) return;
      setResults(products); setStatus(products.length ? `${products.length} products found.` : "No products found. Try another item.");
    } catch { if (request === generation.current) setStatus("Search is unavailable. Please try again."); }
    finally { if (request === generation.current) setBusy(false); }
  }
  function changeStore(id: string) {
    generation.current++; setLocationId(id); setResults([]); setItems([]); setCollected(new Set()); setBusy(false);
    setStatus(id ? "Store selected. Search for an item." : "Choose a store to start.");
  }
  return <main className="br-root mx-auto min-h-dvh w-full max-w-[480px] bg-canvas px-4 pb-10 pt-5 text-[18px] text-ink">
    <div className="mb-5 flex items-center gap-3">
      <a href="/routines/new" aria-label="Back to make a routine" className={`${br.ghost} flex size-12 shrink-0 items-center justify-center rounded-[14px] no-underline`}><Icon name="back" size={24} /></a>
      <h1 className={br.h1}>Grocery shopping</h1>
    </div>
    <p className="mb-5 text-ink2">{demo ? "Sample data only: these stores, products, availability and aisles are not real." : "Find a Kroger store near you."} Your list stays on this page.</p>
    <button type="button" className={`${br.ghost} flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-4 text-[18px]`} aria-expanded={listOpen} aria-controls="grocery-list" onClick={() => setListOpen((open) => !open)}>
      <Icon name="list" size={22} /> {listOpen ? "Hide shopping list" : "View shopping list"} ({items.length} {items.length === 1 ? "item" : "items"})
    </button>
    <section id="grocery-list" aria-labelledby="list-heading" hidden={!listOpen} className="mt-5">
      <h2 id="list-heading" className={br.h2}>Your shopping list</h2>
      {items.length === 0 ? <p className="text-ink2">No items yet.</p> : <div className="mt-3 overflow-x-auto rounded-[20px] border-2 border-line bg-surface shadow-[0_4px_0_var(--br-line)]" tabIndex={0} role="region" aria-label="Shopping list table">
        <table className="w-full min-w-[300px] border-collapse text-left text-[18px]">
          <caption className="sr-only">Shopping list with product availability and aisle</caption>
          <thead className="bg-primary-soft text-ink"><tr><th scope="col" className="px-4 py-3 font-display">Item</th><th scope="col" className="px-4 py-3 font-display">Aisle</th></tr></thead>
          <tbody>{items.map((product) => <tr key={product.id} className="border-t-2 border-line align-top">
            <th scope="row" className="px-4 py-4 text-left font-normal">
              <span className="font-display font-bold">{product.name}</span>
              <label className="mt-2 flex min-h-12 cursor-pointer items-center gap-3 text-ink">
                <input type="checkbox" className="size-6 shrink-0 accent-[var(--br-primary-text)]" checked={collected.has(product.id)} onChange={(event) => {
                  const checked = event.target.checked;
                  setCollected((current) => { const next = new Set(current); if (checked) next.add(product.id); else next.delete(product.id); return next; });
                }} />
                <span>Got it<span className="sr-only">: {product.name}</span></span>
              </label>
              <span className="mt-1 block text-ink2">{availabilityLabel(product)}</span>
              {(product.availability !== "available" || !product.aisle) && <div className="mt-3 rounded-[14px] bg-sunken p-3"><p className="mt-0">{help}</p><ReadAloudButton text={help} label={`Read help phrase for ${product.name}`} /></div>}
              <button className={`${br.ghost} mt-3 min-h-12 rounded-[14px] px-4 text-[17px]`} type="button" onClick={() => { setItems((current) => current.filter((item) => item.id !== product.id)); setCollected((current) => { const next = new Set(current); next.delete(product.id); return next; }); setStatus(`${product.name} removed from your list.`); }}>Remove {product.name}</button>
            </th>
            <td className="px-4 py-4 text-ink2">{product.aisle || "Aisle unavailable"}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    </section>
    <div className="mt-6 flex flex-col gap-5 rounded-[20px] border-2 border-line bg-surface p-4 shadow-[0_4px_0_var(--br-line)]">
    <form onSubmit={findStores} className="flex flex-col gap-2"><label htmlFor="grocery-zip" className="font-display text-[18px] font-semibold">ZIP code</label>
      <input id="grocery-zip" className={br.input} inputMode="numeric" autoComplete="postal-code" maxLength={5} value={zip} onChange={(e) => setZip(e.target.value)} />
      <button className={`${br.ghost} mt-1 min-h-12 rounded-[14px] px-4 text-[17px]`} type="submit" disabled={busy}>Find stores</button></form>
    <div className="flex flex-col gap-2"><label className="font-display text-[18px] font-semibold" htmlFor="grocery-store">Choose a store</label>
      <select id="grocery-store" className={br.input} value={locationId} onChange={(e) => changeStore(e.target.value)}>
        <option value="">Choose a store</option>{stores.map((store) => <option key={store.locationId} value={store.locationId}>{store.name}</option>)}
      </select><p className="m-0 text-[16px] text-ink2">Changing stores clears this list.</p></div>
    <form onSubmit={search} className="flex flex-col gap-2"><label className="font-display text-[18px] font-semibold" htmlFor="grocery-search">Find an item</label>
      <input id="grocery-search" className={br.input} value={term} onChange={(e) => setTerm(e.target.value)} />
      <button className={`${br.cta} mt-1 min-h-14 rounded-2xl px-4 text-[18px]`} disabled={busy || !locationId} type="submit">Search products</button></form>
    </div>
    <p role="status" aria-live="polite" className="my-5 text-ink2">{status}</p>
    {results.length > 0 && <section aria-labelledby="results-heading"><h2 id="results-heading" className={br.h2}>Search results</h2><ul className="m-0 mt-3 flex list-none flex-col gap-3 p-0">{results.map((product) => <li className="rounded-[20px] border-2 border-line bg-surface p-4 shadow-[0_4px_0_var(--br-line)]" key={product.id}>
      <p className="m-0 font-display text-[20px] font-bold">{product.name}</p><ProductDetails product={product} />
      <button className={`${br.ghost} mt-3 min-h-12 rounded-[14px] px-4 text-[17px]`} type="button" disabled={items.some((item) => item.id === product.id)} onClick={() => { setItems((current) => [...current, product]); setStatus(`${product.name} added to your list.`); }}>Add {product.name}</button>
    </li>)}</ul></section>}
  </main>;
}
function ProductDetails({ product }: { product: Product }) {
  const needsHelp = product.availability !== "available" || !product.aisle;
  return <><p className="mb-1 mt-2 text-ink2">{availabilityLabel(product)}</p>
    <p className="my-1 text-ink2">{product.aisle ? `Aisle: ${product.aisle}` : "Aisle unavailable"}</p>
    {needsHelp && <div className="mt-3 rounded-[14px] bg-sunken p-3"><p className="mt-0">{help}</p><ReadAloudButton text={help} label={`Read help phrase for ${product.name}`} /></div>}</>;
}
function availabilityLabel(product: Product): string {
  return product.availability === "available" ? "Available" : product.availability === "unavailable" ? "Unavailable" : "Availability unknown";
}
