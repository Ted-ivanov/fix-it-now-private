import { notFound } from "next/navigation";

// Unknown URLs under a locale show the translated not-found page.
export default function CatchAll() {
  notFound();
}
