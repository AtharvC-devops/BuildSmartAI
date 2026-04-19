"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Star, Zap, Loader2, MapPin, Trophy, Briefcase, CheckCircle2 } from "lucide-react";
import { getAgents, assignAgent } from "@/lib/api";

const skills = ["Structural", "Electrical", "Interior", "Plumbing", "Finishing"];

export default function ResourceAllocation() {
  const [agents, setAgents] = useState([]);
  const [rankings, setRankings] = useState(null);
  const [bestAgent, setBestAgent] = useState(null);
  const [skill, setSkill] = useState("Structural");
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    getAgents()
      .then(setAgents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleAutoAssign = async () => {
    setAssigning(true);
    try {
      const data = await assignAgent({
        required_skill: skill,
        agents: agents.map((a) => ({
          id: a.id,
          name: a.name,
          skill: a.skill,
          rating: a.rating,
          distance: a.distance,
          workload: a.workload,
          availability: a.availability,
        })),
      });
      setRankings(data.rankings);
      setBestAgent(data.best_agent);
    } catch (err) {
      console.error(err);
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-[200px] rounded-2xl animate-shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Smart Resource Allocation</h2>
        <p className="text-sm text-slate-500">
          Weighted scoring: 40% distance + 30% rating + 20% workload + 10% skill match
        </p>
      </motion.div>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
      >
        <div className="flex items-center gap-3 flex-1">
          <label className="text-sm font-medium text-slate-700">Required Skill:</label>
          <select
            className="input-field max-w-[200px]"
            value={skill}
            onChange={(e) => { setSkill(e.target.value); setRankings(null); }}
          >
            {skills.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleAutoAssign}
          disabled={assigning}
          className="px-6 py-2.5 rounded-xl gradient-accent text-white font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
        >
          {assigning ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Allocating...</>
          ) : (
            <><Zap className="w-4 h-4" /> Auto Assign</>
          )}
        </button>
      </motion.div>

      {/* Best Agent Banner */}
      <AnimatePresence>
        {bestAgent && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl gradient-primary p-5 text-white flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm text-emerald-100">Best Match for {skill}</div>
              <div className="text-xl font-bold">{bestAgent.name}</div>
              <div className="text-sm text-emerald-100 mt-0.5">
                Score: {bestAgent.score} • Rating: {bestAgent.rating}★ • {bestAgent.distance}km away
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {(rankings || agents).map((agent, i) => {
          const isBest = bestAgent && agent.id === bestAgent.id;
          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`glass-card p-5 relative overflow-hidden ${isBest ? "ring-2 ring-emerald-500 ring-offset-2" : ""}`}
            >
              {isBest && (
                <div className="absolute top-3 right-3">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Best
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                  agent.availability
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-600"
                }`}>
                  {agent.avatar || agent.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <div className="font-semibold text-sm text-slate-900">{agent.name}</div>
                  <div className="text-xs text-slate-400">{agent.skill} Specialist</div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 flex items-center gap-1"><Star className="w-3 h-3" /> Rating</span>
                  <span className="font-semibold text-amber-600">{agent.rating} ★</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> Distance</span>
                  <span className="font-medium text-slate-700">{agent.distance} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 flex items-center gap-1"><Briefcase className="w-3 h-3" /> Workload</span>
                  <span className="font-medium text-slate-700">{agent.workload}/10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Availability</span>
                  <span className={`font-medium ${agent.availability ? "text-emerald-600" : "text-red-500"}`}>
                    {agent.availability ? "Available" : "Busy"}
                  </span>
                </div>
                {agent.score !== undefined && (
                  <div className="flex justify-between pt-2 border-t border-slate-100">
                    <span className="text-slate-500 font-medium">AI Score</span>
                    <span className="font-bold text-indigo-600">{agent.score}</span>
                  </div>
                )}
              </div>

              {/* Score bar */}
              {agent.score !== undefined && (
                <div className="mt-3">
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${agent.score * 100}%` }}
                      transition={{ duration: 0.8, delay: i * 0.05 }}
                      className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-purple-500"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
