import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Plus, Minus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const products = [
  {
    id: 1,
    name: "Fresh Cow Milk",
    description: "Farm-fresh cow milk, delivered daily",
    price: 60,
    unit: "per liter",
    rating: 4.9,
    reviews: 2345,
    emoji: "🥛",
    popular: true,
    gradient: "from-amber-50 to-orange-50",
  },
  {
    id: 2,
    name: "Buffalo Milk",
    description: "Rich & creamy buffalo milk",
    price: 75,
    unit: "per liter",
    rating: 4.8,
    reviews: 1890,
    emoji: "🐃",
    popular: false,
    gradient: "from-blue-50 to-indigo-50",
  },
  {
    id: 3,
    name: "Organic A2 Milk",
    description: "Premium A2 protein milk",
    price: 120,
    unit: "per liter",
    rating: 5.0,
    reviews: 876,
    emoji: "🌿",
    popular: true,
    gradient: "from-green-50 to-emerald-50",
  },
  {
    id: 4,
    name: "Fresh Curd",
    description: "Thick, creamy homemade curd",
    price: 45,
    unit: "per 400g",
    rating: 4.7,
    reviews: 1234,
    emoji: "🍶",
    popular: false,
    gradient: "from-yellow-50 to-amber-50",
  },
  {
    id: 5,
    name: "Farm Butter",
    description: "Pure butter from fresh cream",
    price: 180,
    unit: "per 200g",
    rating: 4.9,
    reviews: 678,
    emoji: "🧈",
    popular: false,
    gradient: "from-yellow-50 to-orange-50",
  },
  {
    id: 6,
    name: "Fresh Paneer",
    description: "Soft, fresh cottage cheese",
    price: 320,
    unit: "per kg",
    rating: 4.8,
    reviews: 543,
    emoji: "🧀",
    popular: true,
    gradient: "from-orange-50 to-red-50",
  },
];

const ProductCard = ({ product, index, isInView }: { product: typeof products[0]; index: number; isInView: boolean }) => {
  const [quantity, setQuantity] = useState(0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative"
    >
      <motion.div
        whileHover={{ y: -8 }}
        className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden card-hover h-full"
      >
        {/* Popular Badge */}
        {product.popular && (
          <div className="absolute top-4 right-4 z-10">
            <span className="px-3 py-1 rounded-full bg-warning text-warning-foreground text-xs font-semibold">
              Popular
            </span>
          </div>
        )}

        {/* Product Image Area */}
        <div className={`bg-gradient-to-br ${product.gradient} p-8 flex items-center justify-center`}>
          <motion.span
            whileHover={{ scale: 1.2, rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.4 }}
            className="text-6xl"
          >
            {product.emoji}
          </motion.span>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-xl font-bold mb-1">{product.name}</h3>
            <p className="text-muted-foreground text-sm">{product.description}</p>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-accent/10">
              <Star className="w-4 h-4 text-warning fill-warning" />
              <span className="text-sm font-semibold">{product.rating}</span>
            </div>
            <span className="text-sm text-muted-foreground">({product.reviews} reviews)</span>
          </div>

          {/* Price and Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div>
              <span className="text-2xl font-bold">₹{product.price}</span>
              <span className="text-sm text-muted-foreground ml-1">{product.unit}</span>
            </div>

            {quantity === 0 ? (
              <Button
                size="sm"
                onClick={() => setQuantity(1)}
                className="gap-2 btn-ripple"
              >
                <Plus className="w-4 h-4" />
                Add
              </Button>
            ) : (
              <div className="flex items-center gap-3 bg-primary/10 rounded-lg p-1">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setQuantity(Math.max(0, quantity - 1))}
                  className="w-8 h-8 rounded-md bg-card flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </motion.button>
                <motion.span
                  key={quantity}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  className="font-bold w-6 text-center"
                >
                  {quantity}
                </motion.span>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-4 h-4" />
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const Products = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="products" className="py-24 bg-muted/50" ref={ref}>
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-semibold mb-4">
            Our Products
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Farm Fresh, Daily Delivered
          </h2>
          <p className="text-lg text-muted-foreground">
            Choose from our range of premium dairy products. Subscribe once, get fresh deliveries every day.
          </p>
        </motion.div>

        {/* Products Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              index={index}
              isInView={isInView}
            />
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-16 text-center"
        >
          <Button size="lg" className="gap-2 btn-ripple">
            View All Products
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default Products;
