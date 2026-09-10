"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, MapPin, User, Clock, DollarSign, Flag, MessageSquare,
  CheckCircle2, Sparkles, Send, Loader2, ArrowRight, CornerDownRight, X
} from "lucide-react";
import {
  getProjects, getAgents, getProjectMilestones,
  updateProjectMilestone, askChatAssistant
} from "@/lib/api";

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

const milestoneColors = {
  completed: "border-emerald-200 bg-emerald-50/30 text-emerald-700",
  in_progress: "border-blue-200 bg-blue-50/30 text-blue-700",
  under_review: "border-amber-200 bg-amber-50 text-amber-800 animate-pulse",
  not_started: "border-slate-100 bg-slate-50 text-slate-400",
};

export default function CustomerTracking() {
  const [projects, setProjects] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected project for milestones
  const [selectedProject, setSelectedProject] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [milestonesLoading, setMilestonesLoading] = useState(false);

  // Milestone review feedback state
  const [feedback, setFeedback] = useState({});
  const [approvingMilestoneId, setApprovingMilestoneId] = useState(null);

  // Chat chatbot states
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hi Priya! I'm your BuildSmart AI Assistant. Ask me anything about your project construction, concrete curing, material quality, or permit sanctions!" }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  async function loadData() {
    try {
      const [p, a] = await Promise.all([getProjects(), getAgents()]);
      setProjects(p);
      setAgents(a);
      // If we already had a selected project, update it in state
      if (selectedProject) {
        const updated = p.find((proj) => proj.id === selectedProject.id);
        if (updated) setSelectedProject(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const selectProject = async (project) => {
    setSelectedProject(project);
    setMilestonesLoading(true);
    try {
      const m = await getProjectMilestones(project.id);
      setMilestones(m);
    } catch (err) {
      console.error(err);
    } finally {
      setMilestonesLoading(false);
    }
  };

  const handleApproveMilestone = async (mId) => {
    setApprovingMilestoneId(mId);
    try {
      const remarks = feedback[mId] || "Approved by customer.";
      await updateProjectMilestone(selectedProject.id, {
        milestoneId: mId,
        status: "completed",
        remarks: remarks,
        date: new Date().toISOString().split("T")[0]
      });
      // clear feedback field
      setFeedback((prev) => ({ ...prev, [mId]: "" }));
      // reload
      await loadData();
      if (selectedProject) {
        const m = await getProjectMilestones(selectedProject.id);
        setMilestones(m);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setApprovingMilestoneId(null);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userText = chatInput;
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await askChatAssistant(userText);
      setMessages((prev) => [...prev, { role: "bot", text: res.answer }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "bot", text: "Sorry, I am having trouble connecting to the AI helper right now." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSuggestClick = (q) => {
    setChatInput(q);
  };

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
    <div className="space-y-6 relative">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Track Your Projects</h2>
        <p className="text-sm text-slate-500">Monitor progress, milestones timeline, and live agent logs.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Projects list */}
        <div className="lg:col-span-3 space-y-4">
          {projects.map((project, i) => {
            const agent = getAgent(project.assignedAgentId);
            const sc = statusColors[project.status] || statusColors.planning;
            const daysLeft = Math.max(0, Math.round((new Date(project.endDate) - new Date()) / (1000 * 60 * 60 * 24)));
            const isSelected = selectedProject && selectedProject.id === project.id;

            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => selectProject(project)}
                className={`glass-card p-5 cursor-pointer border-2 transition-all ${
                  isSelected ? "border-indigo-500 ring-1 ring-indigo-500/20" : "border-transparent"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-bold text-slate-900">{project.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sc.bg} ${sc.text} ${sc.border} capitalize`}>
                        {project.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-3">{project.description}</p>

                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[11px] text-slate-600">
                      <div>
                        <span className="text-slate-400 block">Location</span>
                        <span className="font-semibold text-slate-700">{project.location}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Total Budget</span>
                        <span className="font-semibold text-slate-700">{formatINR(project.budget)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Timeline</span>
                        <span className="font-semibold text-slate-700">{project.startDate} → {project.endDate}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Remaining</span>
                        <span className="font-semibold text-slate-700">{project.progress === 100 ? "Completed" : `${daysLeft} days`}</span>
                      </div>
                    </div>
                  </div>

                  {agent && (
                    <div className="shrink-0 bg-slate-50 rounded-xl p-3 border border-slate-100 min-w-[170px] text-xs">
                      <div className="text-[10px] text-slate-400 mb-1.5 font-semibold">Assigned Specialist</div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                          {agent.avatar}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{agent.name}</div>
                          <div className="text-[10px] text-slate-400">{agent.skill} • ⭐ {agent.rating}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500 font-semibold">Progress</span>
                    <span className="font-bold text-slate-700">{project.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-700"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>Spent: {formatINR(project.spent)}</span>
                    <span>Remaining: {formatINR(Math.max(0, project.budget - project.spent))}</span>
                  </div>
                </div>

                <div className="text-right text-[10px] text-indigo-600 font-bold mt-3 flex items-center justify-end gap-1">
                  View Timeline & Milestones <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Right: Selected Project Milestones */}
        <div className="lg:col-span-2 space-y-5">
          <AnimatePresence mode="wait">
            {selectedProject ? (
              <motion.div
                key="milestones"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="glass-card p-5 space-y-4"
              >
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                  <Flag className="w-4 h-4 text-indigo-600" /> Milestones: {selectedProject.name}
                </h3>

                {milestonesLoading ? (
                  <div className="flex justify-center items-center py-10 gap-2">
                    <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                    <span className="text-xs text-slate-400">Loading timeline...</span>
                  </div>
                ) : (
                  <div className="relative pl-4 border-l border-slate-100 space-y-4 text-xs">
                    {milestones.map((m) => {
                      const isReview = m.status === "under_review";
                      return (
                        <div key={m.id} className="relative">
                          {/* Dot marker */}
                          <div className={`absolute -left-[20.5px] top-1.5 w-2 h-2 rounded-full border border-white ${
                            m.status === "completed" ? "bg-emerald-500" : m.status === "in_progress" ? "bg-blue-500" : "bg-slate-300"
                          }`} />

                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <span className="font-bold text-slate-800">{m.name}</span>
                              {m.date && <span className="text-[10px] text-slate-400 block mt-0.5">Date: {m.date}</span>}
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase shrink-0 ${milestoneColors[m.status]}`}>
                              {m.status.replace(/_/g, " ")}
                            </span>
                          </div>

                          {m.remarks && <p className="text-[10px] text-slate-400 mt-1 pl-2 border-l border-slate-100 italic">{m.remarks}</p>}

                          {/* Customer sign-off interaction */}
                          {isReview && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="mt-2.5 p-3 bg-amber-50/50 border border-amber-200 rounded-xl space-y-2 text-left"
                            >
                              <div className="text-[10px] font-bold text-amber-800 flex items-center gap-1">
                                <MessageSquare className="w-3.5 h-3.5" /> Customer Sign-Off Required
                              </div>
                              <input
                                type="text"
                                className="w-full p-2 bg-white border border-amber-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                placeholder="Feedback comments (optional)..."
                                value={feedback[m.id] || ""}
                                onChange={(e) => setFeedback({ ...feedback, [m.id]: e.target.value })}
                              />
                              <button
                                onClick={() => handleApproveMilestone(m.id)}
                                disabled={approvingMilestoneId === m.id}
                                className="w-full py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[10px] hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                              >
                                {approvingMilestoneId === m.id ? (
                                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Approving...</>
                                ) : (
                                  <><CheckCircle2 className="w-3.5 h-3.5" /> Approve & Sign-Off Phase</>
                                )}
                              </button>
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card p-10 flex flex-col items-center justify-center text-center h-full min-h-[250px]"
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-3">
                  <Flag className="w-7 h-7 text-indigo-500" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">Select a Project</h4>
                <p className="text-xs text-slate-400 max-w-[200px] leading-relaxed">
                  Click on any project card on the left to load its active milestones, timeline events, and builder logs.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Floating Chatbot Assistant Widget */}
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-[350px] h-[450px] overflow-hidden flex flex-col mb-4"
            >
              {/* Header */}
              <div className="px-4 py-3 bg-slate-900 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg gradient-primary flex items-center justify-center font-bold text-xs text-white">
                    AI
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">BuildSmart Chat Advisor</h4>
                    <span className="text-[9px] text-slate-400 block mt-0.5">Construction Expert Agent</span>
                  </div>
                </div>
                <button
                  onClick={() => setChatOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar bg-slate-50/50">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0 ${
                        msg.role === "user" ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {msg.role === "user" ? "ME" : "AI"}
                    </div>
                    <div
                      className={`p-3 rounded-2xl text-[11px] leading-relaxed max-w-[80%] border ${
                        msg.role === "user"
                          ? "bg-indigo-600 text-white border-indigo-600 rounded-tr-none"
                          : "bg-white text-slate-700 border-slate-100 rounded-tl-none shadow-sm"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[9px]">
                      AI
                    </div>
                    <div className="p-3 bg-white border border-slate-100 rounded-2xl rounded-tl-none text-[11px] text-slate-400 shadow-sm flex items-center gap-1.5 font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Advisor is typing...
                    </div>
                  </div>
                )}
              </div>

              {/* Suggestions list */}
              <div className="px-3 py-2 border-t border-slate-100 bg-white flex gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
                {[
                  "Concrete curing time?",
                  "Fe 500 steel quality?",
                  "High-rise NOC?",
                  "Plaster wall painting rules?"
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSuggestClick(s)}
                    className="px-2.5 py-1 rounded-full border border-slate-200 hover:border-indigo-300 text-slate-500 hover:text-indigo-600 text-[9px] font-semibold transition-all whitespace-nowrap bg-slate-50"
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 bg-white flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  required
                  placeholder="Ask advisor a question..."
                  className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={chatLoading}
                  className="p-2 rounded-xl gradient-primary text-white hover:opacity-95 transition-opacity disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trigger Button */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="w-12 h-12 rounded-full gradient-primary text-white flex items-center justify-center shadow-xl hover:opacity-90 transition-opacity relative border border-emerald-500/20"
        >
          {chatOpen ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
