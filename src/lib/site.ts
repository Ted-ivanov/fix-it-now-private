// Business details shown on the site. Set them in .env.local (see .env.example).
export const site = {
  name: "Fix It Now",
  url: process.env.SITE_URL ?? "http://localhost:3000",
  phone: process.env.NEXT_PUBLIC_PHONE ?? "+359888123456",
  viber: process.env.NEXT_PUBLIC_VIBER ?? process.env.NEXT_PUBLIC_PHONE ?? "",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? process.env.NEXT_PUBLIC_PHONE ?? "",
  email: process.env.NEXT_PUBLIC_EMAIL ?? "office@example.com",
  showVariants: process.env.NEXT_PUBLIC_SHOW_VARIANTS === "true",
};

/** "+359888123456" → "0888 123 456" (how Bulgarians write local numbers). */
export function formatPhone(phone: string) {
  const national = phone.replace(/^\+359/, "0").replace(/\D/g, "");
  return national.replace(/^(0\d{3})(\d{3})(\d+)$/, "$1 $2 $3");
}

export const viberLink = (phone: string) => `viber://chat?number=${encodeURIComponent(phone)}`;
export const whatsappLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "")}`;
