"use client";

import RevealOnScroll from "../animations/RevealOnScroll";
import Accordion from "../ui/Accordion";

const faqItems = [
  {
    question: "עם אילו חברות ביטוח ובתי השקעות Re-PORT עובד?",
    answer:
      "Re-PORT תומך בכל חברות הביטוח ובתי ההשקעות המובילים בישראל, כולל מגדל, הראל, כלל, הפניקס, מנורה, AIG, אלטשולר שחם, IBI, מיטב ועוד. אנחנו מוסיפים חברות חדשות באופן שוטף.",
  },
  {
    question: "האם הנתונים שלי מאובטחים?",
    answer:
      "בהחלט. פרטי ההתחברות שלכם מוצפנים ונשמרים בצורה מאובטחת. החיבור לחברות הביטוח מתבצע בפרוטוקולים מאובטחים, ואנחנו לא שומרים דוחות או נתוני לקוחות בשרתים שלנו.",
  },
  {
    question: "כמה זמן לוקח להוריד דוחות ללקוח אחד?",
    answer:
      "בממוצע, ההורדה האוטומטית לוקחת כ-1-2 דקות ללקוח — במקום 10-15 דקות של עבודה ידנית. עבור לקוח עם מוצרים בחברות רבות, החיסכון אפילו גדול יותר.",
  },
  {
    question: "האם צריך להתקין תוכנה?",
    answer:
      "Re-PORT עובד כמערכת מבוססת דפדפן — אין צורך להתקין תוכנה על המחשב. פשוט מתחברים ומתחילים לעבוד. יש גם אפליקציית מובייל נלווית להעברת קודי OTP אוטומטית (תוסף בתשלום).",
  },
  {
    question: "מה קורה עם קודי OTP?",
    answer:
      "יש שתי אפשרויות: הזנה ידנית של קודי OTP שמגיעים לטלפון, או שימוש באפליקציית המובייל שלנו שמעבירה את הקודים אוטומטית ישירות למערכת (נמכרת כתוסף בתשלום).",
  },
  {
    question: "האם יש התחייבות או מנוי חודשי?",
    answer:
      'אין שום התחייבות ואין מנוי חודשי. אתם קונים בנקים של מספרי ת"ז ומשתמשים בהם מתי שנוח לכם. תשלום פשוט לפי שימוש.',
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="py-20 sm:py-28 bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <RevealOnScroll>
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-950 mb-4">
              שאלות נפוצות
            </h2>
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay={0.2}>
          <Accordion items={faqItems} />
        </RevealOnScroll>
      </div>
    </section>
  );
}
