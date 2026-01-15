import { 
  Copy, 
  Wrench, 
  Play, 
  BarChart3, 
  FileText, 
  CheckCircle2, 
  Rocket 
} from "lucide-react";

const stages = [
  { 
    icon: Copy, 
    title: "Clone Production", 
    desc: "Create an isolated replica of your production environment",
    color: "from-cyan-500 to-teal-500"
  },
  { 
    icon: Wrench, 
    title: "Apply Fix", 
    desc: "AI-driven code modifications with structural understanding",
    color: "from-teal-500 to-emerald-500"
  },
  { 
    icon: Play, 
    title: "Run Traffic", 
    desc: "Simulate real-world traffic patterns and edge cases",
    color: "from-emerald-500 to-green-500"
  },
  { 
    icon: BarChart3, 
    title: "Measure", 
    desc: "Comprehensive performance and correctness metrics",
    color: "from-green-500 to-lime-500"
  },
  { 
    icon: FileText, 
    title: "Record Results", 
    desc: "Full audit trail and detailed analysis reports",
    color: "from-lime-500 to-yellow-500"
  },
  { 
    icon: CheckCircle2, 
    title: "Request Approval", 
    desc: "Human-in-the-loop verification for critical changes",
    color: "from-yellow-500 to-orange-500"
  },
  { 
    icon: Rocket, 
    title: "Deploy", 
    desc: "Zero-downtime production deployment with rollback",
    color: "from-orange-500 to-primary"
  },
];

const PipelineSection = () => {
  return (
    <section id="workflow" className="py-32 relative">
      <div className="container mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            The <span className="gradient-text">Autonomous</span> Pipeline
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            From code change to production deployment, every step is automated, verified, and audited.
          </p>
        </div>

        {/* Pipeline visualization */}
        <div className="relative">
          {/* Connection line */}
          <div className="absolute top-24 left-0 right-0 h-1 hidden lg:block">
            <div className="h-full w-full pipeline-line rounded-full opacity-30" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-6">
            {stages.map((stage, index) => (
              <div 
                key={index}
                className="group relative"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="glass-card p-6 h-full flex flex-col items-center text-center hover:border-primary/40 transition-all duration-300 hover:-translate-y-2">
                  {/* Step number */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center text-xs font-mono text-muted-foreground">
                    {index + 1}
                  </div>

                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stage.color} p-0.5 mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <div className="w-full h-full rounded-[10px] bg-card flex items-center justify-center">
                      <stage.icon className="w-6 h-6 text-primary" />
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="font-semibold mb-2 text-sm">{stage.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{stage.desc}</p>
                </div>

                {/* Arrow connector for mobile */}
                {index < stages.length - 1 && (
                  <div className="flex justify-center my-2 lg:hidden">
                    <div className="w-px h-8 bg-gradient-to-b from-primary to-transparent" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PipelineSection;
