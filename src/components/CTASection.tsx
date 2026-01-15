import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-32 relative">
      <div className="container mx-auto px-6">
        <div className="relative glass-card p-12 md:p-20 text-center overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 opacity-50" style={{ background: 'var(--gradient-glow)' }} />
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Start in minutes</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to automate your
              <br />
              <span className="gradient-text">code operations?</span>
            </h2>

            <p className="text-xl text-muted-foreground max-w-xl mx-auto mb-10">
              Join teams shipping faster with confidence. No credit card required.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="hero" size="xl" className="group">
                Get Started Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" size="xl">
                Schedule Demo
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
