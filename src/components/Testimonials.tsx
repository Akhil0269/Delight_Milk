import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Priya Sharma",
    location: "Mumbai",
    image: "👩‍💼",
    rating: 5,
    text: "The calendar tracking feature is brilliant! I can see exactly which days milk was delivered. No more confusion about billing. Highly recommend!",
    highlight: "calendar tracking",
  },
  {
    name: "Rajesh Kumar",
    location: "Delhi",
    image: "👨‍🔬",
    rating: 5,
    text: "Finally, a milk delivery service that's transparent. I only pay for what I receive. The monthly receipt shows every delivery. Love it!",
    highlight: "transparent billing",
  },
  {
    name: "Lakshmi Devi",
    location: "Bangalore",
    image: "👵",
    rating: 5,
    text: "Even at my age, I find this app so easy to use. Large buttons, clear icons, and I can pause delivery with one tap when I'm traveling.",
    highlight: "easy to use",
  },
  {
    name: "Amit Patel",
    location: "Ahmedabad",
    image: "👨‍💻",
    rating: 5,
    text: "The live tracking feature is amazing. I can see when my delivery partner is on the way. Fresh milk every morning, tracked like a Swiggy order!",
    highlight: "live tracking",
  },
];

const Testimonials = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-24 bg-background" ref={ref}>
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-warning/10 text-warning text-sm font-semibold mb-4">
            Customer Love
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Trusted by 10,000+ Families
          </h2>
          <p className="text-lg text-muted-foreground">
            See why customers love our honest, transparent dairy delivery service.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.15 }}
            >
              <motion.div
                whileHover={{ y: -5 }}
                className="bg-card rounded-2xl border border-border shadow-soft p-8 h-full card-hover relative"
              >
                {/* Quote Icon */}
                <div className="absolute top-6 right-6 text-primary/10">
                  <Quote className="w-12 h-12" />
                </div>

                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-warning fill-warning" />
                  ))}
                </div>

                {/* Text */}
                <p className="text-lg text-foreground mb-6 leading-relaxed">
                  "{testimonial.text}"
                </p>

                {/* Highlight Tag */}
                <div className="mb-6">
                  <span className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium">
                    #{testimonial.highlight}
                  </span>
                </div>

                {/* Author */}
                <div className="flex items-center gap-4 pt-6 border-t border-border">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-3xl">
                    {testimonial.image}
                  </div>
                  <div>
                    <div className="font-bold text-foreground">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.location}</div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
