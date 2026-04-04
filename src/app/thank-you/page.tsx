import Button from "@/components/ui/Button";

export default function ThankYou() {
  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-turquoise-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="text-3xl font-extrabold text-white mb-4">תודה רבה!</h1>

        <p className="text-gray-300 text-lg mb-8">
          קיבלנו את הפרטים שלכם ונחזור אליכם בהקדם. אם ה-WhatsApp לא נפתח, תוכלו ליצור קשר ישירות:
        </p>

        <div className="space-y-4">
          <Button href="https://wa.me/972537037531" size="lg" className="w-full">
            פתחו WhatsApp
          </Button>
          <Button href="/" variant="outline" size="md" className="w-full">
            חזרה לדף הבית
          </Button>
        </div>
      </div>
    </div>
  );
}
