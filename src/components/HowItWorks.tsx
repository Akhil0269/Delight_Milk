import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { ClipboardList, CalendarCheck, Receipt, Wallet } from "lucide-react";

const steps = [
  {
    icon: ClipboardList,
    title: "Subscribe",
    description: "Choose your daily products - milk, curd, butter, paneer. Set your preferred quantity and delivery time.",
    color: "bg-primary",
  },
  {
    icon: CalendarCheck,
    title: "Track on Calendar",
    description: "Every delivery is marked on your personal calendar. Green for delivered, red for missed. Full transparency.",
    color: "bg-accent",
  },
  {
    icon: Receipt,
    title: "Monthly Bill",
    description: "At month-end, your bill is auto-generated from calendar data. Pay only for delivered days.",
    color: "bg-warning",
  },
  {
    icon: Wallet,
    title: "Easy Payment",
    description: "Wallet-based payments. Auto-deduct from balance or pay manually. Download receipts anytime.",
    color: "bg-primary",
  },
];

const HowItWorks = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="how-it-works" className="py-24 bg-background" ref={ref}>
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            How It Works
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Simple. Transparent. Trustworthy.
          </h2>
          <p className="text-lg text-muted-foreground">
            Our calendar-based system ensures you only pay for what's delivered. No hidden charges, ever.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="relative group"
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-border to-transparent" />
              )}

              <motion.div
                whileHover={{ y: -5 }}
                className="bg-card rounded-2xl p-6 border border-border shadow-soft card-hover h-full"
              >
                {/* Step Number */}
                <div className="flex items-center gap-4 mb-4">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className={`w-14 h-14 rounded-2xl ${step.color} flex items-center justify-center text-white shadow-lg`}
                  >
                    <step.icon className="w-7 h-7" />
                  </motion.div>
                  <span className="text-4xl font-bold text-muted-foreground/30">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Trust Indicator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent/10 border border-accent/20">
            <CalendarCheck className="w-5 h-5 text-accent" />
            <span className="font-medium text-accent">Calendar = Bill = Trust</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
