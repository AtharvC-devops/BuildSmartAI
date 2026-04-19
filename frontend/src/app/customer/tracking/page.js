"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, Calendar, MapPin, User, Clock, DollarSign } from "lucide-react";
import { getProjects, getAgents } from "@/lib/api";

const formatINR = (n) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
};

const statusColors = {
  in_progress: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500" },
  completed:   { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  planning:    { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500" },
  on_hold:     { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", dot: "bg-red-500" },
};

export default function CustomerTracking() {
  const [projects, setProjects] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getProjects(), getAgents()])
      .then(([p, a]) => {
        // Filter to only show customer-relevant projects (simulated for user id 2)
        setProjects(p);
        setAgents(a);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getAgent = (id) => agents.find((a) => a.id === id);

  if (loading) {
    return (
      <div className="space-y-5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-[200px] rounded-2xl animate-shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Track Your Projects</h2>
        <p className="text-sm text-slate-500">Monitor progress, timelines, and assigned agents for all your projects</p>
      </motion.div>

      {/* Project Cards */}
      <div className="space-y-5">
        {projects.map((project, i) => {
          const agent = getAgent(project.assignedAgentId);
          const sc = statusColors[project.status] || statusColors.planning;
          const daysLeft = Math.max(0, Math.round((new Date(project.endDate) - new Date()) / (1000 * 60 * 60 * 24)));

          return (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass-card p-6"
            >
              <div className="flex flex-col md:flex-row md:items-start gap-5">
                {/* Left: Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-bold text-slate-900">{project.name}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${sc.bg} ${sc.text} ${sc.border} capitalize`}>
                      {project.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mb-4">{project.description}</p>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="text-slate-400 flex items-center gap-1 mb-0.5"><MapPin className="w-3 h-3" /> Location</div>
                      <div className="font-medium text-slate-700">{project.location}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 flex items-center gap-1 mb-0.5"><DollarSign className="w-3 h-3" /> Budget</div>
                      <div className="font-medium text-slate-700">{formatINR(project.budget)}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 flex items-center gap-1 mb-0.5"><Calendar className="w-3 h-3" /> Timeline</div>
                      <div className="font-medium text-slate-700">{project.startDate} → {project.endDate}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 flex items-center gap-1 mb-0.5"><Clock className="w-3 h-3" /> Remaining</div>
                      <div className="font-medium text-slate-700">{project.progress === 100 ? "Completed" : `${daysLeft} days`}</div>
                    </div>
                  </div>
                </div>

                {/* Right: Agent */}
                {agent && (
                  <div className="shrink-0 bg-slate-50 rounded-xl p-4 min-w-[180px]">
                    <div className="text-xs text-slate-400 mb-2">Assigned Agent</div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                        {agent.avatar}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{agent.name}</div>
                        <div className="text-xs text-slate-400">{agent.skill} • ⭐ {agent.rating}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="mt-5">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-500">Progress</span>
                  <span className="font-semibold text-slate-700">{project.progress}%</span>
                </div>
                <div className="progress-bar">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${project.progress}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className="progress-bar-fill"
                    style={{
                      background: project.progress === 100
                        ? "linear-gradient(90deg, #10b981, #059669)"
                        : project.progress > 50
                        ? "linear-gradient(90deg, #3b82f6, #6366f1)"
                        : "linear-gradient(90deg, #f59e0b, #f97316)",
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-1.5">
                  <span>Spent: {formatINR(project.spent)}</span>
                  <span>Budget: {formatINR(project.budget)}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
