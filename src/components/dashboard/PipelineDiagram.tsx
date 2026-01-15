import { 
  ScanSearch, 
  Brain, 
  ListTodo, 
  Code2, 
  ShieldCheck, 
  Play,
  ArrowRight
} from "lucide-react";

const stages = [
  {
    id: 'scanner',
    icon: ScanSearch,
    title: 'Code Scanner',
    description: 'Reads the entire project',
    color: 'from-blue-500 to-blue-600',
  },
  {
    id: 'analyzer',
    icon: Brain,
    title: 'Problem Analyzer',
    description: 'Understands the task',
    color: 'from-purple-500 to-purple-600',
  },
  {
    id: 'planner',
    icon: ListTodo,
    title: 'Planning Engine',
    description: 'Creates solution steps',
    color: 'from-cyan-500 to-cyan-600',
  },
  {
    id: 'generator',
    icon: Code2,
    title: 'Code Generator',
    description: 'Writes the fix',
    color: 'from-green-500 to-green-600',
  },
  {
    id: 'validator',
    icon: ShieldCheck,
    title: 'Safety Validator',
    description: 'Makes sure nothing breaks',
    color: 'from-orange-500 to-orange-600',
  },
  {
    id: 'executor',
    icon: Play,
    title: 'Execution Engine',
    description: 'Runs tests & applies changes',
    color: 'from-primary to-accent',
  },
];

const PipelineDiagram = () => {
  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">AI Pipeline Architecture</h3>
      
      <div className="flex items-center justify-between overflow-x-auto pb-2">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          return (
            <div key={stage.id} className="flex items-center">
              <div className="flex flex-col items-center min-w-[100px]">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stage.color} flex items-center justify-center shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="mt-2 text-center">
                  <div className="text-xs font-medium text-foreground">{stage.title}</div>
                  <div className="text-[10px] text-muted-foreground max-w-[90px]">{stage.description}</div>
                </div>
              </div>
              {index < stages.length - 1 && (
                <ArrowRight className="w-5 h-5 text-muted-foreground mx-2 shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PipelineDiagram;
