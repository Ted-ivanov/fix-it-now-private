// DRAFT legal texts. Replace the [placeholders] with the company's details and have them
// reviewed before going live.

type Section = { heading: string; paragraphs: string[] };
type Doc = { sections: Section[] };

export const privacy: Record<"bg" | "en", Doc> = {
  bg: {
    sections: [
      {
        heading: "Кой обработва данните ви",
        paragraphs: [
          "Администратор на личните данни е [Име на фирмата], ЕИК [номер], със седалище [адрес], имейл [имейл], телефон [телефон].",
        ],
      },
      {
        heading: "Какви данни събираме и защо",
        paragraphs: [
          "Когато запазвате посещение, събираме име, телефон, имейл, адрес, описание на проблема и по желание снимки. Използваме ги само за да организираме и извършим посещението, да се свържем с вас и да ви изпратим потвърждение.",
          "Основание: предприемане на стъпки по ваше искане преди сключване на договор и изпълнение на договор (чл. 6, ал. 1, б. „б“ от ОРЗД), както и вашето съгласие.",
          "Премахваме от снимките данни за местоположение (GPS) и други метаданни веднага при качването им.",
        ],
      },
      {
        heading: "Колко дълго пазим данните",
        paragraphs: [
          "Пазим данните за резервацията до [срок, напр. 3 години] след посещението, освен ако закон не изисква по-дълъг срок (напр. счетоводни документи).",
        ],
      },
      {
        heading: "С кого споделяме данните",
        paragraphs: [
          "Данните виждат само нашите служители и екипи, които извършват посещението. Използваме доставчици на хостинг, съхранение на файлове и изпращане на имейли, с които имаме договори за обработване на данни. Данните се съхраняват в Европейския съюз.",
        ],
      },
      {
        heading: "Вашите права",
        paragraphs: [
          "Имате право на достъп, корекция, изтриване, ограничаване на обработването, преносимост и възражение, както и да оттеглите съгласието си. За целта ни пишете на [имейл].",
          "Имате право на жалба до Комисията за защита на личните данни (www.cpdp.bg).",
        ],
      },
      {
        heading: "Бисквитки",
        paragraphs: [
          "Сайтът използва само необходими бисквитки (напр. избран език). Статистиката за посещенията се събира без бисквитки и без лични данни.",
        ],
      },
    ],
  },
  en: {
    sections: [
      {
        heading: "Who processes your data",
        paragraphs: [
          "The data controller is [Company name], UIC [number], registered at [address], email [email], phone [phone].",
        ],
      },
      {
        heading: "What we collect and why",
        paragraphs: [
          "When you book a visit we collect your name, phone, email, address, a description of the problem and, optionally, photos. We use them only to arrange and carry out the visit, contact you and send you a confirmation.",
          "Legal basis: steps taken at your request before entering into a contract and performance of a contract (Art. 6(1)(b) GDPR), and your consent.",
          "Location (GPS) and other metadata are removed from photos as soon as they are uploaded.",
        ],
      },
      {
        heading: "How long we keep data",
        paragraphs: [
          "We keep booking data for [period, e.g. 3 years] after the visit, unless the law requires longer (e.g. accounting records).",
        ],
      },
      {
        heading: "Who we share data with",
        paragraphs: [
          "Only our staff and the teams carrying out the visit see your data. We use hosting, file storage and email providers under data processing agreements. Data is stored in the European Union.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "You have the right to access, correct, erase, restrict and port your data, to object, and to withdraw consent. Email us at [email].",
          "You may lodge a complaint with the Bulgarian Commission for Personal Data Protection (www.cpdp.bg).",
        ],
      },
      {
        heading: "Cookies",
        paragraphs: [
          "The site only uses necessary cookies (e.g. your chosen language). Visit statistics are collected without cookies and without personal data.",
        ],
      },
    ],
  },
};

export const terms: Record<"bg" | "en", Doc> = {
  bg: {
    sections: [
      {
        heading: "Запазване на час",
        paragraphs: [
          "Запазването на час онлайн е заявка за посещение. Можем да се свържем с вас по телефона, за да уточним детайли или да предложим друг час.",
        ],
      },
      {
        heading: "Оглед и посещение за ремонт",
        paragraphs: [
          "При „Оглед и оферта“ техник преглежда проблема и ви предлага цена. Цената на огледа се съобщава при потвърждението.",
          "При „Посещение за ремонт“ екипът идва подготвен да отстрани описания от вас проблем. Ако на място се окаже, че проблемът е различен, може да бъде начислена допълнителна такса, за която ще ви информираме преди да започнем работа.",
        ],
      },
      {
        heading: "Отказване",
        paragraphs: [
          "Можете да откажете посещение чрез линка в имейла за потвърждение или по телефона, по възможност поне [X] часа предварително.",
        ],
      },
      {
        heading: "Плащане и гаранция",
        paragraphs: ["Плащането се извършва на място след свършената работа. Гаранционни условия: [описание]."],
      },
    ],
  },
  en: {
    sections: [
      {
        heading: "Booking",
        paragraphs: [
          "An online booking is a request for a visit. We may call you to clarify details or suggest another time.",
        ],
      },
      {
        heading: "Inspection and repair visits",
        paragraphs: [
          "With “Inspection & Quote” a technician assesses the problem and gives you a price. The inspection fee is confirmed when we call you.",
          "With “Repair visit” the team comes prepared to fix the problem you described. If it turns out to be a different problem on site, an extra charge may apply; we will tell you before starting work.",
        ],
      },
      {
        heading: "Cancellation",
        paragraphs: [
          "You can cancel using the link in your confirmation email or by phone, ideally at least [X] hours in advance.",
        ],
      },
      {
        heading: "Payment and warranty",
        paragraphs: ["Payment is made on site once the work is done. Warranty terms: [description]."],
      },
    ],
  },
};
