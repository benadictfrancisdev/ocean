import { 
  Brain, 
  GitCompare, 
  Lock, 
  Activity, 
  Layers, 
  Terminal 
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Structural Understanding",
    description: "AI that comprehends your codebase architecture, dependencies, and patterns—not just syntax.",
  },
  {
    icon: GitCompare,
    title: "Safe Production Cloning",
    description: "Instantly create isolated replicas with masked sensitive data for testing without risk.",
  },
  {
    icon: Lock,
    title: "Prove Correctness",
    description: "Formal verification and comprehensive testing to mathematically prove changes are safe.",
  },
  {
    icon: Activity,
    title: "Traffic Simulation",
    description: "Replay production traffic patterns to validate behavior under real-world conditions.",
  },
  {
    icon: Layers,
    title: "Infrastructure Ownership",
    description: "AI manages the entire infrastructure layer, from provisioning to scaling to cleanup.",
  },
  {
    icon: Terminal,
    title: "Full Audit Trail",
    description: "Every action logged, every decision documented, complete transparency for compliance.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-32 relative bg-gradient-to-b from-transparent via-secondary/20 to-transparent">
      <div className="container mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Built for <span className="gradient-text">Enterprise Scale</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Every feature designed for safety, reliability, and complete visibility into your systems.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group glass-card p-8 hover:border-primary/40 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-7 h-7 text-primary" />
              </div>
              
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
