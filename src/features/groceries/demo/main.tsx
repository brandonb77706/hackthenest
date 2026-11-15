import { createRoot } from "react-dom/client";
import { GroceryShopping } from "../GroceryShopping";
import { mockCatalog } from "../catalog";
import "./preview.css";

createRoot(document.getElementById("root")!).render(<GroceryShopping catalog={mockCatalog} demo />);
