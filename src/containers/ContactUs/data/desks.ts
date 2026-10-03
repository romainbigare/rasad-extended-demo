export interface ContactDesk {
  id: string;
  name: { en: string; ar: string };
  address: { en: string; ar: string };
  phone: string;
  email: string;
}

export const CONTACT_DESKS: readonly ContactDesk[] = [
  {
    id: "hq",
    name: { en: "Headquarters · Abu Dhabi", ar: "المقر الرئيسي · أبوظبي" },
    address: { en: "Mohammed Bin Zayed City, Sector Z12", ar: "مدينة محمد بن زايد، القطاع Z12" },
    phone: "+971 2 816 5000",
    email: "info@adafsa.gov.ae",
  },
  {
    id: "al-ain",
    name: { en: "Al Ain Agricultural Hub", ar: "مركز العين الزراعي" },
    address: { en: "Al Ain Oasis Central Support Office", ar: "مكتب الدعم المركزي بواحة العين" },
    phone: "+971 3 711 2000",
    email: "alain.agri@adafsa.gov.ae",
  },
  {
    id: "al-dhafra",
    name: { en: "Al Dhafra Regional Office", ar: "المكتب الإقليمي للظفرة" },
    address: { en: "Madinat Zayed Government Complex", ar: "مجمع مدينة زايد الحكومي" },
    phone: "+971 2 884 1000",
    email: "dhafra.support@adafsa.gov.ae",
  },
];
