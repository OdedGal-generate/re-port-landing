"use client";

import { motion } from "framer-motion";
import Button from "../ui/Button";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-navy-950">
      {/* Background gradient */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-bl from-navy-800 via-navy-950 to-navy-950" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-turquoise-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-electric-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-32">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Text content */}
          <div className="min-w-0">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block bg-turquoise-500/10 border border-turquoise-500/30 text-turquoise-400 text-sm font-semibold px-4 py-2 rounded-full mb-6">
                Insurtech Gateway
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6"
            >
              כל הדוחות.
              <br />
              כל החברות.
              <br />
              <span className="text-gradient">קליק אחד.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-lg sm:text-xl text-gray-300 mb-8 max-w-lg leading-relaxed"
            >
              Re-PORT מוריד אוטומטית דוחות שנתיים ואישורי מס מכל חברות הביטוח
              ובתי ההשקעות — ישירות למחשב שלכם.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="flex flex-wrap gap-4"
            >
              <Button href="#contact" size="lg">
                התחילו לחסוך זמן
              </Button>
              <Button href="#how-it-works" variant="outline" size="lg">
                איך זה עובד?
              </Button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="text-gray-500 text-sm mt-6"
            >
              ללא התחייבות. ללא מנוי חודשי. שלמו רק על מה שאתם צריכים.
            </motion.p>
          </div>

          {/* Dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex items-center justify-center min-w-0 overflow-hidden px-4 lg:px-0"
          >
            <motion.div
              animate={{ y: [-6, 6, -6] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="w-full"
            >
              {/* Browser-like window frame */}
              <div className="bg-navy-800/80 backdrop-blur-xl border border-white/15 rounded-2xl overflow-hidden shadow-2xl shadow-turquoise-500/10 max-w-[420px]">
                {/* Title bar */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="text-gray-400 text-xs font-medium">Re-PORT Dashboard</div>
                  <div className="w-14" />
                </div>

                {/* Dashboard content */}
                <div className="p-4">
                  {/* Search bar */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex-1 bg-white/10 border border-white/15 rounded-xl px-4 py-2.5 flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span className="text-gray-400 text-sm">301456789 :ת&quot;ז</span>
                    </div>
                    <div className="bg-turquoise-500 text-navy-950 text-sm font-bold px-4 py-2.5 rounded-xl">
                      הורד הכל
                    </div>
                  </div>

                  {/* Company rows */}
                  <div className="space-y-3">
                    {/* Row 1 - Completed */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8, duration: 0.5 }}
                      className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5"
                    >
                      <img src="/images/companies/migdal.png" alt="מגדל" className="h-6 w-8 object-contain brightness-0 invert" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-white text-xs font-medium">מגדל — דוח שנתי + אישור מס</span>
                          <span className="text-turquoise-400 text-xs">הושלם</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ delay: 1.2, duration: 1.5, ease: "easeOut" }}
                            className="h-full bg-turquoise-500 rounded-full"
                          />
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-turquoise-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.div>

                    {/* Row 2 - Completed */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.1, duration: 0.5 }}
                      className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5"
                    >
                      <img src="/images/companies/harel.png" alt="הראל" className="h-6 w-8 object-contain brightness-0 invert" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-white text-xs font-medium">הראל — קרן השתלמות</span>
                          <span className="text-turquoise-400 text-xs">הושלם</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ delay: 1.8, duration: 1.2, ease: "easeOut" }}
                            className="h-full bg-turquoise-500 rounded-full"
                          />
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-turquoise-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.div>

                    {/* Row 3 - In progress */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.4, duration: 0.5 }}
                      className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5"
                    >
                      <img src="/images/companies/phoenix.png" alt="פניקס" className="h-6 w-8 object-contain brightness-0 invert" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-white text-xs font-medium">הפניקס — ביטוח משכנתא</span>
                          <span className="text-electric-400 text-xs">מוריד...</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: "72%" }}
                            transition={{ delay: 2.2, duration: 2, ease: "easeOut" }}
                            className="h-full bg-electric-400 rounded-full"
                          />
                        </div>
                      </div>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <svg className="w-5 h-5 text-electric-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </motion.div>
                    </motion.div>

                    {/* Row 4 - Waiting */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.7, duration: 0.5 }}
                      className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5"
                    >
                      <img src="/images/companies/clal.png" alt="כלל" className="h-6 w-8 object-contain brightness-0 invert" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-white text-xs font-medium">כלל — פנסיה + ביטוח מנהלים</span>
                          <span className="text-gray-500 text-xs">ממתין</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full" />
                      </div>
                      <svg className="w-5 h-5 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </motion.div>

                    {/* Row 5 - Waiting */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 2.0, duration: 0.5 }}
                      className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5"
                    >
                      <img src="/images/companies/altshuler-shaham.png" alt="אלטשולר שחם" className="h-6 w-8 object-contain brightness-0 invert" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-white text-xs font-medium">אלטשולר שחם — קופת גמל</span>
                          <span className="text-gray-500 text-xs">ממתין</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full" />
                      </div>
                      <svg className="w-5 h-5 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </motion.div>
                  </div>

                  {/* Status bar */}
                  <div className="mt-4 flex items-center justify-between text-xs">
                    <span className="text-gray-500">5 חברות נבחרו</span>
                    <span className="text-turquoise-400 font-medium">2/5 הושלמו</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
