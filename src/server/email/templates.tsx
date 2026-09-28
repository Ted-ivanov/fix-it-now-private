import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { formatPhone, site } from "@/lib/site";

type Lang = "bg" | "en";

const strings = {
  bg: {
    confirmSubject: (ref: string) => `Потвърждение на посещение ${ref} – Fix It Now`,
    confirmTitle: "Посещението е запазено",
    hello: (name: string) => `Здравейте, ${name}!`,
    confirmIntro: "Благодарим ви! Запазихме посещение със следните данни:",
    ref: "Номер",
    service: "Услуга",
    visit: "Посещение",
    when: "Кога",
    address: "Адрес",
    repairNote:
      "Избрахте посещение за ремонт. Ако на място се окаже, че проблемът е различен от описания, може да бъде начислена допълнителна такса.",
    questions: (phone: string) => `При въпроси ни се обадете на ${phone}.`,
    cancelText: "Ако няма да сте на адреса, моля, откажете посещението:",
    cancelButton: "Откажи посещението",
    cancelledSubject: (ref: string) => `Посещение ${ref} е отказано – Fix It Now`,
    cancelledBody: (when: string) => `Посещението ви на ${when} е отказано. Можете да запазите нов час по всяко време на сайта.`,
    visitTypes: { inspection: "Оглед и оферта", repair: "Посещение за ремонт" },
  },
  en: {
    confirmSubject: (ref: string) => `Visit confirmation ${ref} – Fix It Now`,
    confirmTitle: "Your visit is booked",
    hello: (name: string) => `Hello ${name},`,
    confirmIntro: "Thank you! We've booked a visit with these details:",
    ref: "Number",
    service: "Service",
    visit: "Visit",
    when: "When",
    address: "Address",
    repairNote:
      "You chose a repair visit. If the problem turns out to be different from what you described, an extra charge may apply.",
    questions: (phone: string) => `Questions? Call us on ${phone}.`,
    cancelText: "If you won't be at the address, please cancel the visit:",
    cancelButton: "Cancel the visit",
    cancelledSubject: (ref: string) => `Visit ${ref} cancelled – Fix It Now`,
    cancelledBody: (when: string) => `Your visit on ${when} has been cancelled. You can book a new time on our website at any time.`,
    visitTypes: { inspection: "Inspection & Quote", repair: "Repair visit" },
  },
} as const;

const styles = {
  body: { backgroundColor: "#f4f5f7", fontFamily: "Arial, Helvetica, sans-serif", color: "#1f2533" },
  container: { backgroundColor: "#ffffff", borderRadius: "12px", margin: "24px auto", padding: "32px", maxWidth: "560px" },
  brand: { color: "#c2410c", fontWeight: 700, fontSize: "18px", margin: 0 },
  label: { color: "#6b7280", fontSize: "13px", margin: "0" },
  value: { fontSize: "15px", margin: "0 0 12px" },
  button: { backgroundColor: "#c2410c", color: "#ffffff", borderRadius: "8px", padding: "12px 20px", fontWeight: 600 },
};

export type BookingEmailData = {
  ref: string;
  customerName: string;
  categoryName: string;
  visitType: "inspection" | "repair";
  when: string;
  address: string;
  cancelUrl: string;
};

export function BookingConfirmationEmail({ lang, data }: { lang: Lang; data: BookingEmailData }) {
  const s = strings[lang];
  const rows: [string, string][] = [
    [s.ref, data.ref],
    [s.service, data.categoryName],
    [s.visit, s.visitTypes[data.visitType]],
    [s.when, data.when],
    [s.address, data.address],
  ];
  return (
    <Html lang={lang}>
      <Head />
      <Preview>{`${s.confirmTitle}: ${data.when}`}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.brand}>Fix It Now</Text>
          <Heading as="h1" style={{ fontSize: "22px" }}>
            {s.confirmTitle}
          </Heading>
          <Text>{s.hello(data.customerName)}</Text>
          <Text>{s.confirmIntro}</Text>
          <Section>
            {rows.map(([label, value]) => (
              <div key={label}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value}>{value}</Text>
              </div>
            ))}
          </Section>
          {data.visitType === "repair" && <Text style={{ fontSize: "14px", color: "#9a3412" }}>{s.repairNote}</Text>}
          <Hr />
          <Text>{s.cancelText}</Text>
          <Button href={data.cancelUrl} style={styles.button}>
            {s.cancelButton}
          </Button>
          <Text style={{ fontSize: "14px", color: "#6b7280" }}>{s.questions(formatPhone(site.phone))}</Text>
        </Container>
      </Body>
    </Html>
  );
}

export function bookingConfirmationSubject(lang: Lang, ref: string) {
  return strings[lang].confirmSubject(ref);
}

export function BookingCancelledEmail({ lang, ref, when }: { lang: Lang; ref: string; when: string }) {
  const s = strings[lang];
  return (
    <Html lang={lang}>
      <Head />
      <Preview>{s.cancelledSubject(ref)}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.brand}>Fix It Now</Text>
          <Text>{s.cancelledBody(when)}</Text>
          <Text style={{ fontSize: "14px", color: "#6b7280" }}>{s.questions(formatPhone(site.phone))}</Text>
        </Container>
      </Body>
    </Html>
  );
}

export function bookingCancelledSubject(lang: Lang, ref: string) {
  return strings[lang].cancelledSubject(ref);
}

/** Internal notification for the office (always Bulgarian). */
export function NewBookingAdminEmail({
  data,
  phone,
  email,
  description,
  photoCount,
  adminUrl,
}: {
  data: BookingEmailData;
  phone: string;
  email: string;
  description: string;
  photoCount: number;
  adminUrl: string;
}) {
  const rows: [string, string][] = [
    ["Номер", data.ref],
    ["Услуга", data.categoryName],
    ["Посещение", strings.bg.visitTypes[data.visitType]],
    ["Кога", data.when],
    ["Клиент", data.customerName],
    ["Телефон", formatPhone(phone)],
    ["Имейл", email],
    ["Адрес", data.address],
    ["Снимки", String(photoCount)],
  ];
  return (
    <Html lang="bg">
      <Head />
      <Preview>{`Нова заявка ${data.ref}: ${data.categoryName}, ${data.when}`}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading as="h1" style={{ fontSize: "20px" }}>
            Нова заявка {data.ref}
          </Heading>
          <Section>
            {rows.map(([label, value]) => (
              <div key={label}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value}>{value}</Text>
              </div>
            ))}
            <Text style={styles.label}>Описание</Text>
            <Text style={{ ...styles.value, whiteSpace: "pre-wrap" }}>{description}</Text>
          </Section>
          <Button href={adminUrl} style={styles.button}>
            Отвори в администрацията
          </Button>
        </Container>
      </Body>
    </Html>
  );
}
